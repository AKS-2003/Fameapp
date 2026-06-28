import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { dates } = body;

		// Validate input
		if (!dates || !Array.isArray(dates)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid dates array",
				},
				{ status: 400 }
			);
		}

		// Get existing event from GCS
		const existingEvent = await EventDataService.getEvent(eventId);

		if (!existingEvent) {
			return NextResponse.json(
				{
					success: false,
					error: "Event not found",
				},
				{ status: 404 }
			);
		}

		// Update event with show dates
		const updatedEvent = {
			...existingEvent,
			showDates: dates,
			updatedAt: new Date().toISOString(),
		};

		// Save updated event to GCS
		const saved = await EventDataService.saveEvent(eventId, updatedEvent);

		if (!saved) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to save show dates to Google Cloud Storage",
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				eventId,
				showDates: dates,
				updatedAt: updatedEvent.updatedAt,
			},
		});
	} catch (error) {
		console.error("Error saving show dates:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to save show dates",
			},
			{ status: 500 }
		);
	}
}
