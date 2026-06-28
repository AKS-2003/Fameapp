// =========================================================================
// Artist Contracts — Sub‑components  (matches sample_src styling exactly)
// =========================================================================
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ContractArtist, ContractInvitation, ContractStatus, ContractItemStatus } from "@/types/contracts";
import { statusLabels, statusColors } from "@/types/contracts";
import type { StageStatus, StageName, NegotiationMessage } from "@/types/bookingStages";
import { stageStatusLabels, stageStatusColors } from "@/types/bookingStages";
import {
	FileText, Truck, CalendarClock, Wallet, MessageSquare, Send, CheckCircle2,
	Circle, Clock, AlertTriangle, Edit, Eye, Pen, Users, Plus, MapPin,
	Search, Trash2, Copy, ExternalLink, Link as LinkIcon, Check, X,
	Eraser, Plane, Hotel, Car, UtensilsCrossed, Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Stage icons (sample uses these exact icons) ───
export const stageIcons: Record<StageName, typeof FileText> = {
	contract: FileText,
	logistics: Truck,
	schedule: CalendarClock,
	payment: Wallet,
	communication: MessageSquare,
};

const statusIconMap: Record<StageStatus, typeof CheckCircle2> = {
	draft: Circle, sent: Eye, under_review: Eye,
	changes_requested: AlertTriangle, approved: CheckCircle2,
	waiting_artist_signature: Pen, waiting_organiser_signature: Pen,
	completed: CheckCircle2,
};

const statusIconColors: Record<StageStatus, string> = {
	draft: "text-muted-foreground",
	sent: "text-[hsl(var(--status-invited))]",
	under_review: "text-[hsl(var(--status-negotiation))]",
	changes_requested: "text-[hsl(var(--status-waiting))]",
	approved: "text-[hsl(var(--status-confirmed))]",
	waiting_artist_signature: "text-[hsl(var(--status-awaiting))]",
	waiting_organiser_signature: "text-[hsl(var(--status-negotiation))]",
	completed: "text-[hsl(var(--status-confirmed))]",
};

// ─── OrgStage shape used across the panel ───
export interface OrgStage {
	name: StageName;
	label: string;
	status: StageStatus;
	artistSigned: boolean;
	organiserSigned: boolean;
	artistSignatureUrl?: string;
	organiserSignatureUrl?: string;
	negotiation: NegotiationMessage[];
}

// ═══════ CONTRACTS DASHBOARD ═══════

interface ContractsDashboardProps {
	artists: ContractArtist[];
	activeFilter: ContractStatus | "all";
	onFilterChange: (f: ContractStatus | "all") => void;
}

const dashCfg: { key: ContractStatus; icon: React.ElementType; css: string; bg: string; bar: string }[] = [
	{ key: "invited",     icon: Send,          css: "text-[hsl(var(--status-invited))]",     bg: "bg-[hsl(var(--status-invited))]/10",     bar: "bg-[hsl(var(--status-invited))]" },
	{ key: "waiting",     icon: Clock,         css: "text-[hsl(var(--status-waiting))]",     bg: "bg-[hsl(var(--status-waiting))]/10",     bar: "bg-[hsl(var(--status-waiting))]" },
	{ key: "negotiation", icon: MessageSquare,  css: "text-[hsl(var(--status-negotiation))]", bg: "bg-[hsl(var(--status-negotiation))]/10", bar: "bg-[hsl(var(--status-negotiation))]" },
	{ key: "awaiting",    icon: Pen,           css: "text-[hsl(var(--status-awaiting))]",    bg: "bg-[hsl(var(--status-awaiting))]/10",    bar: "bg-[hsl(var(--status-awaiting))]" },
	{ key: "confirmed",   icon: CheckCircle2,  css: "text-[hsl(var(--status-confirmed))]",   bg: "bg-[hsl(var(--status-confirmed))]/10",   bar: "bg-[hsl(var(--status-confirmed))]" },
];

export function ContractsDashboard({ artists, activeFilter, onFilterChange }: ContractsDashboardProps) {
	const counts: Record<string, number> = { invited: 0, waiting: 0, negotiation: 0, awaiting: 0, confirmed: 0, cancelled: 0 };
	artists.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });
	const total = artists.length;

	return (
		<div className="space-y-3">
			{/* Stat cards */}
			<div className="flex items-stretch gap-2">
				{/* Total */}
				<button onClick={() => onFilterChange("all")} className={`rounded-xl border px-4 py-3 text-left transition-all flex items-center gap-3 min-w-[80px] ${activeFilter === "all" ? "border-primary bg-accent ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"}`}>
					<div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shrink-0">
						<Users className="w-4 h-4 text-primary-foreground" />
					</div>
					<div>
						<p className="text-xl font-bold text-foreground leading-tight">{total}</p>
						<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
					</div>
				</button>
				{dashCfg.map(({ key, icon: Icon, css, bg }) => (
					<button key={key} onClick={() => onFilterChange(key)} className={`rounded-xl border px-4 py-3 text-left transition-all flex items-center gap-3 min-w-[80px] ${activeFilter === key ? "border-primary bg-accent ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"}`}>
						<div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
							<Icon className={`w-4 h-4 ${css}`} />
						</div>
						<div>
							<p className="text-xl font-bold text-foreground leading-tight">{counts[key]}</p>
							<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{statusLabels[key as ContractStatus]}</p>
						</div>
					</button>
				))}
			</div>

			{/* Pipeline bar */}
			<div className="flex items-center gap-3">
				<div className="flex-1 flex items-center gap-1 h-3">
					{dashCfg.map(({ key, bar }) => {
						const w = total > 0 ? Math.max((counts[key] / total) * 100, counts[key] > 0 ? 8 : 2) : 20;
						return <div key={key} className={`h-full rounded-full ${bar} transition-all cursor-pointer hover:opacity-80`} style={{ width: `${w}%` }} onClick={() => onFilterChange(key as ContractStatus)} title={`${statusLabels[key as ContractStatus]}: ${counts[key]}`} />;
					})}
				</div>
				{(() => {
					const need = artists.filter((a) => a.status === "waiting" || a.status === "awaiting");
					if (!need.length) return null;
					return (
						<button onClick={() => onFilterChange("waiting")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--status-waiting))]/10 border border-[hsl(var(--status-waiting))]/20 shrink-0 hover:bg-[hsl(var(--status-waiting))]/20 transition-colors">
							<AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--status-waiting))]" />
							<span className="text-[11px] font-semibold text-foreground">{need.length} need attention</span>
						</button>
					);
				})()}
			</div>
		</div>
	);
}

// ═══════ ORG STAGE TRACKER (pill tabs — matches sample exactly) ═══════

export function OrgStageTracker({ stages, activeStage, onStageClick }: { stages: OrgStage[]; activeStage: StageName; onStageClick: (n: StageName) => void }) {
	return (
		<div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border">
			{stages.map((stage) => {
				const Icon = stageIcons[stage.name];
				const StatusIcon = statusIconMap[stage.status];
				const isActive = activeStage === stage.name;
				const isCommunication = stage.name === "communication";
				return (
					<button key={stage.name} onClick={() => onStageClick(stage.name)}
						className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
							isActive ? "gradient-brand text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
						}`}>
						<Icon className="w-3.5 h-3.5" />
						<span className="hidden xl:inline">{stage.label}</span>
						{!isCommunication && !isActive && <StatusIcon className={`w-3 h-3 ${statusIconColors[stage.status]}`} />}
					</button>
				);
			})}
		</div>
	);
}

// ═══════ EDITABLE STAGE FIELDS ═══════

const itemStatusSelectClass: Record<ContractItemStatus, string> = {
	required:       "text-[hsl(var(--status-confirmed))] bg-[hsl(var(--status-confirmed))]/10 border-[hsl(var(--status-confirmed))]/25",
	not_required:   "text-[hsl(var(--status-waiting))] bg-[hsl(var(--status-waiting))]/10 border-[hsl(var(--status-waiting))]/25",
	not_applicable: "text-muted-foreground bg-muted border-border",
};

export function EditableStageFields({
	fields,
	editing,
	onChange,
	currencySymbol,
	itemStatuses,
	onItemStatusChange,
}: {
	fields: Record<string, string>;
	editing: boolean;
	onChange: (k: string, v: string) => void;
	currencySymbol?: string;
	itemStatuses?: Record<string, ContractItemStatus>;
	onItemStatusChange?: (k: string, s: ContractItemStatus) => void;
}) {
	const visibleEntries = Object.entries(fields).filter(
		([label]) => (itemStatuses?.[label] ?? "required") !== "not_applicable"
	);

	return (
		<div className="space-y-4">
			{visibleEntries.map(([label, value]) => {
				const currentStatus: ContractItemStatus = itemStatuses?.[label] ?? "required";
				return (
					<div key={label}>
						<div className="flex items-center gap-2 mb-0.5">
							<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
								{label}{currencySymbol && ["Performance Fee", "Deposit", "Remaining Balance"].includes(label) ? ` (${currencySymbol})` : ""}
							</p>
							{onItemStatusChange && (
								<select
									value={currentStatus}
									onChange={(e) => onItemStatusChange(label, e.target.value as ContractItemStatus)}
									className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors ${itemStatusSelectClass[currentStatus]}`}
								>
									<option value="required">Required</option>
									<option value="not_required">Not Required</option>
									<option value="not_applicable">N/A</option>
								</select>
							)}
						</div>
						{editing ? (
							<textarea value={value} onChange={(e) => onChange(label, e.target.value)} rows={1} placeholder={`Enter ${label.toLowerCase()}...`} className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[36px]" />
						) : (
							<p className={`text-sm leading-relaxed ${value ? "text-foreground" : "text-muted-foreground italic"}`}>{value || "Not specified"}</p>
						)}
					</div>
				);
			})}
			{Object.entries(fields).some(([label]) => (itemStatuses?.[label] ?? "required") === "not_applicable") && (
				<div className="pt-2 border-t border-border">
					<p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
						<X className="w-3 h-3" /> Hidden Items (N/A)
					</p>
					<div className="flex flex-wrap gap-1.5">
						{Object.entries(fields)
							.filter(([label]) => (itemStatuses?.[label] ?? "required") === "not_applicable")
							.map(([label]) => (
								<button
									key={label}
									onClick={() => onItemStatusChange?.(label, "required")}
									title="Click to restore this item"
									className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-2 py-0.5 line-through hover:line-through-0 hover:text-foreground hover:border-primary/30 transition-all"
								>
									{label}
								</button>
							))}
					</div>
				</div>
			)}
		</div>
	);
}

// ═══════ LOGISTICS STAGE CONTENT (Flights, Hotel, Driver, Food) ═══════

export function LogisticsStageContent({ artist, currencySymbol }: { artist: ContractArtist; currencySymbol?: string }) {
	const l = artist.travelLogistics || {} as any;
	const flights = l.flights || [];
	const hotelRooms = l.hotelRooms || [];

	return (
		<div className="space-y-5">
			{/* Flights */}
			<div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
				<div className="flex items-center gap-2 mb-3">
					<div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"><Plane className="w-3.5 h-3.5 text-primary-foreground" /></div>
					<h4 className="text-sm font-bold text-foreground">Flights</h4>
					<Badge variant="outline" className="text-[10px]">{flights.length} flight{flights.length !== 1 ? "s" : ""}</Badge>
				</div>
				{flights.length === 0 ? (
					<p className="text-sm text-muted-foreground italic">No flights added yet</p>
				) : (
					<div className="space-y-2">{flights.map((f: any, i: number) => (
						<div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
							<div className="flex items-center gap-2">
								<Plane className="w-3.5 h-3.5 text-primary" />
								<span className="text-sm font-semibold text-foreground">{f.passengerName || "Passenger"}</span>
								{f.cost && (
									<Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
										{currencySymbol ? `${currencySymbol}${f.cost}` : f.cost}
									</Badge>
								)}
							</div>
							<p className="text-xs text-muted-foreground mt-1">{f.airport} — {f.date} {f.time ? `at ${f.time}` : ""}</p>
						</div>
					))}</div>
				)}
			</div>

			{/* Hotel */}
			<div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
				<div className="flex items-center gap-2 mb-3">
					<div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"><Hotel className="w-3.5 h-3.5 text-primary-foreground" /></div>
					<h4 className="text-sm font-bold text-foreground">Hotel & Rooms</h4>
					<Badge variant="outline" className="text-[10px]">{hotelRooms.length} room{hotelRooms.length !== 1 ? "s" : ""}</Badge>
				</div>
				{l.hotelName ? (
					<div className="p-3 rounded-lg border border-border bg-muted/20">
						<p className="text-sm font-semibold text-foreground">{l.hotelName}</p>
						{l.hotelAddress && <p className="text-xs text-muted-foreground">{l.hotelAddress}</p>}
						{(l.hotelCheckIn || l.hotelCheckOut) && <p className="text-xs text-muted-foreground mt-0.5">{l.hotelCheckIn || "?"} → {l.hotelCheckOut || "?"}</p>}
					</div>
				) : <p className="text-sm text-muted-foreground italic">No hotel assigned</p>}
			</div>

			{/* Driver */}
			<div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
				<div className="flex items-center gap-2 mb-3">
					<div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"><Car className="w-3.5 h-3.5 text-primary-foreground" /></div>
					<h4 className="text-sm font-bold text-foreground">Driver / Transfer</h4>
				</div>
				{l.driverName ? (
					<div className="p-3 rounded-lg border border-border bg-muted/20">
						<p className="text-sm font-semibold text-foreground">{l.driverName}</p>
						{l.driverPhone && <p className="text-xs text-muted-foreground">{l.driverPhone}</p>}
						{l.driverNotes && <p className="text-xs text-muted-foreground mt-1">{l.driverNotes}</p>}
					</div>
				) : <p className="text-sm text-muted-foreground italic">No driver assigned</p>}
			</div>

			{/* Food */}
			<div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"><UtensilsCrossed className="w-3.5 h-3.5 text-primary-foreground" /></div>
						<h4 className="text-sm font-bold text-foreground">Food & Catering</h4>
					</div>
					{artist.agreement?.foodVouchers && <Badge variant="outline" className="text-[10px] bg-[hsl(var(--status-confirmed))]/10 text-[hsl(var(--status-confirmed))]">✓ Vouchers Included</Badge>}
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Food Vouchers</p>
						<p className="text-sm font-medium text-foreground">{artist.agreement?.foodVouchers ? "Yes" : "No"}</p>
					</div>
					<div>
						<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Dietary Preferences</p>
						<p className="text-sm font-medium text-foreground">{artist.dietaryPreferences || "No restrictions"}</p>
					</div>
				</div>
			</div>

			{/* Pickup & Notes */}
			<div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
				<div className="flex items-center gap-2 mb-3">
					<div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-primary-foreground" /></div>
					<h4 className="text-sm font-bold text-foreground">Pickup, Dropoff & Notes</h4>
				</div>
				<div className="space-y-2">
					{[
						{ label: "Pickup Info", value: l.pickupInfo },
						{ label: "Dropoff Info", value: l.dropoffInfo },
						{ label: "Dietary Preferences", value: artist.dietaryPreferences },
						{ label: "Additional Notes", value: l.additionalNotes },
					].map(({ label, value }) => (
						<div key={label}>
							<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">{label}</p>
							<p className={`text-sm ${value ? "text-foreground" : "text-muted-foreground italic"}`}>{value || "Not specified"}</p>
						</div>
					))}
				</div>
			</div>

			<div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--status-invited))]/5 border border-[hsl(var(--status-invited))]/20">
				<AlertTriangle className="w-4 h-4 text-[hsl(var(--status-invited))]" />
				<p className="text-xs text-muted-foreground">To edit logistics details, use the <strong className="text-foreground">Travel & Logistics</strong> tab in the artist panel or the <strong className="text-foreground">Logistics Manager</strong> page. Changes will automatically reflect here.</p>
			</div>
		</div>
	);
}

// ═══════ STAGE NEGOTIATION ═══════

export function StageNegotiation({ negotiation, onSend, artistName }: { negotiation: NegotiationMessage[]; onSend: (msg: NegotiationMessage) => void; artistName: string }) {
	const [text, setText] = useState("");
	const handleSend = () => {
		if (!text.trim()) return;
		onSend({ id: `neg-${Date.now()}`, sender: "organizer", senderName: "Organizer", text: text.trim(), timestamp: new Date().toISOString(), type: "message" });
		setText("");
	};
	return (
		<div className="space-y-3">
			<h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Stage Discussion</h5>
			{negotiation.length > 0 && (
				<div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/20 border border-border">
					{negotiation.map((msg) => {
						const isOrg = msg.sender === "organizer";
						return (
							<div key={msg.id} className={`flex ${isOrg ? "justify-end" : "justify-start"}`}>
								<div className="max-w-[80%] space-y-0.5">
									<span className="text-[10px] font-semibold text-muted-foreground">{msg.senderName}</span>
									<div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${isOrg ? "gradient-brand text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>{msg.text}</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
			<div className="flex gap-2">
				<input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={`Message ${artistName}...`} className="flex-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
				<button onClick={handleSend} disabled={!text.trim()} className="px-3 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50 transition-all shadow-brand border-0"><Send className="w-3.5 h-3.5" /></button>
			</div>
		</div>
	);
}

// ═══════ ORG STAGE ACTIONS ═══════

export function OrgStageActions({ stage, onStatusChange, onSign, onSimulateArtistSign, artistName }: { stage: OrgStage; onStatusChange: (s: StageStatus) => void; onSign: (url: string) => void; onSimulateArtistSign: () => void; artistName: string }) {
	const [showSignPad, setShowSignPad] = useState(false);

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-medium text-muted-foreground">Status:</span>
				<Badge variant="outline" className={`text-[10px] font-semibold border ${stageStatusColors[stage.status]}`}>{stageStatusLabels[stage.status]}</Badge>
				{stage.artistSigned && <Badge variant="outline" className="text-[10px] border-[hsl(var(--status-confirmed))]/30 text-[hsl(var(--status-confirmed))] bg-[hsl(var(--status-confirmed))]/10"><Pen className="w-3 h-3 mr-1" /> Artist Signed</Badge>}
				{stage.organiserSigned && <Badge variant="outline" className="text-[10px] border-[hsl(var(--status-confirmed))]/30 text-[hsl(var(--status-confirmed))] bg-[hsl(var(--status-confirmed))]/10"><Pen className="w-3 h-3 mr-1" /> Organiser Signed</Badge>}
			</div>

			{showSignPad && <SignaturePadInline label="Organiser Signature" onSign={(url) => { onSign(url); setShowSignPad(false); }} onCancel={() => setShowSignPad(false)} />}

			{!showSignPad && (
				<div className="flex flex-wrap gap-2">
					{stage.status === "draft" && <button onClick={() => onStatusChange("sent")} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-semibold shadow-brand border-0"><Send className="w-3.5 h-3.5" /> Send to Artist</button>}
					{stage.status === "changes_requested" && <button onClick={() => onStatusChange("sent")} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-semibold shadow-brand border-0"><Send className="w-3.5 h-3.5" /> Re‑send Updated</button>}
					{(stage.status === "sent" || stage.status === "under_review" || (stage.status === "approved" && !stage.artistSigned)) && <button onClick={onSimulateArtistSign} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--status-awaiting))]/10 text-[hsl(var(--status-awaiting))] border border-[hsl(var(--status-awaiting))]/20 rounded-lg text-xs font-semibold hover:bg-[hsl(var(--status-awaiting))]/20 transition-colors"><Pen className="w-3.5 h-3.5" /> Simulate Artist Sign</button>}
					{stage.status === "waiting_organiser_signature" && !stage.organiserSigned && <button onClick={() => setShowSignPad(true)} className="flex items-center gap-1.5 px-4 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-semibold shadow-brand border-0"><Pen className="w-3.5 h-3.5" /> Sign as Organiser</button>}
					{stage.status === "completed" && (
						<div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--status-confirmed))]/10 border border-[hsl(var(--status-confirmed))]/20 w-full">
							<CheckCircle2 className="w-4 h-4 text-[hsl(var(--status-confirmed))]" />
							<span className="text-xs font-semibold text-foreground">This stage is fully signed and completed 🎉</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ═══════ INLINE SIGNATURE PAD ═══════

function SignaturePadInline({ onSign, onCancel, label }: { onSign: (url: string) => void; onCancel: () => void; label?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasDrawn, setHasDrawn] = useState(false);

	const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
		const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
		const r = c.getBoundingClientRect(); const sx = c.width / r.width; const sy = c.height / r.height;
		if ("touches" in e) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
		return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
	}, []);

	useEffect(() => { const ctx = canvasRef.current?.getContext("2d"); if (ctx) { ctx.strokeStyle = "hsl(240,30%,12%)"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; } }, []);

	const startDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setIsDrawing(true); };
	const draw = (e: React.MouseEvent | React.TouchEvent) => { if (!isDrawing) return; e.preventDefault(); const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasDrawn(true); };
	const endDraw = () => setIsDrawing(false);
	const clear = () => { const c = canvasRef.current; if (c) { c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHasDrawn(false); } };

	return (
		<div className="space-y-3">
			<p className="text-sm font-semibold text-foreground">{label || "Sign here"}</p>
			<div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
				<canvas ref={canvasRef} width={600} height={200} className="w-full h-[120px] cursor-crosshair touch-none" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
			</div>
			<div className="flex gap-2 justify-end">
				<button onClick={clear} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium"><Eraser className="w-3.5 h-3.5" /> Clear</button>
				<button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-medium">Cancel</button>
				<button disabled={!hasDrawn} onClick={() => canvasRef.current && onSign(canvasRef.current.toDataURL("image/png"))} className="flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50 shadow-brand border-0"><Check className="w-3.5 h-3.5" /> Confirm</button>
			</div>
		</div>
	);
}

// ═══════ GENERAL COMMUNICATION ═══════

export function GeneralCommunication({ messages, onSend, artistName }: { messages: { id: string; sender: string; senderName: string; text: string; timestamp: string }[]; onSend: (t: string) => void; artistName: string }) {
	const [text, setText] = useState("");
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center"><MessageSquare className="w-4 h-4 text-primary-foreground" /></div><h3 className="font-bold text-foreground">Communication</h3></div>
			<div className="bg-card rounded-xl border border-border p-4 space-y-3">
				{messages.length > 0 ? (
					<div className="max-h-64 overflow-y-auto space-y-2">
						{messages.map((msg) => { const isOrg = msg.sender === "organiser" || msg.sender === "organizer"; return (
							<div key={msg.id} className={`flex ${isOrg ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isOrg ? "gradient-brand text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}><span className="text-[10px] font-semibold opacity-70 block mb-0.5">{msg.senderName}</span>{msg.text}</div></div>
						); })}
					</div>
				) : <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>}
				<div className="flex gap-2 pt-2 border-t border-border">
					<input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onSend(text); setText(""); } }} placeholder={`Message ${artistName}...`} className="flex-1 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
					<button onClick={() => { if (text.trim()) { onSend(text); setText(""); } }} disabled={!text.trim()} className="px-3 py-2 gradient-brand text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50 shadow-brand border-0"><Send className="w-3.5 h-3.5" /></button>
				</div>
			</div>
		</div>
	);
}

// ═══════ INVITE LINK BAR ═══════

export function InviteLinkBar({ invitation }: { invitation: ContractInvitation }) {
	const [copied, setCopied] = useState(false);
	const fullLink = typeof window !== "undefined" ? `${window.location.origin}${invitation.invitationLink}` : invitation.invitationLink;
	const handleCopy = () => { navigator.clipboard.writeText(fullLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
	return (
		<div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
			<LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
			<div className="flex-1 text-xs font-mono text-muted-foreground truncate">{fullLink}</div>
			<button onClick={handleCopy} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Copy link">{copied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--status-confirmed))]" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}</button>
			<button onClick={() => window.open(invitation.invitationLink, "_blank")} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Open in new tab"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></button>
		</div>
	);
}
