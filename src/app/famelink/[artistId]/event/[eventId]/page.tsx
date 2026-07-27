"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	User,
	Music,
	Image,
	Calendar,
	MapPin,
	Mail,
	Globe,
	Instagram,
	Facebook,
	Youtube,
	Play,
	Lightbulb,
	Palette,
	Navigation,
	ArrowLeft,
	Clock,
	Timer,
	AlertTriangle,
	Users,
	Mic,
	Video,
	Speaker,
	Trash2,
	CheckCircle,
	Sparkles,
	AlertCircle,
	Loader2,
	Edit,
	Phone,
	MessageSquare,
	X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { formatDuration, calculateLiveTimings } from "@/lib/timing-utils";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { ArtistChatButton } from "@/components/ArtistChatButton";
import {
	WhatsAppIcon,
	WhatsAppLink,
	EmailLink,
} from "@/components/ui/whatsapp-input";
import { WhatsAppHelpButton } from "@/components/WhatsAppHelpButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateSimple } from "@/lib/date-utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/NotificationBell";
import { ShowDateInfoCard } from "@/components/ShowDateInfoCard";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { isLightColor } from "@/components/ui/cue-color-picker";
import { MembershipCard } from "@/components/MembershipCard";
import { ArtistCallNotification } from "@/components/ArtistCallNotification";
import { StagePositionPreview } from "@/components/StagePositionPreview";

// â”€â”€â”€ Interfaces â”€â”€â”€

interface EventInfo {
	id: string;
	name: string;
	venueName: string;
	startDate: string;
	endDate: string;
	description?: string;
	logoUrl?: string | null;
	showDates?: string[];
	artist_edit_enabled?: boolean;
	stageManagerEmail?: string;
	stageManagerPhone?: string;
}

interface ShowSnapshot {
	name: string;
	slug?: string;
	style?: string;
	performanceType?: string;
	duration: number;
	description?: string;
	biography?: string;
	profileImage?: string;
	realName?: string;
	email?: string;
	phone?: string;
	countryLiving?: string;
	homeCountry?: string;
	costumeColor?: string;
	customCostumeColor?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightRequests?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	customStagePosition?: string;
	musicTrack?: {
		file_url: string;
		file_path: string;
		duration: number;
		notes: string;
		tempo: string;
	};
	musicTracks?: Array<{
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
		file_path?: string;
	}>;
	galleryFiles?: Array<{
		url: string;
		type: "image" | "video";
		name: string;
		file_path?: string;
		size?: number;
		contentType?: string;
	}>;
	rehearsalVideo?: {
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	} | null;
	equipment?: string;
	showLink?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
	tshirtSizes?: Array<{
		name: string;
		size: string;
		fit: "oversized" | "regular";
	}>;
	artistsPageTag?: string;
	artistsPageColor?: string;
}

interface EventShowData {
	eventShowId: string;
	baseShowId: string;
	showName: string;
	snapshot: ShowSnapshot;
	overrides: Record<string, unknown>;
	status: string;
	performanceStatus: string;
	snapshotCreatedAt: string;
}

interface LiveBoardArtist {
	id: string;
	artist_name: string;
	style: string;
	image_url?: string;
	performance_order: number | null;
	performance_duration: number;
	actual_duration?: number | null;
	performance_status?: string | null;
	performance_date?: string | null;
	mc_notes?: string | null;
	backstage_color?: string;
}

interface LiveBoardCue {
	id: string;
	type: string;
	title: string;
	duration: number;
	extraTime?: number; // buffer time in seconds, added on top of duration
	performance_order: number;
	notes?: string;
	color?: string;
	performance_status?: string | null;
	is_completed?: boolean;
}

interface PerformanceItem {
	id: string;
	type: "artist" | "cue";
	artist?: LiveBoardArtist;
	cue?: LiveBoardCue;
	performance_order: number;
	status?: string | null;
}

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
}

// Memoized Music Track Player â”€â”€â”€
const MusicTrackPlayer = memo(
	({
		track,
		index,
		profileId,
	}: {
		track: {
			song_title: string;
			duration: number;
			notes: string;
			is_main_track: boolean;
			tempo: string;
			file_url: string;
			file_path?: string;
		};
		index: number;
		profileId: string;
	}) => (
		<div className="border rounded-lg p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<h4 className="font-medium">{track.song_title}</h4>
					<p className="text-sm text-muted-foreground">
						Duration: {formatDuration(track.duration)} - Tempo:{" "}
						{track.tempo}
					</p>
				</div>
				{track.is_main_track && (
					<Badge variant="secondary">Main Track</Badge>
				)}
			</div>
			{track.notes && (
				<p className="text-sm text-muted-foreground">{track.notes}</p>
			)}
			{track.file_url && (
				<AudioPlayer
					track={track}
					onError={(error: any) =>
						console.error("Audio error:", error)
					}
				/>
			)}
		</div>
	),
	(prev, next) =>
		prev.track.file_url === next.track.file_url &&
		prev.track.song_title === next.track.song_title &&
		prev.profileId === next.profileId,
);
MusicTrackPlayer.displayName = "MusicTrackPlayer";

// â”€â”€â”€ Main Component â”€â”€â”€

export default function FameLinkEventDashboard({
	overrideArtistId,
	overrideEventId,
	overrideEventShowId,
	hideHeader = false,
}: {
	overrideArtistId?: string;
	overrideEventId?: string;
	overrideEventShowId?: string;
	hideHeader?: boolean;
} = {}) {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const artistId = overrideArtistId || (params.artistId as string);
	const eventId = overrideEventId || (params.eventId as string);
	const selectedEventShowId = overrideEventShowId || searchParams.get("eventShowId") || "";
	const isStageManagerView = searchParams.get("viewer") === "stage_manager";
	const effectiveHideHeader = hideHeader;
	const toastRef = useRef(toast);
	useEffect(() => {
		toastRef.current = toast;
	}, [toast]);

	// Core state
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<EventInfo | null>(null);
	const [myShows, setMyShows] = useState<EventShowData[]>([]);
	const [participationStatus, setParticipationStatus] = useState<
		string | null
	>(null);
	const [activeTab, setActiveTab] = useState("liveboard");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [activeCall, setActiveCall] = useState<any>(null);

	// Listen for dismiss events
	useEffect(() => {
		const handleDismiss = () => {
			setActiveCall(null);
		};
		window.addEventListener("artist_call_dismiss", handleDismiss);
		return () => {
			window.removeEventListener("artist_call_dismiss", handleDismiss);
		};
	}, []);

	// Show Update / Change Selection Dialog state & functions
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [baseShows, setBaseShows] = useState<any[]>([]);
	const [loadingBaseShows, setLoadingBaseShows] = useState(false);
	const [selectedBaseShowIds, setSelectedBaseShowIds] = useState<string[]>([]);
	const [submittingShows, setSubmittingShows] = useState(false);

	const fetchBaseShows = useCallback(async () => {
		setLoadingBaseShows(true);
		try {
			const res = await fetch(`/api/shows?artistId=${artistId}`);
			if (res.ok) {
				const result = await res.json();
				if (result.success && result.data) {
					const data = result.data.shows || result.data;
					setBaseShows(Array.isArray(data) ? data : []);
				}
			}
		} catch (err) {
			console.error("Error fetching base shows:", err);
		} finally {
			setLoadingBaseShows(false);
		}
	}, [artistId]);

	// Initialize selected base show IDs when myShows updates
	useEffect(() => {
		if (myShows.length > 0) {
			setSelectedBaseShowIds(myShows.map(s => s.baseShowId).filter(Boolean));
		} else {
			setSelectedBaseShowIds([]);
		}
	}, [myShows]);

	const handleSubmitShows = async () => {
		setSubmittingShows(true);
		try {
			// Find which base shows to submit
			const showsToSubmit = selectedBaseShowIds.filter(
				(id) => !myShows.some((es) => es.baseShowId === id)
			);
			// Find which event shows to remove
			const showsToRemove = myShows.filter(
				(es) => es.baseShowId && !selectedBaseShowIds.includes(es.baseShowId)
			);

			// Submit new shows
			for (const baseShowId of showsToSubmit) {
				const res = await fetch("/api/event-shows", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						eventId,
						baseShowId,
					}),
				});
				if (!res.ok) {
					const data = await res.json();
					console.error("Failed to submit show:", data.error?.message || res.statusText);
				}
			}

			// Remove deselected shows
			for (const es of showsToRemove) {
				const res = await fetch(`/api/event-shows/${es.eventShowId}`, {
					method: "DELETE",
				});
				if (!res.ok) {
					console.error("Failed to delete show:", res.statusText);
				}
			}

			toast({
				title: "Shows Updated",
				description: "Successfully updated your submitted shows for this event.",
			});
			setShowUpdateModal(false);

			// Refresh event data to reflect changes
			await fetchEventData();
		} catch (err) {
			console.error("Error updating shows:", err);
			toast({
				title: "Error",
				description: "Failed to update shows.",
				variant: "destructive",
			});
		} finally {
			setSubmittingShows(false);
		}
	};

	// Artist edit enabled state
	const [artistEditEnabled, setArtistEditEnabled] = useState<boolean>(false);
	const [showEditBlockedDialog, setShowEditBlockedDialog] = useState(false);

	// Check-in state
	const [rehearsalCheckedIn, setRehearsalCheckedIn] = useState(false);
	const [performanceCheckedIn, setPerformanceCheckedIn] = useState(false);

	// Live Board state
	const [performanceItems, setPerformanceItems] = useState<PerformanceItem[]>(
		[],
	);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [wsConnected, setWsConnected] = useState(false);
	const [currentTime, setCurrentTime] = useState<Date | null>(null);
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
	const [elapsedTime, setElapsedTime] = useState(0);
	const [currentPerformerIndex, setCurrentPerformerIndex] = useState(0);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isDraftShowOrder, setIsDraftShowOrder] = useState(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] = useState(false);
	const [assignedArtists, setAssignedArtists] = useState<
		Array<{
			id: string;
			artistName: string;
			realName: string;
			style: string;
			actual_duration?: number;
		}>
	>([]);
	const [rehearsalArtists, setRehearsalArtists] = useState<
		Array<{
			id: string;
			artist_name: string;
			style: string;
			rehearsal_order: number | null;
			rehearsal_completed: boolean;
			rehearsal_date: string | null;
			performance_date: string | null;
			image_url: string;
		}>
	>([]);
	const [rehearsalLoading, setRehearsalLoading] = useState(false);

	// Derived data from EventShow snapshot (read-only, never modified)
	const myShow = useMemo(() => {
		if (selectedEventShowId) {
			const found = myShows.find(
				(s) => s.eventShowId === selectedEventShowId,
			);
			if (found) return found;
		}
		return myShows[0];
	}, [myShows, selectedEventShowId]);
	const snapshot = useMemo(() => {
		if (!myShow?.snapshot) return undefined;
		const snap = myShow.snapshot;
		const ov = (myShow.overrides || {}) as any;
		return {
			...snap,
			...ov,
			socialMedia: {
				...snap.socialMedia,
				...ov.socialMedia,
			},
		} as ShowSnapshot;
	}, [myShow]);
	const myPerformanceDate =
		(myShow?.overrides as any)?.performanceDate || null;
	const profileId = useMemo(
		() => myShow?.eventShowId || artistId,
		[myShow?.eventShowId, artistId],
	);

	const musicTracks = useMemo(() => {
		if (!snapshot) return [];
		if (snapshot.musicTracks && snapshot.musicTracks.length > 0)
			return snapshot.musicTracks;
		if (snapshot.musicTrack?.file_url || snapshot.musicTrack?.file_path) {
			const t = snapshot.musicTrack;
			return [
				{
					song_title: snapshot.name || "Track",
					duration: t.duration || 0,
					notes: t.notes || "",
					is_main_track: true,
					tempo: t.tempo || "",
					file_url: t.file_url || t.file_path || "",
					file_path: t.file_path || t.file_url || "",
				},
			];
		}
		return [];
	}, [snapshot]);

	// â”€â”€â”€ Helpers â”€â”€â”€
	const getMediaUrl = (url: string, filePath?: string): string => {
		if (!url) return "";
		if (url.startsWith("gs://")) {
			if (filePath) return `/api/media/${filePath}`;
			const match = url.match(/^gs:\/\/[^/]+\/(.+)$/);
			if (match) return `/api/media/${match[1]}`;
			return url;
		}
		if (url.startsWith("/")) return url;
		return `/api/media/${url}`;
	};

	const getCueIcon = (cueType: string) => {
		const map: Record<string, any> = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return map[cueType] || Video;
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

	const formatTimeDisplay = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${h}h ${m}m ${s}s`;
	};

	const formatCurrentTime = (date: Date | null) => {
		if (!date) return "--:--:--";
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	};

	const calculateTotalShowTime = () =>
		performanceItems.reduce((total, item) => {
			if (item.type === "artist" && item.artist)
				return total + (item.artist.performance_duration || 0);
			if (item.type === "cue" && item.cue)
				return total + (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
			return total;
		}, 0);

	const calculateRemainingTime = () => {
		const remaining = performanceItems
			.slice(currentPerformerIndex)
			.reduce((total, item) => {
				if (item.type === "artist" && item.artist)
					return total + (item.artist.performance_duration || 0);
				if (item.type === "cue" && item.cue)
					return total + (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
				return total;
			}, 0);
		return Math.max(0, remaining - elapsedTime);
	};

	// â”€â”€â”€ Data Fetching â”€â”€â”€
	const fetchCheckInStatus = useCallback(async () => {
		try {
			const res = await fetch(
				`/api/events/${eventId}/check-in?artistId=${artistId}`,
			);
			if (res.ok) {
				const data = await res.json();
				if (data.success && data.data) {
					setRehearsalCheckedIn(!!data.data.rehearsal?.checkedIn);
					setPerformanceCheckedIn(!!data.data.performance?.checkedIn);
				}
			}
		} catch (err) {
			console.error("Error fetching check-in status:", err);
		}
	}, [eventId, artistId]);

	const fetchEventData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch(
				`/api/artist-event-view/${eventId}?artistId=${artistId}`,
			);
			const data = await res.json();
			if (data.success) {
				setEvent(data.data.event);
				setMyShows(data.data.myShows || []);
				setParticipationStatus(data.data.participation?.status || null);
				// Store artist_edit_enabled setting
				setArtistEditEnabled(
					data.data.event?.artist_edit_enabled ?? false,
				);
				// Load initial check-in status
				await fetchCheckInStatus();
			} else {
				setError(data.error?.message || "Failed to load event view");
			}
		} catch {
			setError("Failed to load event data");
		} finally {
			setLoading(false);
		}
	}, [eventId, artistId, fetchCheckInStatus]);

	useEffect(() => {
		fetchEventData();
	}, [fetchEventData]);

	// Real-time clock
	useEffect(() => {
		setCurrentTime(new Date());
		const timer = setInterval(() => {
			setCurrentTime(new Date());
			setElapsedTime((p) => p + 1);
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		setElapsedTime(0);
	}, [currentPerformerIndex]);

	// Set selected date from performance date override
	useEffect(() => {
		if (myPerformanceDate) {
			setSelectedPerformanceDate(
				myPerformanceDate.includes("T")
					? myPerformanceDate.split("T")[0]
					: myPerformanceDate,
			);
		} else {
			setSelectedPerformanceDate("");
		}
	}, [myPerformanceDate]);

	// Fetch base shows when selection modal opens
	useEffect(() => {
		if (showUpdateModal) {
			fetchBaseShows();
		}
	}, [showUpdateModal, fetchBaseShows]);

	// Synchronize URL query parameter with the active show
	useEffect(() => {
		if (myShows.length > 0 && !overrideEventShowId) {
			const currentParam = searchParams.get("eventShowId");
			const newParams = new URLSearchParams(searchParams.toString());
			let needsRedirect = false;

			if (!currentParam) {
				newParams.set("eventShowId", myShows[0].eventShowId);
				needsRedirect = true;
			} else {
				const isValid = myShows.some((s) => s.eventShowId === currentParam);
				if (!isValid) {
					newParams.set("eventShowId", myShows[0].eventShowId);
					needsRedirect = true;
				}
			}

			if (needsRedirect) {
				router.replace(`/famelink/${artistId}/event/${eventId}?${newParams.toString()}`, { scroll: false });
			}
		}
	}, [myShows, searchParams, artistId, eventId, router, overrideEventShowId]);

	// Load live board data
	useEffect(() => {
		if (!eventId || !selectedPerformanceDate) return;

		const loadLiveBoardData = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}/artists`);
				if (!response.ok) return;
				const data = await response.json();
				if (!data.success) return;

				const artists = (data.data || []).map((a: any) => ({
					id: a.id,
					artist_name: a.artistName || a.artist_name,
					style: a.style,
					image_url: a.image_url || "",
					performance_duration:
						a.performanceDuration || a.performance_duration || 5,
					actual_duration:
						a.musicTracks?.find((t: any) => t.is_main_track)
							?.duration || null,
					performance_order: a.performance_order || null,
					performance_status: a.performance_status || null,
					performance_date: a.performanceDate || a.performance_date,
					mc_notes: a.mc_notes,
					backstage_color: a.backstage_color || undefined,
				}));

				const normalizedSelected = selectedPerformanceDate.includes("T")
					? selectedPerformanceDate.split("T")[0]
					: selectedPerformanceDate;
				const filtered = artists.filter((a: LiveBoardArtist) => {
					if (!a.performance_date) return false;
					const d = a.performance_date.includes("T")
						? a.performance_date.split("T")[0]
						: a.performance_date;
					return d === normalizedSelected;
				});

				const artistItems = filtered
					.filter(
						(a: LiveBoardArtist) =>
							a.performance_order !== null ||
							(a.performance_status &&
								a.performance_status !== "not_started"),
					)
					.map((artist: LiveBoardArtist) => ({
						id: artist.id,
						type: "artist" as const,
						artist,
						performance_order: artist.performance_order || 0,
						status: artist.performance_status || "not_started",
					}));

				let cueItems: PerformanceItem[] = [];
				try {
					const cuesRes = await fetch(
						`/api/events/${eventId}/cues?performanceDate=${normalizedSelected}`,
					);
					if (cuesRes.ok) {
						const cuesResult = await cuesRes.json();
						if (cuesResult.success) {
							cueItems = cuesResult.data.map((cue: any) => ({
								id: cue.id,
								type: "cue" as const,
								cue: { ...cue },
								performance_order: cue.performance_order,
								status:
									cue.performance_status ||
									(cue.is_completed
										? "completed"
										: "not_started"),
							}));
						}
					}
				} catch { }

				const allItems = [...artistItems, ...cueItems].sort(
					(a, b) => a.performance_order - b.performance_order,
				);
				setPerformanceItems(allItems);

				const ci = allItems.findIndex(
					(item) => item.status === "currently_on_stage",
				);
				if (ci !== -1) setCurrentPerformerIndex(ci);
			} catch (err) {
				console.error("Error fetching live board:", err);
			}
		};

		const loadShowOrderMeta = async () => {
			try {
				const normalizedSelected = selectedPerformanceDate.includes("T")
					? selectedPerformanceDate.split("T")[0]
					: selectedPerformanceDate;
				const soRes = await fetch(
					`/api/events/${eventId}/show-order?performanceDate=${normalizedSelected}`,
				);
				if (soRes.ok) {
					const soResult = await soRes.json();
					if (soResult.success && soResult.data) {
						setIsDraftShowOrder(soResult.data.isDraft !== false);
						setIsShowOrderConfirmed(
							soResult.data.isConfirmed === true,
						);
					}
				}
			} catch { }
		};

		const loadEmergencyBroadcasts = async () => {
			try {
				const res = await fetch(
					`/api/events/${eventId}/emergency-broadcasts`,
				);
				if (res.ok) {
					const d = await res.json();
					if (d.success) setEmergencyBroadcasts(d.data || []);
				}
			} catch { }
		};

		const loadEventTimings = async () => {
			try {
				const nd = selectedPerformanceDate.includes("T")
					? selectedPerformanceDate.split("T")[0]
					: selectedPerformanceDate;
				const res = await fetch(
					`/api/events/${eventId}/timing-settings?performanceDate=${nd}`,
				);
				if (res.ok) {
					const r = await res.json();
					if (r.success && r.data) {
						setEventTimings({
							backstage_ready_time: r.data.backstage_ready_time,
							show_start_time: r.data.show_start_time,
							rehearsal_start_time: r.data.rehearsal_start_time,
						});
						setTimeOverrides(r.data.time_overrides || {});
						setRehearsalTimeOverrides(
							r.data.rehearsal_time_overrides || {},
						);
					}
				}
			} catch { }
		};

		loadLiveBoardData();
		loadShowOrderMeta();
		loadEmergencyBroadcasts();
		loadEventTimings();
	}, [eventId, selectedPerformanceDate, refreshTrigger]);

	// WebSocket for real-time updates
	useEffect(() => {
		if (!eventId) return;
		let wsManager: any = null;
		const init = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");
				wsManager = createWebSocketManager({
					eventId,
					role: "artist",
					userId: `famelink_${artistId}`,
					showToasts: true,
					onConnect: () => setWsConnected(true),
					onDisconnect: () => setWsConnected(false),
					onDataUpdate: () =>
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500),
				});
				await wsManager.initialize();

				if (wsManager.socket) {
					wsManager.socket.on(
						"show_date_info_updated",
						(data: any) => {
							if (data.eventId === eventId)
								setRefreshTrigger((p) => p + 1);
						},
					);
				}

				wsManager.on("show-order-updated", (data: any) => {
					if (data.eventId === eventId) {
						if (data.isDraft !== undefined)
							setIsDraftShowOrder(data.isDraft);
						if (data.isConfirmed !== undefined)
							setIsShowOrderConfirmed(data.isConfirmed);
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
					}
				});

				wsManager.on("artist_assigned", (data: any) => {
					if (data.artistId === artistId) {
						fetchEventData();
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
						toastRef.current({
							title: "ðŸŽ‰ You've Been Assigned!",
							description: "Check your Live Board for details.",
						});
					}
				});
				wsManager.on("artist_unassigned", (data: any) => {
					if (data.artistId === artistId) {
						fetchEventData();
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
						toastRef.current({
							title: "ðŸ“… Schedule Change",
							description:
								"Your performance date has been updated.",
						});
					}
				});
				wsManager.on("new_chat_message", (data: any) =>
					window.dispatchEvent(
						new CustomEvent("new_chat_message", { detail: data }),
					),
				);
				wsManager.on("new_personal_message", (data: any) => {
					if (data.artistId === artistId) {
						toastRef.current({
							title: "ðŸ”’ Personal Message",
							description:
								"You have received a private message from the stage manager.",
							variant: "default",
						});
						window.dispatchEvent(
							new CustomEvent("new_personal_message", {
								detail: data,
							}),
						);
					}
				});
				wsManager.on("cue_updated", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});
				wsManager.on("artist_info_updated", (data: any) => {
					if (
						data.artistId === artistId &&
						data.action === "force_logout"
					) {
						localStorage.removeItem("artistSession");
						setShowLogoutDialog(true);
						setTimeout(() => router.push("/famelink/login"), 5000);
					}
				});
				wsManager.on("artist_color_updated", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});
				wsManager.on("timing-settings-updated", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});

				// Listen for event setting changes (artist_edit_enabled toggle)
				wsManager.on("event_setting_changed", (data: any) => {
					if (
						data.eventId === eventId &&
						data.field === "artist_edit_enabled"
					) {
						setArtistEditEnabled(data.value);
						toastRef.current({
							title: data.value
								? "✏️ Editing Enabled"
								: "🔒 Editing Disabled",
							description: data.value
								? "The stage manager has enabled profile editing."
								: "The stage manager has disabled profile editing.",
							variant: "default",
						});
					}
				});

				// Listen for rehearsal updates (reorder, schedule, remove, completion)
				wsManager.on("rehearsal_updated", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});

				// Listen for artist/cue completion toggles (checkmarks on show order)
				wsManager.on("artist_completion_toggled", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});
				wsManager.on("cue_completion_toggled", (data: any) => {
					if (data.eventId === eventId)
						setTimeout(() => setRefreshTrigger((p) => p + 1), 500);
				});

				// Listen for call events and dispatch to ArtistCallNotification
				wsManager.on("artist_called", (data: any) => {
					console.log("[FameLink Page] WebSocket received 'artist_called' event:", data);
					const dataArtistId = data?.artistId || "";
					const currentArtistId = artistId || "";
					const dataEventId = data?.eventId || "";
					const currentEventId = eventId || "";

					if (
						dataEventId.toLowerCase() === currentEventId.toLowerCase() &&
						dataArtistId.toLowerCase() === currentArtistId.toLowerCase()
					) {
						console.log("[FameLink Page] Match! Dispatching 'artist_called' custom event to window.");
						window.dispatchEvent(
							new CustomEvent("artist_called", { detail: data }),
						);
						setActiveCall(data);
					} else {
						console.log("[FameLink Page] Mismatch. Expected:", { artistId: currentArtistId, eventId: currentEventId }, "Got:", { artistId: dataArtistId, eventId: dataEventId });
					}
				});

				// Listen for check-in updates
				wsManager.on("artist_checked_in", (data: any) => {
					if (
						data.eventId === eventId &&
						data.artistId === artistId
					) {
						if (data.type === "rehearsal")
							setRehearsalCheckedIn(!!data.checkedIn);
						if (data.type === "performance")
							setPerformanceCheckedIn(!!data.checkedIn);
						toastRef.current({
							title:
								data.type === "rehearsal"
									? data.checkedIn ? "✅ Rehearsal Check-In" : "❌ Rehearsal Checked Out"
									: data.checkedIn ? "✅ Performance Check-In" : "❌ Performance Checked Out",
							description:
								data.checkedIn ? "You have been checked in successfully!" : "You have been checked out.",
						});
					}
				});

				(window as any).fameLinkWsManager = wsManager;
			} catch {
				setWsConnected(false);
			}
		};
		init();
		return () => {
			if ((window as any).fameLinkWsManager) {
				const wm = (window as any).fameLinkWsManager;
				[
					"show-order-updated",
					"artist_assigned",
					"artist_unassigned",
					"new_chat_message",
					"new_personal_message",
					"cue_updated",
					"artist_info_updated",
					"artist_color_updated",
					"timing-settings-updated",
					"event_setting_changed",
					"rehearsal_updated",
					"artist_completion_toggled",
					"cue_completion_toggled",
					"artist_called",
					"artist_checked_in",
				].forEach((e) => wm.off(e));
				wm.destroy();
				delete (window as any).fameLinkWsManager;
			}
		};
	}, [eventId, artistId, router, fetchEventData]);

	// Fetch assigned artists
	useEffect(() => {
		if (!eventId || !myPerformanceDate) {
			setAssignedArtists([]);
			return;
		}
		const go = async () => {
			try {
				const res = await fetch(`/api/events/${eventId}/artists`);
				if (!res.ok) return;
				const data = await res.json();
				if (!data.success) return;
				const myDate = myPerformanceDate.includes("T")
					? myPerformanceDate.split("T")[0]
					: myPerformanceDate;
				const artists = (data.data || [])
					.filter((a: any) => {
						const d = a.performanceDate || a.performance_date || "";
						return (
							(d.includes("T") ? d.split("T")[0] : d) === myDate
						);
					})
					.map((a: any) => {
						let mt = a.musicTracks;
						if (
							a.musicTrack &&
							(a.musicTrack.file_url || a.musicTrack.duration) &&
							(!mt || !mt.length)
						) {
							mt = [
								{
									duration: a.musicTrack.duration || 0,
									is_main_track: true,
								},
							];
						}
						return {
							id: a.id,
							artistName: a.artistName || a.artist_name,
							realName: a.realName || a.real_name || "",
							style: a.style,
							actual_duration:
								mt?.find((t: any) => t.is_main_track)
									?.duration || null,
						};
					});
				setAssignedArtists(artists);
			} catch {
				setAssignedArtists([]);
			}
		};
		go();
	}, [eventId, myPerformanceDate, refreshTrigger]);

	// Fetch rehearsal schedule
	useEffect(() => {
		if (!eventId || !selectedPerformanceDate) {
			setRehearsalArtists([]);
			return;
		}
		setRehearsalLoading(true);
		const go = async () => {
			try {
				const res = await fetch(`/api/events/${eventId}/artists`);
				if (!res.ok) return;
				const data = await res.json();
				if (!data.success) return;
				const sd = selectedPerformanceDate.includes("T")
					? selectedPerformanceDate.split("T")[0]
					: selectedPerformanceDate;
				const all = (data.data || [])
					.filter((a: any) => {
						if (!a.rehearsal_date || a.rehearsal_order === null) return false;
						const rd = a.rehearsal_date;
						const normalizedRd = rd.includes("T") ? rd.split("T")[0] : rd;
						return normalizedRd === sd;
					})
					.map((a: any) => ({
						id: a.id,
						artist_name: a.artistName || a.artist_name,
						style: a.style || "",
						rehearsal_order: a.rehearsal_order ?? null,
						rehearsal_completed: a.rehearsal_completed || false,
						rehearsal_date: a.rehearsal_date || null,
						performance_date:
							a.performanceDate || a.performance_date,
						image_url: a.image_url || "",
					}))
					.sort((a: any, b: any) => {
						return (a.rehearsal_order || 0) - (b.rehearsal_order || 0);
					});
				setRehearsalArtists(all);
			} catch {
			} finally {
				setRehearsalLoading(false);
			}
		};
		go();
	}, [eventId, selectedPerformanceDate, refreshTrigger]);

	// WebSocket toast listener
	useEffect(() => {
		const handler = (e: Event) => {
			const { title, description, variant } = (e as CustomEvent).detail;
			toastRef.current({
				title,
				description,
				variant: variant || "default",
			});
		};
		window.addEventListener("websocket-toast", handler);
		return () => window.removeEventListener("websocket-toast", handler);
	}, []);

	// â”€â”€â”€ Loading / Error â”€â”€â”€
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
					<h2 className="text-xl font-semibold mb-2">Error</h2>
					<p className="text-muted-foreground mb-4">
						{error || "Event not found"}
					</p>
					<div className="space-x-2">
						<Button
							onClick={() => {
								// If opened in a new tab (by stage manager), close the tab
								// Otherwise navigate back to the artist's FameLink dashboard
								if (window.history.length <= 1) {
									window.close();
								} else {
									router.back();
								}
							}}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</Button>
						<Button variant="outline" onClick={fetchEventData}>
							Try Again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// â”€â”€â”€ Render â”€â”€â”€
	return (
		<div className={effectiveHideHeader ? "w-full bg-white text-slate-900" : "min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-8"}>
			{/* Sticky Call Alert Banner */}
			{activeCall && (
				<div className="bg-red-600 text-white font-bold text-center px-4 py-3 flex items-center justify-between shadow-lg animate-bounce duration-1000 z-50 sticky top-0">
					<div className="flex items-center gap-2 mx-auto">
						<Phone className="h-5 w-5 animate-pulse" />
						<span>
							🚨 {activeCall.callType === "rehearsal" ? "REHEARSAL CALL" : "STAGE CALL"}: You are being called to the {activeCall.callType === "rehearsal" ? "Rehearsal area" : "Stage"} immediately!
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="text-white hover:bg-red-700 h-8 px-2 ml-auto shrink-0 border border-white/20"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent("artist_call_dismiss")
							);
							setActiveCall(null);
						}}
					>
						<X className="h-4 w-4 mr-1" />
						Dismiss
					</Button>
				</div>
			)}
			<ArtistCallNotification artistId={artistId} eventId={eventId} />
			{/* Logout Dialog */}
			<Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600">
							<AlertTriangle className="h-5 w-5" />
							Session Expired
						</DialogTitle>
						<DialogDescription className="space-y-3 pt-4">
							<p className="text-base font-medium">
								Your profile has been updated by the stage
								manager.
							</p>
							<p className="text-sm text-muted-foreground">
								You will be redirected in a few seconds...
							</p>
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 mt-4">
						<Button
							onClick={() => router.push("/famelink/login")}
							className="bg-red-600 hover:bg-red-700"
						>
							Go to Login
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Blocked Dialog */}
			<Dialog
				open={showEditBlockedDialog}
				onOpenChange={setShowEditBlockedDialog}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-amber-600">
							<AlertTriangle className="h-5 w-5" />
							Event is Closed
						</DialogTitle>
						<DialogDescription className="space-y-4 pt-4">
							<p className="text-base font-medium text-gray-800">
								If you want to edit or update your information,
								you need to contact the stage manager.
							</p>
							<div className="space-y-3 bg-gray-50 rounded-lg p-4">
								{event?.stageManagerEmail && (
									<div className="flex items-center gap-3">
										<Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
										<a
											href={`mailto:${event.stageManagerEmail}`}
											className="text-purple-600 hover:underline text-sm break-all"
										>
											{event.stageManagerEmail}
										</a>
									</div>
								)}
								<div className="flex items-center gap-3">
									<Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
									<a
										href="tel:+971528411575"
										className="text-purple-600 hover:underline text-sm"
									>
										+971 52 841 1575
									</a>
								</div>
								<div className="flex items-center gap-3">
									<MessageSquare className="h-4 w-4 text-green-600 flex-shrink-0" />
									<a
										href="https://wa.me/971528411575"
										target="_blank"
										rel="noopener noreferrer"
										className="text-green-600 hover:underline text-sm"
									>
										WhatsApp
									</a>
								</div>
							</div>
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 mt-2">
						<Button
							variant="outline"
							onClick={() => setShowEditBlockedDialog(false)}
						>
							Close
						</Button>
						<a
							href="https://wa.me/971528411575"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button className="bg-green-600 hover:bg-green-700 text-white">
								<MessageSquare className="h-4 w-4 mr-2" />
								Contact via WhatsApp
							</Button>
						</a>
					</div>
				</DialogContent>
			</Dialog>

			{/* Show selection dialog */}
			<Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
				<DialogContent className="bg-white text-slate-900 shadow-2xl p-0 flex flex-col transition-all duration-200 overflow-hidden sm:max-w-4xl w-[95vw] max-h-[90vh] rounded-2xl">
					<div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white relative">
						<div className="flex justify-between items-start mb-6">
							<div>
								<DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
									Manage Shows &bull; {event?.name}
								</DialogTitle>
								<DialogDescription className="text-sm text-slate-500 mt-1">
									Select the shows you want to share and perform for this event.
								</DialogDescription>
							</div>
						</div>

						{loadingBaseShows ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-purple-600" />
							</div>
						) : (
							<div className="space-y-4">
								<h4 className="font-bold text-slate-900 mb-1 text-base">Your Library Shows</h4>
								<p className="text-sm text-slate-500 mb-4">
									Tick every show you will perform. The organizer will see one workspace per show.
								</p>

								<div className="space-y-3">
									{baseShows.length > 0 ? (
										baseShows.map((show) => {
											const isSelected = selectedBaseShowIds.includes(show.id);
											return (
												<div
													key={show.id}
													onClick={() => {
														setSelectedBaseShowIds((prev) =>
															prev.includes(show.id)
																? prev.filter((id) => id !== show.id)
																: [...prev, show.id]
														);
													}}
													className={`border rounded-xl p-4 transition-all cursor-pointer ${isSelected
															? "border-pink-300 bg-pink-50/50 shadow-sm"
															: "border-slate-200 bg-white hover:border-pink-200"
														}`}
												>
													<div className="flex items-start gap-3">
														<div
															className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 mt-0.5 ${isSelected
																	? "bg-pink-500 border-pink-500 text-white"
																	: "bg-white border-slate-300"
																}`}
														>
															{isSelected && <CheckCircle className="w-3.5 h-3.5" />}
														</div>
														<div className="flex-1">
															<p className="font-bold text-slate-900 text-[15px]">{show.name}</p>
															<p className="text-sm text-slate-500">
																{show.style || "Solo performance"} &bull; {show.duration || 6} min &bull;{" "}
																{show.performers || 1} performer{show.performers > 1 ? "s" : ""}
															</p>
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
											<p className="text-slate-500 text-sm">No shows in your library.</p>
										</div>
									)}

									{/* Create new show button */}
									<div
										onClick={(e) => {
											e.stopPropagation();
											window.open(`/famelink/${artistId}/shows/create`, "_blank");
										}}
										className="border-2 border-dashed border-pink-200 bg-pink-50/20 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-pink-50/50 transition-all mt-4"
									>
										<span className="text-pink-500 font-bold text-[15px] flex items-center gap-2">
											+ Create a new show
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="border-t border-slate-200 bg-white p-4 flex justify-end gap-3 shrink-0 rounded-b-2xl">
						<Button
							variant="outline"
							onClick={() => setShowUpdateModal(false)}
							className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-6"
						>
							Close
						</Button>
						<Button
							className="bg-[#bf1ed4] hover:bg-[#a819bb] text-white font-bold rounded-lg px-8 shadow-md shadow-purple-500/20 gap-2"
							onClick={handleSubmitShows}
							disabled={submittingShows}
						>
							{submittingShows && <Loader2 className="w-4 h-4 animate-spin" />}
							Submit
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Header */}
			{!effectiveHideHeader && (
				<header className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl">
					<div className="container mx-auto px-4 py-4 md:py-8">
						<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
							<div className="flex items-center gap-3 md:gap-6">
								{/* <Button
									variant="ghost"
									className="text-white hover:bg-white/20 h-9 md:h-10 text-sm"
									onClick={() =>
										router.push(`/famelink/${artistId}`)
									}
								>
									<ArrowLeft className="h-4 w-4 mr-2" />
									<span className="hidden sm:inline">
										Back to Dashboard
									</span>
									<span className="sm:hidden">Back</span>
								</Button> */}
								<div className="bg-white/10 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 md:p-3 border border-white/20 shadow-2xl">
									<FameLinkLogo
										width={64}
										height={64}
										className="h-12 w-12 md:h-16 md:w-16"
									/>
								</div>
								<div>
									<h1 className="text-2xl md:text-4xl font-bold drop-shadow-2xl mb-1">
										Artist Dashboard
									</h1>
									<p className="text-purple-100 text-sm md:text-xl font-medium">
										{snapshot?.name || "FameLink Artist"}{" "}
										{event.name}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 w-full md:w-auto">
								<Badge
									variant="outline"
									className="border-purple-300 text-purple-100 text-xs"
								>
									FameLink Event Copy
								</Badge>
								{myShow && (
									<Button
										variant="ghost"
										className="text-white hover:bg-white/20 h-9 md:h-10 text-sm"
										onClick={() => {
											if (artistEditEnabled) {
												router.push(
													`/famelink/${artistId}/event/${eventId}/edit?eventShowId=${myShow.eventShowId}`,
												);
											} else {
												setShowEditBlockedDialog(true);
											}
										}}
									>
										<Edit className="h-4 w-4 mr-2" />
										<span className="hidden sm:inline">
											Edit
										</span>
										<span className="sm:hidden">Edit</span>
									</Button>
								)}
								<NotificationBell
									eventId={eventId}
									artistId={artistId}
									showDate={selectedPerformanceDate}
								/>
								<ArtistChatButton
									eventId={eventId}
									artistId={artistId}
									showDate={myPerformanceDate || undefined}
									variant="ghost"
									className="text-white hover:bg-white/20"
								/>
							</div>
						</div>
					</div>
				</header>
			)}

			{/* Mobile Drawer */}
			{!effectiveHideHeader && isDrawerOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsDrawerOpen(false)}
				/>
			)}
			{!effectiveHideHeader && (
				<div
					className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
				>
					<div className="p-6">
						<button
							onClick={() => setIsDrawerOpen(false)}
							className="absolute top-4 right-4 text-white/70 hover:text-white"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
						<div className="flex items-center gap-4 mb-8 mt-4">
							{snapshot?.profileImage ? (
								<img
									src={getMediaUrl(snapshot.profileImage)}
									alt={snapshot.name}
									className="w-16 h-16 rounded-full border-2 border-purple-400 object-cover"
								/>
							) : (
								<div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
									<User className="h-8 w-8" />
								</div>
							)}
							<div className="space-y-0.5">
								<div className="flex items-center gap-2 flex-wrap">
									<h3 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
										{snapshot?.name || "Artist"}
									</h3>
									{snapshot?.artistsPageTag && (
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 select-none">
											<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
											{snapshot.artistsPageTag}
										</span>
									)}
								</div>
								<p className="text-sm text-gray-400">
									FameLink Artist
								</p>
							</div>
						</div>
						<nav className="space-y-2">
							{(
								[
									["liveboard", "Live Board", "bg-green-400"],
									["overview", "Overview", "bg-purple-400"],
									["rehearsal", "Rehearsal", "bg-orange-400"],
									["music", "Music", "bg-pink-400"],
									["technical", "Technical", "bg-yellow-400"],
									["gallery", "Gallery", "bg-blue-400"],
									[
										"assigned-artists",
										"Assigned Artists",
										"bg-teal-400",
									],
									["event", "Event Details", "bg-indigo-400"],
								] as const
							).map(([key, label, color]) => (
								<button
									key={key}
									onClick={() => {
										setActiveTab(key);
										setIsDrawerOpen(false);
									}}
									className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${activeTab === key ? "bg-white/20" : "hover:bg-white/10"}`}
								>
									<span
										className={`w-1 h-6 ${color} rounded-full`}
									></span>
									<span>{label}</span>
								</button>
							))}
						</nav>
					</div>
				</div>
			)}

			<main className={effectiveHideHeader ? "w-full max-w-none px-0 py-0" : "container mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8 max-w-7xl"}>
				{myShows.length >= 0 && (
					<div className={`mb-6 p-4 rounded-2xl border transition-all duration-300 shadow-sm ${effectiveHideHeader
							? "bg-slate-50 border-slate-200"
							: "bg-white/60 backdrop-blur-md border-purple-100"
						}`}>
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
							<p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
								<Music className="h-4 w-4 text-purple-600 animate-pulse" />
								<span>Active Show Workspace</span>
							</p>
							{!effectiveHideHeader && (
								<Button
									onClick={() => setShowUpdateModal(true)}
									variant="outline"
									size="sm"
									className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs font-semibold h-8 rounded-lg flex items-center gap-1.5"
								>
									<Edit className="h-3.5 w-3.5" />
									Manage Shows
								</Button>
							)}
						</div>
						{myShows.length > 0 ? (
							<Tabs
								value={myShow?.eventShowId || ""}
								onValueChange={(value) => {
									const newParams = new URLSearchParams(searchParams.toString());
									newParams.set("eventShowId", value);
									router.push(`/famelink/${artistId}/event/${eventId}?${newParams.toString()}`, { scroll: false });
								}}
								className="w-full"
							>
								<TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-slate-100/80 border border-slate-200/50 rounded-xl justify-start">
									{myShows.map((s) => {
										const isSelected = myShow?.eventShowId === s.eventShowId;
										const perfDate = (s.overrides as any)?.performanceDate || null;
										const perfDateLabel = perfDate
											? new Date(perfDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
											: null;
										return (
											<TabsTrigger
												key={s.eventShowId}
												value={s.eventShowId}
												className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg flex flex-col items-start gap-0.5 border border-transparent
													${isSelected
														? "bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] text-white shadow-sm"
														: "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
													}`}
											>
												<span className="flex items-center gap-2">
													<span>{s.snapshot?.name || s.showName}</span>
													{s.snapshot?.style && (
														<Badge className={`text-[10px] px-1.5 py-0 border-0 ${isSelected ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"}`}>
															{s.snapshot.style}
														</Badge>
													)}
												</span>
												{perfDateLabel && (
													<span className={`text-[10px] font-semibold ${isSelected ? "text-white/80" : "text-purple-500"}`}>
														{perfDateLabel}
													</span>
												)}
											</TabsTrigger>
										);
									})}
								</TabsList>
							</Tabs>
						) : (
							<div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
								<p className="text-sm text-slate-500 mb-2">No shows shared for this event yet.</p>
								{!effectiveHideHeader && (
									<Button
										onClick={() => setShowUpdateModal(true)}
										className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] text-white hover:opacity-90 font-bold rounded-xl px-4 h-9 shadow-sm"
									>
										Select & Submit Shows
									</Button>
								)}
							</div>
						)}
					</div>
				)}

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full"
				>
					{/* Mobile Hamburger */}
					<div className="lg:hidden mb-4">
						<Button
							variant="outline"
							size="lg"
							onClick={() => setIsDrawerOpen(true)}
							className="flex items-center justify-between border-2 hover:bg-purple-50 py-6"
						>
							<span className="flex items-center gap-2 font-semibold text-base">
								<svg
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
								Menu
							</span>
						</Button>
					</div>

					{/* Desktop Tab List */}
					<TabsList className="hidden lg:grid w-full grid-cols-8 bg-transparent p-2 gap-2 mb-6 lg:mb-8">
						{(
							[
								[
									"liveboard",
									"Live Board",
									"from-green-500 to-emerald-500",
								],
								[
									"overview",
									"Overview",
									"from-purple-500 to-pink-500",
								],
								[
									"rehearsal",
									"Rehearsal",
									"from-orange-500 to-amber-500",
								],
								["music", "Music", "from-pink-500 to-rose-500"],
								[
									"technical",
									"Technical",
									"from-yellow-500 to-orange-500",
								],
								[
									"gallery",
									"Gallery",
									"from-blue-500 to-purple-500",
								],
								[
									"assigned-artists",
									"Assigned Artists",
									"from-teal-500 to-cyan-500",
								],
								[
									"event",
									"Event Details",
									"from-indigo-500 to-purple-500",
								],
							] as const
						).map(([value, label, gradient]) => (
							<TabsTrigger
								key={value}
								value={value}
								className={`data-[state=active]:bg-gradient-to-r data-[state=active]:${gradient} data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10`}
							>
								{label}
							</TabsTrigger>
						))}
					</TabsList>

					{/* â•â•â• LIVE BOARD TAB â•â•â• */}
					<TabsContent value="liveboard" className="space-y-4 mt-0">
						{isDraftShowOrder && !isShowOrderConfirmed && (
							<div className="flex items-center justify-center gap-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 px-4 py-4">
								<AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
								<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-yellow-700 leading-tight">
									DRAFT ORDER
								</p>
							</div>
						)}
						{!isDraftShowOrder && isShowOrderConfirmed && (
							<div className="flex items-center justify-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-4">
								<CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
								<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-green-700 leading-tight">
									CONFIRMED ORDER LIST
								</p>
							</div>
						)}

						{/* Performance Date */}
						<Card className="bg-white rounded-xl shadow-lg border-2 border-purple-300">
							<CardContent className="pt-4 px-4 space-y-4">
								{myPerformanceDate ? (
									<div className="text-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
										<div className="flex items-center justify-center gap-2 mb-2">
											<CheckCircle className="h-5 w-5 text-green-600" />
											<p className="text-sm font-medium text-green-700">
												Your Assigned Performance Date
											</p>
										</div>
										<p className="text-2xl md:text-3xl font-bold text-gray-900">
											{formatDateSimple(
												myPerformanceDate,
											)}
										</p>
									</div>
								) : (
									<div className="text-center py-6 bg-amber-50 rounded-lg border-2 border-amber-200">
										<AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
										<h3 className="font-semibold text-amber-900 mb-1">
											Not Assigned Yet
										</h3>
										<p className="text-sm text-amber-700 px-4">
											The stage manager has not assigned
											you to a performance date yet.
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{selectedPerformanceDate ? (
							<>
								{/* Emergency Broadcasts */}
								{emergencyBroadcasts.length > 0 && (
									<div className="space-y-2">
										{emergencyBroadcasts.map((b) => (
											<div
												key={b.id}
												className={`p-4 rounded-xl ${getEmergencyColor(b.emergency_code)} shadow-lg`}
											>
												<div className="flex items-center gap-3">
													<AlertTriangle className="h-5 w-5" />
													<div>
														<span className="font-bold">
															{b.emergency_code.toUpperCase()}{" "}
															ALERT:
														</span>
														<span className="ml-2">
															{b.message}
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Show Date Info */}
								<ShowDateInfoCard
									key={`sdi-${selectedPerformanceDate}`}
									eventId={eventId}
									showDate={selectedPerformanceDate}
									refreshKey={refreshTrigger}
								/>

								{/* Timing Cards */}
								<div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
									{(
										[
											[
												"Current Time",
												formatCurrentTime(currentTime),
												Clock,
												"text-blue-500",
											],
											[
												"Total Show",
												formatTimeDisplay(
													calculateTotalShowTime(),
												),
												Timer,
												"text-purple-500",
											],
											[
												"Remaining",
												formatTimeDisplay(
													calculateRemainingTime(),
												),
												Timer,
												"text-orange-500",
											],
											[
												"Show Start",
												eventTimings.show_start_time ||
												"--:--",
												Play,
												"text-green-500",
											],
										] as const
									).map(([label, value, Icon, color]) => (
										<Card
											key={label}
											className="rounded-xl"
										>
											<CardContent className="pt-4 px-3">
												<div className="flex flex-col items-start gap-1">
													<div className="flex items-center justify-between w-full">
														<p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">
															{label}
														</p>
														<Icon
															className={`h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 ${color}`}
														/>
													</div>
													<p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold">
														{value}
													</p>
												</div>
											</CardContent>
										</Card>
									))}
								</div>

								{/* Performance Order */}
								<Card className="bg-white rounded-xl shadow-lg border-2 border-purple-300">
									<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 py-4 px-4">
										<div className="flex items-center justify-between gap-2">
											<CardTitle className="flex items-center gap-2 text-base md:text-lg">
												<Users className="h-5 w-5" />
												Performance Order
											</CardTitle>
											<div className="flex items-center gap-1.5 flex-shrink-0">
												<div
													className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
												></div>
												<span className="text-xs text-muted-foreground">
													{wsConnected
														? "Live"
														: "Offline"}
												</span>
											</div>
										</div>
										<CardDescription className="text-xs sm:text-sm mt-1">
											Full lineup for tonight&apos;s show
										</CardDescription>
										{!eventTimings.show_start_time && (
											<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
												Show timing not set yet. Timing
												badges will appear once the
												stage manager sets the show
												start time.
											</div>
										)}
									</CardHeader>
									<CardContent className="pt-4 px-4">
										{(() => {
											const liveTimings =
												calculateLiveTimings(
													performanceItems.map(
														(item) => ({
															...item,
															status:
																item.status ||
																undefined,
															is_completed:
																item.type ===
																	"artist"
																	? (
																		item.artist as any
																	)
																		?.is_completed
																	: item.cue
																		?.is_completed,
															completed_at:
																item.type ===
																	"artist"
																	? (
																		item.artist as any
																	)
																		?.completed_at
																	: (
																		item.cue as any
																	)
																		?.completed_at,
														}),
													) as any[],
													eventTimings.show_start_time,
													timeOverrides,
												);
											return (
												<>
													<div className="space-y-2">
														{performanceItems.map(
															(item, index) => {
																const status =
																	item.status ||
																	(item.type ===
																		"cue" &&
																		item.cue
																			?.is_completed
																		? "completed"
																		: "not_started");
																const getRowColor =
																	(
																		s: string,
																	) => {
																		switch (
																		s
																		) {
																			case "completed":
																				return "bg-red-50 border-l-4 border-l-red-500";
																			case "currently_on_stage":
																				return "bg-green-50 border-l-4 border-l-green-500";
																			case "next_on_stage":
																				return "bg-yellow-50 border-l-4 border-l-yellow-500";
																			case "next_on_deck":
																				return "bg-blue-50 border-l-4 border-l-blue-500";
																			default:
																				return "bg-white border-l-4 border-l-gray-300";
																		}
																	};
																const cueColor =
																	item.type ===
																		"cue" &&
																		item.cue
																			?.color &&
																		status ===
																		"not_started"
																		? item
																			.cue
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
																			borderLeftColor:
																				itemColor,
																		}
																		: {};
																const textCls =
																	itemColor &&
																		!isLightColor(
																			itemColor,
																		)
																		? "text-white"
																		: "";

																return (
																	<div
																		key={
																			item.id
																		}
																		className={`flex items-center gap-3 p-3 rounded-lg ${itemColor ? "border-l-4" : getRowColor(status)}`}
																		style={
																			itemStyle
																		}
																	>
																		<span className="text-xs sm:text-sm font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold min-w-[1.75rem] text-center border border-blue-300">
																			#
																			{index +
																				1}
																		</span>
																		{status ===
																			"currently_on_stage" ? (
																			<span
																				className="text-xs font-mono px-1.5 py-0.5 rounded font-semibold bg-green-500 text-white border border-green-400 animate-pulse"
																				title="Live time — Currently on Stage"
																			>
																				{currentTime
																					? `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`
																					: "--:--"}
																			</span>
																		) : (
																			liveTimings[
																				index
																			]
																				?.startTime && (
																				<span
																					className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${liveTimings[index]?.isActual ? "bg-green-100 text-green-700 border border-green-300" : "bg-yellow-100 text-yellow-800 border border-yellow-400"}`}
																				>
																					{
																						liveTimings[
																							index
																						]
																							?.startTime
																					}
																				</span>
																			)
																		)}
																		{item.type ===
																			"artist" &&
																			item.artist ? (
																			<>
																				<Avatar className="h-8 w-8">
																					<AvatarImage
																						src={
																							item
																								.artist
																								.image_url
																						}
																						alt={
																							item
																								.artist
																								.artist_name
																						}
																					/>
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
																				<div className="flex-1">
																					<div
																						className={`font-medium ${textCls}`}
																					>
																						{
																							item
																								.artist
																								.artist_name
																						}
																					</div>
																					<div
																						className={`text-sm ${artistColor && !isLightColor(artistColor) ? "text-white/80" : "text-muted-foreground"}`}
																					>
																						{
																							item
																								.artist
																								.style
																						}
																					</div>
																				</div>
																			</>
																		) : item.type ===
																			"cue" &&
																			item.cue ? (
																			<>
																				{(() => {
																					const IC =
																						getCueIcon(
																							item
																								.cue
																								.type,
																						);
																					return (
																						<IC
																							className={`h-5 w-5 ${cueColor && !isLightColor(cueColor) ? "text-white" : "text-gray-700"}`}
																						/>
																					);
																				})()}
																				<div className="flex-1">
																					<div
																						className={`font-medium ${textCls}`}
																					>
																						{
																							item
																								.cue
																								.title
																						}
																					</div>
																					<div
																						className={`text-sm ${cueColor && !isLightColor(cueColor) ? "text-white/80" : "text-muted-foreground"}`}
																					>
																						{item.cue.type.replace(
																							"_",
																							" ",
																						)}{" "}
																						{
																							item
																								.cue
																								.duration
																						}{" "}
																						min
																					</div>
																				</div>
																			</>
																		) : null}
																		{(() => {
																			switch (
																			status
																			) {
																				case "currently_on_stage":
																					return (
																						<Badge className="bg-green-500 text-white hover:bg-green-500 cursor-default">
																							On
																							Stage
																						</Badge>
																					);
																				case "next_on_stage":
																					return (
																						<Badge className="bg-yellow-500 text-white hover:bg-yellow-500 cursor-default">
																							Next
																							Up
																						</Badge>
																					);
																				case "next_on_deck":
																					return (
																						<Badge className="bg-blue-500 text-white hover:bg-blue-500 cursor-default">
																							On
																							Deck
																						</Badge>
																					);
																				case "completed":
																					return (
																						<Badge className="bg-red-500 text-white hover:bg-red-500 cursor-default">
																							Completed
																						</Badge>
																					);
																				default:
																					return (
																						<Badge
																							variant="outline"
																							className={`cursor-default ${itemColor && !isLightColor(itemColor) ? "bg-white/20 text-white border-white/30" : ""}`}
																						>
																							Backstage
																						</Badge>
																					);
																			}
																		})()}
																	</div>
																);
															},
														)}
													</div>
													{performanceItems.length ===
														0 && (
															<div className="text-center py-12">
																<Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
																<h3 className="text-lg font-medium mb-2">
																	No performances
																	scheduled
																</h3>
																<p className="text-muted-foreground">
																	Check back later
																	for the
																	performance
																	schedule
																</p>
															</div>
														)}
												</>
											);
										})()}
									</CardContent>
								</Card>
							</>
						) : null}
					</TabsContent>

					{/* â•â•â• OVERVIEW TAB â•â•â• */}
					<TabsContent value="overview" className="space-y-4 mt-0">
						{/* Membership Card */}
						<MembershipCard
							artistName={snapshot?.name || "FameLink Artist"}
							artistId={artistId}
							eventId={eventId}
							profileImage={
								snapshot?.profileImage
									? getMediaUrl(
										snapshot.profileImage,
										snapshot.profileImage,
									)
									: undefined
							}
							isFameLinkArtist={true}
							rehearsalCheckedIn={rehearsalCheckedIn}
							performanceCheckedIn={performanceCheckedIn}
						/>

						{/* Performance Date */}
						<div className="bg-white rounded-xl shadow-md border border-purple-100 p-5">
							<h3 className="text-lg font-semibold text-gray-900 mb-3">
								Assigned Performance Date
							</h3>
							{myPerformanceDate ? (
								<div className="text-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
									<div className="flex items-center justify-center gap-2 mb-2">
										<CheckCircle className="h-5 w-5 text-green-600" />
										<p className="text-sm font-medium text-green-700">
											You are assigned to perform at
										</p>
									</div>
									<p className="text-2xl font-bold text-gray-900">
										{formatDateSimple(myPerformanceDate)}
									</p>
								</div>
							) : (
								<div className="text-center py-10 bg-amber-50 rounded-lg border-2 border-amber-200">
									<AlertTriangle className="h-14 w-14 mx-auto mb-3 text-amber-500" />
									<h3 className="text-lg font-semibold text-amber-900 mb-2">
										Not Assigned Yet
									</h3>
									<p className="text-amber-700 px-4">
										The stage manager has not assigned you
										to a performance date yet.
									</p>
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Basic Info from snapshot */}
							<Card className="bg-white shadow-lg border-2 border-purple-300">
								<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-purple-100 rounded-full p-1.5">
											<User className="h-4 w-4 text-purple-600" />
										</div>
										Basic Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 pt-4 px-4">
									<div className="flex justify-center mb-3">
										{snapshot?.profileImage ? (
											<FullScreenImageViewer
												src={getMediaUrl(
													snapshot.profileImage,
												)}
												alt={snapshot.name}
												className="w-24 h-24"
											>
												<img
													src={getMediaUrl(
														snapshot.profileImage,
													)}
													alt={snapshot.name}
													className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-lg"
												/>
											</FullScreenImageViewer>
										) : (
											<div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg">
												<User className="h-12 w-12 text-purple-400" />
											</div>
										)}
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Show Name
										</p>
										<p className="font-medium">
											{snapshot?.name}
										</p>
									</div>
									{snapshot?.realName && (
										<div>
											<p className="text-sm text-muted-foreground">
												Real Name
											</p>
											<p className="font-medium">
												{snapshot.realName}
											</p>
										</div>
									)}
									{snapshot?.email && (
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-blue-600" />
											<EmailLink
												email={snapshot.email}
												className="text-sm break-all"
											/>
										</div>
									)}
									{snapshot?.phone && (
										<div className="flex items-center gap-2">
											<WhatsAppIcon className="h-4 w-4 text-green-600" />
											<WhatsAppLink
												phoneNumber={snapshot.phone}
												className="text-sm"
												showIcon={false}
											/>
										</div>
									)}
									{snapshot?.style && (
										<div>
											<p className="text-sm text-muted-foreground">
												Performance Style
											</p>
											<p className="font-medium">
												{snapshot.style}
											</p>
										</div>
									)}
									{snapshot?.performanceType && (
										<div>
											<p className="text-sm text-muted-foreground">
												Performance Type
											</p>
											<p className="font-medium">
												{snapshot.performanceType}
											</p>
										</div>
									)}
									<div>
										<p className="text-sm text-muted-foreground">
											Duration
										</p>
										<p className="font-medium">
											{musicTracks.length > 0 &&
												musicTracks[0].duration
												? formatDuration(
													musicTracks[0].duration,
												)
												: `${(myShow?.overrides as any)?.duration || snapshot?.duration || 0} minutes`}
										</p>
									</div>
									{/* Nationality */}
									{(snapshot?.countryLiving ||
										snapshot?.homeCountry ||
										(snapshot?.members &&
											snapshot.members.length > 0)) && (
											<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
												<p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
													<Globe className="h-4 w-4" />
													Nationality
												</p>
												{snapshot?.members &&
													snapshot.members.length > 0 ? (
													<div className="space-y-2">
														{snapshot.members.map(
															(m, i) => (
																<div
																	key={i}
																	className="flex flex-wrap items-center gap-2 text-sm"
																>
																	<span className="font-medium">
																		{m.name}:
																	</span>
																	{m.countryLiving && (
																		<span>
																			{getCountryFlag(
																				m.countryLiving,
																			)}{" "}
																			Living
																			in{" "}
																			{getCountryName(
																				m.countryLiving,
																			)}
																		</span>
																	)}
																	{m.homeCountry && (
																		<span className="text-gray-600">
																			|{" "}
																			{getCountryFlag(
																				m.homeCountry,
																			)}{" "}
																			From{" "}
																			{getCountryName(
																				m.homeCountry,
																			)}
																		</span>
																	)}
																</div>
															),
														)}
													</div>
												) : (
													<div className="flex flex-wrap items-center gap-3 text-sm">
														{snapshot?.countryLiving && (
															<span>
																{getCountryFlag(
																	snapshot.countryLiving,
																)}{" "}
																Living in{" "}
																{getCountryName(
																	snapshot.countryLiving,
																)}
															</span>
														)}
														{snapshot?.homeCountry && (
															<span className="text-gray-600">
																|{" "}
																{getCountryFlag(
																	snapshot.homeCountry,
																)}{" "}
																From{" "}
																{getCountryName(
																	snapshot.homeCountry,
																)}
															</span>
														)}
													</div>
												)}
											</div>
										)}
									{/* T-Shirt */}
									{snapshot?.tshirtSizes &&
										snapshot.tshirtSizes.length > 0 && (
											<div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
												<p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
													<User className="h-4 w-4" />
													T-Shirt Sizes
												</p>
												<div className="space-y-2">
													{snapshot.tshirtSizes.map(
														(t, i) => (
															<div
																key={i}
																className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-green-100"
															>
																<span className="font-medium text-green-700">
																	{t.name}:
																</span>
																<span>
																	Size{" "}
																	{t.size}
																</span>
																<span className="text-gray-500">
																	(
																	{t.fit ===
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

							{/* Biography */}
							<Card className="bg-white shadow-lg border-2 border-pink-300">
								<CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-200 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-pink-100 rounded-full p-1.5">
											<User className="h-4 w-4 text-pink-600" />
										</div>
										Biography
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 px-4">
									<p className="text-sm leading-relaxed">
										{snapshot?.biography ||
											"No biography provided"}
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Social Media */}
						{(snapshot?.socialMedia?.instagram ||
							snapshot?.socialMedia?.facebook ||
							snapshot?.socialMedia?.youtube ||
							snapshot?.socialMedia?.website ||
							snapshot?.showLink) && (
								<Card className="bg-white shadow-lg border-2 border-blue-300">
									<CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200 py-4 px-4">
										<CardTitle className="flex items-center gap-2 text-base">
											<div className="bg-blue-100 rounded-full p-1.5">
												<Globe className="h-4 w-4 text-blue-600" />
											</div>
											Social Media &amp; Links
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-4 px-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
											{snapshot?.socialMedia?.instagram && (
												<a
													href={
														snapshot.socialMedia
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
											{snapshot?.socialMedia?.facebook && (
												<a
													href={
														snapshot.socialMedia
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
											{snapshot?.socialMedia?.youtube && (
												<a
													href={
														snapshot.socialMedia.youtube
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
											{snapshot?.socialMedia?.website && (
												<a
													href={
														snapshot.socialMedia.website
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
											{snapshot?.showLink && (
												<a
													href={snapshot.showLink}
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

					{/* â•â•â• REHEARSAL TAB â•â•â• */}
					<TabsContent value="rehearsal" className="space-y-4 mt-0">
						<Card className="bg-white shadow-lg border-2 border-orange-200">
							<CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 py-4 px-4">
								<div className="flex items-center justify-between gap-2">
									<CardTitle className="flex items-center gap-2 text-base">
										<Calendar className="h-5 w-5 text-orange-600" />
										Rehearsal Schedule
									</CardTitle>
									{selectedPerformanceDate && (
										<Badge
											variant="outline"
											className="text-xs border-orange-300 text-orange-700"
										>
											{formatDateSimple(
												selectedPerformanceDate,
											)}
										</Badge>
									)}
								</div>
								<CardDescription className="text-sm mt-1">
									Rehearsal order for your performance date
								</CardDescription>
								{!eventTimings.rehearsal_start_time &&
									!eventTimings.show_start_time &&
									rehearsalArtists.length > 0 && (
										<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
											â±ï¸ Rehearsal timing not set yet.
										</div>
									)}
							</CardHeader>
							<CardContent className="pt-4 px-4">
								{rehearsalLoading ? (
									<div className="flex items-center justify-center py-12">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
									</div>
								) : rehearsalArtists.length === 0 ? (
									<div className="text-center py-12 text-muted-foreground">
										<Calendar className="h-12 w-12 mx-auto mb-3 text-orange-300" />
										<p className="font-medium">
											No rehearsal schedule yet
										</p>
										<p className="text-sm mt-1">
											The stage manager has not set up the
											rehearsal order for this date.
										</p>
									</div>
								) : (
									<div className="space-y-2">
										{(() => {
											const rTimings =
												calculateLiveTimings(
													rehearsalArtists.map(
														(a) => ({
															id: a.id,
															type: "artist" as const,
															artist: {
																id: a.id,
																artist_name:
																	a.artist_name,
																performance_duration: 5,
																quality_rating:
																	null,
																performance_order:
																	a.rehearsal_order ||
																	0,
																rehearsal_completed:
																	a.rehearsal_completed,
															},
															performance_order:
																a.rehearsal_order ||
																0,
														}),
													),
													eventTimings.rehearsal_start_time ||
													eventTimings.show_start_time,
													rehearsalTimeOverrides,
												);
											return rehearsalArtists.map(
												(artist, index) => {
													const isMe =
														artist.id === artistId;
													return (
														<div
															key={artist.id}
															className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isMe ? "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400 shadow-md" : artist.rehearsal_completed ? "bg-green-50 border-l-4 border-l-green-500" : "bg-white border-l-4 border-l-gray-200"}`}
														>
															<span
																className={`text-sm font-mono px-1.5 py-0.5 rounded font-semibold min-w-[1.75rem] text-center border ${isMe ? "bg-orange-200 text-orange-800 border-orange-400" : "bg-blue-100 text-blue-700 border-blue-300"}`}
															>
																#
																{artist.rehearsal_order ??
																	index + 1}
															</span>
															{rTimings[index]
																?.startTime && (
																	<span
																		className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${isMe ? "bg-orange-100 text-orange-700 border border-orange-300" : "bg-yellow-100 text-yellow-800 border border-yellow-400"}`}
																	>
																		{
																			rTimings[
																				index
																			]
																				?.startTime
																		}
																	</span>
																)}
															<Avatar className="h-8 w-8">
																<AvatarImage
																	src={
																		artist.image_url
																			? `/api/media/${artist.image_url}`
																			: undefined
																	}
																	alt={
																		artist.artist_name
																	}
																/>
																<AvatarFallback>
																	{artist.artist_name
																		.charAt(
																			0,
																		)
																		.toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<div className="flex-1 min-w-0">
																<div
																	className={`font-medium truncate ${isMe ? "text-orange-900" : ""}`}
																>
																	{
																		artist.artist_name
																	}
																	{isMe && (
																		<span className="ml-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
																			You
																		</span>
																	)}
																</div>
																<div
																	className={`text-sm truncate ${isMe ? "text-orange-700" : "text-muted-foreground"}`}
																>
																	{
																		artist.style
																	}
																</div>
															</div>
															{artist.rehearsal_completed ? (
																<Badge className="bg-green-500 text-white hover:bg-green-500 cursor-default text-xs">
																	Completed
																</Badge>
															) : (
																<Badge
																	variant="outline"
																	className="text-xs"
																>
																	Pending
																</Badge>
															)}
														</div>
													);
												},
											);
										})()}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* â•â•â• MUSIC TAB â•â•â• */}
					<TabsContent value="music" className="space-y-4 mt-0">
						{activeTab === "music" && (
							<Card className="bg-white shadow-lg border-2 border-pink-100">
								<CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-pink-100 rounded-full p-1.5">
											<Music className="h-4 w-4 text-pink-600" />
										</div>
										Music Tracks
									</CardTitle>
									<CardDescription className="text-sm mt-1">
										Music from your event show snapshot
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-4 px-4">
									<div className="space-y-4">
										{musicTracks.length > 0 ? (
											musicTracks.map((track, i) => (
												<MusicTrackPlayer
													key={`${profileId}-track-${i}`}
													track={track}
													index={i}
													profileId={profileId}
												/>
											))
										) : (
											<p className="text-center text-muted-foreground py-8">
												No music tracks uploaded
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* â•â•â• TECHNICAL TAB â•â•â• */}
					<TabsContent value="technical" className="space-y-4 mt-0">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Costume & Lighting */}
							<Card className="bg-white shadow-lg border-2 border-yellow-300">
								<CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-yellow-100 rounded-full p-1.5">
											<Palette className="h-4 w-4 text-yellow-600" />
										</div>
										Costume &amp; Lighting
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 pt-4 px-4">
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											Costume Colors
										</p>
										{snapshot?.manualCostumeColor ||
											snapshot?.manualCostumeColorTwo ||
											snapshot?.manualCostumeColorThree ? (
											<div className="space-y-2">
												{[
													snapshot?.manualCostumeColor,
													snapshot?.manualCostumeColorTwo,
													snapshot?.manualCostumeColorThree,
												]
													.filter(Boolean)
													.map((c, i) => (
														<div
															key={i}
															className="flex items-center gap-3"
														>
															<div
																className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
																style={{
																	backgroundColor:
																		c!,
																}}
															></div>
															<span className="text-sm">
																{
																	[
																		"Primary",
																		"Secondary",
																		"Third",
																	][i]
																}
																:{" "}
																<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																	{c}
																</span>
															</span>
														</div>
													))}
											</div>
										) : (
											<p className="text-sm text-gray-500 italic">
												No costume colors selected
											</p>
										)}
										{snapshot?.customCostumeColor && (
											<p className="text-sm text-muted-foreground mt-2">
												Custom:{" "}
												{snapshot.customCostumeColor}
											</p>
										)}
									</div>
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											Lighting Preferences
										</p>
										{snapshot?.manualLightColor ||
											snapshot?.manualLightColorTwo ||
											snapshot?.manualLightColorThree ? (
											<div className="space-y-2">
												{[
													snapshot?.manualLightColor,
													snapshot?.manualLightColorTwo,
													snapshot?.manualLightColorThree,
												]
													.filter(Boolean)
													.map((c, i) => (
														<div
															key={i}
															className="flex items-center gap-3"
														>
															<div
																className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
																style={{
																	backgroundColor:
																		c!,
																}}
															></div>
															<span className="text-sm">
																{
																	[
																		"Primary",
																		"Secondary",
																		"Third",
																	][i]
																}
																:{" "}
																<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																	{c}
																</span>
															</span>
														</div>
													))}
											</div>
										) : (
											<p className="text-sm text-gray-500 italic">
												Trust the Lighting Designer âœ¨
											</p>
										)}
									</div>
									{snapshot?.lightRequests && (
										<div>
											<p className="text-sm text-muted-foreground">
												Special Lighting Requests
											</p>
											<p className="text-sm">
												{snapshot.lightRequests}
											</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Stage Positioning */}
							<Card className="bg-white shadow-lg border-2 border-blue-100">
								<CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-blue-100 rounded-full p-1.5">
											<Navigation className="h-4 w-4 text-blue-600" />
										</div>
										Stage Positioning
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 pt-4 px-4">
									{(snapshot?.stagePositionStart ||
										snapshot?.stagePositionEnd) && (
											<StagePositionPreview
												startPosition={
													snapshot?.stagePositionStart ||
													""
												}
												endPosition={
													snapshot?.stagePositionEnd || ""
												}
											/>
										)}
									<div>
										<p className="text-sm text-muted-foreground">
											Starting Position
										</p>
										<p className="font-medium capitalize">
											{snapshot?.stagePositionStart?.replace(
												"-",
												" ",
											) ?? "Not specified"}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Ending Position
										</p>
										<p className="font-medium capitalize">
											{snapshot?.stagePositionEnd?.replace(
												"-",
												" ",
											) ?? "Not specified"}
										</p>
									</div>
									{snapshot?.customStagePosition && (
										<div>
											<p className="text-sm text-muted-foreground">
												Custom Position
											</p>
											<p className="text-sm">
												{snapshot.customStagePosition}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Notes */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Card className="bg-white shadow-lg border-2 border-green-300">
								<CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-green-100 rounded-full p-1.5">
											<Lightbulb className="h-4 w-4 text-green-600" />
										</div>
										MC Notes
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 px-4">
									<p className="text-sm">
										{snapshot?.mcNotes ||
											"No special notes for MC"}
									</p>
								</CardContent>
							</Card>
							<Card className="bg-white shadow-lg border-2 border-teal-300">
								<CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-teal-100 rounded-full p-1.5">
											<User className="h-4 w-4 text-teal-600" />
										</div>
										Stage Manager Notes
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 px-4">
									<p className="text-sm">
										{snapshot?.stageManagerNotes ||
											"No special notes for stage manager"}
									</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* â•â•â• GALLERY TAB â•â•â• */}
					<TabsContent value="gallery" className="space-y-4 mt-0">
						{snapshot?.rehearsalVideo && (
							<Card className="bg-white shadow-lg border-2 border-amber-100">
								<CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 py-4 px-4">
									<CardTitle className="flex items-center gap-2 text-base">
										<div className="bg-amber-100 rounded-full p-1.5">
											<Play className="h-4 w-4 text-amber-600" />
										</div>
										Rehearsal / Show Video
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 px-4">
									<div className="max-w-2xl mx-auto">
										<VideoPlayer
											file={{
												name: snapshot.rehearsalVideo
													.name,
												type: "video",
												url: snapshot.rehearsalVideo
													.url,
												file_path:
													snapshot.rehearsalVideo
														.file_path,
												size: snapshot.rehearsalVideo
													.size,
												contentType:
													snapshot.rehearsalVideo
														.contentType,
											}}
											className="aspect-video"
										/>
										<p className="text-sm text-gray-600 mt-2 text-center">
											{snapshot.rehearsalVideo.name}
											{snapshot.rehearsalVideo.size && (
												<span className="ml-2 text-gray-400">
													(
													{(
														snapshot.rehearsalVideo
															.size /
														(1024 * 1024)
													).toFixed(1)}{" "}
													MB)
												</span>
											)}
										</p>
									</div>
								</CardContent>
							</Card>
						)}
						<Card className="bg-white shadow-lg border-2 border-purple-100">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 py-4 px-4">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="bg-purple-100 rounded-full p-1.5">
										<Image className="h-4 w-4 text-purple-600" />
									</div>
									Media Gallery
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-4 px-4">
								{snapshot?.galleryFiles &&
									snapshot.galleryFiles.length > 0 ? (
									<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
										{snapshot.galleryFiles.map(
											(file, i) => (
												<div key={i}>
													{file.type === "image" ? (
														<ImageViewer
															file={file}
															onError={(e: any) =>
																console.error(e)
															}
															className="aspect-square"
														/>
													) : (
														<VideoPlayer
															file={file}
															onError={(e: any) =>
																console.error(e)
															}
															className="aspect-square"
														/>
													)}
													<p className="text-xs text-muted-foreground truncate mt-1">
														{file.name}
													</p>
												</div>
											),
										)}
									</div>
								) : (
									<p className="text-center text-muted-foreground py-8">
										No media files in snapshot
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* â•â•â• ASSIGNED ARTISTS TAB â•â•â• */}
					<TabsContent
						value="assigned-artists"
						className="space-y-4 mt-0"
					>
						<Card className="bg-white shadow-lg border-2 border-teal-300">
							<CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 py-4 px-4">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="bg-teal-100 rounded-full p-1.5">
										<Users className="h-4 w-4 text-teal-600" />
									</div>
									Artists Assigned to Your Performance Date
								</CardTitle>
								<CardDescription className="text-sm mt-2">
									{myPerformanceDate
										? `All artists performing on ${formatDateSimple(myPerformanceDate)}`
										: "No performance date assigned yet"}
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-4 px-4">
								{!myPerformanceDate ? (
									<div className="text-center py-12">
										<AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-500 opacity-50" />
										<h3 className="text-lg font-medium mb-2">
											Not Assigned Yet
										</h3>
										<p className="text-muted-foreground">
											You need to be assigned to a
											performance date first
										</p>
									</div>
								) : assignedArtists.length === 0 ? (
									<div className="text-center py-12">
										<Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
										<h3 className="text-lg font-medium mb-2">
											No Artists Found
										</h3>
										<p className="text-muted-foreground">
											No other artists are assigned to
											your performance date yet
										</p>
									</div>
								) : (
									<>
										<div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
											<table className="w-full">
												<thead className="sticky top-0 bg-white z-10">
													<tr className="border-b-2 border-teal-200">
														<th className="text-left py-3 px-4 font-semibold text-gray-700 bg-teal-50">
															#
														</th>
														<th className="text-left py-3 px-4 font-semibold text-gray-700 bg-teal-50">
															Artist Name
														</th>
														<th className="text-left py-3 px-4 font-semibold text-gray-700 bg-teal-50">
															Real Name
														</th>
														<th className="text-left py-3 px-4 font-semibold text-gray-700 bg-teal-50">
															Style
														</th>
														<th className="text-left py-3 px-4 font-semibold text-gray-700 bg-teal-50">
															Duration
														</th>
													</tr>
												</thead>
												<tbody>
													{assignedArtists.map(
														(a, i) => (
															<tr
																key={a.id}
																className="border-b border-gray-200 hover:bg-teal-50 transition-colors"
															>
																<td className="py-3 px-4 text-gray-600">
																	{i + 1}
																</td>
																<td className="py-3 px-4 font-medium text-gray-900">
																	{
																		a.artistName
																	}
																</td>
																<td className="py-3 px-4 text-gray-700">
																	{a.realName ||
																		"-"}
																</td>
																<td className="py-3 px-4">
																	<Badge
																		variant="outline"
																		className="bg-teal-50 text-teal-700 border-teal-300"
																	>
																		{
																			a.style
																		}
																	</Badge>
																</td>
																<td className="py-3 px-4 text-gray-700">
																	<div className="flex items-center gap-1">
																		<Clock className="h-4 w-4 text-gray-500" />
																		{a.actual_duration
																			? formatDuration(
																				a.actual_duration,
																			)
																			: "0:00"}
																	</div>
																</td>
															</tr>
														),
													)}
												</tbody>
											</table>
										</div>
										<div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
											<p className="text-sm text-teal-800">
												<strong>Total Artists:</strong>{" "}
												{assignedArtists.length}
											</p>
										</div>
									</>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* â•â•â• EVENT DETAILS TAB â•â•â• */}
					<TabsContent value="event" className="space-y-4 mt-0">
						<Card className="bg-white shadow-lg border-2 border-indigo-300">
							<CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 py-4 px-4">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="bg-indigo-100 rounded-full p-1.5">
										<Calendar className="h-4 w-4 text-indigo-600" />
									</div>
									Event Information
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 pt-4 px-4">
								<div>
									<p className="text-sm text-muted-foreground">
										Event Name
									</p>
									<p className="font-medium text-lg">
										{event.name}
									</p>
								</div>
								{event.venueName && (
									<div>
										<p className="text-sm text-muted-foreground">
											Venue
										</p>
										<p className="font-medium">
											{event.venueName}
										</p>
									</div>
								)}
								{event.description && (
									<div>
										<p className="text-sm text-muted-foreground">
											Description
										</p>
										<p className="text-sm">
											{event.description}
										</p>
									</div>
								)}
								<div>
									<p className="text-sm text-muted-foreground">
										Event Dates
									</p>
									<p className="font-medium">
										{new Date(
											event.startDate,
										).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
										{event.endDate &&
											event.endDate !==
											event.startDate && (
												<>
													{" "}
													{new Date(
														event.endDate,
													).toLocaleDateString(
														"en-US",
														{
															year: "numeric",
															month: "long",
															day: "numeric",
														},
													)}
												</>
											)}
									</p>
								</div>
								{event.showDates &&
									event.showDates.length > 0 && (
										<div>
											<p className="text-sm text-muted-foreground mb-2">
												Show Dates
											</p>
											<div className="flex flex-wrap gap-2">
												{event.showDates.map((d, i) => (
													<Badge
														key={i}
														variant="outline"
														className="bg-indigo-50 text-indigo-700 border-indigo-300"
													>
														{new Date(
															d,
														).toLocaleDateString(
															"en-US",
															{
																weekday:
																	"short",
																month: "short",
																day: "numeric",
															},
														)}
													</Badge>
												))}
											</div>
										</div>
									)}
								<div>
									<p className="text-sm text-muted-foreground">
										Assigned Performance Date
									</p>
									{myPerformanceDate ? (
										<div className="mt-2">
											<Badge
												variant="default"
												className="bg-green-500 hover:bg-green-600 text-white text-base px-4 py-2"
											>
												{formatDateSimple(
													myPerformanceDate,
												)}
											</Badge>
											<p className="text-xs text-muted-foreground mt-1">
												You have been assigned to
												perform on this date
											</p>
										</div>
									) : (
										<div className="mt-2">
											<Badge
												variant="secondary"
												className="bg-amber-100 text-amber-800 border-amber-300 text-base px-4 py-2"
											>
												Pending
											</Badge>
											<p className="text-xs text-muted-foreground mt-1">
												Waiting for stage manager to
												assign a performance date
											</p>
										</div>
									)}
								</div>
								{participationStatus && (
									<div>
										<p className="text-sm text-muted-foreground">
											Participation Status
										</p>
										<Badge
											className={
												participationStatus ===
													"confirmed"
													? "bg-green-500 text-white"
													: participationStatus ===
														"submitted"
														? "bg-blue-500 text-white"
														: "bg-yellow-500 text-white"
											}
										>
											{participationStatus
												.charAt(0)
												.toUpperCase() +
												participationStatus.slice(1)}
										</Badge>
									</div>
								)}
								{myShow?.snapshotCreatedAt && (
									<div>
										<p className="text-sm text-muted-foreground">
											Show Snapshot Created
										</p>
										<p className="font-medium">
											{new Date(
												myShow.snapshotCreatedAt,
											).toLocaleDateString("en-US", {
												year: "numeric",
												month: "long",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									</div>
								)}
								{/* <div className="pt-4">
									<Button
										onClick={() =>
											router.push(`/famelink/${artistId}`)
										}
										className="w-full"
									>
										<ArrowLeft className="h-4 w-4 mr-2" />
										Back to FameLink Dashboard
									</Button>
								</div> */}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>

			<WhatsAppHelpButton />
		</div>
	);
}
