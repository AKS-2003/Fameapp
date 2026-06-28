import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";

export async function GET(request: NextRequest) {
	try {
		const { getSessionFromRequest } = await import("@/lib/session");
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: "Authentication required",
				},
				{ status: 401 },
			);
		}

		// Fetch events from Google Cloud Storage
		let events = await EventDataService.listEvents();

		// Filter events by stage manager ID if user is a stage manager
		if (session.role === "stage_manager") {
			events = events.filter(
				(event: any) => event.stageManagerId === session.userId,
			);
		}

		return NextResponse.json({
			success: true,
			data: events,
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch events from Google Cloud Storage",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { getSessionFromRequest } = await import("@/lib/session");
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: "Authentication required",
				},
				{ status: 401 },
			);
		}

		if (session.role !== "stage_manager" && session.role !== "super_admin" && session.role !== "artist") {
			return NextResponse.json(
				{
					success: false,
					error: "Only stage managers can create events",
				},
				{ status: 403 },
			);
		}



		const body = await request.json();
		const {
			name, venueName, startDate, endDate, description, logoUrl,
			artist_edit_enabled, registration_link_enabled,
			contractEnabled, logisticsEnabled, showInfoEnabled, requireContractFirst,
			showDates
		} = body;

		// Validate required fields
		if (!name || !venueName || !startDate || !endDate || !description) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields",
				},
				{ status: 400 },
			);
		}

		// Create new event
		const eventId = `event-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;
		const newEvent = {
			id: eventId,
			name,
			venueName,
			startDate,
			endDate,
			description,
			logoUrl: logoUrl || "",
			status: "draft",
			showDates: showDates || [],
			stageManagerId: session.userId, // Associate event with stage manager
			artist_edit_enabled: artist_edit_enabled ?? false,
			registration_link_enabled: registration_link_enabled ?? true,
			// Artist workflow configuration
			contractEnabled: contractEnabled ?? true,
			logisticsEnabled: logisticsEnabled ?? true,
			showInfoEnabled: showInfoEnabled ?? true,
			requireContractFirst: requireContractFirst ?? true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Save to Google Cloud Storage
		const saved = await EventDataService.saveEvent(eventId, newEvent);

		if (!saved) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to save event to Google Cloud Storage",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			data: newEvent,
		});
	} catch (error) {
		console.error("Error creating event:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create event",
			},
			{ status: 500 },
		);
	}
}
