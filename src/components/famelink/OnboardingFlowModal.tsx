"use client";

import { useState } from "react";
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

interface EventParticipation {
	id: string;
	eventId: string;
	status: string;
	workflowLogistics?: string;
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

interface OnboardingFlowModalProps {
	artistId: string;
	shows: BaseShow[];
	pendingRequests: EventRequest[];
	pendingParticipations?: EventParticipation[];
	hasLogistics: boolean;
	onDismiss: () => void;
	onShowCreated: () => void;
	onRequestResponded: () => void;
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
}

export function OnboardingFlowModal({
	artistId,
	shows,
	pendingRequests,
	pendingParticipations = [],
	hasLogistics,
	onDismiss,
	onShowCreated,
	onRequestResponded,
}: OnboardingFlowModalProps) {
	const router = useRouter();
	const [step, setStep] = useState<MainStep>("tasks");
	const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
	const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
	// For share_show step: map of showDate index → selected baseShowId
	const [slotShowMap, setSlotShowMap] = useState<Record<number, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const hasShows = shows.length > 0;
	const tasksComplete = hasShows && hasLogistics;

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
			requestedShowDates: [],
		})),
	];

	// Count how many performance slots this event wants
	const slots: string[] = selectedEvent?.requestedShowDates?.length
		? selectedEvent.requestedShowDates
		: selectedEvent?.showDates?.length
		? selectedEvent.showDates
		: selectedEvent?.startDate
		? [selectedEvent.startDate]
		: [];

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
		setStep("share_what");
	}

	function handleShareShow() {
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

		setSubmitting(true);
		try {
			const uniqueIds = [...new Set(selectedIds)];

			if (selectedEvent.type === "request" && selectedRequest) {
				// EventRequest flow — respond to the invite
				const res = await fetch(`/api/event-requests/${selectedRequest.id}/respond`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "accept", baseShowIds: uniqueIds }),
				});
				const result = await res.json();
				if (result.success) { setSubmitted(true); onRequestResponded(); }
			} else {
				// Participation flow — submit each show to the event
				const results = await Promise.all(
					uniqueIds.map((showId) =>
						fetch("/api/event-shows", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ eventId: selectedEvent.eventId, baseShowId: showId }),
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
					<div className="flex flex-col">
						<div className="p-5 pb-4 flex items-center gap-3 border-b border-purple-500/10">
							<button onClick={() => setStep("tasks")} className="text-white/40 hover:text-white/80 transition-colors">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<h2 className="text-base font-bold text-white">Where do you want to share?</h2>
								<p className="text-xs text-purple-200/50 mt-0.5">Send your show info to a FameLink invite event, or create a private link.</p>
							</div>
						</div>

						{allEventItems.length > 0 && (
							<div className="px-4 pt-4 pb-1">
								<p className="text-[10px] font-bold text-purple-400/50 tracking-widest uppercase mb-3">FameLink Invite Events</p>
								<div className="flex flex-col gap-2">
									{allEventItems.map((item) => (
										<button
											key={item.id}
											onClick={() => handleSelectEventItem(item)}
											className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group"
										>
											<div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center shrink-0 border border-purple-500/20">
												<Calendar className="h-5 w-5 text-purple-300/70" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-white text-sm truncate mb-0.5">{item.eventName}</p>
												<div className="flex items-center gap-1 text-xs text-purple-200/50 flex-wrap">
													{item.startDate && (
														<span className="flex items-center gap-1">
															<Calendar className="h-3 w-3" />
															{fmtRange(item.startDate, item.endDate || item.startDate)}
														</span>
													)}
													{item.venueName && (
														<>
															<span>·</span>
															<span className="flex items-center gap-1">
																<MapPin className="h-3 w-3" />
																{item.venueName}
															</span>
														</>
													)}
												</div>
												<div className="flex gap-1 mt-1.5 flex-wrap">
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 flex items-center gap-1">
														<Music className="h-2.5 w-2.5" /> Show Info
													</span>
												</div>
											</div>
											<ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
										</button>
									))}
								</div>
							</div>
						)}

						<div className="p-4 pb-5" />
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
							<button onClick={() => setStep("share_what")} className="text-white/40 hover:text-white/80 transition-colors">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<div>
								<h2 className="text-base font-bold text-white">Which show do you want to share?</h2>
								<p className="text-xs text-purple-200/50 mt-0.5">To {selectedEvent.eventName}</p>
							</div>
						</div>

						<div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
							{/* No shows yet */}
							{shows.length === 0 && !submitted && (
								<div className="p-4 rounded-xl bg-white/5 border border-purple-500/15 text-sm text-purple-200/60 text-center">
									No shows yet. Create a show first to share it.
								</div>
							)}

							{/* Slots info banner */}
							{slots.length > 1 && shows.length > 0 && (
								<div className="flex items-start gap-3 p-3.5 rounded-xl bg-pink-500/8 border border-pink-500/20 text-sm text-pink-200/80">
									<Calendar className="h-4 w-4 text-pink-400 shrink-0 mt-0.5" />
									<span>
										From your contract: the organiser allocated{" "}
										<span className="font-semibold text-pink-300">{slots.length} performance slots</span>.
										Assign a show to each date.
									</span>
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

							{/* Per-slot selectors */}
							{!submitted && shows.length > 0 && (
								<>
									{slots.length > 0 ? (
										slots.map((dateStr, idx) => (
											<div key={idx} className="flex flex-col gap-2">
												{/* Slot header */}
												<div className="flex items-center gap-3">
													<div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 border border-purple-500/30 shrink-0">
														{idx + 1}
													</div>
													<div>
														<p className="text-sm font-semibold text-white flex items-center gap-1.5">
															<Calendar className="h-3.5 w-3.5 text-purple-400" />
															{fmtDate(dateStr)}
														</p>
													</div>
												</div>

												{/* Show selector */}
												<div className="ml-10">
													<select
														value={slotShowMap[idx] || ""}
														onChange={(e) =>
															setSlotShowMap((prev) => ({ ...prev, [idx]: e.target.value }))
														}
														className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40"
													>
														<option value="" className="bg-[#0f0a1e] text-white/50">Select a show...</option>
														{shows.map((s) => (
															<option key={s.id} value={s.id} className="bg-[#0f0a1e] text-white">
																{s.name}
															</option>
														))}
													</select>
												</div>
											</div>
										))
									) : (
										// No specific dates — just pick one show
										<div>
											<p className="text-xs text-purple-300/50 mb-2 uppercase tracking-wider font-semibold">Select a show</p>
											<select
												value={slotShowMap[0] || ""}
												onChange={(e) => setSlotShowMap({ 0: e.target.value })}
												className="w-full bg-white/5 border border-purple-500/20 text-white text-sm rounded-xl px-3 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/40"
											>
												<option value="" className="bg-[#0f0a1e] text-white/50">Select a show...</option>
												{shows.map((s) => (
													<option key={s.id} value={s.id} className="bg-[#0f0a1e] text-white">
														{s.name}
													</option>
												))}
											</select>
										</div>
									)}

									{/* Submit button */}
									<Button
										onClick={handleSubmitShows}
										disabled={submitting || Object.values(slotShowMap).filter(Boolean).length === 0}
										className="w-full bg-[#bf1ed4] hover:bg-[#a61bb8] text-white rounded-xl h-11 font-semibold shadow-lg shadow-purple-500/20 mt-2 disabled:opacity-50"
									>
										{submitting ? (
											<Loader2 className="h-4 w-4 animate-spin mr-2" />
										) : (
											<Send className="h-4 w-4 mr-2" />
										)}
										Send Show Info
									</Button>
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
