"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { useToast } from "@/hooks/use-toast";
import {
	Calendar,
	MapPin,
	Check,
	Plus,
	Music,
	Clock,
	ArrowLeft,
	Loader2,
	CheckCircle,
	XCircle,
	AlertCircle,
	Edit,
} from "lucide-react";
import { motion } from "framer-motion";

interface EventInfo {
	id: string;
	name: string;
	venueName: string;
	startDate: string;
	endDate: string;
	description?: string;
	showDates?: string[];
}

interface BaseShow {
	id: string;
	artistId: string;
	name: string;
	slug: string;
	style?: string;
	duration: number;
	description?: string;
}

interface Participation {
	id: string;
	eventId: string;
	artistId: string;
	status: "pending" | "submitted" | "confirmed" | "declined";
	baseShowId?: string;
	eventShowId?: string;
}

type Step =
	| "loading"
	| "joined"
	| "select-show"
	| "no-shows"
	| "confirm"
	| "success"
	| "already-submitted";

export default function JoinEventConfirmPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [step, setStep] = useState<Step>("loading");
	const [event, setEvent] = useState<EventInfo | null>(null);
	const [shows, setShows] = useState<BaseShow[]>([]);
	const [participation, setParticipation] = useState<Participation | null>(
		null,
	);
	const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [artistId, setArtistId] = useState<string | null>(null);
	const [artistName, setArtistName] = useState<string>("");
	const [isResubmit, setIsResubmit] = useState(false);
	const [existingShowIds, setExistingShowIds] = useState<string[]>([]);
	const [activeEventShows, setActiveEventShows] = useState<{ baseShowId: string; performanceDate: string | null; showName: string }[]>([]);
	const [performanceSlots, setPerformanceSlots] = useState<string[]>([]); // YYYY-MM-DD dates from contract

	const fetchData = useCallback(async () => {
		try {
			const authRes = await fetch("/api/auth/me?role=artist");
			const authData = await authRes.json();

			if (!authData.success || authData.data?.role !== "artist") {
				console.log("[JOIN-EVENT] Auth check failed, redirecting to login");
				// To break potential loops, check if we're already coming from the auth page
				const url = new URL(window.location.href);
				if (url.searchParams.get("auth_failed") === "true") {
					setStep("select-show"); // Fallback to let them try to load data anyway, or show error
					toast({
						title: "Authentication Issue",
						description: "We couldn't verify your artist account. Please try signing in again.",
						variant: "destructive",
					});
					return;
				}
				router.push(`/famelink-auth?joinEventId=${eventId}&auth_failed=true`);
				return;
			}
			setArtistId(authData.data.userId);
			setArtistName(authData.data.artistName || "");

			const res = await fetch(`/api/join-event/${eventId}`);
			const data = await res.json();
			if (!data.success) {
				toast({
					title: "Error",
					description: data.error?.message || "Failed to load event",
					variant: "destructive",
				});
				router.push("/");
				return;
			}

			setEvent(data.data.event);
			setShows(data.data.shows || []);
			const p = data.data.participation;
			setParticipation(p);

			if (p && (p.status === "submitted" || p.status === "confirmed")) {
				// Check if the artist still has Event_Shows for this event
				// If not (e.g. show was deleted), allow re-registration
				let hasActiveEventShows = false;
				let submittedBaseShowIds: string[] = [];
				let enrichedShows: { baseShowId: string; performanceDate: string | null; showName: string }[] = [];
				try {
					const esRes = await fetch(
						`/api/event-shows?eventId=${eventId}`,
					);
					const esData = await esRes.json();
					const activeShows = esData.data?.eventShows || [];
					hasActiveEventShows =
						esData.success && activeShows.length > 0;
					submittedBaseShowIds = activeShows
						.map((es: any) => es.baseShowId)
						.filter(Boolean);
					enrichedShows = activeShows.map((es: any) => ({
						baseShowId: es.baseShowId || "",
						performanceDate: es.overrides?.performanceDate || es.performanceDate || null,
						showName: es.overrides?.name || (typeof es.snapshotJson === "object" ? es.snapshotJson?.name : null) || "Show",
					}));
				} catch {}

				setActiveEventShows(enrichedShows);

				// Fetch performance slots from the event/contract
				try {
					const eventData = data.data.event;
					const slots: string[] = [];
					// Try contract first
					const contractRes = await fetch(`/api/contracts/${eventId}`);
					const contractData = await contractRes.json();
					const authRes2 = await fetch("/api/auth/me?role=artist");
					const authData2 = await authRes2.json();
					const myId = authData2.data?.userId;
					const artists: any[] = contractData.artists || [];
					const myEntry = artists.find((a: any) => a.id === myId || a.famelinkArtistId === myId || a.email === authData2.data?.email);
					const perfs: any[] = myEntry?.agreement?.schedule?.performances || [];
					const toYMD = (raw: string) => {
						if (!raw) return null;
						if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
						const iso = raw.substring(0, 10);
						return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
					};
					for (const perf of perfs) {
						const ymd = toYMD(perf.date || "");
						if (ymd && !slots.includes(ymd)) slots.push(ymd);
					}
					// Fall back to event showDates
					if (slots.length === 0 && eventData?.showDates?.length) {
						for (const d of eventData.showDates) {
							const ymd = toYMD(d);
							if (ymd && !slots.includes(ymd)) slots.push(ymd);
						}
					}
					setPerformanceSlots(slots);
				} catch {}

				if (!hasActiveEventShows) {
					// Old participation exists but no Event_Shows — allow re-registration
					setIsResubmit(true);
					setStep("select-show");
				} else {
					// Pre-load existing shows even if not in edit mode yet
					setExistingShowIds(submittedBaseShowIds);
					setSelectedShowIds(submittedBaseShowIds);

					const url = new URL(window.location.href);
					if (
						url.searchParams.get("edit") === "true" &&
						(p.status === "submitted" || p.status === "confirmed")
					) {
						setIsResubmit(true);
						setStep("select-show");
					} else {
						setStep("already-submitted");
					}
				}
			} else if (!p) {
				// Fresh join — artist just accepted the invite for the first time
				setStep("joined");
			} else if ((data.data.shows || []).length === 0) {
				setStep("no-shows");
			} else {
				setStep("select-show");
			}
		} catch (err) {
			console.error("Error loading join-event data:", err);
			toast({
				title: "Error",
				description: "Failed to load event data",
				variant: "destructive",
			});
		}
	}, [eventId, router, toast]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleJoinEvent = async () => {
		try {
			const res = await fetch(`/api/join-event/${eventId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "join" }),
			});
			const data = await res.json();
			if (data.success) setParticipation(data.data.participation);
		} catch (err) {
			console.error("Error joining event:", err);
		}
	};

	useEffect(() => {
		if (
			(step === "joined" ||
				step === "select-show" ||
				step === "no-shows") &&
			!participation
		) {
			handleJoinEvent();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step]);

	const toggleShowSelection = (showId: string) => {
		setSelectedShowIds((prev) =>
			prev.includes(showId)
				? prev.filter((id) => id !== showId)
				: [...prev, showId],
		);
	};

	const handleSubmitShow = async () => {
		if (selectedShowIds.length === 0) return;
		setSubmitting(true);
		try {
			const res = await fetch(`/api/join-event/${eventId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: isResubmit ? "resubmit-shows" : "submit-show",
					baseShowIds: selectedShowIds,
				}),
			});
			const data = await res.json();
			if (data.success) {
				setParticipation(data.data.participation);
				// Refresh event shows so the status page shows per-slot status
				try {
					const esRes = await fetch(`/api/event-shows?eventId=${eventId}`);
					const esData = await esRes.json();
					const activeShows = esData.data?.eventShows || [];
					setActiveEventShows(activeShows.map((es: any) => ({
						baseShowId: es.baseShowId || "",
						performanceDate: es.overrides?.performanceDate || es.performanceDate || null,
						showName: es.overrides?.name || (typeof es.snapshotJson === "object" ? es.snapshotJson?.name : null) || "Show",
					})));
				} catch {}
				setStep("already-submitted");
				try {
					if (typeof (window as any).io === "undefined") {
						const script = document.createElement("script");
						script.src = "/socket.io/socket.io.js";
						await new Promise<void>((resolve, reject) => {
							script.onload = () => resolve();
							script.onerror = () => reject();
							document.head.appendChild(script);
						});
					}
					const socket = (window as any).io({
						transports: ["websocket"],
						upgrade: false,
					});
					// Build show name from selected shows
					const selectedShowNames = shows
						.filter((s) => selectedShowIds.includes(s.id))
						.map((s) => s.name)
						.join(", ");
					// Wait for connection before emitting
					socket.on("connect", () => {
						socket.emit("famelink_show_submitted", {
							eventId,
							artistId,
							artistName,
							showName: selectedShowNames,
							showCount: selectedShowIds.length,
							isResubmit,
						});
						// Small delay to ensure the message is sent before disconnecting
						setTimeout(() => socket.disconnect(), 500);
					});
				} catch {
					/* best-effort */
				}
			} else {
				toast({
					title: "Error",
					description:
						data.error?.message || "Failed to submit shows",
					variant: "destructive",
				});
			}
		} catch (err) {
			console.error("Error submitting shows:", err);
			toast({
				title: "Error",
				description: "Failed to submit shows",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleDecline = async () => {
		setSubmitting(true);
		try {
			await fetch(`/api/join-event/${eventId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "decline" }),
			});
			toast({ title: "Event declined" });
			router.push(artistId ? `/famelink/${artistId}` : "/");
		} catch {
			toast({
				title: "Error",
				description: "Failed to decline",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleCreateShow = () => {
		if (typeof window !== "undefined")
			sessionStorage.setItem("joinEventId", eventId);
		if (artistId) router.push(`/famelink/${artistId}/shows/create`);
	};

	const handleGoToDashboard = () => {
		if (artistId) router.push(`/famelink/${artistId}`);
	};

	const formatDate = (dateStr: string) => {
		try {
			return new Date(dateStr).toLocaleDateString("en-US", {
				weekday: "short",
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return dateStr;
		}
	};

	if (step === "loading") {
		return (
			<div className="min-h-screen bg-[#06020f] flex items-center justify-center">
				<Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#06020f] text-white relative overflow-hidden">
			{/* Ambient glow */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[140px]" />
				<div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-pink-600/6 blur-[140px]" />
			</div>

			<div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">
				<div className="w-full max-w-md space-y-5 pt-4">
					{/* Logo */}
					<motion.div
						className="text-center"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<div className="relative inline-block mb-2">
							<div className="absolute inset-0 bg-purple-500/15 rounded-2xl blur-xl scale-150" />
							<FameLinkLogo width={56} height={56} />
						</div>
					</motion.div>

					{/* Event Info */}
					{event && (
						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.1 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5"
						>
							<h2 className="text-lg font-bold mb-2">
								{event.name}
							</h2>
							<div className="space-y-1.5 text-sm text-gray-400">
								{event.venueName && (
									<div className="flex items-center gap-2">
										<MapPin className="h-3.5 w-3.5 text-purple-400" />
										<span>{event.venueName}</span>
									</div>
								)}
								<div className="flex items-center gap-2">
									<Calendar className="h-3.5 w-3.5 text-pink-400" />
									<span>
										{formatDate(event.startDate)}
										{event.endDate &&
											event.endDate !==
												event.startDate && (
												<>
													{" "}
													—{" "}
													{formatDate(event.endDate)}
												</>
											)}
									</span>
								</div>
							</div>
						</motion.div>
					)}

					{/* STEP: Already submitted */}
					{step === "already-submitted" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 space-y-4"
						>
							<h2 className="text-lg font-semibold text-white">
								{participation?.status === "confirmed"
									? "You're confirmed for this event!"
									: "Show Submission Status"}
							</h2>

							{/* Per-slot status */}
							{performanceSlots.length > 0 ? (
								<div className="space-y-2">
									{performanceSlots.map((slotDate, idx) => {
										const submitted = activeEventShows.find(
											(es) => es.performanceDate?.substring(0, 10) === slotDate,
										);
										const slotLabel = new Date(slotDate + "T00:00:00").toLocaleDateString("en-US", {
											weekday: "short", month: "short", day: "numeric",
										});
										return (
											<div
												key={slotDate}
												className={`flex items-center gap-3 p-3 rounded-xl border ${
													submitted
														? "border-green-500/30 bg-green-500/8"
														: "border-yellow-500/30 bg-yellow-500/8"
												}`}
											>
												<div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
													submitted ? "bg-green-500/20" : "bg-yellow-500/20"
												}`}>
													{submitted
														? <CheckCircle className="h-4 w-4 text-green-400" />
														: <Clock className="h-4 w-4 text-yellow-400" />
													}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-semibold text-white flex items-center gap-2">
														<Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
														{slotLabel}
													</p>
													<p className={`text-xs mt-0.5 ${submitted ? "text-green-400" : "text-yellow-400"}`}>
														{submitted
															? `Submitted${submitted.showName ? ` · ${submitted.showName}` : ""}`
															: "Show not submitted yet"}
													</p>
												</div>
												{!submitted && (
													<button
														onClick={() => { setIsResubmit(true); setStep("select-show"); }}
														className="text-xs text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400 px-2.5 py-1 rounded-lg transition-colors shrink-0"
													>
														Submit
													</button>
												)}
											</div>
										);
									})}
								</div>
							) : (
								/* Fallback: no slot info, show simple status */
								<div className="text-center space-y-3 py-2">
									<div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
										<CheckCircle className="h-7 w-7 text-green-400" />
									</div>
									<p className="text-gray-400 text-sm">
										{participation?.status === "confirmed"
											? "The organizer has assigned you. Check your dashboard for details."
											: "Waiting for the organizer to review and assign your show."}
									</p>
									<Badge
										className={`${
											participation?.status === "confirmed"
												? "bg-green-500/15 text-green-300 border border-green-500/20"
												: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20"
										}`}
									>
										{participation?.status === "confirmed" ? "Confirmed" : "Pending"}
									</Badge>
								</div>
							)}

							<div className="flex flex-col gap-3 pt-1">
								<Button
									onClick={handleGoToDashboard}
									className="w-full py-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-base font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
								>
									Go to Dashboard
								</Button>
								<Button
									variant="ghost"
									onClick={() => {
										setIsResubmit(true);
										setStep("select-show");
									}}
									className="w-full py-5 text-purple-300 hover:text-white hover:bg-white/[0.04] rounded-xl"
								>
									<Edit className="mr-2 h-4 w-4" />
									Update Shows
								</Button>
							</div>
						</motion.div>
					)}

					{/* STEP: Just joined — thank-you screen */}
					{step === "joined" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 space-y-4 text-center"
						>
							<div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
								<CheckCircle className="h-7 w-7 text-green-400" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-white">
									Thanks for joining the event!
								</h3>
								<p className="text-sm text-gray-400 mt-1.5">
									Management will share the details with you
									soon.
								</p>
							</div>
							<Button
								onClick={handleGoToDashboard}
								className="w-full py-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-base font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							>
								Return to Dashboard
							</Button>
						</motion.div>
					)}

					{/* STEP: No shows yet */}
					{step === "no-shows" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 space-y-4"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
									<AlertCircle className="h-5 w-5 text-yellow-400" />
								</div>
								<div>
									<h3 className="font-semibold text-white">
										Create Your Show First
									</h3>
									<p className="text-sm text-gray-400">
										You don't have any shows yet.
									</p>
								</div>
							</div>
							<div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
								<p className="text-sm text-gray-400">
									Your event participation has been saved.
									Once you create a show, come back here or
									use your dashboard to submit it.
								</p>
							</div>
							<Button
								onClick={handleCreateShow}
								className="w-full py-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-base font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							>
								<Plus className="mr-2 h-4 w-4" />
								Create Your Show
							</Button>
							<Button
								onClick={handleDecline}
								variant="ghost"
								className="w-full py-5 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-xl"
								disabled={submitting}
							>
								<XCircle className="mr-2 h-4 w-4" />
								I'm not performing
							</Button>
						</motion.div>
					)}

					{/* STEP: Select a show */}
					{step === "select-show" && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 space-y-4"
						>
							<div>
								<h3 className="text-lg font-semibold text-white">
									{isResubmit
										? "Edit Your Show Selection"
										: "Select Your Shows"}
								</h3>
								<p className="text-sm text-gray-400 mt-1">
									{isResubmit
										? "Change which shows to offer for this event."
										: "Choose one or more shows for this event, or create a new one."}
								</p>
							</div>

							{selectedShowIds.length > 0 && (
								<Badge className="bg-green-500/15 text-green-300 border border-green-500/20">
									{selectedShowIds.length} show
									{selectedShowIds.length > 1 ? "s" : ""}{" "}
									selected
								</Badge>
							)}

							<div className="space-y-2.5">
								{shows.map((show) => {
									const isSelected = selectedShowIds.includes(
										show.id,
									);
									const wasAlreadySubmitted = existingShowIds.includes(show.id);
									return (
										<div
											key={show.id}
											onClick={() =>
												toggleShowSelection(show.id)
											}
											className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
												isSelected
													? "border-pink-500/50 bg-pink-500/10 shadow-lg shadow-pink-500/5"
													: "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
											}`}
										>
											<div className="flex items-center justify-between">
												<div>
													<h4 className="font-medium flex items-center gap-2 text-white">
														<Music className="h-4 w-4 text-pink-400" />
														{show.name}
														{wasAlreadySubmitted && (
															<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
																Already submitted
															</span>
														)}
													</h4>
													<p className="text-sm text-gray-500 mt-1">
														{show.style && (
															<>{show.style} · </>
														)}
														<Clock className="inline h-3 w-3 mr-1" />
														{show.duration} min
													</p>
												</div>
												<div
													className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
														isSelected
															? "border-pink-400 bg-pink-500"
															: "border-white/20"
													}`}
												>
													{isSelected && (
														<Check className="h-3 w-3 text-white" />
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<Button
								onClick={handleCreateShow}
								variant="ghost"
								className="w-full border border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-purple-500/30 rounded-xl py-4"
							>
								<Plus className="mr-2 h-4 w-4" />
								Create New Show
							</Button>

							<div className="flex gap-3 pt-1">
								{!isResubmit && (
									<Button
										onClick={handleDecline}
										variant="ghost"
										className="text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-xl"
										disabled={submitting}
									>
										Decline
									</Button>
								)}
								{isResubmit && (
									<Button
										onClick={handleGoToDashboard}
										variant="ghost"
										className="text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-xl"
									>
										Cancel
									</Button>
								)}
								<Button
									onClick={handleSubmitShow}
									disabled={
										selectedShowIds.length === 0 ||
										submitting
									}
									className="flex-1 py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-base font-semibold shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
								>
									{submitting ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Check className="mr-2 h-4 w-4" />
									)}
									{isResubmit
										? `Update Shows (${selectedShowIds.length})`
										: `Submit ${selectedShowIds.length > 1 ? `${selectedShowIds.length} Shows` : "Show"}`}
								</Button>
							</div>
						</motion.div>
					)}

					{/* STEP: Confirm */}
					{step === "confirm" && selectedShowIds.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 space-y-4"
						>
							<h3 className="text-lg font-semibold">
								Confirm Submission
							</h3>
							<p className="text-sm text-gray-400">
								Your show info will be shared with the
								organizer. Your original show profiles stay
								unchanged.
							</p>
							<div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-1">
								<p className="text-xs text-gray-500">
									Selected show
									{selectedShowIds.length > 1 ? "s" : ""}:
								</p>
								{selectedShowIds.map((id) => {
									const show = shows.find((s) => s.id === id);
									return show ? (
										<p
											key={id}
											className="font-medium flex items-center gap-2 text-sm"
										>
											<Music className="h-3.5 w-3.5 text-pink-400" />
											{show.name}
										</p>
									) : null;
								})}
							</div>
							<div className="flex gap-3">
								<Button
									variant="ghost"
									onClick={() => setStep("select-show")}
									className="text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-xl"
								>
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back
								</Button>
								<Button
									onClick={handleSubmitShow}
									disabled={submitting}
									className="flex-1 py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-semibold shadow-lg shadow-green-500/20"
								>
									{submitting
										? "Submitting..."
										: "Confirm & Submit"}
								</Button>
							</div>
						</motion.div>
					)}

					{/* STEP: Success */}
					{step === "success" && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-8 text-center space-y-4"
						>
							<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
								<CheckCircle className="h-8 w-8 text-green-400" />
							</div>
							<h2 className="text-xl font-semibold">
								Your show has been submitted!
							</h2>
							<p className="text-gray-400 text-sm">
								The organizer will review your submission.
								You'll see updates in your dashboard.
							</p>
							<Button
								onClick={handleGoToDashboard}
								className="w-full py-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-base font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							>
								Go to Dashboard
							</Button>
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
}
