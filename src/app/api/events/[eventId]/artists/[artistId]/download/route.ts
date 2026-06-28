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
	{ params }: { params: { eventId: string; artistId: string } },
) {
	try {
		const { eventId, artistId } = await Promise.resolve(params);
		const body = await request.json();
		const { includeOverview, includeMusic, includeGallery, eventName, eventShowId } =
			body;

		// Fetch complete artist data from all data sources (Draft, FameLink, Contract)
		await connectToDatabase();

		let artist: any = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;

		if (!artist) {
			const eventShows = await getEventShowsByEvent(eventId);
			const es = eventShowId
				? eventShows.find((e: any) => e.id === eventShowId || e._id?.toString() === eventShowId)
				: eventShows.find((e: any) => e.artistId === artistId);
			if (es && es.snapshotJson) {
				const rawSnapshot = parseSnapshot(es.snapshotJson);
				artist = {
					...rawSnapshot,
					...(es.overrides || {}),
					id: artistId,
					eventId,
					artistName: rawSnapshot.name || rawSnapshot.artistName || "FameLink Artist",
					isFameLinkSubmission: true,
				};
			}
		}

		if (!artist) {
			const contractArtists = await ContractService.getArtists(eventId);
			const cArtist = contractArtists.find((a: any) => a.id === artistId);
			if (cArtist) {
				artist = {
					...cArtist,
					artistName: cArtist.stageName || cArtist.name || "Contract Artist",
				};
			}
		}

		if (!artist) {
			return NextResponse.json(
				{ error: "Artist not found" },
				{ status: 404 },
			);
		}

		// Enrich with logistics travelers
		const logisticsDoc = await ArtistLogisticsModel.findOne({ artistId }).lean() as any;
		const travelers = logisticsDoc?.travelers || artist.members || artist.groupMembers || [];

		const zip = new JSZip();

		// Helper function to read file from local VPS storage or public path
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

				const buffer = await StorageService.readFileAsBuffer(cleanPath);
				return buffer;
			} catch (error) {
				console.error(
					`Error reading file from VPS: ${filePath}`,
					error,
				);
				return null;
			}
		};

		// Collect all files to be read in parallel
		interface FetchTask {
			type: "profile" | "music" | "gallery" | "rehearsal" | "passport" | "visa";
			url: string;
			meta?: any;
		}
		const tasks: FetchTask[] = [];

		if (includeOverview) {
			const profileImageSrc = artist.image_url || artist.image || artist.profileImage || "";
			if (profileImageSrc) {
				tasks.push({ type: "profile", url: profileImageSrc });
			}
		}

		if (includeMusic) {
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
		}

		if (includeGallery && artist.galleryFiles && Array.isArray(artist.galleryFiles)) {
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

		if (includeGallery && artist.rehearsalVideo && artist.rehearsalVideo.url) {
			tasks.push({
				type: "rehearsal",
				url: artist.rehearsalVideo.url,
				meta: { fileName: artist.rehearsalVideo.name || `rehearsal_video_${Date.now()}` }
			});
		}

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
		const musicFolder = zip.folder("Music");
		const galleryFolder = zip.folder("Gallery");
		const rehearsalFolder = zip.folder("Rehearsal_Video");
		const logisticsFolder = zip.folder("Logistics");

		for (const { task, buffer } of results) {
			if (!buffer) continue;

			if (task.type === "profile") {
				profileImageBuffer = buffer;
				const extension = task.url.split(".").pop() || "jpg";
				zip.file(
					`${artist.artistName || artist.artist_name}_Profile.${extension}`,
					buffer,
				);
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

		// 1. Overview Tab - Generate PDF
		if (includeOverview) {
			const pdfGenerator = new ModernPDFGenerator();
			const pdfBuffer = await pdfGenerator.generateArtistOverview(
				artist,
				eventName,
				profileImageBuffer,
			);

			zip.file(
				`${artist.artistName || artist.artist_name}_Overview.pdf`,
				pdfBuffer,
			);
		}

		// Generate ZIP file
		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${
					artist.artistName || artist.artist_name
				}_${eventName}_Complete.zip"`,
				"Content-Length": zipBuffer.byteLength.toString(),
				"x-file-size": zipBuffer.byteLength.toString(),
				"Access-Control-Expose-Headers": "x-file-size, content-length",
			},
		});
	} catch (error) {
		console.error("Error generating artist download:", error);
		return NextResponse.json(
			{ error: "Failed to generate download" },
			{ status: 500 },
		);
	}
}
