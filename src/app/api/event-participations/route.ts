import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";
import {
	getEventParticipationsByArtist,
	getEventShowsByArtist,
	getEventById,
} from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";
import { getFameLinkArtistById } from "@/lib/data-access";
import { getUnifiedArtistsForEvent } from "@/lib/contract-utils";

/** Build a safe event object including showDates for the artist portal */
function buildEventObj(event: any) {
	if (!event) return null;
	return {
		id: event.id,
		name: event.name,
		venueName: (event as any).venue || (event as any).venueName || "",
		startDate: (event as any).date || (event as any).startDate || "",
		endDate: (event as any).date || (event as any).endDate || "",
		showDates: Array.isArray((event as any).showDates) ? (event as any).showDates : [],
		contractEnabled: (event as any).contractEnabled !== false,
		logisticsEnabled: (event as any).logisticsEnabled !== false,
		showInfoEnabled: (event as any).showInfoEnabled !== false,
		requireContractFirst: (event as any).requireContractFirst !== false,
	};
}

/** Get performance dates for a specific artist from contract data */
async function getArtistPerformanceDates(eventId: string, artistId: string, artistEmail?: string): Promise<string[]> {
	try {
		const allArtists = await getUnifiedArtistsForEvent(eventId);
		const matched = allArtists.find((a: any) =>
			a.id === artistId ||
			a.famelinkArtistId === artistId ||
			(artistEmail && a.email?.toLowerCase().trim() === artistEmail?.toLowerCase().trim())
		);
		if (!matched) return [];
		const perfs: any[] = matched.agreement?.schedule?.performances || [];
		const toYMD = (raw: string): string | null => {
			if (!raw) return null;
			if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
			const iso = raw.substring(0, 10);
			if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
			return null;
		};
		return perfs.map((p: any) => toYMD(p.date || "")).filter(Boolean) as string[];
	} catch {
		return [];
	}
}


/** Safely parse snapshotJson — may be a JSON string or already an object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw;
}

/**
 * GET /api/event-participations
 *
 * Returns ALL event assignments for the logged-in artist:
 *   1. EventParticipation records (joined via invite link flow)
 *   2. EventShow records (stage manager assigned the artist via FameLink invite)
 *   3. EventArtistModel records (stage manager manually drafted the artist by email)
 *
 * Deduplicates by eventId so the artist sees each event once.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		await connectToDatabase();

		const artistId = session.userId;

		// Fetch artist profile early so artistEmail is available for all enrichment paths
		const artistProfile = await getFameLinkArtistById(artistId).catch(() => null);
		const artistEmail = artistProfile?.email?.toLowerCase();

		// ── 1. Classic EventParticipation records (invite-link flow) ──────────
		const participations = await getEventParticipationsByArtist(artistId);

		console.log(
			`[event-participations] userId=${artistId}, found ${participations.length} classic participations`,
		);

		// Enrich with event + show details
		const enrichedParticipations = await Promise.all(
			participations.map(async (p) => {
				try {
					const event = await getEventById(p.eventId);
					const eventShows = await (async () => {
						try {
							const { getEventShowsByEvent } = await import("@/lib/data-access");
							return await getEventShowsByEvent(p.eventId);
						} catch { return []; }
					})();

					const artistShows = eventShows
						.filter((es) => es.artistId === artistId)
						.map((es) => {
							const snap = parseSnapshot(es.snapshotJson);
							return {
								eventShowId: es.id,
								baseShowId: es.baseShowId,
								showName: es.overrides?.name || snap.name || "Unnamed Show",
								status: es.status,
								performanceDate: es.overrides?.performanceDate || null,
							};
						});

					const perfDates = event ? await getArtistPerformanceDates(p.eventId, artistId, artistEmail) : [];
					return {
						...p,
						source: "participation",
						submittedShows: artistShows,
						showCount: artistShows.length,
						performanceDates: perfDates,
						event: buildEventObj(event),
					};
				} catch (error) {
					console.error(`Error enriching participation for event ${p.eventId}:`, error);
					return { ...p, source: "participation", submittedShows: [], showCount: 0, event: null };
				}
			}),
		);

		// ── 2. EventShow records (stage manager assigned via invite/FameLink) ──
		const eventShows = await getEventShowsByArtist(artistId);
		const eventShowEventIds = new Set(eventShows.map((es) => es.eventId));

		// Track which eventIds are already covered by participations
		const participationEventIds = new Set(participations.map((p) => p.eventId));

		const enrichedEventShows = await Promise.all(
			eventShows
				.filter((es) => !participationEventIds.has(es.eventId))
				.map(async (es) => {
					try {
						const snap = parseSnapshot(es.snapshotJson);
						const event = await getEventById(es.eventId);
						const showName = es.overrides?.name || snap.name || "Unnamed Show";

						const perfDates = event ? await getArtistPerformanceDates(es.eventId, artistId, artistEmail) : [];
						return {
							id: `eshow-${es.id}`,
							eventId: es.eventId,
							artistId,
							artistName: snap.artistName || "",
							status: es.status === "confirmed" ? "confirmed" : "pending" as any,
							source: "event_show",
							joinedAt: (es as any).createdAt || new Date().toISOString(),
							submittedAt: (es as any).createdAt,
							confirmedAt: es.status === "confirmed" ? (es as any).updatedAt : undefined,
							updatedAt: (es as any).updatedAt || new Date().toISOString(),
							submittedShows: [
								{
									eventShowId: es.id,
									baseShowId: es.baseShowId,
									showName,
									status: es.status,
									performanceDate: es.overrides?.performanceDate || null,
								},
							],
							showCount: 1,
							performanceDates: perfDates,
							performanceDate: es.overrides?.performanceDate || null,
							performanceOrder: es.overrides?.performanceOrder || null,
							event: buildEventObj(event),
						};
					} catch {
						return null;
					}
				}),
		);

		// ── 3. EventArtist (draft) records — stage manager manually added ─────
		// Only query if we have an email to match against
		const draftEntries: any[] = artistEmail
			? await EventArtistModel.find({ eventId: { $exists: true }, email: artistEmail }).lean()
			: [];


		// Deduplicate — exclude eventIds already covered above
		const coveredEventIds = new Set([
			...participationEventIds,
			...eventShowEventIds,
		]);

		const enrichedDrafts = await Promise.all(
			draftEntries
				.filter((d) => !coveredEventIds.has(d.eventId))
				.map(async (d) => {
					try {
						const event = await getEventById(d.eventId);
						const showName = d.showName || d.artistName || "Assigned Performance";

						const perfDates = event ? await getArtistPerformanceDates(d.eventId, artistId, artistEmail) : [];
						return {
							id: `draft-${d._id || d.id}`,
							eventId: d.eventId,
							artistId,
							artistName: d.artistName || artistProfile?.artistName || "",
							status: d.status === "confirmed" ? "confirmed" : "pending" as any,
							source: "draft_artist",
							joinedAt: d.createdAt || new Date().toISOString(),
							updatedAt: d.updatedAt || new Date().toISOString(),
							submittedShows: showName
								? [
									{
										eventShowId: d._id?.toString() || d.id,
										baseShowId: null,
										showName,
										status: d.status || "pending",
										performanceDate: d.performance_date || d.performanceDate || null,
									},
								]
								: [],
							showCount: showName ? 1 : 0,
							performanceDates: perfDates,
							performanceDate: d.performance_date || d.performanceDate || null,
							performanceOrder: d.performance_order || d.performanceOrder || null,
							notes: d.notes || "",
							event: buildEventObj(event),
						};
					} catch {
						return null;
					}
				}),
		);

		// ── Merge all sources and remove nulls / events that no longer exist ──
		const baseParticipations = [
			...enrichedParticipations,
			...enrichedEventShows.filter(Boolean),
			...enrichedDrafts.filter(Boolean),
		].filter((p) => p !== null && p.event !== null);

		const searchEmail = artistEmail?.toLowerCase().trim();
		const allParticipations = await Promise.all(baseParticipations.map(async (p: any) => {
			try {
				const allArtists = await getUnifiedArtistsForEvent(p.eventId);
				const matched = allArtists.find((a: any) => 
					a.id === artistId || 
					a.famelinkArtistId === artistId ||
					(searchEmail && a.email?.toLowerCase().trim() === searchEmail)
				);
				if (matched) {
					// Check the artist-specific override first; if there isn't one,
					// fall back to the event's own logisticsEnabled/showInfoEnabled toggle.
					return {
						...p,
						workflowContract: matched.workflowContract || "Required",
						workflowLogistics: matched.workflowLogistics || (p.event?.logisticsEnabled === false ? "Not Required" : "Required"),
						workflowShow: matched.workflowShow || (p.event?.showInfoEnabled === false ? "Not Required" : "Required"),
						artists_page_color: matched.artists_page_color || matched.artistsPageColor || null,
						artists_page_tag: matched.artists_page_tag || matched.artistsPageTag || null,
						contractDocStatus: matched.contractDocStatus || "draft",
						contractSignedByArtist: matched.contractSignedByArtist || false,
						contractSignedByOrganiser: matched.contractSignedByOrganiser || false,
					};
				}
			} catch (err) {
				console.error(`Error enriching workflow status for event ${p.eventId}:`, err);
			}
			return {
				...p,
				workflowContract: "Required",
				workflowLogistics: p.event?.logisticsEnabled === false ? "Not Required" : "Required",
				workflowShow: p.event?.showInfoEnabled === false ? "Not Required" : "Required",
				contractDocStatus: "draft",
				contractSignedByArtist: false,
				contractSignedByOrganiser: false,
			};
		}));

		console.log(
			`[event-participations] userId=${artistId} total: ${allParticipations.length} ` +
			`(${enrichedParticipations.length} classic + ${enrichedEventShows.filter(Boolean).length} eventShows + ${enrichedDrafts.filter(Boolean).length} drafts)`,
		);

		return NextResponse.json({
			success: true,
			data: { participations: allParticipations },
		});
	} catch (error) {
		console.error("Error fetching event participations:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
