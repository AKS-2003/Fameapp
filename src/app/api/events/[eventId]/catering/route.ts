import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCateringModel } from "@/database/models/FameLinkModels";
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
		const catering = await EventCateringModel.find({ eventId }).sort({ createdAt: 1 }).lean();
		return NextResponse.json({ success: true, data: { catering } });
	} catch (e) {
		console.error("[catering GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		if (!body.name?.trim() || !body.mealType) return NextResponse.json({ success: false, error: "Name and Meal Type are required" }, { status: 400 });
		await connectToDatabase();
		const now = new Date().toISOString();
		const catering = {
			id: `catering-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			mealType: body.mealType,
			name: body.name.trim(),
			costPerPerson: body.costPerPerson ? Number(body.costPerPerson) : null,
			description: body.description?.trim() || "",
			notes: body.notes?.trim() || "",
			createdAt: now,
			updatedAt: now,
		};
		await EventCateringModel.create(catering);
		return NextResponse.json({ success: true, data: { catering } }, { status: 201 });
	} catch (e) {
		console.error("[catering POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
