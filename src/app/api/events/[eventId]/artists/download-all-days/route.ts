import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { ModernPDFGenerator } from "@/lib/pdf-generator";
import { EventDataService, StorageService } from "@/lib/storage-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, ArtistLogisticsModel } from "@/database/models/FameLinkModels";
import { getEventShowsByEvent } from "@/lib/data-access";
import { ContractService } from "@/lib/contract-service";

function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw;
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artists, eventName } = body;

		if (!artists || !Array.isArray(artists) || artists.length === 0) {
			return NextResponse.json(
				{ error: "No artists provided for download" },
				{ status: 400 },
			);
		}

		const zip = new JSZip();

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

				// If filePath is serving API URL, parse query param to obtain relative path
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

				// Decodes URI components (e.g. %20 to space)
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

		// Connect to the database
		await connectToDatabase();

		// Pre-fetch shared data collections once to avoid redundant O(N) database / disk queries inside the loop
		const [eventShows, contractArtists] = await Promise.all([
			getEventShowsByEvent(eventId),
			ContractService.getArtists(eventId),
		]);

		// Helper to retrieve complete artist data from any source
		const getCompleteArtistData = async (artistId: string, eventShowId?: string) => {
			// 1. Check EventArtistModel (MongoDB Draft/Registered Artist)
			let artistDoc = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;
			
			// 2. Check EventShow Model (FameLink submission)
			if (!artistDoc) {
				const es = eventShowId
					? eventShows.find((es: any) => es.id === eventShowId || es._id?.toString() === eventShowId)
					: eventShows.find((es: any) => es.artistId === artistId);
				if (es && es.snapshotJson) {
					const rawSnapshot = parseSnapshot(es.snapshotJson);
					artistDoc = {
						...rawSnapshot,
						...(es.overrides || {}),
						id: artistId,
						eventId,
						artistName: rawSnapshot.name || rawSnapshot.artistName || "FameLink Artist",
						isFameLinkSubmission: true,
					};
				}
			}

			// 3. Check ContractService (GCS Contract Artist)
			if (!artistDoc) {
				const cArtist = contractArtists.find((a: any) => a.id === artistId);
				if (cArtist) {
					artistDoc = {
						...cArtist,
						artistName: cArtist.stageName || cArtist.name || "Contract Artist",
					};
				}
			}

			if (artistDoc) {
				// Enrich with logistics travelers
				const logisticsDoc = await ArtistLogisticsModel.findOne({ artistId }).lean() as any;
				artistDoc.travelers = logisticsDoc?.travelers || artistDoc.members || artistDoc.groupMembers || [];
			}

			return artistDoc;
		};

		// Group input artists by performance_date
		const artistsByDate: Record<string, typeof artists> = {};
		for (const artist of artists) {
			let dateStr = artist.performance_date || artist.performanceDate || "unassigned";
			if (dateStr !== "unassigned") {
				try {
					dateStr = new Date(dateStr).toISOString().split("T")[0];
				} catch (e) {
					dateStr = "unassigned";
				}
			}
			if (!artistsByDate[dateStr]) {
				artistsByDate[dateStr] = [];
			}
			artistsByDate[dateStr].push(artist);
		}

		// Get sorted dates (ignoring unassigned for all-days export, but just in case, filter them out)
		const sortedDates = Object.keys(artistsByDate)
			.filter((date) => date !== "unassigned")
			.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

		// Process all days in parallel
		await Promise.all(
			sortedDates.map(async (dateStr, dateIndex) => {
				const dayNumber = dateIndex + 1;
				const dayArtists = artistsByDate[dateStr];

				const dateObj = new Date(dateStr);
				const formattedDate = isNaN(dateObj.getTime())
					? dateStr.replace(/[^a-zA-Z0-9-]/g, "_")
					: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(/[^a-zA-Z0-9]/g, "_");

				// Create Day folder
				const dayFolder = zip.folder(`Day_${dayNumber}_${formattedDate}`);

				// Process each artist inside this day sequentially to maintain index order properly in folder name, or map index
				await Promise.all(
					dayArtists.map(async (artistTarget, artistIndex) => {
						try {
							const { artistId, eventShowId } = artistTarget;
							const artist = await getCompleteArtistData(artistId, eventShowId);
							if (!artist) {
								console.error(`Artist not found: ${artistId}`);
								return;
							}

							const artistFolderName = `${String(artistIndex + 1).padStart(2, "0")}_${
								artist.artistName || artist.artist_name
							}`.replace(/[^a-zA-Z0-9_ -]/g, "");

							const artistFolder = dayFolder?.folder(artistFolderName);

							// Collect file download tasks
							interface FetchTask {
								type: "profile" | "music" | "gallery" | "rehearsal" | "passport" | "visa";
								url: string;
								meta?: any;
							}
							const tasks: FetchTask[] = [];

							const profileImageSrc = artist.image_url || artist.image || artist.profileImage || "";
							if (profileImageSrc) {
								tasks.push({ type: "profile", url: profileImageSrc });
							}

							if (artist.musicTrack?.file_url) {
								tasks.push({
									type: "music",
									url: artist.musicTrack.file_url,
									meta: {
										fileName: artist.artistName || artist.artist_name,
										isMain: true
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
												fileName: track.song_title 
													? `${artist.artistName || artist.artist_name}_${track.song_title}`
													: `${artist.artistName || artist.artist_name}_Track_${track.id || Date.now()}`,
												isMain: track.is_main_track
											}
										});
									}
								}
							}

							if (artist.galleryFiles && Array.isArray(artist.galleryFiles)) {
								for (const file of artist.galleryFiles) {
									if (file.url) {
										tasks.push({
											type: "gallery",
											url: file.url,
											meta: { fileName: file.name || `gallery_${Date.now()}` }
										});
									}
								}
							}

							if (artist.rehearsalVideo && artist.rehearsalVideo.url) {
								tasks.push({
									type: "rehearsal",
									url: artist.rehearsalVideo.url,
									meta: { fileName: artist.rehearsalVideo.name || `rehearsal_video_${Date.now()}` }
								});
							}

							const travelers = artist.travelers || [];
							if (travelers && Array.isArray(travelers)) {
								for (const traveler of travelers) {
									const travelerName = (traveler.fullPassportName || traveler.name || `Traveler_${traveler.id}`).replace(/[^a-zA-Z0-9.-]/g, "_");
									if (traveler.passportCopyUrl) {
										tasks.push({
											type: "passport",
											url: traveler.passportCopyUrl,
											meta: { travelerName }
										});
									}
									if (traveler.visaCopyUrl) {
										tasks.push({
											type: "visa",
											url: traveler.visaCopyUrl,
											meta: { travelerName }
										});
									}
								}
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
							const logisticsFolder = artistFolder?.folder("Logistics");

							for (const { task, buffer } of results) {
								if (!buffer) continue;

								if (task.type === "profile") {
									profileImageBuffer = buffer;
									const extension = task.url.split(".").pop() || "jpg";
									artistFolder?.file(`Profile.${extension}`, buffer);
								} else if (task.type === "music") {
									const extension = task.url.split(".").pop() || "mp3";
									musicFolder?.file(
										`${task.meta.fileName}.${extension}`,
										buffer,
									);
								} else if (task.type === "gallery") {
									galleryFolder?.file(task.meta.fileName, buffer);
								} else if (task.type === "rehearsal") {
									rehearsalFolder?.file(task.meta.fileName, buffer);
								} else if (task.type === "passport") {
									const extension = task.url.split(".").pop() || "jpg";
									logisticsFolder?.file(
										`${task.meta.travelerName}_Passport.${extension}`,
										buffer,
									);
								} else if (task.type === "visa") {
									const extension = task.url.split(".").pop() || "jpg";
									logisticsFolder?.file(
										`${task.meta.travelerName}_Visa.${extension}`,
										buffer,
									);
								}
							}

							// Generate and add overview PDF
							const artistPdfGenerator = new ModernPDFGenerator();
							const artistPdfBuffer = await artistPdfGenerator.generateArtistOverview(
								artist,
								eventName,
								profileImageBuffer,
							);
							artistFolder?.file(
								`${artist.artistName || artist.artist_name}_Info.pdf`,
								artistPdfBuffer,
							);
						} catch (err) {
							console.error(`Error processing artist ${artistTarget.artistId}:`, err);
						}
					})
				);
			})
		);

		// Generate ZIP file
		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="All_Days_Artists_${sanitizedEventName}.zip"`,
				"Content-Length": zipBuffer.byteLength.toString(),
				"x-file-size": zipBuffer.byteLength.toString(),
				"Access-Control-Expose-Headers": "x-file-size, content-length",
			},
		});
	} catch (error) {
		console.error("Error generating all days download:", error);
		return NextResponse.json(
			{ error: "Failed to generate all days download" },
			{ status: 500 },
		);
	}
}
