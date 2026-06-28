import { NextRequest, NextResponse } from "next/server";
import { getSession, getAnySession } from "@/lib/session";
import {
	createEventRequest,
	getEventRequestsByArtist,
	getEventRequestsByEvent,
	getFameLinkArtistByEmail,
	getFameLinkArtistById,
} from "@/lib/data-access";
import { EventDataService } from "@/lib/storage-service";
import { v4 as uuidv4 } from "uuid";

// POST /api/event-requests - Create a new event request (stage manager only)
export async function POST(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.userId || session.role !== "stage_manager" && session.role !== "super_admin") {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { eventId, artistEmail, artistId, message, requestedShowDates } =
			body;

		if (!eventId || !artistEmail) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "REQ_004",
						message: "eventId and artistEmail are required",
					},
				},
				{ status: 400 },
			);
		}

		// Look up the artist by email to get their ID
		let resolvedArtistId = artistId;
		if (!resolvedArtistId) {
			const artist = await getFameLinkArtistByEmail(artistEmail);
			if (artist) {
				resolvedArtistId = artist.id;
			}
		}

		if (!resolvedArtistId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "REQ_004",
						message: "No FameLink artist found with this email",
					},
				},
				{ status: 404 },
			);
		}

		// Check for duplicate pending requests
		const existingRequests = await getEventRequestsByEvent(eventId);
		const duplicatePending = existingRequests.find(
			(r) =>
				(r.artistId === resolvedArtistId ||
					r.artistEmail.toLowerCase() ===
						artistEmail.toLowerCase()) &&
				r.status === "pending",
		);
		if (duplicatePending) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "REQ_003",
						message:
							"A pending invitation already exists for this artist",
					},
				},
				{ status: 409 },
			);
		}

		const now = new Date();
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

		const eventRequest = await createEventRequest({
			id: uuidv4(),
			eventId,
			artistId: resolvedArtistId,
			artistEmail: artistEmail.toLowerCase().trim(),
			stageManagerId: session.userId,
			message: message || undefined,
			requestedShowDates: requestedShowDates || [],
			status: "pending",
			createdAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
		});

		// Emit WebSocket event for real-time notification to artist
		try {
			const io = (global as any).io;
			if (io) {
				const event = await EventDataService.getEvent(eventId);
				// Notify the artist
				if (resolvedArtistId) {
					io.to(`user_${resolvedArtistId}`).emit(
						"event_request_created",
						{
							requestId: eventRequest.id,
							eventId,
							eventName: event?.name || "",
							stageManagerId: session.userId,
							message: message || undefined,
							timestamp: new Date().toISOString(),
						},
					);
				}
				// Also notify the event room (stage manager confirmation)
				io.to(`event_${eventId}`).emit("event_request_created", {
					requestId: eventRequest.id,
					eventId,
					eventName: event?.name || "",
					artistEmail: artistEmail.toLowerCase().trim(),
					timestamp: new Date().toISOString(),
				});
			}
		} catch (wsError) {
			console.error("WebSocket emission error (non-fatal):", wsError);
		}

		return NextResponse.json(
			{ success: true, data: { eventRequest } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating event request:", error);
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

// GET /api/event-requests - List event requests for current user
// For artists: returns their requests with event details
// For stage managers: returns requests they've sent (optionally filtered by eventId)
export async function GET(request: NextRequest) {
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

		const { searchParams } = new URL(request.url);
		const eventId = searchParams.get("eventId");

		let requests;

		if (session.role === "stage_manager" && eventId) {
			// Stage manager viewing requests for a specific event
			requests = await getEventRequestsByEvent(eventId);
		} else {
			// Artist viewing their own requests (by ID and email)
			requests = await getEventRequestsByArtist(session.userId);

			// Also check by email for requests sent before artist had an account
			if (session.email) {
				const emailRequests = await getEventRequestsByArtist(
					session.email,
				);
				// Merge, avoiding duplicates
				const existingIds = new Set(requests.map((r) => r.id));
				for (const req of emailRequests) {
					if (!existingIds.has(req.id)) {
						requests.push(req);
					}
				}
			}
		}

		// Enrich requests with event details
		const enrichedRequests = await Promise.all(
			requests.map(async (req) => {
				const event = await EventDataService.getEvent(req.eventId);
				// Get stage manager name
				let stageManagerName = "Unknown";
				try {
					// Stage manager info is in the users system, not famelink
					// We'll just use the ID for now
					stageManagerName = req.stageManagerId;
				} catch {
					// ignore
				}
				return {
					...req,
					event: event
						? {
								id: event.id,
								name: event.name,
								venueName: event.venueName,
								startDate: event.startDate,
								endDate: event.endDate,
								description: event.description,
								showDates: event.showDates,
							}
						: null,
					stageManagerName,
				};
			}),
		);

		// Filter out requests for events that no longer exist
		const filteredRequests = enrichedRequests.filter(req => req.event !== null);

		return NextResponse.json({
			success: true,
			data: { requests: filteredRequests },
		});
	} catch (error) {
		console.error("Error fetching event requests:", error);
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
