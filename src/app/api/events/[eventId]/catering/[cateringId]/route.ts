import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCateringModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; cateringId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, cateringId } = await params;
		const body = await request.json();
		await connectToDatabase();
		const updated = await EventCateringModel.findOneAndUpdate(
			{ id: cateringId, eventId },
			{ $set: {
				mealType: body.mealType,
				name: body.name?.trim(),
				costPerPerson: body.costPerPerson ? Number(body.costPerPerson) : null,
				description: body.description?.trim() || "",
				notes: body.notes?.trim() || "",
				updatedAt: new Date().toISOString(),
			}},
			{ new: true, lean: true },
		);
		if (!updated) return NextResponse.json({ success: false, error: "Catering option not found" }, { status: 404 });
		return NextResponse.json({ success: true, data: { catering: updated } });
	} catch (e) {
		console.error("[catering PUT]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, cateringId } = await params;
		await connectToDatabase();
		await EventCateringModel.deleteOne({ id: cateringId, eventId });
		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[catering DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
