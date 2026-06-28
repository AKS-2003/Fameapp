import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventVenueModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; venueId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, venueId } = await params;
		const body = await request.json();
		await connectToDatabase();
		const updated = await EventVenueModel.findOneAndUpdate(
			{ id: venueId, eventId },
			{ $set: {
				name: body.name?.trim(),
				address: body.address?.trim() || "",
				phone: body.phone?.trim() || "",
				email: body.email?.trim() || "",
				capacity: body.capacity ? Number(body.capacity) : null,
				mapsLink: body.mapsLink?.trim() || "",
				notes: body.notes?.trim() || "",
				updatedAt: new Date().toISOString(),
			}},
			{ new: true, lean: true },
		);
		if (!updated) return NextResponse.json({ success: false, error: "Venue not found" }, { status: 404 });
		return NextResponse.json({ success: true, data: { venue: updated } });
	} catch (e) {
		console.error("[venues PUT]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, venueId } = await params;
		await connectToDatabase();
		await EventVenueModel.deleteOne({ id: venueId, eventId });
		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[venues DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
