"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	User,
	Music,
	Image,
	Calendar,
	MapPin,
	Phone,
	Mail,
	Globe,
	Instagram,
	Facebook,
	Youtube,
	Edit,
	Download,
	Play,
	Lightbulb,
	Palette,
	Navigation,
	ArrowLeft,
	LogOut,
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
	RefreshCw,
	MessageSquare,
	X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { formatDuration, calculateLiveTimings } from "@/lib/timing-utils";
import { ArtistChatButton } from "@/components/ArtistChatButton";
import {
	WhatsAppIcon,
	WhatsAppLink,
	EmailLink,
} from "@/components/ui/whatsapp-input";
import { WhatsAppHelpButton } from "@/components/WhatsAppHelpButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateSimple } from "@/lib/date-utils";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import router from "next/router";
import { NotificationBell } from "@/components/NotificationBell";
import { ShowDateInfoCard } from "@/components/ShowDateInfoCard";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { CueColorBadge, isLightColor } from "@/components/ui/cue-color-picker";
import { MembershipCard } from "@/components/MembershipCard";
import { ArtistCallNotification } from "@/components/ArtistCallNotification";
import { useCheckIn } from "@/hooks/use-checkin";

interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	costumeColor: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	customCostumeColor: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition: string;
	socialMedia: {
		instagram: string;
		facebook: string;
		youtube: string;
		tiktok: string;
		website: string;
	};
	mcNotes: string;
	stageManagerNotes: string;
	showLink: string;
	musicTracks: Array<{
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
		file_path?: string;
	}>;
	galleryFiles: Array<{
		url: string;
		type: "image" | "video";
		name: string;
	}>;
	rehearsalVideo?: {
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	};
	eventName: string;
	eventId: string;
	status: string;
	createdAt: string;
	performanceDate?: string;
	image_url?: string;
	// Nationality fields
	countryLiving?: string;
	homeCountry?: string;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
	// T-shirt sizes
	tshirtSizes?: Array<{
		name: string;
		size: string;
		fit: "oversized" | "regular";
	}>;
}

interface LiveBoardArtist {
	id: string;
	artist_name: string;
	style: string;
	performance_type?: string;
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

// Helper function to format duration is now imported from media-utils

// Memoized component for music track to prevent unnecessary re-renders
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
	}) => {
		return (
			<div
				key={`${profileId}-track-${index}-${track.song_title}`}
				className="border rounded-lg p-4 space-y-3"
			>
				<div className="flex items-center justify-between">
					<div>
						<h4 className="font-medium">{track.song_title}</h4>
						<p className="text-sm text-muted-foreground">
							Duration: {formatDuration(track.duration)} - Tempo:{" "}
							{track.tempo}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{track.is_main_track && (
							<Badge variant="secondary">Main Track</Badge>
						)}
					</div>
				</div>
				{track.notes && (
					<p className="text-sm text-muted-foreground">
						{track.notes}
					</p>
				)}
				{track.file_url && (
					<div className="space-y-2">
						<AudioPlayer
							track={track}
							onError={(error) => {
								console.error("Audio playback error:", error);
							}}
						/>
					</div>
				)}
			</div>
		);
	},
	// Custom comparison function - only re-render if track data actually changes
	(prevProps, nextProps) => {
		return (
			prevProps.track.file_url === nextProps.track.file_url &&
			prevProps.track.song_title === nextProps.track.song_title &&
			prevProps.profileId === nextProps.profileId
		);
	},
);

MusicTrackPlayer.displayName = "MusicTrackPlayer";

export default function ArtistDashboard() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("liveboard");

	// Use ref for toast to avoid stale closure issues in WebSocket handlers
	const toastRef = useRef(toast);
	useEffect(() => {
		toastRef.current = toast;
	}, [toast]);

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
	const [availableDates, setAvailableDates] = useState<string[]>([]);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [activeCall, setActiveCall] = useState<any>(null);

	// Listen for local or remote dismiss event to hide the call banner
	useEffect(() => {
		const handleDismiss = () => {
			setActiveCall(null);
		};
		window.addEventListener("artist_call_dismiss", handleDismiss);
		return () => {
			window.removeEventListener("artist_call_dismiss", handleDismiss);
		};
	}, []);

	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);
	const [assignedArtists, setAssignedArtists] = useState<
		Array<{
			id: string;
			artistName: string;
			realName: string;
			style: string;
			actual_duration?: number;
		}>
	>([]);

	// Rehearsal schedule state
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

	// Artist edit enabled state
	const [artistEditEnabled, setArtistEditEnabled] = useState<boolean>(false);
	const [showEditBlockedDialog, setShowEditBlockedDialog] = useState(false);
	const [stageManagerEmail, setStageManagerEmail] = useState("");

	const artistId = params.artistId as string;

	// Memoize music tracks to prevent re-renders from live board updates
	// Use JSON.stringify for deep comparison since arrays are compared by reference
	const musicTracksJson = useMemo(
		() => JSON.stringify(profile?.musicTracks || []),
		[profile?.musicTracks],
	);
	const musicTracks = useMemo<
		Array<{
			song_title: string;
			duration: number;
			notes: string;
			is_main_track: boolean;
			tempo: string;
			file_url: string;
			file_path?: string;
		}>
	>(() => JSON.parse(musicTracksJson), [musicTracksJson]);

	// Memoize profile ID to use as stable key
	const profileId = useMemo(() => profile?.id || "", [profile?.id]);

	// Check-in status hook
	const {
		rehearsalCheckedIn,
		performanceCheckedIn,
		refetch: refetchCheckIn,
	} = useCheckIn(profile?.eventId || "", artistId);

	useEffect(() => {
		if (artistId) {
			fetchArtistProfile();
		} else {
			setError("Invalid artist ID");
			setLoading(false);
		}
	}, [artistId]);

	// Real-time clock update for live board
	useEffect(() => {
		setCurrentTime(new Date());
		const timer = setInterval(() => {
			setCurrentTime(new Date());
			setElapsedTime((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	// Reset elapsed time when performer changes
	useEffect(() => {
		setElapsedTime(0);
	}, [currentPerformerIndex]);

	// Set selected date to artist's assigned performance date only
	useEffect(() => {
		if (profile?.performanceDate) {
			// Artist is assigned - normalize date format and use their assigned date
			const normalizedDate = profile.performanceDate.includes("T")
				? profile.performanceDate.split("T")[0]
				: profile.performanceDate;
			setSelectedPerformanceDate(normalizedDate);
		} else {
			// Artist is not assigned - clear selected date
			setSelectedPerformanceDate("");
		}
	}, [profile?.performanceDate]);

	// Fetch available dates and event settings from event
	useEffect(() => {
		const fetchAvailableDates = async () => {
			if (!profile?.eventId) return;

			try {
				const response = await fetch(`/api/events/${profile.eventId}`);
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						// Convert showDates to proper format
						if (result.data.showDates) {
							const dates = result.data.showDates.map(
								(date: string) => {
									if (date.includes("T")) {
										return date.split("T")[0];
									}
									return date;
								},
							);
							setAvailableDates(dates);
						} else {
							setAvailableDates([]);
						}
						// Store artist_edit_enabled setting
						setArtistEditEnabled(
							result.data.artist_edit_enabled ?? false,
						);
					} else {
						setAvailableDates([]);
					}
				}
			} catch (error) {
				console.error("Error fetching available dates:", error);
				setAvailableDates([]);
			}

			// Fetch stage manager email for the edit blocked dialog
			try {
				const res = await fetch(
					`/api/artist-event-view/${profile.eventId}?artistId=${artistId}`,
				);
				if (res.ok) {
					const data = await res.json();
					if (data.success && data.data?.event) {
						setStageManagerEmail(
							data.data.event.stageManagerEmail || "",
						);
					}
				}
			} catch {
				// ignore
			}
		};

		fetchAvailableDates();
	}, [profile?.eventId, artistId]);

	// Fetch live board data when date is selected
	useEffect(() => {
		const loadLiveBoardData = async () => {
			// Load if event exists and a date is selected
			if (!profile?.eventId || !selectedPerformanceDate) {
				console.log(
					"Artist Dashboard: Skipping load - missing eventId or date",
					{
						eventId: profile?.eventId,
						selectedDate: selectedPerformanceDate,
					},
				);
				return;
			}

			console.log("Artist Dashboard: Loading live board data", {
				eventId: profile.eventId,
				selectedDate: selectedPerformanceDate,
			});

			try {
				const response = await fetch(
					`/api/events/${profile.eventId}/artists`,
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						const artists = (data.data || []).map(
							(artist: any) => ({
								id: artist.id,
								artist_name:
									artist.artistName || artist.artist_name,
								style: artist.style,
								image_url: artist.image_url || "",
								performance_duration:
									artist.performanceDuration ||
									artist.performance_duration ||
									5,
								actual_duration:
									artist.musicTracks?.find(
										(track: any) => track.is_main_track,
									)?.duration || null,
								performance_order:
									artist.performance_order || null,
								performance_status:
									artist.performance_status || null,
								performance_date:
									artist.performanceDate ||
									artist.performance_date,
								mc_notes: artist.mc_notes,
								backstage_color:
									artist.backstage_color || undefined,
							}),
						);

						const filteredArtists = artists.filter(
							(a: LiveBoardArtist) => {
								if (!a.performance_date) return false;
								const artistDate = a.performance_date.includes(
									"T",
								)
									? a.performance_date.split("T")[0]
									: a.performance_date;
								const selectedDate =
									selectedPerformanceDate.includes("T")
										? selectedPerformanceDate.split("T")[0]
										: selectedPerformanceDate;
								return artistDate === selectedDate;
							},
						);

						const assignedArtists = filteredArtists
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
								performance_order:
									artist.performance_order || 0,
								status:
									artist.performance_status || "not_started",
							}));

						console.log(
							"Artist Dashboard: Fetching cues for date:",
							selectedPerformanceDate,
						);

						// Normalize the date to YYYY-MM-DD format
						const normalizedDate = selectedPerformanceDate.includes(
							"T",
						)
							? selectedPerformanceDate.split("T")[0]
							: selectedPerformanceDate;

						console.log(
							"Artist Dashboard: Normalized date for cues query:",
							normalizedDate,
						);

						let cueItems: PerformanceItem[] = [];
						try {
							const cuesResponse = await fetch(
								`/api/events/${profile.eventId}/cues?performanceDate=${normalizedDate}`,
							);
							console.log(
								"Artist Dashboard: Cues response status:",
								cuesResponse.status,
							);
							if (cuesResponse.ok) {
								const cuesResult = await cuesResponse.json();
								console.log(
									"Artist Dashboard: Cues result:",
									cuesResult,
								);
								if (cuesResult.success) {
									cueItems = cuesResult.data.map(
										(cue: any) => ({
											id: cue.id,
											type: "cue" as const,
											cue: { ...cue },
											performance_order:
												cue.performance_order,
											status:
												cue.performance_status ||
												(cue.is_completed
													? "completed"
													: "not_started"),
										}),
									);
									console.log(
										"Artist Dashboard: Processed cue items:",
										cueItems,
									);
								}
							}
						} catch (cueError) {
							console.error("Error fetching cues:", cueError);
						}

						const allItems = [...assignedArtists, ...cueItems].sort(
							(a, b) => a.performance_order - b.performance_order,
						);
						console.log(
							"Artist Dashboard: All performance items:",
							allItems,
						);
						setPerformanceItems(allItems);

						// Fetch show order metadata to get draft/confirmed status
						try {
							const showOrderResponse = await fetch(
								`/api/events/${profile.eventId}/show-order?performanceDate=${selectedPerformanceDate}`,
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
										showOrderResult.data.isConfirmed ===
											true,
									);
								}
							}
						} catch (showOrderError) {
							console.error(
								"Error fetching show order metadata:",
								showOrderError,
							);
						}

						const currentIndex = allItems.findIndex(
							(item) => item.status === "currently_on_stage",
						);
						if (currentIndex !== -1) {
							setCurrentPerformerIndex(currentIndex);
						}
					}
				}
			} catch (error) {
				console.error("Error fetching live board data:", error);
			}
		};

		const loadEmergencyBroadcasts = async () => {
			if (!profile?.eventId) return;
			try {
				const response = await fetch(
					`/api/events/${profile.eventId}/emergency-broadcasts`,
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

		const loadEventTimings = async () => {
			if (!profile?.eventId) return;
			try {
				// Normalize date to YYYY-MM-DD for consistent API lookup
				const normalizedDate = selectedPerformanceDate
					? selectedPerformanceDate.includes("T")
						? selectedPerformanceDate.split("T")[0]
						: selectedPerformanceDate
					: "";
				const dateParam = normalizedDate
					? `?performanceDate=${normalizedDate}`
					: "";
				console.log("=== ARTIST DASHBOARD: Loading event timings ===", {
					eventId: profile.eventId,
					selectedPerformanceDate,
					normalizedDate,
					dateParam,
				});
				const response = await fetch(
					`/api/events/${profile.eventId}/timing-settings${dateParam}`,
				);
				if (response.ok) {
					const result = await response.json();
					console.log(
						"=== ARTIST DASHBOARD: Timing settings response ===",
						{
							success: result.success,
							data: result.data,
						},
					);
					if (result.success && result.data) {
						setEventTimings({
							backstage_ready_time:
								result.data.backstage_ready_time,
							show_start_time: result.data.show_start_time,
							rehearsal_start_time:
								result.data.rehearsal_start_time,
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

		if (profile?.eventId && selectedPerformanceDate) {
			loadLiveBoardData();
			loadEmergencyBroadcasts();
			loadEventTimings();
		}
	}, [profile?.eventId, selectedPerformanceDate, refreshTrigger]);

	// Fetch assigned artists for the same performance date
	useEffect(() => {
		const fetchAssignedArtists = async () => {
			if (!profile?.eventId || !profile?.performanceDate) {
				setAssignedArtists([]);
				return;
			}

			try {
				const response = await fetch(
					`/api/events/${profile.eventId}/artists`,
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						const artists = (data.data || [])
							.filter((artist: any) => {
								// Filter artists assigned to the same date
								if (
									!artist.performanceDate &&
									!artist.performance_date
								)
									return false;
								const artistDate = (
									artist.performanceDate ||
									artist.performance_date
								).includes("T")
									? (
											artist.performanceDate ||
											artist.performance_date
										).split("T")[0]
									: artist.performanceDate ||
										artist.performance_date;
								const myDate =
									profile.performanceDate!.includes("T")
										? profile.performanceDate!.split("T")[0]
										: profile.performanceDate;
								return artistDate === myDate;
							})
							.map((artist: any) => {
								// Convert musicTrack to musicTracks array if needed
								let musicTracks = artist.musicTracks;

								// Check if we have musicTrack (single object) that should be converted
								const hasMusicTrack =
									artist.musicTrack &&
									(artist.musicTrack.file_url ||
										artist.musicTrack.file_path ||
										artist.musicTrack.duration);

								// Check if musicTracks array exists and has valid tracks
								const hasValidMusicTracks =
									musicTracks &&
									Array.isArray(musicTracks) &&
									musicTracks.length > 0;

								// If we have musicTrack but no valid musicTracks, convert it
								if (hasMusicTrack && !hasValidMusicTracks) {
									const track = artist.musicTrack;
									musicTracks = [
										{
											song_title:
												track.song_title ||
												artist.artistName ||
												"Artist Track",
											duration: track.duration || 0,
											notes: track.notes || "",
											is_main_track: true,
											tempo: track.tempo || "",
											file_url:
												track.file_url ||
												track.file_path ||
												"",
											file_path:
												track.file_path ||
												track.file_url ||
												"",
										},
									];
								}

								// Find the main track duration
								const mainTrack = musicTracks?.find(
									(track: any) => track.is_main_track,
								);
								const actual_duration =
									mainTrack?.duration || null;

								return {
									id: artist.id,
									artistName:
										artist.artistName || artist.artist_name,
									realName:
										artist.realName ||
										artist.real_name ||
										"",
									style: artist.style,
									actual_duration,
								};
							});
						setAssignedArtists(artists);
					}
				}
			} catch (error) {
				console.error("Error fetching assigned artists:", error);
				setAssignedArtists([]);
			}
		};

		fetchAssignedArtists();
	}, [profile?.eventId, profile?.performanceDate, refreshTrigger]);

	// Fetch rehearsal schedule for the artist's date
	useEffect(() => {
		const fetchRehearsalSchedule = async () => {
			if (!profile?.eventId || !selectedPerformanceDate) {
				setRehearsalArtists([]);
				return;
			}

			setRehearsalLoading(true);
			try {
				const response = await fetch(
					`/api/events/${profile.eventId}/artists`,
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						const allArtists = (data.data || [])
							.filter((artist: any) => {
								const selectedDate =
									selectedPerformanceDate.includes("T")
										? selectedPerformanceDate.split("T")[0]
										: selectedPerformanceDate;
								if (!artist.rehearsal_date || artist.rehearsal_order === null) return false;
								const rd = artist.rehearsal_date;
								const normalizedRd = rd.includes("T") ? rd.split("T")[0] : rd;
								return normalizedRd === selectedDate;
							})
							.map((artist: any) => ({
								id: artist.id,
								artist_name:
									artist.artistName || artist.artist_name,
								style: artist.style || "",
								rehearsal_order: artist.rehearsal_order ?? null,
								rehearsal_completed:
									artist.rehearsal_completed || false,
								rehearsal_date: artist.rehearsal_date || null,
								performance_date:
									artist.performanceDate ||
									artist.performance_date,
								image_url: artist.image_url || "",
							}))
							.sort((a: any, b: any) => {
								return (a.rehearsal_order || 0) - (b.rehearsal_order || 0);
							});
						setRehearsalArtists(allArtists);
					}
				}
			} catch (error) {
				console.error("Error fetching rehearsal schedule:", error);
			} finally {
				setRehearsalLoading(false);
			}
		};

		fetchRehearsalSchedule();
	}, [profile?.eventId, selectedPerformanceDate, refreshTrigger]);

	// Listen for WebSocket toast events
	useEffect(() => {
		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toastRef.current({
				title,
				description,
				variant: variant || "default",
			});
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
	}, []);

	// Initialize WebSocket for live board updates
	useEffect(() => {
		if (!profile?.eventId) return;

		let wsManager: any = null;

		const initializeWebSocketManager = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId: profile.eventId,
					role: "artist",
					userId: `artist_${artistId}`,
					showToasts: true, // Enable toasts for real-time notifications
					onConnect: () => {
						setWsConnected(true);
					},
					onDisconnect: () => {
						setWsConnected(false);
					},
					onDataUpdate: () => {
						// Add small delay to allow batch updates to complete
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					},
				});

				await wsManager.initialize();

				// Listen for show date info updates
				if (wsManager.socket) {
					wsManager.socket.on(
						"show_date_info_updated",
						(data: any) => {
							if (data.eventId === profile.eventId) {
								// Show toast notification
								const formattedDate = data.showDate
									? new Date(
											data.showDate,
										).toLocaleDateString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
										})
									: "a show date";

								toastRef.current({
									title: data.isNew
										? "📋 New Show Info"
										: "📋 Show Info Updated",
									description: `Stage manager ${
										data.isNew ? "added" : "updated"
									} information for ${formattedDate}.`,
									variant: "default",
								});

								// Refresh ShowDateInfoCard
								setRefreshTrigger((prev) => prev + 1);
							}
						},
					);
				}

				// Listen for show order batch updates (reordering)
				wsManager.on("show-order-updated", (data: any) => {
					console.log(
						"Artist Dashboard: Received show-order-updated:",
						{
							received: data,
							currentEventId: profile.eventId,
							currentDate: selectedPerformanceDate,
						},
					);

					if (data.eventId === profile.eventId) {
						// Always update draft/confirmed state for this event
						if (data.isDraft !== undefined) {
							setIsDraftShowOrder(data.isDraft);
						}
						if (data.isConfirmed !== undefined) {
							setIsShowOrderConfirmed(data.isConfirmed);
						}

						console.log(
							"Artist Dashboard: Match! Refreshing in 500ms...",
						);
						// Add delay to ensure GCS write has completed
						setTimeout(() => {
							console.log(
								"Artist Dashboard: Triggering refresh...",
							);
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					} else {
						console.log(
							"Artist Dashboard: No match, skipping refresh",
						);
					}
				});

				// Listen for artist assignment updates (when stage manager assigns/unassigns dates)
				wsManager.on("artist_assigned", (data: any) => {
					console.log(
						"🎭 Artist Dashboard: Received artist_assigned event:",
						{
							received: data,
							currentArtistId: artistId,
							matches: data.artistId === artistId,
						},
					);

					if (data.artistId === artistId) {
						console.log(
							"✅ Artist assigned! Refreshing profile...",
						);
						// Refresh the profile to get updated performance date
						fetchArtistProfile();
						// Also refresh live board data
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);

						// Format the date for display
						const formattedDate = data.performance_date
							? new Date(
									data.performance_date,
								).toLocaleDateString("en-US", {
									weekday: "long",
									month: "long",
									day: "numeric",
									year: "numeric",
								})
							: "a performance date";

						// Show toast notification
						toastRef.current({
							title: "🎉 You've Been Assigned!",
							description: `Great news! You're scheduled to perform on ${formattedDate}. Check your Live Board for details.`,
							variant: "default",
						});
					}
				});

				wsManager.on("artist_unassigned", (data: any) => {
					console.log(
						"🎭 Artist Dashboard: Received artist_unassigned event:",
						{
							received: data,
							currentArtistId: artistId,
							matches: data.artistId === artistId,
						},
					);

					if (data.artistId === artistId) {
						console.log(
							"✅ Artist unassigned! Refreshing profile...",
						);
						// Refresh the profile to clear performance date
						fetchArtistProfile();
						// Also refresh live board data
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);

						// Show toast notification
						toastRef.current({
							title: "📅 Schedule Change",
							description:
								"Your performance date has been updated by the stage manager. Please check with them for more details.",
							variant: "default",
						});
					}
				});

				// Listen for new notification events
				wsManager.on("new_notification", (data: any) => {
					console.log(
						"🔔 Artist Dashboard: Received new_notification event:",
						{
							received: data,
							currentEventId: profile.eventId,
						},
					);

					// Note: Window event and toast are already handled by WebSocket manager
					// This handler is just for any additional dashboard-specific logic
				});

				// Listen for new chat messages
				wsManager.on("new_chat_message", (data: any) => {
					console.log(
						"💬 Artist Dashboard: Received new_chat_message event:",
						{
							received: data,
							currentEventId: profile.eventId,
							currentArtistId: artistId,
						},
					);

					// Dispatch window event for ArtistChatButton to pick up
					window.dispatchEvent(
						new CustomEvent("new_chat_message", {
							detail: data,
						}),
					);
				});

				// Listen for new personal messages
				wsManager.on("new_personal_message", (data: any) => {
					console.log(
						"🔒 Artist Dashboard: Received new_personal_message event:",
						{
							received: data,
							currentEventId: profile.eventId,
							currentArtistId: artistId,
							matches: data.artistId === artistId,
						},
					);

					if (data.artistId === artistId) {
						// Show toast notification for personal message
						toastRef.current({
							title: "🔒 Personal Message",
							description:
								"You have received a private message from the stage manager.",
							variant: "default",
						});

						// Dispatch window event for ArtistChatButton to pick up
						window.dispatchEvent(
							new CustomEvent("new_personal_message", {
								detail: data,
							}),
						);
					}
				});

				// Listen for cue updates (add, edit, delete)
				wsManager.on("cue_updated", (data: any) => {
					console.log(
						"🎬 Artist Dashboard: Received cue_updated event:",
						{
							received: data,
							currentEventId: profile.eventId,
							currentDate: selectedPerformanceDate,
						},
					);

					// Normalize both dates for comparison
					const normalizedSelectedDate =
						selectedPerformanceDate.includes("T")
							? selectedPerformanceDate.split("T")[0]
							: selectedPerformanceDate;

					const normalizedEventDate = data.performanceDate?.includes(
						"T",
					)
						? data.performanceDate.split("T")[0]
						: data.performanceDate;

					if (
						data.eventId === profile.eventId &&
						normalizedEventDate === normalizedSelectedDate
					) {
						console.log(
							"✅ Cue updated! Refreshing performance items...",
						);
						// Refresh live board data to show updated cues
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					}
				});

				// Listen for artist info updates (force logout)
				wsManager.on("artist_info_updated", (data: any) => {
					console.log(
						"🔔 Artist Dashboard: Received artist_info_updated event:",
						{
							received: data,
							currentArtistId: artistId,
							matches: data.artistId === artistId,
							action: data.action,
						},
					);

					if (
						data.artistId === artistId &&
						data.action === "force_logout"
					) {
						console.log(
							"✅ Artist Dashboard: Conditions met! Showing logout dialog...",
						);
						// Clear artist session
						localStorage.removeItem("artistSession");

						// Show logout dialog using React state
						setShowLogoutDialog(true);

						// Auto-redirect after 5 seconds
						setTimeout(() => {
							console.log("⏰ Auto-redirecting to login page...");
							router.push("/famelink-auth");
						}, 5000);
					} else {
						console.log(
							"❌ Artist Dashboard: Conditions not met, skipping logout",
						);
					}
				});

				// Listen for artist backstage color updates
				wsManager.on("artist_color_updated", (data: any) => {
					console.log(
						"🎨 Artist Dashboard: Received artist_color_updated event:",
						{
							received: data,
							currentEventId: profile.eventId,
						},
					);

					if (data.eventId === profile.eventId) {
						console.log(
							"✅ Artist color updated! Refreshing performance items from GCS...",
						);
						// Refresh live board data from GCS to show updated colors
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					} else {
						console.log("❌ Event ID mismatch, skipping refresh");
					}
				});

				// Listen for timing settings updates (show start time, rehearsal start time)
				wsManager.on("timing-settings-updated", (data: any) => {
					if (data.eventId === profile.eventId) {
						console.log(
							"⏱️ Artist Dashboard: Timing settings updated, refreshing...",
						);
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					}
				});

				// Listen for rehearsal updates (reorder, schedule, remove, completion)
				wsManager.on("rehearsal_updated", (data: any) => {
					if (data.eventId === profile.eventId) {
						console.log(
							"🔄 Artist Dashboard: Rehearsal updated, refreshing...",
						);
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					}
				});

				// Listen for artist/cue completion toggles (checkmarks on show order)
				wsManager.on("artist_completion_toggled", (data: any) => {
					if (data.eventId === profile.eventId) {
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					}
				});
				wsManager.on("cue_completion_toggled", (data: any) => {
					if (data.eventId === profile.eventId) {
						setTimeout(() => {
							setRefreshTrigger((prev) => prev + 1);
						}, 500);
					}
				});

				// Listen for event setting changes (artist_edit_enabled toggle)
				wsManager.on("event_setting_changed", (data: any) => {
					if (
						data.eventId === profile.eventId &&
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

				// Listen for check-in updates (real-time green checkmarks)
				wsManager.on("artist_checked_in", (data: any) => {
					if (
						data.eventId === profile.eventId &&
						data.artistId === artistId
					) {
						refetchCheckIn();
						toastRef.current({
							title:
								data.type === "rehearsal"
									? data.checkedIn ? "✅ Rehearsal Check-In" : "❌ Rehearsal Checked Out"
									: data.checkedIn ? "✅ Performance Check-In" : "❌ Performance Checked Out",
							description:
								data.checkedIn ? "You have been checked in successfully!" : "You have been checked out.",
							variant: "default",
						});
					}
				});

				// Listen for call events and dispatch to ArtistCallNotification
				wsManager.on("artist_called", (data: any) => {
					console.log("[Artist Dashboard] WebSocket received 'artist_called' event:", data);
					const dataArtistId = data?.artistId || "";
					const currentArtistId = artistId || "";
					const dataEventId = data?.eventId || "";
					const currentEventId = profile?.eventId || "";

					if (
						dataEventId.toLowerCase() === currentEventId.toLowerCase() &&
						dataArtistId.toLowerCase() === currentArtistId.toLowerCase()
					) {
						console.log("[Artist Dashboard] Match! Dispatching 'artist_called' custom event to window.");
						window.dispatchEvent(
							new CustomEvent("artist_called", { detail: data }),
						);
						setActiveCall(data);
					} else {
						console.log("[Artist Dashboard] Mismatch. Expected:", { artistId: currentArtistId, eventId: currentEventId }, "Got:", { artistId: dataArtistId, eventId: dataEventId });
					}
				});

				(window as any).artistLiveBoardWsManager = wsManager;
			} catch (error) {
				console.error("Error initializing WebSocket:", error);
				setWsConnected(false);
			}
		};

		initializeWebSocketManager();

		return () => {
			if ((window as any).artistLiveBoardWsManager) {
				// Clean up socket listeners before destroying
				const wsManager = (window as any).artistLiveBoardWsManager;
				wsManager.off("show-order-updated");
				wsManager.off("artist_assigned");
				wsManager.off("artist_unassigned");
				wsManager.off("show_date_info_updated");
				wsManager.off("new_notification");
				wsManager.off("new_chat_message");
				wsManager.off("new_personal_message");
				wsManager.off("cue_updated");
				wsManager.off("artist_info_updated");
				wsManager.off("artist_color_updated");
				wsManager.off("timing-settings-updated");
				wsManager.off("rehearsal_updated");
				wsManager.off("artist_completion_toggled");
				wsManager.off("cue_completion_toggled");
				wsManager.off("event_setting_changed");
				wsManager.off("artist_checked_in");
				wsManager.off("artist_called");
				wsManager.destroy();
				delete (window as any).artistLiveBoardWsManager;
			}
		};
	}, [profile?.eventId, artistId, router]);

	const fetchArtistProfile = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/artists/${artistId}`);
			const data = await response.json();

			if (!response.ok) {
				if (response.status === 404) {
					console.log("[DASHBOARD] Profile not found in database, clearing invalid session...");
					// Use window.location for a full page reload through the logout route
					window.location.href = `/api/auth/logout?redirect=/famelink-auth?artistId=${artistId}`;
					return;
				} else if (data.success === false) {
					setError(
						data.error?.message || "Failed to load artist profile",
					);
				} else {
					setError("Failed to load artist profile");
				}
				return;
			}

			if (data.success && data.data) {
				// Convert musicTrack (single object) to musicTracks (array) if needed
				const profileData = data.data;

				// Check if we have musicTrack (single object) that should be converted
				const hasMusicTrack =
					profileData.musicTrack &&
					(profileData.musicTrack.file_url ||
						profileData.musicTrack.file_path ||
						profileData.musicTrack.duration);

				// Check if musicTracks array exists and has valid tracks with file_url
				const hasValidMusicTracks =
					profileData.musicTracks &&
					Array.isArray(profileData.musicTracks) &&
					profileData.musicTracks.length > 0 &&
					profileData.musicTracks.some(
						(track: any) => track.file_url || track.file_path,
					);

				// If we have musicTrack but no valid musicTracks, convert it
				if (hasMusicTrack && !hasValidMusicTracks) {
					const track = profileData.musicTrack;
					profileData.musicTracks = [
						{
							song_title:
								track.song_title ||
								profileData.artistName ||
								"Artist Track",
							duration: track.duration || 0,
							notes: track.notes || "",
							is_main_track: true,
							tempo: track.tempo || "",
							file_url: track.file_url || track.file_path || "",
							file_path: track.file_path || track.file_url || "",
						},
					];
				}
				// Also handle case where musicTracks exists but items need file_url normalization
				if (
					profileData.musicTracks &&
					Array.isArray(profileData.musicTracks)
				) {
					profileData.musicTracks = profileData.musicTracks.map(
						(track: any) => ({
							...track,
							file_url: track.file_url || track.file_path || "",
							file_path: track.file_path || track.file_url || "",
						}),
					);
				}
				setProfile(profileData);
			} else {
				setError("Invalid response format");
			}
		} catch (error) {
			console.error("Error fetching profile:", error);
			setError("Network error occurred");
			toast({
				title: "❌ Loading Error",
				description: "Failed to load your profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "approved":
			case "active":
				return "default";
			case "pending":
				return "secondary";
			default:
				return "outline";
		}
	};

	// Live Board helper functions
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
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours}h ${minutes}m ${secs}s`;
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

	const calculateTotalShowTime = () => {
		return performanceItems.reduce((total, item) => {
			if (item.type === "artist" && item.artist) {
				return total + (item.artist.performance_duration || 0);
			} else if (item.type === "cue" && item.cue) {
				return total + (item.cue.duration || 0) * 60;
			}
			return total;
		}, 0);
	};

	const calculateRemainingTime = () => {
		const remainingItems = performanceItems.slice(currentPerformerIndex);
		const totalRemaining = remainingItems.reduce((total, item) => {
			if (item.type === "artist" && item.artist) {
				return total + (item.artist.performance_duration || 0);
			} else if (item.type === "cue" && item.cue) {
				return total + (item.cue.duration || 0) * 60;
			}
			return total;
		}, 0);
		return Math.max(0, totalRemaining - elapsedTime);
	};

	const getCurrentItem = () => performanceItems[currentPerformerIndex];
	const getNextItem = () => performanceItems[currentPerformerIndex + 1];
	const getOnDeckItem = () => performanceItems[currentPerformerIndex + 2];

	// Helper function to get item status (matches live-board logic)
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

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Error</h2>
					<p className="text-muted-foreground mb-4">{error}</p>
					<div className="space-x-2">
						<Button onClick={() => router.push("/")}>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Home
						</Button>
						<Button variant="outline" onClick={fetchArtistProfile}>
							Try Again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						No Profile Found
					</h2>
					<p className="text-muted-foreground mb-4">
						Artist profile could not be loaded.
					</p>
					<Button onClick={() => router.push("/")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Home
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-8">
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
			{/* Artist Call Notification - listens for targeted calls from stage manager */}
			{profile?.eventId && (
				<ArtistCallNotification
					artistId={artistId}
					eventId={profile.eventId}
				/>
			)}
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
								You will be redirected to the login page in a
								few seconds...
							</p>
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 mt-4">
						<Button
							onClick={() => {
								router.push("/famelink-auth");
							}}
							className="bg-red-600 hover:bg-red-700"
						>
							Go to Login
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Enhanced Header with Logo */}
			<header className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl">
				<div className="container mx-auto px-3 sm:px-4 py-3 md:py-8">
					<div className="flex flex-row items-center justify-between gap-2 md:gap-4">
						<div className="flex items-center gap-2 md:gap-6 min-w-0">
							<div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-3xl p-1.5 md:p-3 border border-white/20 shadow-2xl flex-shrink-0">
								<img
									src="/fame-logo.png"
									alt="FAME Logo"
									className="h-8 w-8 md:h-16 md:w-16 object-contain drop-shadow-2xl"
								/>
							</div>
							<div className="min-w-0">
								<h1 className="text-lg sm:text-2xl md:text-4xl font-bold drop-shadow-2xl mb-0.5 truncate">
									Artist Dashboard
								</h1>
								<p className="text-purple-100 text-xs sm:text-sm md:text-xl font-medium truncate">
									Welcome, {profile.artistName}!
								</p>
							</div>
						</div>
						<div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
							{/* Notification Bell */}
							{profile.eventId && (
								<NotificationBell
									eventId={profile.eventId}
									artistId={profile.id}
									showDate={selectedPerformanceDate}
								/>
							)}
							{/* Chat Button */}
							{profile.eventId && (
								<ArtistChatButton
									eventId={profile.eventId}
									artistId={profile.id}
									showDate={
										profile.performanceDate || undefined
									}
									variant="ghost"
									className="text-white hover:bg-white/20"
								/>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="text-white hover:bg-white/20 h-8 px-2 md:px-3"
								onClick={() => {
									if (artistEditEnabled) {
										router.push(`/artist-edit/${profile.id}`);
									} else {
										setShowEditBlockedDialog(true);
									}
								}}
							>
								<Edit className="h-4 w-4" />
								<span className="hidden sm:inline ml-1.5">Edit</span>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-white hover:bg-white/20 h-8 px-2 md:px-3"
								onClick={() => {
									localStorage.removeItem("artistSession");
									router.push("/famelink-auth");
								}}
							>
								<LogOut className="h-4 w-4" />
								<span className="hidden sm:inline ml-1.5">Logout</span>
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile Drawer Overlay */}
			{isDrawerOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={() => setIsDrawerOpen(false)}
				/>
			)}

			{/* Mobile Drawer */}
			<div
				className={`fixed top-0 left-0 h-full w-[min(320px,85vw)] bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
					isDrawerOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="p-4">
					{/* Close Button */}
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

					{/* Profile Section */}
					<div className="flex items-center gap-4 mb-8 mt-4">
						{profile?.image_url ? (
							<FullScreenImageViewer
								src={`/api/media/${profile.image_url}`}
								alt={profile.artistName}
								className="w-16 h-16"
							>
								<img
									src={`/api/media/${profile.image_url}`}
									alt={profile.artistName}
									className="w-16 h-16 rounded-full border-2 border-purple-400 object-cover"
								/>
							</FullScreenImageViewer>
						) : (
							<div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
								<User className="h-8 w-8" />
							</div>
						)}
						<div>
							<h3 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
								{profile?.artistName}
							</h3>
							<p className="text-sm text-gray-400">Artist</p>
						</div>
					</div>

					{/* Navigation Links */}
					<nav className="space-y-2">
						<button
							onClick={() => {
								setActiveTab("liveboard");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "liveboard"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-green-400 rounded-full"></span>
							<span>Live Board</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("overview");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "overview"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-purple-400 rounded-full"></span>
							<span>Overview</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("rehearsal");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "rehearsal"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-orange-400 rounded-full"></span>
							<span>Rehearsal</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("music");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "music"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-pink-400 rounded-full"></span>
							<span>Music</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("technical");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "technical"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-yellow-400 rounded-full"></span>
							<span>Technical</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("gallery");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "gallery"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-blue-400 rounded-full"></span>
							<span>Gallery</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("assigned-artists");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "assigned-artists"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-teal-400 rounded-full"></span>
							<span>Assigned Artists</span>
						</button>
						<button
							onClick={() => {
								setActiveTab("event");
								setIsDrawerOpen(false);
							}}
							className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
								activeTab === "event"
									? "bg-white/20"
									: "hover:bg-white/10"
							}`}
						>
							<span className="w-1 h-6 bg-indigo-400 rounded-full"></span>
							<span>Event Details</span>
						</button>
					</nav>
				</div>
			</div>

			<main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8 max-w-7xl">
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full"
				>
					{/* Mobile Hamburger Button */}
					<div className="lg:hidden mb-3">
						<Button
							variant="outline"
							onClick={() => setIsDrawerOpen(true)}
							className="w-full flex items-center justify-between border border-purple-200 bg-white hover:bg-purple-50 h-10 px-3"
						>
							<span className="flex items-center gap-2 font-medium text-sm text-slate-700">
								<svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
								</svg>
								<span>
									{activeTab === "liveboard" && "Live Board"}
									{activeTab === "overview" && "Overview"}
									{activeTab === "rehearsal" && "Rehearsal"}
									{activeTab === "music" && "Music"}
									{activeTab === "technical" && "Technical"}
									{activeTab === "gallery" && "Gallery"}
									{activeTab === "assigned-artists" && "Assigned Artists"}
									{activeTab === "event" && "Event Details"}
								</span>
							</span>
							<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</Button>
					</div>

					{/* Desktop Menu - Always Visible */}
					<TabsList className="hidden lg:grid w-full grid-cols-8 bg-transparent p-2 gap-2 mb-6 lg:mb-8">
						<TabsTrigger
							value="liveboard"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Live Board
						</TabsTrigger>
						<TabsTrigger
							value="overview"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Overview
						</TabsTrigger>
						<TabsTrigger
							value="rehearsal"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Rehearsal
						</TabsTrigger>
						<TabsTrigger
							value="music"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Music
						</TabsTrigger>
						<TabsTrigger
							value="technical"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Technical
						</TabsTrigger>
						<TabsTrigger
							value="gallery"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Gallery
						</TabsTrigger>
						<TabsTrigger
							value="assigned-artists"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Assigned Artists
						</TabsTrigger>
						<TabsTrigger
							value="event"
							className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 text-sm lg:text-base px-3 py-3 font-medium hover:bg-white/10"
						>
							Event Details
						</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent
						value="overview"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						{/* Membership Card */}
						{profile?.eventId && (
							<MembershipCard
								artistName={profile.artistName}
								artistId={artistId}
								eventId={profile.eventId}
								memberSince={profile.createdAt}
								profileImage={
									profile.image_url
										? `/api/media/${profile.image_url.replace(/^gs:\/\/[^/]+\//, "")}`
										: undefined
								}
								isFameLinkArtist={false}
								rehearsalCheckedIn={rehearsalCheckedIn}
								performanceCheckedIn={performanceCheckedIn}
							/>
						)}

						{/* Show Order and Date Section */}
						<div className="bg-white rounded-xl shadow-md border border-purple-100 p-4 sm:p-5 md:p-6">
							<h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
								Assigned Performance Date
							</h3>
							<div className="space-y-2 sm:space-y-3">
								<div>
									{profile.performanceDate ? (
										<div className="text-center py-3 sm:py-4 md:py-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 my-3 sm:my-4 md:my-5">
											<div className="flex items-center justify-center gap-2 mb-2">
												<CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
												<p className="text-xs sm:text-sm font-medium text-green-700">
													You are assigned to perform
													at
												</p>
											</div>
											<p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 px-2">
												{formatDateSimple(
													profile.performanceDate,
												)}
											</p>
										</div>
									) : (
										<div className="text-center py-8 sm:py-10 md:py-12 bg-amber-50 rounded-lg border-2 border-amber-200">
											<AlertTriangle className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 mx-auto mb-3 sm:mb-4 text-amber-500" />
											<h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-2">
												Not Assigned Yet
											</h3>
											<p className="text-sm sm:text-base text-amber-700 px-4">
												The stage manager has not
												assigned you to a performance
												date yet. Please check back
												later.
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</TabsContent>

					{/* Overview Tab */}
					<TabsContent
						value="overview"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
							{/* Basic Information */}
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-purple-300 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-purple-100 rounded-full p-1.5 sm:p-2">
											<User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
										</div>
										<span className="text-gray-900">
											Basic Information
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									{/* Profile Image */}
									<div className="flex justify-center mb-3 sm:mb-4">
										{profile.image_url ? (
											<FullScreenImageViewer
												src={`/api/media/${profile.image_url}`}
												alt={profile.artistName}
												className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
											>
												<img
													src={`/api/media/${profile.image_url}`}
													alt={profile.artistName}
													className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-purple-200 shadow-lg"
												/>
											</FullScreenImageViewer>
										) : (
											<div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg">
												<User className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-purple-400" />
											</div>
										)}
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Artist ID
										</p>
										<p className="font-medium text-[10px] sm:text-xs text-gray-600 break-all">
											{profile.id}
										</p>
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Artist Name
										</p>
										<p className="font-medium text-sm sm:text-base">
											{profile.artistName}
										</p>
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Real Name
										</p>
										<p className="font-medium text-sm sm:text-base">
											{profile.realName}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
										<EmailLink
											email={profile.email}
											className="text-xs sm:text-sm break-all"
										/>
									</div>
									<div className="flex items-center gap-2">
										<WhatsAppIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
										<WhatsAppLink
											phoneNumber={profile.phone}
											className="text-xs sm:text-sm"
											showIcon={false}
										/>
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Performance Style
										</p>
										<p className="font-medium text-sm sm:text-base">
											{profile.style}
										</p>
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Performance Type
										</p>
										<p className="font-medium text-sm sm:text-base">
											{profile.performanceType}
										</p>
									</div>
									<div>
										<p className="text-xs sm:text-sm text-muted-foreground">
											Duration
										</p>
										<p className="font-medium text-sm sm:text-base">
											{musicTracks &&
											musicTracks.length > 0 &&
											musicTracks[0].duration
												? formatDuration(
														musicTracks[0].duration,
													)
												: `${profile.performanceDuration} minutes`}
										</p>
									</div>
									{/* Nationality Information */}
									{(profile.countryLiving ||
										profile.homeCountry ||
										(profile.members &&
											profile.members.length > 0)) && (
										<div className="col-span-full mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
											<p className="text-xs sm:text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
												<Globe className="h-4 w-4" />
												Nationality Information
											</p>
											{profile.members &&
											profile.members.length > 0 ? (
												<div className="space-y-2">
													{profile.members.map(
														(member, index) => (
															<div
																key={index}
																className="flex flex-wrap items-center gap-2 text-xs sm:text-sm"
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
												<div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
													{profile.countryLiving && (
														<span className="flex items-center gap-1">
															{getCountryFlag(
																profile.countryLiving,
															)}{" "}
															Living in{" "}
															{getCountryName(
																profile.countryLiving,
															)}
														</span>
													)}
													{profile.homeCountry && (
														<span className="flex items-center gap-1 text-gray-600">
															|{" "}
															{getCountryFlag(
																profile.homeCountry,
															)}{" "}
															From{" "}
															{getCountryName(
																profile.homeCountry,
															)}
														</span>
													)}
												</div>
											)}
										</div>
									)}

									{/* T-Shirt Sizes */}
									{profile.tshirtSizes &&
										profile.tshirtSizes.length > 0 && (
											<div className="col-span-full mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
												<p className="text-xs sm:text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
													<User className="h-4 w-4" />
													T-Shirt Sizes
												</p>
												<div className="space-y-2">
													{profile.tshirtSizes.map(
														(tshirt, index) => (
															<div
																key={index}
																className="flex flex-wrap items-center gap-2 text-xs sm:text-sm bg-white p-2 rounded border border-green-100"
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

							{/* Biography */}
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-pink-300 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-pink-100 rounded-full p-1.5 sm:p-2">
											<User className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
										</div>
										<span className="text-gray-900">
											Biography
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									<p className="text-xs sm:text-sm md:text-base leading-relaxed">
										{profile.biography}
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Social Media Links */}
						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-blue-300 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
								<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
									<div className="bg-blue-100 rounded-full p-1.5 sm:p-2">
										<Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
									</div>
									<span className="text-gray-900">
										Social Media & Links
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 sm:space-y-5 md:space-y-6 pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
									{profile.socialMedia?.instagram && (
										<a
											href={profile.socialMedia.instagram}
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
									{profile.socialMedia?.facebook && (
										<a
											href={profile.socialMedia.facebook}
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
									{profile.socialMedia?.youtube && (
										<a
											href={profile.socialMedia.youtube}
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
									{profile.socialMedia?.website && (
										<a
											href={profile.socialMedia.website}
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
									{profile.showLink && (
										<a
											href={profile.showLink}
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
					</TabsContent>

					{/* Rehearsal Tab */}
					<TabsContent
						value="rehearsal"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-orange-200">
							<CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-5">
								<div className="flex items-center justify-between gap-2">
									<CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
										<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
										<span className="truncate">
											Rehearsal Schedule
										</span>
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
								<CardDescription className="text-xs sm:text-sm mt-1">
									Rehearsal order for your performance date
								</CardDescription>
								{!eventTimings.rehearsal_start_time &&
									!eventTimings.show_start_time &&
									rehearsalArtists.length > 0 && (
										<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
											⏱️ Rehearsal timing not set yet.
											Timing badges will appear once the
											stage manager sets the rehearsal
											start time.
										</div>
									)}
							</CardHeader>
							<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
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
											console.log(
												"=== ARTIST DASHBOARD: Rehearsal Rendering ===",
												{
													eventTimings,
													rehearsalTimeOverrides,
													rehearsalArtistsCount:
														rehearsalArtists.length,
													rehearsal_start_time:
														eventTimings.rehearsal_start_time,
													show_start_time:
														eventTimings.show_start_time,
												},
											);
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
																performance_duration: 5,
																quality_rating:
																	null,
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
													eventTimings.rehearsal_start_time ||
														eventTimings.show_start_time,
													rehearsalTimeOverrides,
												);
											return rehearsalArtists.map(
												(artist, index) => {
													const isCurrentArtist =
														artist.id === artistId;
													return (
														<div
															key={artist.id}
															className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
																isCurrentArtist
																	? "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400 shadow-md"
																	: artist.rehearsal_completed
																		? "bg-green-50 border-l-4 border-l-green-500"
																		: "bg-white border-l-4 border-l-gray-200"
															}`}
														>
															{/* Position Number */}
															<span
																className={`text-xs sm:text-sm font-mono px-1.5 py-0.5 rounded font-semibold min-w-[1.75rem] text-center border ${
																	isCurrentArtist
																		? "bg-orange-200 text-orange-800 border-orange-400"
																		: "bg-blue-100 text-blue-700 border-blue-300"
																}`}
															>
																#
																{artist.rehearsal_order !==
																null
																	? artist.rehearsal_order
																	: index + 1}
															</span>
															{/* Rehearsal Timing */}
															{rehearsalLiveTimings[
																index
															]?.startTime && (
																<span
																	className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${isCurrentArtist ? "bg-orange-100 text-orange-700 border border-orange-300" : "bg-yellow-100 text-yellow-800 border border-yellow-400"}`}
																	title={`${rehearsalLiveTimings[index]?.startTime} - ${rehearsalLiveTimings[index]?.endTime} (planned)`}
																>
																	{
																		rehearsalLiveTimings[
																			index
																		]
																			?.startTime
																	}
																</span>
															)}
															{/* Avatar */}
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
															{/* Name & Style */}
															<div className="flex-1 min-w-0">
																<div
																	className={`font-medium truncate ${isCurrentArtist ? "text-orange-900" : ""}`}
																>
																	{
																		artist.artist_name
																	}
																	{isCurrentArtist && (
																		<span className="ml-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
																			You
																		</span>
																	)}
																</div>
																<div
																	className={`text-sm truncate ${isCurrentArtist ? "text-orange-700" : "text-muted-foreground"}`}
																>
																	{
																		artist.style
																	}
																</div>
															</div>
															{/* Status */}
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

					{/* Music Tab */}
					<TabsContent
						value="music"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						{activeTab === "music" && (
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-pink-100 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-pink-100 rounded-full p-1.5 sm:p-2">
											<Music className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
										</div>
										<span className="text-gray-900">
											Music Tracks
										</span>
									</CardTitle>
									<CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
										Your uploaded music tracks for the
										performance
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									<div className="space-y-4">
										{musicTracks &&
										musicTracks.length > 0 ? (
											musicTracks.map((track, index) => (
												<MusicTrackPlayer
													key={`${profileId}-track-${index}-${track.song_title}`}
													track={track}
													index={index}
													profileId={profileId}
												/>
											))
										) : (
											<p className="text-center text-muted-foreground py-8">
												No music tracks uploaded yet
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Technical Tab */}
					<TabsContent
						value="technical"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
							{/* Costume & Lighting */}
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-yellow-300 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-yellow-100 rounded-full p-1.5 sm:p-2">
											<Palette className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
										</div>
										<span className="text-gray-900">
											Costume & Lighting
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									{/* Costume Colors - Prioritize manual colors */}
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											🎨 Costume Colors
										</p>
										{profile.manualCostumeColor ||
										profile.manualCostumeColorTwo ||
										profile.manualCostumeColorThree ? (
											<div className="space-y-2">
												{profile.manualCostumeColor && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualCostumeColor,
															}}
														></div>
														<span className="text-sm">
															Primary:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualCostumeColor
																}
															</span>
														</span>
													</div>
												)}
												{profile.manualCostumeColorTwo && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualCostumeColorTwo,
															}}
														></div>
														<span className="text-sm">
															Secondary:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualCostumeColorTwo
																}
															</span>
														</span>
													</div>
												)}
												{profile.manualCostumeColorThree && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-purple-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualCostumeColorThree,
															}}
														></div>
														<span className="text-sm">
															Third:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualCostumeColorThree
																}
															</span>
														</span>
													</div>
												)}
											</div>
										) : (
											<p className="text-sm text-gray-500 italic">
												No costume colors selected
											</p>
										)}
										{profile.customCostumeColor && (
											<p className="text-sm text-muted-foreground mt-2">
												Custom Details:{" "}
												{profile.customCostumeColor}
											</p>
										)}
									</div>
									{/* Lighting Colors - Prioritize manual colors */}
									<div>
										<p className="text-sm text-muted-foreground mb-2">
											💡 Lighting Preferences
										</p>
										{profile.manualLightColor ||
										profile.manualLightColorTwo ||
										profile.manualLightColorThree ? (
											<div className="space-y-2">
												{profile.manualLightColor && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualLightColor,
															}}
														></div>
														<span className="text-sm">
															Primary:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualLightColor
																}
															</span>
														</span>
													</div>
												)}
												{profile.manualLightColorTwo && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualLightColorTwo,
															}}
														></div>
														<span className="text-sm">
															Secondary:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualLightColorTwo
																}
															</span>
														</span>
													</div>
												)}
												{profile.manualLightColorThree && (
													<div className="flex items-center gap-3">
														<div
															className="w-8 h-8 rounded-lg border-2 border-yellow-300 shadow-sm"
															style={{
																backgroundColor:
																	profile.manualLightColorThree,
															}}
														></div>
														<span className="text-sm">
															Third:{" "}
															<span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
																{
																	profile.manualLightColorThree
																}
															</span>
														</span>
													</div>
												)}
											</div>
										) : (
											<p className="text-sm text-gray-500 italic">
												Trust the Lighting Designer ✨
											</p>
										)}
									</div>
									{profile.lightRequests && (
										<div>
											<p className="text-sm text-muted-foreground">
												Special Lighting Requests
											</p>
											<p className="text-sm">
												{profile.lightRequests}
											</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Stage Positioning */}
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-blue-100 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-blue-100 rounded-full p-1.5 sm:p-2">
											<Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
										</div>
										<span className="text-gray-900">
											Stage Positioning
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									{(profile.stagePositionStart ||
										profile.stagePositionEnd) && (
										<StagePositionPreview
											startPosition={
												profile.stagePositionStart || ""
											}
											endPosition={
												profile.stagePositionEnd || ""
											}
										/>
									)}
									<div>
										<p className="text-sm text-muted-foreground">
											Starting Position
										</p>
										<p className="font-medium capitalize">
											{profile.stagePositionStart?.replace(
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
											{profile.stagePositionEnd?.replace(
												"-",
												" ",
											) ?? "Not specified"}
										</p>
									</div>
									{profile.customStagePosition && (
										<div>
											<p className="text-sm text-muted-foreground">
												Custom Position Details
											</p>
											<p className="text-sm">
												{profile.customStagePosition}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Notes */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-green-300 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-green-100 rounded-full p-1.5 sm:p-2">
											<Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
										</div>
										<span className="text-gray-900">
											MC Notes
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									<p className="text-xs sm:text-sm md:text-base">
										{profile.mcNotes ||
											"No special notes for MC"}
									</p>
								</CardContent>
							</Card>
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-teal-300 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-teal-100 rounded-full p-1.5 sm:p-2">
											<User className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
										</div>
										<span className="text-gray-900">
											Stage Manager Notes
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									<p className="text-xs sm:text-sm md:text-base">
										{profile.stageManagerNotes ||
											"No special notes for stage manager"}
									</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Gallery Tab */}
					<TabsContent
						value="gallery"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						{/* Rehearsal Video Section */}
						{profile.rehearsalVideo && (
							<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-amber-100 hover:shadow-xl transition-all duration-300">
								<CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
									<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
										<div className="bg-amber-100 rounded-full p-1.5 sm:p-2">
											<Play className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
										</div>
										<span className="text-gray-900">
											Rehearsal / Show Video
										</span>
									</CardTitle>
									<CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
										Video for show order planning and
										lighting setup
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
									<div className="max-w-2xl mx-auto">
										<VideoPlayer
											file={{
												name: profile.rehearsalVideo
													.name,
												type: "video",
												url: profile.rehearsalVideo.url,
												file_path:
													profile.rehearsalVideo
														.file_path,
												size: profile.rehearsalVideo
													.size,
												contentType:
													profile.rehearsalVideo
														.contentType,
											}}
											className="aspect-video"
										/>
										<p className="text-sm text-gray-600 mt-2 text-center">
											{profile.rehearsalVideo.name}
											{profile.rehearsalVideo.size && (
												<span className="ml-2 text-gray-400">
													(
													{(
														profile.rehearsalVideo
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

						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-purple-100 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
								<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
									<div className="bg-purple-100 rounded-full p-1.5 sm:p-2">
										<Image className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
									</div>
									<span className="text-gray-900">
										Media Gallery
									</span>
								</CardTitle>
								<CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
									Your uploaded images and videos
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
								{profile.galleryFiles &&
								profile.galleryFiles.length > 0 ? (
									<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
										{profile.galleryFiles.map(
											(file, index) => (
												<div
													key={index}
													className="group"
												>
													{file.type === "image" ? (
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

					{/* Live Board Tab */}
					<TabsContent
						value="liveboard"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						{/* Draft / Confirmed Banner */}
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

						{/* Assigned Performance Date Display */}
						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-purple-300">
							<CardContent className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4">
								{/* Show assigned date prominently if assigned */}
								{profile.performanceDate && (
									<div className="text-center py-3 sm:py-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
										<div className="flex items-center justify-center gap-2 mb-2">
											<CheckCircle className="h-5 w-5 text-green-600" />
											<p className="text-xs sm:text-sm font-medium text-green-700">
												Your Assigned Performance Date
											</p>
										</div>
										<p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
											{formatDateSimple(
												profile.performanceDate,
											)}
										</p>
									</div>
								)}

								{/* Show not assigned message if not assigned */}
								{!profile.performanceDate && (
									<div className="text-center py-6 bg-amber-50 rounded-lg border-2 border-amber-200">
										<AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
										<h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-1">
											Not Assigned Yet
										</h3>
										<p className="text-xs sm:text-sm text-amber-700 px-4">
											The stage manager has not assigned
											you to a performance date yet. Show
											info will be available once you are
											assigned.
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Only show live board content if a date is selected */}
						{selectedPerformanceDate ? (
							<>
								{/* Emergency Broadcasts */}
								{emergencyBroadcasts.length > 0 && (
									<div className="space-y-2">
										{emergencyBroadcasts.map(
											(broadcast) => (
												<div
													key={broadcast.id}
													className={`p-4 rounded-xl ${getEmergencyColor(
														broadcast.emergency_code,
													)} shadow-lg`}
												>
													<div className="flex items-center gap-3">
														<AlertTriangle className="h-5 w-5" />
														<div>
															<span className="font-bold">
																{broadcast.emergency_code.toUpperCase()}{" "}
																ALERT:
															</span>
															<span className="ml-2">
																{
																	broadcast.message
																}
															</span>
														</div>
													</div>
												</div>
											),
										)}
									</div>
								)}

								{/* Show Date Information Card */}
								{profile.eventId && selectedPerformanceDate && (
									<ShowDateInfoCard
										key={`show-date-info-${selectedPerformanceDate}`}
										eventId={profile.eventId}
										showDate={selectedPerformanceDate}
										refreshKey={refreshTrigger}
									/>
								)}

								{/* Real-Time Clock and Timing Overview */}
								<div className="mb-3 sm:mb-4 md:mb-6 lg:mb-8 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
									<Card className="rounded-lg sm:rounded-xl">
										<CardContent className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-2 sm:px-3 md:px-4">
											<div className="flex flex-col items-start gap-1 sm:gap-2">
												<div className="flex items-center justify-between w-full">
													<p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">
														Current Time
													</p>
													<Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-blue-500" />
												</div>
												<p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold">
													{formatCurrentTime(
														currentTime,
													)}
												</p>
											</div>
										</CardContent>
									</Card>

									<Card className="rounded-lg sm:rounded-xl">
										<CardContent className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-2 sm:px-3 md:px-4">
											<div className="flex flex-col items-start gap-1 sm:gap-2">
												<div className="flex items-center justify-between w-full">
													<p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">
														Total Show
													</p>
													<Timer className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-purple-500" />
												</div>
												<p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold">
													{formatTimeDisplay(
														calculateTotalShowTime(),
													)}
												</p>
											</div>
										</CardContent>
									</Card>

									<Card className="rounded-lg sm:rounded-xl">
										<CardContent className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-2 sm:px-3 md:px-4">
											<div className="flex flex-col items-start gap-1 sm:gap-2">
												<div className="flex items-center justify-between w-full">
													<p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">
														Remaining
													</p>
													<Timer className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-orange-500" />
												</div>
												<p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold">
													{formatTimeDisplay(
														calculateRemainingTime(),
													)}
												</p>
											</div>
										</CardContent>
									</Card>

									<Card className="rounded-lg sm:rounded-xl">
										<CardContent className="pt-3 sm:pt-4 md:pt-5 lg:pt-6 px-2 sm:px-3 md:px-4">
											<div className="flex flex-col items-start gap-1 sm:gap-2">
												<div className="flex items-center justify-between w-full">
													<p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">
														Show Start
													</p>
													<Play className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-green-500" />
												</div>
												<p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold">
													{eventTimings.show_start_time ||
														"--:--"}
												</p>
											</div>
										</CardContent>
									</Card>
								</div>

								{/* Complete Performance Order */}
								<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-purple-300">
									<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
										<div className="flex items-center justify-between gap-2">
											<CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
												<Users className="h-4 w-4 sm:h-5 sm:w-5" />
												<span className="truncate">
													Performance Order
												</span>
											</CardTitle>
											<div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
												<div
													className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
														wsConnected
															? "bg-green-500 animate-pulse"
															: "bg-red-500"
													}`}
												></div>
												<span className="text-[10px] sm:text-xs text-muted-foreground">
													{wsConnected
														? "Live"
														: "Offline"}
												</span>
											</div>
										</div>
										<CardDescription className="text-xs sm:text-sm mt-1">
											Full lineup for tonight's show
										</CardDescription>
										{!eventTimings.show_start_time && (
											<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
												⏱️ Show timing not set yet.
												Timing badges will appear once
												the stage manager sets the show
												start time.
											</div>
										)}
									</CardHeader>
									<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
										{(() => {
											console.log(
												"=== ARTIST DASHBOARD: Live Board Rendering ===",
												{
													eventTimings,
													timeOverrides,
													performanceItemsCount:
														performanceItems.length,
													show_start_time:
														eventTimings.show_start_time,
												},
											);
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
																// Use the actual status from the item, not calculated (matches live-board)
																const status =
																	item.status ||
																	(item.type ===
																		"cue" &&
																	item.cue
																		?.is_completed
																		? "completed"
																		: "not_started");

																// Get row color classes based on status
																const getRowColorClasses =
																	(
																		status: string,
																	) => {
																		switch (
																			status
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

																// Apply backstage color ONLY when status is "not_started" (backstage)
																// For other statuses, use default status colors
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
																const itemTextClass =
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
																		className={`flex items-center gap-3 p-3 rounded-lg ${
																			itemColor
																				? "border-l-4"
																				: getRowColorClasses(
																						status,
																					)
																		}`}
																		style={
																			itemStyle
																		}
																	>
																		{/* Position Number */}
																		<span className="text-xs sm:text-sm font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold min-w-[1.75rem] text-center border border-blue-300">
																			#
																			{index +
																				1}
																		</span>
																		{/* Planned Timing */}
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
																					title={`${liveTimings[index]?.startTime} - ${liveTimings[index]?.endTime}${liveTimings[index]?.isActual ? " (actual)" : " (planned)"}`}
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
																						className={`font-medium ${itemTextClass}`}
																					>
																						{
																							item
																								.artist
																								.artist_name
																						}
																					</div>
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
																					const IconComponent =
																						getCueIcon(
																							item
																								.cue
																								?.type ||
																								"",
																						);
																					return (
																						<IconComponent
																							className={`h-5 w-5 ${
																								cueColor &&
																								!isLightColor(
																									cueColor,
																								)
																									? "text-white"
																									: "text-gray-700"
																							}`}
																						/>
																					);
																				})()}
																				<div className="flex-1">
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
																						)}{" "}
																						•{" "}
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
																			// Get status badge (matches live-board)
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
																							className={`cursor-default ${
																								itemColor &&
																								!isLightColor(
																									itemColor,
																								)
																									? "bg-white/20 text-white border-white/30"
																									: ""
																							}`}
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

					{/* Assigned Artists Tab */}
					<TabsContent
						value="assigned-artists"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-teal-300 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
								<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
									<div className="bg-teal-100 rounded-full p-1.5 sm:p-2">
										<Users className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
									</div>
									<span className="text-gray-900">
										Artists Assigned to Your Performance
										Date
									</span>
								</CardTitle>
								<CardDescription className="text-sm text-gray-600 mt-2">
									{profile?.performanceDate
										? `All artists performing on ${formatDateSimple(
												profile.performanceDate,
											)}`
										: "No performance date assigned yet"}
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
								{!profile?.performanceDate ? (
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
														(artist, index) => (
															<tr
																key={artist.id}
																className="border-b border-gray-200 hover:bg-teal-50 transition-colors"
															>
																<td className="py-3 px-4 text-gray-600">
																	{index + 1}
																</td>
																<td className="py-3 px-4">
																	<div className="flex items-center gap-2">
																		<span className="font-medium text-gray-900">
																			{
																				artist.artistName
																			}
																		</span>
																	</div>
																</td>
																<td className="py-3 px-4 text-gray-700">
																	{artist.realName ||
																		"-"}
																</td>
																<td className="py-3 px-4">
																	<Badge
																		variant="outline"
																		className="bg-teal-50 text-teal-700 border-teal-300"
																	>
																		{
																			artist.style
																		}
																	</Badge>
																</td>
																<td className="py-3 px-4 text-gray-700">
																	<div className="flex items-center gap-1">
																		<Clock className="h-4 w-4 text-gray-500" />
																		{artist.actual_duration
																			? formatDuration(
																					artist.actual_duration,
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

					{/* Event Details Tab */}
					<TabsContent
						value="event"
						className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 mt-0"
					>
						<Card className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border-2 border-indigo-300 hover:shadow-xl transition-all duration-300">
							<CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 md:px-5 lg:px-6">
								<CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg">
									<div className="bg-indigo-100 rounded-full p-1.5 sm:p-2">
										<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
									</div>
									<span className="text-gray-900">
										Event Information
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-5 md:pt-6 px-3 sm:px-4 md:px-6">
								<div>
									<p className="text-sm text-muted-foreground">
										Event Name
									</p>
									<p className="font-medium text-lg">
										{profile.eventName}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">
										Assigned Performance Date
									</p>
									{profile.performanceDate ? (
										<div className="mt-2">
											<Badge
												variant="default"
												className="bg-green-500 hover:bg-green-600 text-white text-base px-4 py-2"
											>
												{formatDateSimple(
													profile.performanceDate,
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
								<div>
									<p className="text-sm text-muted-foreground">
										Registration Date
									</p>
									<p className="font-medium">
										{new Date(
											profile.createdAt,
										).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
								<div className="pt-4">
									<Button
										onClick={() => {
											if (artistEditEnabled) {
												router.push(
													`/artist-edit/${profile.id}`,
												);
											} else {
												setShowEditBlockedDialog(true);
											}
										}}
										className="w-full"
									>
										<Edit className="h-4 w-4 mr-2" />
										Edit Profile
									</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</main>

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
						<DialogDescription asChild>
							<div className="space-y-4 pt-4 text-sm text-gray-600">
								<p className="text-base font-medium text-gray-800">
									If you want to edit or update your information,
									you need to contact the stage manager.
								</p>
								<div className="space-y-3 bg-gray-50 rounded-lg p-4">
									{stageManagerEmail && (
										<div className="flex items-center gap-3">
											<Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
											<a
												href={`mailto:${stageManagerEmail}`}
												className="text-purple-600 hover:underline text-sm break-all"
											>
												{stageManagerEmail}
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

			{/* Logout Dialog */}
			<Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<div className="flex justify-center mb-4">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
								<AlertTriangle className="h-10 w-10 text-amber-600" />
							</div>
						</div>
						<DialogTitle className="text-center text-2xl">
							Your Information Has Been Updated
						</DialogTitle>
						<DialogDescription className="text-center">
							Your account information has been modified by the
							stage manager
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
							<p className="text-sm text-amber-900 font-medium mb-2">
								<strong>Important:</strong> For security
								reasons, you have been automatically logged out.
							</p>
							<p className="text-sm text-amber-800 mb-2">
								Please log in again using your updated
								credentials:
							</p>
							<ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
								<li>Artist ID</li>
								<li>Artist Name (updated)</li>
								<li>Email (updated)</li>
							</ul>
						</div>
						<Button
							className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
							size="lg"
							onClick={() => {
								router.push("/famelink-auth");
							}}
						>
							Go to Login Page
						</Button>
						<p className="text-xs text-center text-muted-foreground">
							You will be automatically redirected in 5 seconds...
						</p>
					</div>
				</DialogContent>
			</Dialog>

			{/* WhatsApp Help Button */}
			<WhatsAppHelpButton />
		</div>
	);
}
