import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";
import {
	getEventRequest,
	updateEventRequestStatus,
	getBaseShowsByArtist,
	createEventShow,
} from "@/lib/data-access";
import { createBaseShowSnapshot } from "@/types/famelink";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
	params: Promise<{ requestId: string }>;
}

// POST /api/event-requests/[requestId]/respond - Respond to event request
// Supports both single show (baseShowId) and multi-show (baseShowIds[]) selection
export async function POST(request: NextRequest, { params }: RouteParams) {
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

		const { requestId } = await params;
		const body = await request.json();
		const { baseShowId, baseShowIds, action, showSlots } = body;
		// showSlots: [{ baseShowId, performanceDate }] — new format with per-slot dates

		if (!action || !["accept", "decline"].includes(action)) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "REQ_004", message: "Invalid action" },
				},
				{ status: 400 },
			);
		}

		const eventRequest = await getEventRequest(requestId);

		if (!eventRequest) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "REQ_001", message: "Request not found" },
				},
				{ status: 404 },
			);
		}

		// Check if expired
		if (new Date(eventRequest.expiresAt) < new Date()) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "REQ_002", message: "Request has expired" },
				},
				{ status: 410 },
			);
		}

		// Check if already responded
		if (eventRequest.status !== "pending") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "REQ_003",
						message: "Request already responded",
					},
				},
				{ status: 409 },
			);
		}

		const now = new Date().toISOString();
		const eventShowIds: string[] = [];

		if (action === "accept") {
			// Build normalized list of { showId, performanceDate }
			let showEntries: { showId: string; performanceDate: string }[] = [];
			if (showSlots?.length) {
				// New format: [{ baseShowId, performanceDate }]
				showEntries = showSlots.map((s: any) => ({
					showId: s.baseShowId,
					performanceDate: s.performanceDate || "",
				}));
			} else {
				// Legacy format: baseShowIds[] or baseShowId
				const ids: string[] = baseShowIds || (baseShowId ? [baseShowId] : []);
				showEntries = ids.map((id) => ({ showId: id, performanceDate: "" }));
			}

			if (showEntries.length === 0) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "REQ_004",
							message: "At least one baseShowId is required for accept",
						},
					},
					{ status: 400 },
				);
			}

			// Get all artist's shows to verify ownership
			const artistShows = await getBaseShowsByArtist(session.userId);

			for (const { showId, performanceDate } of showEntries) {
				const baseShow = artistShows.find((s) => s.id === showId);

				if (!baseShow) {
					return NextResponse.json(
						{
							success: false,
							error: {
								code: "REQ_004",
								message: `Base show ${showId} not found or unauthorized`,
							},
						},
						{ status: 400 },
					);
				}

				// Create Event_Show with immutable snapshot and performance date
				const eventShowId = uuidv4();
				const snapshotJson = createBaseShowSnapshot(baseShow);

				await createEventShow({
					id: eventShowId,
					eventId: eventRequest.eventId,
					artistId: session.userId,
					baseShowId: showId,
					snapshotJson,
					snapshotCreatedAt: now,
					overrides: performanceDate ? { performanceDate } : {},
					status: "pending",
					performanceStatus: "not_started",
					createdAt: now,
					updatedAt: now,
				});

				eventShowIds.push(eventShowId);
			}
		}

		// Update request status
		await updateEventRequestStatus(
			requestId,
			action === "accept" ? "accepted" : "declined",
			eventShowIds.length > 0 ? eventShowIds[0] : undefined,
		);

		// Emit WebSocket event for real-time notification to stage manager
		try {
			const io = (global as any).io;
			if (io) {
				io.to(`event_${eventRequest.eventId}`).emit(
					"event_request_responded",
					{
						requestId,
						eventId: eventRequest.eventId,
						artistId: session.userId,
						action,
						showCount: eventShowIds.length,
						timestamp: new Date().toISOString(),
					},
				);
			}
		} catch (wsError) {
			console.error("WebSocket emission error (non-fatal):", wsError);
		}

		return NextResponse.json({
			success: true,
			data: {
				status: action === "accept" ? "accepted" : "declined",
				eventShowIds,
				eventShowId: eventShowIds[0] || undefined,
			},
		});
	} catch (error) {
		console.error("Error responding to event request:", error);
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
