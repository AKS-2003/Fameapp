import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventCurrencyModel } from "@/database/models/FameLinkModels";

interface RouteParams { params: Promise<{ eventId: string; currencyId: string }>; }

function smOnly(req: NextRequest) {
	const s = getSessionFromRequest(req);
	return s && (s.role === "stage_manager" || s.role === "super_admin") ? s : null;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		const { eventId, currencyId } = await params;
		await connectToDatabase();
		
		const target = await EventCurrencyModel.findOne({ id: currencyId, eventId });
		if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

		await EventCurrencyModel.deleteOne({ id: currencyId, eventId });

		// If we deleted the default, set another one as default if any exist
		if (target.isDefault) {
			const another = await EventCurrencyModel.findOne({ eventId });
			if (another) {
				await EventCurrencyModel.updateOne({ id: another.id }, { $set: { isDefault: true } });
			}
		}

		return NextResponse.json({ success: true });
	} catch (e) {
		console.error("[currencies DELETE]", e);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
