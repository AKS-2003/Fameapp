import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { eventId } = await params;
		if (!eventId) {
			return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
		}

		const notes = await getEventData(eventId, "organiser_notes") || [];
		return NextResponse.json({ success: true, data: { notes } });
	} catch (error) {
		console.error("[organiser-notes GET]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { eventId } = await params;
		if (!eventId) {
			return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
		}

		const body = await request.json();
		const { text } = body;

		if (!text || !text.trim()) {
			return NextResponse.json({ success: false, error: "Note text is required" }, { status: 400 });
		}

		const notes = await getEventData(eventId, "organiser_notes") || [];
		const newNote = {
			id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
			text: text.trim(),
			createdAt: new Date().toISOString()
		};

		notes.unshift(newNote); // Add to the top of the list
		await saveEventData(eventId, "organiser_notes", notes);

		// Emit WebSocket update if needed, e.g. to sync notes across other organiser view tabs
		const io = (global as any).io;
		if (io) {
			io.to(`event_${eventId}`).emit("organiser_notes_updated", {
				eventId,
				timestamp: new Date().toISOString()
			});
		}

		return NextResponse.json({ success: true, data: { note: newNote } }, { status: 201 });
	} catch (error) {
		console.error("[organiser-notes POST]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
