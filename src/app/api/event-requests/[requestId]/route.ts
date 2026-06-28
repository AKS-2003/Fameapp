import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEventRequest, getEvent } from "@/lib/data-access";

interface RouteParams {
	params: Promise<{ requestId: string }>;
}

// GET /api/event-requests/[requestId] - Get event request details
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { requestId } = await params;

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

		// Get event details
		const event = await getEvent(eventRequest.eventId);

		return NextResponse.json({
			success: true,
			data: {
				request: eventRequest,
				event: event
					? {
							id: event.id,
							name: event.name,
							description: event.description,
							showDates: event.showDates,
							venue: event.venue,
						}
					: null,
			},
		});
	} catch (error) {
		console.error("Error fetching event request:", error);
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
