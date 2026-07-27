"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	Loader2,
	Plus,
	Clock,
	X,
	Share2,
	Printer,
	Download,
	GripVertical,
	LayoutGrid,
	GanttChartSquare,
	List as ListIcon,
	Table as TableIcon,
	Search,
	Upload,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkshopLevel } from "./artist-files/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "timeline" | "list" | "table";

interface WorkshopSlot {
	id: string;
	title: string;
	artistId?: string;
	artistName?: string;
	room: string;
	date: string; // YYYY-MM-DD
	venue: string;
	startTime: string; // "09:00"
	endTime: string; // "09:50"
	level?: WorkshopLevel;
	customLevel?: string;
	color?: string;
	thumbnailUrl?: string;
	isBreak?: boolean;
}

interface ContractedArtist {
	id: string;
	name: string;
	realName: string;
	type: string;
	isSigned: boolean;
	image?: string;
}

interface WorkshopCreatorProps {
	providedEventId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_ROOMS = ["Room A", "Room B", "Room C", "Room D"];
const LEVEL_OPTIONS: { value: WorkshopLevel; label: string }[] = [
	{ value: "beginner", label: "Beginner" },
	{ value: "intermediate", label: "Intermediate" },
	{ value: "advanced", label: "Advanced" },
	{ value: "bootcamp", label: "Bootcamp" },
	{ value: "custom", label: "Custom" },
];
const LEVEL_COLORS: Record<string, string> = {
	beginner: "bg-fuchsia-100 text-fuchsia-700",
	intermediate: "bg-blue-100 text-blue-700",
	advanced: "bg-red-100 text-red-700",
	bootcamp: "bg-amber-100 text-amber-700",
	custom: "bg-emerald-100 text-emerald-700",
};
const CARD_COLORS = [
	"#f43f5e", // rose
	"#a855f7", // purple
	"#7c3aed", // violet
	"#3b5bdb", // indigo
	"#3b82f6", // blue
	"#06b6d4", // cyan
	"#0d9488", // teal
	"#22c55e", // green
	"#f59e0b", // amber
	"#f97316", // orange
	"#ec4899", // pink
];

const emptyForm = {
	title: "",
	artistId: "",
	room: DEFAULT_ROOMS[0],
	date: "",
	venue: "Main Venue",
	startTime: "09:00",
	endTime: "09:50",
	level: "beginner" as WorkshopLevel,
	customLevel: "",
	color: CARD_COLORS[0],
	thumbnailUrl: "",
	isBreak: false,
	breakLabel: "",
};

function formatDayLabel(dateStr: string): string {
	const parts = dateStr.split("-");
	if (parts.length < 3) return dateStr;
	const dt = new Date(+parts[0], +parts[1] - 1, +parts[2]);
	if (isNaN(dt.getTime())) return dateStr;
	return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function levelLabel(level?: WorkshopLevel, customLevel?: string): string {
	if (!level) return "";
	if (level === "custom") return customLevel || "Custom";
	return LEVEL_OPTIONS.find((o) => o.value === level)?.label || level;
}

function timeToMinutes(t: string): number {
	const [h, m] = t.split(":").map(Number);
	return (h || 0) * 60 + (m || 0);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WorkshopCreator({ providedEventId }: WorkshopCreatorProps) {
	const [workshops, setWorkshops] = useState<WorkshopSlot[]>([]);
	const [artists, setArtists] = useState<ContractedArtist[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Layout config (venues/rooms are still a lightweight per-event blob — not tied to any artist)
	const [selectedVenue, setSelectedVenue] = useState("Main Venue");
	const [venues, setVenues] = useState(["Main Venue"]);
	const [rooms, setRooms] = useState(DEFAULT_ROOMS);

	// Real event dates, derived the same way as the Agreement > Workshops tab
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [selectedDate, setSelectedDate] = useState<string>("");

	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [showAddWorkshop, setShowAddWorkshop] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [modalTab, setModalTab] = useState<"workshop" | "label">("workshop");
	const [form, setForm] = useState({ ...emptyForm });
	const [formError, setFormError] = useState("");
	const [artistSearch, setArtistSearch] = useState("");

	// ── Load real event dates ────────────────────────────────────────────────

	useEffect(() => {
		if (!providedEventId) return;
		fetch(`/api/events/${providedEventId}`)
			.then((r) => r.json())
			.then((d) => {
				const ev = d.data;
				if (!ev) return;
				const dates: string[] = [];
				if (ev.showDates?.length) {
					ev.showDates.forEach((dt: string) => { if (dt) dates.push(dt); });
				} else if (ev.requestedShowDates?.length) {
					ev.requestedShowDates.forEach((dt: string) => { if (dt) dates.push(dt); });
				}
				if (dates.length === 0 && ev.startDate) {
					const start = new Date(ev.startDate);
					const end = ev.endDate ? new Date(ev.endDate) : start;
					for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
						dates.push(new Date(cur).toISOString().substring(0, 10));
					}
				}
				const toYMD = (raw: string): string | null => {
					if (!raw) return null;
					if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
					const iso = raw.substring(0, 10);
					if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
					const p = new Date(raw);
					if (isNaN(p.getTime())) return null;
					const y = p.getFullYear();
					const mo = String(p.getMonth() + 1).padStart(2, "0");
					const dy = String(p.getDate()).padStart(2, "0");
					return `${y}-${mo}-${dy}`;
				};
				const normalized = [...new Set(dates)].map(toYMD).filter(Boolean).sort() as string[];
				setEventDates(normalized);
				setSelectedDate((prev) => prev || normalized[0] || "");
			})
			.catch(() => {});
	}, [providedEventId]);

	// ── Load layout blob (venues/rooms) ──────────────────────────────────────

	const loadLayout = useCallback(async () => {
		try {
			const res = await fetch(`/api/events/${providedEventId}/data?key=workshop_layout`);
			if (res.ok) {
				const data = await res.json();
				const saved = data.data?.value;
				if (saved) {
					setVenues(saved.venues || ["Main Venue"]);
					setRooms(saved.rooms || DEFAULT_ROOMS);
				}
			}
		} catch {
			/* non-fatal — fall back to defaults */
		}
	}, [providedEventId]);

	const persistLayout = async (newVenues = venues, newRooms = rooms) => {
		await fetch(`/api/events/${providedEventId}/data`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ key: "workshop_layout", value: { venues: newVenues, rooms: newRooms } }),
		});
	};

	// ── Load contracted artists + their assigned workshops ───────────────────

	const loadArtistsAndWorkshops = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/contracts/${providedEventId}?t=${Date.now()}`, { cache: "no-store" });
			const d = await res.json();
			if (!d.success) return;
			const rawArtists: any[] = d.artists || [];

			const mappedArtists: ContractedArtist[] = rawArtists.map((a) => {
				const name = (a.stageName && a.stageName !== "FameLink Artist" && a.stageName !== "Unknown Artist")
					? a.stageName
					: (a.legalName || a.realName || a.name || a.stageName || "Unknown Artist");
				const isSigned = a.contractDocStatus === "signed" || a.contractDocStatus === "confirmed" || !!a.contractSignedByArtist;
				return {
					id: a.id,
					name,
					realName: a.legalName || a.realName || "",
					type: mapRole(a.role || a.requestTemplate),
					isSigned,
					image: a.image || a.profileImage || a.image_url || a.avatar || "",
				};
			});
			setArtists(mappedArtists);

			const artistById = new Map(mappedArtists.map((a) => [a.id, a]));
			const flattened: WorkshopSlot[] = rawArtists.flatMap((a) => {
				const items = a.agreement?.schedule?.workshops || [];
				return items.map((w: any) => ({
					id: w.id,
					title: w.title,
					artistId: a.id,
					artistName: artistById.get(a.id)?.name,
					room: w.room || DEFAULT_ROOMS[0],
					date: w.date || "",
					venue: w.venue || "Main Venue",
					startTime: w.time || "",
					endTime: w.endTime || "",
					level: w.level,
					customLevel: w.customLevel,
					color: w.color,
					thumbnailUrl: w.thumbnailUrl,
					isBreak: !!w.isBreak,
				}));
			});
			// This reload only knows about artist-linked workshops — keep whatever
			// breaks/labels are already in state instead of wiping them out.
			setWorkshops((prev) => [...flattened, ...prev.filter((w) => w.isBreak)]);
		} finally {
			setLoading(false);
		}
	}, [providedEventId]);

	useEffect(() => { loadLayout(); loadArtistsAndWorkshops(); }, [loadLayout, loadArtistsAndWorkshops]);

	// ── Persist a workshop into its assigned artist's agreement.schedule.workshops ──

	const persistWorkshop = async (slot: WorkshopSlot, removeId?: string) => {
		const artistId = removeId ? workshops.find((w) => w.id === removeId)?.artistId : slot.artistId;
		if (!artistId) return;

		const artistRes = await fetch(`/api/contracts/${providedEventId}?t=${Date.now()}`, { cache: "no-store" });
		const artistData = await artistRes.json();
		const rawArtist = (artistData.artists || []).find((a: any) => a.id === artistId);
		if (!rawArtist) return;

		const existingSchedule = rawArtist.agreement?.schedule || {
			deliverablesCount: 0,
			overview: { workshops: 0, shows: 0, tasks: 0, dateRange: "" },
			workshops: [],
			performances: [],
			tasks: [],
		};
		const existingWorkshops: any[] = existingSchedule.workshops || [];

		let updatedWorkshops: any[];
		if (removeId) {
			updatedWorkshops = existingWorkshops.filter((w) => w.id !== removeId);
		} else {
			const entry = {
				id: slot.id,
				title: slot.title,
				date: slot.date,
				time: slot.startTime,
				endTime: slot.endTime,
				location: slot.venue,
				status: "Confirmed",
				level: slot.level,
				customLevel: slot.customLevel,
				room: slot.room,
				venue: slot.venue,
				color: slot.color,
				thumbnailUrl: slot.thumbnailUrl,
				isBreak: slot.isBreak,
			};
			const idx = existingWorkshops.findIndex((w) => w.id === slot.id);
			if (idx >= 0) {
				updatedWorkshops = [...existingWorkshops];
				updatedWorkshops[idx] = entry;
			} else {
				updatedWorkshops = [...existingWorkshops, entry];
			}
		}

		await fetch(`/api/contracts/${providedEventId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				artistId,
				agreement: {
					...rawArtist.agreement,
					schedule: { ...existingSchedule, workshops: updatedWorkshops },
				},
			}),
		});
	};

	// ── Add / edit workshop ───────────────────────────────────────────────────

	const resetForm = () => {
		setForm({ ...emptyForm, date: selectedDate, venue: selectedVenue });
		setFormError("");
		setEditingId(null);
		setModalTab("workshop");
		setArtistSearch("");
	};

	const openAddModal = (presetRoom?: string) => {
		resetForm();
		if (presetRoom) setForm((f) => ({ ...f, room: presetRoom }));
		setShowAddWorkshop(true);
	};

	const openEditModal = (slot: WorkshopSlot) => {
		setForm({
			title: slot.title,
			artistId: slot.artistId || "",
			room: slot.room,
			date: slot.date,
			venue: slot.venue,
			startTime: slot.startTime,
			endTime: slot.endTime,
			level: slot.level || "beginner",
			customLevel: slot.customLevel || "",
			color: slot.color || CARD_COLORS[0],
			thumbnailUrl: slot.thumbnailUrl || "",
			isBreak: !!slot.isBreak,
			breakLabel: slot.isBreak ? slot.title : "",
		});
		setModalTab(slot.isBreak ? "label" : "workshop");
		setEditingId(slot.id);
		setFormError("");
		setShowAddWorkshop(true);
	};

	const handleAssignArtist = (artistId: string) => {
		const artist = artists.find((a) => a.id === artistId);
		setForm((f) => ({ ...f, artistId, title: f.title || (artist ? `${artist.name} Workshop` : f.title) }));
	};

	const handleSubmit = async () => {
		if (modalTab === "label") {
			if (!form.breakLabel.trim()) { setFormError("Label is required"); return; }
		} else {
			if (!form.title.trim()) { setFormError("Workshop title is required"); return; }
			if (!form.artistId) { setFormError("Please assign a contracted artist"); return; }
		}
		if (!form.startTime || !form.endTime) { setFormError("Start and end time are required"); return; }
		if (!form.date) { setFormError("Please select a day"); return; }

		setFormError("");
		setSaving(true);
		try {
			const id = editingId || `ws-${Date.now()}`;
			const slot: WorkshopSlot = modalTab === "label"
				? {
					id,
					title: form.breakLabel.trim(),
					room: form.room,
					date: form.date,
					venue: form.venue,
					startTime: form.startTime,
					endTime: form.endTime,
					color: form.color,
					isBreak: true,
				}
				: {
					id,
					title: form.title.trim(),
					artistId: form.artistId,
					artistName: artists.find((a) => a.id === form.artistId)?.name,
					room: form.room,
					date: form.date,
					venue: form.venue,
					startTime: form.startTime,
					endTime: form.endTime,
					level: form.level,
					customLevel: form.level === "custom" ? form.customLevel.trim() : undefined,
					color: form.color,
					thumbnailUrl: form.thumbnailUrl,
					isBreak: false,
				};

			if (modalTab === "label") {
				// Breaks/labels are layout-only and don't belong to any artist's agreement —
				// persist them in the same per-event blob as venues/rooms.
				const updated = editingId
					? workshops.map((w) => (w.id === editingId ? slot : w))
					: [...workshops, slot];
				setWorkshops(updated);
				await fetch(`/api/events/${providedEventId}/data`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						key: "workshop_breaks",
						value: updated.filter((w) => w.isBreak),
					}),
				});
			} else {
				const updated = editingId
					? workshops.map((w) => (w.id === editingId ? slot : w))
					: [...workshops, slot];
				setWorkshops(updated);
				await persistWorkshop(slot);
				// Reload artist-linked workshops from the server — but loadArtistsAndWorkshops()
				// replaces the whole `workshops` array, so re-merge the breaks back in or they'd vanish.
				await loadArtistsAndWorkshops();
			}

			setShowAddWorkshop(false);
			resetForm();
		} finally {
			setSaving(false);
		}
	};

	// ── Delete workshop ───────────────────────────────────────────────────────

	const handleDelete = async (slot: WorkshopSlot) => {
		setWorkshops((prev) => prev.filter((w) => w.id !== slot.id));
		if (slot.isBreak) {
			const remainingBreaks = workshops.filter((w) => w.isBreak && w.id !== slot.id);
			await fetch(`/api/events/${providedEventId}/data`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: "workshop_breaks", value: remainingBreaks }),
			});
		} else {
			await persistWorkshop(slot, slot.id);
			await loadArtistsAndWorkshops();
		}
	};

	// ── Load breaks (layout-only blob) ───────────────────────────────────────

	useEffect(() => {
		fetch(`/api/events/${providedEventId}/data?key=workshop_breaks`)
			.then((r) => r.json())
			.then((d) => {
				const saved = d.data?.value;
				if (Array.isArray(saved) && saved.length) {
					setWorkshops((prev) => [...prev.filter((w) => !w.isBreak), ...saved]);
				}
			})
			.catch(() => {});
	}, [providedEventId]);

	// ── Add venue / room ──────────────────────────────────────────────────────

	const addVenue = () => {
		const name = window.prompt("Venue name:")?.trim();
		if (!name) return;
		if (venues.includes(name)) { window.alert("A venue with this name already exists."); return; }
		const newVenues = [...venues, name];
		setVenues(newVenues);
		persistLayout(newVenues, rooms);
	};

	// ── Current view's workshops ──────────────────────────────────────────────

	const visible = useMemo(
		() => workshops.filter((w) => w.venue === selectedVenue && w.date === selectedDate),
		[workshops, selectedVenue, selectedDate],
	);

	const filteredArtists = useMemo(
		() => artists.filter((a) =>
			!artistSearch.trim() ||
			a.name.toLowerCase().includes(artistSearch.toLowerCase()) ||
			a.realName.toLowerCase().includes(artistSearch.toLowerCase())
		),
		[artists, artistSearch],
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
				{/* View mode switcher */}
				<div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
					{([
						{ mode: "grid", icon: LayoutGrid },
						{ mode: "timeline", icon: GanttChartSquare },
						{ mode: "list", icon: ListIcon },
						{ mode: "table", icon: TableIcon },
					] as { mode: ViewMode; icon: typeof LayoutGrid }[]).map(({ mode, icon: Icon }) => (
						<button
							key={mode}
							type="button"
							onClick={() => setViewMode(mode)}
							className={`rounded-lg p-1.5 transition ${viewMode === mode ? "bg-white shadow text-fuchsia-600" : "text-slate-400 hover:text-slate-600"}`}
							title={mode}
						>
							<Icon className="h-4 w-4" />
						</button>
					))}
				</div>

				{/* Venue tabs */}
				<div className="flex items-center gap-1.5 ml-1">
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

				{/* Day tabs — real calendar dates from the event */}
				<div className="flex items-center gap-1.5 ml-3 flex-wrap">
					{eventDates.length === 0 ? (
						<span className="text-xs text-slate-400">No event dates set yet</span>
					) : (
						eventDates.map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => setSelectedDate(d)}
								className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
									selectedDate === d
										? "bg-fuchsia-600 text-white shadow"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								{formatDayLabel(d)}
							</button>
						))
					)}
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
						onClick={() => openAddModal()}
						disabled={!selectedDate}
						className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm"
					>
						<Plus className="h-4 w-4 mr-1" />
						Add Workshop
					</Button>
				</div>
			</div>

			{/* Add / Edit Workshop Modal */}
			{showAddWorkshop && (
				<AddWorkshopModal
					form={form}
					setForm={setForm}
					formError={formError}
					modalTab={modalTab}
					setModalTab={setModalTab}
					rooms={rooms}
					venues={venues}
					eventDates={eventDates}
					artists={filteredArtists}
					artistSearch={artistSearch}
					setArtistSearch={setArtistSearch}
					onAssignArtist={handleAssignArtist}
					saving={saving}
					isEditing={!!editingId}
					onSubmit={handleSubmit}
					onClose={() => { setShowAddWorkshop(false); resetForm(); }}
				/>
			)}

			{/* Board */}
			{loading ? (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
				</div>
			) : !selectedDate ? (
				<div className="flex flex-1 items-center justify-center text-sm text-slate-400">
					Set the event's show dates first (Show Dates tab) to schedule workshops.
				</div>
			) : viewMode === "grid" ? (
				<GridView rooms={rooms} visible={visible} onAdd={openAddModal} onEdit={openEditModal} onDelete={handleDelete} />
			) : viewMode === "timeline" ? (
				<TimelineView rooms={rooms} visible={visible} onEdit={openEditModal} onDelete={handleDelete} />
			) : viewMode === "list" ? (
				<ListView rooms={rooms} visible={visible} onEdit={openEditModal} onDelete={handleDelete} />
			) : (
				<TableView rooms={rooms} visible={visible} onEdit={openEditModal} />
			)}
		</div>
	);
}

function mapRole(role: string): string {
	switch (role) {
		case "dj": return "DJ";
		case "group": return "Group";
		case "solo": return "Solo";
		case "band": return "Band";
		case "mc": return "MC";
		default: return role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "Solo";
	}
}

// ── Grid (board) view ──────────────────────────────────────────────────────────

function GridView({
	rooms,
	visible,
	onAdd,
	onEdit,
	onDelete,
}: {
	rooms: string[];
	visible: WorkshopSlot[];
	onAdd: (room: string) => void;
	onEdit: (slot: WorkshopSlot) => void;
	onDelete: (slot: WorkshopSlot) => void;
}) {
	return (
		<div className="flex-1 overflow-auto px-6 py-5">
			<div className="grid gap-4 min-w-[700px]" style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}>
				{rooms.map((room) => (
					<div key={room} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm">
						{room}
					</div>
				))}
			</div>

			<div className="mt-3 grid gap-4 min-w-[700px]" style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}>
				{rooms.map((room) => {
					const roomWorkshops = visible
						.filter((w) => w.room === room)
						.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
					return (
						<div key={room} className="space-y-3">
							{roomWorkshops.length === 0 ? (
								<button
									type="button"
									onClick={() => onAdd(room)}
									className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm text-slate-300 hover:border-fuchsia-300 hover:text-fuchsia-400 transition"
								>
									<Plus className="h-4 w-4 mr-1" />
									Add to {room}
								</button>
							) : (
								roomWorkshops.map((ws) => (
									<WorkshopCard key={ws.id} workshop={ws} onEdit={() => onEdit(ws)} onDelete={() => onDelete(ws)} />
								))
							)}
						</div>
					);
				})}
			</div>

			{visible.length === 0 && (
				<div className="mt-6 text-center text-sm text-slate-400">
					No workshops scheduled for this day. Click "Add Workshop" or the + buttons above.
				</div>
			)}
		</div>
	);
}

function WorkshopCard({ workshop: ws, onEdit, onDelete }: { workshop: WorkshopSlot; onEdit: () => void; onDelete: () => void }) {
	if (ws.isBreak) {
		return (
			<div
				className="group relative flex items-center justify-between rounded-2xl px-4 py-3 text-white shadow-sm"
				style={{ backgroundColor: ws.color || "#475569" }}
			>
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Clock className="h-3.5 w-3.5" />
					{ws.title}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-white/80">{ws.startTime} – {ws.endTime}</span>
					<button onClick={onDelete} className="hidden rounded-full p-1 text-white/60 hover:bg-white/10 group-hover:block">
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className="group relative cursor-pointer rounded-2xl border border-slate-100 border-l-4 bg-white p-3.5 shadow-sm transition hover:shadow-md"
			style={{ borderLeftColor: ws.color || "#d946ef" }}
			onClick={onEdit}
		>
			<button
				type="button"
				onClick={(e) => { e.stopPropagation(); onDelete(); }}
				className="absolute right-2 top-2 hidden rounded-full p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block transition"
			>
				<X className="h-3.5 w-3.5" />
			</button>

			<div className="flex items-start gap-2.5">
				<GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-200" />
				<div className="flex-1 min-w-0">
					<div className="flex items-start gap-2 mb-1">
						{ws.thumbnailUrl ? (
							<img src={ws.thumbnailUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
						) : (
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xs font-bold text-white">
								{ws.title[0]?.toUpperCase()}
							</div>
						)}
						<p className="text-sm font-semibold text-slate-800 leading-tight">{ws.title}</p>
					</div>

					{ws.artistName && (
						<p className="mb-1 truncate text-[11px] text-slate-400">✦ {ws.artistName}</p>
					)}

					<div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
						<Clock className="h-3 w-3" />
						{ws.startTime} – {ws.endTime}
					</div>

					{ws.level && (
						<span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${LEVEL_COLORS[ws.level] || "bg-slate-100 text-slate-600"}`}>
							{levelLabel(ws.level, ws.customLevel).toUpperCase()}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Timeline view ──────────────────────────────────────────────────────────────

function TimelineView({
	rooms,
	visible,
	onEdit,
	onDelete,
}: {
	rooms: string[];
	visible: WorkshopSlot[];
	onEdit: (slot: WorkshopSlot) => void;
	onDelete: (slot: WorkshopSlot) => void;
}) {
	const hours = useMemo(() => {
		if (visible.length === 0) return [9, 10, 11, 12, 13];
		const starts = visible.map((w) => Math.floor(timeToMinutes(w.startTime) / 60));
		const ends = visible.map((w) => Math.ceil(timeToMinutes(w.endTime) / 60));
		const min = Math.min(...starts, 9);
		const max = Math.max(...ends, min + 4);
		return Array.from({ length: max - min + 1 }, (_, i) => min + i);
	}, [visible]);

	const HOUR_HEIGHT = 90;
	const startHour = hours[0];

	return (
		<div className="flex-1 overflow-auto px-6 py-5">
			<div className="grid min-w-[700px]" style={{ gridTemplateColumns: `56px repeat(${rooms.length}, 1fr)` }}>
				<div />
				{rooms.map((room) => (
					<div key={room} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm mb-3">
						{room}
					</div>
				))}
			</div>

			<div className="relative grid min-w-[700px]" style={{ gridTemplateColumns: `56px repeat(${rooms.length}, 1fr)` }}>
				<div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
					{hours.map((h) => (
						<div key={h} className="absolute -translate-y-1/2 text-xs font-medium text-slate-400" style={{ top: (h - startHour) * HOUR_HEIGHT }}>
							{String(h).padStart(2, "0")}:00
						</div>
					))}
				</div>
				{rooms.map((room) => (
					<div key={room} className="relative border-l border-slate-100" style={{ height: hours.length * HOUR_HEIGHT }}>
						{hours.map((h) => (
							<div key={h} className="absolute w-full border-t border-slate-50" style={{ top: (h - startHour) * HOUR_HEIGHT }} />
						))}
						{visible.filter((w) => w.room === room).map((ws) => {
							const top = ((timeToMinutes(ws.startTime) - startHour * 60) / 60) * HOUR_HEIGHT;
							const height = Math.max(((timeToMinutes(ws.endTime) - timeToMinutes(ws.startTime)) / 60) * HOUR_HEIGHT, 40);
							return (
								<div
									key={ws.id}
									onClick={() => onEdit(ws)}
									className="group absolute left-1 right-1 cursor-pointer overflow-hidden rounded-xl border-l-4 bg-white p-2 shadow-sm hover:shadow-md transition"
									style={{ top, height, borderLeftColor: ws.color || "#d946ef", backgroundColor: ws.isBreak ? (ws.color || "#475569") : undefined }}
								>
									<button
										type="button"
										onClick={(e) => { e.stopPropagation(); onDelete(ws); }}
										className="absolute right-1 top-1 hidden rounded-full p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
									>
										<X className="h-3 w-3" />
									</button>
									<p className={`truncate text-xs font-semibold ${ws.isBreak ? "text-white" : "text-slate-800"}`}>{ws.title}</p>
									<p className={`text-[10px] ${ws.isBreak ? "text-white/80" : "text-slate-400"}`}>{ws.startTime} – {ws.endTime}</p>
									{!ws.isBreak && ws.level && (
										<span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${LEVEL_COLORS[ws.level] || "bg-slate-100 text-slate-600"}`}>
											{levelLabel(ws.level, ws.customLevel).toUpperCase()}
										</span>
									)}
								</div>
							);
						})}
					</div>
				))}
			</div>

			{visible.length === 0 && (
				<div className="mt-6 text-center text-sm text-slate-400">No workshops scheduled for this day.</div>
			)}
		</div>
	);
}

// ── List view ──────────────────────────────────────────────────────────────────

function ListView({
	rooms,
	visible,
	onEdit,
	onDelete,
}: {
	rooms: string[];
	visible: WorkshopSlot[];
	onEdit: (slot: WorkshopSlot) => void;
	onDelete: (slot: WorkshopSlot) => void;
}) {
	return (
		<div className="flex-1 overflow-auto px-6 py-5">
			<div className="grid gap-4 min-w-[700px]" style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}>
				{rooms.map((room) => (
					<div key={room} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm">
						{room}
					</div>
				))}
			</div>

			<div className="mt-3 grid gap-4 min-w-[700px]" style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}>
				{rooms.map((room) => {
					const roomWorkshops = visible
						.filter((w) => w.room === room)
						.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
					return (
						<div key={room} className="space-y-2">
							{roomWorkshops.map((ws) => (
								<div
									key={ws.id}
									onClick={() => onEdit(ws)}
									className={`group flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs transition hover:shadow-sm ${
										ws.isBreak ? "border-transparent text-white" : "border-slate-100 bg-white"
									}`}
									style={ws.isBreak ? { backgroundColor: ws.color || "#475569" } : undefined}
								>
									<div className="flex items-center gap-2 min-w-0">
										<GripVertical className="h-3.5 w-3.5 shrink-0 text-current opacity-40" />
										<Clock className="h-3 w-3 shrink-0 opacity-60" />
										<span className="font-semibold whitespace-nowrap">{ws.startTime} – {ws.endTime}</span>
										{!ws.isBreak && ws.artistName && <span className="opacity-60 truncate">✦ {ws.artistName}</span>}
										{ws.isBreak && <span className="truncate">{ws.title}</span>}
									</div>
									<div className="flex items-center gap-1.5 shrink-0">
										{!ws.isBreak && ws.level && (
											<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_COLORS[ws.level] || "bg-slate-100 text-slate-600"}`}>
												{levelLabel(ws.level, ws.customLevel).toUpperCase()}
											</span>
										)}
										<button
											type="button"
											onClick={(e) => { e.stopPropagation(); onDelete(ws); }}
											className="hidden rounded-full p-1 hover:bg-red-50 hover:text-red-500 group-hover:block"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								</div>
							))}
						</div>
					);
				})}
			</div>

			{visible.length === 0 && (
				<div className="mt-6 text-center text-sm text-slate-400">No workshops scheduled for this day.</div>
			)}
		</div>
	);
}

// ── Table / heatmap view ────────────────────────────────────────────────────────

function TableView({ rooms, visible, onEdit }: { rooms: string[]; visible: WorkshopSlot[]; onEdit: (slot: WorkshopSlot) => void }) {
	const SLOT_MINUTES = 15;
	const times = useMemo(() => {
		if (visible.length === 0) return [];
		const starts = visible.map((w) => timeToMinutes(w.startTime));
		const ends = visible.map((w) => timeToMinutes(w.endTime));
		const min = Math.min(...starts);
		const max = Math.max(...ends);
		const slots: number[] = [];
		for (let t = min; t < max; t += SLOT_MINUTES) slots.push(t);
		return slots;
	}, [visible]);

	const cellFor = (room: string, slotStart: number) =>
		visible.find((w) => w.room === room && timeToMinutes(w.startTime) <= slotStart && timeToMinutes(w.endTime) > slotStart);

	return (
		<div className="flex-1 overflow-auto px-6 py-5">
			{times.length === 0 ? (
				<div className="text-center text-sm text-slate-400 py-10">No workshops scheduled for this day.</div>
			) : (
				<div className="grid min-w-[700px]" style={{ gridTemplateColumns: `72px repeat(${rooms.length}, 1fr)` }}>
					<div className="text-xs font-semibold text-slate-500 py-2">Time</div>
					{rooms.map((room) => (
						<div key={room} className="rounded-xl bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-700 mx-1">{room}</div>
					))}

					{times.map((t) => {
						const isHourStart = t % 60 === 0;
						return (
							<React.Fragment key={`row-${t}`}>
								<div className={`px-1 py-1 text-[11px] ${isHourStart ? "font-bold text-slate-700" : "text-slate-300"}`}>
									{String(Math.floor(t / 60)).padStart(2, "0")}:{String(t % 60).padStart(2, "0")}
								</div>
								{rooms.map((room) => {
									const ws = cellFor(room, t);
									const isStartOfBlock = ws && timeToMinutes(ws.startTime) === t;
									return (
										<div key={`${room}-${t}`} className="mx-1 my-0.5 min-h-[26px]">
											{ws && isStartOfBlock ? (
												<button
													type="button"
													onClick={() => onEdit(ws)}
													className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-white transition hover:opacity-90"
													style={{ backgroundColor: ws.color || (ws.isBreak ? "#475569" : "#d946ef") }}
												>
													{!ws.isBreak && (
														ws.thumbnailUrl
															? <img src={ws.thumbnailUrl} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
															: <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/30 text-[9px] font-bold">{ws.title[0]?.toUpperCase()}</span>
													)}
													<span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{ws.title}</span>
													{!ws.isBreak && ws.level && <span className="text-[9px] opacity-90 shrink-0">{levelLabel(ws.level, ws.customLevel)}</span>}
												</button>
											) : ws ? (
												<div className="h-[26px]" />
											) : null}
										</div>
									);
								})}
							</React.Fragment>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ── Add / Edit Workshop Modal ───────────────────────────────────────────────────

function AddWorkshopModal({
	form,
	setForm,
	formError,
	modalTab,
	setModalTab,
	rooms,
	venues,
	eventDates,
	artists,
	artistSearch,
	setArtistSearch,
	onAssignArtist,
	saving,
	isEditing,
	onSubmit,
	onClose,
}: {
	form: typeof emptyForm;
	setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
	formError: string;
	modalTab: "workshop" | "label";
	setModalTab: (t: "workshop" | "label") => void;
	rooms: string[];
	venues: string[];
	eventDates: string[];
	artists: ContractedArtist[];
	artistSearch: string;
	setArtistSearch: (s: string) => void;
	onAssignArtist: (artistId: string) => void;
	saving: boolean;
	isEditing: boolean;
	onSubmit: () => void;
	onClose: () => void;
}) {
	const assignedArtist = artists.find((a) => a.id === form.artistId);

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
			<div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between px-6 pt-6 pb-4">
					<h3 className="text-lg font-bold text-fuchsia-600">{isEditing ? "Edit Workshop" : "New Workshop"}</h3>
					<button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="px-6">
					<div className="flex rounded-xl bg-slate-100 p-1">
						<button
							type="button"
							onClick={() => setModalTab("workshop")}
							className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${modalTab === "workshop" ? "bg-fuchsia-600 text-white shadow" : "text-slate-500"}`}
						>
							Workshop
						</button>
						<button
							type="button"
							onClick={() => setModalTab("label")}
							className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${modalTab === "label" ? "bg-fuchsia-600 text-white shadow" : "text-slate-500"}`}
						>
							Label / Break
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
					{formError && (
						<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
					)}

					{modalTab === "workshop" ? (
						<>
							<div>
								<div className="mb-2 flex items-center justify-between">
									<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contracted Artists</label>
									<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{artists.length}</span>
								</div>
								<div className="relative mb-2">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<input
										value={artistSearch}
										onChange={(e) => setArtistSearch(e.target.value)}
										placeholder="Search artists..."
										className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									/>
								</div>
								<div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
									{artists.length === 0 ? (
										<p className="px-3 py-4 text-center text-sm text-slate-400">No contracted artists for this event yet.</p>
									) : (
										artists.map((a) => (
											<div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-slate-800">{a.realName || a.name}</p>
													<p className="truncate text-xs text-slate-400">{a.name}</p>
													<div className="mt-1 flex items-center gap-1.5">
														<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{a.type}</span>
														{a.isSigned && (
															<span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
																<CheckCircle2 className="h-2.5 w-2.5" /> artist signed
															</span>
														)}
													</div>
												</div>
												<Button
													type="button"
													size="sm"
													variant={form.artistId === a.id ? "default" : "outline"}
													className={form.artistId === a.id ? "rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 shrink-0" : "rounded-lg shrink-0"}
													onClick={() => onAssignArtist(a.id)}
												>
													{form.artistId === a.id ? "Assigned" : "+ Assign"}
												</Button>
											</div>
										))
									)}
								</div>
								{assignedArtist && (
									<p className="mt-1.5 text-xs text-fuchsia-600">Assigned: {assignedArtist.name}</p>
								)}
							</div>

							<div>
								<label className="mb-1 block text-xs font-medium text-slate-600">Workshop Title *</label>
								<input
									value={form.title}
									onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
									className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									placeholder="e.g. Salsa Basics"
								/>
							</div>

							<div className="col-span-2">
								<label className="mb-1 block text-xs font-medium text-slate-600">Level</label>
								<div className="flex gap-2 flex-wrap">
									{LEVEL_OPTIONS.map((l) => (
										<button
											key={l.value}
											type="button"
											onClick={() => setForm((f) => ({ ...f, level: l.value }))}
											className={`rounded-full px-3 py-1 text-xs font-medium transition ${
												form.level === l.value ? LEVEL_COLORS[l.value] : "bg-slate-100 text-slate-500 hover:bg-slate-200"
											}`}
										>
											{l.label}
										</button>
									))}
								</div>
								{form.level === "custom" && (
									<input
										value={form.customLevel}
										onChange={(e) => setForm((f) => ({ ...f, customLevel: e.target.value }))}
										placeholder="Custom level name"
										className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
									/>
								)}
							</div>
						</>
					) : (
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-600">Label *</label>
							<input
								value={form.breakLabel}
								onChange={(e) => setForm((f) => ({ ...f, breakLabel: e.target.value }))}
								className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
								placeholder="e.g. Lunch Break"
							/>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
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

						<div>
							<label className="mb-1 block text-xs font-medium text-slate-600">Day</label>
							<select
								value={form.date}
								onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
								className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
							>
								{eventDates.length === 0 && <option value="">No dates set</option>}
								{eventDates.map((d) => (
									<option key={d} value={d}>{formatDayLabel(d)}</option>
								))}
							</select>
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

						<div className="col-span-2">
							<label className="mb-1 block text-xs font-medium text-slate-600">Location</label>
							<select
								value={form.venue}
								onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
								className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
							>
								{venues.map((v) => <option key={v}>{v}</option>)}
							</select>
						</div>
					</div>

					<div>
						<label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
						<div className="flex gap-2 flex-wrap">
							{CARD_COLORS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setForm((f) => ({ ...f, color: c }))}
									className={`h-7 w-7 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
									style={{ backgroundColor: c }}
								/>
							))}
						</div>
					</div>

					{modalTab === "workshop" && (
						<div>
							<label className="mb-1 block text-xs font-medium text-slate-600">Thumbnail</label>
							<label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
								<Upload className="h-3.5 w-3.5" />
								Upload
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (!file) return;
										const reader = new FileReader();
										reader.onload = () => setForm((f) => ({ ...f, thumbnailUrl: String(reader.result) }));
										reader.readAsDataURL(file);
									}}
								/>
							</label>
							{form.thumbnailUrl && (
								<img src={form.thumbnailUrl} alt="" className="mt-2 h-12 w-12 rounded-full object-cover" />
							)}
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
					<Button variant="outline" size="sm" className="rounded-xl" onClick={onClose}>
						Cancel
					</Button>
					<Button
						size="sm"
						className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700"
						onClick={onSubmit}
						disabled={saving}
					>
						{saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
						{isEditing ? "Save Changes" : "Add Workshop"}
					</Button>
				</div>
			</div>
		</div>
	);
}
