import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const type = (formData.get("type") as string) || "music";

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Create file path
		const timestamp = Date.now();
		const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
		const fileName = `events/${eventId}/${type}/${timestamp}_${sanitizedFileName}`;

		// Upload to GCS
		const result = await uploadFile(fileName, buffer, file.type);

		return NextResponse.json({
			success: true,
			url: result,
			path: fileName,
			message: "File uploaded successfully",
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to upload file",
			},
			{ status: 500 }
		);
	}
}
