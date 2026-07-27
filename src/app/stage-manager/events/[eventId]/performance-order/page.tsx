"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
// Drag and drop removed - using Up/Down arrows + number input instead
import {
	Clock,
	ArrowLeft,
	Star,
	ArrowUp,
	ArrowDown,
	Plus,
	Mic,
	Video,
	Trash2,
	Speaker,
	ClipboardList,
	Play,
	Timer,
	Sparkles,
	CheckCircle,
	Edit,
	Settings,
	RefreshCw,
	AlertTriangle,
	Copy,
	Music,
	ExternalLink,
	Eye,
	Lightbulb,
	User,
	Image,
	Palette,
	Navigation,
	Globe,
	Instagram,
	Facebook,
	Youtube,
	Download,
	Phone,
	Mail,
	Calendar,
	Printer,
	Check,
	Square,
	FileEdit,
	CheckCircle2,
	X,
	Package,
	QrCode,
	FileText,
	MessageSquare,
	Camera,
	Send,
	Radio,
	ChevronLeft,
	ChevronRight,
	SkipForward,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple } from "@/lib/date-utils";
import {
	calculateTotalShowTime,
	formatTime,
	formatTotalTime,
	calculateItemTiming,
	formatDuration,
	getDisplayDuration,
	calculateLiveTimings,
} from "@/lib/timing-utils";
import {
	apiCallWithRetry,
	showErrorToast,
	isNetworkError,
} from "@/lib/error-handling";
import { createWebSocketManager } from "@/lib/websocket-manager";
import {
	findBestDateToSelect,
	saveSelectedDateToStorage,
	subscribeToDateChanges,
} from "@/lib/date-selection-utils";
import {
	WhatsAppIcon,
	WhatsAppLink,
	EmailLink,
} from "@/components/ui/whatsapp-input";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { CueColorPicker, isLightColor } from "@/components/ui/cue-color-picker";
import { ExtraTimePicker } from "@/components/ui/extra-time-picker";
import { MMSSInput } from "@/components/ui/mmss-input";
import { formatMinutesToMMSS, parseMMSSToMinutes, formatExtraTime } from "@/lib/timing-utils";
import { QRCodeSVG } from "qrcode.react";
import { QRCodeDialog } from "@/components/ui/qr-code-dialog";
import { usePerformanceOrderPDF } from "@/hooks/usePerformanceOrderPDF";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { useAccessGuard } from "@/hooks/useAccessGuard";
import { AccessDenied } from "@/components/ui/access-denied";
import { CallArtistButton } from "@/components/CallArtistButton";
import { CheckInScanDialog } from "@/components/CheckInScanDialog";
import { useAllCheckIns } from "@/hooks/use-all-checkins";
import { EventChecklistButton } from "@/components/EventChecklistButton";
import dynamic from "next/dynamic";

// Helper: returns the correct public base URL to avoid localhost/0.0.0.0 issues
const getBaseUrl = (): string => {
	if (typeof window !== "undefined") {
		const origin = window.location.origin;
		// If we are on a production/live domain (not localhost/0.0.0.0/127.0.0.1), always use the current browser origin!
		if (origin && !origin.includes("localhost") && !origin.includes("0.0.0.0") && !origin.includes("127.0.0.1")) {
			return origin;
		}
	}
	// Fallback/local development override
	if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL) {
		const envUrl = process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
		if (!envUrl.includes("0.0.0.0")) {
			return envUrl;
		}
	}
	return "https://fameapp.cloud";
};

const LightingDesignerDashboard = dynamic(
	() => import("@/components/LightingDesignerDashboard"),
	{ ssr: false },
);

// Helper function to get color style
const getColorStyle = (colorValue: string) => {
	const colorMap: { [key: string]: string } = {
		red: "#ff0000",
		blue: "#0000ff",
		green: "#00ff00",
		amber: "#ffbf00",
		magenta: "#ff00ff",
		cyan: "#00ffff",
		purple: "#800080",
		yellow: "#ffff00",
		white: "#ffffff",
		"warm-white": "#fff8dc",
		"cold-blue": "#add8e6",
		uv: "#9400d3",
		rose: "#ff69b4",
		orange: "#ffa500",
		pink: "#ffc0cb",
		teal: "#008080",
		lavender: "#e6e6fa",
		gold: "#ffd700",
		turquoise: "#40e0d0",
		black: "#000000",
		silver: "#c0c0c0",
		trust: "#888888",
	};
	return colorMap[colorValue] || "#888888";
};

interface Artist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	quality_rating: number | null;
	performance_order: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	actual_duration?: number;
	backstage_color?: string;
	is_completed?: boolean;
	completed_at?: string | null;
	performanceType?: string;
	cue_notes?: string;
	eventShowId?: string;
	notes?: string;
	rehearsal_dept_notes?: {
		showcaller?: string;
		dj?: string;
		sound?: string;
		light?: string;
		stage_crew?: string;
		artists?: string;
		sfx?: string;
		video?: string;
		backstage?: string;
		notes?: string;
	};
}

interface Cue {
	id: string;
	type:
		| "mc_break"
		| "video_break"
		| "cleaning_break"
		| "speech_break"
		| "opening"
		| "countdown"
		| "artist_ending"
		| "animation";
	title: string;
	duration?: number;
	extraTime?: number; // buffer time in seconds, added on top of duration
	performance_order: number;
	notes?: string;
	color?: string;
	start_time?: string;
	end_time?: string;
	is_completed?: boolean;
	completed_at?: string | null;
	label?: string;
	fixed_start?: string;
	fixed_start_time?: string;
	hard_start?: boolean;
	hard_stop?: boolean;
	rehearsal_dept_notes?: {
		showcaller?: string;
		dj?: string;
		sound?: string;
		light?: string;
		stage_crew?: string;
		artists?: string;
		sfx?: string;
		video?: string;
		backstage?: string;
		notes?: string;
	};
}

interface EventTimings {
	backstage_ready_time?: string;
	show_start_time?: string;
}

interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
	status?:
		| "not_started"
		| "next_on_deck"
		| "next_on_stage"
		| "currently_on_stage"
		| "completed";
}

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
}

export default function PerformanceOrder({
	providedEventId,
	onTabChange,
}: {
	providedEventId?: string;
	onTabChange?: (tab: string) => void;
} = {}) {
	const params = useParams();
	const router = useRouter();
	const { toast: originalToast } = useToast();
	const eventId = providedEventId || (params?.eventId as string);

	// Access control check
	const { hasAccess, isLoading: accessLoading } = useAccessGuard([
		"performance_order",
		"full_access",
	]);

	const [rehearsalShows, setRehearsalShows] = useState<Artist[]>([]);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [editingCue, setEditingCue] = useState<Cue | null>(null);
	const [editForm, setEditForm] = useState({
		title: "",
		duration: 0,
		notes: "",
		color: "",
		backstage_ready_time: "",
		show_start_time: "",
	});
	const [eventTimings, setEventTimings] = useState<EventTimings>({});
	const [showTimingSettings, setShowTimingSettings] = useState(false);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [wsConnected, setWsConnected] = useState(false);
	const [cacheInitialized, setCacheInitialized] = useState(false);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
	const [isLightingDesignerOpen, setIsLightingDesignerOpen] = useState(false);
	const [newBroadcast, setNewBroadcast] = useState({
		message: "",
		emergency_code: "green",
	});
	const [isLocalUpdate, setIsLocalUpdate] = useState(false);
	const isTransitioningRef = useRef(false);
	const showOrderItemsRef = useRef<ShowOrderItem[]>([]);
	useEffect(() => {
		showOrderItemsRef.current = showOrderItems;
	}, [showOrderItems]);
	const transitionQueueRef = useRef<Promise<void>>(Promise.resolve());
	const pendingTransitionsCountRef = useRef(0);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [editingPosition, setEditingPosition] = useState<string | null>(null);
	const [newPosition, setNewPosition] = useState<number>(1);
	const [showOrderVersion, setShowOrderVersion] = useState<number>(0);
	const [pendingRequestId, setPendingRequestId] = useState<string | null>(
		null,
	);
	const [selectedArtist, setSelectedArtist] = useState<any | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [editingArtistColor, setEditingArtistColor] = useState<string | null>(
		null,
	);
	const [tempArtistColor, setTempArtistColor] = useState<string>("");
	// Edit Artist Cue state
	const [editingArtistCue, setEditingArtistCue] = useState<any | null>(null);
	const [artistCueForm, setArtistCueForm] = useState({
		backstage_color: "",
		cue_notes: "",
	});
	// Unified Edit Show Item (Cue or Artist) Side Panel state
	const [editingShowItem, setEditingShowItem] = useState<ShowOrderItem | null>(null);
	const [cueForm, setCueForm] = useState({
		cueNo: "",
		duration: "",
		extraTime: 0,
		title: "",
		description: "",
		label: "",
		fixedStart: "",
		hardStart: false,
		hardStop: false,
		color: "",
		deptNotes: {
			showcaller: "",
			dj: "",
			sound: "",
			light: "",
			stage_crew: "",
			artists: "",
			sfx: "",
			video: "",
			backstage: "",
			notes: ""
		}
	});
	const [forceRenderKey, setForceRenderKey] = useState<number>(0);
	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [performanceView, setPerformanceView] = useState<"order" | "live-caller">("order");
	const toast = useCallback((args: Parameters<typeof originalToast>[0]) => {
		if (performanceView === "live-caller") return;
		originalToast(args);
	}, [originalToast, performanceView]);
	const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
	const [timerIsRunning, setTimerIsRunning] = useState<boolean>(true);
	const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
	const [zoomLevel, setZoomLevel] = useState<number>(100);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);
	const [event, setEvent] = useState<any>(null);

	// Organiser message popup state
	const [activeOrganiserMessage, setActiveOrganiserMessage] = useState<any | null>(null);
	const [showChatsOpen, setShowChatsOpen] = useState(false);
	const [chatMessages, setChatMessages] = useState<any[]>([]);
	const [newMessageText, setNewMessageText] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);

	const fetchChatMessages = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/organiser-chats?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data) {
					setChatMessages(data.data.chats || []);
				}
			}
		} catch (error) {
			console.error("Error fetching chats:", error);
		}
	};

	const handleSendMessage = async () => {
		if (!newMessageText.trim()) return;

		setSendingMessage(true);
		try {
			const response = await fetch(`/api/events/${eventId}/organiser-chats`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "send",
					sender: "stage_manager",
					recipient: "organiser",
					text: newMessageText,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data?.message) {
					setChatMessages((prev) => [...prev, data.data.message]);
					setNewMessageText("");
				}
			}
		} catch (error) {
			console.error("Error sending message:", error);
		} finally {
			setSendingMessage(false);
		}
	};

	useEffect(() => {
		if (showChatsOpen) {
			fetchChatMessages();
			const unreadMsgs = chatMessages.filter(
				(m) => m.sender === "organiser" && m.recipient === "stage_manager" && m.status === "unread"
			);
			unreadMsgs.forEach(async (m) => {
				try {
					await fetch(`/api/events/${eventId}/organiser-chats`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ action: "read", messageId: m.id })
					});
				} catch (err) {
					console.error("Error marking msg as read:", err);
				}
			});
		}
	}, [showChatsOpen]);

	const handleConfirmReadOrganiserMessage = async (msgId: string) => {
		try {
			await fetch(`/api/events/${eventId}/organiser-chats`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "read",
					messageId: msgId,
				}),
			});
		} catch (error) {
			console.error("Error confirming read:", error);
		} finally {
			setActiveOrganiserMessage(null);
		}
	};

	const checkUnreadOrganiserMessages = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/organiser-chats?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data?.chats) {
					const unread = data.data.chats
						.filter((m: any) => m.sender === "organiser" && m.recipient === "stage_manager" && m.status === "unread")
						.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
					if (unread.length > 0) {
						setActiveOrganiserMessage(unread[0]);
					} else {
						setActiveOrganiserMessage(null);
					}
				}
			}
		} catch (error) {
			console.error("Error checking unread organiser messages:", error);
		}
	};

	// Time override state: itemId -> "HH:MM"
	const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>(
		{},
	);
	const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
	const [editingTimeValue, setEditingTimeValue] = useState<string>("");

	// Live clock for "Currently on Stage" items — updates every minute
	const getCurrentHHMM = () => {
		const now = new Date();
		return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
	};
	const [currentLiveTime, setCurrentLiveTime] =
		useState<string>(getCurrentHHMM());

	// Check-in state and dialog
	const {
		checkIns,
		getStatus: getCheckInStatus,
		markCheckedIn: markCheckInLocal,
		refetch: refetchCheckIns,
	} = useAllCheckIns(eventId);
	const [checkInDialogArtist, setCheckInDialogArtist] =
		useState<Artist | null>(null);

	// Update the live clock every second so it flips promptly when the minute changes
	useEffect(() => {
		const interval = setInterval(() => {
			const newTime = getCurrentHHMM();
			setCurrentLiveTime((prev) => (prev !== newTime ? newTime : prev));
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// PDF Export Hook
	const { generatePDF, isGenerating } = usePerformanceOrderPDF({
		eventId,
		eventName: event?.name || "Event",
		eventDate: selectedPerformanceDate
			? formatDateSimple(selectedPerformanceDate)
			: "",
		venue: event?.venue,
	});

	// Debug: Log when forceRenderKey changes
	useEffect(() => {
		if (forceRenderKey > 0) {
			console.log(
				`Performance Order: Force re-render triggered (key: ${forceRenderKey})`,
			);
		}
	}, [forceRenderKey]);

	// Add Cue Dialog state
	const [isAddCueDialogOpen, setIsAddCueDialogOpen] = useState(false);
	const [addCueType, setAddCueType] = useState<Cue["type"] | null>(null);
	const [addCueForm, setAddCueForm] = useState({
		title: "",
		duration: 5,
		extraTime: 0,
		notes: "",
		color: "",
	});

	// Helper function to normalize dates for comparison
	const normalizeDate = (dateStr: string): string => {
		if (!dateStr) return "";

		// If already in YYYY-MM-DD format, return as is
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
			return dateStr;
		}

		// If ISO format with time, extract date part
		if (dateStr.includes("T")) {
			return dateStr.split("T")[0];
		}

		// Try to parse and format
		try {
			const date = new Date(dateStr);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${year}-${month}-${day}`;
		} catch (error) {
			console.error(`Failed to normalize date: ${dateStr}`, error);
			return dateStr;
		}
	};

	// Import timing utilities
	const {
		calculateTotalShowTime,
		formatTime,
		calculateItemTiming,
		formatDuration,
		getDisplayDuration,
	} = require("@/lib/timing-utils");
	// Initialize WebSocket manager with auto-refresh polling
	useEffect(() => {
		let wsManager: any = null;

		const initializeWebSocketManager = async () => {
			try {
				// Initialize cache manager for this event
				const response = await fetch(`/api/events/${eventId}/cache`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						action: "warmup",
						performanceDate: selectedPerformanceDate,
					}),
				});

				// Cache initialized

				// Import and initialize WebSocket manager
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId,
					role: "stage_manager",
					userId: `stage_manager_${eventId}`,
					showToasts: false, // Disable automatic toasts, we'll show custom ones
					onConnect: () => {
						setWsConnected(true);
					},
					onDisconnect: () => {
						setWsConnected(false);
					},
					onDataUpdate: () => {
						// Trigger refresh using state
						setRefreshTrigger((prev) => prev + 1);
					},
				});

				await wsManager.initialize();

				wsManager.on("new_organiser_message", (data: any) => {
					if (data && data.eventId === eventId) {
						if (data.message?.recipient === "stage_manager") {
							setActiveOrganiserMessage(data.message);
						}
						fetchChatMessages();
					}
				});

				wsManager.on("organiser_message_read", (data: any) => {
					if (data && data.eventId === eventId) {
						fetchChatMessages();
					}
				});

				// Listen for show-order-updated events
				wsManager.on("show-order-updated", (data: any) => {
					// Always update draft/confirmed state for this event
					if (data.eventId === eventId) {
						if (data.isDraft !== undefined) {
							setIsDraftShowOrder(data.isDraft);
						}
						if (data.isConfirmed !== undefined) {
							setIsShowOrderConfirmed(data.isConfirmed);
						}
					}

					// Normalize dates for comparison
					const normalizedEventDate = normalizeDate(
						data.performanceDate || "",
					);
					const normalizedSelectedDate = normalizeDate(
						selectedPerformanceDate || "",
					);

					if (
						data.eventId === eventId &&
						normalizedEventDate === normalizedSelectedDate &&
						data.newOrder
					) {
						// Check if this is our own update
						if (data.clientRequestId === pendingRequestId) {
							// This is confirmation of our own update
							console.log("Received confirmation of our update");
							setPendingRequestId(null);
							return;
						}

						// Check version to avoid stale updates
						if (data.version > showOrderVersion) {
							console.log(
								`Received show order update: version ${data.version}`,
							);
							setShowOrderVersion(data.version);

							// Update local state with new order
							setShowOrderItems((prevItems) => {
								const updatedItems = [...prevItems];
								data.newOrder.forEach((orderItem: any) => {
									const index = updatedItems.findIndex(
										(item) => item.id === orderItem.id,
									);
									if (index !== -1) {
										updatedItems[index] = {
											...updatedItems[index],
											performance_order:
												orderItem.performance_order,
										};
									}
								});
								// Sort by performance_order
								return updatedItems.sort(
									(a, b) =>
										a.performance_order -
										b.performance_order,
								);
							});

							toast({
								title: "Show Order Updated",
								description:
									"Performance order has been updated.",
								variant: "default",
							});
						}
					} else if (data.eventId !== eventId) {
						console.log(
							"Performance Order: Skipping show order update - event mismatch",
						);
					}
				});

				// Listen for artist backstage color updates from other browsers/tabs
				wsManager.on("artist_color_updated", (data: any) => {
					console.log(
						"Performance Order: Received artist_color_updated:",
						{
							received: data,
							currentEventId: eventId,
						},
					);

					if (data.eventId === eventId) {
						console.log(
							"Performance Order: Artist color updated! Refreshing from GCS in 500ms...",
						);
						// Use setRefreshTrigger to avoid stale closure issues
						setTimeout(() => {
							console.log(
								"Performance Order: Triggering refresh via refreshTrigger...",
							);
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					} else {
						console.log(
							"Performance Order: Event ID mismatch, skipping refresh",
						);
					}
				});

				// Listen for artist cue notes updates from rehearsal page or other tabs
				wsManager.on("artist_cue_updated", (data: any) => {
					if (data.eventId === eventId && data.artistId) {
						setShowOrderItems((prevItems) =>
							prevItems.map((item) =>
								item.id === data.artistId &&
								item.type === "artist"
									? {
											...item,
											artist: {
												...item.artist!,
												cue_notes:
													data.cue_notes ??
													item.artist!.cue_notes,
												...(data.backstage_color !==
												undefined
													? {
															backstage_color:
																data.backstage_color,
														}
													: {}),
											},
										}
									: item,
							),
						);
						setRehearsalShows((prev) =>
							prev.map((artist) =>
								artist.id === data.artistId
									? {
											...artist,
											cue_notes:
												data.cue_notes ??
												artist.cue_notes,
										}
									: artist,
							),
						);
						setForceRenderKey((prev) => prev + 1);
					}
				});

				// Listen for cue updates from other tabs
				wsManager.on("cue_updated", (data: any) => {
					if (data.eventId === eventId && data.cueId) {
						if (data.action === "updated" && data.cue) {
							setShowOrderItems((prevItems) =>
								prevItems.map((item) =>
									item.id === data.cueId && item.type === "cue"
										? {
												...item,
												cue: {
													...item.cue!,
													...data.cue,
												},
											}
										: item,
								),
							);
							setForceRenderKey((prev) => prev + 1);
						} else {
							// For creates or deletes, trigger a refresh
							setRefreshTrigger((prev) => prev + 1);
						}
					}
				});

				// Listen for artist completion toggle events from other browsers/tabs
				wsManager.on("artist_completion_toggled", (data: any) => {
					// Normalize dates for comparison
					const normalizedEventDate = normalizeDate(
						data.performanceDate || "",
					);
					const normalizedSelectedDate = normalizeDate(
						selectedPerformanceDate || "",
					);

					console.log(
						"Performance Order: Received artist_completion_toggled:",
						{
							eventId: data.eventId,
							performanceDate: data.performanceDate,
							normalizedEventDate,
							artistId: data.artistId || data.id,
							is_completed: data.is_completed,
							currentEventId: eventId,
							currentPerformanceDate: selectedPerformanceDate,
							normalizedSelectedDate,
						},
					);

					if (
						data.eventId === eventId &&
						normalizedEventDate === normalizedSelectedDate
					) {
						// Check both artistId and id fields for compatibility
						const targetArtistId = data.artistId || data.id;

						console.log(
							"Performance Order: Updating artist completion for ID:",
							targetArtistId,
							"to:",
							data.is_completed,
						);

						// Force update by creating a completely new array
						setShowOrderItems((prevItems) => {
							const newItems = prevItems.map((item) => {
								if (
									(item.id === targetArtistId ||
										(item.artist &&
											item.artist.id ===
												targetArtistId)) &&
									item.type === "artist"
								) {
									console.log(
										"Performance Order: Found matching artist, updating completion status",
									);
									// Create completely new objects to force re-render
									return {
										...item,
										artist: {
											...item.artist!,
											is_completed: data.is_completed,
											completed_at: data.completed_at,
										},
									};
								}
								return item;
							});

							console.log(
								"Performance Order: Updated showOrderItems:",
								newItems.map((item) => ({
									id: item.id,
									type: item.type,
									is_completed:
										item.type === "artist"
											? item.artist?.is_completed
											: item.cue?.is_completed,
								})),
							);
							// Return a new array reference to force React to re-render
							return [...newItems];
						});

						// Force a re-render by updating the key
						setForceRenderKey((prev) => prev + 1);

						toast({
							title: "Artist Completion Updated",
							description: `${data.artist_name || "Artist"} completion status updated by another user`,
							variant: "default",
						});
					} else {
						console.log(
							"Performance Order: Skipping update - event/date mismatch",
							{
								eventMatches: data.eventId === eventId,
								dateMatches:
									normalizedEventDate ===
									normalizedSelectedDate,
								eventId: data.eventId,
								currentEventId: eventId,
								eventDate: normalizedEventDate,
								selectedDate: normalizedSelectedDate,
							},
						);
					}
				});

				// Listen for cue completion toggle events from other browsers/tabs
				wsManager.on("cue_completion_toggled", (data: any) => {
					// Normalize dates for comparison
					const normalizedEventDate = normalizeDate(
						data.performanceDate || "",
					);
					const normalizedSelectedDate = normalizeDate(
						selectedPerformanceDate || "",
					);

					console.log(
						"Performance Order: Received cue_completion_toggled:",
						{
							eventId: data.eventId,
							performanceDate: data.performanceDate,
							normalizedEventDate,
							cueId: data.cueId || data.id,
							is_completed: data.is_completed,
							currentEventId: eventId,
							currentPerformanceDate: selectedPerformanceDate,
							normalizedSelectedDate,
						},
					);

					if (
						data.eventId === eventId &&
						normalizedEventDate === normalizedSelectedDate
					) {
						// Check both cueId and id fields for compatibility
						const targetCueId = data.cueId || data.id;

						console.log(
							"Performance Order: Updating cue completion for ID:",
							targetCueId,
							"to:",
							data.is_completed,
						);

						// Force update by creating a completely new array
						setShowOrderItems((prevItems) => {
							const newItems = prevItems.map((item) => {
								if (
									(item.id === targetCueId ||
										(item.cue &&
											item.cue.id === targetCueId)) &&
									item.type === "cue"
								) {
									console.log(
										"Performance Order: Found matching cue, updating completion status",
									);
									// Create completely new objects to force re-render
									return {
										...item,
										cue: {
											...item.cue!,
											is_completed: data.is_completed,
											completed_at: data.completed_at,
										},
									};
								}
								return item;
							});

							console.log(
								"Performance Order: Updated showOrderItems for cue:",
								newItems.map((item) => ({
									id: item.id,
									type: item.type,
									is_completed:
										item.type === "artist"
											? item.artist?.is_completed
											: item.cue?.is_completed,
								})),
							);
							// Return a new array reference to force React to re-render
							return [...newItems];
						});

						// Force a re-render by updating the key
						setForceRenderKey((prev) => prev + 1);

						toast({
							title: "Cue Completion Updated",
							description: `Cue completion status updated.`,
							variant: "default",
						});
					} else {
						console.log(
							"Performance Order: Skipping update - event/date mismatch",
							{
								eventMatches: data.eventId === eventId,
								dateMatches:
									normalizedEventDate ===
									normalizedSelectedDate,
								eventId: data.eventId,
								currentEventId: eventId,
								eventDate: normalizedEventDate,
								selectedDate: normalizedSelectedDate,
							},
						);
					}
				});

				// Listen for timing settings updates from other browsers
				wsManager.on("timing-settings-updated", (data: any) => {
					// Normalize both dates for comparison
					const normalizeToYMD = (d: string) =>
						d ? (d.includes("T") ? d.split("T")[0] : d) : "";
					const dataDate = normalizeToYMD(data.performanceDate || "");
					const currentDate = normalizeToYMD(
						selectedPerformanceDate || "",
					);

					if (
						data.eventId === eventId &&
						(!dataDate || dataDate === currentDate)
					) {
						console.log(
							"Performance Order: Timing settings updated from another browser, refreshing...",
						);
						// Re-fetch timing settings
						setTimeout(() => {
							fetchEventTimings();
						}, 500);
					}
				});

				// Listen for rehearsal status updates from other browsers/tabs
				wsManager.on("rehearsal_updated", (data: any) => {
					console.log(
						"Performance Order: Received rehearsal_updated:",
						{
							received: data,
							currentEventId: eventId,
						},
					);

					if (data.eventId === eventId) {
						console.log(
							"Performance Order: Rehearsal status updated — updating badges only, not touching show order.",
						);

						// Only update the rehearsal_completed badge on existing items
						// Do NOT remove artists from show order or re-fetch data
						setRehearsalShows((prevShows) =>
							prevShows.map((artist) =>
								artist.id === data.artistId
									? {
											...artist,
											rehearsal_completed:
												data.rehearsal_completed ??
												artist.rehearsal_completed,
										}
									: artist,
							),
						);

						setShowOrderItems((prevItems) =>
							prevItems.map((item) =>
								item.id === data.artistId &&
								item.type === "artist"
									? {
											...item,
											artist: {
												...item.artist!,
												rehearsal_completed:
													data.rehearsal_completed ??
													item.artist!
														.rehearsal_completed,
											},
										}
									: item,
							),
						);

						// Force a re-render
						setForceRenderKey((prev) => prev + 1);
					}
				});

				// Store reference for cleanup
				(window as any).performanceOrderWsManager = wsManager;

				// Listen for check-in updates
				wsManager.on("artist_checked_in", (data: any) => {
					if (data.eventId === eventId) {
						markCheckInLocal(
							data.artistId,
							data.type,
							data.checkedIn,
						);
					}
				});
			} catch (error) {
				console.error("Error initializing WebSocket manager:", error);
				setWsConnected(false);
			}
		};

		if (eventId && selectedPerformanceDate && hasAccess && !accessLoading) {
			initializeWebSocketManager();
		}

		// Cleanup on unmount
		return () => {
			if ((window as any).performanceOrderWsManager) {
				(window as any).performanceOrderWsManager.destroy();
				delete (window as any).performanceOrderWsManager;
			}
		};
	}, [eventId, selectedPerformanceDate, hasAccess, accessLoading]);

	useEffect(() => {
		if (eventId && hasAccess && !accessLoading) {
			fetchEventDates();
			fetchEventData();
			checkUnreadOrganiserMessages();
			fetchChatMessages();
		}

		// Listen for WebSocket toast events
		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toast({ title, description, variant });
		};

		window.addEventListener(
			"websocket-toast",
			handleWebSocketToast as EventListener,
		);

		// Subscribe to date changes from other pages
		const unsubscribeDateChanges = subscribeToDateChanges(
			eventId,
			(newDate) => {
				if (newDate !== selectedPerformanceDate) {
					setSelectedPerformanceDate(newDate);
				}
			},
		);

		return () => {
			window.removeEventListener(
				"websocket-toast",
				handleWebSocketToast as EventListener,
			);
			unsubscribeDateChanges();
		};
	}, [eventId, toast, hasAccess, accessLoading]);

	// Separate useEffect to fetch artists when performance date changes or refresh triggered
	useEffect(() => {
		if (selectedPerformanceDate && !isLocalUpdate) {
			fetchArtists();
			checkUnreadOrganiserMessages();
			fetchChatMessages();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPerformanceDate, refreshTrigger]);

	// Re-fetch timing settings when performance date changes
	useEffect(() => {
		if (eventId && selectedPerformanceDate) {
			console.log(
				"=== TIMING: Date changed, re-fetching timings for",
				selectedPerformanceDate,
			);
			fetchEventTimings(selectedPerformanceDate);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPerformanceDate]);

	// Fetch emergency broadcasts on component mount
	useEffect(() => {
		if (eventId) {
			fetchEmergencyBroadcasts();
		}
	}, [eventId]);
	const fetchEventDates = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				const showDates = evt.show_dates || evt.showDates || [];

				if (showDates.length > 0) {
					setEventDates(showDates);

					if (!selectedPerformanceDate) {
						// Use shared date selection utility
						const bestDate = findBestDateToSelect(
							showDates,
							eventId,
						);
						setSelectedPerformanceDate(bestDate);
						saveSelectedDateToStorage(eventId, bestDate);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching event dates:", error);
		}
	};

	const fetchEventTimings = async (forDate?: string) => {
		try {
			const dateToUse = forDate || selectedPerformanceDate;
			// Normalize to YYYY-MM-DD to match how the API stores timing data
			const normalizedDate = dateToUse
				? dateToUse.includes("T")
					? dateToUse.split("T")[0]
					: dateToUse
				: "";
			const dateParam = normalizedDate
				? `&performanceDate=${normalizedDate}`
				: "";
			const response = await fetch(
				`/api/events/${eventId}/timing-settings?t=${Date.now()}${dateParam}`,
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					setEventTimings({
						backstage_ready_time: result.data.backstage_ready_time,
						show_start_time: result.data.show_start_time,
					});
					setTimeOverrides(result.data.time_overrides || {});
				} else {
					// Set default empty timings if no data exists
					setEventTimings({
						backstage_ready_time: undefined,
						show_start_time: undefined,
					});
					setTimeOverrides({});
				}
			}
		} catch (error) {
			console.error("Error fetching event timings:", error);
			// Set default empty timings on error
			setEventTimings({
				backstage_ready_time: undefined,
				show_start_time: undefined,
			});
			setTimeOverrides({});
		}
	};

	const saveTimeOverride = async (itemId: string, newTime: string) => {
		const updated = { ...timeOverrides };
		if (newTime) {
			updated[itemId] = newTime;
		} else {
			delete updated[itemId];
		}
		setTimeOverrides(updated);
		setEditingTimeId(null);

		// Normalize date to YYYY-MM-DD for consistent storage
		const normalizedDate = selectedPerformanceDate
			? selectedPerformanceDate.includes("T")
				? selectedPerformanceDate.split("T")[0]
				: selectedPerformanceDate
			: "";

		try {
			const response = await fetch(
				`/api/events/${eventId}/timing-settings`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						time_overrides: updated,
						performanceDate: normalizedDate,
						updated_by: "stage_manager",
					}),
				},
			);
			if (response.ok) {
				toast({
					title: "⏱️ Timing Updated",
					description:
						"Start time adjusted — subsequent items recalculated.",
					variant: "success",
				});

				// Emit WebSocket event
				const wsManager = (window as any).performanceOrderWsManager;
				if (wsManager) {
					wsManager.emit("timing-settings-updated", {
						eventId,
						performanceDate: normalizedDate,
						time_overrides: updated,
						timestamp: new Date().toISOString(),
					});
				}
			}
		} catch (error) {
			console.error("Error saving time override:", error);
			toast({
				title: "❌ Save Failed",
				description: "Failed to save timing change.",
				variant: "destructive",
			});
		}
	};

	const saveEventTimings = async (timings: EventTimings) => {
		// Normalize date to YYYY-MM-DD for consistent storage
		const normalizedDate = selectedPerformanceDate
			? selectedPerformanceDate.includes("T")
				? selectedPerformanceDate.split("T")[0]
				: selectedPerformanceDate
			: "";

		try {
			const bodyPayload = {
				backstage_ready_time: timings.backstage_ready_time,
				show_start_time: timings.show_start_time,
				performanceDate: normalizedDate,
				updated_by: "stage_manager",
			};
			const response = await fetch(
				`/api/events/${eventId}/timing-settings`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(bodyPayload),
				},
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setEventTimings(timings);
					setShowTimingSettings(false);
					toast({
						title: "Timing settings saved",
						description:
							"Event timing has been updated and saved to GCS",
						variant: "success",
					});

					// Emit WebSocket event to notify other pages (DJ, MC, Live Board)
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("timing-settings-updated", {
							eventId,
							performanceDate: normalizedDate,
							backstage_ready_time: timings.backstage_ready_time,
							show_start_time: timings.show_start_time,
							timestamp: new Date().toISOString(),
						});
					}
				} else {
					throw new Error(result.error || "Failed to save timings");
				}
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to save timings");
			}
		} catch (error) {
			console.error("Error saving timing settings:", error);
			toast({
				title: "Error saving timings",
				description:
					error instanceof Error
						? error.message
						: "Failed to save timing settings",
				variant: "destructive",
			});
		}
	};

	const fetchEventData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				setEvent(data.data || data.event || data);
			}
		} catch (error) {
			console.error("Error fetching event data:", error);
		}
	};

	const handleExportPDF = async () => {
		if (!selectedPerformanceDate) {
			toast({
				title: "No date selected",
				description: "Please select a performance date first",
				variant: "destructive",
			});
			return;
		}

		// Fetch full artist details for each artist in show order
		const performancesWithDetails = await Promise.all(
			showOrderItems.map(async (item, index) => {
				if (item.type === "artist" && item.artist) {
					try {
						// Fetch full artist details from API
						const response = await fetch(
							`/api/events/${eventId}/artists/${item.artist.id}?t=${Date.now()}`,
						);
						const result = await response.json();

						if (result.success && result.data?.artist) {
							const fullArtistData = result.data.artist;

							// Debug logging - log ALL fields
							console.log("=== PDF Export Debug ===");
							console.log("Artist:", fullArtistData.artistName);
							console.log("ALL ARTIST DATA:", fullArtistData);
							console.log(
								"All keys:",
								Object.keys(fullArtistData),
							);

							// Try all possible field name variations
							const homeCountryValue =
								fullArtistData.homeCountry ||
								fullArtistData.home_country;
							const countryLivingValue =
								fullArtistData.countryLiving ||
								fullArtistData.country_living;

							console.log("Field checks:");
							console.log(
								"  homeCountry:",
								fullArtistData.homeCountry,
							);
							console.log(
								"  home_country:",
								fullArtistData.home_country,
							);
							console.log(
								"  countryLiving:",
								fullArtistData.countryLiving,
							);
							console.log(
								"  country_living:",
								fullArtistData.country_living,
							);
							console.log("Final values:");
							console.log(
								"  homeCountryValue:",
								homeCountryValue,
							);
							console.log(
								"  countryLivingValue:",
								countryLivingValue,
							);

							const homeCountryName = homeCountryValue
								? getCountryName(homeCountryValue)
								: undefined;
							const homeCountryFlag = homeCountryValue
								? getCountryFlag(homeCountryValue)
								: undefined;
							const countryLivingName = countryLivingValue
								? getCountryName(countryLivingValue)
								: undefined;
							const countryLivingFlag = countryLivingValue
								? getCountryFlag(countryLivingValue)
								: undefined;

							console.log("Processed data:");
							console.log("  homeCountryName:", homeCountryName);
							console.log("  homeCountryFlag:", homeCountryFlag);
							console.log(
								"  countryLivingName:",
								countryLivingName,
							);
							console.log(
								"  countryLivingFlag:",
								countryLivingFlag,
							);
							console.log("======================");

							return {
								id: item.id,
								type: "artist" as const,
								order: index + 1,
								name: item.artist.artist_name,
								style: item.artist.style,
								duration:
									item.artist.actual_duration ||
									item.artist.performance_duration * 60,
								homeCountry: homeCountryValue,
								homeCountryName,
								homeCountryFlag,
								countryLiving: countryLivingValue,
								countryLivingName,
								countryLivingFlag,
							};
						}
					} catch (error) {
						console.error("Error fetching artist details:", error);
					}

					// Fallback to basic data if API call fails
					return {
						id: item.id,
						type: "artist" as const,
						order: index + 1,
						name: item.artist.artist_name,
						style: item.artist.style,
						duration:
							item.artist.actual_duration ||
							item.artist.performance_duration * 60,
					};
				} else if (item.type === "cue" && item.cue) {
					return {
						id: item.id,
						type: "cue" as const,
						order: index + 1,
						name: item.cue.title,
						duration: (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0),
						cueType: item.cue.type,
					};
				}
				return null;
			}),
		);

		const performances = performancesWithDetails.filter(Boolean) as any[];
		console.log("Final performances array for PDF:", performances);

		// Compute planned start times for each performance
		if (eventTimings.show_start_time) {
			const [startH, startM] = eventTimings.show_start_time
				.split(":")
				.map(Number);
			let cursorSec = (startH * 60 + startM) * 60;
			for (const perf of performances) {
				// Check for time override
				const override = timeOverrides[perf.id];
				if (override) {
					const [oh, om] = override.split(":").map(Number);
					if (!isNaN(oh) && !isNaN(om)) {
						cursorSec = (oh * 60 + om) * 60;
					}
				}
				const normalized = ((cursorSec % 86400) + 86400) % 86400;
				const h = Math.floor(normalized / 3600);
				const m = Math.floor((normalized % 3600) / 60);
				perf.plannedTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
				cursorSec += perf.duration; // duration is already in seconds
			}
		}

		// Get day of the week for display
		const dayOfWeek = selectedPerformanceDate
			? new Date(selectedPerformanceDate).toLocaleDateString("en-US", {
					weekday: "long",
				})
			: "";
		const dateText = selectedPerformanceDate
			? `${dayOfWeek}, ${new Date(selectedPerformanceDate).toLocaleDateString()}`
			: "Date: Not Selected";

		// Store PDF data in sessionStorage for preview page
		sessionStorage.setItem(
			`pdf-data-${eventId}`,
			JSON.stringify({
				eventName: event?.name || "Event",
				eventDate: dateText,
				performances,
				backstageReadyTime: eventTimings.backstage_ready_time,
				showStartTime: eventTimings.show_start_time,
				venue: event?.venue,
			}),
		);

		// Open preview page in new tab (same approach as rehearsal)
		const previewUrl = `/stage-manager/events/${eventId}/performance-order/pdf-preview`;
		window.open(previewUrl, "_blank");

		toast({
			title: "✅ PDF Preview Opening!",
			description: "Opening performance order PDF preview in new tab...",
			variant: "default",
		});
	};

	const initializeWebSocket = () => {
		try {
			// Use Socket.IO client instead of raw WebSocket
			const script = document.createElement("script");
			script.src = "/socket.io/socket.io.js";
			let socket: any = null;

			script.onload = () => {
				// @ts-ignore
				// Force WebSocket-only transport for Cloud Run compatibility
				socket = io({
					transports: ["websocket"],
					upgrade: false,
				});

				socket.on("connect", () => {
					setWsConnected(true);
				});

				socket.on("disconnect", () => {
					setWsConnected(false);
				});

				socket.on("rehearsal_completed", (message: any) => {
					fetchArtists();
				});

				socket.on("performance_order_updated", (message: any) => {
					fetchArtists();
				});

				socket.on("emergency-alert", (message: any) => {
					fetchEmergencyBroadcasts();
					toast({
						title: `${message.data.emergency_code.toUpperCase()} EMERGENCY ALERT`,
						description: message.data.message,
						variant: "destructive",
					});
				});

				socket.on("emergency-clear", (message: any) => {
					fetchEmergencyBroadcasts();
					toast({
						title: "Emergency alert cleared",
						description: "Emergency broadcast has been deactivated",
						variant: "success",
					});
				});
			};
			document.head.appendChild(script);

			// Return cleanup function
			return () => {
				if (socket) {
					socket.disconnect();
				}
				if (script.parentNode) {
					script.parentNode.removeChild(script);
				}
			};
		} catch (error) {
			console.error("Failed to initialize WebSocket:", error);
		}
	};
	const fetchArtists = async (showRefreshIndicator = false) => {
		if (!selectedPerformanceDate) return;

		try {
			if (showRefreshIndicator) {
				setRefreshing(true);
			}

			// Fetch all artists from GCS
			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					const artists = (data.data || []).map(
						(artist: any): Artist => {
							// Handle both snake_case and camelCase field names
							const performanceOrder =
								artist.performance_order ??
								artist.performanceOrder ??
								null;
							const performanceStatus =
								artist.performance_status ??
								artist.performanceStatus ??
								null;
							const performanceDate =
								artist.performance_date ??
								artist.performanceDate;
							const artistName =
								artist.artist_name ?? artist.artistName;
							const performanceDuration =
								artist.performance_duration ??
								artist.performanceDuration ??
								5;

							return {
								...artist, // Preserve all fields including nationality
								id: artist.id,
								artist_name: artistName,
								style: artist.style,
								performance_duration: performanceDuration,
								quality_rating: artist.quality_rating || null,
								performance_order: performanceOrder,
								rehearsal_completed:
									artist.rehearsal_completed || false,
								performance_status: performanceStatus,
								performance_date: performanceDate,
								actual_duration:
									artist.musicTrack?.duration ||
									artist.musicTracks?.find(
										(track: any) => track.is_main_track,
									)?.duration ||
									null,
								backstage_color:
									artist.backstage_color || undefined,
								is_completed: artist.is_completed || false,
								completed_at: artist.completed_at || null,
								eventShowId: artist.eventShowId || undefined,
							} as Artist;
						},
					);

					// Normalize selected performance date to YYYY-MM-DD format
					const normalizeDate = (dateStr: string): string => {
						if (!dateStr) return "";

						// If already in YYYY-MM-DD format, return as is
						if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
							return dateStr;
						}

						// If ISO format with time, extract date part
						if (dateStr.includes("T")) {
							return dateStr.split("T")[0];
						}

						// Try to parse and format
						try {
							const date = new Date(dateStr);
							const year = date.getFullYear();
							const month = String(date.getMonth() + 1).padStart(
								2,
								"0",
							);
							const day = String(date.getDate()).padStart(2, "0");
							return `${year}-${month}-${day}`;
						} catch (error) {
							console.error(
								`Failed to normalize date: ${dateStr}`,
								error,
							);
							return dateStr;
						}
					};

					const normalizedSelectedDate = normalizeDate(
						selectedPerformanceDate,
					);

					// Filter artists for the selected performance date
					const filteredArtists = artists.filter((a: Artist) => {
						// Check both performance_date and performanceDate fields for compatibility
						const performanceDate =
							a.performance_date || (a as any).performanceDate;

						if (!performanceDate) {
							return false; // Only show artists with performance dates
						}

						// Normalize artist's performance date
						const artistDate = normalizeDate(performanceDate);

						return artistDate === normalizedSelectedDate;
					});

					// Artists assigned to this show date but not yet assigned to show order
					// This replaces both "completed rehearsal" and "incomplete rehearsal" sections
					const rehearsalShows = filteredArtists.filter(
						(a: Artist) => {
							return (
								a.performance_order === null &&
								(!a.performance_status ||
									a.performance_status === "not_started")
							);
						},
					);

					// Artists assigned to show order - convert to show order items
					// Include artists with performance_order OR artists with performance_status (inconsistent state fix)
					const assignedArtists = filteredArtists
						.filter(
							(a: Artist) =>
								a.performance_order !== null ||
								(a.performance_status &&
									a.performance_status !== "not_started" &&
									a.rehearsal_completed),
						)
						.map((artist: Artist) => {
							// If artist has status but no order, assign a temporary order for display
							let displayOrder = artist.performance_order;
							if (
								!displayOrder &&
								artist.performance_status &&
								artist.performance_status !== "not_started"
							) {
								// Find the highest existing order and add 1
								const maxOrder = Math.max(
									0,
									...filteredArtists
										.filter(
											(a: Artist) =>
												a.performance_order !== null,
										)
										.map(
											(a: Artist) =>
												a.performance_order || 0,
										),
								);
								displayOrder = maxOrder + 1;
							}

							return {
								id: artist.eventShowId || artist.id,
								type: "artist" as const,
								artist: {
									...artist,
									performance_order: displayOrder,
								},
								performance_order: displayOrder || 0,
								status: (artist.performance_status ||
									"not_started") as ShowOrderItem["status"], // Default to Back Stage (not_started)
							};
						});

					// Fetch cues from GCS
					let cueItems: ShowOrderItem[] = [];
					try {
						const cuesResponse = await fetch(
							`/api/events/${eventId}/cues?performanceDate=${selectedPerformanceDate}&t=${Date.now()}`,
						);
						if (cuesResponse.ok) {
							const cuesResult = await cuesResponse.json();
							if (cuesResult.success) {
								cueItems = cuesResult.data.map((cue: any) => {
									return {
										id: cue.id,
										type: "cue" as const,
										cue,
										performance_order:
											cue.performance_order,
										status: (cue.performance_status ||
											(cue.is_completed
												? "completed"
												: "not_started")) as ShowOrderItem["status"], // Default to Back Stage (not_started)
									};
								});
							}
						}
					} catch (cueError) {
						console.error("Error fetching cues:", cueError);
						// Continue without cues if fetch fails
					}

					// Combine and sort all show order items
					const allShowOrderItems = [
						...assignedArtists,
						...cueItems,
					].sort((a, b) => a.performance_order - b.performance_order);

					// Fix inconsistent state: artists with status but no order
					const artistsToFix = assignedArtists.filter(
						(item: ShowOrderItem) =>
							item.type === "artist" &&
							item.artist &&
							!item.artist.performance_order &&
							item.artist.performance_status &&
							item.artist.performance_status !== "not_started",
					);

					if (artistsToFix.length > 0) {
						// Fix them in the background
						artistsToFix.forEach(async (item: ShowOrderItem) => {
							if (item.artist) {
								try {
									await fetch(
										`/api/events/${eventId}/artists/${item.artist.id}?eventShowId=${item.id === item.artist.id ? "" : item.id}`,
										{
											method: "PATCH",
											headers: {
												"Content-Type":
													"application/json",
											},
											body: JSON.stringify({
												performance_order:
													item.performance_order,
												performance_date:
													selectedPerformanceDate,
											}),
										},
									);
								} catch (error) {
									// Silent fail for background fix
								}
							}
						});
					}

					setRehearsalShows(rehearsalShows);
					setShowOrderItems(allShowOrderItems);

					// Fetch show order metadata to get draft status
					try {
						const showOrderResponse = await fetch(
							`/api/events/${eventId}/show-order?performanceDate=${selectedPerformanceDate}&t=${Date.now()}`,
						);
						if (showOrderResponse.ok) {
							const showOrderResult =
								await showOrderResponse.json();
							if (
								showOrderResult.success &&
								showOrderResult.data
							) {
								setIsDraftShowOrder(
									showOrderResult.data.isDraft !== false,
								);
								setIsShowOrderConfirmed(
									showOrderResult.data.isConfirmed === true,
								);
								setShowOrderVersion(
									showOrderResult.data.version || 0,
								);
							}
						}
					} catch (showOrderError) {
						console.error(
							"Error fetching show order metadata:",
							showOrderError,
						);
						// Continue with default draft status
					}

					if (showRefreshIndicator) {
						toast({
							title: "Data refreshed",
							description:
								"Performance order data updated from GCS",
							variant: "success",
						});
					}
				}
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
			toast({
				title: "Error fetching data",
				description: "Failed to load artists and cues",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			if (showRefreshIndicator) {
				setRefreshing(false);
			}
		}
	};

	const handleManualRefresh = () => {
		fetchArtists(true);
	};
	const assignToShowOrder = async (artistId: string, eventShowId?: string) => {
		if (!selectedPerformanceDate) {
			toast({
				title: "Error assigning artist",
				description: "Please select a performance date first",
				variant: "destructive",
			});
			return;
		}

		const nextOrder = showOrderItems.length + 1;

		try {
			const url = eventShowId 
				? `/api/events/${eventId}/artists/${artistId}?eventShowId=${eventShowId}` 
				: `/api/events/${eventId}/artists/${artistId}`;
			const response = await fetch(
				url,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						performance_order: nextOrder,
						performance_date: selectedPerformanceDate,
						performanceDate: selectedPerformanceDate, // Also set this field for consistency
						performance_status: "not_started", // Set initial status to Back Stage (not_started)
						eventShowId: eventShowId,
					}),
				},
			);

			if (response.ok) {
				const result = await response.json();

				if (result.success) {
					toast({
						title: "Artist assigned to show order",
						description:
							"Artist has been added to the performance lineup with backstage status",
						variant: "success",
					});

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("performance-order-update", {
							eventId,
							type: "artist",
							action: "assigned",
							artistId,
							id: result.data?.artist?.eventShowId || artistId,
							artist_name:
								result.data?.artist_name ||
								result.data?.artistName,
							performanceDate: selectedPerformanceDate,
						});
					}

					// Refresh to show updated state
					fetchArtists();
				} else {
					throw new Error(result.error || "Failed to assign artist");
				}
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to assign artist");
			}
		} catch (error) {
			console.error("Error assigning artist:", error);
			toast({
				title: "Error assigning artist",
				description:
					error instanceof Error
						? error.message
						: "Failed to assign artist to show order",
				variant: "destructive",
			});
		}
	};

	const saveArtistBackstageColor = async (
		artistId: string,
		color: string,
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}?eventShowId=${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						backstage_color: color,
					}),
				},
			);

			if (response.ok) {
				const result = await response.json();

				if (result.success) {
					// Update rehearsalShows state
					setRehearsalShows((prev) =>
						prev.map((artist) =>
							artist.id === artistId
								? { ...artist, backstage_color: color }
								: artist,
						),
					);

					// Update showOrderItems state for immediate visual update
					setShowOrderItems((prevItems) =>
						prevItems.map((item) =>
							item.id === artistId && item.type === "artist"
								? {
										...item,
										artist: {
											...item.artist!,
											backstage_color: color,
										},
									}
								: item,
						),
					);

					toast({
						title: "Backstage color saved",
						description:
							"Artist backstage background color updated",
						variant: "success",
					});

					// Close color picker
					setEditingArtistColor(null);
					setTempArtistColor("");

					// Note: WebSocket event is now emitted by the API endpoint
					// No need to emit from client side
				} else {
					throw new Error(
						result.error || "Failed to save backstage color",
					);
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error || "Failed to save backstage color",
				);
			}
		} catch (error) {
			console.error("Error saving backstage color:", error);
			toast({
				title: "Error saving color",
				description:
					error instanceof Error
						? error.message
						: "Failed to save backstage color",
				variant: "destructive",
			});
		}
	};

	// Open the Edit Show Item side panel (for both Cue and Artist)
	const openEditShowItem = async (item: ShowOrderItem) => {
		const idx = showOrderItems.findIndex((i) => i.id === item.id);
		const cueNo = String(idx + 1).padStart(2, "0");

		if (item.type === "artist" && item.artist) {
			try {
				const baseArtistId = item.artist.id;
				const response = await fetch(
					`/api/events/${eventId}/artists/${baseArtistId}?eventShowId=${item.id === baseArtistId ? "" : item.id}`,
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						const artist = data.data.artist || data.data;
						setEditingShowItem(item);
						setCueForm({
							cueNo,
							duration: String(item.artist.actual_duration || item.artist.performance_duration || 0),
							extraTime: 0,
							title: artist.artistName || artist.artist_name || "",
							description: artist.notes || artist.biography || "",
							label: artist.label || artist.style || "",
							fixedStart: artist.fixed_start || artist.fixedStart || "",
							hardStart: !!(artist.hard_start || artist.hardStart),
							hardStop: !!(artist.hard_stop || artist.hardStop),
							color: item.artist.backstage_color || artist.backstage_color || "",
							deptNotes: {
								showcaller: artist.rehearsal_dept_notes?.showcaller || "",
								dj: artist.rehearsal_dept_notes?.dj || "",
								sound: artist.rehearsal_dept_notes?.sound || "",
								light: artist.rehearsal_dept_notes?.light || "",
								stage_crew: artist.rehearsal_dept_notes?.stage_crew || "",
								artists: artist.rehearsal_dept_notes?.artists || "",
								sfx: artist.rehearsal_dept_notes?.sfx || "",
								video: artist.rehearsal_dept_notes?.video || "",
								backstage: artist.rehearsal_dept_notes?.backstage || "",
								notes: artist.rehearsal_dept_notes?.notes || "",
							},
						});
					}
				}
			} catch (error) {
				console.error("Error loading artist details:", error);
				toast({
					title: "Error",
					description: "Failed to load artist details",
					variant: "destructive",
				});
			}
		} else if (item.type === "cue" && item.cue) {
			setEditingShowItem(item);
			setCueForm({
				cueNo,
				duration: String(item.cue.duration || 0),
				extraTime: item.cue.extraTime || 0,
				title: item.cue.title || "",
				description: item.cue.notes || "",
				label: item.cue.label || item.cue.type || "",
				fixedStart: item.cue.fixed_start || item.cue.fixed_start_time || "",
				hardStart: !!item.cue.hard_start,
				hardStop: !!item.cue.hard_stop,
				color: item.cue.color || "",
				deptNotes: {
					showcaller: item.cue.rehearsal_dept_notes?.showcaller || "",
					dj: item.cue.rehearsal_dept_notes?.dj || "",
					sound: item.cue.rehearsal_dept_notes?.sound || "",
					light: item.cue.rehearsal_dept_notes?.light || "",
					stage_crew: item.cue.rehearsal_dept_notes?.stage_crew || "",
					artists: item.cue.rehearsal_dept_notes?.artists || "",
					sfx: item.cue.rehearsal_dept_notes?.sfx || "",
					video: item.cue.rehearsal_dept_notes?.video || "",
					backstage: item.cue.rehearsal_dept_notes?.backstage || "",
					notes: item.cue.rehearsal_dept_notes?.notes || "",
				},
			});
		}
	};

	// Open the Edit Artist Cue dialog - fetches full artist data for notes/props
	const openEditArtistCue = async (artistId: string) => {
		const item = showOrderItems.find((i) => i.id === artistId && i.type === "artist");
		if (item) {
			await openEditShowItem(item);
		}
	};

	// Save artist cue edits (backstage color + stage manager cue notes)
	const saveArtistCueEdit = async () => {
		// No longer used directly, redirected to saveShowItemEdit
		await saveShowItemEdit();
	};

	const saveShowItemEdit = async () => {
		if (!editingShowItem) return;

		// Validation: At least one text field must be completed
		const hasTitle = cueForm.title.trim().length > 0;
		const hasDescription = cueForm.description.trim().length > 0;
		const hasLabel = cueForm.label.trim().length > 0;
		const hasDeptNotes = Object.values(cueForm.deptNotes).some(
			(note) => note.trim().length > 0,
		);

		if (!hasTitle && !hasDescription && !hasLabel && !hasDeptNotes) {
			toast({
				title: "Validation Error",
				description: "Please fill in at least one text field (Title, Description, Label, or Department Notes) before saving.",
				variant: "destructive",
			});
			return;
		}

		const isArtist = editingShowItem.type === "artist";

		try {
			if (isArtist) {
				const artistId = editingShowItem.artist?.id || editingShowItem.id;
				const response = await fetch(
					`/api/events/${eventId}/artists/${artistId}${editingShowItem.artist?.eventShowId ? `?eventShowId=${editingShowItem.artist.eventShowId}` : ""}`,
					{
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							eventShowId: editingShowItem.artist?.eventShowId,
							artistName: cueForm.title,
							performance_duration: parseFloat(cueForm.duration) || 0,
							notes: cueForm.description,
							backstage_color: cueForm.color,
							label: cueForm.label,
							fixed_start: cueForm.fixedStart,
							hard_start: cueForm.hardStart,
							hard_stop: cueForm.hardStop,
							rehearsal_dept_notes: cueForm.deptNotes,
						}),
					}
				);

				if (response.ok) {
					const result = await response.json();
					if (result.success) {
						// Update local state
						setRehearsalShows((prev) =>
							prev.map((artist) =>
								artist.id === artistId
									? {
											...artist,
											artistName: cueForm.title,
											performance_duration: parseFloat(cueForm.duration) || 0,
											notes: cueForm.description,
											backstage_color: cueForm.color,
											label: cueForm.label,
											fixed_start: cueForm.fixedStart,
											hard_start: cueForm.hardStart,
											hard_stop: cueForm.hardStop,
											rehearsal_dept_notes: cueForm.deptNotes,
										}
									: artist
							)
						);
						setShowOrderItems((prev) =>
							prev.map((item) => {
								const isTarget = item.type === "artist" && item.artist && 
									(item.id === (editingShowItem.artist?.eventShowId || artistId) ||
									 (item.artist.id === artistId && 
									  (!editingShowItem.artist?.eventShowId || item.artist.eventShowId === editingShowItem.artist.eventShowId)));
								
								return isTarget
									? {
											...item,
											artist: {
												...item.artist!,
												artistName: cueForm.title,
												artist_name: cueForm.title,
												performance_duration: parseFloat(cueForm.duration) || 0,
												notes: cueForm.description,
												backstage_color: cueForm.color,
												label: cueForm.label,
												fixed_start: cueForm.fixedStart,
												hard_start: cueForm.hardStart,
												hard_stop: cueForm.hardStop,
												rehearsal_dept_notes: cueForm.deptNotes,
											},
										}
									: item;
							})
						);

						setEditingShowItem(null);
						toast({
							title: "Artist updated",
							description: "Backstage color, notes and instructions saved",
							variant: "success",
						});

						// Emit WebSocket update
						const wsManager = (window as any).performanceOrderWsManager;
						if (wsManager) {
							wsManager.emit("artist_cue_updated", {
								eventId,
								artistId: artistId,
								cue_notes: cueForm.description,
								backstage_color: cueForm.color,
								rehearsal_dept_notes: cueForm.deptNotes,
								label: cueForm.label,
								fixed_start: cueForm.fixedStart,
								hard_start: cueForm.hardStart,
								hard_stop: cueForm.hardStop,
							});
						}
					}
				}
			} else {
				// Save Cue
				const response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: editingShowItem.id,
						performanceDate: selectedPerformanceDate,
						title: cueForm.title,
						duration: parseFloat(cueForm.duration) || 0,
						extraTime: cueForm.extraTime || 0,
						notes: cueForm.description,
						color: cueForm.color,
						label: cueForm.label,
						fixed_start: cueForm.fixedStart,
						hard_start: cueForm.hardStart,
						hard_stop: cueForm.hardStop,
						rehearsal_dept_notes: cueForm.deptNotes,
					}),
				});

				if (response.ok) {
					const result = await response.json();
					if (result.success) {
						// Update local state
						setShowOrderItems((prev) =>
							prev.map((item) =>
								item.id === editingShowItem.id && item.type === "cue"
									? {
											...item,
											cue: {
												...item.cue!,
												title: cueForm.title,
												duration: parseFloat(cueForm.duration) || 0,
												extraTime: cueForm.extraTime || 0,
												notes: cueForm.description,
												color: cueForm.color,
												label: cueForm.label,
												fixed_start: cueForm.fixedStart,
												hard_start: cueForm.hardStart,
												hard_stop: cueForm.hardStop,
												rehearsal_dept_notes: cueForm.deptNotes,
											},
										}
									: item
							)
						);

						setEditingShowItem(null);
						toast({
							title: "Cue updated",
							description: "Cue details and instructions saved",
							variant: "success",
						});

						// Emit WebSocket update
						const wsManager = (window as any).performanceOrderWsManager;
						if (wsManager) {
							wsManager.emit("cue_updated", {
								eventId,
								cueId: editingShowItem.id,
								action: "updated",
								cue: {
									...editingShowItem.cue!,
									title: cueForm.title,
									duration: parseFloat(cueForm.duration) || 0,
									extraTime: cueForm.extraTime || 0,
									notes: cueForm.description,
									color: cueForm.color,
									label: cueForm.label,
									fixed_start: cueForm.fixedStart,
									hard_start: cueForm.hardStart,
									hard_stop: cueForm.hardStop,
									rehearsal_dept_notes: cueForm.deptNotes,
								},
								performanceDate: selectedPerformanceDate,
							});
						}
					}
				}
			}
		} catch (error) {
			console.error("Error saving show item edit:", error);
			toast({
				title: "Error saving",
				description: "Failed to save changes. Please try again.",
				variant: "destructive",
			});
		}
	};

	const removeFromShowOrder = async (
		itemId: string,
		itemType: "artist" | "cue",
	) => {
		if (itemType === "artist") {
			try {
				const item = showOrderItems.find((i) => i.id === itemId);
				const baseArtistId = item?.type === "artist" && item.artist ? item.artist.id : itemId;

				const response = await fetch(
					`/api/events/${eventId}/artists/${baseArtistId}?eventShowId=${itemId === baseArtistId ? "" : itemId}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							performance_order: null,
							performance_status: "not_started",
						}),
					},
				);

				if (response.ok) {
					toast({
						title: "Artist removed from show order",
						description: "Artist removed from performance lineup",
						variant: "warning",
					});

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("performance-order-update", {
							eventId,
							type: "artist",
							action: "removed",
							artistId: baseArtistId,
							id: itemId,
							performanceDate: selectedPerformanceDate,
						});
					}

					fetchArtists();
				} else {
					throw new Error("Failed to remove artist");
				}
			} catch (error) {
				toast({
					title: "Error removing artist",
					description: "Failed to remove artist from show order",
					variant: "destructive",
				});
			}
		} else {
			// Remove cue via API
			if (!selectedPerformanceDate) {
				toast({
					title: "Error removing cue",
					description: "Performance date not selected",
					variant: "destructive",
				});
				return;
			}

			try {
				const response = await fetch(
					`/api/events/${eventId}/cues?cueId=${itemId}&performanceDate=${selectedPerformanceDate}`,
					{
						method: "DELETE",
					},
				);

				if (response.ok) {
					const result = await response.json();
					if (result.success) {
						// Remove from local state
						setShowOrderItems((prev) =>
							prev.filter((item) => item.id !== itemId),
						);
						toast({
							title: "Cue removed",
							description: "Cue removed from show order and GCS",
							variant: "warning",
						});

						// Emit WebSocket event for real-time updates
						const wsManager = (window as any)
							.performanceOrderWsManager;
						if (wsManager) {
							wsManager.emit("cue_updated", {
								eventId,
								cueId: itemId,
								action: "deleted",
								performanceDate: selectedPerformanceDate,
							});
						}
					} else {
						throw new Error(result.error || "Failed to remove cue");
					}
				} else {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to remove cue");
				}
			} catch (error) {
				console.error("Error removing cue:", error);
				toast({
					title: "Error removing cue",
					description:
						error instanceof Error
							? error.message
							: "Failed to remove cue",
					variant: "destructive",
				});
			}
		}
	};

	const viewArtistDetails = async (artistId: string) => {
		try {
			const item = showOrderItems.find((i) => i.id === artistId);
			const baseArtistId = item?.type === "artist" && item.artist ? item.artist.id : artistId;

			const response = await fetch(
				`/api/events/${eventId}/artists/${baseArtistId}?eventShowId=${artistId === baseArtistId ? "" : artistId}`,
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setSelectedArtist(data.data.artist);
					setIsDetailDialogOpen(true);
				}
			} else {
				throw new Error("Failed to fetch artist details");
			}
		} catch (error) {
			console.error("Error fetching artist details:", error);
			toast({
				title: "❌ Loading Error",
				description: "Failed to load artist details. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Add cue to show order
	const openAddCueDialog = (cueType: Cue["type"]) => {
		if (!selectedPerformanceDate) {
			toast({
				title: "Error adding cue",
				description: "Please select a performance date first",
				variant: "destructive",
			});
			return;
		}

		const cueLabels = {
			opening: "Opening",
			countdown: "Countdown",
			mc_break: "MC Break",
			video_break: "Video Break",
			cleaning_break: "Cleaning Break",
			speech_break: "Speech Break",
			artist_ending: "Artist Ending",
			animation: "Animation",
		};

		setAddCueType(cueType);
		setAddCueForm({
			title: cueLabels[cueType],
			duration: 5,
			extraTime: 0,
			notes: "",
			color: "",
		});
		setIsAddCueDialogOpen(true);
	};

	const addCue = async () => {
		if (!selectedPerformanceDate || !addCueType) {
			toast({
				title: "Error adding cue",
				description: "Please select a performance date first",
				variant: "destructive",
			});
			return;
		}

		const newCue = {
			id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type: addCueType,
			title: addCueForm.title,
			duration: addCueForm.duration,
			extraTime: addCueForm.extraTime,
			color: addCueForm.color,
			notes: addCueForm.notes,
			performance_order: showOrderItems.length + 1,
			performanceDate: selectedPerformanceDate,
			performance_status: "not_started",
		};

		try {
			const response = await fetch(`/api/events/${eventId}/cues`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newCue),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					toast({
						title: "Cue added",
						description: `${addCueForm.title} cue added to show order`,
						variant: "success",
					});

					// Close dialog
					setIsAddCueDialogOpen(false);
					setAddCueType(null);

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("cue_updated", {
							eventId,
							cueId: result.data?.id || newCue.id,
							action: "created",
							cue: result.data || newCue,
							performanceDate: selectedPerformanceDate,
						});
					}

					fetchArtists(); // Refresh to show new cue
				} else {
					throw new Error(result.error || "Failed to add cue");
				}
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to add cue");
			}
		} catch (error) {
			console.error("Error adding cue:", error);
			toast({
				title: "Error adding cue",
				description:
					error instanceof Error
						? error.message
						: "Failed to add cue",
				variant: "destructive",
			});
		}
	};

	const editCue = (cue: Cue) => {
		const item = showOrderItems.find((i) => i.id === cue.id && i.type === "cue");
		if (item) {
			openEditShowItem(item);
		}
	};

	const saveCueEdit = async () => {
		await saveShowItemEdit();
	};

	// Quick inline update for a cue's extra/buffer time, without opening the full edit panel
	const updateCueExtraTime = async (cue: Cue, extraTime: number) => {
		setShowOrderItems((prev) =>
			prev.map((item) =>
				item.id === cue.id && item.type === "cue"
					? { ...item, cue: { ...item.cue!, extraTime } }
					: item
			)
		);

		try {
			const response = await fetch(`/api/events/${eventId}/cues`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: cue.id,
					performanceDate: selectedPerformanceDate,
					extraTime,
				}),
			});

			if (response.ok) {
				const wsManager = (window as any).performanceOrderWsManager;
				if (wsManager) {
					wsManager.emit("cue_updated", {
						eventId,
						cueId: cue.id,
						action: "updated",
						cue: { ...cue, extraTime },
						performanceDate: selectedPerformanceDate,
					});
				}
			}
		} catch (error) {
			console.error("Error updating cue extra time:", error);
			toast({
				title: "Error saving",
				description: "Failed to save extra time. Please try again.",
				variant: "destructive",
			});
		}
	};

	const getCueIcon = (cueType: Cue["type"]) => {
		const iconMap = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType];
	};

	const updateItemStatus = async (
		itemId: string,
		newStatus: ShowOrderItem["status"],
	) => {
		// Find the item to determine if it's an artist or cue
		const item = showOrderItems.find((i) => i.id === itemId);
		if (!item) return;

		// Store original status for potential revert
		const originalStatus = item.status;

		try {
			// Update local state immediately for better UX
			setShowOrderItems((prevItems) =>
				prevItems.map((i) =>
					i.id === itemId ? { ...i, status: newStatus } : i,
				),
			);

			// When setting to "currently_on_stage", auto-set time override
			// to current time for this item and clear overrides for subsequent items
			if (newStatus === "currently_on_stage") {
				const now = new Date();
				const currentHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

				// Find the index of this item in the show order
				const itemIndex = showOrderItems.findIndex(
					(i) => i.id === itemId,
				);
				if (itemIndex !== -1) {
					// Build updated overrides: set current time for this item,
					// remove overrides for all subsequent items so they cascade naturally
					const updatedOverrides = { ...timeOverrides };
					updatedOverrides[itemId] = currentHHMM;

					// Clear overrides for all items after this one
					for (
						let i = itemIndex + 1;
						i < showOrderItems.length;
						i++
					) {
						delete updatedOverrides[showOrderItems[i].id];
					}

					setTimeOverrides(updatedOverrides);

					// Save the time overrides to the API
					const normalizedDate = selectedPerformanceDate
						? selectedPerformanceDate.includes("T")
							? selectedPerformanceDate.split("T")[0]
							: selectedPerformanceDate
						: "";

					try {
						const timingResponse = await fetch(
							`/api/events/${eventId}/timing-settings`,
							{
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									time_overrides: updatedOverrides,
									performanceDate: normalizedDate,
									updated_by: "stage_manager",
								}),
							},
						);
						if (timingResponse.ok) {
							// Emit WebSocket event for timing updates
							const wsManager = (window as any)
								.performanceOrderWsManager;
							if (wsManager) {
								wsManager.emit("timing-settings-updated", {
									eventId,
									performanceDate: normalizedDate,
									time_overrides: updatedOverrides,
									timestamp: new Date().toISOString(),
								});
							}
						}
					} catch (timingError) {
						console.error(
							"Error saving auto time override:",
							timingError,
						);
					}
				}
			}

			// When reverting status back (e.g., from currently_on_stage to back_stage),
			// clear the time override so timing resets to planned schedule
			if (newStatus === "not_started" || newStatus === "next_on_deck") {
				if (timeOverrides[itemId]) {
					const updatedOverrides = { ...timeOverrides };
					delete updatedOverrides[itemId];
					setTimeOverrides(updatedOverrides);

					const normalizedDate = selectedPerformanceDate
						? selectedPerformanceDate.includes("T")
							? selectedPerformanceDate.split("T")[0]
							: selectedPerformanceDate
						: "";

					try {
						const timingResponse = await fetch(
							`/api/events/${eventId}/timing-settings`,
							{
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									time_overrides: updatedOverrides,
									performanceDate: normalizedDate,
									updated_by: "stage_manager",
								}),
							},
						);
						if (timingResponse.ok) {
							const wsManager = (window as any)
								.performanceOrderWsManager;
							if (wsManager) {
								wsManager.emit("timing-settings-updated", {
									eventId,
									performanceDate: normalizedDate,
									time_overrides: updatedOverrides,
									timestamp: new Date().toISOString(),
								});
							}
						}
					} catch (timingError) {
						console.error(
							"Error clearing time override:",
							timingError,
						);
					}
				}
			}

			if (item.type === "artist" && item.artist) {
				// Update artist status via API
				const response = await fetch(
					`/api/events/${eventId}/artists/${item.artist.id}?eventShowId=${item.id === item.artist.id ? "" : item.id}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							performance_status: newStatus,
						}),
					},
				);

				if (response.ok) {
					const result = await response.json();

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("artist_status_changed", {
							eventId,
							artistId: item.artist.id,
							id: item.id,
							artist_name: item.artist.artist_name,
							status: newStatus || "not_started",
							performanceDate: selectedPerformanceDate,
							timestamp: new Date().toISOString(),
						});
					}

					toast({
						title: "Cue Status Updated",
						description: `${item.artist.artist_name} is now ${(
							newStatus || "not_started"
						).replace("_", " ")}`,
					});
				} else {
					throw new Error("Failed to update artist status");
				}
			} else if (item.type === "cue" && item.cue) {
				// Update cue status via API
				const response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: item.cue.id,
						performance_status: newStatus,
						performanceDate: selectedPerformanceDate,
					}),
				});

				if (response.ok) {
					const result = await response.json();

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("cue_updated", {
							eventId,
							cueId: item.cue.id,
							action: "status_updated",
							cue: item.cue,
							status: newStatus || "not_started",
							performanceDate: selectedPerformanceDate,
							timestamp: new Date().toISOString(),
						});
					}

					toast({
						title: "Cue Status Updated",
						description: `${item.cue.title} is now ${(
							newStatus || "not_started"
						).replace("_", " ")}`,
					});
				} else {
					throw new Error("Failed to update cue status");
				}
			}

			// Data will be refreshed via WebSocket event
		} catch (error) {
			console.error("Error updating item status:", error);

			// Revert local state on error using the stored original status
			setShowOrderItems((prevItems) =>
				prevItems.map((i) =>
					i.id === itemId ? { ...i, status: originalStatus } : i,
				),
			);

			toast({
				title: "Error updating status",
				description:
					error instanceof Error
						? error.message
						: "Failed to update status",
				variant: "destructive",
			});
		}
	};

	// Transition helper to change the active live item cleanly and preserve status consistency
	const transitionToItem = useCallback(async (targetIdx: number, forceStart = false) => {
		if (targetIdx < 0 || targetIdx >= showOrderItemsRef.current.length) return;
		
		const items = showOrderItemsRef.current;
		const currentIdx = items.findIndex((i) => i.status === "currently_on_stage");
		if (currentIdx === targetIdx) return;

		setIsLocalUpdate(true);
		
		// Map the statuses cleanly: only ONE item is currently_on_stage.
		// All items before it are completed if we move forward, or not_started if we move backward.
		const updatedItems = items.map((item, idx) => {
			if (idx === targetIdx) {
				return { ...item, status: "currently_on_stage" as const };
			} else if (item.status === "currently_on_stage") {
				return { ...item, status: targetIdx > idx ? ("completed" as const) : ("not_started" as const) };
			} else {
				// Auto-fill intermediate statuses
				if (currentIdx !== -1) {
					if (targetIdx > currentIdx && idx > currentIdx && idx < targetIdx) {
						return { ...item, status: "completed" as const };
					} else if (targetIdx < currentIdx && idx < currentIdx && idx > targetIdx) {
						return { ...item, status: "not_started" as const };
					}
				}
				return item;
			}
		});

		// Synchronously update the ref and the state so subsequent transitions use the new state
		showOrderItemsRef.current = updatedItems;
		setShowOrderItems(updatedItems);
		
		setElapsedSeconds(0);
		if (forceStart || (currentIdx === -1 && forceStart)) {
			setTimerIsRunning(true);
		}

		// Queue DB updates sequentially
		pendingTransitionsCountRef.current += 1;
		const runDbUpdate = async () => {
			try {
				if (currentIdx !== -1) {
					const currentItem = items[currentIdx];
					if (targetIdx > currentIdx) {
						await updateItemStatus(currentItem.id, "completed");
					} else {
						await updateItemStatus(currentItem.id, "not_started");
					}
				}
				const targetItem = items[targetIdx];
				await updateItemStatus(targetItem.id, "currently_on_stage");
			} catch (err) {
				console.error("Error in queued transition DB update:", err);
			} finally {
				pendingTransitionsCountRef.current -= 1;
				if (pendingTransitionsCountRef.current === 0) {
					// All pending updates finished, let's fetch fresh data and reset lock
					setIsLocalUpdate(false);
					fetchArtists();
				}
			}
		};

		transitionQueueRef.current = transitionQueueRef.current.then(runDbUpdate);
		await transitionQueueRef.current;
	}, [updateItemStatus, fetchArtists]);

	// Fullscreen change listener
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	// Global Keyboard Shortcuts for Show Caller view
	useEffect(() => {
		if (performanceView !== "live-caller") return;

		const handleKeyDown = async (e: KeyboardEvent) => {
			// Ignore keyboard events if user is typing in input or form elements
			const activeEl = document.activeElement;
			if (
				activeEl &&
				(activeEl.tagName === "INPUT" ||
					activeEl.tagName === "TEXTAREA" ||
					activeEl.getAttribute("contenteditable") === "true")
			) {
				return;
			}

			const items = showOrderItemsRef.current;
			const currentIdx = items.findIndex((i) => i.status === "currently_on_stage");
			const currentItem = currentIdx !== -1 ? items[currentIdx] : null;

			if (e.code === "Space") {
				e.preventDefault();
				if (currentItem) {
					setTimerIsRunning((prev) => !prev);
				} else if (items.length > 0) {
					await transitionToItem(0, true);
				}
			} else if (e.code === "ArrowRight") {
				e.preventDefault();
				if (currentIdx !== -1 && currentIdx < items.length - 1) {
					await transitionToItem(currentIdx + 1, false);
				} else if (currentIdx === -1 && items.length > 0) {
					await transitionToItem(0, false);
				}
			} else if (e.code === "ArrowLeft") {
				e.preventDefault();
				if (currentIdx > 0) {
					await transitionToItem(currentIdx - 1, false);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [performanceView, transitionToItem]);

	// Reset elapsed seconds when current item changes
	useEffect(() => {
		setElapsedSeconds(0);
	}, [showOrderItems.find((i) => i.status === "currently_on_stage")?.id]);

	// Tick timer
	useEffect(() => {
		const items = showOrderItemsRef.current;
		const currentIdx = items.findIndex((i) => i.status === "currently_on_stage");
		const currentItem = currentIdx !== -1 ? items[currentIdx] : null;
		
		if (!currentItem || !timerIsRunning) return;
		
		// Capture exact start timestamp, offset by any already accumulated seconds
		const startTime = Date.now() - (elapsedSeconds * 1000);
		
		const interval = setInterval(() => {
			const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
			
			setElapsedSeconds((prev) => {
				// Only update state if second value actually incremented to prevent unnecessary renders
				if (prev === currentElapsed) return prev;
				
				const durationSec = currentItem.type === "artist"
					? (currentItem.artist?.performance_duration ?? 0) * 60
					: (currentItem.cue?.duration ?? 0) * 60 + (currentItem.cue?.extraTime ?? 0);

				// Handle auto-advance
				if (autoAdvance && currentElapsed >= durationSec) {
					clearInterval(interval);
					const nextIdx = showOrderItemsRef.current.findIndex((i, idx) => idx > currentIdx && i.status !== "completed" && i.status !== "currently_on_stage");
					if (nextIdx !== -1) {
						(async () => {
							await transitionToItem(nextIdx, true);
						})();
					}
				}
				
				return currentElapsed;
			});
		}, 100);

		return () => clearInterval(interval);
	}, [
		showOrderItems.find((i) => i.status === "currently_on_stage")?.id,
		timerIsRunning,
		autoAdvance,
		transitionToItem
	]);

	const resetAllStatuses = async () => {
		if (isTransitioningRef.current) return;
		isTransitioningRef.current = true;
		setIsLocalUpdate(true);
		try {
			// Find all items that are not 'not_started'
			const activeItems = showOrderItems.filter((i) => i.status && i.status !== "not_started");
			
			// Reset local state immediately for fast UI feedback
			setShowOrderItems((prevItems) =>
				prevItems.map((i) => ({ ...i, status: "not_started" })),
			);
			
			// Reset timer states
			setElapsedSeconds(0);
			setTimerIsRunning(false);

			// Clear all time overrides
			setTimeOverrides({});
			const normalizedDate = selectedPerformanceDate
				? selectedPerformanceDate.includes("T")
					? selectedPerformanceDate.split("T")[0]
					: selectedPerformanceDate
				: "";

			// Clear overrides in DB
			try {
				await fetch(`/api/events/${eventId}/timing-settings`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						time_overrides: {},
						performanceDate: normalizedDate,
						updated_by: "stage_manager",
					}),
				});
			} catch (err) {
				console.error("Error clearing timing overrides:", err);
			}

			// Perform API updates in parallel for all changed items
			const promises = activeItems.map(async (item) => {
				if (item.type === "artist" && item.artist) {
					return fetch(
						`/api/events/${eventId}/artists/${item.artist.id}?eventShowId=${item.id === item.artist.id ? "" : item.id}`,
						{
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ performance_status: "not_started" }),
						}
					);
				} else if (item.type === "cue" && item.cue) {
					return fetch(`/api/events/${eventId}/cues`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							id: item.cue.id,
							performance_status: "not_started",
							performanceDate: selectedPerformanceDate,
						}),
					});
				}
			});

			await Promise.all(promises);

			// Emit WS updates to keep other dashboards (DJ, MC, etc.) in sync!
			const wsManager = (window as any).performanceOrderWsManager;
			if (wsManager) {
				// Send websocket events for each updated item
				activeItems.forEach((item) => {
					if (item.type === "artist" && item.artist) {
						wsManager.emit("artist_status_changed", {
							eventId,
							artistId: item.artist.id,
							id: item.id,
							artist_name: item.artist.artist_name,
							status: "not_started",
							performanceDate: selectedPerformanceDate,
							timestamp: new Date().toISOString(),
						});
					} else if (item.type === "cue" && item.cue) {
						wsManager.emit("cue_updated", {
							eventId,
							cueId: item.cue.id,
							action: "status_updated",
							cue: item.cue,
							status: "not_started",
							performanceDate: selectedPerformanceDate,
							timestamp: new Date().toISOString(),
						});
					}
				});

				// Clear timing overrides websocket
				wsManager.emit("timing-settings-updated", {
					eventId,
					performanceDate: normalizedDate,
					time_overrides: {},
					timestamp: new Date().toISOString(),
				});
			}

			toast({
				title: "Show Reset Successful",
				description: "All cue statuses and timers have been reset.",
				variant: "success",
			});
		} catch (error) {
			console.error("Error resetting show:", error);
			toast({
				title: "Reset failed",
				description: "Some items could not be reset.",
				variant: "destructive",
			});
			fetchArtists(true);
		} finally {
			setTimeout(() => {
				isTransitioningRef.current = false;
				setIsLocalUpdate(false);
				fetchArtists();
			}, 1000);
		}
	};

	// Unified function to update show order via API
	const updateShowOrderAPI = async (updatedItems: ShowOrderItem[]) => {
		const clientRequestId = `update_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		setPendingRequestId(clientRequestId);

		const newOrder = updatedItems.map((item) => ({
			id: item.id,
			type: item.type,
			performance_order: item.performance_order,
		}));

		const response = await fetch(`/api/events/${eventId}/show-order`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				eventId,
				performanceDate: selectedPerformanceDate,
				newOrder,
				clientRequestId,
				isDraft: isDraftShowOrder,
				isConfirmed: isShowOrderConfirmed,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || "Failed to update show order");
		}

		const result = await response.json();
		setShowOrderVersion(result.data.version);

		// Emit WebSocket event for real-time updates across DJ, MC, Live Board, and Lighting Designer pages
		const wsManager = (window as any).performanceOrderWsManager;
		if (wsManager) {
			(window as any).lastShowOrderRequestId = clientRequestId;
			wsManager.emit("show-order-updated", {
				eventId,
				performanceDate: selectedPerformanceDate,
				newOrder,
				clientRequestId,
				isDraft: isDraftShowOrder,
				isConfirmed: isShowOrderConfirmed,
				action: "reordered",
			});
		}

		return result;
	};

	const moveItem = async (itemId: string, direction: "up" | "down") => {
		const currentIndex = showOrderItems.findIndex(
			(item) => item.id === itemId,
		);
		if (currentIndex === -1) return;

		const newIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= showOrderItems.length) return;

		// Store original state for rollback
		const originalItems = [...showOrderItems];
		const originalVersion = showOrderVersion;

		// Create new array with swapped items
		const newItems = [...showOrderItems];
		[newItems[currentIndex], newItems[newIndex]] = [
			newItems[newIndex],
			newItems[currentIndex],
		];

		// Update performance orders for ALL items to ensure consistency
		const updatedItems = newItems.map((item, index) => ({
			...item,
			performance_order: index + 1,
		}));

		// Optimistic update: Update local state immediately
		setShowOrderItems(updatedItems);
		setIsLocalUpdate(true);

		try {
			// Use unified API to update show order
			await updateShowOrderAPI(updatedItems);

			// Show success toast ONLY for show order update
			toast({
				title: "Show Order Updated",
				description: "Performance order has been saved successfully",
				variant: "success",
			});

			// Reset local update flag
			setTimeout(() => {
				setIsLocalUpdate(false);
				setPendingRequestId(null);
			}, 500);
		} catch (error) {
			console.error("Error moving item:", error);

			// Rollback: Revert to original state
			setShowOrderItems(originalItems);
			setShowOrderVersion(originalVersion);
			setIsLocalUpdate(false);
			setPendingRequestId(null);

			toast({
				title: "Failed to update show order",
				description:
					error instanceof Error
						? error.message
						: "Could not save the new order. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Move item to specific position using number input
	const moveToPosition = async (itemId: string, targetPosition: number) => {
		const currentIndex = showOrderItems.findIndex(
			(item) => item.id === itemId,
		);
		if (currentIndex === -1) return;

		// Validate target position
		if (
			targetPosition < 1 ||
			targetPosition > showOrderItems.length ||
			targetPosition === currentIndex + 1
		) {
			toast({
				title: "Invalid position",
				description: `Position must be between 1 and ${showOrderItems.length}`,
				variant: "destructive",
			});
			return;
		}

		// Store original state for rollback
		const originalItems = [...showOrderItems];
		const originalVersion = showOrderVersion;

		// Create new order by moving item to target position
		const items = [...showOrderItems];
		const [movedItem] = items.splice(currentIndex, 1);
		items.splice(targetPosition - 1, 0, movedItem);

		// Update performance orders for ALL items
		const updatedItems = items.map((item, index) => ({
			...item,
			performance_order: index + 1,
		}));

		// Optimistic update: Update local state immediately
		setShowOrderItems(updatedItems);
		setIsLocalUpdate(true);
		setEditingPosition(null);

		try {
			// Use unified API to update show order
			await updateShowOrderAPI(updatedItems);

			// Show success toast
			toast({
				title: "Show Order Updated",
				description: "Performance order has been saved successfully",
				variant: "success",
			});

			// Reset local update flag
			setTimeout(() => {
				setIsLocalUpdate(false);
				setPendingRequestId(null);
			}, 500);
		} catch (error) {
			console.error("Error moving item:", error);

			// Rollback: Revert to original state
			setShowOrderItems(originalItems);
			setShowOrderVersion(originalVersion);
			setIsLocalUpdate(false);
			setPendingRequestId(null);

			toast({
				title: "Failed to update show order",
				description:
					error instanceof Error
						? error.message
						: "Could not save the new order. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Emergency broadcast functions
	const fetchEmergencyBroadcasts = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts`,
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setEmergencyBroadcasts(data.data || []);
				}
			}
		} catch (error) {
			console.error("Error fetching emergency broadcasts:", error);
		}
	};

	const createEmergencyBroadcast = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message: newBroadcast.message,
						emergency_code: newBroadcast.emergency_code,
						is_active: true,
					}),
				},
			);

			if (response.ok) {
				setNewBroadcast({ message: "", emergency_code: "green" });
				setIsEmergencyDialogOpen(false);

				toast({
					title: "Emergency broadcast sent",
					description: `${newBroadcast.emergency_code.toUpperCase()} alert broadcast to all dashboards`,
					variant: "destructive",
				});

				fetchEmergencyBroadcasts();

				// Broadcast via WebSocket to all connected dashboards
				// WebSocket will handle broadcasting to all connected clients
			} else {
				throw new Error("Failed to create emergency broadcast");
			}
		} catch (error) {
			console.error("Error creating emergency broadcast:", error);
			toast({
				title: "Error sending broadcast",
				description: "Failed to send emergency broadcast",
				variant: "destructive",
			});
		}
	};

	const deactivateBroadcast = async (broadcastId: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts/${broadcastId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						is_active: false,
					}),
				},
			);

			if (response.ok) {
				toast({
					title: "Broadcast deactivated",
					description:
						"Emergency broadcast has been cleared from all dashboards",
					variant: "success",
				});

				fetchEmergencyBroadcasts();
			} else {
				throw new Error("Failed to deactivate broadcast");
			}
		} catch (error) {
			console.error("Error deactivating broadcast:", error);
			toast({
				title: "Error deactivating broadcast",
				description: "Failed to clear emergency broadcast",
				variant: "destructive",
			});
		}
	};

	const toggleDraftShowOrder = async () => {
		try {
			const newDraftStatus = !isDraftShowOrder;

			// Update show order with new draft status
			const newOrder = showOrderItems.map((item) => ({
				id: item.id,
				type: item.type,
				performance_order: item.performance_order,
			}));

			// When switching to draft mode, always reset confirmed
			// When switching OFF draft mode, also set confirmed to true (confirmed state)
			const newConfirmedStatus = newDraftStatus ? false : true;

			const response = await fetch(`/api/events/${eventId}/show-order`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					eventId,
					performanceDate: selectedPerformanceDate,
					newOrder,
					isDraft: newDraftStatus,
					isConfirmed: newConfirmedStatus,
				}),
			});

			if (response.ok) {
				setIsDraftShowOrder(newDraftStatus);
				setIsShowOrderConfirmed(newConfirmedStatus);
				toast({
					title: newDraftStatus
						? "Show order set to draft"
						: "Show order confirmed",
					description: newDraftStatus
						? "Show order is now in draft mode"
						: "Show order has been confirmed",
					variant: "success",
				});

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).performanceOrderWsManager;
				if (wsManager) {
					wsManager.emit("show-order-updated", {
						eventId,
						performanceDate: selectedPerformanceDate,
						isDraft: newDraftStatus,
						isConfirmed: newConfirmedStatus,
						action: "draft_toggled",
					});
				}
			} else {
				throw new Error("Failed to update draft status");
			}
		} catch (error) {
			console.error("Error toggling draft status:", error);
			toast({
				title: "Error updating draft status",
				description: "Failed to toggle draft mode",
				variant: "destructive",
			});
		}
	};

	const confirmShowOrder = async () => {
		try {
			// Update show order with confirmed status
			const newOrder = showOrderItems.map((item) => ({
				id: item.id,
				type: item.type,
				performance_order: item.performance_order,
			}));

			const response = await fetch(`/api/events/${eventId}/show-order`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					eventId,
					performanceDate: selectedPerformanceDate,
					newOrder,
					isDraft: false,
					isConfirmed: true,
				}),
			});

			if (response.ok) {
				setIsDraftShowOrder(false);
				setIsShowOrderConfirmed(true);
				toast({
					title: "Show order confirmed",
					description:
						"Show order has been finalized and will be visible to artists",
					variant: "success",
				});

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).performanceOrderWsManager;
				if (wsManager) {
					wsManager.emit("show-order-updated", {
						eventId,
						performanceDate: selectedPerformanceDate,
						isDraft: false,
						isConfirmed: true,
						action: "confirmed",
					});
				}
			} else {
				throw new Error("Failed to confirm show order");
			}
		} catch (error) {
			console.error("Error confirming show order:", error);
			toast({
				title: "Error confirming show order",
				description: "Failed to finalize show order",
				variant: "destructive",
			});
		}
	};

	const getEmergencyColor = (code: string) => {
		switch (code) {
			case "red":
				return "bg-red-500 text-white";
			case "blue":
				return "bg-blue-500 text-white";
			case "green":
				return "bg-green-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const getQualityBadge = (rating: number | null) => {
		if (!rating) return null;

		const colors = {
			1: "text-green-500",
			2: "text-yellow-500",
			3: "text-blue-500",
		};

		return (
			<div className="flex items-center gap-1">
				<Star
					className={`h-4 w-4 fill-current ${
						colors[rating as keyof typeof colors]
					}`}
				/>
			</div>
		);
	};

	const getRowColorClasses = (status?: ShowOrderItem["status"]) => {
		switch (status) {
			case "completed":
				return "bg-red-50 border-red-200 text-red-800 shadow-sm";
			case "currently_on_stage":
				return "bg-green-50 border-green-200 text-green-800 shadow-sm";
			case "next_on_deck":
				return "bg-blue-50 border-blue-200 text-blue-800 shadow-sm";
			case "not_started":
			default:
				return "bg-white border-gray-200 text-gray-900 shadow-sm"; // Back Stage - White background
		}
	};

	const copyArtistPortalLink = async () => {
		const artistPortalUrl = `${window.location.origin}/artist-register/${eventId}`;
		try {
			await navigator.clipboard.writeText(artistPortalUrl);
			toast({
				title: "Link copied!",
				description: "Artist portal link copied to clipboard",
				variant: "success",
			});
		} catch (error) {
			console.error("Failed to copy link:", error);
			toast({
				title: "Copy failed",
				description: "Failed to copy link to clipboard",
				variant: "destructive",
			});
		}
	};

	const cueTypes = [
		{ type: "opening" as const, label: "Opening", icon: Play },
		{ type: "countdown" as const, label: "Countdown", icon: Timer },
		{ type: "mc_break" as const, label: "MC Break", icon: Mic },
		{ type: "video_break" as const, label: "Video Break", icon: Video },
		{
			type: "cleaning_break" as const,
			label: "Cleaning Break",
			icon: Trash2,
		},
		{ type: "speech_break" as const, label: "Speech Break", icon: Speaker },
		{
			type: "artist_ending" as const,
			label: "Artist Ending",
			icon: CheckCircle,
		},
		{ type: "animation" as const, label: "Animation", icon: Sparkles },
	];

	// PDF Export Function - Modern Design with @react-pdf/renderer
	const exportToPDF = async () => {
		try {
			toast({
				title: "Generating PDF...",
				description:
					"Please wait while we create your performance order PDF",
			});

			// Fetch full artist details for nationality information
			const artistDetailsMap = new Map();
			for (const item of showOrderItems) {
				if (item.type === "artist" && item.artist) {
					try {
						const response = await fetch(
							`/api/events/${eventId}/artists/${item.artist.id}`,
						);
						if (response.ok) {
							const data = await response.json();
							if (data.success && data.data) {
								artistDetailsMap.set(
									item.artist.id,
									data.data.artist || data.data,
								);
							}
						}
					} catch (error) {
						console.error(
							`Failed to fetch artist ${item.artist.id}:`,
							error,
						);
					}
				}
			}

			// Prepare performance data
			const performances = showOrderItems.map((item, index) => {
				const fullArtist =
					item.type === "artist" && item.artist
						? artistDetailsMap.get(item.artist.id) || item.artist
						: null;

				const nationality = fullArtist
					? fullArtist.homeCountry ||
						fullArtist.home_country ||
						fullArtist.countryLiving ||
						fullArtist.country_living ||
						fullArtist.nationality
					: undefined;

				return {
					id: item.id,
					type: item.type,
					order: item.performance_order || index + 1,
					name:
						item.type === "artist"
							? item.artist?.artist_name || "Unknown Artist"
							: item.cue?.title || "Cue",
					style: item.artist?.style,
					duration:
						item.type === "artist"
							? item.artist?.actual_duration ||
								(item.artist?.performance_duration
									? item.artist.performance_duration * 60
									: 0)
							: (item.cue?.duration ? item.cue.duration * 60 : 0) + (item.cue?.extraTime || 0),
					nationality: nationality
						? getCountryName(nationality)
						: undefined,
					flag: nationality ? getCountryFlag(nationality) : undefined,
					cueType: item.cue?.type,
				};
			});

			// Get day of the week
			const dayOfWeek = selectedPerformanceDate
				? new Date(selectedPerformanceDate).toLocaleDateString(
						"en-US",
						{ weekday: "long" },
					)
				: "";

			const dateText = selectedPerformanceDate
				? `${dayOfWeek}, ${new Date(selectedPerformanceDate).toLocaleDateString()}`
				: "Date: Not Selected";

			// Store PDF data in sessionStorage for preview page
			sessionStorage.setItem(
				`pdf-data-${eventId}`,
				JSON.stringify({
					eventName: event?.name || "Event",
					eventDate: dateText,
					performances,
					backstageReadyTime: eventTimings.backstage_ready_time,
					showStartTime: eventTimings.show_start_time,
					venue: event?.venue,
				}),
			);

			// Open preview page in new tab
			const previewUrl = `/stage-manager/events/${eventId}/performance-order/pdf-preview`;
			window.open(previewUrl, "_blank");

			toast({
				title: "✅ PDF Preview Opening!",
				description: "Opening PDF preview in new tab...",
				variant: "default",
			});
		} catch (error) {
			console.error("Error generating PDF:", error);
			toast({
				title: "❌ Export Failed",
				description: "Failed to generate PDF. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Helper function to convert hex color to RGB
	const hexToRgb = (hex: string): [number, number, number] | null => {
		// Remove # if present
		hex = hex.replace("#", "");

		// Parse hex values
		if (hex.length === 6) {
			const r = parseInt(hex.substring(0, 2), 16);
			const g = parseInt(hex.substring(2, 4), 16);
			const b = parseInt(hex.substring(4, 6), 16);
			return [r, g, b];
		}

		return null;
	};

	// Toggle completion status for items
	const toggleItemCompletion = async (
		itemId: string,
		itemType: "artist" | "cue",
		currentStatus: boolean,
	) => {
		const newStatus = !currentStatus;
		const timestamp = new Date().toISOString();

		try {
			// Update local state immediately for better UX with timestamp
			setShowOrderItems((prevItems) =>
				prevItems.map((item) =>
					item.id === itemId
						? {
								...item,
								...(item.type === "artist" && item.artist
									? {
											artist: {
												...item.artist,
												is_completed: newStatus,
												completed_at: newStatus
													? timestamp
													: null,
											},
										}
									: {}),
								...(item.type === "cue" && item.cue
									? {
											cue: {
												...item.cue,
												is_completed: newStatus,
												completed_at: newStatus
													? timestamp
													: null,
											},
										}
									: {}),
							}
						: item,
				),
			);

			// Force re-render immediately
			setForceRenderKey((prev) => prev + 1);

			if (itemType === "artist") {
				const item = showOrderItems.find((i) => i.id === itemId);
				const baseArtistId = item?.type === "artist" && item.artist ? item.artist.id : itemId;

				// Update artist completion status via API
				const response = await fetch(
					`/api/events/${eventId}/artists/${baseArtistId}?eventShowId=${itemId === baseArtistId ? "" : itemId}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							is_completed: newStatus,
							completed_at: newStatus ? timestamp : null,
						}),
					},
				);

				if (response.ok) {
					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("artist_completion_toggled", {
							eventId,
							artistId: baseArtistId,
							id: itemId,
							is_completed: newStatus,
							completed_at: newStatus ? timestamp : null,
							performanceDate: selectedPerformanceDate,
							timestamp: timestamp,
						});
					}

					toast({
						title: newStatus
							? "Artist Marked Complete"
							: "Artist Marked Incomplete",
						description: `Artist completion status updated`,
						variant: "success",
					});
				} else {
					throw new Error(
						"Failed to update artist completion status",
					);
				}
			} else if (itemType === "cue") {
				// Update cue completion status via API
				const response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: itemId,
						is_completed: newStatus,
						completed_at: newStatus ? timestamp : null,
						performanceDate: selectedPerformanceDate,
					}),
				});

				if (response.ok) {
					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).performanceOrderWsManager;
					if (wsManager) {
						wsManager.emit("cue_completion_toggled", {
							eventId,
							cueId: itemId,
							is_completed: newStatus,
							completed_at: newStatus ? timestamp : null,
							performanceDate: selectedPerformanceDate,
							timestamp: timestamp,
						});
					}

					toast({
						title: newStatus
							? "Cue Marked Complete"
							: "Cue Marked Incomplete",
						description: `Cue completion status updated`,
						variant: "success",
					});
				} else {
					throw new Error("Failed to update cue completion status");
				}
			}
		} catch (error) {
			console.error("Error toggling item completion:", error);

			// Revert local state on error
			setShowOrderItems((prevItems) =>
				prevItems.map((item) =>
					item.id === itemId
						? {
								...item,
								...(item.type === "artist" && item.artist
									? {
											artist: {
												...item.artist,
												is_completed: currentStatus,
												completed_at: currentStatus
													? item.artist.completed_at
													: null,
											},
										}
									: {}),
								...(item.type === "cue" && item.cue
									? {
											cue: {
												...item.cue,
												is_completed: currentStatus,
												completed_at: currentStatus
													? item.cue.completed_at
													: null,
											},
										}
									: {}),
							}
						: item,
				),
			);

			// Force re-render after revert
			setForceRenderKey((prev) => prev + 1);

			toast({
				title: "Error updating completion status",
				description:
					"Failed to update completion status. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Compute live timings for all items at top level
	const currentlyOnStageIdx = showOrderItems.findIndex(
		(i) => i.status === "currently_on_stage",
	);
	const liveTimings = calculateLiveTimings(
		showOrderItems.map((item, idx) => ({
			...item,
			is_completed:
				currentlyOnStageIdx !== -1 && idx >= currentlyOnStageIdx
					? false
					: item.type === "artist"
						? item.artist?.is_completed
						: item.cue?.is_completed,
			completed_at:
				currentlyOnStageIdx !== -1 && idx >= currentlyOnStageIdx
					? null
					: item.type === "artist"
						? item.artist?.completed_at
						: item.cue?.completed_at,
			started_at:
				currentlyOnStageIdx !== -1 && idx >= currentlyOnStageIdx
					? null
					: undefined,
		})),
		eventTimings.show_start_time,
		timeOverrides,
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading performance order...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-border bg-white">
				<div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
					<div className="flex flex-col gap-2 sm:gap-3">
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									router.push(
										`/stage-manager/events/${eventId}`,
									)
								}
								className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm shrink-0 h-8"
							>
								<ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
								<span className="hidden sm:inline">
									Back to Dashboard
								</span>
								<span className="sm:hidden">Back</span>
							</Button>
							<div className="flex-1 w-full sm:w-auto min-w-0">
								<h1 className="text-base sm:text-2xl font-bold text-foreground truncate">
									Performance Order
								</h1>
								<p className="text-[10px] sm:text-sm text-muted-foreground truncate">
									Assign artists to show order - rehearsal
									status affects status change permissions
								</p>
								<div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
									<div className="flex items-center gap-1.5">
										<div
											className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
												cacheInitialized
													? "bg-blue-500"
													: "bg-gray-500"
											}`}
										></div>
										<span className="text-[10px] sm:text-xs text-muted-foreground">
											{cacheInitialized
												? "Cache ready"
												: "Initializing cache..."}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full">
							<div className="flex flex-wrap items-center gap-1 sm:gap-2 mr-auto sm:mr-2">
								<Button
									size="sm"
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
									onClick={() => onTabChange && onTabChange("Artist Files")}
									title="Step 1: Artist Files"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										1.
									</span>
									Artists
								</Button>
								<Button
									size="sm"
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-sm rounded-full"
									onClick={() =>
										onTabChange
											? onTabChange("Show Management")
											: router.push(
													`/stage-manager/events/${eventId}/artists`,
												)
									}
									title="Step 2: Show Management"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										2.
									</span>
									Shows
								</Button>
								<Button
									size="sm"
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
									onClick={() =>
										onTabChange
											? onTabChange("Rehearsals")
											: router.push(
													`/stage-manager/events/${eventId}/rehearsal`,
												)
									}
									title="Step 3: Rehearsals"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										3.
									</span>
									Rehearsals
								</Button>
								<Button
									size="sm"
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-pink-900 to-slate-900 text-white border-0 shadow-sm rounded-full ring-2 ring-pink-300 ring-offset-1 pointer-events-none"
									disabled
									title="Step 4: Stage (Current)"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										4.
									</span>
									Stage
								</Button>
							</div>

							{/* Vertical Divider */}
							<div className="hidden md:block border-l border-gray-300 h-6 mx-2" />

							{/* Order & Live Caller Sub-Tabs */}
							<div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
								<button
									type="button"
									className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all font-semibold ${
										performanceView === "order"
											? "bg-gray-800 text-white shadow-sm"
											: "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
									}`}
									onClick={() => setPerformanceView("order")}
								>
									<CheckCircle className="h-3.5 w-3.5" />
									<span>Planner</span>
								</button>
								<button
									type="button"
									className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all font-semibold ${
										performanceView === "live-caller"
											? "bg-red-600 text-white shadow-sm font-extrabold"
											: "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
									}`}
									onClick={() => setPerformanceView("live-caller")}
								>
									<Radio className="h-3.5 w-3.5 font-bold" />
									<span>Show Caller</span>
								</button>
							</div>
						</div>
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
							{/* Performance Day Selector */}
							{eventDates.length > 0 && (
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
									<Label
										htmlFor="performance-day"
										className="text-xs sm:text-sm font-medium whitespace-nowrap"
									>
										Performance Day:
									</Label>
									<Select
										value={selectedPerformanceDate}
										onValueChange={(value) => {
											setSelectedPerformanceDate(value);
											saveSelectedDateToStorage(
												eventId,
												value,
											);
										}}
									>
										<SelectTrigger className="w-full sm:w-[180px]">
											<SelectValue placeholder="Select performance day" />
										</SelectTrigger>
										<SelectContent>
											{eventDates.map((date, index) => (
												<SelectItem
													key={date}
													value={date}
												>
													Day {index + 1} -{" "}
													{new Date(
														date,
													).toLocaleDateString()}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}

							<Dialog
								open={isEmergencyDialogOpen}
								onOpenChange={setIsEmergencyDialogOpen}
							>
								<DialogTrigger asChild>
									<Button
										variant="destructive"
										size="sm"
										className="text-xs sm:text-sm w-full sm:w-auto"
									>
										<AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
										<span className="hidden sm:inline">
											Emergency Broadcast
										</span>
										<span className="sm:hidden">
											Emergency
										</span>
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											Emergency Broadcast
										</DialogTitle>
										<DialogDescription>
											Send an emergency message with color
											code to all dashboards
										</DialogDescription>
									</DialogHeader>
									<form
										onSubmit={createEmergencyBroadcast}
										className="space-y-4"
									>
										<div className="space-y-2">
											<Label>Emergency Code</Label>
											<Select
												value={
													newBroadcast.emergency_code
												}
												onValueChange={(value) =>
													setNewBroadcast({
														...newBroadcast,
														emergency_code: value,
													})
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="red">
														🔴 RED - Emergency
													</SelectItem>
													<SelectItem value="blue">
														🔵 BLUE - Security
													</SelectItem>
													<SelectItem value="green">
														🟢 GREEN - All Clear
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Message</Label>
											<Textarea
												value={newBroadcast.message}
												onChange={(e) =>
													setNewBroadcast({
														...newBroadcast,
														message: e.target.value,
													})
												}
												placeholder="Enter emergency message..."
												required
											/>
										</div>
										<div className="flex gap-2">
											<Button type="submit">
												Send Broadcast
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													setIsEmergencyDialogOpen(
														false,
													)
												}
											>
												Cancel
											</Button>
										</div>
									</form>
								</DialogContent>
							</Dialog>

							{/* Draft Show Order Toggle */}
							<div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white">
								<Label
									htmlFor="draft-toggle"
									className="text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer"
								>
									Draft Mode:
								</Label>
								<button
									id="draft-toggle"
									type="button"
									onClick={toggleDraftShowOrder}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
										isDraftShowOrder
											? "bg-blue-600"
											: "bg-gray-300"
									}`}
									role="switch"
									aria-checked={isDraftShowOrder}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
											isDraftShowOrder
												? "translate-x-6"
												: "translate-x-1"
										}`}
									/>
								</button>
								<span className="text-xs text-muted-foreground">
									{isDraftShowOrder ? "ON" : "OFF"}
								</span>
							</div>

							{/* Checklist Button to the right of Draft Mode */}
							<EventChecklistButton eventId={eventId} />

							{/* Confirm Show Order Button */}
							{isDraftShowOrder &&
								!isShowOrderConfirmed &&
								showOrderItems.length > 0 && (
									<Button
										variant="default"
										size="sm"
										onClick={confirmShowOrder}
										className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto bg-green-600 hover:bg-green-700"
									>
										<Check className="h-3 w-3 sm:h-4 sm:w-4" />
										Confirm Show Order
									</Button>
								)}
						</div>
					</div>
				</div>
			</header>

			{/* Quick Access Dashboard Cards */}
			<div className="border-b border-border bg-gray-50">
				<div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
						{/* Lighting Designer Dashboard Card */}
						<Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white flex flex-col justify-between">
							<CardContent className="p-3 flex items-center justify-between gap-2 pb-2">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<div className="bg-amber-100 p-1.5 rounded-lg shrink-0">
										<Lightbulb className="h-4 w-4 text-amber-500" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-xs sm:text-sm text-gray-900 truncate font-bold">
											Lighting...
										</CardTitle>
										<CardDescription className="text-[10px] text-gray-500 truncate">
											Live show cues...
										</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										onClick={(e) => {
											e.stopPropagation();
											const origin =
												typeof window !== "undefined"
													? window.location.origin
													: "";
											const lightingUrl = `${origin}/stage-manager/events/${eventId}/performance-order/lighting?standalone=true`;
											navigator.clipboard.writeText(
												lightingUrl,
											);
											toast({
												title: "Link copied!",
												description:
													"Lighting Designer link copied",
												variant: "success",
											});
										}}
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Copy Link"
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<QRCodeDialog
										url={
											typeof window !== "undefined"
												? `${window.location.origin}/stage-manager/events/${eventId}/performance-order/lighting?standalone=true`
												: `/stage-manager/events/${eventId}/performance-order/lighting?standalone=true`
										}
										title="Lighting Designer"
										description="Scan this QR code to access the Lighting Designer Dashboard on any device"
										triggerText=""
										triggerVariant="outline"
										triggerSize="sm"
										triggerClassName="h-8 w-8 p-0"
									/>
									<Button
										className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 h-8 px-2.5 text-xs shadow-sm hover:shadow-md transition-shadow"
										onClick={() =>
											setIsLightingDesignerOpen(true)
										}
									>
										Open
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* DJ Dashboard Card */}
						<Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white flex flex-col justify-between">
							<CardContent className="p-3 flex items-center justify-between gap-2 pb-2">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<div className="bg-green-100 p-1.5 rounded-lg shrink-0">
										<Music className="h-4 w-4 text-green-600" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-xs sm:text-sm text-gray-900 truncate font-bold">
											DJ
										</CardTitle>
										<CardDescription className="text-[10px] text-gray-500 truncate">
											Access tracks...
										</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										onClick={(e) => {
											e.stopPropagation();
											const origin =
												typeof window !== "undefined"
													? window.location.origin
													: "";
											const djUrl = `${origin}/stage-manager/events/${eventId}/performance-order/dj?standalone=true`;
											navigator.clipboard.writeText(
												djUrl,
											);
											toast({
												title: "Link copied!",
												description:
													"DJ Dashboard link copied",
												variant: "success",
											});
										}}
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Copy Link"
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<QRCodeDialog
										url={
											typeof window !== "undefined"
												? `${window.location.origin}/stage-manager/events/${eventId}/performance-order/dj?standalone=true`
												: `/stage-manager/events/${eventId}/performance-order/dj?standalone=true`
										}
										title="DJ Dashboard"
										description="Scan this QR code to access the DJ Dashboard on any device"
										triggerText=""
										triggerVariant="outline"
										triggerSize="sm"
										triggerClassName="h-8 w-8 p-0"
									/>
									<Button
										className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 h-8 px-2.5 text-xs"
										onClick={() =>
											router.push(
												`/stage-manager/events/${eventId}/performance-order/dj`,
											)
										}
									>
										<Music className="h-3.5 w-3.5" />
										Open
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* MC Dashboard Card */}
						<Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white flex flex-col justify-between">
							<CardContent className="p-3 flex items-center justify-between gap-2 pb-2">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<div className="bg-yellow-100 p-1.5 rounded-lg shrink-0">
										<Mic className="h-4 w-4 text-yellow-600" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-xs sm:text-sm text-gray-900 truncate font-bold">
											MC
										</CardTitle>
										<CardDescription className="text-[10px] text-gray-500 truncate">
											View artist info...
										</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										onClick={(e) => {
											e.stopPropagation();
											const origin =
												typeof window !== "undefined"
													? window.location.origin
													: "";
											const mcUrl = `${origin}/stage-manager/events/${eventId}/performance-order/mc?standalone=true`;
											navigator.clipboard.writeText(
												mcUrl,
											);
											toast({
												title: "Link copied!",
												description:
													"MC Dashboard link copied",
												variant: "success",
											});
										}}
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Copy Link"
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<QRCodeDialog
										url={
											typeof window !== "undefined"
												? `${window.location.origin}/stage-manager/events/${eventId}/performance-order/mc?standalone=true`
												: `/stage-manager/events/${eventId}/performance-order/mc?standalone=true`
										}
										title="MC Dashboard"
										description="Scan this QR code to access the MC Dashboard on any device"
										triggerText=""
										triggerVariant="outline"
										triggerSize="sm"
										triggerClassName="h-8 w-8 p-0"
									/>
									<Button
										className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center gap-1.5 h-8 px-2.5 text-xs"
										onClick={() =>
											router.push(
												`/stage-manager/events/${eventId}/performance-order/mc`,
											)
										}
									>
										<Mic className="h-3.5 w-3.5" />
										Open
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Live Performance Board Card */}
						<Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white flex flex-col justify-between">
							<CardContent className="p-3 flex items-center justify-between gap-2 pb-2">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<div className="bg-red-100 p-1.5 rounded-lg shrink-0">
										<ExternalLink className="h-4 w-4 text-red-600" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-xs sm:text-sm text-gray-900 truncate font-bold">
											Live...
										</CardTitle>
										<CardDescription className="text-[10px] text-gray-500 truncate">
											Real-time tracking...
										</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										onClick={(e) => {
											e.stopPropagation();
											const origin =
												typeof window !== "undefined"
													? window.location.origin
													: "";
											const liveBoardUrl = `${origin}/stage-manager/events/${eventId}/performance-order/live-board?standalone=true`;
											navigator.clipboard.writeText(
												liveBoardUrl,
											);
											toast({
												title: "Link copied!",
												description:
													"Live Board link copied",
												variant: "success",
											});
										}}
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Copy Link"
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<QRCodeDialog
										url={
											typeof window !== "undefined"
												? `${window.location.origin}/stage-manager/events/${eventId}/performance-order/live-board?standalone=true`
												: `/stage-manager/events/${eventId}/performance-order/live-board?standalone=true`
										}
										title="Live Performance Board"
										description="Scan this QR code to access the Live Performance Board on any device"
										triggerText=""
										triggerVariant="outline"
										triggerSize="sm"
										triggerClassName="h-8 w-8 p-0"
									/>
									<Button
										className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 h-8 px-2.5 text-xs"
										onClick={() =>
											router.push(
												`/stage-manager/events/${eventId}/performance-order/live-board`,
											)
										}
									>
										<ExternalLink className="h-3.5 w-3.5" />
										Open
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Organizer Card */}
						<Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white flex flex-col justify-between">
							<CardContent className="p-3 flex items-center justify-between gap-2 pb-2">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<div className="bg-purple-100 p-1.5 rounded-lg shrink-0">
										<ClipboardList className="h-4 w-4 text-purple-600" />
									</div>
									<div className="min-w-0">
										<CardTitle className="text-xs sm:text-sm text-gray-900 truncate font-bold">
											Organizer
										</CardTitle>
										<CardDescription className="text-[10px] text-gray-500 truncate">
											Organiser View...
										</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<Button
										onClick={(e) => {
											e.stopPropagation();
											const origin =
												typeof window !== "undefined"
													? window.location.origin
													: "";
											const organiserUrl = `${origin}/stage-manager/events/${eventId}/performance-order/organiser?standalone=true`;
											navigator.clipboard.writeText(
												organiserUrl,
											);
											toast({
												title: "Link copied!",
												description:
													"Organiser View link copied",
												variant: "success",
											});
										}}
										variant="outline"
										size="sm"
										className="h-8 w-8 p-0"
										title="Copy Link"
									>
										<Copy className="h-3.5 w-3.5" />
									</Button>
									<QRCodeDialog
										url={
											typeof window !== "undefined"
												? `${window.location.origin}/stage-manager/events/${eventId}/performance-order/organiser?standalone=true`
												: `/stage-manager/events/${eventId}/performance-order/organiser?standalone=true`
										}
										title="Organiser View"
										description="Scan this QR code to access the Organiser View on any device"
										triggerText=""
										triggerVariant="outline"
										triggerSize="sm"
										triggerClassName="h-8 w-8 p-0"
									/>
									<Button
										className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 h-8 px-2.5 text-xs"
										onClick={() =>
											router.push(
												`/stage-manager/events/${eventId}/performance-order/organiser`,
											)
										}
									>
										<ClipboardList className="h-3.5 w-3.5" />
										Open
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Emergency Broadcasts */}
			{emergencyBroadcasts.length > 0 && (
				<div className="border-b border-border">
					{emergencyBroadcasts.map((broadcast) => (
						<div
							key={broadcast.id}
							className={`p-3 sm:p-4 ${getEmergencyColor(
								broadcast.emergency_code,
							)}`}
						>
							<div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
								<div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
									<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0 flex-shrink-0" />
									<div className="text-sm sm:text-base">
										<span className="font-bold">
											{broadcast.emergency_code.toUpperCase()}{" "}
											ALERT:
										</span>
										<span className="ml-2 break-words">
											{broadcast.message}
										</span>
									</div>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="bg-white/20 hover:bg-white/30 text-xs sm:text-sm w-full sm:w-auto"
									onClick={() =>
										deactivateBroadcast(broadcast.id)
									}
								>
									Clear Alert
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
				{performanceView === "order" ? (
					<>
						{/* Draft / Confirmed Banner */}
						{isDraftShowOrder && !isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 px-4 py-4">
						<FileEdit className="h-8 w-8 text-yellow-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-yellow-700 leading-tight">
							DRAFT ORDER
						</p>
					</div>
				)}
				{!isDraftShowOrder && isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-4">
						<CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-green-700 leading-tight">
							CONFIRMED ORDER LIST
						</p>
					</div>
				)}

				{/* Timing Overview Section */}
				<div className="mb-4 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
					<Card>
						<CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-muted-foreground">
										Total Show Time
									</p>
									<p className="text-xl sm:text-2xl font-bold">
										{formatTotalTime(
											calculateTotalShowTime(
												showOrderItems,
											),
										)}
									</p>
								</div>
								<Timer className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-muted-foreground">
										Backstage Ready
									</p>
									<p className="text-xl sm:text-2xl font-bold">
										{eventTimings.backstage_ready_time ||
											"--:--"}
									</p>
								</div>
								<Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground">
										Show Start
									</p>
									<p className="text-xl sm:text-2xl font-bold">
										{eventTimings.show_start_time ||
											"--:--"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Play className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
									<Button
										size="sm"
										variant="outline"
										className="text-xs sm:text-sm"
										onClick={() => {
											setEditForm((prev) => ({
												...prev,
												backstage_ready_time:
													eventTimings.backstage_ready_time ||
													"",
												show_start_time:
													eventTimings.show_start_time ||
													"",
											}));
											setShowTimingSettings(true);
										}}
									>
										<Settings className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Add Cues Card */}
					<Card>
						<CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<p className="text-xs sm:text-sm font-medium text-muted-foreground">
										Add Cues
									</p>
									<Dialog>
										<DialogTrigger asChild>
											<Button className="mt-1 w-full flex items-center gap-2">
												<Plus className="h-4 w-4" />
												Add Cues
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>
													Add Cues
												</DialogTitle>
												<DialogDescription>
													Add performance cues to the
													show order
												</DialogDescription>
											</DialogHeader>
											<div className="grid grid-cols-2 gap-2 mt-4">
												{cueTypes.map((cueType) => {
													const IconComponent =
														cueType.icon;
													return (
														<Button
															key={cueType.type}
															variant="outline"
															size="sm"
															onClick={() =>
																openAddCueDialog(
																	cueType.type,
																)
															}
															className="flex items-center gap-2 justify-start"
														>
															<IconComponent className="h-4 w-4" />
															{cueType.label}
														</Button>
													);
												})}
											</div>
										</DialogContent>
									</Dialog>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-8">
					{/* Show Order */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<Clock className="h-5 w-5" />
											Show Order
										</CardTitle>
										<CardDescription>
											Click position number (#1, #2...) to
											enter exact position, or use ⬆️⬇️
											arrows for quick moves
										</CardDescription>
									</div>
									<div className="flex items-center gap-2">
										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													className="relative flex items-center gap-2 text-xs sm:text-sm"
												>
													<Star className="h-3 w-3 sm:h-4 sm:w-4" />
													<span className="hidden sm:inline">
														Rehearsal Shows
													</span>
													<span className="sm:hidden">
														Shows
													</span>
													{rehearsalShows.length >
														0 && (
														<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
															{
																rehearsalShows.length
															}
														</span>
													)}
												</Button>
											</DialogTrigger>
											<DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
												<DialogHeader>
													<DialogTitle>
														Rehearsal Shows
													</DialogTitle>
													<DialogDescription>
														Artists assigned to this
														show date - can be
														assigned to show order
														regardless of rehearsal
														status
													</DialogDescription>
												</DialogHeader>
												<div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3 min-h-[300px]">
													{rehearsalShows.length ===
													0 ? (
														<p className="text-muted-foreground text-center py-8">
															No artists assigned
															to this show date
															yet
														</p>
													) : (
														rehearsalShows.map(
															(artist) => (
																<div
																	key={
																		artist.id
																	}
																	className="border rounded-lg overflow-hidden"
																>
																	<div
																		className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3"
																		style={{
																			backgroundColor:
																				artist.backstage_color ||
																				"#ffffff",
																		}}
																	>
																		<div className="flex-1">
																			<div
																				className={`font-medium ${
																					artist.backstage_color &&
																					!isLightColor(
																						artist.backstage_color,
																					)
																						? "text-white"
																						: ""
																				}`}
																			>
																				{
																					artist.artist_name
																				}
																			</div>
																			<div
																				className={`text-sm ${
																					artist.backstage_color &&
																					!isLightColor(
																						artist.backstage_color,
																					)
																						? "text-white/90"
																						: "text-muted-foreground"
																				}`}
																			>
																				{
																					artist.style
																				}
																				{(
																					artist as any
																				)
																					.performanceType && (
																					<span className="ml-2 text-xs opacity-75">
																						•{" "}
																						{
																							(
																								artist as any
																							)
																								.performanceType
																						}
																					</span>
																				)}
																				{artist.actual_duration && (
																					<span className="ml-2">
																						•{" "}
																						{formatDuration(
																							artist.actual_duration,
																						)}
																					</span>
																				)}
																				{artist.quality_rating &&
																					getQualityBadge(
																						artist.quality_rating,
																					)}
																			</div>
																			<div className="mt-2">
																				<Badge
																					className={`text-xs ${
																						artist.rehearsal_completed
																							? "bg-green-500 text-white"
																							: "bg-yellow-500 text-white"
																					}`}
																				>
																					{artist.rehearsal_completed
																						? "Rehearsal Completed"
																						: "Rehearsal Not Completed"}
																				</Badge>
																			</div>
																		</div>
																		<div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end">
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() =>
																					viewArtistDetails(
																						artist.id,
																					)
																				}
																				title="View Details"
																				className={
																					artist.backstage_color &&
																					!isLightColor(
																						artist.backstage_color,
																					)
																						? "bg-white/20 text-white border-white/30 hover:bg-white/30"
																						: ""
																				}
																			>
																				<Eye className="h-4 w-4" />
																			</Button>
																			<Button
																				size="sm"
																				onClick={() =>
																					assignToShowOrder(
																						artist.id,
																						artist.eventShowId,
																					)
																				}
																				className={
																					artist.backstage_color &&
																					!isLightColor(
																						artist.backstage_color,
																					)
																						? "bg-white/20 text-white border-white/30 hover:bg-white/30"
																						: ""
																				}
																			>
																				Assign
																				to
																				Show
																				Order
																			</Button>
																		</div>
																	</div>
																</div>
															),
														)
													)}
												</div>
											</DialogContent>
										</Dialog>
										<Button
											variant="default"
											size="sm"
											onClick={handleExportPDF}
											disabled={isGenerating}
											className="flex items-center gap-2 text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white"
										>
											<Printer className="h-3 w-3 sm:h-4 sm:w-4" />
											<span className="hidden sm:inline">
												{isGenerating
													? "Generating..."
													: "Download PDF"}
											</span>
											<span className="sm:hidden">
												{isGenerating ? "..." : "PDF"}
											</span>
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div
									className="space-y-3"
									key={`show-order-${forceRenderKey}`}
								>
											{showOrderItems.map(
												(item, index) => {
													// Apply backstage color ONLY when status is "not_started" (backstage)
													// For other statuses, use default status colors
													const getItemBackgroundStyle =
														() => {
															if (
																item.type ===
																	"cue" &&
																item.cue
																	?.color &&
																item.status ===
																	"not_started"
															) {
																const textColor =
																	isLightColor(
																		item.cue
																			.color,
																	)
																		? "#000000"
																		: "#FFFFFF";
																return {
																	backgroundColor:
																		item.cue
																			.color,
																	borderColor:
																		item.cue
																			.color,
																	color: textColor,
																};
															} else if (
																item.type ===
																	"artist" &&
																item.artist
																	?.backstage_color &&
																item.status ===
																	"not_started"
															) {
																const textColor =
																	isLightColor(
																		item
																			.artist
																			.backstage_color,
																	)
																		? "#000000"
																		: "#FFFFFF";
																return {
																	backgroundColor:
																		item
																			.artist
																			.backstage_color,
																	borderColor:
																		item
																			.artist
																			.backstage_color,
																	color: textColor,
																};
															}
															return {};
														};

													const itemStyle =
														getItemBackgroundStyle();
													const hasCustomColor =
														(item.type === "cue" &&
															item.cue?.color &&
															item.status ===
																"not_started") ||
														(item.type ===
															"artist" &&
															item.artist
																?.backstage_color &&
															item.status ===
																"not_started");

													const isDarkBG = hasCustomColor && !isLightColor(
														item.type === "cue"
															? item.cue?.color || "#ffffff"
															: item.artist?.backstage_color || "#ffffff"
													);

													const btnClassBase = "flex flex-col items-center justify-center h-12 w-12 p-0 rounded-lg border transition-all text-xs font-normal shrink-0";

													const btnClass = isDarkBG
														? "bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
														: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900";

													const removeBtnClass = isDarkBG
														? "bg-red-500/20 text-white border-red-500/30 hover:bg-red-500/30 hover:text-white"
														: "bg-white text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700";

													return (
														<div
															key={item.id}
															className={`relative p-4 rounded-lg border-2 transition-all shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 ${
																hasCustomColor
																	? ""
																	: getRowColorClasses(
																			item.status,
																		)
															}`}
															style={itemStyle}
															onClick={(e) => {
																if ((e.target as HTMLElement).closest('button, select, input, a, [role="combobox"]')) {
																	return;
																}
																openEditShowItem(item);
															}}
														>
															{/* Dynamic Cue Badge for all cards */}
															<span
																className={`absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border z-10 shadow-sm ${
																	isDarkBG 
																		? "bg-white text-black border-gray-300"
																		: "bg-primary text-primary-foreground border-primary"
																}`}
															>
																{`CUE ${String(index + 1).padStart(2, "0")}`}
															</span>

															{/* If it's an artist, show the SHOW index badge next to it */}
															{item.type === "artist" && (
																<span
																	className={`absolute -top-2 left-14 text-[8px] font-bold px-1.5 py-0.5 rounded-full border z-10 ${
																		isDarkBG
																			? "bg-white/20 text-white border-white/30"
																			: "bg-green-100 text-green-800 border-green-200"
																	}`}
																	title={`Show ${showOrderItems.filter((i, idx) => idx < index && i.type === "artist").length + 1}`}
																>
																	{`SHOW ${showOrderItems.filter((i, idx) => idx < index && i.type === "artist").length + 1}`}
																</span>
															)}
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	{/* Reduced gap for better mobile layout */}
																	{/* Completion Checkbox */}
																	<Button
																		size="sm"
																		variant="ghost"
																		onClick={() => {
																			const isCompleted =
																				item.type ===
																				"artist"
																					? item
																							.artist
																							?.is_completed ||
																						false
																					: item
																							.cue
																							?.is_completed ||
																						false;
																			toggleItemCompletion(
																				item.id,
																				item.type,
																				isCompleted,
																			);
																		}}
																		className={`h-6 w-6 p-0 rounded border-2 transition-all flex items-center justify-center ${
																			(item.type ===
																				"artist" &&
																				item
																					.artist
																					?.is_completed) ||
																			(item.type ===
																				"cue" &&
																				item
																					.cue
																					?.is_completed)
																				? "bg-green-500 border-green-500 text-white hover:bg-green-600"
																				: "bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50"
																		} ${
																			(item.type ===
																				"cue" &&
																				item
																					.cue
																					?.color &&
																				item.status ===
																					"not_started" &&
																				!isLightColor(
																					item
																						.cue
																						.color,
																				)) ||
																			(item.type ===
																				"artist" &&
																				item
																					.artist
																					?.backstage_color &&
																				item.status ===
																					"not_started" &&
																				!isLightColor(
																					item
																						.artist
																						.backstage_color,
																				))
																				? "border-white/30 hover:border-white/50"
																				: ""
																		}`}
																		title={
																			(item.type ===
																				"artist" &&
																				item
																					.artist
																					?.is_completed) ||
																			(item.type ===
																				"cue" &&
																				item
																					.cue
																					?.is_completed)
																				? "Mark as incomplete"
																				: "Mark as complete"
																		}
																	>
																		{(item.type ===
																			"artist" &&
																			item
																				.artist
																				?.is_completed) ||
																		(item.type ===
																			"cue" &&
																			item
																				.cue
																				?.is_completed) ? (
																			<Check className="h-3 w-3" />
																		) : null}
																	</Button>

																	{/* Position Number - Click to edit */}
																	{editingPosition ===
																	item.id ? (
																		<div className="flex items-center gap-1">
																			<Input
																				type="number"
																				min="1"
																				max={
																					showOrderItems.length
																				}
																				value={
																					newPosition
																				}
																				onChange={(
																					e,
																				) => {
																					const val =
																						e
																							.target
																							.value;
																					setNewPosition(
																						val ===
																							""
																							? 1
																							: parseInt(
																									val,
																								) ||
																									1,
																					);
																				}}
																				onFocus={(
																					e,
																				) => {
																					// Select all text on focus for easy replacement
																					e.target.select();
																				}}
																				onKeyDown={(
																					e,
																				) => {
																					if (
																						e.key ===
																						"Enter"
																					) {
																						moveToPosition(
																							item.id,
																							newPosition,
																						);
																					} else if (
																						e.key ===
																						"Escape"
																					) {
																						setEditingPosition(
																							null,
																						);
																					}
																				}}
																				className="w-16 h-8 text-sm text-center"
																				autoFocus
																				placeholder={`1-${showOrderItems.length}`}
																			/>
																			<Button
																				size="sm"
																				variant="ghost"
																				onClick={() =>
																					moveToPosition(
																						item.id,
																						newPosition,
																					)
																				}
																				className="h-8 px-2"
																			>
																				<CheckCircle className="h-4 w-4 text-green-600" />
																			</Button>
																			<Button
																				size="sm"
																				variant="ghost"
																				onClick={() =>
																					setEditingPosition(
																						null,
																					)
																				}
																				className="h-8 px-2"
																			>
																				✕
																			</Button>
																		</div>
																	) : (
																		<button
																			onClick={() => {
																				setEditingPosition(
																					item.id,
																				);
																				setNewPosition(
																					index +
																						1,
																				);
																			}}
																			className="text-xs sm:text-sm font-mono bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded cursor-pointer transition-all border border-blue-300 hover:border-blue-400 font-semibold min-w-[2rem] text-center"
																			title={`Click to enter position number (1-${showOrderItems.length})`}
																		>
																			#
																			{index +
																				1}
																		</button>
																	)}
																	{/* Live Timing Badge - Read-only */}
																	{item.status ===
																	"currently_on_stage" ? (
																		<span
																			className="text-xs font-mono px-1.5 py-0.5 rounded bg-green-500 text-white border border-green-600 animate-pulse"
																			title={`Live time — Currently on Stage`}
																		>
																			{
																				currentLiveTime
																			}
																		</span>
																	) : (
																		liveTimings[
																			index
																		]
																			?.startTime && (
																			<div className="flex items-center gap-0.5">
																				{editingTimeId ===
																				item.id ? (
																					<input
																						type="time"
																						className="text-xs font-mono px-1 py-0.5 rounded border border-blue-400 bg-blue-50 w-[72px] focus:outline-none focus:ring-1 focus:ring-blue-500"
																						value={
																							editingTimeValue
																						}
																						onChange={(
																							e,
																						) =>
																							setEditingTimeValue(
																								e
																									.target
																									.value,
																							)
																						}
																						onBlur={() => {
																							if (
																								editingTimeValue
																							) {
																								saveTimeOverride(
																									item.id,
																									editingTimeValue,
																								);
																							} else {
																								setEditingTimeId(
																									null,
																								);
																							}
																						}}
																						onKeyDown={(
																							e,
																						) => {
																							if (
																								e.key ===
																								"Enter"
																							) {
																								if (
																									editingTimeValue
																								) {
																									saveTimeOverride(
																										item.id,
																										editingTimeValue,
																									);
																								} else {
																									setEditingTimeId(
																										null,
																									);
																								}
																							} else if (
																								e.key ===
																								"Escape"
																							) {
																								setEditingTimeId(
																									null,
																								);
																							}
																						}}
																						autoFocus
																					/>
																				) : (
																					<span
																						className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-blue-400 ${
																							timeOverrides[
																								item
																									.id
																							]
																								? "bg-yellow-100 text-yellow-800 border border-yellow-400"
																								: liveTimings[
																											index
																									  ]
																											?.isActual
																									? "bg-green-100 text-green-700 border border-green-300"
																									: "bg-gray-100 text-gray-600 border border-gray-300"
																						}`}
																						title={`${liveTimings[index]?.startTime} - ${liveTimings[index]?.endTime}${timeOverrides[item.id] ? " (auto-set)" : liveTimings[index]?.isActual ? " (actual)" : " (planned)"} — Click to edit`}
																						onClick={() => {
																							setEditingTimeId(
																								item.id,
																							);
																							setEditingTimeValue(
																								liveTimings[
																									index
																								]
																									?.startTime ||
																									"",
																							);
																						}}
																					>
																						{
																							liveTimings[
																								index
																							]
																								?.startTime
																						}
																					</span>
																				)}
																				{timeOverrides[
																					item
																						.id
																				] && (
																					<button
																						onClick={() =>
																							saveTimeOverride(
																								item.id,
																								"",
																							)
																						}
																						className="text-yellow-600 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors"
																						title="Reset timing to planned schedule"
																					>
																						<RefreshCw className="h-3 w-3" />
																					</button>
																				)}
																			</div>
																		)
																	)}
																	{item.type ===
																		"artist" &&
																		item.artist && (
																			<div
																				className={
																					item
																						.artist
																						.backstage_color &&
																					item.status ===
																						"not_started" &&
																					!isLightColor(
																						item
																							.artist
																							.backstage_color,
																					)
																						? "text-white"
																						: ""
																				}
																			>
																				<div className="font-medium">
																					{
																						item
																							.artist
																							.artist_name
																					}
																				</div>
																				<div
																					className={`text-sm ${
																						item
																							.artist
																							.backstage_color &&
																						item.status ===
																							"not_started" &&
																						!isLightColor(
																							item
																								.artist
																								.backstage_color,
																						)
																							? "text-white/90"
																							: "text-muted-foreground"
																					}`}
																				>
																					{
																						item
																							.artist
																							.style
																					}{" "}
																					•{" "}
																					{getDisplayDuration(
																						item.artist,
																					)}
																					{item
																						.artist
																						.performanceType && (
																						<Badge
																							variant="outline"
																							className="ml-2 text-[10px] px-1.5 py-0 border-purple-300 text-purple-700 bg-purple-50"
																						>
																							{
																								item
																									.artist
																									.performanceType
																							}
																						</Badge>
																					)}
																					{item
																						.artist
																						.quality_rating &&
																						getQualityBadge(
																							item
																								.artist
																								.quality_rating,
																						)}
																					{/* Check-in indicators */}
																					{(() => {
																						const cs =
																							getCheckInStatus(
																								item
																									.artist
																									.id,
																							);
																						return (
																							<span className="inline-flex items-center gap-1 ml-1">
																								{cs.rehearsalCheckedIn && (
																									<Badge
																										variant="outline"
																										className="text-[10px] px-1 py-0 border-green-400 text-green-600 bg-green-50"
																									>
																										<CheckCircle className="h-2.5 w-2.5 mr-0.5" />

																										R
																									</Badge>
																								)}
																								{cs.performanceCheckedIn && (
																									<Badge
																										variant="outline"
																										className="text-[10px] px-1 py-0 border-green-400 text-green-600 bg-green-50"
																									>
																										<CheckCircle className="h-2.5 w-2.5 mr-0.5" />

																										P
																									</Badge>
																								)}
																							</span>
																						);
																					})()}
																				</div>
																				{item
																					.artist
																					.cue_notes && (
																					<div
																						className={`text-xs mt-0.5 italic truncate max-w-[280px] ${
																							item
																								.artist
																								.backstage_color &&
																							item.status ===
																								"not_started" &&
																							!isLightColor(
																								item
																									.artist
																									.backstage_color,
																							)
																								? "text-white/70"
																								: "text-muted-foreground/70"
																						}`}
																						title={
																							item
																								.artist
																								.cue_notes
																						}
																					>
																						📝{" "}
																						{
																							item
																								.artist
																								.cue_notes
																						}
																					</div>
																				)}
																			</div>
																		)}
																	{item.type ===
																		"cue" &&
																		item.cue && (
																			<div className="flex items-center gap-2">
																				{(() => {
																					const IconComponent =
																						getCueIcon(
																							item
																								.cue!
																								.type,
																						);
																					const iconColor =
																						item
																							.cue
																							.color &&
																						item.status ===
																							"not_started" &&
																						!isLightColor(
																							item
																								.cue
																								.color,
																						)
																							? "text-white"
																							: "";
																					return (
																						<IconComponent
																							className={`h-4 w-4 ${iconColor}`}
																						/>
																					);
																				})()}
																				<div>
																					<div
																						className={`font-medium ${
																							item
																								.cue
																								.color &&
																							item.status ===
																								"not_started" &&
																							!isLightColor(
																								item
																									.cue
																									.color,
																							)
																								? "text-white"
																								: ""
																						}`}
																					>
																						{
																							item
																								.cue
																								.title
																						}
																					</div>
																					<div
																						className={`text-sm ${
																							item
																								.cue
																								.color &&
																							item.status ===
																								"not_started" &&
																							!isLightColor(
																								item
																									.cue
																									.color,
																							)
																								? "text-white/90"
																								: "text-muted-foreground"
																						}`}
																					>
																						{formatMinutesToMMSS(item.cue.duration || 0)}
																						{item.cue.extraTime ? ` (${formatExtraTime(item.cue.extraTime)} extra)` : ""}
																						{item
																							.cue
																							.notes && (
																							<span className="ml-2">
																								•{" "}
																								{
																									item
																										.cue
																										.notes
																								}
																							</span>
																						)}
																					</div>
																				</div>
																			</div>
																		)}
																</div>

																<div className="flex items-center gap-4 ml-auto shrink-0">
																	{/* Action Buttons Container - Left aligned but fixed width to align all rows */}
																	<div className="flex items-center gap-1.5 w-[264px] shrink-0 justify-start">
																		{item.type === "cue" && (
																			<ExtraTimePicker
																				compact
																				value={item.cue?.extraTime || 0}
																				onChange={(seconds) => updateCueExtraTime(item.cue!, seconds)}
																				className={`${btnClassBase} ${btnClass}`}
																			/>
																		)}
																		{item.type === "cue" && (
																			<Button
																				size="sm"
																				variant="outline"
																				onClick={() => editCue(item.cue!)}
																				className={`${btnClassBase} ${btnClass}`}
																			>
																				<Edit className="h-3.5 w-3.5" />
																				<span className={`text-[9px] mt-0.5 font-medium ${isDarkBG ? "text-white" : "text-gray-500"}`}>Edit</span>
																			</Button>
																		)}
																		{item.type === "artist" && (
																			<>
																				<Button
																					size="sm"
																					variant="outline"
																					onClick={() => viewArtistDetails(item.id)}
																					title="View Details"
																					className={`${btnClassBase} ${btnClass}`}
																				>
																					<Eye className="h-3.5 w-3.5" />
																					<span className={`text-[9px] mt-0.5 font-medium ${isDarkBG ? "text-white" : "text-gray-500"}`}>View</span>
																				</Button>
																				<Button
																					size="sm"
																					variant="outline"
																					onClick={() => openEditArtistCue(item.id)}
																					title="Edit Artist Cue"
																					className={`${btnClassBase} ${btnClass}`}
																				>
																					<Edit className="h-3.5 w-3.5" />
																					<span className={`text-[9px] mt-0.5 font-medium ${isDarkBG ? "text-white" : "text-gray-500"}`}>Edit</span>
																				</Button>
																				<CallArtistButton
																					eventId={eventId}
																					artistId={item.artist!.id}
																					artistName={item.artist!.artist_name}
																					callType="performance"
																					showLabel={true}
																					size="sm"
																					variant="outline"
																					className={`${btnClassBase} ${isDarkBG ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : "bg-white border-gray-200 hover:bg-orange-50 text-orange-500"}`}
																				/>
																				<Button
																					size="sm"
																					variant="outline"
																					className={`${btnClassBase} ${isDarkBG ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : "bg-white border-gray-200 text-blue-500 hover:bg-blue-50"}`}
																					onClick={() => setCheckInDialogArtist(item.artist!)}
																					title={`Check in ${item.artist!.artist_name}`}
																				>
																					<FileText className="h-3.5 w-3.5" />
																					<span className={`text-[9px] mt-0.5 font-medium ${isDarkBG ? "text-white" : "text-gray-500"}`}>File</span>
																				</Button>
																			</>
																		)}
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => removeFromShowOrder(item.id, item.type)}
																			className={`${btnClassBase} ${removeBtnClass}`}
																		>
																			<X className="h-3.5 w-3.5 text-red-500" />
																			<span className={`text-[9px] mt-0.5 font-medium ${isDarkBG ? "text-white" : "text-red-500"}`}>Remove</span>
																		</Button>
																	</div>

																	{/* Status Select Container - Fixed width */}
																	<div className="w-[140px] shrink-0">
																		<Select
																			value={item.status || "not_started"}
																			onValueChange={(value) =>
																				updateItemStatus(
																					item.id,
																					value as ShowOrderItem["status"],
																				)
																			}
																			disabled={
																				item.type === "artist" &&
																				item.artist &&
																				!item.artist.rehearsal_completed
																			}
																		>
																			<SelectTrigger
																				className={`w-[140px] h-8 border-gray-300 text-xs sm:text-sm ${
																					(item.type === "cue" &&
																						item.cue?.color &&
																						item.status === "not_started" &&
																						!isLightColor(item.cue.color)) ||
																					(item.type === "artist" &&
																						item.artist?.backstage_color &&
																						item.status === "not_started" &&
																						!isLightColor(item.artist.backstage_color))
																						? "bg-white/20 text-white border-white/30 hover:bg-white/30"
																						: "bg-white text-gray-900"
																				} ${
																					item.type === "artist" &&
																					item.artist &&
																					!item.artist.rehearsal_completed
																						? "opacity-50 cursor-not-allowed"
																						: ""
																				}`}
																			>
																				<SelectValue />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value="completed">Completed</SelectItem>
																				<SelectItem value="currently_on_stage">Currently on Stage</SelectItem>
																				<SelectItem value="next_on_deck">Next on Deck</SelectItem>
																				<SelectItem value="not_started">Back Stage</SelectItem>
																			</SelectContent>
																		</Select>
																	</div>
																</div>
															</div>
															{item.type ===
																"artist" &&
																item.artist && (
																	<Badge
																		className={`text-xs px-3 py-1 font-semibold cursor-default ${
																			item
																				.artist
																				.rehearsal_completed
																				? "bg-green-500 text-white hover:bg-green-500"
																				: "bg-yellow-500 text-white hover:bg-yellow-500"
																		}`}
																	>
																		{item
																			.artist
																			.rehearsal_completed
																			? "Rehearsal Completed"
																			: "Rehearsal Not Completed"}
																	</Badge>
																)}
														</div>
													);
												},
											)}
											{showOrderItems.length === 0 && (
												<div className="text-center py-8 text-muted-foreground">
													No items in show order yet.
													Add artists or cues to get
													started.
												</div>
											)}
										</div>
							</CardContent>
						</Card>
						</div>
					</div>
				</>
				) : (() => {
				const currentIdx = showOrderItems.findIndex((i) => i.status === "currently_on_stage");
				const currentItem = currentIdx !== -1 ? showOrderItems[currentIdx] : null;
				
				// Calculate upcoming items (up to 3)
				const upcomingItems = showOrderItems
					.map((item, idx) => ({ item, idx }))
					.filter(({ idx }) => idx > currentIdx)
					.slice(0, 3);

				const prevItem = currentIdx > 0 ? showOrderItems[currentIdx - 1] : null;
				const currentTiming = currentIdx !== -1 ? liveTimings[currentIdx] : null;

				const getName = (item: ShowOrderItem) => item.type === "artist" ? (item.artist?.artist_name ?? "") : (item.cue?.title ?? "");
				// Duration in seconds, including a cue's extra/buffer time on top of its base duration
				const getDurSeconds = (item: ShowOrderItem) => item.type === "artist"
					? (item.artist?.performance_duration ?? 0) * 60
					: (item.cue?.duration ?? 0) * 60 + (item.cue?.extraTime ?? 0);

				// Format elapsed time (HH:MM:SS)
				const formatElapsed = (totalSecs: number) => {
					const hrs = Math.floor(totalSecs / 3600);
					const mins = Math.floor((totalSecs % 3600) / 60);
					const secs = totalSecs % 60;
					return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
				};

				// Calculate duration in seconds
				const activeDurationSecs = currentItem ? getDurSeconds(currentItem) : 0;
				const remainingSecs = Math.max(0, activeDurationSecs - elapsedSeconds);

				// Format remaining time (HH:MM:SS)
				const formatRemaining = (totalSecs: number) => {
					const hrs = Math.floor(totalSecs / 3600);
					const mins = Math.floor((totalSecs % 3600) / 60);
					const secs = totalSecs % 60;
					return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
				};

				// Toggle fullscreen function
				const handleToggleFullscreen = () => {
					const el = document.getElementById("show-caller-dashboard-container");
					if (!el) return;
					if (!document.fullscreenElement) {
						el.requestFullscreen().catch((err) => {
							console.error("Error going fullscreen:", err);
						});
					} else {
						document.exitFullscreen();
					}
				};

				return (
					<div 
						id="show-caller-dashboard-container"
						className={`flex flex-col overflow-hidden bg-white select-none ${
							isFullscreen 
								? "fixed inset-0 w-screen h-screen z-[99999] p-4 bg-white" 
								: "h-[calc(100vh-220px)] min-h-[600px] rounded-xl border border-gray-200 shadow-xl"
						}`}
					>
						{/* TOP BAR / TITLE IN FULLSCREEN */}
						{isFullscreen && (
							<div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-2">
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold text-gray-800">Performance Order</h1>
									<span className="flex items-center gap-1.5 text-xs text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
										<span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
										Real-time
									</span>
								</div>
								<Button variant="outline" size="sm" onClick={handleToggleFullscreen}>
									Exit Fullscreen
								</Button>
							</div>
						)}

						<div className="flex flex-1 overflow-hidden min-h-0 w-full">
							{/* LEFT SIDEBAR: Running Order */}
							<div className="w-[300px] shrink-0 border-r border-gray-200 flex flex-col bg-[#f8fafc]">
								<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
									<span className="text-xs font-black text-slate-500 uppercase tracking-widest">
										Running Order ({showOrderItems.length})
									</span>
									<button 
										onClick={() => updateItemStatus("", "not_started" as ShowOrderItem["status"])} 
										className="text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="flex-1 overflow-y-auto bg-white">
									{showOrderItems.map((item, idx) => {
										const isLive = item.status === "currently_on_stage";
										const isDone = item.status === "completed";
										
										// Timing calculations
										const plannedStart = liveTimings[idx]?.startTime || "--:--";

										// Formatted duration helper matching the screenshot specs:
										const getFormattedDuration = (it: ShowOrderItem) => {
											if (it.type === "cue") {
												const cueSec = (it.cue?.duration ?? 0) * 60 + (it.cue?.extraTime ?? 0);
												const m = Math.floor(cueSec / 60);
												const s = cueSec % 60;
												return `${m}:${String(s).padStart(2, "0")}`;
											} else {
												const durSec = it.artist?.actual_duration
													? it.artist.actual_duration
													: (it.artist?.performance_duration ?? 0) * 60;
												const m = Math.floor(durSec / 60);
												const s = durSec % 60;
												return `${m}:${String(s).padStart(2, "0")}`;
											}
										};

										return (
											<div
												key={item.id}
												onClick={async () => { await transitionToItem(idx); }}
												className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all cursor-pointer border-b border-slate-100 last:border-b-0 ${
													isLive 
														? "bg-pink-50" 
														: "bg-white hover:bg-slate-50"
												}`}
											>
												{/* Drag Handle (GripVertical) */}
												<div className="text-slate-400 cursor-grab shrink-0">
													<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
														<circle cx="2" cy="2" r="1.2" />
														<circle cx="2" cy="7" r="1.2" />
														<circle cx="2" cy="12" r="1.2" />
														<circle cx="6" cy="2" r="1.2" />
														<circle cx="6" cy="7" r="1.2" />
														<circle cx="6" cy="12" r="1.2" />
													</svg>
												</div>

												{/* Rounded Index Badge */}
												<div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 select-none ${
													isLive 
														? "bg-[#d946ef] text-white" 
														: "bg-slate-100 text-slate-800"
												}`}>
													{String(idx + 1).padStart(2, "0")}
												</div>

												{/* Details */}
												<div className="min-w-0 flex-1 flex flex-col justify-center">
													{/* Done/Live Badge Above Title */}
													{isDone && (
														<div className="flex mb-0.5">
															<span className="text-[8.5px] font-black tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase leading-none">
																DONE
															</span>
														</div>
													)}
													{isLive && (
														<div className="flex mb-0.5">
															<span className="text-[8.5px] font-black tracking-wider text-white bg-pink-500 px-1.5 py-0.5 rounded uppercase leading-none">
																LIVE
															</span>
														</div>
													)}

													{/* Title/Name */}
													<div className={`text-[12px] font-extrabold tracking-wide truncate leading-tight ${
														item.type === "artist" 
															? "text-[#d946ef]" 
															: "text-slate-800 uppercase"
													}`}>
														{getName(item)}
													</div>

													{/* Timing Details */}
													<div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center leading-none">
														{plannedStart} <span className="mx-1 text-slate-300">·</span> {getFormattedDuration(item)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* CENTER MAIN AREA */}
							<div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
								{/* Controls Bar */}
								<div className="shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap bg-white">
									<div className="flex items-center gap-2 flex-wrap">
										{/* Announcement */}
										<Button 
											variant="outline" 
											size="sm" 
											className="gap-2 text-xs font-black bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white px-3.5" 
											onClick={() => { toast({ title: "Announcement", description: "Broadcast feature coming soon." }); }}
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
												<path d="M13.73 21a2 2 0 0 1-3.46 0" />
											</svg>
											Announcement
										</Button>

										{/* Prev */}
										<Button 
											variant="outline" 
											size="sm" 
											className="gap-1.5 text-xs font-extrabold border-gray-200 hover:bg-slate-50" 
											onClick={async () => { if (currentIdx > 0) await transitionToItem(currentIdx - 1, false); }} 
											disabled={currentIdx <= 0}
										>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<polygon points="19 20 9 12 19 4 19 20" />
												<line x1="5" y1="19" x2="5" y2="5" />
											</svg>
											Prev
										</Button>

										{/* Start / Pause */}
										<Button
											size="sm"
											className={`gap-1.5 text-xs font-black px-5 text-white transition-all ${
												currentItem 
													? timerIsRunning 
														? "bg-[#d946ef] hover:bg-[#c084fc]" 
														: "bg-green-600 hover:bg-green-700"
													: "bg-[#d946ef] hover:bg-[#c084fc]"
											}`}
											onClick={async () => {
												if (currentItem) {
													setTimerIsRunning(!timerIsRunning);
												} else if (showOrderItems.length > 0) {
													await transitionToItem(0, true);
												}
											}}
										>
											{currentItem ? (
												timerIsRunning ? (
													<>
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
															<rect x="6" y="4" width="4" height="16" />
															<rect x="14" y="4" width="4" height="16" />
														</svg>
														Pause
													</>
												) : (
													<>
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
															<polygon points="5 3 19 12 5 21 5 3" />
														</svg>
														Start
													</>
												)
											) : (
												<>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
														<polygon points="5 3 19 12 5 21 5 3" />
													</svg>
													Start
												</>
											)}
										</Button>

										{/* Next */}
										<Button 
											variant="outline" 
											size="sm" 
											className="gap-1.5 text-xs font-extrabold border-gray-200 hover:bg-slate-50" 
											onClick={async () => { 
												if (currentIdx !== -1 && currentIdx < showOrderItems.length - 1) {
													await transitionToItem(currentIdx + 1, false);
												} else if (currentIdx === -1 && showOrderItems.length > 0) {
													await transitionToItem(0, false);
												}
											}}
											disabled={currentIdx !== -1 && currentIdx >= showOrderItems.length - 1}
										>
											Next
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<polygon points="5 4 15 12 5 20 5 4" />
												<line x1="19" y1="5" x2="19" y2="19" />
											</svg>
										</Button>
										{/* Reset */}
										<Button 
											variant="outline" 
											size="sm" 
											className="gap-1.5 text-xs font-semibold border-gray-200 hover:bg-slate-50" 
											onClick={resetAllStatuses}
										>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
												<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
												<path d="M3 3v5h5" />
											</svg>
											Reset
										</Button>
									</div>

									<div className="flex items-center gap-3">
										{/* Share */}
										<Button 
											variant="outline" 
											size="sm" 
											className="text-xs border-gray-200 gap-1.5 hover:bg-slate-50 font-bold" 
											onClick={() => { if (typeof window !== "undefined") navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!", variant: "success" }); }}
										>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
												<polyline points="16 6 12 2 8 6" />
												<line x1="12" y1="2" x2="12" y2="15" />
											</svg>
											Share
										</Button>

										{/* Auto-advance Switch */}
										<div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
											<Switch
												id="auto-advance-toggle"
												checked={autoAdvance}
												onCheckedChange={setAutoAdvance}
												className="scale-90 data-[state=checked]:bg-[#d946ef]"
											/>
											<Label htmlFor="auto-advance-toggle" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider cursor-pointer">
												Auto-advance
											</Label>
										</div>

										{/* Zoom Controls */}
										<div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-0.5 rounded-full shrink-0">
											<button 
												onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
												className="p-1 hover:bg-white text-slate-500 hover:text-slate-800 rounded-full transition-colors"
												title="Zoom Out"
											>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
													<line x1="5" y1="12" x2="19" y2="12" />
												</svg>
											</button>
											<span className="text-[10px] font-bold text-slate-600 px-1 select-none min-w-[32px] text-center">
												{zoomLevel}%
											</span>
											<button 
												onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
												className="p-1 hover:bg-white text-slate-500 hover:text-slate-800 rounded-full transition-colors"
												title="Zoom In"
											>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
													<line x1="12" y1="5" x2="12" y2="19" />
													<line x1="5" y1="12" x2="19" y2="12" />
												</svg>
											</button>
										</div>
										{/* Fullscreen Button */}
										<Button 
											variant="outline" 
											size="sm" 
											className="text-xs border-gray-200 gap-1.5 hover:bg-slate-50 font-bold"
											onClick={handleToggleFullscreen}
										>
											{isFullscreen ? (
												<>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
														<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
													</svg>
													Exit Full Screen
												</>
											) : (
												<>
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
														<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3M10 21V10H21" />
													</svg>
													Full Screen
												</>
											)}
										</Button>
									</div>
								</div>

								{/* CUE CARD AREA */}
								<div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-6 min-h-0">
									<div 
										className="w-full max-w-3xl transition-all duration-200"
										style={{ zoom: zoomLevel / 100 }}
									>
										{currentItem ? (
											<div className="space-y-6">
												{/* Main Large Display Card */}
												<div className="rounded-[28px] border-2 border-[#d946ef] bg-white shadow-[0_0_35px_rgba(217,70,239,0.18)] overflow-hidden transition-all duration-300">
													<div className="p-8 pb-10 text-center flex flex-col items-center">
														{/* CUE XX Header */}
														<div className="text-[#d946ef] text-[68px] font-extrabold leading-none tracking-widest mb-3">
															CUE {String(currentIdx + 1).padStart(2, "0")}
														</div>
														
														{/* Cue Name */}
														<div className="flex items-center justify-center gap-2 text-md font-black uppercase mb-1">
															<span className="text-[#d946ef] font-black">{String(currentIdx + 1).padStart(2, "0")}</span>
															<span className="text-slate-800">{getName(currentItem)}</span>
														</div>

														{/* Location/Details */}
														{(currentItem.artist?.notes || currentItem.cue?.notes) && (
															<p className="text-slate-400 text-xs font-semibold mb-2">
																{currentItem.artist?.notes || currentItem.cue?.notes}
															</p>
														)}
														
														{/* Time Details */}
														<p className="text-slate-400 text-[10px] font-bold tracking-wider mb-6">
															{currentTiming ? `${currentTiming.startTime} → ${currentTiming.endTime}` : "--:-- → --:--"}
															<span className="mx-1.5 text-slate-300">·</span>
															{formatMinutesToMMSS(activeDurationSecs / 60)}
														</p>
														
														{/* Double Column Department Notes Panel */}
														<div className="w-full max-w-2xl bg-[#f8fafc] border border-slate-200/80 rounded-[16px] p-5 text-left">
															{(() => {
																const dn = currentItem.type === "artist" ? currentItem.artist?.rehearsal_dept_notes : currentItem.cue?.rehearsal_dept_notes;
																const fields = [
																	{ key: "sound", label: "Sound" },
																	{ key: "light", label: "Light" },
																	{ key: "backstage", label: "Backstage" },
																	{ key: "notes", label: "Notes" },
																];

																return (
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
																		{fields.map((f) => {
																			const val = dn?.[f.key as keyof typeof dn] || "All departments clear";
																			return (
																				<div key={f.key} className="text-xs leading-relaxed">
																					<span className="font-extrabold text-[#d946ef] mr-1.5 uppercase tracking-wide">
																						{f.label}:
																					</span>
																					<span className="font-bold text-slate-700">
																						{val}
																					</span>
																				</div>
																			);
																		})}
																	</div>
																);
															})()}
														</div>
													</div>
												</div>

												{/* Vertical Stack: UP NEXT */}
												{upcomingItems.length > 0 && (
													<div className="space-y-6 pt-2">
														{upcomingItems.map(({ item: nextIt, idx: nextIdx }) => (
															<div key={nextIt.id} className="flex flex-col items-center gap-2">
																<div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
																	UP NEXT
																</div>
																<div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
																	<div className="text-[#d946ef] text-xs font-black uppercase tracking-wider mb-1">
																		CUE {String(nextIdx + 1).padStart(2, "0")}
																	</div>
																	<div className="text-sm font-extrabold text-slate-800 uppercase tracking-tight mb-1">
																		{getName(nextIt).toUpperCase()}
																	</div>
																	<div className="text-xs text-slate-400 font-semibold">
																		{liveTimings[nextIdx]?.startTime || "--:--"} · {formatMinutesToMMSS(getDurSeconds(nextIt) / 60)}
																	</div>
																</div>
															</div>
														))}
													</div>
												)}
											</div>
										) : (
											<div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20 bg-white rounded-[24px] border border-dashed border-gray-200 p-8 shadow-sm">
												<div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center">
													<Play className="h-10 w-10 text-pink-400" />
												</div>
												<h3 className="text-2xl font-extrabold text-slate-700">Stage is clear</h3>
												<p className="text-sm text-slate-400 max-w-sm">Click Start or select a cue from the Running Order sidebar to go live.</p>
												{showOrderItems.length > 0 && (
													<Button 
														onClick={async () => { 
															await transitionToItem(0);
														}} 
														className="bg-[#d946ef] hover:bg-[#c084fc] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg"
													>
														Start Show
													</Button>
												)}
											</div>
										)}
									</div>
								</div>

								{/* SEGMENTED TIMELINE PROGRESS BAR */}
								<div className="w-full h-1.5 flex overflow-hidden bg-slate-100 shrink-0">
									{(() => {
										const totalShowSeconds = showOrderItems.reduce((acc, item) => {
											const durSec = item.type === "artist"
												? (item.artist?.performance_duration ?? 0) * 60
												: (item.cue?.duration ?? 0) * 60 + (item.cue?.extraTime ?? 0);
											return acc + durSec;
										}, 0);

										if (totalShowSeconds === 0) return null;

										return showOrderItems.map((item, idx) => {
											const isLive = item.status === "currently_on_stage";
											const isDone = item.status === "completed";
											const itemSeconds = item.type === "artist"
												? (item.artist?.performance_duration ?? 0) * 60
												: (item.cue?.duration ?? 0) * 60 + (item.cue?.extraTime ?? 0);

											if (isDone) {
												const pct = (itemSeconds / totalShowSeconds) * 100;
												return (
													<div 
														key={item.id} 
														className="h-full bg-teal-400 transition-all duration-300" 
														style={{ width: `${pct}%` }} 
													/>
												);
											} else if (isLive) {
												const elapsed = Math.min(itemSeconds, elapsedSeconds);
												const remaining = Math.max(0, itemSeconds - elapsed);
												const elapsedPct = (elapsed / totalShowSeconds) * 100;
												const remainingPct = (remaining / totalShowSeconds) * 100;

												return (
													<React.Fragment key={item.id}>
														{elapsedPct > 0 && (
															<div 
																className="h-full bg-teal-400 transition-all duration-300" 
																style={{ width: `${elapsedPct}%` }} 
															/>
														)}
														{remainingPct > 0 && (
															<div 
																className="h-full bg-yellow-300 transition-all duration-300" 
																style={{ width: `${remainingPct}%` }} 
															/>
														)}
													</React.Fragment>
												);
											} else {
												const pct = (itemSeconds / totalShowSeconds) * 100;
												return (
													<div 
														key={item.id} 
														className="h-full bg-pink-200 transition-all duration-300" 
														style={{ width: `${pct}%` }} 
													/>
												);
											}
										});
									})()}
								</div>

								{/* BOTTOM TIMER BAR */}
								<div className="shrink-0 border-t border-slate-200 bg-white text-slate-800 px-6 py-4 flex items-center justify-between gap-4 select-none relative z-10">
									{/* Info Labels */}
									<div className="flex items-center gap-x-4 text-[9.5px] font-semibold text-slate-500 shrink-0 whitespace-nowrap">
										<div>
											Elapsed <span className="text-slate-800 font-extrabold ml-0.5">{formatElapsed(elapsedSeconds)}</span>
										</div>
										<div className="flex items-center">
											<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500 mr-1">
												<circle cx="12" cy="12" r="10" />
												<polyline points="12 6 12 12 16 14" />
											</svg>
											Show <span className="text-slate-800 font-extrabold ml-0.5">{eventTimings.show_start_time || "--:--"}</span>
										</div>
										<div>
											Cue <span className="text-slate-800 font-extrabold ml-0.5">{currentIdx !== -1 ? `${currentIdx + 1}/${showOrderItems.length}` : `1/${showOrderItems.length}`}</span>
										</div>
										<div>
											Total <span className="text-slate-800 font-extrabold ml-0.5">
												{(() => {
													const totSec = calculateTotalShowTime(showOrderItems);
													const m = Math.floor(totSec / 60);
													const s = totSec % 60;
													return `${m}m ${s}s`;
												})()}
											</span>
										</div>
									</div>

									{/* Large Countdown Timer */}
									<div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center shrink-0">
										<span className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-0.5 select-none">
											REMAINING
										</span>
										<div className="text-[36px] font-black tracking-widest text-[#facc15] font-mono leading-none">
											{formatRemaining(remainingSecs)}
										</div>
									</div>

									{/* Right details / Hotkey Indicators */}
									<div className="flex items-center gap-2 shrink-0 select-none">
										{/* Keyboard Icon */}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
											<rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
											<line x1="6" y1="8" x2="6.01" y2="8" />
											<line x1="10" y1="8" x2="10.01" y2="8" />
											<line x1="14" y1="8" x2="14.01" y2="8" />
											<line x1="18" y1="8" x2="18.01" y2="8" />
											<line x1="6" y1="12" x2="6.01" y2="12" />
											<line x1="10" y1="12" x2="10.01" y2="12" />
											<line x1="14" y1="12" x2="14.01" y2="12" />
											<line x1="18" y1="12" x2="18.01" y2="12" />
											<line x1="7" y1="16" x2="17" y2="16" />
										</svg>
										
										{/* Left-Right Arrow Badge */}
										<div className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 font-sans flex items-center h-5">
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500">
												<path d="M19 12H5M5 12l5-5M5 12l5 5M19 12l-5-5M19 12l-5 5" />
											</svg>
										</div>

										{/* Space Badge */}
										<div className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 font-sans h-5 flex items-center justify-center">
											Space
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			})()}

				{/* Timing Settings Dialog */}
				<Dialog
					open={showTimingSettings}
					onOpenChange={setShowTimingSettings}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Event Timing Settings</DialogTitle>
							<DialogDescription>
								Set the backstage ready time and show start time
								for{" "}
								{selectedPerformanceDate
									? new Date(
											selectedPerformanceDate +
												"T00:00:00",
										).toLocaleDateString()
									: "this day"}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="backstage-ready">
									Backstage Ready Time
								</Label>
								<Input
									id="backstage-ready"
									type="time"
									value={editForm.backstage_ready_time}
									onChange={(e) =>
										setEditForm({
											...editForm,
											backstage_ready_time:
												e.target.value,
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="show-start">
									Show Start Time
								</Label>
								<Input
									id="show-start"
									type="time"
									value={editForm.show_start_time}
									onChange={(e) =>
										setEditForm({
											...editForm,
											show_start_time: e.target.value,
										})
									}
								/>
							</div>
						</div>
						<div className="flex gap-2 pt-4">
							<Button
								onClick={() =>
									saveEventTimings({
										backstage_ready_time:
											editForm.backstage_ready_time,
										show_start_time:
											editForm.show_start_time,
									})
								}
								className="flex-1"
							>
								Save Timing Settings
							</Button>
							<Button
								variant="outline"
								onClick={() => setShowTimingSettings(false)}
							>
								Cancel
							</Button>
						</div>
					</DialogContent>
				</Dialog>



				{/* Add Cue Dialog */}
				<Dialog
					open={isAddCueDialogOpen}
					onOpenChange={(open) => {
						setIsAddCueDialogOpen(open);
						if (!open) setAddCueType(null);
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Cue</DialogTitle>
							<DialogDescription>
								Configure cue details, color, and timing before
								adding
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="add-cue-title">Title</Label>
								<Input
									id="add-cue-title"
									value={addCueForm.title}
									onChange={(e) =>
										setAddCueForm({
											...addCueForm,
											title: e.target.value,
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="add-cue-duration">
										Duration (mm:ss)
									</Label>
									<ExtraTimePicker
										value={addCueForm.extraTime}
										onChange={(seconds) =>
											setAddCueForm({
												...addCueForm,
												extraTime: seconds,
											})
										}
									/>
								</div>
								<MMSSInput
									id="add-cue-duration"
									minutes={addCueForm.duration}
									onChange={(mins) =>
										setAddCueForm({
											...addCueForm,
											duration: mins,
										})
									}
								/>
							</div>
							{/* Cue Color Picker */}
							<CueColorPicker
								label="Cue Color"
								value={addCueForm.color}
								onChange={(color) =>
									setAddCueForm({
										...addCueForm,
										color: color,
									})
								}
							/>
							<div className="space-y-2">
								<Label htmlFor="add-cue-notes">Notes</Label>
								<Textarea
									id="add-cue-notes"
									value={addCueForm.notes}
									onChange={(e) =>
										setAddCueForm({
											...addCueForm,
											notes: e.target.value,
										})
									}
									placeholder="Additional notes for this cue"
								/>
							</div>
						</div>
						<div className="flex gap-2 pt-4">
							<Button onClick={addCue} className="flex-1">
								Add Cue
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setIsAddCueDialogOpen(false);
									setAddCueType(null);
								}}
							>
								Cancel
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				{/* Artist Detail Dialog */}
				<Dialog
					open={isDetailDialogOpen}
					onOpenChange={setIsDetailDialogOpen}
				>
					<DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl">
						<DialogHeader>
							<DialogTitle>
								Artist Details -{" "}
								{selectedArtist?.artistName ||
									selectedArtist?.artist_name}
							</DialogTitle>
							<DialogDescription>
								Complete artist information, media files, and
								technical requirements
							</DialogDescription>
						</DialogHeader>

						{selectedArtist && (
							<Tabs defaultValue="overview" className="w-full">
								<TabsList className="flex items-center justify-start gap-1 overflow-x-auto w-full bg-muted p-1 rounded-lg scrollbar-none">
									<TabsTrigger value="overview">
										Overview
									</TabsTrigger>
									<TabsTrigger value="music">
										Music
									</TabsTrigger>
									<TabsTrigger value="technical">
										Technical
									</TabsTrigger>
									<TabsTrigger value="gallery">
										Gallery
									</TabsTrigger>
									<TabsTrigger value="event">
										Event Details
									</TabsTrigger>
								</TabsList>

								{/* Overview Tab */}
								<TabsContent
									value="overview"
									className="space-y-6"
								>
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
										{/* Basic Information */}
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<User className="h-5 w-5" />
													Basic Information
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4">
												{/* Profile Image */}
												<div className="flex justify-center mb-4 relative">
													{selectedArtist.image_url ? (
														<FullScreenImageViewer
															src={`/api/media/${selectedArtist.image_url}`}
															alt={
																selectedArtist.artistName ||
																selectedArtist.artist_name
															}
														>
															<div className="relative cursor-pointer w-24 h-24">
																<img
																	src={`/api/media/${selectedArtist.image_url}`}
																	alt={
																		selectedArtist.artistName ||
																		selectedArtist.artist_name
																	}
																	className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-lg"
																	onError={(e) => {
																		e.currentTarget.style.display = "none";
																		const fb = e.currentTarget.parentElement?.parentElement?.querySelector(".image-fallback");
																		if (fb) fb.classList.remove("hidden");
																	}}
																/>
															</div>
														</FullScreenImageViewer>
													) : null}
													<div className={`image-fallback ${selectedArtist.image_url ? "hidden" : ""} w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg`}>
														<User className="h-12 w-12 text-purple-400" />
													</div>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Artist ID
													</p>
													<p className="font-medium text-xs text-gray-600">
														{selectedArtist.id}
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Artist Name
													</p>
													<p className="font-medium">
														{selectedArtist.artistName ||
															selectedArtist.artist_name}
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Real Name
													</p>
													<p className="font-medium">
														{selectedArtist.realName ||
															selectedArtist.real_name}
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground flex items-center gap-2">
														<Mail className="h-4 w-4 text-blue-600" />
														Email
													</p>
													<EmailLink
														email={
															selectedArtist.email
														}
														className="text-sm"
													/>
												</div>
												<div>
													<p className="text-sm text-muted-foreground flex items-center gap-2">
														<WhatsAppIcon className="h-4 w-4 text-green-600" />
														WhatsApp Number
													</p>
													<WhatsAppLink
														phoneNumber={
															selectedArtist.phone
														}
														className="text-sm"
													/>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Performance Style
													</p>
													<p className="font-medium">
														{selectedArtist.style}
													</p>
												</div>
												{selectedArtist.performanceType && (
													<div>
														<p className="text-sm text-muted-foreground">
															Performance Type
														</p>
														<p className="font-medium">
															{
																selectedArtist.performanceType
															}
														</p>
													</div>
												)}
												<div>
													<p className="text-sm text-muted-foreground">
														Duration
													</p>
													<p className="font-medium">
														{selectedArtist
															.musicTrack
															?.duration
															? formatDuration(
																	selectedArtist
																		.musicTrack
																		.duration,
																)
															: selectedArtist.musicTracks?.find(
																		(
																			t: any,
																		) =>
																			t.is_main_track,
																  )?.duration
																? formatDuration(
																		selectedArtist.musicTracks.find(
																			(
																				t: any,
																			) =>
																				t.is_main_track,
																		)
																			.duration,
																	)
																: selectedArtist.performanceDuration ||
																	  selectedArtist.performance_duration
																	? `${
																			selectedArtist.performanceDuration ||
																			selectedArtist.performance_duration
																		} minutes`
																	: "N/A"}
													</p>
												</div>
												{/* Nationality Information */}
												{(selectedArtist.countryLiving ||
													selectedArtist.homeCountry ||
													(selectedArtist.members &&
														selectedArtist.members
															.length > 0)) && (
													<div className="border-t pt-4 mt-4">
														<p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
															<Globe className="h-4 w-4" />
															Nationality
															Information
														</p>
														{selectedArtist.members &&
														selectedArtist.members
															.length > 0 ? (
															<div className="space-y-2">
																{selectedArtist.members.map(
																	(
																		member: any,
																		index: number,
																	) => (
																		<div
																			key={
																				index
																			}
																			className="flex flex-wrap items-center gap-2 text-sm bg-blue-50 p-2 rounded"
																		>
																			<span className="font-medium">
																				{
																					member.name
																				}

																				:
																			</span>
																			{member.countryLiving && (
																				<span className="flex items-center gap-1">
																					{getCountryFlag(
																						member.countryLiving,
																					)}{" "}
																					Living
																					in{" "}
																					{getCountryName(
																						member.countryLiving,
																					)}
																				</span>
																			)}
																			{member.homeCountry && (
																				<span className="flex items-center gap-1 text-gray-600">
																					|{" "}
																					{getCountryFlag(
																						member.homeCountry,
																					)}{" "}
																					From{" "}
																					{getCountryName(
																						member.homeCountry,
																					)}
																				</span>
																			)}
																		</div>
																	),
																)}
															</div>
														) : (
															<div className="flex flex-wrap items-center gap-3 text-sm">
																{selectedArtist.countryLiving && (
																	<span className="flex items-center gap-1">
																		{getCountryFlag(
																			selectedArtist.countryLiving,
																		)}{" "}
																		Living
																		in{" "}
																		{getCountryName(
																			selectedArtist.countryLiving,
																		)}
																	</span>
																)}
																{selectedArtist.homeCountry && (
																	<span className="flex items-center gap-1 text-gray-600">
																		|{" "}
																		{getCountryFlag(
																			selectedArtist.homeCountry,
																		)}{" "}
																		From{" "}
																		{getCountryName(
																			selectedArtist.homeCountry,
																		)}
																	</span>
																)}
															</div>
														)}
													</div>
												)}

												{/* T-Shirt Sizes */}
												{selectedArtist.tshirtSizes &&
													selectedArtist.tshirtSizes
														.length > 0 && (
														<div className="border-t pt-4 mt-4">
															<p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
																<User className="h-4 w-4" />
																T-Shirt Sizes
															</p>
															<div className="space-y-2">
																{selectedArtist.tshirtSizes.map(
																	(
																		tshirt: any,
																		index: number,
																	) => (
																		<div
																			key={
																				index
																			}
																			className="flex flex-wrap items-center gap-2 text-sm bg-green-50 p-2 rounded border border-green-100"
																		>
																			<span className="font-medium text-green-700">
																				{
																					tshirt.name
																				}

																				:
																			</span>
																			<span className="text-gray-700">
																				Size{" "}
																				{
																					tshirt.size
																				}
																			</span>
																			<span className="text-gray-500">
																				(
																				{tshirt.fit ===
																				"oversized"
																					? "Oversized"
																					: "Regular"}{" "}
																				Fit)
																			</span>
																		</div>
																	),
																)}
															</div>
														</div>
													)}
											</CardContent>
										</Card>

										{/* QR Code for Artist Dashboard */}
										{/* QR Code for Artist Dashboard */}
										{(() => {
											const isFameLink = !!(selectedArtist.isFameLinkSubmission || selectedArtist.isFameLinkArtist || selectedArtist.id?.startsWith("artist-"));
											const targetUrl = isFameLink
												? `/famelink/${selectedArtist.id}`
												: `/artist-dashboard/${selectedArtist.id}`;
											const dashboardUrl = `${getBaseUrl()}/api/auth/artist/qr-login?artistId=${selectedArtist.id}&redirect=${encodeURIComponent(targetUrl)}`;
											return (
												<Card>
													<CardHeader>
														<CardTitle className="flex items-center gap-2">
															<Package className="h-5 w-5" />
															Artist Dashboard QR Code
														</CardTitle>
														<CardDescription>
															Scan to access artist
															dashboard
														</CardDescription>
													</CardHeader>
													<CardContent className="space-y-4">
														<div
															data-qr-performance
															className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-300"
														>
															<QRCodeSVG
																value={dashboardUrl}
																size={160}
																level="H"
																includeMargin={true}
															/>
															<p className="text-xs text-muted-foreground mt-3 text-center">
																Scan this QR code to
																access the artist
																dashboard
															</p>
														</div>
														<div className="flex flex-col gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	const canvas =
																		document.createElement(
																			"canvas",
																		);
																	const qrContainer =
																		document.querySelector(
																			"[data-qr-performance]",
																		);
																	const qrElement =
																		qrContainer?.querySelector(
																			"svg",
																		) as SVGElement;
																	if (qrElement) {
																		const serializer =
																			new window.XMLSerializer();
																		const svgData =
																			serializer.serializeToString(
																				qrElement,
																			);
																		const img =
																			new window.Image();
																		img.onload =
																			() => {
																				canvas.width = 200;
																				canvas.height = 200;
																				const ctx =
																					canvas.getContext(
																						"2d",
																					);
																				if (
																					ctx
																				) {
																					ctx.fillStyle =
																						"white";
																					ctx.fillRect(
																						0,
																						0,
																						canvas.width,
																						canvas.height,
																					);
																					ctx.drawImage(
																						img,
																						0,
																						0,
																					);
																					const link =
																						document.createElement(
																							"a",
																						);
																					link.download = `${selectedArtist.artistName || selectedArtist.artist_name}-qr-code.png`;
																					link.href =
																						canvas.toDataURL(
																							"image/png",
																						);
																					link.click();
																					toast(
																						{
																							title: "✅ QR Code Downloaded",
																							description:
																								"QR code has been saved to your downloads",
																							variant:
																								"success",
																						},
																					);
																				}
																			};
																		img.src =
																			"data:image/svg+xml;base64," +
																			btoa(
																				unescape(
																					encodeURIComponent(
																						svgData,
																					),
																				),
																			);
																	}
																}}
																className="w-full"
															>
																<Download className="h-4 w-4 mr-2" />
																Download QR Code
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={async () => {
																	try {
																		await navigator.clipboard.writeText(
																			dashboardUrl,
																		);
																		toast({
																			title: "✅ Link Copied",
																			description:
																				"Dashboard link copied to clipboard",
																			variant:
																				"success",
																		});
																	} catch (err) {
																		toast({
																			title: "❌ Copy Failed",
																			description:
																				"Failed to copy link to clipboard",
																			variant:
																				"destructive",
																		});
																	}
																}}
																className="w-full"
															>
																<Copy className="h-4 w-4 mr-2" />
																Copy Dashboard Link
															</Button>

														</div>
													</CardContent>
												</Card>
											);
										})()}

										{/* Biography */}
										<Card>
											<CardHeader>
												<CardTitle>Biography</CardTitle>
											</CardHeader>
											<CardContent>
												<p className="text-sm leading-relaxed">
													{selectedArtist.biography ||
														"No biography provided"}
												</p>
											</CardContent>
										</Card>
									</div>

									{/* Social Media Links */}
									{selectedArtist.socialMedia && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Globe className="h-5 w-5" />
													Social Media & Links
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
													{selectedArtist.socialMedia
														?.instagram && (
														<a
															href={
																selectedArtist
																	.socialMedia
																	.instagram
															}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
														>
															<Instagram className="h-4 w-4 text-pink-600" />
															<span className="text-sm">
																Instagram
															</span>
														</a>
													)}
													{selectedArtist.socialMedia
														?.facebook && (
														<a
															href={
																selectedArtist
																	.socialMedia
																	.facebook
															}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
														>
															<Facebook className="h-4 w-4 text-blue-600" />
															<span className="text-sm">
																Facebook
															</span>
														</a>
													)}
													{selectedArtist.socialMedia
														?.youtube && (
														<a
															href={
																selectedArtist
																	.socialMedia
																	.youtube
															}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
														>
															<Youtube className="h-4 w-4 text-red-600" />
															<span className="text-sm">
																YouTube
															</span>
														</a>
													)}
													{selectedArtist.socialMedia
														?.website && (
														<a
															href={
																selectedArtist
																	.socialMedia
																	.website
															}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
														>
															<Globe className="h-4 w-4 text-green-600" />
															<span className="text-sm">
																Website
															</span>
														</a>
													)}
													{selectedArtist.showLink && (
														<a
															href={
																selectedArtist.showLink
															}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
														>
															<Play className="h-4 w-4 text-purple-600" />
															<span className="text-sm">
																Demo Video
															</span>
														</a>
													)}
												</div>
											</CardContent>
										</Card>
									)}
								</TabsContent>

								{/* Music Tab */}
								<TabsContent
									value="music"
									className="space-y-6"
								>
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Music className="h-5 w-5" />
												Music Tracks
											</CardTitle>
											<CardDescription>
												Uploaded music tracks for the
												performance
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="space-y-4">
												{selectedArtist.musicTrack ? (
													<div className="border rounded-lg p-4 space-y-3">
														<div className="flex items-center justify-between">
															<div>
																<h4 className="font-medium">
																	{selectedArtist
																		.musicTrack
																		.song_title ||
																		selectedArtist.artistName ||
																		selectedArtist.artist_name}
																</h4>
																<p className="text-sm text-muted-foreground">
																	Duration:{" "}
																	{formatDuration(
																		selectedArtist
																			.musicTrack
																			.duration,
																	)}{" "}
																	{selectedArtist
																		.musicTrack
																		.tempo &&
																		`- Tempo: ${selectedArtist.musicTrack.tempo}`}
																</p>
															</div>
															<Badge variant="secondary">
																Main Track
															</Badge>
														</div>
														{selectedArtist
															.musicTrack
															.notes && (
															<p className="text-sm text-muted-foreground">
																{
																	selectedArtist
																		.musicTrack
																		.notes
																}
															</p>
														)}
														{selectedArtist
															.musicTrack
															.file_url && (
															<div className="space-y-2">
																<AudioPlayer
																	track={
																		selectedArtist.musicTrack
																	}
																	onError={(
																		error,
																	) => {
																		console.error(
																			"Audio playback error:",
																			error,
																		);
																	}}
																/>

															</div>
														)}
													</div>
												) : selectedArtist.musicTracks &&
												  selectedArtist.musicTracks
														.length > 0 ? (
													selectedArtist.musicTracks.map(
														(
															track: any,
															index: number,
														) => (
															<div
																key={index}
																className="border rounded-lg p-4 space-y-3"
															>
																<div className="flex items-center justify-between">
																	<div>
																		<h4 className="font-medium">
																			{
																				track.song_title
																			}
																		</h4>
																		<p className="text-sm text-muted-foreground">
																			Duration:{" "}
																			{formatDuration(
																				track.duration,
																			)}{" "}
																			-
																			Tempo:{" "}
																			{
																				track.tempo
																			}
																		</p>
																	</div>
																	<div className="flex items-center gap-2">
																		{track.is_main_track && (
																			<Badge variant="secondary">
																				Main
																				Track
																			</Badge>
																		)}
																	</div>
																</div>
																{track.notes && (
																	<p className="text-sm text-muted-foreground">
																		{
																			track.notes
																		}
																	</p>
																)}
																{track.file_url && (
																	<div className="space-y-2">
																		<AudioPlayer
																			track={
																				track
																			}
																			onError={(
																				error,
																			) => {
																				console.error(
																					"Audio playback error:",
																					error,
																				);
																			}}
																		/>

																	</div>
																)}
															</div>
														),
													)
												) : (
													<p className="text-center text-muted-foreground py-8">
														No music tracks uploaded
														yet
													</p>
												)}
											</div>
										</CardContent>
									</Card>
								</TabsContent>

								{/* Technical Tab */}
								<TabsContent
									value="technical"
									className="space-y-6"
								>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* Costume & Lighting */}
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Palette className="h-5 w-5" />
													Costume & Lighting
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4">
												{/* Costume Colors - Prioritize manual colors */}
												<div>
													<p className="text-sm text-muted-foreground mb-2">
														🎨 Costume Colors
													</p>
													{(selectedArtist as any)
														.manualCostumeColor ||
													(selectedArtist as any)
														.manualCostumeColorTwo ||
													(selectedArtist as any)
														.manualCostumeColorThree ? (
														<div className="space-y-2">
															{(
																selectedArtist as any
															)
																.manualCostumeColor && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColor,
																		}}
																	></div>
																	<span className="text-sm">
																		Primary:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColor
																			}
																		</span>
																	</span>
																</div>
															)}
															{(
																selectedArtist as any
															)
																.manualCostumeColorTwo && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColorTwo,
																		}}
																	></div>
																	<span className="text-sm">
																		Secondary:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColorTwo
																			}
																		</span>
																	</span>
																</div>
															)}
															{(
																selectedArtist as any
															)
																.manualCostumeColorThree && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColorThree,
																		}}
																	></div>
																	<span className="text-sm">
																		Third:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualCostumeColorThree
																			}
																		</span>
																	</span>
																</div>
															)}
														</div>
													) : (
														<p className="text-sm text-gray-500 italic">
															No costume colors
															selected
														</p>
													)}
													{selectedArtist.customCostumeColor && (
														<p className="text-sm text-muted-foreground mt-2">
															Custom Details:{" "}
															{
																selectedArtist.customCostumeColor
															}
														</p>
													)}
												</div>
												{/* Lighting Colors - Prioritize manual colors */}
												<div>
													<p className="text-sm text-muted-foreground mb-2">
														💡 Lighting Preferences
													</p>
													{(selectedArtist as any)
														.manualLightColor ||
													(selectedArtist as any)
														.manualLightColorTwo ||
													(selectedArtist as any)
														.manualLightColorThree ? (
														<div className="space-y-2">
															{(
																selectedArtist as any
															)
																.manualLightColor && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualLightColor,
																		}}
																	></div>
																	<span className="text-sm">
																		Primary:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualLightColor
																			}
																		</span>
																	</span>
																</div>
															)}
															{(
																selectedArtist as any
															)
																.manualLightColorTwo && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualLightColorTwo,
																		}}
																	></div>
																	<span className="text-sm">
																		Secondary:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualLightColorTwo
																			}
																		</span>
																	</span>
																</div>
															)}
															{(
																selectedArtist as any
															)
																.manualLightColorThree && (
																<div className="flex items-center gap-3">
																	<div
																		className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.manualLightColorThree,
																		}}
																	></div>
																	<span className="text-sm">
																		Third:{" "}
																		<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																			{
																				(
																					selectedArtist as any
																				)
																					.manualLightColorThree
																			}
																		</span>
																	</span>
																</div>
															)}
														</div>
													) : (
														<p className="text-sm text-gray-500 italic">
															Trust the Lighting
															Designer ✨
														</p>
													)}
												</div>
												{selectedArtist.lightRequests && (
													<div>
														<p className="text-sm text-muted-foreground">
															Special Lighting
															Requests
														</p>
														<p className="text-sm">
															{
																selectedArtist.lightRequests
															}
														</p>
													</div>
												)}
											</CardContent>
										</Card>

										{/* Stage Positioning */}
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Navigation className="h-5 w-5" />
													Stage Positioning
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-4">
												{(selectedArtist.stagePositionStart ||
													selectedArtist.stagePositionEnd) && (
													<StagePositionPreview
														startPosition={
															selectedArtist.stagePositionStart ||
															""
														}
														endPosition={
															selectedArtist.stagePositionEnd ||
															""
														}
													/>
												)}
												{selectedArtist.stagePositionStart && (
													<div>
														<p className="text-sm text-muted-foreground">
															Starting Position
														</p>
														<p className="font-medium capitalize">
															{selectedArtist.stagePositionStart.replace(
																"-",
																" ",
															)}
														</p>
													</div>
												)}
												{selectedArtist.stagePositionEnd && (
													<div>
														<p className="text-sm text-muted-foreground">
															Ending Position
														</p>
														<p className="font-medium capitalize">
															{selectedArtist.stagePositionEnd.replace(
																"-",
																" ",
															)}
														</p>
													</div>
												)}
												{selectedArtist.customStagePosition && (
													<div>
														<p className="text-sm text-muted-foreground">
															Custom Position
															Details
														</p>
														<p className="text-sm">
															{
																selectedArtist.customStagePosition
															}
														</p>
													</div>
												)}
												{selectedArtist.equipment && (
													<div>
														<p className="text-sm text-muted-foreground">
															Props and Equipment
														</p>
														<p className="text-sm">
															{
																selectedArtist.equipment
															}
														</p>
													</div>
												)}
											</CardContent>
										</Card>
									</div>

									{/* Notes */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<Card>
											<CardHeader>
												<CardTitle>MC Notes</CardTitle>
											</CardHeader>
											<CardContent>
												<p className="text-sm">
													{selectedArtist.mcNotes ||
														"No special notes for MC"}
												</p>
											</CardContent>
										</Card>
										<Card>
											<CardHeader>
												<CardTitle>
													Stage Manager Notes
												</CardTitle>
											</CardHeader>
											<CardContent>
												<p className="text-sm">
													{selectedArtist.stageManagerNotes ||
														"No special notes for stage manager"}
												</p>
											</CardContent>
										</Card>
									</div>
								</TabsContent>

								{/* Gallery Tab */}
								<TabsContent
									value="gallery"
									className="space-y-6"
								>
									{/* Rehearsal Video Section */}
									{selectedArtist.rehearsalVideo && (
										<Card className="border-2 border-amber-100">
											<CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
												<CardTitle className="flex items-center gap-2">
													<Play className="h-5 w-5 text-amber-600" />
													Rehearsal / Show Video
												</CardTitle>
												<CardDescription>
													Video for show order
													planning and lighting setup
												</CardDescription>
											</CardHeader>
											<CardContent className="pt-4">
												<div className="max-w-2xl mx-auto">
													<VideoPlayer
														file={{
															name: selectedArtist
																.rehearsalVideo
																.name,
															type: "video",
															url: selectedArtist
																.rehearsalVideo
																.url,
															file_path:
																selectedArtist
																	.rehearsalVideo
																	.file_path,
															size: selectedArtist
																.rehearsalVideo
																.size,
															contentType:
																selectedArtist
																	.rehearsalVideo
																	.contentType,
														}}
														className="aspect-video"
													/>
													<div className="flex items-center justify-between mt-2">
														<p className="text-sm text-gray-600">
															{
																selectedArtist
																	.rehearsalVideo
																	.name
															}
															{selectedArtist
																.rehearsalVideo
																.size && (
																<span className="ml-2 text-gray-400">
																	(
																	{(
																		selectedArtist
																			.rehearsalVideo
																			.size /
																		(1024 *
																			1024)
																	).toFixed(
																		1,
																	)}{" "}
																	MB)
																</span>
															)}
														</p>
														<Button
															variant="ghost"
															size="sm"
															onClick={async () => {
																const {
																	downloadFile,
																} =
																	await import("@/lib/media-utils");
																await downloadFile(
																	selectedArtist
																		.rehearsalVideo
																		.url,
																	selectedArtist
																		.rehearsalVideo
																		.name,
																	selectedArtist.artistName || selectedArtist.artist_name || (selectedArtist as any).realName
																);
															}}
															className="h-8"
															title="Download video"
														>
															<Download className="h-4 w-4 mr-1" />
															Download
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									)}

									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Image className="h-5 w-5" />
												Media Gallery
											</CardTitle>
											<CardDescription>
												Uploaded images and videos
											</CardDescription>
										</CardHeader>
										<CardContent>
											{selectedArtist.galleryFiles &&
											selectedArtist.galleryFiles.length >
												0 ? (
												<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
													{selectedArtist.galleryFiles.map(
														(
															file: any,
															index: number,
														) => (
															<div
																key={index}
																className="relative group"
															>
																{file.type ===
																"image" ? (
																	<ImageViewer
																		file={
																			file
																		}
																		onError={(
																			error,
																		) => {
																			console.error(
																				"Image viewer error:",
																				error,
																			);
																		}}
																		className="aspect-square"
																	/>
																) : (
																	<VideoPlayer
																		file={
																			file
																		}
																		onError={(
																			error,
																		) => {
																			console.error(
																				"Video player error:",
																				error,
																			);
																		}}
																		className="aspect-square"
																	/>
																)}
																<div className="flex items-center justify-between mt-1">
																	<p className="text-xs text-muted-foreground truncate flex-1">
																		{
																			file.name
																		}
																	</p>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={async () => {
																			const {
																				downloadFile,
																			} =
																				await import("@/lib/media-utils");
																			await downloadFile(
																				file.url,
																				file.name,
																				selectedArtist.artistName || selectedArtist.artist_name || (selectedArtist as any).realName
																			);
																		}}
																		className="h-6 w-6 p-0 ml-1"
																		title="Download file"
																	>
																		<Download className="h-3 w-3" />
																	</Button>
																</div>
															</div>
														),
													)}
												</div>
											) : (
												<p className="text-center text-muted-foreground py-8">
													No media files uploaded yet
												</p>
											)}
										</CardContent>
									</Card>
								</TabsContent>

								{/* Event Details Tab */}
								<TabsContent
									value="event"
									className="space-y-6"
								>
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Calendar className="h-5 w-5" />
												Event Information
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>
												<p className="text-sm text-muted-foreground">
													Event ID
												</p>
												<p className="font-medium text-lg">
													{eventId}
												</p>
											</div>
											{(selectedArtist.performanceDate ||
												selectedArtist.performance_date) && (
												<div>
													<p className="text-sm text-muted-foreground">
														Assigned Performance
														Date
													</p>
													<p className="font-medium">
														{formatDateSimple(
															selectedArtist.performanceDate ||
																selectedArtist.performance_date,
														)}
													</p>
												</div>
											)}
											<div>
												<p className="text-sm text-muted-foreground">
													Registration Date
												</p>
												<p className="font-medium">
													{new Date(
														selectedArtist.createdAt ||
															selectedArtist.created_at,
													).toLocaleDateString(
														"en-US",
														{
															year: "numeric",
															month: "long",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														},
													)}
												</p>
											</div>
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						)}

						<DialogFooter>
							<Button
								onClick={() => setIsDetailDialogOpen(false)}
							>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{isLightingDesignerOpen && (
					<LightingDesignerDashboard
						eventId={eventId}
						isOpen={isLightingDesignerOpen}
						onClose={() => setIsLightingDesignerOpen(false)}
						performanceDate={selectedPerformanceDate}
					/>
				)}

			{/* Unified Edit Cue / Artist Side Panel */}
			{editingShowItem && (
				<div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
					{/* Backdrop overlay clicking closes the side panel */}
					<div 
						className="absolute inset-0" 
						onClick={() => setEditingShowItem(null)}
					/>
					
					{/* Side Panel Sheet */}
					<div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out slide-in-from-right animate-in">
						
						{/* Header */}
						<div className="p-4 border-b flex items-center justify-between shrink-0 bg-gray-50">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
									{editingShowItem.type === "artist" ? "ART" : "CUE"}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="font-bold text-gray-950 text-base leading-tight">
											{cueForm.title || "Edit Show Item"}
										</h3>
										<Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
											{`CUE ${cueForm.cueNo}`}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										{(() => {
											const itemIndex = showOrderItems.findIndex((i) => i.id === editingShowItem.id);
											const timing = itemIndex !== -1 ? liveTimings[itemIndex] : null;
											const baseMins = parseFloat(cueForm.duration) || 0;
											const durationLabel = editingShowItem.type === "cue" && cueForm.extraTime > 0
												? `${formatMinutesToMMSS(baseMins)} + ${formatExtraTime(cueForm.extraTime)} extra`
												: formatMinutesToMMSS(baseMins);
											if (timing) {
												return `Calculated Live: ${timing.startTime} - ${timing.endTime} (${durationLabel})`;
											}
											return durationLabel;
										})()}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setEditingShowItem(null)}
								className="h-8 w-8 text-gray-500 hover:text-gray-900 rounded-full"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* Scrollable Form Content */}
						<div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24">
							{/* Item Type Indicator & Dynamic Info */}
							<div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600 space-y-2">
								<div className="font-semibold text-gray-800 uppercase tracking-wider text-[10px]">Reference Info</div>
								{editingShowItem.type === "artist" && editingShowItem.artist && (
									<>
										<div>
											<span className="font-bold text-blue-700">Artist Name: </span>
											<span>{editingShowItem.artist.artist_name}</span>
										</div>
										{editingShowItem.artist.style && (
											<div>
												<span className="font-bold text-purple-700">Style / Genre: </span>
												<span>{editingShowItem.artist.style}</span>
											</div>
										)}
									</>
								)}
								{editingShowItem.type === "cue" && editingShowItem.cue && (
									<div>
										<span className="font-bold text-blue-700">Cue Type: </span>
										<span className="capitalize">{editingShowItem.cue.type}</span>
									</div>
								)}
							</div>

							{/* Title */}
							<div className="space-y-1.5">
								<Label htmlFor="item-title" className="text-sm font-semibold text-gray-800">
									Title / Label
								</Label>
								<Input
									id="item-title"
									value={cueForm.title}
									onChange={(e) => setCueForm(prev => ({ ...prev, title: e.target.value }))}
									placeholder="Enter title..."
									className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm rounded-lg"
								/>
							</div>

							{/* Duration & Category/Label Grid */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<div className="flex items-center justify-between gap-2">
										<Label htmlFor="item-duration" className="text-sm font-semibold text-gray-800">
											Duration (mm:ss)
										</Label>
										{editingShowItem?.type === "cue" && (
											<ExtraTimePicker
												value={cueForm.extraTime}
												onChange={(seconds) => setCueForm(prev => ({ ...prev, extraTime: seconds }))}
											/>
										)}
									</div>
									<MMSSInput
										id="item-duration"
										minutes={parseFloat(cueForm.duration) || 0}
										onChange={(mins) => setCueForm(prev => ({ ...prev, duration: String(mins) }))}
										className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm rounded-lg"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="item-category" className="text-sm font-semibold text-gray-800">
										Category / Genre
									</Label>
									<Input
										id="item-category"
										value={cueForm.label}
										onChange={(e) => setCueForm(prev => ({ ...prev, label: e.target.value }))}
										placeholder="e.g. Rock, MC, Dance..."
										className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm rounded-lg"
									/>
								</div>
							</div>

							{/* Description / Notes */}
							<div className="space-y-1.5">
								<Label htmlFor="item-description" className="text-sm font-semibold text-gray-800">
									Description / Notes
								</Label>
								<Textarea
									id="item-description"
									value={cueForm.description}
									onChange={(e) => setCueForm(prev => ({ ...prev, description: e.target.value }))}
									placeholder="General description or notes..."
									rows={3}
									className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all text-sm rounded-lg"
								/>
							</div>

							{/* Fixed Start Time & Flags */}
							<div className="border border-gray-100 rounded-xl p-3 bg-gray-50/30 space-y-4">
								<div className="space-y-1.5">
									<Label htmlFor="item-fixed-start" className="text-sm font-semibold text-gray-800">
										Fixed Start Time
									</Label>
									<Input
										id="item-fixed-start"
										value={cueForm.fixedStart}
										onChange={(e) => setCueForm(prev => ({ ...prev, fixedStart: e.target.value }))}
										placeholder="e.g. 19:30 or HH:MM..."
										className="bg-white border-gray-200 transition-all text-sm rounded-lg"
									/>
								</div>

								<div className="flex items-center justify-between pt-1">
									<div className="flex flex-col">
										<Label htmlFor="item-hard-start" className="text-xs font-semibold text-gray-800">
											Hard Start
										</Label>
										<span className="text-[10px] text-muted-foreground">Force event timing to start exactly at the fixed time</span>
									</div>
									<Switch
										id="item-hard-start"
										checked={cueForm.hardStart}
										onCheckedChange={(checked) => setCueForm(prev => ({ ...prev, hardStart: checked }))}
									/>
								</div>

								<div className="flex items-center justify-between border-t pt-3">
									<div className="flex flex-col">
										<Label htmlFor="item-hard-stop" className="text-xs font-semibold text-gray-800">
											Hard Stop
										</Label>
										<span className="text-[10px] text-muted-foreground">Force next cue to start immediately after duration</span>
									</div>
									<Switch
										id="item-hard-stop"
										checked={cueForm.hardStop}
										onCheckedChange={(checked) => setCueForm(prev => ({ ...prev, hardStop: checked }))}
									/>
								</div>
							</div>

							{/* Cue Color Picker */}
							<div className="border-t border-gray-100 pt-3">
								<CueColorPicker
									label="Backstage Color Picker"
									value={cueForm.color}
									onChange={(color) => setCueForm(prev => ({ ...prev, color }))}
								/>
							</div>

							{/* Department Notes Title */}
							<div className="pt-2 border-t border-gray-100">
								<span className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-1.5 uppercase">
									<ClipboardList className="h-3.5 w-3.5" />
									<span>Department Instructions</span>
								</span>
							</div>

							{/* Department Notes Inputs */}
							<div className="space-y-4">
								{[
									{ key: "showcaller", label: "Showcaller", placeholder: "Instructions for Showcaller..." },
									{ key: "dj", label: "DJ", placeholder: "Instructions for DJ..." },
									{ key: "sound", label: "Sound", placeholder: "Instructions for Sound..." },
									{ key: "light", label: "Light", placeholder: "Instructions for Light..." },
									{ key: "stage_crew", label: "Stage Crew", placeholder: "Instructions for Stage Crew..." },
									{ key: "artists", label: "Artists", placeholder: "Instructions for Artists..." },
									{ key: "sfx", label: "SFX", placeholder: "Instructions for SFX..." },
									{ key: "video", label: "Video", placeholder: "Instructions for Video..." },
									{ key: "backstage", label: "Backstage", placeholder: "Instructions for Backstage..." },
									{ key: "notes", label: "Notes", placeholder: "Instructions for Notes..." }
								].map((dept) => (
									<div key={dept.key} className="space-y-1.5">
										<Label htmlFor={`dept-notes-${dept.key}`} className="text-xs font-medium text-gray-700">
											{dept.label}
										</Label>
										<Input
											id={`dept-notes-${dept.key}`}
											value={cueForm.deptNotes[dept.key as keyof typeof cueForm.deptNotes] || ""}
											onChange={(e) => {
												setCueForm(prev => ({
													...prev,
													deptNotes: {
														...prev.deptNotes,
														[dept.key]: e.target.value
													}
												}));
											}}
											placeholder={dept.placeholder}
											className="bg-gray-100/60 border-0 text-sm h-9 rounded-lg focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-gray-400 transition-all"
										/>
									</div>
								))}
							</div>
						</div>

						{/* Sticky Footer */}
						<div className="p-4 bg-white border-t border-gray-100 flex items-center justify-center shadow-lg shrink-0">
							<Button
								onClick={saveShowItemEdit}
								className="w-full bg-[#e879f9] hover:bg-[#d946ef] text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
							>
								<Check className="h-4 w-4" />
								<span>Save Changes</span>
							</Button>
						</div>

					</div>
				</div>
			)}
				{/* Check-In Scan Dialog */}
				{checkInDialogArtist && (
					<CheckInScanDialog
						open={!!checkInDialogArtist}
						onOpenChange={(open) =>
							!open && setCheckInDialogArtist(null)
						}
						eventId={eventId}
						artistId={checkInDialogArtist.id}
						artistName={checkInDialogArtist.artist_name}
						rehearsalCheckedIn={
							getCheckInStatus(checkInDialogArtist.id)
								.rehearsalCheckedIn
						}
						performanceCheckedIn={
							getCheckInStatus(checkInDialogArtist.id)
								.performanceCheckedIn
						}
						onCheckInComplete={(type, checkedIn) => {
							markCheckInLocal(
								checkInDialogArtist.id,
								type,
								checkedIn,
							);
							setCheckInDialogArtist(null);
						}}
					/>
				)}

				{/* Organiser Message Modal Alert */}
				{activeOrganiserMessage && (
					<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
						<div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl z-[1000] border border-gray-100 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
							{/* Header */}
							<div className="flex items-center justify-between shrink-0">
								<div className="text-xs md:text-sm font-extrabold text-[#d946ef] tracking-wider flex items-center gap-1.5 uppercase">
									<MessageSquare className="h-4 w-4" />
									<span>Message From Organiser</span>
								</div>
								<span className="text-xs text-gray-400 font-bold">
									{new Date(activeOrganiserMessage.createdAt).toLocaleTimeString("en-US", {
										hour: "2-digit",
										minute: "2-digit",
										hour12: true,
									})}
								</span>
							</div>

							{/* Body */}
							<div className="py-2 text-left">
								<p className="text-lg md:text-xl font-extrabold text-gray-900 leading-snug break-words">
									{activeOrganiserMessage.text}
								</p>
							</div>

							{/* Footer Actions */}
							<div className="flex items-center gap-3 pt-2">
								<button
									onClick={() => handleConfirmReadOrganiserMessage(activeOrganiserMessage.id)}
									className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm flex-1 transition-all shadow-md active:scale-95"
								>
									<Check className="h-4 w-4" />
									Confirm Read
								</button>
								<button
									onClick={() => {
										handleConfirmReadOrganiserMessage(activeOrganiserMessage.id);
										setShowChatsOpen(true);
									}}
									className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center text-sm flex-1 transition-all active:scale-95"
								>
									Respond
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Floating Chat Action Button */}
				{!showChatsOpen && (
					<button
						onClick={() => setShowChatsOpen(true)}
						className="fixed bottom-6 right-6 z-[45] bg-[#d946ef] hover:bg-[#d946ef]/90 text-white p-4 rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
					>
						<MessageSquare className="h-6 w-6" />
					</button>
				)}

				{/* Sliding Sidebar for Chat */}
				<div
					className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-[200] border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
						showChatsOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					{/* Header */}
					<div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
						<div className="flex flex-col text-left">
							<span className="font-extrabold text-gray-900 text-lg">Organiser Chat</span>
							<span className="text-xs text-gray-400 font-bold">Stage ↔ Organiser</span>
						</div>
						<button
							onClick={() => setShowChatsOpen(false)}
							className="h-9 w-9 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-full flex items-center justify-center transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					{/* Message List */}
					<div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/30 flex flex-col">
						{chatMessages.filter(
							(m) =>
								(m.sender === "organiser" && m.recipient === "stage_manager") ||
								(m.sender === "stage_manager" && m.recipient === "organiser")
						).length > 0 ? (
							chatMessages
								.filter(
									(m) =>
										(m.sender === "organiser" && m.recipient === "stage_manager") ||
										(m.sender === "stage_manager" && m.recipient === "organiser")
								)
								.map((msg) => {
									const isMe = msg.sender === "stage_manager";
									return (
										<div
											key={msg.id}
											className={`flex flex-col ${isMe ? "items-end text-right" : "items-start text-left"} max-w-[85%] ${
												isMe ? "self-end" : "self-start"
											}`}
										>
											<div
												className={`px-4 py-2.5 rounded-2xl text-sm ${
													isMe
														? "bg-[#d946ef] text-white rounded-tr-none text-left"
														: "bg-gray-100 text-gray-800 rounded-tl-none"
												}`}
											>
												<p className="whitespace-pre-wrap">{msg.text}</p>
											</div>
											<div className="flex items-center gap-1 mt-1 px-1">
												<span className="text-[9px] text-gray-400 font-medium">
													{new Date(msg.createdAt).toLocaleTimeString("en-US", {
														hour: "2-digit",
														minute: "2-digit",
														hour12: true,
													})}
												</span>
												{isMe && (
													<span className="font-bold">
														{msg.status === "read" ? (
															<span className="text-emerald-500 text-[11px] leading-none ml-1 font-bold" title="Read">✓✓</span>
														) : (
															<span className="text-gray-300 text-[11px] leading-none ml-1 font-bold" title="Sent">✓</span>
														)}
													</span>
												)}
											</div>
										</div>
									);
								})
						) : (
							<div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-medium py-16">
								No messages yet.
							</div>
						)}
					</div>

					{/* Input Box */}
					<div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2 shrink-0">
						<button className="p-2 text-gray-400 hover:text-gray-650 transition-colors">
							<Camera className="h-5 w-5" />
						</button>
						<button className="p-2 text-gray-400 hover:text-gray-650 transition-colors">
							<Mic className="h-5 w-5" />
						</button>
						<input
							type="text"
							value={newMessageText}
							onChange={(e) => setNewMessageText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleSendMessage();
							}}
							placeholder="Message organiser..."
							className="flex-1 py-2 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:bg-white transition-all text-gray-800"
						/>
						<button
							onClick={handleSendMessage}
							disabled={sendingMessage || !newMessageText.trim()}
							className="p-2 bg-[#d946ef] hover:bg-[#d946ef]/90 text-white rounded-full transition-all disabled:opacity-50 flex items-center justify-center"
						>
							<Send className="h-4 w-4" />
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
