import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

/**
 * POST: Fallback for GCS signed URLs.
 * Since we migrated to Hostinger VPS Local Storage, we no longer use GCS signed URLs.
 * This route now returns the expected upload path so the client can use the /api/storage/upload endpoint instead.
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { fileName, eventId, artistId, fileType, folder } = body;

		// Build destination path
		const timestamp = Date.now();
		const sanitizedFileName = (fileName || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
		let localPath: string;

		if (folder) {
			localPath = `${folder}/${timestamp}_${sanitizedFileName}`;
		} else {
			localPath = `events/${eventId}/artists/${artistId}/${fileType}/${timestamp}_${sanitizedFileName}`;
		}

        // Return the path but point to our local upload API
		return NextResponse.json(
			{
				signedUrl: "/api/storage/upload", // Redirect client to our local upload API
				gcsPath: localPath,
				fileName: localPath,
                isLocal: true
			},
			{ headers: CORS_HEADERS },
		);
	} catch (error) {
		console.error("[Local Storage] Error:", error);
		return NextResponse.json(
			{ error: `Failed to process request: ${error instanceof Error ? error.message : "Unknown error"}` },
			{ status: 500, headers: CORS_HEADERS },
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
