import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventHotelModel } from "@/database/models/FameLinkModels";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

function smOnly(request: NextRequest) {
	const session = getSessionFromRequest(request);
	if (!session || (session.role !== "stage_manager" && session.role !== "super_admin")) {
		return null;
	}
	return session;
}

// GET /api/events/[eventId]/hotels  — list all hotels for this event
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}
		const { eventId } = await params;
		await connectToDatabase();
		const hotels = await EventHotelModel.find({ eventId }).sort({ createdAt: 1 }).lean();
		return NextResponse.json({ success: true, data: { hotels } });
	} catch (error) {
		console.error("[hotels GET]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

// POST /api/events/[eventId]/hotels  — create a hotel
export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}
		const { eventId } = await params;
		const body = await request.json();

		if (!body.name?.trim()) {
			return NextResponse.json({ success: false, error: "Hotel name is required" }, { status: 400 });
		}

		await connectToDatabase();

		const now = new Date().toISOString();
		const hotel = {
			id: `hotel-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			name: body.name.trim(),
			address: body.address?.trim() || "",
			phone: body.phone?.trim() || "",
			email: body.email?.trim() || "",
			mapsLink: body.mapsLink?.trim() || "",
			notes: body.notes?.trim() || "",
			roomRates: Array.isArray(body.roomRates) ? body.roomRates : [],
			createdAt: now,
			updatedAt: now,
		};

		await EventHotelModel.create(hotel);
		return NextResponse.json({ success: true, data: { hotel } }, { status: 201 });
	} catch (error) {
		console.error("[hotels POST]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
