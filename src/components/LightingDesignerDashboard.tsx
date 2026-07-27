"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
	X,
	Maximize2,
	Minimize2,
	Settings,
	Sun,
	Moon,
	Eye,
	EyeOff,
	Play,
	Pause,
	Printer,
	ChevronDown,
	ExternalLink,
	Lightbulb,
	Palette,
	Video,
	Music,
	Image as ImageIcon,
	StickyNote,
	Edit3,
	Save,
	RefreshCw,
	Zap,
	MapPin,
} from "lucide-react";
import Image from "next/image";
import { convertGcsUrl } from "@/lib/media-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Artist {
	id: string;
	artist_name?: string;
	artistName?: string;
	style?: string;
	performance_duration?: number;
	performanceDuration?: number;
	performance_order?: number | null;
	performanceOrder?: number | null;
	performance_status?: string | null;
	performance_date?: string | null;
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	lightRequests?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	customStagePosition?: string;
	showLink?: string;
	musicTrack?: any;
	musicTracks?: any[];
	galleryFiles?: any[];
	image_url?: string;
	backstage_color?: string;
	is_completed?: boolean;
	cue_notes?: string;
	eventShowId?: string;
}

interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: {
		id: string;
		type: string;
		title: string;
		duration?: number;
		extraTime?: number; // buffer time, added on top of duration
		performance_order: number;
		notes?: string;
		color?: string;
	};
	performance_order: number;
	status?: string;
}

interface LightingNotes {
	[artistId: string]: {
		lightingNotes?: string;
		editNotes?: string;
		lightingColor?: string;
		lightingColorTwo?: string;
		lightingColorThree?: string;
		updatedAt?: string;
	};
}

interface ColumnVisibility {
	video: boolean;
	music: boolean;
	costumeImage: boolean;
	lightingNotes: boolean;
	costumeColor: boolean;
	lightingColor: boolean;
	stagePosition: boolean;
	editNotes: boolean;
}

type ViewMode = "planning" | "live";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface LightingDesignerDashboardProps {
	eventId: string;
	isOpen: boolean;
	onClose: () => void;
	performanceDate: string;
	isStandalone?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LightingDesignerDashboard({
	eventId,
	isOpen,
	onClose,
	performanceDate,
	isStandalone = false,
}: LightingDesignerDashboardProps) {
	const [isFullscreen, setIsFullscreen] = useState(isStandalone);
	const [loading, setLoading] = useState(true);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [lightingNotes, setLightingNotes] = useState<LightingNotes>({});
	const [viewMode, setViewMode] = useState<ViewMode>("planning");
	const [darkMode, setDarkMode] = useState(false);
	const [showColumnSettings, setShowColumnSettings] = useState(false);
	const [showPrintPreview, setShowPrintPreview] = useState(false);
	const [activeCueIndex, setActiveCueIndex] = useState<number | null>(null);
	const [autoScroll, setAutoScroll] = useState(false);
	const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
	const [expandedImage, setExpandedImage] = useState<string | null>(null);
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [editingEditNoteId, setEditingEditNoteId] = useState<string | null>(
		null,
	);
	const [savingNote, setSavingNote] = useState(false);
	const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

	const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
	const activeRowRef = useRef<HTMLTableRowElement | null>(null);
	const settingsRef = useRef<HTMLDivElement>(null);

	const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
		video: true,
		music: true,
		costumeImage: true,
		lightingNotes: true,
		costumeColor: true,
		lightingColor: true,
		stagePosition: true,
		editNotes: true,
	});

	const [printColumns, setPrintColumns] = useState<ColumnVisibility>({
		video: false,
		music: false,
		costumeImage: true,
		lightingNotes: true,
		costumeColor: true,
		lightingColor: true,
		stagePosition: true,
		editNotes: false,
	});

	// Live mode: only essential columns
	const liveColumns: ColumnVisibility = {
		video: false,
		music: false,
		costumeImage: false,
		lightingNotes: false,
		costumeColor: false,
		lightingColor: true,
		stagePosition: true,
		editNotes: false,
	};

	const effectiveColumns =
		viewMode === "live" ? liveColumns : columnVisibility;

	/* ------------------------------------------------------------------ */
	/*  Data fetching                                                      */
	/* ------------------------------------------------------------------ */

	const fetchShowOrder = useCallback(async () => {
		if (!performanceDate) return;
		try {
			// Fetch artists
			const artistsRes = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			const artistsData = await artistsRes.json();
			const allArtists: Artist[] = artistsData.success
				? artistsData.data || []
				: [];

			// Normalize date for comparison
			const normalizeDate = (d: string) => {
				if (!d) return "";
				if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
				if (d.includes("T")) return d.split("T")[0];
				try {
					const dt = new Date(d);
					return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
				} catch {
					return d;
				}
			};

			const normalizedDate = normalizeDate(performanceDate);

			// Filter to this perf date & assigned to show order
			const assignedArtists = allArtists
				.filter((a) => {
					const ad = normalizeDate(
						a.performance_date || (a as any).performanceDate || "",
					);
					return (
						ad === normalizedDate &&
						a.performance_order !== null &&
						a.performance_order !== undefined
					);
				})
				.sort(
					(a, b) =>
						(a.performance_order || 0) - (b.performance_order || 0),
				);

			// Fetch show order with cues
			const showOrderRes = await fetch(
				`/api/events/${eventId}/show-order?performanceDate=${performanceDate}&t=${Date.now()}`,
			);
			const showOrderData = await showOrderRes.json();

			let items: ShowOrderItem[] = [];

			if (showOrderData.success && showOrderData.data?.order) {
				// Build items from show order metadata
				const orderMetadata = showOrderData.data.order;

				for (const meta of orderMetadata) {
					if (meta.type === "artist") {
						const artist = allArtists.find(
							(a) =>
								(a as any).eventShowId === meta.id ||
								a.id === meta.id,
						);
						if (artist) {
							items.push({
								id: meta.id,
								type: "artist",
								artist,
								performance_order: meta.performance_order,
								status:
									meta.status ||
									artist.performance_status ||
									"not_started",
							});
						}
					} else if (meta.type === "cue") {
						items.push({
							id: meta.id,
							type: "cue",
							cue: {
								id: meta.id,
								type: meta.cue_type || meta.type,
								title: meta.title || "Cue",
								duration: meta.duration,
								performance_order: meta.performance_order,
								notes: meta.notes,
								color: meta.color,
							},
							performance_order: meta.performance_order,
							status: meta.status,
						});
					}
				}
			}

			// If no show order data, build from assigned artists
			if (items.length === 0 && assignedArtists.length > 0) {
				items = assignedArtists.map((artist) => ({
					id: (artist as any).eventShowId || artist.id,
					type: "artist" as const,
					artist,
					performance_order: artist.performance_order || 0,
					status: artist.performance_status || "not_started",
				}));
			}

			items.sort(
				(a, b) =>
					(a.performance_order || 0) - (b.performance_order || 0),
			);

			setShowOrderItems(items);

			// Find active cue
			const activeIdx = items.findIndex(
				(item) =>
					item.status === "currently_on_stage" ||
					item.status === "next_on_stage",
			);
			if (activeIdx >= 0) setActiveCueIndex(activeIdx);
		} catch (error) {
			console.error("Failed to fetch show order:", error);
		} finally {
			setLoading(false);
		}
	}, [eventId, performanceDate]);

	const fetchLightingNotes = useCallback(async () => {
		if (!performanceDate) return;
		try {
			const res = await fetch(
				`/api/events/${eventId}/lighting-designer?performanceDate=${performanceDate}&t=${Date.now()}`,
			);
			const data = await res.json();
			if (data.success && data.data?.notes) {
				setLightingNotes(data.data.notes);
			}
		} catch (error) {
			console.error("Failed to fetch lighting notes:", error);
		}
	}, [eventId, performanceDate]);

	useEffect(() => {
		if (isOpen) {
			setLoading(true);
			fetchShowOrder();
			fetchLightingNotes();
		}
	}, [isOpen, fetchShowOrder, fetchLightingNotes]);

	const performanceDateRef = useRef(performanceDate);
	useEffect(() => {
		performanceDateRef.current = performanceDate;
	}, [performanceDate]);

	// WebSocket listener for real-time updates
	useEffect(() => {
		if (!isOpen) return;

		let wsManager: any = null;

		const handleLightingUpdate = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (
				detail?.eventId === eventId &&
				detail?.artistId &&
				detail?.notes
			) {
				setLightingNotes((prev) => ({
					...prev,
					[detail.artistId]: detail.notes,
				}));
			}
		};

		const handleShowOrderUpdate = () => {
			fetchShowOrder();
		};

		window.addEventListener(
			"lighting_designer_updated",
			handleLightingUpdate,
		);
		window.addEventListener("show-order-updated", handleShowOrderUpdate);
		window.addEventListener(
			"performance-order-update",
			handleShowOrderUpdate,
		);

		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } = await import(
					"@/lib/websocket-manager"
				);

				wsManager = createWebSocketManager({
					eventId,
					role: "lighting",
					userId: `lighting_${eventId}`,
					showToasts: false,
					onConnect: () => {
						console.log("Lighting WebSocket connected");
					},
					onDisconnect: () => {
						console.log("Lighting WebSocket disconnected");
					},
					onDataUpdate: () => {
						console.log("Lighting WebSocket data update triggered");
						fetchShowOrder();
						fetchLightingNotes();
					},
				});

				await wsManager.initialize();

				const triggerGlobalRefresh = () => {
					console.log("Lighting: Triggering refresh via WebSocket event...");
					setTimeout(() => {
						fetchShowOrder();
						fetchLightingNotes();
					}, 500);
				};

				const syncEvents = [
					"performance-order-update",
					"show-order-updated",
					"artist_color_updated",
					"rehearsal_updated",
					"artist_completion_toggled",
					"cue_completion_toggled",
					"show_date_info_updated",
					"timing-settings-updated",
					"artist_checked_in",
					"artist_quality_rating_updated",
					"artist_cue_updated",
					"cue_updated",
					"artist_status_changed",
					"lighting_designer_updated"
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						console.log(`Lighting: Received WebSocket event [${evtName}]:`, data);
						if (data && data.eventId === eventId) {
							if (evtName === "lighting_designer_updated") {
								window.dispatchEvent(
									new CustomEvent("lighting_designer_updated", {
										detail: data,
									}),
								);
							}
							triggerGlobalRefresh();
						}
					});
				});

				// Store reference for clean-up
				(window as any).lightingWsManager = wsManager;
			} catch (error) {
				console.error("Error initializing Lighting WebSocket:", error);
			}
		};

		initializeWebSocket();

		return () => {
			window.removeEventListener(
				"lighting_designer_updated",
				handleLightingUpdate,
			);
			window.removeEventListener(
				"show-order-updated",
				handleShowOrderUpdate,
			);
			window.removeEventListener(
				"performance-order-update",
				handleShowOrderUpdate,
			);
			if ((window as any).lightingWsManager) {
				(window as any).lightingWsManager.destroy();
				delete (window as any).lightingWsManager;
			}
		};
	}, [isOpen, eventId, fetchShowOrder, fetchLightingNotes]);

	// Auto-scroll to active cue
	useEffect(() => {
		if (autoScroll && activeRowRef.current) {
			activeRowRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [activeCueIndex, autoScroll]);

	// Close settings on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(e.target as Node)
			) {
				setShowColumnSettings(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	/* ------------------------------------------------------------------ */
	/*  Handlers                                                           */
	/* ------------------------------------------------------------------ */

	const saveLightingNote = async (
		artistId: string,
		field:
			| "lightingNotes"
			| "editNotes"
			| "lightingColor"
			| "lightingColorTwo"
			| "lightingColorThree",
		value: string,
	) => {
		setSavingNote(true);
		try {
			// Find the item to get the base artist ID if artistId is an eventShowId
			const item = showOrderItems.find((i) => i.id === artistId);
			const baseArtistId = item?.type === "artist" ? item.artist?.id || artistId : artistId;

			const res = await fetch(
				`/api/events/${eventId}/lighting-designer`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						performanceDate,
						artistId: baseArtistId,
						eventShowId: artistId === baseArtistId ? "" : artistId,
						[field]: value,
					}),
				},
			);
			const data = await res.json();
			if (data.success && data.data?.notes) {
				setLightingNotes(data.data.notes);
			}
		} catch (error) {
			console.error("Failed to save note:", error);
		} finally {
			setSavingNote(false);
			setEditingNoteId(null);
			setEditingEditNoteId(null);
		}
	};

	const toggleAudio = (artistId: string, url: string) => {
		if (playingAudioId === artistId) {
			audioRefs.current[artistId]?.pause();
			setPlayingAudioId(null);
		} else {
			// Pause any existing
			Object.values(audioRefs.current).forEach((a) => a?.pause());
			if (!audioRefs.current[artistId]) {
				audioRefs.current[artistId] = new Audio(url);
				audioRefs.current[artistId].onended = () =>
					setPlayingAudioId(null);
			}
			audioRefs.current[artistId].play();
			setPlayingAudioId(artistId);
		}
	};

	const getArtistName = (item: ShowOrderItem) => {
		if (item.type === "cue") return item.cue?.title || "Cue";
		const a = item.artist;
		if (!a) return "Unknown";
		return a.artist_name || a.artistName || "Unknown";
	};

	const getMusicUrl = (artist: Artist) => {
		const track =
			artist.musicTrack ||
			artist.musicTracks?.find((t: any) => t.is_main_track) ||
			artist.musicTracks?.[0];
		if (!track) return null;
		const url = track.file_url || track.url || track.fileUrl;
		if (!url) return null;
		return convertGcsUrl(url);
	};

	const getCostumeColors = (artist: Artist) => {
		const colors: string[] = [];
		const c1 = artist.manualCostumeColor || artist.costumeColor || "";
		const c2 = artist.manualCostumeColorTwo || artist.costumeColorTwo || "";
		const c3 =
			artist.manualCostumeColorThree || artist.costumeColorThree || "";
		if (c1) colors.push(c1);
		if (c2) colors.push(c2);
		if (c3) colors.push(c3);
		return colors;
	};

	const getLightColors = (artist: Artist) => {
		const colors: string[] = [];
		const c1 = artist.manualLightColor || artist.lightColorSingle || "";
		const c2 = artist.manualLightColorTwo || artist.lightColorTwo || "";
		const c3 = artist.manualLightColorThree || artist.lightColorThree || "";
		if (c1) colors.push(c1);
		if (c2) colors.push(c2);
		if (c3) colors.push(c3);
		return colors;
	};

	const getStagePosition = (artist: Artist) => {
		if (artist.customStagePosition) return artist.customStagePosition;
		const parts: string[] = [];
		if (artist.stagePositionStart) parts.push(artist.stagePositionStart);
		if (artist.stagePositionEnd) parts.push(artist.stagePositionEnd);
		return parts.join(" → ") || "—";
	};

	const getCostumeImage = (artist: Artist) => {
		if (artist.galleryFiles && artist.galleryFiles.length > 0) {
			const costumeImg = artist.galleryFiles.find(
				(f: any) =>
					f.category === "costume" ||
					f.label?.toLowerCase().includes("costume"),
			);
			if (costumeImg) {
				const url =
					costumeImg.file_url || costumeImg.url || costumeImg.fileUrl;
				return convertGcsUrl(url || "");
			}
			// Fallback to first image
			const firstImg = artist.galleryFiles[0];
			const url = firstImg.file_url || firstImg.url || firstImg.fileUrl;
			return convertGcsUrl(url || "");
		}
		if (artist.image_url) {
			return convertGcsUrl(artist.image_url);
		}
		return null;
	};

	const artistItems = useMemo(
		() => showOrderItems.filter((item) => item.type === "artist"),
		[showOrderItems],
	);

	/* ------------------------------------------------------------------ */
	/*  Print handler                                                      */
	/* ------------------------------------------------------------------ */

	const handlePrint = () => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		const cols = printColumns;
		let printArtistCounter = 0;
		const rows = showOrderItems
			.filter((item) => item.type === "artist")
			.map((item, idx) => {
				printArtistCounter++;
				const a = item.artist!;
				const name = a.artist_name || a.artistName || "Unknown";
				const costumeColors = getCostumeColors(a);
				const lightColors = getLightColors(a);
				const notes = lightingNotes[item.id] || lightingNotes[a.id];

				let row = `<tr>
					<td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${idx + 1}</td>
					<td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${printArtistCounter}</td>
					<td style="padding:6px 8px;border:1px solid #ddd;font-weight:600;">${name}</td>`;

				if (cols.stagePosition)
					row += `<td style="padding:6px 8px;border:1px solid #ddd;">${getStagePosition(a)}</td>`;
				if (cols.costumeColor)
					row += `<td style="padding:6px 8px;border:1px solid #ddd;">${costumeColors.map((c) => `<span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c};border:1px solid #ccc;margin-right:4px;vertical-align:middle;"></span>`).join("")}</td>`;
				if (cols.lightingColor) {
					const lc1 = notes?.lightingColor || "";
					const lc2 = notes?.lightingColorTwo || "";
					const lc3 = notes?.lightingColorThree || "";
					const hasManual = lc1 || lc2 || lc3;
					const displayColors = hasManual
						? [lc1, lc2, lc3].filter(Boolean)
						: lightColors;
					row += `<td style="padding:6px 8px;border:1px solid #ddd;">${displayColors.map((c) => `<span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c};border:1px solid #ccc;margin-right:4px;vertical-align:middle;"></span>`).join("")}</td>`;
				}
				if (cols.lightingNotes)
					row += `<td style="padding:6px 8px;border:1px solid #ddd;">${notes?.lightingNotes || "—"}</td>`;
				if (cols.editNotes)
					row += `<td style="padding:6px 8px;border:1px solid #ddd;">${notes?.editNotes || "—"}</td>`;

				row += `</tr>`;
				return row;
			})
			.join("");

		const totalSeconds = showOrderItems.reduce((acc, item) => {
			if (item.type === "artist" && item.artist) {
				return acc + (item.artist.performance_duration || (item.artist as any).performanceDuration || 0);
			} else if (item.type === "cue" && item.cue?.duration) {
				return acc + item.cue.duration + (item.cue?.extraTime || 0);
			}
			return acc;
		}, 0);
		const formatDuration = (seconds: number) => {
			const minutes = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return `${minutes}:${secs.toString().padStart(2, "0")}`;
		};

		let headerRow = `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Cue</th>
			<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Show #</th>
			<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Performance</th>`;
		if (cols.stagePosition)
			headerRow += `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Stage Pos.</th>`;
		if (cols.costumeColor)
			headerRow += `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Costume Color</th>`;
		if (cols.lightingColor)
			headerRow += `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Lighting Color</th>`;
		if (cols.lightingNotes)
			headerRow += `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Lighting Notes</th>`;
		if (cols.editNotes)
			headerRow += `<th style="padding:8px;border:1px solid #ddd;background:#1e1b4b;color:white;">Edit Notes</th>`;

		printWindow.document.write(`
			<!DOCTYPE html><html><head><title>Lighting Designer — Show Cue Sheet</title>
			<style>body{font-family:Arial,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}
			@media print{body{margin:8px}}</style></head><body>
			<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
				<img src="/fame-logo.png" width="36" height="36" />
				<div><h1 style="margin:0;font-size:20px;">Lighting Designer — Cue Sheet</h1>
				<p style="margin:2px 0 0;color:#666;font-size:13px;">Date: ${performanceDate} &nbsp;&bull;&nbsp; Total Time: ${formatDuration(totalSeconds)}</p></div>
			</div>
			<table><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table>
			<script>setTimeout(()=>window.print(),500)<\/script></body></html>
		`);
		printWindow.document.close();
		setShowPrintPreview(false);
	};

	/* ------------------------------------------------------------------ */
	/*  Render                                                             */
	/* ------------------------------------------------------------------ */

	if (!isOpen) return null;

	const bg = darkMode
		? "bg-gray-950 text-gray-100"
		: "bg-white text-gray-900";
	const headerBg = darkMode
		? "bg-gray-900 border-gray-800"
		: "bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-gray-200";
	const tableBg = darkMode ? "bg-gray-900" : "bg-white";
	const rowHover = darkMode
		? "hover:bg-gray-800/60"
		: "hover:bg-indigo-50/40";
	const borderColor = darkMode ? "border-gray-800" : "border-gray-200";
	const cellBorder = darkMode ? "border-gray-800" : "border-gray-100";
	const mutedText = darkMode ? "text-gray-400" : "text-gray-500";
	const inputBg = darkMode
		? "bg-gray-800 border-gray-700 text-gray-100"
		: "bg-white border-gray-200 text-gray-900";

	const containerClass = isFullscreen || isStandalone
		? `fixed inset-0 z-[150] ${bg} flex flex-col overflow-hidden`
		: `fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4`;

	const contentClass = isFullscreen || isStandalone
		? `flex flex-col h-full w-full`
		: `${bg} rounded-2xl shadow-2xl w-full max-w-[98vw] max-h-[94vh] flex flex-col overflow-hidden border ${borderColor}`;

	const visibleColumnCount = useMemo(() => {
		let count = 3; // cue, show#, performance always visible
		Object.values(effectiveColumns).forEach((v) => {
			if (v) count++;
		});
		return count;
	}, [effectiveColumns]);

	return (
		<div
			className={containerClass}
			onClick={
				isFullscreen
					? undefined
					: (e) => {
							if (e.target === e.currentTarget) onClose();
						}
			}
		>
			<div className={contentClass}>
				{/* ── Header ── */}
				<div
					className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${headerBg} shrink-0`}
				>
					<div className="flex items-center gap-3">
						<Image
							src="/fame-logo.png"
							alt="FAME Logo"
							width={28}
							height={28}
							className="sm:w-8 sm:h-8"
						/>
						<div>
							<h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
								<Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
								Lighting Designer
							</h2>
							<p
								className={`text-[10px] sm:text-xs ${mutedText}`}
							>
								Show Cue Sheet · {performanceDate}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2">
						{/* View Mode Toggle */}
						<div
							className={`hidden sm:flex items-center rounded-lg border ${borderColor} overflow-hidden text-xs`}
						>
							<button
								onClick={() => setViewMode("planning")}
								className={`px-3 py-1.5 font-medium transition-colors ${
									viewMode === "planning"
										? "bg-indigo-600 text-white"
										: darkMode
											? "bg-gray-800 text-gray-400 hover:text-gray-200"
											: "bg-white text-gray-500 hover:text-gray-700"
								}`}
							>
								Planning
							</button>
							<button
								onClick={() => setViewMode("live")}
								className={`px-3 py-1.5 font-medium transition-colors ${
									viewMode === "live"
										? "bg-red-600 text-white"
										: darkMode
											? "bg-gray-800 text-gray-400 hover:text-gray-200"
											: "bg-white text-gray-500 hover:text-gray-700"
								}`}
							>
								<span className="flex items-center gap-1">
									<Zap className="w-3 h-3" /> Live
								</span>
							</button>
						</div>

						{/* Auto scroll (live mode) */}
						{viewMode === "live" && (
							<button
								onClick={() => setAutoScroll(!autoScroll)}
								className={`p-1.5 rounded-lg text-xs border transition-colors ${
									autoScroll
										? "bg-green-600 text-white border-green-600"
										: `${darkMode ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"}`
								}`}
								title="Auto-scroll to active cue"
							>
								<Eye className="w-4 h-4" />
							</button>
						)}

						{/* Dark mode */}
						<button
							onClick={() => setDarkMode(!darkMode)}
							className={`p-1.5 rounded-lg border transition-colors ${
								darkMode
									? "border-gray-700 text-amber-400 hover:bg-gray-800"
									: "border-gray-200 text-gray-500 hover:bg-gray-100"
							}`}
							title={darkMode ? "Light mode" : "Dark mode"}
						>
							{darkMode ? (
								<Sun className="w-4 h-4" />
							) : (
								<Moon className="w-4 h-4" />
							)}
						</button>

						{/* Column Settings */}
						{viewMode === "planning" && (
							<div className="relative" ref={settingsRef}>
								<button
									onClick={() =>
										setShowColumnSettings(
											!showColumnSettings,
										)
									}
									className={`p-1.5 rounded-lg border transition-colors ${
										darkMode
											? "border-gray-700 text-gray-400 hover:bg-gray-800"
											: "border-gray-200 text-gray-500 hover:bg-gray-100"
									}`}
									title="Column Visibility"
								>
									<Settings className="w-4 h-4" />
								</button>

								{showColumnSettings && (
									<div
										className={`absolute right-0 top-full mt-2 ${
											darkMode
												? "bg-gray-900 border-gray-700"
												: "bg-white border-gray-200"
										} border rounded-xl shadow-xl z-50 w-56 p-3 space-y-2`}
									>
										<p className="text-xs font-semibold mb-2 uppercase tracking-wide opacity-60">
											Column Visibility
										</p>
										{(
											[
												{
													key: "video",
													label: "Video Link",
													icon: Video,
												},
												{
													key: "music",
													label: "Music Player",
													icon: Music,
												},
												{
													key: "costumeImage",
													label: "Costume Image",
													icon: ImageIcon,
												},
												{
													key: "costumeColor",
													label: "Costume Color",
													icon: Palette,
												},
												{
													key: "lightingColor",
													label: "Lighting Color",
													icon: Lightbulb,
												},
												{
													key: "lightingNotes",
													label: "Lighting Notes",
													icon: StickyNote,
												},
												{
													key: "stagePosition",
													label: "Stage Position",
													icon: MapPin,
												},
												{
													key: "editNotes",
													label: "Internal Notes",
													icon: Edit3,
												},
											] as const
										).map(({ key, label, icon: Icon }) => (
											<label
												key={key}
												className={`flex items-center gap-2 py-1 px-2 rounded-lg cursor-pointer transition-colors text-sm ${
													darkMode
														? "hover:bg-gray-800"
														: "hover:bg-gray-50"
												}`}
											>
												<input
													type="checkbox"
													checked={
														columnVisibility[
															key as keyof ColumnVisibility
														]
													}
													onChange={(e) =>
														setColumnVisibility(
															(prev) => ({
																...prev,
																[key]: e.target
																	.checked,
															}),
														)
													}
													className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
												/>
												<Icon className="w-3.5 h-3.5 opacity-60" />
												<span>{label}</span>
											</label>
										))}
									</div>
								)}
							</div>
						)}

						{/* Print */}
						<button
							onClick={handlePrint}
							className={`p-1.5 rounded-lg border transition-colors ${
								darkMode
									? "border-gray-700 text-gray-400 hover:bg-gray-800"
									: "border-gray-200 text-gray-500 hover:bg-gray-100"
							}`}
							title="Print Cue Sheet"
						>
							<Printer className="w-4 h-4" />
						</button>

						{/* Refresh */}
						<button
							onClick={() => {
								setLoading(true);
								fetchShowOrder();
								fetchLightingNotes();
							}}
							className={`p-1.5 rounded-lg border transition-colors ${
								darkMode
									? "border-gray-700 text-gray-400 hover:bg-gray-800"
									: "border-gray-200 text-gray-500 hover:bg-gray-100"
							}`}
							title="Refresh"
						>
							<RefreshCw
								className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
							/>
						</button>

						{/* Fullscreen */}
						<button
							onClick={() => setIsFullscreen(!isFullscreen)}
							className={`p-1.5 rounded-lg border transition-colors ${
								darkMode
									? "border-gray-700 text-gray-400 hover:bg-gray-800"
									: "border-gray-200 text-gray-500 hover:bg-gray-100"
							}`}
							title={
								isFullscreen ? "Exit fullscreen" : "Fullscreen"
							}
						>
							{isFullscreen ? (
								<Minimize2 className="w-4 h-4" />
							) : (
								<Maximize2 className="w-4 h-4" />
							)}
						</button>

						{/* Close */}
						<button
							onClick={onClose}
							className={`p-1.5 rounded-lg border transition-colors ${
								darkMode
									? "border-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400"
									: "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
							}`}
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* ── Live Mode Banner ── */}
				{viewMode === "live" && (
					<div className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-4 py-2 text-center font-bold text-sm tracking-wide shrink-0 flex items-center justify-center gap-2">
						<Zap className="w-4 h-4 animate-pulse" />
						LIVE SHOW MODE — Minimal view for backstage use
						<Zap className="w-4 h-4 animate-pulse" />
					</div>
				)}

				{/* ── Table Content ── */}
				<div className="flex-1 overflow-auto">
					{loading ? (
						<div className="flex items-center justify-center h-48">
							<div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
						</div>
					) : showOrderItems.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 gap-3">
							<Lightbulb className="w-12 h-12 text-gray-300" />
							<p className={mutedText}>
								No show order found for this date.
							</p>
							<p className={`text-xs ${mutedText}`}>
								Assign artists to the show order first.
							</p>
						</div>
					) : (
						<table
							className={`w-full border-collapse ${
								viewMode === "live" ? "text-lg" : "text-sm"
							}`}
						>
							<thead
								className={`sticky top-0 z-10 ${
									darkMode
										? "bg-gray-900"
										: viewMode === "live"
											? "bg-gray-950 text-white"
											: "bg-indigo-900 text-white"
								}`}
							>
								<tr>
									<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
										Cue #
									</th>
									<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
										Show #
									</th>
									<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap min-w-[140px]">
										Performance
									</th>
									{effectiveColumns.stagePosition && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<MapPin className="w-3 h-3" />
												Stage Pos.
											</span>
										</th>
									)}
									{effectiveColumns.costumeColor && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<Palette className="w-3 h-3" />
												Costume
											</span>
										</th>
									)}
									{effectiveColumns.lightingColor && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<Lightbulb className="w-3 h-3" />
												Light Color
											</span>
										</th>
									)}
									{effectiveColumns.costumeImage && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<ImageIcon className="w-3 h-3" />
												Costume
											</span>
										</th>
									)}
									{effectiveColumns.video && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<Video className="w-3 h-3" />
												Video
											</span>
										</th>
									)}
									{effectiveColumns.music && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
											<span className="flex items-center gap-1">
												<Music className="w-3 h-3" />
												Music
											</span>
										</th>
									)}
									{effectiveColumns.lightingNotes && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap min-w-[180px]">
											<span className="flex items-center gap-1">
												<StickyNote className="w-3 h-3" />
												Lighting Notes
											</span>
										</th>
									)}
									{effectiveColumns.editNotes && (
										<th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap min-w-[160px]">
											<span className="flex items-center gap-1">
												<Edit3 className="w-3 h-3" />
												Internal Notes
											</span>
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{(() => {
									// Precompute show numbers: only artists get a show number, cues get "—"
									let artistCounter = 0;
									const showNumbers = showOrderItems.map(
										(item) => {
											if (item.type === "artist") {
												artistCounter++;
												return artistCounter;
											}
											return null; // cues don't get a show number
										},
									);
									return showOrderItems.map((item, idx) => {
										const isCue = item.type === "cue";
										const artist = item.artist;
										const showNumber = showNumbers[idx];
										const isActive =
											item.status ===
											"currently_on_stage";
										const isNext =
											item.status === "next_on_stage" ||
											item.status === "next_on_deck";
										const isCompleted =
											item.status === "completed" ||
											artist?.is_completed;
										const notes = artist
											? lightingNotes[item.id] ||
												lightingNotes[artist.id]
											: undefined;
										const costumeColors = artist
											? getCostumeColors(artist)
											: [];
										const lightColors = artist
											? getLightColors(artist)
											: [];
										const assignedLightColor =
											notes?.lightingColor;

										const rowBg = isActive
											? darkMode
												? "bg-emerald-950/60 border-l-4 border-l-emerald-400"
												: "bg-emerald-50 border-l-4 border-l-emerald-500"
											: isNext
												? darkMode
													? "bg-amber-950/40 border-l-4 border-l-amber-400"
													: "bg-amber-50 border-l-4 border-l-amber-400"
												: isCompleted
													? darkMode
														? "bg-gray-900/60 opacity-60"
														: "bg-gray-50 opacity-60"
													: isCue
														? darkMode
															? "bg-gray-800/50"
															: "bg-slate-50"
														: "";

										return (
											<tr
												key={item.id}
												ref={
													isActive || isNext
														? activeRowRef
														: undefined
												}
												className={`border-b ${cellBorder} ${rowBg} ${isCue ? "" : rowHover} transition-colors`}
											>
												{/* Cue # */}
												<td
													className={`px-3 py-2 font-mono font-bold ${
														viewMode === "live"
															? "text-xl"
															: "text-sm"
													} ${isActive ? "text-emerald-600" : isNext ? "text-amber-600" : ""}`}
												>
													{idx + 1}
												</td>

												{/* Show # */}
												<td
													className={`px-3 py-2 text-center ${
														viewMode === "live"
															? "text-xl font-bold"
															: ""
													}`}
												>
													{showNumber !== null
														? showNumber
														: "—"}
												</td>

												{/* Performance Name */}
												<td className="px-3 py-2">
													<div className="flex items-center gap-2">
														{isCue ? (
															<span
																className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
																	darkMode
																		? "bg-slate-800 text-slate-300"
																		: "bg-slate-200 text-slate-700"
																}`}
																style={
																	item.cue
																		?.color
																		? {
																				borderLeft: `3px solid ${item.cue.color}`,
																			}
																		: undefined
																}
															>
																{item.cue
																	?.title ||
																	"Cue"}
															</span>
														) : (
															<span
																className={`font-semibold ${
																	viewMode ===
																	"live"
																		? "text-xl"
																		: ""
																} ${isCompleted ? "line-through opacity-50" : ""}`}
															>
																{getArtistName(
																	item,
																)}
															</span>
														)}
														{isActive && (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold animate-pulse">
																ON STAGE
															</span>
														)}
														{isNext && (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
																NEXT
															</span>
														)}
													</div>
												</td>

												{/* Stage Position */}
												{effectiveColumns.stagePosition && (
													<td className="px-3 py-2">
														{artist ? (
															<span
																className={`text-xs ${mutedText}`}
															>
																{getStagePosition(
																	artist,
																)}
															</span>
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Costume Color */}
												{effectiveColumns.costumeColor && (
													<td className="px-3 py-2">
														{costumeColors.length >
														0 ? (
															<div className="flex gap-1">
																{costumeColors.map(
																	(c, i) => (
																		<div
																			key={
																				i
																			}
																			className="w-6 h-6 rounded-md border border-gray-300 shadow-sm"
																			style={{
																				backgroundColor:
																					c,
																			}}
																			title={
																				c
																			}
																		/>
																	),
																)}
															</div>
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Lighting Color */}
												{effectiveColumns.lightingColor && (
													<td className="px-3 py-2">
														{artist ? (
															(() => {
																const lc1 =
																	notes?.lightingColor ||
																	"";
																const lc2 =
																	notes?.lightingColorTwo ||
																	"";
																const lc3 =
																	notes?.lightingColorThree ||
																	"";
																const hasManual =
																	lc1 ||
																	lc2 ||
																	lc3;
																const displayColors =
																	hasManual
																		? [
																				lc1,
																				lc2,
																				lc3,
																			].filter(
																				Boolean,
																			)
																		: lightColors;
																return (
																	<div className="flex items-center gap-1">
																		{displayColors.length >
																		0 ? (
																			displayColors.map(
																				(
																					c,
																					i,
																				) => (
																					<div
																						key={
																							i
																						}
																						className="w-6 h-6 rounded-md border border-gray-300 shadow-sm ring-1 ring-inset ring-white/20"
																						style={{
																							backgroundColor:
																								c,
																						}}
																						title={
																							c
																						}
																					/>
																				),
																			)
																		) : (
																			<span
																				className={`text-xs ${mutedText}`}
																			>
																				—
																			</span>
																		)}
																		{viewMode ===
																			"planning" && (
																			<div className="flex gap-0.5 ml-1">
																				<input
																					type="color"
																					className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent opacity-50 hover:opacity-100 transition-opacity"
																					value={
																						lc1 ||
																						lightColors[0] ||
																						"#ffffff"
																					}
																					onChange={(
																						e,
																					) =>
																						saveLightingNote(
																							artist.id,
																							"lightingColor",
																							e
																								.target
																								.value,
																						)
																					}
																					title="Set lighting color 1"
																				/>
																				<input
																					type="color"
																					className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent opacity-50 hover:opacity-100 transition-opacity"
																					value={
																						lc2 ||
																						lightColors[1] ||
																						"#ffffff"
																					}
																					onChange={(
																						e,
																					) =>
																						saveLightingNote(
																							artist.id,
																							"lightingColorTwo",
																							e
																								.target
																								.value,
																						)
																					}
																					title="Set lighting color 2"
																				/>
																				<input
																					type="color"
																					className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent opacity-50 hover:opacity-100 transition-opacity"
																					value={
																						lc3 ||
																						lightColors[2] ||
																						"#ffffff"
																					}
																					onChange={(
																						e,
																					) =>
																						saveLightingNote(
																							artist.id,
																							"lightingColorThree",
																							e
																								.target
																								.value,
																						)
																					}
																					title="Set lighting color 3"
																				/>
																			</div>
																		)}
																	</div>
																);
															})()
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Costume Image */}
												{effectiveColumns.costumeImage && (
													<td className="px-3 py-2">
														{artist ? (
															(() => {
																const imgUrl =
																	getCostumeImage(
																		artist,
																	);
																return imgUrl ? (
																	<img
																		src={
																			imgUrl
																		}
																		alt="Costume"
																		className="w-10 h-10 rounded-md object-cover border border-gray-200 cursor-pointer hover:scale-110 transition-transform shadow-sm"
																		onClick={() =>
																			setExpandedImage(
																				imgUrl,
																			)
																		}
																	/>
																) : (
																	<span
																		className={`text-xs ${mutedText}`}
																	>
																		—
																	</span>
																);
															})()
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Video */}
												{effectiveColumns.video && (
													<td className="px-3 py-2">
														{artist?.showLink ? (
															<button
																onClick={() =>
																	setVideoModalUrl(
																		artist.showLink!,
																	)
																}
																className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200 transition-colors"
															>
																<Video className="w-3 h-3" />
																Watch
															</button>
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Music */}
												{effectiveColumns.music && (
													<td className="px-3 py-2">
														{artist ? (
															(() => {
																const musicUrl =
																	getMusicUrl(
																		artist,
																	);
																return musicUrl ? (
																	<button
																		onClick={() =>
																			toggleAudio(
																				artist.id,
																				musicUrl,
																			)
																		}
																		className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
																			playingAudioId ===
																			artist.id
																				? "bg-green-100 text-green-700 hover:bg-green-200"
																				: darkMode
																					? "bg-gray-800 text-gray-300 hover:bg-gray-700"
																					: "bg-gray-100 text-gray-600 hover:bg-gray-200"
																		}`}
																	>
																		{playingAudioId ===
																		artist.id ? (
																			<>
																				<Pause className="w-3 h-3" />
																				Pause
																			</>
																		) : (
																			<>
																				<Play className="w-3 h-3" />
																				Play
																			</>
																		)}
																	</button>
																) : (
																	<span
																		className={`text-xs ${mutedText}`}
																	>
																		—
																	</span>
																);
															})()
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Lighting Notes */}
												{effectiveColumns.lightingNotes && (
													<td className="px-3 py-2">
														{artist ? (
															editingNoteId ===
															artist.id ? (
																<div className="flex gap-1">
																	<textarea
																		defaultValue={
																			notes?.lightingNotes ||
																			""
																		}
																		className={`w-full text-xs rounded-md p-1.5 resize-none ${inputBg} border focus:ring-1 focus:ring-indigo-500`}
																		rows={2}
																		autoFocus
																		id={`ln-${artist.id}`}
																	/>
																	<button
																		onClick={() => {
																			const el =
																				document.getElementById(
																					`ln-${artist.id}`,
																				) as HTMLTextAreaElement;
																			saveLightingNote(
																				artist.id,
																				"lightingNotes",
																				el?.value ||
																					"",
																			);
																		}}
																		disabled={
																			savingNote
																		}
																		className="shrink-0 p-1 text-indigo-600 hover:bg-indigo-50 rounded"
																	>
																		<Save className="w-3.5 h-3.5" />
																	</button>
																</div>
															) : (
																<div
																	className={`text-xs cursor-pointer group min-h-[24px] flex items-start gap-1 ${
																		notes?.lightingNotes
																			? ""
																			: mutedText
																	}`}
																	onClick={() =>
																		setEditingNoteId(
																			artist.id,
																		)
																	}
																>
																	<span className="flex-1">
																		{notes?.lightingNotes ||
																			"Click to add…"}
																	</span>
																	<Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0 mt-0.5" />
																</div>
															)
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}

												{/* Internal Edit Notes */}
												{effectiveColumns.editNotes && (
													<td className="px-3 py-2">
														{artist ? (
															editingEditNoteId ===
															artist.id ? (
																<div className="flex gap-1">
																	<textarea
																		defaultValue={
																			notes?.editNotes ||
																			""
																		}
																		className={`w-full text-xs rounded-md p-1.5 resize-none ${inputBg} border focus:ring-1 focus:ring-indigo-500`}
																		rows={2}
																		autoFocus
																		id={`en-${artist.id}`}
																	/>
																	<button
																		onClick={() => {
																			const el =
																				document.getElementById(
																					`en-${artist.id}`,
																				) as HTMLTextAreaElement;
																			saveLightingNote(
																				artist.id,
																				"editNotes",
																				el?.value ||
																					"",
																			);
																		}}
																		disabled={
																			savingNote
																		}
																		className="shrink-0 p-1 text-indigo-600 hover:bg-indigo-50 rounded"
																	>
																		<Save className="w-3.5 h-3.5" />
																	</button>
																</div>
															) : (
																<div
																	className={`text-xs cursor-pointer group min-h-[24px] flex items-start gap-1 ${
																		notes?.editNotes
																			? ""
																			: mutedText
																	}`}
																	onClick={() =>
																		setEditingEditNoteId(
																			artist.id,
																		)
																	}
																>
																	<span className="flex-1">
																		{notes?.editNotes ||
																			"Click to add…"}
																	</span>
																	<Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0 mt-0.5" />
																</div>
															)
														) : (
															<span
																className={`text-xs ${mutedText}`}
															>
																—
															</span>
														)}
													</td>
												)}
											</tr>
										);
									});
								})()}
							</tbody>
						</table>
					)}
				</div>

				{/* ── Footer ── */}
				<div
					className={`flex items-center justify-between px-4 sm:px-6 py-2 border-t ${borderColor} shrink-0 text-xs ${mutedText}`}
				>
					<span>
						{artistItems.length} performance
						{artistItems.length !== 1 ? "s" : ""} ·{" "}
						{showOrderItems.length} total cues
					</span>
					<span>{visibleColumnCount} columns visible</span>
				</div>
			</div>

			{/* ── Video Modal ── */}
			{videoModalUrl && (
				<div
					className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
					onClick={() => setVideoModalUrl(null)}
				>
					<div
						className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-5 py-3 border-b">
							<h3 className="font-semibold text-gray-900">
								Performance Video
							</h3>
							<div className="flex gap-2">
								<a
									href={videoModalUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
								>
									<ExternalLink className="w-4 h-4" />
								</a>
								<button
									onClick={() => setVideoModalUrl(null)}
									className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
						<div className="aspect-video bg-black">
							{videoModalUrl.includes("youtube") ||
							videoModalUrl.includes("youtu.be") ? (
								<iframe
									src={videoModalUrl
										.replace("watch?v=", "embed/")
										.replace(
											"youtu.be/",
											"youtube.com/embed/",
										)}
									className="w-full h-full"
									allowFullScreen
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								/>
							) : videoModalUrl.startsWith("/api/media/") ||
							  videoModalUrl.startsWith("gs://") ||
							  /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(
									videoModalUrl,
							  ) ? (
								<video
									src={convertGcsUrl(videoModalUrl)}
									className="w-full h-full"
									controls
									autoPlay
								/>
							) : (
								<iframe
									src={videoModalUrl}
									className="w-full h-full"
									allowFullScreen
								/>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ── Expanded Image Modal ── */}
			{expandedImage && (
				<div
					className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
					onClick={() => setExpandedImage(null)}
				>
					<div className="relative max-w-2xl max-h-[85vh]">
						<img
							src={expandedImage}
							alt="Costume Preview"
							className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
						/>
						<button
							onClick={() => setExpandedImage(null)}
							className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
