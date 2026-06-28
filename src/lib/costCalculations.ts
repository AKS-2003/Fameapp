import type { ContractArtist } from "@/types/contracts";

export function parseCurrency(val: string): number {
	const num = parseFloat((val || "").replace(/[^0-9.]/g, ""));
	return isNaN(num) ? 0 : num;
}

export interface ArtistCostBreakdown {
	fee: number;
	flights: number;
	hotel: number;
	transport: number;
	food: number;
	total: number;
}

export function computeArtistCostBreakdown(
	artist: ContractArtist,
): ArtistCostBreakdown {
	const fee = parseCurrency(artist.agreement?.agreedFee || "");

	const flightBudget = parseCurrency(artist.agreement?.flightBudget || "");
	const flightActual = (artist.travelLogistics?.flights ?? []).reduce(
		(sum, f) => sum + parseCurrency(f.cost),
		0,
	);
	const flights = flightActual || flightBudget;

	const rooms = (artist.travelLogistics?.hotelRooms ?? []).reduce(
		(sum, r) => sum + parseCurrency(r.totalCost),
		0,
	);
	const hotelNights = artist.agreement?.hotelNights || 0;
	const hotel = rooms || hotelNights * 120;

	const memberCount = Math.max(artist.groupMembers?.length || 0, 1);
	const transport = artist.agreement?.airportTransfer ? 80 * memberCount : 0;
	const food = artist.agreement?.foodVouchers
		? 35 * Math.max(hotelNights, 1) * memberCount
		: 0;

	return {
		fee,
		flights,
		hotel,
		transport,
		food,
		total: fee + flights + hotel + transport + food,
	};
}
