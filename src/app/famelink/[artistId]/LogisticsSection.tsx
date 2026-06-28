"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	ChevronLeft,
	User,
	Save,
	Plus,
	Pencil,
	Trash2,
	Loader2,
	Check,
	Plane,
	Upload,
	X,
	UtensilsCrossed,
	ChevronDown,
	Truck,
	Globe,
	Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ───────────────────────────────────────────────────────────
interface Traveler {
	id: string;
	fullPassportName: string;
	nationality: string;
	dateOfBirth: string;
	passportNumber: string;
	passportExpiry: string;
	homeDepartureCity: string;
	preferredAirport: string;
	roomPreference: string;
	dietaryRequirements: string;
	emergencyContact: string;
	frequentFlyer: string;
	visaNotes: string;
	baggageNotes: string;
	specialRemarks: string;
	passportCopyUrl?: string;
	visaCopyUrl?: string;
}

interface ActInfo {
	actName: string;
	leadContactName: string;
	leadContactEmail: string;
	leadContactPhone: string;
}

const EMPTY_TRAVELER: Omit<Traveler, "id"> = {
	fullPassportName: "",
	nationality: "",
	dateOfBirth: "",
	passportNumber: "",
	passportExpiry: "",
	homeDepartureCity: "",
	preferredAirport: "",
	roomPreference: "",
	dietaryRequirements: "",
	emergencyContact: "",
	frequentFlyer: "",
	visaNotes: "",
	baggageNotes: "",
	specialRemarks: "",
};

// ── Page ────────────────────────────────────────────────────────────
export default function LogisticsSection({ artistId: propArtistId }: { artistId?: string }) {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const artistId = propArtistId || (params.artistId as string);

	const [loading, setLoading] = useState(true);
	const [artistName, setArtistName] = useState("Artist");

	// Act info
	const [actInfo, setActInfo] = useState<ActInfo>({ actName: "", leadContactName: "", leadContactEmail: "", leadContactPhone: "" });
	const [isSavingAct, setIsSavingAct] = useState(false);
	const [editingAct, setEditingAct] = useState(false);
	const [isUploadingPassport, setIsUploadingPassport] = useState(false);
	const [isUploadingVisa, setIsUploadingVisa] = useState(false);

	// Logistics profile state
	const [hasProfile, setHasProfile] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// Travelers (local only)
	const [travelers, setTravelers] = useState<Traveler[]>([]);

	// Add / Edit traveler form state
	const [showForm, setShowForm] = useState(false);
	const [formMode, setFormMode] = useState<"add" | "edit">("add");
	const [formData, setFormData] = useState<Traveler>({ id: "", ...EMPTY_TRAVELER });

	// Load artist and logistics data from DB
	useEffect(() => {
		(async () => {
			try {
				const res = await fetch(`/api/artists/${artistId}`);
				const result = await res.json();
				if (result.success) {
					const name = result.data.artistName || "Artist";
					setArtistName(name);
					const dbLogistics = result.data.logistics;
					if (dbLogistics) {
						setHasProfile(true);
						setActInfo({
							actName: dbLogistics.actName || "",
							leadContactName: dbLogistics.leadContactName || dbLogistics.leadContact || "",
							leadContactEmail: dbLogistics.leadContactEmail || "",
							leadContactPhone: dbLogistics.leadContactPhone || "",
						});
						if (dbLogistics.travelers && Array.isArray(dbLogistics.travelers)) {
							setTravelers(dbLogistics.travelers);
						}
					} else {
						setActInfo((prev) => ({
							...prev,
							actName: "",
							leadContactName: "",
							leadContactEmail: "",
							leadContactPhone: "",
						}));
					}
				}
			} catch { /* ignore */ }
			setLoading(false);
		})();
	}, [artistId]);

	const saveLogisticsToDB = async (updatedActInfo: ActInfo, updatedTravelers: Traveler[]) => {
		try {
			const res = await fetch(`/api/artists/${artistId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					logistics: {
						...updatedActInfo,
						travelers: updatedTravelers
					}
				})
			});
			if (!res.ok) throw new Error("Failed to save");
			return true;
		} catch (error) {
			console.error("Error saving logistics", error);
			return false;
		}
	};

	const saveActInfo = async () => {
		setIsSavingAct(true);
		const success = await saveLogisticsToDB(actInfo, travelers);
		setIsSavingAct(false);
		if (success) {
			toast({ title: "Saved", description: "Act information saved successfully." });
			setHasProfile(true);
		} else {
			toast({ title: "Error", description: "Could not save act information", variant: "destructive" });
		}
	};

	// ── Form helpers ────────────────────────────────────────────────
	const updateField = (field: keyof Traveler, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		
		setIsUploadingPassport(true);
		try {
			const fData = new FormData();
			fData.append("file", file);
			fData.append("folder", `famelink/artists/${artistId}/passports`);
			
			const res = await fetch("/api/storage/upload", {
				method: "POST",
				body: fData
			});
			
			const data = await res.json();
			if (data.success) {
				updateField("passportCopyUrl", data.url);
				toast({ title: "Passport Uploaded", description: "The passport copy has been successfully uploaded." });
			} else {
				throw new Error(data.error || "Failed to upload");
			}
		} catch (error) {
			toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
		} finally {
			setIsUploadingPassport(false);
		}
	};

	const handleVisaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		
		setIsUploadingVisa(true);
		try {
			const fData = new FormData();
			fData.append("file", file);
			fData.append("folder", `famelink/artists/${artistId}/visas`);
			
			const res = await fetch("/api/storage/upload", {
				method: "POST",
				body: fData
			});
			
			const data = await res.json();
			if (data.success) {
				updateField("visaCopyUrl", data.url);
				toast({ title: "Visa Uploaded", description: "The visa copy has been successfully uploaded." });
			} else {
				throw new Error(data.error || "Failed to upload");
			}
		} catch (error) {
			toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
		} finally {
			setIsUploadingVisa(false);
		}
	};

	const openAddForm = () => {
		setFormData({ id: `t-${Date.now()}`, ...EMPTY_TRAVELER });
		setFormMode("add");
		setShowForm(true);
	};

	const openEditForm = (traveler: Traveler) => {
		setFormData({ ...traveler });
		setFormMode("edit");
		setShowForm(true);
	};

	const cancelForm = () => {
		setShowForm(false);
		setFormData({ id: "", ...EMPTY_TRAVELER });
	};

	const saveTraveler = async () => {
		if (!formData.fullPassportName.trim()) {
			toast({ title: "Name required", description: "Please enter the full passport name.", variant: "destructive" });
			return;
		}
		let newTravelers;
		if (formMode === "add") {
			newTravelers = [...travelers, formData];
			setTravelers(newTravelers);
			toast({ title: "Traveler Added", description: `${formData.fullPassportName} has been added.` });
		} else {
			newTravelers = travelers.map((t) => (t.id === formData.id ? formData : t));
			setTravelers(newTravelers);
			toast({ title: "Traveler Updated", description: `${formData.fullPassportName} has been updated.` });
		}
		saveLogisticsToDB(actInfo, newTravelers);
		cancelForm();
	};

	const deleteTraveler = async (id: string) => {
		const t = travelers.find((x) => x.id === id);
		const newTravelers = travelers.filter((x) => x.id !== id);
		setTravelers(newTravelers);
		toast({ title: "Traveler Removed", description: `${t?.fullPassportName || "Traveler"} has been removed.` });
		saveLogisticsToDB(actInfo, newTravelers);
	};

	// ── Loading state ───────────────────────────────────────────────
	if (loading) {
		return (
			<div className="flex items-center justify-center p-10">
				<Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
			</div>
		);
	}

	// ── Render ───────────────────────────────────────────────────────
	return (
		<div className="w-full text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* ── Main Content ────────────────────────────────────────────── */}
			<div className="relative z-10 max-w-5xl mx-auto py-2">
				{!hasProfile ? (
					<div className="flex flex-col items-center justify-center py-20">
						<div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
							<Truck className="h-10 w-10 text-purple-400/50" />
						</div>
						<h2 className="text-2xl font-bold text-white mb-2">No logistics data</h2>
						<p className="text-purple-300/50 text-sm mb-8 text-center max-w-md">
							You haven't set up your logistics profile yet. Create one to manage your travel, accommodation, and requirements.
						</p>
						<Button
							onClick={() => { 
								setActInfo({ actName: "", leadContactName: "", leadContactEmail: "", leadContactPhone: "" });
								setHasProfile(true); 
								setEditingAct(false); 
							}}
							className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
						>
							<Plus className="h-5 w-5 mr-2" />
							Add New Logistics
						</Button>
					</div>
				) : (
					<>
						{/* ── Page Title ──────────────────────────────────────────── */}
						<div className="mb-8">
							<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
								Reusable Logistics Profile
							</h1>
							<p className="text-purple-300/50 text-sm">
								Manage your travel information once. Reuse for every event booking.
							</p>
						</div>

				{/* ══════════════════════════════════════════════════════════ */}
				{/* ██  ACT INFORMATION  ██                                  */}
				{/* ══════════════════════════════════════════════════════════ */}
				<section
					className="rounded-2xl border border-purple-500/20 p-4 sm:p-6 mb-8 relative"
					style={{ background: "rgba(15, 8, 35, 0.7)", backdropFilter: "blur(12px)" }}
				>
					<div className="flex items-center justify-between mb-5">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
								<User className="h-4 w-4 text-pink-400" />
							</div>
							<h2 className="text-lg font-semibold text-white">{editingAct ? "Edit Artist Information" : "Artist Information"}</h2>
						</div>
						
						{!editingAct && (
							<Button
								variant="ghost"
								onClick={() => setEditingAct(true)}
								className="text-purple-300/70 hover:text-white hover:bg-white/10 rounded-xl gap-2"
							>
								<Pencil className="h-4 w-4" />
								Edit
							</Button>
						)}
					</div>

					{!editingAct ? (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
								<DetailCell label="Name *" value={actInfo.actName || "—"} />
								<DetailCell label="Lead contact name" value={actInfo.leadContactName || "—"} />
								<DetailCell label="Lead contact email" value={actInfo.leadContactEmail || "—"} />
								<DetailCell label="Lead contact phone" value={actInfo.leadContactPhone || "—"} />
							</div>
						</>
					) : (
						<>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
								<FormField
									label="Name"
									value={actInfo.actName}
									onChange={(v) => setActInfo((p) => ({ ...p, actName: v }))}
									placeholder="Your act / stage name"
									required
								/>
								<FormField
									label="Lead contact name"
									value={actInfo.leadContactName}
									onChange={(v) => setActInfo((p) => ({ ...p, leadContactName: v }))}
									placeholder="Name"
								/>
								<FormField
									label="Lead contact email"
									value={actInfo.leadContactEmail}
									onChange={(v) => setActInfo((p) => ({ ...p, leadContactEmail: v }))}
									placeholder="Email"
								/>
								<FormField
									label="Lead contact phone"
									value={actInfo.leadContactPhone}
									onChange={(v) => setActInfo((p) => ({ ...p, leadContactPhone: v }))}
									placeholder="Phone"
								/>
							</div>

							<div className="flex items-center gap-3">
								<Button
									onClick={async () => {
										await saveActInfo();
										setEditingAct(false);
									}}
									disabled={isSavingAct}
									className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl gap-2 shadow-lg shadow-green-500/20"
								>
									{isSavingAct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
									Save
								</Button>
								<Button
									variant="ghost"
									onClick={() => setEditingAct(false)}
									className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
								>
									Cancel
								</Button>
							</div>
						</>
					)}
				</section>

				{/* ══════════════════════════════════════════════════════════ */}
				{/* ██  TRAVELERS LIST  ██                                   */}
				{/* ══════════════════════════════════════════════════════════ */}
				<section className="mb-8">
					<div className="flex items-center justify-between mb-5">
						<h2 className="text-lg font-semibold text-white">
							Travelers ({travelers.length})
						</h2>
						{!showForm && (
							<Button
								onClick={openAddForm}
								disabled={!hasProfile || editingAct}
								className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl gap-2 text-sm transition-all hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Plus className="h-4 w-4" />
								Add Traveler
							</Button>
						)}
					</div>

					{/* ── Traveler Cards ──────────────────────────────────── */}
					{travelers.length === 0 && !showForm && (
						<div
							className="rounded-2xl border border-dashed border-purple-500/20 p-8 sm:p-12 text-center"
							style={{ background: "rgba(15, 8, 35, 0.5)" }}
						>
							<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
								<Plane className="h-8 w-8 text-purple-400/40" />
							</div>
							<h3 className="text-lg font-semibold text-white mb-2">No Travelers Yet</h3>
							<p className="text-purple-200/40 mb-6 text-sm max-w-md mx-auto">
								Add travelers to manage passport, accommodation, and travel details for your act.
							</p>
							<Button
								onClick={openAddForm}
								disabled={!hasProfile || editingAct}
								className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Plus className="h-4 w-4" />
								Add Your First Traveler
							</Button>
						</div>
					)}

					{travelers.length > 0 && !showForm && (
						<div className="grid gap-4 sm:grid-cols-2">
							{travelers.map((t) => (
								<div
									key={t.id}
									className="rounded-2xl border border-purple-500/20 p-4 sm:p-5 group hover:border-purple-400/30 transition-all duration-300"
									style={{ background: "rgba(15, 8, 35, 0.7)", backdropFilter: "blur(12px)" }}
								>
									{/* Card header */}
									<div className="flex items-start justify-between mb-4">
										<div>
											<h3 className="text-base font-semibold text-white">{t.fullPassportName}</h3>
											<p className="text-xs text-purple-300/50">
												{[t.nationality, t.homeDepartureCity].filter(Boolean).join(" · ") || "—"}
											</p>
										</div>
										<div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => openEditForm(t)}
												className="h-8 w-8 p-0 text-purple-300/50 hover:text-white hover:bg-white/10 rounded-lg"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => deleteTraveler(t.id)}
												className="h-8 w-8 p-0 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>

									{/* Detail grid */}
									<div className="grid grid-cols-2 gap-3 mb-4">
										<DetailCell label="Passport" value={t.passportNumber} />
										<DetailCell label="Expires" value={t.passportExpiry} />
										<DetailCell label="Airport" value={t.preferredAirport} />
										<DetailCell label="Room" value={t.roomPreference} />
									</div>

					{/* Status badges */}
					<div className="flex flex-wrap gap-2">
						{/* Passport image — green "on file" if uploaded, yellow warning if not */}
						{t.passportCopyUrl ? (
							<Badge
								className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/25 transition-colors"
								onClick={() => window.open(t.passportCopyUrl, "_blank")}
							>
								<Check className="h-2.5 w-2.5 mr-1" />Passport on file
							</Badge>
						) : (
							<Badge className="text-[10px] rounded-full px-2.5 py-0.5 bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
								Passport image missing
							</Badge>
						)}
						<Badge className="text-[10px] rounded-full px-2.5 py-0.5 bg-slate-500/20 text-purple-200/60 border border-purple-500/15">
							<UtensilsCrossed className="h-2.5 w-2.5 mr-1" />
							{t.dietaryRequirements || "No restrictions"}
						</Badge>
						{t.visaCopyUrl ? (
							<Badge
								className="text-[10px] rounded-full px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/25 transition-colors"
								onClick={() => window.open(t.visaCopyUrl, "_blank")}
							>
								<Check className="h-2.5 w-2.5 mr-1" />Visa on file
							</Badge>
						) : (
							t.visaNotes && (
								<Badge className="text-[10px] rounded-full px-2.5 py-0.5 bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
									Visa image missing
								</Badge>
							)
						)}
						{t.passportCopyUrl && t.passportNumber && (!t.visaNotes || t.visaCopyUrl) && (
							<Badge className="text-[10px] rounded-full px-2.5 py-0.5 bg-teal-500/15 text-teal-300 border border-teal-500/25">
								<Check className="h-2.5 w-2.5 mr-1" />Ready to travel
							</Badge>
						)}
					</div>
								</div>
							))}
						</div>
					)}

					{/* ══════════════════════════════════════════════════════ */}
					{/* ██  ADD / EDIT TRAVELER MODAL FORM  ██               */}
					{/* ══════════════════════════════════════════════════════ */}
					{showForm && (
						<div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto">
							<div className="flex min-h-full items-center justify-center p-4 sm:p-6 py-10">
								<div
									className="rounded-2xl border border-purple-500/25 p-6 sm:p-8 w-full max-w-4xl relative animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl"
									style={{ background: "rgba(15, 8, 35, 0.95)", backdropFilter: "blur(20px)" }}
								>
									<Button variant="ghost" onClick={cancelForm} className="absolute top-4 right-4 text-purple-300/50 hover:text-white rounded-full h-8 w-8 p-0 hover:bg-white/10 transition-colors">
										<X className="h-4 w-4" />
									</Button>
								
								<h3 className="text-lg font-bold text-white mb-6">
									{formMode === "add" ? "Add Traveler" : "Edit Traveler"}
								</h3>

							{/* Row 1: Name, Nationality, DOB */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
								<FormField
									label="Full Passport Name"
									value={formData.fullPassportName}
									onChange={(v) => updateField("fullPassportName", v)}
									placeholder="As written on passport"
									required
								/>
								<FormField
									label="Nationality"
									value={formData.nationality}
									onChange={(v) => updateField("nationality", v)}
									placeholder="e.g. Argentine"
								/>
								<FormField
									label="Date of Birth"
									value={formData.dateOfBirth}
									onChange={(v) => updateField("dateOfBirth", v)}
									type="date"
									placeholder="dd-mm-yyyy"
								/>
							</div>

							{/* Row 2: Passport Number, Passport Expiry, Home City */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
								<FormField
									label="Passport Number"
									value={formData.passportNumber}
									onChange={(v) => updateField("passportNumber", v.toUpperCase())}
									placeholder="e.g. AAB123456"
								/>
								<FormField
									label="Passport Expiry"
									value={formData.passportExpiry}
									onChange={(v) => updateField("passportExpiry", v)}
									type="date"
									placeholder="dd-mm-yyyy"
								/>
								<FormField
									label="Home / Departure City"
									value={formData.homeDepartureCity}
									onChange={(v) => updateField("homeDepartureCity", v)}
									placeholder="e.g. Buenos Aires"
								/>
							</div>

							{/* Row 3: Airport, Room, Dietary */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
								<FormField
									label="Preferred Airport"
									value={formData.preferredAirport}
									onChange={(v) => updateField("preferredAirport", v.toUpperCase())}
									placeholder="e.g. EZE"
								/>
								<FormField
									label="Room Preference"
									value={formData.roomPreference}
									onChange={(v) => updateField("roomPreference", v)}
									placeholder="e.g. Double room"
								/>
								<FormField
									label="Dietary Requirements"
									value={formData.dietaryRequirements}
									onChange={(v) => updateField("dietaryRequirements", v)}
									placeholder="e.g. No restrictions"
								/>
							</div>

							{/* Row 4: Emergency, Frequent Flyer, Visa */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
								<FormField
									label="Emergency Contact"
									value={formData.emergencyContact}
									onChange={(v) => updateField("emergencyContact", v)}
									placeholder="Name & phone number"
								/>
								<FormField
									label="Frequent Flyer"
									value={formData.frequentFlyer}
									onChange={(v) => updateField("frequentFlyer", v)}
									placeholder="Airline & number"
								/>
								<FormField
									label="Visa Notes"
									value={formData.visaNotes}
									onChange={(v) => updateField("visaNotes", v)}
									placeholder="e.g. Schengen visa required"
								/>
							</div>

							{/* Row 5: Baggage Notes, Special Remarks (textareas) */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
								<div>
									<Label className="text-[11px] text-purple-300/50 uppercase tracking-wider mb-2 block">
										Baggage Notes
									</Label>
									<Textarea
										value={formData.baggageNotes}
										onChange={(e) => updateField("baggageNotes", e.target.value)}
										className="bg-white/5 border-purple-500/20 text-white placeholder:text-purple-300/30 rounded-xl min-h-[80px] resize-y"
										placeholder="Special baggage requirements..."
									/>
								</div>
								<div>
									<Label className="text-[11px] text-purple-300/50 uppercase tracking-wider mb-2 block">
										Special Remarks
									</Label>
									<Textarea
										value={formData.specialRemarks}
										onChange={(e) => updateField("specialRemarks", e.target.value)}
										className="bg-white/5 border-purple-500/20 text-white placeholder:text-purple-300/30 rounded-xl min-h-[80px] resize-y"
										placeholder="Any additional notes..."
									/>
								</div>
							</div>

							{/* Upload Passport & Visa Copies */}
							<div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-purple-500/10 pt-5">
								{/* Passport Upload Option */}
								<div className="flex flex-col gap-2">
									<Label className="text-[11px] text-purple-300/50 uppercase tracking-wider block">
										Passport copy doc
									</Label>
									<div className="flex items-center gap-3">
										<input
											type="file"
											id="passportUpload"
											className="hidden"
											accept="image/*,.pdf"
											onChange={handleFileUpload}
										/>
										<label
											htmlFor="passportUpload"
											className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-purple-500/25 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-purple-400/50 cursor-pointer"
										>
											{isUploadingPassport ? (
												<Loader2 className="h-4 w-4 animate-spin text-purple-400" />
											) : (
												<Upload className="h-4 w-4 text-purple-400" />
											)}
											Upload Passport Copy
										</label>
										
										{formData.passportCopyUrl && (
											<Badge 
												className="h-11 gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 text-xs font-semibold text-green-400 hover:bg-green-500/20 cursor-pointer transition-all duration-300"
												onClick={() => window.open(formData.passportCopyUrl, '_blank')}
											>
												<Eye className="h-4 w-4" />
												View Passport Doc
											</Badge>
										)}
									</div>
								</div>

								{/* Visa Upload Option */}
								<div className="flex flex-col gap-2">
									<Label className="text-[11px] text-purple-300/50 uppercase tracking-wider block">
										Visa copy doc
									</Label>
									<div className="flex items-center gap-3">
										<input
											type="file"
											id="visaUpload"
											className="hidden"
											accept="image/*,.pdf"
											onChange={handleVisaUpload}
										/>
										<label
											htmlFor="visaUpload"
											className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-purple-500/25 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:border-purple-400/50 cursor-pointer"
										>
											{isUploadingVisa ? (
												<Loader2 className="h-4 w-4 animate-spin text-purple-400" />
											) : (
												<Upload className="h-4 w-4 text-purple-400" />
											)}
											Upload Visa Copy
										</label>
										
										{formData.visaCopyUrl && (
											<Badge 
												className="h-11 gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 text-xs font-semibold text-green-400 hover:bg-green-500/20 cursor-pointer transition-all duration-300"
												onClick={() => window.open(formData.visaCopyUrl, '_blank')}
											>
												<Eye className="h-4 w-4" />
												View Visa Doc
											</Badge>
										)}
									</div>
								</div>
							</div>

							{/* Action buttons */}
							<div className="flex items-center gap-3">
								<Button
									onClick={saveTraveler}
									className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl gap-2 shadow-lg shadow-fuchsia-500/20 transition-all duration-300"
								>
									<Save className="h-4 w-4" />
									{formMode === "add" ? "Save Traveler" : "Update Traveler"}
								</Button>
								<Button
									onClick={cancelForm}
									variant="ghost"
									className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl gap-2"
								>
									<X className="h-4 w-4" />
									Cancel
								</Button>
							</div>
						</div>
					</div>
					</div>
					)}
				</section>
					</>
				)}
			</div>
		</div>
	);
}

// ── Reusable sub-components ─────────────────────────────────────────
function DetailCell({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-[10px] text-purple-400/60 uppercase tracking-wider mb-0.5">{label}</p>
			<p className="text-sm text-white font-medium">{value || "—"}</p>
		</div>
	);
}

function FormField({
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	required,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
}) {
	return (
		<div>
			<Label className="text-[11px] text-purple-300/50 uppercase tracking-wider mb-2 block">
				{label}{required && " *"}
			</Label>
			<Input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="bg-white/5 border-purple-500/20 text-white placeholder:text-purple-300/30 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500"
				placeholder={placeholder}
			/>
		</div>
	);
}

function RadioSelect({ value, onChange }: { value: boolean | null, onChange: (val: boolean) => void }) {
	return (
		<div className="flex gap-4">
			<label className="flex items-center gap-2 cursor-pointer group">
				<div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${value === true ? 'border-pink-500 bg-pink-500' : 'border-purple-300/50 bg-white/5 group-hover:border-purple-400'}`}>
					{value === true && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
				</div>
				<input type="radio" className="hidden" checked={value === true} onChange={() => onChange(true)} />
				<span className={`text-sm transition-colors ${value === true ? 'text-white' : 'text-purple-200'}`}>Yes</span>
			</label>
			<label className="flex items-center gap-2 cursor-pointer group ml-2">
				<div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${value === false ? 'border-pink-500 bg-pink-500' : 'border-purple-300/50 bg-white/5 group-hover:border-purple-400'}`}>
					{value === false && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
				</div>
				<input type="radio" className="hidden" checked={value === false} onChange={() => onChange(false)} />
				<span className={`text-sm transition-colors ${value === false ? 'text-white' : 'text-purple-200'}`}>No</span>
			</label>
		</div>
	);
}
