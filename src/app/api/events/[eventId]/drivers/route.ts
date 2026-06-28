import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventDriverModel } from "@/database/models/FameLinkModels";
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
		const drivers = await EventDriverModel.find({ eventId }).sort({ createdAt: 1 }).lean();
		return NextResponse.json({ success: true, data: { drivers } });
	} catch (e) {
		console.error("[drivers GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		if (!body.name?.trim()) return NextResponse.json({ success: false, error: "Driver name is required" }, { status: 400 });
		await connectToDatabase();
		const now = new Date().toISOString();
		const driver = {
			id: `driver-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			name: body.name.trim(),
			phone: body.phone?.trim() || "",
			whatsapp: body.whatsapp?.trim() || "",
			vehicle: body.vehicle?.trim() || "",
			capacity: body.capacity ? Number(body.capacity) : null,
			costPerTrip: body.costPerTrip ? Number(body.costPerTrip) : null,
			costPerPerson: body.costPerPerson ? Number(body.costPerPerson) : null,
			notes: body.notes?.trim() || "",
			createdAt: now,
			updatedAt: now,
		};
		await EventDriverModel.create(driver);
		return NextResponse.json({ success: true, data: { driver } }, { status: 201 });
	} catch (e) {
		console.error("[drivers POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
