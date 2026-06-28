import { NextRequest, NextResponse } from "next/server";
import { getAnySession } from "@/lib/session";

import {
	getEventShowsByEvent,
	getEventParticipation,
	getEventById,
	getUserById,
	getFameLinkArtistById,
} from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";

/** snapshotJson may be stored as a JSON string or as a plain object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw;
}

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

/**
 * GET /api/artist-event-view/[eventId]
 *
 * Returns the artist's event-specific view — fully MongoDB-backed:
 * - Event info (name, venue, dates)
 * - Their EventShow (snapshot + overrides from EventShowModel)
 * - Fallback to EventArtistModel for manually-added draft artists
 * - Performance order for the event
 * - Rehearsal schedule
 * - Participation status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getAnySession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const { eventId } = await params;

		// Allow stage managers to view a specific artist's dashboard via query param
		const url = new URL(request.url);
		const queryArtistId = url.searchParams.get("artistId");
		let artistId = session.userId;

		if (
			queryArtistId &&
			(session.role === "stage_manager" || session.role === "super_admin")
		) {
			artistId = queryArtistId;
		}

		// ── Get event info from MongoDB ────────────────────────────────────────
		const event = await getEventById(eventId);
		if (!event) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "EVENT_404", message: "Event not found" },
				},
				{ status: 404 },
			);
		}

		// ── Get stage manager contact info from MongoDB ────────────────────────
		let stageManagerEmail = "";
		if ((event as any).stageManagerId) {
			try {
				const smUser = await getUserById((event as any).stageManagerId);
				if (smUser) stageManagerEmail = smUser.email || "";
			} catch {
				// ignore — email will be empty
			}
		}

		// ── Get participation record ────────────────────────────────────────────
		const participation = await getEventParticipation(artistId, eventId);

		// ── Get all EventShows for this event ──────────────────────────────────
		const allEventShows = await getEventShowsByEvent(eventId);

		// Find this artist's EventShow(s)
		const myEventShows = allEventShows.filter(
			(es) => es.artistId === artistId,
		);

		// ── Fallback: also look in EventArtistModel for manually-drafted artists ─
		let draftArtistEntry: any = null;
		if (myEventShows.length === 0) {
			await connectToDatabase();

			// Get artist's email for lookup
			const artistProfile = await getFameLinkArtistById(artistId).catch(() => null);
			const artistEmail = artistProfile?.email?.toLowerCase();

			const query: any = { eventId, $or: [{ id: artistId }] };
			if (artistEmail) query.$or.push({ email: artistEmail });

			draftArtistEntry = await EventArtistModel.findOne(query).lean() as any;

			if (!draftArtistEntry) {
				// No event show AND no draft entry — return 404
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "ESHOW_404",
							message: "No show submission found for this event",
						},
					},
					{ status: 404 },
				);
			}
		}

		// ── Build performance order (all shows with a confirmed status or an order) ──
		const performanceOrder = allEventShows
			.filter(
				(es) =>
					es.status === "confirmed" ||
					es.overrides?.performanceOrder != null,
			)
			.sort(
				(a, b) =>
					(a.overrides?.performanceOrder ?? 999) -
					(b.overrides?.performanceOrder ?? 999),
			)
			.map((es) => ({
				artistId: es.artistId,
				showName:
					es.overrides?.name ||
					parseSnapshot(es.snapshotJson)?.name ||
					"Unknown Show",
				performanceOrder: es.overrides?.performanceOrder,
				duration: es.overrides?.duration || parseSnapshot(es.snapshotJson)?.duration,
				showStartTime: es.overrides?.showStartTime,
				backstageReadyTime: es.overrides?.backstageReadyTime,
				performanceDate: es.overrides?.performanceDate,
				status: es.status,
				performanceStatus: es.performanceStatus,
				isMe: es.artistId === artistId,
			}));

		// ── Build rehearsal schedule from overrides ────────────────────────────
		const rehearsalSchedule = allEventShows
			.filter((es) => es.overrides?.rehearsalStartTime)
			.sort((a, b) => {
				const aTime = a.overrides?.rehearsalStartTime || "";
				const bTime = b.overrides?.rehearsalStartTime || "";
				return aTime.localeCompare(bTime);
			})
			.map((es) => ({
				artistId: es.artistId,
				showName:
					es.overrides?.name ||
					parseSnapshot(es.snapshotJson)?.name ||
					"Unknown Show",
				rehearsalStartTime: es.overrides?.rehearsalStartTime,
				performanceDate: es.overrides?.performanceDate,
				isMe: es.artistId === artistId,
			}));

		// ── Build myShows — prefer EventShow, fall back to draft artist ────────
		const myShowsData =
			myEventShows.length > 0
				? myEventShows.map((es) => ({
					eventShowId: es.id,
					baseShowId: es.baseShowId,
					showName:
						es.overrides?.name ||
						parseSnapshot(es.snapshotJson)?.name ||
						"Unknown Show",
					snapshot: es.snapshotJson,
					overrides: es.overrides,
					status: es.status,
					performanceStatus: es.performanceStatus,
					snapshotCreatedAt: es.snapshotCreatedAt,
				}))
				: draftArtistEntry
				? [
					{
						eventShowId: draftArtistEntry._id?.toString() || draftArtistEntry.id,
						baseShowId: null,
						showName: draftArtistEntry.artistName || "Assigned Performance",
						snapshot: draftArtistEntry,
						overrides: {
							performanceDate:
								draftArtistEntry.performance_date ||
								draftArtistEntry.performanceDate,
							performanceOrder:
								draftArtistEntry.performance_order ||
								draftArtistEntry.performanceOrder,
						},
						status: draftArtistEntry.status || "pending",
						performanceStatus: "not_started",
						snapshotCreatedAt: draftArtistEntry.createdAt,
					},
				]
				: [];

		return NextResponse.json({
			success: true,
			data: {
				event: {
					id: (event as any).id,
					name: event.name,
					venueName: (event as any).venueName || (event as any).venue || "",
					startDate: (event as any).startDate || (event as any).date || "",
					endDate: (event as any).endDate || (event as any).date || "",
					description: (event as any).description,
					logoUrl: (event as any).logoUrl || null,
					showDates: (event as any).showDates || [],
					artist_edit_enabled: (event as any).artist_edit_enabled ?? false,
					stageManagerEmail,
					stageManagerPhone: (event as any).stageManagerPhone || "",
				},
				participation: participation
					? {
						id: participation.id,
						status: participation.status,
						submittedAt: (participation as any).submittedAt,
						confirmedAt: (participation as any).confirmedAt,
					}
					: null,
				myShows: myShowsData,
				performanceOrder,
				rehearsalSchedule,
			},
		});
	} catch (error) {
		console.error("Error in artist-event-view:", error);
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
