import { NextRequest, NextResponse } from "next/server";
import { hashPassword, getUserByEmail } from "@/lib/auth";
import { addPendingStageManager } from "@/lib/data-access";
import { generateId, isValidEmail } from "@/lib/utils";
import { User, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { firstName, lastName, email, password, phone } = body;

		// Validate input
		if (!firstName || !lastName || !email || !password) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FIELDS",
						message:
							"First name, last name, email, and password are required",
					},
				},
				{ status: 400 }
			);
		}

		if (!isValidEmail(email)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_EMAIL",
						message: "Please provide a valid email address",
					},
				},
				{ status: 400 }
			);
		}

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

		// Check if user already exists
		const existingUser = await getUserByEmail(email);
		if (existingUser) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_EXISTS",
						message: "An account with this email already exists",
					},
				},
				{ status: 409 }
			);
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create new user
		const newUser: User = {
			id: generateId(),
			email: email.toLowerCase(),
			passwordHash,
			role: "stage_manager",
			status: "pending", // Stage managers need approval
			profile: {
				firstName,
				lastName,
				phone: phone || undefined,
			},
			createdAt: new Date(),
			lastLogin: new Date(),
		};

		// Add to pending stage managers using data access layer
		await addPendingStageManager(newUser);

		// Log registration
		console.log(`New stage manager registered: ${email} (${newUser.id})`);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message:
					"Registration successful! Your account is pending approval.",
				userId: newUser.id,
				status: "pending",
			},
		});
	} catch (error) {
		console.error("Registration error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred. Please try again.",
				},
			},
			{ status: 500 }
		);
	}
}
