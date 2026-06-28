import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

const STORAGE_KEY = "timing-settings";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const performanceDate = searchParams.get("performanceDate") || "";

		const stored = await getEventData(eventId, STORAGE_KEY);

		if (!stored) {
			return NextResponse.json({
				success: true,
				data: { backstage_ready_time: null, show_start_time: null },
			});
		}

		// Normalize the requested date to YYYY-MM-DD
		const normalizedRequestDate = performanceDate
			? performanceDate.includes("T") ? performanceDate.split("T")[0] : performanceDate
			: "";

		// Support per-date timings stored under "byDate" key
		const dateKey = performanceDate && stored.byDate
			? (stored.byDate[performanceDate]
				? performanceDate
				: (stored.byDate[normalizedRequestDate]
					? normalizedRequestDate
					: Object.keys(stored.byDate).find(k => (k.includes("T") ? k.split("T")[0] : k) === normalizedRequestDate) || null))
			: null;

		if (dateKey && stored.byDate[dateKey]) {
			const dateTimings = stored.byDate[dateKey];
			return NextResponse.json({
				success: true,
				data: {
					backstage_ready_time: dateTimings.backstage_ready_time ?? null,
					show_start_time: dateTimings.show_start_time ?? null,
					rehearsal_start_time: dateTimings.rehearsal_start_time ?? null,
					time_overrides: dateTimings.time_overrides ?? {},
					rehearsal_time_overrides: dateTimings.rehearsal_time_overrides ?? {},
				},
			});
		}

		if (performanceDate && stored.byDate) {
			return NextResponse.json({
				success: true,
				data: { backstage_ready_time: null, show_start_time: null, rehearsal_start_time: null, time_overrides: {}, rehearsal_time_overrides: {} },
			});
		}

		// Fallback: return legacy global timings
		return NextResponse.json({
			success: true,
			data: {
				backstage_ready_time: stored.backstage_ready_time ?? null,
				show_start_time: stored.show_start_time ?? null,
				rehearsal_start_time: stored.rehearsal_start_time ?? null,
				time_overrides: stored.time_overrides ?? {},
				rehearsal_time_overrides: stored.rehearsal_time_overrides ?? {},
			},
		});
	} catch (error) {
		console.error("Error fetching timing settings from MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch timing settings" }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const {
			backstage_ready_time, show_start_time, rehearsal_start_time,
			time_overrides, rehearsal_time_overrides, updated_by, performanceDate,
		} = body;

		// Read existing data from MongoDB
		let stored: any = await getEventData(eventId, STORAGE_KEY) || {};

		if (!stored.byDate) stored.byDate = {};

		const normalizedPerfDate = performanceDate
			? (performanceDate.includes("T") ? performanceDate.split("T")[0] : performanceDate)
			: "";

		if (normalizedPerfDate) {
			const existing = stored.byDate[normalizedPerfDate] || {};
			stored.byDate[normalizedPerfDate] = { ...existing, updated_by, updated_at: new Date().toISOString() };
			
			if (backstage_ready_time !== undefined) stored.byDate[normalizedPerfDate].backstage_ready_time = backstage_ready_time;
			if (show_start_time !== undefined) stored.byDate[normalizedPerfDate].show_start_time = show_start_time;
			if (rehearsal_start_time !== undefined) stored.byDate[normalizedPerfDate].rehearsal_start_time = rehearsal_start_time;
			if (time_overrides !== undefined) stored.byDate[normalizedPerfDate].time_overrides = time_overrides;
			if (rehearsal_time_overrides !== undefined) stored.byDate[normalizedPerfDate].rehearsal_time_overrides = rehearsal_time_overrides;
		}

		if (backstage_ready_time !== undefined) stored.backstage_ready_time = backstage_ready_time;
		if (show_start_time !== undefined) stored.show_start_time = show_start_time;
		if (rehearsal_start_time !== undefined) stored.rehearsal_start_time = rehearsal_start_time;
		stored.updated_by = updated_by;
		stored.updated_at = new Date().toISOString();

		// Save back to MongoDB
		await saveEventData(eventId, STORAGE_KEY, stored);

		if (global.io) {
			global.io.to(`event_${eventId}`).emit("timing-settings-updated", {
				eventId, performanceDate, backstage_ready_time, show_start_time,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			data: { backstage_ready_time, show_start_time, rehearsal_start_time, performanceDate },
		});
	} catch (error) {
		console.error("Error updating timing settings via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to update timing settings" }, { status: 500 });
	}
}
