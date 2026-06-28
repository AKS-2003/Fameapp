import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getUserById, updateUser } from "@/lib/data-access";
import { StorageService } from "@/lib/storage-service";
import path from "path";

// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

/**
 * POST /api/stage-manager/profile/avatar
 * Accepts multipart/form-data with a single "avatar" file field.
 * Saves the image to local disk under `profile-images/<userId>/avatar.<ext>`
 * and persists the URL in the user's profile.avatar field.
 */
export const POST = async (request: NextRequest) => {
	try {
		// 1. Auth
		const session = await getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
				{ status: 401 }
			);
		}

		const user = await getUserById(session.userId);
		if (!user || (user.role !== "stage_manager" && user.role !== "super_admin")) {
			return NextResponse.json(
				{ success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
				{ status: 403 }
			);
		}

		// 2. Parse multipart form
		const formData = await request.formData();
		const file = formData.get("avatar") as File | null;

		if (!file) {
			return NextResponse.json(
				{ success: false, error: { code: "MISSING_FILE", message: "No avatar file provided" } },
				{ status: 400 }
			);
		}

		// 3. Validate type & size
		if (!ALLOWED_TYPES.includes(file.type)) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_TYPE",
						message: `File type not allowed. Use JPEG, PNG, WebP, or GIF.`,
					},
				},
				{ status: 400 }
			);
		}

		if (file.size > MAX_BYTES) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FILE_TOO_LARGE",
						message: `Image must be under ${MAX_SIZE_MB}MB`,
					},
				},
				{ status: 400 }
			);
		}

		// 4. Convert to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// 5. Build a deterministic, collision-safe file path
		const ext = file.type.split("/")[1].replace("jpeg", "jpg");
		const relativePath = `profile-images/${user.id}/avatar.${ext}`;

		// Delete old avatar if a different extension was used before
		// (e.g., user switches from jpg to png – clean up old file)
		for (const oldExt of ["jpg", "png", "webp", "gif"]) {
			if (oldExt !== ext) {
				await StorageService.deleteFile(`profile-images/${user.id}/avatar.${oldExt}`);
			}
		}

		// 6. Write file to disk
		const saved = await StorageService.saveFile(relativePath, buffer);
		if (!saved) {
			return NextResponse.json(
				{ success: false, error: { code: "SAVE_FAILED", message: "Failed to save image" } },
				{ status: 500 }
			);
		}

		// 7. Build the public URL served via the existing /api/files/serve route
		// Add a cache-busting timestamp so the browser always reloads the new image
		const avatarUrl = `/api/files/serve?file=${encodeURIComponent(relativePath)}`;

		// 8. Persist avatar URL in MongoDB
		const updatedUser = {
			...user,
			profile: {
				...user.profile,
				avatar: avatarUrl,
			},
		};
		await updateUser(updatedUser as any);

		return NextResponse.json({
			success: true,
			data: { avatarUrl },
		});
	} catch (error) {
		console.error("[Avatar Upload] Error:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Upload failed" } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/stage-manager/profile/avatar
 * Removes the avatar image from disk and clears the DB field.
 */
export const DELETE = async (request: NextRequest) => {
	try {
		const session = await getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
				{ status: 401 }
			);
		}

		const user = await getUserById(session.userId);
		if (!user || (user.role !== "stage_manager" && user.role !== "super_admin")) {
			return NextResponse.json(
				{ success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
				{ status: 403 }
			);
		}

		// Delete all possible extension variants
		for (const ext of ["jpg", "png", "webp", "gif"]) {
			await StorageService.deleteFile(`profile-images/${user.id}/avatar.${ext}`);
		}

		// Clear from DB
		const updatedUser = {
			...user,
			profile: {
				...user.profile,
				avatar: undefined,
			},
		};
		await updateUser(updatedUser as any);

		return NextResponse.json({ success: true, data: { avatarUrl: null } });
	} catch (error) {
		console.error("[Avatar Delete] Error:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Delete failed" } },
			{ status: 500 }
		);
	}
};
