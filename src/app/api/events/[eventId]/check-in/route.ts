import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

/**
 * Check-In API for artist rehearsal and performance check-ins.
 * Data is now stored in MongoDB using EventData model.
 */

interface CheckInRecord {
	checkedIn: boolean;
	timestamp: string | null;
	checkedInBy?: string;
}

interface ArtistCheckIn {
	rehearsal: CheckInRecord;
	performance: CheckInRecord;
}

interface CheckInData {
	[artistId: string]: ArtistCheckIn;
}

const STORAGE_KEY = "check-ins";

// GET - Fetch check-in status for all artists or a specific artist from MongoDB
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;
		const artistId = request.nextUrl.searchParams.get("artistId");

        const checkIns: CheckInData = await getEventData(eventId, STORAGE_KEY) || {};

		if (artistId) {
			const artistCheckIn = checkIns[artistId] || {
				rehearsal: { checkedIn: false, timestamp: null },
				performance: { checkedIn: false, timestamp: null },
			};
			return NextResponse.json({ success: true, data: artistCheckIn });
		}

		return NextResponse.json({ success: true, data: checkIns });
	} catch (error: any) {
		console.error("Error fetching check-ins from MongoDB:", error);
		return NextResponse.json({ success: false, error: { message: error.message || "Failed to fetch check-ins" } }, { status: 500 });
	}
}

// POST - Check in an artist (rehearsal or performance) in MongoDB
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;
		const body = await request.json();
		const { artistId, type, checkedInBy } = body;

		if (!artistId || !type) {
			return NextResponse.json({ success: false, error: { message: "artistId and type are required" } }, { status: 400 });
		}

		if (type !== "rehearsal" && type !== "performance") {
			return NextResponse.json({ success: false, error: { message: "type must be 'rehearsal' or 'performance'" } }, { status: 400 });
		}

		const checkIns: CheckInData = await getEventData(eventId, STORAGE_KEY) || {};

		if (!checkIns[artistId]) {
			checkIns[artistId] = {
				rehearsal: { checkedIn: false, timestamp: null },
				performance: { checkedIn: false, timestamp: null },
			};
		}

		checkIns[artistId][type as "rehearsal" | "performance"] = {
			checkedIn: true,
			timestamp: new Date().toISOString(),
			checkedInBy: checkedInBy || "stage_manager",
		};

		await saveEventData(eventId, STORAGE_KEY, checkIns);

		// Broadcast via WebSocket
		if ((global as any).io) {
			(global as any).io.to(`event_${eventId}`).emit("artist_checked_in", {
				eventId, artistId, type, checkedIn: true,
				timestamp: checkIns[artistId][type as "rehearsal" | "performance"].timestamp,
			});
		}

		return NextResponse.json({ success: true, data: checkIns[artistId] });
	} catch (error: any) {
		console.error("Error saving check-in to MongoDB:", error);
		return NextResponse.json({ success: false, error: { message: error.message || "Failed to check in" } }, { status: 500 });
	}
}

// DELETE - Uncheck an artist (rehearsal or performance) in MongoDB
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const { eventId } = await params;
		const body = await request.json();
		const { artistId, type } = body;

		if (!artistId || !type) {
			return NextResponse.json({ success: false, error: { message: "artistId and type are required" } }, { status: 400 });
		}

		if (type !== "rehearsal" && type !== "performance") {
			return NextResponse.json({ success: false, error: { message: "type must be 'rehearsal' or 'performance'" } }, { status: 400 });
		}

		const checkIns: CheckInData = await getEventData(eventId, STORAGE_KEY) || {};

		if (!checkIns[artistId]) {
			return NextResponse.json({ success: true, data: null });
		}

		checkIns[artistId][type as "rehearsal" | "performance"] = {
			checkedIn: false,
			timestamp: null,
		};

		await saveEventData(eventId, STORAGE_KEY, checkIns);

		// Broadcast via WebSocket
		if ((global as any).io) {
			(global as any).io.to(`event_${eventId}`).emit("artist_checked_in", {
				eventId, artistId, type, checkedIn: false, timestamp: null,
			});
		}

		return NextResponse.json({ success: true, data: checkIns[artistId] });
	} catch (error: any) {
		console.error("Error deleting check-in via MongoDB:", error);
		return NextResponse.json({ success: false, error: { message: error.message || "Failed to uncheck in" } }, { status: 500 });
	}
}
