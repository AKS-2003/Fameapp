"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Clock,
	Users,
	AlertTriangle,
	Video,
	RefreshCw,
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Mic,
	Speaker,
	Play,
	Timer,
	Sparkles,
	CheckCircle,
	Trash2,
	Music,
	Calendar,
	Star,
	Globe,
	Download,
	Maximize,
	Minimize,
	ListTodo,
	Search,
	Check,
	X,
	Sun,
	Moon,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple } from "@/lib/date-utils";
import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusBadgeVariant,
} from "@/lib/status-utils";
import {
	calculateTotalShowTime,
	formatTotalTime,
	formatDuration,
	getDisplayDuration,
	calculateLiveTimings,
} from "@/lib/timing-utils";
import {
	findBestDateToSelect,
	saveSelectedDateToStorage,
	subscribeToDateChanges,
} from "@/lib/date-selection-utils";
import { CueColorBadge, isLightColor } from "@/components/ui/cue-color-picker";
import { FameLogo } from "@/components/ui/fame-logo";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { usePerformanceOrderPDF } from "@/hooks/usePerformanceOrderPDF";

interface Artist {
	id: string;
	artist_name: string;
	style: string;
	image_url?: string;
	performance_order: number | null;
	props_needed?: string;
	performance_notes?: string;
	performance_duration: number;
	actual_duration?: number | null;
	quality_rating: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	mc_notes?: string | null;
	biography?: string | null;
	artist_notes?: string | null;
	backstage_color?: string;
	country_living?: string;
	home_country?: string;
	nationality?: string;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}> | null;
	eventShowId?: string;
}

interface Cue {
	id: string;
	type: string;
	title: string;
	duration: number;
	extraTime?: number; // buffer time in seconds, added on top of duration
	performance_order: number;
	notes?: string;
	color?: string;
	is_completed?: boolean;
	performance_status?: string | null;
	mc_notes?: string | null;
	performance_date?: string | null;
}

interface PerformanceItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
	status?:
		| "completed"
		| "currently_on_stage"
		| "next_on_stage"
		| "next_on_deck"
		| "not_started";
}

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
}

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

interface ShowDateInfo {
	id: string;
	eventId: string;
	showDate: string;
	rehearsalTiming: string;
	location: string;
	showtime: string;
	backstageReadyTime: string;
	stageManagerName: string;
	stageManagerContact: string;
	notes: string;
	attachments: Array<{
		id: string;
		fileName: string;
		originalName: string;
		fileUrl: string;
		uploadedAt: string;
	}>;
	createdAt: string;
	updatedAt: string;
}

interface RehearsalArtist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	actual_duration: number | null;
	quality_rating: number | null;
	rehearsal_date: string | null;
	rehearsal_order: number | null;
	rehearsal_completed: boolean;
	performance_date: string | null;
	country_living?: string;
	home_country?: string;
	nationality?: string;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}> | null;
	eventShowId?: string;
}

export default function LivePerformanceBoard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>(
		[],
	);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [currentPerformerIndex, setCurrentPerformerIndex] = useState(0);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [availableDates, setAvailableDates] = useState<string[]>([]);
	const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
	const [newBroadcast, setNewBroadcast] = useState({
		message: "",
		emergency_code: "green",
	});
	const [wsConnected, setWsConnected] = useState(false);
	const [currentTime, setCurrentTime] = useState<Date | null>(null); // Start as null to avoid hydration mismatch
	const [eventTimings, setEventTimings] = useState<{
		backstage_ready_time?: string;
		show_start_time?: string;
		rehearsal_start_time?: string;
	}>({});
	const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>(
		{},
	);
	const [rehearsalTimeOverrides, setRehearsalTimeOverrides] = useState<
		Record<string, string>
	>({});
	const [showDateInfo, setShowDateInfo] = useState<ShowDateInfo | null>(null);
	const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time for current performer
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [activeTab, setActiveTab] = useState("live-board");
	const [rehearsalArtists, setRehearsalArtists] = useState<RehearsalArtist[]>(
		[],
	);
	const [selectedRehearsalDate, setSelectedRehearsalDate] =
		useState<string>("");
	const [rehearsalRefreshTrigger, setRehearsalRefreshTrigger] = useState(0);
	const [rehearsalShowDateInfo, setRehearsalShowDateInfo] =
		useState<ShowDateInfo | null>(null);
	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [isLightMode, setIsLightMode] = useState(false);

	// PDF Export Hook
	const { generatePDF, isGenerating } = usePerformanceOrderPDF({
		eventId,
		eventName: event?.name || "Event",
		eventDate: selectedDate ? formatDateSimple(selectedDate) : "",
		venue: event?.venue,
	});

	// Real-time clock update (client-side only to avoid hydration mismatch)
	useEffect(() => {
		// Set initial time on client
		setCurrentTime(new Date());

		const timer = setInterval(() => {
			setCurrentTime(new Date());
			// Increment elapsed time every second
			setElapsedTime((prev) => prev + 1);
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	// Fullscreen functionality
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "F11") {
				event.preventDefault();
				toggleFullscreen();
			} else if (event.key === "Escape" && isFullscreen) {
				exitFullscreen();
			}
		};

		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("fullscreenchange", handleFullscreenChange);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener(
				"fullscreenchange",
				handleFullscreenChange,
			);
		};
	}, [isFullscreen]);

	const toggleFullscreen = async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			} else {
				await document.exitFullscreen();
			}
		} catch (error) {
			console.error("Error toggling fullscreen:", error);
		}
	};

	const exitFullscreen = async () => {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
		} catch (error) {
			console.error("Error exiting fullscreen:", error);
		}
	};

	// Reset elapsed time when performer changes
	useEffect(() => {
		setElapsedTime(0);
	}, [currentPerformerIndex]);

	useEffect(() => {
		if (eventId) {
			fetchEventData();
			fetchEventDates();
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
	}, [eventId, toast]);

	useEffect(() => {
		if (selectedDate) {
			fetchData();
			fetchEmergencyBroadcasts();
			fetchShowDateInfo();
			fetchEventTimings(selectedDate);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedDate, refreshTrigger]);

	// Initialize rehearsal date when available dates are loaded
	useEffect(() => {
		if (availableDates.length > 0 && !selectedRehearsalDate) {
			const bestDate = findBestDateToSelect(availableDates, eventId);
			setSelectedRehearsalDate(bestDate);
		}
	}, [availableDates, selectedRehearsalDate, eventId]);

	// Fetch rehearsal artists when rehearsal date changes
	useEffect(() => {
		if (selectedRehearsalDate) {
			fetchRehearsalArtists();
			fetchRehearsalShowDateInfo();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedRehearsalDate, rehearsalRefreshTrigger]);

	const selectedDateRef = useRef(selectedDate);
	useEffect(() => {
		selectedDateRef.current = selectedDate;
	}, [selectedDate]);

	const selectedRehearsalDateRef = useRef(selectedRehearsalDate);
	useEffect(() => {
		selectedRehearsalDateRef.current = selectedRehearsalDate;
	}, [selectedRehearsalDate]);

	// Initialize WebSocket for real-time updates
	useEffect(() => {
		if (!eventId) return;

		let wsManager: any = null;
		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId,
					role: "live-board",
					userId: `live_board_${eventId}`,
					showToasts: false,
					onConnect: () => {
						console.log("Live Board WebSocket connected");
						setWsConnected(true);
					},
					onDisconnect: () => {
						console.log("Live Board WebSocket disconnected");
						setWsConnected(false);
					},
					onDataUpdate: () => {
						console.log("Live Board data update triggered");
						setRefreshTrigger((prev) => prev + 1);
						setRehearsalRefreshTrigger((prev) => prev + 1);
					},
				});

				await wsManager.initialize();

				const triggerGlobalRefresh = (data?: any) => {
					console.log("Live Board: Triggering global refresh via WebSocket event");
					setTimeout(() => {
						setRefreshTrigger((prev) => prev + 1);
						setRehearsalRefreshTrigger((prev) => prev + 1);
						fetchShowDateInfo();
						fetchEventTimings();
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
					"lighting_designer_updated",
					"new_organiser_message",
					"organiser_message_read",
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						console.log(`Live Board: Received WebSocket event [${evtName}]:`, data);
						if (data && data.eventId === eventId) {
							if (evtName === "show-order-updated") {
								if (data.isDraft !== undefined) setIsDraftShowOrder(data.isDraft);
								if (data.isConfirmed !== undefined) setIsShowOrderConfirmed(data.isConfirmed);
							}
							if (
								evtName !== "new_organiser_message" &&
								evtName !== "organiser_message_read"
							) {
								triggerGlobalRefresh(data);
							}
						}
					});
				});

				// Store reference for cleanup
				(window as any).liveBoardWsManager = wsManager;
			} catch (error) {
				console.error("Failed to initialize WebSocket:", error);
			}
		};

		initializeWebSocket();

		return () => {
			if (wsManager) {
				wsManager.destroy();
				if ((window as any).liveBoardWsManager === wsManager) {
					delete (window as any).liveBoardWsManager;
				}
			}
		};
	}, [eventId]);

	// Helper function to format duration from seconds to minutes:seconds
	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const fetchEventData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				setEvent({
					id: evt.id,
					name: evt.name || evt.eventName,
					venue: evt.venue,
					show_dates: evt.show_dates || evt.showDates || [],
				});
			}
		} catch (error) {
			console.error("Error fetching event data:", error);
		}
	};

	const fetchEventDates = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				const showDates = evt.show_dates || evt.showDates || [];

				if (showDates.length > 0) {
					setAvailableDates(showDates);

					if (!selectedDate) {
						// Use shared date selection utility
						const bestDate = findBestDateToSelect(
							showDates,
							eventId,
						);
						setSelectedDate(bestDate);
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
			const rawDate = forDate || selectedDate;
			const dateToUse = rawDate
				? rawDate.includes("T")
					? rawDate.split("T")[0]
					: rawDate
				: "";
			const dateParam = dateToUse ? `&performanceDate=${dateToUse}` : "";
			const response = await fetch(
				`/api/events/${eventId}/timing-settings?t=${Date.now()}${dateParam}`,
			);
			if (response.ok) {
				const result = await response.json();
				console.log("=== LIVE BOARD TIMING FETCH ===", {
					dateToUse,
					selectedDate,
					result: result.data,
				});
				if (result.success && result.data) {
					setEventTimings({
						backstage_ready_time: result.data.backstage_ready_time,
						show_start_time: result.data.show_start_time,
						rehearsal_start_time: result.data.rehearsal_start_time,
					});
					setTimeOverrides(result.data.time_overrides || {});
					setRehearsalTimeOverrides(
						result.data.rehearsal_time_overrides || {},
					);
				}
			}
		} catch (error) {
			console.error("Error fetching event timings:", error);
		}
	};

	// Fetch rehearsal artists for the selected rehearsal date
	const fetchRehearsalArtists = useCallback(async () => {
		if (!selectedRehearsalDate) return;

		try {
			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					// Map and filter artists scheduled for rehearsal on the selected date
					const allArtists = (data.data || []).map((artist: any) => ({
						id: artist.eventShowId || artist.id,
						artist_name: artist.artistName || artist.artist_name,
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
						rehearsal_completed:
							artist.rehearsal_completed || false,
						performance_date:
							artist.performanceDate || artist.performance_date,
						country_living:
							artist.country_living || artist.countryLiving,
						home_country: artist.home_country || artist.homeCountry,
						nationality: artist.nationality,
						members: artist.members || null,
						eventShowId: artist.eventShowId,
					}));

					// Filter artists scheduled for rehearsal on the selected date
					const scheduledArtists = allArtists.filter(
						(artist: RehearsalArtist) => {
							if (
								!artist.rehearsal_date ||
								artist.rehearsal_order === null
							)
								return false;

							// Normalize dates for comparison
							let rehearsalDate = artist.rehearsal_date;
							if (rehearsalDate.includes("T")) {
								rehearsalDate = rehearsalDate.split("T")[0];
							}

							let normalizedSelectedDate = selectedRehearsalDate;
							if (selectedRehearsalDate.includes("T")) {
								normalizedSelectedDate =
									selectedRehearsalDate.split("T")[0];
							}

							return rehearsalDate === normalizedSelectedDate;
						},
					);

					// Sort by rehearsal order
					scheduledArtists.sort(
						(a: RehearsalArtist, b: RehearsalArtist) =>
							(a.rehearsal_order || 0) - (b.rehearsal_order || 0),
					);

					setRehearsalArtists(scheduledArtists);
				}
			}
		} catch (error) {
			console.error("Error fetching rehearsal artists:", error);
		}
	}, [eventId, selectedRehearsalDate]);

	const fetchData = useCallback(async () => {
		if (!selectedDate) return;

		try {
			setLoading(true);

			// Fetch artists from GCS (same as performance order page)
			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					const artists = (data.data || []).map((artist: any) => ({
						id: artist.id,
						artist_name: artist.artistName || artist.artist_name,
						style: artist.style,
						image_url: artist.image_url || "",
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
						performance_order: artist.performance_order || null,
						rehearsal_completed:
							artist.rehearsal_completed || false,
						quality_rating: artist.quality_rating || null,
						performance_status: artist.performance_status || null,
						performance_date:
							artist.performanceDate || artist.performance_date,
						props_needed: artist.props_needed,
						performance_notes:
							artist.mc_notes || artist.performance_notes || "",
						mc_notes: artist.mc_notes,
						biography: artist.biography,
						artist_notes: artist.artist_notes || artist.artistNotes,
						backstage_color: artist.backstage_color || undefined,
						country_living:
							artist.country_living || artist.countryLiving,
						home_country: artist.home_country || artist.homeCountry,
						nationality: artist.nationality,
						members: artist.members || null,
						eventShowId: artist.eventShowId,
					}));

					// Filter artists for the selected performance date
					const filteredArtists = artists.filter((a: Artist) => {
						if (!a.performance_date) return false;

						// Normalize both dates for comparison
						let artistDate: string;
						const performanceDate = a.performance_date;

						if (performanceDate.includes("T")) {
							artistDate = performanceDate.split("T")[0];
						} else {
							artistDate = performanceDate;
						}

						// Normalize selectedDate for comparison
						let normalizedSelectedDate = selectedDate;
						if (selectedDate.includes("T")) {
							normalizedSelectedDate = selectedDate.split("T")[0];
						}

						return artistDate === normalizedSelectedDate;
					});

					// Artists assigned to show order - include artists with performance_order OR artists with performance_status
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
									"not_started") as PerformanceItem["status"],
							};
						});

					// Fetch cues from GCS
					let cueItems: PerformanceItem[] = [];
					try {
						const cuesResponse = await fetch(
							`/api/events/${eventId}/cues?performanceDate=${selectedDate}&t=${Date.now()}`,
						);
						if (cuesResponse.ok) {
							const cuesResult = await cuesResponse.json();
							if (cuesResult.success) {
								cueItems = cuesResult.data.map((cue: any) => ({
									id: cue.id,
									type: "cue" as const,
									cue: {
										...cue,
										mc_notes: cue.mc_notes,
									},
									performance_order: cue.performance_order,
									status: (cue.performance_status ||
										(cue.is_completed
											? "completed"
											: "not_started")) as PerformanceItem["status"],
								}));
							}
						}
					} catch (cueError) {
						console.error("Error fetching cues:", cueError);
					}

					// Combine and sort all show order items
					const allPerformanceItems = [
						...assignedArtists,
						...cueItems,
					].sort((a, b) => a.performance_order - b.performance_order);

					setPerformanceItems(allPerformanceItems);

					// Fetch show order metadata to get draft status
					try {
						const showOrderResponse = await fetch(
							`/api/events/${eventId}/show-order?performanceDate=${selectedDate}&t=${Date.now()}`,
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
							}
						}
					} catch (showOrderError) {
						console.error(
							"Error fetching show order metadata:",
							showOrderError,
						);
						// Continue with default draft status
					}

					// Set current performer index based on status
					const currentIndex = allPerformanceItems.findIndex(
						(item) => item.status === "currently_on_stage",
					);
					if (currentIndex !== -1) {
						setCurrentPerformerIndex(currentIndex);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching performance order:", error);
			toast({
				title: "Error loading data",
				description: "Failed to load performance data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [eventId, selectedDate, toast]);

	const fetchEmergencyBroadcasts = useCallback(async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts?t=${Date.now()}`,
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
	}, [eventId]);

	const fetchShowDateInfo = useCallback(async () => {
		if (!selectedDate) return;

		try {
			const response = await fetch(
				`/api/events/${eventId}/show-date-info?showDate=${selectedDate}&t=${Date.now()}`,
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					setShowDateInfo(result.data);
				} else {
					setShowDateInfo(null);
				}
			}
		} catch (error) {
			console.error("Error fetching show date info:", error);
			setShowDateInfo(null);
		}
	}, [eventId, selectedDate]);

	const fetchRehearsalShowDateInfo = useCallback(async () => {
		if (!selectedRehearsalDate) return;

		try {
			const response = await fetch(
				`/api/events/${eventId}/show-date-info?showDate=${selectedRehearsalDate}&t=${Date.now()}`,
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					setRehearsalShowDateInfo(result.data);
				} else {
					setRehearsalShowDateInfo(null);
				}
			}
		} catch (error) {
			console.error("Error fetching rehearsal show date info:", error);
			setRehearsalShowDateInfo(null);
		}
	}, [eventId, selectedRehearsalDate]);

	// NOTE: WebSocket manager is initialized above in the useEffect at lines ~387-606
	// which registers all event listeners including rehearsal_updated, timing-settings-updated, etc.

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
					description: `${newBroadcast.emergency_code.toUpperCase()} alert broadcast`,
					variant: "destructive",
				});

				fetchEmergencyBroadcasts();
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
					description: "Emergency broadcast has been cleared",
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
	const updatePerformanceStatus = async (
		itemId: string,
		status: string,
		itemType: "artist" | "cue",
	) => {
		try {
			let response;

			if (itemType === "artist") {
				response = await fetch(
					`/api/events/${eventId}/artists/${itemId}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							performance_status: status,
						}),
					},
				);
			} else {
				response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: itemId,
						performance_status: status,
						performanceDate: selectedDate,
					}),
				});
			}

			if (response.ok) {
				toast({
					title: "Status updated",
					description: `Performance marked as ${status.replace(
						"_",
						" ",
					)}`,
				});

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).liveBoardWsManager;
				if (wsManager) {
					wsManager.emit("live-board-update", {
						eventId,
						itemId,
						status,
						itemType,
						action: "status_updated",
						performanceDate: selectedDate,
					});
				}

				fetchData();
			} else {
				throw new Error("Failed to update status");
			}
		} catch (error) {
			console.error("Error updating performance status:", error);
			toast({
				title: "Error updating status",
				description: "Failed to update performance status",
				variant: "destructive",
			});
		}
	};

	const nextPerformer = async () => {
		if (currentPerformerIndex < performanceItems.length - 1) {
			const newIndex = currentPerformerIndex + 1;
			const currentItem = performanceItems[currentPerformerIndex];
			const nextItem = performanceItems[newIndex];

			// Mark current as completed
			if (currentItem) {
				await updatePerformanceStatus(
					currentItem.id,
					"completed",
					currentItem.type,
				);
			}

			// Mark next as currently on stage
			if (nextItem) {
				await updatePerformanceStatus(
					nextItem.id,
					"currently_on_stage",
					nextItem.type,
				);
			}

			setCurrentPerformerIndex(newIndex);

			if (nextItem?.type === "artist" && nextItem.artist) {
				toast({
					title: "Next performer called",
					description: `Now calling ${nextItem.artist.artist_name}`,
					variant: "success",
				});
			} else if (nextItem?.type === "cue" && nextItem.cue) {
				toast({
					title: "Next cue",
					description: `Now playing ${nextItem.cue.title}`,
					variant: "success",
				});
			}
		}
	};

	const previousPerformer = async () => {
		if (currentPerformerIndex > 0) {
			const newIndex = currentPerformerIndex - 1;
			const currentItem = performanceItems[currentPerformerIndex];
			const prevItem = performanceItems[newIndex];

			// Mark current as not started
			if (currentItem) {
				await updatePerformanceStatus(
					currentItem.id,
					"not_started",
					currentItem.type,
				);
			}

			// Mark previous as currently on stage
			if (prevItem) {
				await updatePerformanceStatus(
					prevItem.id,
					"currently_on_stage",
					prevItem.type,
				);
			}

			setCurrentPerformerIndex(newIndex);

			if (prevItem?.type === "artist" && prevItem.artist) {
				toast({
					title: "Previous performer called",
					description: `Now calling ${prevItem.artist.artist_name}`,
					variant: "success",
				});
			} else if (prevItem?.type === "cue" && prevItem.cue) {
				toast({
					title: "Previous cue",
					description: `Now playing ${prevItem.cue.title}`,
					variant: "success",
				});
			}
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

	const getCueIcon = (cueType: string) => {
		const iconMap: { [key: string]: any } = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType] || Video;
	};

	const getItemStatus = (item: PerformanceItem, index: number) => {
		// Always respect the status from the database (set by stage manager)
		if (item.status) return item.status;

		// For cues, check if completed
		if (item.type === "cue" && item.cue?.is_completed) {
			return "completed";
		}

		// Default to not_started if no status is set
		return "not_started";
	};

	// Status color functions
	const getRowColorClasses = (status?: string | null) => {
		switch (status) {
			case "completed":
				return "bg-red-50 border-l-4 border-l-red-500 text-red-900";
			case "currently_on_stage":
				return "bg-green-50 border-l-4 border-l-green-500 text-green-900";
			case "next_on_deck":
				return "bg-blue-50 border-l-4 border-l-blue-500 text-blue-900";
			default:
				return "bg-white hover:bg-gray-50";
		}
	};

	const getStatusBadge = (
		status?: string | null,
		cueColor?: string | null,
		rehearsalCompleted?: boolean,
	) => {
		// If rehearsal not completed and in draft mode, show Incomplete Rehearsal
		if (
			isDraftShowOrder &&
			rehearsalCompleted === false &&
			(!status || status === "not_started")
		) {
			return (
				<Badge className="bg-orange-500 text-white hover:bg-orange-500 cursor-default text-base px-4 py-2 font-semibold">
					Incomplete Rehearsal
				</Badge>
			);
		}

		switch (status) {
			case "completed":
				return (
					<Badge className="bg-red-500 text-white hover:bg-red-500 cursor-default text-base px-4 py-2 font-semibold">
						Completed
					</Badge>
				);
			case "currently_on_stage":
				return (
					<Badge className="bg-green-500 text-white hover:bg-green-500 cursor-default text-base px-4 py-2 font-semibold">
						Currently On Stage
					</Badge>
				);
			case "next_on_stage":
				return (
					<Badge className="bg-yellow-500 text-white hover:bg-yellow-500 cursor-default text-base px-4 py-2 font-semibold">
						Next On Stage
					</Badge>
				);
			case "next_on_deck":
				return (
					<Badge className="bg-blue-500 text-white hover:bg-blue-500 cursor-default text-base px-4 py-2 font-semibold">
						Next On Deck
					</Badge>
				);
			default:
				return (
					<Badge
						variant="outline"
						className={`cursor-default text-base px-4 py-2 font-semibold ${
							cueColor && !isLightColor(cueColor)
								? "bg-white/20 text-white border-white/30"
								: "bg-gray-100 text-gray-700 border-gray-300"
						}`}
					>
						Backstage
					</Badge>
				);
		}
	};

	// Quality rating badge for rehearsal
	const getQualityBadge = (rating: number | null) => {
		if (!rating) return null;
		const colors = {
			1: "text-green-500",
			2: "text-yellow-500",
			3: "text-blue-500",
		};
		return (
			<div className="flex items-center gap-1">
				{Array.from({ length: rating }, (_, i) => (
					<Star
						key={i}
						className={`h-4 w-4 fill-current ${
							colors[rating as keyof typeof colors]
						}`}
					/>
				))}
			</div>
		);
	};

	// Calculate total show time using the utility function from timing-utils
	// This correctly prioritizes actual_duration from uploaded music tracks
	// Convert PerformanceItem[] to ShowOrderItem[] format expected by timing-utils
	const totalShowTimeSeconds = calculateTotalShowTime(
		performanceItems.map((item) => ({
			id: item.id,
			type: item.type,
			performance_order: item.performance_order,
			artist: item.artist
				? {
						id: item.artist.id,
						artist_name: item.artist.artist_name,
						performance_duration: item.artist.performance_duration,
						actual_duration:
							item.artist.actual_duration ?? undefined,
					}
				: undefined,
			cue: item.cue,
		})),
	);

	// Calculate remaining time with live countdown
	const calculateRemainingTime = () => {
		const remainingItems = performanceItems.slice(currentPerformerIndex);
		const totalRemaining = remainingItems.reduce((total, item) => {
			if (item.type === "artist" && item.artist) {
				// Use actual duration if available, otherwise fall back to performance duration
				const durationSeconds = item.artist.actual_duration
					? item.artist.actual_duration // Already in seconds
					: (item.artist.performance_duration || 0) * 60; // Convert minutes to seconds
				return total + durationSeconds;
			} else if (item.type === "cue" && item.cue) {
				return total + (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
			}
			return total;
		}, 0);

		// Subtract elapsed time from current performer
		return Math.max(0, totalRemaining - elapsedTime);
	};

	// Format current time (handle null for SSR)
	const formatCurrentTime = (date: Date | null) => {
		if (!date) return "--:--:--";
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	};

	// Get items by status and position
	const getCurrentItem = () => performanceItems[currentPerformerIndex];
	const getNextItem = () => performanceItems[currentPerformerIndex + 1];
	const getOnDeckItem = () => performanceItems[currentPerformerIndex + 2];

	// Get current performer details - only show if someone is actually on stage
	const currentItem =
		performanceItems.find((item) => item.status === "currently_on_stage") ||
		null;

	// Get next items in queue - include items that are not started, next on stage, or next on deck
	const nextItems = performanceItems.filter(
		(item) =>
			item.status === "not_started" ||
			item.status === "next_on_stage" ||
			item.status === "next_on_deck" ||
			(!item.status && item.type === "cue" && !item.cue?.is_completed),
	);

	// Calculate estimated start times for queue items with live adjustment
	const calculateEstimatedStartTime = (itemIndex: number): string => {
		const showStartTime = eventTimings.show_start_time;
		if (!showStartTime) return "";

		// Get the current item being displayed (from nextItems)
		const queueItem = nextItems[itemIndex];
		if (!queueItem) return "";

		// Find the index of this item in the full performance items array
		const fullIndex = performanceItems.findIndex(
			(item) => item.id === queueItem.id,
		);
		if (fullIndex === -1) return "";

		// Check if there's a show currently on stage
		const currentOnStageItem = performanceItems.find(
			(item) => item.status === "currently_on_stage",
		);

		let currentTimeSeconds: number;

		if (currentOnStageItem) {
			// LIVE ADJUSTMENT: A show is currently on stage
			// Use current actual time as reference point
			const now = new Date();
			currentTimeSeconds =
				now.getHours() * 3600 +
				now.getMinutes() * 60 +
				now.getSeconds();

			// Find the index of the currently on-stage item
			const currentOnStageIndex = performanceItems.findIndex(
				(item) => item.id === currentOnStageItem.id,
			);

			if (currentOnStageIndex !== -1) {
				// Add remaining time of current show
				const currentShowRemainingTime =
					getCurrentPerformerRemainingTime();
				currentTimeSeconds += currentShowRemainingTime;

				// Add durations of all shows between current on-stage and target item
				for (let i = currentOnStageIndex + 1; i < fullIndex; i++) {
					const item = performanceItems[i];
					if (item.type === "artist" && item.artist) {
						const durationSeconds =
							item.artist.actual_duration ||
							(item.artist.performance_duration || 0) * 60;
						currentTimeSeconds += durationSeconds;
					} else if (item.type === "cue" && item.cue) {
						currentTimeSeconds += (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
					}
				}
			}
		} else {
			// BASE CALCULATION: No show on stage yet, use scheduled start time
			const timeParts = showStartTime.split(":").map(Number);
			const hours = timeParts[0] || 0;
			const minutes = timeParts[1] || 0;
			const seconds = timeParts[2] || 0;
			currentTimeSeconds = hours * 3600 + minutes * 60 + seconds;

			// Calculate cumulative time up to this item
			for (let i = 0; i < fullIndex; i++) {
				const item = performanceItems[i];
				if (item.type === "artist" && item.artist) {
					const durationSeconds =
						item.artist.actual_duration ||
						(item.artist.performance_duration || 0) * 60;
					currentTimeSeconds += durationSeconds;
				} else if (item.type === "cue" && item.cue) {
					currentTimeSeconds += (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
				}
			}
		}

		// Convert back to HH:MM:SS format
		const h = Math.floor(currentTimeSeconds / 3600) % 24; // Hours
		const m = Math.floor((currentTimeSeconds % 3600) / 60); // Minutes
		const s = Math.floor(currentTimeSeconds % 60); // Seconds
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	// Calculate total show time (sum of all performance durations)
	const getTotalShowDuration = (): number => {
		let totalSeconds = 0;
		performanceItems.forEach((item) => {
			if (item.type === "artist" && item.artist) {
				const durationSeconds =
					item.artist.actual_duration ||
					(item.artist.performance_duration || 0) * 60;
				totalSeconds += durationSeconds;
			} else if (item.type === "cue" && item.cue) {
				totalSeconds += (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
			}
		});
		return totalSeconds;
	};

	// Get backstage ready time from timing settings (saved by stage manager)
	const getBackstageReadyTime = (): string => {
		// Use the saved backstage ready time from timing settings only
		return eventTimings.backstage_ready_time || "--:--";
	};

	// Format total show time for display (properly handles minutes and seconds)
	const getFormattedTotalShowTime = (): string => {
		const totalSeconds = getTotalShowDuration();
		const mins = Math.floor(totalSeconds / 60);
		const secs = Math.floor(totalSeconds % 60);
		return `${mins}m ${secs}s`;
	};

	// Calculate the actual clock time when this item ends
	// Shows: Show Start Time + cumulative duration up to this item
	const getCumulativeTimeWithItem = (item: PerformanceItem): string => {
		// Get show start time from timing settings only
		const showStartTime = eventTimings.show_start_time;
		if (!showStartTime) return "--:--";

		// Parse show start time (handle both HH:MM and HH:MM:SS formats)
		const timeParts = showStartTime.split(":").map(Number);
		const hours = timeParts[0] || 0;
		const minutes = timeParts[1] || 0;
		const seconds = timeParts[2] || 0;
		const startTimeSeconds = hours * 3600 + minutes * 60 + seconds;

		// Find the index of this item in the performance items array
		const itemIndex = performanceItems.findIndex((p) => p.id === item.id);
		if (itemIndex === -1) return "--:--";

		// Calculate cumulative duration up to and including this item
		let cumulativeSeconds = 0;
		for (let i = 0; i <= itemIndex; i++) {
			const currentItem = performanceItems[i];
			if (currentItem.type === "artist" && currentItem.artist) {
				cumulativeSeconds +=
					currentItem.artist.actual_duration ||
					(currentItem.artist.performance_duration || 0) * 60;
			} else if (currentItem.type === "cue" && currentItem.cue) {
				cumulativeSeconds += (currentItem.cue.duration || 0) * 60 + (currentItem.cue.extraTime || 0);
			}
		}

		// Calculate end time = show start time + cumulative duration
		const endTimeSeconds = startTimeSeconds + cumulativeSeconds;

		// Convert to HH:MM:SS clock time format
		const h = Math.floor(endTimeSeconds / 3600) % 24;
		const m = Math.floor((endTimeSeconds % 3600) / 60);
		const s = Math.floor(endTimeSeconds % 60);
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	// Calculate cumulative rehearsal time for a given artist index
	// rehearsalTiming is stored as "HH:MM - HH:MM" (start - end)
	const getRehearsalCumulativeTime = (artistIndex: number): string => {
		const rehearsalTiming = rehearsalShowDateInfo?.rehearsalTiming;
		if (!rehearsalTiming) return "--:--";

		// Parse rehearsal start time from "HH:MM - HH:MM" format
		const startTimeStr = rehearsalTiming.split(" - ")[0]?.trim();
		if (!startTimeStr) return "--:--";

		const timeParts = startTimeStr.split(":").map(Number);
		const hours = timeParts[0] || 0;
		const minutes = timeParts[1] || 0;
		const startTimeSeconds = hours * 3600 + minutes * 60;

		// Calculate cumulative duration up to (but not including) this artist
		// This gives us the START time for this artist's rehearsal
		let cumulativeSeconds = 0;
		for (let i = 0; i < artistIndex; i++) {
			const artist = rehearsalArtists[i];
			if (artist) {
				cumulativeSeconds +=
					artist.actual_duration ||
					(artist.performance_duration || 0) * 60;
			}
		}

		const timeSeconds = startTimeSeconds + cumulativeSeconds;
		const h = Math.floor(timeSeconds / 3600) % 24;
		const m = Math.floor((timeSeconds % 3600) / 60);
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
	};

	// Calculate remaining time for current performer
	const getCurrentPerformerRemainingTime = () => {
		if (!currentItem) return 0;

		let totalDuration = 0;
		if (currentItem.type === "artist" && currentItem.artist) {
			totalDuration = currentItem.artist.actual_duration
				? currentItem.artist.actual_duration
				: (currentItem.artist.performance_duration || 0) * 60;
		} else if (currentItem.type === "cue" && currentItem.cue) {
			totalDuration = (currentItem.cue.duration || 0) * 60 + (currentItem.cue.extraTime || 0);
		}

		return Math.max(0, totalDuration - elapsedTime);
	};

	const formatTimeRemaining = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// Removed loading state to prevent interruption during auto-refresh

	// Theme helpers — swap between dark (default) and light mode
	const tm = {
		page:    isLightMode ? "min-h-screen bg-gray-50 text-gray-900 overflow-hidden"           : "min-h-screen bg-[#0a0e1a] text-white overflow-hidden",
		header:  isLightMode ? "sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm" : "sticky top-0 z-50 border-b border-[#2a1f4f] bg-[#0a0e1a]/95 backdrop-blur-md shadow-lg",
		title:   isLightMode ? "text-2xl font-bold text-gray-900 tracking-wide"                  : "text-2xl font-bold text-white tracking-wide",
		sub:     isLightMode ? "text-xs text-purple-600/70 uppercase tracking-widest"             : "text-xs text-purple-300/70 uppercase tracking-widest",
		card:    isLightMode ? "bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"        : "bg-gradient-to-br from-[#1a1147] to-[#0f0a2e] border border-[#2a1f4f] rounded-2xl p-6 shadow-2xl",
		cardLabel: isLightMode ? "text-xs uppercase tracking-[0.3em] text-purple-600 font-semibold" : "text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold",
		cardVal: isLightMode ? "text-xl font-bold font-mono text-purple-700"                     : "text-xl font-bold font-mono text-[#d4af37]",
		tabList: isLightMode ? "grid w-full max-w-3xl mx-auto grid-cols-4 mb-6 p-1 bg-gray-100 border border-gray-200 rounded-xl" : "grid w-full max-w-3xl mx-auto grid-cols-4 mb-6 p-1 bg-[#1a1147] border border-[#2a1f4f] rounded-xl",
		tabTrigger: isLightMode ? "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white hover:bg-gray-200 text-gray-600" : "flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white hover:bg-[#0f0a2e] text-purple-300",
		divider: isLightMode ? "h-px bg-gray-200"                                                 : "h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent",
		muted:   isLightMode ? "text-xs uppercase tracking-widest text-gray-500"                  : "text-xs uppercase tracking-widest text-purple-400",
		toggleBtn: isLightMode
			? "rounded-full p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
			: "rounded-full p-1.5 bg-purple-900/40 text-yellow-400 hover:bg-purple-800/60 transition-colors",
	};

	return (
		<div className={tm.page}>
			{/* Fullscreen indicator */}
			{isFullscreen && (
				<div className="fixed top-4 right-4 z-50 bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
					Press ESC to exit fullscreen
				</div>
			)}

			{/* Modern Compact Header */}
			<header className={tm.header}>
				<div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
					<div className="flex justify-between items-center gap-3">
						<div className="flex items-center gap-3 sm:gap-4 min-w-0">
							<FameLogo width={38} height={38} />
							<div className="min-w-0">
								<h1 className={tm.title}>LIVE BOARD</h1>
								<p className={tm.sub}>Live Show in Progress</p>
							</div>
						</div>
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							{/* Light / Dark mode toggle */}
							<button
								onClick={() => setIsLightMode(m => !m)}
								className={tm.toggleBtn}
								title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
							>
								{isLightMode
									? <Moon className="h-4 w-4" />
									: <Sun className="h-4 w-4" />}
							</button>
							<Button
								variant="ghost"
								size="sm"
								onClick={toggleFullscreen}
								className={`text-sm transition-all ${isLightMode ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-purple-300 hover:text-white hover:bg-purple-900/30"}`}
								title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen (F11)"}
							>
								{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
							</Button>
							<div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLightMode ? "bg-gray-100 border border-gray-200" : "bg-purple-900/20 border border-purple-700/30"}`}>
								<div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
								<span className={`text-xs font-semibold uppercase tracking-wider ${isLightMode ? "text-gray-600" : "text-purple-200"}`}>
									{wsConnected ? "LIVE" : "OFFLINE"}
								</span>
							</div>
							<Button
								onClick={() => { fetchData(); setRefreshTrigger(p => p + 1); setRehearsalRefreshTrigger(p => p + 1); }}
								variant="ghost"
								size="sm"
								className={`text-sm transition-all ${isLightMode ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-purple-900/30 text-purple-300 hover:bg-purple-800/50 hover:text-white"}`}
							>
								<RefreshCw className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>
			{/* Emergency Broadcasts */}
			{emergencyBroadcasts.length > 0 && (
				<div className="border-b border-border">
					{emergencyBroadcasts.map((broadcast) => (
						<div
							key={broadcast.id}
							className={`p-4 ${getEmergencyColor(
								broadcast.emergency_code,
							)}`}
						>
							<div className="container mx-auto flex justify-between items-center">
								<div className="flex items-center gap-3">
									<AlertTriangle className="h-5 w-5" />
									<div>
										<span className="font-bold">
											{broadcast.emergency_code.toUpperCase()}{" "}
											ALERT:
										</span>
										<span className="ml-2">
											{broadcast.message}
										</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			{/* Date Selection */}
			{availableDates.length > 1 && (
				<div className={`sticky top-[100px] sm:top-[73px] z-40 border-b ${isLightMode ? "border-gray-200 bg-white shadow-sm" : "border-gray-700 bg-[#0a0e1a]/95"}`}>
					<div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
								<Label
									htmlFor="date-select"
									className="text-xs sm:text-sm font-medium whitespace-nowrap"
								>
									Select Performance Date:
								</Label>
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
									<SelectTrigger
										id="date-select"
										className="w-full sm:w-48 h-9"
									>
										<SelectValue placeholder="Select date" />
									</SelectTrigger>
									<SelectContent>
										{availableDates.map((date, index) => (
											<SelectItem key={date} value={date}>
												Day {index + 1} -{" "}
												{formatDateSimple(date)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="text-xs sm:text-sm text-muted-foreground font-medium w-full sm:w-auto text-left sm:text-right">
								{event?.name}
							</div>
						</div>
					</div>
				</div>
			)}
			<main className="container mx-auto px-6 py-6">
				{/* Draft / Confirmed Banner */}
				{isDraftShowOrder && !isShowOrderConfirmed && (
					<div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/60 rounded-xl backdrop-blur-sm flex items-center justify-center gap-3">
						<AlertTriangle className="h-8 w-8 text-yellow-400 flex-shrink-0" />
						<h3 className="text-3xl sm:text-4xl md:text-[48px] font-bold text-yellow-300 leading-tight">
							DRAFT ORDER
						</h3>
					</div>
				)}
				{!isDraftShowOrder && isShowOrderConfirmed && (
					<div className="mb-6 p-4 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/60 rounded-xl backdrop-blur-sm flex items-center justify-center gap-3">
						<CheckCircle className="h-8 w-8 text-green-400 flex-shrink-0" />
						<h3 className="text-3xl sm:text-4xl md:text-[48px] font-bold text-green-300 leading-tight">
							CONFIRMED ORDER LIST
						</h3>
					</div>
				)}

				{/* Main Tabs - Live Board and Rehearsal Schedule */}
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full"
				>
					<TabsList className={tm.tabList}>
						<TabsTrigger
							value="live-board"
							className={tm.tabTrigger}
						>
							<Play className="h-4 w-4" />
							<span>Live Board</span>
						</TabsTrigger>
						<TabsTrigger
							value="live-board-2"
							className={tm.tabTrigger}
						>
							<Sparkles className="h-4 w-4" />
							<span>Live Board 2</span>
						</TabsTrigger>
						<TabsTrigger
							value="live-board-3"
							className={tm.tabTrigger}
						>
							<ListTodo className="h-4 w-4" />
							<span>Live Board 3</span>
						</TabsTrigger>
						<TabsTrigger
							value="rehearsal-schedule"
							className={tm.tabTrigger}
						>
							<Calendar className="h-4 w-4" />
							<span>Rehearsal Schedule</span>
						</TabsTrigger>
					</TabsList>

					{/* Live Board Tab */}
					<TabsContent value="live-board" className="mt-0">
						{/* Modern Top Section - Current Time & Status */}
						<div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Current Time Display */}
							<div className={tm.card}>
								<span className={tm.cardLabel}>
									Current Time
								</span>
								<div className="flex items-baseline gap-2 mt-3">
									<span className="text-5xl font-bold font-mono tracking-tight text-white">
										{currentTime
											? currentTime.toLocaleTimeString(
													"en-US",
													{
														hour: "2-digit",
														minute: "2-digit",
														second: "2-digit",
														hour12: false,
													},
												)
											: "--:--:--"}
									</span>
									<span className="text-2xl font-semibold text-purple-300">
										{currentTime
											? currentTime
													.toLocaleTimeString(
														"en-US",
														{
															hour12: true,
														},
													)
													.split(" ")[1]
											: ""}
									</span>
								</div>
							</div>

							{/* Live Status Badge */}
							<div className={`${tm.card} flex flex-col items-center justify-center`}>
								<div className={isLightMode ? "px-6 py-2 bg-purple-50 border border-purple-200 rounded-lg mb-3" : "px-6 py-2 bg-[#1a1147] border border-[#d4af37]/30 rounded-lg mb-3"}>
									<span className={`text-sm uppercase tracking-[0.3em] font-semibold ${isLightMode ? "text-purple-700" : "text-purple-700"}`}>
										Live Show in Progress
									</span>
								</div>
								<h2 className="text-2xl font-bold uppercase tracking-wide text-white">
									Live Show in Progress
								</h2>
							</div>

							{/* Timing Info */}
							<div className={tm.card}>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<span className={tm.muted}>
											Total Show Time
										</span>
										<span className={tm.cardVal}>
											{getFormattedTotalShowTime()}
										</span>
									</div>
									<div className={tm.divider}></div>
									<div className="flex items-center justify-between">
										<span className={tm.muted}>
											Backstage Ready
										</span>
										<span className={tm.cardVal}>
											{eventTimings.backstage_ready_time ||
												"--:--"}
										</span>
									</div>
									<div className={tm.divider}></div>
									<div className="flex items-center justify-between">
										<span className={tm.muted}>
											Show Start
										</span>
										<span className={tm.cardVal}>
											{eventTimings.show_start_time ||
												"--:--"}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Main Content Grid - Now on Stage + Queue + Performance Order */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
							{/* Left Column - Now on Stage + Queue (2 columns) */}
							<div className="lg:col-span-2 flex flex-col gap-6">
								{/* Now on Stage */}
								<div className={tm.card}>
									<span className={tm.cardLabel}>
										Now on Stage
									</span>
									{currentItem ? (
										<div className="flex items-center justify-between mt-4">
											<div className="flex-1">
												{currentItem.type ===
													"artist" &&
												currentItem.artist ? (
													<>
														<div className="flex items-center gap-3 flex-wrap">
															<h2 className="text-4xl font-bold text-white tracking-tight">
																{
																	currentItem
																		.artist
																		.artist_name
																}
															</h2>
															{/* Nationality Information */}
															{currentItem.artist
																.members &&
															currentItem.artist
																.members
																.length > 0 ? (
																<div className="flex items-center gap-2 flex-wrap">
																	{currentItem.artist.members.map(
																		(
																			member,
																			idx,
																		) => (
																			<div
																				key={
																					idx
																				}
																				className="flex items-center gap-1"
																			>
																				{member.homeCountry && (
																					<span
																						className="text-2xl"
																						title={`${member.name}: ${getCountryName(member.homeCountry)}`}
																					>
																						{getCountryFlag(
																							member.homeCountry,
																						)}
																					</span>
																				)}
																				{member.countryLiving &&
																					member.countryLiving !==
																						member.homeCountry && (
																						<>
																							<Globe className="h-4 w-4 text-purple-300 opacity-70" />
																							<span
																								className="text-xl"
																								title={`${member.name}: Living in ${getCountryName(member.countryLiving)}`}
																							>
																								{getCountryFlag(
																									member.countryLiving,
																								)}
																							</span>
																						</>
																					)}
																			</div>
																		),
																	)}
																</div>
															) : (
																<>
																	{(currentItem
																		.artist
																		.home_country ||
																		currentItem
																			.artist
																			.nationality) && (
																		<div className="flex items-center gap-1">
																			<span
																				className="text-3xl"
																				title={getCountryName(
																					currentItem
																						.artist
																						.home_country ||
																						currentItem
																							.artist
																							.nationality ||
																						"",
																				)}
																			>
																				{getCountryFlag(
																					currentItem
																						.artist
																						.home_country ||
																						currentItem
																							.artist
																							.nationality ||
																						"",
																				)}
																			</span>
																		</div>
																	)}
																	{currentItem
																		.artist
																		.country_living &&
																		currentItem
																			.artist
																			.country_living !==
																			currentItem
																				.artist
																				.home_country && (
																			<div className="flex items-center gap-1">
																				<Globe className="h-4 w-4 text-purple-300 opacity-70" />
																				<span
																					className="text-2xl"
																					title={`Living in ${getCountryName(currentItem.artist.country_living)}`}
																				>
																					{getCountryFlag(
																						currentItem
																							.artist
																							.country_living,
																					)}
																				</span>
																			</div>
																		)}
																</>
															)}
														</div>
														<span className={`text-lg mt-1 block ${isLightMode ? "text-purple-700" : "text-purple-700"}`}>
															{
																currentItem
																	.artist
																	.style
															}
														</span>
													</>
												) : currentItem.type ===
														"cue" &&
												  currentItem.cue ? (
													<>
														<h2 className="text-4xl font-bold text-white tracking-tight">
															{
																currentItem.cue
																	.title
															}
														</h2>
														<span className={`text-lg mt-1 block ${isLightMode ? "text-purple-700" : "text-purple-700"}`}>
															{currentItem.cue.type
																.replace(
																	"_",
																	" ",
																)
																.toUpperCase()}
														</span>
													</>
												) : null}
											</div>
											{/* Circular Timer */}
											<div className="relative w-32 h-32 flex items-center justify-center">
												<svg
													className="w-full h-full -rotate-90"
													viewBox="0 0 100 100"
												>
													<circle
														cx="50"
														cy="50"
														r="45"
														fill="none"
														stroke="rgba(139, 92, 246, 0.2)"
														strokeWidth="6"
													/>
													<circle
														cx="50"
														cy="50"
														r="45"
														fill="none"
														stroke="url(#timerGradient)"
														strokeWidth="6"
														strokeLinecap="round"
														strokeDasharray={
															2 * Math.PI * 45
														}
														strokeDashoffset={
															2 *
															Math.PI *
															45 *
															(1 -
																getCurrentPerformerRemainingTime() /
																	(currentItem.type ===
																		"artist" &&
																	currentItem.artist
																		? currentItem
																				.artist
																				.actual_duration ||
																			currentItem
																				.artist
																				.performance_duration *
																				60
																		: currentItem.type ===
																					"cue" &&
																			  currentItem.cue
																			? (currentItem
																					.cue
																					.duration ||
																					0) *
																				60
																			: 0))
														}
													/>
													<defs>
														<linearGradient
															id="timerGradient"
															x1="0%"
															y1="0%"
															x2="100%"
															y2="100%"
														>
															<stop
																offset="0%"
																stopColor="#d4af37"
															/>
															<stop
																offset="50%"
																stopColor="#e91e8c"
															/>
															<stop
																offset="100%"
																stopColor="#d4af37"
															/>
														</linearGradient>
													</defs>
												</svg>
												<div className="absolute inset-0 flex flex-col items-center justify-center">
													<span className="text-3xl font-bold font-mono text-white">
														{formatTimeRemaining(
															getCurrentPerformerRemainingTime(),
														)}
													</span>
													<span className={tm.muted}>
														Remaining
													</span>
												</div>
											</div>
										</div>
									) : (
										<div className={`text-center py-8 ${isLightMode ? "text-purple-600" : "text-purple-600"}`}>
											No performance currently on stage
										</div>
									)}
								</div>

								{/* Backstage Alert */}
								<div className={isLightMode ? "flex items-center justify-center gap-3 py-3 border-t border-b border-[#2a1f4f]bg-gray-100/30" : "flex items-center justify-center gap-3 py-3 border-t border-b border-[#2a1f4f] bg-[#1a1147]/30"}>
									<div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
									<div className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse shadow-glow-gold" />
									<span className={`text-sm font-medium uppercase tracking-wider ${isLightMode ? "text-purple-700" : "text-purple-700"}`}>
										Be Ready Backstage:{" "}
										{eventTimings.backstage_ready_time ||
											"--:--"}{" "}
									</span>
									<div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
								</div>

								{/* Performance Queue */}
								<div className={isLightMode ? "bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm" : "bg-gradient-to-br from-[#1a1147] to-[#0f0a2e] border border-[#2a1f4f] rounded-2xl overflow-hidden shadow-2xl"}>
									{/* Header */}
									<div className={isLightMode ? "flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-[#0f0a2e]/50" : "flex items-center gap-3 px-6 py-4 border-b border-[#2a1f4f] bg-[#0f0a2e]/50"}>
										<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
											#
										</span>
										<div className="flex items-center gap-2">
											<span className="w-2 h-2 rounded-full bg-[#e91e8c] animate-pulse shadow-glow-magenta" />
											<span className="text-sm font-medium text-[#e91e8c] uppercase tracking-wide">
												Main Stage
											</span>
										</div>
									</div>

									{/* Queue List */}
									<div className="divide-y divide-[#2a1f4f]/50 max-h-[420px] overflow-y-auto scrollbar-thin">
										{(() => {
											// Compute live timings for all items to get correct times
											const allTimings =
												calculateLiveTimings(
													performanceItems.map(
														(item) => ({
															...item,
															is_completed:
																item.type ===
																"artist"
																	? item
																			.artist
																			?.rehearsal_completed &&
																		item.status ===
																			"completed"
																	: item.cue
																			?.is_completed,
															completed_at:
																item.type ===
																"cue"
																	? (
																			item.cue as any
																		)
																			?.completed_at
																	: undefined,
														}),
													) as any[],
													eventTimings.show_start_time,
													timeOverrides,
												);

											return nextItems.map(
												(item, index) => {
													// Find this item's index in the full performanceItems array
													const fullIndex =
														performanceItems.findIndex(
															(p) =>
																p.id ===
																item.id,
														);
													const timing =
														fullIndex >= 0
															? allTimings[
																	fullIndex
																]
															: null;

													return (
														<div
															key={item.id}
															className={`flex items-center px-6 py-4 gap-4 transition-colors ${isLightMode ? "hover:bg-gray-50" : "hover:bg-[#1a1147]/50"}`}
														>
															<span className={`w-6 text-lg font-bold ${isLightMode ? "text-purple-600" : "text-purple-600"}`}>
																{index + 1}
															</span>

															{/* Timing Badge */}
															{timing?.startTime && (
																<span
																	className={`text-xs font-mono px-1.5 py-0.5 rounded ${
																		timeOverrides[
																			item
																				.id
																		]
																			? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
																			: timing.isActual
																				? "bg-green-500/20 text-green-400 border border-green-500/30"
																				: "bg-gray-100 text-purple-600 border border-gray-200"
																	}`}
																>
																	{
																		timing.startTime
																	}
																</span>
															)}

															{/* Badge/Avatar */}
															{item.type ===
																"artist" &&
															item.artist ? (
																<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
																	{item.artist.artist_name
																		.charAt(
																			0,
																		)
																		.toUpperCase()}
																</div>
															) : item.type ===
																	"cue" &&
															  item.cue ? (
																<div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center">
																	{(() => {
																		const IconComponent =
																			getCueIcon(
																				item
																					.cue
																					?.type ||
																					"",
																			);
																		return (
																			<IconComponent className={`h-5 w-5 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
																		);
																	})()}
																</div>
															) : null}

															{/* Info */}
															<div className="flex-1 min-w-0">
																{/* First line: Artist name and status */}
																<div className="flex items-center gap-2 flex-wrap">
																	<span className="font-semibold text-white truncate">
																		{item.type ===
																			"artist" &&
																		item.artist
																			? item
																					.artist
																					.artist_name
																			: item.type ===
																						"cue" &&
																				  item.cue
																				? item
																						.cue
																						.title
																				: ""}
																	</span>
																	{/* Status badges matching Performance Order page */}
																	{item.status ===
																		"completed" && (
																		<span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/50">
																			Completed
																		</span>
																	)}
																	{item.status ===
																		"currently_on_stage" && (
																		<span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-green-500/20 text-green-400 border border-green-500/50">
																			On
																			Stage
																		</span>
																	)}
																	{item.status ===
																		"next_on_stage" && (
																		<span className={isLightMode ? "text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-[#d4af37]/20 text-purple-700 border border-[#d4af37]/50" : "text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50"}>
																			Next
																			on
																			Stage
																		</span>
																	)}
																	{item.status ===
																		"next_on_deck" && (
																		<span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">
																			On
																			Deck
																		</span>
																	)}
																	{(item.status ===
																		"not_started" ||
																		!item.status) && (
																		<span className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide bg-gray-500/20 text-gray-400 border border-gray-500/50">
																			Back
																			Stage
																		</span>
																	)}
																</div>
																{/* Second line: Nationality and Style */}
																{item.type ===
																	"artist" &&
																	item.artist && (
																		<div className="flex items-center gap-3 mt-1 text-xs text-purple-300">
																			{/* Nationality */}
																			{item
																				.artist
																				.members &&
																			item
																				.artist
																				.members
																				.length >
																				0 ? (
																				<div className="flex items-center gap-2 flex-wrap">
																					{item.artist.members.map(
																						(
																							member,
																							idx,
																						) => (
																							<div
																								key={
																									idx
																								}
																								className="flex items-center gap-1"
																							>
																								{member.homeCountry && (
																									<>
																										<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
																											From:
																										</span>
																										<span
																											className="text-base"
																											title={getCountryName(
																												member.homeCountry,
																											)}
																										>
																											{getCountryFlag(
																												member.homeCountry,
																											)}
																										</span>
																										<span>
																											{getCountryName(
																												member.homeCountry,
																											)}
																										</span>
																									</>
																								)}
																								{member.countryLiving &&
																									member.countryLiving !==
																										member.homeCountry && (
																										<>
																											<span className={isLightMode ? "text-purple-600 ml-2" : "text-purple-400 ml-2"}>
																												Living
																												in:
																											</span>
																											<span
																												className="text-base"
																												title={getCountryName(
																													member.countryLiving,
																												)}
																											>
																												{getCountryFlag(
																													member.countryLiving,
																												)}
																											</span>
																											<span>
																												{getCountryName(
																													member.countryLiving,
																												)}
																											</span>
																										</>
																									)}
																							</div>
																						),
																					)}
																				</div>
																			) : (
																				<div className="flex items-center gap-2 flex-wrap">
																					{(item
																						.artist
																						.home_country ||
																						item
																							.artist
																							.nationality) && (
																						<div className="flex items-center gap-1">
																							<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
																								From:
																							</span>
																							<span
																								className="text-base"
																								title={getCountryName(
																									item
																										.artist
																										.home_country ||
																										item
																											.artist
																											.nationality ||
																										"",
																								)}
																							>
																								{getCountryFlag(
																									item
																										.artist
																										.home_country ||
																										item
																											.artist
																											.nationality ||
																										"",
																								)}
																							</span>
																							<span>
																								{getCountryName(
																									item
																										.artist
																										.home_country ||
																										item
																											.artist
																											.nationality ||
																										"",
																								)}
																							</span>
																						</div>
																					)}
																					{item
																						.artist
																						.country_living &&
																						item
																							.artist
																							.country_living !==
																							item
																								.artist
																								.home_country && (
																							<div className="flex items-center gap-1">
																								<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
																									Living
																									in:
																								</span>
																								<span
																									className="text-base"
																									title={getCountryName(
																										item
																											.artist
																											.country_living,
																									)}
																								>
																									{getCountryFlag(
																										item
																											.artist
																											.country_living,
																									)}
																								</span>
																								<span>
																									{getCountryName(
																										item
																											.artist
																											.country_living,
																									)}
																								</span>
																							</div>
																						)}
																				</div>
																			)}
																			{/* Style */}
																			<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
																				{
																					item
																						.artist
																						.style
																				}
																			</span>
																		</div>
																	)}
															</div>

															{/* Cumulative Time - removed, using timing badges beside numbers instead */}
														</div>
													);
												},
											);
										})()}
									</div>
								</div>
							</div>

							{/* Right Column - Performance Order (1 column) */}
							<div className="lg:col-span-1">
								<div className={isLightMode ? "bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-full" : "bg-gradient-to-br from-[#1a1147] to-[#0f0a2e] border border-[#2a1f4f] rounded-2xl overflow-hidden shadow-2xl h-full"}>
									{/* Header */}
									<div className={isLightMode ? "px-6 py-4 border-b border-gray-200" : "px-6 py-4 border-b border-[#2a1f4f]"}>
										<h3 className="text-xl font-bold text-white uppercase tracking-wide">
											Performance Order
										</h3>
										<div className={isLightMode ? "flex items-center gap-4 mt-3 text-xs uppercase tracking-widest text-purple-700" : "flex items-center gap-4 mt-3 text-xs uppercase tracking-widest text-[#d4af37]"}>
											<span className="w-6">#</span>
											<span className="flex-1">
												Artist / Performance
											</span>
											<span>Time</span>
										</div>
									</div>

									{/* List */}
									<div className="divide-y divide-[#2a1f4f]/30 max-h-[600px] overflow-y-auto">
										{(() => {
											const liveTimings =
												calculateLiveTimings(
													performanceItems.map(
														(item) => ({
															...item,
															is_completed:
																item.type ===
																"artist"
																	? item
																			.artist
																			?.rehearsal_completed &&
																		item.status ===
																			"completed"
																	: item.cue
																			?.is_completed,
															completed_at:
																item.type ===
																"cue"
																	? (
																			item.cue as any
																		)
																			?.completed_at
																	: undefined,
														}),
													) as any[],
													eventTimings.show_start_time,
													timeOverrides,
												);
											return performanceItems.map(
												(item, index) => {
													const status =
														item.status ||
														"not_started";
													const isCompleted =
														status === "completed";
													const isActive =
														status ===
														"currently_on_stage";

													return (
														<div
															key={item.id}
															className={`flex items-start px-6 py-3 gap-4 transition-colors ${
																isCompleted
																	? "bg-[#d4af37]/10"
																	: isActive
																		? (isLightMode ? "bg-pink-50 border-l-4 border-l-pink-500" : "bg-[#1a1147]/80 border-l-4 border-l-[#e91e8c]")
																		: "hover:bg-purple-50/50"
															}`}
														>
															<span
																className={`w-6 text-lg font-semibold ${
																	isCompleted
																		? (isLightMode ? "text-purple-700" : "text-[#d4af37]")
																		: "text-purple-600"
																}`}
															>
																{index + 1}
															</span>

															{/* Live Timing */}
															{isActive ? (
																<span
																	className="text-xs font-mono px-1.5 py-0.5 rounded bg-green-500 text-white border border-green-400 animate-pulse"
																	title="Live time — Currently on Stage"
																>
																	{currentTime
																		? `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`
																		: "--:--"}
																</span>
															) : liveTimings[index]
																?.startTime && (
																<span
																	className={`text-xs font-mono px-1.5 py-0.5 rounded ${liveTimings[index]?.isActual ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-gray-100 text-purple-600 border border-gray-200"}`}
																>
																	{
																		liveTimings[
																			index
																		]
																			?.startTime
																	}
																</span>
															)}

															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 flex-wrap">
																	<span
																		className={`font-semibold ${
																			isCompleted
																				? "text-white"
																				: "text-white/90"
																		}`}
																	>
																		{item.type ===
																			"artist" &&
																		item.artist
																			? item
																					.artist
																					.artist_name
																			: item.type ===
																						"cue" &&
																				  item.cue
																				? item
																						.cue
																						.title
																				: ""}
																	</span>
																	{/* Nationality flags */}
																	{item.type ===
																		"artist" &&
																		item.artist && (
																			<>
																				{item
																					.artist
																					.members &&
																				item
																					.artist
																					.members
																					.length >
																					0 ? (
																					<div className="flex items-center gap-1">
																						{item.artist.members.map(
																							(
																								member,
																								idx,
																							) => (
																								<span
																									key={
																										idx
																									}
																									className="text-base"
																									title={`${member.name}: From ${getCountryName(member.homeCountry || "")}${member.countryLiving && member.countryLiving !== member.homeCountry ? `, Living in ${getCountryName(member.countryLiving)}` : ""}`}
																								>
																									{getCountryFlag(
																										member.homeCountry ||
																											"",
																									)}
																								</span>
																							),
																						)}
																					</div>
																				) : (
																					<>
																						{(item
																							.artist
																							.home_country ||
																							item
																								.artist
																								.nationality) && (
																							<span
																								className="text-lg"
																								title={`From ${getCountryName(item.artist.home_country || item.artist.nationality || "")}`}
																							>
																								{getCountryFlag(
																									item
																										.artist
																										.home_country ||
																										item
																											.artist
																											.nationality ||
																										"",
																								)}
																							</span>
																						)}
																						{item
																							.artist
																							.country_living &&
																							item
																								.artist
																								.country_living !==
																								item
																									.artist
																									.home_country && (
																								<span
																									className="text-base"
																									title={`Living in ${getCountryName(item.artist.country_living)}`}
																								>
																									🌍{" "}
																									{getCountryFlag(
																										item
																											.artist
																											.country_living,
																									)}
																								</span>
																							)}
																					</>
																				)}
																			</>
																		)}
																</div>
																{/* Nationality text and style */}
																<div className="flex flex-col gap-1 mt-1">
																	<span className={`text-sm ${isLightMode ? "text-purple-600" : "text-purple-600"}`}>
																		{item.type ===
																			"artist" &&
																		item.artist
																			? item
																					.artist
																					.style
																			: item.type ===
																						"cue" &&
																				  item.cue
																				? item.cue.type
																						.replace(
																							"_",
																							" ",
																						)
																						.toUpperCase()
																				: ""}
																	</span>
																	{/* Nationality text information */}
																	{item.type ===
																		"artist" &&
																		item.artist && (
																			<div className="flex flex-col gap-0.5 text-xs text-purple-300/80">
																				{item
																					.artist
																					.members &&
																				item
																					.artist
																					.members
																					.length >
																					0 ? (
																					<>
																						{item.artist.members.map(
																							(
																								member,
																								idx,
																							) => (
																								<div
																									key={
																										idx
																									}
																									className="flex items-center gap-1"
																								>
																									<span className={isLightMode ? "text-purple-600" : "text-purple-600"}>
																										{
																											member.name
																										}

																										:
																									</span>
																									{member.homeCountry && (
																										<span>
																											From{" "}
																											{getCountryName(
																												member.homeCountry,
																											)}
																										</span>
																									)}
																									{member.countryLiving &&
																										member.countryLiving !==
																											member.homeCountry && (
																											<span>
																												,
																												Living
																												in{" "}
																												{getCountryName(
																													member.countryLiving,
																												)}
																											</span>
																										)}
																								</div>
																							),
																						)}
																					</>
																				) : (
																					<>
																						{(item
																							.artist
																							.home_country ||
																							item
																								.artist
																								.nationality) && (
																							<span>
																								From{" "}
																								{getCountryName(
																									item
																										.artist
																										.home_country ||
																										item
																											.artist
																											.nationality ||
																										"",
																								)}
																							</span>
																						)}
																						{item
																							.artist
																							.country_living &&
																							item
																								.artist
																								.country_living !==
																								item
																									.artist
																									.home_country && (
																								<span>
																									Living
																									in{" "}
																									{getCountryName(
																										item
																											.artist
																											.country_living,
																									)}
																								</span>
																							)}
																					</>
																				)}
																			</div>
																		)}
																</div>
															</div>

															<span className={isLightMode ? "font-mono font-semibold text-purple-700 text-lg" : "font-mono font-semibold text-[#d4af37] text-lg"}>
																{item.type ===
																	"artist" &&
																item.artist
																	? formatDuration(
																			item
																				.artist
																				.actual_duration ||
																				item
																					.artist
																					.performance_duration *
																					60,
																		)
																	: item.type ===
																				"cue" &&
																		  item.cue
																		? formatDuration((item.cue.duration || 5) * 60 + (item.cue.extraTime || 0))
																		: ""}
															</span>
														</div>
													);
												},
											);
										})()}
									</div>
								</div>
							</div>
						</div>

						{/* Bottom accent line */}
						<div className="mt-6 h-1 bg-gradient-to-r from-[#e91e8c] via-[#d4af37] to-[#06b6d4] rounded-full opacity-60" />
					</TabsContent>
 
					<TabsContent value="live-board-2" className="mt-0">
						<LiveBoard2Component
							eventId={eventId}
							selectedDate={selectedDate}
							currentTime={currentTime}
							elapsedTime={elapsedTime}
							wsConnected={wsConnected}
							isDraftShowOrder={isDraftShowOrder}
							isShowOrderConfirmed={isShowOrderConfirmed}
							refreshTrigger={refreshTrigger}
							isLightMode={isLightMode}
						/>
					</TabsContent>

					<TabsContent value="live-board-3" className="mt-0">
						<LiveBoard3Component
							eventId={eventId}
							selectedDate={selectedDate}
							currentTime={currentTime}
							wsConnected={wsConnected}
							isDraftShowOrder={isDraftShowOrder}
							isShowOrderConfirmed={isShowOrderConfirmed}
							refreshTrigger={refreshTrigger}
							isLightMode={isLightMode}
						/>
					</TabsContent>

					{/* Rehearsal Schedule Tab */}
					<TabsContent value="rehearsal-schedule" className="mt-0">
						<div className={isLightMode ? "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" : "bg-gradient-to-br from-[#1a1147] to-[#0f0a2e] border border-[#2a1f4f] rounded-2xl shadow-2xl overflow-hidden"}>
							<div className={isLightMode ? "px-6 py-5 border-b border-gray-200" : "px-6 py-5 border-b border-[#2a1f4f]"}>
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
									<div>
										<h3 className="text-xl font-bold text-white flex items-center gap-2">
											<Calendar className={`h-5 w-5 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
											Rehearsal Schedule
										</h3>
										<div className="flex items-center gap-3 mt-1">
											<p className={isLightMode ? "text-sm text-purple-600" : "text-sm text-purple-400"}>
												Artists scheduled for rehearsal
											</p>
											{rehearsalShowDateInfo?.rehearsalTiming && (
												<Badge className={isLightMode ? "bg-[#d4af37]/20 text-purple-700 border border-[#d4af37]/50 font-mono text-xs" : "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50 font-mono text-xs"}>
													<Clock className="h-3 w-3 mr-1" />
													{
														rehearsalShowDateInfo.rehearsalTiming
													}
												</Badge>
											)}
										</div>
									</div>
									{availableDates.length > 0 && (
										<div className="flex items-center gap-2">
											<Label
												htmlFor="rehearsal-date-select"
												className="text-sm font-medium whitespace-nowrap text-purple-300"
											>
												Rehearsal Date:
											</Label>
											<Select
												value={selectedRehearsalDate}
												onValueChange={
													setSelectedRehearsalDate
												}
											>
												<SelectTrigger
													id="rehearsal-date-select"
													className={isLightMode ? "w-48 bg-[#0f0a2e] border-gray-200 text-white" : "w-48 bg-[#0f0a2e] border-[#2a1f4f] text-white"}
												>
													<SelectValue placeholder="Select date" />
												</SelectTrigger>
												<SelectContent className={isLightMode ? "bg-gray-100 border-[#2a1f4f]" : "bg-[#1a1147] border-[#2a1f4f]"}>
													{availableDates.map(
														(date, index) => (
															<SelectItem
																key={date}
																value={date}
																className="text-white hover:bg-[#0f0a2e] focus:bg-[#0f0a2e]"
															>
																Day {index + 1}{" "}
																-{" "}
																{formatDateSimple(
																	date,
																)}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
							</div>
							<div className="p-6">
								<div className="space-y-4">
									{(() => {
										// Use rehearsal_start_time from timing settings (preferred),
										// fallback to parsing rehearsalTiming from showDateInfo
										let rehearsalStartTime:
											| string
											| undefined =
											eventTimings.rehearsal_start_time ||
											undefined;
										if (!rehearsalStartTime) {
											const rehearsalTiming =
												rehearsalShowDateInfo?.rehearsalTiming;
											if (rehearsalTiming) {
												const startTimeStr =
													rehearsalTiming
														.split(" - ")[0]
														?.trim();
												if (
													startTimeStr &&
													/^\d{1,2}:\d{2}$/.test(
														startTimeStr,
													)
												) {
													rehearsalStartTime =
														startTimeStr;
												}
											}
										}

										const rehearsalLiveTimings =
											calculateLiveTimings(
												rehearsalArtists.map(
													(artist) => ({
														id: artist.id,
														type: "artist" as const,
														artist: {
															id: artist.id,
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
												rehearsalStartTime,
												rehearsalTimeOverrides,
											);

										return rehearsalArtists.map((artist, index) => {
											const avatarBg = [
												"bg-gradient-to-br from-[#d946ef] to-[#86198f]",
												"bg-gradient-to-br from-[#ec4899] to-[#be185d]",
												"bg-gradient-to-br from-[#8b5cf6] to-[#5b21b6]",
												"bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]",
												"bg-gradient-to-br from-[#06b6d4] to-[#0891b2]",
												"bg-gradient-to-br from-[#10b981] to-[#047857]",
											][index % 6];

											return (
												<div
													key={artist.id}
													className={isLightMode ? "flex items-center justify-between p-5 rounded-xl border border-gray-200 bg-[#130d36]/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200" : "flex items-center justify-between p-5 rounded-xl border border-[#2a1f4f] bg-[#130d36]/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"}
												>
													{/* Left Group */}
													<div className="flex items-center gap-5 flex-1 min-w-0">
														{/* Order Number */}
														<span className={isLightMode ? "w-8 text-xl font-bold text-purple-600 text-center" : "w-8 text-xl font-bold text-purple-400 text-center"}>
															{index + 1}
														</span>

														{/* Artist Avatar */}
														<div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md ${avatarBg}`}>
															{artist.artist_name
																.charAt(0)
																.toUpperCase()}
														</div>

														{/* Artist Info */}
														<div className="min-w-0">
															<div className="flex items-center gap-2 flex-wrap">
																<div className="font-bold text-xl sm:text-2xl text-white tracking-wide">
																	{artist.artist_name}
																</div>
																{/* Nationality Information */}
																{artist.members && artist.members.length > 0 ? (
																	<div className="flex items-center gap-1.5 flex-wrap">
																		{artist.members.map((member: any, idx: number) => (
																			<div key={idx} className="flex items-center gap-1">
																				{member.homeCountry && (
																					<span
																						className="text-lg"
																						title={`${member.name}: ${getCountryName(member.homeCountry)}`}
																					>
																						{getCountryFlag(member.homeCountry)}
																					</span>
																				)}
																				{member.countryLiving && member.countryLiving !== member.homeCountry && (
																					<>
																						<Globe className={isLightMode ? "h-3.5 w-3.5 text-purple-600 opacity-70" : "h-3.5 w-3.5 text-purple-400 opacity-70"} />
																						<span
																							className="text-base"
																							title={`${member.name}: Living in ${getCountryName(member.countryLiving)}`}
																						>
																							{getCountryFlag(member.countryLiving)}
																						</span>
																					</>
																				)}
																			</div>
																		))}
																	</div>
																) : (
																	<div className="flex items-center gap-1.5">
																		{(artist.home_country || artist.nationality) && (
																			<span
																				className="text-lg"
																				title={getCountryName(artist.home_country || artist.nationality || "")}
																			>
																				{getCountryFlag(artist.home_country || artist.nationality || "")}
																			</span>
																		)}
																		{artist.country_living && artist.country_living !== artist.home_country && (
																			<>
																				<Globe className={isLightMode ? "h-3.5 w-3.5 text-purple-600 opacity-70" : "h-3.5 w-3.5 text-purple-400 opacity-70"} />
																				<span
																					className="text-base"
																					title={`Living in ${getCountryName(artist.country_living)}`}
																				>
																					{getCountryFlag(artist.country_living)}
																				</span>
																			</>
																		)}
																	</div>
																)}
															</div>
															<div className={isLightMode ? "text-sm text-purple-600 flex items-center gap-3 mt-1.5" : "text-sm text-purple-400 flex items-center gap-3 mt-1.5"}>
																<span className="bg-[#3b0764]/50 text-purple-300 border border-[#6b21a8]/35 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
																	{artist.style}
																</span>
																{artist.actual_duration && (
																	<span className="flex items-center gap-1.5 text-purple-300 font-medium">
																		<Clock className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
																		{formatDuration(artist.actual_duration)}
																	</span>
																)}
															</div>
														</div>
													</div>

													{/* Right Group */}
													<div className="flex items-center gap-6">
														{/* Status Badge */}
														{artist.rehearsal_completed ? (
															<div className="bg-[#10b981] text-white flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm shadow-md shadow-emerald-950/20 hover:bg-[#10b981] cursor-default">
																<CheckCircle className="h-4 w-4" />
																Completed
															</div>
														) : (
															<div className={isLightMode ? "bg-gray-100/50 text-purple-300 border border-[#5b21b6]/30 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm cursor-default" : "bg-[#1a1147]/50 text-purple-300 border border-[#5b21b6]/30 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm cursor-default"}>
																<Clock className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
																Scheduled
															</div>
														)}

														{/* Time */}
														<span className={`text-2xl font-mono font-bold ${isLightMode ? "text-purple-700" : "text-purple-700"} min-w-[70px] text-right tracking-tight`}>
															{rehearsalLiveTimings[index]?.startTime || "--:--"}
														</span>
													</div>
												</div>
											);
										});
									})()}
								</div>

								{rehearsalArtists.length === 0 && (
									<div className="text-center py-16">
										<div className="flex justify-center mb-6">
											<div className="p-6 bg-purple-600/20 rounded-full">
												<Calendar className={isLightMode ? "h-16 w-16 text-purple-600" : "h-16 w-16 text-purple-400"} />
											</div>
										</div>
										<h3 className="text-xl font-bold mb-2 text-white">
											No rehearsals scheduled
										</h3>
										<p className={isLightMode ? "text-purple-600 text-base" : "text-purple-400 text-base"}>
											No artists scheduled for rehearsal
											on this date.
										</p>
										<p className="text-purple-500 text-sm mt-2">
											Stage managers can schedule
											rehearsals from the Rehearsal page.
										</p>
									</div>
								)}
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

function LiveBoard2Component({
	eventId,
	selectedDate,
	currentTime,
	elapsedTime,
	wsConnected,
	isDraftShowOrder,
	isShowOrderConfirmed,
	refreshTrigger,
	isLightMode,
}: {
	eventId: string;
	selectedDate: string;
	currentTime: Date | null;
	elapsedTime: number;
	wsConnected: boolean;
	isDraftShowOrder: boolean;
	isShowOrderConfirmed: boolean;
	refreshTrigger: number;
	isLightMode: boolean;
}) {
	const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
	const [eventTimings, setEventTimings] = useState<{
		backstage_ready_time?: string;
		show_start_time?: string;
	}>({});
	const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	const fetchLiveBoardData = async () => {
		if (!eventId || !selectedDate) return;
		try {
			const dateToUse = selectedDate.includes("T") ? selectedDate.split("T")[0] : selectedDate;
			const queryParam = `?t=${Date.now()}${dateToUse ? `&performanceDate=${dateToUse}` : ""}`;
			
			// 1. Fetch timings
			const timingsRes = await fetch(`/api/events/${eventId}/timing-settings${queryParam}`);
			let overrides: any = {};
			if (timingsRes.ok) {
				const result = await timingsRes.json();
				if (result.success && result.data) {
					overrides = result.data.time_overrides || {};
					setEventTimings({
						backstage_ready_time: result.data.backstage_ready_time,
						show_start_time: result.data.show_start_time,
					});
					setTimeOverrides(overrides);
				}
			}

			// 2. Fetch artists
			const artistsRes = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			let artistList: any[] = [];
			if (artistsRes.ok) {
				const data = await artistsRes.json();
				if (data.success) {
					artistList = data.data || [];
				}
			}

			// 3. Fetch cues
			const cuesRes = await fetch(`/api/events/${eventId}/cues?performanceDate=${selectedDate}&t=${Date.now()}`);
			let cueList: any[] = [];
			if (cuesRes.ok) {
				const data = await cuesRes.json();
				if (data.success) {
					cueList = data.data || [];
				}
			}

			// Normalize and sort items
			const filteredArtists = artistList.map((artist: any) => ({
				id: artist.id,
				artist_name: artist.artistName || artist.artist_name,
				style: artist.style,
				image_url: artist.image_url || "",
				performance_duration: artist.performanceDuration || artist.performance_duration || 5,
				actual_duration: artist.musicTrack?.duration || artist.musicTracks?.find((track: any) => track.is_main_track)?.duration || null,
				performance_order: artist.performance_order || null,
				rehearsal_completed: artist.rehearsal_completed || false,
				performance_status: artist.performance_status || null,
				performance_date: artist.performanceDate || artist.performance_date,
				country_living: artist.country_living || artist.countryLiving,
				home_country: artist.home_country || artist.homeCountry,
				nationality: artist.nationality,
				members: artist.members || null,
				eventShowId: artist.eventShowId,
				props_needed: artist.props_needed || "",
				performance_notes: artist.performance_notes || artist.mc_notes || "",
				mc_notes: artist.mc_notes || "",
				biography: artist.biography || "",
				artist_notes: artist.artist_notes || artist.artistNotes || "",
			})).filter((a: any) => {
				if (!a.performance_date) return false;
				const artistDate = a.performance_date.includes("T") ? a.performance_date.split("T")[0] : a.performance_date;
				const targetDate = selectedDate.includes("T") ? selectedDate.split("T")[0] : selectedDate;
				return artistDate === targetDate;
			});

			const assignedArtists = filteredArtists
				.filter((a: any) => a.performance_order !== null || (a.performance_status && a.performance_status !== "not_started" && a.rehearsal_completed))
				.map((artist: any) => {
					let displayOrder = artist.performance_order;
					if (!displayOrder && artist.performance_status && artist.performance_status !== "not_started") {
						const maxOrder = Math.max(0, ...filteredArtists.filter((art: any) => art.performance_order !== null).map((art: any) => art.performance_order || 0));
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
						status: (artist.performance_status || "not_started") as PerformanceItem["status"],
					};
				});

			const cueItems = cueList.map((cue: any) => ({
				id: cue.id,
				type: "cue" as const,
				cue: {
					...cue,
					mc_notes: cue.mc_notes,
				},
				performance_order: cue.performance_order,
				status: (cue.performance_status || (cue.is_completed ? "completed" : "not_started")) as PerformanceItem["status"],
			}));

			const combined = [...assignedArtists, ...cueItems].sort((a, b) => a.performance_order - b.performance_order);
			setPerformanceItems(combined);
			setLoading(false);
		} catch (error) {
			console.error("Error in LiveBoard 2 data fetching:", error);
		}
	};

	// Fetch data when date, event, or manual/websocket refresh trigger changes
	useEffect(() => {
		fetchLiveBoardData();
	}, [eventId, selectedDate, refreshTrigger]);

	// Setup a clean polling interval to ensure live board is always in sync
	useEffect(() => {
		const interval = setInterval(fetchLiveBoardData, 4000);
		return () => clearInterval(interval);
	}, [eventId, selectedDate]);

	const currentItem = performanceItems.find((item) => item.status === "currently_on_stage") || null;

	const nextItems = performanceItems.filter(
		(item) =>
			item.status === "not_started" ||
			item.status === "next_on_stage" ||
			item.status === "next_on_deck" ||
			(!item.status && item.type === "cue" && !item.cue?.is_completed),
	);

	const getCurrentPerformerRemainingTime = () => {
		if (!currentItem) return 0;
		let totalDuration = 0;
		if (currentItem.type === "artist" && currentItem.artist) {
			totalDuration = currentItem.artist.actual_duration
				? currentItem.artist.actual_duration
				: (currentItem.artist.performance_duration || 0) * 60;
		} else if (currentItem.type === "cue" && currentItem.cue) {
			totalDuration = (currentItem.cue.duration || 0) * 60 + (currentItem.cue.extraTime || 0);
		}
		return Math.max(0, totalDuration - elapsedTime);
	};

	const getCurrentPerformerTotalDuration = () => {
		if (!currentItem) return 0;
		if (currentItem.type === "artist" && currentItem.artist) {
			return currentItem.artist.actual_duration
				? currentItem.artist.actual_duration
				: (currentItem.artist.performance_duration || 0) * 60;
		} else if (currentItem.type === "cue" && currentItem.cue) {
			return (currentItem.cue.duration || 0) * 60 + (currentItem.cue.extraTime || 0);
		}
		return 0;
	};

	const formatTimeRemaining = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const formatCurrentTime = (date: Date | null) => {
		if (!date) return "--:--:--";
		const hrs = date.getHours().toString().padStart(2, "0");
		const mins = date.getMinutes().toString().padStart(2, "0");
		const secs = date.getSeconds().toString().padStart(2, "0");
		return `${hrs}:${mins}:${secs}`;
	};

	const getCueIcon = (cueType: string) => {
		const iconMap: { [key: string]: any } = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType] || Video;
	};

	const liveTimings = calculateLiveTimings(
		performanceItems.map((item) => ({
			...item,
			is_completed: item.type === "artist" ? item.artist?.rehearsal_completed && item.status === "completed" : item.cue?.is_completed,
			completed_at: item.type === "cue" ? (item.cue as any)?.completed_at : undefined,
		})) as any[],
		eventTimings.show_start_time,
		timeOverrides
	);

	const completedCount = performanceItems.filter(item => item.status === "completed").length;
	const totalCount = performanceItems.length;
	const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	// Calculate active performance details
	const currentTotalDuration = getCurrentPerformerTotalDuration();
	const currentElapsedTime = currentTotalDuration > 0 ? Math.min(elapsedTime, currentTotalDuration) : 0;
	const currentProgressPercent = currentTotalDuration > 0 ? (currentElapsedTime / currentTotalDuration) * 100 : 0;
	const currentRemainingTime = getCurrentPerformerRemainingTime();

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
				<p className="text-purple-300 font-medium">Loading Live Dashboard data...</p>
			</div>
		);
	}

	return (
		<div className="animate-fade-in flex flex-col gap-6 w-full">
			{/* Top Bar Banner: Integrated Live Clock, Stats, & Show Progress */}
			<div className="bg-[#110c36]/60 border border-purple-900/40 rounded-2xl p-6 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 backdrop-blur-md">
				{/* Left Section: Live Clock */}
				<div className="flex items-center gap-4 shrink-0">
					<div className="relative flex items-center justify-center">
						<span className="absolute inline-flex h-4.5 w-4.5 rounded-full bg-red-500 opacity-75 animate-ping" />
						<span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600" />
					</div>
					<div>
						<span className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold block leading-none mb-1">
							Live Monitor Clock
						</span>
						<span className="text-3xl font-black font-mono tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
							{formatCurrentTime(currentTime)}
						</span>
					</div>
				</div>

				{/* Middle Section: Progress Slider */}
				<div className="flex-1 max-w-xl">
					<div className="flex justify-between items-center mb-2">
						<span className="text-xs uppercase tracking-[0.15em] text-purple-300 font-bold">
							Event Progress
						</span>
						<span className="text-xs font-bold text-green-400">
							{completedCount} / {totalCount} Performances Completed
						</span>
					</div>
					<div className="w-full bg-[#08051a] h-3.5 rounded-full overflow-hidden border border-purple-950 p-0.5">
						<div 
							className="bg-gradient-to-r from-purple-600 via-pink-500 to-green-400 h-full rounded-full transition-all duration-700" 
							style={{ width: `${progressPercent}%` }} 
						/>
					</div>
				</div>

				{/* Right Section: Timings & Status */}
				<div className="flex items-center gap-6 divide-x divide-purple-800/30 shrink-0">
					<div className="text-center px-4">
						<span className={isLightMode ? "text-[10px] uppercase tracking-widest text-purple-600 block mb-1" : "text-[10px] uppercase tracking-widest text-purple-400 block mb-1"}>Show Start</span>
						<span className={isLightMode ? "text-xl font-bold font-mono text-purple-700" : "text-xl font-bold font-mono text-[#d4af37]"}>{eventTimings.show_start_time || "--:--"}</span>
					</div>
					<div className="text-center px-4 pl-6">
						<span className={isLightMode ? "text-[10px] uppercase tracking-widest text-purple-600 block mb-1" : "text-[10px] uppercase tracking-widest text-purple-400 block mb-1"}>Backstage Ready</span>
						<span className={isLightMode ? "text-xl font-bold font-mono text-purple-700" : "text-xl font-bold font-mono text-[#d4af37]"}>{eventTimings.backstage_ready_time || "--:--"}</span>
					</div>
					<div className="text-center px-4 pl-6 flex flex-col items-center">
						<span className={isLightMode ? "text-[10px] uppercase tracking-widest text-purple-600 block mb-1" : "text-[10px] uppercase tracking-widest text-purple-400 block mb-1"}>Network</span>
						<span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${wsConnected ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
							<span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
							{wsConnected ? "Connected" : "Syncing"}
						</span>
					</div>
				</div>
			</div>

			{/* Main Grid Content */}
			<div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full items-start">
				
				{/* LEFT COLUMN: Stage Hero Performer & Upcoming Cards */}
				<div className="xl:col-span-8 flex flex-col gap-8">
					
					{/* NOW ON STAGE CARD (Glassmorphic Broadcast Look) */}
					<div className="bg-gradient-to-br from-[#120a32]/85 via-[#070318]/95 to-[#1c0c45]/90 border border-purple-700/40 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
						{/* Background light gradients */}
						<div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />
						<div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

						<div className="relative flex flex-col gap-6">
							{/* Badge Row */}
							<div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping shadow-glow-green" />
									<span className="text-xs uppercase tracking-[0.2em] text-green-400 font-black">
										{currentItem ? "Currently on Stage" : "Stage Clear"}
									</span>
								</div>
								{currentItem && (
									<Badge variant="outline" className={isLightMode ? "bg-purple-950/60 border-purple-800/60 text-purple-700 text-[10px] uppercase tracking-[0.15em] font-bold py-1 px-3" : "bg-purple-950/60 border-purple-800/60 text-[#d4af37] text-[10px] uppercase tracking-[0.15em] font-bold py-1 px-3"}>
										Act #{performanceItems.findIndex(p => p.id === currentItem.id) + 1}
									</Badge>
								)}
							</div>

							{currentItem ? (
								<div className="flex flex-col gap-8">
									{/* Performer Name & Info Row */}
									<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
										<div className="flex-1 min-w-0">
											{currentItem.type === "artist" && currentItem.artist ? (
												<div className="flex flex-col gap-3">
													<div className="flex items-center gap-4 flex-wrap">
														<h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-pink-200">
															{currentItem.artist.artist_name}
														</h2>
														{currentItem.artist.members && currentItem.artist.members.length > 0 ? (
															<div className="flex items-center gap-1.5">
																{currentItem.artist.members.map((member, idx) => (
																	<span 
																		key={idx}
																		className="text-3xl filter drop-shadow-md hover:scale-110 transition-transform cursor-help"
																		title={`${member.name}: ${getCountryName(member.homeCountry)}`}
																	>
																		{getCountryFlag(member.homeCountry)}
																	</span>
																))}
															</div>
														) : (
															(currentItem.artist.home_country || currentItem.artist.nationality) && (
																<span 
																	className="text-4xl filter drop-shadow-md hover:scale-110 transition-transform cursor-help"
																	title={getCountryName(currentItem.artist.home_country || currentItem.artist.nationality || "")}
																>
																	{getCountryFlag(currentItem.artist.home_country || currentItem.artist.nationality || "")}
																</span>
															)
														)}
													</div>
													<div className="flex items-center gap-3">
														<span className={isLightMode ? "text-lg text-purple-700 font-bold tracking-wide" : "text-lg text-[#d4af37] font-bold tracking-wide"}>
															{currentItem.artist.style}
														</span>
														<span className={isLightMode ? "text-purple-600/50" : "text-purple-400/50"}>•</span>
														<span className="text-purple-300 text-sm flex items-center gap-1">
															<Music className={isLightMode ? "w-3.5 h-3.5 text-purple-600" : "w-3.5 h-3.5 text-purple-400"} />
															Main Performance Track
														</span>
													</div>
												</div>
											) : currentItem.type === "cue" && currentItem.cue ? (
												<div className="flex flex-col gap-3">
													<div className="flex items-center gap-3">
														{(() => {
															const IconComp = getCueIcon(currentItem.cue.type);
															return <IconComp className="w-8 h-8 text-pink-500 shrink-0" />;
														})()}
														<h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-pink-200">
															{currentItem.cue.title}
														</h2>
													</div>
													<span className={isLightMode ? "text-lg text-purple-700 font-bold tracking-wide uppercase" : "text-lg text-[#d4af37] font-bold tracking-wide uppercase"}>
														{currentItem.cue.type.replace("_", " ")}
													</span>
												</div>
											) : null}
										</div>

										{/* Digital Timer */}
										<div className="flex flex-col items-center justify-center bg-[#050310] border border-purple-900/50 rounded-2xl px-8 py-5 shadow-inner min-w-[200px] sm:min-w-[240px] shrink-0 self-start lg:self-center">
											<span className={`text-6xl sm:text-7xl font-black font-mono tracking-widest leading-none drop-shadow-[0_0_15px_rgba(233,30,140,0.3)] ${
												currentRemainingTime <= 30 ? "text-red-500 animate-pulse" : "text-[#e91e8c]"
											}`}>
												{formatTimeRemaining(currentRemainingTime)}
											</span>
											<span className={isLightMode ? "text-[10px] uppercase tracking-[0.2em] text-purple-600 font-bold mt-2" : "text-[10px] uppercase tracking-[0.2em] text-purple-400 font-bold mt-2"}>
												Time Remaining
											</span>
										</div>
									</div>

									{/* Visual Progress of Active Track */}
									<div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4 flex flex-col gap-2">
										<div className="flex justify-between items-center text-xs font-mono text-purple-300">
											<span>Elapsed: {formatTimeRemaining(currentElapsedTime)}</span>
											<span>Total duration: {formatTimeRemaining(currentTotalDuration)}</span>
										</div>
										<div className="w-full bg-[#08051a] h-2 rounded-full overflow-hidden p-0.5">
											<div 
												className="bg-[#e91e8c] h-full rounded-full transition-all duration-1000"
												style={{ width: `${currentProgressPercent}%` }}
											/>
										</div>
									</div>

									{/* STAGE & MC NOTES AREA */}
									{currentItem && (
										(() => {
											const notes = currentItem.type === "artist" && currentItem.artist 
												? [
													currentItem.artist.mc_notes && `MC Notes: ${currentItem.artist.mc_notes}`,
													currentItem.artist.props_needed && `Props Needed: ${currentItem.artist.props_needed}`,
													currentItem.artist.biography && `Bio: ${currentItem.artist.biography}`,
													currentItem.artist.performance_notes && `Stage Notes: ${currentItem.artist.performance_notes}`
												].filter(Boolean).join(" | ")
												: currentItem.cue?.notes;
											
											if (!notes) return null;

											return (
												<div className="bg-[#e91e8c]/5 border border-[#e91e8c]/20 rounded-xl p-4 flex items-start gap-3 mt-1">
													<AlertTriangle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
													<div>
														<span className="text-xs uppercase tracking-wider text-pink-400 font-bold block mb-1">
															Stage & MC Broadcast Cue Notes
														</span>
														<p className="text-sm text-purple-200 leading-relaxed">
															{notes}
														</p>
													</div>
												</div>
											);
										})()
									)}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-20 text-center">
									<div className={isLightMode ? "w-16 h-16 rounded-full bg-purple-950/40 border border-purple-900/40 flex items-center justify-center mb-4 text-purple-600 animate-pulse" : "w-16 h-16 rounded-full bg-purple-950/40 border border-purple-900/40 flex items-center justify-center mb-4 text-purple-400 animate-pulse"}>
										<Play className="w-8 h-8" />
									</div>
									<h3 className="text-2xl font-bold text-purple-300">No performance currently on stage</h3>
									<p className={isLightMode ? "text-purple-600/60 text-sm mt-1" : "text-purple-400/60 text-sm mt-1"}>Waiting for the stage manager to launch the next act.</p>
								</div>
							)}
						</div>

						{/* Backstage status indicator */}
						<div className="mt-8 pt-6 border-t border-purple-900/30 flex items-center justify-between text-xs sm:text-sm text-purple-300 font-semibold tracking-wider uppercase">
							<div className="flex items-center gap-2 text-yellow-400">
								<span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping shadow-glow-gold" />
								<span>Backstage Status</span>
							</div>
							<div className="text-purple-200">
								Next performer on deck by: <span className={isLightMode ? "text-purple-700 font-bold font-mono" : "text-[#d4af37] font-bold font-mono"}>{eventTimings.backstage_ready_time || "--:--"}</span>
							</div>
						</div>
					</div>

					{/* UP NEXT IN QUEUE */}
					<div>
						<h3 className="text-lg font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
							<Clock className="w-5 h-5 text-pink-500" />
							<span>Up Next in Queue</span>
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							{/* Next performer */}
							<div className="bg-[#120a32]/70 border border-purple-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden hover:border-purple-700/50 transition-colors">
								<div className="absolute top-2 right-4 text-[10px] font-bold text-pink-500 uppercase tracking-widest">
									Next on Stage
								</div>
								{nextItems[0] ? (
									<div className="flex items-start gap-4">
										<div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center text-lg font-bold font-mono shrink-0">
											#1
										</div>
										<div className="flex-1 min-w-0">
											<p className={isLightMode ? "text-xs text-purple-600 uppercase tracking-wider font-semibold" : "text-xs text-purple-400 uppercase tracking-wider font-semibold"}>Est: {
												(() => {
													const nextItem = nextItems[0];
													const fullIndex = performanceItems.findIndex(p => p.id === nextItem.id);
													return fullIndex >= 0 ? liveTimings[fullIndex]?.startTime || "--:--" : "--:--";
												})()
											}</p>
											<h4 className="font-bold text-white text-lg truncate mt-1">
												{nextItems[0].type === "artist" && nextItems[0].artist ? nextItems[0].artist.artist_name : nextItems[0].cue?.title}
											</h4>
											<p className="text-xs text-purple-300 mt-0.5 truncate flex items-center gap-1.5">
												{nextItems[0].type === "artist" ? (
													<>
														<Music className={isLightMode ? "w-3 h-3 text-purple-700" : "w-3 h-3 text-[#d4af37]"} />
														{nextItems[0].artist?.style}
													</>
												) : (
													<>
														{(() => {
															const CueIcon = getCueIcon(nextItems[0].cue?.type || "");
															return <CueIcon className={isLightMode ? "w-3 h-3 text-purple-700" : "w-3 h-3 text-[#d4af37]"} />;
														})()}
														Cue Break
													</>
												)}
											</p>
										</div>
									</div>
								) : (
									<div className="text-center py-6 text-purple-500 text-sm font-medium">
										No upcoming items
									</div>
								)}
							</div>

							{/* On deck performer */}
							<div className="bg-[#120a32]/70 border border-purple-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden hover:border-purple-700/50 transition-colors">
								<div className="absolute top-2 right-4 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
									On Deck
								</div>
								{nextItems[1] ? (
									<div className="flex items-start gap-4">
										<div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-lg font-bold font-mono shrink-0">
											#2
										</div>
										<div className="flex-1 min-w-0">
											<p className={isLightMode ? "text-xs text-purple-600 uppercase tracking-wider font-semibold" : "text-xs text-purple-400 uppercase tracking-wider font-semibold"}>Est: {
												(() => {
													const nextItem = nextItems[1];
													const fullIndex = performanceItems.findIndex(p => p.id === nextItem.id);
													return fullIndex >= 0 ? liveTimings[fullIndex]?.startTime || "--:--" : "--:--";
												})()
											}</p>
											<h4 className="font-bold text-white text-lg truncate mt-1">
												{nextItems[1].type === "artist" && nextItems[1].artist ? nextItems[1].artist.artist_name : nextItems[1].cue?.title}
											</h4>
											<p className="text-xs text-purple-300 mt-0.5 truncate flex items-center gap-1.5">
												{nextItems[1].type === "artist" ? (
													<>
														<Music className={isLightMode ? "w-3 h-3 text-purple-700" : "w-3 h-3 text-[#d4af37]"} />
														{nextItems[1].artist?.style}
													</>
												) : (
													<>
														{(() => {
															const CueIcon = getCueIcon(nextItems[1].cue?.type || "");
															return <CueIcon className={isLightMode ? "w-3 h-3 text-purple-700" : "w-3 h-3 text-[#d4af37]"} />;
														})()}
														Cue Break
													</>
												)}
											</p>
										</div>
									</div>
								) : (
									<div className="text-center py-6 text-purple-500 text-sm font-medium">
										No upcoming items
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Show Timeline performance order */}
				<div className="xl:col-span-4 w-full">
					<div className="bg-[#110c36]/60 border border-purple-900/40 rounded-3xl p-6 shadow-2xl flex flex-col h-full min-h-[600px] xl:max-h-[720px]">
						<h3 className="text-lg font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
							<Users className={isLightMode ? "w-5 h-5 text-purple-600" : "w-5 h-5 text-purple-400"} />
							<span>Show Timeline</span>
						</h3>
						
						<div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
							{performanceItems.map((item, index) => {
								const isCompleted = item.status === "completed";
								const isActive = item.status === "currently_on_stage";
								
								return (
									<div
										key={item.id}
										className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
											isActive
												? "bg-gradient-to-r from-[#20155a] to-[#120a3a] border-[#e91e8c] shadow-md shadow-pink-500/10 scale-[1.02]"
												: isCompleted
													? "bg-[#0b0724]/40 border-purple-950/20 opacity-40"
													: "bg-[#130c36]/40 border-purple-950/30 hover:border-purple-900/50"
										}`}
									>
										<div className="flex items-center gap-3.5 min-w-0">
											{/* Indicator Dot */}
											<div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
												isActive
													? "bg-[#e91e8c] text-white"
													: isCompleted
														? "bg-green-500/25 text-green-400 border border-green-500/30"
														: "bg-gray-100 text-purple-600 border border-purple-200"
											}`}>
												{isCompleted ? "✓" : index + 1}
											</div>

											{/* Item name and type */}
											<div className="min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<h4 className={`font-bold text-sm truncate ${isActive ? "text-white text-base" : "text-purple-100"}`}>
														{item.type === "artist" && item.artist ? item.artist.artist_name : item.cue?.title}
													</h4>
													{item.type === "artist" && item.artist && (
														<span className="text-base" title={getCountryName(item.artist.home_country || item.artist.nationality || "")}>
															{getCountryFlag(item.artist.home_country || item.artist.nationality || "")}
														</span>
													)}
												</div>
												<p className={isLightMode ? "text-xs text-purple-600 mt-0.5 truncate flex items-center gap-1" : "text-xs text-purple-400 mt-0.5 truncate flex items-center gap-1"}>
													{item.type === "artist" ? (
														<>
															<Music className="w-3 h-3 text-purple-500/70" />
															{item.artist?.style}
														</>
													) : (
														<>
															{(() => {
																const CueIcon = getCueIcon(item.cue?.type || "");
																return <CueIcon className="w-3 h-3 text-purple-500/70" />;
															})()}
															{item.cue?.type.replace("_", " ").toUpperCase()}
														</>
													)}
												</p>
											</div>
										</div>

										{/* Time Badge and Duration */}
										<div className="flex flex-col items-end shrink-0 ml-3">
											<span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
												isActive 
													? "bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse" 
													: "bg-[#1b154c] text-purple-300 border border-purple-900/30"
											}`}>
												{liveTimings[index]?.startTime || "--:--"}
											</span>
											<span className={isLightMode ? "text-[10px] text-purple-600 font-mono mt-1" : "text-[10px] text-purple-400 font-mono mt-1"}>
												{item.type === "artist" && item.artist 
													? formatDuration(item.artist.actual_duration || item.artist.performance_duration * 60) 
													: formatDuration((item.cue?.duration || 5) * 60 + (item.cue?.extraTime || 0))}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
			{/* Bottom Accent line */}
			<div className="mt-8 h-1.5 bg-gradient-to-r from-[#e91e8c] via-[#d4af37] to-[#06b6d4] rounded-full opacity-50" />
		</div>
	);
}

function LiveBoard3Component({
	eventId,
	selectedDate,
	currentTime,
	wsConnected,
	isDraftShowOrder,
	isShowOrderConfirmed,
	refreshTrigger,
	isLightMode,
}: {
	eventId: string;
	selectedDate: string;
	currentTime: Date | null;
	wsConnected: boolean;
	isDraftShowOrder: boolean;
	isShowOrderConfirmed: boolean;
	refreshTrigger: number;
	isLightMode: boolean;
}) {
	const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
	const [eventTimings, setEventTimings] = useState<{
		backstage_ready_time?: string;
		show_start_time?: string;
	}>({});
	const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	
	// Unique Interactive States
	const [filter, setFilter] = useState<"all" | "artists" | "cues">("all");
	const [searchQuery, setSearchQuery] = useState("");

	const fetchLiveBoardData = async () => {
		if (!eventId || !selectedDate) return;
		try {
			const dateToUse = selectedDate.includes("T") ? selectedDate.split("T")[0] : selectedDate;
			const queryParam = `?t=${Date.now()}${dateToUse ? `&performanceDate=${dateToUse}` : ""}`;
			
			// 1. Fetch timings
			const timingsRes = await fetch(`/api/events/${eventId}/timing-settings${queryParam}`);
			let overrides: any = {};
			if (timingsRes.ok) {
				const result = await timingsRes.json();
				if (result.success && result.data) {
					overrides = result.data.time_overrides || {};
					setEventTimings({
						backstage_ready_time: result.data.backstage_ready_time,
						show_start_time: result.data.show_start_time,
					});
					setTimeOverrides(overrides);
				}
			}

			// 2. Fetch artists
			const artistsRes = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			let artistList: any[] = [];
			if (artistsRes.ok) {
				const data = await artistsRes.json();
				if (data.success) {
					artistList = data.data || [];
				}
			}

			// 3. Fetch cues
			const cuesRes = await fetch(`/api/events/${eventId}/cues?performanceDate=${selectedDate}&t=${Date.now()}`);
			let cueList: any[] = [];
			if (cuesRes.ok) {
				const data = await cuesRes.json();
				if (data.success) {
					cueList = data.data || [];
				}
			}

			// Normalize and sort items
			const filteredArtists = artistList.map((artist: any) => ({
				id: artist.id,
				artist_name: artist.artistName || artist.artist_name,
				style: artist.style,
				image_url: artist.image_url || "",
				performance_duration: artist.performanceDuration || artist.performance_duration || 5,
				actual_duration: artist.musicTrack?.duration || artist.musicTracks?.find((track: any) => track.is_main_track)?.duration || null,
				performance_order: artist.performance_order || null,
				rehearsal_completed: artist.rehearsal_completed || false,
				performance_status: artist.performance_status || null,
				performance_date: artist.performanceDate || artist.performance_date,
				country_living: artist.country_living || artist.countryLiving,
				home_country: artist.home_country || artist.homeCountry,
				nationality: artist.nationality,
				members: artist.members || null,
				eventShowId: artist.eventShowId,
				props_needed: artist.props_needed || "",
				performance_notes: artist.performance_notes || artist.mc_notes || "",
				mc_notes: artist.mc_notes || "",
				biography: artist.biography || "",
				artist_notes: artist.artist_notes || artist.artistNotes || "",
			})).filter((a: any) => {
				if (!a.performance_date) return false;
				const artistDate = a.performance_date.includes("T") ? a.performance_date.split("T")[0] : a.performance_date;
				const targetDate = selectedDate.includes("T") ? selectedDate.split("T")[0] : selectedDate;
				return artistDate === targetDate;
			});

			const assignedArtists = filteredArtists
				.filter((a: any) => a.performance_order !== null || (a.performance_status && a.performance_status !== "not_started" && a.rehearsal_completed))
				.map((artist: any) => {
					let displayOrder = artist.performance_order;
					if (displayOrder === null || displayOrder === undefined) {
						displayOrder = 999;
					}
					return {
						id: artist.id,
						type: "artist" as const,
						artist,
						performance_order: displayOrder,
						status: (artist.performance_status || "not_started") as PerformanceItem["status"],
					};
				});

			const cueItems = cueList.map((cue: any) => ({
				id: cue.id,
				type: "cue" as const,
				cue: {
					id: cue.id,
					type: cue.type,
					title: cue.title || "Cue",
					duration: cue.duration || 5,
					extraTime: cue.extraTime || 0,
					performance_order: cue.performance_order,
					notes: cue.notes,
					color: cue.color,
					is_completed: cue.is_completed || false,
					completed_at: cue.completed_at,
				},
				performance_order: cue.performance_order,
				status: (cue.performance_status || (cue.is_completed ? "completed" : "not_started")) as PerformanceItem["status"],
			}));

			const combined = [...assignedArtists, ...cueItems].sort((a, b) => a.performance_order - b.performance_order);
			setPerformanceItems(combined);
			setLoading(false);
		} catch (error) {
			console.error("Error in LiveBoard 3 data fetching:", error);
		}
	};

	useEffect(() => {
		fetchLiveBoardData();
	}, [eventId, selectedDate, refreshTrigger]);

	useEffect(() => {
		const interval = setInterval(fetchLiveBoardData, 4000);
		return () => clearInterval(interval);
	}, [eventId, selectedDate]);

	// Calculate timings
	const liveTimings = calculateLiveTimings(
		performanceItems.map((item) => ({
			...item,
			is_completed: item.type === "artist" ? item.artist?.rehearsal_completed && item.status === "completed" : item.cue?.is_completed,
			completed_at: item.type === "cue" ? (item.cue as any)?.completed_at : undefined,
		})) as any[],
		eventTimings.show_start_time,
		timeOverrides
	);

	// Calculate Dynamic Show Statistics
	const totalDuration = performanceItems.reduce((acc, item) => {
		const dur = item.type === "artist" && item.artist
			? (item.artist.actual_duration || item.artist.performance_duration * 60)
			: (item.cue?.duration || 5) * 60 + (item.cue?.extraTime || 0);
		return acc + dur;
	}, 0);

	const completedDuration = performanceItems
		.filter((item) => item.status === "completed")
		.reduce((acc, item) => {
			const dur = item.type === "artist" && item.artist
				? (item.artist.actual_duration || item.artist.performance_duration * 60)
				: (item.cue?.duration || 5) * 60 + (item.cue?.extraTime || 0);
			return acc + dur;
		}, 0);

	const remainingDuration = totalDuration - completedDuration;
	const progressPercentage = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
	const completedCount = performanceItems.filter(item => item.status === "completed").length;
	const totalCount = performanceItems.length;

	// Search and Category Filter Logic
	const filteredItems = performanceItems.filter((item) => {
		const matchesSearch = item.type === "artist" && item.artist
			? item.artist.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.artist.style.toLowerCase().includes(searchQuery.toLowerCase())
			: item.cue?.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.cue?.type.toLowerCase().includes(searchQuery.toLowerCase());

		if (!matchesSearch) return false;
		if (filter === "artists") return item.type === "artist";
		if (filter === "cues") return item.type === "cue";
		return true;
	});

	const getCueIcon = (cueType: string) => {
		const iconMap: { [key: string]: any } = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType] || Video;
	};

	// Unique Cue Accent Colors
	const getBorderAccentClass = (item: PerformanceItem) => {
		if (item.status === "currently_on_stage") return "border-l-4 border-l-red-500";
		if (item.status === "next_on_stage") return "border-l-4 border-l-cyan-500";
		
		if (item.type === "artist") return "border-l-4 border-l-purple-500/50";
		
		const cueType = item.cue?.type;
		switch (cueType) {
			case "mc_break": return "border-l-4 border-l-pink-500";
			case "video_break": return "border-l-4 border-l-cyan-500";
			case "cleaning_break": return "border-l-4 border-l-amber-500";
			case "speech_break": return "border-l-4 border-l-orange-500";
			case "opening": return "border-l-4 border-l-emerald-500";
			case "countdown": return "border-l-4 border-l-red-500";
			case "animation": return "border-l-4 border-l-indigo-500";
			default: return "border-l-4 border-l-blue-500";
		}
	};

	const getStatusBadge = (status: string | null | undefined) => {
		switch (status) {
			case "completed":
				return (
					<div className="bg-[#10b981] text-white flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm shadow-md shadow-emerald-950/20 border border-green-500/20 cursor-default">
						<CheckCircle className="h-4 w-4" />
						Completed
					</div>
				);
			case "currently_on_stage":
				return (
					<div className="bg-red-600 text-white flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm shadow-md shadow-red-950/20 border border-red-500/20 animate-pulse cursor-default">
						<span className="w-2 h-2 rounded-full bg-white block animate-ping" />
						On Stage
					</div>
				);
			case "next_on_stage":
				return (
					<div className="bg-cyan-600 text-white flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm border border-cyan-500/20 cursor-default">
						<Play className="h-4 w-4" />
						Next Up
					</div>
				);
			case "next_on_deck":
				return (
					<div className="bg-[#6b21a8] text-purple-200 border border-[#7e22ce]/35 flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm cursor-default">
						<Users className="h-4 w-4 text-purple-300" />
						On Deck
					</div>
				);
			default:
				return (
					<div className={isLightMode ? "bg-gray-100/50 text-purple-300 border border-[#5b21b6]/30 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm cursor-default" : "bg-[#1a1147]/50 text-purple-300 border border-[#5b21b6]/30 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm cursor-default"}>
						<Clock className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
						Scheduled
					</div>
				);
		}
	};

	// Convert seconds to readable format like "1h 15m"
	const formatRemainingText = (sec: number) => {
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		if (h > 0) return `${h}h ${m}m remaining`;
		return `${m}m remaining`;
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
				<p className="text-purple-300 font-medium">Loading Live Dashboard 3 data...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Show Metrics Summary Header */}
			<div className={isLightMode ? "grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-gray-200 bg-gradient-to-r from-[#181147]/75 to-[#0b0622]/90 backdrop-blur-md shadow-2xl" : "grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-[#2a1f4f] bg-gradient-to-r from-[#181147]/75 to-[#0b0622]/90 backdrop-blur-md shadow-2xl"}>
				<div className={isLightMode ? "flex flex-col justify-center border-r border-gray-200/40 pr-4 last:border-0 last:pr-0" : "flex flex-col justify-center border-r border-[#2a1f4f]/40 pr-4 last:border-0 last:pr-0"}>
					<span className={isLightMode ? "text-xs font-semibold text-purple-600 uppercase tracking-wider" : "text-xs font-semibold text-purple-400 uppercase tracking-wider"}>Show Progress</span>
					<div className="flex items-baseline gap-2 mt-1">
						<span className="text-2xl font-bold text-white">{progressPercentage}%</span>
						<span className="text-xs text-purple-300 font-medium">({completedCount}/{totalCount} items)</span>
					</div>
					<div className={isLightMode ? "w-full bg-[#130d36] h-2 rounded-full overflow-hidden mt-2 border border-gray-200/35" : "w-full bg-[#130d36] h-2 rounded-full overflow-hidden mt-2 border border-[#2a1f4f]/35"}>
						<div
							className="bg-gradient-to-r from-[#d946ef] to-[#06b6d4] h-full rounded-full transition-all duration-500"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
				</div>

				<div className={isLightMode ? "flex flex-col justify-center border-r border-gray-200/40 px-4 last:border-0 last:pr-0" : "flex flex-col justify-center border-r border-[#2a1f4f]/40 px-4 last:border-0 last:pr-0"}>
					<span className={isLightMode ? "text-xs font-semibold text-purple-600 uppercase tracking-wider" : "text-xs font-semibold text-purple-400 uppercase tracking-wider"}>Remaining Duration</span>
					<span className="text-2xl font-bold text-[#eab308] mt-1">
						{formatRemainingText(remainingDuration)}
					</span>
				</div>

				<div className={isLightMode ? "flex flex-col justify-center border-r border-gray-200/40 px-4 last:border-0 last:pr-0" : "flex flex-col justify-center border-r border-[#2a1f4f]/40 px-4 last:border-0 last:pr-0"}>
					<span className={isLightMode ? "text-xs font-semibold text-purple-600 uppercase tracking-wider" : "text-xs font-semibold text-purple-400 uppercase tracking-wider"}>Total Duration</span>
					<span className="text-2xl font-bold text-white mt-1">
						{Math.round(totalDuration / 60)} mins
					</span>
				</div>

				<div className="flex flex-col justify-center px-4">
					<span className={isLightMode ? "text-xs font-semibold text-purple-600 uppercase tracking-wider" : "text-xs font-semibold text-purple-400 uppercase tracking-wider"}>Est. Completion</span>
					<span className="text-2xl font-bold text-[#06b6d4] mt-1 font-mono">
						{(() => {
							if (!eventTimings.show_start_time) return "--:--";
							const [startHours, startMinutes] = eventTimings.show_start_time.split(":").map(Number);
							const startTotalMinutes = startHours * 60 + startMinutes;
							const endTotalMinutes = startTotalMinutes + Math.round(totalDuration / 60);
							const endHours = Math.floor(endTotalMinutes / 60) % 24;
							const endMinutes = endTotalMinutes % 60;
							return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
						})()}
					</span>
				</div>
			</div>

			{/* Main Layout Card */}
			<div className={isLightMode ? "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" : "bg-gradient-to-br from-[#1a1147] to-[#0f0a2e] border border-[#2a1f4f] rounded-2xl shadow-2xl overflow-hidden"}>
				
				{/* Filtering and Search Controls bar */}
				<div className={isLightMode ? "px-6 py-5 border-b border-gray-200 bg-[#0c072b]/30" : "px-6 py-5 border-b border-[#2a1f4f] bg-[#0c072b]/30"}>
					<div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
						{/* Title */}
						<div className="shrink-0">
							<h3 className="text-xl font-bold text-white flex items-center gap-2">
								<ListTodo className={`h-5 w-5 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
								Performance Order List
							</h3>
							<p className={isLightMode ? "text-sm text-purple-600 mt-1" : "text-sm text-purple-400 mt-1"}>
								Live show schedule with real-time tracking
							</p>
						</div>

						{/* Interactive Filters and Search */}
						<div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-2xl justify-end">
							{/* Category Filters */}
							<div className={isLightMode ? "flex bg-[#130d36] border border-gray-200 rounded-lg p-1" : "flex bg-[#130d36] border border-[#2a1f4f] rounded-lg p-1"}>
								<button
									onClick={() => setFilter("all")}
									className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
										filter === "all"
											? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
											: "text-purple-300 hover:text-white"
									}`}
								>
									All
								</button>
								<button
									onClick={() => setFilter("artists")}
									className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
										filter === "artists"
											? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
											: "text-purple-300 hover:text-white"
									}`}
								>
									Artists
								</button>
								<button
									onClick={() => setFilter("cues")}
									className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
										filter === "cues"
											? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
											: "text-purple-300 hover:text-white"
									}`}
								>
									Cues
								</button>
							</div>

							{/* Search Box */}
							<div className="relative flex-1 max-w-sm">
								<Search className={isLightMode ? "absolute left-3 top-2.5 h-4 w-4 text-purple-600" : "absolute left-3 top-2.5 h-4 w-4 text-purple-400"} />
								<input
									type="text"
									placeholder="Search artist or cue..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className={isLightMode ? "w-full bg-[#130d36] border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-purple-500 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all" : "w-full bg-[#130d36] border border-[#2a1f4f] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-purple-500 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all"}
								/>
							</div>
						</div>
					</div>
				</div>
				
				{/* List View Container */}
				<div className="p-6">
					<div className="space-y-4">
						{filteredItems.map((item, index) => {
							const avatarBg = [
								"bg-gradient-to-br from-[#d946ef] to-[#86198f]",
								"bg-gradient-to-br from-[#ec4899] to-[#be185d]",
								"bg-gradient-to-br from-[#8b5cf6] to-[#5b21b6]",
								"bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]",
								"bg-gradient-to-br from-[#06b6d4] to-[#0891b2]",
								"bg-gradient-to-br from-[#10b981] to-[#047857]",
							][index % 6];

							const artist = item.type === "artist" ? item.artist : undefined;
							const cue = item.type === "cue" ? item.cue : undefined;

							return (
								<div
									key={item.id}
									className={`flex items-center justify-between p-5 rounded-xl border transition-all duration-200 ${getBorderAccentClass(item)} ${
										item.status === "currently_on_stage"
											? "border-[#ef4444] bg-[#ef4444]/5 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-[pulse_2s_infinite]"
											: item.status === "next_on_stage"
											? "border-[#06b6d4] bg-[#06b6d4]/5 shadow-lg"
											: (isLightMode ? "border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:border-gray-300" : "border-[#2a1f4f] bg-[#130d36]/40 backdrop-blur-sm shadow-md hover:bg-[#181145]/60 hover:border-[#3c2a74]/70")
									}`}
								>
									{/* Left Group */}
									<div className="flex items-center gap-5 flex-1 min-w-0">
										{/* Order Number */}
										<span className={`w-8 text-xl font-bold text-center ${
											item.status === "currently_on_stage"
												? "text-red-400 font-extrabold"
												: "text-purple-600"
										}`}>
											{index + 1}
										</span>

										{/* Avatar or Icon */}
										{artist ? (
											<div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-md ${avatarBg}`}>
												{artist.artist_name.charAt(0).toUpperCase()}
											</div>
										) : (
											<div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-800 to-indigo-900 border border-purple-500/20 flex items-center justify-center text-white shadow-md">
												{(() => {
													const CueIcon = getCueIcon(cue?.type || "");
													return <CueIcon className="h-5 w-5 text-purple-200" />;
												})()}
											</div>
										)}

										{/* Item Info */}
										<div className="min-w-0">
											<div className="flex items-center gap-2.5 flex-wrap">
												<div className="font-bold text-xl sm:text-2xl text-white tracking-wide">
													{artist ? artist.artist_name : cue?.title || cue?.type.replace("_", " ").toUpperCase()}
												</div>
												{/* Nationality Flags */}
												{artist && (
													<>
														{artist.members && artist.members.length > 0 ? (
															<div className="flex items-center gap-1.5 flex-wrap">
																{artist.members.map((member: any, idx: number) => (
																	<div key={idx} className="flex items-center gap-1">
																		{member.homeCountry && (
																			<span
																				className="text-lg"
																				title={`${member.name}: ${getCountryName(member.homeCountry)}`}
																			>
																				{getCountryFlag(member.homeCountry)}
																			</span>
																		)}
																		{member.countryLiving && member.countryLiving !== member.homeCountry && (
																			<>
																				<Globe className={isLightMode ? "h-3.5 w-3.5 text-purple-600 opacity-70" : "h-3.5 w-3.5 text-purple-400 opacity-70"} />
																				<span
																					className="text-base"
																					title={`${member.name}: Living in ${getCountryName(member.countryLiving)}`}
																				>
																					{getCountryFlag(member.countryLiving)}
																				</span>
																			</>
																		)}
																	</div>
																))}
															</div>
														) : (
															<div className="flex items-center gap-1.5">
																{(artist.home_country || artist.nationality) && (
																	<span
																		className="text-lg"
																		title={getCountryName(artist.home_country || artist.nationality || "")}
																	>
																		{getCountryFlag(artist.home_country || artist.nationality || "")}
																	</span>
																)}
																{artist.country_living && artist.country_living !== artist.home_country && (
																	<>
																		<Globe className={isLightMode ? "h-3.5 w-3.5 text-purple-600 opacity-70" : "h-3.5 w-3.5 text-purple-400 opacity-70"} />
																		<span
																			className="text-base"
																			title={`Living in ${getCountryName(artist.country_living)}`}
																		>
																			{getCountryFlag(artist.country_living)}
																		</span>
																	</>
																)}
															</div>
														)}
													</>
												)}
											</div>
											<div className={isLightMode ? "text-sm text-purple-600 flex items-center gap-3 mt-1.5" : "text-sm text-purple-400 flex items-center gap-3 mt-1.5"}>
												<span className="bg-[#3b0764]/50 text-purple-300 border border-[#6b21a8]/35 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
													{artist ? artist.style : cue?.type.replace("_", " ").toUpperCase()}
												</span>
												<span className="flex items-center gap-1.5 text-purple-300 font-medium">
													<Clock className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-600"}`} />
													{artist
														? formatDuration(artist.actual_duration || artist.performance_duration * 60)
														: formatDuration((cue?.duration || 5) * 60 + (cue?.extraTime || 0))}
												</span>
											</div>
										</div>
									</div>

									{/* Right Group */}
									<div className="flex items-center gap-6">
										{/* Status Badge */}
										{getStatusBadge(item.status)}

										{/* Time */}
										<span className={`text-2xl font-mono font-bold ${isLightMode ? "text-purple-700" : "text-purple-700"} min-w-[70px] text-right tracking-tight`}>
											{liveTimings[index]?.startTime || "--:--"}
										</span>
									</div>
								</div>
							);
						})}

						{filteredItems.length === 0 && (
							<div className="text-center py-16">
								<div className="flex justify-center mb-6">
									<div className="p-6 bg-purple-600/20 rounded-full">
										<ListTodo className={isLightMode ? "h-16 w-16 text-purple-600" : "h-16 w-16 text-purple-400"} />
									</div>
								</div>
								<h3 className="text-xl font-bold mb-2 text-white">
									No items found
								</h3>
								<p className={isLightMode ? "text-purple-600 text-base" : "text-purple-400 text-base"}>
									Try modifying your search query or filters.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

		</div>
	);
}

