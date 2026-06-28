import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// GET /api/contracts/famelink-bookings?email=xxx&artistId=xxx — Get bookings for a FameLink artist
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email");
		const artistId = searchParams.get("artistId");

		if (!email && !artistId) {
			return NextResponse.json(
				{ success: false, error: "email or artistId is required" },
				{ status: 400 },
			);
		}

		const bookings = await ContractService.getBookingsForArtist(
			email || "",
			artistId || undefined,
		);

		return NextResponse.json({ success: true, bookings });
	} catch (error) {
		console.error("Error fetching famelink bookings:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch bookings" },
			{ status: 500 },
		);
	}
}
