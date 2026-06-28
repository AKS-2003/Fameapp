import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
import { APIResponse } from "@/types";

export const GET = withAuth(
	async (request: NextRequest, session) => {
		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "You have access to this protected endpoint!",
				user: {
					id: session.userId,
					email: session.email,
					role: session.role,
					status: session.status,
				},
				timestamp: new Date().toISOString(),
			},
		});
	},
	{
		requiredRole: "stage_manager", // Minimum role required
	}
);

export const POST = withAuth(
	async (request: NextRequest, session) => {
		const body = await request.json();

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "POST request processed successfully",
				receivedData: body,
				user: {
					id: session.userId,
					email: session.email,
					role: session.role,
				},
			},
		});
	},
	{
		requiredRole: "stage_manager", // Higher role required for POST
	}
);
