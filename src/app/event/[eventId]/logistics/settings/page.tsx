"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	Hotel,
	Car,
	Building2,
	UtensilsCrossed,
	Plus,
	Trash2,
	Save,
	Loader2,
	MapPin,
	Phone,
	Mail,
	Edit,
	X,
} from "lucide-react";
import type {
	RegisteredHotel,
	RegisteredDriver,
	RegisteredVenue,
	CateringOption,
} from "@/types/contracts";

export default function LogisticsSettingsPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	const [registries, setRegistries] = useState<{
		hotels: RegisteredHotel[];
		drivers: RegisteredDriver[];
		venues: RegisteredVenue[];
		catering: CateringOption[];
	}>({ hotels: [], drivers: [], venues: [], catering: [] });
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"hotels" | "drivers" | "venues" | "catering"
	>("hotels");
	const [showForm, setShowForm] = useState(false);

	useEffect(() => {
		async function load() {
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
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		}
		load();
	}, [eventId]);

	const saveRegistries = async (updated: typeof registries) => {
		setRegistries(updated);
		await fetch(`/api/contracts/${eventId}/logistics-registries`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updated),
		});
	};

	// Hotel CRUD
	const [hotelForm, setHotelForm] = useState<Partial<RegisteredHotel>>({
		name: "",
		address: "",
		mapLink: "",
		contactPhone: "",
		contactEmail: "",
		notes: "",
	});
	const addHotel = () => {
		const h: RegisteredHotel = {
			id: `hotel-${Date.now()}`,
			name: hotelForm.name || "",
			address: hotelForm.address || "",
			mapLink: hotelForm.mapLink || "",
			contactPhone: hotelForm.contactPhone || "",
			contactEmail: hotelForm.contactEmail || "",
			notes: hotelForm.notes || "",
		};
		saveRegistries({ ...registries, hotels: [...registries.hotels, h] });
		setHotelForm({
			name: "",
			address: "",
			mapLink: "",
			contactPhone: "",
			contactEmail: "",
			notes: "",
		});
		setShowForm(false);
	};
	const deleteHotel = (id: string) =>
		saveRegistries({
			...registries,
			hotels: registries.hotels.filter((h) => h.id !== id),
		});

	// Driver CRUD
	const [driverForm, setDriverForm] = useState<Partial<RegisteredDriver>>({
		name: "",
		phone: "",
		vehicle: "",
		capacity: 4,
		costPerTrip: 0,
		costPerPerson: 0,
	});
	const addDriver = () => {
		const d: RegisteredDriver = {
			id: `driver-${Date.now()}`,
			name: driverForm.name || "",
			phone: driverForm.phone || "",
			vehicle: driverForm.vehicle || "",
			capacity: driverForm.capacity || 4,
			costPerTrip: driverForm.costPerTrip || 0,
			costPerPerson: driverForm.costPerPerson || 0,
		};
		saveRegistries({ ...registries, drivers: [...registries.drivers, d] });
		setDriverForm({
			name: "",
			phone: "",
			vehicle: "",
			capacity: 4,
			costPerTrip: 0,
			costPerPerson: 0,
		});
		setShowForm(false);
	};
	const deleteDriver = (id: string) =>
		saveRegistries({
			...registries,
			drivers: registries.drivers.filter((d) => d.id !== id),
		});

	// Venue CRUD
	const [venueForm, setVenueForm] = useState<Partial<RegisteredVenue>>({
		name: "",
		address: "",
		mapLink: "",
		contactPhone: "",
		capacity: 0,
		notes: "",
	});
	const addVenue = () => {
		const v: RegisteredVenue = {
			id: `venue-${Date.now()}`,
			name: venueForm.name || "",
			address: venueForm.address || "",
			mapLink: venueForm.mapLink || "",
			contactPhone: venueForm.contactPhone || "",
			capacity: venueForm.capacity || 0,
			notes: venueForm.notes || "",
		};
		saveRegistries({ ...registries, venues: [...registries.venues, v] });
		setVenueForm({
			name: "",
			address: "",
			mapLink: "",
			contactPhone: "",
			capacity: 0,
			notes: "",
		});
		setShowForm(false);
	};
	const deleteVenue = (id: string) =>
		saveRegistries({
			...registries,
			venues: registries.venues.filter((v) => v.id !== id),
		});

	// Catering CRUD
	const [cateringForm, setCateringForm] = useState<Partial<CateringOption>>({
		mealType: "breakfast",
		name: "",
		costPerPerson: 0,
		description: "",
	});
	const addCatering = () => {
		const c: CateringOption = {
			id: `cat-${Date.now()}`,
			mealType: (cateringForm.mealType as any) || "breakfast",
			name: cateringForm.name || "",
			costPerPerson: cateringForm.costPerPerson || 0,
			description: cateringForm.description || "",
		};
		saveRegistries({
			...registries,
			catering: [...registries.catering, c],
		});
		setCateringForm({
			mealType: "breakfast",
			name: "",
			costPerPerson: 0,
			description: "",
		});
		setShowForm(false);
	};
	const deleteCatering = (id: string) =>
		saveRegistries({
			...registries,
			catering: registries.catering.filter((c) => c.id !== id),
		});

	if (isLoading)
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
			</div>
		);

	const tabs = [
		{
			id: "hotels" as const,
			label: "Hotels",
			icon: <Hotel className="w-3.5 h-3.5" />,
			count: registries.hotels.length,
		},
		{
			id: "drivers" as const,
			label: "Drivers",
			icon: <Car className="w-3.5 h-3.5" />,
			count: registries.drivers.length,
		},
		{
			id: "venues" as const,
			label: "Venues",
			icon: <Building2 className="w-3.5 h-3.5" />,
			count: registries.venues.length,
		},
		{
			id: "catering" as const,
			label: "Catering",
			icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
			count: registries.catering.length,
		},
	];

	const inputCls =
		"w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

	return (
		<div className="min-h-screen bg-background">
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button
						onClick={() =>
							router.push(`/event/${eventId}/logistics`)
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
							Logistics Settings
						</h1>
						<p className="text-xs text-muted-foreground">
							Manage registries for hotels, drivers, venues &
							catering
						</p>
					</div>
				</div>
			</header>

			<div className="p-6 max-w-4xl mx-auto">
				{/* Tabs */}
				<div className="flex gap-1 mb-6">
					{tabs.map((t) => (
						<button
							key={t.id}
							onClick={() => {
								setActiveTab(t.id);
								setShowForm(false);
							}}
							className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
						>
							{t.icon} {t.label} ({t.count})
						</button>
					))}
				</div>

				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold text-foreground capitalize">
						{activeTab} Registry
					</h3>
					<button
						onClick={() => setShowForm(!showForm)}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:from-purple-400 hover:to-pink-400 transition-all"
					>
						<Plus className="w-3.5 h-3.5" /> Add{" "}
						{activeTab.slice(0, -1)}
					</button>
				</div>

				{/* Add Forms */}
				{showForm && activeTab === "hotels" && (
					<div className="p-5 bg-card border border-border rounded-xl mb-4">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							New Hotel
						</h4>
						<div className="grid grid-cols-2 gap-3">
							{[
								{ l: "Name", f: "name", p: "Hotel Europa" },
								{
									l: "Address",
									f: "address",
									p: "123 Main St",
								},
								{
									l: "Map Link",
									f: "mapLink",
									p: "https://maps...",
								},
								{
									l: "Phone",
									f: "contactPhone",
									p: "+1 234 567",
								},
								{
									l: "Email",
									f: "contactEmail",
									p: "hotel@email.com",
								},
								{ l: "Notes", f: "notes", p: "Info..." },
							].map(({ l, f, p }) => (
								<div key={f}>
									<label className="text-xs text-muted-foreground mb-1 block">
										{l}
									</label>
									<input
										value={(hotelForm as any)[f] || ""}
										onChange={(e) =>
											setHotelForm({
												...hotelForm,
												[f]: e.target.value,
											})
										}
										placeholder={p}
										className={inputCls}
									/>
								</div>
							))}
						</div>
						<div className="flex justify-end gap-2 mt-3">
							<button
								onClick={() => setShowForm(false)}
								className="px-3 py-1.5 text-muted-foreground text-xs"
							>
								Cancel
							</button>
							<button
								onClick={addHotel}
								className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary"
							>
								<Save className="w-3 h-3 inline mr-1" />
								Save
							</button>
						</div>
					</div>
				)}
				{showForm && activeTab === "drivers" && (
					<div className="p-5 bg-card border border-border rounded-xl mb-4">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							New Driver
						</h4>
						<div className="grid grid-cols-2 gap-3">
							{[
								{
									l: "Name",
									f: "name",
									p: "John Smith",
									t: "text",
								},
								{
									l: "Phone",
									f: "phone",
									p: "+1 234 567",
									t: "tel",
								},
								{
									l: "Vehicle",
									f: "vehicle",
									p: "Mercedes Sprinter",
									t: "text",
								},
								{
									l: "Capacity",
									f: "capacity",
									p: "8",
									t: "number",
								},
								{
									l: "Cost/Trip (€)",
									f: "costPerTrip",
									p: "50",
									t: "number",
								},
								{
									l: "Cost/Person (€)",
									f: "costPerPerson",
									p: "15",
									t: "number",
								},
							].map(({ l, f, p, t }) => (
								<div key={f}>
									<label className="text-xs text-muted-foreground mb-1 block">
										{l}
									</label>
									<input
										type={t}
										value={(driverForm as any)[f] || ""}
										onChange={(e) =>
											setDriverForm({
												...driverForm,
												[f]:
													t === "number"
														? parseFloat(
																e.target.value,
															) || 0
														: e.target.value,
											})
										}
										placeholder={p}
										className={inputCls}
									/>
								</div>
							))}
						</div>
						<div className="flex justify-end gap-2 mt-3">
							<button
								onClick={() => setShowForm(false)}
								className="px-3 py-1.5 text-muted-foreground text-xs"
							>
								Cancel
							</button>
							<button
								onClick={addDriver}
								className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary"
							>
								<Save className="w-3 h-3 inline mr-1" />
								Save
							</button>
						</div>
					</div>
				)}
				{showForm && activeTab === "venues" && (
					<div className="p-5 bg-card border border-border rounded-xl mb-4">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							New Venue
						</h4>
						<div className="grid grid-cols-2 gap-3">
							{[
								{
									l: "Name",
									f: "name",
									p: "Main Hall",
									t: "text",
								},
								{
									l: "Address",
									f: "address",
									p: "456 Event St",
									t: "text",
								},
								{
									l: "Map Link",
									f: "mapLink",
									p: "https://maps...",
									t: "url",
								},
								{
									l: "Phone",
									f: "contactPhone",
									p: "+1 234 567",
									t: "tel",
								},
								{
									l: "Capacity",
									f: "capacity",
									p: "500",
									t: "number",
								},
								{
									l: "Notes",
									f: "notes",
									p: "Info...",
									t: "text",
								},
							].map(({ l, f, p, t }) => (
								<div key={f}>
									<label className="text-xs text-muted-foreground mb-1 block">
										{l}
									</label>
									<input
										type={t}
										value={(venueForm as any)[f] || ""}
										onChange={(e) =>
											setVenueForm({
												...venueForm,
												[f]:
													t === "number"
														? parseInt(
																e.target.value,
															) || 0
														: e.target.value,
											})
										}
										placeholder={p}
										className={inputCls}
									/>
								</div>
							))}
						</div>
						<div className="flex justify-end gap-2 mt-3">
							<button
								onClick={() => setShowForm(false)}
								className="px-3 py-1.5 text-muted-foreground text-xs"
							>
								Cancel
							</button>
							<button
								onClick={addVenue}
								className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary"
							>
								<Save className="w-3 h-3 inline mr-1" />
								Save
							</button>
						</div>
					</div>
				)}
				{showForm && activeTab === "catering" && (
					<div className="p-5 bg-card border border-border rounded-xl mb-4">
						<h4 className="text-sm font-semibold text-foreground mb-3">
							New Catering Option
						</h4>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Meal Type
								</label>
								<select
									value={cateringForm.mealType || "breakfast"}
									onChange={(e) =>
										setCateringForm({
											...cateringForm,
											mealType: e.target.value as any,
										})
									}
									className={inputCls}
								>
									<option value="breakfast">Breakfast</option>
									<option value="lunch">Lunch</option>
									<option value="dinner">Dinner</option>
									<option value="snack">Snack</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Name
								</label>
								<input
									value={cateringForm.name || ""}
									onChange={(e) =>
										setCateringForm({
											...cateringForm,
											name: e.target.value,
										})
									}
									placeholder="Continental Breakfast"
									className={inputCls}
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Cost/Person (€)
								</label>
								<input
									type="number"
									value={cateringForm.costPerPerson || ""}
									onChange={(e) =>
										setCateringForm({
											...cateringForm,
											costPerPerson:
												parseFloat(e.target.value) || 0,
										})
									}
									placeholder="15"
									className={inputCls}
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Description
								</label>
								<input
									value={cateringForm.description || ""}
									onChange={(e) =>
										setCateringForm({
											...cateringForm,
											description: e.target.value,
										})
									}
									placeholder="Includes..."
									className={inputCls}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-3">
							<button
								onClick={() => setShowForm(false)}
								className="px-3 py-1.5 text-muted-foreground text-xs"
							>
								Cancel
							</button>
							<button
								onClick={addCatering}
								className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary"
							>
								<Save className="w-3 h-3 inline mr-1" />
								Save
							</button>
						</div>
					</div>
				)}

				{/* Registry Lists */}
				<div className="space-y-3">
					{activeTab === "hotels" &&
						registries.hotels.map((h) => (
							<div
								key={h.id}
								className="p-4 bg-card border border-border rounded-xl flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="p-2.5 bg-indigo-500/20 rounded-lg">
										<Hotel className="w-5 h-5 text-indigo-600" />
									</div>
									<div>
										<h4 className="text-sm font-semibold text-foreground">
											{h.name}
										</h4>
										<p className="text-xs text-muted-foreground flex items-center gap-1">
											<MapPin className="w-3 h-3" />{" "}
											{h.address}
										</p>
										{h.contactPhone && (
											<p className="text-xs text-muted-foreground">
												<Phone className="w-3 h-3 inline mr-1" />
												{h.contactPhone}
											</p>
										)}
									</div>
								</div>
								<button
									onClick={() => deleteHotel(h.id)}
									className="p-1.5 text-red-600 hover:text-red-600"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					{activeTab === "drivers" &&
						registries.drivers.map((d) => (
							<div
								key={d.id}
								className="p-4 bg-card border border-border rounded-xl flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="p-2.5 bg-yellow-500/20 rounded-lg">
										<Car className="w-5 h-5 text-yellow-600" />
									</div>
									<div>
										<h4 className="text-sm font-semibold text-foreground">
											{d.name}
										</h4>
										<p className="text-xs text-muted-foreground">
											{d.vehicle} · {d.capacity} seats ·{" "}
											{d.phone}
										</p>
										<p className="text-xs text-muted-foreground">
											€{d.costPerTrip}/trip · €
											{d.costPerPerson}/person
										</p>
									</div>
								</div>
								<button
									onClick={() => deleteDriver(d.id)}
									className="p-1.5 text-red-600 hover:text-red-600"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					{activeTab === "venues" &&
						registries.venues.map((v) => (
							<div
								key={v.id}
								className="p-4 bg-card border border-border rounded-xl flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="p-2.5 bg-green-500/20 rounded-lg">
										<Building2 className="w-5 h-5 text-green-600" />
									</div>
									<div>
										<h4 className="text-sm font-semibold text-foreground">
											{v.name}
										</h4>
										<p className="text-xs text-muted-foreground">
											<MapPin className="w-3 h-3 inline mr-1" />
											{v.address}{" "}
											{v.capacity
												? `· ${v.capacity} cap`
												: ""}
										</p>
										{v.notes && (
											<p className="text-xs text-muted-foreground italic">
												{v.notes}
											</p>
										)}
									</div>
								</div>
								<button
									onClick={() => deleteVenue(v.id)}
									className="p-1.5 text-red-600 hover:text-red-600"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					{activeTab === "catering" &&
						registries.catering.map((c) => (
							<div
								key={c.id}
								className="p-4 bg-card border border-border rounded-xl flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<div className="p-2.5 bg-orange-500/20 rounded-lg">
										<UtensilsCrossed className="w-5 h-5 text-orange-600" />
									</div>
									<div>
										<h4 className="text-sm font-semibold text-foreground">
											{c.name}
										</h4>
										<p className="text-xs text-muted-foreground capitalize">
											{c.mealType} · €{c.costPerPerson}
											/person
										</p>
										{c.description && (
											<p className="text-xs text-muted-foreground">
												{c.description}
											</p>
										)}
									</div>
								</div>
								<button
									onClick={() => deleteCatering(c.id)}
									className="p-1.5 text-red-600 hover:text-red-600"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						))}
					{((activeTab === "hotels" &&
						registries.hotels.length === 0) ||
						(activeTab === "drivers" &&
							registries.drivers.length === 0) ||
						(activeTab === "venues" &&
							registries.venues.length === 0) ||
						(activeTab === "catering" &&
							registries.catering.length === 0)) && (
						<div className="text-center py-12 text-muted-foreground">
							<p className="text-sm">
								No {activeTab} registered yet. Click "Add" to
								create one.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
