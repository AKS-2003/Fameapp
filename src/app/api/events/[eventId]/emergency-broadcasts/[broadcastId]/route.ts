import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
	event_id: string;
}

const STORAGE_KEY = "emergency-broadcasts";

// PATCH - Update emergency broadcast (mainly to deactivate) in MongoDB
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; broadcastId: string } }
) {
	try {
		const { eventId, broadcastId } = await Promise.resolve(params);
		const body = await request.json();
		const { is_active } = body;

		// Load existing broadcasts from MongoDB
		let broadcasts: EmergencyBroadcast[] = await getEventData(eventId, STORAGE_KEY) || [];

		// Find and update the broadcast
		const broadcastIndex = broadcasts.findIndex((b) => b.id === broadcastId);
		if (broadcastIndex === -1) {
			return NextResponse.json({ success: false, error: "Broadcast not found" }, { status: 404 });
		}

		// Update the broadcast
		broadcasts[broadcastIndex] = {
			...broadcasts[broadcastIndex],
			is_active: is_active !== undefined ? is_active : broadcasts[broadcastIndex].is_active,
		};

		// Save back to MongoDB
		await saveEventData(eventId, STORAGE_KEY, broadcasts);

		// Notify via WebSocket if broadcast was deactivated
		if (is_active === false && global.io) {
			global.io.to(`event_${eventId}`).emit("emergency-clear", {
				broadcastId,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, data: broadcasts[broadcastIndex] });
	} catch (error) {
		console.error("Error updating emergency broadcast via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to update emergency broadcast" }, { status: 500 });
	}
}

// DELETE - Delete emergency broadcast from MongoDB
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string; broadcastId: string } }
) {
	try {
		const { eventId, broadcastId } = await Promise.resolve(params);

		// Load existing broadcasts from MongoDB
		let broadcasts: EmergencyBroadcast[] = await getEventData(eventId, STORAGE_KEY) || [];

		// Filter out the broadcast to delete
		const updatedBroadcasts = broadcasts.filter((b) => b.id !== broadcastId);

		if (updatedBroadcasts.length === broadcasts.length) {
			return NextResponse.json({ success: false, error: "Broadcast not found" }, { status: 404 });
		}

		// Save back to MongoDB
		await saveEventData(eventId, STORAGE_KEY, updatedBroadcasts);

		return NextResponse.json({ success: true, message: "Broadcast deleted successfully" });
	} catch (error) {
		console.error("Error deleting emergency broadcast via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to delete emergency broadcast" }, { status: 500 });
	}
}
