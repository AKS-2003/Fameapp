"use client";

import { useEffect, useState, useCallback } from "react";
import {
	Loader2,
	Plus,
	Clock,
	X,
	Share2,
	Printer,
	Download,
	GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────────────────

interface Workshop {
	id: string;
	title: string;
	instructor?: string;
	room: string;
	day: string; // "Day 1", "Day 2", ...
	venue: string;
	startTime: string; // "09:00"
	endTime: string; // "09:50"
	level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL LEVELS";
	color?: string; // tailwind border-left color class
	avatarUrl?: string;
}

interface WorkshopCreatorProps {
	providedEventId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_ROOMS = ["Room A", "Room B", "Room C", "Room D"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL LEVELS"] as const;
const LEVEL_COLORS: Record<string, string> = {
	BEGINNER: "bg-fuchsia-100 text-fuchsia-700",
	INTERMEDIATE: "bg-blue-100 text-blue-700",
	ADVANCED: "bg-red-100 text-red-700",
	"ALL LEVELS": "bg-emerald-100 text-emerald-700",
};
const CARD_BORDER_COLORS = [
	"border-l-orange-400",
	"border-l-blue-400",
	"border-l-teal-400",
	"border-l-yellow-400",
	"border-l-fuchsia-400",
	"border-l-red-400",
];

const emptyForm = {
	title: "",
	instructor: "",
	room: DEFAULT_ROOMS[0],
	day: "Day 1",
	venue: "Main Venue",
	startTime: "09:00",
	endTime: "09:50",
	level: "BEGINNER" as Workshop["level"],
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkshopCreator({ providedEventId }: WorkshopCreatorProps) {
	const [workshops, setWorkshops] = useState<Workshop[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// UI state
	const [selectedVenue, setSelectedVenue] = useState("Main Venue");
	const [venues, setVenues] = useState(["Main Venue"]);
	const [selectedDay, setSelectedDay] = useState("Day 1");
	const [days, setDays] = useState(["Day 1", "Day 2"]);
	const [rooms, setRooms] = useState(DEFAULT_ROOMS);
	const [showAddWorkshop, setShowAddWorkshop] = useState(false);
	const [form, setForm] = useState({ ...emptyForm });
	const [formError, setFormError] = useState("");

	// ── Data loading ─────────────────────────────────────────────────────────

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(
				`/api/events/${providedEventId}/data?key=workshop_schedule`,
			);
			if (res.ok) {
				const data = await res.json();
				const saved = data.data?.value;
				if (saved) {
					setWorkshops(saved.workshops || []);
					setVenues(saved.venues || ["Main Venue"]);
					setDays(saved.days || ["Day 1", "Day 2"]);
					setRooms(saved.rooms || DEFAULT_ROOMS);
				}
			}
		} catch {
			setError("Failed to load workshop schedule");
		} finally {
			setLoading(false);
		}
	}, [providedEventId]);

	useEffect(() => { load(); }, [load]);

	// ── Persist ───────────────────────────────────────────────────────────────

	const persist = async (
		newWorkshops: Workshop[],
		newVenues = venues,
		newDays = days,
		newRooms = rooms,
	) => {
		await fetch(`/api/events/${providedEventId}/data`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: "workshop_schedule",
				value: { workshops: newWorkshops, venues: newVenues, days: newDays, rooms: newRooms },
			}),
		});
	};

	// ── Add workshop ──────────────────────────────────────────────────────────

	const handleAdd = async () => {
		if (!form.title.trim()) { setFormError("Title is required"); return; }
		if (!form.startTime || !form.endTime) { setFormError("Start and end time are required"); return; }
		setFormError("");
		setSaving(true);
		try {
			const idx = workshops.length % CARD_BORDER_COLORS.length;
			const newWs: Workshop = {
				id: `ws-${Date.now()}`,
				title: form.title.trim(),
				instructor: form.instructor.trim() || undefined,
				room: form.room,
				day: form.day,
				venue: form.venue,
				startTime: form.startTime,
				endTime: form.endTime,
				level: form.level,
				color: CARD_BORDER_COLORS[idx],
			};
			const updated = [...workshops, newWs];
			setWorkshops(updated);
			await persist(updated);
			setForm({ ...emptyForm });
			setShowAddWorkshop(false);
		} finally {
			setSaving(false);
		}
	};

	// ── Delete workshop ───────────────────────────────────────────────────────

	const handleDelete = async (id: string) => {
		const updated = workshops.filter((w) => w.id !== id);
		setWorkshops(updated);
		await persist(updated);
	};

	// ── Add venue / day ───────────────────────────────────────────────────────

	const addVenue = () => {
		const name = `Venue ${venues.length + 1}`;
		const newVenues = [...venues, name];
		setVenues(newVenues);
		persist(workshops, newVenues, days, rooms);
	};

	const addDay = () => {
		const name = `Day ${days.length + 1}`;
		const newDays = [...days, name];
		setDays(newDays);
		persist(workshops, venues, newDays, rooms);
	};

	// ── Current view's workshops ──────────────────────────────────────────────

	const visible = workshops.filter(
		(w) => w.venue === selectedVenue && w.day === selectedDay,
	);

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="flex h-full flex-col bg-white">
			{/* Header */}
			<div className="border-b border-slate-100 px-8 pt-8 pb-5">
				<h1 className="text-2xl font-bold text-slate-900">Workshop Schedule</h1>
				<p className="mt-1 text-sm text-slate-500">
					Create, manage and share workshop schedules across venues and days
				</p>
			</div>

			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
				{/* Venue tabs */}
				<div className="flex items-center gap-1.5">
					{venues.map((v) => (
						<button
							key={v}
							type="button"
							onClick={() => setSelectedVenue(v)}
							className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
								selectedVenue === v
									? "bg-fuchsia-600 text-white shadow"
									: "bg-slate-100 text-slate-600 hover:bg-slate-200"
							}`}
						>
							{selectedVenue === v && <span className="h-1.5 w-1.5 rounded-full bg-white/70" />}
							{v}
						</button>
					))}
					<button
						type="button"
						onClick={addVenue}
						className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400 hover:border-fuchsia-400 hover:text-fuchsia-600 transition"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Venue
					</button>
				</div>

				{/* Day tabs */}
				<div className="flex items-center gap-1.5 ml-3">
					{days.map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => setSelectedDay(d)}
							className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
								selectedDay === d
									? "bg-fuchsia-600 text-white shadow"
									: "bg-slate-100 text-slate-600 hover:bg-slate-200"
							}`}
						>
							{d}
						</button>
					))}
					<button
						type="button"
						onClick={addDay}
						className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-400 hover:border-fuchsia-400 hover:text-fuchsia-600 transition"
					>
						+ Day
					</button>
				</div>

				{/* Right actions */}
				<div className="ml-auto flex items-center gap-2">
					<button className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 transition">
						<Share2 className="h-4 w-4" />
					</button>
					<button className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 transition">
						<Printer className="h-4 w-4" />
					</button>
					<button className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 transition">
						<Download className="h-4 w-4" />
					</button>
					<Button
						onClick={() => setShowAddWorkshop(true)}
						className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm"
					>
						<Plus className="h-4 w-4 mr-1" />
						Add Workshop
					</Button>
				</div>
			</div>

			{/* Add Workshop Modal */}
			{showAddWorkshop && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-bold text-slate-800">New Workshop</h3>
							<button onClick={() => setShowAddWorkshop(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
								<X className="h-4 w-4" />
							</button>
						</div>

						{formError && (
							<p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
						)}

						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-slate-600">Workshop Title *</label>
									<input
										value={form.title}
										onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
										placeholder="e.g. Salsa Basics"
									/>
								</div>

								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-slate-600">Instructor</label>
									<input
										value={form.instructor}
										onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
										placeholder="Instructor name"
									/>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Room</label>
									<select
										value={form.room}
										onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									>
										{rooms.map((r) => <option key={r}>{r}</option>)}
									</select>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Day</label>
									<select
										value={form.day}
										onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									>
										{days.map((d) => <option key={d}>{d}</option>)}
									</select>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">Start Time *</label>
									<input
										type="time"
										value={form.startTime}
										onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									/>
								</div>

								<div>
									<label className="mb-1 block text-xs font-medium text-slate-600">End Time *</label>
									<input
										type="time"
										value={form.endTime}
										onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
										className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									/>
								</div>

								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-slate-600">Level</label>
									<div className="flex gap-2 flex-wrap">
										{LEVELS.map((l) => (
											<button
												key={l}
												type="button"
												onClick={() => setForm((f) => ({ ...f, level: l }))}
												className={`rounded-full px-3 py-1 text-xs font-medium transition ${
													form.level === l
														? LEVEL_COLORS[l]
														: "bg-slate-100 text-slate-500 hover:bg-slate-200"
												}`}
											>
												{l}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>

						<div className="mt-5 flex justify-end gap-2">
							<Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAddWorkshop(false)}>
								Cancel
							</Button>
							<Button
								size="sm"
								className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700"
								onClick={handleAdd}
								disabled={saving}
							>
								{saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
								Create Workshop
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Room columns grid */}
			{loading ? (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
				</div>
			) : (
				<div className="flex-1 overflow-auto px-6 py-5">
					{/* Room headers */}
					<div
						className="grid gap-4 min-w-[700px]"
						style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
					>
						{rooms.map((room) => (
							<div
								key={room}
								className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm"
							>
								{room}
							</div>
						))}
					</div>

					{/* Workshop cards */}
					<div
						className="mt-3 grid gap-4 min-w-[700px]"
						style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}
					>
						{rooms.map((room) => {
							const roomWorkshops = visible.filter((w) => w.room === room);
							return (
								<div key={room} className="space-y-3">
									{roomWorkshops.length === 0 ? (
										<button
											type="button"
											onClick={() => {
												setForm((f) => ({ ...f, room, day: selectedDay, venue: selectedVenue }));
												setShowAddWorkshop(true);
											}}
											className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm text-slate-300 hover:border-fuchsia-300 hover:text-fuchsia-400 transition"
										>
											<Plus className="h-4 w-4 mr-1" />
											Add to {room}
										</button>
									) : (
										roomWorkshops.map((ws) => (
											<WorkshopCard
												key={ws.id}
												workshop={ws}
												onDelete={() => handleDelete(ws.id)}
											/>
										))
									)}
								</div>
							);
						})}
					</div>

					{/* All-empty state */}
					{visible.length === 0 && (
						<div className="mt-6 text-center text-sm text-slate-400">
							No workshops scheduled for {selectedDay} — {selectedVenue}. Click "Add Workshop" or the + buttons above.
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ── Workshop Card ─────────────────────────────────────────────────────────────

function WorkshopCard({
	workshop: ws,
	onDelete,
}: {
	workshop: Workshop;
	onDelete: () => void;
}) {
	return (
		<div
			className={`group relative rounded-2xl border border-slate-100 border-l-4 bg-white p-3.5 shadow-sm transition hover:shadow-md ${ws.color || "border-l-fuchsia-400"}`}
		>
			{/* Delete */}
			<button
				type="button"
				onClick={onDelete}
				className="absolute right-2 top-2 hidden rounded-full p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block transition"
			>
				<X className="h-3.5 w-3.5" />
			</button>

			<div className="flex items-start gap-2.5">
				<GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-200" />
				<div className="flex-1 min-w-0">
					{/* Avatar + title */}
					<div className="flex items-start gap-2 mb-1">
						<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">
							{ws.title[0]?.toUpperCase()}
						</div>
						<p className="text-sm font-semibold text-slate-800 leading-tight">{ws.title}</p>
					</div>

					{/* Instructor */}
					{ws.instructor && (
						<p className="mb-1 truncate text-[11px] text-slate-400">
							✦ {ws.instructor}
						</p>
					)}

					{/* Time */}
					<div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
						<Clock className="h-3 w-3" />
						{ws.startTime} – {ws.endTime}
					</div>

					{/* Level badge */}
					{ws.level && (
						<span
							className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${LEVEL_COLORS[ws.level] || "bg-slate-100 text-slate-600"}`}
						>
							{ws.level}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
