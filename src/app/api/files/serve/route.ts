import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Absolute path to the uploads directory
const UPLOADS_ROOT = process.env.NODE_ENV === "production" 
    ? "/www/wwwroot/uploads" 
    : path.join(process.cwd(), "uploads");

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get("file");

        if (!fileName) {
            return new NextResponse("File name is required", { status: 400 });
        }

        // Security check: Prevent directory traversal
        const safeFileName = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.join(UPLOADS_ROOT, safeFileName);

        // Check if file exists
        let filePathToServe = absolutePath;
        if (!fs.existsSync(absolutePath)) {
            console.error(`File not found: ${absolutePath}`);

            // Dev fallback: if running locally and file is not found, try to fetch from production VPS
            if (process.env.NODE_ENV !== "production") {
                const prodUrl = `http://31.97.203.114:3050/api/files/serve?file=${encodeURIComponent(fileName)}`;
                console.log(`[Files API] Dev fallback: Proxying request to ${prodUrl}`);
                try {
                    const prodRes = await fetch(prodUrl);
                    if (prodRes.ok) {
                        const blob = await prodRes.blob();
                        const headers = new Headers();
                        headers.set("Content-Type", prodRes.headers.get("Content-Type") || "application/octet-stream");
                        headers.set("Cache-Control", "public, max-age=31536000, immutable");
                        return new NextResponse(blob, {
                            status: 200,
                            headers,
                        });
                    }
                } catch (proxyErr) {
                    console.error("[Files API] Dev fallback proxy failed:", proxyErr);
                }
            }

            const ext = path.extname(absolutePath).toLowerCase();
            const fallbackAudioPath = path.join(process.cwd(), "public", "alarm.mp3");
            if ([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"].includes(ext) && fs.existsSync(fallbackAudioPath)) {
                console.warn("[Files API] Falling back to serving public/alarm.mp3");
                filePathToServe = fallbackAudioPath;
            } else {
                return new NextResponse("File not found", { status: 404 });
            }
        }

        // Read file
        const fileBuffer = fs.readFileSync(filePathToServe);
        
        // Determine content type
        const ext = path.extname(filePathToServe).toLowerCase();
        let contentType = "application/octet-stream";
        
        const mimeTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/m4a",
            ".pdf": "application/pdf",
            ".txt": "text/plain",
        };

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        // Return file
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
