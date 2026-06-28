import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/lib/session";
import { getUserById } from "@/lib/data-access";
import { APIResponse } from "@/types";

export async function GET(request: NextRequest) {
	try {
		// Get session data
		const sessionData = await getSessionData(request);
		if (!sessionData) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 }
			);
		}

		// Get current user data
		const user = await getUserById(sessionData.userId);
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

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				status: user.status,
				role: user.role,
				email: user.email,
			},
		});
	} catch (error) {
		console.error("Error checking account status:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to check account status",
				},
			},
			{ status: 500 }
		);
	}
}
