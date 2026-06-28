"use client";

import { useState, useEffect } from "react";
import {
	DollarSign,
	Plane,
	Hotel,
	Bus,
	UtensilsCrossed,
	Package,
	CheckCircle2,
	Loader2,
	RefreshCw,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CostAnalysisProps {
	providedEventId?: string;
}

interface FilterState {
	fees: boolean;
	flights: boolean;
	hotels: boolean;
	transport: boolean;
	food: boolean;
	extra: boolean;
}

const CURRENCY = "€";

function fmt(n: number) {
	if (n === 0) return "—";
	return `${CURRENCY}${n.toLocaleString()}`;
}

function fmtTotal(n: number) {
	return `${CURRENCY}${n.toLocaleString()}`;
}

// Try to parse cost from contract data if merged
function parseCurrency(val: string | number | undefined): number {
	if (!val) return 0;
	const str = String(val).replace(/[^0-9.]/g, "");
	const n = parseFloat(str);
	return isNaN(n) ? 0 : n;
}

interface ArtistRow {
	id: string;
	name: string;
	memberCount: number;
	fee: number;
	flights: number;
	hotel: number;
	transport: number;
	food: number;
	extra: number;
	paidFee: boolean;
	paidFlights: boolean;
	paidHotel: boolean;
	paidTransport: boolean;
	paidFood: boolean;
}

function buildCostRow(artist: any): ArtistRow {
	const agreement = artist.agreement || {};
	const travelLogistics = artist.travelLogistics || {};
	const memberCount = Math.max(
		artist.members?.length || artist.groupMembers?.length || 0,
		1,
	);

	// Fee from contract agreement
	const fee = parseCurrency(agreement.agreedFee);

	// Flights: actual flight costs or budget
	const flightActual = (travelLogistics.flights || []).reduce(
		(sum: number, f: any) => sum + parseCurrency(f.cost),
		0,
	);
	const flightBudget = parseCurrency(agreement.flightBudget);
	const flights = flightActual || flightBudget;

	// Hotel: room costs or nights × rate
	const roomTotal = (travelLogistics.hotelRooms || []).reduce(
		(sum: number, r: any) => sum + parseCurrency(r.totalCost),
		0,
	);
	const hotelNights = agreement.hotelNights || 0;
	const hotel = roomTotal || hotelNights * 120;

	// Transport: airport transfer
	const transport = agreement.airportTransfer ? 80 * memberCount : 0;

	// Food vouchers
	const food = agreement.foodVouchers
		? 35 * Math.max(hotelNights, 1) * memberCount
		: 0;

	const payments = agreement.payments || {};

	return {
		id: artist.id,
		name: artist.artistName || artist.stageName || artist.name || "Unknown",
		memberCount,
		fee,
		flights,
		hotel,
		transport,
		food,
		extra: 0,
		paidFee: payments.feePaid ?? false,
		paidFlights: payments.flightsPaid ?? false,
		paidHotel: payments.hotelPaid ?? false,
		paidTransport: payments.transportPaid ?? false,
		paidFood: payments.foodPaid ?? false,
	};
}

export default function CostAnalysis({ providedEventId }: CostAnalysisProps) {
	const [rows, setRows] = useState<ArtistRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFilters] = useState<FilterState>({
		fees: true,
		flights: true,
		hotels: true,
		transport: true,
		food: true,
		extra: true,
	});

	const fetchArtists = async () => {
		if (!providedEventId) return;
		setLoading(true);
		setError(null);
		try {
			// Use the Show Management artists API — same as ArtistManagement page
			const res = await fetch(`/api/events/${providedEventId}/artists`);
			const data = await res.json();
			if (data.success) {
				const artists: any[] = data.data || [];
				// Also try to merge contract data for fee/logistics info
				let contractMap = new Map<string, any>();
				try {
					const cRes = await fetch(
						`/api/contracts/${providedEventId}`,
					);
					const cData = await cRes.json();
					if (cData.success) {
						(cData.artists || []).forEach((a: any) => {
							contractMap.set(a.id, a);
							// Also try to match by email
							if (a.email) contractMap.set(a.email, a);
						});
					}
				} catch {
					// Contract data is optional — ignore errors
				}

				const built = artists.map((a) => {
					// Try to merge contract data by ID or email
					const contract =
						contractMap.get(a.id) ||
						contractMap.get(a.email) ||
						null;
					const merged = contract
						? { ...a, agreement: contract.agreement, travelLogistics: contract.travelLogistics, groupMembers: contract.groupMembers }
						: a;
					return buildCostRow(merged);
				});
				setRows(built);
			} else {
				setError("Failed to load artist data.");
			}
		} catch {
			setError("Network error while fetching artists.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchArtists();
	}, [providedEventId]);

	const totals = rows.reduce(
		(acc, r) => ({
			fees: acc.fees + r.fee,
			flights: acc.flights + r.flights,
			hotels: acc.hotels + r.hotel,
			transport: acc.transport + r.transport,
			food: acc.food + r.food,
			extra: 0,
			total:
				acc.total +
				r.fee +
				r.flights +
				r.hotel +
				r.transport +
				r.food,
			paid:
				acc.paid +
				(r.paidFee ? r.fee : 0) +
				(r.paidFlights ? r.flights : 0) +
				(r.paidHotel ? r.hotel : 0) +
				(r.paidTransport ? r.transport : 0) +
				(r.paidFood ? r.food : 0),
		}),
		{
			fees: 0,
			flights: 0,
			hotels: 0,
			transport: 0,
			food: 0,
			extra: 0,
			total: 0,
			paid: 0,
		},
	);
	const unpaid = totals.total - totals.paid;

	const filterCategories = [
		{
			key: "fees" as const,
			label: "Fees",
			icon: DollarSign,
			color: "text-emerald-600",
			value: totals.fees,
		},
		{
			key: "flights" as const,
			label: "Flights",
			icon: Plane,
			color: "text-blue-500",
			value: totals.flights,
		},
		{
			key: "hotels" as const,
			label: "Hotels",
			icon: Hotel,
			color: "text-orange-500",
			value: totals.hotels,
		},
		{
			key: "transport" as const,
			label: "Transport",
			icon: Bus,
			color: "text-purple-500",
			value: totals.transport,
		},
		{
			key: "food" as const,
			label: "Food",
			icon: UtensilsCrossed,
			color: "text-red-400",
			value: totals.food,
		},
		{
			key: "extra" as const,
			label: "Extra",
			icon: Package,
			color: "text-slate-400",
			value: 0,
		},
	];

	const toggleFilter = (key: keyof FilterState) => {
		setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const selectedTotal = rows.reduce(
		(acc, r) =>
			acc +
			(filters.fees ? r.fee : 0) +
			(filters.flights ? r.flights : 0) +
			(filters.hotels ? r.hotel : 0) +
			(filters.transport ? r.transport : 0) +
			(filters.food ? r.food : 0),
		0,
	);

	if (loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-fuchsia-600" />
					<p className="text-sm text-slate-500">Loading cost data...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
				<p className="text-red-500">{error}</p>
				<Button variant="outline" onClick={fetchArtists}>
					<RefreshCw className="mr-2 h-4 w-4" /> Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#f6f5fb] px-6 py-8">
			{/* Header */}
			<div className="mb-2">
				<h1 className="text-3xl font-semibold tracking-tight text-slate-950">
					Cost Analysis
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					Overview of agreement fees and logistics costs per artist
				</p>
			</div>

			{/* Artist count badge */}
			<div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
				<Users className="h-4 w-4" />
				<span>{rows.length} artists loaded from Show Management</span>
				{totals.total === 0 && (
					<Badge className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100">
						Add fee/logistics data via Artist Contracts to see costs
					</Badge>
				)}
			</div>

			{/* Filter Bar */}
			<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<p className="mb-3 text-sm font-semibold text-slate-700">
					Filter Cost Categories
				</p>
				<div className="flex flex-wrap items-center gap-3">
					{filterCategories.map(
						({ key, label, icon: Icon, color, value }) => (
							<button
								key={key}
								onClick={() => toggleFilter(key)}
								className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
									filters[key]
										? "border-emerald-300 bg-emerald-50 text-slate-800"
										: "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
								}`}
							>
								{filters[key] ? (
									<CheckCircle2 className="h-4 w-4 text-emerald-500" />
								) : (
									<div className="h-4 w-4 rounded-full border-2 border-slate-300" />
								)}
								<Icon
									className={`h-4 w-4 ${filters[key] ? color : "text-slate-400"}`}
								/>
								<span>{label}</span>
								<span
									className={`font-semibold ${filters[key] ? color : ""}`}
								>
									{value > 0 ? fmtTotal(value) : CURRENCY + "0"}
								</span>
							</button>
						),
					)}
				</div>
				<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
					<span className="text-slate-600">Selected Total:</span>
					<span className="font-bold text-slate-900">
						{fmtTotal(selectedTotal)}
					</span>
					<Badge className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
						Paid: {fmtTotal(totals.paid)}
					</Badge>
					<Badge className="rounded-full bg-red-100 px-3 py-1 text-red-600 hover:bg-red-100">
						Unpaid: {fmtTotal(unpaid)}
					</Badge>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="border-b border-slate-200 bg-slate-50">
							<tr>
								<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Artist
								</th>
								<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									#
								</th>
								{filters.fees && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-emerald-600">
										<div className="flex items-center gap-1">
											<DollarSign className="h-3.5 w-3.5" />{" "}
											Fees
										</div>
									</th>
								)}
								{filters.flights && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-blue-500">
										<div className="flex items-center gap-1">
											<Plane className="h-3.5 w-3.5" />{" "}
											Flights
										</div>
									</th>
								)}
								{filters.hotels && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-orange-500">
										<div className="flex items-center gap-1">
											<Hotel className="h-3.5 w-3.5" />{" "}
											Hotels
										</div>
									</th>
								)}
								{filters.transport && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-purple-500">
										<div className="flex items-center gap-1">
											<Bus className="h-3.5 w-3.5" />{" "}
											Transport
										</div>
									</th>
								)}
								{filters.food && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-400">
										<div className="flex items-center gap-1">
											<UtensilsCrossed className="h-3.5 w-3.5" />{" "}
											Food
										</div>
									</th>
								)}
								{filters.extra && (
									<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
										<div className="flex items-center gap-1">
											<Package className="h-3.5 w-3.5" />{" "}
											Extra
										</div>
									</th>
								)}
								<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
									Total
								</th>
								<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-emerald-600">
									Paid
								</th>
								<th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-500">
									Unpaid
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{rows.map((r, i) => {
								const rowTotal =
									r.fee +
									r.flights +
									r.hotel +
									r.transport +
									r.food;
								const rowPaid =
									(r.paidFee ? r.fee : 0) +
									(r.paidFlights ? r.flights : 0) +
									(r.paidHotel ? r.hotel : 0) +
									(r.paidTransport ? r.transport : 0) +
									(r.paidFood ? r.food : 0);
								const rowUnpaid = rowTotal - rowPaid;

								return (
									<tr
										key={`${r.id}-${i}`}
										className="transition-colors hover:bg-slate-50"
									>
										<td className="px-3 py-4">
											<span className="font-medium text-slate-900">
												{r.name}
											</span>
										</td>
										<td className="px-3 py-4 text-sm text-slate-500">
											{r.memberCount}
										</td>
										{filters.fees && (
											<CostCell
												val={r.fee}
												isPaid={r.paidFee}
											/>
										)}
										{filters.flights && (
											<CostCell
												val={r.flights}
												isPaid={r.paidFlights}
											/>
										)}
										{filters.hotels && (
											<CostCell
												val={r.hotel}
												isPaid={r.paidHotel}
											/>
										)}
										{filters.transport && (
											<CostCell
												val={r.transport}
												isPaid={r.paidTransport}
											/>
										)}
										{filters.food && (
											<CostCell
												val={r.food}
												isPaid={r.paidFood}
											/>
										)}
										{filters.extra && (
											<td className="px-3 py-4 text-sm text-slate-300">
												—
											</td>
										)}
										<td className="px-3 py-4 text-sm font-semibold text-slate-900">
											{rowTotal > 0
												? fmtTotal(rowTotal)
												: "—"}
										</td>
										<td className="px-3 py-4 text-sm font-medium text-emerald-600">
											{rowPaid > 0
												? fmtTotal(rowPaid)
												: "—"}
										</td>
										<td className="px-3 py-4 text-sm font-medium text-red-500">
											{rowUnpaid > 0
												? fmtTotal(rowUnpaid)
												: "—"}
										</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot className="border-t-2 border-slate-300 bg-slate-50">
							<tr>
								<td className="px-3 py-4 text-sm font-bold text-slate-900">
									TOTALS
								</td>
								<td className="px-3 py-4 text-sm font-bold text-slate-700">
									{rows.reduce(
										(s, r) => s + r.memberCount,
										0,
									)}
								</td>
								{filters.fees && (
									<td className="px-3 py-4 text-sm font-bold text-red-500">
										{totals.fees > 0
											? fmtTotal(totals.fees)
											: "—"}
									</td>
								)}
								{filters.flights && (
									<td className="px-3 py-4 text-sm font-bold text-red-500">
										{totals.flights > 0
											? fmtTotal(totals.flights)
											: "—"}
									</td>
								)}
								{filters.hotels && (
									<td className="px-3 py-4 text-sm font-bold text-red-500">
										{totals.hotels > 0
											? fmtTotal(totals.hotels)
											: "—"}
									</td>
								)}
								{filters.transport && (
									<td className="px-3 py-4 text-sm font-bold text-red-500">
										{totals.transport > 0
											? fmtTotal(totals.transport)
											: "—"}
									</td>
								)}
								{filters.food && (
									<td className="px-3 py-4 text-sm font-bold text-red-500">
										{totals.food > 0
											? fmtTotal(totals.food)
											: "—"}
									</td>
								)}
								{filters.extra && (
									<td className="px-3 py-4 text-sm font-bold text-slate-400">
										—
									</td>
								)}
								<td className="px-3 py-4 text-sm font-bold text-slate-900">
									{fmtTotal(totals.total)}
								</td>
								<td className="px-3 py-4 text-sm font-bold text-emerald-600">
									{fmtTotal(totals.paid)}
								</td>
								<td className="px-3 py-4 text-sm font-bold text-red-500">
									{fmtTotal(unpaid)}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			{rows.length === 0 && (
				<div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
					<p className="text-slate-500">
						No artists found for this event.
					</p>
				</div>
			)}
		</div>
	);
}

function CostCell({
	val,
	isPaid,
}: {
	val: number;
	isPaid?: boolean;
}) {
	if (val === 0) {
		return <td className="px-3 py-4 text-sm text-slate-300">—</td>;
	}
	return (
		<td className="px-3 py-4 text-sm text-slate-700">
			<span className="flex items-center gap-1">
				{isPaid !== undefined && (
					<CheckCircle2
						className={`h-3.5 w-3.5 ${isPaid ? "text-emerald-500" : "text-slate-300"}`}
					/>
				)}
				{fmtTotal(val)}
			</span>
		</td>
	);
}
