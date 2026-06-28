import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";

import {
	getEventParticipation,
	createEventParticipation,
	updateEventParticipation,
	getBaseShowsByArtist,
	createEventShow,
	getFameLinkArtistById,
	getEventShowsByEvent,
	deleteEventShow,
	getEventById,
} from "@/lib/data-access";
import { EventParticipation, createBaseShowSnapshot } from "@/types/famelink";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

/**
 * GET /api/join-event/[eventId]
 * Returns the artist's participation status for this event + their shows.
 * Uses MongoDB exclusively (no GCS).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getArtistSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Not logged in" },
				},
				{ status: 401 },
			);
		}

		const { eventId } = await params;

		// Get event info from MongoDB
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

		// Check existing participation
		const participation = await getEventParticipation(
			session.userId,
			eventId,
		);

		// Get artist's shows
		const shows = await getBaseShowsByArtist(session.userId);

		return NextResponse.json({
			success: true,
			data: {
				event: {
					id: event.id,
					name: event.name,
					venueName: (event as any).venueName || (event as any).venue || "",
					startDate: (event as any).startDate || (event as any).date || "",
					endDate: (event as any).endDate || (event as any).date || "",
					description: (event as any).description,
					logoUrl: (event as any).logoUrl || null,
					showDates: (event as any).showDates || [],
				},
				participation,
				shows,
			},
		});
	} catch (error) {
		console.error("Error in GET /api/join-event:", error);
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

/**
 * POST /api/join-event/[eventId]
 *
 * Actions:
 *   { action: "join" }           → Creates a PENDING EventParticipation
 *   { action: "submit-show" }    → Creates EventShow snapshot, sets status = submitted
 *   { action: "resubmit-shows" } → Replaces existing EventShows
 *   { action: "decline" }        → Sets participation status to declined
 *
 * Uses MongoDB exclusively (no GCS).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getArtistSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Not logged in" },
				},
				{ status: 401 },
			);
		}

		const { eventId } = await params;
		const body = await request.json();
		const { action, baseShowId } = body;

		// Validate event exists — MongoDB only
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

		const artistId = session.userId;
		const now = new Date().toISOString();

		// Get artist profile for name
		const artist = await getFameLinkArtistById(artistId);
		const artistName = artist?.artistName || "Unknown Artist";

		// ---- ACTION: JOIN ----
		if (action === "join") {
			const existing = await getEventParticipation(artistId, eventId);
			if (existing) {
				// If submitted/confirmed but Event_Shows were all deleted, allow re-submit
				if (
					existing.status === "submitted" ||
					existing.status === "confirmed"
				) {
					const eventShows = await getEventShowsByEvent(eventId);
					const artistEventShows = eventShows.filter(
						(es: any) => es.artistId === artistId,
					);
					if (artistEventShows.length === 0) {
						const updated = {
							...existing,
							status: "pending" as const,
							updatedAt: now,
						};
						await updateEventParticipation(updated);
						return NextResponse.json({
							success: true,
							data: { participation: updated, alreadyJoined: false },
						});
					}
				}
				return NextResponse.json({
					success: true,
					data: { participation: existing, alreadyJoined: true },
				});
			}

			const participation: EventParticipation = {
				id: uuidv4(),
				eventId,
				artistId,
				artistName,
				status: "pending",
				joinedAt: now,
				updatedAt: now,
			};

			await createEventParticipation(participation);

			return NextResponse.json({
				success: true,
				data: { participation },
			});
		}

		// ---- ACTION: SUBMIT-SHOW ----
		if (action === "submit-show") {
			const showIds: string[] =
				body.baseShowIds || (baseShowId ? [baseShowId] : []);

			if (showIds.length === 0) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "REQ_004",
							message: "At least one baseShowId is required",
						},
					},
					{ status: 400 },
				);
			}

			const artistShows = await getBaseShowsByArtist(artistId);
			const eventShowIds: string[] = [];

			for (const showId of showIds) {
				const baseShow = artistShows.find((s) => s.id === showId);
				if (!baseShow) {
					return NextResponse.json(
						{
							success: false,
							error: {
								code: "REQ_004",
								message: `Show ${showId} not found or not yours`,
							},
						},
						{ status: 400 },
					);
				}

				const eventShowId = uuidv4();
				const snapshotJson = createBaseShowSnapshot(baseShow);

				await createEventShow({
					id: eventShowId,
					eventId,
					artistId,
					baseShowId: showId,
					snapshotJson,
					snapshotCreatedAt: now,
					overrides: {},
					status: "submitted",         // ← correct enum value
					performanceStatus: "not_started", // ← correct enum value
					createdAt: now,
					updatedAt: now,
				});

				eventShowIds.push(eventShowId);
			}

			// Update or create participation → SUBMITTED
			let participation = await getEventParticipation(artistId, eventId);
			if (participation) {
				participation = {
					...participation,
					status: "submitted",
					baseShowId: showIds[0],
					eventShowId: eventShowIds[0],
					submittedAt: now,
					updatedAt: now,
				};
				await updateEventParticipation(participation);
			} else {
				participation = {
					id: uuidv4(),
					eventId,
					artistId,
					artistName,
					status: "submitted",
					baseShowId: showIds[0],
					eventShowId: eventShowIds[0],
					joinedAt: now,
					submittedAt: now,
					updatedAt: now,
				};
				await createEventParticipation(participation);
			}

			return NextResponse.json({
				success: true,
				data: {
					participation,
					eventShowIds,
					eventShowId: eventShowIds[0],
				},
			});
		}

		// ---- ACTION: DECLINE ----
		if (action === "decline") {
			let participation = await getEventParticipation(artistId, eventId);
			if (participation) {
				participation = {
					...participation,
					status: "declined",
					declinedAt: now,
					updatedAt: now,
				};
				await updateEventParticipation(participation);
			} else {
				participation = {
					id: uuidv4(),
					eventId,
					artistId,
					artistName,
					status: "declined",
					joinedAt: now,
					declinedAt: now,
					updatedAt: now,
				};
				await createEventParticipation(participation);
			}

			return NextResponse.json({
				success: true,
				data: { participation },
			});
		}

		// ---- ACTION: RESUBMIT-SHOWS ----
		if (action === "resubmit-shows") {
			const showIds: string[] =
				body.baseShowIds || (baseShowId ? [baseShowId] : []);

			if (showIds.length === 0) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "REQ_004",
							message: "At least one baseShowId is required",
						},
					},
					{ status: 400 },
				);
			}

			const participation = await getEventParticipation(artistId, eventId);
			if (!participation) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "REQ_004",
							message: "No participation found for this event",
						},
					},
					{ status: 400 },
				);
			}

			// Get existing EventShows for this artist in this event
			const existingShows = await getEventShowsByEvent(eventId);
			const artistExistingShows = existingShows.filter(
				(s) => s.artistId === artistId,
			);

			// Delete existing shows that are NOT in the new showIds
			for (const es of artistExistingShows) {
				if (!showIds.includes(es.baseShowId)) {
					await deleteEventShow(es.id, eventId);
				}
			}

			// Create new EventShows with fresh snapshots only for new shows
			const artistShows = await getBaseShowsByArtist(artistId);
			const eventShowIds: string[] = [];
			let hasConfirmedShow = false;

			for (const showId of showIds) {
				const baseShow = artistShows.find((s) => s.id === showId);
				if (!baseShow) {
					return NextResponse.json(
						{
							success: false,
							error: {
								code: "REQ_004",
								message: `Show ${showId} not found or not yours`,
							},
						},
						{ status: 400 },
					);
				}

				const existingEventShow = artistExistingShows.find(
					(es) => es.baseShowId === showId,
				);

				if (existingEventShow) {
					// Preserve existing show and its overrides
					if (existingEventShow.status === "confirmed") {
						hasConfirmedShow = true;
					}
					eventShowIds.push(existingEventShow.id);
				} else {
					const eventShowId = uuidv4();
					const snapshotJson = createBaseShowSnapshot(baseShow);

					await createEventShow({
						id: eventShowId,
						eventId,
						artistId,
						baseShowId: showId,
						snapshotJson,
						snapshotCreatedAt: now,
						overrides: {},
						status: "submitted",         // ← correct enum value
						performanceStatus: "not_started", // ← correct enum value
						createdAt: now,
						updatedAt: now,
					});

					eventShowIds.push(eventShowId);
				}
			}

			const updatedParticipation = {
				...participation,
				status: hasConfirmedShow ? ("confirmed" as const) : ("submitted" as const),
				baseShowId: showIds[0],
				eventShowId: eventShowIds[0],
				submittedAt: participation.submittedAt || now,
				updatedAt: now,
			};
			await updateEventParticipation(updatedParticipation);

			return NextResponse.json({
				success: true,
				data: {
					participation: updatedParticipation,
					eventShowIds,
					eventShowId: eventShowIds[0],
				},
			});
		}

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "REQ_004",
					message:
						"Invalid action. Use: join, submit-show, resubmit-shows, decline",
				},
			},
			{ status: 400 },
		);
	} catch (error: any) {
		console.error("Error in POST /api/join-event:", error);

		if (error.message?.includes("already has a participation")) {
			return NextResponse.json({
				success: true,
				data: { alreadyJoined: true },
			});
		}

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
