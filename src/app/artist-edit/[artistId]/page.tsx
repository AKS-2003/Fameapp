"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	ArrowLeft,
	Upload,
	Music,
	Image as ImageIcon,
	User,
	Lightbulb,
	FileText,
	Save,
	Plus,
	Undo2,
	Redo2,
	Trash2,
	Download,
	CheckCircle,
	Copy,
	Mail,
	AlertTriangle,
	Play,
	Palette,
	Users,
} from "lucide-react";
import Image from "next/image";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { validateMediaFile } from "@/lib/media-validation";
import { uploadToGCS } from "@/lib/upload-utils";
import {
	detectAudioDuration,
	detectAudioDurationAlternative,
	detectDurationFromUrl,
	formatDuration,
} from "@/lib/media-utils";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { WhatsAppInput } from "@/components/ui/whatsapp-input";
import {
	ColorPickerCompact,
	ColorPickerFull,
} from "@/components/ui/color-picker";
import { NationalityInput, MemberInfo } from "@/components/ui/country-select";

interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	biography: string;
	notes: string;
	equipment: string;
	performanceDuration: number;
	costumeColor: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	customCostumeColor: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	showLink: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition: string;
	mcNotes: string;
	stageManagerNotes: string;
	socialMedia: {
		instagram: string;
		facebook: string;
		tiktok: string;
		youtube: string;
		website: string;
	};
	musicTracks: any[];
	galleryFiles: any[];
	eventId: string;
	eventName: string;
	image_url?: string;
}

// Helper function to get color for preview
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
	};
	return colorMap[colorValue] || "#888888";
};

// Helper function to get gradient style for multiple colors
const getGradientStyle = (colorCombo: string) => {
	const colors = colorCombo.split("-").map((color) => getColorStyle(color));
	if (colors.length === 2) {
		return `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
	} else if (colors.length === 3) {
		return `linear-gradient(90deg, ${colors[0]} 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66%)`;
	}
	return colors[0] || "#888888";
};

export default function ArtistEditPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const artistId = params.artistId as string;

	// Check if editing from stage manager
	const isFromStageManager = searchParams.get("from") === "stage-manager";
	const stageManagerEventId = searchParams.get("eventId");

	// WebSocket ref for stage manager edit
	const wsManagerRef = useRef<any>(null);

	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [originalEmail, setOriginalEmail] = useState<string>("");

	// Store original data snapshot for change detection
	const originalDataRef = useRef<Record<string, any> | null>(null);
	const originalMusicTracksRef = useRef<any[]>([]);
	const originalGalleryFilesRef = useRef<any[]>([]);
	const originalProfileImageRef = useRef<string>("");
	const originalRehearsalVideoRef = useRef<any>(null);
	const originalMembersRef = useRef<any[]>([]);
	const originalTshirtSizesRef = useRef<any[]>([]);

	// Email verification states
	const [emailVerified, setEmailVerified] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [sendingCode, setSendingCode] = useState(false);
	const [verifyingCode, setVerifyingCode] = useState(false);
	const [codeSent, setCodeSent] = useState(false);

	const [artistData, setArtistData] = useState({
		artist_name: "",
		real_name: "",
		email: "",
		phone: "",
		style: "",
		performance_type: "",
		biography: "",
		notes: "",
		props_needed: "",
		performance_duration: 5,
		costume_color: "",
		costume_color_two: "none",
		costume_color_three: "none",
		custom_costume_color: "",
		manual_costume_color: "",
		manual_costume_color_two: "",
		manual_costume_color_three: "",
		light_color_single: "trust",
		light_color_two: "none",
		light_color_three: "none",
		light_requests: "",
		manual_light_color: "",
		manual_light_color_two: "",
		manual_light_color_three: "",
		show_link: "",
		stage_position_start: "",
		stage_position_end: "",
		custom_stage_position: "",
		mc_notes: "",
		stage_manager_notes: "",
		instagram_link: "",
		facebook_link: "",
		tiktok_link: "",
		youtube_link: "",
		website_link: "",
		// Nationality fields
		country_living: "",
		home_country: "",
		// Managed by field
		managed_by: "",
	});

	// Members for duo/trio nationality info
	const [members, setMembers] = useState<MemberInfo[]>([]);

	// T-shirt sizes state
	const [tshirtSizes, setTshirtSizes] = useState<
		Array<{
			name: string;
			size: string;
			fit: "oversized" | "regular";
		}>
	>([]);

	const [musicTracks, setMusicTracks] = useState<any[]>([]);
	const [galleryFiles, setGalleryFiles] = useState<any[]>([]);

	// Undo/Redo state for music tracks
	const [musicHistory, setMusicHistory] = useState<any[][]>([]);
	const [musicHistoryIndex, setMusicHistoryIndex] = useState(-1);

	// Undo/Redo state for gallery files
	const [galleryHistory, setGalleryHistory] = useState<any[][]>([]);
	const [galleryHistoryIndex, setGalleryHistoryIndex] = useState(-1);

	// Upload states - Enhanced with progress tracking
	const [uploadingMusic, setUploadingMusic] = useState(false);
	const [uploadingGallery, setUploadingGallery] = useState(false);
	const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

	// Profile image state
	const [profileImage, setProfileImage] = useState<string>("");

	// Rehearsal video state
	const [rehearsalVideo, setRehearsalVideo] = useState<{
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	} | null>(null);
	const [uploadingRehearsalVideo, setUploadingRehearsalVideo] =
		useState(false);
	const [rehearsalVideoProgress, setRehearsalVideoProgress] = useState(0);
	const [showRehearsalVideoModal, setShowRehearsalVideoModal] =
		useState(false);

	// Upload progress states for music
	const [uploadingFiles, setUploadingFiles] = useState<{
		[key: number]: boolean;
	}>({});
	const [uploadProgress, setUploadProgress] = useState<{
		[key: number]: number;
	}>({});

	// Upload progress states for gallery
	const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
	const [galleryUploadingCount, setGalleryUploadingCount] = useState(0);

	useEffect(() => {
		if (artistId) {
			fetchArtistProfile();
		}
	}, [artistId]);

	// Initialize WebSocket for stage manager edit mode
	useEffect(() => {
		if (!isFromStageManager || !stageManagerEventId) return;

		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManagerRef.current = createWebSocketManager({
					eventId: stageManagerEventId,
					role: "stage_manager",
					userId: `stage_manager_edit_${artistId}`,
					showToasts: false,
					onConnect: () => {
						console.log("Stage manager edit WebSocket connected");
					},
					onDisconnect: () => {
						console.log(
							"Stage manager edit WebSocket disconnected",
						);
					},
				});

				await wsManagerRef.current.initialize();
			} catch (error) {
				console.error(
					"Error initializing WebSocket for stage manager edit:",
					error,
				);
			}
		};

		initializeWebSocket();

		return () => {
			if (wsManagerRef.current) {
				wsManagerRef.current.destroy();
				wsManagerRef.current = null;
			}
		};
	}, [isFromStageManager, stageManagerEventId, artistId]);

	// Function to re-detect duration for existing tracks with 0 duration
	const reDetectDurationsForExistingTracks = async () => {
		const tracksNeedingDuration = musicTracks.filter(
			(track) => !track.duration || track.duration === 0,
		);

		if (tracksNeedingDuration.length === 0) {
			console.log("No tracks need duration re-detection");
			return;
		}

		console.log(
			`Re-detecting duration for ${tracksNeedingDuration.length} tracks`,
		);

		const updatedTracks = [...musicTracks];

		for (let i = 0; i < updatedTracks.length; i++) {
			const track = updatedTracks[i];
			if (!track.duration || track.duration === 0) {
				if (track.file_url) {
					try {
						console.log(
							`Re-detecting duration for track: ${track.song_title}`,
						);
						const duration = await detectDurationFromUrl(
							track.file_url,
						);
						if (duration > 0) {
							updatedTracks[i] = { ...track, duration };
							console.log(
								`Updated duration for ${track.song_title}: ${duration} seconds`,
							);
						}
					} catch (error) {
						console.error(
							`Failed to re-detect duration for ${track.song_title}:`,
							error,
						);
					}
				}
			}
		}

		setMusicTracks(updatedTracks);
		toast({
			title: "🎵 Duration Detection",
			description: `Re-detected durations for existing tracks.`,
		});
	};

	const fetchArtistProfile = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/artists/${artistId}`);

			if (!response.ok) {
				if (response.status === 404) {
					console.log("[EDIT] Profile not found in database, clearing invalid session...");
					// Use window.location for a full page reload through the logout route
					window.location.href = `/api/auth/logout?redirect=/famelink-auth?artistId=${artistId}`;
					return;
				}
				throw new Error("Failed to fetch artist profile");
			}

			const data = await response.json();
			console.log("Fetched artist data:", data);
			console.log("=== MUSIC DEBUG START ===");
			console.log(
				"artist.musicTrack:",
				JSON.stringify(data.data?.musicTrack),
			);
			console.log(
				"artist.musicTracks:",
				JSON.stringify(data.data?.musicTracks),
			);
			console.log(
				"artist.music_track:",
				JSON.stringify(data.data?.music_track),
			);
			console.log(
				"artist.music_tracks:",
				JSON.stringify(data.data?.music_tracks),
			);
			console.log(
				"All keys on artist:",
				data.data ? Object.keys(data.data) : "no data",
			);
			console.log("=== MUSIC DEBUG END ===");

			if (data.success && data.data) {
				const artist = data.data;
				setProfile(artist);

				// Store original email for comparison
				setOriginalEmail(artist.email || "");
				// Original email is already verified
				setEmailVerified(true);

				// Pre-fill form with existing data
				const initialFormData = {
					artist_name: artist.artistName || "",
					real_name: artist.realName || "",
					email: artist.email || "",
					phone: artist.phone || "",
					style: artist.style || "",
					performance_type: artist.performanceType || "",
					biography: artist.biography || "",
					notes: artist.notes || "",
					props_needed: artist.equipment || "",
					performance_duration: artist.performanceDuration || 5,
					costume_color: artist.costumeColor || "",
					costume_color_two: artist.costumeColorTwo || "none",
					costume_color_three: artist.costumeColorThree || "none",
					custom_costume_color: artist.customCostumeColor || "",
					manual_costume_color: artist.manualCostumeColor || "",
					manual_costume_color_two:
						artist.manualCostumeColorTwo || "",
					manual_costume_color_three:
						artist.manualCostumeColorThree || "",
					light_color_single: artist.lightColorSingle || "trust",
					light_color_two: artist.lightColorTwo || "none",
					light_color_three: artist.lightColorThree || "none",
					light_requests: artist.lightRequests || "",
					manual_light_color: artist.manualLightColor || "",
					manual_light_color_two: artist.manualLightColorTwo || "",
					manual_light_color_three:
						artist.manualLightColorThree || "",
					show_link: artist.showLink || "",
					stage_position_start: artist.stagePositionStart || "",
					stage_position_end: artist.stagePositionEnd || "",
					custom_stage_position: artist.customStagePosition || "",
					mc_notes: artist.mcNotes || "",
					stage_manager_notes: artist.stageManagerNotes || "",
					instagram_link: artist.socialMedia?.instagram || "",
					facebook_link: artist.socialMedia?.facebook || "",
					tiktok_link: artist.socialMedia?.tiktok || "",
					youtube_link: artist.socialMedia?.youtube || "",
					website_link: artist.socialMedia?.website || "",
					country_living: artist.countryLiving || "",
					home_country: artist.homeCountry || "",
					managed_by: artist.managedBy || "",
				};
				setArtistData(initialFormData);

				// Store original snapshot for change detection
				originalDataRef.current = { ...initialFormData };

				// Load members for duo/trio
				if (artist.members && artist.members.length > 0) {
					setMembers(artist.members);
					originalMembersRef.current = JSON.parse(
						JSON.stringify(artist.members),
					);
				}

				// Load t-shirt sizes
				if (artist.tshirtSizes && artist.tshirtSizes.length > 0) {
					setTshirtSizes(artist.tshirtSizes);
					originalTshirtSizesRef.current = JSON.parse(
						JSON.stringify(artist.tshirtSizes),
					);
				}

				// Load profile image if exists
				if (artist.image_url) {
					setProfileImage(artist.image_url);
					originalProfileImageRef.current = artist.image_url;
				}

				// Load rehearsal video if exists
				if (artist.rehearsalVideo) {
					setRehearsalVideo(artist.rehearsalVideo);
					originalRehearsalVideoRef.current = artist.rehearsalVideo;
				}

				const tracks =
					artist.musicTracks && artist.musicTracks.length > 0
						? artist.musicTracks
						: artist.musicTrack
							? [artist.musicTrack]
							: [];
				const files = artist.galleryFiles || [];

				console.log("=== TRACKS RESOLVED ===");
				console.log("Final tracks array:", JSON.stringify(tracks));
				console.log("Tracks length:", tracks.length);
				if (tracks.length > 0) {
					console.log("First track file_url:", tracks[0]?.file_url);
					console.log("First track keys:", Object.keys(tracks[0]));
				}
				console.log("=== TRACKS RESOLVED END ===");

				setMusicTracks(tracks);
				setGalleryFiles(files);

				// Store original media snapshots for change detection
				originalMusicTracksRef.current = JSON.parse(
					JSON.stringify(tracks),
				);
				originalGalleryFilesRef.current = JSON.parse(
					JSON.stringify(files),
				);

				// Initialize history with current state
				setMusicHistory([tracks]);
				setMusicHistoryIndex(0);
				setGalleryHistory([files]);
				setGalleryHistoryIndex(0);
			} else {
				throw new Error("Invalid response format");
			}
		} catch (error) {
			console.error("Error fetching artist profile:", error);
			toast({
				title: "❌ Loading Error",
				description: "Failed to load artist profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: string, value: string | number) => {
		setArtistData((prev) => ({
			...prev,
			[field]: value,
		}));

		// Reset email verification when email changes
		if (field === "email" && value !== originalEmail) {
			setEmailVerified(false);
			setCodeSent(false);
			setVerificationCode("");
		} else if (field === "email" && value === originalEmail) {
			// If email is changed back to original, mark as verified
			setEmailVerified(true);
			setCodeSent(false);
			setVerificationCode("");
		}
	};

	// Send verification code to new email
	const handleSendVerificationCode = async () => {
		if (!artistData.email) {
			toast({
				title: "📧 Email Required",
				description: "Please enter an email address.",
				variant: "destructive",
			});
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(artistData.email)) {
			toast({
				title: "⚠️ Invalid Email",
				description: "Please enter a valid email address.",
				variant: "destructive",
			});
			return;
		}

		setSendingCode(true);
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: artistData.email,
					action: "send",
				}),
			});

			const data = await response.json();

			if (data.success) {
				setCodeSent(true);
				toast({
					title: "📧 Verification Code Sent",
					description: `A verification code has been sent to ${artistData.email}.`,
				});
			} else {
				throw new Error(
					data.error || "Failed to send verification code",
				);
			}
		} catch (error) {
			console.error("Error sending verification code:", error);
			toast({
				title: "❌ Error",
				description:
					"Failed to send verification code. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSendingCode(false);
		}
	};

	// Verify the code entered by user
	const handleVerifyCode = async () => {
		if (!verificationCode) {
			toast({
				title: "⚠️ Code Required",
				description: "Please enter the verification code.",
				variant: "destructive",
			});
			return;
		}

		setVerifyingCode(true);
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: artistData.email,
					code: verificationCode,
					action: "verify",
				}),
			});

			const data = await response.json();

			if (data.success) {
				setEmailVerified(true);
				toast({
					title: "✅ Email Verified",
					description: "Your email has been verified successfully.",
				});
			} else {
				throw new Error(data.error || "Invalid verification code");
			}
		} catch (error: any) {
			console.error("Error verifying code:", error);
			toast({
				title: "❌ Verification Failed",
				description:
					error.message ||
					"Invalid verification code. Please try again.",
				variant: "destructive",
			});
		} finally {
			setVerifyingCode(false);
		}
	};

	// Music tracks management
	const saveMusicToHistory = (tracks: any[]) => {
		const newHistory = musicHistory.slice(0, musicHistoryIndex + 1);
		newHistory.push([...tracks]);
		setMusicHistory(newHistory);
		setMusicHistoryIndex(newHistory.length - 1);
	};

	const undoMusicChanges = () => {
		if (musicHistoryIndex > 0) {
			setMusicHistoryIndex(musicHistoryIndex - 1);
			setMusicTracks([...musicHistory[musicHistoryIndex - 1]]);
		}
	};

	const redoMusicChanges = () => {
		if (musicHistoryIndex < musicHistory.length - 1) {
			setMusicHistoryIndex(musicHistoryIndex + 1);
			setMusicTracks([...musicHistory[musicHistoryIndex + 1]]);
		}
	};

	const handleDeleteMusicTrack = (index: number) => {
		saveMusicToHistory(musicTracks);
		const newTracks = musicTracks.filter((_, i) => i !== index);
		setMusicTracks(newTracks);
	};

	// Gallery files management
	const saveGalleryToHistory = (files: any[]) => {
		const newHistory = galleryHistory.slice(0, galleryHistoryIndex + 1);
		newHistory.push([...files]);
		setGalleryHistory(newHistory);
		setGalleryHistoryIndex(newHistory.length - 1);
	};

	const undoGalleryChanges = () => {
		if (galleryHistoryIndex > 0) {
			setGalleryHistoryIndex(galleryHistoryIndex - 1);
			setGalleryFiles([...galleryHistory[galleryHistoryIndex - 1]]);
		}
	};

	const redoGalleryChanges = () => {
		if (galleryHistoryIndex < galleryHistory.length - 1) {
			setGalleryHistoryIndex(galleryHistoryIndex + 1);
			setGalleryFiles([...galleryHistory[galleryHistoryIndex + 1]]);
		}
	};

	const handleDeleteGalleryFile = (index: number) => {
		saveGalleryToHistory(galleryFiles);
		const newFiles = galleryFiles.filter((_, i) => i !== index);
		setGalleryFiles(newFiles);
	};

	// File upload handlers
	const handleMusicUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		setUploadingMusic(true);
		saveMusicToHistory(musicTracks);

		try {
			// Only allow one music track - always replace index 0
			const file = files[0];
			const trackIndex = 0;

			// If no tracks exist yet, create one
			if (musicTracks.length === 0) {
				setMusicTracks([
					{
						song_title: "",
						duration: 0,
						notes: "",
						is_main_track: true,
						tempo: "medium",
						file_url: "",
						file_path: "",
					},
				]);
			}

			// Set uploading state for this track
			setUploadingFiles((prev) => ({ ...prev, [trackIndex]: true }));
			setUploadProgress((prev) => ({ ...prev, [trackIndex]: 0 }));

			// Validate file
			const validation = validateMediaFile(
				{
					name: file.name,
					size: file.size,
					type: file.type,
				},
				"audio",
			);

			if (!validation.isValid) {
				toast({
					title: "⚠️ Invalid File",
					description: validation.error,
					variant: "destructive",
				});
				setUploadingFiles((prev) => ({
					...prev,
					[trackIndex]: false,
				}));
				return;
			}

			// Detect duration before upload
			setUploadProgress((prev) => ({ ...prev, [trackIndex]: 20 }));
			console.log(`Starting duration detection for: ${file.name}`);
			let duration = await detectAudioDuration(file);
			console.log(
				`Primary duration detection result: ${duration} seconds`,
			);

			if (duration === 0) {
				console.warn(
					`Primary duration detection failed for ${file.name}, trying alternative method`,
				);
				duration = await detectAudioDurationAlternative(file);
				console.log(
					`Alternative duration detection result: ${duration} seconds`,
				);
			}

			setUploadProgress((prev) => ({ ...prev, [trackIndex]: 40 }));

			// Upload file
			const uploadResult = await uploadToGCS({
				file,
				eventId: profile?.eventId || "",
				artistId,
				fileType: "music",
				onProgress: (pct) => {
					setUploadProgress((prev) => ({
						...prev,
						[trackIndex]: 40 + Math.round(pct * 0.6),
					}));
				},
			});

			// Update the track at the specific index - use artist name as song title
			const artistName =
				artistData.artist_name || profile?.artistName || "Artist Track";
			setMusicTracks((prev) =>
				prev.map((track, idx) =>
					idx === trackIndex
						? {
								...track,
								song_title: artistName,
								duration: duration,
								tempo: track.tempo || "medium",
								file_url: uploadResult.url,
								file_path: uploadResult.fileName,
								uploadedAt: new Date().toISOString(),
								fileSize: file.size,
								contentType: file.type,
							}
						: track,
				),
			);

			toast({
				title: "🎵 Upload Successful",
				description: `${artistName} - Music uploaded - Duration: ${formatDuration(
					duration,
				)}`,
			});

			// Clear uploading state after a short delay
			setTimeout(() => {
				setUploadingFiles((prev) => ({
					...prev,
					[trackIndex]: false,
				}));
			}, 500);
		} catch (error) {
			console.error("Music upload error:", error);
			toast({
				title: "❌ Upload Failed",
				description: "Failed to upload music files. Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploadingMusic(false);
			setUploadingFiles({});
			setUploadProgress({});
			// Reset file input
			event.target.value = "";
		}
	};

	const handleGalleryUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		setUploadingGallery(true);
		setGalleryUploadingCount(files.length);
		setGalleryUploadProgress(0);
		saveGalleryToHistory(galleryFiles);

		try {
			const newFiles = [];
			const filesArray = Array.from(files);

			for (let i = 0; i < filesArray.length; i++) {
				const file = filesArray[i];

				// Update progress
				setGalleryUploadProgress(
					Math.round(((i + 0.3) / filesArray.length) * 100),
				);

				// Determine file type
				const fileType = file.type.startsWith("image/")
					? "images"
					: "videos";

				// Validate file
				const mediaType = file.type.startsWith("image/")
					? "image"
					: "video";
				const validation = validateMediaFile(
					{
						name: file.name,
						size: file.size,
						type: file.type,
					},
					mediaType as "image" | "video",
				);

				if (!validation.isValid) {
					toast({
						title: "⚠️ Invalid File",
						description: validation.error,
						variant: "destructive",
					});
					continue;
				}

				// Upload file
				const uploadResult = await uploadToGCS({
					file,
					eventId: profile?.eventId || "",
					artistId,
					fileType,
					onProgress: (pct) => {
						const overallPct = Math.round(
							((i + pct / 100) / filesArray.length) * 100,
						);
						setGalleryUploadProgress(overallPct);
					},
				});

				newFiles.push({
					name: file.name,
					type: file.type.startsWith("image/") ? "image" : "video",
					url: uploadResult.url,
					file_path: uploadResult.fileName,
					size: file.size,
					contentType: file.type,
					uploadedAt: new Date().toISOString(),
				});
			}

			setGalleryFiles([...galleryFiles, ...newFiles]);
			toast({
				title: "🖼️ Upload Successful",
				description: `${newFiles.length} file(s) uploaded successfully.`,
			});
		} catch (error) {
			console.error("Gallery upload error:", error);
			toast({
				title: "❌ Upload Failed",
				description:
					"Failed to upload gallery files. Please try again.",
				variant: "destructive",
			});
		} finally {
			// Clear uploading state after all files are processed
			setTimeout(() => {
				setUploadingGallery(false);
				setGalleryUploadProgress(0);
				setGalleryUploadingCount(0);
			}, 500);
			// Reset file input
			event.target.value = "";
		}
	};

	const handleProfileImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate image
		if (!file.type.startsWith("image/")) {
			toast({
				title: "⚠️ Invalid File",
				description: "Please upload an image file (PNG, JPG, etc.).",
				variant: "destructive",
			});
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			// 5MB limit
			toast({
				title: "⚠️ File Too Large",
				description: "Image must be under 5MB.",
				variant: "destructive",
			});
			return;
		}

		try {
			setUploadingProfileImage(true);

			const result = await uploadToGCS({
				file,
				eventId: profile?.eventId || "",
				artistId,
				fileType: "profile",
			});

			setProfileImage(result.fileName);
			toast({
				title: "✅ Profile Image Updated",
				description: "Profile image uploaded successfully.",
			});
		} catch (error) {
			console.error("Profile image upload error:", error);
			toast({
				title: "❌ Upload Failed",
				description:
					"Failed to upload profile image. Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploadingProfileImage(false);
			e.target.value = "";
		}
	};

	// Rehearsal video upload handler
	const handleRehearsalVideoUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate video file using the validation function
		const validation = validateMediaFile(
			{
				name: file.name,
				size: file.size,
				type: file.type,
			},
			"video",
		);

		if (!validation.isValid) {
			toast({
				title: "⚠️ Invalid File",
				description: validation.error,
				variant: "destructive",
			});
			return;
		}

		try {
			setUploadingRehearsalVideo(true);
			setRehearsalVideoProgress(0);

			const result = await uploadToGCS({
				file,
				eventId: profile?.eventId || "",
				artistId,
				fileType: "rehearsal",
				onProgress: (pct) => setRehearsalVideoProgress(pct),
			});

			setRehearsalVideo({
				url: result.url,
				file_path: result.fileName,
				name: file.name,
				size: file.size,
				contentType: file.type,
			});
			toast({
				title: "✅ Rehearsal Video Uploaded",
				description: "Rehearsal video uploaded successfully.",
			});
		} catch (error) {
			console.error("Rehearsal video upload error:", error);
			toast({
				title: "❌ Upload Failed",
				description:
					error instanceof Error
						? error.message
						: "Failed to upload rehearsal video. Please try again.",
				variant: "destructive",
			});
		} finally {
			setTimeout(() => {
				setUploadingRehearsalVideo(false);
				setRehearsalVideoProgress(0);
			}, 500);
			e.target.value = "";
		}
	};

	// Delete rehearsal video handler
	const handleDeleteRehearsalVideo = () => {
		setRehearsalVideo(null);
		toast({
			title: "🗑️ Video Removed",
			description: "Rehearsal video has been removed.",
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Check if email has changed
		const emailChanged = originalEmail !== artistData.email;

		// If email changed, require verification
		if (emailChanged && !emailVerified) {
			toast({
				title: "📧 Email Verification Required",
				description:
					"Please verify your new email address before saving changes.",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);

		try {
			const response = await fetch(`/api/artists/${artistId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					artistName: artistData.artist_name,
					realName: artistData.real_name,
					email: artistData.email,
					phone: artistData.phone,
					style: artistData.style,
					performanceType: artistData.performance_type,
					performanceDuration: artistData.performance_duration,
					biography: artistData.biography,
					costumeColor: artistData.costume_color,
					costumeColorTwo: artistData.costume_color_two,
					costumeColorThree: artistData.costume_color_three,
					customCostumeColor: artistData.custom_costume_color,
					manualCostumeColor: artistData.manual_costume_color,
					manualCostumeColorTwo: artistData.manual_costume_color_two,
					manualCostumeColorThree:
						artistData.manual_costume_color_three,
					lightColorSingle: artistData.light_color_single,
					lightColorTwo: artistData.light_color_two,
					lightColorThree: artistData.light_color_three,
					lightRequests: artistData.light_requests,
					manualLightColor: artistData.manual_light_color,
					manualLightColorTwo: artistData.manual_light_color_two,
					manualLightColorThree: artistData.manual_light_color_three,
					stagePositionStart: artistData.stage_position_start,
					stagePositionEnd: artistData.stage_position_end,
					customStagePosition: artistData.custom_stage_position,
					equipment: artistData.props_needed,
					showLink: artistData.show_link,
					socialMedia: {
						instagram: artistData.instagram_link,
						facebook: artistData.facebook_link,
						youtube: artistData.youtube_link,
						tiktok: artistData.tiktok_link,
						website: artistData.website_link,
					},
					mcNotes: artistData.mc_notes,
					stageManagerNotes: artistData.stage_manager_notes,
					notes: artistData.notes,
					musicTracks: musicTracks,
					musicTrack: musicTracks.length > 0 ? musicTracks[0] : null,
					galleryFiles: galleryFiles,
					rehearsalVideo: rehearsalVideo,
					image_url: profileImage || profile?.image_url || "",
					countryLiving: artistData.country_living,
					homeCountry: artistData.home_country,
					members: members,
					tshirtSizes: tshirtSizes,
					managedBy: artistData.managed_by,
				}),
			});

			if (response.ok) {
				// Send profile update confirmation email if email was changed
				if (emailChanged && artistData.email) {
					try {
						const emailResponse = await fetch(
							"/api/artists/send-profile-update-email",
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									artistName: artistData.artist_name,
									artistId: artistId,
									email: artistData.email,
									eventName: profile?.eventName || "Event",
									eventId: profile?.eventId || "",
								}),
							},
						);

						if (emailResponse.ok) {
							console.log(
								`✅ Profile update email sent to ${artistData.email}`,
							);
						} else {
							console.error(
								"Failed to send profile update email",
							);
						}
					} catch (emailError) {
						console.error(
							"Error sending profile update email:",
							emailError,
						);
						// Don't fail the update if email fails
					}
				}

				// If stage manager edited the artist, emit WebSocket event to force logout
				if (isFromStageManager && wsManagerRef.current) {
					console.log(
						"🔔 Stage manager edit: Emitting artist_info_updated event",
					);
					wsManagerRef.current.emit("artist_info_updated", {
						eventId: stageManagerEventId || profile?.eventId,
						artistId: artistId,
						artist_name: artistData.artist_name,
						action: "force_logout",
					});
				}

				// Detect changed fields and send update notification to stage managers
				if (!isFromStageManager) {
					try {
						const changedFields: string[] = [];
						const orig = originalDataRef.current;

						if (orig) {
							// Compare all form fields
							for (const key of Object.keys(orig)) {
								const origVal = String(orig[key] ?? "");
								const newVal = String(
									(artistData as any)[key] ?? "",
								);
								if (origVal !== newVal) {
									changedFields.push(key);
								}
							}
						}

						// Check media changes
						if (
							JSON.stringify(
								musicTracks.map((t: any) => t.file_url),
							) !==
							JSON.stringify(
								originalMusicTracksRef.current.map(
									(t: any) => t.file_url,
								),
							)
						) {
							changedFields.push("music_tracks");
						}
						if (
							JSON.stringify(
								galleryFiles.map((f: any) => f.url),
							) !==
							JSON.stringify(
								originalGalleryFilesRef.current.map(
									(f: any) => f.url,
								),
							)
						) {
							changedFields.push("gallery_files");
						}
						if (
							(profileImage || "") !==
							(originalProfileImageRef.current || "")
						) {
							changedFields.push("profile_image");
						}
						if (
							JSON.stringify(rehearsalVideo) !==
							JSON.stringify(originalRehearsalVideoRef.current)
						) {
							changedFields.push("rehearsal_video");
						}
						if (
							JSON.stringify(members) !==
							JSON.stringify(originalMembersRef.current)
						) {
							changedFields.push("members");
						}
						if (
							JSON.stringify(tshirtSizes) !==
							JSON.stringify(originalTshirtSizesRef.current)
						) {
							changedFields.push("tshirt_sizes");
						}

						if (changedFields.length > 0) {
							// Build a human-readable summary
							const summaryParts: string[] = [];
							if (changedFields.includes("artist_name"))
								summaryParts.push("changed name");
							if (changedFields.includes("email"))
								summaryParts.push("changed email");
							if (changedFields.includes("phone"))
								summaryParts.push("changed phone");
							if (changedFields.includes("music_tracks"))
								summaryParts.push("updated music");
							if (changedFields.includes("gallery_files"))
								summaryParts.push("updated gallery");
							if (changedFields.includes("profile_image"))
								summaryParts.push("updated photo");
							if (changedFields.includes("rehearsal_video"))
								summaryParts.push("updated rehearsal video");

							const otherCount =
								changedFields.length - summaryParts.length;
							if (otherCount > 0)
								summaryParts.push(
									`${otherCount} other field${otherCount > 1 ? "s" : ""}`,
								);

							const summary = `Updated: ${summaryParts.join(", ")}`;

							// Collect event IDs to notify
							const eventIds: string[] = [];
							if (profile?.eventId) {
								eventIds.push(profile.eventId);
							}

							// Also check all events this artist participates in
							try {
								const evtRes = await fetch(
									`/api/artists/${artistId}/events`,
								);
								if (evtRes.ok) {
									const evtData = await evtRes.json();
									if (
										evtData.success &&
										evtData.data?.eventIds
									) {
										for (const eid of evtData.data
											.eventIds) {
											if (!eventIds.includes(eid)) {
												eventIds.push(eid);
											}
										}
									}
								}
							} catch {
								// Ignore - we'll still send to profile.eventId if available
							}

							// Send notification to all relevant events
							for (const evtId of eventIds) {
								await fetch(
									`/api/events/${evtId}/artist-updates`,
									{
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											artistId,
											artistName: artistData.artist_name,
											changedFields,
											summary,
										}),
									},
								);
							}
						}
					} catch (notifError) {
						console.error(
							"Error sending update notification:",
							notifError,
						);
						// Don't fail the save if notification fails
					}
				}

				toast({
					title: "✅ Profile Updated",
					description: isFromStageManager
						? "Artist profile has been updated. The artist will be notified and logged out."
						: emailChanged
							? "Your profile has been updated. A confirmation email has been sent to your new email address."
							: "Your artist profile has been updated successfully.",
				});

				// Redirect based on who is editing
				if (isFromStageManager && stageManagerEventId) {
					router.push(
						`/stage-manager/events/${stageManagerEventId}/artists`,
					);
				} else {
					router.push(`/artist-dashboard/${artistId}`);
				}
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || "Update failed");
			}
		} catch (error) {
			console.error("Update error:", error);
			toast({
				title: "❌ Update Failed",
				description: "Failed to update profile. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading profile...
					</p>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						Profile not found
					</h2>
					<Button
						onClick={() =>
							isFromStageManager && stageManagerEventId
								? router.push(
										`/stage-manager/events/${stageManagerEventId}/artists`,
									)
								: router.push("/artist-dashboard")
						}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						{isFromStageManager
							? "Back to Artists"
							: "Back to Dashboard"}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
			{/* Enhanced Header with Logo and Animations */}
			<header className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-2xl overflow-hidden">
				{/* Animated background elements */}
				<div className="absolute inset-0 opacity-20">
					<div className="absolute top-0 left-0 w-32 h-32 sm:w-64 sm:h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
					<div
						className="absolute bottom-0 right-0 w-48 h-48 sm:w-96 sm:h-96 bg-pink-300 rounded-full blur-3xl animate-pulse"
						style={{ animationDelay: "1s" }}
					></div>
				</div>

				<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 relative z-10">
					<div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-0">
						<div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 animate-fade-in-up">
							<div className="relative">
								<div className="absolute inset-0 bg-white/20 rounded-2xl sm:rounded-3xl blur-xl animate-pulse"></div>
								<div className="relative bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-2 sm:p-3 border border-white/20 shadow-2xl">
									<Image
										src="/fame-logo.png"
										alt="FAME Logo"
										width={50}
										height={50}
										className="object-contain drop-shadow-2xl sm:w-[70px] sm:h-[70px]"
									/>
								</div>
							</div>
							<div className="text-center sm:text-left">
								<h1 className="text-xl sm:text-4xl font-bold drop-shadow-2xl mb-1">
									{isFromStageManager
										? "Edit Artist Profile"
										: "Edit Your Profile"}
								</h1>
								{isFromStageManager && (
									<p className="text-yellow-200 text-xs sm:text-sm font-medium mb-1">
										⚠️ Stage Manager Mode - Artist will be
										logged out after save
									</p>
								)}
								<p className="text-purple-100 text-sm sm:text-xl font-medium">
									Your Name -{" "}
									{artistData.artist_name || "Loading..."}
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							className="text-white hover:bg-white/20 animate-fade-in-up text-sm sm:text-base"
							onClick={() =>
								isFromStageManager && stageManagerEventId
									? router.push(
											`/stage-manager/events/${stageManagerEventId}/artists`,
										)
									: router.push(
											`/artist-dashboard/${artistId}`,
										)
							}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							{isFromStageManager
								? "Back to Artists"
								: "Back to Dashboard"}
						</Button>
					</div>
				</div>
			</header>

			{/* Welcome Section */}
			<div className="relative bg-gradient-to-b from-white to-purple-50/30">
				<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-10 max-w-5xl">
					{/* Main Welcome Card */}
					<div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-purple-500 overflow-hidden mb-4 sm:mb-8">
						<div className="bg-gradient-to-r p-1">
							<div className="bg-white rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8">
								<div className="text-center space-y-3 sm:space-y-4">
									<div className="inline-block">
										<div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
											<User className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" />
										</div>
									</div>
									<h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
										Update Your Artist Profile ✨
									</h2>
									<p className="text-gray-600 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
										Make changes to your profile
										information. All updates will be saved
										when you click "Save Changes" at the
										bottom.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Important Alert */}
					<div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-500 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-8 animate-fade-in-up">
						<div className="flex items-start gap-3 sm:gap-4">
							<div className="bg-blue-500 rounded-full p-1.5 sm:p-2 mt-1">
								<svg
									className="h-4 w-4 sm:h-6 sm:w-6 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div className="flex-1">
								<h3 className="text-sm sm:text-lg font-bold text-blue-900 mb-2">
									📋 Important Information
								</h3>
								<p className="text-xs sm:text-base text-blue-800 mb-3">
									Review and update your information
									carefully. Changes will be reflected in your
									artist dashboard and visible to event
									organizers.
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
									<div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-blue-100">
										<div className="flex items-center gap-2">
											<span className="text-xs sm:text-sm font-medium text-gray-700">
												STEP 1: Update all sections
											</span>
										</div>
									</div>
									<div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-gray-700">
												STEP 2: Manage music tracks
											</span>
										</div>
									</div>
									<div className="bg-white rounded-lg p-3 shadow-sm border border-yellow-100">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-gray-700">
												STEP 3: Technical requirements
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<main className="container mx-auto px-4 pb-12 max-w-5xl">
				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Profile Image Upload Section */}
					<Card className="bg-white rounded-2xl shadow-lg border-2 border-purple-300 overflow-hidden">
						<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
							<CardTitle className="flex items-center gap-3">
								<div className="bg-purple-100 rounded-full p-2">
									<User className="h-5 w-5 text-purple-600" />
								</div>
								<span className="text-gray-900">
									Profile Image
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6">
							<div className="flex flex-col md:flex-row items-center gap-6">
								<div className="relative">
									{profileImage || profile?.image_url ? (
										<img
											src={`/api/media/${
												profileImage ||
												profile?.image_url
											}`}
											alt="Profile"
											className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-lg"
										/>
									) : (
										<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg">
											<User className="h-16 w-16 text-purple-400" />
										</div>
									)}
									{uploadingProfileImage && (
										<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
										</div>
									)}
								</div>
								<div className="flex-1 w-full">
									<Label
										htmlFor="profile-image"
										className="cursor-pointer block"
									>
										<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50 transition-all">
											<div className="flex flex-col items-center gap-2">
												<Upload className="h-8 w-8 text-gray-400" />
												<p className="text-sm font-medium text-gray-700">
													{profileImage ||
													profile?.image_url
														? "Change profile image"
														: "Upload profile image"}
												</p>
												<p className="text-xs text-gray-500">
													PNG, JPG up to 5MB
												</p>
											</div>
										</div>
									</Label>
									<input
										id="profile-image"
										type="file"
										accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
										onChange={handleProfileImageUpload}
										className="hidden"
										disabled={uploadingProfileImage}
									/>
									{uploadingProfileImage && (
										<p className="text-sm text-purple-600 mt-2 text-center">
											Uploading profile image...
										</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					<Accordion
						type="single"
						defaultValue="basic-info"
						collapsible
						className="w-full space-y-4"
						onValueChange={(value) => {
							// Scroll to the opened accordion item on mobile
							if (value) {
								setTimeout(() => {
									const element =
										document.querySelector(
											`[data-state="open"]`,
										);
									if (element) {
										element.scrollIntoView({
											behavior: "smooth",
											block: "start",
										});
									}
								}, 100);
							}
						}}
					>
						{/* 1. Basic Information */}
						<AccordionItem
							value="basic-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 overflow-hidden hover:shadow-xl transition-all duration-300"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-purple-50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="bg-purple-100 rounded-full p-2">
										<User className="h-5 w-5 text-purple-600" />
									</div>
									<span className="text-gray-900">
										Basic Information
									</span>
									<span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
										Required
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-4 pt-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="artist_name">
													Artist/Stage Name *
												</Label>
												<Input
													id="artist_name"
													value={
														artistData.artist_name
													}
													onChange={(e) =>
														handleInputChange(
															"artist_name",
															e.target.value,
														)
													}
													placeholder="Enter your stage name"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="real_name">
													Real Name
												</Label>
												<Input
													id="real_name"
													value={artistData.real_name}
													onChange={(e) =>
														handleInputChange(
															"real_name",
															e.target.value,
														)
													}
													placeholder="Enter your real name"
												/>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="email">
													Email
												</Label>
												<Input
													id="email"
													type="email"
													value={artistData.email}
													onChange={(e) =>
														handleInputChange(
															"email",
															e.target.value,
														)
													}
													placeholder="Enter your email"
												/>

												{/* Email Verification UI - Show when email is changed */}
												{originalEmail !==
													artistData.email &&
													artistData.email && (
														<div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg space-y-3">
															<div className="flex items-start gap-2">
																<AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
																<div className="flex-1">
																	<p className="text-sm font-medium text-yellow-800">
																		Email
																		Verification
																		Required
																	</p>
																	<p className="text-xs text-yellow-700 mt-1">
																		You've
																		changed
																		your
																		email
																		address.
																		Please
																		verify
																		it
																		before
																		saving.
																	</p>
																</div>
															</div>

															{!codeSent ? (
																<Button
																	type="button"
																	onClick={
																		handleSendVerificationCode
																	}
																	disabled={
																		sendingCode
																	}
																	className="w-full bg-yellow-600 hover:bg-yellow-700"
																	size="sm"
																>
																	{sendingCode ? (
																		<>
																			<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
																			Sending
																			Code...
																		</>
																	) : (
																		<>
																			<Mail className="h-4 w-4 mr-2" />
																			Send
																			Verification
																			Code
																		</>
																	)}
																</Button>
															) : (
																<div className="space-y-2">
																	{!emailVerified ? (
																		<>
																			<Label
																				htmlFor="verification-code"
																				className="text-xs text-yellow-800"
																			>
																				Enter
																				6-digit
																				code
																				sent
																				to{" "}
																				{
																					artistData.email
																				}
																			</Label>
																			<div className="flex gap-2">
																				<Input
																					id="verification-code"
																					type="text"
																					value={
																						verificationCode
																					}
																					onChange={(
																						e,
																					) =>
																						setVerificationCode(
																							e
																								.target
																								.value,
																						)
																					}
																					placeholder="000000"
																					maxLength={
																						6
																					}
																					className="flex-1"
																				/>
																				<Button
																					type="button"
																					onClick={
																						handleVerifyCode
																					}
																					disabled={
																						verifyingCode ||
																						!verificationCode
																					}
																					size="sm"
																					className="bg-green-600 hover:bg-green-700"
																				>
																					{verifyingCode ? (
																						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
																					) : (
																						<CheckCircle className="h-4 w-4" />
																					)}
																				</Button>
																			</div>
																			<Button
																				type="button"
																				onClick={
																					handleSendVerificationCode
																				}
																				disabled={
																					sendingCode
																				}
																				variant="ghost"
																				size="sm"
																				className="w-full text-xs text-yellow-700 hover:text-yellow-800"
																			>
																				Resend
																				Code
																			</Button>
																		</>
																	) : (
																		<div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
																			<CheckCircle className="h-5 w-5" />
																			<span className="text-sm font-medium">
																				Email
																				Verified!
																			</span>
																		</div>
																	)}
																</div>
															)}
														</div>
													)}
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="phone"
													className="flex items-center gap-2"
												>
													<svg
														className="h-4 w-4 text-green-600"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
													</svg>
													WhatsApp Number
												</Label>
												<WhatsAppInput
													id="phone"
													value={artistData.phone}
													onChange={(value) =>
														handleInputChange(
															"phone",
															value,
														)
													}
													placeholder="+971528411575"
												/>
											</div>
										</div>
										<div className="space-y-2">
											<Label
												htmlFor="managed_by"
												className="flex items-center gap-2"
											>
												<Users className="h-4 w-4 text-purple-600" />
												Managed By
											</Label>
											<Input
												id="managed_by"
												value={artistData.managed_by}
												onChange={(e) =>
													handleInputChange(
														"managed_by",
														e.target.value,
													)
												}
												placeholder="Name of manager or person handling this account (optional)"
											/>
											<p className="text-xs text-muted-foreground">
												If someone else manages or
												handles this artist account,
												enter their name here.
											</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="style">
													Performance Style
												</Label>
												<Input
													id="style"
													value={artistData.style}
													onChange={(e) =>
														handleInputChange(
															"style",
															e.target.value,
														)
													}
													placeholder="e.g., Hip-hop, Jazz, Comedy, etc."
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="performance_type">
													Performance Type
												</Label>
												<Select
													value={
														artistData.performance_type
													}
													onValueChange={(value) =>
														handleInputChange(
															"performance_type",
															value,
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select performance type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="solo">
															Solo Performance
														</SelectItem>
														<SelectItem value="duo">
															Duo
														</SelectItem>
														<SelectItem value="trio">
															Trio
														</SelectItem>
														<SelectItem value="group">
															Group (4+)
														</SelectItem>
														<SelectItem value="band">
															Band
														</SelectItem>
														<SelectItem value="other">
															Other
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
										{/* Nationality Information - Dynamic based on performance type */}
										{artistData.performance_type && (
											<NationalityInput
												performanceType={
													artistData.performance_type
												}
												countryLiving={
													artistData.country_living
												}
												homeCountry={
													artistData.home_country
												}
												onCountryLivingChange={(
													value,
												) =>
													handleInputChange(
														"country_living",
														value,
													)
												}
												onHomeCountryChange={(value) =>
													handleInputChange(
														"home_country",
														value,
													)
												}
												members={members}
												onMembersChange={setMembers}
											/>
										)}

										{/* T-Shirt Sizes Section */}
										<div className="space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
											<div className="flex items-center justify-between">
												<Label className="text-base font-semibold text-green-800">
													T-Shirt Sizes
												</Label>
												<span className="text-xs text-green-600">
													Optional
												</span>
											</div>
											<p className="text-sm text-green-700">
												Add t-shirt size information for
												yourself and your team members
											</p>

											{tshirtSizes.map(
												(tshirt, index) => (
													<div
														key={index}
														className="p-4 bg-white rounded-lg border border-green-200 space-y-3"
													>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-gray-700">
																Person{" "}
																{index + 1}
															</span>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() => {
																	const newSizes =
																		tshirtSizes.filter(
																			(
																				_,
																				i,
																			) =>
																				i !==
																				index,
																		);
																	setTshirtSizes(
																		newSizes,
																	);
																}}
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
															<div className="space-y-2">
																<Label
																	htmlFor={`tshirt-name-${index}`}
																>
																	Name
																</Label>
																<Input
																	id={`tshirt-name-${index}`}
																	value={
																		tshirt.name
																	}
																	onChange={(
																		e,
																	) => {
																		const newSizes =
																			[
																				...tshirtSizes,
																			];
																		newSizes[
																			index
																		].name =
																			e.target.value;
																		setTshirtSizes(
																			newSizes,
																		);
																	}}
																	placeholder="Enter name"
																/>
															</div>
															<div className="space-y-2">
																<Label
																	htmlFor={`tshirt-size-${index}`}
																>
																	Size
																</Label>
																<Select
																	value={
																		tshirt.size
																	}
																	onValueChange={(
																		value,
																	) => {
																		const newSizes =
																			[
																				...tshirtSizes,
																			];
																		newSizes[
																			index
																		].size =
																			value;
																		setTshirtSizes(
																			newSizes,
																		);
																	}}
																>
																	<SelectTrigger
																		id={`tshirt-size-${index}`}
																	>
																		<SelectValue placeholder="Select size" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="XS">
																			XS
																		</SelectItem>
																		<SelectItem value="S">
																			S
																		</SelectItem>
																		<SelectItem value="M">
																			M
																		</SelectItem>
																		<SelectItem value="L">
																			L
																		</SelectItem>
																		<SelectItem value="XL">
																			XL
																		</SelectItem>
																		<SelectItem value="XXL">
																			XXL
																		</SelectItem>
																		<SelectItem value="XXXL">
																			XXXL
																		</SelectItem>
																	</SelectContent>
																</Select>
															</div>
															<div className="space-y-2">
																<Label
																	htmlFor={`tshirt-fit-${index}`}
																>
																	Fit
																</Label>
																<Select
																	value={
																		tshirt.fit
																	}
																	onValueChange={(
																		value:
																			| "oversized"
																			| "regular",
																	) => {
																		const newSizes =
																			[
																				...tshirtSizes,
																			];
																		newSizes[
																			index
																		].fit =
																			value;
																		setTshirtSizes(
																			newSizes,
																		);
																	}}
																>
																	<SelectTrigger
																		id={`tshirt-fit-${index}`}
																	>
																		<SelectValue placeholder="Select fit" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="regular">
																			Regular
																			Fit
																		</SelectItem>
																		<SelectItem value="oversized">
																			Oversized
																		</SelectItem>
																	</SelectContent>
																</Select>
															</div>
														</div>
													</div>
												),
											)}

											<Button
												type="button"
												variant="outline"
												onClick={() => {
													setTshirtSizes([
														...tshirtSizes,
														{
															name: "",
															size: "",
															fit: "regular",
														},
													]);
												}}
												className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
											>
												<Plus className="h-4 w-4 mr-2" />
												Add Another Person T-Shirt Size
											</Button>
										</div>

										<div className="space-y-2">
											<Label htmlFor="biography">
												Artist Biography
											</Label>
											<Textarea
												id="biography"
												value={artistData.biography}
												onChange={(e) =>
													handleInputChange(
														"biography",
														e.target.value,
													)
												}
												placeholder="Tell us about yourself and your performance"
												className="min-h-[100px]"
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 2. Music Information */}
						<AccordionItem
							value="music-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-pink-100 overflow-hidden hover:shadow-xl transition-all duration-300"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-pink-50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="bg-pink-100 rounded-full p-2">
										<Music className="h-5 w-5 text-pink-600" />
									</div>
									<span className="text-gray-900">
										Music Information
									</span>
									<span className="ml-2 text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
										Required
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6">
								<Card className="border-0 shadow-none">
									<CardContent className="space-y-6 pt-6">
										<div className="space-y-4">
											<h3 className="text-lg font-medium text-muted-foreground">
												Performance Tracks
											</h3>

											{musicTracks.length > 0 ? (
												<div className="space-y-4">
													{musicTracks.map(
														(track, index) => (
															<div
																key={index}
																className="border rounded-lg p-4 space-y-4"
															>
																<div className="flex justify-between items-center">
																	<h4 className="font-medium">
																		Track{" "}
																		{index +
																			1}
																	</h4>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleDeleteMusicTrack(
																				index,
																			)
																		}
																		className="flex items-center gap-1 text-destructive hover:text-destructive"
																	>
																		<Trash2 className="h-3 w-3" />
																		Delete
																	</Button>
																</div>
																{/* Song Title - Read Only, auto-set to artist name */}
																<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
																	<p className="text-sm font-semibold text-blue-900">
																		Song
																		Title:{" "}
																		{artistData.artist_name ||
																			profile?.artistName ||
																			"Artist Track"}
																	</p>
																	<p className="text-xs text-blue-700 mt-1">
																		The song
																		will be
																		automatically
																		named
																		with
																		your
																		stage
																		name
																	</p>
																</div>

																<div className="space-y-2">
																	<Label>
																		What is
																		the
																		tempo of
																		your
																		show?
																		(0-10
																		scale)
																	</Label>
																	<div className="flex items-center gap-2">
																		<Button
																			type="button"
																			variant="outline"
																			size="icon"
																			onClick={() => {
																				const currentTempo =
																					parseFloat(
																						track.tempo,
																					) ||
																					5;
																				const newTempo =
																					Math.max(
																						0,
																						currentTempo -
																							0.5,
																					);
																				const newTracks =
																					[
																						...musicTracks,
																					];
																				newTracks[
																					index
																				].tempo =
																					newTempo.toString();
																				setMusicTracks(
																					newTracks,
																				);
																			}}
																			disabled={
																				parseFloat(
																					track.tempo,
																				) <=
																				0
																			}
																			className="h-10 w-10"
																		>
																			-
																		</Button>
																		<Input
																			type="number"
																			value={
																				track.tempo ||
																				"5"
																			}
																			onChange={(
																				e,
																			) => {
																				const value =
																					parseFloat(
																						e
																							.target
																							.value,
																					);
																				if (
																					!isNaN(
																						value,
																					) &&
																					value >=
																						0 &&
																					value <=
																						10
																				) {
																					const newTracks =
																						[
																							...musicTracks,
																						];
																					newTracks[
																						index
																					].tempo =
																						value.toString();
																					setMusicTracks(
																						newTracks,
																					);
																				}
																			}}
																			min="0"
																			max="10"
																			step="0.5"
																			className="text-center"
																			placeholder="5"
																		/>
																		<Button
																			type="button"
																			variant="outline"
																			size="icon"
																			onClick={() => {
																				const currentTempo =
																					parseFloat(
																						track.tempo,
																					) ||
																					5;
																				const newTempo =
																					Math.min(
																						10,
																						currentTempo +
																							0.5,
																					);
																				const newTracks =
																					[
																						...musicTracks,
																					];
																				newTracks[
																					index
																				].tempo =
																					newTempo.toString();
																				setMusicTracks(
																					newTracks,
																				);
																			}}
																			disabled={
																				parseFloat(
																					track.tempo,
																				) >=
																				10
																			}
																			className="h-10 w-10"
																		>
																			+
																		</Button>
																	</div>
																</div>

																<div className="space-y-2">
																	<Label>
																		Notes
																		for the
																		DJ
																	</Label>
																	<Textarea
																		value={
																			track.notes ||
																			""
																		}
																		onChange={(
																			e,
																		) => {
																			const newTracks =
																				[
																					...musicTracks,
																				];
																			newTracks[
																				index
																			].notes =
																				e.target.value;
																			setMusicTracks(
																				newTracks,
																			);
																		}}
																		placeholder="Any special notes or instructions for the DJ"
																		rows={3}
																	/>
																</div>

																<div className="flex items-center space-x-2">
																	<input
																		type="checkbox"
																		id={`main-track-${index}`}
																		checked={
																			track.is_main_track ||
																			false
																		}
																		onChange={(
																			e,
																		) => {
																			const newTracks =
																				[
																					...musicTracks,
																				];
																			// Only one main track allowed
																			newTracks.forEach(
																				(
																					t,
																					i,
																				) => {
																					t.is_main_track =
																						i ===
																						index
																							? e
																									.target
																									.checked
																							: false;
																				},
																			);
																			setMusicTracks(
																				newTracks,
																			);
																		}}
																		className="rounded"
																	/>
																	<Label
																		htmlFor={`main-track-${index}`}
																		className="text-sm text-muted-foreground"
																	>
																		NOTE:
																		You are
																		responsible
																		in
																		double
																		checking
																		you have
																		uploaded
																		and send
																		us the
																		right
																		music -
																		always
																		during
																		the show
																		and
																		rehearsal
																		bring a
																		backup
																	</Label>
																</div>

																{/* Loading state while uploading */}
																{uploadingFiles[
																	index
																] && (
																	<div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 shadow-md">
																		<div className="flex items-center gap-3">
																			<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
																			<div className="flex-1">
																				<p className="text-sm font-semibold text-blue-900">
																					Uploading{" "}
																					{track.song_title ||
																						"music file"}
																					...
																				</p>
																				<div className="mt-2 w-full bg-blue-300 rounded-full h-2.5">
																					<div
																						className="bg-blue-700 h-2.5 rounded-full transition-all duration-300"
																						style={{
																							width: `${
																								uploadProgress[
																									index
																								] ||
																								0
																							}%`,
																						}}
																					></div>
																				</div>
																				<p className="text-xs font-semibold text-blue-800 mt-1">
																					{uploadProgress[
																						index
																					] ||
																						0}

																					%
																					complete
																				</p>
																			</div>
																		</div>
																	</div>
																)}

																{/* Success state after upload */}
																{track.file_url &&
																	!uploadingFiles[
																		index
																	] && (
																		<div className="bg-green-100 border-2 border-green-500 rounded-lg p-3 shadow-md">
																			<div className="flex justify-between items-center mb-2">
																				<div className="flex items-center gap-2">
																					<CheckCircle className="h-5 w-5 text-green-700" />
																					<p className="text-green-900 text-sm font-semibold">
																						✓
																						"
																						{track.song_title ||
																							track.songTitle}

																						"
																						uploaded
																						successfully
																					</p>
																				</div>
																			</div>
																			<div className="space-y-2">
																				<AudioPlayer
																					track={{
																						song_title:
																							track.song_title ||
																							track.songTitle ||
																							"Unknown Track",
																						duration:
																							track.duration ||
																							0,
																						notes:
																							track.notes ||
																							"",
																						is_main_track:
																							track.is_main_track ||
																							false,
																						tempo:
																							track.tempo ||
																							"medium",
																						file_url:
																							track.file_url,
																						file_path:
																							track.file_path,
																					}}
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
																		</div>
																	)}
															</div>
														),
													)}
												</div>
											) : (
												<p className="text-center text-muted-foreground py-8">
													No music tracks uploaded yet
												</p>
											)}

											{/* Upload Area - Hidden during upload */}
											{!uploadingMusic && (
												<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-300">
													<div className="flex flex-col items-center gap-4">
														<Upload className="h-12 w-12 text-muted-foreground" />
														<div>
															<h4 className="font-medium mb-1">
																{musicTracks.length >
																	0 &&
																musicTracks[0]
																	?.file_url
																	? "Replace Music Track"
																	: "Upload Music Track"}
															</h4>
															<p className="text-sm text-muted-foreground">
																Click to upload
																an audio file
																(Max 10MB)
															</p>
														</div>
														<div className="flex items-center gap-2">
															<div className="relative">
																<input
																	type="file"
																	accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.aiff"
																	onChange={
																		handleMusicUpload
																	}
																	className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
																	disabled={
																		uploadingMusic
																	}
																/>
																<Button
																	type="button"
																	variant="default"
																	size="sm"
																	disabled={
																		uploadingMusic
																	}
																	className="flex items-center gap-1"
																>
																	<Upload className="h-3 w-3" />
																	{musicTracks.length >
																		0 &&
																	musicTracks[0]
																		?.file_url
																		? "Replace File"
																		: "Choose File"}
																</Button>
															</div>
														</div>
													</div>
												</div>
											)}

											{/* Upload Loading State */}
											{uploadingMusic && (
												<div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-8 text-center animate-fade-in">
													<div className="flex flex-col items-center gap-4">
														<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
														<div>
															<h4 className="font-semibold text-purple-900 mb-1">
																🎵 Uploading
																music files...
															</h4>
															<p className="text-sm text-purple-700">
																Please wait
																while we process
																your tracks
															</p>
														</div>
														<div className="w-full max-w-md space-y-3">
															{Object.entries(
																uploadProgress,
															).map(
																([
																	index,
																	progress,
																]) => (
																	<div
																		key={
																			index
																		}
																		className="space-y-1"
																	>
																		<div className="flex justify-between text-xs text-purple-700">
																			<span>
																				Track{" "}
																				{parseInt(
																					index,
																				) +
																					1}
																			</span>
																			<span>
																				{
																					progress
																				}

																				%
																			</span>
																		</div>
																		<div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
																			<div
																				className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
																				style={{
																					width: `${progress}%`,
																				}}
																			></div>
																		</div>
																	</div>
																),
															)}
														</div>
													</div>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 3. Technical Show Director Information */}
						<AccordionItem
							value="technical-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-yellow-100 overflow-hidden hover:shadow-xl transition-all duration-300"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-yellow-50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="bg-yellow-100 rounded-full p-2">
										<Lightbulb className="h-5 w-5 text-yellow-600" />
									</div>
									<span className="text-gray-900">
										Technical Show Director Information
									</span>
									<span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
										Required
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6">
								<Card>
									<CardContent className="space-y-6 pt-6">
										{/* Costume Colors Section */}
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<Palette className="h-5 w-5 text-purple-600" />
												<h3 className="text-lg font-semibold">
													Costume Colors
												</h3>
											</div>
											<p className="text-sm text-gray-600">
												Tap the color button to pick
												your costume colors. You can
												enter hex codes manually (e.g.,
												#FF5733).
											</p>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
												<ColorPickerFull
													label="Primary Costume Color"
													value={
														artistData.manual_costume_color
													}
													onChange={(color) =>
														handleInputChange(
															"manual_costume_color",
															color,
														)
													}
													placeholder="Tap to select"
													required={true}
													showClear={true}
												/>
												<ColorPickerFull
													label="Secondary Costume Color"
													value={
														artistData.manual_costume_color_two
													}
													onChange={(color) =>
														handleInputChange(
															"manual_costume_color_two",
															color,
														)
													}
													placeholder="Optional"
													required={false}
													showClear={true}
												/>
												<ColorPickerFull
													label="Third Costume Color"
													value={
														artistData.manual_costume_color_three
													}
													onChange={(color) =>
														handleInputChange(
															"manual_costume_color_three",
															color,
														)
													}
													placeholder="Optional"
													required={false}
													showClear={true}
												/>
											</div>
											{/* Combined Costume Colors Preview */}
											{(artistData.manual_costume_color ||
												artistData.manual_costume_color_two ||
												artistData.manual_costume_color_three) && (
												<div className="space-y-2 mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
													<Label className="text-sm font-medium text-purple-800">
														🎨 Combined Colors
														Preview
													</Label>
													<div className="flex gap-2 h-12">
														{artistData.manual_costume_color && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_costume_color,
																}}
																title={`Primary: ${artistData.manual_costume_color}`}
															></div>
														)}
														{artistData.manual_costume_color_two && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_costume_color_two,
																}}
																title={`Secondary: ${artistData.manual_costume_color_two}`}
															></div>
														)}
														{artistData.manual_costume_color_three && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_costume_color_three,
																}}
																title={`Third: ${artistData.manual_costume_color_three}`}
															></div>
														)}
													</div>
												</div>
											)}
										</div>

										{/* Lighting Preferences Section */}
										<div className="space-y-4 pt-4 border-t">
											<div className="flex items-center gap-2">
												<Lightbulb className="h-5 w-5 text-yellow-600" />
												<h3 className="text-lg font-semibold">
													Lighting Preferences
												</h3>
											</div>
											<p className="text-sm text-gray-600">
												Select your preferred lighting
												colors. Leave empty to trust the
												lighting designer.
											</p>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
												<ColorPickerFull
													label="Primary Light Color"
													value={
														artistData.manual_light_color
													}
													onChange={(color) =>
														handleInputChange(
															"manual_light_color",
															color,
														)
													}
													placeholder="Optional"
													required={false}
													showClear={true}
												/>
												<ColorPickerFull
													label="Secondary Light Color"
													value={
														artistData.manual_light_color_two
													}
													onChange={(color) =>
														handleInputChange(
															"manual_light_color_two",
															color,
														)
													}
													placeholder="Optional"
													required={false}
													showClear={true}
												/>
												<ColorPickerFull
													label="Third Light Color"
													value={
														artistData.manual_light_color_three
													}
													onChange={(color) =>
														handleInputChange(
															"manual_light_color_three",
															color,
														)
													}
													placeholder="Optional"
													required={false}
													showClear={true}
												/>
											</div>
											{/* Combined Light Colors Preview */}
											{(artistData.manual_light_color ||
												artistData.manual_light_color_two ||
												artistData.manual_light_color_three) && (
												<div className="space-y-2 mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
													<Label className="text-sm font-medium text-yellow-800">
														💡 Combined Lighting
														Preview
													</Label>
													<div className="flex gap-2 h-12">
														{artistData.manual_light_color && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_light_color,
																}}
																title={`Primary: ${artistData.manual_light_color}`}
															></div>
														)}
														{artistData.manual_light_color_two && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_light_color_two,
																}}
																title={`Secondary: ${artistData.manual_light_color_two}`}
															></div>
														)}
														{artistData.manual_light_color_three && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		artistData.manual_light_color_three,
																}}
																title={`Third: ${artistData.manual_light_color_three}`}
															></div>
														)}
													</div>
												</div>
											)}
											<div className="space-y-2">
												<Label htmlFor="light_requests">
													Special Lighting Requests
												</Label>
												<Textarea
													id="light_requests"
													value={
														artistData.light_requests
													}
													onChange={(e) =>
														handleInputChange(
															"light_requests",
															e.target.value,
														)
													}
													placeholder="Any specific lighting effects, movements, or special requests"
													rows={3}
												/>
											</div>
										</div>

										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Stage Positioning
											</h3>
											<StagePositionPreview
												startPosition={
													artistData.stage_position_start
												}
												endPosition={
													artistData.stage_position_end
												}
												className="mb-4"
											/>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="stage_position_start">
														Starting Position
													</Label>
													<Select
														value={
															artistData.stage_position_start
														}
														onValueChange={(
															value,
														) =>
															handleInputChange(
																"stage_position_start",
																value,
															)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select starting position" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="upstage-left">
																Upstage Left
															</SelectItem>
															<SelectItem value="upstage">
																Upstage Center
															</SelectItem>
															<SelectItem value="upstage-right">
																Upstage Right
															</SelectItem>
															<SelectItem value="left">
																Center Left
															</SelectItem>
															<SelectItem value="center">
																Center
															</SelectItem>
															<SelectItem value="right">
																Center Right
															</SelectItem>
															<SelectItem value="downstage-left">
																Downstage Left
															</SelectItem>
															<SelectItem value="downstage">
																Downstage Center
															</SelectItem>
															<SelectItem value="downstage-right">
																Downstage Right
															</SelectItem>
															<SelectItem value="custom">
																Custom Position
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-2">
													<Label htmlFor="stage_position_end">
														Ending Position
													</Label>
													<Select
														value={
															artistData.stage_position_end
														}
														onValueChange={(
															value,
														) =>
															handleInputChange(
																"stage_position_end",
																value,
															)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select ending position" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="upstage-left">
																Upstage Left
															</SelectItem>
															<SelectItem value="upstage">
																Upstage Center
															</SelectItem>
															<SelectItem value="upstage-right">
																Upstage Right
															</SelectItem>
															<SelectItem value="left">
																Center Left
															</SelectItem>
															<SelectItem value="center">
																Center
															</SelectItem>
															<SelectItem value="right">
																Center Right
															</SelectItem>
															<SelectItem value="downstage-left">
																Downstage Left
															</SelectItem>
															<SelectItem value="downstage">
																Downstage Center
															</SelectItem>
															<SelectItem value="downstage-right">
																Downstage Right
															</SelectItem>
															<SelectItem value="custom">
																Custom Position
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>
											{(artistData.stage_position_start ===
												"custom" ||
												artistData.stage_position_end ===
													"custom") && (
												<div className="space-y-2">
													<Label htmlFor="custom_stage_position">
														Custom Stage Position
														Details
													</Label>
													<Textarea
														id="custom_stage_position"
														value={
															artistData.custom_stage_position
														}
														onChange={(e) =>
															handleInputChange(
																"custom_stage_position",
																e.target.value,
															)
														}
														placeholder="Describe your custom stage positioning requirements"
														rows={3}
													/>
												</div>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="props_needed">
												Props and Equipment Needed
											</Label>
											<Textarea
												id="props_needed"
												value={artistData.props_needed}
												onChange={(e) =>
													handleInputChange(
														"props_needed",
														e.target.value,
													)
												}
												placeholder="List any props, equipment, or special items you need for your performance"
												rows={3}
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 4. Stage Visual Manager Information */}
						<AccordionItem
							value="visual-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden hover:shadow-xl transition-all duration-300"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-blue-50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="bg-blue-100 rounded-full p-2">
										<ImageIcon className="h-5 w-5 text-blue-600" />
									</div>
									<span className="text-gray-900">
										Stage Visual Manager Information
									</span>
									<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
										Optional
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6">
								<Card className="border-0 shadow-none">
									<CardContent className="space-y-6 pt-6">
										{/* Rehearsal Video Upload */}
										<div className="space-y-4">
											<div className="flex items-center gap-2">
												<h3 className="text-lg font-semibold">
													Rehearsal or Show Video
												</h3>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
													Optional
												</span>
											</div>

											{/* Confirmation Modal */}
											<Dialog
												open={showRehearsalVideoModal}
												onOpenChange={
													setShowRehearsalVideoModal
												}
											>
												<DialogContent className="max-w-md">
													<DialogHeader>
														<DialogTitle className="text-xl font-bold text-amber-600 flex items-center gap-2">
															<FileText className="h-5 w-5" />
															Important – please
															read carefully
														</DialogTitle>
														<DialogDescription className="text-base text-gray-700 pt-4 space-y-3">
															<p>
																We need a video
																of your
																performance. A
																rehearsal video
																is perfectly
																fine and will{" "}
																<strong>
																	not
																</strong>{" "}
																be used
																publicly.
															</p>
															<p>
																The video is
																required to
																determine the
																show order, plan
																the stage setup,
																and program the
																lighting.
															</p>
														</DialogDescription>
													</DialogHeader>
													<div className="flex justify-end gap-3 mt-4">
														<Button
															variant="outline"
															onClick={() =>
																setShowRehearsalVideoModal(
																	false,
																)
															}
														>
															Cancel
														</Button>
														<Label
															htmlFor="rehearsal-video-input-edit"
															className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-all"
														>
															<Upload className="h-4 w-4" />
															Select Video
														</Label>
													</div>
												</DialogContent>
											</Dialog>

											{/* Hidden file input */}
											<Input
												id="rehearsal-video-input-edit"
												type="file"
												accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.3g2,.wmv,.flv,.m4v,.ts,.mts,.m2ts,.divx,.vob,.f4v"
												onChange={(e) => {
													setShowRehearsalVideoModal(
														false,
													);
													handleRehearsalVideoUpload(
														e,
													);
												}}
												className="hidden"
											/>

											{/* Upload Progress */}
											{uploadingRehearsalVideo && (
												<div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
													<div className="flex items-center gap-4">
														<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
														<div className="flex-1">
															<p className="text-base font-semibold text-purple-900 mb-2">
																Uploading
																rehearsal
																video...
															</p>
															<div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
																<div
																	className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
																	style={{
																		width: `${rehearsalVideoProgress}%`,
																	}}
																>
																	<span className="text-xs text-white font-bold">
																		{
																			rehearsalVideoProgress
																		}
																		%
																	</span>
																</div>
															</div>
															<p className="text-sm text-purple-700 mt-2">
																We are securely uploading your video in resilient chunks. <strong>Please keep this screen open and active.</strong>
															</p>
														</div>
													</div>
												</div>
											)}

											{/* Upload Button - Show when not uploading and no video */}
											{!uploadingRehearsalVideo &&
												!rehearsalVideo && (
													<div className="border-2 border-dashed border-purple-300 rounded-lg p-4 sm:p-6 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300">
														<div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
															<div className="bg-purple-100 rounded-full p-2 sm:p-3">
																<Play className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
															</div>
															<Button
																type="button"
																variant="outline"
																onClick={() =>
																	setShowRehearsalVideoModal(
																		true,
																	)
																}
																className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-all shadow-sm"
															>
																<Upload className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
																<span className="text-purple-700 font-medium text-sm sm:text-base">
																	Upload a
																	Rehearsal or
																	Show Video
																</span>
															</Button>
															<p className="text-xs sm:text-sm text-gray-500 text-center">
																Accepts all
																video formats
																(MP4, MOV, AVI,
																etc.)
															</p>
														</div>
													</div>
												)}

											{/* Video Preview */}
											{rehearsalVideo &&
												!uploadingRehearsalVideo && (
													<div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
														<div className="flex items-center justify-between mb-3">
															<div className="flex items-center gap-2">
																<CheckCircle className="h-5 w-5 text-green-600" />
																<span className="font-medium text-green-800">
																	Rehearsal
																	Video
																	Uploaded
																</span>
															</div>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={
																	handleDeleteRehearsalVideo
																}
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
															>
																Remove
															</Button>
														</div>
														<div className="bg-white rounded-lg p-2">
															<VideoPlayer
																file={{
																	name: rehearsalVideo.name,
																	type: "video",
																	url: rehearsalVideo.url,
																	file_path:
																		rehearsalVideo.file_path,
																	size: rehearsalVideo.size,
																	contentType:
																		rehearsalVideo.contentType,
																}}
																className="aspect-video max-h-64"
															/>
														</div>
														<p className="text-sm text-gray-600 mt-2">
															{
																rehearsalVideo.name
															}
															{rehearsalVideo.size && (
																<span className="ml-2 text-gray-400">
																	(
																	{(
																		rehearsalVideo.size /
																		(1024 *
																			1024)
																	).toFixed(
																		1,
																	)}{" "}
																	MB)
																</span>
															)}
														</p>
													</div>
												)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="show_link">
												Performance Video/Demo Link
											</Label>
											<Input
												id="show_link"
												type="url"
												value={artistData.show_link}
												onChange={(e) =>
													handleInputChange(
														"show_link",
														e.target.value,
													)
												}
												placeholder="YouTube, Vimeo, or other video link"
											/>
										</div>

										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Social Media Links
											</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="instagram_link">
														Instagram
													</Label>
													<Input
														id="instagram_link"
														type="url"
														value={
															artistData.instagram_link
														}
														onChange={(e) =>
															handleInputChange(
																"instagram_link",
																e.target.value,
															)
														}
														placeholder="https://instagram.com/username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="facebook_link">
														Facebook
													</Label>
													<Input
														id="facebook_link"
														type="url"
														value={
															artistData.facebook_link
														}
														onChange={(e) =>
															handleInputChange(
																"facebook_link",
																e.target.value,
															)
														}
														placeholder="https://facebook.com/username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="tiktok_link">
														TikTok
													</Label>
													<Input
														id="tiktok_link"
														type="url"
														value={
															artistData.tiktok_link
														}
														onChange={(e) =>
															handleInputChange(
																"tiktok_link",
																e.target.value,
															)
														}
														placeholder="https://tiktok.com/@username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="youtube_link">
														YouTube
													</Label>
													<Input
														id="youtube_link"
														type="url"
														value={
															artistData.youtube_link
														}
														onChange={(e) =>
															handleInputChange(
																"youtube_link",
																e.target.value,
															)
														}
														placeholder="https://youtube.com/channel/..."
													/>
												</div>
												<div className="space-y-2 md:col-span-2">
													<Label htmlFor="website_link">
														Website
													</Label>
													<Input
														id="website_link"
														type="url"
														value={
															artistData.website_link
														}
														onChange={(e) =>
															handleInputChange(
																"website_link",
																e.target.value,
															)
														}
														placeholder="https://yourwebsite.com"
													/>
												</div>
											</div>
										</div>

										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<h3 className="text-lg font-semibold">
													Media Gallery
												</h3>
												{!uploadingGallery && (
													<div className="flex items-center gap-2">
														<div className="relative">
															<input
																type="file"
																accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.mp4,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.3g2,.wmv,.flv,.m4v,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/mpeg,video/3gpp,video/3gpp2,video/x-ms-wmv,video/x-flv,video/x-m4v"
																multiple
																onChange={
																	handleGalleryUpload
																}
																className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
																disabled={
																	uploadingGallery
																}
															/>
															<Button
																type="button"
																variant="outline"
																size="sm"
																disabled={
																	uploadingGallery
																}
																className="flex items-center gap-1"
															>
																<Upload className="h-3 w-3" />
																Import Media
															</Button>
														</div>
													</div>
												)}
											</div>
											<p className="text-xs text-gray-500">
												Images (max 10MB) • Videos (max
												500MB)
											</p>

											{/* Gallery Upload Loading State */}
											{uploadingGallery && (
												<div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8 text-center animate-fade-in">
													<div className="flex flex-col items-center gap-4">
														<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
														<div>
															<h4 className="font-semibold text-blue-900 mb-1">
																📸 Uploading{" "}
																{
																	galleryUploadingCount
																}{" "}
																file
																{galleryUploadingCount !==
																1
																	? "s"
																	: ""}
																...
															</h4>
															<p className="text-sm text-blue-700">
																Uploading gallery assets using robust chunks to handle mobile and slow connections. <strong>Please keep this screen open and active.</strong>
															</p>
														</div>
														<div className="w-full max-w-md">
															<div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden relative">
																<div
																	className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 flex items-center justify-center"
																	style={{
																		width: `${galleryUploadProgress}%`,
																	}}
																>
																	<span className="text-xs font-semibold text-white">
																		{
																			galleryUploadProgress
																		}
																		%
																	</span>
																</div>
															</div>
														</div>
													</div>
												</div>
											)}

											{!uploadingGallery &&
											galleryFiles.length > 0 ? (
												<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
													{galleryFiles.map(
														(file, index) => (
															<div
																key={index}
																className="relative group"
															>
																{file.type ===
																"image" ? (
																	<ImageViewer
																		file={{
																			name: file.name,
																			type: "image",
																			url: file.url,
																			file_path:
																				file.file_path,
																			size:
																				file.size ||
																				0,
																			uploadedAt:
																				file.uploadedAt,
																			contentType:
																				file.contentType,
																		}}
																		onError={(
																			error,
																		) => {
																			console.error(
																				"Image viewer error:",
																				error,
																			);
																			toast(
																				{
																					title: "Image Error",
																					description:
																						"Failed to load image file.",
																					variant:
																						"destructive",
																				},
																			);
																		}}
																		className="aspect-square"
																	/>
																) : (
																	<VideoPlayer
																		file={{
																			name: file.name,
																			type: "video",
																			url: file.url,
																			file_path:
																				file.file_path,
																			size:
																				file.size ||
																				0,
																			uploadedAt:
																				file.uploadedAt,
																			contentType:
																				file.contentType,
																		}}
																		onError={(
																			error,
																		) => {
																			console.error(
																				"Video player error:",
																				error,
																			);
																			toast(
																				{
																					title: "Video Error",
																					description:
																						"Failed to play video file.",
																					variant:
																						"destructive",
																				},
																			);
																		}}
																		className="aspect-square"
																	/>
																)}
																<div className="flex items-center justify-between mt-2">
																	<p className="text-xs text-muted-foreground truncate flex-1">
																		{
																			file.name
																		}
																	</p>
																	<div className="flex items-center gap-1">
																		<Button
																			type="button"
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				handleDeleteGalleryFile(
																					index,
																				)
																			}
																			className="h-6 px-2 text-xs text-destructive hover:text-destructive"
																		>
																			<Trash2 className="h-3 w-3" />
																		</Button>
																	</div>
																</div>
															</div>
														),
													)}
												</div>
											) : !uploadingGallery ? (
												<p className="text-center text-muted-foreground py-8">
													No media files uploaded yet
												</p>
											) : null}
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 5. Additional Information */}
						<AccordionItem
							value="additional-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-green-100 overflow-hidden hover:shadow-xl transition-all duration-300"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-green-50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="bg-green-100 rounded-full p-2">
										<FileText className="h-5 w-5 text-green-600" />
									</div>
									<span className="text-gray-900">
										Additional Information
									</span>
									<span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
										Optional
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6">
								<Card className="border-0 shadow-none">
									<CardContent className="space-y-4 pt-6">
										<div className="space-y-2">
											<Label htmlFor="mc_notes">
												MC Notes
											</Label>
											<Textarea
												id="mc_notes"
												value={artistData.mc_notes}
												onChange={(e) =>
													handleInputChange(
														"mc_notes",
														e.target.value,
													)
												}
												placeholder="Information for the MC to announce before your performance"
												className="min-h-[100px]"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="stage_manager_notes">
												Stage Manager Notes
											</Label>
											<Textarea
												id="stage_manager_notes"
												value={
													artistData.stage_manager_notes
												}
												onChange={(e) =>
													handleInputChange(
														"stage_manager_notes",
														e.target.value,
													)
												}
												placeholder="Notes for the stage manager about props and performance requirements"
												className="min-h-[100px]"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="notes">
												Additional Notes
											</Label>
											<Textarea
												id="notes"
												value={artistData.notes}
												onChange={(e) =>
													handleInputChange(
														"notes",
														e.target.value,
													)
												}
												placeholder="Any additional information, special requirements, or notes for the event organizers"
												className="min-h-[100px]"
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					{/* Pre-Submit Reminder */}
					<div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-xl p-6 shadow-lg">
						<div className="flex items-start gap-4">
							<div className="bg-yellow-500 rounded-full p-2 mt-1">
								<CheckCircle className="h-6 w-6 text-white" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-bold text-yellow-900 mb-2">
									✅ Ready to Save?
								</h3>
								<p className="text-yellow-800 mb-3">
									Please review your changes before saving.
									Make sure all information is accurate and
									complete.
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								router.push(`/artist-dashboard/${artistId}`)
							}
							className="flex-1 h-12 text-base"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={submitting}
							className="flex-1 h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
						>
							{submitting ? (
								<>
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
									Saving Changes...
								</>
							) : (
								<>
									<Save className="h-5 w-5 mr-2" />
									Save Changes
								</>
							)}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}
