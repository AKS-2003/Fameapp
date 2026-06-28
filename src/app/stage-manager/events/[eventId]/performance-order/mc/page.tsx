"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Mic,
	Clock,
	User,
	ArrowLeft,
	Users,
	Calendar,
	Star,
	CheckCircle,
	Edit3,
	Timer,
	Video,
	Trash2,
	Speaker,
	Sparkles,
	Play,
	AlertTriangle,
	RefreshCw,
	BookOpen,
	Globe,
	MapPin,
	Check,
	MessageSquare,
	Camera,
	Send,
	X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple, formatDateForDropdown } from "@/lib/date-utils";
import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusBadgeVariant,
} from "@/lib/status-utils";
import { formatDuration, getDisplayDuration } from "@/lib/timing-utils";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import {
	findBestDateToSelect,
	saveSelectedDateToStorage,
	subscribeToDateChanges,
} from "@/lib/date-selection-utils";
import { CueColorBadge, isLightColor } from "@/components/ui/cue-color-picker";
import { useAccessGuard } from "@/hooks/useAccessGuard";
import { AccessDenied } from "@/components/ui/access-denied";

interface Artist {
	id: string;
	artist_name: string;
	real_name?: string | null;
	style: string;
	biography?: string | null;
	artist_notes?: string | null;
	actual_duration?: number;
	performance_order: number | null;
	rehearsal_completed: boolean;
	quality_rating: number | null;
	mc_notes?: string | null;
	phone?: string | null;
	email?: string | null;
	performance_status?: string | null;
	performance_date?: string | null;
	backstage_color?: string;
	// Nationality fields
	countryLiving?: string | null;
	homeCountry?: string | null;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}> | null;
	eventShowId?: string;
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
	performance_order: number;
	notes?: string;
	color?: string;
	is_completed?: boolean;
	mc_notes?: string | null;
	performance_date?: string | null;
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

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

export default function MCDashboard() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const eventId = params.eventId as string;
	const isStandalone = searchParams.get("standalone") === "true";

	// Access control check
	const { hasAccess, isLoading: accessLoading } = useAccessGuard(["mc_page", "full_access"]);

	const [event, setEvent] = useState<Event | null>(null);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [allArtists, setAllArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [selectedItem, setSelectedItem] = useState<ShowOrderItem | null>(
		null,
	);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [wsConnected, setWsConnected] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [activeTab, setActiveTab] = useState("schedule");
	const [selectedBioDay, setSelectedBioDay] = useState<string>("");
	const [editingMcNotes, setEditingMcNotes] = useState<{
		id: string;
		type: "artist" | "cue";
	} | null>(null);
	const [mcNotesText, setMcNotesText] = useState("");
	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);

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
					sender: "mc",
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
				(m) => m.sender === "organiser" && m.recipient === "mc" && m.status === "unread"
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
						.filter((m: any) => m.sender === "organiser" && m.recipient === "mc" && m.status === "unread")
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

	// Bio modal state
	const [bioModalOpen, setBioModalOpen] = useState(false);
	const [bioModalArtist, setBioModalArtist] = useState<Artist | null>(null);
	const [bioModalShowMcNotes, setBioModalShowMcNotes] = useState(false); // true for "See All Bio" tab

	// Keep selectedItem in sync with showOrderItems when data changes
	useEffect(() => {
		if (selectedItem && showOrderItems.length > 0) {
			const updatedItem = showOrderItems.find(
				(item) =>
					item.id === selectedItem.id &&
					item.type === selectedItem.type,
			);
			if (updatedItem) {
				// Only update if the mc_notes have changed
				const currentMcNotes =
					selectedItem.type === "artist"
						? selectedItem.artist?.mc_notes
						: selectedItem.cue?.mc_notes;
				const newMcNotes =
					updatedItem.type === "artist"
						? updatedItem.artist?.mc_notes
						: updatedItem.cue?.mc_notes;

				if (currentMcNotes !== newMcNotes) {
					setSelectedItem(updatedItem);
				}
			}
		}
	}, [showOrderItems]);

	useEffect(() => {
		if (eventId && hasAccess && !accessLoading) {
			fetchEventData();
			fetchEventDates();
			fetchEmergencyBroadcasts();
			checkUnreadOrganiserMessages();
		}

		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toast({ title, description, variant });
		};

		window.addEventListener(
			"websocket-toast",
			handleWebSocketToast as EventListener,
		);

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

	useEffect(() => {
		if (selectedPerformanceDate) {
			fetchPerformanceOrder();
			checkUnreadOrganiserMessages();
		}
	}, [selectedPerformanceDate, refreshTrigger]);

	useEffect(() => {
		if (eventDates.length > 0 && !selectedBioDay) {
			setSelectedBioDay(eventDates[0]);
		}
	}, [eventDates, selectedBioDay]);

	const selectedPerformanceDateRef = useRef(selectedPerformanceDate);
	useEffect(() => {
		selectedPerformanceDateRef.current = selectedPerformanceDate;
	}, [selectedPerformanceDate]);

	// Initialize WebSocket for real-time updates
	useEffect(() => {
		if (!eventId || !hasAccess || accessLoading) return;

		let wsManager: any = null;
		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId,
					role: "mc",
					userId: `mc_${eventId}`,
					showToasts: true,
					onConnect: () => {
						console.log("MC WebSocket connected");
						setWsConnected(true);
					},
					onDisconnect: () => {
						console.log("MC WebSocket disconnected");
						setWsConnected(false);
					},
					onDataUpdate: () => {
						console.log("MC data update triggered");
						setRefreshTrigger((prev) => prev + 1);
					},
				});

				await wsManager.initialize();

				const triggerGlobalRefresh = () => {
					console.log("MC: Triggering refresh via WebSocket event...");
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
					"lighting_designer_updated",
					"new_organiser_message",
					"organiser_message_read",
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						console.log(`MC: Received WebSocket event [${evtName}]:`, data);
						if (data && data.eventId === eventId) {
							if (evtName === "show-order-updated") {
								if (data.isDraft !== undefined) setIsDraftShowOrder(data.isDraft);
								if (data.isConfirmed !== undefined) setIsShowOrderConfirmed(data.isConfirmed);
							}
							if (evtName === "new_organiser_message") {
								if (data.message?.recipient === "mc") {
									setActiveOrganiserMessage(data.message);
								}
								fetchChatMessages();
							} else if (evtName === "organiser_message_read") {
								fetchChatMessages();
							} else {
								triggerGlobalRefresh();
							}
						}
					});
				});

				(window as any).mcWsManager = wsManager;
			} catch (error) {
				console.error("Failed to initialize WebSocket:", error);
				setWsConnected(false);
			}
		};

		initializeWebSocket();

		return () => {
			if (wsManager) {
				wsManager.destroy();
				if ((window as any).mcWsManager === wsManager) {
					delete (window as any).mcWsManager;
				}
			}
		};
	}, [eventId, hasAccess, accessLoading]);

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
					setEventDates(showDates);

					if (!selectedPerformanceDate) {
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

	const fetchPerformanceOrder = useCallback(async () => {
		if (!selectedPerformanceDate) return;

		try {
			setLoading(true);

			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);

			(window as any).mcFetchPerformanceOrder = fetchPerformanceOrder;
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					const artists = (data.data || []).map((artist: any) => {
						return {
							id: artist.id,
							artist_name:
								artist.artistName || artist.artist_name,
							real_name: artist.realName || artist.real_name,
							style: artist.style,
							biography: artist.biography,
							artist_notes:
								artist.artist_notes || artist.artistNotes,
							actual_duration:
								artist.musicTrack?.duration ||
								artist.musicTracks?.find(
									(track: any) => track.is_main_track,
								)?.duration ||
								null,
							performance_order:
								artist.performance_order ||
								artist.performanceOrder ||
								null,
							rehearsal_completed:
								artist.rehearsal_completed || false,
							quality_rating: artist.quality_rating || null,
							mc_notes: artist.mc_notes || artist.mcNotes || null,
							phone: artist.phone,
							email: artist.email,
							performance_status:
								artist.performance_status ||
								artist.performanceStatus ||
								null,
							performance_date:
								artist.performanceDate ||
								artist.performance_date,
							backstage_color:
								artist.backstage_color || undefined,
							// Nationality fields
							countryLiving: artist.countryLiving || null,
							homeCountry: artist.homeCountry || null,
							members: artist.members || null,
							eventShowId: artist.eventShowId,
						};
					});

					// Store all artists for biographies tab
					setAllArtists(artists);

					// Filter artists for the selected performance date
					const filteredArtists = artists.filter((a: Artist) => {
						if (!a.performance_date) return false;

						let artistDate: string;
						const performanceDate = a.performance_date;

						if (performanceDate.includes("T")) {
							artistDate = performanceDate.split("T")[0];
						} else {
							artistDate = performanceDate;
						}

						let normalizedSelectedDate = selectedPerformanceDate;
						if (selectedPerformanceDate.includes("T")) {
							normalizedSelectedDate =
								selectedPerformanceDate.split("T")[0];
						}

						return artistDate === normalizedSelectedDate;
					});

					const assignedArtists = filteredArtists
						.filter(
							(a: Artist) =>
								a.performance_order !== null ||
								(a.performance_status &&
									a.performance_status !== "not_started" &&
									a.rehearsal_completed),
						)
						.map((artist: Artist) => ({
							id: artist.eventShowId || artist.id,
							type: "artist" as const,
							artist,
							performance_order: artist.performance_order || 0,
							status: (artist.performance_status ||
								"not_started") as ShowOrderItem["status"],
						}));

					let cueItems: ShowOrderItem[] = [];
					try {
						const cuesResponse = await fetch(
							`/api/events/${eventId}/cues?performanceDate=${selectedPerformanceDate}&t=${Date.now()}`,
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
											: "not_started")) as ShowOrderItem["status"],
								}));
							}
						}
					} catch (cueError) {
						console.error("Error fetching cues:", cueError);
					}

					const allShowOrderItems = [
						...assignedArtists,
						...cueItems,
					].sort((a, b) => a.performance_order - b.performance_order);

					setShowOrderItems(allShowOrderItems);

					// Fetch show order metadata to get draft/confirmed status
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
							}
						}
					} catch (showOrderError) {
						console.error(
							"Error fetching show order metadata:",
							showOrderError,
						);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching performance order:", error);
			toast({
				title: "Error loading data",
				description: "Failed to load performance order",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [eventId, selectedPerformanceDate, toast]);



	const updateMCNotes = async (
		itemId: string,
		notes: string,
		itemType: "artist" | "cue",
	) => {
		try {
			if (itemType === "artist") {
				// Find the item to get the base artist ID if itemId is an eventShowId
				const artistItem = showOrderItems.find(
					(item) => item.id === itemId && item.type === "artist",
				);
				const artistName = artistItem?.artist?.artist_name || "Artist";
				const baseArtistId = artistItem?.artist?.id || itemId;

				// Update artist MC notes via API
				const response = await fetch(
					`/api/events/${eventId}/artists/${baseArtistId}?eventShowId=${itemId === baseArtistId ? "" : itemId}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							mc_notes: notes,
							mcNotes: notes,
						}),
					},
				);

				if (response.ok) {
					// Update local state
					setShowOrderItems((prev) =>
						prev.map((item) =>
							item.id === itemId && item.type === "artist"
								? {
										...item,
										artist: {
											...item.artist!,
											mc_notes: notes,
										},
									}
								: item,
						),
					);

					// Also update selectedItem if it's the same item
					setSelectedItem((prev) => {
						if (
							prev &&
							prev.id === itemId &&
							prev.type === "artist"
						) {
							return {
								...prev,
								artist: {
									...prev.artist!,
									mc_notes: notes,
								},
							};
						}
						return prev;
					});

					// Also update allArtists for biographies tab
					setAllArtists((prev) =>
						prev.map((artist) =>
							artist.id === itemId
								? { ...artist, mc_notes: notes }
								: artist,
						),
					);

					toast({
						title: "MC Notes Updated",
						description: `Notes for ${artistName} have been saved successfully`,
						variant: "success",
					});

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).mcWsManager;
					if (wsManager) {
						wsManager.emit("artist_status_changed", {
							eventId,
							artistId: itemId,
							action: "mc_notes_updated",
							mc_notes: notes,
						});
					}
				} else {
					throw new Error("Failed to update artist MC notes");
				}
			} else {
				// Find the cue title for the toast
				const cueItem = showOrderItems.find(
					(item) => item.id === itemId && item.type === "cue",
				);
				const cueTitle = cueItem?.cue?.title || "Custom cue";

				// Update cue MC notes via API
				const response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: itemId,
						mc_notes: notes,
						performanceDate: selectedPerformanceDate,
					}),
				});

				if (response.ok) {
					// Update local state
					setShowOrderItems((prev) =>
						prev.map((item) =>
							item.id === itemId && item.type === "cue"
								? {
										...item,
										cue: { ...item.cue!, mc_notes: notes },
									}
								: item,
						),
					);

					// Also update selectedItem if it's the same item
					setSelectedItem((prev) => {
						if (prev && prev.id === itemId && prev.type === "cue") {
							return {
								...prev,
								cue: {
									...prev.cue!,
									mc_notes: notes,
								},
							};
						}
						return prev;
					});

					toast({
						title: "MC Notes Updated",
						description: `Notes for ${cueTitle} have been saved successfully`,
						variant: "success",
					});

					// Emit WebSocket event for real-time updates
					const wsManager = (window as any).mcWsManager;
					if (wsManager) {
						const updatedItem = showOrderItems.find(
							(item) => item.id === itemId && item.type === "cue",
						);
						wsManager.emit("cue_updated", {
							eventId,
							cueId: itemId,
							action: "mc_notes_updated",
							cue: updatedItem?.cue
								? { ...updatedItem.cue, mc_notes: notes }
								: null,
							performanceDate: selectedPerformanceDate,
						});
					}
				} else {
					throw new Error("Failed to update cue MC notes");
				}
			}

			// Clear editing state
			setEditingMcNotes(null);
			setMcNotesText("");
		} catch (error) {
			console.error("Error updating MC notes:", error);
			toast({
				title: "Error updating notes",
				description: "Failed to save MC notes",
				variant: "destructive",
			});
		}
	};

	const getItemStatus = (item: ShowOrderItem, index: number) => {
		if (item.status) return item.status;
		if (item.type === "cue" && item.cue?.is_completed) {
			return "completed";
		}
		return "not_started";
	};

	const getRowColorClasses = (status: string) => {
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

	const getStatusBadge = (status: string, itemColor?: string | null) => {
		switch (status) {
			case "completed":
				return (
					<Badge className="bg-red-500 text-white hover:bg-red-500 cursor-default">
						Completed
					</Badge>
				);
			case "currently_on_stage":
				return (
					<Badge className="bg-green-500 text-white hover:bg-green-500 cursor-default">
						Currently On Stage
					</Badge>
				);
			case "next_on_deck":
				return (
					<Badge className="bg-blue-500 text-white hover:bg-blue-500 cursor-default">
						Next On Deck
					</Badge>
				);
			default:
				return (
					<Badge
						variant="outline"
						className={`cursor-default ${
							itemColor && !isLightColor(itemColor)
								? "bg-white/20 text-white border-white/30"
								: ""
						}`}
					>
						Back Stage
					</Badge>
				);
		}
	};

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
				{Array.from({ length: rating }, (_, i) => (
					<Star
						key={i}
						className={`h-3 w-3 fill-current ${
							colors[rating as keyof typeof colors]
						}`}
					/>
				))}
			</div>
		);
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

	const getDefaultIntroduction = (item: ShowOrderItem) => {
		if (item.type === "artist" && item.artist) {
			const durationText = item.artist.actual_duration
				? `${formatDuration(item.artist.actual_duration)} of`
				: "";
			return `Ladies and gentlemen, please welcome to the stage ${item.artist.artist_name}! ${item.artist.artist_name} is a talented ${item.artist.style} performer who brings ${durationText} incredible entertainment. Let's give them a warm welcome!`;
		} else if (item.type === "cue" && item.cue) {
			return `Ladies and gentlemen, we now have a ${item.cue.title.toLowerCase()} for ${
				item.cue.duration || 5
			} minutes. Please enjoy this brief intermission.`;
		}
		return "";
	};

	// Get artists filtered by selected bio day
	const getArtistsByDay = (date: string) => {
		return allArtists.filter((artist) => {
			if (!artist.performance_date) return false;
			let artistDate = artist.performance_date;
			if (artistDate.includes("T")) {
				artistDate = artistDate.split("T")[0];
			}
			let normalizedDate = date;
			if (date.includes("T")) {
				normalizedDate = date.split("T")[0];
			}
			return artistDate === normalizedDate;
		});
	};

	// Start editing MC notes
	const startEditingMcNotes = (item: ShowOrderItem) => {
		setEditingMcNotes({ id: item.id, type: item.type });
		setMcNotesText(
			(item.type === "artist"
				? item.artist?.mc_notes
				: item.cue?.mc_notes) || "",
		);
	};

	// Cancel editing MC notes
	const cancelEditingMcNotes = () => {
		setEditingMcNotes(null);
		setMcNotesText("");
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-border bg-white">
				<div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
						<div className="w-full sm:w-auto">
							<h1 className="text-lg sm:text-2xl font-bold text-foreground">
								MC Dashboard
							</h1>
							<p className="text-sm sm:text-base text-muted-foreground truncate">
								{event?.name}
							</p>
							<div className="flex items-center gap-2 mt-1">
								<div
									className={`w-2 h-2 rounded-full ${
										wsConnected
											? "bg-green-500"
											: "bg-red-500"
									}`}
								></div>
								<span className="text-xs text-muted-foreground">
									{wsConnected
										? "Live updates active"
										: "Connecting..."}
								</span>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
							{eventDates.length > 1 && (
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
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
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="Select show date" />
										</SelectTrigger>
										<SelectContent>
											{eventDates.map((date, index) => (
												<SelectItem
													key={date}
													value={date}
												>
													Day {index + 1} -{" "}
													{formatDateSimple(date)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
							<Button
								onClick={fetchPerformanceOrder}
								variant="outline"
								size="sm"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh
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

			<main className="container mx-auto px-4 py-8">
				{/* Draft / Confirmed Banner */}
				{isDraftShowOrder && !isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 px-4 py-4">
						<AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-yellow-700 leading-tight">
							DRAFT ORDER
						</p>
					</div>
				)}
				{!isDraftShowOrder && isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-4">
						<CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-green-700 leading-tight">
							CONFIRMED ORDER LIST
						</p>
					</div>
				)}

				<div className="space-y-6">
					{/* Tabs for Performance Schedule and Biographies */}
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="w-full"
					>
						<TabsList className="grid w-full grid-cols-2 max-w-md p-1">
							<TabsTrigger
								value="schedule"
								className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white hover:bg-gray-100"
							>
								<Mic className="h-4 w-4" />
								<span className="hidden sm:inline">
									Performance Schedule
								</span>
								<span className="sm:hidden">Schedule</span>
							</TabsTrigger>
							<TabsTrigger
								value="biographies"
								className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white hover:bg-gray-100"
							>
								<BookOpen className="h-4 w-4" />
								<span className="hidden sm:inline">
									See All Biographies
								</span>
								<span className="sm:hidden">Biographies</span>
							</TabsTrigger>
						</TabsList>

						{/* Performance Schedule Tab */}
						<TabsContent
							value="schedule"
							className="space-y-6 pt-5"
						>
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-semibold">
									Performance Schedule
								</h2>
								{selectedPerformanceDate && (
									<Badge
										variant="outline"
										className="flex items-center gap-1"
									>
										<Calendar className="h-3 w-3" />
										{formatDateForDropdown(
											selectedPerformanceDate,
										)}
									</Badge>
								)}
							</div>

							{/* Performance Order List */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Mic className="h-5 w-5" />
										MC Introduction Schedule
									</CardTitle>
								</CardHeader>
								<CardContent>
									{(() => {
										const filteredItems =
											showOrderItems.filter((item) => {
												if (!selectedPerformanceDate)
													return true;

												if (item.type === "artist") {
													const performanceDate =
														item.artist
															?.performance_date;
													if (!performanceDate)
														return false;

													let artistDate: string;
													if (
														performanceDate.includes(
															"T",
														)
													) {
														artistDate =
															performanceDate.split(
																"T",
															)[0];
													} else {
														artistDate =
															performanceDate;
													}

													let normalizedSelectedDate =
														selectedPerformanceDate;
													if (
														selectedPerformanceDate.includes(
															"T",
														)
													) {
														normalizedSelectedDate =
															selectedPerformanceDate.split(
																"T",
															)[0];
													}

													return (
														artistDate ===
														normalizedSelectedDate
													);
												}

												if (item.type === "cue") {
													return true;
												}

												return true;
											});

										if (filteredItems.length === 0) {
											return (
												<div className="text-center py-12">
													<Mic className="h-16 w-16 mx-auto mb-4 opacity-50" />
													<h3 className="text-lg font-medium mb-2">
														No performances
														scheduled
													</h3>
													<p className="text-muted-foreground">
														No performances found
														for the selected date
													</p>
												</div>
											);
										}

										return (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead className="w-16">
															#
														</TableHead>
														<TableHead>
															Performer/Cue
														</TableHead>
														<TableHead>
															Type
														</TableHead>
														<TableHead>
															Duration
														</TableHead>
														<TableHead>
															Biography
														</TableHead>
														<TableHead>
															Status
														</TableHead>
														<TableHead className="w-32">
															Action
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredItems.map(
														(item, index) => {
															const status =
																getItemStatus(
																	item,
																	index,
																);

															// Apply backstage color ONLY when status is "not_started" (backstage)
															// For other statuses, use default status colors
															const cueColor =
																item.type ===
																	"cue" &&
																item.cue
																	?.color &&
																status ===
																	"not_started"
																	? item.cue
																			.color
																	: null;
															const artistColor =
																item.type ===
																	"artist" &&
																item.artist
																	?.backstage_color &&
																status ===
																	"not_started"
																	? item
																			.artist
																			.backstage_color
																	: null;
															const itemColor =
																cueColor ||
																artistColor;
															const itemStyle =
																itemColor
																	? {
																			backgroundColor:
																				itemColor,
																		}
																	: {};
															const itemTextClass =
																itemColor &&
																!isLightColor(
																	itemColor,
																)
																	? "text-white"
																	: "";
															// Only apply status-based row classes if there's no custom color
															const rowClasses =
																itemColor
																	? ""
																	: getRowColorClasses(
																			status,
																		);

															return (
																<TableRow
																	key={
																		item.id
																	}
																	className={
																		rowClasses
																	}
																	style={
																		itemStyle
																	}
																>
																	<TableCell
																		className={`font-medium ${itemTextClass}`}
																	>
																		{index +
																			1}
																	</TableCell>
																	<TableCell>
																		{item.type ===
																			"artist" &&
																		item.artist ? (
																			<div className="flex items-center gap-3">
																				<Avatar className="h-8 w-8">
																					<AvatarFallback
																						className={
																							artistColor &&
																							!isLightColor(
																								artistColor,
																							)
																								? "bg-white/20 text-white"
																								: ""
																						}
																					>
																						{item.artist.artist_name
																							.charAt(
																								0,
																							)
																							.toUpperCase()}
																					</AvatarFallback>
																				</Avatar>
																				<div>
																					<div
																						className={`font-medium ${itemTextClass}`}
																					>
																						{
																							item
																								.artist
																								.artist_name
																						}
																					</div>
																					{item
																						.artist
																						.real_name && (
																						<div
																							className={`text-sm ${
																								artistColor &&
																								!isLightColor(
																									artistColor,
																								)
																									? "text-white/80"
																									: "text-muted-foreground"
																							}`}
																						>
																							{
																								item
																									.artist
																									.real_name
																							}
																						</div>
																					)}
																				</div>
																			</div>
																		) : (
																			item.type ===
																				"cue" &&
																			item.cue && (
																				<div className="flex items-center gap-3">
																					{(() => {
																						const IconComponent =
																							getCueIcon(
																								item
																									.cue!
																									.type,
																							);
																						return (
																							<IconComponent
																								className={`h-5 w-5 ${
																									cueColor &&
																									!isLightColor(
																										cueColor,
																									)
																										? "text-white"
																										: ""
																								}`}
																							/>
																						);
																					})()}
																					<div>
																						<div
																							className={`font-medium ${itemTextClass}`}
																						>
																							{
																								item
																									.cue
																									.title
																							}
																						</div>
																						<div
																							className={`text-sm ${
																								cueColor &&
																								!isLightColor(
																									cueColor,
																								)
																									? "text-white/80"
																									: "text-muted-foreground"
																							}`}
																						>
																							{item.cue.type.replace(
																								"_",
																								" ",
																							)}
																						</div>
																					</div>
																				</div>
																			)
																		)}
																	</TableCell>
																	<TableCell>
																		{item.type ===
																			"artist" &&
																		item.artist ? (
																			<Badge
																				variant="outline"
																				className={
																					artistColor &&
																					!isLightColor(
																						artistColor,
																					)
																						? "bg-white/20 text-white border-white/30"
																						: ""
																				}
																			>
																				{
																					item
																						.artist
																						.style
																				}
																			</Badge>
																		) : (
																			item.type ===
																				"cue" &&
																			item.cue && (
																				<Badge
																					variant="secondary"
																					className={
																						cueColor &&
																						!isLightColor(
																							cueColor,
																						)
																							? "bg-white/20 text-white border-white/30"
																							: ""
																					}
																				>
																					{item.cue.type.replace(
																						"_",
																						" ",
																					)}
																				</Badge>
																			)
																		)}
																	</TableCell>
																	<TableCell>
																		{item.type ===
																		"artist" ? (
																			<span
																				className={`flex items-center gap-1 ${itemTextClass}`}
																			>
																				<Clock
																					className={`h-3 w-3 ${
																						artistColor &&
																						!isLightColor(
																							artistColor,
																						)
																							? "text-white"
																							: ""
																					}`}
																				/>
																				{item
																					.artist
																					?.actual_duration
																					? formatDuration(
																							item
																								.artist
																								.actual_duration,
																						)
																					: "Duration TBD"}
																			</span>
																		) : item.type ===
																		  "cue" ? (
																			<span
																				className={`flex items-center gap-1 ${itemTextClass}`}
																			>
																				<Clock
																					className={`h-3 w-3 ${
																						cueColor &&
																						!isLightColor(
																							cueColor,
																						)
																							? "text-white"
																							: ""
																					}`}
																				/>
																				{item
																					.cue
																					?.duration ||
																					5}{" "}
																				min
																			</span>
																		) : (
																			<span className="text-muted-foreground text-sm">
																				No
																				duration
																			</span>
																		)}
																	</TableCell>
																	<TableCell className="max-w-[120px]">
																		{item.type ===
																			"artist" &&
																		item.artist ? (
																			<Button
																				size="sm"
																				variant="outline"
																				onClick={() => {
																					setBioModalArtist(
																						item.artist!,
																					);
																					setBioModalShowMcNotes(
																						false,
																					);
																					setBioModalOpen(
																						true,
																					);
																				}}
																				className={`flex items-center gap-1 ${
																					artistColor &&
																					!isLightColor(
																						artistColor,
																					)
																						? "bg-white/20 text-white border-white/30 hover:bg-white/30"
																						: ""
																				}`}
																			>
																				<BookOpen className="h-3 w-3" />
																				View
																				Bio
																				&
																				MC
																			</Button>
																		) : (
																			item.type ===
																				"cue" &&
																			item.cue && (
																				<div
																					className={`text-sm ${
																						cueColor &&
																						!isLightColor(
																							cueColor,
																						)
																							? "text-white/80"
																							: "text-muted-foreground"
																					}`}
																				>
																					{item
																						.cue
																						.notes ||
																						"Performance cue"}
																				</div>
																			)
																		)}
																	</TableCell>
																	<TableCell>
																		{getStatusBadge(
																			status,
																			itemColor,
																		)}
																	</TableCell>
																	<TableCell>
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() =>
																				setSelectedItem(
																					item,
																				)
																			}
																			className={
																				cueColor &&
																				!isLightColor(
																					cueColor,
																				)
																					? "bg-white/20 text-white border-white/30 hover:bg-white/30"
																					: ""
																			}
																		>
																			Select
																		</Button>
																	</TableCell>
																</TableRow>
															);
														},
													)}
												</TableBody>
											</Table>
										);
									})()}
								</CardContent>
							</Card>

							{/* Selected Performance Item Details */}
							{selectedItem && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Edit3 className="h-5 w-5" />
											Selected Performance Item
										</CardTitle>
										<CardDescription>
											Edit MC notes and introduction
											details
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-6">
											<div>
												<h3 className="text-lg font-semibold mb-2">
													{selectedItem.type ===
													"artist"
														? selectedItem.artist
																?.artist_name
														: selectedItem.cue
																?.title}
												</h3>
												{selectedItem.type ===
													"artist" &&
													selectedItem.artist && (
														<div className="space-y-3">
															<div className="flex items-center gap-2">
																<Badge variant="outline">
																	{
																		selectedItem
																			.artist
																			.style
																	}
																</Badge>
																{selectedItem
																	.artist
																	.actual_duration && (
																	<span className="text-sm text-muted-foreground flex items-center gap-1">
																		<Clock className="h-3 w-3" />
																		{formatDuration(
																			selectedItem
																				.artist
																				.actual_duration,
																		)}
																	</span>
																)}
																{getQualityBadge(
																	selectedItem
																		.artist
																		.quality_rating,
																)}
															</div>
															{selectedItem.artist
																.biography && (
																<div>
																	<Label className="text-sm font-medium">
																		Biography
																	</Label>
																	<p className="text-sm text-muted-foreground mt-1">
																		{
																			selectedItem
																				.artist
																				.biography
																		}
																	</p>
																</div>
															)}
														</div>
													)}
											</div>

											{/* MC Notes Section with Edit functionality */}
											<div className="space-y-3">
												<Label className="text-sm font-medium">
													MC Introduction Notes
												</Label>
												{editingMcNotes?.id ===
												selectedItem.id ? (
													<div className="space-y-2">
														<Textarea
															value={mcNotesText}
															onChange={(e) =>
																setMcNotesText(
																	e.target
																		.value,
																)
															}
															placeholder="Add MC introduction notes..."
															className="min-h-[100px]"
														/>
														<div className="flex gap-2">
															<Button
																size="sm"
																onClick={() =>
																	updateMCNotes(
																		selectedItem.id,
																		mcNotesText,
																		selectedItem.type,
																	)
																}
															>
																Save
															</Button>
															<Button
																size="sm"
																variant="outline"
																onClick={
																	cancelEditingMcNotes
																}
															>
																Cancel
															</Button>
														</div>
													</div>
												) : (
													<div className="space-y-2">
														{(
															selectedItem.type ===
															"artist"
																? selectedItem
																		.artist
																		?.mc_notes
																: selectedItem
																		.cue
																		?.mc_notes
														) ? (
															<div className="p-3 bg-muted rounded-lg">
																<p className="text-sm whitespace-pre-wrap">
																	{selectedItem.type ===
																	"artist"
																		? selectedItem
																				.artist
																				?.mc_notes
																		: selectedItem
																				.cue
																				?.mc_notes}
																</p>
															</div>
														) : (
															<p className="text-sm text-muted-foreground italic">
																No MC notes
																added yet
															</p>
														)}
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																startEditingMcNotes(
																	selectedItem,
																)
															}
															className="flex items-center gap-1"
														>
															<Edit3 className="h-3 w-3" />
															{(
																selectedItem.type ===
																"artist"
																	? selectedItem
																			.artist
																			?.mc_notes
																	: selectedItem
																			.cue
																			?.mc_notes
															)
																? "Edit Notes"
																: "Add Notes"}
														</Button>
													</div>
												)}
											</div>

											{/* Default Introduction Preview */}
											<div className="space-y-3">
												<Label className="text-sm font-medium">
													Suggested Introduction
												</Label>
												<div className="p-4 bg-muted rounded-lg">
													<p className="text-sm">
														{getDefaultIntroduction(
															selectedItem,
														)}
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						{/* Biographies Tab */}
						<TabsContent
							value="biographies"
							className="space-y-6 pt-5"
						>
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-semibold">
									Artist Biographies
								</h2>
								{eventDates.length > 0 && (
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										<Select
											value={selectedBioDay}
											onValueChange={setSelectedBioDay}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="Select day" />
											</SelectTrigger>
											<SelectContent>
												{eventDates.map(
													(date, index) => (
														<SelectItem
															key={date}
															value={date}
														>
															Day {index + 1} -{" "}
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

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<BookOpen className="h-5 w-5" />
										Biographies for{" "}
										{selectedBioDay
											? `Day ${
													eventDates.indexOf(
														selectedBioDay,
													) + 1
												} - ${formatDateSimple(
													selectedBioDay,
												)}`
											: "Selected Day"}
									</CardTitle>
									<CardDescription>
										View all artist biographies assigned to
										this performance day
									</CardDescription>
								</CardHeader>
								<CardContent>
									{(() => {
										const artistsForDay =
											getArtistsByDay(selectedBioDay);

										if (artistsForDay.length === 0) {
											return (
												<div className="text-center py-12">
													<Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
													<h3 className="text-lg font-medium mb-2">
														No artists assigned
													</h3>
													<p className="text-muted-foreground">
														No artists are assigned
														to this performance day
													</p>
												</div>
											);
										}

										return (
											<div className="space-y-4">
												{artistsForDay.map((artist) => (
													<Card
														key={artist.id}
														className="border"
													>
														<CardContent className="pt-4">
															<div className="flex items-start gap-4">
																<Avatar className="h-16 w-16">
																	<AvatarFallback className="text-lg">
																		{artist.artist_name
																			.charAt(
																				0,
																			)
																			.toUpperCase()}
																	</AvatarFallback>
																</Avatar>
																<div className="flex-1 space-y-2">
																	<div className="flex items-center justify-between">
																		<div>
																			<h3 className="text-lg font-semibold">
																				{
																					artist.artist_name
																				}
																			</h3>
																			{artist.real_name && (
																				<p className="text-sm text-muted-foreground">
																					{
																						artist.real_name
																					}
																				</p>
																			)}
																			{/* Nationality Information - Full display like artist dashboard */}
																			{(artist.countryLiving ||
																				artist.homeCountry ||
																				(artist.members &&
																					artist
																						.members
																						.length >
																						0)) && (
																				<div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
																					<p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
																						<Globe className="h-3 w-3" />
																						Nationality
																						Information
																					</p>
																					{artist.members &&
																					artist
																						.members
																						.length >
																						0 ? (
																						<div className="space-y-1">
																							{artist.members.map(
																								(
																									member,
																									idx,
																								) => (
																									<div
																										key={
																											idx
																										}
																										className="flex flex-wrap items-center gap-2 text-xs"
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
																						<div className="flex flex-wrap items-center gap-2 text-xs">
																							{artist.countryLiving && (
																								<span className="flex items-center gap-1">
																									{getCountryFlag(
																										artist.countryLiving,
																									)}{" "}
																									Living
																									in{" "}
																									{getCountryName(
																										artist.countryLiving,
																									)}
																								</span>
																							)}
																							{artist.homeCountry && (
																								<span className="flex items-center gap-1 text-gray-600">
																									|{" "}
																									{getCountryFlag(
																										artist.homeCountry,
																									)}{" "}
																									From{" "}
																									{getCountryName(
																										artist.homeCountry,
																									)}
																								</span>
																							)}
																						</div>
																					)}
																				</div>
																			)}
																		</div>
																		<div className="flex items-center gap-2">
																			<Badge variant="outline">
																				{
																					artist.style
																				}
																			</Badge>
																			{artist.actual_duration && (
																				<span className="text-sm text-muted-foreground flex items-center gap-1">
																					<Clock className="h-3 w-3" />
																					{formatDuration(
																						artist.actual_duration,
																					)}
																				</span>
																			)}
																			{getQualityBadge(
																				artist.quality_rating,
																			)}
																			<Button
																				size="sm"
																				variant="outline"
																				onClick={() => {
																					setBioModalArtist(
																						artist,
																					);
																					setBioModalShowMcNotes(
																						true,
																					);
																					setBioModalOpen(
																						true,
																					);
																				}}
																				className="flex items-center gap-1"
																			>
																				<BookOpen className="h-3 w-3" />
																				View
																				Details
																			</Button>
																		</div>
																	</div>
																</div>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										);
									})()}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>

					{/* Biography Modal Dialog */}
					<Dialog open={bioModalOpen} onOpenChange={setBioModalOpen}>
						<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
							{bioModalArtist && (
								<>
									<DialogHeader>
										<DialogTitle className="flex items-center gap-3">
											<Avatar className="h-10 w-10">
												<AvatarFallback>
													{bioModalArtist.artist_name
														.charAt(0)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div>
												<div>
													{bioModalArtist.artist_name}
												</div>
												{bioModalArtist.real_name && (
													<div className="text-sm font-normal text-muted-foreground">
														{
															bioModalArtist.real_name
														}
													</div>
												)}
											</div>
										</DialogTitle>
										<DialogDescription className="flex items-center gap-2">
											<Badge variant="outline">
												{bioModalArtist.style}
											</Badge>
											{bioModalArtist.actual_duration && (
												<span className="text-sm flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{formatDuration(
														bioModalArtist.actual_duration,
													)}
												</span>
											)}
											{getQualityBadge(
												bioModalArtist.quality_rating,
											)}
										</DialogDescription>
									</DialogHeader>

									<div className="space-y-4 mt-4">
										{/* Nationality Information */}
										{(bioModalArtist.countryLiving ||
											bioModalArtist.homeCountry ||
											(bioModalArtist.members &&
												bioModalArtist.members.length >
													0)) && (
											<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
												<p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
													<Globe className="h-4 w-4" />
													Nationality Information
												</p>
												{bioModalArtist.members &&
												bioModalArtist.members.length >
													0 ? (
													<div className="space-y-1">
														{bioModalArtist.members.map(
															(member, idx) => (
																<div
																	key={idx}
																	className="flex flex-wrap items-center gap-2 text-sm"
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
													<div className="flex flex-wrap items-center gap-2 text-sm">
														{bioModalArtist.countryLiving && (
															<span className="flex items-center gap-1">
																{getCountryFlag(
																	bioModalArtist.countryLiving,
																)}{" "}
																Living in{" "}
																{getCountryName(
																	bioModalArtist.countryLiving,
																)}
															</span>
														)}
														{bioModalArtist.homeCountry && (
															<span className="flex items-center gap-1 text-gray-600">
																|{" "}
																{getCountryFlag(
																	bioModalArtist.homeCountry,
																)}{" "}
																From{" "}
																{getCountryName(
																	bioModalArtist.homeCountry,
																)}
															</span>
														)}
													</div>
												)}
											</div>
										)}

										{/* Biography */}
										<div>
											<Label className="text-sm font-medium">
												Biography
											</Label>
											<p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
												{bioModalArtist.biography ||
													`${bioModalArtist.artist_name} is a talented ${bioModalArtist.style} performer.`}
											</p>
										</div>

										{/* MC Notes - always show */}
										<div>
											<div className="flex items-center justify-between mb-2">
												<Label className="text-sm font-medium">
													MC Notes
												</Label>
											</div>
											{editingMcNotes?.id ===
												bioModalArtist.id &&
											editingMcNotes?.type ===
												"artist" ? (
												<div className="space-y-2">
													<Textarea
														value={mcNotesText}
														onChange={(e) =>
															setMcNotesText(
																e.target.value,
															)
														}
														placeholder="Add MC introduction notes..."
														className="min-h-[100px]"
													/>
													<div className="flex gap-2">
														<Button
															size="sm"
															onClick={() => {
																updateMCNotes(
																	bioModalArtist.id,
																	mcNotesText,
																	"artist",
																);
																// Update the modal artist state too
																setBioModalArtist(
																	{
																		...bioModalArtist,
																		mc_notes:
																			mcNotesText,
																	},
																);
															}}
														>
															Save
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={
																cancelEditingMcNotes
															}
														>
															Cancel
														</Button>
													</div>
												</div>
											) : (
												<div className="space-y-2">
													{bioModalArtist.mc_notes ? (
														<p className="text-sm text-muted-foreground p-3 bg-muted rounded whitespace-pre-wrap">
															{
																bioModalArtist.mc_notes
															}
														</p>
													) : (
														<p className="text-sm text-muted-foreground italic">
															No MC notes added
															yet
														</p>
													)}
													<Button
														size="sm"
														variant="outline"
														onClick={() => {
															setEditingMcNotes({
																id: bioModalArtist.id,
																type: "artist",
															});
															setMcNotesText(
																bioModalArtist.mc_notes ||
																	"",
															);
														}}
														className="flex items-center gap-1"
													>
														<Edit3 className="h-3 w-3" />
														{bioModalArtist.mc_notes
															? "Edit MC Notes"
															: "Add MC Notes"}
													</Button>
												</div>
											)}
										</div>
									</div>
								</>
							)}
						</DialogContent>
					</Dialog>
				</div>

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
							<span className="text-xs text-gray-400 font-bold">MC ↔ Organiser</span>
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
								(m.sender === "organiser" && m.recipient === "mc") ||
								(m.sender === "mc" && m.recipient === "organiser")
						).length > 0 ? (
							chatMessages
								.filter(
									(m) =>
										(m.sender === "organiser" && m.recipient === "mc") ||
										(m.sender === "mc" && m.recipient === "organiser")
								)
								.map((msg) => {
									const isMe = msg.sender === "mc";
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
