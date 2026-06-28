import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventLogisticsNoteModel } from "@/database/models/FameLinkModels";
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
		const notes = await EventLogisticsNoteModel.find({ eventId }).sort({ createdAt: -1 }).lean();
		return NextResponse.json({ success: true, data: { notes } });
	} catch (e) {
		console.error("[notes GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		
		if (!body.text?.trim()) return NextResponse.json({ success: false, error: "Note text is required" }, { status: 400 });

		await connectToDatabase();
		const now = new Date().toISOString();
		const note = {
			id: `note-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			text: body.text.trim(),
			createdAt: now,
			updatedAt: now,
		};
		await EventLogisticsNoteModel.create(note);
		return NextResponse.json({ success: true, data: { note } }, { status: 201 });
	} catch (e) {
		console.error("[notes POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
