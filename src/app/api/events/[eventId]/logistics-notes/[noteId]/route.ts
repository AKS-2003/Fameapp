import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventLogisticsNoteModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; noteId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, noteId } = await params;
		await connectToDatabase();
		await EventLogisticsNoteModel.deleteOne({ id: noteId, eventId });
		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[notes DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
