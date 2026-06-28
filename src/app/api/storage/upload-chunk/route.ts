import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js default body size limit is 4MB — disable it so we can receive 5MB chunks
export const maxDuration = 300; // 5 minutes max for large uploads

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

// Temp directory for assembling chunks — lives alongside the uploads root
const UPLOADS_ROOT =
	process.env.NODE_ENV === "production"
		? "/www/wwwroot/uploads"
		: path.join(process.cwd(), "uploads");

const TEMP_DIR = path.join(UPLOADS_ROOT, "_tmp_chunks");

async function ensureDir(dirPath: string) {
	if (!fs.existsSync(dirPath)) {
		await fs.promises.mkdir(dirPath, { recursive: true });
	}
}

/**
 * POST /api/storage/upload-chunk
 *
 * Accepts a single chunk of a multipart file upload.
 * Fields expected in FormData:
 *   - file        : Blob  — the raw chunk bytes
 *   - chunkIndex  : string — zero-based index of this chunk
 *   - totalChunks : string — total number of chunks
 *   - uploadId    : string — unique identifier for this upload session
 *   - fileName    : string — original file name
 *   - eventId     : string (optional)
 *   - artistId    : string (optional)
 *   - fileType    : string (optional)
 *   - folder      : string (optional) — overrides event/artist path
 *
 * Returns:
 *   - For intermediate chunks: { success: true, chunkIndex, received: true }
 *   - For the final chunk: { success: true, url, fileName }
 */
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();

		const chunk = formData.get("file") as File | null;
		const chunkIndexStr = formData.get("chunkIndex") as string;
		const totalChunksStr = formData.get("totalChunks") as string;
		const uploadId = formData.get("uploadId") as string;
		const fileName = formData.get("fileName") as string;
		const eventId = formData.get("eventId") as string | null;
		const artistId = formData.get("artistId") as string | null;
		const fileType = formData.get("fileType") as string | null;
		const folder = formData.get("folder") as string | null;

		// Validate required fields
		if (!chunk || !uploadId || !fileName || chunkIndexStr === null || !totalChunksStr) {
			return NextResponse.json(
				{ error: "Missing required fields: file, chunkIndex, totalChunks, uploadId, fileName" },
				{ status: 400, headers: CORS_HEADERS },
			);
		}

		const chunkIndex = parseInt(chunkIndexStr, 10);
		const totalChunks = parseInt(totalChunksStr, 10);

		if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || totalChunks < 1) {
			return NextResponse.json(
				{ error: "Invalid chunkIndex or totalChunks" },
				{ status: 400, headers: CORS_HEADERS },
			);
		}

		// Sanitize the uploadId to prevent path traversal
		const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "_");

		// ── Write this chunk to its own temp file (overwrites on retry — idempotent) ──
		await ensureDir(TEMP_DIR);
		const chunkFilePath = path.join(TEMP_DIR, `${safeUploadId}_chunk_${chunkIndex}`);
		const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
		await fs.promises.writeFile(chunkFilePath, chunkBuffer);

		console.log(
			`[ChunkUpload] Chunk ${chunkIndex + 1}/${totalChunks} saved for ${safeUploadId} ` +
			`(${(chunkBuffer.length / 1024).toFixed(1)} KB)`,
		);

		// ── If this is NOT the last chunk, acknowledge and wait for more ──
		if (chunkIndex < totalChunks - 1) {
			return NextResponse.json(
				{ success: true, received: true, chunkIndex },
				{ headers: CORS_HEADERS },
			);
		}

		// ── LAST CHUNK: stream-assemble all chunks into the final file ──
		// We never load more than one 5MB chunk into RAM — safe for 2GB+ files.
		console.log(`[ChunkUpload] All chunks received for ${safeUploadId}. Streaming assembly...`);

		// Verify all chunks exist before starting
		for (let i = 0; i < totalChunks; i++) {
			const partPath = path.join(TEMP_DIR, `${safeUploadId}_chunk_${i}`);
			if (!fs.existsSync(partPath)) {
				cleanupChunks(safeUploadId, totalChunks);
				return NextResponse.json(
					{ error: `Missing chunk ${i} — upload is incomplete. Please try again.` },
					{ status: 400, headers: CORS_HEADERS },
				);
			}
		}

		// Build the final destination path
		const timestamp = Date.now();
		const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
		let destFileName: string;

		if (folder) {
			destFileName = `${folder}/${timestamp}_${sanitizedFileName}`;
		} else {
			destFileName = `events/${eventId || "unknown"}/artists/${artistId || "unknown"}/${fileType || "uploads"}/${timestamp}_${sanitizedFileName}`;
		}

		const UPLOADS_ROOT =
			process.env.NODE_ENV === "production"
				? "/www/wwwroot/uploads"
				: path.join(process.cwd(), "uploads");

		const finalPath = path.join(UPLOADS_ROOT, destFileName);
		await ensureDir(path.dirname(finalPath));

		// Open a single write stream and pipe each chunk file into it sequentially.
		// Only one 5MB chunk buffer is in memory at any given moment.
		const writeStream = fs.createWriteStream(finalPath);

		for (let i = 0; i < totalChunks; i++) {
			const partPath = path.join(TEMP_DIR, `${safeUploadId}_chunk_${i}`);
			await new Promise<void>((resolve, reject) => {
				const readStream = fs.createReadStream(partPath);
				readStream.pipe(writeStream, { end: false }); // keep write stream open for next chunk
				readStream.on("end", resolve);
				readStream.on("error", reject);
				writeStream.on("error", reject);
			});
		}

		// Close the write stream
		await new Promise<void>((resolve, reject) => {
			writeStream.end();
			writeStream.on("finish", resolve);
			writeStream.on("error", reject);
		});

		// Clean up temp chunk files
		cleanupChunks(safeUploadId, totalChunks);

		const url = `/api/files/serve?file=${encodeURIComponent(destFileName)}`;
		const totalMB = (chunkBuffer.length * totalChunks / 1024 / 1024).toFixed(1); // rough estimate
		console.log(`[ChunkUpload] ✅ Assembled and saved: ${destFileName}`);

		return NextResponse.json(
			{ success: true, url, fileName: destFileName },
			{ headers: CORS_HEADERS },
		);
	} catch (error) {
		console.error("[ChunkUpload] Error:", error);
		return NextResponse.json(
			{
				error: `Chunk upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
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

/** Delete all temp chunk files for a given uploadId */
function cleanupChunks(safeUploadId: string, totalChunks: number) {
	for (let i = 0; i < totalChunks; i++) {
		const partPath = path.join(TEMP_DIR, `${safeUploadId}_chunk_${i}`);
		try {
			if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
		} catch {
			/* ignore cleanup errors */
		}
	}
}
