import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { generateShowPDF } from "@/lib/react-pdf-generator";
import { getBaseShowBySlug } from "@/lib/data-access";
import { StorageService } from "@/lib/storage-service";
import fs from "fs";
import path from "path";

interface RouteParams {
	params: Promise<{ showId: string }>;
}

async function readFileFromGCS(filePath: string): Promise<ArrayBuffer | null> {
	try {
		// Clean the path (remove gs:// if present)
		let cleanPath = filePath;
		if (cleanPath.startsWith("gs://")) {
			cleanPath = cleanPath.replace(/^gs:\/\/[^/]+\//, "");
		}
		
		// If it's a full URL, parse it to extract the pathname
		if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
			try {
				const urlObj = new URL(cleanPath);
				cleanPath = urlObj.pathname + urlObj.search;
			} catch (e) {
				console.error("Failed to parse full URL:", cleanPath, e);
			}
		}

		// If filePath is a VPS serving API URL, parse query param to obtain relative path
		if (cleanPath.includes("/api/files/serve") || cleanPath.includes("/api/media/serve")) {
			try {
				const urlObj = new URL(cleanPath, "http://localhost");
				const fileParam = urlObj.searchParams.get("file");
				if (fileParam) {
					cleanPath = fileParam;
				}
			} catch (e) {
				console.error("Failed to parse serve URL:", cleanPath, e);
			}
		}

		// Strip leading route prefixes if they are present in the path
		cleanPath = cleanPath.replace(/^\/?api\/media\//, "");
		cleanPath = cleanPath.replace(/^\/?uploads\//, "");

		// Decodes URI components (e.g. %20 to space) in case the URL/path is URL-encoded
		try {
			cleanPath = decodeURIComponent(cleanPath);
		} catch (e) {
			console.error("Failed to decode cleanPath:", cleanPath, e);
		}

		// StorageService now handles reading from /www/wwwroot/uploads on VPS
		return await StorageService.readFileAsBuffer(cleanPath);
	} catch (error) {
		console.error(`[Zip] Error reading file: ${filePath}`, error);
		return null;
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { showId } = await params;
		const body = await request.json();
		const { slug } = body;

		let show: any = null;
		if (slug) show = await getBaseShowBySlug(slug);
		if (!show) {
			return NextResponse.json(
				{ success: false, error: { message: "Show not found" } },
				{ status: 404 },
			);
		}

		const safeName = (show.name || "Show").replace(
			/[^a-zA-Z0-9\-_\s]/g,
			"",
		);
		const zip = new JSZip();

		// Collect all tasks to download in parallel
		interface ShowFetchTask {
			type: "profile" | "gallery" | "music" | "rehearsal";
			url: string;
			meta?: any;
		}
		const tasks: ShowFetchTask[] = [];

		const imageUrl = show.profileImage || show.image_url;
		if (imageUrl) {
			tasks.push({ type: "profile", url: imageUrl });
		}

		if (show.galleryFiles && Array.isArray(show.galleryFiles)) {
			for (const file of show.galleryFiles) {
				const fileUrl = file.url || file.file_url;
				if (fileUrl) {
					tasks.push({
						type: "gallery",
						url: fileUrl,
						meta: {
							fileType: file.type, // "image" or "video"
							name: file.name
						}
					});
				}
			}
		}

		const musicUrl = show.musicTrack?.file_url || show.musicTrack?.url;
		if (musicUrl) {
			tasks.push({
				type: "music",
				url: musicUrl,
				meta: {
					songTitle: show.musicTrack?.song_title || show.musicTrack?.name
				}
			});
		}

		const rehearsalUrl = show.rehearsalVideo?.url || show.rehearsalVideo?.file_url;
		if (rehearsalUrl) {
			tasks.push({
				type: "rehearsal",
				url: rehearsalUrl,
				meta: {
					name: show.rehearsalVideo?.name
				}
			});
		}

		// Execute all downloads in parallel
		const results = await Promise.all(
			tasks.map(async (task) => {
				const buffer = await readFileFromGCS(task.url);
				return { task, buffer };
			})
		);

		let profileImageBuffer: ArrayBuffer | undefined;
		const galleryImageBuffers: ArrayBuffer[] = [];
		const musicFolder = zip.folder("Music");
		const galleryFolder = zip.folder("Gallery");
		const rehearsalFolder = zip.folder("Rehearsal_Video");

		for (const { task, buffer } of results) {
			if (!buffer) continue;

			if (task.type === "profile") {
				profileImageBuffer = buffer;
				const extension = task.url.split(".").pop() || "jpg";
				zip.file(`${safeName}_Profile.${extension}`, buffer);
			} else if (task.type === "gallery") {
				const extension = task.url.split(".").pop()?.split('?')[0] || (task.meta.fileType === 'video' ? 'mp4' : 'jpg');
				const fileName = task.meta.name || `gallery_${Date.now()}`;
				galleryFolder?.file(
					fileName.includes('.') ? fileName : `${fileName}.${extension}`,
					buffer
				);

				if (task.meta.fileType === "image") {
					galleryImageBuffers.push(buffer);
				}
			} else if (task.type === "music") {
				const fileName = task.meta.songTitle || `${safeName}_Main_Track`;
				const extension = task.url.split(".").pop()?.split('?')[0] || "mp3";
				musicFolder?.file(`${fileName}.${extension}`, buffer);
			} else if (task.type === "rehearsal") {
				const extension = task.url.split(".").pop()?.split('?')[0] || "mp4";
				const fileName = task.meta.name || `rehearsal_video_${Date.now()}`;
				rehearsalFolder?.file(
					fileName.includes('.') ? fileName : `${fileName}.${extension}`,
					buffer
				);
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

		// Generate PDF using React PDF
		const pdfBuffer = await generateShowPDF({
			show,
			profileImageBuffer,
			galleryImageBuffers:
				galleryImageBuffers.length > 0
					? galleryImageBuffers
					: undefined,
			logoBuffer,
		});
		zip.file(`${safeName}_Overview.pdf`, pdfBuffer);

		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${safeName}_FameLink_Complete.zip"`,
				"Content-Length": zipBuffer.byteLength.toString(),
				"x-file-size": zipBuffer.byteLength.toString(),
				"Access-Control-Expose-Headers": "x-file-size, content-length",
			},
		});
	} catch (error) {
		console.error("Error generating show download:", error);
		return NextResponse.json(
			{
				success: false,
				error: { message: "Failed to generate download" },
			},
			{ status: 500 },
		);
	}
}
