import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, createSessionResponse } from "@/lib/session";
import { getUserById } from "@/lib/data-access";
import { createSessionData } from "@/lib/auth";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		console.log("Session refresh requested");

		// Get current session
		const session = getSessionFromRequest(request);
		console.log(
			"Current session:",
			session
				? {
						userId: session.userId,
						role: session.role,
						status: session.status,
				  }
				: "No session"
		);

		if (!session) {
			console.log("No session found for refresh");
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

		// Get fresh user data from database
		console.log("Fetching fresh user data for:", session.userId);
		const user = await getUserById(session.userId);
		console.log(
			"Fresh user data:",
			user
				? { id: user.id, role: user.role, status: user.status }
				: "User not found"
		);

		if (!user) {
			console.log("User not found in database during refresh");
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

		// Create new session data with updated user information
		const newSessionData = createSessionData(user, session.eventId);
		console.log("New session data:", {
			userId: newSessionData.userId,
			role: newSessionData.role,
			status: newSessionData.status,
		});

		// Create response with updated session
		const response = NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					role: user.role,
					status: user.status,
					profile: user.profile,
				},
				redirectUrl: getRedirectUrl(user.role, user.status),
				sessionUpdated: session.status !== user.status, // Indicate if status changed
			},
		});

		console.log(
			"Session refresh successful, status changed:",
			session.status !== user.status
		);

		// Set updated session cookie
		return createSessionResponse(newSessionData, response);
	} catch (error) {
		console.error("Session refresh error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to refresh session",
				},
			},
			{ status: 500 }
		);
	}
}

// Determine redirect URL based on user role and status
function getRedirectUrl(role: string, status: string): string {
	if (status !== "active") {
		if (status === "pending" && role === "stage_manager") {
			return "/stage-manager-pending";
		}
		return `/account-${status}`;
	}

	switch (role) {
		case "super_admin":
			return "/super-admin";
		case "stage_manager":
			return "/stage-manager";
		default:
			return "/";
	}
}
