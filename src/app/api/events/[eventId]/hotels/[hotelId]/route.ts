import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { connectToDatabase } from "@/database/mongodb";
import { EventHotelModel } from "@/database/models/FameLinkModels";

interface RouteParams {
	params: Promise<{ eventId: string; hotelId: string }>;
}

function smOnly(request: NextRequest) {
	const session = getSessionFromRequest(request);
	if (!session || (session.role !== "stage_manager" && session.role !== "super_admin")) return null;
	return session;
}

// PUT /api/events/[eventId]/hotels/[hotelId]  — update a hotel
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}
		const { eventId, hotelId } = await params;
		const body = await request.json();

		await connectToDatabase();

		const updated = await EventHotelModel.findOneAndUpdate(
			{ id: hotelId, eventId },
			{
				$set: {
					name: body.name?.trim(),
					address: body.address?.trim() || "",
					phone: body.phone?.trim() || "",
					email: body.email?.trim() || "",
					mapsLink: body.mapsLink?.trim() || "",
					notes: body.notes?.trim() || "",
					roomRates: Array.isArray(body.roomRates) ? body.roomRates : [],
					updatedAt: new Date().toISOString(),
				},
			},
			{ new: true, lean: true },
		);

		if (!updated) {
			return NextResponse.json({ success: false, error: "Hotel not found" }, { status: 404 });
		}
		return NextResponse.json({ success: true, data: { hotel: updated } });
	} catch (error) {
		console.error("[hotels PUT]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

// DELETE /api/events/[eventId]/hotels/[hotelId]  — delete a hotel
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		if (!smOnly(request)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}
		const { eventId, hotelId } = await params;

		await connectToDatabase();
		await EventHotelModel.deleteOne({ id: hotelId, eventId });
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[hotels DELETE]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
