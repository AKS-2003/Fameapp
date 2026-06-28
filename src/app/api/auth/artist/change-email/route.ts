import { NextRequest, NextResponse } from "next/server";
import { getArtistSession, createArtistSessionResponse } from "@/lib/session";
import {
	getFameLinkArtistById,
	getFameLinkArtistByEmail,
	updateFameLinkArtist,
} from "@/lib/data-access";
import { verifyPassword } from "@/lib/auth";
import { APIResponse } from "@/types";

/**
 * POST /api/auth/artist/change-email
 * Change artist email (requires password + verified new email)
 */
export async function POST(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session?.userId || session.role !== "artist") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const { newEmail, password } = await request.json();

		if (!newEmail || !password) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "New email and password are required",
					},
				},
				{ status: 400 },
			);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newEmail)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "Invalid email format",
					},
				},
				{ status: 400 },
			);
		}

		const artist = await getFameLinkArtistById(session.userId);
		if (!artist) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "Artist not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify password
		const isValid = await verifyPassword(password, artist.passwordHash);
		if (!isValid) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Password is incorrect",
					},
				},
				{ status: 401 },
			);
		}

		// Check if new email is already taken
		const existing = await getFameLinkArtistByEmail(
			newEmail.toLowerCase().trim(),
		);
		if (existing && existing.id !== artist.id) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "EMAIL_TAKEN",
						message:
							"This email is already in use by another account",
					},
				},
				{ status: 409 },
			);
		}

		// Update email
		await updateFameLinkArtist({
			...artist,
			email: newEmail.toLowerCase().trim(),
			updatedAt: new Date().toISOString(),
		});

		// Update session with new email
		const response = NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Email changed successfully",
				email: newEmail.toLowerCase().trim(),
			},
		});

		return createArtistSessionResponse(
			{
				...session,
				email: newEmail.toLowerCase().trim(),
			},
			response,
		);
	} catch (error) {
		console.error("Change email error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to change email",
				},
			},
			{ status: 500 },
		);
	}
}
