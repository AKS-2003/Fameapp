"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft, Users, Link as LinkIcon, ListChecks, Truck, BarChart3,
	Calendar, RefreshCw, Loader2, Plus, Send, ChevronRight, Mail, Phone,
	MapPin, FileText, MessageSquare, DollarSign, Plane, Hotel, Car,
	UtensilsCrossed, CheckCircle2, XCircle, Clock, AlertCircle, Search,
	Trash2, Edit, Eye, Copy, ExternalLink, Settings, UserPlus,
	Download, Upload, X, Shield, AlertTriangle, Music, Check, Circle,
	Pen, CalendarClock, Wallet, Eraser, ClipboardPaste, FileSpreadsheet,
	Mic2, Guitar, Megaphone, Star, ArrowRight, ArrowLeft as ArrowLeftIcon,
} from "lucide-react";
import { useContractData } from "@/hooks/useContractData";
import { useContractWebSocket } from "@/hooks/useContractWebSocket";
import { useContractSocket } from "@/hooks/useContractSocket";
import type {
	ContractArtist, ContractInvitation, ContractStatus, ArtistRole,
	RequestTemplateType, ConversationMessage,
} from "@/types/contracts";
import {
	statusLabels, statusColors, roleLabels,
	requestTemplateLabels, emptyAgreement, emptyTravelLogistics,
} from "@/types/contracts";
import { createDefaultBooking } from "@/types/bookingStages";
import type { Booking, StageStatus, StageName, NegotiationMessage } from "@/types/bookingStages";
import { stageStatusLabels, emptyContractStageData, emptyLogisticsStageData, emptyScheduleStageData, emptyPaymentStageData } from "@/types/bookingStages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
	ContractsDashboard, OrgStageTracker, EditableStageFields, LogisticsStageContent,
	StageNegotiation, OrgStageActions, GeneralCommunication, InviteLinkBar,
	stageIcons,
} from "./_components";
import type { OrgStage } from "./_components";
import { InviteArtistDialog } from "./_invite_dialog";
import { ContractSettingsDialog } from "./_contract_settings";

// ─── Helpers ───

function createInitialStages(artist: ContractArtist): OrgStage[] {
	const hasAgreement = !!artist.agreement?.agreedFee;
	const cs: StageStatus =
		artist.contractDocStatus === "confirmed" ? "completed" :
		artist.contractDocStatus === "signed" ? "waiting_organiser_signature" :
		artist.contractDocStatus === "awaiting_signature" ? "waiting_artist_signature" :
		artist.contractDocStatus === "sent" ? "sent" :
		hasAgreement ? "draft" : "draft";
	return [
		{ name: "contract", label: "Contract", status: cs, artistSigned: cs === "waiting_organiser_signature" || cs === "completed", organiserSigned: cs === "completed", negotiation: [] },
		{ name: "logistics", label: "Logistics", status: "draft", artistSigned: false, organiserSigned: false, negotiation: [] },
		{ name: "schedule", label: "Schedule", status: "draft", artistSigned: false, organiserSigned: false, negotiation: [] },
		{ name: "payment", label: "Payment", status: "draft", artistSigned: false, organiserSigned: false, negotiation: [] },
		{ name: "communication", label: "Communication", status: "sent", artistSigned: false, organiserSigned: false, negotiation: [] },
	];
}

function createInitialData(artist: ContractArtist) {
	const a = artist.agreement || {} as any;
	return {
		contract: {
			"Performance Agreement": a.workshopsConfirmed ? `${a.workshopsConfirmed} workshops + ${a.showsConfirmed} shows` : "",
			"Booking Terms": a.arrivalDate && a.departureDate ? `Available ${a.arrivalDate} to ${a.departureDate}` : "",
			"Deliverables": a.workshopsConfirmed ? `${a.workshopsConfirmed} workshops, ${a.showsConfirmed} shows, ${a.djSets || 0} DJ sets` : "",
			"Conditions": "", "Responsibilities": "", "Cancellation Terms": "", "Special Clauses": "",
		},
		logistics: {
			"Travel Details": "", "Pickup & Drop-off": artist.travelLogistics?.pickupInfo || "",
			"Hotel / Accommodation": artist.travelLogistics?.hotelName || "",
			"Hospitality Requirements": artist.dietaryPreferences || "",
			"Technical Needs": "", "Local Contact": "",
		},
		schedule: {
			"Rehearsal Times": "", "Soundcheck": "", "Call Time": "",
			"Performance Slot": "", "Show Flow Timing": "",
			"Reporting Time": "", "Other Milestones": "",
		},
		payment: {
			"Performance Fee": a.agreedFee || "", "Deposit": "",
			"Deposit Due Date": "", "Remaining Balance": "",
			"Balance Due Date": "", "Payment Method": a.paymentMethod || "",
			"Invoice Status": "", "Payment Conditions": "",
		},
	};
}

// ═══════ MAIN PAGE ═══════

export default function ArtistContractsPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	const {
		artists, invitations, conversations, isLoading, error, refetch,
		addArtist, updateArtist, deleteArtist, addInvitation, addInvitations, sendMessage,
	} = useContractData({ eventId });

	useContractWebSocket({ eventId });
	useContractSocket({ eventId, role: "organiser" });

	// ─── State ───
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dashboardFilter, setDashboardFilter] = useState<ContractStatus | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
	const [typeFilter, setTypeFilter] = useState<"all" | RequestTemplateType>("all");

	// Dialogs
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [showBulkDialog, setShowBulkDialog] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [defaultCurrency, setDefaultCurrency] = useState("€");

	// Booking stages — stored per artist, synced to API/GCS
	const [stagesMap, setStagesMap] = useState<Record<string, OrgStage[]>>({});
	const [dataMap, setDataMap] = useState<Record<string, Record<string, Record<string, string>>>>({});
	const [activeStage, setActiveStage] = useState<StageName>("contract");
	const [editing, setEditing] = useState(false);

	// Settings & Bookings from API (GCS)
	const [bookings, setBookings] = useState<Booking[]>([]);
	const fetchBookingsAndSettings = useCallback(async () => {
		try { 
			const r = await fetch(`/api/contracts/${eventId}/bookings`); 
			const d = await r.json(); 
			if (d.success) setBookings(d.bookings || []); 

			const sr = await fetch(`/api/contracts/${eventId}/settings`);
			const sd = await sr.json();
			if (sd.success && sd.settings?.currencies) {
				const def = sd.settings.currencies.find((c: any) => c.isDefault);
				if (def) setDefaultCurrency(def.symbol);
			}
		} catch {}
	}, [eventId]);

	useEffect(() => { 
		if (eventId) fetchBookingsAndSettings(); 
		
		const handleSettingsUpdate = (e: any) => {
			if (e.detail?.eventId === eventId && e.detail?.settings?.currencies) {
				const def = e.detail.settings.currencies.find((c: any) => c.isDefault);
				if (def) setDefaultCurrency(def.symbol);
			}
		};
		window.addEventListener("contract_settings_updated", handleSettingsUpdate);
		return () => window.removeEventListener("contract_settings_updated", handleSettingsUpdate);
	}, [eventId, fetchBookingsAndSettings]);

	// Auto‑select first artist
	useEffect(() => { if (artists.length > 0 && !selectedId) setSelectedId(artists[0].id); }, [artists, selectedId]);
	useEffect(() => { setActiveStage("contract"); setEditing(false); }, [selectedId]);

	// ─── Derived ───
	const selectedArtist = artists.find((a) => a.id === selectedId) || null;
	const artistInvitation = selectedArtist ? invitations.find((inv) => inv.artistEmail === selectedArtist.email || inv.artistName === selectedArtist.stageName) : null;
	const artistMessages = selectedArtist ? conversations.filter((m) => m.artistId === selectedArtist.id) : [];

	const getStages = useCallback((id: string): OrgStage[] => {
		if (stagesMap[id]) return stagesMap[id];
		const artist = artists.find((a) => a.id === id);
		if (!artist) return [];
		return createInitialStages(artist);
	}, [stagesMap, artists]);

	const getData = useCallback((id: string) => {
		if (dataMap[id]) return dataMap[id];
		const artist = artists.find((a) => a.id === id);
		if (!artist) return createInitialData({} as any);
		return createInitialData(artist);
	}, [dataMap, artists]);

	const currentStages = selectedArtist ? getStages(selectedArtist.id) : [];
	const currentStage = currentStages.find((s) => s.name === activeStage);
	const currentData = selectedArtist ? getData(selectedArtist.id) : null;
	const completedCount = currentStages.filter((s) => s.name !== "communication" && s.status === "completed").length;

	const updateStage = useCallback((artistId: string, stageName: StageName, fn: (s: OrgStage) => OrgStage) => {
		setStagesMap((prev) => {
			const stages = prev[artistId] || getStages(artistId);
			const updated = stages.map((s) => s.name === stageName ? fn(s) : s);
			// Persist to GCS via API
			fetch(`/api/contracts/${eventId}/bookings/stages`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ artistId, stageName, stages: updated }),
			}).catch(console.error);
			return { ...prev, [artistId]: updated };
		});
	}, [eventId, getStages]);

	const handleFieldChange = (key: string, value: string) => {
		if (!selectedArtist || activeStage === "communication") return;
		setDataMap((prev) => {
			const data = prev[selectedArtist.id] || getData(selectedArtist.id);
			const updated = { ...data, [activeStage]: { ...data[activeStage], [key]: value } };
			// Persist to GCS
			fetch(`/api/contracts/${eventId}/bookings/stages`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ artistId: selectedArtist.id, stageName: activeStage, data: updated[activeStage] }),
			}).catch(console.error);
			return { ...prev, [selectedArtist.id]: updated };
		});
	};

	// ─── Filtering ───
	const filteredArtists = artists.filter((a) => {
		const matchesDash = dashboardFilter === "all" || a.status === dashboardFilter;
		const matchesStatus = statusFilter === "all" || a.status === statusFilter;
		const matchesType = typeFilter === "all" || a.requestTemplate === typeFilter;
		const matchesSearch = !searchQuery || a.stageName.toLowerCase().includes(searchQuery.toLowerCase()) || a.email.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesDash && matchesStatus && matchesType && matchesSearch;
	});

	// ─── Actions ───
	const handleDeleteArtist = async (id: string) => { await deleteArtist(id); if (selectedId === id) setSelectedId(artists.find((a) => a.id !== id)?.id || null); };
	const handleStatusChange = async (id: string, s: ContractStatus) => { await updateArtist(id, { status: s }); };
	const handleSendMessage = async (text: string) => { if (!selectedArtist || !text.trim()) return; await sendMessage({ artistId: selectedArtist.id, invitationId: selectedArtist.id, sender: "organiser", senderName: "Organiser", text }); };
	const handleCopyLink = (url: string, label: string) => { navigator.clipboard.writeText(url); setLinkCopied(label); setTimeout(() => setLinkCopied(null), 2000); };

	// ─── Template data for Bulk wizard ───
	const templateCards: { key: RequestTemplateType; label: string; icon: typeof Users; questions: number; required: number }[] = [
		{ key: "dancer", label: "Dancer / Instructor", icon: Users, questions: 5, required: 3 },
		{ key: "dj", label: "DJ", icon: Music, questions: 5, required: 3 },
		{ key: "band", label: "Band / Live Act", icon: Guitar, questions: 5, required: 3 },
		{ key: "mc", label: "MC / Host", icon: Mic2, questions: 4, required: 2 },
		{ key: "ambassador", label: "Ambassador / Promoter", icon: Megaphone, questions: 4, required: 3 },
		{ key: "guest", label: "Guest Artist", icon: Star, questions: 1, required: 0 },
	];

	// ─── Bulk Invite — 3 steps: template → artists → review/done ───
	const [bulkStep, setBulkStep] = useState<"select_template" | "add" | "review" | "done">("select_template");
	const [bulkType, setBulkType] = useState<RequestTemplateType>("dancer");
	const [bulkEntries, setBulkEntries] = useState<{ id: string; name: string; email: string; country: string }[]>([]);
	const [bulkManual, setBulkManual] = useState({ name: "", email: "", country: "" });
	const [bulkPaste, setBulkPaste] = useState("");
	const [bulkCreated, setBulkCreated] = useState<ContractInvitation[]>([]);
	const fileRef = useRef<HTMLInputElement>(null);

	const addBulkManual = () => {
		if (!bulkManual.name || !bulkManual.email) return;
		setBulkEntries((p) => [...p, { id: `be-${Date.now()}`, ...bulkManual }]);
		setBulkManual({ name: "", email: "", country: "" });
	};

	const parseBulkPaste = () => {
		const lines = bulkPaste.split("\n").map((l) => l.trim()).filter(Boolean);
		const entries = lines.map((line) => {
			const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.\w+/);
			if (!emailMatch) return null;
			const email = emailMatch[0];
			const rest = line.replace(email, "").replace(/[—\-,<>]/g, " ").trim();
			const parts = rest.split(/\s{2,}|,/).map((p) => p.trim()).filter(Boolean);
			return { id: `be-${Date.now()}-${Math.random()}`, name: parts[0] || "Unknown", email, country: parts[1] || "" };
		}).filter(Boolean) as typeof bulkEntries;
		setBulkEntries((p) => [...p, ...entries]);
		setBulkPaste("");
	};

	const handleBulkCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]; if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target?.result as string;
			const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
			const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
			const entries = lines.slice(start).map((line) => {
				const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
				return cols.length >= 2 ? { id: `be-${Date.now()}-${Math.random()}`, name: cols[0], email: cols[1], country: cols[2] || "" } : null;
			}).filter(Boolean) as typeof bulkEntries;
			setBulkEntries((p) => [...p, ...entries]);
		};
		reader.readAsText(file);
		if (fileRef.current) fileRef.current.value = "";
	};

	const handleBulkSend = async () => {
		const invList = bulkEntries.map((e) => ({
			artistName: e.name, artistEmail: e.email, participantType: bulkType,
			templateId: bulkType, templateName: requestTemplateLabels[bulkType], message: "",
		}));
		const created = await addInvitations(invList);
		setBulkCreated(created);
		// Also create artist entries
		for (const inv of created) {
			await addArtist({ id: inv.id, stageName: inv.artistName, legalName: inv.artistName, email: inv.artistEmail, role: bulkType === "dj" ? "dj" : bulkType === "band" ? "group" : "solo", requestTemplate: bulkType, status: "invited", contractDocStatus: "draft", missingItems: ["Profile"], profileStatus: "requested", country: "", city: "", nationality: "", phone: "", nearestAirport: "", travelPreferences: "", dietaryPreferences: "", hotelRoomPreference: "", eventQuestions: [], agreement: emptyAgreement, groupMembers: [], travelLogistics: emptyTravelLogistics });
		}
		setBulkStep("done");
	};

	const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/event/${eventId}/artist-contracts` : "";
	const filledFields = currentData && activeStage !== "communication" ? Object.values(currentData[activeStage] || {}).filter(Boolean).length : 0;
	const totalFields = currentData && activeStage !== "communication" ? Object.keys(currentData[activeStage] || {}).length : 0;
	const StageIcon = stageIcons[activeStage] || MessageSquare;

	// ═══════ LOADING / ERROR ═══════
	if (isLoading) return (<div className="flex items-center justify-center h-screen bg-background"><div className="flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-muted-foreground text-lg font-medium">Loading Artist Contracts...</p></div></div>);
	if (error) return (<div className="flex items-center justify-center h-screen bg-background"><div className="flex flex-col items-center gap-4 text-center"><AlertCircle className="w-10 h-10 text-red-500" /><p className="text-red-600 text-lg">{error}</p><button onClick={refetch} className="px-4 py-2 gradient-brand text-primary-foreground rounded-lg">Try Again</button></div></div>);

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* ═══ Top bar ═══ */}
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-foreground" /></button>
					<Image src="/fame-logo.png" alt="FAME" width={32} height={32} className="rounded-lg" />
					<div><h1 className="text-sm font-bold text-foreground">Artist Contracts</h1><p className="text-xs text-muted-foreground">Step 1 · Event Workflow</p></div>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full"><LinkIcon className="w-3.5 h-3.5" /><span>{invitations.length} invitations</span></div>
					<div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full"><Users className="w-3.5 h-3.5" /><span>{artists.length} artists</span></div>
					{[
						{ label: "Confirmed Lineup", path: "confirmed-lineup", icon: <ListChecks className="w-3.5 h-3.5" /> },
						{ label: "Logistics", path: "logistics", icon: <Truck className="w-3.5 h-3.5" /> },
						{ label: "Analytics", path: "analytics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
						{ label: "Workshops", path: "workshop-schedule", icon: <Calendar className="w-3.5 h-3.5" /> },
					].map((nav) => (
						<button key={nav.path} onClick={() => router.push(`/event/${eventId}/${nav.path}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg transition-colors text-xs text-foreground">{nav.icon}{nav.label}</button>
					))}
					<button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg text-xs text-foreground"><Settings className="w-3.5 h-3.5" />Settings</button>
					<button onClick={refetch} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
				</div>
			</header>


			{/* ═══ Invite Artist Dialog (standalone component) ═══ */}
			<InviteArtistDialog
				open={showInviteDialog}
				onOpenChange={setShowInviteDialog}
				onInvitationCreated={(inv) => { setSelectedId(inv.id); }}
				addInvitation={addInvitation}
				addArtist={addArtist}
			/>

			{/* ═══ Bulk Invite Dialog (3‑step wizard) ═══ */}
			<Dialog open={showBulkDialog} onOpenChange={(v) => { setShowBulkDialog(v); if (!v) { setBulkStep("select_template"); setBulkEntries([]); setBulkCreated([]); setBulkPaste(""); } }}>
				<DialogContent className="bg-white border-border max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
					<DialogHeader><DialogTitle className="text-lg font-bold text-foreground">{bulkStep === "done" ? "Invitations Sent!" : "Bulk Invite Artists"}</DialogTitle></DialogHeader>

					{/* Step indicator */}
					{bulkStep !== "done" && (
						<div className="flex items-center gap-2 px-1 pb-2">
							{(["select_template", "add", "review"] as const).map((s, i) => {
								const labels = ["Template", "Artists", "Review"];
								const idx = (["select_template", "add", "review"] as const).indexOf(bulkStep as any);
								const isActive = i === idx; const isDone = i < idx;
								return (
									<div key={s} className="flex items-center gap-2 flex-1">
										<div className="flex items-center gap-1.5 min-w-0">
											<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDone ? "bg-[hsl(var(--status-confirmed))] text-white" : isActive ? "gradient-brand text-white" : "bg-muted text-muted-foreground"}`}>
												{isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
											</div>
											<span className={`text-xs font-medium truncate ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{labels[i]}</span>
										</div>
										{i < 2 && <div className={`h-0.5 flex-1 rounded-full ${isDone ? "bg-[hsl(var(--status-confirmed))]" : "bg-border"}`} />}
									</div>
								);
							})}
						</div>
					)}

					<div className="flex-1 overflow-y-auto pr-1">
						{/* STEP 1: Template Cards */}
						{bulkStep === "select_template" && (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">Choose a request template. All artists in this batch will receive the same set of questions.</p>
								<div className="grid grid-cols-2 gap-3">
									{templateCards.map((tpl) => {
										const TplIcon = tpl.icon;
										const isSelected = bulkType === tpl.key;
										return (
											<div key={tpl.key} onClick={() => setBulkType(tpl.key)}
												className={`border rounded-xl p-4 cursor-pointer transition-all ${isSelected ? "border-primary bg-accent/50 ring-2 ring-primary/20" : "border-border hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30"}`}>
												<div className="flex items-start gap-3">
													<div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center shrink-0"><TplIcon className="w-5 h-5 text-white" /></div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-semibold text-foreground truncate">{tpl.label}</p>
														<p className="text-xs text-muted-foreground mt-0.5">{tpl.label} · {tpl.questions} questions</p>
													</div>
													{isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
												</div>
											</div>
										);
									})}
								</div>
								<div className="flex justify-end pt-2">
									<button onClick={() => setBulkStep("add")} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-sm font-medium shadow-brand border-0">Next <ArrowRight className="w-4 h-4" /></button>
								</div>
							</div>
						)}

						{/* STEP 2: Add Artists */}
						{bulkStep === "add" && (
							<div className="space-y-4">
								<div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
									{(() => { const TplIcon = templateCards.find(t => t.key === bulkType)?.icon || Users; return <TplIcon className="w-4 h-4 text-primary" />; })()}
									<span className="text-sm font-medium text-foreground">{requestTemplateLabels[bulkType]}</span>
									<Badge variant="outline" className="text-xs">{templateCards.find(t => t.key === bulkType)?.questions} questions</Badge>
								</div>
								{/* Manual */}
								<div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
									<div><label className="text-xs text-muted-foreground">Name *</label><input value={bulkManual.name} onChange={(e) => setBulkManual({ ...bulkManual, name: e.target.value })} placeholder="Artist name" className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm" onKeyDown={(e) => e.key === "Enter" && addBulkManual()} /></div>
									<div><label className="text-xs text-muted-foreground">Email *</label><input value={bulkManual.email} onChange={(e) => setBulkManual({ ...bulkManual, email: e.target.value })} placeholder="email@example.com" type="email" className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm" onKeyDown={(e) => e.key === "Enter" && addBulkManual()} /></div>
									<div><label className="text-xs text-muted-foreground">Country</label><input value={bulkManual.country} onChange={(e) => setBulkManual({ ...bulkManual, country: e.target.value })} placeholder="Optional" className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm w-24" /></div>
									<button onClick={addBulkManual} className="px-3 py-2 gradient-brand text-primary-foreground rounded-lg shadow-brand border-0"><Plus className="w-4 h-4" /></button>
								</div>
								{/* Paste */}
								<div className="space-y-2"><p className="text-xs text-muted-foreground">Or paste a list (one per line): <code className="bg-muted px-1 rounded text-[10px]">Name — email@example.com</code></p><textarea value={bulkPaste} onChange={(e) => setBulkPaste(e.target.value)} rows={3} placeholder={"Maria — maria@email.com\nDJ Luis — luis@email.com"} className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm resize-none" /><button onClick={parseBulkPaste} disabled={!bulkPaste.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium disabled:opacity-50"><ClipboardPaste className="w-3.5 h-3.5" /> Parse & Add</button></div>
								{/* CSV */}
								<div className="flex items-center gap-2"><input ref={fileRef} type="file" accept=".csv" onChange={handleBulkCSV} className="hidden" /><button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium"><FileSpreadsheet className="w-3.5 h-3.5" /> Import CSV</button></div>
								{/* List */}
								{bulkEntries.length > 0 ? (
									<div className="border border-border rounded-lg overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-muted/30 border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted-foreground">#</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Name</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Email</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Country</th><th className="w-10" /></tr></thead><tbody>{bulkEntries.map((e, i) => (<tr key={e.id} className="border-b border-border last:border-0"><td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td><td className="px-3 py-2 font-medium">{e.name}</td><td className="px-3 py-2 text-muted-foreground">{e.email}</td><td className="px-3 py-2 text-muted-foreground">{e.country || "—"}</td><td className="px-3 py-2"><button onClick={() => setBulkEntries((p) => p.filter((x) => x.id !== e.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>))}</tbody></table></div>
								) : <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" />No artists added yet. Use one of the methods above.</div>}
								<div className="flex items-center justify-between pt-2">
									<button onClick={() => setBulkStep("select_template")} className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-medium"><ArrowLeftIcon className="w-4 h-4" /> Back</button>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">{bulkEntries.length} artists</span>
										<button onClick={() => setBulkStep("review")} disabled={bulkEntries.length === 0} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 shadow-brand border-0">Review <ArrowRight className="w-4 h-4" /></button>
									</div>
								</div>
							</div>
						)}

						{/* STEP 3: Review */}
						{bulkStep === "review" && (
							<div className="space-y-5">
								<div className="rounded-xl border border-border p-5 space-y-4">
									<h3 className="text-sm font-bold text-foreground">Invitation Summary</h3>
									<div className="grid grid-cols-2 gap-4">
										<div><p className="text-xs text-muted-foreground mb-1">Template</p><div className="flex items-center gap-2">{(() => { const TplIcon = templateCards.find(t => t.key === bulkType)?.icon || Users; return <TplIcon className="w-4 h-4 text-primary" />; })()}<p className="text-sm font-medium text-foreground">{requestTemplateLabels[bulkType]}</p></div></div>
										<div><p className="text-xs text-muted-foreground mb-1">Artists to invite</p><p className="text-sm font-bold text-foreground">{bulkEntries.length}</p></div>
									</div>
									<div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">{bulkEntries.map((e) => <Badge key={e.id} variant="outline" className="text-xs">{e.name}</Badge>)}</div>
								</div>
								<div className="bg-accent/30 border border-border rounded-lg p-3 text-xs text-muted-foreground">Each artist will receive a <strong className="text-foreground">unique invitation link</strong> to respond with their profile, event answers, and show selections.</div>
								<div className="flex items-center justify-between pt-2">
									<button onClick={() => setBulkStep("add")} className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-medium"><ArrowLeftIcon className="w-4 h-4" /> Back</button>
									<button onClick={handleBulkSend} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-sm font-medium shadow-brand border-0"><Send className="w-4 h-4" /> Send {bulkEntries.length} Invitations</button>
								</div>
							</div>
						)}

						{/* DONE */}
						{bulkStep === "done" && (
							<div className="space-y-5 py-2">
								<div className="text-center py-4"><div className="w-14 h-14 rounded-full bg-[hsl(var(--status-confirmed))]/15 flex items-center justify-center mx-auto mb-3"><Check className="w-7 h-7 text-[hsl(var(--status-confirmed))]" /></div><h3 className="text-lg font-bold text-foreground">{bulkCreated.length} Invitations Created</h3><p className="text-sm text-muted-foreground mt-1">Each artist has a unique link to respond to your request.</p></div>
								<div className="border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto"><table className="w-full text-sm"><thead><tr className="bg-muted/30 border-b border-border"><th className="text-left px-3 py-2 text-xs text-muted-foreground">Artist</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Email</th><th className="text-left px-3 py-2 text-xs text-muted-foreground">Invitation Link</th></tr></thead><tbody>{bulkCreated.map((inv) => (<tr key={inv.id} className="border-b border-border last:border-0"><td className="px-3 py-2 font-medium">{inv.artistName}</td><td className="px-3 py-2 text-xs text-muted-foreground">{inv.artistEmail}</td><td className="px-3 py-2"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{inv.invitationLink}</code></td></tr>))}</tbody></table></div>
								<div className="flex gap-2"><button onClick={() => { const links = bulkCreated.map((inv) => `${inv.artistName}: ${typeof window !== "undefined" ? window.location.origin : ""}${inv.invitationLink}`).join("\n"); navigator.clipboard.writeText(links); }} className="flex-1 py-2 bg-secondary border border-border rounded-lg text-sm font-medium"><Copy className="w-4 h-4 inline mr-1" /> Copy All Links</button><button onClick={() => setShowBulkDialog(false)} className="flex-1 py-2 gradient-brand text-primary-foreground rounded-lg text-sm font-medium shadow-brand border-0">Done</button></div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* ═══ Dashboard ═══ */}
			<div className="px-5 py-3 border-b border-border bg-background">
				<ContractsDashboard artists={artists} activeFilter={dashboardFilter} onFilterChange={setDashboardFilter} />
			</div>

			{/* ═══ Main Content ═══ */}
			<div className="flex flex-1 min-h-0">
				{/* ── Pipeline ── */}
				<div className="w-[35%] border-r border-border bg-card flex flex-col min-h-0">
					<div className="px-4 py-3 border-b border-border space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-bold text-foreground">Artist Pipeline</h2>
							<div className="flex items-center gap-1.5">
								<button onClick={() => setShowBulkDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border hover:bg-muted rounded-lg text-xs font-medium transition-colors"><Users className="w-3.5 h-3.5" /> Bulk</button>
								<button onClick={() => setShowInviteDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-primary-foreground rounded-lg text-xs font-medium shadow-brand border-0"><Plus className="w-3.5 h-3.5" /> Invite</button>
							</div>
						</div>
						<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
						<div className="flex gap-2">
							<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-[11px] text-foreground focus:outline-none"><option value="all">All Status ({artists.length})</option>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
							<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-[11px] text-foreground focus:outline-none"><option value="all">All Types</option>{Object.entries(requestTemplateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto scrollbar-thin">
						{filteredArtists.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Users className="w-8 h-8 mb-2 opacity-40" /><p className="text-sm">No artists found</p><button onClick={() => setShowInviteDialog(true)} className="mt-3 text-xs text-primary hover:underline">Invite your first artist</button></div>
						) : filteredArtists.map((artist) => {
							const stages = getStages(artist.id);
							return (
								<div key={artist.id} onClick={() => setSelectedId(artist.id)} className={`group w-full text-left px-4 py-3 border-b border-border transition-all hover:bg-accent/50 cursor-pointer ${selectedId === artist.id ? "bg-accent border-l-2 border-l-primary" : ""}`}>
									<div className="flex items-start justify-between mb-1">
										<div>
											<p className="font-semibold text-sm text-foreground">{artist.stageName}</p>
											<div className="flex items-center gap-1.5 mt-0.5"><MapPin className="w-3 h-3 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{artist.country || "—"}</span></div>
										</div>
										<div className="flex items-center gap-1.5">
											<Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">{requestTemplateLabels[artist.requestTemplate]}</Badge>
											<button className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleDeleteArtist(artist.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
										</div>
									</div>
									{/* Stage mini-indicators */}
									<div className="flex items-center gap-1.5 mt-1.5 mb-1.5 flex-wrap">
										{stages.filter((s) => s.name !== "communication").map((s) => {
											const done = s.status === "completed";
											const partial = s.status !== "draft" && !done;
											return (
												<Badge key={s.name} variant="outline" className={`text-[9px] px-1.5 py-0 gap-0.5 ${done ? "border-[hsl(var(--status-confirmed))]/30 text-[hsl(var(--status-confirmed))] bg-[hsl(var(--status-confirmed))]/5" : partial ? "border-[hsl(var(--status-waiting))]/30 text-[hsl(var(--status-waiting))] bg-[hsl(var(--status-waiting))]/5" : "border-border text-muted-foreground"}`}>
													{done ? <CheckCircle2 className="w-2.5 h-2.5" /> : partial ? <Clock className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5" />}
													{s.label}
												</Badge>
											);
										})}
									</div>
									<Badge variant="outline" className={`text-[10px] font-medium border ${statusColors[artist.status]}`}>{statusLabels[artist.status]}</Badge>
								</div>
							);
						})}
					</div>
				</div>

				{/* ── Workflow Panel ── */}
				<div className="w-[65%] min-h-0 flex flex-col">
					{selectedArtist && currentStage ? (
						<>
							{/* Header */}
							<div className="px-6 pt-5 pb-4 space-y-3 border-b border-border">
								<div className="flex items-center justify-between">
									<div><h2 className="text-lg font-bold text-foreground">{selectedArtist.stageName}</h2><p className="text-xs text-muted-foreground">{selectedArtist.legalName} · {selectedArtist.country}</p></div>
									<div className="flex items-center gap-2">
										<Badge variant="outline" className="text-[10px]">{completedCount}/4 stages completed</Badge>
										<Badge className="gradient-brand text-primary-foreground border-0 text-xs shadow-brand">{statusLabels[selectedArtist.status]}</Badge>
									</div>
								</div>
								{artistInvitation && <InviteLinkBar invitation={artistInvitation} />}
								<OrgStageTracker stages={currentStages} activeStage={activeStage} onStageClick={(n) => { setActiveStage(n); setEditing(false); }} />
							</div>

							{/* Content */}
							<div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
								<div className="p-6 space-y-5">
									{activeStage === "logistics" ? (
										<>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center"><Truck className="w-4 h-4 text-primary-foreground" /></div><div><h3 className="font-bold text-foreground">Logistics Stage</h3><span className="text-[11px] text-muted-foreground">All logistics associated</span></div></div>
												<button onClick={() => setEditing(!editing)} className="flex items-center gap-1 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium hover:bg-muted"><Edit className="w-3 h-3" /> Edit</button>
											</div>
											<LogisticsStageContent artist={selectedArtist} currencySymbol={defaultCurrency} />
											<OrgStageActions stage={currentStage} onStatusChange={(s) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: s }))} onSign={(url) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: "completed", organiserSigned: true, organiserSignatureUrl: url }))} onSimulateArtistSign={() => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: "waiting_organiser_signature", artistSigned: true }))} artistName={selectedArtist.stageName} />
											<div className="border-t border-border pt-4"><StageNegotiation negotiation={currentStage.negotiation} onSend={(msg) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, negotiation: [...st.negotiation, msg] }))} artistName={selectedArtist.stageName} /></div>
										</>
									) : activeStage !== "communication" ? (
										<>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center"><StageIcon className="w-4 h-4 text-primary-foreground" /></div><div><h3 className="font-bold text-foreground">{currentStage.label} Stage</h3><span className="text-[11px] text-muted-foreground">{filledFields}/{totalFields} fields completed</span></div></div>
												{(currentStage.status === "draft" || currentStage.status === "changes_requested") && <button onClick={() => setEditing(!editing)} className="flex items-center gap-1 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium hover:bg-muted"><Edit className="w-3 h-3" />{editing ? "Done" : "Edit"}</button>}
											</div>
											<div className="bg-card rounded-xl border border-border p-5 shadow-[var(--shadow-card)]">
												<EditableStageFields fields={currentData?.[activeStage] || {}} editing={editing} onChange={handleFieldChange} currencySymbol={defaultCurrency} />
											</div>
											<OrgStageActions stage={currentStage} onStatusChange={(s) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: s }))} onSign={(url) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: "completed", organiserSigned: true, organiserSignatureUrl: url }))} onSimulateArtistSign={() => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, status: "waiting_organiser_signature", artistSigned: true }))} artistName={selectedArtist.stageName} />
											<div className="border-t border-border pt-4"><StageNegotiation negotiation={currentStage.negotiation} onSend={(msg) => updateStage(selectedArtist.id, activeStage, (st) => ({ ...st, negotiation: [...st.negotiation, msg] }))} artistName={selectedArtist.stageName} /></div>
										</>
									) : (
										<GeneralCommunication messages={artistMessages} onSend={handleSendMessage} artistName={selectedArtist.stageName} />
									)}
								</div>
							</div>
						</>
					) : (
						<div className="flex-1 flex items-center justify-center text-muted-foreground"><div className="text-center"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-lg font-medium">Select an artist</p><p className="text-sm">Choose an artist from the pipeline to manage their workflow</p></div></div>
					)}
				</div>
			</div>

			{/* ═══ Modals ═══ */}
			<ContractSettingsDialog 
				eventId={eventId} 
				open={showSettings} 
				onOpenChange={setShowSettings} 
			/>
		</div>
	);
}
