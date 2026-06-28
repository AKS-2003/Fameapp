import { NextRequest, NextResponse } from "next/server";
import { getAnySessionFromRequest } from "@/lib/session";

import { getUserById, getFameLinkArtistById } from "@/lib/data-access";
import { APIResponse } from "@/types";
import { destroySessionResponse, destroyArtistSessionResponse } from "@/lib/session";

export async function GET(request: NextRequest) {
	try {
		// Get session from request, prioritizing role if specified in query
		const roleParam = request.nextUrl.searchParams.get("role");
		const session = getAnySessionFromRequest(request, roleParam || undefined);

		console.log("[AUTH/ME] Session data:", session);

		if (!session) {
			console.log("[AUTH/ME] No session found");
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 },
			);
		}

		// If the session is for a famelink artist, look up in the artists store
		if (session.role === "artist") {
			console.log("[AUTH/ME] Looking for artist ID:", session.userId);
			const artist = await getFameLinkArtistById(session.userId);
			console.log(
				"[AUTH/ME] Found artist:",
				artist ? { id: artist.id, email: artist.email } : null,
			);

			if (!artist) {
				console.log("[AUTH/ME] Artist not found in database, clearing cookie");
				const response = NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "USER_NOT_FOUND",
							message: "Artist not found",
						},
					},
					{ status: 404 },
				);
				destroyArtistSessionResponse(response);
				destroySessionResponse(response);
				return response;
			}

			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					userId: artist.id,
					email: artist.email,
					status: "active",
					role: "artist",
					artistName: artist.artistName,
					tier: artist.tier,
					createdAt: artist.createdAt,
					lastLogin: artist.lastLoginAt,
				},
			});
		}

		// For non-artist roles (stage_manager, super_admin, etc.)
		console.log("[AUTH/ME] Looking for user ID:", session.userId);
		const user = await getUserById(session.userId);
		console.log(
			"[AUTH/ME] Found user:",
			user
				? { id: user.id, email: user.email, status: user.status }
				: null,
		);

		if (!user) {
			console.log("[AUTH/ME] User not found in database, clearing cookie");
			const response = NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "User not found",
					},
				},
				{ status: 404 },
			);
			destroySessionResponse(response);
			destroyArtistSessionResponse(response);
			return response;
		}

		// Check if user status allows access
		if (user.status !== "active") {
			console.log("[AUTH/ME] User status not active:", user.status);
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "ACCOUNT_NOT_ACTIVE",
						message: `Account status: ${user.status}`,
					},
				},
				{ status: 403 },
			);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				userId: user.id,
				email: user.email,
				status: user.status,
				role: user.role,
				profile: user.profile,
				createdAt: user.createdAt,
				lastLogin: user.lastLogin,
			},
		});
	} catch (error) {
		console.error("Get user info error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to get user information",
				},
			},
			{ status: 500 },
		);
	}
}
