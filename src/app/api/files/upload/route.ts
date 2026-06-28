import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
import { uploadFile, createFilePath } from "@/lib/storage-service";
// import { writeJsonFile, readJsonFile } from "@/lib/storage-service";
import { saveMediaFile } from "@/lib/data-access";
import { APIResponse, MediaFile } from "@/types";

export const POST = withAuth(async (request: NextRequest, session) => {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const category = formData.get("category") as string;
		const eventId = formData.get("eventId") as string;

		if (!file) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NO_FILE",
						message: "No file provided",
					},
				},
				{ status: 400 }
			);
		}

		if (!category || !["image", "audio", "document"].includes(category)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_CATEGORY",
						message:
							"Invalid file category. Must be image, audio, or document",
					},
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// Determine upload path based on user role and context
		let uploadPath: string;
		// Artist functionality removed - focusing on stage manager workflow
		uploadPath = createFilePath("user", session.userId, category);

		// Upload file to GCS
		const fileName = `${uploadPath}/${file.name}`;
		const url = await uploadFile(fileName, buffer, file.type);

		const uploadedFile: MediaFile = {
			id:
				Math.random().toString(36).substring(2) +
				Date.now().toString(36),
			filename: fileName,
			originalName: file.name,
			mimeType: file.type,
			size: buffer.length,
			url: url,
			uploadedBy: session.userId,
			uploadedAt: new Date(),
			category: category as "image" | "audio" | "video" | "document",
		};

		// Create MediaFile record
		const mediaFile: MediaFile = {
			id: uploadedFile.id,
			filename: uploadedFile.filename,
			originalName: uploadedFile.originalName,
			mimeType: uploadedFile.mimeType,
			size: uploadedFile.size,
			url: uploadedFile.url,
			uploadedBy: uploadedFile.uploadedBy,
			uploadedAt: uploadedFile.uploadedAt,
			category: uploadedFile.category as
				| "image"
				| "audio"
				| "video"
				| "document",
		};

		// Store file metadata in MongoDB
		if (eventId) {
			(mediaFile as any).eventId = eventId;
		}

		await saveMediaFile(mediaFile);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				file: mediaFile,
				message: "File uploaded successfully",
			},
		});
	} catch (error) {
		console.error("File upload error:", error);

		// Handle specific upload errors
		if (error instanceof Error) {
			if (
				error.message.includes("File size exceeds") ||
				error.message.includes("File type")
			) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "UPLOAD_VALIDATION_ERROR",
							message: error.message,
						},
					},
					{ status: 400 }
				);
			}
		}

		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "UPLOAD_ERROR",
					message: "Failed to upload file",
				},
			},
			{ status: 500 }
		);
	}
});
