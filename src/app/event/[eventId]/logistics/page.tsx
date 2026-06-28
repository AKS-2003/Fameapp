"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	Plane,
	Hotel,
	MapPin,
	Users,
	Download,
	Search,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	AlertTriangle,
	FileText,
	Calendar,
	Edit,
	Car,
	Phone,
	ExternalLink,
	DollarSign,
	StickyNote,
	Plus,
	Trash2,
	UtensilsCrossed,
	XCircle,
	X,
	Save,
	Check,
	Building2,
	RefreshCw,
	Loader2,
	Settings,
	Mail,
	BedDouble,
} from "lucide-react";
import { useContractData } from "@/hooks/useContractData";
import { useContractWebSocket } from "@/hooks/useContractWebSocket";
import { useContractSocket } from "@/hooks/useContractSocket";
import type {
	ContractArtist,
	FlightDetail,
	HotelRoomBooking,
	RegisteredHotel,
	RegisteredDriver,
	RegisteredVenue,
	CateringOption,
} from "@/types/contracts";

function parseCurrency(val: string): number {
	const num = parseFloat((val || "").replace(/[^0-9.]/g, ""));
	return isNaN(num) ? 0 : num;
}

const roomTypeLabels: Record<string, string> = {
	single: "Single",
	double: "Double",
	twin: "Twin",
	suite: "Suite",
};
const mealTypeLabels: Record<string, string> = {
	breakfast: "Breakfast",
	lunch: "Lunch",
	dinner: "Dinner",
	snack: "Snack",
};

function PaymentStatusBadge({
	paid,
	onToggle,
}: {
	paid: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			onClick={(e) => {
				e.stopPropagation();
				onToggle();
			}}
			className={`inline-flex items-center gap-0.5 px-1.5 h-5 text-[9px] font-medium rounded transition-colors ${paid ? "text-green-600 hover:bg-green-500/10" : "text-red-600 hover:bg-red-500/10"}`}
		>
			{paid ? (
				<CheckCircle2 className="w-2.5 h-2.5" />
			) : (
				<XCircle className="w-2.5 h-2.5" />
			)}
			{paid ? "Paid" : "Unpaid"}
		</button>
	);
}

function AddFlightForm({
	memberNames,
	initial,
	onAdd,
	onCancel,
}: {
	memberNames: string[];
	initial?: FlightDetail;
	onAdd: (f: FlightDetail) => void;
	onCancel: () => void;
}) {
	const [type, setType] = useState<"arrival" | "departure">(
		initial?.type ?? "arrival",
	);
	const [passengerName, setPassengerName] = useState(
		initial?.passengerName ?? (memberNames[0] || ""),
	);
	const [flightNumber, setFlightNumber] = useState(
		initial?.flightNumber ?? "",
	);
	const [airport, setAirport] = useState(initial?.airport ?? "");
	const [date, setDate] = useState(initial?.date ?? "");
	const [time, setTime] = useState(initial?.time ?? "");
	const [cost, setCost] = useState(
		initial?.cost ? initial.cost.replace(/[^0-9.]/g, "") : "",
	);
	const [notes, setNotes] = useState(initial?.notes ?? "");
	const handleSave = () => {
		if (!date) return;
		onAdd({
			id: initial?.id ?? `f-${Date.now()}`,
			type,
			passengerName,
			flightNumber,
			airport,
			date,
			time,
			cost: cost ? `€${cost}` : "",
			ticketFile: initial?.ticketFile ?? "",
			notes,
		});
	};
	return (
		<div className="border border-border rounded-lg bg-secondary/50 p-3 space-y-2">
			<p className="text-xs font-semibold text-foreground">
				{initial ? "Edit Flight" : "Add Flight"}
			</p>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Type
					</label>
					<select
						value={type}
						onChange={(e) => setType(e.target.value as any)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					>
						<option value="arrival">Arrival</option>
						<option value="departure">Departure</option>
					</select>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Passenger
					</label>
					{memberNames.length > 1 ? (
						<select
							value={passengerName}
							onChange={(e) => setPassengerName(e.target.value)}
							className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
						>
							{memberNames.map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					) : (
						<input
							value={passengerName}
							onChange={(e) => setPassengerName(e.target.value)}
							className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
						/>
					)}
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Flight #
					</label>
					<input
						value={flightNumber}
						onChange={(e) => setFlightNumber(e.target.value)}
						placeholder="AV204"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Airport
					</label>
					<input
						value={airport}
						onChange={(e) => setAirport(e.target.value)}
						placeholder="AMS"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Date *
					</label>
					<input
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Time
					</label>
					<input
						type="time"
						value={time}
						onChange={(e) => setTime(e.target.value)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Cost (€)
					</label>
					<input
						type="number"
						value={cost}
						onChange={(e) => setCost(e.target.value)}
						placeholder="450"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Notes
					</label>
					<input
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					/>
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<button
					onClick={onCancel}
					className="px-2 py-1 text-muted-foreground text-[11px]"
				>
					<X className="w-3 h-3 inline mr-0.5" />
					Cancel
				</button>
				<button
					onClick={handleSave}
					className="px-2 py-1 bg-primary text-foreground rounded text-[11px] hover:bg-primary"
				>
					<Check className="w-3 h-3 inline mr-0.5" />
					{initial ? "Save" : "Add"}
				</button>
			</div>
		</div>
	);
}

function AddRoomForm({
	memberNames,
	initial,
	onAdd,
	onCancel,
}: {
	memberNames: string[];
	initial?: HotelRoomBooking;
	onAdd: (r: HotelRoomBooking) => void;
	onCancel: () => void;
}) {
	const [roomType, setRoomType] = useState<
		"single" | "double" | "twin" | "suite"
	>(initial?.roomType ?? "single");
	const [guestNames, setGuestNames] = useState(initial?.guestNames ?? "");
	const [costPerNight, setCostPerNight] = useState(
		initial?.costPerNight
			? initial.costPerNight.replace(/[^0-9.]/g, "")
			: "",
	);
	const [nights, setNights] = useState("1");
	const [notes, setNotes] = useState(initial?.notes ?? "");
	const totalCost = (parseFloat(costPerNight) || 0) * (parseInt(nights) || 0);
	const handleSave = () => {
		if (!guestNames.trim()) return;
		onAdd({
			id: initial?.id ?? `r-${Date.now()}`,
			roomType,
			guestNames,
			costPerNight: costPerNight ? `€${costPerNight}` : "",
			totalCost:
				totalCost > 0 ? `€${totalCost}` : (initial?.totalCost ?? ""),
			notes,
		});
	};
	return (
		<div className="border border-border rounded-lg bg-secondary/50 p-3 space-y-2">
			<p className="text-xs font-semibold text-foreground">
				{initial ? "Edit Room" : "Add Room"}
			</p>
			<div className="grid grid-cols-2 gap-2">
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Room Type
					</label>
					<select
						value={roomType}
						onChange={(e) => setRoomType(e.target.value as any)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					>
						<option value="single">Single</option>
						<option value="double">Double</option>
						<option value="twin">Twin</option>
						<option value="suite">Suite</option>
					</select>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Guests
					</label>
					<input
						value={guestNames}
						onChange={(e) => setGuestNames(e.target.value)}
						placeholder="Name 1, Name 2"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Cost/Night (€)
					</label>
					<input
						type="number"
						value={costPerNight}
						onChange={(e) => setCostPerNight(e.target.value)}
						placeholder="120"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Nights
					</label>
					<input
						type="number"
						value={nights}
						onChange={(e) => setNights(e.target.value)}
						placeholder="4"
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</div>
				<div>
					<label className="text-[10px] text-muted-foreground uppercase">
						Notes
					</label>
					<input
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
					/>
				</div>
				<div className="flex items-end">
					{totalCost > 0 && (
						<span className="text-[10px] px-2 py-0.5 bg-primary/20 text-foreground rounded border border-border">
							Total: €{totalCost}
						</span>
					)}
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<button
					onClick={onCancel}
					className="px-2 py-1 text-muted-foreground text-[11px]"
				>
					<X className="w-3 h-3 inline mr-0.5" />
					Cancel
				</button>
				<button
					onClick={handleSave}
					className="px-2 py-1 bg-primary text-foreground rounded text-[11px] hover:bg-primary"
				>
					<Check className="w-3 h-3 inline mr-0.5" />
					{initial ? "Save" : "Add"}
				</button>
			</div>
		</div>
	);
}

// ===== Per-Artist Logistics Card with 7 Tabs =====
function LogisticsCard({
	artist,
	registries,
	onUpdateArtist,
}: {
	artist: ContractArtist;
	registries: {
		hotels: RegisteredHotel[];
		drivers: RegisteredDriver[];
		venues: RegisteredVenue[];
		catering: CateringOption[];
	};
	onUpdateArtist: (
		artistId: string,
		updates: Partial<ContractArtist>,
	) => Promise<boolean>;
}) {
	const [expanded, setExpanded] = useState(false);
	const [activeTab, setActiveTab] = useState("members");
	const [addingFlight, setAddingFlight] = useState(false);
	const [addingRoom, setAddingRoom] = useState(false);
	const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
	const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const [editingHotel, setEditingHotel] = useState(false);
	const [hotelForm, setHotelForm] = useState({
		hotelId: artist.travelLogistics?.hotelId || "",
		hotelName: artist.travelLogistics?.hotelName || "",
		hotelAddress: artist.travelLogistics?.hotelAddress || "",
		hotelCheckIn: artist.travelLogistics?.hotelCheckIn || "",
		hotelCheckOut: artist.travelLogistics?.hotelCheckOut || "",
		hotelNotes: artist.travelLogistics?.hotelNotes || "",
		hotelMapLink: artist.travelLogistics?.hotelMapLink || "",
	});
	const [selectedDriverId, setSelectedDriverId] = useState("");
	const [costType, setCostType] = useState<"per_trip" | "per_person">(
		"per_trip",
	);
	const [selectedVenueId, setSelectedVenueId] = useState("");
	const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>(
		{},
	);
	const [flightsPaid, setFlightsPaid] = useState<Record<string, boolean>>({});
	const [roomsPaid, setRoomsPaid] = useState<Record<string, boolean>>({});
	const [transportPaid, setTransportPaid] = useState(false);
	const [addingNewDriver, setAddingNewDriver] = useState(false);
	const [newDriverForm, setNewDriverForm] = useState({ name: "", phone: "", vehicle: "", capacity: "", costPerTrip: "", costPerPerson: "", notes: "" });
	const [notesForm, setNotesForm] = useState({
		workshopSchedule: artist.travelLogistics?.workshopSchedule || "",
		pickupInfo: artist.travelLogistics?.pickupInfo || "",
		dropoffInfo: artist.travelLogistics?.dropoffInfo || "",
		additionalNotes: artist.travelLogistics?.additionalNotes || "",
	});

	const logistics = artist.travelLogistics || ({} as any);
	const flights = logistics.flights || [];
	const hotelRooms = logistics.hotelRooms || [];
	const memberNames = artist.groupMembers?.map((m) => m.fullName) || [
		artist.stageName,
	];

	const hasFlights = flights.length > 0;
	const hasHotel = !!logistics.hotelName;
	const logisticsComplete =
		logistics.pickupInfo &&
		logistics.dropoffInfo &&
		logistics.workshopSchedule;
	const passportsComplete = (artist.groupMembers || []).every(
		(m) => m.passportFile,
	);
	const overallStatus =
		hasFlights && hasHotel && logisticsComplete && passportsComplete
			? "complete"
			: hasFlights || hasHotel || logistics.pickupInfo
				? "partial"
				: "pending";
	const statusConfig = {
		complete: { label: "Complete", cls: "bg-green-500/10 text-green-600" },
		partial: {
			label: "In Progress",
			cls: "bg-yellow-500/10 text-yellow-600",
		},
		pending: { label: "Pending", cls: "bg-red-500/10 text-red-600" },
	};
	const totalFlightCost = flights.reduce(
		(sum: number, f: FlightDetail) => sum + parseCurrency(f.cost),
		0,
	);
	const totalRoomCost = hotelRooms.reduce(
		(sum: number, r: HotelRoomBooking) => sum + parseCurrency(r.totalCost),
		0,
	);
	const foodCost = Object.entries(selectedMeals).reduce((sum, [, catId]) => {
		const opt = registries.catering.find((c) => c.id === catId);
		return sum + (opt ? opt.costPerPerson : 0);
	}, 0);

	const saveFlight = async (flight: FlightDetail) => {
		const existing = flights.find((f: FlightDetail) => f.id === flight.id);
		const newFlights = existing
			? flights.map((f: FlightDetail) =>
					f.id === flight.id ? flight : f,
				)
			: [...flights, flight];
		await onUpdateArtist(artist.id, {
			travelLogistics: { ...logistics, flights: newFlights },
		});
		setAddingFlight(false);
		setEditingFlightId(null);
	};
	const deleteFlight = async (id: string) => {
		await onUpdateArtist(artist.id, {
			travelLogistics: {
				...logistics,
				flights: flights.filter((f: FlightDetail) => f.id !== id),
			},
		});
	};
	const saveRoom = async (room: HotelRoomBooking) => {
		const existing = hotelRooms.find(
			(r: HotelRoomBooking) => r.id === room.id,
		);
		const newRooms = existing
			? hotelRooms.map((r: HotelRoomBooking) =>
					r.id === room.id ? room : r,
				)
			: [...hotelRooms, room];
		await onUpdateArtist(artist.id, {
			travelLogistics: { ...logistics, hotelRooms: newRooms },
		});
		setAddingRoom(false);
		setEditingRoomId(null);
	};
	const deleteRoom = async (id: string) => {
		await onUpdateArtist(artist.id, {
			travelLogistics: {
				...logistics,
				hotelRooms: hotelRooms.filter(
					(r: HotelRoomBooking) => r.id !== id,
				),
			},
		});
	};
	const saveNotes = async () => {
		await onUpdateArtist(artist.id, {
			travelLogistics: { ...logistics, ...notesForm },
		});
		setEditing(false);
	};
	const saveHotelInfo = async () => {
		await onUpdateArtist(artist.id, {
			travelLogistics: { ...logistics, ...hotelForm },
		});
		setEditingHotel(false);
	};

	const tabs = [
		{
			id: "members",
			label: "Members",
			icon: <Users className="w-3 h-3" />,
		},
		{
			id: "flights",
			label: "Flights",
			icon: <Plane className="w-3 h-3" />,
		},
		{ id: "hotel", label: "Hotel", icon: <Hotel className="w-3 h-3" /> },
		{
			id: "transport",
			label: "Transport",
			icon: <Car className="w-3 h-3" />,
		},
		{
			id: "food",
			label: "Food",
			icon: <UtensilsCrossed className="w-3 h-3" />,
		},
		{
			id: "venue",
			label: "Venue",
			icon: <Building2 className="w-3 h-3" />,
		},
		{
			id: "notes",
			label: "Notes",
			icon: <StickyNote className="w-3 h-3" />,
		},
	];

	return (
		<div className="border border-border rounded-xl bg-card  overflow-hidden">
			{/* Collapsed header */}
			<div
				className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
						{artist.stageName.charAt(0)}
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<p className="font-semibold text-foreground text-sm">
								{artist.stageName}
							</p>
							{artist.role !== "solo" && (
								<span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-foreground border border-border">
									<Users className="w-3 h-3 inline mr-0.5" />
									{(artist.groupMembers || []).length} members
								</span>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							{artist.agreement?.arrivalDate || "?"} →{" "}
							{artist.agreement?.departureDate || "?"} ·{" "}
							{artist.country}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<Plane
							className={`w-3.5 h-3.5 ${hasFlights ? "text-green-600" : "text-muted-foreground"}`}
						/>
						<Hotel
							className={`w-3.5 h-3.5 ${hasHotel ? "text-green-600" : "text-muted-foreground"}`}
						/>
						<MapPin
							className={`w-3.5 h-3.5 ${logistics.pickupInfo ? "text-green-600" : "text-muted-foreground"}`}
						/>
						<FileText
							className={`w-3.5 h-3.5 ${passportsComplete ? "text-green-600" : "text-red-600"}`}
						/>
					</div>
					<span
						className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[overallStatus].cls}`}
					>
						{statusConfig[overallStatus].label}
					</span>
					{expanded ? (
						<ChevronUp className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					)}
				</div>
			</div>

			{/* Expanded content with tabs */}
			{expanded && (
				<div className="border-t border-border p-4">
					{/* Tab bar */}
					<div className="flex gap-1 mb-4 overflow-x-auto">
						{tabs.map((t) => (
							<button
								key={t.id}
								onClick={() => setActiveTab(t.id)}
								className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === t.id ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
							>
								{t.icon}
								{t.label}
							</button>
						))}
					</div>

					{/* Members Tab */}
					{activeTab === "members" && (
						<div>
							<div className="flex items-center justify-between mb-2">
								<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
									<Users className="w-4 h-4 text-muted-foreground" />{" "}
									Members & Passports
								</h4>
								<button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
									<Download className="w-3 h-3" /> All
									Passports
								</button>
							</div>
							<div className="space-y-2">
								{(artist.groupMembers || []).map((member) => (
									<div
										key={member.id}
										className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/50"
									>
										<div>
											<p className="text-sm font-medium text-foreground">
												{member.fullName}
											</p>
											<p className="text-xs text-muted-foreground">
												{member.nationality} ·{" "}
												{member.email}
											</p>
										</div>
										{member.passportFile ? (
											<span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded border border-green-500/20">
												<CheckCircle2 className="w-3 h-3 inline mr-0.5" />
												{member.passportFile}
											</span>
										) : (
											<span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 rounded border border-red-500/20">
												<AlertTriangle className="w-3 h-3 inline mr-0.5" />
												Missing
											</span>
										)}
									</div>
								))}
								{(artist.groupMembers || []).length === 0 && (
									<p className="text-xs text-muted-foreground">
										No group members listed
									</p>
								)}
							</div>
						</div>
					)}

					{/* Flights Tab */}
					{activeTab === "flights" && (
						<div>
							<div className="flex items-center justify-between mb-2">
								<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
									<Plane className="w-4 h-4 text-muted-foreground" />{" "}
									Flights ({flights.length})
									{totalFlightCost > 0 && (
										<span className="text-[10px] px-2 py-0.5 bg-primary/20 text-foreground rounded ml-2">
											€{totalFlightCost.toFixed(0)} total
										</span>
									)}
								</h4>
								<button
									onClick={() => setAddingFlight(true)}
									disabled={addingFlight}
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
								>
									<Plus className="w-3 h-3" /> Add Flight
								</button>
							</div>
							{addingFlight && (
								<div className="mb-2">
									<AddFlightForm
										memberNames={memberNames}
										onAdd={saveFlight}
										onCancel={() => setAddingFlight(false)}
									/>
								</div>
							)}
							{flights.length === 0 && !addingFlight && (
								<p className="text-sm text-red-600">
									No flights added
								</p>
							)}
							<div className="space-y-2">
								{flights.map((flight: FlightDetail) =>
									editingFlightId === flight.id ? (
										<div key={flight.id} className="mb-2">
											<AddFlightForm
												memberNames={memberNames}
												initial={flight}
												onAdd={saveFlight}
												onCancel={() =>
													setEditingFlightId(null)
												}
											/>
										</div>
									) : (
										<div
											key={flight.id}
											className="p-2.5 rounded-lg border border-border bg-secondary/50"
										>
											<div className="flex items-center justify-between">
												<div>
													<div className="flex items-center gap-2">
														<span
															className={`text-[10px] px-1.5 py-0.5 rounded ${flight.type === "arrival" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}
														>
															{flight.type ===
															"arrival"
																? "Arrival"
																: "Departure"}
														</span>
														<p className="text-sm font-medium text-foreground">
															{flight.flightNumber ||
																"No #"}{" "}
															→{" "}
															{flight.airport ||
																"?"}
														</p>
														{flight.cost && (
															<span className="text-xs text-foreground font-medium">
																{flight.cost}
															</span>
														)}
													</div>
													{flight.passengerName && (
														<p className="text-xs text-muted-foreground">
															{
																flight.passengerName
															}
														</p>
													)}
													<p className="text-xs text-muted-foreground">
														{flight.date}{" "}
														{flight.time
															? `at ${flight.time}`
															: ""}
													</p>
													{flight.notes && (
														<p className="text-xs text-muted-foreground italic">
															{flight.notes}
														</p>
													)}
												</div>
												<div className="flex items-center gap-1.5">
													<PaymentStatusBadge
														paid={
															!!flightsPaid[
																flight.id
															]
														}
														onToggle={() =>
															setFlightsPaid(
																(p) => ({
																	...p,
																	[flight.id]:
																		!p[
																			flight
																				.id
																		],
																}),
															)
														}
													/>
													{flight.ticketFile ? (
														<span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">
															<CheckCircle2 className="w-3 h-3 inline mr-0.5" />
															Ticket
														</span>
													) : (
														<span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-600 rounded">
															No ticket
														</span>
													)}
													<button
														onClick={() =>
															setEditingFlightId(
																flight.id,
															)
														}
														className="p-1 text-muted-foreground hover:text-foreground"
													>
														<Edit className="w-3 h-3" />
													</button>
													<button
														onClick={() =>
															deleteFlight(
																flight.id,
															)
														}
														className="p-1 text-red-600 hover:text-red-600"
													>
														<Trash2 className="w-3 h-3" />
													</button>
												</div>
											</div>
										</div>
									),
								)}
							</div>
						</div>
					)}

					{/* Hotel Tab */}
					{activeTab === "hotel" && (
						<div>
							<div className="flex items-center justify-between mb-2">
								<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
									<Hotel className="w-4 h-4 text-muted-foreground" />{" "}
									Hotel & Rooms
									{totalRoomCost > 0 && (
										<span className="text-[10px] px-2 py-0.5 bg-primary/20 text-foreground rounded ml-2">
											€{totalRoomCost.toFixed(0)} total
										</span>
									)}
								</h4>
								<button
									onClick={() => setAddingRoom(true)}
									disabled={addingRoom}
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
								>
									<Plus className="w-3 h-3" /> Add Room
								</button>
							</div>
							<div className="p-2.5 rounded-lg border border-border bg-secondary/50 mb-2">
								<div className="flex items-center justify-between mb-2">
									<h5 className="text-xs font-semibold text-foreground">Hotel Details</h5>
									<button
										onClick={() => {
											if (editingHotel) {
												saveHotelInfo();
											} else {
												setHotelForm({
													hotelId: logistics.hotelId || "",
													hotelName: logistics.hotelName || "",
													hotelAddress: logistics.hotelAddress || "",
													hotelCheckIn: logistics.hotelCheckIn || "",
													hotelCheckOut: logistics.hotelCheckOut || "",
													hotelNotes: logistics.hotelNotes || "",
													hotelMapLink: logistics.hotelMapLink || "",
												});
												setEditingHotel(true);
											}
										}}
										className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
									>
										<Edit className="w-3 h-3" />
										{editingHotel ? "Save" : "Edit"}
									</button>
								</div>
								{editingHotel ? (
									<div className="space-y-2">
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Hotel Name</label>
											<input type="text" value={hotelForm.hotelName} onChange={(e) => setHotelForm(f => ({...f, hotelName: e.target.value}))} placeholder="e.g. NH Amsterdam Centre" className="w-full h-8 px-2 bg-card border border-border rounded text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Address</label>
											<input type="text" value={hotelForm.hotelAddress} onChange={(e) => setHotelForm(f => ({...f, hotelAddress: e.target.value}))} placeholder="Address" className="w-full h-8 px-2 bg-card border border-border rounded text-xs text-foreground" />
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Check-In</label>
												<input type="date" value={hotelForm.hotelCheckIn} onChange={(e) => setHotelForm(f => ({...f, hotelCheckIn: e.target.value}))} className="w-full h-8 px-2 bg-card border border-border rounded text-xs text-foreground" />
											</div>
											<div>
												<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Check-Out</label>
												<input type="date" value={hotelForm.hotelCheckOut} onChange={(e) => setHotelForm(f => ({...f, hotelCheckOut: e.target.value}))} className="w-full h-8 px-2 bg-card border border-border rounded text-xs text-foreground" />
											</div>
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
											<input type="text" value={hotelForm.hotelNotes} onChange={(e) => setHotelForm(f => ({...f, hotelNotes: e.target.value}))} placeholder="Special requests..." className="w-full h-8 px-2 bg-card border border-border rounded text-xs text-foreground" />
										</div>
									</div>
								) : (
									<div className="flex items-center justify-between">
										<div>
											<p
												className={`text-sm ${logistics.hotelName ? "text-foreground font-medium" : "text-red-600"}`}
											>
												{logistics.hotelName || "Not set"}
											</p>
											{logistics.hotelAddress && (
												<p className="text-[11px] text-muted-foreground">
													{logistics.hotelAddress}
												</p>
											)}
											{(logistics.hotelCheckIn ||
												logistics.hotelCheckOut) && (
												<p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
													<Calendar className="w-3 h-3" />
													{logistics.hotelCheckIn ||
														"?"}{" "}
													→{" "}
													{logistics.hotelCheckOut || "?"}
												</p>
											)}
											{logistics.hotelNotes && (
												<p className="text-[11px] text-muted-foreground italic mt-0.5">
													{logistics.hotelNotes}
												</p>
											)}
										</div>
										{logistics.hotelMapLink && (
											<button
												onClick={() =>
													window.open(
														logistics.hotelMapLink,
														"_blank",
													)
												}
												className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
											>
												<ExternalLink className="w-3 h-3" />{" "}
												Map
											</button>
										)}
									</div>
								)}
							</div>
							{addingRoom && (
								<div className="mb-2">
									<AddRoomForm
										memberNames={memberNames}
										onAdd={saveRoom}
										onCancel={() => setAddingRoom(false)}
									/>
								</div>
							)}
							{hotelRooms.length > 0 && (
								<div className="space-y-1.5">
									{hotelRooms.map((room: HotelRoomBooking) =>
										editingRoomId === room.id ? (
											<div key={room.id}>
												<AddRoomForm
													memberNames={memberNames}
													initial={room}
													onAdd={saveRoom}
													onCancel={() =>
														setEditingRoomId(null)
													}
												/>
											</div>
										) : (
											<div
												key={room.id}
												className="flex items-center justify-between p-2 rounded border border-border bg-secondary/30"
											>
												<div className="flex items-center gap-2">
													<span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-foreground border border-border">
														{roomTypeLabels[
															room.roomType
														] || room.roomType}
													</span>
													<span className="text-xs text-foreground">
														{room.guestNames}
													</span>
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													{room.costPerNight && (
														<span>
															{room.costPerNight}
															/night
														</span>
													)}
													{room.totalCost && (
														<span className="font-semibold text-foreground">
															{room.totalCost}
														</span>
													)}
													<PaymentStatusBadge
														paid={
															!!roomsPaid[room.id]
														}
														onToggle={() =>
															setRoomsPaid(
																(p) => ({
																	...p,
																	[room.id]:
																		!p[
																			room
																				.id
																		],
																}),
															)
														}
													/>
													<button
														onClick={() =>
															setEditingRoomId(
																room.id,
															)
														}
														className="p-0.5 text-muted-foreground hover:text-foreground"
													>
														<Edit className="w-3 h-3" />
													</button>
													<button
														onClick={() =>
															deleteRoom(room.id)
														}
														className="p-0.5 text-red-600 hover:text-red-600"
													>
														<Trash2 className="w-3 h-3" />
													</button>
												</div>
											</div>
										),
									)}
								</div>
							)}
						</div>
					)}

					{/* Transport Tab */}
					{activeTab === "transport" && (
						<div>
							<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
								<Car className="w-4 h-4 text-muted-foreground" />{" "}
								Driver / Transfer
								{selectedDriverId && (
									<PaymentStatusBadge
										paid={transportPaid}
										onToggle={() =>
											setTransportPaid(!transportPaid)
										}
									/>
								)}
							</h4>

							{/* Toggle: Select existing or Add new */}
							<div className="flex gap-2 mb-3">
								<button
									onClick={() => setAddingNewDriver(false)}
									className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${!addingNewDriver ? "bg-primary/15 text-foreground border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary"}`}
								>
									<Car className="w-3.5 h-3.5 inline mr-1.5" />
									Select Registered
								</button>
								<button
									onClick={() => setAddingNewDriver(true)}
									className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${addingNewDriver ? "bg-primary/15 text-foreground border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-border hover:bg-secondary"}`}
								>
									<Plus className="w-3.5 h-3.5 inline mr-1.5" />
									Add New Driver
								</button>
							</div>

							{addingNewDriver ? (
								<div className="border border-border rounded-xl bg-secondary/30 p-4 space-y-3">
									<p className="text-xs font-semibold text-foreground">Add New Driver Details</p>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Driver Name *</label>
											<input type="text" value={newDriverForm.name} onChange={(e) => setNewDriverForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ahmed B." className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Phone Number *</label>
											<input type="tel" value={newDriverForm.phone} onChange={(e) => setNewDriverForm(f => ({ ...f, phone: e.target.value }))} placeholder="+31 6 1234 5678" className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Vehicle</label>
											<input type="text" value={newDriverForm.vehicle} onChange={(e) => setNewDriverForm(f => ({ ...f, vehicle: e.target.value }))} placeholder="Silver Mercedes Vito" className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Capacity</label>
											<input type="number" value={newDriverForm.capacity} onChange={(e) => setNewDriverForm(f => ({ ...f, capacity: e.target.value }))} placeholder="8" className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Cost/Trip (€)</label>
											<input type="number" value={newDriverForm.costPerTrip} onChange={(e) => setNewDriverForm(f => ({ ...f, costPerTrip: e.target.value }))} placeholder="120" className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
										<div>
											<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Cost/Person (€)</label>
											<input type="number" value={newDriverForm.costPerPerson} onChange={(e) => setNewDriverForm(f => ({ ...f, costPerPerson: e.target.value }))} placeholder="15" className="w-full h-8 px-3 bg-card border border-border rounded-lg text-xs text-foreground" />
										</div>
									</div>
									<div>
										<label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
										<textarea value={newDriverForm.notes} onChange={(e) => setNewDriverForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional info..." rows={2} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground resize-none" />
									</div>
									<div className="flex justify-end gap-2 pt-1">
										<button onClick={() => { setAddingNewDriver(false); setNewDriverForm({ name: "", phone: "", vehicle: "", capacity: "", costPerTrip: "", costPerPerson: "", notes: "" }); }} className="px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground">Cancel</button>
										<button onClick={() => { if (!newDriverForm.name || !newDriverForm.phone) return; onUpdateArtist(artist.id, { travelLogistics: { ...logistics, driverName: newDriverForm.name, driverPhone: newDriverForm.phone, driverNotes: `${newDriverForm.vehicle}${newDriverForm.capacity ? ` (${newDriverForm.capacity} seats)` : ""}${newDriverForm.notes ? ` — ${newDriverForm.notes}` : ""}` } }); setAddingNewDriver(false); setNewDriverForm({ name: "", phone: "", vehicle: "", capacity: "", costPerTrip: "", costPerPerson: "", notes: "" }); }} className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:from-purple-400 hover:to-pink-400 transition-all shadow-sm">
											<Check className="w-3 h-3 inline mr-1" />Save Driver
										</button>
									</div>
								</div>
							) : (
							<>
							<select
								value={selectedDriverId}
								onChange={(e) =>
									setSelectedDriverId(e.target.value)
								}
								className="w-full h-9 px-3 bg-card border border-border rounded-lg text-sm text-foreground"
							>
								<option value="">Select a driver...</option>
								{registries.drivers.map((d) => (
									<option key={d.id} value={d.id}>
										{d.name} — {d.vehicle} ({d.capacity}{" "}
										seats)
									</option>
								))}
							</select>
							{selectedDriverId &&
								(() => {
									const driver = registries.drivers.find(
										(d) => d.id === selectedDriverId,
									);
									if (!driver) return null;
									const memberCount = Math.max(
										(artist.groupMembers || []).length,
										1,
									);
									const perPersonTotal =
										(driver.costPerPerson || 0) *
										memberCount;
									const computedCost =
										costType === "per_trip"
											? `€${driver.costPerTrip}`
											: `€${driver.costPerPerson} × ${memberCount} = €${perPersonTotal}`;
									return (
										<div className="mt-2 space-y-2">
											<div className="flex gap-2">
												{(
													[
														"per_trip",
														"per_person",
													] as const
												).map((ct) => (
													<button
														key={ct}
														onClick={() =>
															setCostType(ct)
														}
														className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${costType === ct ? "border-primary bg-primary/20" : "border-border bg-background hover:bg-secondary"}`}
													>
														<p
															className={`text-[10px] font-semibold uppercase tracking-wider ${costType === ct ? "text-foreground" : "text-muted-foreground"}`}
														>
															{ct === "per_trip"
																? "Per Trip"
																: "Per Person"}
														</p>
														<p
															className={`text-sm font-bold mt-0.5 ${costType === ct ? "text-foreground" : "text-muted-foreground"}`}
														>
															{ct === "per_trip"
																? `€${driver.costPerTrip}`
																: `€${driver.costPerPerson}`}
														</p>
													</button>
												))}
											</div>
											<div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-secondary/50">
												<span className="text-xs text-muted-foreground">
													Estimated Cost
												</span>
												<span className="text-xs font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded">
													{computedCost}
												</span>
											</div>
											<div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/50">
												<div>
													<p className="text-sm font-medium text-foreground">
														{driver.name}
													</p>
													<p className="text-xs text-muted-foreground flex items-center gap-1">
														<Phone className="w-3 h-3" />{" "}
														{driver.phone ||
															"No phone"}
													</p>
													<p className="text-xs text-muted-foreground flex items-center gap-1">
														<Car className="w-3 h-3" />{" "}
														{driver.vehicle}
													</p>
												</div>
												<div className="flex items-center gap-1.5">
													{driver.phone && (
														<button
															onClick={() =>
																window.open(
																	`tel:${driver.phone}`,
																)
															}
															className="text-xs px-2 py-1 bg-secondary text-foreground rounded hover:bg-muted"
														>
															<Phone className="w-3 h-3 inline mr-1" />
															Call
														</button>
													)}
													<button
														onClick={() =>
															setSelectedDriverId(
																"",
															)
														}
														className="p-1 text-red-600 hover:text-red-600"
													>
														<Trash2 className="w-3 h-3" />
													</button>
												</div>
											</div>
										</div>
									);
								})()}
							</>
							)}

							{/* Show saved driver info from logistics */}
							{logistics.driverName && !selectedDriverId && !addingNewDriver && (
								<div className="mt-3 p-3 rounded-lg border border-border bg-secondary/30">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium text-foreground">{logistics.driverName}</p>
											{logistics.driverPhone && (
												<p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
													<Phone className="w-3 h-3" /> {logistics.driverPhone}
												</p>
											)}
											{logistics.driverNotes && (
												<p className="text-xs text-muted-foreground mt-0.5">{logistics.driverNotes}</p>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Food Tab */}
					{activeTab === "food" && (
						<div>
							<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
								<UtensilsCrossed className="w-4 h-4 text-muted-foreground" />{" "}
								Food & Catering
								{foodCost > 0 && (
									<span className="text-[10px] px-2 py-0.5 bg-primary/20 text-foreground rounded ml-2">
										€{foodCost.toFixed(0)} total
									</span>
								)}
							</h4>
							<div className="space-y-3">
								{((artist.groupMembers || []).length > 0
									? artist.groupMembers
									: [
											{
												id: "solo",
												fullName: artist.stageName,
												nationality: "",
												passportFile: "",
												email: "",
												phone: "",
												dietaryPreferences:
													artist.dietaryPreferences ||
													"",
											},
										]
								).map((member) => (
									<div
										key={member.id}
										className="p-3 rounded-lg border border-border bg-secondary/50"
									>
										<div className="flex items-center gap-2 mb-2">
											<div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-foreground text-[10px] font-bold">
												{member.fullName.charAt(0)}
											</div>
											<p className="text-sm font-medium text-foreground">
												{member.fullName}
											</p>
											{member.dietaryPreferences && (
												<span className="text-[9px] px-1.5 py-0.5 bg-muted rounded text-foreground border border-border">
													{member.dietaryPreferences}
												</span>
											)}
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
											{(
												[
													"breakfast",
													"lunch",
													"dinner",
												] as const
											).map((meal) => {
												const key = `${member.id}-${meal}`;
												const options =
													registries.catering.filter(
														(c) =>
															c.mealType === meal,
													);
												return (
													<div key={meal}>
														<p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
															{
																mealTypeLabels[
																	meal
																]
															}
														</p>
														<select
															value={
																selectedMeals[
																	key
																] || ""
															}
															onChange={(e) =>
																setSelectedMeals(
																	(p) => ({
																		...p,
																		[key]: e
																			.target
																			.value,
																	}),
																)
															}
															className="w-full h-7 px-2 bg-card border border-border rounded text-xs text-foreground"
														>
															<option value="">
																Select {meal}...
															</option>
															{options.map(
																(opt) => (
																	<option
																		key={
																			opt.id
																		}
																		value={
																			opt.id
																		}
																	>
																		{
																			opt.name
																		}{" "}
																		— €
																		{
																			opt.costPerPerson
																		}
																		/pp
																	</option>
																),
															)}
														</select>
														{selectedMeals[key] &&
															(() => {
																const opt =
																	registries.catering.find(
																		(c) =>
																			c.id ===
																			selectedMeals[
																				key
																			],
																	);
																if (!opt)
																	return null;
																return (
																	<div className="mt-1 flex items-center justify-between">
																		<p className="text-[10px] text-muted-foreground">
																			{
																				opt.description
																			}
																		</p>
																		<span className="text-[9px] px-1 py-0.5 bg-muted rounded text-foreground">
																			€
																			{
																				opt.costPerPerson
																			}
																		</span>
																	</div>
																);
															})()}
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Venue Tab */}
					{activeTab === "venue" && (
						<div>
							<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
								<Building2 className="w-4 h-4 text-muted-foreground" />{" "}
								Event Venue
							</h4>
							<select
								value={selectedVenueId}
								onChange={(e) =>
									setSelectedVenueId(e.target.value)
								}
								className="w-full h-9 px-3 bg-card border border-border rounded-lg text-sm text-foreground"
							>
								<option value="">Select a venue...</option>
								{registries.venues.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name}{" "}
										{v.capacity
											? `(${v.capacity} cap)`
											: ""}
									</option>
								))}
							</select>
							{selectedVenueId &&
								(() => {
									const venue = registries.venues.find(
										(v) => v.id === selectedVenueId,
									);
									if (!venue) return null;
									return (
										<div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/50 mt-2">
											<div>
												<p className="text-sm font-medium text-foreground">
													{venue.name}
												</p>
												{venue.address && (
													<p className="text-[11px] text-muted-foreground flex items-center gap-1">
														<MapPin className="w-3 h-3" />{" "}
														{venue.address}
													</p>
												)}
												{venue.notes && (
													<p className="text-[11px] text-muted-foreground italic mt-0.5">
														{venue.notes}
													</p>
												)}
											</div>
											<div className="flex items-center gap-1.5">
												{venue.mapLink && (
													<button
														onClick={() =>
															window.open(
																venue.mapLink,
																"_blank",
															)
														}
														className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
													>
														<ExternalLink className="w-3 h-3" />{" "}
														Map
													</button>
												)}
												<button
													onClick={() =>
														setSelectedVenueId("")
													}
													className="p-1 text-red-600 hover:text-red-600"
												>
													<Trash2 className="w-3 h-3" />
												</button>
											</div>
										</div>
									);
								})()}
						</div>
					)}

					{/* Notes Tab */}
					{activeTab === "notes" && (
						<div>
							<div className="flex items-center justify-between mb-2">
								<h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
									<StickyNote className="w-4 h-4 text-muted-foreground" />{" "}
									Schedule & Notes
								</h4>
								<button
									onClick={() =>
										editing ? saveNotes() : setEditing(true)
									}
									className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
								>
									<Edit className="w-3 h-3" />{" "}
									{editing ? "Save" : "Edit"}
								</button>
							</div>
							<div className="grid grid-cols-2 gap-3">
								{[
									{
										label: "Workshop Schedule",
										field: "workshopSchedule" as const,
										multiline: true,
									},
									{
										label: "Pickup Info",
										field: "pickupInfo" as const,
										multiline: false,
									},
									{
										label: "Dropoff Info",
										field: "dropoffInfo" as const,
										multiline: false,
									},
									{
										label: "Notes",
										field: "additionalNotes" as const,
										multiline: true,
									},
								].map((f) => (
									<div
										key={f.label}
										className={
											f.multiline ? "col-span-2" : ""
										}
									>
										<p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
											{f.label}
										</p>
										{editing ? (
											f.multiline ? (
												<textarea
													value={notesForm[f.field]}
													onChange={(e) =>
														setNotesForm((p) => ({
															...p,
															[f.field]:
																e.target.value,
														}))
													}
													className="w-full min-h-[50px] px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
												/>
											) : (
												<input
													value={notesForm[f.field]}
													onChange={(e) =>
														setNotesForm((p) => ({
															...p,
															[f.field]:
																e.target.value,
														}))
													}
													className="w-full h-8 px-3 bg-card border border-border rounded-lg text-sm text-foreground"
												/>
											)
										) : (
											<p
												className={`text-sm ${notesForm[f.field] ? "text-foreground" : "text-red-600"}`}
											>
												{notesForm[f.field] ||
													"Not set"}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ===== Main Logistics Page =====
export default function LogisticsPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;
	const { artists, isLoading, refetch, updateArtist } = useContractData({
		eventId,
	});
	const { emit } = useContractWebSocket({ eventId });
	useContractSocket({ eventId, role: "organiser" });

	const [registries, setRegistries] = useState<{
		hotels: RegisteredHotel[];
		drivers: RegisteredDriver[];
		venues: RegisteredVenue[];
		catering: CateringOption[];
	}>({ hotels: [], drivers: [], venues: [], catering: [] });
	const [registriesLoading, setRegistriesLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<
		"all" | "complete" | "partial" | "pending"
	>("all");

	// Load registries from GCS
	useEffect(() => {
		async function loadRegistries() {
			try {
				const res = await fetch(
					`/api/contracts/${eventId}/logistics-registries`,
				);
				const data = await res.json();
				if (data.success && data.registries) {
					setRegistries({
						hotels: data.registries.hotels || [],
						drivers: data.registries.drivers || [],
						venues: data.registries.venues || [],
						catering: data.registries.catering || [],
					});
				}
			} catch (err) {
				console.error("Error loading registries:", err);
			} finally {
				setRegistriesLoading(false);
			}
		}
		loadRegistries();
	}, [eventId]);

	const eligibleArtists = artists.filter(
		(a) => a.status !== "cancelled" && a.status !== "invited",
	);

	const getArtistStatus = (a: ContractArtist) => {
		const l = a.travelLogistics || ({} as any);
		const hasFlights = (l.flights || []).length > 0;
		const hasHotel = !!l.hotelName;
		const logisticsComplete =
			l.pickupInfo && l.dropoffInfo && l.workshopSchedule;
		const passportsComplete = (a.groupMembers || []).every(
			(m) => m.passportFile,
		);
		if (hasFlights && hasHotel && logisticsComplete && passportsComplete)
			return "complete";
		if (hasFlights || hasHotel || l.pickupInfo) return "partial";
		return "pending";
	};

	const filteredArtists = eligibleArtists.filter((a) => {
		const matchesSearch =
			a.stageName.toLowerCase().includes(search.toLowerCase()) ||
			(a.legalName || "").toLowerCase().includes(search.toLowerCase());
		if (!matchesSearch) return false;
		if (filter === "all") return true;
		return getArtistStatus(a) === filter;
	});

	const stats = useMemo(
		() => ({
			total: eligibleArtists.length,
			complete: eligibleArtists.filter(
				(a) => getArtistStatus(a) === "complete",
			).length,
			totalMembers: eligibleArtists.reduce(
				(sum, a) => sum + (a.groupMembers || []).length,
				0,
			),
			missingPassports: eligibleArtists.reduce(
				(sum, a) =>
					sum +
					(a.groupMembers || []).filter((m) => !m.passportFile)
						.length,
				0,
			),
		}),
		[eligibleArtists],
	);

	const handleExport = () => {
		const header = "Artist,Status,Flights,Hotel,Pickup,Dropoff,Passports\n";
		const rows = eligibleArtists
			.map((a) => {
				const l = a.travelLogistics || ({} as any);
				return `"${a.stageName}","${getArtistStatus(a)}","${(l.flights || []).length}","${l.hotelName || ""}","${l.pickupInfo || ""}","${l.dropoffInfo || ""}","${(a.groupMembers || []).filter((m) => m.passportFile).length}/${(a.groupMembers || []).length}"`;
			})
			.join("\n");
		const blob = new Blob([header + rows], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "logistics-export.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	if (isLoading || registriesLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button
						onClick={() => router.back()}
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
							Logistics Manager
						</h1>
						<p className="text-xs text-muted-foreground">
							Travel, Accommodation & Schedules
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
						<Users className="w-3.5 h-3.5" />
						<span>
							{stats.total} artists · {stats.totalMembers} members
						</span>
					</div>
					{stats.missingPassports > 0 && (
						<span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full border border-red-500/20">
							{stats.missingPassports} missing passports
						</span>
					)}
					<button
						onClick={() =>
							router.push(`/event/${eventId}/workshop-schedule`)
						}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg transition-colors text-xs"
					>
						<Calendar className="w-3.5 h-3.5" /> Workshops
					</button>
					<button
						onClick={() =>
							router.push(`/event/${eventId}/logistics/settings`)
						}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg transition-colors text-xs"
					>
						<Settings className="w-3.5 h-3.5" /> Settings
					</button>
					<button
						onClick={handleExport}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg transition-colors text-xs"
					>
						<Download className="w-3.5 h-3.5" /> Export
					</button>
				</div>
			</header>

			{/* Filters */}
			<div className="flex-1 overflow-auto p-5">
				<div className="max-w-4xl mx-auto space-y-4">
					<div className="flex items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<input
								placeholder="Search artists..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>
						<div className="flex bg-card border border-border rounded-lg overflow-hidden">
							{(
								[
									"all",
									"complete",
									"partial",
									"pending",
								] as const
							).map((f) => (
								<button
									key={f}
									onClick={() => setFilter(f)}
									className={`px-3 py-1.5 text-xs font-medium transition-all ${filter === f ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
								>
									{f === "all"
										? `All (${stats.total})`
										: f === "complete"
											? `Complete (${stats.complete})`
											: f === "partial"
												? "In Progress"
												: "Pending"}
								</button>
							))}
						</div>
					</div>

					{/* Artist cards */}
					<div className="space-y-3">
						{filteredArtists.length === 0 ? (
							<div className="text-center py-12 text-muted-foreground">
								<Plane className="w-8 h-8 mx-auto mb-3 opacity-40" />
								<p className="text-sm">
									No artists match your filters
								</p>
							</div>
						) : (
							filteredArtists.map((artist) => (
								<LogisticsCard
									key={artist.id}
									artist={artist}
									registries={registries}
									onUpdateArtist={updateArtist}
								/>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
