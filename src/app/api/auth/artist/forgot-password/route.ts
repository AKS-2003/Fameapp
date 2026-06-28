import { NextRequest, NextResponse } from "next/server";
import {
	getFameLinkArtistByEmail,
	updateFameLinkArtist,
} from "@/lib/data-access";
import { APIResponse } from "@/types";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/auth/artist/forgot-password
 * Sends a password reset email with a unique token link to the artist.
 * Token is stored on the artist profile in GCS and expires in 1 hour.
 */
export async function POST(request: NextRequest) {
	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_EMAIL",
						message: "Email address is required",
					},
				},
				{ status: 400 },
			);
		}

		const artist = await getFameLinkArtistByEmail(
			email.toLowerCase().trim(),
		);

		// Always return success to prevent email enumeration
		if (!artist) {
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message:
						"If an account with that email exists, a reset link has been sent.",
				},
			});
		}

		// Generate reset token and expiry (1 hour)
		const resetToken = uuidv4();
		const resetTokenExpiry = new Date(
			Date.now() + 60 * 60 * 1000,
		).toISOString();

		// Save token to artist profile in GCS
		await updateFameLinkArtist({
			...artist,
			passwordResetToken: resetToken,
			passwordResetTokenExpiry: resetTokenExpiry,
			updatedAt: new Date().toISOString(),
		});

		// Send reset email
		const { getBaseUrl } = await import("@/lib/url-utils");
		const baseUrl = getBaseUrl(request.headers);
		const resetUrl = `${baseUrl}/famelink-reset-password?token=${resetToken}`;

		try {
			const { sendArtistPasswordResetEmail } =
				await import("@/lib/email-service");
			await sendArtistPasswordResetEmail({
				email: artist.email,
				artistName: artist.artistName || "Artist",
				resetUrl,
			});
		} catch (emailErr) {
			console.error("Failed to send reset email:", emailErr);
			// Log the reset URL for development
			console.log("🔗 Password reset URL:", resetUrl);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message:
					"If an account with that email exists, a reset link has been sent.",
			},
		});
	} catch (error) {
		console.error("Artist forgot password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to process request",
				},
			},
			{ status: 500 },
		);
	}
}
