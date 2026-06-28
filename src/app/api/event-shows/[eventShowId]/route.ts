import { NextRequest, NextResponse } from "next/server";
import { getAnySession } from "@/lib/session";
import { getEventShow, updateEventShow, deleteEventShow } from "@/lib/data-access";
import { EventShowOverrides } from "@/types/famelink";

interface RouteParams {
	params: Promise<{ eventShowId: string }>;
}

// GET /api/event-shows/[eventShowId] - Get single Event_Show
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

		const { eventShowId } = await params;
		const eventShow = await getEventShow(eventShowId);

		if (!eventShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "Event show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Check access
		const isOwner = eventShow.artistId === session.userId;
		const isStageManager = session.role === "stage_manager";

		if (!isOwner && !isStageManager) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "ESHOW_005", message: "Unauthorized" },
				},
				{ status: 403 },
			);
		}

		return NextResponse.json({ success: true, data: { eventShow } });
	} catch (error) {
		console.error("Error fetching event show:", error);
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

// PUT /api/event-shows/[eventShowId] - Update Event_Show (overrides only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

		const { eventShowId } = await params;
		const eventShow = await getEventShow(eventShowId);

		if (!eventShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "Event show not found",
					},
				},
				{ status: 404 },
			);
		}

		const body = await request.json();

		// CRITICAL: Block any attempt to modify snapshotJson
		if (body.snapshotJson !== undefined) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_004",
						message: "Cannot modify snapshot_json",
					},
				},
				{ status: 400 },
			);
		}

		// Allow stage managers OR the artist owner to update overrides
		const isOwner = eventShow.artistId === session.userId;
		const isStageManager = session.role === "stage_manager";
		if (!isOwner && !isStageManager) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_005",
						message:
							"Only stage managers or the artist owner can update event shows",
					},
				},
				{ status: 403 },
			);
		}

		// Build update object - only allow overrides, status, performanceStatus
		const allowedUpdates: Partial<{
			overrides: EventShowOverrides;
			status: "pending" | "confirmed" | "cancelled";
			performanceStatus:
				| "not_started"
				| "next_on_deck"
				| "currently_on_stage"
				| "completed";
		}> = {};

		if (body.overrides) {
			allowedUpdates.overrides = {
				...eventShow.overrides,
				...body.overrides,
			};
		}

		// Only stage managers can change status and performanceStatus
		if (body.status && isStageManager) {
			allowedUpdates.status = body.status;
		}

		if (body.performanceStatus && isStageManager) {
			allowedUpdates.performanceStatus = body.performanceStatus;
		}

		const updatedEventShow = await updateEventShow(eventShowId, {
			...allowedUpdates,
			updatedAt: new Date().toISOString(),
			updatedBy: session.userId,
		});

		return NextResponse.json({
			success: true,
			data: { eventShow: updatedEventShow },
		});
	} catch (error) {
		console.error("Error updating event show:", error);
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

// DELETE /api/event-shows/[eventShowId] - Delete an Event_Show
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

		const { eventShowId } = await params;
		const eventShow = await getEventShow(eventShowId);

		if (!eventShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "Event show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Check access
		const isOwner = eventShow.artistId === session.userId;
		const isStageManager = session.role === "stage_manager";

		if (!isOwner && !isStageManager) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "ESHOW_005", message: "Unauthorized" },
				},
				{ status: 403 },
			);
		}

		await deleteEventShow(eventShowId, eventShow.eventId);

		return NextResponse.json({ success: true, data: { deleted: true } });
	} catch (error) {
		console.error("Error deleting event show:", error);
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
