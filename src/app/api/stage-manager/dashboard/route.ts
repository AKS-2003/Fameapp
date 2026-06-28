import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { APIResponse } from "@/types";
import { getUser } from "@/lib/storage-service";

export async function GET(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);

		if (!session) {
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

		if (session.role !== "stage_manager" && session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "Access denied. Stage manager role required.",
					},
				},
				{ status: 403 }
			);
		}

		// Fetch user details from GCS
		const user = await getUser(session.userId);

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

		const dashboardData = {
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
				status: user.status,
				profile: {
					firstName: user.profile?.firstName || "",
					lastName: user.profile?.lastName || "",
					phone: user.profile?.phone || "",
				},
				createdAt: user.createdAt,
				lastLogin: user.lastLogin,
			},
		};

		return NextResponse.json<APIResponse>({
			success: true,
			data: dashboardData,
		});
	} catch (error) {
		console.error("Stage manager dashboard API error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to load dashboard data",
				},
			},
			{ status: 500 }
		);
	}
}
