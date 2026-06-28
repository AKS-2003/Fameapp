import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCustomQuestionModel } from "@/database/models/FameLinkModels";
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
		const questions = await EventCustomQuestionModel.find({ eventId }).sort({ order: 1, createdAt: 1 }).lean();
		return NextResponse.json({ success: true, data: { questions } });
	} catch (e) {
		console.error("[questions GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		
		if (!body.text?.trim() || !body.type) {
			return NextResponse.json({ success: false, error: "Question text and Type are required" }, { status: 400 });
		}

		await connectToDatabase();
		const count = await EventCustomQuestionModel.countDocuments({ eventId });
		const now = new Date().toISOString();
		
		const question = {
			id: `q-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			text: body.text.trim(),
			type: body.type,
			required: !!body.required,
			options: Array.isArray(body.options) ? body.options : [],
			order: count,
			createdAt: now,
			updatedAt: now,
		};

		await EventCustomQuestionModel.create(question);
		return NextResponse.json({ success: true, data: { question } }, { status: 201 });
	} catch (e) {
		console.error("[questions POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
