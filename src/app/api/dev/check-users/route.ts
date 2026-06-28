import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/data-access";
import { APIResponse } from "@/types";

export async function GET(request: NextRequest) {
	// Only allow in development
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "NOT_ALLOWED",
					message: "This endpoint is only available in development",
				},
			},
			{ status: 403 }
		);
	}

	try {
		const users = await getAllUsers();

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Users retrieved from MongoDB",
				users: users,
				totalFound: users.length,
			},
		});
	} catch (error) {
		console.error("Error checking users:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "CHECK_ERROR",
					message: "Failed to check users in MongoDB",
				},
			},
			{ status: 500 }
		);
	}
}
