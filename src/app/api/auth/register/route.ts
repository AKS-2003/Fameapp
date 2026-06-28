import { NextRequest, NextResponse } from "next/server";
import { addPendingStageManager } from "@/lib/data-access";
import { hashPassword } from "@/lib/auth";
import { sendStageManagerVerificationEmail } from "@/lib/email-service";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, password, firstName, lastName, phone } = body;

		// Validate required fields
		if (!email || !password || !firstName || !lastName) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FIELDS",
						message:
							"Email, password, first name, and last name are required",
					},
				},
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_EMAIL",
						message: "Please enter a valid email address",
					},
				},
				{ status: 400 }
			);
		}

		// Validate password length
		if (password.length < 8) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "WEAK_PASSWORD",
						message: "Password must be at least 8 characters long",
					},
				},
				{ status: 400 }
			);
		}

		// Hash password
		const hashedPassword = await hashPassword(password);

		// Generate unique ID for the user
		const userId = `user-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Create user with default role as 'stage_manager' in pending status
		const userData = {
			id: userId,
			email: email.toLowerCase().trim(),
			passwordHash: hashedPassword,
			role: "stage_manager" as const, // Default role for registration
			status: "pending" as const, // Stage managers need approval
			profile: {
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				phone: phone?.trim() || null,
			},
			createdAt: new Date(),
			lastLogin: new Date(),
		};

		// Add to pending stage managers instead of active users
		await addPendingStageManager(userData);

		console.log(
			`New stage manager registered (pending): ${userData.email}`
		);

		// Send verification emails to Stage Manager and Admin
		try {
			const emailSent = await sendStageManagerVerificationEmail({
				stageManagerEmail: userData.email,
				stageManagerName: `${userData.profile.firstName} ${userData.profile.lastName}`,
				stageManagerPhone: userData.profile.phone || "Not provided",
				userId: userData.id,
			});

			if (emailSent) {
				console.log(
					`Verification emails sent successfully for: ${userData.email}`
				);
			} else {
				console.warn(
					`Failed to send verification emails for: ${userData.email}`
				);
			}
		} catch (error) {
			console.error("Error sending verification emails:", error);
			// Continue without failing the registration
		}

		// Send real-time notification to all super admins
		try {
			if (global.io) {
				global.io.to("role_super_admin").emit("new_registration", {
					type: "stage_manager_registration",
					user: {
						id: userData.id,
						email: userData.email,
						firstName: userData.profile.firstName,
						lastName: userData.profile.lastName,
						phone: userData.profile.phone,
						createdAt: userData.createdAt,
					},
					message: `New stage manager registration: ${userData.profile.firstName} ${userData.profile.lastName}`,
					timestamp: new Date().toISOString(),
				});
				console.log(
					`Real-time notification sent to admins for new registration: ${userData.email}`
				);
			} else {
				console.log(
					"WebSocket not available, skipping real-time notification"
				);
			}
		} catch (error) {
			console.error("Error sending WebSocket notification:", error);
			// Continue without WebSocket - don't fail the registration
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message:
					"Stage Manager account created successfully. Your account is pending approval.",
				user: {
					id: userData.id,
					email: userData.email,
					role: userData.role,
					status: userData.status,
					profile: userData.profile,
				},
			},
		});
	} catch (error: any) {
		console.error("Registration error:", error);

		// Handle duplicate email error
		if (error.message?.includes("already exists")) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "EMAIL_EXISTS",
						message: "An account with this email already exists",
					},
				},
				{ status: 409 }
			);
		}

		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to create account",
				},
			},
			{ status: 500 }
		);
	}
}
