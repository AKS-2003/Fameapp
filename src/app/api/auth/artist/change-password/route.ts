import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";
import { getFameLinkArtistById, updateFameLinkArtist } from "@/lib/data-access";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { APIResponse } from "@/types";

/**
 * POST /api/auth/artist/change-password
 * Change artist password (requires current password)
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

		const { currentPassword, newPassword } = await request.json();

		if (!currentPassword || !newPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message:
							"Current password and new password are required",
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
						message: "New password must be at least 8 characters",
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

		const isValid = await verifyPassword(
			currentPassword,
			artist.passwordHash,
		);
		if (!isValid) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Current password is incorrect",
					},
				},
				{ status: 401 },
			);
		}

		const newHash = await hashPassword(newPassword);
		await updateFameLinkArtist({
			...artist,
			passwordHash: newHash,
			updatedAt: new Date().toISOString(),
		});

		return NextResponse.json<APIResponse>({
			success: true,
			data: { message: "Password changed successfully" },
		});
	} catch (error) {
		console.error("Change password error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to change password",
				},
			},
			{ status: 500 },
		);
	}
}
