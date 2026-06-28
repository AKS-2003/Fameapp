import { NextRequest, NextResponse } from "next/server";
import { APIResponse } from "@/types";
import { sendArtistVerificationEmail } from "@/lib/email-service";
import {
	getEventShowsByEvent,
	getEventParticipationsByEvent,
} from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";

/** Safely parse snapshotJson — it may be stored as a JSON string or already an object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw);
		} catch {
			return {};
		}
	}
	return raw;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);

		await connectToDatabase();

		// ── 1. FAME/draft artists added manually by the stage manager ──────────
		const draftArtists = (await EventArtistModel.find({ eventId }).lean()) as any[];

		// Build a lookup map from email → draft artist (for merging agreement data into FameLink artists)
		const draftByEmail = new Map<string, any>();
		const draftById = new Map<string, any>();
		for (const d of draftArtists) {
			if (d.email) draftByEmail.set(d.email.toLowerCase().trim(), d);
			if (d.id) draftById.set(d.id, d);
		}

		// ── 2. FameLink EventShow submissions ──────────────────────────────────
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

		// IDs/emails already covered by draft artists — avoid duplicates
		const existingIds = new Set(draftArtists.map((a: any) => a.id));
		const existingEmails = new Set(
			draftArtists
				.map((a: any) => a.email?.toLowerCase().trim())
				.filter(Boolean),
		);

		// Count shows per FameLink artist for "Show X of Y" display
		const showCountByArtist = new Map<string, number>();
		const showIndexByEventShowId = new Map<string, number>();
		for (const es of eventShows) {
			if (existingIds.has(es.artistId)) continue;
			if (!es.snapshotJson) continue;
			const count = (showCountByArtist.get(es.artistId) || 0) + 1;
			showCountByArtist.set(es.artistId, count);
			showIndexByEventShowId.set(es.id, count);
		}

		const fameLinkArtists: any[] = [];

		for (const es of eventShows) {
			if (existingIds.has(es.artistId)) continue;
			if (!es.snapshotJson) continue;

			// ✅ KEY FIX: snapshotJson may be a JSON string — always parse it
			const rawSnapshot = parseSnapshot(es.snapshotJson);

			// Merge event-specific overrides on top of the snapshot
			const snapshot = {
				...rawSnapshot,
				...(es.overrides || {}),
				socialMedia: {
					...(rawSnapshot.socialMedia || {}),
					...(es.overrides?.socialMedia || {}),
				},
			};

			// Pull the freshest profile for media URLs
			const freshProfile = artistProfileMap.get(es.artistId) as any;

			// Normalise musicTrack URL (FameLink uses file_url, FAME UI expects url)
			let latestMusicTrack =
				freshProfile?.musicTrack || snapshot.musicTrack || null;
			if (latestMusicTrack?.file_url && !latestMusicTrack.url) {
				latestMusicTrack = { ...latestMusicTrack, url: latestMusicTrack.file_url };
			}

			// Participation gives us the confirmed/pending status
			const participation = participations.find(
				(p) => p.artistId === es.artistId && p.eventId === eventId,
			);

			const famelinkArtist = {
				id: es.artistId,
				eventId,
				artistName: snapshot.name || "FameLink Artist",
				realName: snapshot.name || "",
				email: freshProfile?.email || "",
				phone: freshProfile?.phone || snapshot.phone || "",
				style: snapshot.style || "",
				performanceType: snapshot.performanceType || "",
				performanceDuration: es.overrides?.duration || snapshot.duration || 0,
				biography: snapshot.biography || snapshot.description || "",
				// Costume
				costumeColor: snapshot.costumeColor || "",
				costumeColorTwo: snapshot.costumeColorTwo || "",
				costumeColorThree: snapshot.costumeColorThree || "",
				customCostumeColor: snapshot.customCostumeColor || "",
				manualCostumeColor: snapshot.manualCostumeColor || "",
				manualCostumeColorTwo: snapshot.manualCostumeColorTwo || "",
				manualCostumeColorThree: snapshot.manualCostumeColorThree || "",
				// Lighting
				lightColorSingle: snapshot.lightColorSingle || "",
				lightColorTwo: snapshot.lightColorTwo || "",
				lightColorThree: snapshot.lightColorThree || "",
				lightRequests: snapshot.lightRequests || "",
				manualLightColor: snapshot.manualLightColor || "",
				manualLightColorTwo: snapshot.manualLightColorTwo || "",
				manualLightColorThree: snapshot.manualLightColorThree || "",
				// Stage
				stagePositionStart: snapshot.stagePositionStart || "",
				stagePositionEnd: snapshot.stagePositionEnd || "",
				customStagePosition: snapshot.customStagePosition || "",
				// Tech / notes
				equipment: snapshot.equipment || "",
				showLink: snapshot.showLink || "",
				socialMedia: snapshot.socialMedia || {},
				mcNotes: es.overrides?.mcNotes || snapshot.mcNotes || "",
				stageManagerNotes: snapshot.stageManagerNotes || "",
				notes: es.overrides?.notes || snapshot.notes || "",
				// Media — prefer fresh profile data
				musicTrack: latestMusicTrack,
				galleryFiles: freshProfile?.galleryFiles?.length
					? freshProfile.galleryFiles
					: snapshot.galleryFiles || [],
				rehearsalVideo: freshProfile?.rehearsalVideo || snapshot.rehearsalVideo || null,
				image_url: freshProfile?.image_url || snapshot.profileImage || "",
				// People
				members: snapshot.members || [],
				tshirtSizes: snapshot.tshirtSizes || [],
				// Location
				countryLiving: freshProfile?.countryLiving || snapshot.countryLiving || "",
				homeCountry: freshProfile?.homeCountry || snapshot.homeCountry || "",
				// FameLink metadata
				isFameLinkSubmission: true,
				eventShowId: es.id,
				baseShowId: es.baseShowId,
				// Performance scheduling (from overrides)
				performanceDate: es.overrides?.performanceDate || null,
				performance_date: es.overrides?.performanceDate || null,
				performance_order: es.overrides?.performanceOrder ?? null,
				performanceOrder: es.overrides?.performanceOrder ?? null,
				performance_status: es.overrides?.performanceStatus ?? null,
				performanceStatus: es.overrides?.performanceStatus ?? null,
				rehearsal_order: es.overrides?.rehearsalOrder ?? null,
				rehearsal_date: es.overrides?.rehearsalDate ?? null,
				rehearsal_completed: es.overrides?.rehearsalCompleted ?? false,
				quality_rating: es.overrides?.qualityRating ?? null,
				cue_notes: es.overrides?.cueNotes ?? "",
				rehearsal_dept_notes: es.overrides?.rehearsal_dept_notes ?? null,
				available_order: es.overrides?.availableOrder ?? null,
				is_confirmed: es.overrides?.isConfirmed ?? false,
				is_completed: es.overrides?.isCompleted ?? false,
				completed_at: es.overrides?.completedAt ?? null,
				backstage_color: es.overrides?.backstageColor ?? null,
				backstageColor: es.overrides?.backstageColor ?? null,
				artists_page_color: es.overrides?.artistsPageColor ?? null,
				artistsPageColor: es.overrides?.artistsPageColor ?? null,
				artists_page_tag: es.overrides?.artistsPageTag ?? null,
				artistsPageTag: es.overrides?.artistsPageTag ?? null,
				// Status
				status:
					participation?.status === "confirmed" ? "confirmed" : "pending",
				createdAt: es.createdAt,
				updatedAt: es.updatedAt,
				// Show index
				showIndex: showIndexByEventShowId.get(es.id) || 1,
				totalShowsByArtist: showCountByArtist.get(es.artistId) || 1,
				// Agreement — merge from EventArtistModel (stage manager edits) so dates etc. flow to artist side
				agreement: (() => {
					const artistEmail = (freshProfile?.email || "").toLowerCase().trim();
					const draftRecord = draftById.get(es.artistId) || (artistEmail ? draftByEmail.get(artistEmail) : undefined);
					return draftRecord?.agreement ?? snapshot.agreement ?? null;
				})(),
			};

			// Skip if email already covered
			if (
				famelinkArtist.email &&
				existingEmails.has(famelinkArtist.email.toLowerCase().trim())
			) {
				continue;
			}

			fameLinkArtists.push(famelinkArtist);
		}

		// ── 3. Merge draft + FameLink, preserving order (drafts first) ─────────
		const allArtists = [...draftArtists, ...fameLinkArtists];

		return NextResponse.json<APIResponse>({
			success: true,
			data: allArtists,
		});
	} catch (error) {
		console.error("Get artists error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch artists",
				},
			},
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const artistData = await request.json();

		// Generate unique artist ID
		const artistId = `artist-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Create artist object
		const artist = {
			id: artistId,
			eventId,
			artistName: artistData.artistName,
			realName: artistData.realName,
			email: artistData.email,
			phone: artistData.phone,
			style: artistData.style,
			performanceType: artistData.performanceType,
			performanceDuration: artistData.performanceDuration,
			biography: artistData.biography,
			costumeColor: artistData.costumeColor,
			costumeColorTwo: artistData.costumeColorTwo,
			costumeColorThree: artistData.costumeColorThree,
			customCostumeColor: artistData.customCostumeColor,
			manualCostumeColor: artistData.manualCostumeColor,
			manualCostumeColorTwo: artistData.manualCostumeColorTwo,
			manualCostumeColorThree: artistData.manualCostumeColorThree,
			lightColorSingle: artistData.lightColorSingle,
			lightColorTwo: artistData.lightColorTwo,
			lightColorThree: artistData.lightColorThree,
			lightRequests: artistData.lightRequests,
			manualLightColor: artistData.manualLightColor,
			manualLightColorTwo: artistData.manualLightColorTwo,
			manualLightColorThree: artistData.manualLightColorThree,
			stagePositionStart: artistData.stagePositionStart,
			stagePositionEnd: artistData.stagePositionEnd,
			customStagePosition: artistData.customStagePosition,
			equipment: artistData.equipment,
			showLink: artistData.showLink,
			socialMedia: artistData.socialMedia,
			mcNotes: artistData.mcNotes,
			stageManagerNotes: artistData.stageManagerNotes,
			notes: artistData.notes,
			eventName: artistData.eventName,
			musicTrack: artistData.musicTrack || artistData.musicTracks?.[0] || null,
			galleryFiles: artistData.galleryFiles || [],
			rehearsalVideo: artistData.rehearsalVideo || null,
			image_url: artistData.image_url || "",
			countryLiving: artistData.countryLiving || "",
			homeCountry: artistData.homeCountry || "",
			members: artistData.members || [],
			tshirtSizes: artistData.tshirtSizes || [],
			managedBy: artistData.managedBy || "",
			status: artistData.status || "pending",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const normalizedEmail = artistData.email?.toLowerCase().trim();
		const normalizedArtistName = artistData.artistName?.toLowerCase().trim();

		await connectToDatabase();

		// Duplicate check by email
		if (normalizedEmail) {
			const dupEmail = await EventArtistModel.findOne({
				eventId,
				email: normalizedEmail,
			});
			if (dupEmail) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "DUPLICATE_EMAIL",
							message: `An artist with email "${artistData.email}" is already registered for this event.`,
						},
					},
					{ status: 409 },
				);
			}
		}

		// Duplicate check by name
		if (normalizedArtistName) {
			const dupName = await EventArtistModel.findOne({
				eventId,
				$or: [
					{
						artistName: {
							$regex: new RegExp(`^${normalizedArtistName}$`, "i"),
						},
					},
				],
			});
			if (dupName) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "DUPLICATE_NAME",
							message: `An artist with the name "${artistData.artistName}" is already registered for this event.`,
						},
					},
					{ status: 409 },
				);
			}
		}

		// Save directly to MongoDB
		await EventArtistModel.create(artist);

		// Broadcast WebSocket update
		if (global.io) {
			console.log(
				`Broadcasting artist_registered for ${artistData.artistName} → event_${eventId}`,
			);
			global.io.to(`event_${eventId}`).emit("artist_registered", {
				eventId,
				artistId,
				artist_name: artistData.artistName,
				timestamp: new Date().toISOString(),
			});
		}

		// Send verification email
		if (artistData.email) {
			try {
				await sendArtistVerificationEmail({
					artistName: artistData.artistName,
					artistId,
					email: artistData.email,
					eventName: artistData.eventName || "Event",
					eventId,
				});
				console.log(`✅ Verification email sent to ${artistData.email}`);
			} catch (emailError) {
				console.error("Failed to send verification email:", emailError);
			}
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: { id: artistId, artist },
		});
	} catch (error) {
		console.error("Create artist error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to create artist registration",
				},
			},
			{ status: 500 },
		);
	}
}
