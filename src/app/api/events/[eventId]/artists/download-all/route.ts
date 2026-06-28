import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { ModernPDFGenerator } from "@/lib/pdf-generator";
import { EventDataService, StorageService } from "@/lib/storage-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const {
			artistIds,
			eventName,
			includeOverview = true,
			includeMusic = true,
			includeGallery = true,
		} = body;

		const zip = new JSZip();
		const allArtistsFolder = zip.folder(
			`All_Artists_${eventName || "Event"}`,
		);

		// Helper function to read file from GCS
		const readFileFromGCS = async (
			filePath: string,
		): Promise<ArrayBuffer | null> => {
			try {
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

				return await StorageService.readFileAsBuffer(cleanPath);
			} catch (error) {
				console.error(
					`Error reading file from GCS: ${filePath}`,
					error,
				);
				return null;
			}
		};

		// Fetch all artists data directly from GCS
		const allArtists = await EventDataService.getArtists(eventId);

		// Process all artists in parallel
		await Promise.all(
			artistIds.map(async (artistId: string, index: number) => {
				try {
					// Find artist in the fetched data
					const artist = allArtists.find((a: any) => a.id === artistId);

					if (!artist) {
						console.error(`Artist not found: ${artistId}`);
						return;
					}

					// Create individual artist folder
					const artistFolder = allArtistsFolder?.folder(
						`${String(index + 1).padStart(2, "0")}_${
							artist.artistName || artist.artist_name || "Artist"
						}`.replace(/[^a-zA-Z0-9\-_\s]/g, ""),
					);

					// Collect all file download tasks for this artist
					interface FetchTask {
						type: "profile" | "music" | "gallery" | "rehearsal";
						url: string;
						meta?: any;
					}
					const tasks: FetchTask[] = [];

					if (includeOverview && artist.image_url) {
						tasks.push({ type: "profile", url: artist.image_url });
					}

					if (includeMusic) {
						if (artist.musicTrack?.file_url) {
							tasks.push({
								type: "music",
								url: artist.musicTrack.file_url,
								meta: {
									fileName: (() => {
										const ext = artist.musicTrack.file_url.split(".").pop()?.split('?')[0] || "mp3";
										return `${artist.artistName || artist.artist_name}.${ext}`;
									})()
								}
							});
						}

						if (artist.musicTracks && Array.isArray(artist.musicTracks)) {
							for (const track of artist.musicTracks) {
								if (track.file_url) {
									tasks.push({
										type: "music",
										url: track.file_url,
										meta: {
											fileName: (() => {
												const ext = track.file_url.split(".").pop()?.split('?')[0] || "mp3";
												const suffix = track.song_title 
													? `_${track.song_title}`
													: `_Track_${track.id || Date.now()}`;
												return `${artist.artistName || artist.artist_name}${suffix}.${ext}`;
											})()
										}
									});
								}
							}
						}
					}

					if (includeGallery && artist.galleryFiles && Array.isArray(artist.galleryFiles)) {
						for (const file of artist.galleryFiles) {
							if (file.url) {
								tasks.push({
									type: "gallery",
									url: file.url,
									meta: { fileName: file.name }
								});
							}
						}
					}

					if (includeGallery && artist.rehearsalVideo && artist.rehearsalVideo.url) {
						tasks.push({
							type: "rehearsal",
							url: artist.rehearsalVideo.url,
							meta: {
								fileName: artist.rehearsalVideo.name || `rehearsal_video_${Date.now()}`
							}
						});
					}

					// Fetch all buffers in parallel
					const results = await Promise.all(
						tasks.map(async (task) => {
							const buffer = await readFileFromGCS(task.url);
							return { task, buffer };
						})
					);

					let profileImageBuffer: ArrayBuffer | undefined;
					const musicFolder = artistFolder?.folder("Music");
					const galleryFolder = artistFolder?.folder("Gallery");
					const rehearsalFolder = artistFolder?.folder("Rehearsal_Video");

					for (const { task, buffer } of results) {
						if (!buffer) continue;

						if (task.type === "profile") {
							profileImageBuffer = buffer;
						} else if (task.type === "music") {
							musicFolder?.file(task.meta.fileName, buffer);
						} else if (task.type === "gallery") {
							galleryFolder?.file(task.meta.fileName, buffer);
						} else if (task.type === "rehearsal") {
							rehearsalFolder?.file(task.meta.fileName, buffer);
						}
					}

					// Generate modern individual artist PDF
					if (includeOverview) {
						const artistPdfGenerator = new ModernPDFGenerator();
						const artistPdfBuffer = await artistPdfGenerator.generateArtistOverview(
							artist,
							eventName || "Event",
							profileImageBuffer,
						);
						artistFolder?.file(
							`${artist.artistName || artist.artist_name}_Info.pdf`,
							artistPdfBuffer,
						);
					}
				} catch (error) {
					console.error(`Error processing artist ${artistId}:`, error);
				}
			})
		);

		// Generate the ZIP file
		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		// Return the ZIP file
		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="All_Artists_${
					eventName || "Event"
				}.zip"`,
				"Content-Length": zipBuffer.byteLength.toString(),
				"x-file-size": zipBuffer.byteLength.toString(),
				"Access-Control-Expose-Headers": "x-file-size, content-length",
			},
		});
	} catch (error) {
		console.error("Error generating all artists download:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to generate download" },
			{ status: 500 },
		);
	}
}
