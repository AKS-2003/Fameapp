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

// GET - Fetch emergency broadcasts for an event from MongoDB
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		
        const broadcasts: EmergencyBroadcast[] = await getEventData(eventId, STORAGE_KEY) || [];

        // Filter only active broadcasts
        const activeBroadcasts = broadcasts.filter(
            (broadcast) => broadcast.is_active
        );

        return NextResponse.json({
            success: true,
            data: activeBroadcasts,
        });
	} catch (error) {
		console.error("Error in emergency broadcasts GET:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch emergency broadcasts from MongoDB" },
			{ status: 500 }
		);
	}
}

// POST - Create new emergency broadcast in MongoDB
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { message, emergency_code, is_active = true } = body;

		if (!message || !emergency_code) {
			return NextResponse.json({ success: false, error: "Message and emergency code are required" }, { status: 400 });
		}

		// Load existing broadcasts from MongoDB
		let broadcasts: EmergencyBroadcast[] = await getEventData(eventId, STORAGE_KEY) || [];

		// Create new broadcast
		const newBroadcast: EmergencyBroadcast = {
			id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			message,
			emergency_code,
			is_active,
			created_at: new Date().toISOString(),
			event_id: eventId,
		};

		// Add to broadcasts array
		broadcasts.push(newBroadcast);

		// Save back to MongoDB
		await saveEventData(eventId, STORAGE_KEY, broadcasts);

		console.log("Emergency broadcast saved to MongoDB:", newBroadcast.id);

		// Notify via WebSocket
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("emergency-alert", {
				message,
				emergency_code,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, data: newBroadcast });
	} catch (error: any) {
		console.error("Error creating emergency broadcast:", error);
		return NextResponse.json({ success: false, error: `Failed to create emergency broadcast: ${error?.message || "Unknown error"}` }, { status: 500 });
	}
}
