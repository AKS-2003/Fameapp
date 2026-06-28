import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// GET /api/contracts/[eventId]/bookings — Get all bookings for an event
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistContractId = searchParams.get("artistContractId");

		if (artistContractId) {
			const booking = await ContractService.getBookingByArtist(
				eventId,
				artistContractId,
			);
			return NextResponse.json({
				success: true,
				booking: booking || null,
			});
		}

		const bookings = await ContractService.getBookings(eventId);
		return NextResponse.json({ success: true, bookings });
	} catch (error) {
		console.error("Error fetching bookings:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch bookings" },
			{ status: 500 },
		);
	}
}

// POST /api/contracts/[eventId]/bookings — Create a new booking
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		if (!body.id) {
			body.id = `bk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		}
		body.eventId = eventId;

		const success = await ContractService.addBooking(eventId, body);
		if (success) {
			return NextResponse.json({ success: true, booking: body });
		}
		return NextResponse.json(
			{ success: false, error: "Failed to create booking" },
			{ status: 500 },
		);
	} catch (error) {
		console.error("Error creating booking:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to create booking" },
			{ status: 500 },
		);
	}
}

// PUT /api/contracts/[eventId]/bookings — Update a booking
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { bookingId, ...updates } = body;

		if (!bookingId) {
			return NextResponse.json(
				{ success: false, error: "bookingId is required" },
				{ status: 400 },
			);
		}

		const success = await ContractService.updateBooking(
			eventId,
			bookingId,
			updates,
		);
		if (success) {
			const updated = await ContractService.getBooking(
				eventId,
				bookingId,
			);
			return NextResponse.json({ success: true, booking: updated });
		}
		return NextResponse.json(
			{ success: false, error: "Booking not found" },
			{ status: 404 },
		);
	} catch (error) {
		console.error("Error updating booking:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update booking" },
			{ status: 500 },
		);
	}
}
