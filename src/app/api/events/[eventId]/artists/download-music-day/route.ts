import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { EventDataService, StorageService } from "@/lib/storage-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";
import { getEventShowsByEvent, getEventParticipationsByEvent } from "@/lib/data-access";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { date, dayNumber, eventName } = body;

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

		// Fetch all artists data using unified fetching logic (Draft + FameLink submissions)
		await connectToDatabase();
		
		// 1. Manually added draft artists
		const draftArtists = (await EventArtistModel.find({ eventId }).lean()) as any[];

		// 2. FameLink EventShow submissions & participations
		const [eventShows, participations] = await Promise.all([
			getEventShowsByEvent(eventId),
			getEventParticipationsByEvent(eventId),
		]);

		const associatedArtistIds = new Set<string>();
		eventShows.forEach((es: any) => {
			if (es.artistId) associatedArtistIds.add(es.artistId);
		});
		participations.forEach((p: any) => {
			if (p.artistId) associatedArtistIds.add(p.artistId);
		});

		let allFameLinkArtists: any[] = [];
		if (associatedArtistIds.size > 0) {
			const FameLinkArtistModel = (await import("@/database/models/FameLinkArtist")).default;
			allFameLinkArtists = await FameLinkArtistModel.find({ id: { $in: Array.from(associatedArtistIds) } }).lean();
		}

		const artistProfileMap = new Map(
			allFameLinkArtists.map((a: any) => [a.id, a]),
		);

		const existingIds = new Set(draftArtists.map((a: any) => a.id));
		const existingEmails = new Set(
			draftArtists
				.map((a: any) => a.email?.toLowerCase().trim())
				.filter(Boolean),
		);

		const fameLinkArtists: any[] = [];
		const parseSnapshot = (raw: any): any => {
			if (!raw) return {};
			if (typeof raw === "string") {
				try { return JSON.parse(raw); } catch { return {}; }
			}
			return raw;
		};

		for (const es of eventShows) {
			if (existingIds.has(es.artistId)) continue;
			if (!es.snapshotJson) continue;

			const rawSnapshot = parseSnapshot(es.snapshotJson);
			const snapshot = {
				...rawSnapshot,
				...(es.overrides || {}),
			};

			const freshProfile = artistProfileMap.get(es.artistId) as any;

			let latestMusicTrack = freshProfile?.musicTrack || snapshot.musicTrack || null;
			if (latestMusicTrack?.file_url && !latestMusicTrack.url) {
				latestMusicTrack = { ...latestMusicTrack, url: latestMusicTrack.file_url };
			}

			const famelinkArtist = {
				id: es.artistId,
				eventId,
				artistName: snapshot.name || "FameLink Artist",
				realName: snapshot.name || "",
				email: freshProfile?.email || "",
				style: snapshot.style || "",
				musicTrack: latestMusicTrack,
				galleryFiles: freshProfile?.galleryFiles || snapshot.galleryFiles || [],
				performanceDate: es.overrides?.performanceDate || null,
				performance_date: es.overrides?.performanceDate || null,
				isFameLinkSubmission: true,
				eventShowId: es.id,
			};

			if (
				famelinkArtist.email &&
				existingEmails.has(famelinkArtist.email.toLowerCase().trim())
			) {
				continue;
			}

			fameLinkArtists.push(famelinkArtist);
		}

		const allArtists = [...draftArtists, ...fameLinkArtists];

		// Filter artists by performance date
		const artistsForDay = allArtists.filter((artist: any) => {
			const performanceDate =
				artist.performanceDate || artist.performance_date;
			if (!performanceDate) return false;

			let artistDate: string;
			try {
				if (typeof performanceDate === "string") {
					if (performanceDate.includes("T")) {
						artistDate = performanceDate.split("T")[0];
					} else if (
						performanceDate.includes("-") &&
						performanceDate.length === 10
					) {
						artistDate = performanceDate;
					} else {
						const parsedDate = new Date(performanceDate);
						const year = parsedDate.getFullYear();
						const month = String(
							parsedDate.getMonth() + 1,
						).padStart(2, "0");
						const day = String(parsedDate.getDate()).padStart(
							2,
							"0",
						);
						artistDate = `${year}-${month}-${day}`;
					}
				} else {
					const dateObj = new Date(performanceDate);
					const year = dateObj.getFullYear();
					const month = String(dateObj.getMonth() + 1).padStart(
						2,
						"0",
					);
					const day = String(dateObj.getDate()).padStart(2, "0");
					artistDate = `${year}-${month}-${day}`;
				}
			} catch (error) {
				console.error(
					`Error parsing performance_date for artist ${artist.id}:`,
					performanceDate,
					error,
				);
				return false;
			}

			let normalizedSelectedDate = date;
			if (date.includes("T")) {
				normalizedSelectedDate = date.split("T")[0];
			}

			return artistDate === normalizedSelectedDate;
		});

		if (artistsForDay.length === 0) {
			return NextResponse.json(
				{ error: "No artists found for this day" },
				{ status: 404 },
			);
		}

		// Collect all tracks to download in parallel
		interface MusicTask {
			artistName: string;
			url: string;
		}
		const musicTasks: MusicTask[] = [];

		for (const artist of artistsForDay) {
			const artistName = artist.artistName || artist.artist_name;

			// Handle single musicTrack (new format)
			if (artist.musicTrack?.file_url) {
				musicTasks.push({
					artistName,
					url: artist.musicTrack.file_url
				});
			}

			// Handle multiple music tracks (old format) - only main tracks
			if (artist.musicTracks && Array.isArray(artist.musicTracks)) {
				for (const track of artist.musicTracks) {
					if (track.file_url && track.is_main_track) {
						musicTasks.push({
							artistName,
							url: track.file_url
						});
					}
				}
			}
		}

		// Download all tracks in parallel
		const musicResults = await Promise.all(
			musicTasks.map(async (task) => {
				const buffer = await readFileFromGCS(task.url);
				return { task, buffer };
			})
		);

		let musicCount = 0;
		for (const { task, buffer } of musicResults) {
			if (!buffer) continue;

			// Get file extension from the URL
			const urlParts = task.url.split(".");
			const extension =
				urlParts.length > 1
					? urlParts[urlParts.length - 1].split("?")[0]
					: "mp3";
			const filename = `${task.artistName}.${extension}`;
			zip.file(filename, buffer);
			musicCount++;
		}

		if (musicCount === 0) {
			return NextResponse.json(
				{ error: "No music files found for this day" },
				{ status: 404 },
			);
		}

		// Generate ZIP file
		const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

		const dayLabel = `Day_${dayNumber}_${new Date(date).toLocaleDateString(
			"en-US",
			{
				month: "short",
				day: "numeric",
			},
		)}`;

		return new NextResponse(zipBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="${dayLabel}_Music_${eventName || "Event"}.zip"`,
				"Content-Length": zipBuffer.byteLength.toString(),
				"x-file-size": zipBuffer.byteLength.toString(),
				"Access-Control-Expose-Headers": "x-file-size, content-length",
			},
		});
	} catch (error) {
		console.error("Error generating music day download:", error);
		return NextResponse.json(
			{ error: "Failed to generate music day download" },
			{ status: 500 },
		);
	}
}
