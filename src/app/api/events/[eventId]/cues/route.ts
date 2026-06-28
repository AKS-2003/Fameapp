import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

// Declare global io for WebSocket
declare global {
	var io: any;
}

/**
 * Normalize a date string to YYYY-MM-DD format for consistent file naming
 */
function normalizeDate(dateStr: string): string {
	if (!dateStr) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
	if (dateStr.includes("T")) return dateStr.split("T")[0];
	try {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	} catch (error) {
		return dateStr;
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const performanceDateParam = searchParams.get("performanceDate");

		if (!performanceDateParam) {
			return NextResponse.json({ success: false, error: "Performance date is required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const storageKey = `cues:${performanceDate}`;
		
        const cues = await getEventData(eventId, storageKey) || [];

		return NextResponse.json({ success: true, data: cues });
	} catch (error) {
		console.error("Error fetching cues from MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch cues" }, { status: 500 });
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { performanceDate: performanceDateParam, ...cueData } = body;

		if (!performanceDateParam) {
			return NextResponse.json({ success: false, error: "Performance date is required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const storageKey = `cues:${performanceDate}`;

		let cues = await getEventData(eventId, storageKey) || [];

		// Add new cue with color support
		const newCue = {
			...cueData,
			color: cueData.color || null,
			created_at: new Date().toISOString(),
			performance_status: "not_started",
			is_completed: false,
		};

		cues.push(newCue);

		// Save back to MongoDB
		await saveEventData(eventId, storageKey, cues);

		// Emit WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("cue_updated", {
				eventId, cueId: newCue.id, action: "created", cue: newCue,
				performanceDate, timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, data: newCue });
	} catch (error) {
		console.error("Error adding cue via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to add cue" }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { id, performanceDate: performanceDateParam, ...updateData } = body;

		if (!performanceDateParam || !id) {
			return NextResponse.json({ success: false, error: "Performance date and cue ID are required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const storageKey = `cues:${performanceDate}`;

		let cues = await getEventData(eventId, storageKey) || [];

		// Find and update the cue
		const cueIndex = cues.findIndex((cue: any) => cue.id === id);
		if (cueIndex === -1) {
			return NextResponse.json({ success: false, error: "Cue not found" }, { status: 404 });
		}

		cues[cueIndex] = { ...cues[cueIndex], ...updateData, updated_at: new Date().toISOString() };

		// Save back to MongoDB
		await saveEventData(eventId, storageKey, cues);

		const { searchParams } = new URL(request.url);
		const skipWebSocket = searchParams.get("skipWebSocket") === "true";

		if (global.io && !skipWebSocket) {
			global.io.to(`event_${eventId}`).emit("cue_updated", {
				eventId, cueId: id, action: "updated", cue: cues[cueIndex],
				performanceDate, timestamp: new Date().toISOString(),
			});

			if (updateData.is_completed !== undefined) {
				global.io.to(`event_${eventId}`).emit("cue_completion_toggled", {
					eventId, cueId: id, is_completed: updateData.is_completed,
					completed_at: updateData.completed_at, performanceDate,
					timestamp: new Date().toISOString(),
				});
			}
		}

		return NextResponse.json({ success: true, data: cues[cueIndex] });
	} catch (error) {
		console.error("Error updating cue via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to update cue" }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const cueId = searchParams.get("cueId");
		const performanceDateParam = searchParams.get("performanceDate");

		if (!performanceDateParam || !cueId) {
			return NextResponse.json({ success: false, error: "Performance date and cue ID are required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const storageKey = `cues:${performanceDate}`;

		let cues = await getEventData(eventId, storageKey) || [];

		const originalLength = cues.length;
		cues = cues.filter((cue: any) => cue.id !== cueId);

		if (cues.length === originalLength) {
			return NextResponse.json({ success: false, error: "Cue not found" }, { status: 404 });
		}

		// Save back to MongoDB
		await saveEventData(eventId, storageKey, cues);

		if (global.io) {
			global.io.to(`event_${eventId}`).emit("cue_updated", {
				eventId, cueId, action: "deleted", performanceDate,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, message: "Cue deleted successfully" });
	} catch (error) {
		console.error("Error deleting cue via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to delete cue" }, { status: 500 });
	}
}
