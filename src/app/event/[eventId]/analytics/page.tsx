"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	DollarSign,
	Plane,
	Hotel,
	Car,
	UtensilsCrossed,
	Users,
	TrendingUp,
	ChevronDown,
	ChevronUp,
	BarChart3,
	PieChart,
	CheckCircle2,
	XCircle,
	Table2,
	LayoutDashboard,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	RefreshCw,
	Loader2,
	FileText,
} from "lucide-react";
import { useContractData } from "@/hooks/useContractData";
import { useContractWebSocket } from "@/hooks/useContractWebSocket";
import { useContractSocket } from "@/hooks/useContractSocket";
import type { ContractArtist } from "@/types/contracts";

// ===== Types =====
type CostCategory =
	| "fee"
	| "flights"
	| "hotel"
	| "transport"
	| "food"
	| "extra";
type PaymentSt = "paid" | "unpaid";
type SortField =
	| "name"
	| "members"
	| CostCategory
	| "total"
	| "paid"
	| "unpaid";
type SortDir = "asc" | "desc";

interface ArtistCosts {
	artist: ContractArtist;
	fee: number;
	flights: number;
	hotel: number;
	transport: number;
	food: number;
	extra: number;
	total: number;
	feeSource: string;
	flightsSource: string;
	hotelSource: string;
	transportSource: string;
	foodSource: string;
	paymentStatus: Record<CostCategory, PaymentSt>;
}

function parseCurrency(val: string): number {
	const num = parseFloat((val || "").replace(/[^0-9.]/g, ""));
	return isNaN(num) ? 0 : num;
}

function computeArtistCosts(artist: ContractArtist): ArtistCosts {
	const fee = parseCurrency(artist.agreement?.agreedFee || "");
	const feeSource = artist.agreement?.agreedFee ? "Agreement" : "—";

	const flightBudget = parseCurrency(artist.agreement?.flightBudget || "");
	const flightActual = (artist.travelLogistics?.flights ?? []).reduce(
		(sum, f) => sum + parseCurrency(f.cost),
		0,
	);
	const flights = flightActual || flightBudget;
	const flightsSource =
		flightActual > 0
			? `${(artist.travelLogistics?.flights || []).length} tickets`
			: flightBudget > 0
				? "Budget estimate"
				: "—";

	const rooms = (artist.travelLogistics?.hotelRooms ?? []).reduce(
		(sum, r) => sum + parseCurrency(r.totalCost),
		0,
	);
	const hotelNights = artist.agreement?.hotelNights || 0;
	const hotel = rooms || hotelNights * 120;
	const hotelSource =
		rooms > 0
			? `${(artist.travelLogistics?.hotelRooms || []).length} room(s)`
			: hotelNights > 0
				? `${hotelNights} nights × €120 est.`
				: "—";

	const memberCount = Math.max((artist.groupMembers || []).length, 1);
	const transport = artist.agreement?.airportTransfer ? 80 * memberCount : 0;
	const transportSource = artist.agreement?.airportTransfer
		? `€80 × ${memberCount} members`
		: "—";

	const food = artist.agreement?.foodVouchers
		? 35 * Math.max(hotelNights, 1) * memberCount
		: 0;
	const foodSource = artist.agreement?.foodVouchers
		? `€35/day × ${Math.max(hotelNights, 1)}d × ${memberCount}`
		: "—";

	const extra = 0;
	const payments = artist.agreement?.payments;
	const paymentStatus: Record<CostCategory, PaymentSt> = {
		fee: payments?.feePaid ? "paid" : "unpaid",
		flights: payments?.flightsPaid ? "paid" : "unpaid",
		hotel: payments?.hotelPaid ? "paid" : "unpaid",
		transport: payments?.transportPaid ? "paid" : "unpaid",
		food: payments?.foodPaid ? "paid" : "unpaid",
		extra: "unpaid",
	};

	return {
		artist,
		fee,
		flights,
		hotel,
		transport,
		food,
		extra,
		total: fee + flights + hotel + transport + food + extra,
		feeSource,
		flightsSource,
		hotelSource,
		transportSource,
		foodSource,
		paymentStatus,
	};
}

const categoryMeta: {
	key: CostCategory;
	label: string;
	color: string;
	bgColor: string;
	icon: React.ElementType;
}[] = [
	{
		key: "fee",
		label: "Fees",
		color: "text-violet-400",
		bgColor: "bg-violet-500",
		icon: DollarSign,
	},
	{
		key: "flights",
		label: "Flights",
		color: "text-blue-600",
		bgColor: "bg-blue-500",
		icon: Plane,
	},
	{
		key: "hotel",
		label: "Hotels",
		color: "text-amber-400",
		bgColor: "bg-amber-500",
		icon: Hotel,
	},
	{
		key: "transport",
		label: "Transport",
		color: "text-emerald-400",
		bgColor: "bg-emerald-500",
		icon: Car,
	},
	{
		key: "food",
		label: "Food",
		color: "text-orange-600",
		bgColor: "bg-orange-500",
		icon: UtensilsCrossed,
	},
	{
		key: "extra",
		label: "Extra",
		color: "text-muted-foreground",
		bgColor: "bg-primary",
		icon: PieChart,
	},
];

function PaymentIcon({ status }: { status: PaymentSt }) {
	return status === "paid" ? (
		<CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
	) : (
		<XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
	);
}

const fmtWith = (symbol: string, val: number) =>
	`${symbol}${val.toLocaleString()}`;
let fmt = (val: number) => fmtWith("€", val);

// ===== Expandable Artist Cost Row (Dashboard View) =====
function ArtistCostRow({
	data,
	expanded,
	onToggle,
	activeCategories,
}: {
	data: ArtistCosts;
	expanded: boolean;
	onToggle: () => void;
	activeCategories: Set<CostCategory>;
}) {
	const { artist } = data;
	const categories = categoryMeta
		.filter((c) => activeCategories.has(c.key))
		.map((c) => ({
			...c,
			value: data[c.key],
			paid: data.paymentStatus[c.key],
		}));
	const filteredTotal = categories.reduce((s, c) => s + c.value, 0);
	const paidTotal = categories
		.filter((c) => c.paid === "paid")
		.reduce((s, c) => s + c.value, 0);
	const unpaidTotal = filteredTotal - paidTotal;

	return (
		<div className="border border-border rounded-xl bg-card  overflow-hidden">
			<div
				className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
				onClick={onToggle}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
						{artist.stageName.charAt(0)}
					</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-foreground">
							{artist.stageName}
						</p>
						<p className="text-[11px] text-muted-foreground">
							{artist.country} ·{" "}
							{(artist.groupMembers || []).length} member
							{(artist.groupMembers || []).length !== 1
								? "s"
								: ""}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="hidden md:flex items-center gap-3">
						{categories
							.filter((c) => c.value > 0)
							.map((c) => (
								<span
									key={c.key}
									className={`text-xs ${c.color}`}
								>
									{c.label} {fmt(c.value)}
								</span>
							))}
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded">
							{fmt(filteredTotal)}
						</span>
						{unpaidTotal > 0 && (
							<span className="text-[10px] text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded">
								{fmt(unpaidTotal)} unpaid
							</span>
						)}
					</div>
					{expanded ? (
						<ChevronUp className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					)}
				</div>
			</div>
			{expanded && (
				<div className="border-t border-border p-4">
					<div className="grid grid-cols-3 md:grid-cols-6 gap-3">
						{categories.map((c) => (
							<div
								key={c.key}
								className="text-center p-2 rounded-lg bg-secondary/50 space-y-1"
							>
								<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
									{c.label}
								</p>
								<p
									className={`text-sm font-bold ${c.value > 0 ? c.color : "text-muted-foreground"}`}
								>
									{c.value > 0 ? fmt(c.value) : "—"}
								</p>
								{c.value > 0 && <PaymentIcon status={c.paid} />}
							</div>
						))}
					</div>
					<div className="border-t border-border my-3" />
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<div className="flex items-center gap-4">
							<span>
								Workshops:{" "}
								{artist.agreement?.workshopsConfirmed || 0}
							</span>
							<span>
								Shows: {artist.agreement?.showsConfirmed || 0}
							</span>
							{(artist.agreement?.djSets || 0) > 0 && (
								<span>DJ Sets: {artist.agreement?.djSets}</span>
							)}
							<span>
								Hotel nights:{" "}
								{artist.agreement?.hotelNights || 0}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-foreground font-medium">
								{artist.agreement?.arrivalDate || "?"} →{" "}
								{artist.agreement?.departureDate || "?"}
							</span>
							<span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">
								Paid: {fmt(paidTotal)}
							</span>
							<span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-600 rounded">
								Unpaid: {fmt(unpaidTotal)}
							</span>
						</div>
					</div>
					<div className="mt-3 flex h-2 rounded-full overflow-hidden bg-muted">
						{categories
							.filter((c) => c.value > 0 && filteredTotal > 0)
							.map((c) => (
								<div
									key={c.key}
									className={`${c.bgColor} transition-all`}
									style={{
										width: `${(c.value / filteredTotal) * 100}%`,
									}}
									title={`${c.label}: ${((c.value / filteredTotal) * 100).toFixed(1)}%`}
								/>
							))}
					</div>
				</div>
			)}
		</div>
	);
}

// ===== Sortable Cost Spreadsheet =====
function CostSpreadsheet({
	costData,
	activeCategories,
	totals,
	paidTotals,
}: {
	costData: ArtistCosts[];
	activeCategories: Set<CostCategory>;
	totals: Record<CostCategory, number>;
	paidTotals: Record<CostCategory, number>;
}) {
	const [sortField, setSortField] = useState<SortField>("total");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const handleSort = (field: SortField) => {
		if (sortField === field)
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortField(field);
			setSortDir("desc");
		}
	};
	const SortIcon = ({ field }: { field: SortField }) =>
		sortField !== field ? (
			<ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />
		) : sortDir === "asc" ? (
			<ArrowUp className="w-3 h-3 ml-1" />
		) : (
			<ArrowDown className="w-3 h-3 ml-1" />
		);
	const activeColumns = categoryMeta.filter((c) =>
		activeCategories.has(c.key),
	);

	const sorted = useMemo(() => {
		const arr = [...costData];
		arr.sort((a, b) => {
			let aVal: number | string = 0,
				bVal: number | string = 0;
			if (sortField === "name") {
				aVal = a.artist.stageName;
				bVal = b.artist.stageName;
			} else if (sortField === "members") {
				aVal = (a.artist.groupMembers || []).length;
				bVal = (b.artist.groupMembers || []).length;
			} else if (sortField === "paid") {
				aVal = activeColumns
					.filter((c) => a.paymentStatus[c.key] === "paid")
					.reduce((s, c) => s + a[c.key], 0);
				bVal = activeColumns
					.filter((c) => b.paymentStatus[c.key] === "paid")
					.reduce((s, c) => s + b[c.key], 0);
			} else if (sortField === "unpaid") {
				const aT = activeColumns.reduce((s, c) => s + a[c.key], 0);
				const bT = activeColumns.reduce((s, c) => s + b[c.key], 0);
				aVal =
					aT -
					activeColumns
						.filter((c) => a.paymentStatus[c.key] === "paid")
						.reduce((s, c) => s + a[c.key], 0);
				bVal =
					bT -
					activeColumns
						.filter((c) => b.paymentStatus[c.key] === "paid")
						.reduce((s, c) => s + b[c.key], 0);
			} else if (sortField === "total") {
				aVal = activeColumns.reduce((s, c) => s + a[c.key], 0);
				bVal = activeColumns.reduce((s, c) => s + b[c.key], 0);
			} else {
				aVal = a[sortField as CostCategory];
				bVal = b[sortField as CostCategory];
			}
			if (typeof aVal === "string")
				return sortDir === "asc"
					? aVal.localeCompare(bVal as string)
					: (bVal as string).localeCompare(aVal);
			return sortDir === "asc"
				? (aVal as number) - (bVal as number)
				: (bVal as number) - (aVal as number);
		});
		return arr;
	}, [costData, sortField, sortDir, activeColumns]);

	const grandTotal = activeColumns.reduce((s, c) => s + totals[c.key], 0);
	const grandPaid = activeColumns.reduce((s, c) => s + paidTotals[c.key], 0);
	const grandUnpaid = grandTotal - grandPaid;

	const thCls =
		"text-left py-3 px-3 text-muted-foreground font-medium text-[11px] uppercase tracking-wider";
	const tdCls = "py-3 px-3";

	return (
		<div className="bg-card border border-border rounded-xl overflow-hidden ">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-card border-b border-border">
							<th
								className={`${thCls} sticky left-0 bg-card z-10 min-w-[180px]`}
							>
								<button
									className="flex items-center"
									onClick={() => handleSort("name")}
								>
									Artist <SortIcon field="name" />
								</button>
							</th>
							<th className={`${thCls} text-center w-16`}>
								<button
									className="flex items-center justify-center mx-auto"
									onClick={() => handleSort("members")}
								>
									# <SortIcon field="members" />
								</button>
							</th>
							{activeColumns.map((c) => (
								<th
									key={c.key}
									className={`${thCls} min-w-[100px]`}
								>
									<button
										className="flex items-center"
										onClick={() => handleSort(c.key)}
									>
										<c.icon
											className={`w-3 h-3 mr-1 ${c.color}`}
										/>
										{c.label} <SortIcon field={c.key} />
									</button>
								</th>
							))}
							<th
								className={`${thCls} text-right min-w-[110px] bg-primary/10`}
							>
								<button
									className="flex items-center justify-end ml-auto"
									onClick={() => handleSort("total")}
								>
									Total <SortIcon field="total" />
								</button>
							</th>
							<th className={`${thCls} text-right min-w-[100px]`}>
								<button
									className="flex items-center justify-end ml-auto"
									onClick={() => handleSort("paid")}
								>
									Paid <SortIcon field="paid" />
								</button>
							</th>
							<th className={`${thCls} text-right min-w-[100px]`}>
								<button
									className="flex items-center justify-end ml-auto"
									onClick={() => handleSort("unpaid")}
								>
									Unpaid <SortIcon field="unpaid" />
								</button>
							</th>
							<th className={`${thCls} text-center min-w-[80px]`}>
								Status
							</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((d) => {
							const rowTotal = activeColumns.reduce(
								(s, c) => s + d[c.key],
								0,
							);
							const rowPaid = activeColumns
								.filter(
									(c) => d.paymentStatus[c.key] === "paid",
								)
								.reduce((s, c) => s + d[c.key], 0);
							const rowUnpaid = rowTotal - rowPaid;
							return (
								<tr
									key={d.artist.id}
									className="border-b border-border hover:bg-secondary/50 transition-colors group"
								>
									<td
										className={`${tdCls} sticky left-0 bg-card group-hover:bg-secondary/50 z-10`}
									>
										<p className="text-sm font-semibold text-foreground">
											{d.artist.stageName}
										</p>
									</td>
									<td className={`${tdCls} text-center`}>
										<span className="text-xs text-muted-foreground">
											{
												(d.artist.groupMembers || [])
													.length
											}
										</span>
									</td>
									{activeColumns.map((c) => (
										<td key={c.key} className={tdCls}>
											<div className="flex items-center gap-1.5">
												{d[c.key] > 0 && (
													<PaymentIcon
														status={
															d.paymentStatus[
																c.key
															]
														}
													/>
												)}
												<span
													className={`text-sm font-medium tabular-nums ${d[c.key] > 0 ? "text-foreground" : "text-muted-foreground"}`}
												>
													{d[c.key] > 0
														? fmt(d[c.key])
														: "—"}
												</span>
											</div>
										</td>
									))}
									<td
										className={`${tdCls} text-right bg-primary/5`}
									>
										<span className="text-sm font-bold text-foreground tabular-nums">
											{fmt(rowTotal)}
										</span>
									</td>
									<td className={`${tdCls} text-right`}>
										<span className="text-sm font-medium text-green-600 tabular-nums">
											{fmt(rowPaid)}
										</span>
									</td>
									<td className={`${tdCls} text-right`}>
										<span
											className={`text-sm font-medium tabular-nums ${rowUnpaid > 0 ? "text-red-600" : "text-muted-foreground"}`}
										>
											{rowUnpaid > 0
												? fmt(rowUnpaid)
												: "—"}
										</span>
									</td>
									<td className={`${tdCls} text-center`}>
										<span
											className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${d.artist.status === "confirmed" ? "bg-green-500/20 text-green-600" : d.artist.status === "awaiting" ? "bg-yellow-500/20 text-yellow-600" : "bg-primary/20 text-muted-foreground"}`}
										>
											{d.artist.status}
										</span>
									</td>
								</tr>
							);
						})}
						{/* Totals row */}
						<tr className="bg-card border-t-2 border-border font-bold">
							<td
								className={`${tdCls} sticky left-0 bg-card z-10`}
							>
								<span className="text-sm font-bold text-foreground">
									TOTALS
								</span>
							</td>
							<td className={`${tdCls} text-center`}>
								<span className="text-xs font-bold text-foreground">
									{sorted.reduce(
										(s, d) =>
											s +
											(d.artist.groupMembers || [])
												.length,
										0,
									)}
								</span>
							</td>
							{activeColumns.map((c) => (
								<td key={c.key} className={tdCls}>
									<span
										className={`text-sm font-bold tabular-nums ${c.color}`}
									>
										{fmt(totals[c.key])}
									</span>
								</td>
							))}
							<td className={`${tdCls} text-right bg-primary/10`}>
								<span className="text-sm font-black text-foreground tabular-nums">
									{fmt(grandTotal)}
								</span>
							</td>
							<td className={`${tdCls} text-right`}>
								<span className="text-sm font-bold text-green-600 tabular-nums">
									{fmt(grandPaid)}
								</span>
							</td>
							<td className={`${tdCls} text-right`}>
								<span className="text-sm font-bold text-red-600 tabular-nums">
									{fmt(grandUnpaid)}
								</span>
							</td>
							<td />
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}

const CURRENCIES = [
	{ code: "EUR", symbol: "€", name: "Euro" },
	{ code: "USD", symbol: "$", name: "US Dollar" },
	{ code: "GBP", symbol: "£", name: "British Pound" },
	{ code: "CHF", symbol: "CHF", name: "Swiss Franc" },
	{ code: "SEK", symbol: "kr", name: "Swedish Krona" },
	{ code: "NOK", symbol: "kr", name: "Norwegian Krone" },
	{ code: "DKK", symbol: "kr", name: "Danish Krone" },
	{ code: "PLN", symbol: "zł", name: "Polish Zloty" },
	{ code: "BRL", symbol: "R$", name: "Brazilian Real" },
	{ code: "ARS", symbol: "ARS", name: "Argentine Peso" },
];

// ===== Main Analytics Page =====
export default function AnalyticsPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;
	const { artists, isLoading, refetch } = useContractData({ eventId });
	useContractWebSocket({ eventId });
	useContractSocket({ eventId, role: "organiser" });

	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<"total" | "name">("total");
	const [viewMode, setViewMode] = useState<"sheet" | "dashboard">("sheet");
	const [currency, setCurrency] = useState("EUR");
	const [activeCategories, setActiveCategories] = useState<Set<CostCategory>>(
		new Set(["fee", "flights", "hotel", "transport", "food", "extra"]),
	);

	// Load currency setting from GCS
	useEffect(() => {
		fetch(`/api/contracts/${eventId}/settings`)
			.then((res) => res.json())
			.then((data) => {
				if (data.success && data.settings?.defaultCurrency) {
					setCurrency(data.settings.defaultCurrency);
				}
			})
			.catch(console.error);
	}, [eventId]);

	// Save currency setting to GCS when changed
	const handleCurrencyChange = async (newCurrency: string) => {
		setCurrency(newCurrency);
		try {
			await fetch(`/api/contracts/${eventId}/settings`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ defaultCurrency: newCurrency }),
			});
		} catch (err) {
			console.error("Error saving currency setting:", err);
		}
	};
	const currencySymbol =
		CURRENCIES.find((c) => c.code === currency)?.symbol || "€";
	// Update module-level fmt to use selected currency
	fmt = (val: number) => fmtWith(currencySymbol, val);

	const toggleCategory = (cat: CostCategory) =>
		setActiveCategories((prev) => {
			const next = new Set(prev);
			if (next.has(cat)) next.delete(cat);
			else next.add(cat);
			return next;
		});

	const eligibleArtists = artists.filter((a) => a.status !== "invited");
	const costData = useMemo(() => {
		const data = eligibleArtists.map(computeArtistCosts);
		return sortBy === "total"
			? data.sort((a, b) => b.total - a.total)
			: data.sort((a, b) =>
					a.artist.stageName.localeCompare(b.artist.stageName),
				);
	}, [eligibleArtists, sortBy]);

	const totals = useMemo(() => {
		const t: Record<CostCategory, number> = {
			fee: 0,
			flights: 0,
			hotel: 0,
			transport: 0,
			food: 0,
			extra: 0,
		};
		costData.forEach((d) => {
			(Object.keys(t) as CostCategory[]).forEach((k) => {
				t[k] += d[k];
			});
		});
		return t;
	}, [costData]);

	const paidTotals = useMemo(() => {
		const t: Record<CostCategory, number> = {
			fee: 0,
			flights: 0,
			hotel: 0,
			transport: 0,
			food: 0,
			extra: 0,
		};
		costData.forEach((d) => {
			(Object.keys(t) as CostCategory[]).forEach((k) => {
				if (d.paymentStatus[k] === "paid") t[k] += d[k];
			});
		});
		return t;
	}, [costData]);

	const filteredTotal = (Object.keys(totals) as CostCategory[])
		.filter((k) => activeCategories.has(k))
		.reduce((s, k) => s + totals[k], 0);
	const filteredPaid = (Object.keys(paidTotals) as CostCategory[])
		.filter((k) => activeCategories.has(k))
		.reduce((s, k) => s + paidTotals[k], 0);
	const avgPerArtist =
		costData.length > 0 ? Math.round(filteredTotal / costData.length) : 0;

	if (isLoading)
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
			</div>
		);

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button
						onClick={() =>
							router.push(`/event/${eventId}/artist-contracts`)
						}
						className="p-2 hover:bg-muted rounded-lg transition-colors"
					>
						<ArrowLeft className="w-4 h-4 text-foreground" />
					</button>
					<Image
						src="/fame-logo.png"
						alt="FAME"
						width={32}
						height={32}
						className="rounded-lg"
					/>
					<div>
						<h1 className="text-sm font-bold text-foreground">
							Cost Analytics
						</h1>
						<p className="text-xs text-muted-foreground">
							Budget overview · {costData.length} artists
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{/* Currency selector */}
					<select
						value={currency}
						onChange={(e) => handleCurrencyChange(e.target.value)}
						className="px-2 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
					>
						{CURRENCIES.map((c) => (
							<option key={c.code} value={c.code}>
								{c.symbol} {c.code}
							</option>
						))}
					</select>
					{/* View mode toggle */}
					<div className="flex bg-card border border-border rounded-lg overflow-hidden">
						<button
							onClick={() => setViewMode("sheet")}
							className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "sheet" ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
						>
							<Table2 className="w-3.5 h-3.5" /> Cost Sheet
						</button>
						<button
							onClick={() => setViewMode("dashboard")}
							className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all ${viewMode === "dashboard" ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
						>
							<LayoutDashboard className="w-3.5 h-3.5" />{" "}
							Dashboard
						</button>
					</div>
				</div>
			</header>

			<div className="flex-1 overflow-auto p-5">
				<div
					className={`mx-auto space-y-5 ${viewMode === "sheet" ? "max-w-7xl" : "max-w-5xl"}`}
				>
					{/* Category Filter */}
					<div className="bg-card border border-border rounded-xl p-4 ">
						<p className="text-xs font-semibold text-foreground mb-2">
							Filter Cost Categories
						</p>
						<div className="flex flex-wrap gap-3">
							{categoryMeta.map((cat) => (
								<label
									key={cat.key}
									className="flex items-center gap-2 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={activeCategories.has(cat.key)}
										onChange={() => toggleCategory(cat.key)}
										className="w-3.5 h-3.5 rounded border-primary bg-card text-muted-foreground focus:ring-primary"
									/>
									<cat.icon
										className={`w-3.5 h-3.5 ${cat.color}`}
									/>
									<span className="text-xs text-foreground">
										{cat.label}
									</span>
									<span className="text-[10px] text-muted-foreground">
										{fmt(totals[cat.key])}
									</span>
								</label>
							))}
						</div>
						<div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
							<span className="text-xs font-semibold text-foreground">
								Selected Total: {fmt(filteredTotal)}
							</span>
							<span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded border border-green-500/20">
								<CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />{" "}
								Paid: {fmt(filteredPaid)}
							</span>
							<span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 rounded border border-red-500/20">
								<XCircle className="w-2.5 h-2.5 inline mr-0.5" />{" "}
								Unpaid: {fmt(filteredTotal - filteredPaid)}
							</span>
						</div>
					</div>

					{viewMode === "sheet" ? (
						<CostSpreadsheet
							costData={costData}
							activeCategories={activeCategories}
							totals={totals}
							paidTotals={paidTotals}
						/>
					) : (
						<>
							{/* Summary Cards */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
								{[
									{
										label: "Selected Total",
										value: filteredTotal,
										icon: DollarSign,
										color: "from-purple-500 to-pink-500",
									},
									{
										label: "Paid",
										value: filteredPaid,
										icon: CheckCircle2,
										color: "from-green-500 to-emerald-500",
									},
									{
										label: "Unpaid",
										value: filteredTotal - filteredPaid,
										icon: XCircle,
										color: "from-red-500 to-orange-500",
									},
									{
										label: "Avg / Artist",
										value: avgPerArtist,
										icon: BarChart3,
										color: "from-blue-500 to-indigo-500",
									},
								].map((card, i) => (
									<div
										key={i}
										className="relative overflow-hidden p-4 bg-card  border border-border rounded-xl"
									>
										<div
											className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`}
										/>
										<div className="flex items-center gap-3 mb-1">
											<div
												className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-foreground/90`}
											>
												<card.icon className="w-5 h-5" />
											</div>
											<span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
												{card.label}
											</span>
										</div>
										<p className="text-lg font-bold text-foreground">
											{fmt(card.value)}
										</p>
									</div>
								))}
							</div>

							{/* Budget Breakdown Bar */}
							<div className="bg-card border border-border rounded-xl p-4 ">
								<p className="text-xs font-semibold text-foreground mb-2">
									Budget Breakdown
								</p>
								<div className="flex h-4 rounded-full overflow-hidden bg-muted">
									{categoryMeta
										.filter(
											(c) =>
												activeCategories.has(c.key) &&
												totals[c.key] > 0 &&
												filteredTotal > 0,
										)
										.map((c) => (
											<div
												key={c.key}
												className={`${c.bgColor} transition-all`}
												style={{
													width: `${(totals[c.key] / filteredTotal) * 100}%`,
												}}
												title={`${c.label}: ${fmt(totals[c.key])} (${((totals[c.key] / filteredTotal) * 100).toFixed(1)}%)`}
											/>
										))}
								</div>
								<div className="flex items-center gap-4 mt-2">
									{categoryMeta
										.filter(
											(c) =>
												activeCategories.has(c.key) &&
												totals[c.key] > 0,
										)
										.map((c) => (
											<div
												key={c.key}
												className="flex items-center gap-1.5"
											>
												<div
													className={`w-2.5 h-2.5 rounded-full ${c.bgColor}`}
												/>
												<span className="text-[11px] text-muted-foreground">
													{c.label} (
													{(
														(totals[c.key] /
															filteredTotal) *
														100
													).toFixed(0)}
													%)
												</span>
											</div>
										))}
								</div>
							</div>

							<div className="border-t border-border" />

							{/* Per-Artist Breakdown */}
							<div>
								<div className="flex items-center justify-between mb-3">
									<p className="text-sm font-semibold text-foreground">
										Per-Artist Breakdown
									</p>
									<div className="flex items-center gap-2">
										{(["total", "name"] as const).map(
											(s) => (
												<button
													key={s}
													onClick={() => setSortBy(s)}
													className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sortBy === s ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
												>
													{s === "total" ? (
														<>
															<TrendingUp className="w-3 h-3" />{" "}
															By Cost
														</>
													) : (
														<>
															<Users className="w-3 h-3" />{" "}
															By Name
														</>
													)}
												</button>
											),
										)}
									</div>
								</div>
								<div className="space-y-2">
									{costData.map((data) => (
										<ArtistCostRow
											key={data.artist.id}
											data={data}
											expanded={
												expandedId === data.artist.id
											}
											onToggle={() =>
												setExpandedId(
													expandedId ===
														data.artist.id
														? null
														: data.artist.id,
												)
											}
											activeCategories={activeCategories}
										/>
									))}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
