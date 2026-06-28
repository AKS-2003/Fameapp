import { NextRequest, NextResponse } from "next/server";
import {
	getFameLinkArtistByEmail,
	updateFameLinkArtist,
	FameLinkArtistProfile,
} from "@/lib/data-access";
import { verifyPassword } from "@/lib/auth";
import { createArtistSessionResponse } from "@/lib/session";

import { APIResponse, SessionData } from "@/types";

/**
 * Artist Login API Endpoint
 *
 * POST /api/auth/artist/login
 *
 * Validates artist credentials against GCS stored data,
 * creates a session, and returns the artist profile.
 *
 * Handles event request context for post-login routing:
 * - If eventRequestId is provided, routes to "Respond to Request" flow
 * - Otherwise, routes to Artist Dashboard
 *
 * Requirements: 2.7 (session creation and profile storage)
 * Validates: Property 4 (Session Creation on Login)
 */

interface ArtistLoginRequest {
	email: string;
	password: string;
	eventRequestId?: string; // Optional: for request-based login routing
}

interface ArtistLoginResponse {
	artist: {
		id: string;
		email: string;
		artistName: string;
		country?: string;
		city?: string;
		tier: "free" | "pro" | "pro_plus";
		emailVerified: boolean;
	};
	redirectUrl: string;
	eventRequestId?: string;
}

export async function POST(request: NextRequest) {
	try {
		const body: ArtistLoginRequest = await request.json();
		const { email, password, eventRequestId } = body;

		// Validate required fields
		if (!email || !password) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Email and password are required",
					},
				},
				{ status: 400 },
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_001",
						message: "Please enter a valid email address",
					},
				},
				{ status: 400 },
			);
		}

		// Find artist by email
		const artist = await getFameLinkArtistByEmail(
			email.toLowerCase().trim(),
		);

		if (!artist) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "No account found with this email address",
					},
				},
				{ status: 401 },
			);
		}

		// Verify password
		const isValidPassword = await verifyPassword(
			password,
			artist.passwordHash,
		);

		if (!isValidPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message:
							"Incorrect password. Please try again or use 'Forgot Password'.",
					},
				},
				{ status: 401 },
			);
		}

		// Update last login timestamp
		const updatedArtist: FameLinkArtistProfile = {
			...artist,
			lastLoginAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		try {
			await updateFameLinkArtist(updatedArtist);
		} catch (updateError) {
			// Log but don't fail login if update fails
			console.error(
				"Failed to update last login timestamp:",
				updateError,
			);
		}

		// Create session data (Requirement 2.7: create session)
		const sessionData: SessionData = {
			userId: artist.id,
			email: artist.email,
			role: "artist",
			status: "active",
			// Store eventRequestId in session for context-aware routing
			eventId: eventRequestId,
		};

		// Determine redirect URL based on context (Requirements 2.5, 2.6)
		// If eventRequestId is provided, route to event request response flow
		// Otherwise, route to FameLink dashboard (NOT event-based artist dashboard)
		const redirectUrl = eventRequestId
			? `/event-request/${eventRequestId}`
			: `/famelink/${artist.id}`;

		// Prepare response data
		const responseData: ArtistLoginResponse = {
			artist: {
				id: artist.id,
				email: artist.email,
				artistName: artist.artistName,
				country: artist.country,
				city: artist.city,
				tier: artist.tier,
				emailVerified: artist.emailVerified,
			},
			redirectUrl,
		};

		// Include eventRequestId in response if provided
		if (eventRequestId) {
			responseData.eventRequestId = eventRequestId;
		}

		// Create response with session cookie
		const response = NextResponse.json<APIResponse<ArtistLoginResponse>>({
			success: true,
			data: responseData,
		});

		// Set artist session cookie (uses separate cookie from stage manager)
		return createArtistSessionResponse(sessionData, response);

	} catch (error: any) {
		console.error("Artist login error:", error);

		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message:
						"An error occurred during login. Please try again.",
				},
			},
			{ status: 500 },
		);
	}
}
