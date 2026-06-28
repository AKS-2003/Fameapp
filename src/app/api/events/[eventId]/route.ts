import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;

		// Fetch event from MongoDB
		const event = await EventDataService.getEvent(eventId);

		if (!event) {
			return NextResponse.json(
				{
					success: false,
					error: "Event not found",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			data: event,
		});
	} catch (error) {
		console.error("Error fetching event:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch event from MongoDB",
			},
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;
		const body = await request.json();
		const {
			name,
			venueName,
			startDate,
			endDate,
			description,
			logoUrl,
			artist_edit_enabled,
			registration_link_enabled,
			contractEnabled,
			logisticsEnabled,
			showInfoEnabled,
			requireContractFirst,
			showDates,
		} = body;

		// Get existing event from MongoDB
		const existingEvent = await EventDataService.getEvent(eventId);

		if (!existingEvent) {
			return NextResponse.json(
				{
					success: false,
					error: "Event not found",
				},
				{ status: 404 },
			);
		}

		// Update event data
		const updatedEvent = {
			...existingEvent,
			name: name || existingEvent.name,
			venueName: venueName || existingEvent.venueName,
			startDate: startDate || existingEvent.startDate,
			endDate: endDate || existingEvent.endDate,
			description: description || existingEvent.description,
			logoUrl: logoUrl !== undefined ? logoUrl : existingEvent.logoUrl,
			artist_edit_enabled: artist_edit_enabled !== undefined ? artist_edit_enabled : existingEvent.artist_edit_enabled,
			registration_link_enabled: registration_link_enabled !== undefined ? registration_link_enabled : existingEvent.registration_link_enabled,
			contractEnabled: contractEnabled !== undefined ? contractEnabled : existingEvent.contractEnabled,
			logisticsEnabled: logisticsEnabled !== undefined ? logisticsEnabled : existingEvent.logisticsEnabled,
			showInfoEnabled: showInfoEnabled !== undefined ? showInfoEnabled : existingEvent.showInfoEnabled,
			requireContractFirst: requireContractFirst !== undefined ? requireContractFirst : existingEvent.requireContractFirst,
			showDates: showDates !== undefined ? showDates : existingEvent.showDates,
			updatedAt: new Date().toISOString(),
		};

		// Save updated event to MongoDB
		const saved = await EventDataService.saveEvent(eventId, updatedEvent);

		if (!saved) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to update event in MongoDB",
				},
				{ status: 500 },
			);
		}

		// Emit WebSocket events for real-time sync across all browsers/tabs
		const io = (global as any).io;
		if (io) {
			if (artist_edit_enabled !== undefined) {
				io.to(`event_${eventId}`).emit("event_setting_changed", {
					eventId,
					field: "artist_edit_enabled",
					value: artist_edit_enabled,
					timestamp: new Date().toISOString(),
				});
			}
			if (registration_link_enabled !== undefined) {
				io.to(`event_${eventId}`).emit("event_setting_changed", {
					eventId,
					field: "registration_link_enabled",
					value: registration_link_enabled,
					timestamp: new Date().toISOString(),
				});
			}
		}

		return NextResponse.json({
			success: true,
			data: updatedEvent,
		});
	} catch (error) {
		console.error("Error updating event:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update event",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;

		// Check if event exists
		const existingEvent = await EventDataService.getEvent(eventId);

		if (!existingEvent) {
			return NextResponse.json(
				{
					success: false,
					error: "Event not found",
				},
				{ status: 404 },
			);
		}

		// Delete event from MongoDB
		const deleted = await EventDataService.deleteEvent(eventId);

		if (!deleted) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to delete event from MongoDB",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "Event deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting event:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to delete event",
			},
			{ status: 500 },
		);
	}
}
