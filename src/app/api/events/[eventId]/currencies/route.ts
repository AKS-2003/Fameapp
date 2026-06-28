import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCurrencyModel } from "@/database/models/FameLinkModels";
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
		const currencies = await EventCurrencyModel.find({ eventId }).sort({ isDefault: -1, code: 1 }).lean();
		return NextResponse.json({ success: true, data: { currencies } });
	} catch (e) {
		console.error("[currencies GET]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		
		if (!body.code || !body.name) {
			return NextResponse.json({ success: false, error: "Code and Name are required" }, { status: 400 });
		}

		await connectToDatabase();

		// Check if already exists
		const existing = await EventCurrencyModel.findOne({ eventId, code: body.code });
		if (existing) return NextResponse.json({ success: false, error: "Currency already enabled" }, { status: 400 });

		const count = await EventCurrencyModel.countDocuments({ eventId });
		const now = new Date().toISOString();
		
		const currency = {
			id: `curr-${Date.now()}-${uuidv4().slice(0, 6)}`,
			eventId,
			code: body.code,
			name: body.name,
			symbol: body.symbol || body.code,
			isDefault: count === 0, // Make first one default
			createdAt: now,
			updatedAt: now,
		};

		await EventCurrencyModel.create(currency);
		return NextResponse.json({ success: true, data: { currency } }, { status: 201 });
	} catch (e) {
		console.error("[currencies POST]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

// PUT for setting default or updating (though mainly setting default for now)
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId } = await params;
		const body = await request.json();
		
		if (body.action === "setDefault" && body.id) {
			await connectToDatabase();
			// Unset current default
			await EventCurrencyModel.updateMany({ eventId }, { $set: { isDefault: false } });
			// Set new default
			await EventCurrencyModel.updateOne({ eventId, id: body.id }, { $set: { isDefault: true } });
			return NextResponse.json({ success: true });
		}

		return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
	} catch (e) {
		console.error("[currencies PUT]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
