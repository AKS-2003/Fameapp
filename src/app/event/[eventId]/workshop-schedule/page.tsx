"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	Plus,
	Calendar,
	LayoutGrid,
	Table2,
	Settings,
	Trash2,
	Edit,
	Clock,
	MapPin,
	Loader2,
	Star,
	Lock,
	AlertTriangle,
	X,
	Save,
	Copy,
	FileText,
	Eye,
} from "lucide-react";
import { useContractData } from "@/hooks/useContractData";
import { useContractWebSocket } from "@/hooks/useContractWebSocket";
import { useContractSocket } from "@/hooks/useContractSocket";

// ===== Workshop Types =====

interface WorkshopDay {
	id: string;
	label: string;
	date: string;
	sortOrder: number;
}

interface WorkshopRoom {
	id: string;
	name: string;
	capacity: number;
	sortOrder: number;
	colorTag?: string;
}

interface Workshop {
	id: string;
	dayId: string;
	roomId: string;
	title: string;
	subtitle?: string;
	artistIds: string[];
	artistNames: string[];
	level: "beginner" | "intermediate" | "advanced" | "special";
	category?: string;
	startTime: string;
	endTime: string;
	capacity?: number;
	status: "draft" | "confirmed" | "tentative" | "cancelled";
	isBreak: boolean;
	isFeatured: boolean;
	isLocked: boolean;
	notes?: string;
}

interface WorkshopScheduleData {
	days: WorkshopDay[];
	rooms: WorkshopRoom[];
	workshops: Workshop[];
	settings: {
		dayStartTime: string;
		dayEndTime: string;
		snapInterval: number;
	};
}

// ===== Level Colors =====

const levelColors: Record<
	string,
	{ bg: string; border: string; text: string }
> = {
	beginner: {
		bg: "bg-green-500/12",
		border: "border-l-green-500",
		text: "text-green-600",
	},
	intermediate: {
		bg: "bg-blue-500/12",
		border: "border-l-blue-500",
		text: "text-blue-600",
	},
	advanced: {
		bg: "bg-red-500/12",
		border: "border-l-red-500",
		text: "text-red-600",
	},
	special: {
		bg: "bg-primary/12",
		border: "border-l-primary",
		text: "text-muted-foreground",
	},
};

const statusColors: Record<string, string> = {
	draft: "bg-yellow-500/20 text-yellow-600",
	confirmed: "bg-green-500/20 text-green-600",
	tentative: "bg-orange-500/20 text-orange-600",
	cancelled: "bg-red-500/20 text-red-600",
};

const SLOT_HEIGHT = 48;

// ===== Main Page =====

export default function WorkshopSchedulePage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	const { artists: contractArtists, isLoading: contractsLoading } =
		useContractData({ eventId });
	const { emit } = useContractWebSocket({ eventId });
	useContractSocket({ eventId, role: "organiser" });

	const [scheduleData, setScheduleData] = useState<WorkshopScheduleData>({
		days: [],
		rooms: [],
		workshops: [],
		settings: {
			dayStartTime: "10:00",
			dayEndTime: "19:00",
			snapInterval: 15,
		},
	});
	const [isLoading, setIsLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"grid" | "table" | "overview" | "setup"
	>("grid");
	const [selectedDayId, setSelectedDayId] = useState<string>("");
	const [showWorkshopDialog, setShowWorkshopDialog] = useState(false);
	const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(
		null,
	);
	const [showDayDialog, setShowDayDialog] = useState(false);
	const [showRoomDialog, setShowRoomDialog] = useState(false);

	// Normalize workshop data from GCS (ensure arrays exist)
	const normalizeSchedule = (raw: any): WorkshopScheduleData => ({
		days: raw.days || [],
		rooms: raw.rooms || [],
		workshops: (raw.workshops || []).map((w: any) => ({
			...w,
			artistIds: w.artistIds || [],
			artistNames: w.artistNames || [],
			isBreak: w.isBreak ?? false,
			isFeatured: w.isFeatured ?? false,
			isLocked: w.isLocked ?? false,
		})),
		settings: {
			dayStartTime: raw.settings?.dayStartTime || "10:00",
			dayEndTime: raw.settings?.dayEndTime || "19:00",
			snapInterval: raw.settings?.snapInterval || 15,
		},
	});

	// Load schedule data from GCS
	useEffect(() => {
		async function loadSchedule() {
			try {
				const res = await fetch(`/api/contracts/${eventId}/settings`);
				const data = await res.json();
				if (data.success && data.settings?.workshopSchedule) {
					const normalized = normalizeSchedule(
						data.settings.workshopSchedule,
					);
					setScheduleData(normalized);
					if (normalized.days[0]) {
						setSelectedDayId(normalized.days[0].id);
					}
				}
			} catch (err) {
				console.error("Error loading workshop schedule:", err);
			} finally {
				setIsLoading(false);
			}
		}
		loadSchedule();
	}, [eventId]);

	// Listen for real-time workshop schedule updates from other users
	useEffect(() => {
		const handleWsUpdate = (event: CustomEvent) => {
			if (event.detail?.eventId === eventId) {
				// Refetch from GCS to get latest data
				fetch(`/api/contracts/${eventId}/settings`)
					.then((res) => res.json())
					.then((data) => {
						if (data.success && data.settings?.workshopSchedule) {
							setScheduleData(
								normalizeSchedule(
									data.settings.workshopSchedule,
								),
							);
						}
					})
					.catch(console.error);
			}
		};
		window.addEventListener(
			"workshop_schedule_updated",
			handleWsUpdate as EventListener,
		);
		return () => {
			window.removeEventListener(
				"workshop_schedule_updated",
				handleWsUpdate as EventListener,
			);
		};
	}, [eventId]);

	// Persist schedule data to GCS
	const saveSchedule = useCallback(
		async (newData: WorkshopScheduleData) => {
			setScheduleData(newData);
			try {
				await fetch(`/api/contracts/${eventId}/settings`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ workshopSchedule: newData }),
				});
				// Emit WebSocket event for real-time sync
				emit("workshop_schedule_updated", {
					eventId,
					workshopCount: newData.workshops.length,
					dayCount: newData.days.length,
				});
			} catch (err) {
				console.error("Error saving workshop schedule:", err);
			}
		},
		[eventId, emit],
	);

	// ===== Day CRUD =====

	const [dayForm, setDayForm] = useState({ label: "", date: "" });

	const handleAddDay = () => {
		if (!dayForm.label || !dayForm.date) return;
		const newDay: WorkshopDay = {
			id: `day-${Date.now()}`,
			label: dayForm.label,
			date: dayForm.date,
			sortOrder: scheduleData.days.length + 1,
		};
		const newData = {
			...scheduleData,
			days: [...scheduleData.days, newDay],
		};
		saveSchedule(newData);
		if (!selectedDayId) setSelectedDayId(newDay.id);
		setDayForm({ label: "", date: "" });
		setShowDayDialog(false);
	};

	const handleDeleteDay = (dayId: string) => {
		const newData = {
			...scheduleData,
			days: scheduleData.days.filter((d) => d.id !== dayId),
			workshops: scheduleData.workshops.filter((w) => w.dayId !== dayId),
		};
		saveSchedule(newData);
		if (selectedDayId === dayId) {
			setSelectedDayId(newData.days[0]?.id || "");
		}
	};

	// ===== Room CRUD =====

	const [roomForm, setRoomForm] = useState({ name: "", capacity: 100 });

	const handleAddRoom = () => {
		if (!roomForm.name) return;
		const newRoom: WorkshopRoom = {
			id: `room-${Date.now()}`,
			name: roomForm.name,
			capacity: roomForm.capacity,
			sortOrder: scheduleData.rooms.length + 1,
		};
		const newData = {
			...scheduleData,
			rooms: [...scheduleData.rooms, newRoom],
		};
		saveSchedule(newData);
		setRoomForm({ name: "", capacity: 100 });
		setShowRoomDialog(false);
	};

	const handleDeleteRoom = (roomId: string) => {
		const newData = {
			...scheduleData,
			rooms: scheduleData.rooms.filter((r) => r.id !== roomId),
			workshops: scheduleData.workshops.filter(
				(w) => w.roomId !== roomId,
			),
		};
		saveSchedule(newData);
	};

	// ===== Workshop CRUD =====

	const emptyWorkshopForm: Omit<Workshop, "id"> = {
		dayId: selectedDayId,
		roomId: scheduleData.rooms[0]?.id || "",
		title: "",
		subtitle: "",
		artistIds: [],
		artistNames: [],
		level: "beginner",
		category: "",
		startTime: "14:00",
		endTime: "15:00",
		capacity: 100,
		status: "draft",
		isBreak: false,
		isFeatured: false,
		isLocked: false,
		notes: "",
	};

	const [wsForm, setWsForm] =
		useState<Omit<Workshop, "id">>(emptyWorkshopForm);

	const handleOpenAddWorkshop = () => {
		setEditingWorkshop(null);
		setWsForm({
			...emptyWorkshopForm,
			dayId: selectedDayId,
			roomId: scheduleData.rooms[0]?.id || "",
		});
		setShowWorkshopDialog(true);
	};

	const handleEditWorkshop = (ws: Workshop) => {
		setEditingWorkshop(ws);
		const { id, ...rest } = ws;
		setWsForm(rest);
		setShowWorkshopDialog(true);
	};

	const handleSaveWorkshop = () => {
		if (!wsForm.title || !wsForm.dayId || !wsForm.roomId) return;

		let newWorkshops: Workshop[];
		if (editingWorkshop) {
			newWorkshops = scheduleData.workshops.map((w) =>
				w.id === editingWorkshop.id
					? { ...wsForm, id: editingWorkshop.id }
					: w,
			);
		} else {
			const newWs: Workshop = { ...wsForm, id: `ws-${Date.now()}` };
			newWorkshops = [...scheduleData.workshops, newWs];
		}

		saveSchedule({ ...scheduleData, workshops: newWorkshops });
		setShowWorkshopDialog(false);
		setEditingWorkshop(null);
	};

	const handleDeleteWorkshop = (wsId: string) => {
		const newData = {
			...scheduleData,
			workshops: scheduleData.workshops.filter((w) => w.id !== wsId),
		};
		saveSchedule(newData);
	};

	const handleDuplicateWorkshop = (ws: Workshop) => {
		const dupWs: Workshop = {
			...ws,
			id: `ws-${Date.now()}`,
			title: `${ws.title} (copy)`,
			status: "draft",
			isLocked: false,
		};
		saveSchedule({
			...scheduleData,
			workshops: [...scheduleData.workshops, dupWs],
		});
	};

	// ===== Computed =====

	const dayWorkshops = useMemo(
		() => scheduleData.workshops.filter((w) => w.dayId === selectedDayId),
		[scheduleData.workshops, selectedDayId],
	);

	// Unassigned contract artists (confirmed but no workshops)
	const unassignedArtists = useMemo(() => {
		const assignedNames = new Set(
			scheduleData.workshops.flatMap((w) => w.artistNames || []),
		);
		return contractArtists
			.filter(
				(a) =>
					a.status === "confirmed" &&
					(a.agreement?.workshopsConfirmed || 0) > 0,
			)
			.filter((a) => !assignedNames.has(a.stageName));
	}, [contractArtists, scheduleData.workshops]);

	// Time grid computation
	const { timeSlots, startMinutes } = useMemo(() => {
		const [startH, startM] = scheduleData.settings.dayStartTime
			.split(":")
			.map(Number);
		const [endH, endM] = scheduleData.settings.dayEndTime
			.split(":")
			.map(Number);
		const start = startH * 60 + startM;
		const end = endH * 60 + endM;
		const interval = scheduleData.settings.snapInterval;
		const slots: string[] = [];
		for (let m = start; m < end; m += interval) {
			const h = Math.floor(m / 60);
			const min = m % 60;
			slots.push(
				`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`,
			);
		}
		return { timeSlots: slots, startMinutes: start };
	}, [scheduleData.settings]);

	const timeToRow = useCallback(
		(time: string) => {
			const [h, m] = time.split(":").map(Number);
			return Math.floor(
				(h * 60 + m - startMinutes) /
					scheduleData.settings.snapInterval,
			);
		},
		[startMinutes, scheduleData.settings.snapInterval],
	);

	// Conflict detection
	const getConflicts = useCallback(
		(ws: Workshop): string[] => {
			const conflicts: string[] = [];
			const allWs = scheduleData.workshops.filter(
				(w) => w.id !== ws.id && w.dayId === ws.dayId,
			);

			// Room overlap
			allWs.forEach((w) => {
				if (w.roomId === ws.roomId) {
					const wsStart = ws.startTime.split(":").map(Number);
					const wsEnd = ws.endTime.split(":").map(Number);
					const wStart = w.startTime.split(":").map(Number);
					const wEnd = w.endTime.split(":").map(Number);
					const wsS = wsStart[0] * 60 + wsStart[1];
					const wsE = wsEnd[0] * 60 + wsEnd[1];
					const wS = wStart[0] * 60 + wStart[1];
					const wE = wEnd[0] * 60 + wEnd[1];
					if (wsS < wE && wS < wsE) {
						conflicts.push(
							`Room conflict with "${w.title}" (${w.startTime}–${w.endTime})`,
						);
					}
				}
			});

			// Artist double booking
			if ((ws.artistNames || []).length > 0) {
				allWs.forEach((w) => {
					const overlap = (ws.artistNames || []).filter((n) =>
						(w.artistNames || []).includes(n),
					);
					if (overlap.length > 0) {
						const wsS = ws.startTime.split(":").map(Number);
						const wsE = ws.endTime.split(":").map(Number);
						const wS = w.startTime.split(":").map(Number);
						const wE = w.endTime.split(":").map(Number);
						if (
							wsS[0] * 60 + wsS[1] < wE[0] * 60 + wE[1] &&
							wS[0] * 60 + wS[1] < wsE[0] * 60 + wsE[1]
						) {
							conflicts.push(
								`Artist double-booked: ${overlap.join(", ")} with "${w.title}"`,
							);
						}
					}
				});
			}

			// Blocked time detection (break workshops act as blocked times)
			const breakWorkshops = scheduleData.workshops.filter(
				(w) => w.id !== ws.id && w.dayId === ws.dayId && w.isBreak,
			);
			if (!ws.isBreak) {
				breakWorkshops.forEach((bt) => {
					const toMin = (t: string) => {
						const [h, m] = t.split(":").map(Number);
						return h * 60 + m;
					};
					const wsS = toMin(ws.startTime),
						wsE = toMin(ws.endTime);
					const btS = toMin(bt.startTime),
						btE = toMin(bt.endTime);
					if (
						wsS < btE &&
						btS < wsE &&
						(!bt.roomId || bt.roomId === ws.roomId)
					) {
						conflicts.push(
							`Conflicts with blocked time "${bt.title}" (${bt.startTime}–${bt.endTime})`,
						);
					}
				});
			}

			// Day range violation
			const toMin = (t: string) => {
				const [h, m] = t.split(":").map(Number);
				return h * 60 + m;
			};
			const wsStartMin = toMin(ws.startTime);
			const wsEndMin = toMin(ws.endTime);
			const dayStartMin = toMin(scheduleData.settings.dayStartTime);
			const dayEndMin = toMin(scheduleData.settings.dayEndTime);
			if (wsStartMin < dayStartMin || wsEndMin > dayEndMin) {
				conflicts.push(
					`Workshop time (${ws.startTime}–${ws.endTime}) exceeds day range (${scheduleData.settings.dayStartTime}–${scheduleData.settings.dayEndTime})`,
				);
			}

			return conflicts;
		},
		[scheduleData.workshops, scheduleData.settings],
	);

	// ===== LOADING =====

	if (isLoading || contractsLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
					<p className="text-foreground text-lg font-medium">
						Loading Workshop Schedule...
					</p>
				</div>
			</div>
		);
	}

	const totalHeight = timeSlots.length * SLOT_HEIGHT;

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button
						onClick={() => router.back()}
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
							Workshop Schedule
						</h1>
						<p className="text-xs text-muted-foreground">
							Build and manage workshop timetables
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3 text-sm text-muted-foreground">
					{scheduleData.days.length > 0 && (
						<>
							<div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
								<Calendar className="w-3.5 h-3.5" />
								<span>{scheduleData.days.length} days</span>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full">
								<LayoutGrid className="w-3.5 h-3.5" />
								<span>
									{scheduleData.workshops.length} workshops
								</span>
							</div>
							<div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 rounded-full text-green-600">
								<span>
									{
										scheduleData.workshops.filter(
											(w) => w.status === "confirmed",
										).length
									}{" "}
									confirmed
								</span>
							</div>
						</>
					)}
					<button
						onClick={() =>
							router.push(`/event/${eventId}/artist-contracts`)
						}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted rounded-lg transition-colors text-xs"
					>
						<FileText className="w-3.5 h-3.5" /> Contracts
					</button>
					<button
						onClick={handleOpenAddWorkshop}
						disabled={
							scheduleData.rooms.length === 0 ||
							scheduleData.days.length === 0
						}
						className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:from-purple-400 hover:to-pink-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Plus className="w-3.5 h-3.5" /> Add Workshop
					</button>
				</div>
			</header>

			{/* Tabs + Day selector */}
			<div className="flex items-center justify-between px-5 py-2 border-b border-border bg-card">
				<div className="flex gap-1">
					{[
						{
							id: "grid",
							label: "Grid",
							icon: <LayoutGrid className="w-3.5 h-3.5" />,
						},
						{
							id: "table",
							label: "Table",
							icon: <Table2 className="w-3.5 h-3.5" />,
						},
						{
							id: "overview",
							label: "Overview",
							icon: <Eye className="w-3.5 h-3.5" />,
						},
						{
							id: "setup",
							label: "Setup",
							icon: <Settings className="w-3.5 h-3.5" />,
						},
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
								activeTab === tab.id
									? "bg-primary text-foreground shadow-lg shadow-primary/10"
									: "text-muted-foreground hover:bg-secondary"
							}`}
						>
							{tab.icon} {tab.label}
						</button>
					))}
				</div>

				{/* Day chips — only in grid/table */}
				{activeTab !== "setup" && scheduleData.days.length > 0 && (
					<div className="flex gap-1">
						{scheduleData.days
							.sort((a, b) => a.sortOrder - b.sortOrder)
							.map((day) => (
								<button
									key={day.id}
									onClick={() => setSelectedDayId(day.id)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
										selectedDayId === day.id
											? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-primary/10"
											: "text-muted-foreground hover:bg-secondary"
									}`}
								>
									{day.label}
								</button>
							))}
					</div>
				)}
			</div>

			{/* Main content */}
			<div className="flex flex-1 min-h-0">
				{/* Unassigned Artists sidebar — only in grid/table */}
				{activeTab !== "setup" && (
					<div className="w-56 border-r border-border bg-card flex flex-col min-h-0">
						<div className="px-3 py-2.5 border-b border-border">
							<h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
								Unassigned Artists
							</h3>
						</div>
						<div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1.5">
							{unassignedArtists.length === 0 ? (
								<p className="text-[10px] text-muted-foreground text-center py-4">
									All confirmed artists assigned
								</p>
							) : (
								unassignedArtists.map((artist) => (
									<div
										key={artist.id}
										className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer"
										onClick={() => {
											setWsForm({
												...emptyWorkshopForm,
												dayId: selectedDayId,
												roomId:
													scheduleData.rooms[0]?.id ||
													"",
												artistNames: [artist.stageName],
												title: `${artist.stageName} Workshop`,
											});
											setEditingWorkshop(null);
											setShowWorkshopDialog(true);
										}}
									>
										<div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
											{artist.stageName.charAt(0)}
										</div>
										<div className="min-w-0">
											<p className="text-xs text-foreground truncate">
												{artist.stageName}
											</p>
											<p className="text-[10px] text-muted-foreground">
												{artist.agreement
													?.workshopsConfirmed ??
													0}{" "}
												ws agreed
											</p>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{/* Content area */}
				<div className="flex-1 min-h-0 overflow-auto">
					{/* ===== GRID VIEW ===== */}
					{activeTab === "grid" && (
						<div className="p-4">
							{scheduleData.days.length === 0 ||
							scheduleData.rooms.length === 0 ? (
								<div className="text-center py-20 text-muted-foreground">
									<Settings className="w-12 h-12 mx-auto mb-4 opacity-30" />
									<h2 className="text-lg font-semibold text-foreground mb-2">
										Setup Required
									</h2>
									<p className="text-sm">
										Go to <strong>Setup</strong> tab to add
										event days and rooms first.
									</p>
									<button
										onClick={() => setActiveTab("setup")}
										className="mt-4 px-6 py-2 bg-primary text-foreground rounded-lg text-sm hover:bg-primary transition-colors"
									>
										Go to Setup
									</button>
								</div>
							) : (
								<div className="border border-border rounded-xl overflow-hidden bg-background">
									<div className="overflow-x-auto">
										<div className="min-w-[700px]">
											{/* Room headers */}
											<div
												className="grid sticky top-0 z-20 bg-card  border-b border-border"
												style={{
													gridTemplateColumns: `72px repeat(${scheduleData.rooms.length}, 1fr)`,
												}}
											>
												<div className="px-2 py-2.5 flex items-center justify-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border">
													Time
												</div>
												{scheduleData.rooms
													.sort(
														(a, b) =>
															a.sortOrder -
															b.sortOrder,
													)
													.map((room) => (
														<div
															key={room.id}
															className="px-3 py-2.5 flex items-center justify-center text-sm font-semibold text-foreground border-r border-border last:border-r-0"
														>
															{room.name}
															{room.capacity >
																0 && (
																<span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
																	(
																	{
																		room.capacity
																	}
																	)
																</span>
															)}
														</div>
													))}
											</div>

											{/* Grid body */}
											<div
												className="relative"
												style={{ height: totalHeight }}
											>
												{/* Time labels + grid lines */}
												{timeSlots.map((time, idx) => (
													<div
														key={time}
														className="absolute left-0 right-0 border-b border-border"
														style={{
															top:
																idx *
																SLOT_HEIGHT,
															height: SLOT_HEIGHT,
														}}
													>
														<div
															className="absolute left-0 w-[72px] px-2 flex items-start pt-1 text-[11px] font-mono text-muted-foreground border-r border-border bg-card"
															style={{
																height: SLOT_HEIGHT,
															}}
														>
															{time}
														</div>
														{/* Room column dividers */}
														{scheduleData.rooms.map(
															(_, rIdx) => (
																<div
																	key={rIdx}
																	className="absolute top-0 bottom-0 border-r border-border/30"
																	style={{
																		left: `calc(72px + ${(rIdx + 1) * (100 / scheduleData.rooms.length)}% - ${72 / scheduleData.rooms.length}px)`,
																	}}
																/>
															),
														)}
													</div>
												))}

												{/* Workshop blocks */}
												{scheduleData.rooms
													.sort(
														(a, b) =>
															a.sortOrder -
															b.sortOrder,
													)
													.map((room, colIdx) =>
														dayWorkshops
															.filter(
																(w) =>
																	w.roomId ===
																	room.id,
															)
															.map((ws) => {
																const startRow =
																	timeToRow(
																		ws.startTime,
																	);
																const endRow =
																	timeToRow(
																		ws.endTime,
																	);
																const span =
																	endRow -
																	startRow;
																if (span <= 0)
																	return null;

																const colors =
																	ws.isBreak
																		? {
																				bg: "bg-secondary",
																				border: "border-l-primary",
																				text: "text-muted-foreground",
																			}
																		: levelColors[
																				ws
																					.level
																			] ||
																			levelColors.beginner;

																const conflicts =
																	getConflicts(
																		ws,
																	);
																const top =
																	startRow *
																		SLOT_HEIGHT +
																	2;
																const height =
																	span *
																		SLOT_HEIGHT -
																	4;
																const colWidth =
																	100 /
																	scheduleData
																		.rooms
																		.length;
																const left = `calc(72px + ${colIdx * colWidth}% - ${(72 * colIdx) / scheduleData.rooms.length}px + 3px)`;
																const width = `calc(${colWidth}% - ${72 / scheduleData.rooms.length}px - 6px)`;

																return (
																	<div
																		key={
																			ws.id
																		}
																		className={`absolute rounded-lg px-2.5 py-1.5 cursor-pointer transition-all hover:shadow-lg hover:z-10 border-l-[3px] ${colors.bg} ${colors.border} ${ws.isLocked ? "ring-1 ring-primary/30" : ""} ${conflicts.length > 0 ? "ring-1 ring-red-500/50" : ""}`}
																		style={{
																			top,
																			height: Math.max(
																				height,
																				30,
																			),
																			left,
																			width,
																		}}
																		onClick={() =>
																			handleEditWorkshop(
																				ws,
																			)
																		}
																	>
																		<div className="flex items-start justify-between gap-1">
																			<p
																				className={`text-xs font-semibold leading-tight truncate ${colors.text}`}
																			>
																				{
																					ws.title
																				}
																			</p>
																			<div className="flex gap-0.5 shrink-0 mt-0.5">
																				{conflicts.length >
																					0 && (
																					<AlertTriangle className="h-3 w-3 text-red-600" />
																				)}
																				{ws.isFeatured && (
																					<Star className="h-3 w-3 fill-yellow-400 text-yellow-600" />
																				)}
																				{ws.isLocked && (
																					<Lock className="h-3 w-3 text-muted-foreground" />
																				)}
																			</div>
																		</div>
																		{(
																			ws.artistNames ||
																			[]
																		)
																			.length >
																			0 && (
																			<p className="text-[10px] text-muted-foreground truncate mt-0.5">
																				{(
																					ws.artistNames ||
																					[]
																				).join(
																					", ",
																				)}
																			</p>
																		)}
																		{height >=
																			50 &&
																			!ws.isBreak && (
																				<span
																					className={`inline-block mt-1 text-[10px] px-1.5 py-0 rounded border border-current ${colors.text}`}
																				>
																					{
																						ws.level
																					}
																				</span>
																			)}
																		<p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
																			{
																				ws.startTime
																			}
																			–
																			{
																				ws.endTime
																			}
																		</p>
																	</div>
																);
															}),
													)}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* ===== TABLE VIEW ===== */}
					{activeTab === "table" && (
						<div className="p-4">
							<div className="bg-card border border-border rounded-xl overflow-hidden">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-border">
											{[
												"Workshop",
												"Room",
												"Time",
												"Level",
												"Artists",
												"Status",
												"Actions",
											].map((h) => (
												<th
													key={h}
													className="text-left py-3 px-4 text-muted-foreground font-medium text-xs"
												>
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{dayWorkshops.length === 0 ? (
											<tr>
												<td
													colSpan={7}
													className="text-center py-8 text-muted-foreground text-sm"
												>
													No workshops on this day
												</td>
											</tr>
										) : (
											dayWorkshops
												.sort((a, b) =>
													a.startTime.localeCompare(
														b.startTime,
													),
												)
												.map((ws) => {
													const room =
														scheduleData.rooms.find(
															(r) =>
																r.id ===
																ws.roomId,
														);
													const conflicts =
														getConflicts(ws);
													return (
														<tr
															key={ws.id}
															className="border-b border-border hover:bg-secondary/50 transition-colors"
														>
															<td className="py-3 px-4">
																<div className="flex items-center gap-2">
																	{conflicts.length >
																		0 && (
																		<AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
																	)}
																	<div>
																		<p className="text-foreground font-medium">
																			{
																				ws.title
																			}
																		</p>
																		{ws.subtitle && (
																			<p className="text-[10px] text-muted-foreground">
																				{
																					ws.subtitle
																				}
																			</p>
																		)}
																	</div>
																</div>
															</td>
															<td className="py-3 px-4 text-foreground text-xs">
																{room?.name ||
																	"—"}
															</td>
															<td className="py-3 px-4 text-foreground font-mono text-xs">
																{ws.startTime}–
																{ws.endTime}
															</td>
															<td className="py-3 px-4">
																<span
																	className={`px-2 py-0.5 rounded text-[10px] font-medium ${levelColors[ws.level]?.text || ""} ${levelColors[ws.level]?.bg || ""}`}
																>
																	{ws.level}
																</span>
															</td>
															<td className="py-3 px-4 text-foreground text-xs">
																{(
																	ws.artistNames ||
																	[]
																).join(", ") ||
																	"—"}
															</td>
															<td className="py-3 px-4">
																<span
																	className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[ws.status]}`}
																>
																	{ws.status}
																</span>
															</td>
															<td className="py-3 px-4">
																<div className="flex gap-1">
																	<button
																		onClick={() =>
																			handleEditWorkshop(
																				ws,
																			)
																		}
																		className="p-1 text-muted-foreground hover:text-foreground"
																		title="Edit"
																	>
																		<Edit className="w-3.5 h-3.5" />
																	</button>
																	<button
																		onClick={() =>
																			handleDuplicateWorkshop(
																				ws,
																			)
																		}
																		className="p-1 text-muted-foreground hover:text-foreground"
																		title="Duplicate"
																	>
																		<Copy className="w-3.5 h-3.5" />
																	</button>
																	<button
																		onClick={() =>
																			handleDeleteWorkshop(
																				ws.id,
																			)
																		}
																		className="p-1 text-red-600 hover:text-red-600"
																		title="Delete"
																	>
																		<Trash2 className="w-3.5 h-3.5" />
																	</button>
																</div>
															</td>
														</tr>
													);
												})
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* ===== OVERVIEW TAB ===== */}
					{activeTab === "overview" && (
						<div className="p-6 max-w-5xl mx-auto space-y-6">
							{/* Summary stats */}
							<div className="grid grid-cols-4 gap-4">
								{[
									{
										label: "Total Workshops",
										value: scheduleData.workshops.filter(
											(w) => !w.isBreak,
										).length,
										color: "text-muted-foreground",
									},
									{
										label: "Confirmed",
										value: scheduleData.workshops.filter(
											(w) => w.status === "confirmed",
										).length,
										color: "text-green-600",
									},
									{
										label: "Draft / Tentative",
										value: scheduleData.workshops.filter(
											(w) =>
												w.status === "draft" ||
												w.status === "tentative",
										).length,
										color: "text-yellow-600",
									},
									{
										label: "Artists Assigned",
										value: new Set(
											scheduleData.workshops.flatMap(
												(w) => w.artistNames || [],
											),
										).size,
										color: "text-pink-400",
									},
								].map((stat) => (
									<div
										key={stat.label}
										className="bg-card border border-border rounded-xl p-4 text-center"
									>
										<p
											className={`text-2xl font-bold ${stat.color}`}
										>
											{stat.value}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{stat.label}
										</p>
									</div>
								))}
							</div>

							{/* Per-day breakdown */}
							<div className="bg-card border border-border rounded-xl overflow-hidden">
								<div className="px-5 py-3 border-b border-border">
									<h3 className="text-sm font-semibold text-foreground">
										Per-Day Breakdown
									</h3>
								</div>
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-border">
											{[
												"Day",
												"Workshops",
												"Confirmed",
												"Rooms Used",
												"Beginner",
												"Intermediate",
												"Advanced",
												"Special",
												"Conflicts",
											].map((h) => (
												<th
													key={h}
													className="text-left py-3 px-4 text-muted-foreground font-medium text-xs"
												>
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{scheduleData.days
											.sort(
												(a, b) =>
													a.sortOrder - b.sortOrder,
											)
											.map((day) => {
												const dayWs =
													scheduleData.workshops.filter(
														(w) =>
															w.dayId ===
																day.id &&
															!w.isBreak,
													);
												const confirmed = dayWs.filter(
													(w) =>
														w.status ===
														"confirmed",
												).length;
												const roomsUsed = new Set(
													dayWs.map((w) => w.roomId),
												).size;
												const conflictCount =
													dayWs.reduce(
														(sum, ws) =>
															sum +
															getConflicts(ws)
																.length,
														0,
													);
												return (
													<tr
														key={day.id}
														className="border-b border-border hover:bg-secondary/50 transition-colors"
													>
														<td className="py-3 px-4">
															<p className="text-foreground font-medium">
																{day.label}
															</p>
															<p className="text-[10px] text-muted-foreground">
																{day.date}
															</p>
														</td>
														<td className="py-3 px-4 text-foreground font-semibold">
															{dayWs.length}
														</td>
														<td className="py-3 px-4">
															<span className="text-green-600">
																{confirmed}
															</span>
															<span className="text-muted-foreground">
																/{dayWs.length}
															</span>
														</td>
														<td className="py-3 px-4 text-foreground">
															{roomsUsed}/
															{
																scheduleData
																	.rooms
																	.length
															}
														</td>
														<td className="py-3 px-4">
															<span className="text-green-600">
																{
																	dayWs.filter(
																		(w) =>
																			w.level ===
																			"beginner",
																	).length
																}
															</span>
														</td>
														<td className="py-3 px-4">
															<span className="text-blue-600">
																{
																	dayWs.filter(
																		(w) =>
																			w.level ===
																			"intermediate",
																	).length
																}
															</span>
														</td>
														<td className="py-3 px-4">
															<span className="text-red-600">
																{
																	dayWs.filter(
																		(w) =>
																			w.level ===
																			"advanced",
																	).length
																}
															</span>
														</td>
														<td className="py-3 px-4">
															<span className="text-muted-foreground">
																{
																	dayWs.filter(
																		(w) =>
																			w.level ===
																			"special",
																	).length
																}
															</span>
														</td>
														<td className="py-3 px-4">
															{conflictCount >
															0 ? (
																<span className="text-red-600 font-medium flex items-center gap-1">
																	<AlertTriangle className="w-3 h-3" />{" "}
																	{
																		conflictCount
																	}
																</span>
															) : (
																<span className="text-green-600">
																	✓
																</span>
															)}
														</td>
													</tr>
												);
											})}
									</tbody>
								</table>
							</div>

							{/* Artist coverage */}
							<div className="bg-card border border-border rounded-xl overflow-hidden">
								<div className="px-5 py-3 border-b border-border">
									<h3 className="text-sm font-semibold text-foreground">
										Artist Coverage
									</h3>
								</div>
								<div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{contractArtists
										.filter(
											(a) =>
												a.status === "confirmed" &&
												(a.agreement
													?.workshopsConfirmed || 0) >
													0,
										)
										.map((artist) => {
											const assignedCount =
												scheduleData.workshops.filter(
													(w) =>
														(
															w.artistNames || []
														).includes(
															artist.stageName,
														) && !w.isBreak,
												).length;
											const agreed =
												artist.agreement
													?.workshopsConfirmed || 0;
											const isFull =
												assignedCount >= agreed;
											const isOver =
												assignedCount > agreed;
											return (
												<div
													key={artist.id}
													className={`p-3 rounded-lg border ${isOver ? "bg-red-500/10 border-red-500/30" : isFull ? "bg-green-500/10 border-green-500/30" : "bg-secondary/50 border-border"}`}
												>
													<div className="flex items-center gap-2 mb-1">
														<div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
															{artist.stageName.charAt(
																0,
															)}
														</div>
														<p className="text-xs text-foreground font-medium truncate">
															{artist.stageName}
														</p>
													</div>
													<div className="flex items-center justify-between">
														<span
															className={`text-xs ${isOver ? "text-red-600" : isFull ? "text-green-600" : "text-yellow-600"}`}
														>
															{assignedCount}/
															{agreed} workshops
														</span>
														{isOver && (
															<span className="text-[10px] text-red-600">
																Over-assigned
															</span>
														)}
														{isFull && !isOver && (
															<span className="text-[10px] text-green-600">
																Complete
															</span>
														)}
														{!isFull && (
															<span className="text-[10px] text-yellow-600">
																Needs{" "}
																{agreed -
																	assignedCount}{" "}
																more
															</span>
														)}
													</div>
												</div>
											);
										})}
								</div>
							</div>

							{/* Level distribution */}
							<div className="bg-card border border-border rounded-xl p-5">
								<h3 className="text-sm font-semibold text-foreground mb-4">
									Level Distribution
								</h3>
								<div className="space-y-3">
									{(
										[
											"beginner",
											"intermediate",
											"advanced",
											"special",
										] as const
									).map((level) => {
										const count =
											scheduleData.workshops.filter(
												(w) =>
													w.level === level &&
													!w.isBreak,
											).length;
										const total =
											scheduleData.workshops.filter(
												(w) => !w.isBreak,
											).length;
										const pct =
											total > 0
												? Math.round(
														(count / total) * 100,
													)
												: 0;
										return (
											<div
												key={level}
												className="flex items-center gap-3"
											>
												<span
													className={`text-xs font-medium w-24 capitalize ${levelColors[level].text}`}
												>
													{level}
												</span>
												<div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
													<div
														className={`h-full rounded-full ${level === "beginner" ? "bg-green-500" : level === "intermediate" ? "bg-blue-500" : level === "advanced" ? "bg-red-500" : "bg-primary"}`}
														style={{
															width: `${pct}%`,
														}}
													/>
												</div>
												<span className="text-xs text-muted-foreground w-16 text-right">
													{count} ({pct}%)
												</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* ===== SETUP TAB ===== */}
					{activeTab === "setup" && (
						<div className="p-6 max-w-4xl mx-auto space-y-8">
							{/* Days */}
							<div className="bg-card border border-border rounded-xl p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />{" "}
										Event Days
									</h3>
									<button
										onClick={() => setShowDayDialog(true)}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary transition-colors"
									>
										<Plus className="w-3.5 h-3.5" /> Add Day
									</button>
								</div>
								{scheduleData.days.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										No days added yet. Add your first event
										day.
									</p>
								) : (
									<div className="space-y-2">
										{scheduleData.days
											.sort(
												(a, b) =>
													a.sortOrder - b.sortOrder,
											)
											.map((day) => (
												<div
													key={day.id}
													className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
												>
													<div className="flex items-center gap-3">
														<Calendar className="w-4 h-4 text-muted-foreground" />
														<span className="text-sm text-foreground font-medium">
															{day.label}
														</span>
														<span className="text-xs text-muted-foreground">
															{day.date}
														</span>
														<span className="text-[10px] text-muted-foreground">
															{
																scheduleData.workshops.filter(
																	(w) =>
																		w.dayId ===
																		day.id,
																).length
															}{" "}
															workshops
														</span>
													</div>
													<button
														onClick={() =>
															handleDeleteDay(
																day.id,
															)
														}
														className="p-1 text-red-600 hover:text-red-600"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											))}
									</div>
								)}

								{showDayDialog && (
									<div className="mt-4 p-4 bg-secondary rounded-lg border border-border">
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="text-xs text-muted-foreground mb-1 block">
													Day Label
												</label>
												<input
													type="text"
													value={dayForm.label}
													onChange={(e) =>
														setDayForm({
															...dayForm,
															label: e.target
																.value,
														})
													}
													placeholder="e.g. Friday"
													className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
												/>
											</div>
											<div>
												<label className="text-xs text-muted-foreground mb-1 block">
													Date
												</label>
												<input
													type="date"
													value={dayForm.date}
													onChange={(e) =>
														setDayForm({
															...dayForm,
															date: e.target
																.value,
														})
													}
													className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
												/>
											</div>
										</div>
										<div className="flex justify-end gap-2 mt-3">
											<button
												onClick={() =>
													setShowDayDialog(false)
												}
												className="px-3 py-1.5 text-muted-foreground text-xs"
											>
												Cancel
											</button>
											<button
												onClick={handleAddDay}
												className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary transition-colors"
											>
												<Save className="w-3 h-3 inline mr-1" />
												Add Day
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Rooms */}
							<div className="bg-card border border-border rounded-xl p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
										<MapPin className="w-4 h-4 text-indigo-600" />{" "}
										Rooms
									</h3>
									<button
										onClick={() => setShowRoomDialog(true)}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary transition-colors"
									>
										<Plus className="w-3.5 h-3.5" /> Add
										Room
									</button>
								</div>
								{scheduleData.rooms.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										No rooms added yet. Add your first room.
									</p>
								) : (
									<div className="space-y-2">
										{scheduleData.rooms
											.sort(
												(a, b) =>
													a.sortOrder - b.sortOrder,
											)
											.map((room) => (
												<div
													key={room.id}
													className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
												>
													<div className="flex items-center gap-3">
														<MapPin className="w-4 h-4 text-indigo-600" />
														<span className="text-sm text-foreground font-medium">
															{room.name}
														</span>
														<span className="text-xs text-muted-foreground">
															capacity:{" "}
															{room.capacity}
														</span>
													</div>
													<button
														onClick={() =>
															handleDeleteRoom(
																room.id,
															)
														}
														className="p-1 text-red-600 hover:text-red-600"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											))}
									</div>
								)}

								{showRoomDialog && (
									<div className="mt-4 p-4 bg-secondary rounded-lg border border-border">
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="text-xs text-muted-foreground mb-1 block">
													Room Name
												</label>
												<input
													type="text"
													value={roomForm.name}
													onChange={(e) =>
														setRoomForm({
															...roomForm,
															name: e.target
																.value,
														})
													}
													placeholder="e.g. Main Hall"
													className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
												/>
											</div>
											<div>
												<label className="text-xs text-muted-foreground mb-1 block">
													Capacity
												</label>
												<input
													type="number"
													value={roomForm.capacity}
													onChange={(e) =>
														setRoomForm({
															...roomForm,
															capacity:
																parseInt(
																	e.target
																		.value,
																) || 0,
														})
													}
													className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
												/>
											</div>
										</div>
										<div className="flex justify-end gap-2 mt-3">
											<button
												onClick={() =>
													setShowRoomDialog(false)
												}
												className="px-3 py-1.5 text-muted-foreground text-xs"
											>
												Cancel
											</button>
											<button
												onClick={handleAddRoom}
												className="px-4 py-1.5 bg-primary text-foreground rounded-lg text-xs hover:bg-primary transition-colors"
											>
												<Save className="w-3 h-3 inline mr-1" />
												Add Room
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Time Settings */}
							<div className="bg-card border border-border rounded-xl p-6">
								<h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
									<Clock className="w-4 h-4 text-yellow-600" />{" "}
									Time Settings
								</h3>
								<div className="grid grid-cols-3 gap-4">
									<div>
										<label className="text-xs text-muted-foreground mb-1 block">
											Day Start
										</label>
										<input
											type="time"
											value={
												scheduleData.settings
													.dayStartTime
											}
											onChange={(e) =>
												saveSchedule({
													...scheduleData,
													settings: {
														...scheduleData.settings,
														dayStartTime:
															e.target.value,
													},
												})
											}
											className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
										/>
									</div>
									<div>
										<label className="text-xs text-muted-foreground mb-1 block">
											Day End
										</label>
										<input
											type="time"
											value={
												scheduleData.settings.dayEndTime
											}
											onChange={(e) =>
												saveSchedule({
													...scheduleData,
													settings: {
														...scheduleData.settings,
														dayEndTime:
															e.target.value,
													},
												})
											}
											className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
										/>
									</div>
									<div>
										<label className="text-xs text-muted-foreground mb-1 block">
											Snap Interval (min)
										</label>
										<select
											value={
												scheduleData.settings
													.snapInterval
											}
											onChange={(e) =>
												saveSchedule({
													...scheduleData,
													settings: {
														...scheduleData.settings,
														snapInterval: parseInt(
															e.target.value,
														),
													},
												})
											}
											className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
										>
											<option value={5}>5 min</option>
											<option value={10}>10 min</option>
											<option value={15}>15 min</option>
											<option value={30}>30 min</option>
										</select>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Workshop Form Dialog */}
			{showWorkshopDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
					<div className="bg-white border border-gray-200 rounded-2xl p-6 w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl text-gray-900">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-bold text-foreground">
								{editingWorkshop
									? "Edit Workshop"
									: "Add Workshop"}
							</h3>
							<button
								onClick={() => setShowWorkshopDialog(false)}
								className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Title *
								</label>
								<input
									type="text"
									value={wsForm.title}
									onChange={(e) =>
										setWsForm({
											...wsForm,
											title: e.target.value,
										})
									}
									placeholder="e.g. Salsa Fundamentals"
									className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Subtitle
								</label>
								<input
									type="text"
									value={wsForm.subtitle || ""}
									onChange={(e) =>
										setWsForm({
											...wsForm,
											subtitle: e.target.value,
										})
									}
									placeholder="e.g. Shine & Partnerwork"
									className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Day
									</label>
									<select
										value={wsForm.dayId}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												dayId: e.target.value,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									>
										{scheduleData.days.map((d) => (
											<option key={d.id} value={d.id}>
												{d.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Room
									</label>
									<select
										value={wsForm.roomId}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												roomId: e.target.value,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									>
										{scheduleData.rooms.map((r) => (
											<option key={r.id} value={r.id}>
												{r.name}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Start Time
									</label>
									<input
										type="time"
										value={wsForm.startTime}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												startTime: e.target.value,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										End Time
									</label>
									<input
										type="time"
										value={wsForm.endTime}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												endTime: e.target.value,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Level
									</label>
									<select
										value={wsForm.level}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												level: e.target.value as any,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									>
										<option value="beginner">
											Beginner
										</option>
										<option value="intermediate">
											Intermediate
										</option>
										<option value="advanced">
											Advanced
										</option>
										<option value="special">
											Special / Masterclass
										</option>
									</select>
								</div>
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Status
									</label>
									<select
										value={wsForm.status}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												status: e.target.value as any,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									>
										<option value="draft">Draft</option>
										<option value="confirmed">
											Confirmed
										</option>
										<option value="tentative">
											Tentative
										</option>
										<option value="cancelled">
											Cancelled
										</option>
									</select>
								</div>
							</div>
							<div>
								<label className="text-xs text-muted-foreground mb-1 block">
									Artists (comma-separated)
								</label>
								<input
									type="text"
									value={wsForm.artistNames?.join(", ") || ""}
									onChange={(e) =>
										setWsForm({
											...wsForm,
											artistNames: e.target.value
												.split(",")
												.map((s) => s.trim())
												.filter(Boolean),
										})
									}
									placeholder="e.g. Maria & Carlos, Anna Torres"
									className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Capacity
									</label>
									<input
										type="number"
										value={wsForm.capacity || ""}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												capacity:
													parseInt(e.target.value) ||
													0,
											})
										}
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground mb-1 block">
										Category
									</label>
									<input
										type="text"
										value={wsForm.category || ""}
										onChange={(e) =>
											setWsForm({
												...wsForm,
												category: e.target.value,
											})
										}
										placeholder="e.g. Salsa, Bachata"
										className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
									/>
								</div>
							</div>

							<div className="flex gap-4">
								{[
									{
										label: "Featured",
										field: "isFeatured",
										icon: <Star className="w-3.5 h-3.5" />,
									},
									{
										label: "Locked",
										field: "isLocked",
										icon: <Lock className="w-3.5 h-3.5" />,
									},
									{
										label: "Break",
										field: "isBreak",
										icon: <Clock className="w-3.5 h-3.5" />,
									},
								].map((toggle) => (
									<label
										key={toggle.field}
										className="flex items-center gap-2 cursor-pointer"
									>
										<input
											type="checkbox"
											checked={
												(wsForm as any)[toggle.field]
											}
											onChange={(e) =>
												setWsForm({
													...wsForm,
													[toggle.field]:
														e.target.checked,
												})
											}
											className="w-4 h-4 rounded border-border text-muted-foreground bg-card focus:ring-primary"
										/>
										<span className="text-xs text-foreground flex items-center gap-1">
											{toggle.icon}
											{toggle.label}
										</span>
									</label>
								))}
							</div>
						</div>

						<div className="flex justify-between mt-6">
							{editingWorkshop && (
								<button
									onClick={() => {
										handleDeleteWorkshop(
											editingWorkshop.id,
										);
										setShowWorkshopDialog(false);
									}}
									className="px-4 py-2 text-red-600 hover:bg-red-500/20 rounded-lg text-sm flex items-center gap-1"
								>
									<Trash2 className="w-3.5 h-3.5" /> Delete
								</button>
							)}
							<div className="flex gap-3 ml-auto">
								<button
									onClick={() => setShowWorkshopDialog(false)}
									className="px-4 py-2 text-muted-foreground text-sm"
								>
									Cancel
								</button>
								<button
									onClick={handleSaveWorkshop}
									disabled={!wsForm.title}
									className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-400 hover:to-pink-400 transition-all disabled:opacity-50 shadow-lg shadow-primary/10"
								>
									{editingWorkshop
										? "Save Changes"
										: "Add Workshop"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
