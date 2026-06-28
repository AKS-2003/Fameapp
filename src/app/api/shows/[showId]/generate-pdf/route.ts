import { NextRequest, NextResponse } from "next/server";
import { generateShowPDF } from "@/lib/react-pdf-generator";
import { getBaseShowBySlug } from "@/lib/data-access";
import { StorageService } from "@/lib/storage-service";
import fs from "fs";
import path from "path";

interface RouteParams {
	params: Promise<{ showId: string }>;
}

// POST /api/shows/[showId]/generate-pdf
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { showId } = await params;
		const body = await request.json();
		const { slug } = body;

		let show: any = null;
		if (slug) {
			show = await getBaseShowBySlug(slug);
		}
		if (!show) {
			return NextResponse.json(
				{ success: false, error: { message: "Show not found" } },
				{ status: 404 },
			);
		}

		// Fetch profile image
		let profileImageBuffer: ArrayBuffer | undefined;
		const imageUrl = show.profileImage || show.image_url;
		if (imageUrl) {
			try {
				let cleanPath = imageUrl;
				if (cleanPath.startsWith("gs://"))
					cleanPath = cleanPath.replace(/^gs:\/\/[^/]+\//, "");
				const buffer = await StorageService.readFileAsBuffer(cleanPath);
				if (buffer) profileImageBuffer = buffer;
			} catch {
				/* skip */
			}
		}

		// Fetch gallery images
		const galleryImageBuffers: ArrayBuffer[] = [];
		if (show.galleryFiles && Array.isArray(show.galleryFiles)) {
			for (const file of show.galleryFiles) {
				if (file.url && file.type === "image") {
					try {
						let cleanPath = file.url;
						if (cleanPath.startsWith("gs://"))
							cleanPath = cleanPath.replace(
								/^gs:\/\/[^/]+\//,
								"",
							);
						const buf =
							await StorageService.readFileAsBuffer(cleanPath);
						if (buf) galleryImageBuffers.push(buf);
					} catch {
						/* skip */
					}
				}
			}
		}

		// Load logo
		let logoBuffer: ArrayBuffer | undefined;
		try {
			const logoPath = path.join(
				process.cwd(),
				"public",
				"fame-logo.png",
			);
			const logoBuf = fs.readFileSync(logoPath);
			logoBuffer = logoBuf.buffer.slice(
				logoBuf.byteOffset,
				logoBuf.byteOffset + logoBuf.byteLength,
			);
		} catch {
			/* skip */
		}

		const pdfBuffer = await generateShowPDF({
			show,
			profileImageBuffer,
			galleryImageBuffers:
				galleryImageBuffers.length > 0
					? galleryImageBuffers
					: undefined,
			logoBuffer,
		});

		const safeName = (show.name || "Show").replace(
			/[^a-zA-Z0-9\-_\s]/g,
			"",
		);

		return new NextResponse(pdfBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${safeName}_FameLink.pdf"`,
			},
		});
	} catch (error) {
		console.error("Error generating show PDF:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Failed to generate PDF" } },
			{ status: 500 },
		);
	}
}
