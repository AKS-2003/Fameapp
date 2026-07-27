"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Clock,
	ClipboardList,
	FileText,
	Globe,
	RefreshCw,
	Sparkles,
	Mic,
	Video,
	Trash2,
	Speaker,
	Play,
	Timer,
	CheckCircle,
	Check,
	Users,
	ArrowLeft,
	Calendar,
	X,
	MessageSquare,
	Camera,
	Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple } from "@/lib/date-utils";
import { formatDuration, calculateLiveTimings } from "@/lib/timing-utils";
import {
	findBestDateToSelect,
	saveSelectedDateToStorage,
	subscribeToDateChanges,
} from "@/lib/date-selection-utils";

interface Artist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	actual_duration?: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	country_living?: string;
	home_country?: string;
	nationality?: string;
	members?: any[] | null;
	props_needed?: string;
	performance_notes?: string;
	mc_notes?: string;
	biography?: string;
	artist_notes?: string;
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
	is_completed: boolean;
	completed_at?: string;
}

interface PerformanceItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
	status?: "not_started" | "next_on_deck" | "next_on_stage" | "currently_on_stage" | "completed";
}

interface EventTimings {
	backstage_ready_time?: string;
	show_start_time?: string;
	rehearsal_start_time?: string;
}

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

export default function OrganiserDashboard() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const eventId = params.eventId as string;
	const isStandalone = searchParams.get("standalone") === "true";

	const [event, setEvent] = useState<Event | null>(null);
	const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [eventTimings, setEventTimings] = useState<EventTimings>({});
	const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>({});
	const [wsConnected, setWsConnected] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
	const [showNotesOpen, setShowNotesOpen] = useState(false);
	const [organiserNotes, setOrganiserNotes] = useState<any[]>([]);
	const [newNoteText, setNewNoteText] = useState("");
	const [submittingNote, setSubmittingNote] = useState(false);

	// Fetch Organiser Notes
	const fetchOrganiserNotes = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/organiser-notes?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data) {
					setOrganiserNotes(data.data.notes || []);
				}
			}
		} catch (error) {
			console.error("Error fetching organiser notes:", error);
		}
	};

	// Save Organiser Note
	const handleAddNote = async () => {
		if (!newNoteText.trim()) return;

		setSubmittingNote(true);
		try {
			const response = await fetch(`/api/events/${eventId}/organiser-notes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text: newNoteText }),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data?.note) {
					setOrganiserNotes((prev) => [data.data.note, ...prev]);
					setNewNoteText("");
					toast({
						title: "Note Added",
						description: "Organiser note saved successfully.",
					});
				}
			} else {
				toast({
					title: "Error",
					description: "Failed to save organiser note.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error adding note:", error);
			toast({
				title: "Error",
				description: "An unexpected error occurred.",
				variant: "destructive",
			});
		} finally {
			setSubmittingNote(false);
		}
	};

	const [showChatsOpen, setShowChatsOpen] = useState(false);
	const [chatRecipient, setChatRecipient] = useState<"stage_manager" | "mc">("stage_manager");
	const [chatMessages, setChatMessages] = useState<any[]>([]);
	const [newMessageText, setNewMessageText] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);
	const [activeOrganiserMessage, setActiveOrganiserMessage] = useState<any | null>(null);

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
					sender: "organiser",
					recipient: chatRecipient,
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

	// Fetch Event details
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

	// Fetch Show Dates
	const fetchEventDates = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				const showDates = evt.show_dates || evt.showDates || [];

				if (showDates.length > 0) {
					setEventDates(showDates);

					if (!selectedDate) {
						const bestDate = findBestDateToSelect(showDates, eventId);
						setSelectedDate(bestDate);
						saveSelectedDateToStorage(eventId, bestDate);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching event dates:", error);
		}
	};

	// Fetch Event Timings
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
				if (result.success && result.data) {
					setEventTimings({
						backstage_ready_time: result.data.backstage_ready_time,
						show_start_time: result.data.show_start_time,
						rehearsal_start_time: result.data.rehearsal_start_time,
					});
					setTimeOverrides(result.data.time_overrides || {});
				}
			}
		} catch (error) {
			console.error("Error fetching event timings:", error);
		}
	};

	// Fetch performance items (Artists and Cues)
	const fetchPerformanceItems = async () => {
		if (!selectedDate) return;

		try {
			// Fetch Artists
			const artistsRes = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			let artistList: any[] = [];
			if (artistsRes.ok) {
				const data = await artistsRes.json();
				if (data.success) {
					artistList = data.data || [];
				}
			}

			// Fetch Cues
			let cueList: any[] = [];
			try {
				const cuesRes = await fetch(
					`/api/events/${eventId}/cues?performanceDate=${selectedDate}&t=${Date.now()}`,
				);
				if (cuesRes.ok) {
					const cuesResult = await cuesRes.json();
					if (cuesResult.success) {
						cueList = cuesResult.data || [];
					}
				}
			} catch (err) {
				console.error("Error fetching cues:", err);
			}

			// Format and filter artists by selectedDate
			const filteredArtists = artistList.map((artist: any) => ({
				id: artist.id,
				artist_name: artist.artistName || artist.artist_name,
				style: artist.style || "",
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
				props_needed: artist.props_needed || "",
				performance_notes: artist.performance_notes || artist.mc_notes || "",
				mc_notes: artist.mc_notes || "",
				biography: artist.biography || "",
				artist_notes: artist.artist_notes || artist.artistNotes || "",
				eventShowId: artist.eventShowId,
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
			console.error("Error fetching organiser data:", error);
		}
	};

	// Initialize setup
	useEffect(() => {
		if (eventId) {
			fetchEventData();
			fetchEventDates();
		}

		// Subscribe to date changes
		const unsubscribeDateChanges = subscribeToDateChanges(eventId, (newDate) => {
			if (newDate !== selectedDate) {
				setSelectedDate(newDate);
			}
		});

		return () => {
			unsubscribeDateChanges();
		};
	}, [eventId]);

	// Fetch timing settings and items when selectedDate or refresh changes
	useEffect(() => {
		if (selectedDate) {
			fetchEventTimings(selectedDate);
			fetchPerformanceItems();
		}
		if (eventId) {
			fetchOrganiserNotes();
			fetchChatMessages();
		}
	}, [selectedDate, refreshTrigger, eventId]);

	// Polling update
	useEffect(() => {
		const interval = setInterval(() => {
			if (selectedDate) {
				fetchPerformanceItems();
				fetchEventTimings(selectedDate);
			}
			if (eventId) {
				fetchOrganiserNotes();
				fetchChatMessages();
			}
		}, 4000);
		return () => clearInterval(interval);
	}, [selectedDate, eventId]);

	// Initialize WebSocket for real-time updates
	useEffect(() => {
		if (!eventId) return;

		let wsManager: any = null;
		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } = await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId,
					role: "organiser",
					userId: `organiser_${eventId}`,
					showToasts: false,
					onConnect: () => {
						console.log("Organiser WebSocket connected");
						setWsConnected(true);
					},
					onDisconnect: () => {
						console.log("Organiser WebSocket disconnected");
						setWsConnected(false);
					},
					onDataUpdate: () => {
						console.log("Organiser data update triggered");
						setRefreshTrigger((prev) => prev + 1);
					},
				});

				await wsManager.initialize();

				const triggerGlobalRefresh = () => {
					setLastUpdateTime(new Date().toLocaleTimeString());
					setTimeout(() => {
						setRefreshTrigger((prev) => prev + 1);
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
					"organiser_notes_updated",
					"new_organiser_message",
					"organiser_message_read",
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						if (data && data.eventId === eventId) {
							if (evtName === "organiser_notes_updated") {
								fetchOrganiserNotes();
							} else if (evtName === "new_organiser_message") {
								fetchChatMessages();
								// Show popup alert if the message is FROM stage_manager or mc TO organiser
								if (data.message && (data.message.sender === "stage_manager" || data.message.sender === "mc") && data.message.recipient === "organiser") {
									setActiveOrganiserMessage(data.message);
								}
							} else if (evtName === "organiser_message_read") {
								fetchChatMessages();
							} else {
								triggerGlobalRefresh();
							}
						}
					});
				});

				(window as any).organiserWsManager = wsManager;
			} catch (error) {
				console.error("Error initializing WebSocket:", error);
				setWsConnected(false);
			}
		};

		initializeWebSocket();

		return () => {
			if ((window as any).organiserWsManager) {
				(window as any).organiserWsManager.destroy();
				delete (window as any).organiserWsManager;
			}
		};
	}, [eventId]);

	// Calculate start/end times cascade
	const liveTimings = calculateLiveTimings(
		performanceItems.map((item) => ({
			...item,
			is_completed: item.type === "artist" ? item.artist?.rehearsal_completed && item.status === "completed" : item.cue?.is_completed,
			completed_at: item.type === "cue" ? (item.cue as any)?.completed_at : undefined,
		})) as any[],
		eventTimings.show_start_time,
		timeOverrides
	);

	// Status badge mapping helper
	const renderStatusBadge = (status: string | null | undefined) => {
		switch (status) {
			case "completed":
				return (
					<span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase cursor-default">
						Completed
					</span>
				);
			case "currently_on_stage":
				return (
					<span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase cursor-default animate-pulse">
						Currently On
					</span>
				);
			case "next_on_deck":
				return (
					<span className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase cursor-default">
						Next On Deck
					</span>
				);
			case "next_on_stage":
			case "not_started":
			default:
				return (
					<span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wider uppercase cursor-default">
						Back Stage
					</span>
				);
		}
	};

	// Notes details logic
	const allNotes = performanceItems
		.map((item) => {
			const artist = item.type === "artist" ? item.artist : undefined;
			const cue = item.type === "cue" ? item.cue : undefined;

			if (artist && artist.performance_notes) {
				return {
					title: artist.artist_name,
					notes: artist.performance_notes,
					type: "Artist Notes",
				};
			} else if (cue && cue.notes) {
				return {
					title: cue.title,
					notes: cue.notes,
					type: `${cue.type.replace("_", " ").toUpperCase()} Notes`,
				};
			}
			return null;
		})
		.filter((n) => n !== null) as { title: string; notes: string; type: string }[];

	return (
		<div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-16">
			{/* Standalone Back Button (only shown if not standalone query param) */}
			{!isStandalone && (
				<div className="max-w-4xl mx-auto px-4 pt-6">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(`/stage-manager/events/${eventId}/performance-order`)}
						className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Performance Order
					</Button>
				</div>
			)}

			<div className="max-w-4xl mx-auto px-4 pt-6 md:pt-10">
				{/* Top Header Card / Layout */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
							Live Show Order
						</span>
						<h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">
							Organiser View
						</h1>
					</div>

					<div className="flex items-center gap-2 sm:self-end">
						{/* Notes Button */}
						<Button
							variant="outline"
							onClick={() => setShowNotesOpen(true)}
							className="flex items-center gap-1.5 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
						>
							<FileText className="h-4 w-4" />
							Notes
						</Button>

						{/* Live Pulse Indicator Badge */}
						<div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-2 rounded-lg text-xs font-bold select-none shadow-sm">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
							</span>
							Live
						</div>
					</div>
				</div>

				{/* Multi-date Selector if there are multiple dates */}
				{eventDates.length > 1 && (
					<div className="mb-6 bg-white p-3 rounded-xl border border-gray-200/60 shadow-sm flex items-center justify-between gap-4">
						<span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
							<Calendar className="h-4 w-4 text-gray-400" />
							Select Show Date
						</span>
						<div className="flex gap-1.5 overflow-x-auto pb-1 max-w-xs sm:max-w-md">
							{eventDates.map((dateVal) => (
								<button
									key={dateVal}
									onClick={() => setSelectedDate(dateVal)}
									className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition-all ${
										selectedDate === dateVal
											? "bg-purple-600 text-white border-purple-600 shadow-sm"
											: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
									}`}
								>
									{formatDateSimple(dateVal)}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Loading State */}
				{loading ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<RefreshCw className="h-8 w-8 text-purple-600 animate-spin mb-3" />
						<p className="text-gray-500 text-sm font-medium">Loading Organiser View schedule...</p>
					</div>
				) : (
					/* Performance Items List container */
					<div className="space-y-3.5">
						{performanceItems.map((item, index) => {
							const artist = item.type === "artist" ? item.artist : undefined;
							const cue = item.type === "cue" ? item.cue : undefined;
							const timings = liveTimings[index];
							const isCurrentlyOn = item.status === "currently_on_stage";

							const titleText = artist
								? artist.artist_name
								: cue?.title || cue?.type.replace("_", " ").toUpperCase() || "";

							const subtitleType = artist
								? artist.style
								: cue?.type.replace("_", " ").toUpperCase() || "";

							const durationDisplay = artist
								? (artist.actual_duration ? formatDuration(artist.actual_duration) : `${artist.performance_duration} min`)
								: formatDuration((cue?.duration || 5) * 60 + (cue?.extraTime || 0));

							return (
								<div
									key={item.id}
									className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
										isCurrentlyOn
											? "bg-amber-50/70 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.12)] scale-[1.01]"
											: "bg-white border-gray-200/60 shadow-sm hover:shadow-md hover:border-gray-300"
									}`}
								>
									{/* Left Section */}
									<div className="flex items-center gap-3.5 min-w-0 flex-1">
										{/* Order number badge */}
										<div
											className={`w-9 h-9 rounded-lg font-bold flex items-center justify-center shrink-0 border text-sm ${
												isCurrentlyOn
													? "bg-amber-100 border-amber-300 text-amber-800"
													: "bg-gray-50 border-gray-200 text-gray-500"
											}`}
										>
											#{index + 1}
										</div>

										{/* Details */}
										<div className="min-w-0">
											<div className="flex items-baseline gap-2 flex-wrap">
												<span className="font-extrabold text-gray-900 text-sm sm:text-base md:text-lg tracking-wide uppercase truncate">
													{titleText}
												</span>
												<span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden sm:inline">
													({subtitleType})
												</span>
											</div>

											{/* Clock + duration */}
											<div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-medium">
												<Clock className="h-3.5 w-3.5 text-gray-400" />
												<span>{timings?.startTime || "--:--"}</span>
												<span className="text-gray-300">•</span>
												<span>{durationDisplay}</span>
											</div>
										</div>
									</div>

									{/* Right Section - Status Pill */}
									<div className="shrink-0 pl-3">
										{renderStatusBadge(item.status)}
									</div>
								</div>
							);
						})}

						{/* Empty state */}
						{performanceItems.length === 0 && (
							<Card className="border border-dashed border-gray-300 bg-white">
								<CardContent className="flex flex-col items-center justify-center py-16 text-center">
									<div className="p-3 bg-purple-50 rounded-full mb-3">
										<ClipboardList className="h-8 w-8 text-purple-500" />
									</div>
									<h3 className="text-lg font-bold text-gray-800">No performances scheduled</h3>
									<p className="text-gray-500 text-sm max-w-sm mt-1">
										There are no artists or cues added to this show date yet. Check back later or select another show date.
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				)}
			</div>

			{/* Backdrop Overlay */}
			{showNotesOpen && (
				<div
					className="fixed inset-0 bg-black/45 z-40 transition-opacity duration-300"
					onClick={() => setShowNotesOpen(false)}
				/>
			)}

			{/* Sliding Sidebar for Notes */}
			<div
				className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 border-l border-gray-150 flex flex-col transition-transform duration-300 ease-in-out ${
					showNotesOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				{/* Sidebar Header */}
				<div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
					<div className="flex items-center gap-2 text-gray-950 font-bold text-lg">
						<ClipboardList className="h-5 w-5 text-gray-600" />
						<span>My Notes</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setShowNotesOpen(false)}
						className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
					>
						<X className="h-4.5 w-4.5" />
					</Button>
				</div>

				{/* Note Form Inputs */}
				<div className="p-5 border-b border-gray-100 bg-gray-50/50 shrink-0 space-y-3">
					<textarea
						value={newNoteText}
						onChange={(e) => setNewNoteText(e.target.value)}
						placeholder="Write a quick note..."
						rows={3}
						className="w-full p-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none text-gray-800 shadow-sm"
					/>
					<Button
						onClick={handleAddNote}
						disabled={submittingNote || !newNoteText.trim()}
						className="bg-[#d946ef] hover:bg-[#d946ef]/90 text-white font-bold w-full py-2.5 rounded-lg text-sm transition-all shadow-sm"
					>
						{submittingNote ? "Adding..." : "+ Add note"}
					</Button>
				</div>

				{/* Notes List */}
				<div className="flex-1 overflow-y-auto p-5 space-y-3.5">
					{organiserNotes.length > 0 ? (
						organiserNotes.map((note) => (
							<div
								key={note.id}
								className="bg-[#fffbeb] border border-amber-100/70 rounded-xl p-3.5 shadow-sm space-y-1"
							>
								<p className="text-sm text-gray-850 font-medium whitespace-pre-wrap">
									{note.text}
								</p>
								<span className="text-[10px] text-gray-400 font-semibold block mt-1">
									{new Date(note.createdAt).toLocaleString("en-US", {
										month: "short",
										day: "2-digit",
										hour: "2-digit",
										minute: "2-digit",
										hour12: true,
									})}
								</span>
							</div>
						))
					) : (
						<div className="flex flex-col items-center justify-center py-20 text-gray-400 text-sm">
							No notes yet.
						</div>
					)}
				</div>
			</div>

			{/* Incoming Message Popup Alert for Organiser */}
			{activeOrganiserMessage && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
					<div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl z-[1000] border border-gray-100 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
						{/* Header */}
						<div className="flex items-center justify-between shrink-0">
							<div className="text-xs md:text-sm font-extrabold text-[#d946ef] tracking-wider flex items-center gap-1.5 uppercase">
								<MessageSquare className="h-4 w-4" />
								<span>Message from {activeOrganiserMessage.sender === "mc" ? "MC" : "Stage Manager"}</span>
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
								onClick={() => setActiveOrganiserMessage(null)}
								className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm flex-1 transition-all shadow-md active:scale-95"
							>
								<Check className="h-4 w-4" />
								Got it
							</button>
							<button
								onClick={() => {
									setActiveOrganiserMessage(null);
									setChatRecipient(activeOrganiserMessage.sender as "stage_manager" | "mc");
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
					className="fixed bottom-6 right-6 z-40 bg-[#d946ef] hover:bg-[#d946ef]/90 text-white p-4 rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
				>
					<MessageSquare className="h-6 w-6" />
				</button>
			)}

			{/* Chats Collapsible Bottom Drawer */}
			<div
				className={`fixed bottom-0 left-0 right-0 md:left-[calc(50%-350px)] md:right-[calc(50%-350px)] max-w-2xl bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.15)] rounded-t-2xl z-40 border-t border-gray-150 flex flex-col transition-all duration-300 ease-in-out ${
					showChatsOpen ? "translate-y-0 h-[380px]" : "translate-y-full h-0 pointer-events-none"
				}`}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
					<span className="font-extrabold text-gray-800 text-base">Chats</span>
					<button
						onClick={() => setShowChatsOpen(false)}
						className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-gray-100 shrink-0">
					<button
						onClick={() => setChatRecipient("stage_manager")}
						className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition-all ${
							chatRecipient === "stage_manager"
								? "border-[#d946ef] text-[#d946ef]"
								: "border-transparent text-gray-400 hover:text-gray-600"
						}`}
					>
						Stage Manager
					</button>
					<button
						onClick={() => setChatRecipient("mc")}
						className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition-all ${
							chatRecipient === "mc"
								? "border-[#d946ef] text-[#d946ef]"
								: "border-transparent text-gray-400 hover:text-gray-600"
						}`}
					>
						MC
					</button>
				</div>

				{/* Message List */}
				<div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 bg-gray-50/30">
					{chatMessages.filter(
						(m) =>
							(m.sender === "organiser" && m.recipient === chatRecipient) ||
							(m.sender === chatRecipient && m.recipient === "organiser")
					).length > 0 ? (
						chatMessages
							.filter(
								(m) =>
									(m.sender === "organiser" && m.recipient === chatRecipient) ||
									(m.sender === chatRecipient && m.recipient === "organiser")
							)
							.map((msg) => {
								const isMe = msg.sender === "organiser";
								return (
									<div
										key={msg.id}
										className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] ${
											isMe ? "self-end" : "self-start"
										}`}
									>
										<div
											className={`px-4 py-2.5 rounded-2xl text-sm ${
												isMe
													? "bg-white border border-gray-200/80 rounded-tr-none text-gray-800 shadow-sm"
													: "bg-[#fffbeb] border border-amber-100 rounded-tl-none text-gray-850"
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
														<span className="text-[#3b82f6] text-[11px] leading-none ml-1 font-bold" title="Read">✓✓</span>
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
					<button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
						<Camera className="h-5 w-5" />
					</button>
					<button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
						<Mic className="h-5 w-5" />
					</button>
					<input
						type="text"
						value={newMessageText}
						onChange={(e) => setNewMessageText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSendMessage();
						}}
						placeholder={
							chatRecipient === "stage_manager"
								? "Message stage manager..."
								: "Message MC..."
						}
						className="flex-1 py-2 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:bg-white transition-all text-gray-800"
					/>
					<button
						onClick={handleSendMessage}
						disabled={sendingMessage || !newMessageText.trim()}
						className="p-2 bg-[#d946ef] hover:bg-[#d946ef]/90 text-white rounded-full transition-all disabled:opacity-50"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
