import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

// Declare global io for WebSocket
declare global {
	var io: any;
}

function normalizeDate(dateStr: string): string {
	if (!dateStr) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
	if (dateStr.includes("T")) return dateStr.split("T")[0];
	try {
		const date = new Date(dateStr);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	} catch {
		return dateStr;
	}
}

/**
 * GET /api/events/[eventId]/lighting-designer?performanceDate=YYYY-MM-DD
 * Returns lighting designer notes for all artists on a given performance date.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const performanceDateParam = searchParams.get("performanceDate");

		if (!performanceDateParam) {
			return NextResponse.json({ success: false, error: "performanceDate is required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const storageKey = `lighting-designer:${performanceDate}`;
		
        const data = await getEventData(eventId, storageKey);

		if (!data) {
			return NextResponse.json({
				success: true,
				data: { eventId, performanceDate, notes: {}, updatedAt: null },
			});
		}

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error("Error fetching lighting designer data from MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch lighting designer data" }, { status: 500 });
	}
}

/**
 * PUT /api/events/[eventId]/lighting-designer
 * Save lighting designer notes for a specific artist on a performance date.
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const {
			performanceDate: performanceDateParam,
			artistId,
			eventShowId,
			lightingNotes,
			editNotes,
			lightingColor,
			lightingColorTwo,
			lightingColorThree,
		} = body;

		if (!performanceDateParam || !artistId) {
			return NextResponse.json({ success: false, error: "performanceDate and artistId are required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const effectiveArtistId = eventShowId || artistId;
		const storageKey = `lighting-designer:${performanceDate}`;

		// Read existing data from MongoDB
		let existingData: any = await getEventData(eventId, storageKey) || {
			eventId,
			performanceDate,
			notes: {},
			updatedAt: null,
		};

		// Update notes for the specific artist
		if (!existingData.notes) existingData.notes = {};
		if (!existingData.notes[effectiveArtistId]) existingData.notes[effectiveArtistId] = {};

		if (lightingNotes !== undefined) existingData.notes[effectiveArtistId].lightingNotes = lightingNotes;
		if (editNotes !== undefined) existingData.notes[effectiveArtistId].editNotes = editNotes;
		if (lightingColor !== undefined) existingData.notes[effectiveArtistId].lightingColor = lightingColor;
		if (lightingColorTwo !== undefined) existingData.notes[effectiveArtistId].lightingColorTwo = lightingColorTwo;
		if (lightingColorThree !== undefined) existingData.notes[effectiveArtistId].lightingColorThree = lightingColorThree;

		existingData.notes[effectiveArtistId].updatedAt = new Date().toISOString();
		existingData.updatedAt = new Date().toISOString();

		// Save to MongoDB
		await saveEventData(eventId, storageKey, existingData);

		// Broadcast WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("lighting_designer_updated", {
				eventId,
				performanceDate,
				artistId: effectiveArtistId,
				notes: existingData.notes[effectiveArtistId],
				timestamp: existingData.updatedAt,
			});
		}

		return NextResponse.json({ success: true, data: existingData });
	} catch (error) {
		console.error("Error saving lighting designer data to MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to save lighting designer data" }, { status: 500 });
	}
}
