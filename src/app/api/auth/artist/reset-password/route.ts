import { NextRequest, NextResponse } from "next/server";
import { getAllFameLinkArtists, updateFameLinkArtist } from "@/lib/data-access";
import { hashPassword } from "@/lib/auth";
import { APIResponse } from "@/types";

/**
 * POST /api/auth/artist/reset-password
 * Validates the reset token and updates the artist's password.
 */
export async function POST(request: NextRequest) {
	try {
		const { token, newPassword } = await request.json();

		if (!token || !newPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "Token and new password are required",
					},
				},
				{ status: 400 },
			);
		}

		if (newPassword.length < 8) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "Password must be at least 8 characters",
					},
				},
				{ status: 400 },
			);
		}

		// Find artist by reset token
		const allArtists = await getAllFameLinkArtists();
		const artist = allArtists.find(
			(a: any) => a.passwordResetToken === token,
		);

		if (!artist) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_TOKEN",
						message:
							"Invalid or expired reset link. Please request a new one.",
					},
				},
				{ status: 400 },
			);
		}

		// Check token expiry
		if (
			(artist as any).passwordResetTokenExpiry &&
			new Date((artist as any).passwordResetTokenExpiry) < new Date()
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "TOKEN_EXPIRED",
						message:
							"This reset link has expired. Please request a new one.",
					},
				},
				{ status: 400 },
			);
		}

		// Hash new password and clear token
		const newHash = await hashPassword(newPassword);
		await updateFameLinkArtist({
			...artist,
			passwordHash: newHash,
			passwordResetToken: undefined,
			passwordResetTokenExpiry: undefined,
			updatedAt: new Date().toISOString(),
		} as any);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message:
					"Password has been reset successfully. You can now sign in.",
			},
		});
	} catch (error) {
		console.error("Artist reset password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to reset password",
				},
			},
			{ status: 500 },
		);
	}
}
