import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/data-access";
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

		// Emit WebSocket event to notify the stage manager
		if (global.io) {
			// Emit directly to the room where the user is waiting
			global.io
				.to(`user_password_reset_${email}`)
				.emit("password_reset_completed", {
					email,
					userId: user.id,
					timestamp: new Date().toISOString(),
				});
			console.log(
				`Password reset completion notification sent to room: user_password_reset_${email}`
			);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Password reset completion notification sent",
			},
		});
	} catch (error) {
		console.error("Complete password reset error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to complete password reset",
				},
			},
			{ status: 500 }
		);
	}
}
