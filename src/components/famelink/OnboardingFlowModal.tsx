"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import {
	X,
	ChevronRight,
	Music,
	Plane,
	Clock,
	CheckCircle2,
	Calendar,
	MapPin,
	ChevronLeft,
	Sparkles,
	Send,
	Loader2,
	ImageIcon,
	Link2,
} from "lucide-react";
// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRequest {
	id: string;
	eventId: string;
	status: string;
	message?: string;
	requestedShowDates: string[];
	event?: {
		id: string;
		name: string;
		venueName: string;
		startDate: string;
		endDate: string;
		showDates?: string[];
		logisticsEnabled?: boolean;
	} | null;
}

interface BaseShow {
	id: string;
	name: string;
	style?: string;
	profileImage?: string;
}

interface PerformanceDate {
	date: string; // YYYY-MM-DD
	label?: string; // e.g. "Opening Night"
	time?: string; // Start time, e.g. "20:00"
	endTime?: string; // End time, e.g. "21:00"
	location?: string; // Stage / venue area
	description?: string; // Organiser notes for this slot
}

interface EventParticipation {
	id: string;
	eventId: string;
	status: string;
	workflowLogistics?: string;
	workflowContract?: string;
	workflowShowInfo?: string;
	performanceDates?: string[]; // from API: contract performance dates YYYY-MM-DD
	event?: {
		id: string;
		name: string;
		venueName: string;
		startDate: string;
		endDate: string;
		showDates?: string[];
		logisticsEnabled?: boolean;
		contractEnabled?: boolean;
		showInfoEnabled?: boolean;
	} | null;
}

interface OnboardingFlowModalProps {
	artistId: string;
	shows: BaseShow[];
	pendingRequests: EventRequest[];
	pendingParticipations?: EventParticipation[];
	hasLogistics: boolean;
	initialStep?: MainStep;
	/** The show that triggered this modal (e.g. clicked "Share" on a specific show card) */
	initialShowId?: string;
	onDismiss: () => void;
	onShowCreated: () => void;
	onRequestResponded: () => void;
	/** Opens the "Generate Private Link" flow, optionally pre-selecting a show */
	onCreatePrivateLink?: (showId?: string) => void;
}

// ─── Step types ───────────────────────────────────────────────────────────────

type MainStep = "tasks" | "share_where" | "share_what" | "share_show" | "share_logistics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
	return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtRange(start: string, end: string) {
	const s = new Date(start);
	const e = new Date(end);
	const mo = s.toLocaleDateString("en-US", { month: "short" });
	if (s.toDateString() === e.toDateString())
		return `${mo} ${s.getDate()}, ${s.getFullYear()}`;
	return `${mo} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Unified event item for the "where to share" list
interface EventItem {
	id: string; // request id or participation id
	eventId: string;
	type: "request" | "participation";
	eventName: string;
	venueName: string;
	startDate: string;
	endDate: string;
	showDates: string[];
	requestedShowDates: string[];
	hasContract: boolean;
	hasLogistics: boolean;
	hasShowInfo: boolean;
	eventImage?: string;
}

export function OnboardingFlowModal({
	artistId,
	shows,
	pendingRequests,
	pendingParticipations = [],
	hasLogistics,
	initialStep,
	initialShowId,
	onDismiss,
	onShowCreated,
	onRequestResponded,
	onCreatePrivateLink,
}: OnboardingFlowModalProps) {
	const router = useRouter();
	const [step, setStep] = useState<MainStep>(initialStep || "tasks");
	const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
	const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
	// For share_show step: map of performanceDate index → selected baseShowId
	const [slotShowMap, setSlotShowMap] = useState<Record<number, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	// Performance dates fetched from contract (ArtistSchedule)
	const [contractPerformanceDates, setContractPerformanceDates] = useState<PerformanceDate[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);
	// Shows already submitted for the selected event (to filter them out)
	const [submittedShowIds, setSubmittedShowIds] = useState<Set<string>>(new Set());
	// Full submitted event show records { baseShowId, performanceDate }
	const [submittedEventShows, setSubmittedEventShows] = useState<{ baseShowId: string; performanceDate: string }[]>([]);

	const hasShows = shows.length > 0;
	const tasksComplete = hasShows && hasLogistics;

	// When an event is selected, fetch performance dates from contract and already-submitted shows
	useEffect(() => {
		if (!selectedEvent) return;
		setContractPerformanceDates([]);
		setSubmittedShowIds(new Set());
		setSubmittedEventShows([]);
		setLoadingDates(true);

		const toYMD = (raw: string): string | null => {
			if (!raw) return null;
			if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
			const iso = raw.substring(0, 10);
			if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
			const p = new Date(raw);
			if (isNaN(p.getTime())) return null;
			return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
		};

		// Fetch contract data to get performance dates added by stage manager
		fetch(`/api/contracts/${selectedEvent.eventId}`)
			.then((r) => r.json())
			.then((contractData) => {
				// Find this artist's contract entry
				const artists: any[] = contractData.artists || [];
				const myEntry = artists.find((a: any) => a.id === artistId || a.famelinkArtistId === artistId);
				const perfs: PerformanceDate[] = [];

				if (myEntry?.agreement?.schedule?.performances?.length) {
					for (const p of myEntry.agreement.schedule.performances) {
						if (p.date) {
							const ymd = toYMD(p.date);
							if (ymd) {
								perfs.push({
									date: ymd,
									label: p.title || undefined,
									time: p.time || undefined,
									endTime: p.endTime || undefined,
									location: p.location || undefined,
									description: p.description || undefined,
								});
							}
						}
					}
				}

				// If no contract performances found, fall back to event's requestedShowDates / showDates
				if (perfs.length === 0) {
					const fallbackDates = selectedEvent.requestedShowDates?.length
						? selectedEvent.requestedShowDates
						: selectedEvent.showDates || [];
					for (const d of fallbackDates) {
						const ymd = toYMD(d);
						if (ymd) perfs.push({ date: ymd });
					}
				}

				setContractPerformanceDates(perfs);
			})
			.catch(() => {
				// Fall back to event dates on error
				const toYMDSafe = (raw: string) => {
					try { return toYMD(raw); } catch { return null; }
				};
				const fallback = (selectedEvent.requestedShowDates?.length ? selectedEvent.requestedShowDates : selectedEvent.showDates || [])
					.map(toYMDSafe)
					.filter((d): d is string => Boolean(d))
					.map((date) => ({ date }));
				setContractPerformanceDates(fallback);
			})
			.finally(() => setLoadingDates(false));

		// Fetch already-submitted event shows for this event to know which base shows are used
		fetch(`/api/event-shows?eventId=${selectedEvent.eventId}`)
			.then((r) => r.json())
			.then((data) => {
				if (data.success && data.data) {
					const eventShows: any[] = data.data.eventShows || [];
					const ids = new Set<string>(
						eventShows.map((s: any) => s.baseShowId || s.showId).filter(Boolean)
					);
					setSubmittedShowIds(ids);
					setSubmittedEventShows(
						eventShows
							.filter((s: any) => s.baseShowId)
							.map((s: any) => ({
								baseShowId: s.baseShowId,
								performanceDate: s.overrides?.performanceDate || s.performanceDate || "",
							}))
					);
				}
			})
			.catch(() => {/* ignore */});
	}, [selectedEvent, artistId]);

	// Build unified list of events to display in "where to share"
	const allEventItems: EventItem[] = [
		...pendingRequests.map((r) => ({
			id: r.id,
			eventId: r.eventId,
			type: "request" as const,
			eventName: r.event?.name || "Event Invite",
			venueName: r.event?.venueName || "",
			startDate: r.event?.startDate || "",
			endDate: r.event?.endDate || "",
			showDates: r.event?.showDates || [],
			requestedShowDates: r.requestedShowDates || [],
			hasContract: true,
			hasLogistics: r.event?.logisticsEnabled !== false,
			hasShowInfo: true,
			eventImage: (r.event as any)?.eventImage || (r.event as any)?.image || "",
		})),
		...pendingParticipations.map((p) => ({
			id: p.id,
			eventId: p.eventId,
			type: "participation" as const,
			eventName: p.event?.name || "Event",
			venueName: p.event?.venueName || "",
			startDate: p.event?.startDate || "",
			endDate: p.event?.endDate || "",
			showDates: p.event?.showDates || [],
			// Use contract performance dates as the slot list so date cards show correctly
			requestedShowDates: p.performanceDates?.length
				? p.performanceDates
				: (p.event?.showDates || []),
			hasContract: p.workflowContract !== "Not Required" && p.event?.contractEnabled !== false,
			hasLogistics: p.workflowLogistics !== "Not Required" && p.event?.logisticsEnabled !== false,
			hasShowInfo: p.workflowShowInfo !== "Not Required" && p.event?.showInfoEnabled !== false,
			eventImage: (p.event as any)?.eventImage || (p.event as any)?.image || "",
		})),
	];

	// Performance slots: prefer contract dates, fall back to event dates
	const slots: PerformanceDate[] = contractPerformanceDates.length > 0
		? contractPerformanceDates
		: selectedEvent?.requestedShowDates?.length
		? selectedEvent.requestedShowDates.map((d) => ({ date: d.length >= 10 ? d.substring(0, 10) : d }))
		: selectedEvent?.showDates?.length
		? selectedEvent.showDates.map((d) => ({ date: d.length >= 10 ? d.substring(0, 10) : d }))
		: selectedEvent?.startDate
		? [{ date: selectedEvent.startDate.substring(0, 10) }]
		: [];

	// Map from slot date (YYYY-MM-DD) → baseShowId already submitted for that date
	const submittedByDate = new Map<string, string>(
		submittedEventShows
			.filter((s) => s.performanceDate)
			.map((s) => [s.performanceDate.substring(0, 10), s.baseShowId])
	);

	// Shows that haven't been submitted to this event yet
	const availableShows = shows.filter((s) => !submittedShowIds.has(s.id));

	// Slot count for a given event item (used in the event cards badge)
	function getSlotCount(item: EventItem): number {
		return item.requestedShowDates?.length || item.showDates?.length || 1;
	}

	function fmtSlotDate(d: string): string {
		// d is YYYY-MM-DD
		const parts = d.split("-");
		if (parts.length < 3) return d;
		const dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
		if (isNaN(dt.getTime())) return d;
		return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
	}

	// ── Task 1: Create show ───────────────────────────────────────
	const task1Status = hasShows ? "done" : "in_progress";
	const task2Status = hasLogistics ? "done" : hasShows ? "in_progress" : "not_started";

	// Logistics task is only relevant if at least one pending event requires it
	const logisticsRequired =
		pendingRequests.some((r) => r.event?.logisticsEnabled !== false) ||
		pendingParticipations.some(
			(p) =>
				p.event?.logisticsEnabled !== false &&
				(p.workflowLogistics ?? "Required") !== "Not Required",
		);

	// ── Handlers ──────────────────────────────────────────────────

	function handleTaskClick(task: 1 | 2) {
		if (task === 1) {
			onDismiss();
			router.push(`/famelink/${artistId}/shows/create`);
		} else {
			onDismiss();
			router.push(`/famelink/${artistId}?tab=logistics`);
		}
	}

	function handleSelectEventItem(item: EventItem) {
		setSelectedEvent(item);
		// keep selectedRequest in sync for the respond API call
		const req = pendingRequests.find((r) => r.id === item.id) || null;
		setSelectedRequest(req);
		setSlotShowMap({});
		setSubmitted(false);
		// Go directly to show assignment — skip the "what to share" step
		setStep("share_show");
	}

	function handleShareShow() {
		setSlotShowMap({});
		setStep("share_show");
	}

	function handleShareLogistics() {
		onDismiss();
		router.push(`/famelink/${artistId}?tab=logistics`);
	}

	async function handleSubmitShows() {
		if (!selectedEvent) return;
		const selectedIds = Object.values(slotShowMap).filter(Boolean);
		if (selectedIds.length === 0) return;

		// Build slot entries: { showId, performanceDate }
		const slotEntries = Object.entries(slotShowMap)
			.filter(([, showId]) => Boolean(showId))
			.map(([idxStr, showId]) => {
				const idx = Number(idxStr);
				const slot = slots[idx];
				const performanceDate = slot?.date || "";
				return { showId, performanceDate };
			});

		setSubmitting(true);
		try {
			if (selectedEvent.type === "request" && selectedRequest) {
				// EventRequest flow — respond to the invite with per-show dates
				const showSlots = slotEntries.map(({ showId, performanceDate }) => ({
					baseShowId: showId,
					performanceDate,
				}));
				const res = await fetch(`/api/event-requests/${selectedRequest.id}/respond`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "accept", showSlots }),
				});
				const result = await res.json();
				if (result.success) { setSubmitted(true); onRequestResponded(); }
			} else {
				// Participation flow — submit each show with its performance date
				const results = await Promise.all(
					slotEntries.map(({ showId, performanceDate }) =>
						fetch("/api/event-shows", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								eventId: selectedEvent.eventId,
								baseShowId: showId,
								performanceDate,
							}),
						}).then((r) => r.json())
					)
				);
				if (results.some((r) => r.success)) { setSubmitted(true); onRequestResponded(); }
			}
		} finally {
			setSubmitting(false);
		}
	}

	// ── Render helpers ────────────────────────────────────────────

	function TaskBadge({ status }: { status: "done" | "in_progress" | "not_started" }) {
		if (status === "done")
			return (
				<span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
					<CheckCircle2 className="h-3 w-3" /> Done
				</span>
			);
		if (status === "in_progress")
			return (
				<span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
					<Clock className="h-3 w-3" /> In progress
				</span>
			);
		return (
			<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/8 text-white/40 border border-white/10">
				Not started
			</span>
		);
	}

	// ─────────────────────────────────────────────────────────────
	// RENDER
	// ─────────────────────────────────────────────────────────────

	return (
		<Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
			<DialogContent className="bg-[#0f0a1e] border border-purple-500/20 text-white p-0 max-w-[92vw] sm:max-w-md w-full rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
				<VisuallyHidden.Root><DialogTitle>FameLink Onboarding</DialogTitle></VisuallyHidden.Root>

				{/* ── STEP: Tasks ─────────────────────────────────── */}
				{step === "tasks" && (
					<div className="flex flex-col">
						{/* Header */}
						<div className="p-6 pb-4 flex items-start justify-between gap-4">
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
									<Sparkles className="h-6 w-6 text-white" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-xl font-bold text-white">Welcome to FameLink!</h2>
										<span className="text-xs text-purple-300/50 font-medium">
											{[hasShows, !logisticsRequired || hasLogistics].filter(Boolean).length}/{logisticsRequired ? 2 : 1}
										</span>
									</div>
									<p className="text-sm text-purple-200/60 mt-0.5 leading-tight">
										Finish {logisticsRequired ? "these 2 quick tasks" : "this quick task"} so organisers can find and book you.
									</p>
								</div>
							</div>
							<button onClick={onDismiss} className="text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5">
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* Tasks */}
						<div className="px-5 pb-2 flex flex-col gap-3">
							{/* Task 1 */}
							<button
								onClick={() => handleTaskClick(1)}
								className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group"
							>
								<div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task1Status === "done" ? "bg-green-500/20" : "bg-[#bf1ed4]/25"}`}>
									<Music className={`h-5 w-5 ${task1Status === "done" ? "text-green-400" : "text-[#e066f5]"}`} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1 flex-wrap">
										<span className="text-[10px] font-bold text-purple-400/60 tracking-widest uppercase">Task 1</span>
										<TaskBadge status={task1Status} />
									</div>
									<p className="font-semibold text-white text-sm">Create your first show</p>
									<p className="text-xs text-purple-200/50 mt-0.5">Add what you perform so organisers know what to book.</p>
								</div>
								<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
							</button>

							{/* Task 2 — only shown when at least one event requires logistics */}
							{logisticsRequired && (
								<button
									onClick={() => handleTaskClick(2)}
									className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group"
								>
									<div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task2Status === "done" ? "bg-green-500/20" : "bg-purple-500/25"}`}>
										<Plane className={`h-5 w-5 ${task2Status === "done" ? "text-green-400" : "text-purple-400"}`} />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<span className="text-[10px] font-bold text-purple-400/60 tracking-widest uppercase">Task 2</span>
											<TaskBadge status={task2Status} />
										</div>
										<p className="font-semibold text-white text-sm">Set up your logistics info</p>
										<p className="text-xs text-purple-200/50 mt-0.5">Travelers, passports and preferences — fill once, reuse forever.</p>
									</div>
									<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
								</button>
							)}
						</div>

						{/* Pending invites CTA */}
						{allEventItems.length > 0 && (
							<div className="px-5 mt-3 mb-1">
								<button
									onClick={() => setStep("share_where")}
									className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/15 transition-all group"
								>
									<div className="flex items-center gap-2">
										<div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
										<span className="text-sm font-semibold text-pink-300">
											{allEventItems.length} event invite{allEventItems.length > 1 ? "s" : ""} waiting
										</span>
									</div>
									<ChevronRight className="h-4 w-4 text-pink-400/60 group-hover:text-pink-300 transition-colors" />
								</button>
							</div>
						)}

						<button
							onClick={onDismiss}
							className="mt-4 mb-5 mx-auto text-xs text-purple-300/40 hover:text-purple-300/70 transition-colors"
						>
							I'll do it later
						</button>
					</div>
				)}

				{/* ── STEP: Where to share (pick event) ────────── */}
				{step === "share_where" && (
					<div className="flex flex-col max-h-[85vh]">
						<div className="p-5 pb-4 flex items-center gap-3 border-b border-purple-500/10 shrink-0">
							<button onClick={() => initialStep === "share_where" ? onDismiss() : setStep("tasks")} className="text-white/40 hover:text-white/80 transition-colors">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<h2 className="text-base font-bold text-white">Where do you want to share?</h2>
								<p className="text-xs text-purple-200/50 mt-0.5">Send to a FameLink invite event, or create a private link.</p>
							</div>
						</div>

						<div className="overflow-y-auto flex-1 px-4 pt-4 pb-5">
							{allEventItems.length === 0 ? (
								<div className="py-6 text-center text-sm text-purple-300/50">
									No pending events. You'll appear here once an organiser invites you.
								</div>
							) : (
								<>
									<p className="text-[10px] font-bold text-purple-400/50 tracking-widest uppercase mb-3">FameLink Invite Events</p>
									<div className="flex flex-col gap-2">
										{allEventItems.map((item) => {
											const slotCount = getSlotCount(item);
											return (
												<button
													key={item.id}
													onClick={() => handleSelectEventItem(item)}
													className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group relative"
												>
													{/* Slot count badge — top right */}
													{slotCount > 0 && (
														<span className="absolute top-2.5 right-10 min-w-[20px] h-5 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
															{slotCount}
														</span>
													)}

													{/* Event image / fallback */}
													<div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center">
														{item.eventImage ? (
															<img src={item.eventImage} alt={item.eventName} className="w-full h-full object-cover" />
														) : (
															<Calendar className="h-6 w-6 text-purple-300/60" />
														)}
													</div>

													<div className="flex-1 min-w-0 pr-6">
														<p className="font-semibold text-white text-sm truncate mb-0.5">{item.eventName}</p>
														{(item.startDate || item.venueName) && (
															<p className="text-xs text-purple-200/50 flex items-center gap-1 mb-1.5">
																{item.startDate && (
																	<span className="flex items-center gap-1">
																		<Calendar className="h-3 w-3" />
																		{fmtRange(item.startDate, item.endDate || item.startDate)}
																	</span>
																)}
																{item.venueName && (
																	<>
																		{item.startDate && <span>·</span>}
																		<span className="flex items-center gap-1">
																			<MapPin className="h-3 w-3" />
																			{item.venueName}
																		</span>
																	</>
																)}
															</p>
														)}
														{/* Workflow badges */}
														<div className="flex gap-1 flex-wrap">
															{item.hasContract && (
																<span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-purple-300/80 border border-purple-500/20 flex items-center gap-1">
																	<Music className="h-2.5 w-2.5" /> Contract
																</span>
															)}
															{item.hasLogistics && (
																<span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-purple-300/80 border border-purple-500/20 flex items-center gap-1">
																	<Plane className="h-2.5 w-2.5" /> Logistics
																</span>
															)}
															{item.hasShowInfo && (
																<span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-purple-300/80 border border-purple-500/20 flex items-center gap-1">
																	<Music className="h-2.5 w-2.5" /> Show Info
																</span>
															)}
														</div>
													</div>
													<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
												</button>
											);
										})}
									</div>
								</>
							)}

							{/* ── Or: generate a shareable private link ── */}
							<div className="flex items-center gap-3 my-5">
								<div className="flex-1 h-px bg-purple-500/15" />
								<span className="text-[10px] font-bold text-purple-400/50 tracking-widest uppercase">Or</span>
								<div className="flex-1 h-px bg-purple-500/15" />
							</div>
							<button
								onClick={() => {
									onDismiss();
									onCreatePrivateLink?.(initialShowId);
								}}
								disabled={shows.length === 0}
								className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-purple-500/15"
							>
								<div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
									<Link2 className="h-5 w-5 text-pink-400" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-white text-sm">Create a private link</p>
									<p className="text-xs text-purple-200/50 mt-0.5">
										{shows.length === 0
											? "Create a show first to generate a link"
											: "Generate a shareable link for anyone"}
									</p>
								</div>
								<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
							</button>
						</div>
					</div>
				)}

				{/* ── STEP: What to share (show vs logistics) ──── */}
				{step === "share_what" && selectedEvent && (
					<div className="flex flex-col">
						<div className="p-5 pb-4 flex items-center gap-3 border-b border-purple-500/10">
							<button onClick={() => setStep("share_where")} className="text-white/40 hover:text-white/80 transition-colors">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<h2 className="text-base font-bold text-white">What do you want to share?</h2>
								<p className="text-xs text-purple-200/50 mt-0.5">To {selectedEvent.eventName}</p>
							</div>
						</div>

						<div className="p-4 flex flex-col gap-3">
							<button
								onClick={handleShareShow}
								className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group"
							>
								<div className="w-10 h-10 rounded-xl bg-[#bf1ed4]/25 flex items-center justify-center shrink-0">
									<Music className="h-5 w-5 text-[#e066f5]" />
								</div>
								<div className="flex-1">
									<p className="font-semibold text-white text-sm">Share a show</p>
									<p className="text-xs text-purple-200/50 mt-0.5">Pick which show profile to send</p>
								</div>
								<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
							</button>

							<button
								onClick={handleShareLogistics}
								className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group"
							>
								<div className="w-10 h-10 rounded-xl bg-purple-500/25 flex items-center justify-center shrink-0">
									<Plane className="h-5 w-5 text-purple-400" />
								</div>
								<div className="flex-1">
									<p className="font-semibold text-white text-sm">Share logistics info</p>
									<p className="text-xs text-purple-200/50 mt-0.5">Pick which details to send</p>
								</div>
								<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
							</button>
						</div>
					</div>
				)}

				{/* ── STEP: Pick show per slot ─────────────────── */}
				{step === "share_show" && selectedEvent && (
					<div className="flex flex-col max-h-[85vh]">
						<div className="p-5 pb-4 flex items-center gap-3 border-b border-purple-500/10 shrink-0">
							<button onClick={() => setStep("share_where")} className="text-white/40 hover:text-white/80 transition-colors">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<h2 className="text-base font-bold text-white">Which show do you want to share?</h2>
								<p className="text-xs text-purple-200/50 mt-0.5">To {selectedEvent.eventName}</p>
							</div>
						</div>

						<div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
							{/* Loading dates */}
							{loadingDates && (
								<div className="flex items-center justify-center py-6 gap-2 text-purple-300/50">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="text-sm">Loading performance dates…</span>
								</div>
							)}

							{/* Submitted success */}
							{submitted && (
								<div className="flex flex-col items-center py-8 gap-3">
									<div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
										<CheckCircle2 className="h-7 w-7 text-green-400" />
									</div>
									<p className="font-semibold text-white text-base">Show info sent!</p>
									<p className="text-sm text-purple-200/60 text-center">The organiser will review and confirm your slot.</p>
									<Button onClick={onDismiss} className="mt-2 bg-purple-600 hover:bg-purple-700 rounded-xl px-6">
										Done
									</Button>
								</div>
							)}

							{/* No shows yet */}
							{!submitted && !loadingDates && shows.length === 0 && (
								<div className="p-4 rounded-xl bg-white/5 border border-purple-500/15 text-sm text-purple-200/60 text-center">
									No shows yet. Create a show first to share it.
								</div>
							)}

							{/* Slots info banner */}
							{!submitted && !loadingDates && slots.length > 1 && shows.length > 0 && (
								<div className="flex items-start gap-3 p-3.5 rounded-xl bg-pink-500/8 border border-pink-500/20 text-sm text-pink-200/80">
									<Calendar className="h-4 w-4 text-pink-400 shrink-0 mt-0.5" />
									<span>
										From your contract: the organiser allocated{" "}
										<span className="font-semibold text-pink-300">{slots.length} performance slots</span>.
										Assign a show to each date.
									</span>
								</div>
							)}

							{/* Per-slot card pickers */}
							{!submitted && !loadingDates && shows.length > 0 && (
								<>
									{slots.length > 0 ? (
										slots.map((slot, idx) => {
											const selectedId = slotShowMap[idx] || "";
											const alreadySubmittedShowId = submittedByDate.get(slot.date.substring(0, 10));
											const alreadySubmittedShow = alreadySubmittedShowId
												? shows.find((s) => s.id === alreadySubmittedShowId)
												: undefined;
											const isSlotDone = !!alreadySubmittedShowId;
											return (
												<div
													key={idx}
													className={`rounded-xl border overflow-hidden ${isSlotDone ? "border-green-500/30 bg-green-500/5" : "border-purple-500/20 bg-white/4"}`}
												>
													{/* Slot header */}
													<div className={`flex items-center gap-3 px-4 py-3 border-b ${isSlotDone ? "border-green-500/20 bg-green-500/10" : "border-purple-500/15 bg-purple-500/8"}`}>
														<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${isSlotDone ? "bg-green-500/30 text-green-300 border-green-500/40" : "bg-pink-500/30 text-pink-300 border-pink-500/30"}`}>
															{isSlotDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-semibold text-white flex items-center gap-1.5">
																<Calendar className={`h-3.5 w-3.5 ${isSlotDone ? "text-green-400" : "text-pink-400"}`} />
																{fmtSlotDate(slot.date)}
																{(slot.time || slot.endTime) && (
																	<span className="text-xs font-normal text-purple-300/70">
																		{[slot.time, slot.endTime].filter(Boolean).join(" – ")}
																	</span>
																)}
															</p>
															{slot.label && (
																<p className="text-xs text-purple-300/60 mt-0.5">{slot.label}</p>
															)}
															{slot.location && (
																<p className="text-xs text-purple-300/50 mt-0.5 flex items-center gap-1">
																	<MapPin className="h-3 w-3" />
																	{slot.location}
																</p>
															)}
															{slot.description && (
																<p className="text-xs text-purple-300/50 mt-0.5">{slot.description}</p>
															)}
														</div>
														{isSlotDone && (
															<span className="text-xs text-green-400 font-semibold shrink-0">Submitted</span>
														)}
														{!isSlotDone && selectedId && (
															<CheckCircle2 className="h-4 w-4 text-pink-400 shrink-0" />
														)}
													</div>

													{/* Already submitted — show which show was submitted */}
													{isSlotDone ? (
														<div className="flex items-center gap-3 px-4 py-3">
															<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-600/30 to-emerald-600/30 flex items-center justify-center shrink-0 border border-green-500/20 overflow-hidden">
																{(alreadySubmittedShow as any)?.profileImage ? (
																	<img src={(alreadySubmittedShow as any).profileImage} alt={alreadySubmittedShow?.name} className="w-full h-full object-cover" />
																) : (
																	<CheckCircle2 className="h-4 w-4 text-green-400" />
																)}
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-semibold text-green-300 truncate">
																	{alreadySubmittedShow?.name || "Show submitted"}
																</p>
																<p className="text-xs text-green-400/60 mt-0.5">Show info submitted for this date</p>
															</div>
														</div>
													) : (
													/* Show options */
													<div className="flex flex-col divide-y divide-purple-500/10">
														{availableShows.length === 0 ? (
															<div className="px-4 py-3 text-xs text-purple-300/50 text-center">
																All shows already submitted for this event.
															</div>
														) : (
															availableShows.map((show) => {
																const isSelected = selectedId === show.id;
																return (
																	<button
																		key={show.id}
																		onClick={() =>
																			setSlotShowMap((prev) => ({
																				...prev,
																				[idx]: isSelected ? "" : show.id,
																			}))
																		}
																		className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
																			isSelected
																				? "bg-pink-500/15 border-l-2 border-pink-400"
																				: "hover:bg-white/5 border-l-2 border-transparent"
																		}`}
																	>
																		{/* Show image / icon */}
																		<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center shrink-0 border border-purple-500/20 overflow-hidden">
																			{show.profileImage ? (
																				<img
																					src={show.profileImage}
																					alt={show.name}
																					className="w-full h-full object-cover"
																				/>
																			) : (
																				<ImageIcon className="h-4 w-4 text-purple-300/60" />
																			)}
																		</div>

																		{/* Show name + style */}
																		<div className="flex-1 min-w-0">
																			<p className={`text-sm font-semibold truncate ${isSelected ? "text-pink-200" : "text-white"}`}>
																				{show.name}
																			</p>
																			{show.style && (
																				<p className="text-xs text-purple-300/50 truncate mt-0.5">{show.style}</p>
																			)}
																		</div>

																		{/* Radio indicator */}
																		<div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
																			isSelected
																				? "border-pink-400 bg-pink-400"
																				: "border-white/30"
																		}`}>
																			{isSelected && (
																				<div className="w-1.5 h-1.5 rounded-full bg-white" />
																			)}
																		</div>
																	</button>
																);
															})
														)}
													</div>
													)}
												</div>
											);
										})
									) : (
										// No specific dates — pick one show with card UI
										<div className="rounded-xl border border-purple-500/20 bg-white/4 overflow-hidden">
											<div className="px-4 py-3 border-b border-purple-500/15 bg-purple-500/8">
												<p className="text-xs font-bold text-purple-400/70 uppercase tracking-widest">Select a show</p>
											</div>
											<div className="flex flex-col divide-y divide-purple-500/10">
												{availableShows.map((show) => {
													const isSelected = (slotShowMap[0] || "") === show.id;
													return (
														<button
															key={show.id}
															onClick={() =>
																setSlotShowMap({ 0: isSelected ? "" : show.id })
															}
															className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
																isSelected
																	? "bg-pink-500/15 border-l-2 border-pink-400"
																	: "hover:bg-white/5 border-l-2 border-transparent"
															}`}
														>
															<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center shrink-0 border border-purple-500/20 overflow-hidden">
																{show.profileImage ? (
																	<img src={show.profileImage} alt={show.name} className="w-full h-full object-cover" />
																) : (
																	<ImageIcon className="h-4 w-4 text-purple-300/60" />
																)}
															</div>
															<div className="flex-1 min-w-0">
																<p className={`text-sm font-semibold truncate ${isSelected ? "text-pink-200" : "text-white"}`}>
																	{show.name}
																</p>
																{show.style && (
																	<p className="text-xs text-purple-300/50 truncate mt-0.5">{show.style}</p>
																)}
															</div>
															<div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
																isSelected ? "border-pink-400 bg-pink-400" : "border-white/30"
															}`}>
																{isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
															</div>
														</button>
													);
												})}
											</div>
										</div>
									)}

									{/* Submit button — only show if there are unsubmitted slots to fill */}
									{Object.values(slotShowMap).filter(Boolean).length > 0 && (
										<Button
											onClick={handleSubmitShows}
											disabled={submitting}
											className="w-full bg-[#bf1ed4] hover:bg-[#a61bb8] text-white rounded-xl h-11 font-semibold shadow-lg shadow-purple-500/20 mt-1 disabled:opacity-50"
										>
											{submitting ? (
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
											) : (
												<Send className="h-4 w-4 mr-2" />
											)}
											Send Show Info
										</Button>
									)}
								</>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ─── Dashboard Banner (shown below profile after dismissing popup) ─────────────

interface FinishSettingUpBannerProps {
	artistId: string;
	shows: BaseShow[];
	pendingRequests: EventRequest[];
	pendingParticipations?: EventParticipation[];
	hasLogistics: boolean;
	onOpenModal: () => void;
}

export function FinishSettingUpBanner({
	artistId,
	shows,
	pendingRequests,
	pendingParticipations = [],
	hasLogistics,
	onOpenModal,
}: FinishSettingUpBannerProps) {
	const logisticsRequired =
		pendingRequests.some((r) => r.event?.logisticsEnabled !== false) ||
		pendingParticipations.some(
			(p) =>
				p.event?.logisticsEnabled !== false &&
				(p.workflowLogistics ?? "Required") !== "Not Required",
		);
	const totalCount = logisticsRequired ? 2 : 1;
	const completedCount = [shows.length > 0, !logisticsRequired || hasLogistics].filter(Boolean).length;
	const totalInvites = pendingRequests.length + pendingParticipations.length;

	// Only show banner when there are pending invites that need action
	if (totalInvites === 0) return null;

	return (
		<button
			onClick={onOpenModal}
			className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group mb-4"
		>
			{/* Icon */}
			<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center shrink-0 border border-purple-500/20">
				<Sparkles className="h-4 w-4 text-purple-300" />
			</div>

			{/* Text */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<p className="text-[10px] font-bold text-purple-400/60 tracking-widest uppercase">Finish Setting Up</p>
					<span className="text-[10px] text-purple-300/40 font-medium">{completedCount}/{totalCount}</span>
					{totalInvites > 0 && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/20">
							{totalInvites} invite{totalInvites > 1 ? "s" : ""}
						</span>
					)}
				</div>
				{/* Progress pills */}
				<div className="flex items-center gap-1.5 mt-1.5">
					{[
						{ label: "Create show", done: shows.length > 0, icon: Music, show: true },
						{ label: "Logistics", done: hasLogistics, icon: Plane, show: logisticsRequired },
					].filter((t) => t.show).map(({ label, done, icon: Icon }) => (
						<span key={label} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${done ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-white/40 border-white/10"}`}>
							<Icon className="h-2.5 w-2.5" />
							{label}
						</span>
					))}
				</div>
			</div>

			<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
		</button>
	);
}
