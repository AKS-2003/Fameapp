"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { Button } from "@/components/ui/button";
import {
	useNotifications,
} from "@/components/NotificationProvider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	UserCheck,
	Calendar,
	CheckCircle,
	Eye,
	EyeOff,
	Trash2,
	Plus,
	Copy,
	X,
	User,
	Music,
	Image,
	Lightbulb,
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
	Edit,
	LayoutDashboard,
	Archive,
	Send,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	FileDown,
	Package,
	FileText,
	Users,
	Clock,
	Maximize2,
	Minimize2,
	Bell,
	Sparkles,
	UserPlus,
	ExternalLink,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { LazyMediaLoader } from "@/components/ui/lazy-media-loader";
import { ArtistStatusBadge } from "@/components/ui/artist-status-badge";
import { ArtistStatusDialog } from "@/components/ui/artist-status-dialog";
import { formatDateSimple } from "@/lib/date-utils";
import { generateArtistLoginInfo } from "@/lib/artist-login-utils";
import { QRCodeSVG } from "qrcode.react";
import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusBadgeVariant,
} from "@/lib/status-utils";
import { formatDuration } from "@/lib/timing-utils";
import { ChatButton } from "@/components/ChatButton";
import { PersonalMessageButton } from "@/components/PersonalMessageButton";
import { ArtistUpdateBadge } from "@/components/ArtistUpdateBadge";
import {
	WhatsAppIcon,
	WhatsAppInput,
	WhatsAppLink,
	EmailLink,
} from "@/components/ui/whatsapp-input";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { CueColorPicker, isLightColor } from "@/components/ui/cue-color-picker";
import { useAccessGuard } from "@/hooks/useAccessGuard";
import { EventChecklistButton } from "@/components/EventChecklistButton";
import { AccessDenied } from "@/components/ui/access-denied";
import { InviteArtistDialog } from "@/components/stage-manager/InviteArtistDialog";

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

// Helper function to get row background color based on performance status
const getRowBackgroundColor = (status?: string | null) => {
	// Removed automatic status colors - only use custom artists_page_color
	return ""; // No automatic background colors
};

interface Event {
	id: string;
	name: string;
	venue: string;
	showDates: string[]; // Use camelCase to match API response
}

interface Artist {
	id: string;
	artist_name: string;
	real_name: string;
	email: string;
	style: string;
	performance_duration: number;
	performance_date: string | null;
	created_at: string;
	actual_duration: number | null; // Duration from uploaded music in seconds
	status: string | null; // Artist status
	image_url?: string; // Profile image URL
	performance_order?: number | null; // Order in the show
	performance_status?: string | null; // Status in the show (not_started, next_on_deck, currently_on_stage, completed)
	backstage_color?: string; // Custom backstage background color (used by performance order page)
	artists_page_color?: string; // Custom background color for artists management page only
	performanceType?: string; // Solo, Duo, Trio, Group, Band, Other
	isFameLinkSubmission?: boolean; // True if artist joined via FameLink invite link
	eventShowId?: string; // EventShow ID for FameLink submissions
	baseShowId?: string; // BaseShow ID for FameLink edit navigation
	showIndex?: number; // Which show number this is (1-based) for multi-show artists
	totalShowsByArtist?: number; // Total shows this artist submitted to this event
	agreement?: any; // Agreement data (schedule, performances, etc.) merged in from /api/contracts/{eventId}
}

/** Normalize a date-ish string to YYYY-MM-DD for matching, or "" if unparseable. */
function toYMD(raw?: string): string {
	if (!raw) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
	const iso = raw.substring(0, 10);
	if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
	const p = new Date(raw);
	if (isNaN(p.getTime())) return "";
	const y = p.getFullYear();
	const mo = String(p.getMonth() + 1).padStart(2, "0");
	const dy = String(p.getDate()).padStart(2, "0");
	return `${y}-${mo}-${dy}`;
}

/** Find the agreement's performance entry (show name/time/location/notes) matching a given date. */
function findAgreementPerformance(agreement: any, date?: string | null): any | null {
	const performances = agreement?.schedule?.performances;
	if (!Array.isArray(performances) || !date) return null;
	const target = toYMD(date);
	if (!target) return null;
	return performances.find((p: any) => toYMD(p.date) === target) || null;
}

export default function ArtistManagement({
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
	const {
		hasAccess,
		isLoading: accessLoading,
		isGrantUser,
	} = useAccessGuard(["artist_management", "full_access"]);

	const [event, setEvent] = useState<Event | null>(null);
	const [artists, setArtists] = useState<Artist[]>([]);
	// Agreement data (schedule/performances) keyed by artist id/email, used to show
	// each artist's assigned show name/duration in the "Assigned Artists" table.
	const [agreementByArtistKey, setAgreementByArtistKey] = useState<Map<string, any>>(new Map());
	const [loading, setLoading] = useState(true);
	const [wsConnected, setWsConnected] = useState(false);
	const [wsInitialized, setWsInitialized] = useState(false);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [statusArtist, setStatusArtist] = useState<Artist | null>(null);
	const [newArtist, setNewArtist] = useState({
		artist_name: "",
		real_name: "",
		email: "",
	});
	const [createdArtistLink, setCreatedArtistLink] = useState<{
		artistId: string;
		artistName: string;
		email: string;
		registrationUrl: string;
	} | null>(null);
	const [creatingArtist, setCreatingArtist] = useState(false);
	const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
	const [stageManagerId, setStageManagerId] = useState<string>("");
	const [stageManagerName, setStageManagerName] = useState<string>("");
	const [artistUpdateUnreadCounts, setArtistUpdateUnreadCounts] = useState<
		Record<string, number>
	>({});
	const [personalMessageUnreadCounts, setPersonalMessageUnreadCounts] =
		useState<Record<string, number>>({});
	const [editFormData, setEditFormData] = useState({
		artist_name: "",
		real_name: "",
		email: "",
		phone: "",
	});

	// Notifications from global context
	const { addNotification } = useNotifications();

	// Hidden artists state - stored locally per event
	const [hiddenArtistIds, setHiddenArtistIds] = useState<Set<string>>(
		new Set(),
	);
	const [isHiddenItemsDialogOpen, setIsHiddenItemsDialogOpen] =
		useState(false);

	// Search and sort state for assigned artists per day
	const [searchTermsByDay, setSearchTermsByDay] = useState<
		Record<string, string>
	>({});
	const [sortConfigsByDay, setSortConfigsByDay] = useState<
		Record<string, { key: string; direction: "asc" | "desc" }>
	>({});

	// Initialize default alphabetical sorting for each day when artists change
	useEffect(() => {
		if (artists.length > 0) {
			const assignedArtistsWithDates = artists.filter(
				(a) =>
					a.performance_date &&
					!hiddenArtistIds.has(a.eventShowId || a.id),
			);

			// Get unique dates
			const uniqueDates = Array.from(
				new Set(
					assignedArtistsWithDates.map((a) => {
						let date = a.performance_date || "unassigned";
						if (date !== "unassigned") {
							try {
								date = new Date(date)
									.toISOString()
									.split("T")[0];
							} catch (error) {
								date = "unassigned";
							}
						}
						return date;
					}),
				),
			).filter((date) => date !== "unassigned");

			// Set default sort config for dates that don't have one yet
			setSortConfigsByDay((prev) => {
				const newConfig = { ...prev };
				uniqueDates.forEach((date) => {
					if (!newConfig[date]) {
						newConfig[date] = {
							key: "artist_name",
							direction: "asc",
						};
					}
				});
				return newConfig;
			});
		}
	}, [artists, hiddenArtistIds]);

	// Download loading states
	const [downloadingArtistId, setDownloadingArtistId] = useState<
		string | null
	>(null);
	const [downloadingDay, setDownloadingDay] = useState<string | null>(null);
	const [downloadingAllDays, setDownloadingAllDays] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState<number>(0);

	// Multi-select state for downloading selected artists
	const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(
		new Set(),
	);
	const [downloadingSelected, setDownloadingSelected] = useState(false);

	// Color picker state
	const [editingArtistColor, setEditingArtistColor] = useState<string | null>(
		null,
	);
	const [tempArtistColor, setTempArtistColor] = useState<string>("");
	const [tempArtistTag, setTempArtistTag] = useState<string>("");

	// Fullscreen state for day artist lists
	const [fullscreenDay, setFullscreenDay] = useState<string | null>(null);

	// Close fullscreen on Escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && fullscreenDay) {
				setFullscreenDay(null);
			}
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [fullscreenDay]);

	// Toggle selection for a single artist
	const toggleArtistSelection = (uniqueId: string) => {
		setSelectedArtistIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(uniqueId)) {
				newSet.delete(uniqueId);
			} else {
				newSet.add(uniqueId);
			}
			return newSet;
		});
	};

	// Select all artists for a specific day
	const selectAllForDay = (artists: Artist[]) => {
		setSelectedArtistIds((prev) => {
			const newSet = new Set(prev);
			artists.forEach((artist) => newSet.add(artist.eventShowId || artist.id));
			return newSet;
		});
	};

	// Deselect all artists for a specific day
	const deselectAllForDay = (artists: Artist[]) => {
		setSelectedArtistIds((prev) => {
			const newSet = new Set(prev);
			artists.forEach((artist) => newSet.delete(artist.eventShowId || artist.id));
			return newSet;
		});
	};

	// Download selected artists
	const downloadSelectedArtists = async (date: string, dayNumber: number) => {
		try {
			setDownloadingSelected(true);
			setDownloadProgress(0);

			const selectedIds = Array.from(selectedArtistIds);
			if (selectedIds.length === 0) {
				toast({
					title: "No Artists Selected",
					description:
						"Please select at least one artist to download.",
					variant: "destructive",
				});
				return;
			}

			// Map selectedIds back to targets with eventShowId
			const targets = artists
				.filter(artist => selectedArtistIds.has(artist.eventShowId || artist.id))
				.map(artist => ({
					artistId: artist.id,
					eventShowId: (artist as any).eventShowId
				}));

			toast({
				title: "Downloading",
				description: `Preparing ${selectedIds.length} selected artist(s) data. This may take a moment...`,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/download-day`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistIds: selectedIds, // Now contains unique IDs (eventShowId || id)
						targets,
						date,
						dayNumber,
						eventName: event?.name || "Event",
					}),
				},
			);

			if (response.ok) {
				const sizeHeader = response.headers.get("x-file-size") || response.headers.get("content-length");
				const total = sizeHeader ? parseInt(sizeHeader, 10) : 0;
				let received = 0;
				const chunks: any[] = [];

				const { showDownloadProgressPopup, updateDownloadProgressPopup, hideDownloadProgressPopup } = await import("@/lib/media-utils");
				const finalFilename = `Day_${dayNumber}_Selected_${selectedIds.length}_Artists_${event?.name || "Event"}.zip`;

				const reader = response.body?.getReader();
				if (reader) {
					showDownloadProgressPopup(finalFilename, 0, total);
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							chunks.push(value);
							received += value.length;
							const progress = total > 0 ? Math.round((received / total) * 100) : 0;
							setDownloadProgress(progress);
							updateDownloadProgressPopup(finalFilename, progress, received, total);
						}
						hideDownloadProgressPopup(finalFilename, true);
					} catch (streamErr: any) {
						hideDownloadProgressPopup(finalFilename, false, streamErr.message || "Failed to read stream");
						throw streamErr;
					}
				} else {
					const buffer = await response.arrayBuffer();
					chunks.push(new Uint8Array(buffer));
				}

				setDownloadProgress(100);
				const blob = new Blob(chunks, { type: "application/zip" });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = url;
				a.download = `Day_${dayNumber}_Selected_${selectedIds.length}_Artists_${event?.name || "Event"}.zip`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				toast({
					title: "Download Complete",
					description: `${selectedIds.length} selected artist(s) data has been downloaded.`,
				});

				// Clear selection after successful download
				setSelectedArtistIds(new Set());
			} else {
				throw new Error("Failed to generate download");
			}
		} catch (error: any) {
			console.error("Error downloading selected artists:", error);
			toast({
				title: "Download Failed",
				description:
					error.message ||
					"Failed to download selected artists data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDownloadingSelected(false);
			setDownloadProgress(0);
		}
	};

	// Load hidden artists from GCS on mount
	useEffect(() => {
		const loadHiddenArtists = async () => {
			try {
				const response = await fetch(
					`/api/events/${eventId}/hidden-artists`,
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						setHiddenArtistIds(new Set(data.data || []));
					}
				}
			} catch (error) {
				console.error("Failed to load hidden artists:", error);
			}
		};

		loadHiddenArtists();
	}, [eventId]);

	// Hide an artist
	const hideArtist = async (artistId: string, artistName: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/hidden-artists`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistId,
						artistName,
						action: "hide",
					}),
				},
			);

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setHiddenArtistIds(new Set(data.data.hiddenArtists));
					toast({
						title: "👁️‍🗨️ Artist Hidden",
						description: `${artistName} has been hidden from the list.`,
					});
				}
			} else {
				throw new Error("Failed to hide artist");
			}
		} catch (error) {
			console.error("Error hiding artist:", error);
			toast({
				title: "❌ Error",
				description: "Failed to hide artist. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Unhide an artist
	const unhideArtist = async (artistId: string, artistName: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/hidden-artists`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistId,
						artistName,
						action: "unhide",
					}),
				},
			);

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setHiddenArtistIds(new Set(data.data.hiddenArtists));
					toast({
						title: "👁️ Artist Restored",
						description: `${artistName} is now visible in the list.`,
					});
				}
			} else {
				throw new Error("Failed to unhide artist");
			}
		} catch (error) {
			console.error("Error unhiding artist:", error);
			toast({
				title: "❌ Error",
				description: "Failed to restore artist. Please try again.",
				variant: "destructive",
			});
		}
	};

	// Get hidden artists data
	const getHiddenArtists = () => {
		return artists.filter((artist) => hiddenArtistIds.has(artist.eventShowId || artist.id));
	};

	// Load stage manager info for chat on mount
	useEffect(() => {
		const loadStageManagerInfo = async () => {
			try {
				console.log("Loading stage manager info...");
				const response = await fetch("/api/auth/me");
				const data = await response.json();
				console.log("Stage manager auth response:", data);
				if (data.success && data.data) {
					const id = data.data.userId;
					const name =
						data.data.profile?.name ||
						data.data.email ||
						"Stage Manager";
					console.log("Setting stage manager:", { id, name });
					setStageManagerId(id);
					setStageManagerName(name);
				}
			} catch (error) {
				console.error("Failed to load stage manager info:", error);
			}
		};
		loadStageManagerInfo();
	}, []);

	const loadArtistRowCounts = useCallback(async () => {
		if (!eventId || !stageManagerId) return;

		try {
			const [updatesResponse, messagesResponse] = await Promise.all([
				fetch(
					`/api/events/${eventId}/artist-updates?stageManagerId=${stageManagerId}`,
				),
				fetch(`/api/events/${eventId}/personal-messages?countOnly=true`),
			]);

			if (updatesResponse.ok) {
				const updatesData = await updatesResponse.json();
				if (updatesData.success) {
					setArtistUpdateUnreadCounts(
						updatesData.data.unreadCounts || {},
					);
				}
			}

			if (messagesResponse.ok) {
				const messagesData = await messagesResponse.json();
				if (messagesData.success) {
					setPersonalMessageUnreadCounts(
						messagesData.data.unreadCounts || {},
					);
				}
			}
		} catch (error) {
			console.error("Failed to load artist row counts:", error);
		}
	}, [eventId, stageManagerId]);

	useEffect(() => {
		loadArtistRowCounts();
	}, [loadArtistRowCounts]);

	useEffect(() => {
		if (eventId && hasAccess && !accessLoading) {
			fetchEvent();
			fetchArtists();
			fetchAgreementsForArtists();
			// Initialize WebSocket connection for real-time updates
			initializeWebSocket();

			// Polling fallback: refresh artists list every 30s in case WebSocket events are missed
			const pollingInterval = setInterval(() => {
				fetchArtists();
			}, 30000);

			return () => clearInterval(pollingInterval);
		}
	}, [eventId, hasAccess, accessLoading]);

	// Fetch agreement data (schedule/performances) for all artists in this event,
	// so the Assigned Artists table can show each show's name/duration when set.
	const fetchAgreementsForArtists = async () => {
		try {
			const response = await fetch(`/api/contracts/${eventId}`);
			if (!response.ok) return;
			const data = await response.json();
			const contractArtists: any[] = data?.artists || [];
			const map = new Map<string, any>();
			contractArtists.forEach((a: any) => {
				if (a.agreement) {
					if (a.id) map.set(a.id, a.agreement);
					if (a.email) map.set(a.email.toLowerCase().trim(), a.agreement);
				}
			});
			setAgreementByArtistKey(map);
		} catch (error) {
			console.error("Error fetching agreements for artists:", error);
		}
	};

	useEffect(() => {
		// Listen for WebSocket toast events
		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toast({ title, description, variant });
		};

		window.addEventListener(
			"websocket-toast",
			handleWebSocketToast as EventListener,
		);

		return () => {
			window.removeEventListener(
				"websocket-toast",
				handleWebSocketToast as EventListener,
			);
		};
	}, [toast]);

	const fetchEvent = async () => {
		try {
			const res = await fetch(`/api/events/${eventId}`);
			if (!res.ok) throw new Error("Failed to fetch event");
			const json = await res.json();
			const evt = json.data || json.event || json; // tolerate shapes
			const showDates = evt.show_dates || evt.showDates || [];
			setEvent({
				id: String(evt.id),
				name: evt.name,
				venue: evt.venue,
				showDates: showDates, // Use camelCase consistently
			});
		} catch (error) {
			console.error("Error fetching event:", error);
			toast({
				title: "❌ Loading Error",
				description:
					"Failed to load event details. Please refresh the page.",
				variant: "destructive",
			});
		}
	};

	const fetchArtists = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/artists`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					// Process artists to match sample UI format and normalize dates
					const processedArtists = (data.data || []).map(
						(artist: any) => {
							// Normalize performance_date to YYYY-MM-DD format
							let normalizedPerformanceDate =
								artist.performanceDate ||
								artist.performance_date;
							if (
								normalizedPerformanceDate &&
								normalizedPerformanceDate !== "unassigned"
							) {
								try {
									normalizedPerformanceDate = new Date(
										normalizedPerformanceDate,
									)
										.toISOString()
										.split("T")[0];
								} catch (error) {
									console.error(
										"Invalid date format for artist",
										artist.id,
										":",
										normalizedPerformanceDate,
										error,
									);
									normalizedPerformanceDate = null;
								}
							}

							return {
								id: artist.id,
								artist_name:
									artist.artistName || artist.artist_name,
								real_name: artist.realName || artist.real_name,
								email: artist.email,
								style: artist.style,
								performance_duration:
									artist.performanceDuration ||
									artist.performance_duration,
								performance_date: normalizedPerformanceDate,
								created_at:
									artist.createdAt || artist.created_at,
								status: artist.status || "pending",
								actual_duration:
									artist.musicTrack?.duration ||
									artist.musicTracks?.find(
										(track: any) => track.is_main_track,
									)?.duration ||
									null,
								image_url: artist.image_url || "",
								performance_order:
									artist.performance_order ?? null,
								performance_status:
									artist.performance_status ?? null,
								backstage_color:
									artist.backstage_color || undefined,
								artists_page_color:
									artist.artists_page_color || undefined,
								artists_page_tag:
									artist.artists_page_tag || undefined,
								performanceType:
									artist.performanceType ||
									artist.performance_type ||
									undefined,
								isFameLinkSubmission:
									artist.isFameLinkSubmission || false,
								eventShowId: artist.eventShowId || undefined,
								baseShowId: artist.baseShowId || undefined,
								showIndex: artist.showIndex || undefined,
								totalShowsByArtist:
									artist.totalShowsByArtist || undefined,
							};
						},
					);

					setArtists(processedArtists);
					console.log(
						`Loaded ${processedArtists.length} artists from GCS for event ${eventId}`,
					);
				} else {
					console.error("Failed to fetch artists:", data.error);
					setArtists([]);
				}
			} else {
				throw new Error("Failed to fetch artists");
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
			toast({
				title: "❌ Loading Error",
				description:
					"Failed to load artist submissions. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const initializeWebSocket = async () => {
		// Prevent multiple initializations
		if (wsInitialized) {
			console.log("WebSocket already initialized, skipping...");
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
				userId: `stage_manager_artists_${eventId}`,
				showToasts: true,
				onConnect: () => {
					console.log("Artists WebSocket connected");
					setWsConnected(true);
				},
				onDisconnect: () => {
					console.log("Artists WebSocket disconnected");
					setWsConnected(false);
				},
				// Removed onDataUpdate to prevent automatic data refresh that overwrites local colors
				// onDataUpdate: () => {
				//     console.log("Artists data update triggered");
				//     fetchArtists();
				// },
			});

			await wsManager.initialize();

			// Listen for new chat messages to update badge
			wsManager.on("new_chat_message", (data: any) => {
				console.log(
					"Stage Manager Artists: Received new_chat_message:",
					data,
				);
				// Dispatch window event for ChatButton to pick up
				window.dispatchEvent(
					new CustomEvent("new_chat_message", {
						detail: data,
					}),
				);
			});

			// Listen for new personal messages from artists
			wsManager.on("new_personal_message", (data: any) => {
				console.log(
					"Stage Manager Artists: Received new_personal_message:",
					data,
				);
				// Dispatch window event for PersonalMessageButton to pick up
				window.dispatchEvent(
					new CustomEvent("new_personal_message", {
						detail: data,
					}),
				);
			});

			// Listen for hidden artists updates
			wsManager.on("hidden_artists_updated", (data: any) => {
				console.log(
					"Stage Manager Artists: Received hidden_artists_updated:",
					data,
				);
				if (data.eventId === eventId) {
					setHiddenArtistIds(new Set(data.hiddenArtists || []));

					// Show toast notification for other users
					const action =
						data.action === "hide" ? "hidden" : "restored";
					toast({
						title: `👁️ Artist ${action === "hidden" ? "Hidden" : "Restored"
							}`,
						description: `${data.artistName} has been ${action} by another stage manager.`,
					});
				}
			});

			// Listen for FameLink show submissions (real-time)
			wsManager.on("famelink_show_submitted", (data: any) => {
				console.log(
					"Stage Manager Artists: FameLink show submitted:",
					data,
				);
				if (data.eventId === eventId) {
					toast({
						title: "🎤 New FameLink Submission!",
						description: `${data.artistName} submitted "${data.showName}" via FameLink.`,
					});
					// Refresh artists list to show the new submission
					fetchArtists();
				}
			});

			// Listen for FameLink artist account deletion (real-time removal)
			wsManager.on("famelink_artist_deleted", (data: any) => {
				console.log(
					"Stage Manager Artists: FameLink artist deleted:",
					data,
				);
				if (data.eventId === eventId) {
					toast({
						title: "🗑️ Artist Account Deleted",
						description: `${data.artistName || "An artist"} deleted their FameLink account. Their submissions have been removed.`,
					});
					// Refresh artists list to remove deleted artist's shows
					fetchArtists();
				}
			});

			// Listen for individual artist show deletion from event
			wsManager.on("artist_deleted", (data: any) => {
				console.log(
					"Stage Manager Artists: Artist show deleted:",
					data,
				);
				if (data.eventId === eventId) {
					// We only refresh the list rather than locally updating here 
					// because we might have multiple shows and it's safer to resync
					fetchArtists();
				}
			});

			// Listen for artist profile update notifications (real-time blue badge)
			wsManager.on("artist_profile_updated", (data: any) => {
				console.log(
					"Stage Manager Artists: Artist profile updated:",
					data,
				);
				if (data.eventId === eventId) {
					// Dispatch window event for ArtistUpdateBadge components to pick up
					window.dispatchEvent(
						new CustomEvent("artist_profile_updated", {
							detail: data,
						}),
					);
				}
			});

			// Listen for FameLink artist account deletion (real-time removal)
			wsManager.on("famelink_artist_deleted", (data: any) => {
				console.log(
					"Stage Manager Artists: FameLink artist deleted:",
					data,
				);
				if (data.eventId === eventId) {
					toast({
						title: "🗑️ Artist Account Deleted",
						description: `${data.artistName} deleted their FameLink account. Their submissions have been removed.`,
					});
					// Refresh artists list to remove the deleted artist's entries
					fetchArtists();
				}
			});

			// Listen for artist event deletion (real-time notification)
			wsManager.on("artist_deleted_event", (data: any) => {
				console.log(
					"Stage Manager Artists: Artist deleted event:",
					data,
				);
				if (data.eventId === eventId) {
					toast({
						title: "🚨 Event Deleted by Artist",
						description: `${data.artistName} has just deleted the event ${data.eventName}.`,
					});
					addNotification({
						title: "🚨 Event Deleted by Artist",
						message: `${data.artistName} has deleted the event ${data.eventName}.`,
						type: "error",
					});
					// Refresh artists list to remove the deleted artist's entries
					fetchArtists();
				}
			});

			// Listen for show order batch updates (reordering)
			wsManager.on("show-order-updated", (data: any) => {
				console.log("Artists: Received show-order-updated:", data);
				if (data.eventId === eventId) {
					fetchArtists();
				}
			});

			// Listen for performance order updates
			wsManager.on("performance-order-update", (data: any) => {
				console.log("Artists: Received performance-order-update:", data);
				if (data.eventId === eventId) {
					fetchArtists();
				}
			});

			// Store reference for cleanup and emitting events
			(window as any).artistsWsManager = wsManager;

			// Return cleanup function
			return () => {
				if ((window as any).artistsWsManager) {
					(window as any).artistsWsManager.off("new_chat_message");
					(window as any).artistsWsManager.off(
						"new_personal_message",
					);
					(window as any).artistsWsManager.off(
						"hidden_artists_updated",
					);
					(window as any).artistsWsManager.off(
						"famelink_show_submitted",
					);
					(window as any).artistsWsManager.off(
						"artist_profile_updated",
					);
					(window as any).artistsWsManager.off(
						"famelink_artist_deleted",
					);
					(window as any).artistsWsManager.off(
						"artist_deleted_event",
					);
					(window as any).artistsWsManager.off("show-order-updated");
					(window as any).artistsWsManager.off("performance-order-update");
					(window as any).artistsWsManager.destroy();
					delete (window as any).artistsWsManager;
				}
				setWsInitialized(false);
			};
		} catch (error) {
			console.error("Failed to initialize WebSocket:", error);
			setWsInitialized(false);
			throw error;
		}
	};

	const assignPerformanceDate = async (
		artistId: string,
		performanceDate: string | null,
		eventShowId?: string,
	) => {
		try {
			// Normalize the date to YYYY-MM-DD format if it's not null
			let normalizedDate = performanceDate;
			if (performanceDate) {
				try {
					normalizedDate = new Date(performanceDate)
						.toISOString()
						.split("T")[0];
				} catch (error) {
					console.error(
						"Invalid date format:",
						performanceDate,
						error,
					);
					toast({
						title: "❌ Invalid Date",
						description: "The selected date format is invalid.",
						variant: "destructive",
					});
					return;
				}
			}

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}${eventShowId ? `?eventShowId=${eventShowId}` : ""}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						performance_date: normalizedDate,
						performanceDate: normalizedDate, // Also send both field names for compatibility
						eventShowId, // Include in body as well
					}),
				},
			);

			if (response.ok) {
				const result = await response.json();

				// Update local state immediately for better UX (use normalized date)
				setArtists(
					artists.map((artist) =>
						(eventShowId ? artist.eventShowId === eventShowId : artist.id === artistId)
							? { ...artist, performance_date: normalizedDate }
							: artist,
					),
				);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).artistsWsManager;
				if (wsManager) {
					wsManager.emit(
						normalizedDate
							? "artist_assigned"
							: "artist_unassigned",
						{
							eventId,
							artistId,
							performance_date: normalizedDate,
							action: normalizedDate ? "assigned" : "unassigned",
						},
					);
				}

				toast({
					title: normalizedDate
						? "📅 Performance Date Assigned"
						: "📅 Artist Unassigned",
					description: normalizedDate
						? "Artist has been assigned and will appear in rehearsal calendar."
						: "Artist has been moved back to submitted applications.",
				});

				console.log(
					`Artist ${artistId} assignment updated: ${normalizedDate
						? "assigned to " + normalizedDate
						: "unassigned"
					}`,
				);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message ||
					"Failed to update performance date",
				);
			}
		} catch (error: any) {
			console.error("Error updating performance date:", error);
			toast({
				title: "❌ Update Failed",
				description:
					error.message ||
					"Failed to update performance date. Please try again.",
				variant: "destructive",
			});
		}
	};

	const deleteArtist = async (artistId: string, eventShowId?: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}${eventShowId ? `?eventShowId=${eventShowId}` : ""}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				// Update local state immediately for better UX
				setArtists(
					artists.filter((artist) =>
						eventShowId
							? artist.eventShowId !== eventShowId
							: artist.id !== artistId,
					),
				);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).artistsWsManager;
				if (wsManager) {
					wsManager.emit("artist_deleted", {
						eventId,
						artistId,
						action: "deleted",
					});
				}

				toast({
					title: "🗑️ Artist Removed",
					description:
						"Artist profile has been deleted. They will need to register again.",
					variant: "destructive",
				});

				console.log(`Artist ${artistId} deleted successfully`);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to delete artist",
				);
			}
		} catch (error: any) {
			console.error("Error deleting artist:", error);
			toast({
				title: "❌ Delete Failed",
				description:
					error.message ||
					"Failed to delete artist profile. Please try again.",
				variant: "destructive",
			});
		}
	};

	const updateArtistBackstageColor = async (
		artistId: string,
		color: string,
		eventShowId?: string,
		tag?: string,
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}${eventShowId ? `?eventShowId=${eventShowId}` : ""}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artists_page_color: color,
						artists_page_tag: tag !== undefined ? tag : undefined,
						eventShowId,
					}),
				},
			);

			if (response.ok) {
				setArtists((prevArtists) =>
					prevArtists.map((artist) => {
						const isTarget = artist.id === artistId &&
							(!eventShowId || artist.eventShowId === eventShowId);
						return isTarget
							? {
								...artist,
								artists_page_color: color,
								artists_page_tag: tag !== undefined ? tag : (artist as any).artists_page_tag,
							}
							: artist;
					}),
				);

				// No WebSocket event emission - keep this isolated to artists page

				toast({
					title: color ? "🎨 Color Set" : "🎨 Color Cleared",
					description: color
						? "Background color has been updated."
						: "Background color has been cleared.",
				});

				console.log(
					`Artist ${artistId} artists page color updated: ${color || "cleared"}`,
				);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message ||
					"Failed to update background color",
				);
			}
		} catch (error: any) {
			console.error("Error updating background color:", error);
			toast({
				title: "❌ Update Failed",
				description:
					error.message ||
					"Failed to update background color. Please try again.",
				variant: "destructive",
			});
		}
	};

	const generatePassword = () => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	};

	const createArtistManually = async () => {
		// Validate inputs
		if (!newArtist.artist_name.trim()) {
			toast({
				title: "❌ Name Required",
				description: "Please enter the artist name",
				variant: "destructive",
			});
			return;
		}

		if (!newArtist.email.trim()) {
			toast({
				title: "❌ Email Required",
				description: "Please enter the artist email",
				variant: "destructive",
			});
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newArtist.email)) {
			toast({
				title: "❌ Invalid Email",
				description: "Please enter a valid email address",
				variant: "destructive",
			});
			return;
		}

		setCreatingArtist(true);
		try {
			const response = await fetch(`/api/events/${eventId}/artists`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					artistName: newArtist.artist_name,
					realName: newArtist.real_name || newArtist.artist_name,
					email: newArtist.email,
					eventName: event?.name || "Event",
					status: "draft", // Mark as draft initially
				}),
			});

			if (response.ok) {
				const result = await response.json();
				const artistId = result.data.id;

				// Generate registration URL with pre-filled data
				const registrationUrl = `${getBaseUrl()}/artist-register/${eventId}?artistId=${artistId}&name=${encodeURIComponent(newArtist.artist_name)}&email=${encodeURIComponent(newArtist.email)}&from=stage-manager`;

				setCreatedArtistLink({
					artistId,
					artistName: newArtist.artist_name,
					email: newArtist.email,
					registrationUrl,
				});

				// Reset form
				setNewArtist({
					artist_name: "",
					real_name: "",
					email: "",
				});

				toast({
					title: "✅ Artist Draft Created",
					description:
						"Share the registration link with the artist to complete their profile.",
				});
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to create artist",
				);
			}
		} catch (error: any) {
			console.error("Error creating artist:", error);
			toast({
				title: "❌ Creation Failed",
				description:
					error.message ||
					"Failed to create artist draft. Please try again.",
				variant: "destructive",
			});
		} finally {
			setCreatingArtist(false);
		}
	};

	// Helper function to format duration
	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Search and sort functions for assigned artists
	const handleSearchChange = (date: string, searchTerm: string) => {
		setSearchTermsByDay((prev) => ({
			...prev,
			[date]: searchTerm,
		}));
	};

	const handleSort = (date: string, key: string) => {
		setSortConfigsByDay((prev) => {
			const currentConfig = prev[date];
			const direction =
				currentConfig?.key === key && currentConfig.direction === "asc"
					? "desc"
					: "asc";
			return {
				...prev,
				[date]: { key, direction },
			};
		});
	};

	const getSortIcon = (date: string, key: string) => {
		const config = sortConfigsByDay[date];
		if (config?.key !== key) return <ArrowUpDown className="h-4 w-4" />;
		return config.direction === "asc" ? (
			<ArrowUp className="h-4 w-4" />
		) : (
			<ArrowDown className="h-4 w-4" />
		);
	};

	const filterAndSortArtists = (artists: Artist[], date: string) => {
		const searchTerm = searchTermsByDay[date]?.toLowerCase().trim() || "";
		const sortConfig = sortConfigsByDay[date];

		// Filter artists based on search term - case insensitive, shows results immediately (2-4+ letters)
		let filteredArtists = artists;
		if (searchTerm.length >= 2) {
			filteredArtists = artists.filter(
				(artist) =>
					artist.artist_name.toLowerCase().includes(searchTerm) ||
					artist.real_name.toLowerCase().includes(searchTerm) ||
					artist.style.toLowerCase().includes(searchTerm) ||
					(artist.actual_duration &&
						formatDuration(artist.actual_duration)
							.toLowerCase()
							.includes(searchTerm)),
			);
		} else if (searchTerm.length === 1) {
			// For single character, still show results but maybe less aggressive matching
			filteredArtists = artists.filter(
				(artist) =>
					artist.artist_name.toLowerCase().startsWith(searchTerm) ||
					artist.real_name.toLowerCase().startsWith(searchTerm) ||
					artist.style.toLowerCase().startsWith(searchTerm),
			);
		}
		// If searchTerm is empty (length 0), show all artists

		// Sort artists
		if (sortConfig) {
			filteredArtists.sort((a, b) => {
				let aValue: any = "";
				let bValue: any = "";

				switch (sortConfig.key) {
					case "artist_name":
						aValue = a.artist_name.toLowerCase();
						bValue = b.artist_name.toLowerCase();
						break;
					case "real_name":
						aValue = a.real_name.toLowerCase();
						bValue = b.real_name.toLowerCase();
						break;
					case "style":
						aValue = a.style.toLowerCase();
						bValue = b.style.toLowerCase();
						break;
					case "duration":
						aValue = a.actual_duration || 0;
						bValue = b.actual_duration || 0;
						break;
					default:
						return 0;
				}

				if (aValue < bValue)
					return sortConfig.direction === "asc" ? -1 : 1;
				if (aValue > bValue)
					return sortConfig.direction === "asc" ? 1 : -1;
				return 0;
			});
		}

		return filteredArtists;
	};

	// Download functions
	const downloadArtistData = async (artist: any) => {
		setDownloadingArtistId(artist.id);
		setDownloadProgress(0);
		try {
			toast({
				title: "Downloading",
				description: `Preparing ${artist.artist_name}'s data...`,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/${artist.id}/download`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						includeOverview: true,
						includeMusic: true,
						includeGallery: true,
						eventName: event?.name || "Event",
						eventShowId: artist.eventShowId,
					}),
				},
			);

			if (response.ok) {
				// Stream the response to show download progress
				const sizeHeader = response.headers.get("x-file-size") || response.headers.get("content-length");
				const total = sizeHeader ? parseInt(sizeHeader, 10) : 0;
				let received = 0;
				const chunks: any[] = [];

				const { showDownloadProgressPopup, updateDownloadProgressPopup, hideDownloadProgressPopup } = await import("@/lib/media-utils");
				const finalFilename = `${artist.artist_name}_${event?.name || "Event"}_Complete.zip`;

				const reader = response.body?.getReader();
				if (reader) {
					showDownloadProgressPopup(finalFilename, 0, total);
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							chunks.push(value);
							received += value.length;
							const progress = total > 0 ? Math.round((received / total) * 100) : 0;
							setDownloadProgress(progress);
							updateDownloadProgressPopup(finalFilename, progress, received, total);
						}
						hideDownloadProgressPopup(finalFilename, true);
					} catch (streamErr: any) {
						hideDownloadProgressPopup(finalFilename, false, streamErr.message || "Failed to read stream");
						throw streamErr;
					}
				} else {
					// Fallback: no streaming support
					const buffer = await response.arrayBuffer();
					chunks.push(new Uint8Array(buffer));
				}

				setDownloadProgress(100);
				const blob = new Blob(chunks, { type: "application/zip" });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = url;
				a.download = `${artist.artist_name}_${event?.name || "Event"}_Complete.zip`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				toast({
					title: "✅ Download Complete",
					description: `${artist.artist_name}'s complete data has been downloaded.`,
				});
			} else {
				throw new Error("Failed to generate download");
			}
		} catch (error: any) {
			console.error("Error downloading artist data:", error);
			toast({
				title: "Download Failed",
				description:
					error.message ||
					"Failed to download artist data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDownloadingArtistId(null);
			setDownloadProgress(0);
		}
	};

	const downloadDayArtists = async (
		date: string,
		artists: Artist[],
		dayNum: number,
	) => {
		setDownloadingDay(date);
		setDownloadProgress(0);
		try {
			const artistIds = artists.map((artist) => artist.id);
			const targets = artists.map((artist) => ({
				artistId: artist.id,
				eventShowId: (artist as any).eventShowId,
			}));
			const dayNumber = dayNum;

			toast({
				title: "Downloading",
				description: `Preparing Day ${dayNumber} data with ${artists.length} artists. This may take a moment...`,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/download-day`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistIds,
						targets,
						date,
						dayNumber,
						eventName: event?.name || "Event",
					}),
				},
			);

			if (response.ok) {
				const sizeHeader = response.headers.get("x-file-size") || response.headers.get("content-length");
				const total = sizeHeader ? parseInt(sizeHeader, 10) : 0;
				let received = 0;
				const chunks: any[] = [];

				const { showDownloadProgressPopup, updateDownloadProgressPopup, hideDownloadProgressPopup } = await import("@/lib/media-utils");
				const finalFilename = `Day_${dayNumber}_${formatDateSimple(date)}_Artists_${event?.name || "Event"}.zip`;

				const reader = response.body?.getReader();
				if (reader) {
					showDownloadProgressPopup(finalFilename, 0, total);
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							chunks.push(value);
							received += value.length;
							const progress = total > 0 ? Math.round((received / total) * 100) : 0;
							setDownloadProgress(progress);
							updateDownloadProgressPopup(finalFilename, progress, received, total);
						}
						hideDownloadProgressPopup(finalFilename, true);
					} catch (streamErr: any) {
						hideDownloadProgressPopup(finalFilename, false, streamErr.message || "Failed to read stream");
						throw streamErr;
					}
				} else {
					const buffer = await response.arrayBuffer();
					chunks.push(new Uint8Array(buffer));
				}

				setDownloadProgress(100);
				const blob = new Blob(chunks, { type: "application/zip" });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = url;
				a.download = `Day_${dayNumber}_${formatDateSimple(
					date,
				)}_Artists_${event?.name || "Event"}.zip`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				toast({
					title: "Day Download Complete",
					description: `Day ${dayNumber} artists data (${artists.length} artists) has been downloaded.`,
				});
			} else {
				throw new Error("Failed to generate day download");
			}
		} catch (error: any) {
			console.error("Error downloading day artists:", error);
			toast({
				title: "Download Failed",
				description:
					error.message ||
					"Failed to download day artists data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDownloadingDay(null);
			setDownloadProgress(0);
		}
	};

	const downloadAllDaysArtists = async () => {
		setDownloadingAllDays(true);
		setDownloadProgress(0);
		try {
			// Get all assigned artists
			const assignedArtistsList = artists.filter(
				(a) => a.performance_date && !hiddenArtistIds.has(a.eventShowId || a.id),
			);

			if (assignedArtistsList.length === 0) {
				toast({
					title: "No Assigned Artists",
					description: "There are no assigned artists to download.",
					variant: "destructive",
				});
				return;
			}

			const targets = assignedArtistsList.map((artist) => ({
				artistId: artist.id,
				eventShowId: (artist as any).eventShowId,
				performance_date: artist.performance_date,
			}));

			toast({
				title: "Downloading All Days Data",
				description: `Preparing all days data with ${assignedArtistsList.length} artists. This may take a moment...`,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/download-all-days`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artists: targets,
						eventName: event?.name || "Event",
					}),
				},
			);

			if (response.ok) {
				const sizeHeader = response.headers.get("x-file-size") || response.headers.get("content-length");
				const total = sizeHeader ? parseInt(sizeHeader, 10) : 0;
				let received = 0;
				const chunks: any[] = [];

				const { showDownloadProgressPopup, updateDownloadProgressPopup, hideDownloadProgressPopup } = await import("@/lib/media-utils");
				const finalFilename = `All_Days_Artists_${event?.name || "Event"}.zip`;

				const reader = response.body?.getReader();
				if (reader) {
					showDownloadProgressPopup(finalFilename, 0, total);
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							chunks.push(value);
							received += value.length;
							const progress = total > 0 ? Math.round((received / total) * 100) : 0;
							setDownloadProgress(progress);
							updateDownloadProgressPopup(finalFilename, progress, received, total);
						}
						hideDownloadProgressPopup(finalFilename, true);
					} catch (streamErr: any) {
						hideDownloadProgressPopup(finalFilename, false, streamErr.message || "Failed to read stream");
						throw streamErr;
					}
				} else {
					const buffer = await response.arrayBuffer();
					chunks.push(new Uint8Array(buffer));
				}

				setDownloadProgress(100);
				const blob = new Blob(chunks, { type: "application/zip" });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = url;
				a.download = `All_Days_Artists_${event?.name || "Event"}.zip`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				toast({
					title: "All Days Download Complete",
					description: `All days artists data (${assignedArtistsList.length} artists) has been downloaded.`,
				});
			} else {
				throw new Error("Failed to generate all days download");
			}
		} catch (error: any) {
			console.error("Error downloading all days artists:", error);
			toast({
				title: "Download Failed",
				description:
					error.message ||
					"Failed to download all days artists data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setDownloadingAllDays(false);
			setDownloadProgress(0);
		}
	};

	// State for resending email
	const [resendingEmail, setResendingEmail] = useState(false);

	// Copy artist login info to clipboard for WhatsApp
	const copyArtistLoginInfo = (artist: Artist) => {
		const loginInfoText = generateArtistLoginInfo(
			{
				artistId: artist.id,
				artistName: artist.artist_name,
				email: artist.email,
			},
			event?.name || "Event",
		);

		navigator.clipboard.writeText(loginInfoText);
		toast({
			title: "📋 Login Info Copied",
			description: `Login info for ${artist.artist_name} copied to clipboard. Ready to paste in WhatsApp!`,
		});
	};

	// Resend login email to artist
	const resendLoginEmail = async (artist: Artist) => {
		if (!artist.email) {
			toast({
				title: "❌ No Email",
				description: "This artist doesn't have an email address.",
				variant: "destructive",
			});
			return;
		}

		setResendingEmail(true);
		try {
			const response = await fetch("/api/artists/resend-login-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					artistName: artist.artist_name,
					artistId: artist.id,
					email: artist.email,
					eventName: event?.name || "Event",
					eventId: eventId,
				}),
			});

			const data = await response.json();

			if (data.success) {
				toast({
					title: "✅ Email Sent",
					description: `Login credentials sent to ${artist.email}`,
				});
			} else {
				throw new Error(data.error || "Failed to send email");
			}
		} catch (error: any) {
			console.error("Error resending login email:", error);
			toast({
				title: "❌ Failed to Send",
				description:
					error.message ||
					"Failed to send login email. Please try again.",
				variant: "destructive",
			});
		} finally {
			setResendingEmail(false);
		}
	};

	const viewArtistDetails = async (
		artistId: string,
		eventShowId?: string,
	) => {
		try {
			const url = eventShowId
				? `/api/events/${eventId}/artists/${artistId}?eventShowId=${eventShowId}`
				: `/api/events/${eventId}/artists/${artistId}`;
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					// Convert the detailed artist data to match our Artist interface
					const artistData = data.data.artist;
					// Preserve showIndex/totalShowsByArtist from list data
					// For multi-show artists, match by eventShowId to get the correct show's index
					const existingArtist = eventShowId
						? artists.find(
							(a) =>
								a.id === artistId &&
								a.eventShowId === eventShowId,
						)
						: artists.find((a) => a.id === artistId);
					const detailedArtist: Artist = {
						id: artistData.id,
						artist_name:
							artistData.artistName || artistData.artist_name,
						real_name: artistData.realName || artistData.real_name,
						email: artistData.email,
						style: artistData.style,
						performance_duration:
							artistData.performanceDuration ||
							artistData.performance_duration,
						performance_date:
							artistData.performanceDate ||
							artistData.performance_date,
						created_at:
							artistData.createdAt || artistData.created_at,
						status: artistData.status,
						actual_duration:
							artistData.musicTrack?.duration ||
							artistData.musicTracks?.find(
								(track: any) => track.is_main_track,
							)?.duration ||
							null,
						// Add additional detailed data
						...artistData,
						// Restore multi-show fields from list state (not in individual endpoint)
						showIndex: existingArtist?.showIndex,
						totalShowsByArtist: existingArtist?.totalShowsByArtist,
					};

					// Merge in agreement data (schedule/performances) from the contracts store,
					// matched by artist id or email, so we can show show name/time/location/notes
					// alongside the assigned performance date.
					try {
						const contractRes = await fetch(`/api/contracts/${eventId}`);
						if (contractRes.ok) {
							const contractJson = await contractRes.json();
							const contractArtists: any[] = contractJson?.artists || [];
							const matchedContract =
								contractArtists.find((c) => c.id === detailedArtist.id) ||
								(detailedArtist.email
									? contractArtists.find(
											(c) =>
												c.email &&
												c.email.toLowerCase().trim() ===
													detailedArtist.email.toLowerCase().trim(),
										)
									: undefined);
							if (matchedContract?.agreement) {
								detailedArtist.agreement = matchedContract.agreement;
							}
						}
					} catch (agreementError) {
						console.error("Error fetching agreement data:", agreementError);
					}

					setSelectedArtist(detailedArtist);
					setEditFormData({
						artist_name: detailedArtist.artist_name,
						real_name: detailedArtist.real_name,
						email: detailedArtist.email,
						phone: (detailedArtist as any).phone || "",
					});
					setIsEditingBasicInfo(false);
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

	const handleSaveBasicInfo = async () => {
		if (!selectedArtist) return;

		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${selectedArtist.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						...(selectedArtist as any),
						artistName: editFormData.artist_name,
						realName: editFormData.real_name,
						email: editFormData.email,
						phone: editFormData.phone,
					}),
				},
			);

			if (response.ok) {
				const result = await response.json();

				// Update local state
				setSelectedArtist({
					...selectedArtist,
					artist_name: editFormData.artist_name,
					real_name: editFormData.real_name,
					email: editFormData.email,
					...(selectedArtist as any),
					phone: editFormData.phone,
				});

				// Update artists list
				setArtists((prev) =>
					prev.map((artist) =>
						artist.id === selectedArtist.id
							? {
								...artist,
								artist_name: editFormData.artist_name,
								real_name: editFormData.real_name,
								email: editFormData.email,
							}
							: artist,
					),
				);

				// Emit WebSocket event to force artist logout
				const wsManager = (window as any).artistsWsManager;
				if (wsManager) {
					console.log("Emitting artist_info_updated event:", {
						eventId,
						artistId: selectedArtist.id,
						artist_name: editFormData.artist_name,
						action: "force_logout",
					});
					wsManager.emit("artist_info_updated", {
						eventId,
						artistId: selectedArtist.id,
						artist_name: editFormData.artist_name,
						action: "force_logout",
					});
				} else {
					console.warn("WebSocket manager not available");
				}

				setIsEditingBasicInfo(false);

				toast({
					title: "✅ Artist Info Updated",
					description:
						"The artist has been logged out and will need to log in again with their updated credentials.",
				});

				// Refresh artists list
				fetchArtists();
			} else {
				throw new Error("Failed to update artist information");
			}
		} catch (error: any) {
			console.error("Error updating artist:", error);
			toast({
				title: "❌ Update Failed",
				description:
					error.message ||
					"Failed to update artist information. Please try again.",
				variant: "destructive",
			});
		}
	};

	const openStatusDialog = (artist: Artist) => {
		setStatusArtist(artist);
		setIsStatusDialogOpen(true);
	};

	const handleStatusUpdated = (newStatus: string) => {
		if (statusArtist) {
			// Update the artist in the local state
			setArtists((prev) =>
				prev.map((artist) =>
					artist.id === statusArtist.id
						? { ...artist, status: newStatus }
						: artist,
				),
			);
		}
	};

	// Access control guard - must be after all hooks
	if (accessLoading || !hasAccess) {
		return (
			<AccessDenied
				isLoading={accessLoading}
				pageName="Artist Management"
			/>
		);
	}

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading artist submissions...
					</p>
				</div>
			</div>
		);
	}

	const submittedArtists = artists.filter(
		(a) =>
			!a.performance_date &&
			!hiddenArtistIds.has(a.eventShowId || a.id) &&
			a.status !== "draft",
	);
	const draftArtists = artists.filter(
		(a) =>
			!a.performance_date &&
			!hiddenArtistIds.has(a.eventShowId || a.id) &&
			a.status === "draft",
	);
	const assignedArtists = artists.filter(
		(a) => a.performance_date && !hiddenArtistIds.has(a.eventShowId || a.id),
	);
	const hiddenArtists = getHiddenArtists();

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
				<div className="container mx-auto px-2 sm:px-4">
					{/* Row 1: Back + Title + Live + Bell + Checklist */}
					<div className="flex items-center gap-2 py-2">

						<div className="min-w-0 flex-1">
							<h1 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
								Show Management
							</h1>
							<p className="text-[10px] text-muted-foreground truncate">
								{event?.name}
							</p>
						</div>

						{/* Step Nav Buttons - inline on md+ */}
						<div className="hidden md:flex items-center gap-1 shrink-0">
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() => onTabChange && onTabChange("Artist Files")}
							>
								1. Artists
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-purple-900 to-slate-900 hover:from-slate-800 hover:to-slate-700 text-white border-0 shadow-sm rounded-full ring-2 ring-purple-300 ring-offset-1 pointer-events-none"
								disabled
							>
								2. Shows
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Rehearsals")
										: router.push(
											`/stage-manager/events/${eventId}/rehearsal`,
										)
								}
							>
								3. Rehearsals
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Stage")
										: router.push(
											`/stage-manager/events/${eventId}/performance-order`,
										)
								}
							>
								4. Stage
							</Button>
						</div>

						<div className="flex items-center gap-1 shrink-0">
							<EventChecklistButton eventId={eventId} />
						</div>
					</div>

					{/* Row 2: Step nav (mobile) + Action buttons (always right) */}
					<div className="flex flex-wrap items-center gap-1.5 pb-2">
						{/* Step Nav - mobile only */}
						<div className="flex md:hidden items-center gap-1 shrink-0">
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() => onTabChange && onTabChange("Artist Files")}
							>
								1. Artists
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-purple-900 to-slate-900 hover:from-slate-800 hover:to-slate-700 text-white border-0 shadow-sm rounded-full ring-2 ring-purple-300 ring-offset-1 pointer-events-none"
								disabled
							>
								2. Shows
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Rehearsals")
										: router.push(
											`/stage-manager/events/${eventId}/rehearsal`,
										)
								}
							>
								3. Rehearsals
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Stage")
										: router.push(
											`/stage-manager/events/${eventId}/performance-order`,
										)
								}
							>
								4. Stage
							</Button>
						</div>

						{/* Spacer pushes action buttons right */}
						<div className="flex-1" />

						{/* Action Buttons - always visible, always right */}
						<Button
							variant="outline"
							size="sm"
							onClick={async () => {
								try {
									const response = await fetch(
										`/api/events/${eventId}/cleanup-dates`,
										{ method: "POST" },
									);
									const data = await response.json();
									if (data.success) {
										toast({
											title: "🔧 Data Cleanup Complete",
											description: `Cleaned up ${data.data.updatedCount} artists with inconsistent date formats.`,
										});
										fetchArtists();
									} else {
										throw new Error(
											data.error?.message ||
											"Cleanup failed",
										);
									}
								} catch (error: any) {
									console.error("Cleanup error:", error);
									toast({
										title: "❌ Cleanup Failed",
										description:
											error.message ||
											"Failed to clean up data. Please try again.",
										variant: "destructive",
									});
								}
							}}
							className="flex items-center gap-1 text-[10px] sm:text-[11px] h-6 sm:h-7 px-2 sm:px-2.5 whitespace-nowrap"
						>
							<Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
							Fix Duplicate Days
						</Button>

						{hiddenArtists.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="flex items-center gap-1 text-[10px] sm:text-[11px] h-6 sm:h-7 px-2 sm:px-2.5 whitespace-nowrap"
								onClick={() =>
									setIsHiddenItemsDialogOpen(true)
								}
							>
								<Archive className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
								Hidden Items
								<Badge
									variant="secondary"
									className="ml-0.5 text-[9px] sm:text-[10px] h-4 px-1"
								>
									{hiddenArtists.length}
								</Badge>
							</Button>
						)}

						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-1.5 text-[10px] sm:text-[11px] h-6 sm:h-7 px-2 sm:px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-sm whitespace-nowrap transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
							onClick={() => {
								const url = `${window.location.origin}/join-event/${eventId}`;
								navigator.clipboard.writeText(url);
								toast({
									title: "✨ Magic Link Copied!",
									description: "Share this link with artists to let them register and join instantly.",
								});
							}}
						>
							<Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 animate-pulse" />
							Copy Invite Link
						</Button>

						<Button
							size="sm"
							className="flex items-center gap-1 text-[10px] sm:text-[11px] h-6 sm:h-7 px-2 sm:px-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-sm whitespace-nowrap"
							onClick={() => setIsAddDialogOpen(true)}
						>
							<Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
							Add Artist Manually
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="space-y-8">
					{/* Draft Applications */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Draft Applications ({draftArtists.length})
							</CardTitle>
							<CardDescription>
								Artists who have been added manually but
								haven't completed their registration yet
							</CardDescription>
						</CardHeader>
						<CardContent>
							{draftArtists.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									No draft applications
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												Artist Name
											</TableHead>
											<TableHead>Real Name</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{draftArtists.map((artist) => (
											<TableRow
												key={
													artist.eventShowId ||
													artist.id
												}
											>
												<TableCell className="font-medium">
													{artist.artist_name}
												</TableCell>
												<TableCell>
													{artist.real_name ||
														"-"}
												</TableCell>
												<TableCell>
													<EmailLink
														email={artist.email}
														className="text-sm"
													/>
												</TableCell>
												<TableCell>
													{new Date(
														artist.created_at,
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																const registrationUrl = `${window.location.origin}/artist-register/${eventId}?artistId=${artist.id}&name=${encodeURIComponent(artist.artist_name)}&email=${encodeURIComponent(artist.email)}&from=stage-manager`;
																navigator.clipboard.writeText(
																	registrationUrl,
																);
																toast({
																	title: "📋 Link Copied",
																	description:
																		"Registration link copied to clipboard",
																});
															}}
															title="Copy Registration Link"
														>
															<Copy className="h-4 w-4" />
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																const registrationUrl = `${window.location.origin}/artist-register/${eventId}?artistId=${artist.id}&name=${encodeURIComponent(artist.artist_name)}&email=${encodeURIComponent(artist.email)}&from=stage-manager`;
																const message = `Hi ${artist.artist_name}! 🎭\n\nPlease complete your artist registration for ${event?.name || "our event"}:\n\n${registrationUrl}\n\nLooking forward to your performance! ✨`;
																const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
																window.open(
																	whatsappUrl,
																	"_blank",
																);
															}}
															title="Share via WhatsApp"
															className="text-green-600 hover:text-green-700 hover:bg-green-50"
														>
															<WhatsAppIcon className="h-4 w-4" />
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																hideArtist(
																	artist.eventShowId || artist.id,
																	artist.artist_name,
																)
															}
															title="Hide Artist"
															className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
														>
															<EyeOff className="h-4 w-4" />
														</Button>
														<AlertDialog>
															<AlertDialogTrigger
																asChild
															>
																<Button
																	variant="outline"
																	size="sm"
																	className="text-destructive hover:text-destructive"
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Delete
																		Draft
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		Are
																		you
																		sure
																		you
																		want
																		to
																		delete{" "}
																		{
																			artist.artist_name
																		}
																		's
																		draft
																		application?
																		This
																		action
																		cannot
																		be
																		undone.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>
																		Cancel
																	</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() =>
																			deleteArtist(
																				artist.id,
																			)
																		}
																		className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																	>
																		Delete
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Submitted Applications */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserCheck className="h-5 w-5" />
								Submitted Applications (
								{submittedArtists.length})
							</CardTitle>
							<CardDescription>
								Artists who have submitted their
								applications but haven't been assigned to a
								performance date yet
							</CardDescription>
						</CardHeader>
						<CardContent>
							{submittedArtists.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									No submitted applications yet
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												Artist Name
											</TableHead>
											<TableHead>Real Name</TableHead>
											<TableHead>Style</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Duration</TableHead>
											{/* <TableHead>Status</TableHead> */}
											<TableHead>Submitted</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{submittedArtists.map((artist) => (
											<TableRow
												key={
													artist.eventShowId ||
													artist.id
												}
											>
												<TableCell className="font-medium">
													<div className="flex items-center gap-3">
														{/* Profile Picture */}
														{artist.image_url ? (
															<FullScreenImageViewer
																src={`/api/media/${artist.image_url}`}
																alt={
																	artist.artist_name
																}
															>
																<div className="relative cursor-pointer w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 border-2 border-purple-200 hover:border-purple-400 transition-all">
																	<img
																		src={`/api/media/${artist.image_url}`}
																		alt={
																			artist.artist_name
																		}
																		className="w-full h-full object-cover"
																	/>
																	<div
																		className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center"
																		title="Click to enlarge"
																	>
																		<Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
																	</div>
																</div>
															</FullScreenImageViewer>
														) : (
															<div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 border-2 border-purple-200">
																<User className="h-5 w-5 text-purple-400" />
															</div>
														)}
														<span>
															{
																artist.artist_name
															}
															{artist.isFameLinkSubmission && (
																<Badge
																	variant="outline"
																	className="ml-2 text-[10px] px-1.5 py-0 border-purple-400 text-purple-600"
																>
																	FameLink
																</Badge>
															)}
															{artist.isFameLinkSubmission &&
																artist.totalShowsByArtist &&
																artist.totalShowsByArtist >
																1 && (
																	<Badge
																		variant="secondary"
																		className="ml-1 text-[10px] px-1.5 py-0"
																	>
																		Show{" "}
																		{
																			artist.showIndex
																		}{" "}
																		of{" "}
																		{
																			artist.totalShowsByArtist
																		}
																	</Badge>
																)}
														</span>
													</div>
												</TableCell>
												<TableCell>
													{artist.real_name}
												</TableCell>
												<TableCell>
													{artist.style}
												</TableCell>
												<TableCell>
													{artist.performanceType ? (
														<Badge
															variant="outline"
															className="text-xs"
														>
															{
																artist.performanceType
															}
														</Badge>
													) : (
														<span className="text-muted-foreground text-xs">
															—
														</span>
													)}
												</TableCell>
												<TableCell>
													{/* {
															artist.performance_duration
														}
														min */}
													{artist.actual_duration && (
														<span className="text-muted-foreground ml-1">
															{formatDuration(
																artist.actual_duration,
															)}
														</span>
													)}
												</TableCell>
												{/* <TableCell>
														<ArtistStatusBadge
															status={
																artist.status
															}
														/>
													</TableCell> */}
												<TableCell>
													{new Date(
														artist.created_at,
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Button
															variant="outline"
															size="sm"
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
														{/* FameLink Edit button commented out — re-enable when ready */}
														{/* {artist.isFameLinkSubmission && artist.baseShowId && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		window.open(
																			`/famelink/${artist.id}/shows/${artist.baseShowId}/edit`,
																			"_blank",
																			"noopener,noreferrer",
																		)
																	}
																	title="Edit FameLink Show"
																	className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
																>
																	<Edit className="h-4 w-4" />
																</Button>
															)} */}
														{!artist.isFameLinkSubmission && (
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	window.open(
																		`/artist-edit/${artist.id}?from=stage-manager&eventId=${eventId}`,
																		"_blank",
																		"noopener,noreferrer",
																	)
																}
																title="Edit Artist"
																className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
															>
																<Edit className="h-4 w-4" />
															</Button>
														)}
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																window.open(
																	artist.isFameLinkSubmission
																		? `/famelink/${artist.id}/event/${eventId}?viewer=stage_manager${artist.eventShowId ? `&eventShowId=${artist.eventShowId}` : ""}`
																		: `/artist-dashboard/${artist.id}`,
																	"_blank",
																	"noopener,noreferrer",
																)
															}
															title={
																artist.isFameLinkSubmission
																	? "View FameLink Dashboard"
																	: "View Artist Dashboard"
															}
															className="text-green-600 hover:text-green-700 hover:bg-green-50"
														>
															<LayoutDashboard className="h-4 w-4" />
														</Button>
														<PersonalMessageButton
															eventId={
																eventId
															}
															eventName={
																event?.name ||
																""
															}
															artistId={
																artist.id
															}
															artistName={
																artist.artist_name
															}
															senderId={
																stageManagerId
															}
															senderName={
																stageManagerName
															}
															initialUnreadCount={
																personalMessageUnreadCounts[
																artist.id
																] || 0
															}
															variant="outline"
															size="sm"
															className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
														/>
														<ArtistUpdateBadge
															eventId={
																eventId
															}
															artistId={
																artist.id
															}
															artistName={
																artist.artist_name
															}
															stageManagerId={
																stageManagerId
															}
															initialUnreadCount={
																artistUpdateUnreadCounts[
																artist.id
																] || 0
															}
															variant="outline"
															size="sm"
															className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
														/>
														{/* <Button
																variant="outline"
																size="sm"
																onClick={() =>
																	openStatusDialog(
																		artist
																	)
																}
															>
																<CheckCircle className="h-4 w-4" />
															</Button> */}
														{event?.showDates &&
															event.showDates
																.length >
															0 && (
																<Select
																	onValueChange={(
																		value,
																	) =>
																		assignPerformanceDate(
																			artist.id,
																			value,
																			artist.eventShowId,
																		)
																	}
																>
																	<SelectTrigger className="w-32">
																		<SelectValue placeholder="Assign" />
																	</SelectTrigger>
																	<SelectContent>
																		{event.showDates.map(
																			(
																				date,
																			) => (
																				<SelectItem
																					key={
																						date
																					}
																					value={
																						date
																					}
																				>
																					{formatDateSimple(
																						date,
																					)}
																				</SelectItem>
																			),
																		)}
																	</SelectContent>
																</Select>
															)}
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																hideArtist(
																	artist.eventShowId || artist.id,
																	artist.artist_name,
																)
															}
															title="Hide Artist"
															className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
														>
															<EyeOff className="h-4 w-4" />
														</Button>
														<AlertDialog>
															<AlertDialogTrigger
																asChild
															>
																<Button
																	variant="outline"
																	size="sm"
																	className="text-destructive hover:text-destructive"
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Delete
																		Artist
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		Are
																		you
																		sure
																		you
																		want
																		to
																		delete{" "}
																		{
																			artist.artist_name
																		}
																		?
																		This
																		action
																		cannot
																		be
																		undone.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>
																		Cancel
																	</AlertDialogCancel>
																	<AlertDialogAction
																		onClick={() =>
																			deleteArtist(
																				artist.id,
																				artist.eventShowId,
																			)
																		}
																		className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																	>
																		Delete
																	</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Assigned Artists - Grouped by Performance Date */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Assigned Artists ({assignedArtists.length})
								</CardTitle>
								<CardDescription>
									Artists who have been assigned to specific
									performance dates
								</CardDescription>
							</div>
							{assignedArtists.length > 0 && (
								<Button
									variant="outline"
									size="sm"
									onClick={downloadAllDaysArtists}
									disabled={downloadingAllDays}
									className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
									title="Download a ZIP archive containing all days data structured day-wise"
								>
									{downloadingAllDays ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
											<span>Downloading...</span>
										</>
									) : (
										<>
											<FileDown className="h-4 w-4" />
											<span>Download All Days</span>
										</>
									)}
								</Button>
							)}
						</CardHeader>
						<CardContent>
							{assignedArtists.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									No artists assigned yet
								</div>
							) : (
								<div className="space-y-8">
									{(() => {
										// Group artists by performance date (normalize dates to avoid duplicates)
										const groupedArtists =
											assignedArtists.reduce(
												(groups, artist) => {
													let date =
														artist.performance_date ||
														"unassigned";

													// Normalize date to YYYY-MM-DD format to prevent duplicates
													if (
														date !==
														"unassigned"
													) {
														try {
															date = new Date(
																date,
															)
																.toISOString()
																.split(
																	"T",
																)[0];
														} catch (error) {
															console.error(
																"Invalid date format:",
																date,
																error,
															);
															date =
																"unassigned";
														}
													}

													if (!groups[date]) {
														groups[date] = [];
													}
													groups[date].push(
														artist,
													);
													return groups;
												},
												{} as Record<
													string,
													Artist[]
												>,
											);

										// Build the master list of ALL event days (from showDates), sorted
										const eventShowDates: string[] = (event?.showDates || [])
											.map((d: string) => {
												try { return new Date(d).toISOString().split("T")[0]; } catch { return d; }
											})
											.filter(Boolean);
										const sortedEventDates = [...eventShowDates].sort(
											(a, b) => new Date(a).getTime() - new Date(b).getTime()
										);
										const eventDayMap = new Map<string, number>();
										sortedEventDates.forEach((d, i) => eventDayMap.set(d, i + 1));

										// Also include any assigned dates not in showDates (edge case)
										const assignedOnlyDates = Object.keys(groupedArtists)
											.filter(d => d !== "unassigned" && !eventDayMap.has(d))
											.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

										const allDatesToShow = [...sortedEventDates, ...assignedOnlyDates];

										return allDatesToShow.map(
											(date, index) => {
												const dayNumber = eventDayMap.get(date) ?? (sortedEventDates.length + assignedOnlyDates.indexOf(date) + 1);
												const artistsForDate =
													groupedArtists[date] || [];

												// Apply search and sort to artists for this date
												const filteredAndSortedArtists =
													filterAndSortArtists(
														artistsForDate,
														date,
													);

												// Calculate total music duration for this day
												const totalDurationSeconds =
													filteredAndSortedArtists.reduce(
														(total, artist) =>
															total +
															(artist.actual_duration ||
																0),
														0,
													);

												return (
													<div
														key={date}
														className={`${fullscreenDay ===
															date
															? "fixed inset-0 z-[9999] bg-white p-4 sm:p-6 flex flex-col gap-4 overflow-hidden"
															: "space-y-4"
															}`}
														style={
															fullscreenDay ===
																date
																? {
																	backgroundColor:
																		"#ffffff",
																}
																: undefined
														}
													>
														{/* Day Header */}
														<div className="flex items-center justify-between gap-4">
															<div className="flex items-center gap-4">
																<div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold">
																	Day{" "}
																	{
																		dayNumber
																	}
																</div>
																<div className="text-lg font-medium text-foreground">
																	{formatDateSimple(
																		date,
																	)}
																</div>
																<div className="text-sm text-muted-foreground">
																	(
																	{
																		filteredAndSortedArtists.length
																	}{" "}
																	artist
																	{filteredAndSortedArtists.length !==
																		1
																		? "s"
																		: ""}
																	{searchTermsByDay[
																		date
																	] &&
																		` of ${artistsForDate.length} total`}
																	)
																</div>
																{totalDurationSeconds >
																	0 && (
																		<div className="flex items-center gap-1 text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
																			<Music className="h-3 w-3" />
																			<span className="font-medium">
																				Total:{" "}
																				{formatDuration(
																					totalDurationSeconds,
																				)}
																			</span>
																		</div>
																	)}
															</div>
															{/* Empty day placeholder */}
															{artistsForDate.length === 0 && (
																<div className="text-sm text-muted-foreground italic py-1">No artists assigned yet</div>
															)}
															{artistsForDate.length > 0 && <div className="flex items-center gap-2 flex-wrap">
																{/* Select/Deselect All Button */}
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		const dayArtistIds =
																			artistsForDate.map(
																				(
																					a,
																				) =>
																					a.id,
																			);
																		const allSelected =
																			dayArtistIds.every(
																				(
																					id,
																				) =>
																					selectedArtistIds.has(
																						id,
																					),
																			);
																		if (
																			allSelected
																		) {
																			deselectAllForDay(
																				artistsForDate,
																			);
																		} else {
																			selectAllForDay(
																				artistsForDate,
																			);
																		}
																	}}
																	className="flex items-center gap-2"
																	title={(() => {
																		const dayArtistIds =
																			artistsForDate.map(
																				(
																					a,
																				) =>
																					a.id,
																			);
																		const allSelected =
																			dayArtistIds.every(
																				(
																					id,
																				) =>
																					selectedArtistIds.has(
																						id,
																					),
																			);
																		return allSelected
																			? "Deselect All"
																			: "Select All";
																	})()}
																>
																	{(() => {
																		const dayArtistIds =
																			artistsForDate.map(
																				(
																					a,
																				) =>
																					a.id,
																			);
																		const allSelected =
																			dayArtistIds.every(
																				(
																					id,
																				) =>
																					selectedArtistIds.has(
																						id,
																					),
																			);
																		return allSelected ? (
																			<>
																				<X className="h-4 w-4" />
																				<span className="hidden sm:inline">
																					Deselect
																					All
																				</span>
																			</>
																		) : (
																			<>
																				<CheckCircle className="h-4 w-4" />
																				<span className="hidden sm:inline">
																					Select
																					All
																				</span>
																			</>
																		);
																	})()}
																</Button>

																{/* Download Selected Button */}
																{selectedArtistIds.size >
																	0 && (
																		<Button
																			variant="default"
																			size="sm"
																			onClick={() =>
																				downloadSelectedArtists(
																					date,
																					dayNumber,
																				)
																			}
																			disabled={
																				downloadingSelected
																			}
																			className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
																			title={`Download ${selectedArtistIds.size} selected artist(s)`}
																		>
																			{downloadingSelected ? (
																				<>
																					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
																					<span className="hidden sm:inline">
																						Downloading {downloadProgress > 0 ? `(${downloadProgress}%)` : "..."}
																					</span>
																					<span className="sm:hidden">
																						{downloadProgress > 0 ? `${downloadProgress}%` : "..."}
																					</span>
																				</>
																			) : (
																				<>
																					<FileDown className="h-4 w-4" />
																					<span className="hidden sm:inline">
																						Download
																						Selected
																						(
																						{
																							selectedArtistIds.size
																						}

																						)
																					</span>
																					<span className="sm:hidden">
																						Download
																						(
																						{
																							selectedArtistIds.size
																						}

																						)
																					</span>
																				</>
																			)}
																		</Button>
																	)}

																{/* Download All Button */}
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		downloadDayArtists(
																			date,
																			artistsForDate,
																			dayNumber,
																		)
																	}
																	disabled={
																		downloadingDay ===
																		date
																	}
																	className="flex items-center gap-2"
																	title={`Download all Day ${dayNumber} artists data`}
																>
																	{downloadingDay ===
																		date ? (
																		<>
																			<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
																			<span className="hidden sm:inline">
																				Downloading {downloadProgress > 0 ? `(${downloadProgress}%)` : "..."}
																			</span>
																			<span className="sm:hidden">
																				{downloadProgress > 0 ? `${downloadProgress}%` : "..."}
																			</span>
																		</>
																	) : (
																		<>
																			<Package className="h-4 w-4" />
																			<span className="hidden sm:inline">
																				Download
																				All
																			</span>
																			<span className="sm:hidden">
																				Download
																			</span>
																		</>
																	)}
																</Button>
																<ChatButton
																	eventId={
																		eventId
																	}
																	eventName={
																		event?.name ||
																		""
																	}
																	showDate={
																		date
																	}
																	artistCount={
																		artistsForDate.length
																	}
																	senderId={
																		stageManagerId
																	}
																	senderName={
																		stageManagerName
																	}
																	variant="outline"
																/>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		setFullscreenDay(
																			fullscreenDay ===
																				date
																				? null
																				: date,
																		)
																	}
																	className="flex items-center gap-2"
																	title={
																		fullscreenDay ===
																			date
																			? "Exit Full Screen"
																			: "Full Screen"
																	}
																>
																	{fullscreenDay ===
																		date ? (
																		<Minimize2 className="h-4 w-4" />
																	) : (
																		<Maximize2 className="h-4 w-4" />
																	)}
																</Button>
															</div>}
														</div>

														{/* Search and Sort Controls */}
														<div className="p-4 bg-gray-50 rounded-lg space-y-4">
															{/* Search Bar - Full width on mobile */}
															<div className="w-full">
																<div className="relative">
																	<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
																	<Input
																		placeholder="Search artists by name, real name, style, or duration..."
																		value={
																			searchTermsByDay[
																			date
																			] ||
																			""
																		}
																		onChange={(
																			e,
																		) =>
																			handleSearchChange(
																				date,
																				e
																					.target
																					.value,
																			)
																		}
																		className="pl-10 w-full"
																	/>
																</div>
															</div>

															{/* Sort Controls - Responsive layout */}
															<div className="flex flex-col sm:flex-row sm:items-center gap-3">
																<span className="text-sm text-muted-foreground font-medium">
																	Sort:
																</span>
																<div className="flex flex-wrap gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleSort(
																				date,
																				"artist_name",
																			)
																		}
																		className="flex items-center gap-1 text-xs sm:text-sm"
																	>
																		<span className="hidden sm:inline">
																			Artist
																			Name
																		</span>
																		<span className="sm:hidden">
																			Artist
																		</span>
																		{getSortIcon(
																			date,
																			"artist_name",
																		)}
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleSort(
																				date,
																				"real_name",
																			)
																		}
																		className="flex items-center gap-1 text-xs sm:text-sm"
																	>
																		<span className="hidden sm:inline">
																			Real
																			Name
																		</span>
																		<span className="sm:hidden">
																			Real
																		</span>
																		{getSortIcon(
																			date,
																			"real_name",
																		)}
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleSort(
																				date,
																				"style",
																			)
																		}
																		className="flex items-center gap-1 text-xs sm:text-sm"
																	>
																		Style
																		{getSortIcon(
																			date,
																			"style",
																		)}
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleSort(
																				date,
																				"duration",
																			)
																		}
																		className="flex items-center gap-1 text-xs sm:text-sm"
																	>
																		Duration
																		{getSortIcon(
																			date,
																			"duration",
																		)}
																	</Button>
																</div>
															</div>
														</div>

														{/* Artists Table */}
														<div className={fullscreenDay === date ? "border rounded-lg flex-1 overflow-y-auto" : filteredAndSortedArtists.length > 5 ? "border rounded-lg max-h-[400px] overflow-y-auto" : "border rounded-lg"}>
															<Table>
																<TableHeader className="sticky top-0 bg-white z-10">
																	<TableRow>
																		<TableHead className="w-12">
																			<input
																				type="checkbox"
																				checked={(() => {
																					const dayArtistIds =
																						filteredAndSortedArtists.map(
																							(
																								a,
																							) =>
																								a.eventShowId || a.id,
																						);
																					return (
																						dayArtistIds.length >
																						0 &&
																						dayArtistIds.every(
																							(
																								id,
																							) =>
																								selectedArtistIds.has(
																									id,
																								),
																						)
																					);
																				})()}
																				onChange={() => {
																					const dayArtistIds =
																						filteredAndSortedArtists.map(
																							(
																								a,
																							) =>
																								a.eventShowId || a.id,
																						);
																					const allSelected =
																						dayArtistIds.every(
																							(
																								id,
																							) =>
																								selectedArtistIds.has(
																									id,
																								),
																						);
																					if (
																						allSelected
																					) {
																						deselectAllForDay(
																							filteredAndSortedArtists,
																						);
																					} else {
																						selectAllForDay(
																							filteredAndSortedArtists,
																						);
																					}
																				}}
																				className="w-4 h-4 cursor-pointer"
																				title="Select/Deselect All"
																			/>
																		</TableHead>
																		<TableHead className="w-16">
																			No.
																		</TableHead>
																		<TableHead>
																			Artist
																			Name
																		</TableHead>
																		<TableHead>
																			Real
																			Name
																		</TableHead>
																		<TableHead>
																			Style
																		</TableHead>
																		<TableHead>
																			Type
																		</TableHead>
																		<TableHead>
																			Show / Duration
																		</TableHead>
																		<TableHead>
																			Actions
																		</TableHead>
																	</TableRow>
																</TableHeader>
																<TableBody>
																	{filteredAndSortedArtists.length ===
																		0 ? (
																		<TableRow>
																			<TableCell
																				colSpan={
																					7
																				}
																				className="text-center py-8 text-muted-foreground"
																			>
																				{searchTermsByDay[
																					date
																				]
																					? "No artists match your search criteria"
																					: "No artists assigned to this day"}
																			</TableCell>
																		</TableRow>
																	) : (
																		filteredAndSortedArtists.map(
																			(
																				artist,
																				index,
																			) => {
																				// Determine row styling - only use custom artists_page_color
																				const isSelected =
																					selectedArtistIds.has(
																						artist.eventShowId || artist.id,
																					);
																				const hasCustomColor =
																					artist.artists_page_color;
																				const rowBgClass =
																					isSelected
																						? "bg-blue-100"
																						: ""; // No automatic status colors

																				// For custom artists page color, use inline style
																				const rowStyle =
																					hasCustomColor &&
																						!isSelected
																						? {
																							backgroundColor:
																								artist.artists_page_color,
																						}
																						: {};

																				// Determine text color based on background
																				const textColorClass =
																					hasCustomColor &&
																						!isSelected &&
																						!isLightColor(
																							artist.artists_page_color!,
																						)
																						? "text-white"
																						: "";

																				// Look up this artist's assigned show (name/duration) from the
																				// organiser's agreement, matched by performance date.
																				const agreementForArtist =
																					agreementByArtistKey.get(artist.id) ||
																					(artist.email
																						? agreementByArtistKey.get(
																								artist.email.toLowerCase().trim(),
																							)
																						: undefined);
																				const matchedPerformance =
																					findAgreementPerformance(
																						agreementForArtist,
																						artist.performance_date,
																					);
																				const matchedDurationMinutes =
																					matchedPerformance?.time &&
																					matchedPerformance?.endTime
																						? Math.round(
																								(new Date(`1970-01-01T${matchedPerformance.endTime}:00`).getTime() -
																									new Date(`1970-01-01T${matchedPerformance.time}:00`).getTime()) /
																									60000,
																							)
																						: null;

																				return (
																					<TableRow
																						key={
																							artist.eventShowId ||
																							artist.id
																						}
																						className={`${rowBgClass} ${textColorClass} transition-colors`}
																						style={
																							rowStyle
																						}
																					>
																						<TableCell>
																							<input
																								type="checkbox"
																								checked={
																									isSelected
																								}
																								onChange={() =>
																									toggleArtistSelection(
																										artist.eventShowId || artist.id,
																									)
																								}
																								className="w-4 h-4 cursor-pointer"
																								title="Select artist"
																							/>
																						</TableCell>
																						<TableCell>
																							<div className="flex items-center justify-center">
																								<span
																									className={`text-sm font-mono px-2 py-1 rounded font-semibold ${hasCustomColor &&
																										!isSelected &&
																										!isLightColor(
																											artist.artists_page_color!,
																										)
																										? "bg-white/20 text-white border border-white/30"
																										: "bg-blue-100 text-blue-700"
																										}`}
																								>
																									{index +
																										1}
																								</span>
																							</div>
																						</TableCell>
																						<TableCell>
																							<div className="flex items-center gap-3">
																								{/* Profile Picture */}
																								{artist.image_url ? (
																									<FullScreenImageViewer
																										src={`/api/media/${artist.image_url}`}
																										alt={
																											artist.artist_name
																										}
																									>
																										<div className="relative cursor-pointer w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 border-2 border-purple-200 hover:border-purple-400 transition-all">
																											<img
																												src={`/api/media/${artist.image_url}`}
																												alt={
																													artist.artist_name
																												}
																												className="w-full h-full object-cover"
																											/>
																											<div
																												className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center"
																												title="Click to enlarge"
																											>
																												<Eye className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
																											</div>
																										</div>
																									</FullScreenImageViewer>
																								) : (
																									<div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 border-2 border-purple-200">
																										<User className="h-5 w-5 text-purple-400" />
																									</div>
																								)}
																								<span className="font-medium flex items-center gap-1.5 flex-wrap">
																									{artist.artist_name}
																									{(artist as any).artists_page_tag && (
																										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700">
																											<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
																											{(artist as any).artists_page_tag}
																										</span>
																									)}
																									{artist.isFameLinkSubmission && (
																										<Badge
																											variant="outline"
																											className="ml-2 text-[10px] px-1.5 py-0 border-purple-400 text-purple-600"
																										>
																											FameLink
																										</Badge>
																									)}
																									{artist.isFameLinkSubmission &&
																										artist.totalShowsByArtist &&
																										artist.totalShowsByArtist >
																										1 && (
																											<Badge
																												variant="secondary"
																												className="ml-1 text-[10px] px-1.5 py-0"
																											>
																												Show{" "}
																												{
																													artist.showIndex
																												}{" "}
																												of{" "}
																												{
																													artist.totalShowsByArtist
																												}
																											</Badge>
																										)}
																									{/* Show info submission status badge */}
																									{artist.baseShowId ? (
																										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300">
																											<CheckCircle className="h-3 w-3" />
																											Confirmed show info
																										</span>
																									) : (
																										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
																											<Clock className="h-3 w-3" />
																											Show info not shared yet
																										</span>
																									)}
																								</span>
																							</div>
																						</TableCell>
																						<TableCell>
																							{
																								artist.real_name
																							}
																						</TableCell>
																						<TableCell>
																							{
																								artist.style
																							}
																						</TableCell>
																						<TableCell>
																							{artist.performanceType ? (
																								<Badge
																									variant="outline"
																									className="text-xs"
																								>
																									{
																										artist.performanceType
																									}
																								</Badge>
																							) : (
																								<span className="text-muted-foreground text-xs">
																									—
																								</span>
																							)}
																						</TableCell>
																						<TableCell>
																							<div className="flex flex-col gap-0.5">
																								{matchedPerformance?.title && (
																									<span
																										className={`text-xs font-medium ${
																											hasCustomColor &&
																												!isSelected &&
																												!isLightColor(
																													artist.artists_page_color!,
																												)
																												? "text-white"
																												: "text-foreground"
																										}`}
																									>
																										{matchedPerformance.title}
																									</span>
																								)}
																								{(matchedDurationMinutes || artist.actual_duration) && (
																									<span
																										className={
																											hasCustomColor &&
																												!isSelected &&
																												!isLightColor(
																													artist.artists_page_color!,
																												)
																												? "text-white/90"
																												: "text-muted-foreground"
																										}
																									>
																										{matchedDurationMinutes
																											? `${matchedDurationMinutes} min`
																											: formatDuration(
																													artist.actual_duration,
																												)}
																									</span>
																								)}
																								{(matchedPerformance?.time || matchedPerformance?.endTime) && (
																									<span
																										className={`text-xs ${
																											hasCustomColor &&
																												!isSelected &&
																												!isLightColor(
																													artist.artists_page_color!,
																												)
																												? "text-white/70"
																												: "text-muted-foreground"
																										}`}
																									>
																										{[matchedPerformance.time, matchedPerformance.endTime]
																											.filter(Boolean)
																											.join(" – ")}
																									</span>
																								)}
																								{!matchedPerformance?.title && !matchedDurationMinutes && !artist.actual_duration && !matchedPerformance?.time && (
																									<span className="text-muted-foreground text-xs">—</span>
																								)}
																							</div>
																						</TableCell>
																						<TableCell>
																							<div className="flex items-center gap-2">
																								<Button
																									variant="outline"
																									size="sm"
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
																								{/* FameLink Edit button commented out — re-enable when ready */}
																								{/* {artist.isFameLinkSubmission && artist.baseShowId && (
																										<Button
																											variant="outline"
																											size="sm"
																											onClick={() =>
																												window.open(
																													`/famelink/${artist.id}/shows/${artist.baseShowId}/edit`,
																													"_blank",
																													"noopener,noreferrer",
																												)
																											}
																											title="Edit FameLink Show"
																											className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
																										>
																											<Edit className="h-4 w-4" />
																										</Button>
																									)} */}
																								{!artist.isFameLinkSubmission && (
																									<Button
																										variant="outline"
																										size="sm"
																										onClick={() =>
																											window.open(
																												`/artist-edit/${artist.id}?from=stage-manager&eventId=${eventId}`,
																												"_blank",
																												"noopener,noreferrer",
																											)
																										}
																										title="Edit Artist"
																										className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
																									>
																										<Edit className="h-4 w-4" />
																									</Button>
																								)}
																								<Button
																									variant="outline"
																									size="sm"
																									onClick={() =>
																										window.open(
																											artist.isFameLinkSubmission
																												? `/famelink/${artist.id}/event/${eventId}?viewer=stage_manager${artist.eventShowId ? `&eventShowId=${artist.eventShowId}` : ""}`
																												: `/artist-dashboard/${artist.id}`,
																											"_blank",
																											"noopener,noreferrer",
																										)
																									}
																									title={
																										artist.isFameLinkSubmission
																											? "View FameLink Dashboard"
																											: "View Artist Dashboard"
																									}
																									className="text-green-600 hover:text-green-700 hover:bg-green-50"
																								>
																									<LayoutDashboard className="h-4 w-4" />
																								</Button>
																								<PersonalMessageButton
																									eventId={
																										eventId
																									}
																									eventName={
																										event?.name ||
																										""
																									}
																									artistId={
																										artist.id
																									}
																									artistName={
																										artist.artist_name
																									}
																									senderId={
																										stageManagerId
																									}
																									senderName={
																										stageManagerName
																									}
																									initialUnreadCount={
																										personalMessageUnreadCounts[
																										artist.id
																										] || 0
																									}
																									variant="outline"
																									size="sm"
																									className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
																								/>
																								<ArtistUpdateBadge
																									eventId={
																										eventId
																									}
																									artistId={
																										artist.id
																									}
																									artistName={
																										artist.artist_name
																									}
																									stageManagerId={
																										stageManagerId
																									}
																									initialUnreadCount={
																										artistUpdateUnreadCounts[
																										artist.id
																										] || 0
																									}
																									variant="outline"
																									size="sm"
																									className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
																								/>
																								<Dialog
																									open={
																										editingArtistColor ===
																										(artist.eventShowId || artist.id)
																									}
																									onOpenChange={(
																										open,
																									) => {
																										if (
																											!open
																										) {
																											setEditingArtistColor(
																												null,
																											);
																											setTempArtistColor(
																												"",
																											);
																											setTempArtistTag(
																												"",
																											);
																										}
																									}}
																								>
																									<DialogTrigger
																										asChild
																									>
																										<Button
																											variant="outline"
																											size="sm"
																											title={
																												artist.artists_page_color
																													? "Change Color"
																													: "Set Color"
																											}
																											className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
																											onClick={() => {
																												setEditingArtistColor(
																													artist.eventShowId || artist.id,
																												);
																												setTempArtistColor(
																													artist.artists_page_color ||
																													"",
																												);
																												setTempArtistTag(
																													(artist as any).artists_page_tag ||
																													"",
																												);
																											}}
																										>
																											<Palette className="h-4 w-4" />
																										</Button>
																									</DialogTrigger>
																									<DialogContent className="max-w-md">
																										<DialogHeader>
																											<DialogTitle>Set Artist Color - {artist.artist_name}</DialogTitle>
																											<DialogDescription>
																												Select a background color for this artist in the event dashboard.
																											</DialogDescription>
																										</DialogHeader>
																										<div className="space-y-4 py-4">
																											<div className="space-y-3">
																												<CueColorPicker
																													label="Background Color"
																													value={tempArtistColor}
																													onChange={setTempArtistColor}
																													placeholder="Tap to select"
																												/>
																												<Button
																													variant="outline"
																													type="button"
																													className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-700 flex items-center justify-center gap-1.5 h-9 text-xs"
																													onClick={() => {
																														setTempArtistColor("");
																													}}
																												>
																													<Palette className="h-4 w-4 text-slate-400" />
																													Reset to White / Default
																												</Button>
																												{/* Reuse Tag */}
																												{Array.from(new Set(artists.map((a: any) => a.artists_page_tag).filter(Boolean))).length > 0 && (
																													<div>
																														<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reuse Tag</p>
																														<div className="flex flex-wrap gap-1.5">
																															{Array.from(new Set(artists.map((a: any) => a.artists_page_tag).filter(Boolean))).map((t: any) => (
																																<button key={t} type="button" onClick={() => setTempArtistTag(tempArtistTag === t ? "" : t)}
																																	className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${tempArtistTag === t ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
																																	<span className="w-2 h-2 rounded-full bg-emerald-400" />{t}
																																</button>
																															))}
																														</div>
																													</div>
																												)}
																												{/* New Tag */}
																												<div>
																													<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">New Tag</p>
																													<input type="text" value={tempArtistTag} onChange={e => setTempArtistTag(e.target.value)}
																														placeholder="Tag name"
																														className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
																												</div>
																												<div className="flex gap-2">
																													<Button
																														onClick={() => {
																															updateArtistBackstageColor(artist.id, tempArtistColor, artist.eventShowId, tempArtistTag);
																															setEditingArtistColor(null); setTempArtistTag("");
																														}}
																														className="flex-1"
																													>
																														Save
																													</Button>
																													<Button variant="outline" onClick={() => { setEditingArtistColor(null); setTempArtistColor(""); setTempArtistTag(""); }} className="flex-1">Cancel</Button>
																												</div>
																											</div>
																										</div>
																									</DialogContent>
																								</Dialog>
																								<Button
																									variant="outline"
																									size="sm"
																									onClick={() =>
																										assignPerformanceDate(
																											artist.id,
																											null,
																											artist.eventShowId,
																										)
																									}
																									title="Unassign from this date"
																								>
																									<X className="h-4 w-4" />
																								</Button>
																								<Button
																									variant="outline"
																									size="sm"
																									onClick={() =>
																										hideArtist(
																											artist.eventShowId || artist.id,
																											artist.artist_name,
																										)
																									}
																									title="Hide Artist"
																									className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
																								>
																									<EyeOff className="h-4 w-4" />
																								</Button>
																								<AlertDialog>
																									<AlertDialogTrigger
																										asChild
																									>
																										<Button
																											variant="outline"
																											size="sm"
																											className="text-destructive hover:text-destructive"
																										>
																											<Trash2 className="h-4 w-4" />
																										</Button>
																									</AlertDialogTrigger>
																									<AlertDialogContent>
																										<AlertDialogHeader>
																											<AlertDialogTitle>
																												Delete
																												Artist
																											</AlertDialogTitle>
																											<AlertDialogDescription>
																												Are
																												you
																												sure
																												you
																												want
																												to
																												delete{" "}
																												{
																													artist.artist_name
																												}

																												?
																												This
																												action
																												cannot
																												be
																												undone.
																											</AlertDialogDescription>
																										</AlertDialogHeader>
																										<AlertDialogFooter>
																											<AlertDialogCancel>
																												Cancel
																											</AlertDialogCancel>
																											<AlertDialogAction
																												onClick={() =>
																													deleteArtist(
																														artist.id,
																														artist.eventShowId,
																													)
																												}
																												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																											>
																												Delete
																											</AlertDialogAction>
																										</AlertDialogFooter>
																									</AlertDialogContent>
																								</AlertDialog>
																							</div>
																						</TableCell>
																					</TableRow>
																				);
																			},
																		)
																	)}
																</TableBody>
															</Table>
														</div>
													</div>
												);
											},
										);
									})()}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Artist Detail Dialog */}
					<Dialog
						open={isDetailDialogOpen}
						onOpenChange={setIsDetailDialogOpen}
					>
						<DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto rounded-xl">
							<DialogHeader>
								<div className="flex items-center justify-between">
									<div className="flex gap-4 items-center">
										{/* Profile Picture / Avatar */}
										{selectedArtist?.image_url ? (
											<div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 relative">
												<img
													src={`/api/media/${selectedArtist.image_url}`}
													alt={selectedArtist.artist_name}
													className="w-full h-full object-cover"
													onError={(e) => {
														e.currentTarget.style.display = "none";
														const fb = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
														if (fb) fb.classList.remove("hidden");
													}}
												/>
												<div className="avatar-fallback hidden w-full h-full bg-pink-500 text-white flex items-center justify-center text-xl font-bold">
													{selectedArtist?.artist_name.substring(0, 2).toUpperCase()}
												</div>
											</div>
										) : (
											<div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-pink-500 text-white flex items-center justify-center text-xl font-bold">
												{selectedArtist?.artist_name.substring(0, 2).toUpperCase()}
											</div>
										)}

										<div>
											<DialogTitle className="text-2xl font-bold flex items-center gap-2">
												{selectedArtist?.artist_name}
												{selectedArtist?.isFameLinkSubmission && (
													<Badge
														variant="outline"
														className="text-[10px] px-1.5 py-0 border-purple-400 text-purple-600"
													>
														FameLink
													</Badge>
												)}
												{selectedArtist?.isFameLinkSubmission &&
													selectedArtist?.totalShowsByArtist &&
													selectedArtist.totalShowsByArtist >
													1 && (
														<Badge
															variant="secondary"
															className="text-[10px] px-1.5 py-0"
														>
															Show{" "}
															{
																selectedArtist.showIndex
															}{" "}
															of{" "}
															{
																selectedArtist.totalShowsByArtist
															}
														</Badge>
													)}
											</DialogTitle>
											<DialogDescription className="text-base text-gray-500 flex items-center gap-1 mt-1">
												{selectedArtist?.real_name}
												{((selectedArtist as any)?.countryLiving || (selectedArtist as any)?.homeCountry) && (
													<> &middot; {getCountryName((selectedArtist as any)?.countryLiving || (selectedArtist as any)?.homeCountry)}</>
												)}
											</DialogDescription>
										</div>
									</div>
									<Button
										variant="outline"
										onClick={() =>
											selectedArtist &&
											downloadArtistData(
												selectedArtist,
											)
										}
										disabled={
											downloadingArtistId ===
											selectedArtist?.id
										}
										className="flex items-center gap-2"
										title="Download complete artist data as ZIP"
									>
										{downloadingArtistId ===
											selectedArtist?.id ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current shrink-0"></div>
												<span className="hidden sm:inline">
													{downloadProgress > 0 && downloadProgress < 100
														? `${downloadProgress}%`
														: "Downloading..."}
												</span>
												<span className="sm:hidden">
													{downloadProgress > 0 && downloadProgress < 100
														? `${downloadProgress}%`
														: "..."}
												</span>
											</>
										) : (
											<>
												<FileDown className="h-4 w-4" />
												<span className="hidden sm:inline">
													Download
												</span>
												<span className="sm:hidden">
													Download
												</span>
											</>
										)}
									</Button>
								</div>

								{/* Personal Magic Link Box */}
								{(() => {
									const targetPath = `/famelink/${selectedArtist?.id}`;
									const dashboardUrl = `${getBaseUrl()}/api/auth/artist/qr-login?artistId=${selectedArtist?.id}&redirect=${encodeURIComponent(targetPath)}`;

									return (
										<div className="mt-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100 w-full shadow-sm space-y-3">
											<div className="flex items-center gap-2">
												<Input
													readOnly
													value={dashboardUrl}
													className="flex-1 font-mono text-xs bg-white h-9 focus-visible:ring-1"
													onClick={(e) => (e.target as HTMLInputElement).select()}
												/>
												<Button variant="outline" size="sm" className="h-9 px-3 shrink-0 rounded-lg" onClick={() => {
													navigator.clipboard.writeText(dashboardUrl);
													toast({ title: "Copied!", description: "Artist dashboard link copied to clipboard" });
												}}>
													<Copy className="h-4 w-4 mr-1.5 text-gray-500" /> Copy
												</Button>
											</div>
											<div className="flex items-center gap-2">
												<Button variant="outline" size="sm" className="flex-1 h-9 px-3 rounded-lg text-pink-600 border-pink-200 bg-pink-50/50 hover:bg-pink-100 hover:text-pink-700" onClick={() => {
													setIsInviteDialogOpen(true);
												}}>
													<UserPlus className="h-4 w-4 mr-1.5" /> Invite Artist
												</Button>
												<Button variant="outline" size="sm" className="flex-1 h-9 px-3 rounded-lg" onClick={() => {
													const previewUrl = `${targetPath}${targetPath.includes('?') ? '&' : '?'}viewer=stage_manager`;
													window.open(previewUrl, "_blank");
												}}>
													<ExternalLink className="h-4 w-4 mr-1.5 text-gray-500" /> Preview Portal
												</Button>
											</div>
										</div>
									);
								})()}
							</DialogHeader>

							{selectedArtist && (
								<Tabs
									defaultValue="overview"
									className="w-full"
								>
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
													<div className="flex items-center justify-between">
														<CardTitle className="flex items-center gap-2">
															<User className="h-5 w-5" />
															Basic
															Information
														</CardTitle>
														{/* {!isEditingBasicInfo ? (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		setIsEditingBasicInfo(
																			true
																		)
																	}
																>
																	<Edit className="h-4 w-4 mr-2" />
																	Edit
																</Button>
															) : (
																<div className="flex gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => {
																			setEditFormData(
																				{
																					artist_name:
																						selectedArtist.artist_name,
																					real_name:
																						selectedArtist.real_name,
																					email: selectedArtist.email,
																					phone:
																						(
																							selectedArtist as any
																						)
																							.phone ||
																						"",
																				}
																			);
																			setIsEditingBasicInfo(
																				false
																			);
																		}}
																	>
																		Cancel
																	</Button>
																	<Button
																		size="sm"
																		onClick={
																			handleSaveBasicInfo
																		}
																	>
																		<CheckCircle className="h-4 w-4 mr-2" />
																		Save
																	</Button>
																</div>
															)} */}
														{/* Copy and Resend Buttons */}
														<div className="flex gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	copyArtistLoginInfo(
																		selectedArtist,
																	)
																}
																title="Copy login info for WhatsApp"
															>
																<Copy className="h-4 w-4 mr-1" />
																Copy
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	resendLoginEmail(
																		selectedArtist,
																	)
																}
																disabled={
																	resendingEmail
																}
																title="Resend login email"
															>
																<Send className="h-4 w-4 mr-1" />
																{resendingEmail
																	? "Sending..."
																	: "Resend"}
															</Button>
														</div>
													</div>
												</CardHeader>
												<CardContent className="space-y-4">
													{/* Profile Image */}
													<div className="flex justify-center mb-4 relative">
														{selectedArtist?.image_url ? (
															<FullScreenImageViewer
																src={`/api/media/${selectedArtist.image_url}`}
																alt={selectedArtist.artist_name}
															>
																<div className="relative cursor-pointer w-24 h-24">
																	<img
																		src={`/api/media/${selectedArtist.image_url}`}
																		alt={selectedArtist.artist_name}
																		className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-lg"
																		onError={(e) => {
																			e.currentTarget.style.display = "none";
																			const fallback = e.currentTarget.parentElement?.parentElement?.querySelector(".image-fallback");
																			if (fallback) fallback.classList.remove("hidden");
																		}}
																	/>
																	<div
																		className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-gray-200"
																		title="Click to enlarge"
																	>
																		<Eye className="h-4 w-4 text-purple-600" />
																	</div>
																</div>
															</FullScreenImageViewer>
														) : null}
														<div className={`image-fallback ${selectedArtist?.image_url ? "hidden" : ""} w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg`}>
															<User className="h-12 w-12 text-purple-400" />
														</div>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Artist ID
														</p>
														<p className="font-medium text-xs text-gray-600">
															{
																selectedArtist.id
															}
														</p>
													</div>
													<div>
														<Label className="text-sm text-muted-foreground">
															Artist Name
														</Label>
														{isEditingBasicInfo ? (
															<Input
																value={
																	editFormData.artist_name
																}
																onChange={(
																	e,
																) =>
																	setEditFormData(
																		{
																			...editFormData,
																			artist_name:
																				e
																					.target
																					.value,
																		},
																	)
																}
																placeholder="Enter artist name"
															/>
														) : (
															<p className="font-medium">
																{
																	selectedArtist.artist_name
																}
															</p>
														)}
													</div>
													<div>
														<Label className="text-sm text-muted-foreground">
															Real Name
														</Label>
														{isEditingBasicInfo ? (
															<Input
																value={
																	editFormData.real_name
																}
																onChange={(
																	e,
																) =>
																	setEditFormData(
																		{
																			...editFormData,
																			real_name:
																				e
																					.target
																					.value,
																		},
																	)
																}
																placeholder="Enter real name"
															/>
														) : (
															<p className="font-medium">
																{
																	selectedArtist.real_name
																}
															</p>
														)}
													</div>
													<div>
														<Label className="text-sm text-muted-foreground flex items-center gap-2">
															<Mail className="h-4 w-4" />
															Email
														</Label>
														{isEditingBasicInfo ? (
															<Input
																type="email"
																value={
																	editFormData.email
																}
																onChange={(
																	e,
																) =>
																	setEditFormData(
																		{
																			...editFormData,
																			email: e
																				.target
																				.value,
																		},
																	)
																}
																placeholder="Enter email"
															/>
														) : (
															<EmailLink
																email={
																	selectedArtist.email
																}
																className="text-sm"
															/>
														)}
													</div>
													<div>
														<Label className="text-sm text-muted-foreground flex items-center gap-2">
															<WhatsAppIcon className="h-4 w-4 text-green-600" />
															WhatsApp Number
														</Label>
														{isEditingBasicInfo ? (
															<WhatsAppInput
																value={
																	editFormData.phone
																}
																onChange={(
																	value,
																) =>
																	setEditFormData(
																		{
																			...editFormData,
																			phone: value,
																		},
																	)
																}
																placeholder="+971528411575"
															/>
														) : (
															<WhatsAppLink
																phoneNumber={
																	(
																		selectedArtist as any
																	).phone
																}
																className="text-sm"
															/>
														)}
													</div>
													{isEditingBasicInfo && (
														<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
															<p className="text-sm text-amber-900 font-medium mb-1">
																⚠️ Important
																Notice
															</p>
															<p className="text-xs text-amber-800">
																Saving these
																changes will
																automatically
																log out the
																artist. They
																will need to
																log in again
																using their
																updated
																Artist ID,
																Name, and
																Email.
															</p>
														</div>
													)}
													{(selectedArtist as any)
														.managedBy && (
															<div>
																<Label className="text-sm text-muted-foreground flex items-center gap-2">
																	<Users className="h-4 w-4 text-purple-600" />
																	Managed By
																</Label>
																<p className="font-medium">
																	{
																		(
																			selectedArtist as any
																		)
																			.managedBy
																	}
																</p>
															</div>
														)}
													<div>
														<p className="text-sm text-muted-foreground">
															Performance
															Style
														</p>
														<p className="font-medium">
															{
																selectedArtist.style
															}
														</p>
													</div>
													{(selectedArtist as any)
														.performanceType && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Performance
																	Type
																</p>
																<p className="font-medium">
																	{
																		(
																			selectedArtist as any
																		)
																			.performanceType
																	}
																</p>
															</div>
														)}
													<div>
														<p className="text-sm text-muted-foreground">
															Duration
														</p>
														<p className="font-medium">
															{(
																selectedArtist as any
															).musicTrack
																?.duration
																? formatDuration(
																	(
																		selectedArtist as any
																	)
																		.musicTrack
																		.duration,
																)
																: (
																	selectedArtist as any
																).musicTracks?.find(
																	(
																		t: any,
																	) =>
																		t.is_main_track,
																)
																	?.duration
																	? formatDuration(
																		(
																			selectedArtist as any
																		).musicTracks.find(
																			(
																				t: any,
																			) =>
																				t.is_main_track,
																		)
																			.duration,
																	)
																	: `${selectedArtist.performance_duration} minutes`}
														</p>
													</div>
													{/* Nationality Information */}
													{((
														selectedArtist as any
													).countryLiving ||
														(
															selectedArtist as any
														).homeCountry ||
														((
															selectedArtist as any
														).members &&
															(
																selectedArtist as any
															).members
																.length >
															0)) && (
															<div className="border-t pt-4 mt-4">
																<p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
																	<Globe className="h-4 w-4" />
																	Nationality
																	Information
																</p>
																{(
																	selectedArtist as any
																).members &&
																	(
																		selectedArtist as any
																	).members
																		.length >
																	0 ? (
																	<div className="space-y-2">
																		{(
																			selectedArtist as any
																		).members.map(
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
																		{(
																			selectedArtist as any
																		)
																			.countryLiving && (
																				<span className="flex items-center gap-1">
																					{getCountryFlag(
																						(
																							selectedArtist as any
																						)
																							.countryLiving,
																					)}{" "}
																					Living
																					in{" "}
																					{getCountryName(
																						(
																							selectedArtist as any
																						)
																							.countryLiving,
																					)}
																				</span>
																			)}
																		{(
																			selectedArtist as any
																		)
																			.homeCountry && (
																				<span className="flex items-center gap-1 text-gray-600">
																					|{" "}
																					{getCountryFlag(
																						(
																							selectedArtist as any
																						)
																							.homeCountry,
																					)}{" "}
																					From{" "}
																					{getCountryName(
																						(
																							selectedArtist as any
																						)
																							.homeCountry,
																					)}
																				</span>
																			)}
																	</div>
																)}
															</div>
														)}

													{/* T-Shirt Sizes */}
													{(selectedArtist as any)
														.tshirtSizes &&
														(
															selectedArtist as any
														).tshirtSizes
															.length > 0 && (
															<div className="border-t pt-4 mt-4">
																<p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
																	<User className="h-4 w-4" />
																	T-Shirt
																	Sizes
																</p>
																<div className="space-y-2">
																	{(
																		selectedArtist as any
																	).tshirtSizes.map(
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
												const isFameLink = !!(selectedArtist as any).isFameLinkSubmission || !!(selectedArtist as any).isFameLinkArtist || selectedArtist.id?.startsWith("artist-");
												const targetUrl = isFameLink
													? `/famelink/${selectedArtist.id}`
													: `/artist-dashboard/${selectedArtist.id}`;
												const dashboardUrl = `${getBaseUrl()}/api/auth/artist/qr-login?artistId=${selectedArtist.id}&redirect=${encodeURIComponent(targetUrl)}`;
												return (
													<Card>
														<CardHeader>
															<CardTitle className="flex items-center gap-2">
																<Package className="h-5 w-5" />
																Artist Dashboard QR
																Code
															</CardTitle>
															<CardDescription>
																Scan to access
																artist dashboard
															</CardDescription>
														</CardHeader>
														<CardContent className="space-y-4">
															<div
																data-qr-artists-page
																className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-300"
															>
																<QRCodeSVG
																	value={dashboardUrl}
																	size={160}
																	level="H"
																	includeMargin={
																		true
																	}
																/>
																<p className="text-xs text-muted-foreground mt-3 text-center">
																	Scan this QR
																	code to access
																	the artist
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
																				"[data-qr-artists-page]",
																			);
																		const qrElement =
																			qrContainer?.querySelector(
																				"svg",
																			) as SVGElement;
																		if (
																			qrElement
																		) {
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
																						link.download = `${selectedArtist.artist_name}-qr-code.png`;
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
																	Copy Dashboard
																	Link
																</Button>

															</div>
														</CardContent>
													</Card>
												);
											})()}

											{/* Biography */}
											<Card>
												<CardHeader>
													<CardTitle>
														Biography
													</CardTitle>
												</CardHeader>
												<CardContent>
													<p className="text-sm leading-relaxed">
														{(
															selectedArtist as any
														).biography ||
															"No biography provided"}
													</p>
												</CardContent>
											</Card>
										</div>

										{/* Social Media Links */}
										{(selectedArtist as any)
											.socialMedia && (
												<Card>
													<CardHeader>
														<CardTitle className="flex items-center gap-2">
															<Globe className="h-5 w-5" />
															Social Media & Links
														</CardTitle>
													</CardHeader>
													<CardContent>
														<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
															{(
																selectedArtist as any
															).socialMedia
																?.instagram && (
																	<a
																		href={
																			(
																				selectedArtist as any
																			)
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
															{(
																selectedArtist as any
															).socialMedia
																?.facebook && (
																	<a
																		href={
																			(
																				selectedArtist as any
																			)
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
															{(
																selectedArtist as any
															).socialMedia
																?.youtube && (
																	<a
																		href={
																			(
																				selectedArtist as any
																			)
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
															{(
																selectedArtist as any
															).socialMedia
																?.website && (
																	<a
																		href={
																			(
																				selectedArtist as any
																			)
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
															{(
																selectedArtist as any
															).showLink && (
																	<a
																		href={
																			(
																				selectedArtist as any
																			)
																				.showLink
																		}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
																	>
																		<Play className="h-4 w-4 text-purple-600" />
																		<span className="text-sm">
																			Demo
																			Video
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
													Uploaded music tracks
													for the performance
												</CardDescription>
											</CardHeader>
											<CardContent>
												<div className="space-y-4">
													{/* Handle single musicTrack (new format) - check for file_url */}
													{(selectedArtist as any)
														.musicTrack
														?.file_url ? (
														<div className="border rounded-lg p-4 space-y-3">
															<div className="flex items-center justify-between">
																<div>
																	<h4 className="font-medium">
																		{(
																			selectedArtist as any
																		)
																			.musicTrack
																			.song_title ||
																			selectedArtist.artist_name}
																	</h4>
																	<p className="text-sm text-muted-foreground">
																		Duration:{" "}
																		{formatDuration(
																			(
																				selectedArtist as any
																			)
																				.musicTrack
																				.duration,
																		)}{" "}
																		{(
																			selectedArtist as any
																		)
																			.musicTrack
																			.tempo &&
																			`- Tempo: ${(
																				selectedArtist as any
																			)
																				.musicTrack
																				.tempo
																			}`}
																	</p>
																</div>
																<Badge variant="secondary">
																	Main
																	Track
																</Badge>
															</div>
															{(
																selectedArtist as any
															).musicTrack
																.notes && (
																	<p className="text-sm text-muted-foreground">
																		{
																			(
																				selectedArtist as any
																			)
																				.musicTrack
																				.notes
																		}
																	</p>
																)}
															{(
																selectedArtist as any
															).musicTrack
																.file_url && (
																	<div className="space-y-2">
																		<AudioPlayer
																			track={
																				(
																					selectedArtist as any
																				)
																					.musicTrack
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
																						(
																							selectedArtist as any
																						)
																							.musicTrack
																							.file_url,
																						`${selectedArtist.artist_name} - ${(selectedArtist as any).musicTrack.song_title || selectedArtist.artist_name}`,
																						selectedArtist.artist_name || (selectedArtist as any).realName
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
													) : (
														selectedArtist as any
													).musicTracks &&
														(
															selectedArtist as any
														).musicTracks.length >
														0 &&
														(
															selectedArtist as any
														).musicTracks.some(
															(track: any) =>
																track.file_url,
														) ? (
														/* Backward compatibility: handle old musicTracks array */
														(
															selectedArtist as any
														).musicTracks
															.filter(
																(
																	track: any,
																) =>
																	track.file_url,
															)
															.map(
																(
																	track: any,
																	index: number,
																) => (
																	<div
																		key={
																			index
																		}
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
																								selectedArtist.artist_name || (selectedArtist as any).realName
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
															No music tracks
															uploaded yet
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
													{/* Costume Colors - prioritize manual colors */}
													{((
														selectedArtist as any
													).manualCostumeColor ||
														(
															selectedArtist as any
														)
															.manualCostumeColorTwo ||
														(
															selectedArtist as any
														)
															.manualCostumeColorThree ||
														(
															selectedArtist as any
														).costumeColor) && (
															<div>
																<p className="text-sm text-muted-foreground mb-2">
																	Costume
																	Colors
																</p>
																<div className="space-y-2">
																	{/* Primary Costume Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualCostumeColor ||
																		(
																			selectedArtist as any
																		)
																			.costumeColor) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-purple-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualCostumeColor ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.costumeColor,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Primary:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualCostumeColor ||
																							(
																								selectedArtist as any
																							)
																								.costumeColor}
																					</span>
																				</span>
																			</div>
																		)}
																	{/* Secondary Costume Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualCostumeColorTwo ||
																		((
																			selectedArtist as any
																		)
																			.costumeColorTwo &&
																			(
																				selectedArtist as any
																			)
																				.costumeColorTwo !==
																			"none")) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-purple-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualCostumeColorTwo ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.costumeColorTwo,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Secondary:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualCostumeColorTwo ||
																							(
																								selectedArtist as any
																							)
																								.costumeColorTwo}
																					</span>
																				</span>
																			</div>
																		)}
																	{/* Third Costume Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualCostumeColorThree ||
																		((
																			selectedArtist as any
																		)
																			.costumeColorThree &&
																			(
																				selectedArtist as any
																			)
																				.costumeColorThree !==
																			"none")) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-purple-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualCostumeColorThree ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.costumeColorThree,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Third:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualCostumeColorThree ||
																							(
																								selectedArtist as any
																							)
																								.costumeColorThree}
																					</span>
																				</span>
																			</div>
																		)}
																</div>
															</div>
														)}
													{/* Lighting Colors - prioritize manual colors */}
													{((
														selectedArtist as any
													).manualLightColor ||
														(
															selectedArtist as any
														)
															.manualLightColorTwo ||
														(
															selectedArtist as any
														)
															.manualLightColorThree ||
														(
															selectedArtist as any
														)
															.lightColorSingle) && (
															<div className="pt-4 border-t">
																<p className="text-sm text-muted-foreground mb-2">
																	Lighting
																	Colors
																</p>
																<div className="space-y-2">
																	{/* Primary Light Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualLightColor ||
																		(
																			selectedArtist as any
																		)
																			.lightColorSingle) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-yellow-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualLightColor ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.lightColorSingle,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Primary:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualLightColor ||
																							(
																								selectedArtist as any
																							)
																								.lightColorSingle}
																					</span>
																				</span>
																			</div>
																		)}
																	{/* Secondary Light Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualLightColorTwo ||
																		((
																			selectedArtist as any
																		)
																			.lightColorTwo &&
																			(
																				selectedArtist as any
																			)
																				.lightColorTwo !==
																			"none")) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-yellow-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualLightColorTwo ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.lightColorTwo,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Secondary:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualLightColorTwo ||
																							(
																								selectedArtist as any
																							)
																								.lightColorTwo}
																					</span>
																				</span>
																			</div>
																		)}
																	{/* Third Light Color */}
																	{((
																		selectedArtist as any
																	)
																		.manualLightColorThree ||
																		((
																			selectedArtist as any
																		)
																			.lightColorThree &&
																			(
																				selectedArtist as any
																			)
																				.lightColorThree !==
																			"none")) && (
																			<div className="flex items-center gap-2">
																				<div
																					className="w-8 h-8 rounded-lg border-2 border-yellow-200 shadow-sm"
																					style={{
																						backgroundColor:
																							(
																								selectedArtist as any
																							)
																								.manualLightColorThree ||
																							getColorStyle(
																								(
																									selectedArtist as any
																								)
																									.lightColorThree,
																							),
																					}}
																				></div>
																				<span className="text-sm">
																					Third:{" "}
																					<span className="font-medium font-mono">
																						{(
																							selectedArtist as any
																						)
																							.manualLightColorThree ||
																							(
																								selectedArtist as any
																							)
																								.lightColorThree}
																					</span>
																				</span>
																			</div>
																		)}
																</div>
																{/* Trust the lighting designer message */}
																{!(
																	selectedArtist as any
																)
																	.manualLightColor &&
																	!(
																		selectedArtist as any
																	)
																		.manualLightColorTwo &&
																	!(
																		selectedArtist as any
																	)
																		.manualLightColorThree &&
																	(
																		selectedArtist as any
																	)
																		.lightColorSingle ===
																	"trust" && (
																		<p className="text-sm text-yellow-700 italic mt-2">
																			💡
																			Trust
																			the
																			Lighting
																			Designer
																		</p>
																	)}
															</div>
														)}
													{(selectedArtist as any)
														.lightRequests && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Special
																	Lighting
																	Requests
																</p>
																<p className="text-sm">
																	{
																		(
																			selectedArtist as any
																		)
																			.lightRequests
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
													{((
														selectedArtist as any
													).stagePositionStart ||
														(
															selectedArtist as any
														)
															.stagePositionEnd) && (
															<StagePositionPreview
																startPosition={
																	(
																		selectedArtist as any
																	)
																		.stagePositionStart ||
																	""
																}
																endPosition={
																	(
																		selectedArtist as any
																	)
																		.stagePositionEnd ||
																	""
																}
															/>
														)}
													{(selectedArtist as any)
														.stagePositionStart && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Starting
																	Position
																</p>
																<p className="font-medium capitalize">
																	{(
																		selectedArtist as any
																	).stagePositionStart.replace(
																		"-",
																		" ",
																	)}
																</p>
															</div>
														)}
													{(selectedArtist as any)
														.stagePositionEnd && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Ending
																	Position
																</p>
																<p className="font-medium capitalize">
																	{(
																		selectedArtist as any
																	).stagePositionEnd.replace(
																		"-",
																		" ",
																	)}
																</p>
															</div>
														)}
													{(selectedArtist as any)
														.customStagePosition && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Custom
																	Position
																	Details
																</p>
																<p className="text-sm">
																	{
																		(
																			selectedArtist as any
																		)
																			.customStagePosition
																	}
																</p>
															</div>
														)}
													{(selectedArtist as any)
														.equipment && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Props and
																	Equipment
																</p>
																<p className="text-sm">
																	{
																		(
																			selectedArtist as any
																		)
																			.equipment
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
													<CardTitle>
														MC Notes
													</CardTitle>
												</CardHeader>
												<CardContent>
													<p className="text-sm">
														{(
															selectedArtist as any
														).mcNotes ||
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
														{(
															selectedArtist as any
														)
															.stageManagerNotes ||
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
										{(selectedArtist as any)
											.rehearsalVideo && (
												<Card className="border-2 border-amber-100">
													<CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
														<CardTitle className="flex items-center gap-2">
															<Play className="h-5 w-5 text-amber-600" />
															Rehearsal / Show
															Video
														</CardTitle>
														<CardDescription>
															Video for show order
															planning and
															lighting setup
														</CardDescription>
													</CardHeader>
													<CardContent className="pt-4">
														<div className="max-w-2xl mx-auto">
															<VideoPlayer
																file={{
																	name: (
																		selectedArtist as any
																	)
																		.rehearsalVideo
																		.name,
																	type: "video",
																	url: (
																		selectedArtist as any
																	)
																		.rehearsalVideo
																		.url,
																	file_path: (
																		selectedArtist as any
																	)
																		.rehearsalVideo
																		.file_path,
																	size: (
																		selectedArtist as any
																	)
																		.rehearsalVideo
																		.size,
																	contentType:
																		(
																			selectedArtist as any
																		)
																			.rehearsalVideo
																			.contentType,
																}}
																className="aspect-video"
															/>
															<div className="flex items-center justify-between mt-2">
																<p className="text-sm text-gray-600">
																	{
																		(
																			selectedArtist as any
																		)
																			.rehearsalVideo
																			.name
																	}
																	{(
																		selectedArtist as any
																	)
																		.rehearsalVideo
																		.size && (
																			<span className="ml-2 text-gray-400">
																				(
																				{(
																					(
																						selectedArtist as any
																					)
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
																			(
																				selectedArtist as any
																			)
																				.rehearsalVideo
																				.url,
																			(
																				selectedArtist as any
																			)
																				.rehearsalVideo
																				.name,
																			selectedArtist.artist_name || (selectedArtist as any).realName
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
													Uploaded images and
													videos
												</CardDescription>
											</CardHeader>
											<CardContent>
												{(selectedArtist as any)
													.galleryFiles &&
													(selectedArtist as any)
														.galleryFiles.length >
													0 ? (
													<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
														{(
															selectedArtist as any
														).galleryFiles.map(
															(
																file: any,
																index: number,
															) => (
																<div
																	key={
																		index
																	}
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
																					selectedArtist.artist_name || (selectedArtist as any).realName
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
														No media files
														uploaded yet
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
														Event Name
													</p>
													<p className="font-medium text-lg">
														{event?.name}
													</p>
												</div>

												{selectedArtist.performance_date && (() => {
													const matchedPerformance = findAgreementPerformance(
														selectedArtist.agreement,
														selectedArtist.performance_date,
													);
													return (
														<div>
															<p className="text-sm text-muted-foreground">
																Assigned
																Performance Date
															</p>
															<p className="font-medium">
																{formatDateSimple(
																	selectedArtist.performance_date,
																)}
															</p>
															{matchedPerformance && (
																<div className="mt-2 space-y-1 rounded-lg border bg-muted/30 p-3">
																	{matchedPerformance.title && (
																		<p className="text-sm">
																			<span className="text-muted-foreground">Show: </span>
																			<span className="font-medium">{matchedPerformance.title}</span>
																		</p>
																	)}
																	{(matchedPerformance.time || matchedPerformance.endTime) && (
																		<p className="text-sm">
																			<span className="text-muted-foreground">Time: </span>
																			<span className="font-medium">
																				{[matchedPerformance.time, matchedPerformance.endTime]
																					.filter(Boolean)
																					.join(" – ")}
																			</span>
																		</p>
																	)}
																	{matchedPerformance.location && (
																		<p className="text-sm">
																			<span className="text-muted-foreground">Location: </span>
																			<span className="font-medium">{matchedPerformance.location}</span>
																		</p>
																	)}
																	{matchedPerformance.description && (
																		<p className="text-sm">
																			<span className="text-muted-foreground">Notes: </span>
																			<span className="font-medium">{matchedPerformance.description}</span>
																		</p>
																	)}
																</div>
															)}
														</div>
													);
												})()}
												<div>
													<p className="text-sm text-muted-foreground">
														Registration Date
													</p>
													<p className="font-medium">
														{new Date(
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
									onClick={() =>
										setIsDetailDialogOpen(false)
									}
								>
									Close
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{selectedArtist && (
						<InviteArtistDialog
							isOpen={isInviteDialogOpen}
							onOpenChange={setIsInviteDialogOpen}
							artist={selectedArtist}
							event={event}
							magicLink={(() => {
								const modules = [];
								const eventAny = event as any;
								if (eventAny?.contractEnabled !== false) modules.push('contract');
								if (eventAny?.logisticsEnabled !== false) modules.push('logistics');
								if (eventAny?.showInfoEnabled !== false) modules.push('showinfo');
								const modulesStr = modules.join(',');
								return typeof window !== 'undefined' ? `${window.location.origin}/famelink/invite?event=${eventId || 'unknown'}&artist=${selectedArtist?.id}${modulesStr ? `&modules=${modulesStr}` : ''}` : "";
							})()}
							modules={(() => {
								const modules = [];
								const eventAny = event as any;
								if (eventAny?.contractEnabled !== false) modules.push('contract');
								if (eventAny?.logisticsEnabled !== false) modules.push('logistics');
								if (eventAny?.showInfoEnabled !== false) modules.push('showinfo');
								return modules;
							})()}
						/>
					)}

					{/* Artist Status Dialog */}
					<ArtistStatusDialog
						open={isStatusDialogOpen}
						onOpenChange={setIsStatusDialogOpen}
						artistId={statusArtist?.id || ""}
						artistName={statusArtist?.artist_name || ""}
						eventId={eventId}
						currentStatus={statusArtist?.status || null}
						onStatusUpdated={handleStatusUpdated}
					/>

					{/* Hidden Items Dialog */}
					<Dialog
						open={isHiddenItemsDialogOpen}
						onOpenChange={setIsHiddenItemsDialogOpen}
					>
						<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<Archive className="h-5 w-5" />
									Hidden Artists ({hiddenArtists.length})
								</DialogTitle>
								<DialogDescription>
									Artists that have been hidden from the
									main list. Click "Unhide" to restore
									them.
								</DialogDescription>
							</DialogHeader>

							{hiddenArtists.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									No hidden artists
								</div>
							) : (
								<div className="space-y-3">
									{hiddenArtists.map((artist) => (
										<div
											key={
												artist.eventShowId ||
												artist.id
											}
											className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
										>
											<div className="flex-1">
												<div className="font-medium">
													{artist.artist_name}
												</div>
												<div className="text-sm text-muted-foreground">
													{artist.real_name} •{" "}
													{artist.style}
													{artist.performanceType && (
														<span className="ml-1">
															•{" "}
															{
																artist.performanceType
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
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													{artist.performance_date ? (
														<Badge
															variant="outline"
															className="text-xs"
														>
															Assigned:{" "}
															{formatDateSimple(
																artist.performance_date,
															)}
														</Badge>
													) : (
														<Badge
															variant="secondary"
															className="text-xs"
														>
															Submitted
															Application
														</Badge>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
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
													variant="default"
													size="sm"
													onClick={() =>
														unhideArtist(
															artist.eventShowId || artist.id,
															artist.artist_name,
														)
													}
													className="flex items-center gap-1"
												>
													<Eye className="h-4 w-4" />
													Unhide
												</Button>
											</div>
										</div>
									))}
								</div>
							)}

							<DialogFooter>
								<Button
									variant="outline"
									onClick={() =>
										setIsHiddenItemsDialogOpen(false)
									}
								>
									Close
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Add Artist Manually Dialog */}
					<Dialog
						open={isAddDialogOpen}
						onOpenChange={(open) => {
							setIsAddDialogOpen(open);
							if (!open) {
								// Reset form when closing
								setNewArtist({
									artist_name: "",
									real_name: "",
									email: "",
								});
								setCreatedArtistLink(null);
							}
						}}
					>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>
									{createdArtistLink
										? "Artist Registration Link"
										: "Add Artist Manually"}
								</DialogTitle>
								<DialogDescription>
									{createdArtistLink
										? "Share this link with the artist to complete their registration"
										: "Create a draft artist profile and generate a registration link"}
								</DialogDescription>
							</DialogHeader>

							{!createdArtistLink ? (
								<div className="space-y-4">
									<div>
										<Label htmlFor="artist_name">
											Artist Name{" "}
											<span className="text-red-500">
												*
											</span>
										</Label>
										<Input
											id="artist_name"
											value={newArtist.artist_name}
											onChange={(e) =>
												setNewArtist({
													...newArtist,
													artist_name:
														e.target.value,
												})
											}
											placeholder="Enter artist/stage name"
										/>
									</div>

									<div>
										<Label htmlFor="real_name">
											Real Name (Optional)
										</Label>
										<Input
											id="real_name"
											value={newArtist.real_name}
											onChange={(e) =>
												setNewArtist({
													...newArtist,
													real_name:
														e.target.value,
												})
											}
											placeholder="Enter real name"
										/>
									</div>

									<div>
										<Label htmlFor="email">
											Email{" "}
											<span className="text-red-500">
												*
											</span>
										</Label>
										<Input
											id="email"
											type="email"
											value={newArtist.email}
											onChange={(e) =>
												setNewArtist({
													...newArtist,
													email: e.target.value,
												})
											}
											placeholder="Enter email address"
										/>
									</div>

									<DialogFooter>
										<Button
											variant="outline"
											onClick={() =>
												setIsAddDialogOpen(false)
											}
										>
											Cancel
										</Button>
										<Button
											onClick={createArtistManually}
											disabled={creatingArtist}
										>
											{creatingArtist ? (
												<>
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
													Creating...
												</>
											) : (
												<>
													<Plus className="h-4 w-4 mr-2" />
													Create Draft
												</>
											)}
										</Button>
									</DialogFooter>
								</div>
							) : (
								<div className="space-y-6">
									{/* Artist Info */}
									<Card>
										<CardContent className="pt-6">
											<div className="space-y-2">
												<div>
													<p className="text-sm text-muted-foreground">
														Artist Name
													</p>
													<p className="font-medium">
														{
															createdArtistLink.artistName
														}
													</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">
														Email
													</p>
													<p className="font-medium">
														{
															createdArtistLink.email
														}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* QR Code */}
									<div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
										<p className="text-sm font-medium text-center">
											Scan QR Code to Register
										</p>
										<div className="bg-white p-4 rounded-lg shadow-sm">
											<QRCodeSVG
												value={
													createdArtistLink.registrationUrl
												}
												size={200}
												level="H"
												includeMargin={true}
											/>
										</div>
									</div>

									{/* Registration Link */}
									<div className="space-y-2">
										<Label>Registration Link</Label>
										<div className="flex gap-2">
											<Input
												value={
													createdArtistLink.registrationUrl
												}
												readOnly
												className="font-mono text-sm"
											/>
											<Button
												variant="outline"
												onClick={() => {
													navigator.clipboard.writeText(
														createdArtistLink.registrationUrl,
													);
													toast({
														title: "📋 Link Copied",
														description:
															"Registration link copied to clipboard",
													});
												}}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</div>
									</div>

									{/* WhatsApp Share */}
									<div className="flex gap-2">
										<Button
											variant="outline"
											className="flex-1"
											onClick={() => {
												const message = `Hi ${createdArtistLink.artistName}! 🎭\n\nPlease complete your artist registration for ${event?.name || "our event"}:\n\n${createdArtistLink.registrationUrl}\n\nLooking forward to your performance! ✨`;
												const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
												window.open(
													whatsappUrl,
													"_blank",
												);
											}}
										>
											<WhatsAppIcon className="h-4 w-4 mr-2" />
											Share via WhatsApp
										</Button>
										<Button
											variant="outline"
											className="flex-1"
											onClick={() => {
												const subject = `Complete Your Artist Registration - ${event?.name || "Event"}`;
												const body = `Hi ${createdArtistLink.artistName},\n\nPlease complete your artist registration by clicking the link below:\n\n${createdArtistLink.registrationUrl}\n\nBest regards,\n${event?.name || "Event"} Team`;
												const mailtoUrl = `mailto:${createdArtistLink.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
												window.location.href =
													mailtoUrl;
											}}
										>
											<Mail className="h-4 w-4 mr-2" />
											Send via Email
										</Button>
									</div>

									<DialogFooter>
										<Button
											onClick={() => {
												setIsAddDialogOpen(false);
												setCreatedArtistLink(null);
												setNewArtist({
													artist_name: "",
													real_name: "",
													email: "",
												});
											}}
										>
											Done
										</Button>
									</DialogFooter>
								</div>
							)}
						</DialogContent>
					</Dialog>
				</div>
			</main>
		</div>
	);
}
