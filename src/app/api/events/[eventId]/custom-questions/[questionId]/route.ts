import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCustomQuestionModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; questionId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, questionId } = await params;
		const body = await request.json();
		await connectToDatabase();
		
		const updated = await EventCustomQuestionModel.findOneAndUpdate(
			{ id: questionId, eventId },
			{ $set: {
				text: body.text?.trim(),
				type: body.type,
				required: !!body.required,
				options: Array.isArray(body.options) ? body.options : [],
				order: typeof body.order === 'number' ? body.order : undefined,
				updatedAt: new Date().toISOString(),
			}},
			{ new: true, lean: true }
		);
		
		if (!updated) return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
		return NextResponse.json({ success: true, data: { question: updated } });
	} catch (e) {
		console.error("[questions PUT]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, questionId } = await params;
		await connectToDatabase();
		await EventCustomQuestionModel.deleteOne({ id: questionId, eventId });
		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[questions DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
