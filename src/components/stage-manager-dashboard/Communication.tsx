"use client";

/**
 * Communication — Stage Manager Dashboard
 *
 * PRIMARY DATA SOURCE (for artist list):
 *   /api/events/{eventId}/artists  → Same as Show Management (68+ artists)
 *   Fields: artistName, realName, performanceDate, status, is_confirmed
 *
 * MESSAGES:
 *   /api/contracts/{eventId}/conversations  → All messages for this event
 *   Filter client-side by artistId. Messages: { id, artistId, sender, senderName, text, timestamp }
 *
 * EVENT INFO:
 *   /api/events/{eventId} → { name, startDate, venueName }
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Loader2, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	artistId: string;
	sender: "organiser" | "artist";
	senderName: string;
	text: string;
	timestamp: string;
}

interface Artist {
	id: string;
	name: string;
	realName: string;
	status: string;
	performanceDate: string;
}

interface Thread {
	artist: Artist;
	messages: Message[];
}

function fmtTime(iso: string) {
	if (!iso) return "";
	try {
		return new Date(iso).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return iso;
	}
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() || "")
		.join("");
}

const AVATAR_COLORS = [
	"from-fuchsia-500 to-violet-600",
	"from-pink-500 to-rose-600",
	"from-blue-500 to-indigo-600",
	"from-emerald-500 to-teal-600",
	"from-orange-400 to-amber-600",
];

function avatarColor(name: string) {
	const code = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
	return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

interface Props {
	providedEventId?: string;
}

export default function Communication({ providedEventId }: Props) {
	const [artists, setArtists] = useState<Artist[]>([]);
	const [allMessages, setAllMessages] = useState<Message[]>([]);
	const [eventName, setEventName] = useState("");
	const [eventDate, setEventDate] = useState("");
	const [venueName, setVenueName] = useState("");
	const [loading, setLoading] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [msgText, setMsgText] = useState("");
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	// ── Load all data ───────────────────────────────────────────────────
	useEffect(() => {
		if (!providedEventId) return;

		const load = async () => {
			setLoading(true);
			try {
				const [artistRes, msgRes, evRes] = await Promise.all([
					fetch(`/api/events/${providedEventId}/artists`),
					fetch(`/api/contracts/${providedEventId}/conversations`),
					fetch(`/api/events/${providedEventId}`),
				]);

				// Artists
				const artistData = await artistRes.json();
				const rawArtists: any[] = artistData?.data || [];

				// Deduplicate by id
				const artistMap = new Map<string, Artist>();
				rawArtists.forEach((a) => {
					const key = a.id;
					if (!artistMap.has(key)) {
						artistMap.set(key, {
							id: a.id,
							name: a.artistName || a.stageName || a.name || "Unknown",
							realName: a.realName || a.legalName || "",
							status:
								a.status === "confirmed" || a.is_confirmed
									? "confirmed"
									: "pending",
							performanceDate: a.performanceDate || a.performance_date || "",
						});
					}
				});
				const artistList = Array.from(artistMap.values());
				setArtists(artistList);
				if (artistList.length > 0 && !selectedId) {
					setSelectedId(artistList[0].id);
				}

				// Messages
				const msgData = await msgRes.json();
				setAllMessages(msgData?.messages || []);

				// Event
				const evData = await evRes.json();
				const ev = evData?.data || evData;
				setEventName(ev?.name || "");
				setEventDate(ev?.startDate || ev?.date || "");
				setVenueName(ev?.venueName || "");
			} catch (e) {
				console.error("Communication load error:", e);
			} finally {
				setLoading(false);
			}
		};

		load();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [providedEventId]);

	// Scroll to bottom
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [selectedId, allMessages]);

	// ── Computed ────────────────────────────────────────────────────────
	const threads: Thread[] = useMemo(() => {
		return artists.map((a) => ({
			artist: a,
			messages: allMessages
				.filter((m) => m.artistId === a.id)
				.sort(
					(x, y) =>
						new Date(x.timestamp).getTime() -
						new Date(y.timestamp).getTime(),
				),
		}));
	}, [artists, allMessages]);

	const filteredThreads = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return threads;
		return threads.filter(
			(t) =>
				t.artist.name.toLowerCase().includes(q) ||
				t.artist.realName.toLowerCase().includes(q),
		);
	}, [threads, search]);

	const selectedThread = useMemo(
		() => threads.find((t) => t.artist.id === selectedId) || null,
		[threads, selectedId],
	);

	// Unread = artist-sent messages
	const unreadCount = (thread: Thread) =>
		thread.messages.filter((m) => m.sender === "artist").length;

	// ── Send message ────────────────────────────────────────────────────
	const handleSend = async () => {
		if (!msgText.trim() || !selectedId || !providedEventId) return;
		setSending(true);
		try {
			const body = {
				artistId: selectedId,
				sender: "organiser" as const,
				senderName: `Stage Manager (${eventName})`,
				text: msgText.trim(),
				timestamp: new Date().toISOString(),
			};
			const res = await fetch(
				`/api/contracts/${providedEventId}/conversations`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				},
			);
			const data = await res.json();
			if (data.success) {
				const newMsg: Message = {
					id: data.message?.id || `local-${Date.now()}`,
					...body,
				};
				setAllMessages((prev) => [...prev, newMsg]);
				setMsgText("");
			}
		} catch (e) {
			console.error("Send error:", e);
		} finally {
			setSending(false);
		}
	};

	// ── Render ──────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#f6f5fb] px-6 py-6">
			{/* Page header */}
			<h1 className="text-2xl font-semibold text-slate-900">Communication</h1>
			<p className="mt-0.5 text-sm text-slate-500">
				Central message hub{" "}
				<span className="text-fuchsia-500">linked to artist files</span> and{" "}
				<span className="text-fuchsia-500">events</span>
			</p>

			{/* 3-panel layout */}
			<div className="mt-5 flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
				{/* ── LEFT: artist list ─────────────────────────────────── */}
				<div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{/* Search */}
					<div className="p-3 border-b border-slate-100">
						<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
							<Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search artists..."
								className="flex-1 min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
							/>
						</div>
					</div>

					{/* List */}
					<div className="flex-1 overflow-y-auto">
						{filteredThreads.length === 0 ? (
							<p className="py-10 text-center text-xs text-slate-400">
								No artists found
							</p>
						) : (
							filteredThreads.map((t) => {
								const unread = unreadCount(t);
								const isActive = selectedId === t.artist.id;
								return (
									<button
										key={t.artist.id}
										type="button"
										onClick={() => setSelectedId(t.artist.id)}
										className={cn(
											"flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors",
											isActive
												? "bg-slate-100"
												: "hover:bg-slate-50",
										)}
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between gap-2">
												<p className="truncate text-sm font-semibold text-slate-900">
													{t.artist.name}
												</p>
												{unread > 0 && (
													<span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[10px] font-bold text-white">
														{unread}
													</span>
												)}
											</div>
											<p className="truncate text-xs text-slate-400">
												{eventName || "—"}
											</p>
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>

				{/* ── MIDDLE: messages ──────────────────────────────────── */}
				<div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					{!selectedThread ? (
						<div className="flex flex-1 items-center justify-center text-slate-400">
							<div className="text-center">
								<MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-20" />
								<p className="text-sm">Select an artist</p>
							</div>
						</div>
					) : (
						<>
							{/* Header */}
							<div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
								<div>
									<p className="text-sm font-semibold text-slate-900">
										{selectedThread.artist.name}
									</p>
									<p className="text-xs text-slate-400">{eventName}</p>
								</div>
								{/* Filter tabs (visual only — messages have no category field) */}
								<div className="flex items-center gap-1">
									{["All", "Agreement", "Logistics", "Show"].map(
										(tab) => (
											<span
												key={tab}
												className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer select-none transition-colors"
											>
												{tab}
											</span>
										),
									)}
								</div>
							</div>

							{/* Messages */}
							<div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
								{selectedThread.messages.length === 0 ? (
									<div className="flex h-full items-center justify-center text-sm text-slate-400">
										No messages yet. Start the conversation below.
									</div>
								) : (
									selectedThread.messages.map((msg) => (
										<div key={msg.id}>
											{/* Sender meta row */}
											<div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
												<span className="font-semibold text-slate-800">
													{msg.senderName}
												</span>
												<span
													className={cn(
														"rounded px-1.5 py-0.5 text-[10px] font-medium",
														msg.sender === "organiser"
															? "bg-violet-100 text-violet-700"
															: "bg-slate-100 text-slate-600",
													)}
												>
													{msg.sender === "organiser"
														? "Stage Manager"
														: "Artist"}
												</span>
												<span className="ml-auto text-slate-400">
													{fmtTime(msg.timestamp)}
												</span>
											</div>
											{/* Bubble */}
											<div
												className={cn(
													"max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
													msg.sender === "organiser"
														? "ml-auto bg-fuchsia-600 text-white"
														: "bg-slate-50 border border-slate-200 text-slate-800",
												)}
											>
												{msg.text}
											</div>
										</div>
									))
								)}
								<div ref={bottomRef} />
							</div>

							{/* Input */}
							<div className="border-t border-slate-100 px-4 py-3">
								<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
									<input
										value={msgText}
										onChange={(e) => setMsgText(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												handleSend();
											}
										}}
										placeholder="Type a message..."
										className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
									/>
									<button
										type="button"
										onClick={handleSend}
										disabled={sending || !msgText.trim()}
										className="flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-40"
									>
										{sending ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Send className="h-3.5 w-3.5" />
										)}
										Send
									</button>
								</div>
							</div>
						</>
					)}
				</div>

				{/* ── RIGHT: context + status ───────────────────────────── */}
				{selectedThread && (
					<div className="flex w-56 shrink-0 flex-col gap-3">
						{/* Context card */}
						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Context
							</p>
							<div className="space-y-3 text-xs">
								<CtxRow label="Artist" value={selectedThread.artist.name} />
								<CtxRow label="Event" value={eventName || "—"} />
								{eventDate && (
									<CtxRow
										label="Date"
										value={eventDate.slice(0, 10)}
									/>
								)}
								{venueName && (
									<CtxRow label="Venue" value={venueName} />
								)}
								{selectedThread.artist.realName && (
									<CtxRow
										label="Real Name"
										value={selectedThread.artist.realName}
									/>
								)}
							</div>
						</div>

						{/* Status card */}
						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Status
							</p>
							<div className="space-y-2.5 text-xs">
								<StsRow
									label="Booking"
									badge={
										selectedThread.artist.status === "confirmed"
											? { label: "Confirmed", cls: "bg-green-50 text-green-700 border-green-200" }
											: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" }
									}
								/>
								<StsRow
									label="Messages"
									badge={{
										label: `${selectedThread.messages.length}`,
										cls: "bg-violet-50 text-violet-700 border-violet-200",
									}}
								/>
								{selectedThread.artist.performanceDate && (
									<StsRow
										label="Show Date"
										badge={{
											label: selectedThread.artist.performanceDate.slice(
												0,
												10,
											),
											cls: "bg-blue-50 text-blue-700 border-blue-200",
										}}
									/>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CtxRow({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
				{label}
			</p>
			<p className="mt-0.5 font-semibold text-slate-800 leading-snug">
				{value}
			</p>
		</div>
	);
}

function StsRow({
	label,
	badge,
}: {
	label: string;
	badge: { label: string; cls: string };
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<span className="text-slate-500">{label}</span>
			<span
				className={cn(
					"rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
					badge.cls,
				)}
			>
				{badge.label}
			</span>
		</div>
	);
}
