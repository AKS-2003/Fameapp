import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getUserById, changeUserPassword } from "@/lib/data-access";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { APIResponse } from "@/types";

/**
 * POST /api/stage-manager/profile/change-password
 * Change stage manager password (requires current password)
 */
export async function POST(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);
		if (
			!session ||
			(session.role !== "stage_manager" && session.role !== "super_admin")
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: { code: "UNAUTHORIZED", message: "Authentication required" },
				},
				{ status: 401 }
			);
		}

		const { currentPassword, newPassword } = await request.json();

		if (!currentPassword || !newPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "Current password and new password are required",
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
						code: "INVALID_REQUEST",
						message: "New password must be at least 8 characters",
					},
				},
				{ status: 400 }
			);
		}

		const user = await getUserById(session.userId);
		if (!user) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: { code: "USER_NOT_FOUND", message: "Stage manager not found" },
				},
				{ status: 404 }
			);
		}

		const isValid = await verifyPassword(currentPassword, user.passwordHash);
		if (!isValid) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Current password is incorrect",
					},
				},
				{ status: 401 }
			);
		}

		const newHash = await hashPassword(newPassword);
		await changeUserPassword(user.id, newHash);

		return NextResponse.json<APIResponse>({
			success: true,
			data: { message: "Password changed successfully" },
		});
	} catch (error) {
		console.error("Stage manager change password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to change password",
				},
			},
			{ status: 500 }
		);
	}
}
