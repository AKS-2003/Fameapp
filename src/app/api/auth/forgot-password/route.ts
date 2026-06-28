import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/data-access";
import { sendPasswordResetRequestEmail } from "@/lib/email-service";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email } = body;

		if (!email) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_EMAIL",
						message: "Email address is required",
					},
				},
				{ status: 400 }
			);
		}

		// Check if user exists
		const user = await getUserByEmail(email);

		// For security, we always return success even if user doesn't exist
		// This prevents email enumeration attacks
		if (!user) {
			console.log(
				`Password reset requested for non-existent email: ${email}`
			);
			// Still return success to prevent email enumeration
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message:
						"If an account with that email exists, we've sent a password reset request.",
				},
			});
		}

		// Only allow password reset for stage managers
		if (user.role !== "stage_manager" && user.role !== "super_admin") {
			console.log(
				`Password reset requested for non-stage-manager: ${user.role}`
			);
			// Return success to prevent role enumeration
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message:
						"If an account with that email exists, we've sent a password reset request.",
				},
			});
		}

		console.log(
			`Password reset requested for stage manager: ${user.id} (${email})`
		);

		// Send email to admin and stage manager
		// Get the full name from profile
		const fullName =
			user.profile?.firstName && user.profile?.lastName
				? `${user.profile.firstName} ${user.profile.lastName}`
				: user.profile?.firstName ||
				  user.profile?.lastName ||
				  "Stage Manager";

		const emailSent = await sendPasswordResetRequestEmail({
			stageManagerEmail: email,
			stageManagerName: fullName,
			stageManagerPhone: user.profile?.phone || "Not provided",
			userId: user.id,
		});

		if (!emailSent) {
			console.warn("Failed to send password reset email");
			// Still return success to user
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message:
					"Password reset request sent. The admin will contact you shortly.",
			},
		});
	} catch (error) {
		console.error("Forgot password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to process password reset request",
				},
			},
			{ status: 500 }
		);
	}
}
