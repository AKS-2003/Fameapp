import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Absolute path to the uploads directory
const UPLOADS_ROOT = process.env.NODE_ENV === "production" 
    ? "/www/wwwroot/uploads" 
    : path.join(process.cwd(), "uploads");

export async function GET(
	request: NextRequest,
	{ params }: { params: { path: string[] } }
) {
	try {
		const { path: pathParts } = await Promise.resolve(params);
		// Decode the path segments
		let relativePath = pathParts
			.map((segment) => decodeURIComponent(segment))
			.join("/");

		if (!relativePath) {
			return NextResponse.json({ error: "File path is required" }, { status: 400 });
		}

		// Failsafe: if the path has api/media or uploads prefixes, strip them
		if (relativePath.startsWith("api/media/")) {
			relativePath = relativePath.substring("api/media/".length);
		} else if (relativePath.startsWith("/api/media/")) {
			relativePath = relativePath.substring("/api/media/".length);
		} else if (relativePath.startsWith("uploads/")) {
			relativePath = relativePath.substring("uploads/".length);
		} else if (relativePath.startsWith("/uploads/")) {
			relativePath = relativePath.substring("/uploads/".length);
		}

        const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = path.join(UPLOADS_ROOT, safePath);

		// Check if file exists
		if (!fs.existsSync(absolutePath)) {
			console.error("[Download API] File not found:", absolutePath);
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

        const fileStat = fs.statSync(absolutePath);
        const filename = path.basename(safePath);

		// Return the download URL pointing to our media API with download flag
		return NextResponse.json({
			downloadUrl: `/api/media/${relativePath}`,
			filename: filename,
			size: fileStat.size,
            isLocal: true
		});
	} catch (error) {
		console.error("[Download API] Error:", error);
		return NextResponse.json(
			{ error: "Failed to process download request" },
			{ status: 500 }
		);
	}
}
