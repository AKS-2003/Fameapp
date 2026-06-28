import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEvent, getEventShowsByEvent } from "@/lib/data-access";


interface RouteParams {
	params: Promise<{ eventId: string }>;
}

// GET /api/events/[eventId]/artist-view - Get event data for artist view
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getSession();
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

		// Get event details
		const event = await getEvent(eventId);
		if (!event) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "EVENT_001", message: "Event not found" },
				},
				{ status: 404 },
			);
		}

		// Get artist's Event_Show for this event
		const eventShows = await getEventShowsByEvent(eventId);
		const artistEventShow = eventShows.find(
			(es) => es.artistId === session.userId,
		);

		if (!artistEventShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ESHOW_001",
						message: "You are not assigned to this event",
					},
				},
				{ status: 403 },
			);
		}

		// Parse the snapshot
		let snapshot = null;
		try {
			snapshot = typeof artistEventShow.snapshotJson === 'string' 
				? JSON.parse(artistEventShow.snapshotJson as unknown as string) 
				: artistEventShow.snapshotJson;
		} catch (e) {
			console.error("Error parsing snapshot:", e);
		}

		return NextResponse.json({
			success: true,
			data: {
				event: {
					id: event.id,
					name: event.name,
					description: event.description,
					venue: event.venue,
					showDates: event.showDates,
				},
				eventShow: {
					id: artistEventShow.id,
					status: artistEventShow.status,
					performanceStatus: artistEventShow.performanceStatus,
					snapshot,
					overrides: artistEventShow.overrides,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching artist event view:", error);
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
