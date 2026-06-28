import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		// Verify super admin session
		const session = await getSessionData(request);
		if (!session || session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Unauthorized access",
					},
				},
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { userId, action, message } = body;

		if (!userId || !action) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "User ID and action are required",
					},
				},
				{ status: 400 }
			);
		}

		// Emit WebSocket event to notify the stage manager
		if (global.io) {
			global.io.emit("stage_manager_account_updated", {
				userId,
				action,
				message:
					message ||
					"Your account has been updated by an administrator",
			});
			console.log(
				`Stage manager account update notification sent for: ${userId} - ${action}`
			);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Notification sent successfully",
			},
		});
	} catch (error) {
		console.error("Notify stage manager error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to send notification",
				},
			},
			{ status: 500 }
		);
	}
}
