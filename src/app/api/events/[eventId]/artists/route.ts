import { NextRequest, NextResponse } from "next/server";
import { APIResponse } from "@/types";
import { sendArtistVerificationEmail, sendArtistCredentialsEmail } from "@/lib/email-service";
import {
	getEventShowsByEvent,
	getEventParticipationsByEvent,
	getFameLinkArtistByEmail,
	createFameLinkArtist,
} from "@/lib/data-access";
import { hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";
import crypto from "crypto";

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
		const rawDraftArtists = (await EventArtistModel.find({ eventId }).lean()) as any[];

		// Helper: normalise a raw date string to YYYY-MM-DD, or null if invalid
		function toYMD(raw: string): string | null {
			if (!raw) return null;
			if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
			const iso = raw.substring(0, 10);
			return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
		}

		// Helper: extract ALL performance dates from agreement.schedule.performances
		function allAgreementPerfDates(agreement: any): string[] {
			const perfs: any[] = agreement?.schedule?.performances || [];
			return perfs.map((p: any) => toYMD(p.date || "")).filter(Boolean) as string[];
		}

		// Helper: return first agreement perf date (used for FameLink artists)
		function firstAgreementPerfDate(agreement: any): string | null {
			const dates = allAgreementPerfDates(agreement);
			return dates[0] || null;
		}

		// For draft artists: expand into one record per performance date from agreement.
		// If performance_date is already set (single date), keep as-is but also check agreement for extras.
		const draftArtists = rawDraftArtists.flatMap((d: any) => {
			const agreementDates = allAgreementPerfDates(d.agreement);
			const existingDate = toYMD(d.performance_date || d.performanceDate || "");

			// Collect all unique dates: existing field + agreement dates
			const allDates = Array.from(new Set([
				...(existingDate ? [existingDate] : []),
				...agreementDates,
			]));

			if (allDates.length === 0) return [d]; // no dates — return as-is (unassigned)
			if (allDates.length === 1) {
				// Single date — just ensure field is set
				return [{ ...d, performance_date: allDates[0], performanceDate: allDates[0] }];
			}
			// Multiple dates — one record per date with a unique composite id
			return allDates.map((date, i) => ({
				...d,
				id: i === 0 ? d.id : `${d.id}-day${i + 1}`,
				performance_date: date,
				performanceDate: date,
			}));
		});

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

			// Resolve agreement early so we can use it for performance_date fallback
			const resolvedAgreement = (() => {
				const artistEmail = (freshProfile?.email || "").toLowerCase().trim();
				const draftRecord = draftById.get(es.artistId) || (artistEmail ? draftByEmail.get(artistEmail) : undefined);
				return draftRecord?.agreement ?? snapshot.agreement ?? null;
			})();

			// Collect all performance dates: overrides date + all agreement dates (deduplicated)
			const overrideDate = toYMD(es.overrides?.performanceDate || "");
			const agreementDates = allAgreementPerfDates(resolvedAgreement);
			const allPerfDates = Array.from(new Set([
				...(overrideDate ? [overrideDate] : []),
				...agreementDates,
			]));
			// If no dates at all, still produce one record with null performance_date
			const datesToExpand = allPerfDates.length > 0 ? allPerfDates : [null];

			const baseArtist = {
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
				status: participation?.status === "confirmed" ? "confirmed" : "pending",
				createdAt: es.createdAt,
				updatedAt: es.updatedAt,
				showIndex: showIndexByEventShowId.get(es.id) || 1,
				totalShowsByArtist: showCountByArtist.get(es.artistId) || 1,
				agreement: resolvedAgreement,
			};

			// If this FameLink artist matches a draft by email or id, mark the draft as confirmed
			// instead of adding a duplicate record.
			const matchesDraftByEmail = baseArtist.email && existingEmails.has(baseArtist.email.toLowerCase().trim());
			const matchesDraftById = existingIds.has(es.artistId);
			if (matchesDraftByEmail || matchesDraftById) {
				const emailKey = baseArtist.email?.toLowerCase().trim();
				// The event show was submitted for a specific date (overrideDate).
				// Only mark the draft record whose performance_date matches that date.
				// If the event show has no date, fall back to marking any matching draft.
				const esDate = overrideDate || null;
				for (const draft of draftArtists) {
					const draftEmail = draft.email?.toLowerCase().trim();
					const isMatch = draft.id === es.artistId || (emailKey && draftEmail === emailKey);
					if (!isMatch) continue;
					const draftDate = toYMD(draft.performance_date || draft.performanceDate || "");
					// Only apply to the draft record for the same date, unless the event show has no date
					if (esDate && draftDate && esDate !== draftDate) continue;
					draft.isFameLinkSubmission = true;
					draft.eventShowId = draft.eventShowId || es.id;
					draft.baseShowId = draft.baseShowId || es.baseShowId;
				}
				continue;
			}

			// Expand: one record per performance date
			datesToExpand.forEach((date, i) => {
				fameLinkArtists.push({
					...baseArtist,
					id: i === 0 ? baseArtist.id : `${baseArtist.id}-day${i + 1}`,
					eventShowId: i === 0 ? es.id : `${es.id}-day${i + 1}`,
					performanceDate: date,
					performance_date: date,
				});
			});
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
			famelinkArtistId: artistData.famelinkArtistId || "",
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

		// If this email has no existing FameLink login account, create a real one now
		// with a generated password so the artist can log in immediately. Use the
		// famelinkArtistId already stored on the draft (and baked into the invite/magic
		// link) as the new account's id, so the existing link keeps resolving correctly —
		// NOT artistId, which is a separate id generated for the EventArtist draft record.
		let generatedPassword: string | null = null;
		if (normalizedEmail) {
			try {
				const existingFameLinkAccount = await getFameLinkArtistByEmail(normalizedEmail);
				if (!existingFameLinkAccount) {
					const newAccountId = artistData.famelinkArtistId || artistId;
					generatedPassword = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
					const hashedPassword = await hashPassword(generatedPassword);
					const verificationToken = crypto.randomBytes(32).toString("hex");

					await createFameLinkArtist({
						id: newAccountId,
						email: normalizedEmail,
						passwordHash: hashedPassword,
						artistName: artistData.artistName,
						realName: artistData.realName || "",
						phone: artistData.phone || "",
						tier: "free",
						emailVerified: true,
						verificationToken,
						verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					});

					await sendArtistCredentialsEmail({
						email: artistData.email,
						artistName: artistData.artistName,
						password: generatedPassword,
						eventName: artistData.eventName || "",
					});
					console.log(`✅ Login credentials created and emailed to ${artistData.email}`);
				}
			} catch (accountError) {
				console.error("Failed to create FameLink login account:", accountError);
			}
		}

		// Send the legacy "claim your draft" verification email only when we did NOT just
		// create a fresh login account above (otherwise the artist gets two conflicting emails).
		if (artistData.email && !generatedPassword) {
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
			data: { id: artistId, artist, generatedPassword },
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
