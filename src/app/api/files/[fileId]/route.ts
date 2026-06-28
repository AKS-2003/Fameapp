import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
// import { readJsonFile, writeJsonFile, deleteFile, getSignedUrl } from "@/lib/storage-service";
import { deleteFile, getSignedUrl } from "@/lib/storage-service";
import { getMediaFileById, deleteMediaFile as dataAccessDeleteMediaFile } from "@/lib/data-access";
import { APIResponse, MediaFile, SessionData } from "@/types";

// Get file information
export const GET = withAuth(async (request: NextRequest, session, context) => {
	try {
		const { fileId } = await context.params;

		if (!fileId) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FILE_ID",
						message: "File ID is required",
					},
				},
				{ status: 400 }
			);
		}

		// Find file in MongoDB
		let mediaFile = (await getMediaFileById(fileId)) as unknown as MediaFile | null;

		if (mediaFile && mediaFile.uploadedBy !== session.userId) {
			// Permission check
			mediaFile = null;
		}

		// Artist functionality removed - focusing on stage manager workflow

		if (!mediaFile) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FILE_NOT_FOUND",
						message: "File not found or access denied",
					},
				},
				{ status: 404 }
			);
		}

		// Generate fresh signed URL
		const fullFilePath = mediaFile.filename;
		const signedUrl = await getSignedUrl(
			fullFilePath,
			"read",
			new Date(Date.now() + 24 * 60 * 60 * 1000)
		); // 24 hours

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				file: {
					...mediaFile,
					url: signedUrl,
				},
			},
		});
	} catch (error) {
		console.error("Get file error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to retrieve file",
				},
			},
			{ status: 500 }
		);
	}
});

// Delete file
export const DELETE = withAuth(
	async (request: NextRequest, session, context) => {
		try {
			const { fileId } = await context.params;

			if (!fileId) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "MISSING_FILE_ID",
							message: "File ID is required",
						},
					},
					{ status: 400 }
				);
			}

			// Find file in MongoDB
			let mediaFile = (await getMediaFileById(fileId)) as unknown as MediaFile | null;
			let fileFound = false;
			let filePath = "";

			if (mediaFile && mediaFile.uploadedBy === session.userId) {
				fileFound = true;
				filePath = mediaFile.filename;
				await dataAccessDeleteMediaFile(fileId);
			}

			// Artist functionality removed - focusing on stage manager workflow

			if (!fileFound || !filePath) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "FILE_NOT_FOUND",
							message: "File not found or access denied",
						},
					},
					{ status: 404 }
				);
			}

			// Delete file from GCS
			try {
				await deleteFile(filePath);
			} catch (error) {
				console.warn(
					`Failed to delete file from GCS: ${filePath}`,
					error
				);
				// Continue even if GCS deletion fails - metadata is already removed
			}

			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message: "File deleted successfully",
					fileId,
				},
			});
		} catch (error) {
			console.error("Delete file error:", error);
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INTERNAL_ERROR",
						message: "Failed to delete file",
					},
				},
				{ status: 500 }
			);
		}
	}
);
