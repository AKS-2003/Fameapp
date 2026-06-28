import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
import { hashPassword, verifyPassword } from "@/lib/auth";
// import { writeJsonFile, readJsonFile } from "@/lib/storage-service";
import { getUserById, changeUserPassword } from "@/lib/data-access";
import { User, APIResponse } from "@/types";

export const POST = withAuth(async (request: NextRequest, session) => {
	try {
		const body = await request.json();
		const { currentPassword, newPassword, confirmPassword } = body;

		// Validate input
		if (!currentPassword || !newPassword || !confirmPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FIELDS",
						message: "All password fields are required",
					},
				},
				{ status: 400 }
			);
		}

		if (newPassword !== confirmPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "PASSWORD_MISMATCH",
						message: "New passwords do not match",
					},
				},
				{ status: 400 }
			);
		}

		if (newPassword.length < 8) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "WEAK_PASSWORD",
						message:
							"New password must be at least 8 characters long",
					},
				},
				{ status: 400 }
			);
		}

		// Read existing user
		const user = await getUserById(session.userId);
		if (!user) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "User not found",
					},
				},
				{ status: 404 }
			);
		}

		// Verify current password
		const isCurrentPasswordValid = await verifyPassword(
			currentPassword,
			user.passwordHash
		);

		if (!isCurrentPasswordValid) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_CURRENT_PASSWORD",
						message: "Current password is incorrect",
					},
				},
				{ status: 400 }
			);
		}

		// Hash new password
		const newPasswordHash = await hashPassword(newPassword);

		// Update password
		await changeUserPassword(session.userId, newPasswordHash);

		// Log password change
		console.log(
			`Password changed for user: ${session.email} (${session.userId})`
		);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Password changed successfully",
			},
		});
	} catch (error) {
		console.error("Change password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred",
				},
			},
			{ status: 500 }
		);
	}
});
