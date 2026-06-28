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
						code: "NO_SESSION",
						message: "No active session found",
					},
				},
				{ status: 401 }
			);
		}

		// Get full user data
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

		// Check if user is still active
		if (user.status !== "active") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "ACCOUNT_INACTIVE",
						message: `Account status: ${user.status}`,
					},
				},
				{ status: 403 }
			);
		}

		// Return user data (without password hash)
		const { passwordHash, ...userWithoutPassword } = user;

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: userWithoutPassword,
				session: sessionData,
			},
		});
	} catch (error) {
		console.error("Error verifying session:", error);
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
}
