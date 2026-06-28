import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventDriverModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; driverId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, driverId } = await params;
		const body = await request.json();
		await connectToDatabase();
		const updated = await EventDriverModel.findOneAndUpdate(
			{ id: driverId, eventId },
			{ $set: {
				name: body.name?.trim(),
				phone: body.phone?.trim() || "",
				whatsapp: body.whatsapp?.trim() || "",
				vehicle: body.vehicle?.trim() || "",
				capacity: body.capacity ? Number(body.capacity) : null,
				costPerTrip: body.costPerTrip ? Number(body.costPerTrip) : null,
				costPerPerson: body.costPerPerson ? Number(body.costPerPerson) : null,
				notes: body.notes?.trim() || "",
				updatedAt: new Date().toISOString(),
			}},
			{ new: true, lean: true },
		);
		if (!updated) return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
		return NextResponse.json({ success: true, data: { driver: updated } });
	} catch (e) {
		console.error("[drivers PUT]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, driverId } = await params;
		await connectToDatabase();
		await EventDriverModel.deleteOne({ id: driverId, eventId });
		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[drivers DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
