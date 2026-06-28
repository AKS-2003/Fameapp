"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { StagePositionPreview } from "@/components/StagePositionPreview";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	Calendar,
	Clock,
	GripVertical,
	Star,
	CheckCircle,
	RefreshCw,
	Eye,
	User,
	Music,
	Image,
	Palette,
	Navigation,
	Globe,
	Instagram,
	Facebook,
	Youtube,
	Download,
	Play,
	Phone,
	Mail,
	Settings,
	FileEdit,
	Copy,
	Package,
	Check,
	Square,
	Printer,
	QrCode,
	MessageSquare,
	X,
	Camera,
	Mic,
	Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
	formatDateForDropdown,
	formatDateSimple,
	normalizeDateString,
} from "@/lib/date-utils";
import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusBadgeVariant,
} from "@/lib/status-utils";
import {
	formatDuration,
	getDisplayDuration,
	calculateLiveTimings,
} from "@/lib/timing-utils";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { QRCodeSVG } from "qrcode.react";
import { QRCodeDialog } from "@/components/ui/qr-code-dialog";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { useAccessGuard } from "@/hooks/useAccessGuard";
import { AccessDenied } from "@/components/ui/access-denied";
import { CallArtistButton } from "@/components/CallArtistButton";
import { CheckInScanDialog } from "@/components/CheckInScanDialog";
import { useAllCheckIns } from "@/hooks/use-all-checkins";
import { EventChecklistButton } from "@/components/EventChecklistButton";

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

// Helper functions to safely compare dates regardless of ISO/short format
const compareDates = (dateA: string | null | undefined, dateB: string | null | undefined): boolean => {
	if (!dateA || !dateB) return false;
	try {
		return normalizeDateString(dateA) === normalizeDateString(dateB);
	} catch (e) {
		return false;
	}
};

const compareDatesNotEqual = (dateA: string | null | undefined, dateB: string | null | undefined): boolean => {
	if (!dateA && !dateB) return false;
	if (!dateA || !dateB) return true;
	try {
		return normalizeDateString(dateA) !== normalizeDateString(dateB);
	} catch (e) {
		return true;
	}
};

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

interface Artist {
	id: string;
	eventShowId: string | null;
	uniqueId: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	actual_duration: number | null;
	quality_rating: number | null;
	rehearsal_date: string | null;
	rehearsal_order: number | null;
	is_confirmed: boolean;
	performance_date: string | null;
	rehearsal_completed: boolean;
	rehearsal_marked: boolean;
	available_order: number | null;
	cue_notes?: string;
	rehearsal_dept_notes?: any;
}

export default function RehearsalSchedule({
	providedEventId,
	onTabChange,
}: {
	providedEventId?: string;
	onTabChange?: (tab: string) => void;
} = {}) {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = providedEventId || (params?.eventId as string);

	// Access control check
	const { hasAccess, isLoading: accessLoading } = useAccessGuard([
		"rehearsal",
		"full_access",
	]);

	const [event, setEvent] = useState<Event | null>(null);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [wsConnected, setWsConnected] = useState(false);
	const [wsInitialized, setWsInitialized] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedArtist, setSelectedArtist] = useState<any | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [rehearsalTimings, setRehearsalTimings] = useState<{
		show_start_time?: string;
	}>({});
	const [showRehearsalTimingSettings, setShowRehearsalTimingSettings] =
		useState(false);
	const [rehearsalStartTimeInput, setRehearsalStartTimeInput] = useState("");

	// Rehearsal time override state: artistId -> "HH:MM"
	const [rehearsalTimeOverrides, setRehearsalTimeOverrides] = useState<
		Record<string, string>
	>({});
	const [editingRehearsalTimeId, setEditingRehearsalTimeId] = useState<
		string | null
	>(null);
	const [editingRehearsalTimeValue, setEditingRehearsalTimeValue] =
		useState<string>("");

	// Cue notes edit dialog state
	const [editingCueNotesArtist, setEditingCueNotesArtist] =
		useState<Artist | null>(null);
	const [cueNotesValue, setCueNotesValue] = useState("");
	const [cueNotesFullArtist, setCueNotesFullArtist] = useState<any | null>(
		null,
	);
	const [deptNotesValue, setDeptNotesValue] = useState<{
		showcaller: string;
		dj: string;
		sound: string;
		light: string;
		stage_crew: string;
		artists: string;
		sfx: string;
		video: string;
		backstage: string;
		notes: string;
	}>({
		showcaller: "",
		dj: "",
		sound: "",
		light: "",
		stage_crew: "",
		artists: "",
		sfx: "",
		video: "",
		backstage: "",
		notes: "",
	});

	// Position editing state
	const [editingRehearsalPosition, setEditingRehearsalPosition] = useState<
		string | null
	>(null);

	// Rehearsal PDF generation state
	const [isGeneratingRehearsalPDF, setIsGeneratingRehearsalPDF] =
		useState(false);
	const [newRehearsalPosition, setNewRehearsalPosition] = useState<number>(1);

	// Available Artists dialog state
	const [isAvailableArtistsOpen, setIsAvailableArtistsOpen] = useState(false);

	// Check-in state and dialog
	const {
		checkIns,
		getStatus: getCheckInStatus,
		markCheckedIn: markCheckInLocal,
		refetch: refetchCheckIns,
	} = useAllCheckIns(eventId);
	const [checkInDialogArtist, setCheckInDialogArtist] =
		useState<Artist | null>(null);

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

	// Flag to suppress WebSocket-triggered refetch when this browser just made a change
	// Prevents stale GCS data from overwriting the correct local state
	const localUpdateInProgress = useRef(false);
	const localUpdateTimer = useRef<NodeJS.Timeout | null>(null);

	// Helper: suppress WebSocket-triggered refetch for a duration after a local change
	const suppressWebSocketRefetch = (durationMs = 3000) => {
		localUpdateInProgress.current = true;
		if (localUpdateTimer.current) {
			clearTimeout(localUpdateTimer.current);
		}
		localUpdateTimer.current = setTimeout(() => {
			localUpdateInProgress.current = false;
			localUpdateTimer.current = null;
		}, durationMs);
	};

	useEffect(() => {
		if (eventId && hasAccess && !accessLoading) {
			fetchEvent();
			fetchArtists();
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
				if (newDate !== selectedDate) {
					setSelectedDate(newDate);
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

	// Initialize WebSocket manager for real-time updates
	useEffect(() => {
		let wsManager: any = null;

		const initializeWebSocketManager = async () => {
			try {
				wsManager = createWebSocketManager({
					eventId,
					role: "rehearsal",
					userId: `rehearsal_${eventId}`,
					showToasts: true,
					onConnect: () => {
						setWsConnected(true);
						setWsInitialized(true);
					},
					onDisconnect: () => {
						setWsConnected(false);
					},
					onDataUpdate: () => {
						// Skip if a local update just happened — prevents stale GCS data overwriting optimistic state
						if (localUpdateInProgress.current) {
							console.log(
								"Rehearsal: Skipping onDataUpdate (local update in progress)",
							);
							return;
						}
						fetchArtists();
					},
				});

				await wsManager.initialize();

				// Listen for timing settings updates (from performance order page or other rehearsal tabs)
				wsManager.on("timing-settings-updated", (data: any) => {
					if (data.eventId === eventId) {
						// Skip if this browser just made the change
						if (localUpdateInProgress.current) {
							console.log(
								"Rehearsal: Skipping timing-settings-updated (local update in progress)",
							);
							return;
						}
						console.log(
							"Rehearsal: Timing settings updated from another browser, refreshing...",
						);

						// Immediately apply if data contains rehearsal_time_overrides
						if (data.rehearsal_time_overrides) {
							setRehearsalTimeOverrides(
								data.rehearsal_time_overrides,
							);
						}

						// Re-fetch rehearsal timings
						const fetchUpdatedTimings = async () => {
							try {
								const dateToUse =
									data.performanceDate || selectedDate;
								// Normalize to YYYY-MM-DD
								const normalizedDate = dateToUse
									? dateToUse.includes("T")
										? dateToUse.split("T")[0]
										: dateToUse
									: "";
								const response = await fetch(
									`/api/events/${eventId}/timing-settings?performanceDate=${normalizedDate}&t=${Date.now()}`,
								);
								if (response.ok) {
									const result = await response.json();
									if (result.success && result.data) {
										const startTime =
											result.data.rehearsal_start_time ||
											null;
										setRehearsalTimings({
											show_start_time: startTime,
										});
										setRehearsalStartTimeInput(
											startTime || "",
										);
										if (!data.rehearsal_time_overrides) {
											setRehearsalTimeOverrides(
												result.data
													.rehearsal_time_overrides ||
												{},
											);
										}
									}
								}
							} catch (error) {
								console.error(
									"Error refreshing rehearsal timings:",
									error,
								);
							}
						};
						setTimeout(() => fetchUpdatedTimings(), 500);
					}
				});

				// Listen for artist cue notes updates from performance order page or other tabs
				wsManager.on("artist_cue_updated", (data: any) => {
					if (data.eventId === eventId && data.artistId) {
						setArtists((prev) =>
							prev.map((artist) =>
								artist.id === data.artistId
									? {
										...artist,
										cue_notes:
											data.cue_notes ??
											artist.cue_notes,
										rehearsal_dept_notes:
											data.rehearsal_dept_notes ??
											artist.rehearsal_dept_notes,
									}
									: artist,
							),
						);
					}
				});

				// Listen for organiser messages
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

				// Listen for dynamic rehearsal, performance order, and show order updates
				const syncEvents = [
					"rehearsal_updated",
					"performance-order-update",
					"show-order-updated",
					"artist_status_changed",
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						if (data && data.eventId === eventId) {
							// Skip if this browser just made the change — prevents stale GCS data overwriting local state
							if (localUpdateInProgress.current) {
								console.log(`Rehearsal: Skipping ${evtName} (local update in progress)`);
								return;
							}
							console.log(`Rehearsal: Received ${evtName} from another browser, fetching artists...`);
							setTimeout(() => fetchArtists(), 800);
						}
					});
				});

				// Store reference for cleanup
				(window as any).rehearsalWsManager = wsManager;

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
				setWsConnected(false);
			}
		};

		if (eventId && hasAccess && !accessLoading) {
			initializeWebSocketManager();
		}

		// Cleanup on unmount
		return () => {
			if ((window as any).rehearsalWsManager) {
				(window as any).rehearsalWsManager.destroy();
				delete (window as any).rehearsalWsManager;
			}
		};
	}, [eventId, hasAccess, accessLoading]);

	// Fetch rehearsal timing settings when date changes
	useEffect(() => {
		const fetchRehearsalTimings = async () => {
			if (!eventId || !selectedDate) return;
			// Normalize to YYYY-MM-DD
			const normalizedDate = selectedDate.includes("T")
				? selectedDate.split("T")[0]
				: selectedDate;
			try {
				const response = await fetch(
					`/api/events/${eventId}/timing-settings?performanceDate=${normalizedDate}&t=${Date.now()}`,
				);
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						const startTime =
							result.data.rehearsal_start_time || null;
						setRehearsalTimings({
							show_start_time: startTime,
						});
						setRehearsalStartTimeInput(startTime || "");
						setRehearsalTimeOverrides(
							result.data.rehearsal_time_overrides || {},
						);
					} else {
						setRehearsalTimings({});
						setRehearsalStartTimeInput("");
						setRehearsalTimeOverrides({});
					}
				}
			} catch (error) {
				console.error("Error fetching rehearsal timings:", error);
			}
		};
		fetchRehearsalTimings();
		checkUnreadOrganiserMessages();
	}, [eventId, selectedDate]);

	// Save rehearsal start time
	const saveRehearsalStartTime = async () => {
		// Normalize to YYYY-MM-DD
		const normalizedDate = selectedDate
			? selectedDate.includes("T")
				? selectedDate.split("T")[0]
				: selectedDate
			: "";
		try {
			const response = await fetch(
				`/api/events/${eventId}/timing-settings`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						rehearsal_start_time: rehearsalStartTimeInput,
						performanceDate: normalizedDate,
						updated_by: "stage_manager",
					}),
				},
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setRehearsalTimings({
						show_start_time: rehearsalStartTimeInput,
					});
					setShowRehearsalTimingSettings(false);
					toast({
						title: "Rehearsal timing saved",
						description: `Rehearsal start time set to ${rehearsalStartTimeInput}`,
						variant: "success",
					});

					// Emit WebSocket event to notify other pages
					suppressWebSocketRefetch();
					const wsManager = (window as any).rehearsalWsManager;
					if (wsManager) {
						wsManager.emit("timing-settings-updated", {
							eventId,
							performanceDate: normalizedDate,
							rehearsal_start_time: rehearsalStartTimeInput,
							timestamp: new Date().toISOString(),
						});
					}
				}
			}
		} catch (error) {
			console.error("Error saving rehearsal timing:", error);
			toast({
				title: "Error",
				description: "Failed to save rehearsal timing",
				variant: "destructive",
			});
		}
	};

	const saveRehearsalTimeOverride = async (
		uniqueId: string,
		newTime: string,
	) => {
		const updated = { ...rehearsalTimeOverrides };
		if (newTime) {
			updated[uniqueId] = newTime;
		} else {
			delete updated[uniqueId];
		}
		setRehearsalTimeOverrides(updated);
		setEditingRehearsalTimeId(null);

		// Normalize to YYYY-MM-DD
		const normalizedDate = selectedDate
			? selectedDate.includes("T")
				? selectedDate.split("T")[0]
				: selectedDate
			: "";

		try {
			const response = await fetch(
				`/api/events/${eventId}/timing-settings`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						rehearsal_time_overrides: updated,
						performanceDate: normalizedDate,
						updated_by: "stage_manager",
					}),
				},
			);
			if (response.ok) {
				toast({
					title: "⏱️ Timing Updated",
					description:
						"Rehearsal time adjusted — subsequent items recalculated.",
					variant: "success",
				});

				suppressWebSocketRefetch();
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("timing-settings-updated", {
						eventId,
						performanceDate: normalizedDate,
						rehearsal_time_overrides: updated,
						timestamp: new Date().toISOString(),
					});
				}
			}
		} catch (error) {
			console.error("Error saving rehearsal time override:", error);
			toast({
				title: "❌ Save Failed",
				description: "Failed to save rehearsal timing change.",
				variant: "destructive",
			});
		}
	};

	// Initialize available_order for unscheduled artists if not set
	useEffect(() => {
		if (!selectedDate || artists.length === 0) return;

		const unscheduled = artists.filter(
			(a) =>
				compareDates(a.performance_date, selectedDate) &&
				(!a.rehearsal_date || compareDatesNotEqual(a.rehearsal_date, selectedDate)),
		);

		// Check if any unscheduled artist is missing available_order
		const needsInitialization = unscheduled.some(
			(a) => a.available_order === null,
		);

		if (needsInitialization) {
			// Assign sequential orders to unscheduled artists
			const updates = unscheduled
				.filter((a) => a.available_order === null)
				.map((artist, index) => {
					const order =
						unscheduled.filter((a) => a.available_order !== null)
							.length + index;
					return fetch(
						`/api/events/${eventId}/artists/${artist.id}`,
						{
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ available_order: order }),
						},
					);
				});

			if (updates.length > 0) {
				Promise.all(updates).then(() => {
					fetchArtists();
				});
			}
		}
	}, [artists, selectedDate, eventId]);

	// Auto-normalize orders only when adding new artists to prevent conflicts
	const autoNormalizeIfNeeded = async () => {
		if (!selectedDate || artists.length === 0) return;

		const scheduledArtists = artists.filter(
			(a) =>
				compareDates(a.rehearsal_date, selectedDate) && a.rehearsal_order !== null,
		);

		if (scheduledArtists.length > 1) {
			const orders = scheduledArtists.map((a) => a.rehearsal_order);
			const hasDuplicates = orders.length !== new Set(orders).size;

			if (hasDuplicates) {
				setTimeout(() => {
					// normalizeRehearsalOrders();
				}, 1000);
			}
		}
	};

	const fetchEvent = async () => {
		try {
			const res = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (!res.ok) throw new Error("Failed to fetch event");
			const json = await res.json();
			const evt = json.data || json.event || json; // tolerate shapes
			const showDates = evt.show_dates || evt.showDates || [];
			setEvent({
				id: String(evt.id),
				name: evt.name,
				venue: evt.venue,
				show_dates: showDates,
			});

			// Use shared date selection utility
			if (showDates.length > 0 && !selectedDate) {
				const bestDate = findBestDateToSelect(showDates, eventId);
				setSelectedDate(bestDate);
				saveSelectedDateToStorage(eventId, bestDate);
			}
		} catch (error) {
			toast({
				title: "❌ Loading Error",
				description:
					"Failed to load event details. Please refresh the page.",
				variant: "destructive",
			});
		}
	};

	const fetchArtists = async (showRefreshIndicator = false) => {
		try {
			if (showRefreshIndicator) {
				setRefreshing(true);
			}

			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					// Filter only assigned artists and map to expected format
					const assignedArtists = (data.data || [])
						.filter(
							(artist: any) =>
								artist.performanceDate ||
								artist.performance_date,
						)
						.map((artist: any) => ({
							id: artist.id,
							eventShowId: artist.eventShowId || null,
							uniqueId: artist.eventShowId || artist.id,
							artist_name:
								artist.artistName || artist.artist_name,
							style: artist.style,
							performance_duration:
								artist.performanceDuration ||
								artist.performance_duration ||
								5,
							actual_duration:
								artist.musicTrack?.duration ||
								artist.musicTracks?.find(
									(track: any) => track.is_main_track,
								)?.duration ||
								null,
							quality_rating: artist.quality_rating || null,
							rehearsal_date: artist.rehearsal_date || null,
							rehearsal_order: artist.rehearsal_order || null,
							is_confirmed: artist.is_confirmed || false,
							performance_date:
								artist.performanceDate ||
								artist.performance_date,
							rehearsal_completed:
								artist.rehearsal_completed || false,
							rehearsal_marked: artist.rehearsal_marked || false,
							available_order: artist.available_order ?? null,
							cue_notes: artist.cue_notes || "",
						}));
					setArtists(assignedArtists);

					if (showRefreshIndicator) {
						toast({
							title: "🔄 Data Refreshed",
							description: "Rehearsal data updated!",
						});
					}
				} else {
					setArtists([]);
				}
			} else {
				throw new Error("Failed to fetch artists");
			}
		} catch (error) {
			toast({
				title: "❌ Loading Error",
				description: "Failed to load artist list. Please try again.",
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

	const initializeWebSocket = async () => {
		// Prevent multiple initializations
		if (wsInitialized) {
			return () => { };
		}

		setWsInitialized(true);

		try {
			// Import and initialize WebSocket manager
			const { createWebSocketManager } =
				await import("@/lib/websocket-manager");

			const wsManager = createWebSocketManager({
				eventId,
				role: "stage_manager",
				userId: `stage_manager_rehearsal_${eventId}`,
				showToasts: true,
				onConnect: () => {
					setWsConnected(true);
				},
				onDisconnect: () => {
					setWsConnected(false);
				},
				onDataUpdate: () => {
					// Skip if a local update just happened — prevents stale GCS data overwriting optimistic state
					if (localUpdateInProgress.current) {
						console.log(
							"Rehearsal: Skipping onDataUpdate (local update in progress)",
						);
						return;
					}
					fetchArtists();
				},
			});

			await wsManager.initialize();

			// Store reference for cleanup and emitting events
			(window as any).rehearsalWsManager = wsManager;

			// Return cleanup function
			return () => {
				if ((window as any).rehearsalWsManager) {
					(window as any).rehearsalWsManager.destroy();
					delete (window as any).rehearsalWsManager;
				}
				setWsInitialized(false);
			};
		} catch (error) {
			setWsInitialized(false);
			throw error;
		}
	};

	const updateQualityRating = async (
		uniqueId: string,
		artistId: string,
		rating: number,
		eventShowId?: string | null,
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ 
						quality_rating: rating,
						eventShowId: eventShowId || undefined
					}),
				},
			);

			if (response.ok) {
				setArtists(
					artists.map((artist) =>
						artist.uniqueId === uniqueId
							? { ...artist, quality_rating: rating }
							: artist,
					),
				);

				toast({
					title: "⭐ Rating Updated",
					description: "Artist quality rating has been saved.",
				});

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("artist_quality_rating_updated", {
						eventId,
						artistId: artistId,
						artist_name: artists.find((a) => a.uniqueId === uniqueId)
							?.artist_name,
						quality_rating: rating,
						timestamp: new Date().toISOString(),
					});
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to update rating",
				);
			}
		} catch (error: any) {
			toast({
				title: "❌ Rating Update Failed",
				description:
					error.message ||
					"Failed to update quality rating. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Simple function to add artist to rehearsal schedule
	const addArtistToRehearsal = async (artistId: string) => {
		try {
			// Get current scheduled artists for this date
			const currentScheduled = artists.filter(
				(a) =>
					compareDates(a.rehearsal_date, selectedDate) &&
					a.rehearsal_order !== null,
			);

			// Calculate next order number
			const nextOrder = currentScheduled.length + 1;

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						rehearsal_date: selectedDate,
						rehearsal_order: nextOrder,
					}),
				},
			);

			if (response.ok) {
				// Update local state optimistically instead of fetching stale GCS data
				setArtists((prev) =>
					prev.map((artist) =>
						artist.id === artistId
							? {
								...artist,
								rehearsal_date: selectedDate,
								rehearsal_order: nextOrder,
							}
							: artist,
					),
				);
				toast({
					title: "✅ Added to Rehearsal",
					description: "Artist has been scheduled for rehearsal.",
				});

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: "scheduled",
						rehearsal_date: selectedDate,
						rehearsal_order: nextOrder,
					});
				}
			} else {
				throw new Error("Failed to add artist to rehearsal");
			}
		} catch (error) {
			toast({
				title: "❌ Error",
				description:
					"Failed to add artist to rehearsal schedule. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Simple function to remove artist from rehearsal schedule
	const removeArtistFromRehearsal = async (artistId: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						rehearsal_date: null,
						rehearsal_order: null,
					}),
				},
			);

			if (response.ok) {
				// Update local state optimistically instead of fetching stale GCS data
				setArtists((prev) =>
					prev.map((artist) =>
						artist.id === artistId
							? {
								...artist,
								rehearsal_date: null,
								rehearsal_order: null,
							}
							: artist,
					),
				);
				toast({
					title: "🗑️ Removed from Rehearsal",
					description:
						"Artist has been removed from rehearsal schedule.",
				});

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: "removed",
						rehearsal_date: null,
						rehearsal_order: null,
					});
				}
			} else {
				throw new Error("Failed to remove artist from rehearsal");
			}
		} catch (error) {
			toast({
				title: "❌ Error",
				description:
					"Failed to remove artist from rehearsal. Please try again.",
				variant: "destructive",
			});
		}
	};

	const toggleRehearsalStatus = async (
		uniqueId: string,
		artistId: string,
		currentStatus: boolean,
		eventShowId?: string | null,
	) => {
		try {
			const newStatus = !currentStatus;

			// Only update rehearsal_completed — do NOT touch performance_order or performance_status
			// Rehearsal and show order are independent workflows
			const updateData: any = { 
				rehearsal_completed: newStatus,
				eventShowId: eventShowId || undefined
			};

			// Find current artist index in scheduled artists
			const scheduledArtists = artists
				.filter(
					(a) =>
						compareDates(a.rehearsal_date, selectedDate) &&
						a.rehearsal_order !== null,
				)
				.sort(
					(a, b) =>
						(a.rehearsal_order || 0) - (b.rehearsal_order || 0),
				);

			const currentArtistIdx = scheduledArtists.findIndex(
				(a) => a.uniqueId === uniqueId,
			);

			// If marking as complete, compute updated time cascades
			let updatedOverrides = { ...rehearsalTimeOverrides };
			let didUpdateOverrides = false;

			if (newStatus === true && currentArtistIdx !== -1) {
				const currentArtist = scheduledArtists[currentArtistIdx];
				const now = new Date();
				const currentHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

				updatedOverrides[currentArtist.uniqueId] = currentHHMM;

				// Clear overrides for all items after the current artist so they cascade properly
				for (
					let i = currentArtistIdx + 1;
					i < scheduledArtists.length;
					i++
				) {
					delete updatedOverrides[scheduledArtists[i].uniqueId];
				}

				didUpdateOverrides = true;
			} else if (newStatus === false && currentArtistIdx !== -1) {
				// When uncompleting, clear the time override so timing resets to planned schedule
				delete updatedOverrides[uniqueId];
				didUpdateOverrides = true;
			}

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(updateData),
				},
			);

			if (response.ok) {
				setArtists(
					artists.map((artist) =>
						artist.uniqueId === uniqueId
							? {
								...artist,
								rehearsal_completed: newStatus,
							}
							: artist,
					),
				);

				toast({
					title: newStatus
						? "✅ Rehearsal Completed"
						: "⏪ Rehearsal Uncompleted",
					description: newStatus
						? "Artist is now ready for performance order."
						: "Artist rehearsal marked as not completed.",
				});

				// Handle time overrides if we marked an artist complete
				if (didUpdateOverrides) {
					setRehearsalTimeOverrides(updatedOverrides);

					// Save the time overrides to the API
					const normalizedDate = selectedDate
						? selectedDate.includes("T")
							? selectedDate.split("T")[0]
							: selectedDate
						: "";

					try {
						const timingResponse = await fetch(
							`/api/events/${eventId}/timing-settings`,
							{
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									rehearsal_time_overrides: updatedOverrides,
									performanceDate: normalizedDate,
									updated_by: "stage_manager",
								}),
							},
						);
						if (timingResponse.ok) {
							const wsManager = (window as any)
								.rehearsalWsManager;
							if (wsManager) {
								wsManager.emit("timing-settings-updated", {
									eventId,
									performanceDate: normalizedDate,
									rehearsal_time_overrides: updatedOverrides,
									timestamp: new Date().toISOString(),
								});
							}
						}
					} catch (timingError) {
						console.error(
							"Error saving auto time cascade:",
							timingError,
						);
					}
				}

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: newStatus ? "completed" : "uncompleted",
						rehearsal_completed: newStatus,
					});
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message ||
					"Failed to update rehearsal status",
				);
			}
		} catch (error: any) {
			toast({
				title: "❌ Status Update Failed",
				description:
					error.message ||
					"Failed to update rehearsal status. Please try again.",
				variant: "destructive",
			});
		}
	};

	const toggleRehearsalMarked = async (
		uniqueId: string,
		artistId: string,
		currentMarked: boolean,
		eventShowId?: string | null,
	) => {
		const newMarked = !currentMarked;

		// Optimistic local update
		setArtists((prev) =>
			prev.map((artist) =>
				artist.uniqueId === uniqueId
					? { ...artist, rehearsal_marked: newMarked }
					: artist,
			),
		);

		suppressWebSocketRefetch(5000);

		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ 
						rehearsal_marked: newMarked,
						eventShowId: eventShowId || undefined
					}),
				},
			);

			if (response.ok) {
				// Emit WebSocket event for real-time sync across tabs
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: newMarked ? "marked" : "unmarked",
						rehearsal_marked: newMarked,
					});
				}
			} else {
				// Revert on failure
				setArtists((prev) =>
					prev.map((artist) =>
						artist.uniqueId === uniqueId
							? { ...artist, rehearsal_marked: currentMarked }
							: artist,
					),
				);
			}
		} catch {
			// Revert on error
			setArtists((prev) =>
				prev.map((artist) =>
					artist.uniqueId === uniqueId
						? { ...artist, rehearsal_marked: currentMarked }
						: artist,
				),
			);
		}
	};

	// Helper function to format duration
	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const scheduleRehearsal = async (
		uniqueId: string,
		artistId: string,
		date: string,
		order: number,
		eventShowId?: string | null,
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						rehearsal_date: date,
						rehearsal_order: order,
						eventShowId: eventShowId || undefined,
					}),
				},
			);

			if (response.ok) {
				// Update local state immediately
				setArtists(
					artists.map((artist) =>
						artist.uniqueId === uniqueId
							? {
								...artist,
								rehearsal_date: date,
								rehearsal_order: order,
							}
							: artist,
					),
				);

				toast({
					title: "📅 Rehearsal Scheduled",
					description: "Rehearsal date and order saved successfully.",
				});

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: "scheduled",
						rehearsal_date: date,
						rehearsal_order: order,
					});
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to schedule rehearsal",
				);
			}
		} catch (error: any) {
			toast({
				title: "❌ Scheduling Failed",
				description:
					error.message ||
					"Failed to schedule rehearsal. Please try again.",
				variant: "destructive",
			});
		}
	};

	const moveArtist = async (uniqueId: string, direction: "up" | "down") => {
		const scheduledArtists = artists
			.filter(
				(a) =>
					compareDates(a.rehearsal_date, selectedDate) &&
					a.rehearsal_order !== null,
			)
			.sort(
				(a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0),
			);
		const currentIndex = scheduledArtists.findIndex(
			(a) => a.uniqueId === uniqueId,
		);

		if (currentIndex === -1) return;

		const newIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= scheduledArtists.length) return;

		// Simple swap orders
		const currentArtist = scheduledArtists[currentIndex];
		const swapArtist = scheduledArtists[newIndex];
		const currentOrder = currentArtist.rehearsal_order!;
		const swapOrder = swapArtist.rehearsal_order!;

		// Update local state immediately (optimistic)
		setArtists((prev) =>
			prev.map((artist) => {
				if (artist.uniqueId === currentArtist.uniqueId) {
					return { ...artist, rehearsal_order: swapOrder };
				}
				if (artist.uniqueId === swapArtist.uniqueId) {
					return { ...artist, rehearsal_order: currentOrder };
				}
				return artist;
			}),
		);

		// Suppress WebSocket refetch so stale GCS data doesn't overwrite
		suppressWebSocketRefetch(5000);

		// Persist both changes via batch endpoint (single GCS read-modify-write)
		try {
			const response = await fetch(
				`/api/events/${eventId}/rehearsals/batch-reorder`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						updates: [
							{
								id: currentArtist.id,
								eventShowId: currentArtist.eventShowId || undefined,
								rehearsal_order: swapOrder,
							},
							{
								id: swapArtist.id,
								eventShowId: swapArtist.eventShowId || undefined,
								rehearsal_order: currentOrder,
							},
						],
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Batch reorder failed");
			}

			// Emit WebSocket event for real-time updates to other browsers
			const wsManager = (window as any).rehearsalWsManager;
			if (wsManager) {
				wsManager.emit("rehearsal_updated", {
					eventId,
					action: "reordered",
					rehearsal_date: selectedDate,
				});
			}
		} catch (error) {
			toast({
				title: "❌ Reorder Failed",
				description: "Failed to update order. Please try again.",
				variant: "destructive",
			});
			// Revert on error
			fetchArtists();
		}
	};

	const moveToRehearsalPosition = async (
		uniqueId: string,
		targetPosition: number,
	) => {
		const sorted = artists
			.filter(
				(a) =>
					compareDates(a.rehearsal_date, selectedDate) &&
					a.rehearsal_order !== null,
			)
			.sort(
				(a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0),
			);

		const currentIndex = sorted.findIndex((a) => a.uniqueId === uniqueId);
		if (currentIndex === -1) return;

		const clampedTarget = Math.max(
			1,
			Math.min(targetPosition, sorted.length),
		);
		const targetIndex = clampedTarget - 1;

		if (targetIndex === currentIndex) {
			setEditingRehearsalPosition(null);
			return;
		}

		// Remove the artist from the list and insert at new position
		const reordered = [...sorted];
		const [moved] = reordered.splice(currentIndex, 1);
		reordered.splice(targetIndex, 0, moved);

		// Assign new sequential orders and update all affected artists
		const updates = reordered.map((artist, idx) => ({
			id: artist.id,
			uniqueId: artist.uniqueId,
			eventShowId: artist.eventShowId,
			newOrder: idx + 1,
		}));

		setEditingRehearsalPosition(null);

		// Update local state immediately
		const updatedArtists = artists.map((artist) => {
			const update = updates.find((u) => u.uniqueId === artist.uniqueId);
			if (update) {
				return { ...artist, rehearsal_order: update.newOrder };
			}
			return artist;
		});
		setArtists(updatedArtists);

		// Suppress WebSocket refetch so stale GCS data doesn't overwrite optimistic state
		suppressWebSocketRefetch(5000);

		// Persist all changes via batch endpoint (single GCS read-modify-write)
		try {
			const response = await fetch(
				`/api/events/${eventId}/rehearsals/batch-reorder`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						updates: updates.map((u) => ({
							id: u.id,
							eventShowId: u.eventShowId || undefined,
							rehearsal_order: u.newOrder,
						})),
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Batch reorder failed");
			}

			toast({
				title: "📋 Position Updated",
				description: `Moved to position #${clampedTarget}`,
				variant: "success",
			});

			// Emit WebSocket event for real-time updates
			const wsManager = (window as any).rehearsalWsManager;
			if (wsManager) {
				wsManager.emit("rehearsal_updated", {
					eventId,
					action: "reordered",
					rehearsal_date: selectedDate,
				});
			}
		} catch (error) {
			toast({
				title: "❌ Position Update Failed",
				description: "Failed to update position. Please try again.",
				variant: "destructive",
			});
			fetchArtists();
		}
	};

	const moveUnscheduledArtist = async (
		uniqueId: string,
		direction: "up" | "down",
	) => {
		// Get unscheduled artists for the selected date (already sorted)
		const filteredUnscheduled = unscheduledArtists;

		const currentIndex = filteredUnscheduled.findIndex(
			(a) => a.uniqueId === uniqueId,
		);
		if (currentIndex === -1) return;

		const newIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= filteredUnscheduled.length) return;

		const currentArtist = filteredUnscheduled[currentIndex];
		const swapArtist = filteredUnscheduled[newIndex];

		// Update local state immediately for responsive UI
		const newArtists = artists.map((artist) => {
			if (artist.uniqueId === currentArtist.uniqueId) {
				return { ...artist, available_order: newIndex };
			}
			if (artist.uniqueId === swapArtist.uniqueId) {
				return { ...artist, available_order: currentIndex };
			}
			return artist;
		});

		setArtists(newArtists);

		// Persist the new order to backend
		try {
			await Promise.all([
				fetch(`/api/events/${eventId}/artists/${currentArtist.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ 
						available_order: newIndex,
						eventShowId: currentArtist.eventShowId || undefined
					}),
				}),
				fetch(`/api/events/${eventId}/artists/${swapArtist.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ 
						available_order: currentIndex,
						eventShowId: swapArtist.eventShowId || undefined
					}),
				}),
			]);
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to update artist order. Please try again.",
				variant: "destructive",
			});
			// Revert on error
			fetchArtists();
		}
	};

	const addToRehearsalOrder = (
		uniqueId: string,
		artistId: string,
		eventShowId?: string | null,
	) => {
		const scheduledForDate = artists.filter(
			(a) =>
				compareDates(a.rehearsal_date, selectedDate) && a.rehearsal_order !== null,
		);

		// Always use the count + 1 to ensure unique sequential ordering
		const nextOrder = scheduledForDate.length + 1;

		scheduleRehearsal(uniqueId, artistId, selectedDate, nextOrder, eventShowId);
	};

	const removeFromRehearsal = async (
		uniqueId: string,
		artistId: string,
		eventShowId?: string | null,
	) => {
		try {
			// Only clear rehearsal fields — do NOT touch performance_order or performance_status
			// Rehearsal and show order are independent workflows
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						rehearsal_date: null,
						rehearsal_order: null,
						rehearsal_completed: false,
						eventShowId: eventShowId || undefined,
					}),
				},
			);

			if (response.ok) {
				setArtists(
					artists.map((artist) =>
						artist.uniqueId === uniqueId
							? {
								...artist,
								rehearsal_date: null,
								rehearsal_order: null,
								rehearsal_completed: false,
							}
							: artist,
					),
				);

				toast({
					title: "🗑️ Removed from Rehearsal",
					description: "Artist removed from rehearsal schedule.",
				});

				// Suppress WebSocket refetch so stale GCS data doesn't overwrite
				suppressWebSocketRefetch(5000);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("rehearsal_updated", {
						eventId,
						artistId,
						action: "removed_from_rehearsal",
						rehearsal_date: null,
						rehearsal_order: null,
						rehearsal_completed: false,
					});
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message ||
					"Failed to remove from rehearsal",
				);
			}
		} catch (error: any) {
			toast({
				title: "❌ Removal Failed",
				description:
					error.message ||
					"Failed to remove artist from rehearsal. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Open rehearsal notes side panel and fetch full details
	const openRehearsalNotes = async (artist: Artist) => {
		setEditingCueNotesArtist(artist);
		setCueNotesValue(artist.cue_notes || "");
		
		const defaultDeptNotes = {
			showcaller: "",
			dj: "",
			sound: "",
			light: "",
			stage_crew: "",
			artists: "",
			sfx: "",
			video: "",
			backstage: "",
			notes: "",
		};

		const existingDeptNotes = artist.rehearsal_dept_notes || {};
		setDeptNotesValue({
			...defaultDeptNotes,
			...existingDeptNotes,
		});

		try {
			const res = await fetch(
				`/api/events/${eventId}/artists/${artist.id}${artist.eventShowId ? `?eventShowId=${artist.eventShowId}` : ""}`,
			);
			if (res.ok) {
				const data = await res.json();
				if (data.success) {
					setCueNotesFullArtist(data.data.artist);
					if (data.data.artist.rehearsal_dept_notes) {
						setDeptNotesValue({
							...defaultDeptNotes,
							...data.data.artist.rehearsal_dept_notes,
						});
					}
				}
			}
		} catch (err) {
			console.error("Error fetching full artist data:", err);
		}
	};

	// Save cue notes from rehearsal page
	const saveCueNotes = async () => {
		if (!editingCueNotesArtist) return;

		// Check if at least one text field is filled
		const hasGeneralNotes = cueNotesValue && cueNotesValue.trim() !== "";
		const hasDeptNotes = deptNotesValue && Object.values(deptNotesValue).some(val => val && val.trim() !== "");
		
		if (!hasGeneralNotes && !hasDeptNotes) {
			toast({
				title: "⚠️ Validation Error",
				description: "Please fill in at least one note field before saving.",
				variant: "destructive",
			});
			return;
		}
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${editingCueNotesArtist.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ 
						cue_notes: cueNotesValue,
						rehearsal_dept_notes: deptNotesValue,
						eventShowId: editingCueNotesArtist.eventShowId || undefined
					}),
				},
			);
			if (response.ok) {
				// Update local state
				setArtists((prev) =>
					prev.map((a) =>
						a.uniqueId === editingCueNotesArtist.uniqueId
							? { ...a, cue_notes: cueNotesValue, rehearsal_dept_notes: deptNotesValue }
							: a,
					),
				);
				// Emit WebSocket event for real-time sync
				const wsManager = (window as any).rehearsalWsManager;
				if (wsManager) {
					wsManager.emit("artist_cue_updated", {
						eventId,
						artistId: editingCueNotesArtist.id,
						eventShowId: editingCueNotesArtist.eventShowId || undefined,
						cue_notes: cueNotesValue,
						rehearsal_dept_notes: deptNotesValue,
					});
				}
				setEditingCueNotesArtist(null);
				toast({
					title: "📝 Rehearsal notes saved",
					description: "Rehearsal notes and department notes updated.",
					variant: "success",
				});
			} else {
				throw new Error("Failed to save rehearsal notes");
			}
		} catch (error) {
			toast({
				title: "❌ Error",
				description: "Failed to save rehearsal notes. Please try again.",
				variant: "destructive",
			});
		}
	};

	const viewArtistDetails = async (artistId: string, eventShowId?: string | null) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}${eventShowId ? `?eventShowId=${eventShowId}` : ""}`,
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

	const renderStarRating = (
		uniqueId: string,
		artistId: string,
		currentRating: number | null,
		eventShowId?: string | null,
	) => {
		return (
			<div className="flex items-center gap-1">
				{[3, 2, 1].map((starValue) => {
					const isActive = currentRating === starValue;
					const colors = {
						1: "text-green-500",
						2: "text-yellow-500",
						3: "text-blue-500",
					};

					return (
						<button
							key={starValue}
							onClick={() =>
								updateQualityRating(uniqueId, artistId, starValue, eventShowId)
							}
							className="hover:scale-110 transition-transform"
						>
							<Star
								className={`h-4 w-4 ${isActive
										? `fill-current ${colors[
										starValue as keyof typeof colors
										]
										}`
										: "text-gray-300 hover:text-gray-400"
									}`}
							/>
						</button>
					);
				})}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading rehearsal schedule...
					</p>
				</div>
			</div>
		);
	}

	// Filter artists based on selected rehearsal date
	const artistsForSelectedDate = artists.filter((a) => {
		if (!selectedDate) return false;

		// Normalize both dates for comparison
		const normalizedSelectedDate = normalizeDateString(selectedDate);
		const normalizedPerformanceDate = a.performance_date
			? normalizeDateString(a.performance_date)
			: null;

		// Debug logging
		console.log("Date comparison debug:", {
			selectedDate,
			normalizedSelectedDate,
			artistId: a.id,
			artistName: a.artist_name,
			performanceDate: a.performance_date,
			normalizedPerformanceDate,
			matches: normalizedPerformanceDate === normalizedSelectedDate,
		});

		// Show artists who have a performance date matching the selected show date
		return normalizedPerformanceDate === normalizedSelectedDate;
	});

	const unscheduledArtists = artistsForSelectedDate
		.filter(
			(a) =>
				a.rehearsal_date === null || compareDatesNotEqual(a.rehearsal_date, selectedDate),
		)
		.sort((a, b) => {
			// Sort by available_order if both have it
			if (a.available_order !== null && b.available_order !== null) {
				return a.available_order - b.available_order;
			}
			// Put items with available_order first
			if (a.available_order !== null) return -1;
			if (b.available_order !== null) return 1;
			// Otherwise maintain original order
			return 0;
		});

	// For scheduled artists, show ALL artists with rehearsal_date matching selected date
	// regardless of their performance_date (they might rehearse on a different day)
	const scheduledArtists = artists
		.filter(
			(a) =>
				a.rehearsal_date !== null && compareDates(a.rehearsal_date, selectedDate),
		)
		.sort((a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0));

	const rehearsalLiveTimings = calculateLiveTimings(
		scheduledArtists.map(
			(artist) => ({
				id: artist.uniqueId,
				type: "artist" as const,
				artist: {
					id: artist.uniqueId,
					artist_name:
						artist.artist_name,
					performance_duration:
						artist.performance_duration ||
						5,
					actual_duration:
						artist.actual_duration ||
						undefined,
					quality_rating:
						artist.quality_rating,
					performance_order:
						artist.rehearsal_order ||
						0,
					rehearsal_completed:
						artist.rehearsal_completed,
				},
				performance_order:
					artist.rehearsal_order ||
					0,
			}),
		),
		rehearsalTimings.show_start_time,
		rehearsalTimeOverrides,
	);

	const handleExportRehearsalPDF = async () => {
		if (!selectedDate) return;
		setIsGeneratingRehearsalPDF(true);
		try {
			toast({
				title: "Generating PDF...",
				description:
					"Please wait while we create your rehearsal schedule PDF",
			});

			const performancesWithDetails = await Promise.all(
				scheduledArtists.map(async (artist, index) => {
					let homeCountryName: string | undefined;
					let countryLivingName: string | undefined;
					try {
						const response = await fetch(
							`/api/events/${eventId}/artists/${artist.id}${artist.eventShowId ? `?eventShowId=${artist.eventShowId}` : ""}`,
						);
						const result = await response.json();
						if (result.success && result.data?.artist) {
							const full = result.data.artist;
							const hc = full.homeCountry || full.home_country;
							const cl =
								full.countryLiving || full.country_living;
							if (hc) homeCountryName = getCountryName(hc);
							if (cl) countryLivingName = getCountryName(cl);
						}
					} catch (error) {
						console.error(
							"Error fetching artist details for PDF:",
							error,
						);
					}
					return {
						id: artist.uniqueId,
						order: index + 1,
						name: artist.artist_name,
						style: artist.style,
						duration:
							artist.actual_duration ||
							artist.performance_duration * 60,
						homeCountryName,
						countryLivingName,
					};
				}),
			);

			// Compute planned times
			const startTime = rehearsalTimings.show_start_time;
			if (startTime) {
				const [startH, startM] = startTime.split(":").map(Number);
				let cursorSec = (startH * 60 + startM) * 60;
				for (const perf of performancesWithDetails) {
					const override = rehearsalTimeOverrides[perf.id];
					if (override) {
						const [oh, om] = override.split(":").map(Number);
						if (!isNaN(oh) && !isNaN(om)) {
							cursorSec = (oh * 60 + om) * 60;
						}
					}
					const normalized = ((cursorSec % 86400) + 86400) % 86400;
					const h = Math.floor(normalized / 3600);
					const m = Math.floor((normalized % 3600) / 60);
					(perf as any).plannedTime =
						`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
					cursorSec += perf.duration;
				}
			}

			// Store PDF data in sessionStorage for preview page
			sessionStorage.setItem(
				`rehearsal-pdf-data-${eventId}`,
				JSON.stringify({
					eventName: event?.name || "Event",
					eventDate: formatDateSimple(selectedDate),
					performances: performancesWithDetails,
					rehearsalStartTime: startTime,
					venue: event?.venue,
				}),
			);

			// Open preview page in new tab
			const previewUrl = `/stage-manager/events/${eventId}/rehearsal/pdf-preview`;
			window.open(previewUrl, "_blank");

			toast({
				title: "✅ PDF Preview Opening!",
				description:
					"Opening rehearsal schedule PDF preview in new tab...",
			});
		} catch (error) {
			console.error("Rehearsal PDF generation error:", error);
			toast({
				title: "❌ PDF Generation Failed",
				description: "Failed to generate PDF. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsGeneratingRehearsalPDF(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-border bg-white">
				<div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 sm:gap-4 min-w-0">
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
							<div className="min-w-0">
								<h1 className="text-base sm:text-2xl font-bold text-foreground truncate">
									Rehearsal Schedule
								</h1>
								<p className="text-[10px] sm:text-sm text-muted-foreground truncate">
									{event?.name}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1 sm:gap-2 shrink-0">
							<div className="flex flex-wrap items-center gap-1 sm:gap-2 mr-1 sm:mr-2">
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
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-blue-900 to-slate-900 text-white border-0 shadow-sm rounded-full ring-2 ring-blue-300 ring-offset-1 pointer-events-none"
									disabled
									title="Step 3: Rehearsals (Current)"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										3.
									</span>
									Rehearsals
								</Button>
								<Button
									size="sm"
									className="text-xs h-8 px-2 sm:px-3 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 shadow-sm rounded-full"
									onClick={() =>
										onTabChange
											? onTabChange("Stage")
											: router.push(
												`/stage-manager/events/${eventId}/performance-order`,
											)
									}
									title="Step 4: Stage"
								>
									<span className="font-semibold mr-1 hidden sm:inline">
										4.
									</span>
									Stage
								</Button>
							</div>

							<EventChecklistButton eventId={eventId} />
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Calendar className="h-8 w-8 text-blue-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Assigned Artists
									</p>
									<p className="text-2xl font-bold text-foreground">
										{artists.length}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Clock className="h-8 w-8 text-yellow-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Scheduled for Rehearsal
									</p>
									<p className="text-2xl font-bold text-foreground">
										{
											artists.filter(
												(a) => a.rehearsal_date,
											).length
										}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<CheckCircle className="h-8 w-8 text-green-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Rehearsals Completed
									</p>
									<p className="text-2xl font-bold text-foreground">
										{
											artists.filter(
												(a) => a.rehearsal_completed,
											).length
										}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-8">
					{/* Date Selection & Scheduled Artists */}
					<div className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5" />
										Rehearsal Date
									</CardTitle>
									<CardDescription>
										Select a show date to schedule
										rehearsals
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Select
										value={selectedDate}
										onValueChange={(value) => {
											setSelectedDate(value);
											saveSelectedDateToStorage(
												eventId,
												value,
											);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select rehearsal date" />
										</SelectTrigger>
										<SelectContent>
											{event?.show_dates?.map((date) => (
												<SelectItem
													key={date}
													value={date}
												>
													{formatDateForDropdown(
														date,
													)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</CardContent>
							</Card>

							{/* Live Board Quick Access */}
							{selectedDate && (
								<Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-purple-700">
											<Eye className="h-5 w-5" />
											Live Performance Board
										</CardTitle>
										<CardDescription>
											Quick access to the live board for
											this rehearsal date
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex gap-2">
											<Button
												onClick={() =>
													router.push(
														`/stage-manager/events/${eventId}/performance-order/live-board`,
													)
												}
												className="flex-1 bg-purple-600 hover:bg-purple-700"
											>
												<Eye className="h-4 w-4 mr-2" />
												Open Live Board
											</Button>
											<QRCodeDialog
												url={`${typeof window !== "undefined" ? window.location.origin : ""}/stage-manager/events/${eventId}/performance-order/live-board`}
												title="Live Performance Board"
												description="Scan this QR code to quickly access the live board on any device"
												triggerText="QR"
												triggerVariant="outline"
												triggerClassName="border-purple-300 text-purple-700 hover:bg-purple-100"
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											View real-time performance status
											and rehearsal progress
										</p>
									</CardContent>
								</Card>
							)}
						</div>

						{selectedDate && (
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Clock className="h-5 w-5" />
												Rehearsal Schedule -{" "}
												{formatDateSimple(selectedDate)}
											</CardTitle>
											<CardDescription>
												Artists scheduled for rehearsal
												in order
											</CardDescription>
										</div>
										<div className="flex items-center gap-2">
											{rehearsalTimings.show_start_time && (
												<Badge
													variant="outline"
													className="font-mono text-sm"
												>
													Start:{" "}
													{
														rehearsalTimings.show_start_time
													}
												</Badge>
											)}
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setRehearsalStartTimeInput(
														rehearsalTimings.show_start_time ||
														"",
													);
													setShowRehearsalTimingSettings(
														true,
													);
												}}
												title="Set rehearsal start time"
											>
												<Settings className="h-4 w-4" />
											</Button>

											{selectedDate && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														setIsAvailableArtistsOpen(
															true,
														)
													}
													className="relative"
													title="View available artists"
												>
													<User className="h-4 w-4 mr-1" />
													Available Artists
													{unscheduledArtists.length >
														0 && (
															<span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-xs font-semibold">
																{
																	unscheduledArtists.length
																}
															</span>
														)}
												</Button>
											)}
											<Button
												size="sm"
												onClick={
													handleExportRehearsalPDF
												}
												disabled={
													isGeneratingRehearsalPDF ||
													scheduledArtists.length ===
													0
												}
												className="bg-purple-600 hover:bg-purple-700 text-white"
												title="Print rehearsal schedule PDF"
											>
												<Printer className="h-4 w-4 mr-1" />
												{isGeneratingRehearsalPDF
													? "Printing..."
													: "Print PDF"}
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={handleManualRefresh}
												disabled={refreshing}
												className="flex items-center gap-2"
											>
												<RefreshCw
													className={`h-4 w-4 ${refreshing
															? "animate-spin"
															: ""
														}`}
												/>
												{refreshing
													? "Refreshing..."
													: "Refresh"}
											</Button>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{scheduledArtists.length === 0 ? (
										<p className="text-muted-foreground text-center py-4">
											No artists scheduled for rehearsal
											yet
										</p>
									) : (
										<div className="space-y-3">
											{scheduledArtists.map(
												(artist, index) => (
														<div
															key={artist.uniqueId}
															className={`flex items-center gap-3 p-3 border rounded-lg ${artist.rehearsal_marked ? "bg-green-50 border-green-200" : "bg-blue-50"}`}
														>
															<div className="flex items-center gap-2">
																{/* Mark Checkbox (persisted, synced via WebSocket) */}
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		toggleRehearsalMarked(
																			artist.uniqueId,
																			artist.id,
																			artist.rehearsal_marked,
																			artist.eventShowId,
																		)
																	}
																	className={`h-6 w-6 p-0 rounded border-2 ${artist.rehearsal_marked
																			? "bg-green-500 border-green-500 text-white hover:bg-green-600"
																			: "bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50"
																		}`}
																	title={
																		artist.rehearsal_marked
																			? "Unmark"
																			: "Mark"
																	}
																>
																	{artist.rehearsal_marked ? (
																		<Check className="h-3 w-3" />
																	) : null}
																</Button>
																{/* Position Number - Click to edit */}
																{editingRehearsalPosition ===
																	artist.uniqueId ? (
																	<div className="flex items-center gap-1">
																		<input
																			type="number"
																			min="1"
																			max={
																				scheduledArtists.length
																			}
																			value={
																				newRehearsalPosition
																			}
																			onChange={(
																				e,
																			) => {
																				const val =
																			e
																						.target
																						.value;
																				setNewRehearsalPosition(
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
																			) =>
																				e.target.select()
																			}
																			onKeyDown={(
																				e,
																			) => {
																				if (
																					e.key ===
																					"Enter"
																				) {
																					moveToRehearsalPosition(
																						artist.uniqueId,
																						newRehearsalPosition,
																					);
																				} else if (
																					e.key ===
																					"Escape"
																				) {
																					setEditingRehearsalPosition(
																						null,
																					);
																				}
																			}}
																			className="w-16 h-8 text-sm text-center border border-blue-400 rounded bg-white"
																			autoFocus
																			placeholder={`1-${scheduledArtists.length}`}
																		/>
																		<button
																			onClick={() =>
																				moveToRehearsalPosition(
																					artist.uniqueId,
																					newRehearsalPosition,
																				)
																			}
																			className="h-7 px-1 text-green-600 hover:text-green-700"
																		>
																			<CheckCircle className="h-3.5 w-3.5" />
																		</button>
																		<button
																			onClick={() =>
																				setEditingRehearsalPosition(
																					null,
																				)
																			}
																			className="h-7 px-1 text-gray-500 hover:text-gray-600"
																		>
																			✕
																		</button>
																	</div>
																) : (
																	<button
																		onClick={() => {
																			setEditingRehearsalPosition(
																				artist.uniqueId,
																			);
																			setNewRehearsalPosition(
																				index +
																				1,
																			);
																		}}
																		className="text-sm font-mono bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded cursor-pointer transition-all border border-blue-300 hover:border-blue-400 font-semibold min-w-[2rem] text-center"
																		title={`Click to enter position number (1-${scheduledArtists.length})`}
																	>
																		#
																		{index +
																			1}
																	</button>
																)}
																{rehearsalLiveTimings[
																	index
																]
																	?.startTime && (
																		<div className="flex items-center gap-0.5">
																			{editingRehearsalTimeId ===
																				artist.uniqueId ? (
																				<input
																					type="time"
																					className="text-xs font-mono px-1 py-0.5 rounded border border-blue-400 bg-blue-50 w-[72px] focus:outline-none focus:ring-1 focus:ring-blue-500"
																					value={
																						editingRehearsalTimeValue
																					}
																					onChange={(
																						e,
																					) =>
																						setEditingRehearsalTimeValue(
																							e
																								.target
																								.value,
																						)
																					}
																					onBlur={() => {
																						if (
																							editingRehearsalTimeValue
																						) {
																							saveRehearsalTimeOverride(
																								artist.uniqueId,
																								editingRehearsalTimeValue,
																							);
																						} else {
																							setEditingRehearsalTimeId(
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
																								editingRehearsalTimeValue
																							) {
																								saveRehearsalTimeOverride(
																									artist.uniqueId,
																									editingRehearsalTimeValue,
																								);
																							} else {
																								setEditingRehearsalTimeId(
																									null,
																								);
																							}
																						} else if (
																							e.key ===
																							"Escape"
																						) {
																							setEditingRehearsalTimeId(
																								null,
																							);
																						}
																					}}
																					autoFocus
																				/>
																			) : (
																				<span
																					className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-blue-400 ${rehearsalTimeOverrides[
																							artist
																								.uniqueId
																						]
																							? "bg-yellow-100 text-yellow-800 border border-yellow-400"
																							: "bg-gray-100 text-gray-600 border border-gray-300"
																						}`}
																					title={`${rehearsalLiveTimings[index]?.startTime} - ${rehearsalLiveTimings[index]?.endTime}${rehearsalTimeOverrides[artist.uniqueId] ? " (auto-set)" : " (planned)"} — Click to edit`}
																					onClick={() => {
																						setEditingRehearsalTimeId(
																							artist.uniqueId,
																						);
																						setEditingRehearsalTimeValue(
																							rehearsalLiveTimings[
																								index
																							]
																								?.startTime ||
																							"",
																						);
																					}}
																				>
																					{
																						rehearsalLiveTimings[
																							index
																						]
																							?.startTime
																					}
																				</span>
																			)}
																			{rehearsalTimeOverrides[
																				artist
																					.uniqueId
																			] && (
																					<button
																						onClick={() =>
																							saveRehearsalTimeOverride(
																								artist.uniqueId,
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
																	)}
															</div>
															<div 
																className="flex-1 cursor-pointer select-none group/notes"
																onClick={() => openRehearsalNotes(artist)}
															>
																<div className="font-medium group-hover/notes:text-purple-600 transition-colors">
																	{
																		artist.artist_name
																	}
																</div>
																<div className="text-sm text-muted-foreground">
																	{/* {artist.style} •{" "}
																{
																	artist.performance_duration
																}{" "}
																min */}
																	{artist.actual_duration && (
																		<span className="text-muted-foreground ml-1">
																			(
																			{formatDuration(
																				artist.actual_duration,
																			)}
																			)
																		</span>
																	)}
																</div>
																{artist.cue_notes && (
																	<div
																		className="text-xs text-muted-foreground italic truncate max-w-[250px] mt-0.5"
																		title={
																			artist.cue_notes
																		}
																	>
																		📝{" "}
																		{
																			artist.cue_notes
																		}
																	</div>
																)}
															</div>
															<div className="flex items-center gap-2">
																{artist.rehearsal_completed && (
																	<Badge
																		variant="secondary"
																		className="flex items-center gap-1"
																	>
																		<CheckCircle className="h-3 w-3" />
																		Completed
																	</Badge>
																)}
																{renderStarRating(
																	artist.uniqueId,
																	artist.id,
																	artist.quality_rating,
																	artist.eventShowId,
																)}
																{/* Check-in indicators */}
																{(() => {
																	const cs =
																		getCheckInStatus(
																			artist.id,
																		);
																	return (
																		<div className="flex items-center gap-1">
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
																		</div>
																	);
																})()}
																{/* Call & Check-in buttons */}
																<CallArtistButton
																	eventId={
																		eventId
																	}
																	artistId={
																		artist.id
																	}
																	artistName={
																		artist.artist_name
																	}
																	callType="rehearsal"
																/>
																<Button
																	size="icon"
																	variant="ghost"
																	className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
																	onClick={() =>
																		setCheckInDialogArtist(
																			artist,
																		)
																	}
																	title={`Check in ${artist.artist_name}`}
																>
																	<QrCode className="h-4 w-4" />
																</Button>
																<div className="flex gap-1">
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() => openRehearsalNotes(artist)}
																		title="Edit Cue Notes"
																	>
																		<FileEdit className="h-4 w-4" />
																	</Button>
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() =>
																			viewArtistDetails(
																				artist.id,
																				artist.eventShowId,
																			)
																		}
																		title="View Details"
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																	<Button
																		size="sm"
																		variant={
																			artist.rehearsal_completed
																				? "secondary"
																				: "default"
																		}
																		onClick={() =>
																			toggleRehearsalStatus(
																				artist.uniqueId,
																				artist.id,
																				artist.rehearsal_completed,
																				artist.eventShowId,
																			)
																		}
																	>
																		{artist.rehearsal_completed
																			? "Completed"
																			: "Mark Complete"}
																	</Button>
																	<Button
																		size="sm"
																		variant="destructive"
																		onClick={() =>
																			removeFromRehearsal(
																				artist.uniqueId,
																				artist.id,
																				artist.eventShowId,
																			)
																		}
																	>
																		Remove
																	</Button>
																</div>
															</div>
														</div>
													),
												)}
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</main>

			{/* Available Artists Dialog */}
			<Dialog
				open={isAvailableArtistsOpen}
				onOpenChange={setIsAvailableArtistsOpen}
			>
				<DialogContent className="max-w-lg max-h-[80vh]">
					<DialogHeader>
						<DialogTitle>
							Available Artists - {formatDateSimple(selectedDate)}
						</DialogTitle>
						<DialogDescription>
							Artists assigned to this show date but not yet
							scheduled for rehearsal
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[calc(5*76px)] overflow-y-auto space-y-3 pr-1">
						{unscheduledArtists.length === 0 ? (
							<p className="text-muted-foreground text-center py-4">
								All artists for this date are scheduled for
								rehearsal
							</p>
						) : (
							unscheduledArtists.map((artist) => (
								<div
									key={artist.uniqueId}
									className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
								>
									<div className="flex-1">
										<div className="font-medium">
											{artist.artist_name}
										</div>
										<div className="text-sm text-muted-foreground">
											{artist.actual_duration && (
												<span className="text-muted-foreground ml-1">
													(
													{formatDuration(
														artist.actual_duration,
													)}
													)
												</span>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												viewArtistDetails(artist.id, artist.eventShowId)
											}
											title="View Details"
										>
											<Eye className="h-4 w-4" />
										</Button>
										<Button
											size="sm"
											onClick={() => {
												addToRehearsalOrder(artist.uniqueId, artist.id, artist.eventShowId);
											}}
											disabled={!selectedDate}
										>
											Schedule
										</Button>
									</div>
								</div>
							))
						)}
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
								<TabsTrigger value="music">Music</TabsTrigger>
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
							<TabsContent value="overview" className="space-y-6">
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
													<Mail className="h-4 w-4" />
													Email
												</p>
												<EmailLink
													email={selectedArtist.email}
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
													{selectedArtist.musicTrack
														?.duration
														? formatDuration(
															selectedArtist
																.musicTrack
																.duration,
														)
														: selectedArtist.musicTracks?.find(
															(t: any) =>
																t.is_main_track,
														)?.duration
															? formatDuration(
																selectedArtist.musicTracks.find(
																	(
																		t: any,
																	) =>
																		t.is_main_track,
																).duration,
															)
															: selectedArtist.performanceDuration ||
																selectedArtist.performance_duration
																? `${selectedArtist.performanceDuration ||
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
															Nationality Information
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
																		Living in{" "}
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
														Scan to access artist dashboard
													</CardDescription>
												</CardHeader>
												<CardContent className="space-y-4">
													<div
														data-qr-rehearsal
														className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-300"
													>
														<QRCodeSVG
															value={dashboardUrl}
															size={160}
															level="H"
															includeMargin={true}
														/>
														<p className="text-xs text-muted-foreground mt-3 text-center">
															Scan this QR code to access
															the artist dashboard
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
																		"[data-qr-rehearsal]",
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
																	img.onload = () => {
																		canvas.width = 200;
																		canvas.height = 200;
																		const ctx =
																			canvas.getContext(
																				"2d",
																			);
																		if (ctx) {
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
																			toast({
																				title: "✅ QR Code Downloaded",
																				description:
																					"QR code has been saved to your downloads",
																				variant:
																					"success",
																			});
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
							<TabsContent value="music" className="space-y-6">
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
													{selectedArtist.musicTrack
														.notes && (
															<p className="text-sm text-muted-foreground">
																{
																	selectedArtist
																		.musicTrack
																		.notes
																}
															</p>
														)}
													{selectedArtist.musicTrack
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
																<div className="flex justify-end">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={async () => {
																			const {
																				downloadFile,
																			} =
																				await import("@/lib/media-utils");
																			await downloadFile(
																				selectedArtist
																					.musicTrack
																					.file_url,
																				`${selectedArtist.artistName || selectedArtist.artist_name} - ${selectedArtist.musicTrack.song_title || selectedArtist.artistName || selectedArtist.artist_name}`,
																				selectedArtist.artistName || selectedArtist.artist_name || (selectedArtist as any).realName
																			);
																		}}
																	>
																		<Download className="h-4 w-4 mr-2" />
																		Download
																	</Button>
																</div>
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
																		- Tempo:{" "}
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
																	<div className="flex justify-end">
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={async () => {
																				const {
																					downloadFile,
																				} =
																					await import("@/lib/media-utils");
																				await downloadFile(
																					track.file_url,
																					track.song_title,
																					selectedArtist.artistName || selectedArtist.artist_name || (selectedArtist as any).realName
																				);
																			}}
																			className="flex items-center gap-2"
																		>
																			<Download className="h-3 w-3" />
																			Download
																		</Button>
																	</div>
																</div>
															)}
														</div>
													),
												)
											) : (
												<p className="text-center text-muted-foreground py-8">
													No music tracks uploaded yet
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
														{(selectedArtist as any)
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
														{(selectedArtist as any)
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
														{(selectedArtist as any)
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
														{(selectedArtist as any)
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
														{(selectedArtist as any)
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
														{(selectedArtist as any)
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
														Custom Position Details
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
							<TabsContent value="gallery" className="space-y-6">
								{/* Rehearsal Video Section */}
								{selectedArtist.rehearsalVideo && (
									<Card className="border-2 border-amber-100">
										<CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
											<CardTitle className="flex items-center gap-2">
												<Play className="h-5 w-5 text-amber-600" />
												Rehearsal / Show Video
											</CardTitle>
											<CardDescription>
												Video for show order planning
												and lighting setup
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
															.rehearsalVideo.url,
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
																	file={file}
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
																	file={file}
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
																	{file.name}
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
							<TabsContent value="event" className="space-y-6">
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
												Event Name
											</p>
											<p className="font-medium text-lg">
												{event?.name}
											</p>
										</div>
										{(selectedArtist.performanceDate ||
											selectedArtist.performance_date) && (
												<div>
													<p className="text-sm text-muted-foreground">
														Assigned Performance Date
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
												).toLocaleDateString("en-US", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					)}

					<DialogFooter>
						<Button onClick={() => setIsDetailDialogOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rehearsal Timing Settings Dialog */}
			<Dialog
				open={showRehearsalTimingSettings}
				onOpenChange={setShowRehearsalTimingSettings}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rehearsal Timing Settings</DialogTitle>
						<DialogDescription>
							Set the rehearsal start time for{" "}
							{selectedDate
								? formatDateSimple(selectedDate)
								: "this day"}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="rehearsal-start">
								Rehearsal Start Time
							</Label>
							<Input
								id="rehearsal-start"
								type="time"
								value={rehearsalStartTimeInput}
								onChange={(e) =>
									setRehearsalStartTimeInput(e.target.value)
								}
							/>
						</div>
					</div>
					<div className="flex gap-2 pt-4">
						<Button
							onClick={saveRehearsalStartTime}
							className="flex-1"
						>
							Save Rehearsal Timing
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								setShowRehearsalTimingSettings(false)
							}
						>
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Cue Notes Side Panel */}
			{editingCueNotesArtist && (
				<div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
					{/* Backdrop overlay clicking closes the side panel */}
					<div 
						className="absolute inset-0" 
						onClick={() => {
							setEditingCueNotesArtist(null);
							setCueNotesFullArtist(null);
						}}
					/>
					
					{/* Side Panel Sheet */}
					<div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out slide-in-from-right animate-in">
						
						{/* Header */}
						<div className="p-4 border-b flex items-center justify-between shrink-0">
							<div className="flex items-center gap-3">
								{/* Artist initials / avatar */}
								<div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
									{editingCueNotesArtist.artist_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="font-bold text-gray-950 text-base leading-tight">
											{editingCueNotesArtist.artist_name}
										</h3>
										{cueNotesFullArtist?.performanceType && (
											<Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-200 text-purple-600 bg-purple-50">
												{cueNotesFullArtist.performanceType}
											</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										Rehearsal {(rehearsalLiveTimings[scheduledArtists.findIndex(a => a.uniqueId === editingCueNotesArtist.uniqueId)]?.startTime) || "TBD"}
										{editingCueNotesArtist.actual_duration ? ` • ${formatDuration(editingCueNotesArtist.actual_duration)}` : ""}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setEditingCueNotesArtist(null);
									setCueNotesFullArtist(null);
								}}
								className="h-8 w-8 text-gray-500 hover:text-gray-900 rounded-full"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* Scrollable Form Content */}
						<div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
							{/* Read-only reference notes in a foldout/summary */}
							{cueNotesFullArtist && (
								<div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2.5 text-xs text-gray-600">
									<div className="font-semibold text-gray-800 uppercase tracking-wider text-[10px]">Reference Info</div>
									{cueNotesFullArtist.notes && (
										<div>
											<span className="font-bold text-blue-700">Artist Notes: </span>
											<span>{cueNotesFullArtist.notes}</span>
										</div>
									)}
									{(cueNotesFullArtist.mcNotes || cueNotesFullArtist.mc_notes) && (
										<div>
											<span className="font-bold text-orange-700">MC Notes: </span>
											<span>{cueNotesFullArtist.mcNotes || cueNotesFullArtist.mc_notes}</span>
										</div>
									)}
									{(cueNotesFullArtist.stageManagerNotes || cueNotesFullArtist.stage_manager_notes) && (
										<div>
											<span className="font-bold text-purple-700">Stage Manager Notes: </span>
											<span>{cueNotesFullArtist.stageManagerNotes || cueNotesFullArtist.stage_manager_notes}</span>
										</div>
									)}
									{(cueNotesFullArtist.equipment || cueNotesFullArtist.props_needed) && (
										<div>
											<span className="font-bold text-green-700">Props & Equipment: </span>
											<span>{cueNotesFullArtist.equipment || cueNotesFullArtist.props_needed}</span>
										</div>
									)}
								</div>
							)}

							{/* General Rehearsal Notes */}
							<div className="space-y-2">
								<Label htmlFor="general-rehearsal-notes" className="text-sm font-semibold text-gray-800">
									General Rehearsal Notes
								</Label>
								<Textarea
									id="general-rehearsal-notes"
									value={cueNotesValue}
									onChange={(e) => setCueNotesValue(e.target.value)}
									placeholder="Overall rehearsal observations..."
									rows={3}
									className="bg-gray-50 border-gray-200 focus:bg-white transition-all text-sm rounded-xl focus:ring-purple-500 focus:border-purple-500"
								/>
							</div>

							{/* Department Notes Title */}
							<div className="pt-2 border-t border-gray-100">
								<span className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-1.5 uppercase">
									<FileEdit className="h-3.5 w-3.5" />
									<span>Department Notes</span>
								</span>
							</div>

							{/* Department Notes Inputs */}
							<div className="space-y-4">
								{[
									{ key: "showcaller", label: "Showcaller", placeholder: "Notes for Showcaller..." },
									{ key: "dj", label: "DJ", placeholder: "Notes for DJ..." },
									{ key: "sound", label: "Sound", placeholder: "Notes for Sound..." },
									{ key: "light", label: "Light", placeholder: "Notes for Light..." },
									{ key: "stage_crew", label: "Stage Crew", placeholder: "Notes for Stage Crew..." },
									{ key: "artists", label: "Artists", placeholder: "Notes for Artists..." },
									{ key: "sfx", label: "SFX", placeholder: "Notes for SFX..." },
									{ key: "video", label: "Video", placeholder: "Notes for Video..." },
									{ key: "backstage", label: "Backstage", placeholder: "Notes for Backstage..." },
									{ key: "notes", label: "Notes", placeholder: "Notes for Notes..." }
								].map((dept) => (
									<div key={dept.key} className="space-y-1.5">
										<Label htmlFor={`dept-notes-${dept.key}`} className="text-xs font-medium text-gray-700">
											{dept.label}
										</Label>
										<Input
											id={`dept-notes-${dept.key}`}
											value={deptNotesValue[dept.key as keyof typeof deptNotesValue] || ""}
											onChange={(e) => {
												setDeptNotesValue(prev => ({
													...prev,
													[dept.key]: e.target.value
												}));
											}}
											placeholder={dept.placeholder}
											className="bg-gray-100/60 border-0 text-sm h-9 rounded-lg focus:bg-white focus:ring-1 focus:ring-purple-400 focus:border-purple-400 placeholder:text-gray-400 transition-all"
										/>
									</div>
								))}
							</div>
						</div>

						{/* Sticky Footer */}
						<div className="p-4 bg-white border-t border-gray-100 flex items-center justify-center shadow-lg shrink-0">
							<Button
								onClick={saveCueNotes}
								className="w-full bg-[#e879f9] hover:bg-[#d946ef] text-white font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
							>
								<Check className="h-4 w-4" />
								<span>Save Notes</span>
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
					artistId={checkInDialogArtist!.id}
					artistName={checkInDialogArtist!.artist_name}
					rehearsalCheckedIn={
						getCheckInStatus(checkInDialogArtist!.id)
							.rehearsalCheckedIn
					}
					performanceCheckedIn={
						getCheckInStatus(checkInDialogArtist!.id)
							.performanceCheckedIn
					}
					onCheckInComplete={(type, checkedIn) => {
						markCheckInLocal(
							checkInDialogArtist!.id,
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
						<div className="py-2">
							<p className="text-lg md:text-xl font-extrabold text-gray-900 leading-snug break-words text-left">
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
		</div>
	);
}
