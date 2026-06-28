import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getEventData, saveEventData } from "@/lib/data-access";

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

/**
 * GET /api/events/[eventId]/data?key=workshops
 * Retrieve a generic key/value JSON blob stored per-event (e.g. workshops list).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const session = getSessionFromRequest(request);
		if (!session || (session.role !== "stage_manager" && session.role !== "super_admin")) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
				{ status: 401 },
			);
		}

		const { eventId } = await params;
		const key = new URL(request.url).searchParams.get("key") || "data";

		const value = await getEventData(eventId, key);

		return NextResponse.json({
			success: true,
			data: { key, value: value ?? null },
		});
	} catch (error) {
		console.error("Error reading event data:", error);
		return NextResponse.json(
			{ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } },
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/events/[eventId]/data
 * Save a generic key/value JSON blob per-event.
 * Body: { key: string, value: any }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const session = getSessionFromRequest(request);
		if (!session || (session.role !== "stage_manager" && session.role !== "super_admin")) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
				{ status: 401 },
			);
		}

		const { eventId } = await params;
		const body = await request.json();
		const { key, value } = body;

		if (!key) {
			return NextResponse.json(
				{ success: false, error: { code: "BAD_REQUEST", message: "key is required" } },
				{ status: 400 },
			);
		}

		await saveEventData(eventId, key, value);

		return NextResponse.json({ success: true, data: { key, value } });
	} catch (error) {
		console.error("Error saving event data:", error);
		return NextResponse.json(
			{ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } },
			{ status: 500 },
		);
	}
}
