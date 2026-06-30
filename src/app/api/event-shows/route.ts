import { NextRequest, NextResponse } from "next/server";
import { getAnySession } from "@/lib/session";
import {
	getBaseShow,
	createEventShow,
	getEventShowsByEvent,
} from "@/lib/data-access";
import {
	CreateEventShowRequest,
	createBaseShowSnapshot,
} from "@/types/famelink";
import { v4 as uuidv4 } from "uuid";

// POST /api/event-shows - Create Event_Show from Base_Show
export async function POST(request: NextRequest) {
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

		const body: CreateEventShowRequest & { performanceDate?: string } = await request.json();
		const { eventId, baseShowId, performanceDate } = body;

		if (!eventId || !baseShowId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "eventId and baseShowId are required",
					},
				},
				{ status: 400 },
			);
		}

		// Fetch the Base_Show
		const baseShow = await getBaseShow(baseShowId, session.userId);
		if (!baseShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "Base show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify ownership
		if (baseShow.artistId !== session.userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_005",
						message: "Unauthorized to use this show",
					},
				},
				{ status: 403 },
			);
		}

		// Check if Event_Show already exists for this event and artist
		const existingShows = await getEventShowsByEvent(eventId);
		const alreadyExists = existingShows.some(
			(es) =>
				es.artistId === session.userId && es.baseShowId === baseShowId,
		);

		if (alreadyExists) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_003",
						message: "Event show already exists for this event",
					},
				},
				{ status: 409 },
			);
		}

		// Create snapshot
		const snapshotJson = createBaseShowSnapshot(baseShow);
		const now = new Date().toISOString();

		const eventShow = await createEventShow({
			id: uuidv4(),
			eventId,
			artistId: session.userId,
			baseShowId,
			snapshotJson,
			snapshotCreatedAt: now,
			overrides: performanceDate ? { performanceDate } : {},
			status: "pending",
			performanceStatus: "not_started",
			createdAt: now,
			updatedAt: now,
		});

		return NextResponse.json(
			{ success: true, data: { eventShow } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating event show:", error);
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

// GET /api/event-shows - List event shows (with optional filters)
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

		if (!eventId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_002",
						message: "eventId is required",
					},
				},
				{ status: 400 },
			);
		}

		const eventShows = await getEventShowsByEvent(eventId);

		// Filter by artist if not a stage manager
		const filteredShows =
			session.role === "stage_manager"
				? eventShows
				: eventShows.filter((es) => es.artistId === session.userId);

		return NextResponse.json({
			success: true,
			data: { eventShows: filteredShows },
		});
	} catch (error) {
		console.error("Error fetching event shows:", error);
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
