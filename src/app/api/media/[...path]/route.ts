import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Absolute path to the uploads directory
const UPLOADS_ROOT = process.env.NODE_ENV === "production" 
    ? "/www/wwwroot/uploads" 
    : path.join(process.cwd(), "uploads");

// Map file extensions to content types for video/audio
const MEDIA_CONTENT_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	mov: "video/quicktime",
	avi: "video/x-msvideo",
	mkv: "video/x-matroska",
	webm: "video/webm",
	mpeg: "video/mpeg",
	mpg: "video/mpeg",
	"3gp": "video/3gpp",
	wmv: "video/x-ms-wmv",
	flv: "video/x-flv",
	ogv: "video/ogg",
	m4v: "video/mp4",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	aac: "audio/aac",
	flac: "audio/flac",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
};

function getContentType(filePath: string): string {
	const ext = filePath.split(".").pop()?.toLowerCase() || "";
	return MEDIA_CONTENT_TYPES[ext] || "application/octet-stream";
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { path: string[] } },
) {
	try {
		const { path: pathParts } = await Promise.resolve(params);
		const relativePath = pathParts.join("/");

		if (!relativePath) {
			return NextResponse.json({ error: "File path is required" }, { status: 400 });
		}

        // Security check: Prevent directory traversal
        const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.join(UPLOADS_ROOT, safePath);

		// Check if file exists
		let filePathToServe = absolutePath;
		let servingPath = safePath;
		if (!fs.existsSync(absolutePath)) {
			console.warn("[Media API] File not found:", absolutePath);

			// Dev fallback: if running locally and file is not found, try to fetch from production VPS
			if (process.env.NODE_ENV !== "production") {
				const prodUrl = `http://31.97.203.114:3050/api/media/${relativePath}`;
				console.log(`[Media API] Dev fallback: Proxying request to ${prodUrl}`);
				try {
					const prodRes = await fetch(prodUrl);
					if (prodRes.ok) {
						const blob = await prodRes.blob();
						const headers = new Headers();
						headers.set("Content-Type", prodRes.headers.get("Content-Type") || getContentType(servingPath));
						headers.set("Content-Length", blob.size.toString());
						headers.set("Cache-Control", "public, max-age=31536000, immutable");
						headers.set("Access-Control-Allow-Origin", "*");
						return new NextResponse(blob, {
							status: 200,
							headers,
						});
					}
				} catch (proxyErr) {
					console.error("[Media API] Dev fallback proxy failed:", proxyErr);
				}
			}

			// Try serving fallback alarm.mp3 if it's an audio format in dev/fallback mode
			const ext = absolutePath.split(".").pop()?.toLowerCase() || "";
			const fallbackAudioPath = path.join(process.cwd(), "public", "alarm.mp3");
			if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext) && fs.existsSync(fallbackAudioPath)) {
				console.warn("[Media API] Falling back to serving public/alarm.mp3");
				filePathToServe = fallbackAudioPath;
				servingPath = "public/alarm.mp3";
			} else {
				return NextResponse.json({ error: "File not found" }, { status: 404 });
			}
		}

		// Get file metadata
        const fileStat = fs.statSync(filePathToServe);
		const contentType = getContentType(servingPath);
		const fileSize = fileStat.size;

		// For range requests (important for video/audio seeking)
		const range = request.headers.get("range");

		if (range && fileSize > 0) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;

            if (start >= fileSize || end >= fileSize) {
                return new NextResponse(null, {
                    status: 416,
                    headers: { "Content-Range": `bytes */${fileSize}` }
                });
            }

            const fileStream = fs.createReadStream(filePathToServe, { start, end });
            const webStream = new ReadableStream({
                start(controller) {
                    fileStream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
                    fileStream.on("end", () => controller.close());
                    fileStream.on("error", (err) => controller.error(err));
                },
                cancel() { fileStream.destroy(); }
            });

			return new NextResponse(webStream as any, {
				status: 206,
				headers: {
					"Content-Range": `bytes ${start}-${end}/${fileSize}`,
					"Accept-Ranges": "bytes",
					"Content-Length": chunkSize.toString(),
					"Content-Type": contentType,
					"Cache-Control": "public, max-age=31536000, immutable",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		// For regular requests (no range)
		const fileStream = fs.createReadStream(filePathToServe);
        const webStream = new ReadableStream({
            start(controller) {
                fileStream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
                fileStream.on("end", () => controller.close());
                fileStream.on("error", (err) => controller.error(err));
            },
            cancel() { fileStream.destroy(); }
        });

		return new NextResponse(webStream as any, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Length": fileSize.toString(),
				"Accept-Ranges": "bytes",
				"Cache-Control": "public, max-age=31536000, immutable",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("[Media API] Error serving file:", error);
		return NextResponse.json(
			{ error: "Failed to serve media file", details: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}

export async function HEAD(
	request: NextRequest,
	{ params }: { params: { path: string[] } },
) {
	try {
		const { path: pathParts } = await Promise.resolve(params);
		const relativePath = pathParts.join("/");
		if (!relativePath) return new NextResponse(null, { status: 400 });

        const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.join(UPLOADS_ROOT, safePath);

		let filePathToServe = absolutePath;
		let servingPath = safePath;
		if (!fs.existsSync(absolutePath)) {
			const ext = absolutePath.split(".").pop()?.toLowerCase() || "";
			const fallbackAudioPath = path.join(process.cwd(), "public", "alarm.mp3");
			if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext) && fs.existsSync(fallbackAudioPath)) {
				filePathToServe = fallbackAudioPath;
				servingPath = "public/alarm.mp3";
			} else {
				return new NextResponse(null, { status: 404 });
			}
		}

        const fileStat = fs.statSync(filePathToServe);
		const contentType = getContentType(servingPath);

		return new NextResponse(null, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Length": fileStat.size.toString(),
				"Accept-Ranges": "bytes",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		return new NextResponse(null, { status: 500 });
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "Range, Content-Type",
		},
	});
}
