import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";

/**
 * GET /api/events/[eventId]/public
 *
 * Public endpoint — no auth required.
 * Returns only safe, public-facing event info for the join-event landing page.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;

		const event = await EventDataService.getEvent(eventId);

		if (!event) {
			return NextResponse.json(
				{ success: false, error: "Event not found" },
				{ status: 404 },
			);
		}

		// Return only public-safe fields
		return NextResponse.json({
			success: true,
			data: {
				id: event.id,
				name: event.name,
				venueName: event.venueName,
				startDate: event.startDate,
				endDate: event.endDate,
				description: event.description,
				logoUrl: event.logoUrl || null,
				showDates: event.showDates || [],
			},
		});
	} catch (error) {
		console.error("Error fetching public event info:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch event" },
			{ status: 500 },
		);
	}
}
