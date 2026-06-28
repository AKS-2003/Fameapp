import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventVenueModel } from "@/database/models/FameLinkModels";
import { v4 as uuidv4 } from "uuid";

interface RouteParams { params: Promise<{ eventId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		await connectToDatabase();
		const venues = await EventVenueModel.find({ eventId }).sort({ createdAt: 1 }).lean();
		return NextResponse.json({ success: true, data: { venues } });
	} catch (e) {
		console.error("[venues GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		if (!body.name?.trim()) return NextResponse.json({ success: false, error: "Venue name is required" }, { status: 400 });
		await connectToDatabase();
		const now = new Date().toISOString();
		const venue = {
			id: `venue-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			name: body.name.trim(),
			address: body.address?.trim() || "",
			phone: body.phone?.trim() || "",
			email: body.email?.trim() || "",
			capacity: body.capacity ? Number(body.capacity) : null,
			mapsLink: body.mapsLink?.trim() || "",
			notes: body.notes?.trim() || "",
			createdAt: now,
			updatedAt: now,
		};
		await EventVenueModel.create(venue);
		return NextResponse.json({ success: true, data: { venue } }, { status: 201 });
	} catch (e) {
		console.error("[venues POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
