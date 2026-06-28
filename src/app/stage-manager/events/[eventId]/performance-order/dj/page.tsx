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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Music,
	Clock,
	ArrowLeft,
	Upload,
	Calendar,
	Star,
	CheckCircle,
	Timer,
	Mic,
	Video,
	Trash2,
	Speaker,
	Sparkles,
	AlertTriangle,
	RefreshCw,
	Download,
	FileMusic,
	Volume2,
	Save,
	ChevronDown,
	ChevronRight,
	ListOrdered,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple, formatDateForDropdown } from "@/lib/date-utils";
import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusBadgeVariant,
} from "@/lib/status-utils";
import { formatDuration, getDisplayDuration } from "@/lib/timing-utils";
import { createWebSocketManager } from "@/lib/websocket-manager";
import { AudioPlayer } from "@/components/ui/audio-player";
import { downloadFile, detectAudioDuration } from "@/lib/media-utils";
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
	style: string;
	performance_duration: number;
	quality_rating: number | null;
	performance_order: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	actual_duration?: number;
	backstage_color?: string;
	performanceType?: string;
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
	start_time?: string;
	end_time?: string;
	is_completed?: boolean;
	completed_at?: string;
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

interface MusicTrack {
	id?: string;
	artist_id?: string;
	artist_name?: string;
	song_title: string;
	duration: number;
	file_url: string;
	file_path?: string;
	is_main_track: boolean;
	tempo: string;
	notes: string;
	dj_notes?: string;
	performance_date?: string;
}

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

export default function DJDashboard() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const eventId = params.eventId as string;
	const isStandalone = searchParams.get("standalone") === "true";

	// Access control check
	const { hasAccess, isLoading: accessLoading } = useAccessGuard(["dj_page", "full_access"]);

	const [event, setEvent] = useState<Event | null>(null);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [wsConnected, setWsConnected] = useState(false);
	const [downloadingAll, setDownloadingAll] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [downloadingDay, setDownloadingDay] = useState(false);
	const [dayDownloadProgress, setDayDownloadProgress] = useState(0);
	const [expandedArtists, setExpandedArtists] = useState<string[]>([]);
	const [djNotesState, setDjNotesState] = useState<{ [key: string]: string }>(
		{},
	);
	const [uploadingTracks, setUploadingTracks] = useState<{
		[key: string]: boolean;
	}>({});
	const [activeTab, setActiveTab] = useState("performance-order");
	const [selectedMusicDay, setSelectedMusicDay] = useState<string>("all");
	const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);

	useEffect(() => {
		if (eventId && hasAccess && !accessLoading) {
			fetchEventData();
			fetchEventDates();
			fetchEmergencyBroadcasts();
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

	const selectedPerformanceDateRef = useRef(selectedPerformanceDate);
	useEffect(() => {
		selectedPerformanceDateRef.current = selectedPerformanceDate;
	}, [selectedPerformanceDate]);

	useEffect(() => {
		if (selectedPerformanceDate) {
			fetchPerformanceOrder();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPerformanceDate, refreshTrigger]);

	// Initialize selectedMusicDay when eventDates are loaded
	useEffect(() => {
		if (eventDates.length > 0 && !selectedMusicDay) {
			setSelectedMusicDay(eventDates[0]);
		}
	}, [eventDates, selectedMusicDay]);

	// Initialize WebSocket manager for real-time updates
	useEffect(() => {
		let wsManager: any = null;

		const initializeWebSocketManager = async () => {
			try {
				wsManager = createWebSocketManager({
					eventId,
					role: "dj",
					userId: `dj_${eventId}`,
					showToasts: true,
					onConnect: () => {
						console.log("DJ WebSocket connected");
						setWsConnected(true);
					},
					onDisconnect: () => {
						console.log("DJ WebSocket disconnected");
						setWsConnected(false);
					},
					onDataUpdate: () => {
						console.log("DJ data update triggered");
						setLastUpdateTime(new Date().toLocaleTimeString());
						// Add delay to ensure database write has completed
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					},
				});

				await wsManager.initialize();

				const triggerGlobalRefresh = () => {
					console.log("DJ: Triggering refresh via WebSocket event...");
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
					"lighting_designer_updated"
				];

				syncEvents.forEach((evtName) => {
					wsManager.on(evtName, (data: any) => {
						console.log(`DJ: Received WebSocket event [${evtName}]:`, data);
						if (data && data.eventId === eventId) {
							if (evtName === "show-order-updated") {
								if (data.isDraft !== undefined) setIsDraftShowOrder(data.isDraft);
								if (data.isConfirmed !== undefined) setIsShowOrderConfirmed(data.isConfirmed);
							}
							triggerGlobalRefresh();
						}
					});
				});

				// Store reference for cleanup
				(window as any).djWsManager = wsManager;
			} catch (error) {
				console.error(
					"Error initializing DJ WebSocket manager:",
					error,
				);
				setWsConnected(false);
			}
		};

		if (eventId && hasAccess && !accessLoading) {
			initializeWebSocketManager();
		}

		// Cleanup on unmount
		return () => {
			if ((window as any).djWsManager) {
				(window as any).djWsManager.destroy();
				delete (window as any).djWsManager;
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

	const fetchPerformanceOrder = useCallback(async () => {
		if (!selectedPerformanceDate) return;

		try {
			setLoading(true);

			// Fetch artists from GCS
			const response = await fetch(`/api/events/${eventId}/artists?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					const artists = (data.data || []).map((artist: any) => ({
						id: artist.id,
						artist_name: artist.artistName || artist.artist_name,
						style: artist.style,
						performance_duration:
							artist.performanceDuration ||
							artist.performance_duration ||
							5,
						quality_rating: artist.quality_rating || null,
						performance_order: artist.performance_order || null,
						rehearsal_completed:
							artist.rehearsal_completed || false,
						performance_status: artist.performance_status || null,
						performance_date:
							artist.performanceDate || artist.performance_date,
						actual_duration:
							artist.musicTrack?.duration ||
							artist.musicTracks?.find(
								(track: any) => track.is_main_track,
							)?.duration ||
							null,
						backstage_color: artist.backstage_color || undefined,
						performanceType:
							artist.performanceType ||
							artist.performance_type ||
							undefined,
						eventShowId: artist.eventShowId,
					}));

					// Filter artists for the selected performance date
					const filteredArtists = artists.filter((a: Artist) => {
						const performanceDate =
							a.performance_date || (a as any).performanceDate;

						if (!performanceDate) {
							return false;
						}

						let artistDate: string;
						try {
							if (typeof performanceDate === "string") {
								if (performanceDate.includes("T")) {
									artistDate = performanceDate.split("T")[0];
								} else if (
									performanceDate.includes("-") &&
									performanceDate.length === 10
								) {
									artistDate = performanceDate;
								} else {
									const parsedDate = new Date(
										performanceDate,
									);
									const year = parsedDate.getFullYear();
									const month = String(
										parsedDate.getMonth() + 1,
									).padStart(2, "0");
									const day = String(
										parsedDate.getDate(),
									).padStart(2, "0");
									artistDate = `${year}-${month}-${day}`;
								}
							} else {
								const dateObj = new Date(performanceDate);
								const year = dateObj.getFullYear();
								const month = String(
									dateObj.getMonth() + 1,
								).padStart(2, "0");
								const day = String(dateObj.getDate()).padStart(
									2,
									"0",
								);
								artistDate = `${year}-${month}-${day}`;
							}
						} catch (error) {
							console.error(
								`Error parsing performance_date for artist ${a.id}:`,
								performanceDate,
								error,
							);
							return false;
						}

						let normalizedSelectedDate = selectedPerformanceDate;
						if (selectedPerformanceDate.includes("T")) {
							normalizedSelectedDate =
								selectedPerformanceDate.split("T")[0];
						}

						return artistDate === normalizedSelectedDate;
					});

					// Artists assigned to show order
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

					// Fetch cues from GCS
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
									cue,
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

					// Combine and sort all show order items
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

					// Fetch music tracks for ALL artists (not just filtered ones)
					await fetchMusicTracks();
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

	const fetchMusicTracks = async (artistIds?: string[]) => {
		try {
			// Fetch all artists to get their music tracks
			const response = await fetch(`/api/events/${eventId}/artists`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					const allTracks: MusicTrack[] = [];

					data.data.forEach((artist: any) => {
						// Get ALL artists' tracks, not just filtered ones
						const artistName =
							artist.artistName || artist.artist_name;
						const performanceDate =
							artist.performanceDate || artist.performance_date;

						// Handle single musicTrack object (new format)
						if (artist.musicTrack) {
							allTracks.push({
								...artist.musicTrack,
								artist_id: artist.id,
								artist_name: artistName,
								song_title: artistName, // Always use artist name as song title
								performance_date: performanceDate,
							});
						}
						// Backward compatibility: handle old musicTracks array
						else if (
							artist.musicTracks &&
							artist.musicTracks.length > 0
						) {
							const tracks = artist.musicTracks.map(
								(track: any) => ({
									...track,
									artist_id: artist.id,
									artist_name: artistName,
									song_title: artistName, // Always use artist name as song title
									performance_date: performanceDate,
								}),
							);
							allTracks.push(...tracks);
						}
					});

					setMusicTracks(allTracks);
				}
			}
		} catch (error) {
			console.error("Error fetching music tracks:", error);
		}
	};

	const getArtistTracks = (artistId: string) => {
		return musicTracks.filter((track) => track.artist_id === artistId);
	};

	// Get all music tracks - show ALL artists' music regardless of day assignment
	const getAllMusicTracks = () => {
		// Return all music tracks sorted by artist name
		return musicTracks
			.filter((track) => track.file_url) // Only tracks with files
			.sort((a, b) => {
				const nameA = a.artist_name || "";
				const nameB = b.artist_name || "";
				return nameA.localeCompare(nameB);
			});
	};

	// Get music tracks filtered by day (for day-specific view)
	const getMusicTracksByDay = (date: string) => {
		if (!date || date === "all") return getAllMusicTracks(); // If no date or "all" selected, show all

		// Normalize the selected date
		let normalizedDate = date;
		if (date.includes("T")) {
			normalizedDate = date.split("T")[0];
		}

		// Filter tracks by artist's performance date
		const tracksForDay = musicTracks
			.filter((track) => {
				if (!track.file_url) return false;
				if (!track.performance_date) return false;

				let trackDate = track.performance_date;
				if (trackDate.includes("T")) {
					trackDate = trackDate.split("T")[0];
				}

				return trackDate === normalizedDate;
			})
			.sort((a, b) => {
				// Sort by artist name for day view
				const nameA = a.artist_name || "";
				const nameB = b.artist_name || "";
				return nameA.localeCompare(nameB);
			});

		return tracksForDay;
	};

	// Download all music from all performances as a ZIP file
	const downloadAllMusic = async () => {
		setDownloadingAll(true);
		setDownloadProgress(0);
		try {
			const JSZip = (await import("jszip")).default;
			const zip = new JSZip();

			const tracksWithFiles = musicTracks.filter(
				(track) =>
					track.file_url &&
					track.artist_name && // Must have artist name
					!track.artist_name.toLowerCase().includes("cue"), // Exclude cue tracks
			);

			if (tracksWithFiles.length === 0) {
				toast({
					title: "No music files",
					description: "No music files available for download",
					variant: "destructive",
				});
				setDownloadingAll(false);
				return;
			}

			toast({
				title: "Preparing ZIP file",
				description: `Downloading ${tracksWithFiles.length} tracks...`,
			});

			// Helper function to convert GCS or Local Serve URL to download API path
			const getDownloadPath = (url: string): string => {
				if (!url) return "";

				// Handle VPS Local serve URL format: /api/files/serve?file=artists/some-id/music/file.mp3
				if (url.includes("/api/files/serve")) {
					try {
						const urlObj = new URL(url, "http://localhost");
						const fileParam = urlObj.searchParams.get("file");
						if (fileParam) {
							return fileParam;
						}
					} catch (e) {
						const match = url.match(/[?&]file=([^&]+)/);
						if (match) {
							return decodeURIComponent(match[1]);
						}
					}
				}

				if (url.startsWith("gs://")) {
					// Remove gs:// and bucket name to get just the path
					return url.replace(/^gs:\/\/[^/]+\//, "");
				} else if (
					url.startsWith("https://storage.cloud.google.com/")
				) {
					return url
						.replace("https://storage.cloud.google.com/", "")
						.replace(/^[^/]+\//, "");
				} else if (url.startsWith("https://storage.googleapis.com/")) {
					return url
						.replace("https://storage.googleapis.com/", "")
						.replace(/^[^/]+\//, "");
				}
				return url;
			};

			// Download each track and add to ZIP
			let completedCount = 0;
			let failedCount = 0;
			for (const track of tracksWithFiles) {
				try {
					// Use just artist name for the filename (e.g., "Flora.mp3")
					const artistName = track.artist_name || "Unknown";
					// Get file extension from the URL or default to mp3
					const urlParts = track.file_url.split(".");
					const extension =
						urlParts.length > 1
							? urlParts[urlParts.length - 1].split("?")[0]
							: "mp3";
					const filename = `${artistName}.${extension}`;

					console.log(
						`Downloading: ${filename} from ${track.file_url}`,
					);

					// Get the file path for the download API
					const filePath = getDownloadPath(track.file_url);

					// Call our download API to get a signed URL
					const apiResponse = await fetch(
						`/api/download/${encodeURIComponent(filePath)}`,
					);

					if (!apiResponse.ok) {
						throw new Error(
							`Download API failed: ${apiResponse.status}`,
						);
					}

					const data = await apiResponse.json();

					if (!data.downloadUrl) {
						throw new Error("No download URL received from API");
					}

					// Fetch the file using the signed URL
					const fileResponse = await fetch(data.downloadUrl);
					if (!fileResponse.ok) {
						throw new Error(
							`Failed to fetch file: ${fileResponse.status}`,
						);
					}
					const blob = await fileResponse.blob();

					// Add to ZIP
					zip.file(filename, blob);

					// Update progress
					completedCount++;
					const progress = Math.round(
						(completedCount / tracksWithFiles.length) * 100,
					);
					setDownloadProgress(progress);
				} catch (error) {
					console.error(
						`Failed to download ${track.artist_name}:`,
						error,
					);
					failedCount++;
					// Continue with next track even if one fails
				}
			}

			if (completedCount === 0) {
				toast({
					title: "Download failed",
					description: "Could not download any music files",
					variant: "destructive",
				});
				setDownloadingAll(false);
				setDownloadProgress(0);
				return;
			}

			// Generate ZIP file
			toast({
				title: "Creating ZIP file",
				description: "Compressing files...",
			});

			const zipBlob = await zip.generateAsync({
				type: "blob",
				compression: "DEFLATE",
				compressionOptions: { level: 6 },
			});

			// Create download link
			const url = URL.createObjectURL(zipBlob);
			const link = document.createElement("a");
			link.href = url;
			const eventName =
				event?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Event";
			link.download = `${eventName}_Music.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast({
				title: "Download complete",
				description:
					failedCount > 0
						? `Downloaded ${completedCount} music files as ZIP (${failedCount} failed)`
						: `Downloaded ${completedCount} music files as ZIP`,
				variant: "success",
			});
		} catch (error) {
			console.error("Error downloading all music:", error);
			toast({
				title: "Download failed",
				description: "Failed to download music files",
				variant: "destructive",
			});
		} finally {
			setDownloadingAll(false);
			setDownloadProgress(0);
		}
	};

	// Download music for a specific day as a ZIP file
	const downloadDayMusic = async (date: string) => {
		setDownloadingDay(true);
		setDayDownloadProgress(0);
		try {
			const dayIndex = eventDates.indexOf(date);
			const dayNumber = dayIndex + 1;
			const eventName =
				event?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Event";

			toast({
				title: "Preparing download",
				description: `Downloading music for Day ${dayNumber}...`,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/download-music-day`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						date,
						dayNumber,
						eventName,
					}),
				},
			);

			if (!response.ok) {
				let errorMessage = "Download failed";
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch { /* skip */ }
				throw new Error(errorMessage);
			}

			// Stream the response to show real download progress
			const sizeHeader = response.headers.get("x-file-size") || response.headers.get("content-length");
			const total = sizeHeader ? parseInt(sizeHeader, 10) : 0;
			let received = 0;
			const chunks: any[] = [];

			const reader = response.body?.getReader();
			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					received += value.length;
					if (total > 0) {
						setDayDownloadProgress(Math.round((received / total) * 100));
					} else {
						setDayDownloadProgress((p) => Math.min(p + 5, 90));
					}
				}
			} else {
				const buffer = await response.arrayBuffer();
				chunks.push(new Uint8Array(buffer));
			}

			setDayDownloadProgress(100);
			const blob = new Blob(chunks, { type: "application/zip" });

			// Create download link
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			const dayLabel = `Day_${dayNumber}_${new Date(
				date,
			).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})}`;
			link.download = `${dayLabel}_Music_${eventName}.zip`;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast({
				title: "Download complete",
				description: `Downloaded Day ${dayNumber} music as ZIP`,
				variant: "success",
			});
		} catch (error) {
			console.error("Error downloading day music:", error);
			toast({
				title: "Download failed",
				description:
					error instanceof Error
						? error.message
						: "Failed to download day music",
				variant: "destructive",
			});
		} finally {
			setDownloadingDay(false);
			setDayDownloadProgress(0);
		}
	};

	// Save DJ notes
	const saveDjNotes = async (artistId: string) => {
		try {
			const notes = djNotesState[artistId] || "";

			// Update artist with DJ notes
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						dj_notes: notes,
					}),
				},
			);

			if (response.ok) {
				toast({
					title: "Notes saved",
					description: "DJ notes have been saved successfully",
					variant: "success",
				});

				// Refresh data
				fetchPerformanceOrder();
			} else {
				throw new Error("Failed to save notes");
			}
		} catch (error) {
			console.error("Error saving DJ notes:", error);
			toast({
				title: "Save failed",
				description: "Failed to save DJ notes",
				variant: "destructive",
			});
		}
	};

	// Delete music track
	const deleteTrack = async (artistId: string, trackIndex: number) => {
		try {
			// Get current artist data
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
			);
			if (!response.ok) throw new Error("Failed to fetch artist");

			const artistData = await response.json();
			const updatedTracks = [...(artistData.data.musicTracks || [])];
			updatedTracks.splice(trackIndex, 1);

			// Update artist with modified tracks
			const updateResponse = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						musicTracks: updatedTracks,
					}),
				},
			);

			if (updateResponse.ok) {
				toast({
					title: "Track deleted",
					description: "Music track has been deleted successfully",
					variant: "success",
				});

				// Refresh data
				fetchPerformanceOrder();
			} else {
				throw new Error("Failed to delete track");
			}
		} catch (error) {
			console.error("Error deleting track:", error);
			toast({
				title: "Delete failed",
				description: "Failed to delete music track",
				variant: "destructive",
			});
		}
	};

	// Upload new music track
	const uploadNewTrack = async (
		artistId: string,
		file: File,
		title: string,
	) => {
		try {
			setUploadingTracks((prev) => ({ ...prev, [artistId]: true }));

			const formData = new FormData();
			formData.append("file", file);
			formData.append("type", "music");

			// Upload file
			const uploadResponse = await fetch(
				`/api/events/${eventId}/upload`,
				{
					method: "POST",
					body: formData,
				},
			);

			if (!uploadResponse.ok) throw new Error("Failed to upload file");

			const uploadResult = await uploadResponse.json();

			// Detect duration
			const duration = await detectAudioDuration(file);

			// Get current artist data
			const artistResponse = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
			);
			if (!artistResponse.ok) throw new Error("Failed to fetch artist");

			const artistData = await artistResponse.json();
			const updatedTracks = [...(artistData.data.musicTracks || [])];

			// Add new track
			updatedTracks.push({
				song_title: title,
				duration: duration,
				file_url: uploadResult.url,
				file_path: uploadResult.path,
				is_main_track: updatedTracks.length === 0,
				tempo: "",
				notes: "",
			});

			// Update artist with new track
			const updateResponse = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						musicTracks: updatedTracks,
					}),
				},
			);

			if (updateResponse.ok) {
				toast({
					title: "Track uploaded",
					description:
						"New music track has been uploaded successfully",
				});

				// Refresh data
				fetchPerformanceOrder();
				return true;
			} else {
				throw new Error("Failed to update artist");
			}
		} catch (error) {
			console.error("Error uploading track:", error);
			toast({
				title: "Upload failed",
				description: "Failed to upload music track",
				variant: "destructive",
			});
			return false;
		} finally {
			setUploadingTracks((prev) => ({ ...prev, [artistId]: false }));
		}
	};

	// Emergency broadcast functions
	const fetchEmergencyBroadcasts = useCallback(async () => {
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
	}, [eventId]);



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

	// Using imported status utilities
	const getRowColorClasses = (status?: string | null) => {
		return `${getStatusColorClasses(status)} shadow-md border-2`;
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
			opening: Music,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType];
	};

	const getItemStatus = (item: ShowOrderItem, index: number) => {
		// Always respect the status from the database (set by stage manager)
		if (item.status) return item.status;

		// For cues, check if completed
		if (item.type === "cue" && item.cue?.is_completed) {
			return "completed";
		}

		// Default to not_started if no status is set
		return "not_started";
	};

	// Clean Upload Component - No auto-refresh interference with WebSocket-only mode
	const ArtistUploadSection = ({ artist }: { artist: Artist }) => {
		const [title, setTitle] = useState("");
		const [file, setFile] = useState<File | null>(null);
		const [isUploading, setIsUploading] = useState(false);
		const fileInputRef = useRef<HTMLInputElement>(null);

		const handleUpload = async () => {
			if (!file || !title.trim()) {
				toast({
					title: "Missing information",
					description:
						"Please provide both track title and audio file",
					variant: "destructive",
				});
				return;
			}

			setIsUploading(true);

			try {
				const success = await uploadNewTrack(
					artist.id,
					file,
					title.trim(),
				);

				if (success) {
					// Clear form after successful upload
					setTitle("");
					setFile(null);
					if (fileInputRef.current) {
						fileInputRef.current.value = "";
					}

					toast({
						title: "Upload successful",
						description: `"${title}" has been uploaded successfully`,
						variant: "success",
					});
				}
			} catch (error) {
				console.error("Upload error:", error);
				toast({
					title: "Upload failed",
					description: "Failed to upload track. Please try again.",
					variant: "destructive",
				});
			} finally {
				setIsUploading(false);
			}
		};

		const clearForm = () => {
			setTitle("");
			setFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		};

		return (
			<Card className="mt-4 border-2 border-dashed border-muted-foreground/25">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm flex items-center gap-2">
							<Upload className="h-4 w-4" />
							Upload New Track
						</CardTitle>
						{(title.trim() || file) && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearForm}
								className="text-muted-foreground hover:text-foreground"
							>
								Clear
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor={`track-title-${artist.id}`}>
							Track Title *
						</Label>
						<Input
							id={`track-title-${artist.id}`}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Enter track title"
							className="focus:ring-2 focus:ring-primary"
							disabled={isUploading}
						/>
					</div>

					<div>
						<Label htmlFor={`track-file-${artist.id}`}>
							Audio File *
						</Label>
						<Input
							ref={fileInputRef}
							id={`track-file-${artist.id}`}
							type="file"
							accept=".mp3,audio/mpeg,audio/mp3"
							onChange={(e) =>
								setFile(e.target.files?.[0] || null)
							}
							className="focus:ring-2 focus:ring-primary"
							disabled={isUploading}
						/>
						{file && (
							<div className="mt-2 p-2 bg-muted rounded-md">
								<p className="text-sm font-medium text-foreground">
									Selected: {file.name}
								</p>
								<p className="text-xs text-muted-foreground">
									Size: {(file.size / 1024 / 1024).toFixed(2)}{" "}
									MB
								</p>
							</div>
						)}
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleUpload}
							disabled={!file || !title.trim() || isUploading}
							className="flex-1"
						>
							{isUploading ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Upload Track
								</>
							)}
						</Button>

						{(title.trim() || file) && (
							<Button
								variant="outline"
								onClick={clearForm}
								disabled={isUploading}
							>
								Cancel
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-border bg-white">
				<div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
						<div className="w-full sm:w-auto">
							<h1 className="text-lg sm:text-2xl font-bold text-foreground">
								DJ Dashboard
							</h1>
							<p className="text-sm sm:text-base text-muted-foreground truncate">
								{event?.name}
							</p>
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
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${
										wsConnected
											? "bg-green-500"
											: "bg-red-500"
									}`}
								></div>
								<span className="text-sm text-muted-foreground">
									{wsConnected
										? "Live Performance Control"
										: "Connecting..."}
								</span>
							</div>
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

			{/* Current Status Section */}
			{/* <div className="border-b border-border bg-gradient-to-br from-gray-50 to-gray-100">
				<div className="container mx-auto px-4 py-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
						<Card className="bg-green-500 text-white rounded-2xl shadow-xl border-0">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-white flex items-center gap-2">
									<div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
									Currently On Stage
								</CardTitle>
							</CardHeader>
							<CardContent className="text-white">
								{(() => {
									const currentlyOnStageItems =
										showOrderItems.filter(
											(item) =>
												getItemStatus(
													item,
													showOrderItems.indexOf(item)
												) === "currently_on_stage"
										);

									if (currentlyOnStageItems.length === 0) {
										return (
											<div className="text-center text-white/80">
												<Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
												<p>
													No performance currently on
													stage
												</p>
											</div>
										);
									}

									return (
										<div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
											{currentlyOnStageItems.map(
												(item) => {
													if (
														item.type === "artist"
													) {
														// Don't apply backstage color when currently on stage - use default green background
														const artistColor =
															null;
														const textColorClass =
															"";
														return (
															<div
																key={item.id}
																className="flex items-center gap-3 p-2 rounded-lg"
																style={{
																	backgroundColor:
																		"rgba(255,255,255,0.1)",
																}}
															>
																<div
																	className={`w-10 h-10 rounded-full flex items-center justify-center ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "bg-white/20"
																			: "bg-white/20"
																	}`}
																>
																	<Music
																		className={`h-5 w-5 ${
																			artistColor &&
																			!isLightColor(
																				artistColor
																			)
																				? "text-white"
																				: "text-white"
																		}`}
																	/>
																</div>
																<div className="flex-1 min-w-0">
																	<h3
																		className={`font-semibold text-sm truncate ${
																			artistColor &&
																			!isLightColor(
																				artistColor
																			)
																				? "text-white"
																				: "text-white"
																		}`}
																	>
																		{
																			item.artist!
																				.artist_name
																		}
																	</h3>
																	<div
																		className={`flex items-center gap-2 text-xs ${
																			artistColor &&
																			!isLightColor(
																				artistColor
																			)
																				? "text-white/80"
																				: "text-white/80"
																		}`}
																	>
																		<Badge
																			variant="outline"
																			className={
																				artistColor &&
																				!isLightColor(
																					artistColor
																				)
																					? "bg-white/20 text-white border-white/30 text-xs"
																					: "bg-white/20 text-white border-white/30 text-xs"
																			}
																		>
																			{
																				item.artist!
																					.style
																			}
																		</Badge>
																		{item.artist!
																			.performanceType && (
																			<Badge
																				variant="outline"
																				className="bg-white/20 text-white border-white/30 text-xs"
																			>
																				{item.artist!.performanceType}
																			</Badge>
																		)}
																		{item.artist!
																			.actual_duration && (
																			<span className="flex items-center gap-1">
																				<Clock className="h-3 w-3" />
																				{formatDuration(
																					item.artist!
																						.actual_duration
																				)}
																			</span>
																		)}
																	</div>
																</div>
															</div>
														);
													} else if (
														item.type === "cue"
													) {
														// Don't apply cue color when currently on stage - use default green background
														const cueColor = null;
														const textColorClass =
															"text-gray-900";
														return (
															<div
																key={item.id}
																className="flex items-center gap-3 p-2 rounded-lg"
																style={{
																	backgroundColor:
																		"rgba(255,255,255,0.1)",
																}}
															>
																{(() => {
																	const IconComponent =
																		getCueIcon(
																			item.cue!
																				.type
																		);
																	return (
																		<IconComponent
																			className={`h-5 w-5 ${
																				cueColor &&
																				!isLightColor(
																					cueColor
																				)
																					? "text-white"
																					: "text-gray-700"
																			}`}
																		/>
																	);
																})()}
																<div className="flex-1 min-w-0">
																	<h3
																		className={`font-semibold text-sm truncate ${textColorClass}`}
																	>
																		{
																			item.cue!
																				.title
																		}
																	</h3>
																	<div
																		className={`flex items-center gap-2 text-xs ${
																			cueColor &&
																			!isLightColor(
																				cueColor
																			)
																				? "text-white/80"
																				: "text-gray-600"
																		}`}
																	>
																		<Badge
																			variant="outline"
																			className={
																				cueColor &&
																				!isLightColor(
																					cueColor
																				)
																					? "bg-white/20 text-white border-white/30 text-xs"
																					: "bg-gray-100 text-gray-700 border-gray-300 text-xs"
																			}
																		>
																			{
																				item.cue!
																					.type
																			}
																		</Badge>
																		<span className="flex items-center gap-1">
																			<Clock className="h-3 w-3" />
																			{item.cue!
																				.duration ||
																				5}{" "}
																			min
																		</span>
																	</div>
																</div>
															</div>
														);
													}
													return null;
												}
											)}
										</div>
									);
								})()}
							</CardContent>
						</Card>

						<Card className="bg-blue-500 text-white rounded-2xl shadow-xl border-0">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-white flex items-center gap-2">
									<div className="w-3 h-3 bg-white rounded-full"></div>
									Next on Deck
								</CardTitle>
							</CardHeader>
							<CardContent className="text-white">
								{(() => {
									const nextOnDeckItems =
										showOrderItems.filter(
											(item) =>
												getItemStatus(
													item,
													showOrderItems.indexOf(item)
												) === "next_on_deck"
										);

									if (nextOnDeckItems.length === 0) {
										return (
											<div className="text-center text-white/80">
												<Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
												<p>No performance on deck</p>
											</div>
										);
									}

									return (
										<div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
											{nextOnDeckItems.map((item) => {
												if (item.type === "artist") {
													// Don't apply backstage color when next on deck - use default blue background
													const artistColor = null;
													return (
														<div
															key={item.id}
															className="flex items-center gap-3 p-2 rounded-lg"
															style={{
																backgroundColor:
																	"rgba(255,255,255,0.1)",
															}}
														>
															<div
																className={`w-10 h-10 rounded-full flex items-center justify-center ${
																	artistColor &&
																	!isLightColor(
																		artistColor
																	)
																		? "bg-white/20"
																		: "bg-white/20"
																}`}
															>
																<Music
																	className={`h-5 w-5 ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white"
																			: "text-white"
																	}`}
																/>
															</div>
															<div className="flex-1 min-w-0">
																<h3
																	className={`font-semibold text-sm truncate ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white"
																			: "text-white"
																	}`}
																>
																	{
																		item.artist!
																			.artist_name
																	}
																</h3>
																<div
																	className={`flex items-center gap-2 text-xs ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white/80"
																			: "text-white/80"
																	}`}
																>
																	<Badge
																		variant="outline"
																		className={
																			artistColor &&
																			!isLightColor(
																				artistColor
																			)
																				? "bg-white/20 text-white border-white/30 text-xs"
																				: "bg-white/20 text-white border-white/30 text-xs"
																		}
																	>
																		{
																			item.artist!
																				.style
																		}
																	</Badge>
																	{item.artist!
																		.performanceType && (
																		<Badge
																			variant="outline"
																			className="bg-white/20 text-white border-white/30 text-xs"
																		>
																			{item.artist!.performanceType}
																		</Badge>
																	)}
																	{item.artist!
																		.actual_duration && (
																		<span className="flex items-center gap-1">
																			<Clock className="h-3 w-3" />
																			{formatDuration(
																				item.artist!
																					.actual_duration
																			)}
																		</span>
																	)}
																</div>
															</div>
														</div>
													);
												} else if (
													item.type === "cue"
												) {
													const cueColor =
														item.cue?.color;
													const textColorClass =
														cueColor &&
														!isLightColor(cueColor)
															? "text-white"
															: "text-gray-900";
													return (
														<div
															key={item.id}
															className="flex items-center gap-3 p-2 rounded-lg"
															style={{
																backgroundColor:
																	cueColor ||
																	"rgba(255,255,255,0.1)",
															}}
														>
															{(() => {
																const IconComponent =
																	getCueIcon(
																		item.cue!
																			.type
																	);
																return (
																	<IconComponent
																		className={`h-5 w-5 ${
																			cueColor &&
																			!isLightColor(
																				cueColor
																			)
																				? "text-white"
																				: "text-gray-700"
																		}`}
																	/>
																);
															})()}
															<div className="flex-1 min-w-0">
																<h3
																	className={`font-semibold text-sm truncate ${textColorClass}`}
																>
																	{
																		item.cue!
																			.title
																	}
																</h3>
																<div
																	className={`flex items-center gap-2 text-xs ${
																		cueColor &&
																		!isLightColor(
																			cueColor
																		)
																			? "text-white/80"
																			: "text-gray-600"
																	}`}
																>
																	<Badge
																		variant="outline"
																		className={
																			cueColor &&
																			!isLightColor(
																				cueColor
																			)
																				? "bg-white/20 text-white border-white/30 text-xs"
																				: "bg-gray-100 text-gray-700 border-gray-300 text-xs"
																		}
																	>
																		{
																			item.cue!
																				.type
																		}
																	</Badge>
																	<span className="flex items-center gap-1">
																		<Clock className="h-3 w-3" />
																		{item.cue!
																			.duration ||
																			5}{" "}
																		min
																	</span>
																</div>
															</div>
														</div>
													);
												}
												return null;
											})}
										</div>
									);
								})()}
							</CardContent>
						</Card>

						<Card className="bg-gray-500 text-white rounded-2xl shadow-xl border-0">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-white flex items-center gap-2">
									<div className="w-3 h-3 bg-white rounded-full"></div>
									Back Stage
								</CardTitle>
							</CardHeader>
							<CardContent className="text-white">
								{(() => {
									const backStageItems =
										showOrderItems.filter(
											(item) =>
												item.status === "not_started" ||
												(!item.status &&
													item.type === "cue" &&
													!item.cue?.is_completed)
										);

									if (backStageItems.length === 0) {
										return (
											<div className="text-center text-white/80">
												<Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
												<p>No items back stage</p>
											</div>
										);
									}

									return (
										<div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
											{backStageItems.map((item) => {
												if (item.type === "artist") {
													const artistColor =
														item.artist
															?.backstage_color;
													return (
														<div
															key={item.id}
															className="flex items-center gap-3 p-2 rounded-lg"
															style={{
																backgroundColor:
																	artistColor ||
																	"rgba(255,255,255,0.1)",
															}}
														>
															<div
																className={`w-10 h-10 rounded-full flex items-center justify-center ${
																	artistColor &&
																	!isLightColor(
																		artistColor
																	)
																		? "bg-white/20"
																		: "bg-white/20"
																}`}
															>
																<Music
																	className={`h-5 w-5 ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white"
																			: "text-white"
																	}`}
																/>
															</div>
															<div className="flex-1 min-w-0">
																<h3
																	className={`font-semibold text-sm truncate ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white"
																			: "text-white"
																	}`}
																>
																	{
																		item.artist!
																			.artist_name
																	}
																</h3>
																<div
																	className={`flex items-center gap-2 text-xs ${
																		artistColor &&
																		!isLightColor(
																			artistColor
																		)
																			? "text-white/80"
																			: "text-white/80"
																	}`}
																>
																	<Badge
																		variant="outline"
																		className={
																			artistColor &&
																			!isLightColor(
																				artistColor
																			)
																				? "bg-white/20 text-white border-white/30 text-xs"
																				: "bg-white/20 text-white border-white/30 text-xs"
																		}
																	>
																		{
																			item.artist!
																				.style
																		}
																	</Badge>
																	{item.artist!
																		.performanceType && (
																		<Badge
																			variant="outline"
																			className="bg-white/20 text-white border-white/30 text-xs"
																		>
																			{item.artist!.performanceType}
																		</Badge>
																	)}
																	{item.artist!
																		.actual_duration && (
																		<span className="flex items-center gap-1">
																			<Clock className="h-3 w-3" />
																			{formatDuration(
																				item.artist!
																					.actual_duration
																			)}
																		</span>
																	)}
																</div>
															</div>
														</div>
													);
												} else if (
													item.type === "cue"
												) {
													const cueColor =
														item.cue?.color;
													const textColorClass =
														cueColor &&
														!isLightColor(cueColor)
															? "text-white"
															: "text-gray-900";
													return (
														<div
															key={item.id}
															className="flex items-center gap-3 p-2 rounded-lg"
															style={{
																backgroundColor:
																	cueColor ||
																	"rgba(255,255,255,0.1)",
															}}
														>
															{(() => {
																const IconComponent =
																	getCueIcon(
																		item.cue!
																			.type
																	);
																return (
																	<IconComponent
																		className={`h-5 w-5 ${
																			cueColor &&
																			!isLightColor(
																				cueColor
																			)
																				? "text-white"
																				: "text-gray-700"
																		}`}
																	/>
																);
															})()}
															<div className="flex-1 min-w-0">
																<h3
																	className={`font-semibold text-sm truncate ${textColorClass}`}
																>
																	{
																		item.cue!
																			.title
																	}
																</h3>
																<div
																	className={`flex items-center gap-2 text-xs ${
																		cueColor &&
																		!isLightColor(
																			cueColor
																		)
																			? "text-white/80"
																			: "text-gray-600"
																	}`}
																>
																	<Badge
																		variant="outline"
																		className={
																			cueColor &&
																			!isLightColor(
																				cueColor
																			)
																				? "bg-white/20 text-white border-white/30 text-xs"
																				: "bg-gray-100 text-gray-700 border-gray-300 text-xs"
																		}
																	>
																		{
																			item.cue!
																				.type
																		}
																	</Badge>
																	<span className="flex items-center gap-1">
																		<Clock className="h-3 w-3" />
																		{item.cue!
																			.duration ||
																			5}{" "}
																		min
																	</span>
																</div>
															</div>
														</div>
													);
												}
												return null;
											})}
										</div>
									);
								})()}
							</CardContent>
						</Card>
					</div>
				</div>
			</div> */}

			<main className="container mx-auto px-4 py-6">
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

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full"
				>
					<TabsList className="grid w-full grid-cols-2 max-w-md mb-6 p-1">
						<TabsTrigger
							value="performance-order"
							className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white hover:bg-gray-100 "
						>
							<ListOrdered className="h-4 w-4" />
							<span className="hidden sm:inline">
								Performance Order
							</span>
							<span className="sm:hidden">Order</span>
						</TabsTrigger>
						<TabsTrigger
							value="all-musics"
							className="flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all data-[state=active]:bg-green-600 data-[state=active]:text-white hover:bg-gray-100"
						>
							<Music className="h-4 w-4" />
							<span className="hidden sm:inline">
								See All Musics
							</span>
							<span className="sm:hidden">Music</span>
						</TabsTrigger>
					</TabsList>

					{/* Performance Order Tab */}
					<TabsContent
						value="performance-order"
						className="space-y-6"
					>
						<div className="mb-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold">
									Performance Order
								</h2>
								<div className="flex items-center gap-4">
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
							</div>

							<div className="space-y-4">
								{(() => {
									// Filter performance items by selected date
									const filteredItems = showOrderItems.filter(
										(item) => {
											if (!selectedPerformanceDate)
												return true;

											if (item.type === "artist") {
												const performanceDate =
													item.artist
														?.performance_date;
												if (!performanceDate)
													return false;
												const artistDate = new Date(
													performanceDate,
												)
													.toISOString()
													.split("T")[0];
												const filterDate = new Date(
													selectedPerformanceDate,
												)
													.toISOString()
													.split("T")[0];
												return (
													artistDate === filterDate
												);
											}

											if (item.type === "cue") {
												return true;
											}

											return true;
										},
									);

									return filteredItems.length === 0 ? (
										<Card className="p-6">
											<div className="text-center">
												<Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
												<h3 className="text-lg font-semibold mb-2">
													{selectedPerformanceDate
														? "No Performances Scheduled"
														: "No Performance Order Set"}
												</h3>
												<p className="text-muted-foreground">
													{selectedPerformanceDate
														? `No performances are scheduled for ${formatDateSimple(
																selectedPerformanceDate,
															)}.`
														: "The Stage Manager hasn't set up the performance order yet."}
												</p>
											</div>
										</Card>
									) : (
										<Accordion
											type="multiple"
											className="space-y-4"
										>
											{filteredItems.map(
												(item, index) => {
													// Apply backstage color ONLY when status is "not_started" (backstage)
													const status =
														getItemStatus(
															item,
															index,
														);
													const cueColor =
														item.type === "cue" &&
														item.cue?.color &&
														status === "not_started"
															? item.cue.color
															: null;
													// For artists with backstage color, use that as background ONLY when backstage
													const artistColor =
														item.type ===
															"artist" &&
														item.artist
															?.backstage_color &&
														status === "not_started"
															? item.artist
																	.backstage_color
															: null;
													const itemColor =
														cueColor || artistColor;
													const itemStyle = itemColor
														? {
																backgroundColor:
																	itemColor,
															}
														: {};
													const itemTextClass =
														itemColor &&
														!isLightColor(itemColor)
															? "text-white"
															: "";
													const cardClasses =
														itemColor
															? ""
															: getRowColorClasses(
																	item.status,
																);

													return (
														<Card
															key={item.id}
															className={`transition-all duration-200 ${cardClasses}`}
															style={itemStyle}
														>
															{item.type ===
																"artist" &&
															item.artist ? (
																<AccordionItem
																	value={
																		item.id
																	}
																	className="border-none"
																>
																	<AccordionTrigger
																		className={`px-6 py-4 hover:no-underline ${
																			itemColor &&
																			!isLightColor(
																				itemColor,
																			)
																				? "[&>svg]:text-white"
																				: ""
																		}`}
																	>
																		<div className="flex items-center justify-between w-full mr-4">
																			<div className="flex items-center space-x-4">
																				<div
																					className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
																						itemColor &&
																						!isLightColor(
																							itemColor,
																						)
																							? "bg-white/20 text-white"
																							: "bg-primary text-primary-foreground"
																					}`}
																				>
																					{index +
																						1}
																				</div>
																				<div className="text-left">
																					<h3
																						className={`text-lg font-semibold ${
																							itemColor &&
																							!isLightColor(
																								itemColor,
																							)
																								? "text-white"
																								: ""
																						}`}
																					>
																						{
																							item
																								.artist
																								.artist_name
																						}
																					</h3>
																					<div className="flex items-center gap-2 mt-1">
																						<Badge
																							variant="outline"
																							className={
																								itemColor &&
																								!isLightColor(
																									itemColor,
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
																						{item
																							.artist
																							.performanceType && (
																							<Badge
																								variant="outline"
																								className={
																									itemColor &&
																									!isLightColor(
																										itemColor,
																									)
																										? "bg-white/20 text-white border-white/30"
																										: ""
																								}
																							>
																								{
																									item
																										.artist
																										.performanceType
																								}
																							</Badge>
																						)}
																						<span
																							className={`text-sm flex items-center gap-1 ${
																								itemColor &&
																								!isLightColor(
																									itemColor,
																								)
																									? "text-white/80"
																									: "text-muted-foreground"
																							}`}
																						>
																							<Clock className="h-3 w-3" />
																							{getDisplayDuration(
																								item.artist,
																							)}
																						</span>
																						{item
																							.artist
																							.rehearsal_completed && (
																							<Badge
																								variant="secondary"
																								className={`flex items-center gap-1 ${
																									itemColor &&
																									!isLightColor(
																										itemColor,
																									)
																										? "bg-white/20 text-white border-white/30"
																										: ""
																								}`}
																							>
																								<CheckCircle className="h-3 w-3" />
																								Rehearsed
																							</Badge>
																						)}
																						{getQualityBadge(
																							item
																								.artist
																								.quality_rating,
																						)}
																					</div>
																				</div>
																			</div>
																			<div className="flex items-center gap-4">
																				<Badge
																					variant={
																						item.status ===
																						"completed"
																							? "destructive"
																							: item.status ===
																								  "currently_on_stage"
																								? "default"
																								: "outline"
																					}
																					className={
																						itemColor &&
																						!isLightColor(
																							itemColor,
																						)
																							? "bg-white/20 text-white border-white/30"
																							: ""
																					}
																				>
																					{item.status ===
																						"not_started" &&
																						"Backstage"}
																					{item.status ===
																						"next_on_deck" &&
																						"Next on Deck"}
																					{item.status ===
																						"next_on_stage" &&
																						"Next on Stage"}
																					{item.status ===
																						"currently_on_stage" &&
																						"Currently on Stage"}
																					{item.status ===
																						"completed" &&
																						"Completed"}
																				</Badge>
																			</div>
																		</div>
																	</AccordionTrigger>
																	<AccordionContent className="px-6 pb-6">
																		<div className="space-y-6">
																			{/* Music Tracks Section */}
																			<div>
																				<h4 className="font-medium mb-4 flex items-center gap-2">
																					<FileMusic className="h-4 w-4" />
																					Music
																					Tracks
																					&
																					Timing
																				</h4>
																				{(() => {
																					const artistTracks =
																						getArtistTracks(
																							item
																								.artist!
																								.id,
																						);
																					return artistTracks.length ===
																						0 ? (
																						<Card className="p-4">
																							<div className="text-center text-muted-foreground">
																								<FileMusic className="h-8 w-8 mx-auto mb-2 opacity-50" />
																								<p>
																									No
																									music
																									tracks
																									uploaded
																								</p>
																							</div>
																						</Card>
																					) : (
																						<div className="space-y-3">
																							{artistTracks.map(
																								(
																									track,
																									trackIndex,
																								) => (
																									<Card
																										key={
																											trackIndex
																										}
																										className="p-4"
																									>
																										<div className="flex items-center justify-between mb-3">
																											<div className="flex items-center gap-3">
																												<h5 className="font-medium">
																													{
																														track.song_title
																													}
																												</h5>
																												<Badge
																													variant={
																														track.is_main_track
																															? "default"
																															: "outline"
																													}
																												>
																													{track.is_main_track
																														? "Main Track"
																														: "Additional"}
																												</Badge>
																											</div>
																											<Button
																												variant="destructive"
																												size="sm"
																												onClick={() => {
																													if (
																														confirm(
																															`Delete "${track.song_title}"?`,
																														)
																													) {
																														deleteTrack(
																															item
																																.artist!
																																.id,
																															trackIndex,
																														);
																													}
																												}}
																											>
																												<Trash2 className="h-4 w-4 mr-1" />
																												Delete
																											</Button>
																										</div>

																										{track.file_url ? (
																											<AudioPlayer
																												track={
																													track
																												}
																											/>
																										) : (
																											<div className="bg-muted/50 rounded-lg p-3">
																												<div className="flex items-center gap-2 text-muted-foreground">
																													<AlertTriangle className="h-4 w-4" />
																													<span className="text-sm">
																														No
																														audio
																														file
																														uploaded
																													</span>
																												</div>
																											</div>
																										)}

																										<div className="grid grid-cols-2 gap-4 mt-3 text-sm">
																											<div>
																												<Label className="text-xs text-muted-foreground">
																													Tempo
																												</Label>
																												<p className="font-medium">
																													{track.tempo ||
																														"Not specified"}
																												</p>
																											</div>
																											<div>
																												<Label className="text-xs text-muted-foreground">
																													Duration
																												</Label>
																												<p className="font-medium">
																													{formatDuration(
																														track.duration,
																													)}
																												</p>
																											</div>
																										</div>

																										{track.notes && (
																											<div className="mt-3 p-3 bg-muted rounded-lg">
																												<Label className="text-xs text-muted-foreground">
																													Artist
																													Notes
																												</Label>
																												<p className="text-sm mt-1">
																													{
																														track.notes
																													}
																												</p>
																											</div>
																										)}
																									</Card>
																								),
																							)}
																						</div>
																					);
																				})()}
																			</div>

																			{/* DJ Notes Section */}
																			<div>
																				<h4 className="font-medium mb-4 flex items-center gap-2">
																					<Volume2 className="h-4 w-4" />
																					DJ
																					Notes
																				</h4>
																				<div className="space-y-3">
																					<Textarea
																						value={
																							djNotesState[
																								item
																									.artist!
																									.id
																							] ||
																							""
																						}
																						onChange={(
																							e,
																						) =>
																							setDjNotesState(
																								(
																									prev,
																								) => ({
																									...prev,
																									[item
																										.artist!
																										.id]:
																										e
																											.target
																											.value,
																								}),
																							)
																						}
																						placeholder="Add your DJ notes, cues, and timing information here..."
																						className="min-h-[100px]"
																					/>
																					<Button
																						onClick={() =>
																							saveDjNotes(
																								item
																									.artist!
																									.id,
																							)
																						}
																						size="sm"
																					>
																						<Save className="h-4 w-4 mr-2" />
																						Save
																						DJ
																						Notes
																					</Button>
																				</div>
																			</div>

																			{/* Upload New Track Section */}
																			<div>
																				<h4 className="font-medium mb-4 flex items-center gap-2">
																					<Upload className="h-4 w-4" />
																					Upload
																					New
																					Track
																				</h4>
																				<ArtistUploadSection
																					artist={
																						item.artist
																					}
																				/>
																			</div>
																		</div>
																	</AccordionContent>
																</AccordionItem>
															) : (
																// Cue items (non-expandable)
																<CardContent className="p-6">
																	<div className="flex items-center justify-between">
																		<div className="flex items-center space-x-4">
																			<div
																				className={`flex items-center justify-center w-8 h-8 rounded-full ${
																					cueColor
																						? isLightColor(
																								cueColor,
																							)
																							? "bg-gray-800 text-white"
																							: "bg-white/20 text-white"
																						: "bg-primary text-primary-foreground"
																				} text-sm font-bold`}
																			>
																				{index +
																					1}
																			</div>
																			{item.type ===
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
																							<h3
																								className={`text-lg font-semibold ${itemTextClass}`}
																							>
																								{
																									item
																										.cue
																										.title
																								}
																							</h3>
																							<div
																								className={`flex items-center gap-2 mt-1 ${
																									cueColor &&
																									!isLightColor(
																										cueColor,
																									)
																										? "text-white/80"
																										: ""
																								}`}
																							>
																								<span
																									className={`text-sm flex items-center gap-1 ${
																										cueColor &&
																										!isLightColor(
																											cueColor,
																										)
																											? "text-white/80"
																											: "text-muted-foreground"
																									}`}
																								>
																									<Clock className="h-3 w-3" />
																									{
																										item
																											.cue
																											.duration
																									}{" "}
																									min
																								</span>
																								{item
																									.cue
																									.notes && (
																									<span
																										className={`text-sm ${
																											cueColor &&
																											!isLightColor(
																												cueColor,
																											)
																												? "text-white/80"
																												: "text-muted-foreground"
																										}`}
																									>
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
																		<Badge
																			variant={
																				item.status ===
																				"completed"
																					? "destructive"
																					: item.status ===
																						  "currently_on_stage"
																						? "default"
																						: "outline"
																			}
																			className={
																				cueColor &&
																				!isLightColor(
																					cueColor,
																				)
																					? "bg-white/20 text-white border-white/30"
																					: ""
																			}
																		>
																			{item.status ===
																				"not_started" &&
																				"Backstage"}
																			{item.status ===
																				"next_on_deck" &&
																				"Next on Deck"}
																			{item.status ===
																				"next_on_stage" &&
																				"Next Up"}
																			{item.status ===
																				"currently_on_stage" &&
																				"Currently on Stage"}
																			{item.status ===
																				"completed" &&
																				"Completed"}
																		</Badge>
																	</div>
																</CardContent>
															)}
														</Card>
													);
												},
											)}
										</Accordion>
									);
								})()}
							</div>
						</div>
					</TabsContent>

					{/* See All Musics Tab */}
					<TabsContent value="all-musics" className="space-y-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">
								All Music Tracks
							</h2>
							<div className="flex items-center gap-4">
								{selectedMusicDay === "all" && (
									<Button
										onClick={downloadAllMusic}
										disabled={
											downloadingAll ||
											musicTracks.length === 0
										}
										variant="outline"
										className="flex items-center gap-2 min-w-[180px]"
									>
										{downloadingAll ? (
											<>
												<RefreshCw className="h-4 w-4 animate-spin" />
												Downloading {downloadProgress}%
											</>
										) : (
											<>
												<Download className="h-4 w-4" />
												Download All Music
											</>
										)}
									</Button>
								)}
								{selectedMusicDay &&
									selectedMusicDay !== "all" && (
										<Button
											onClick={() =>
												downloadDayMusic(
													selectedMusicDay,
												)
											}
											disabled={
												downloadingDay ||
												getMusicTracksByDay(
													selectedMusicDay,
												).length === 0
											}
											variant="outline"
											className="flex items-center gap-2 min-w-[180px]"
										>
											{downloadingDay ? (
												<>
													<RefreshCw className="h-4 w-4 animate-spin" />
													Downloading{" "}
													{Math.round(
														dayDownloadProgress,
													)}
													%
												</>
											) : (
												<>
													<Download className="h-4 w-4" />
													Download Day{" "}
													{eventDates.indexOf(
														selectedMusicDay,
													) + 1}
												</>
											)}
										</Button>
									)}
								{eventDates.length > 0 && (
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										<Select
											value={selectedMusicDay}
											onValueChange={setSelectedMusicDay}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue placeholder="All Days" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">
													All Days (All Artists)
												</SelectItem>
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
						</div>

						{/* Music Tracks - grouped by day when "All Days" selected, flat list for single day */}
						{(() => {
							// Single day selected — render one card with flat list
							if (
								selectedMusicDay &&
								selectedMusicDay !== "all"
							) {
								const tracksForDay =
									getMusicTracksByDay(selectedMusicDay);
								return (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Music className="h-5 w-5" />
												{`Music Tracks for Day ${eventDates.indexOf(selectedMusicDay) + 1} - ${formatDateSimple(selectedMusicDay)}`}
											</CardTitle>
											<CardDescription>
												{`${tracksForDay.length} music track${tracksForDay.length !== 1 ? "s" : ""} for artists assigned to this day`}
											</CardDescription>
										</CardHeader>
										<CardContent>
											{tracksForDay.length === 0 ? (
												<div className="text-center py-12">
													<Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
													<h3 className="text-lg font-medium mb-2">
														No music tracks
													</h3>
													<p className="text-muted-foreground">
														No music tracks found
														for this day
													</p>
												</div>
											) : (
												<div className="space-y-4">
													{tracksForDay.map(
														(track, index) => (
															<Card
																key={`${track.artist_id}-${index}`}
																className="border"
															>
																<CardContent className="pt-4">
																	<div className="flex items-start gap-4">
																		<div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold shrink-0">
																			{index +
																				1}
																		</div>
																		<div className="flex-1 space-y-3 min-w-0">
																			<div className="flex items-center justify-between flex-wrap gap-2">
																				<div>
																					<h3 className="text-lg font-semibold">
																						{track.artist_name ||
																							track.song_title}
																					</h3>
																					<div className="flex items-center gap-2 mt-1 flex-wrap">
																						{track.duration && (
																							<span className="text-sm text-muted-foreground flex items-center gap-1">
																								<Clock className="h-3 w-3" />
																								{formatDuration(
																									track.duration,
																								)}
																							</span>
																						)}
																						{track.tempo && (
																							<Badge
																								variant="secondary"
																								className="text-xs"
																							>
																								{
																									track.tempo
																								}
																							</Badge>
																						)}
																						{track.is_main_track && (
																							<Badge
																								variant="default"
																								className="text-xs"
																							>
																								Main
																								Track
																							</Badge>
																						)}
																					</div>
																				</div>
																				{track.file_url && (
																					<Button
																						variant="outline"
																						size="sm"
																						onClick={() => {
																							const artistName =
																								track.artist_name ||
																								"Unknown";
																							const urlParts =
																								track.file_url.split(
																									".",
																								);
																							const extension =
																								urlParts.length >
																								1
																									? urlParts[
																											urlParts.length -
																												1
																										].split(
																											"?",
																										)[0]
																									: "mp3";
																							downloadFile(
																								track.file_url,
																								`${artistName}.${extension}`,
																								artistName
																							);
																						}}
																					>
																						<Download className="h-4 w-4 mr-1" />
																						Download
																					</Button>
																				)}
																			</div>
																			{track.file_url ? (
																				<div className="bg-gray-50 rounded-lg p-3">
																					<AudioPlayer
																						track={
																							track
																						}
																					/>
																				</div>
																			) : (
																				<div className="bg-muted/50 rounded-lg p-3">
																					<div className="flex items-center gap-2 text-muted-foreground">
																						<AlertTriangle className="h-4 w-4" />
																						<span className="text-sm">
																							No
																							audio
																							file
																							uploaded
																						</span>
																					</div>
																				</div>
																			)}
																			{track.notes && (
																				<div className="p-3 bg-muted rounded-lg">
																					<Label className="text-xs text-muted-foreground">
																						Artist
																						Notes
																					</Label>
																					<p className="text-sm mt-1">
																						{
																							track.notes
																						}
																					</p>
																				</div>
																			)}
																			{track.dj_notes && (
																				<div className="p-3 bg-blue-50 rounded-lg">
																					<Label className="text-xs text-blue-600">
																						DJ
																						Notes
																					</Label>
																					<p className="text-sm mt-1">
																						{
																							track.dj_notes
																						}
																					</p>
																				</div>
																			)}
																		</div>
																	</div>
																</CardContent>
															</Card>
														),
													)}
												</div>
											)}
										</CardContent>
									</Card>
								);
							}

							// "All Days" selected — render separate card per day
							const allTracks = getAllMusicTracks();
							if (allTracks.length === 0) {
								return (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Music className="h-5 w-5" />
												All Music Tracks
											</CardTitle>
											<CardDescription>
												All music tracks from all
												registered artists
											</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="text-center py-12">
												<Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
												<h3 className="text-lg font-medium mb-2">
													No music tracks
												</h3>
												<p className="text-muted-foreground">
													No music tracks found
												</p>
											</div>
										</CardContent>
									</Card>
								);
							}

							return (
								<div className="space-y-8">
									{eventDates.map((date, dayIndex) => {
										const dayTracks =
											getMusicTracksByDay(date);
										if (dayTracks.length === 0) return null;
										return (
											<Card key={date}>
												<CardHeader>
													<div className="flex items-center justify-between">
														<div>
															<CardTitle className="flex items-center gap-2">
																<Calendar className="h-5 w-5 text-purple-600" />
																Day{" "}
																{dayIndex + 1} —{" "}
																{formatDateSimple(
																	date,
																)}
															</CardTitle>
															<CardDescription>
																{
																	dayTracks.length
																}{" "}
																track
																{dayTracks.length !==
																1
																	? "s"
																	: ""}
															</CardDescription>
														</div>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																downloadDayMusic(
																	date,
																)
															}
															disabled={
																downloadingDay
															}
															className="flex items-center gap-2"
														>
															<Download className="h-4 w-4" />
															Download Day{" "}
															{dayIndex + 1}
														</Button>
													</div>
												</CardHeader>
												<CardContent>
													<div className="space-y-4">
														{dayTracks.map(
															(track, index) => (
																<Card
																	key={`${track.artist_id}-${date}-${index}`}
																	className="border"
																>
																	<CardContent className="pt-4">
																		<div className="flex items-start gap-4">
																			<div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold shrink-0">
																				{index +
																					1}
																			</div>
																			<div className="flex-1 space-y-3 min-w-0">
																				<div className="flex items-center justify-between flex-wrap gap-2">
																					<div>
																						<h3 className="text-lg font-semibold">
																							{track.artist_name ||
																								track.song_title}
																						</h3>
																						<div className="flex items-center gap-2 mt-1 flex-wrap">
																							{track.duration && (
																								<span className="text-sm text-muted-foreground flex items-center gap-1">
																									<Clock className="h-3 w-3" />
																									{formatDuration(
																										track.duration,
																									)}
																								</span>
																							)}
																							{track.tempo && (
																								<Badge
																									variant="secondary"
																									className="text-xs"
																								>
																									{
																										track.tempo
																									}
																								</Badge>
																							)}
																							{track.is_main_track && (
																								<Badge
																									variant="default"
																									className="text-xs"
																								>
																									Main
																									Track
																								</Badge>
																							)}
																						</div>
																					</div>
																					{track.file_url && (
																						<Button
																							variant="outline"
																							size="sm"
																							onClick={() => {
																								const artistName =
																									track.artist_name ||
																									"Unknown";
																								const urlParts =
																									track.file_url.split(
																										".",
																									);
																								const extension =
																									urlParts.length >
																									1
																										? urlParts[
																												urlParts.length -
																													1
																											].split(
																												"?",
																											)[0]
																										: "mp3";
																								downloadFile(
																									track.file_url,
																									`${artistName}.${extension}`,
																									artistName
																								);
																							}}
																						>
																							<Download className="h-4 w-4 mr-1" />
																							Download
																						</Button>
																					)}
																				</div>
																				{track.file_url ? (
																					<div className="bg-gray-50 rounded-lg p-3">
																						<AudioPlayer
																							track={
																								track
																							}
																						/>
																					</div>
																				) : (
																					<div className="bg-muted/50 rounded-lg p-3">
																						<div className="flex items-center gap-2 text-muted-foreground">
																							<AlertTriangle className="h-4 w-4" />
																							<span className="text-sm">
																								No
																								audio
																								file
																								uploaded
																							</span>
																						</div>
																					</div>
																				)}
																				{track.notes && (
																					<div className="p-3 bg-muted rounded-lg">
																						<Label className="text-xs text-muted-foreground">
																							Artist
																							Notes
																						</Label>
																						<p className="text-sm mt-1">
																							{
																								track.notes
																							}
																						</p>
																					</div>
																				)}
																				{track.dj_notes && (
																					<div className="p-3 bg-blue-50 rounded-lg">
																						<Label className="text-xs text-blue-600">
																							DJ
																							Notes
																						</Label>
																						<p className="text-sm mt-1">
																							{
																								track.dj_notes
																							}
																						</p>
																					</div>
																				)}
																			</div>
																		</div>
																	</CardContent>
																</Card>
															),
														)}
													</div>
												</CardContent>
											</Card>
										);
									})}
									{/* Tracks without a performance date */}
									{(() => {
										const unassignedTracks =
											allTracks.filter((track) => {
												if (!track.performance_date)
													return true;
												const trackDate =
													track.performance_date.includes(
														"T",
													)
														? track.performance_date.split(
																"T",
															)[0]
														: track.performance_date;
												return !eventDates.some((d) => {
													const eventDate =
														d.includes("T")
															? d.split("T")[0]
															: d;
													return (
														eventDate === trackDate
													);
												});
											});
										if (unassignedTracks.length === 0)
											return null;
										return (
											<Card>
												<CardHeader>
													<CardTitle className="flex items-center gap-2">
														<Music className="h-5 w-5 text-gray-500" />
														Unassigned
													</CardTitle>
													<CardDescription>
														{
															unassignedTracks.length
														}{" "}
														track
														{unassignedTracks.length !==
														1
															? "s"
															: ""}{" "}
														not assigned to a show
														date
													</CardDescription>
												</CardHeader>
												<CardContent>
													<div className="space-y-4">
														{unassignedTracks.map(
															(track, index) => (
																<Card
																	key={`unassigned-${track.artist_id}-${index}`}
																	className="border"
																>
																	<CardContent className="pt-4">
																		<div className="flex items-start gap-4">
																			<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold shrink-0">
																				{index +
																					1}
																			</div>
																			<div className="flex-1 space-y-3 min-w-0">
																				<div className="flex items-center justify-between flex-wrap gap-2">
																					<div>
																						<h3 className="text-lg font-semibold">
																							{track.artist_name ||
																								track.song_title}
																						</h3>
																						<div className="flex items-center gap-2 mt-1 flex-wrap">
																							{track.duration && (
																								<span className="text-sm text-muted-foreground flex items-center gap-1">
																									<Clock className="h-3 w-3" />
																									{formatDuration(
																										track.duration,
																									)}
																								</span>
																							)}
																							{track.tempo && (
																								<Badge
																									variant="secondary"
																									className="text-xs"
																								>
																									{
																										track.tempo
																									}
																								</Badge>
																							)}
																						</div>
																					</div>
																					{track.file_url && (
																						<Button
																							variant="outline"
																							size="sm"
																							onClick={() => {
																								const artistName =
																									track.artist_name ||
																									"Unknown";
																								const urlParts =
																									track.file_url.split(
																										".",
																									);
																								const extension =
																									urlParts.length >
																									1
																										? urlParts[
																												urlParts.length -
																													1
																											].split(
																												"?",
																											)[0]
																										: "mp3";
																								downloadFile(
																									track.file_url,
																									`${artistName}.${extension}`,
																									artistName
																								);
																							}}
																						>
																							<Download className="h-4 w-4 mr-1" />
																							Download
																						</Button>
																					)}
																				</div>
																				{track.file_url ? (
																					<div className="bg-gray-50 rounded-lg p-3">
																						<AudioPlayer
																							track={
																								track
																							}
																						/>
																					</div>
																				) : (
																					<div className="bg-muted/50 rounded-lg p-3">
																						<div className="flex items-center gap-2 text-muted-foreground">
																							<AlertTriangle className="h-4 w-4" />
																							<span className="text-sm">
																								No
																								audio
																								file
																								uploaded
																							</span>
																						</div>
																					</div>
																				)}
																			</div>
																		</div>
																	</CardContent>
																</Card>
															),
														)}
													</div>
												</CardContent>
											</Card>
										);
									})()}
								</div>
							);
						})()}
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}
