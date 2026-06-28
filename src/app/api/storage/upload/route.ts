import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage-service";

// Route segment config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

/**
 * POST: Upload files to Local VPS Storage. 
 * Replaces the old GCS-based upload with the new Hostinger VPS storage system.
 */
export async function POST(request: NextRequest) {
	try {
        const formData = await request.formData();
		const file = formData.get("file") as File;
		const eventId = formData.get("eventId") as string;
		const artistId = formData.get("artistId") as string;
		const fileType = formData.get("fileType") as string;
		const folder = formData.get("folder") as string;

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400, headers: CORS_HEADERS },
			);
		}

		// Build destination path
		const timestamp = Date.now();
		const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
		let fileName: string;

		if (folder) {
			fileName = `${folder}/${timestamp}_${sanitizedFileName}`;
		} else {
			fileName = `events/${eventId}/artists/${artistId}/${fileType}/${timestamp}_${sanitizedFileName}`;
		}

		console.log(`[Local Upload] Saving: ${fileName}`);

        // Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		
        // Use our refactored storage service
		const url = await uploadFile(fileName, buffer, file.type);

		return NextResponse.json(
			{
				success: true,
				data: { url, fileName },
				url,
				fileName,
				message: "File uploaded successfully to VPS",
			},
			{ headers: CORS_HEADERS },
		);
	} catch (error) {
		console.error("[Local Upload] Error:", error);
		return NextResponse.json(
			{ error: `Failed to upload file locally: ${error instanceof Error ? error.message : "Unknown error"}` },
			{ status: 500, headers: CORS_HEADERS },
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: CORS_HEADERS,
	});
}
