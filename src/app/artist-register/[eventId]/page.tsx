"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ClientWrapper from "@/components/ClientWrapper";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@/components/ui/card";
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
	CheckCircle,
	Plus,
	Copy,
	Play,
	Palette,
	Trash2,
	Users,
} from "lucide-react";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppInput } from "@/components/ui/whatsapp-input";
import { validateMediaFile } from "@/lib/media-validation";
import { uploadToGCS } from "@/lib/upload-utils";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import {
	saveFormData,
	loadFormData,
	clearFormData,
	debounce,
} from "@/lib/form-persistence";
import {
	ColorPickerCompact,
	ColorPickerFull,
} from "@/components/ui/color-picker";
import { NationalityInput, MemberInfo } from "@/components/ui/country-select";

interface Event {
	id: string;
	name: string;
	venue: string;
	start_date: string;
	end_date: string;
	logoUrl?: string;
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
		black: "#000000",
		"warm-white": "#fff8dc",
		"cold-blue": "#add8e6",
		uv: "#9400d3",
		rose: "#ff69b4",
		orange: "#ffa500",
		pink: "#ffc0cb",
		teal: "#008080",
		lavender: "#e6e6fa",
		gold: "#ffd700",
		silver: "#c0c0c0",
		turquoise: "#40e0d0",
		trust: "#888888",
		none: "transparent",
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

function ArtistRegistrationForm() {
	const { eventId } = useParams();
	const router = useRouter();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [existingProfile, setExistingProfile] = useState<any>(null);
	const { toast } = useToast();

	// Check if we should redirect to welcome page
	useEffect(() => {
		// Check if this is a direct link (no query params) and not coming from welcome page
		const urlParams = new URLSearchParams(window.location.search);
		const fromWelcome = urlParams.get("from");
		const artistId = urlParams.get("artistId");

		// If no query params at all, redirect to welcome page
		if (!fromWelcome && !artistId && eventId) {
			router.push(`/artist-register/${eventId}/welcome`);
			return;
		}
	}, [eventId, router]);

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
		// Nationality fields for group/band/other
		country_living: "",
		home_country: "",
		// Managed by field
		managed_by: "",
	});

	// Members for duo/trio nationality info
	const [members, setMembers] = useState<
		Array<{
			name: string;
			countryLiving: string;
			homeCountry: string;
		}>
	>([]);

	// T-shirt sizes state
	const [tshirtSizes, setTshirtSizes] = useState<
		Array<{
			name: string;
			size: string;
			fit: "oversized" | "regular";
		}>
	>([]);

	const [musicTrack, setMusicTrack] = useState({
		duration: 0,
		notes: "",
		tempo: "",
		file_url: "",
		file_path: "",
	});

	const [galleryFiles, setGalleryFiles] = useState<
		{
			url: string;
			type: "image" | "video";
			name: string;
			file_path?: string;
			size?: number;
			uploadedAt?: string;
			contentType?: string;
		}[]
	>([]);
	const [showSuccessDialog, setShowSuccessDialog] = useState(false);
	const [registeredArtistId, setRegisteredArtistId] = useState<string | null>(
		null,
	);

	// Add a render key to force re-render of form inputs when data is loaded
	const [renderKey, setRenderKey] = useState(0);

	// Upload progress states for music
	const [uploadingMusic, setUploadingMusic] = useState(false);
	const [musicUploadProgress, setMusicUploadProgress] = useState(0);

	// Upload progress states for gallery
	const [uploadingGallery, setUploadingGallery] = useState(false);
	const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
	const [galleryUploadingCount, setGalleryUploadingCount] = useState(0);

	// Profile image state
	const [profileImage, setProfileImage] = useState<string>("");
	const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

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

	// Email verification state
	const [emailVerified, setEmailVerified] = useState(false);
	const [verificationCodeSent, setVerificationCodeSent] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [sendingCode, setSendingCode] = useState(false);
	const [verifyingCode, setVerifyingCode] = useState(false);
	const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);

	// Form persistence key
	const formKey = `artist-register-${
		Array.isArray(eventId) ? eventId[0] : eventId
	}`;

	// Memoized audio error handler to prevent AudioPlayer rerenders
	const handleAudioError = useCallback(
		(error: string) => {
			console.error("Audio playback error:", error);
			toast({
				title: "Audio Error",
				description:
					"Failed to play audio file. Please check the file format.",
				variant: "destructive",
			});
		},
		[toast],
	);

	// Load saved form data on mount
	useEffect(() => {
		if (eventId) {
			fetchEvent();

			// First, check URL params to see if we should skip loading saved data
			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");
			const preFillName = urlParams.get("name");
			const preFillEmail = urlParams.get("email");
			const fromStageManager = urlParams.get("from") === "stage-manager";

			// If coming from stage manager with URL params, don't load saved data
			const shouldLoadSavedData = !fromStageManager && !artistId;

			// Load saved form data only if not coming from stage manager
			if (shouldLoadSavedData) {
				const savedData = loadFormData<{
					artistData: typeof artistData;
					musicTrack: typeof musicTrack;
					galleryFiles: typeof galleryFiles;
					tshirtSizes: typeof tshirtSizes;
				}>(formKey);

				if (savedData) {
					setArtistData(savedData.artistData);
					setMusicTrack(savedData.musicTrack);
					setGalleryFiles(savedData.galleryFiles);
					if (savedData.tshirtSizes) {
						setTshirtSizes(savedData.tshirtSizes);
					}
					toast({
						title: "Progress Restored",
						description: "Your previous progress has been restored",
						variant: "success",
						duration: 3000,
					});
				}
			}

			// Fetch existing profile after checking saved data
			fetchExistingProfile();
		}
	}, [eventId]);

	// Auto-save form data (debounced)
	useEffect(() => {
		const saveData = debounce(() => {
			// Don't save if form is empty
			if (!artistData.artist_name && !musicTrack.file_url) {
				return;
			}

			saveFormData(formKey, {
				artistData,
				musicTrack,
				galleryFiles,
				tshirtSizes,
			});
		}, 2000); // Save 2 seconds after user stops typing

		saveData();
	}, [artistData, musicTrack, galleryFiles, tshirtSizes, formKey]);

	// Debug: Log when artistData changes
	useEffect(() => {
		console.log("✏️ artistData state updated:", {
			artist_name: artistData.artist_name,
			email: artistData.email,
		});
	}, [artistData]);

	const fetchEvent = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				setEvent(data.data || data);
			} else {
				throw new Error("Failed to fetch event");
			}
		} catch (error) {
			toast({
				title: "Error fetching event",
				description: "Failed to load event details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchExistingProfile = async () => {
		try {
			// Check if there's an existing profile for this event
			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");
			const preFillName = urlParams.get("name");
			const preFillEmail = urlParams.get("email");
			const fromStageManager = urlParams.get("from") === "stage-manager";

			console.log("🔍 fetchExistingProfile - URL params:", {
				artistId,
				preFillName,
				preFillEmail,
				fromStageManager,
			});

			if (artistId) {
				// Editing existing profile
				const response = await fetch(
					`/api/events/${eventId}/artists/${artistId}`,
				);
				if (response.ok) {
					const data = await response.json();
					console.log(
						"📦 fetchExistingProfile - API response:",
						data,
					);

					if (data.artist) {
						setExistingProfile(data.artist);

						// Check if this is a draft from stage manager
						const isDraft = data.artist.status === "draft";

						console.log(
							"🎨 fetchExistingProfile - Setting form data:",
							{
								artistName: data.artist.artistName,
								email: data.artist.email,
								isDraft,
								willUseArtistName:
									data.artist.artistName || preFillName,
								willUseEmail: data.artist.email || preFillEmail,
							},
						);

						// Pre-fill form with existing data for editing
						// For draft artists from stage manager, prioritize URL params for empty fields
						setArtistData({
							artist_name:
								data.artist.artistName || preFillName || "",
							real_name: data.artist.realName || "",
							email: data.artist.email || preFillEmail || "",
							phone: data.artist.phone || "",
							style: data.artist.style || "",
							performance_type: data.artist.performanceType || "",
							biography: data.artist.biography || "",
							notes: data.artist.notes || "",
							props_needed: data.artist.equipment || "",
							performance_duration:
								data.artist.performanceDuration || 5,
							costume_color: data.artist.costumeColor || "",
							costume_color_two:
								data.artist.costumeColorTwo || "none",
							costume_color_three:
								data.artist.costumeColorThree || "none",
							custom_costume_color:
								data.artist.customCostumeColor || "",
							manual_costume_color:
								data.artist.manualCostumeColor || "",
							manual_costume_color_two:
								data.artist.manualCostumeColorTwo || "",
							manual_costume_color_three:
								data.artist.manualCostumeColorThree || "",
							light_color_single:
								data.artist.lightColorSingle || "trust",
							light_color_two:
								data.artist.lightColorTwo || "none",
							light_color_three:
								data.artist.lightColorThree || "none",
							light_requests: data.artist.lightRequests || "",
							manual_light_color:
								data.artist.manualLightColor || "",
							manual_light_color_two:
								data.artist.manualLightColorTwo || "",
							manual_light_color_three:
								data.artist.manualLightColorThree || "",
							show_link: data.artist.showLink || "",
							stage_position_start:
								data.artist.stagePositionStart || "",
							stage_position_end:
								data.artist.stagePositionEnd || "",
							custom_stage_position:
								data.artist.customStagePosition || "",
							mc_notes: data.artist.mcNotes || "",
							stage_manager_notes:
								data.artist.stageManagerNotes || "",
							instagram_link:
								data.artist.socialMedia?.instagram || "",
							facebook_link:
								data.artist.socialMedia?.facebook || "",
							tiktok_link: data.artist.socialMedia?.tiktok || "",
							youtube_link:
								data.artist.socialMedia?.youtube || "",
							website_link:
								data.artist.socialMedia?.website || "",
							country_living: data.artist.countryLiving || "",
							home_country: data.artist.homeCountry || "",
							managed_by: data.artist.managedBy || "",
						});

						// Force re-render of form inputs
						setRenderKey((prev) => prev + 1);

						// Load members for duo/trio
						if (
							data.artist.members &&
							data.artist.members.length > 0
						) {
							setMembers(data.artist.members);
						}

						// Load t-shirt sizes
						if (
							data.artist.tshirtSizes &&
							data.artist.tshirtSizes.length > 0
						) {
							setTshirtSizes(data.artist.tshirtSizes);
						}

						// Load profile image
						if (data.artist.image_url) {
							setProfileImage(data.artist.image_url);
						}

						if (data.artist.musicTrack) {
							setMusicTrack(data.artist.musicTrack);
						} else if (
							data.artist.musicTracks &&
							data.artist.musicTracks.length > 0
						) {
							// Backward compatibility: take first track if old format
							setMusicTrack(data.artist.musicTracks[0]);
						}

						if (data.artist.galleryFiles) {
							setGalleryFiles(data.artist.galleryFiles);
						}

						// Load rehearsal video
						if (data.artist.rehearsalVideo) {
							setRehearsalVideo(data.artist.rehearsalVideo);
						}

						// Show message if this is a draft from stage manager
						if (isDraft && fromStageManager) {
							toast({
								title: "📝 Complete Your Registration",
								description:
									"Please fill in the remaining details to complete your artist profile.",
								duration: 5000,
							});
						}
					}
				} else {
					// If artist not found but we have URL params, still pre-fill
					if (preFillName || preFillEmail) {
						setArtistData((prev) => ({
							...prev,
							artist_name: preFillName || "",
							email: preFillEmail || "",
						}));

						if (fromStageManager) {
							toast({
								title: "👋 Welcome!",
								description:
									"Please complete your artist registration below.",
								duration: 4000,
							});
						}
					}
				}
			} else if (preFillName || preFillEmail) {
				// Pre-fill name and email from URL params (from stage manager)
				setArtistData((prev) => ({
					...prev,
					artist_name: preFillName || "",
					email: preFillEmail || "",
				}));

				if (fromStageManager) {
					toast({
						title: "👋 Welcome!",
						description:
							"Please complete your artist registration below.",
						duration: 4000,
					});
				}
			}
			// If no artistId, form stays empty for new registration
		} catch (error) {
			console.error("Error fetching existing profile:", error);

			// Even if there's an error, try to pre-fill from URL params
			const urlParams = new URLSearchParams(window.location.search);
			const preFillName = urlParams.get("name");
			const preFillEmail = urlParams.get("email");
			const fromStageManager = urlParams.get("from") === "stage-manager";

			if (preFillName || preFillEmail) {
				setArtistData((prev) => ({
					...prev,
					artist_name: preFillName || "",
					email: preFillEmail || "",
				}));

				if (fromStageManager) {
					toast({
						title: "👋 Welcome!",
						description:
							"Please complete your artist registration below.",
						duration: 4000,
					});
				}
			}
		}
	};

	const handleInputChange = (field: string, value: string | number) => {
		setArtistData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Countdown timer effect
	useEffect(() => {
		if (!codeExpiresAt) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const remaining = Math.max(
				0,
				Math.floor((codeExpiresAt - now) / 1000),
			);
			setTimeRemaining(remaining);

			if (remaining === 0) {
				setVerificationCodeSent(false);
				setCodeExpiresAt(null);
				toast({
					title: "Code Expired",
					description: "Please request a new verification code",
					variant: "warning",
				});
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [codeExpiresAt, toast]);

	// Format time remaining as MM:SS
	const formatTimeRemaining = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Email verification functions
	const sendVerificationCode = async () => {
		if (!artistData.email) {
			toast({
				title: "Email Required",
				description: "Please enter your email address",
				variant: "destructive",
			});
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(artistData.email)) {
			toast({
				title: "Invalid Email",
				description: "Please enter a valid email address",
				variant: "destructive",
			});
			return;
		}

		setSendingCode(true);
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: artistData.email,
					action: "send",
				}),
			});

			const data = await response.json();

			if (data.success) {
				setVerificationCodeSent(true);
				setCodeExpiresAt(Date.now() + 10 * 60 * 1000); // 10 minutes
				setTimeRemaining(600); // 10 minutes in seconds
				toast({
					title: "Code Sent! ✓",
					description:
						"Check your email (and spam folder) for the verification code",
					variant: "success",
				});
			} else {
				toast({
					title: "Failed to Send Code",
					description: data.error || "Please try again",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error sending verification code:", error);
			toast({
				title: "Error",
				description: "Failed to send verification code",
				variant: "destructive",
			});
		} finally {
			setSendingCode(false);
		}
	};

	const verifyEmailCode = async () => {
		if (verificationCode.length !== 6) {
			toast({
				title: "Invalid Code",
				description: "Please enter the 6-digit code",
				variant: "destructive",
			});
			return;
		}

		setVerifyingCode(true);
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: artistData.email,
					code: verificationCode,
					action: "verify",
				}),
			});

			const data = await response.json();

			if (data.success) {
				setEmailVerified(true);
				setVerificationCodeSent(false);
				setVerificationCode("");
				toast({
					title: "Email Verified! ✓",
					description: "Your email has been successfully verified",
					variant: "success",
				});
			} else {
				toast({
					title: "Verification Failed",
					description:
						data.error || "Invalid code. Please try again.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error verifying code:", error);
			toast({
				title: "Error",
				description: "Failed to verify code",
				variant: "destructive",
			});
		} finally {
			setVerifyingCode(false);
		}
	};

	const updateMusicTrack = (field: string, value: string | number) => {
		setMusicTrack((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleMusicUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Detect audio duration automatically
		const detectDuration = (file: File): Promise<number> => {
			return new Promise((resolve) => {
				const audio = new Audio();
				const url = URL.createObjectURL(file);
				audio.addEventListener("loadedmetadata", () => {
					const durationInSeconds = Math.round(audio.duration);
					URL.revokeObjectURL(url);
					resolve(durationInSeconds);
				});
				audio.addEventListener("error", () => {
					URL.revokeObjectURL(url);
					resolve(0); // Default to 0 if detection fails
				});
				audio.src = url;
			});
		};

		// Validate file before upload
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
				title: "Invalid file",
				description: validation.error,
				variant: "destructive",
			});
			return;
		}

		// Set uploading state
		setUploadingMusic(true);
		setMusicUploadProgress(0);

		try {
			// Detect duration before upload
			setMusicUploadProgress(20);
			const duration = await detectDuration(file);

			setMusicUploadProgress(40);

			const resolvedEventId = Array.isArray(eventId)
				? eventId[0]
				: eventId;
			const resolvedArtistId =
				registeredArtistId ||
				new URLSearchParams(window.location.search).get("artistId") ||
				artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
				"temp";

			const uploadResult = await uploadToGCS({
				file,
				eventId: resolvedEventId,
				artistId: resolvedArtistId,
				fileType: "music",
				onProgress: (pct) => {
					// Map to 40-100 range since 0-40 is duration detection
					setMusicUploadProgress(40 + Math.round(pct * 0.6));
				},
			});

			console.log("Music upload result:", uploadResult);

			// Update track with file info - use artist name as song title
			setMusicTrack({
				file_url: uploadResult.url,
				file_path: uploadResult.fileName,
				duration: duration,
				notes: musicTrack.notes,
				tempo: musicTrack.tempo,
			});

			const minutes = Math.floor(duration / 60);
			const seconds = duration % 60;
			toast({
				title: "Upload successful",
				description: `Music file uploaded successfully - Duration: ${minutes}:${seconds
					.toString()
					.padStart(2, "0")}`,
				variant: "success",
			});
		} catch (error) {
			console.error("Upload error:", error);
			toast({
				title: "Upload failed",
				description: `Failed to upload ${file.name}: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				variant: "destructive",
			});
		} finally {
			// Clear uploading state after a short delay
			setTimeout(() => {
				setUploadingMusic(false);
			}, 500);
		}

		// Reset file input
		e.target.value = "";
	};

	const handleDeleteMusic = async () => {
		if (!musicTrack.file_url) return;

		try {
			// Clear the music track
			setMusicTrack({
				duration: 0,
				notes: musicTrack.notes,
				tempo: musicTrack.tempo,
				file_url: "",
				file_path: "",
			});

			toast({
				title: "File deleted",
				description: "Music file has been removed successfully",
				variant: "success",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Delete failed",
				description: "Failed to delete the music file",
				variant: "destructive",
			});
		}
	};

	const handleGalleryUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = e.target.files;
		if (!files) return;

		// Set uploading state
		setUploadingGallery(true);
		setGalleryUploadingCount(files.length);
		setGalleryUploadProgress(0);

		const resolvedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
		const resolvedArtistId =
			registeredArtistId ||
			new URLSearchParams(window.location.search).get("artistId") ||
			artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
			"temp";

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			// Validate file before upload
			const mediaType = file.type.startsWith("image/")
				? "image"
				: "video";
			const validation = validateMediaFile(
				{
					name: file.name,
					size: file.size,
					type: file.type,
				},
				mediaType,
			);

			if (!validation.isValid) {
				toast({
					title: "Invalid file",
					description: validation.error,
					variant: "destructive",
				});
				continue;
			}

			try {
				const uploadResult = await uploadToGCS({
					file,
					eventId: resolvedEventId,
					artistId: resolvedArtistId,
					fileType: file.type.startsWith("image/")
						? "images"
						: "videos",
					onProgress: (pct) => {
						// Map per-file progress to overall progress
						const overallPct = Math.round(
							((i + pct / 100) / files.length) * 100,
						);
						setGalleryUploadProgress(overallPct);
					},
				});

				console.log("Gallery upload result:", uploadResult);

				const fileType = file.type.startsWith("image/")
					? "image"
					: "video";

				setGalleryFiles((prev) => [
					...prev,
					{
						url: uploadResult.url,
						file_url: uploadResult.url,
						file_path: uploadResult.fileName,
						type: fileType,
						name: file.name,
						size: file.size,
						uploadedAt: new Date().toISOString(),
						contentType: file.type,
					},
				]);

				toast({
					title: "Upload successful",
					description: `${file.name} uploaded successfully`,
					variant: "success",
				});
			} catch (error) {
				console.error("Upload error:", error);
				toast({
					title: "Upload failed",
					description: `Failed to upload ${file.name}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
					variant: "destructive",
				});
			}
		}

		// Clear uploading state after all files are processed
		setTimeout(() => {
			setUploadingGallery(false);
			setGalleryUploadProgress(0);
			setGalleryUploadingCount(0);
		}, 500);

		// Don't reset file input - let it be reused
		// e.target.value = "";
	};

	const handleProfileImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate image
		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file",
				description: "Please upload an image file (PNG, JPG, etc.)",
				variant: "destructive",
			});
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			// 5MB limit
			toast({
				title: "File too large",
				description: "Image must be under 5MB",
				variant: "destructive",
			});
			return;
		}

		try {
			setUploadingProfileImage(true);

			const resolvedEventId = Array.isArray(eventId)
				? eventId[0]
				: eventId;
			const resolvedArtistId =
				registeredArtistId ||
				new URLSearchParams(window.location.search).get("artistId") ||
				artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
				"temp";

			const result = await uploadToGCS({
				file,
				eventId: resolvedEventId,
				artistId: resolvedArtistId,
				fileType: "profile",
			});

			setProfileImage(result.fileName);
			toast({
				title: "Success",
				description: "Profile image uploaded successfully",
				variant: "success",
			});
		} catch (error) {
			console.error("Profile image upload error:", error);
			toast({
				title: "Upload failed",
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
				title: "Invalid file",
				description: validation.error,
				variant: "destructive",
			});
			return;
		}

		try {
			setUploadingRehearsalVideo(true);
			setRehearsalVideoProgress(0);

			const resolvedEventId = Array.isArray(eventId)
				? eventId[0]
				: eventId;
			const resolvedArtistId =
				registeredArtistId ||
				new URLSearchParams(window.location.search).get("artistId") ||
				artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
				"temp";

			const result = await uploadToGCS({
				file,
				eventId: resolvedEventId,
				artistId: resolvedArtistId,
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
				title: "Success",
				description: "Rehearsal video uploaded successfully",
				variant: "success",
			});
		} catch (error) {
			console.error("Rehearsal video upload error:", error);
			toast({
				title: "Upload failed",
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
			title: "Video deleted",
			description: "Rehearsal video has been removed",
			variant: "success",
		});
	};

	const handleDeleteGalleryFile = async (index: number) => {
		try {
			setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
			toast({
				title: "File deleted",
				description: "Gallery file has been removed successfully",
				variant: "success",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Delete failed",
				description: "Failed to delete the gallery file",
				variant: "destructive",
			});
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate all required fields
		const requiredFields = [
			{
				field: artistData.artist_name.trim(),
				name: "Artist/Stage Name",
				section: "Basic Information",
			},
			{
				field: artistData.real_name.trim(),
				name: "Personal Name",
				section: "Basic Information",
			},
			{
				field: artistData.email.trim(),
				name: "Email",
				section: "Basic Information",
			},
			{
				field: artistData.phone.trim(),
				name: "Phone",
				section: "Basic Information",
			},
			{
				field: artistData.style.trim(),
				name: "Performance Style",
				section: "Basic Information",
			},
			{
				field: artistData.performance_type,
				name: "Performance Type",
				section: "Basic Information",
			},
			{
				field: artistData.biography.trim(),
				name: "Artist Biography",
				section: "Basic Information",
			},
			{
				field: artistData.manual_costume_color,
				name: "Primary Costume Color",
				section: "Technical Show Director Information",
			},
		];

		// Check for empty required fields
		for (const { field, name, section } of requiredFields) {
			if (!field) {
				toast({
					title: "Validation Error",
					description: `${name} is required in ${section} section`,
					variant: "destructive",
				});
				return;
			}
		}

		// Validate that music track file is uploaded
		if (!musicTrack.file_url) {
			toast({
				title: "Validation Error",
				description: "Music file upload is required",
				variant: "destructive",
			});
			return;
		}

		// Validate that profile image is uploaded
		if (!profileImage) {
			toast({
				title: "Validation Error",
				description:
					"Profile image is required. Please upload a profile picture.",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);

		try {
			console.log("Submitting artist data:", artistData);
			console.log("Music track:", musicTrack);
			console.log("Gallery files:", galleryFiles);

			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");

			let response;

			if (existingProfile && artistId) {
				// Update existing artist
				response = await fetch(
					`/api/events/${eventId}/artists/${artistId}`,
					{
						method: "PUT",
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
							performanceDuration:
								artistData.performance_duration,
							biography: artistData.biography,
							costumeColor: artistData.costume_color,
							costumeColorTwo: artistData.costume_color_two,
							costumeColorThree: artistData.costume_color_three,
							customCostumeColor: artistData.custom_costume_color,
							manualCostumeColor: artistData.manual_costume_color,
							manualCostumeColorTwo:
								artistData.manual_costume_color_two,
							manualCostumeColorThree:
								artistData.manual_costume_color_three,
							lightColorSingle: artistData.light_color_single,
							lightColorTwo: artistData.light_color_two,
							lightColorThree: artistData.light_color_three,
							lightRequests: artistData.light_requests,
							manualLightColor: artistData.manual_light_color,
							manualLightColorTwo:
								artistData.manual_light_color_two,
							manualLightColorThree:
								artistData.manual_light_color_three,
							stagePositionStart: artistData.stage_position_start,
							stagePositionEnd: artistData.stage_position_end,
							customStagePosition:
								artistData.custom_stage_position,
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
							eventName: event?.name || "",
							musicTrack: musicTrack,
							galleryFiles: galleryFiles,
							rehearsalVideo: rehearsalVideo,
							image_url: profileImage || "",
							countryLiving: artistData.country_living,
							homeCountry: artistData.home_country,
							members: members,
							tshirtSizes: tshirtSizes,
							managedBy: artistData.managed_by,
						}),
					},
				);
			} else {
				// Create new artist
				response = await fetch(`/api/events/${eventId}/artists`, {
					method: "POST",
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
						manualCostumeColorTwo:
							artistData.manual_costume_color_two,
						manualCostumeColorThree:
							artistData.manual_costume_color_three,
						lightColorSingle: artistData.light_color_single,
						lightColorTwo: artistData.light_color_two,
						lightColorThree: artistData.light_color_three,
						lightRequests: artistData.light_requests,
						manualLightColor: artistData.manual_light_color,
						manualLightColorTwo: artistData.manual_light_color_two,
						manualLightColorThree:
							artistData.manual_light_color_three,
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
						eventName: event?.name || "",
						musicTrack: musicTrack,
						image_url: profileImage || "",
						galleryFiles: galleryFiles,
						rehearsalVideo: rehearsalVideo,
						countryLiving: artistData.country_living,
						homeCountry: artistData.home_country,
						members: members,
						tshirtSizes: tshirtSizes,
						managedBy: artistData.managed_by,
					}),
				});
			}

			if (response.ok) {
				const result = await response.json();
				console.log("Registration result:", result);

				// Store the artist ID for redirect
				const artistId =
					result.data?.id || result.artist?.id || result.id;
				if (artistId) {
					setRegisteredArtistId(artistId);
					// Update the URL to include the artist ID
					const newUrl = `${window.location.pathname}?artistId=${artistId}`;
					window.history.replaceState({}, "", newUrl);
				}

				setShowSuccessDialog(true);
			} else {
				const errorData = await response.json();
				const errorMessage =
					errorData.error?.message || "Registration failed";
				const errorCode = errorData.error?.code;

				// Show specific error for duplicates
				if (
					errorCode === "DUPLICATE_EMAIL" ||
					errorCode === "DUPLICATE_NAME"
				) {
					toast({
						title: "Already Registered",
						description: errorMessage,
						variant: "destructive",
					});
				} else {
					throw new Error(errorMessage);
				}
				return;
			}
		} catch (error) {
			console.error("Full error:", error);
			toast({
				title: existingProfile
					? "Update failed"
					: "Registration failed",
				description:
					error instanceof Error
						? error.message
						: `Failed to ${
								existingProfile ? "update" : "register"
							} artist. Please try again.`,
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
						Loading event...
					</p>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						Event not found
					</h2>
					<Button onClick={() => router.push("/")}>
						Back to Home
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
					<div className="flex items-center justify-center gap-4 sm:gap-6">
						{/* FAME Logo */}
						<div className="relative">
							<div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
							<div className="relative bg-white/10 backdrop-blur-sm p-1 sm:p-2 border-2 border-white/30 shadow-2xl rounded-2xl">
								<img
									src="/fame-logo.png"
									alt="FAME Logo"
									className="w-16 h-16 sm:w-20 sm:h-20 object-cover drop-shadow-2xl"
								/>
							</div>
						</div>

						{/* Title Section */}
						<div className="text-center sm:text-left">
							<h1 className="text-xl sm:text-4xl font-bold drop-shadow-3xl mb-1">
								{existingProfile
									? "Edit Artist Profile"
									: "Artist Registration"}
							</h1>
							<p className="text-purple-100 text-sm sm:text-xl font-medium">
								{event.name}
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Welcome Section with Alert */}
			<div className="relative bg-gradient-to-b from-white to-purple-50/30">
				<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-10 max-w-5xl">
					{/* Main Welcome Card */}
					<div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-pink-500 overflow-hidden mb-4 sm:mb-8">
						<div className="bg-gradient-to-r p-1">
							<div className="bg-white rounded-t-2xl sm:rounded-t-3xl p-4 sm:p-8">
								<div className="text-center space-y-3 sm:space-y-4">
									{/* Event Logo in Welcome Card (if available) */}
									{event.logoUrl && (
										<div className="flex justify-center mb-3 sm:mb-4">
											<div className="relative group">
												<div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity"></div>
												<div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-2xl overflow-hidden border-2 border-white/50 bg-white">
													<img
														src={`/api/media/${event.logoUrl}`}
														alt={`${event.name} Logo`}
														className="w-full h-full object-contain p-2"
													/>
												</div>
											</div>
										</div>
									)}
									<h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
										Welcome to {event.name}! 🎉
									</h2>
									<p className="text-gray-600 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
										We're thrilled to have you join us!
										Complete the registration form below to
										showcase your talent. Your information
										helps us create an unforgettable
										experience for you and our audience.
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
									NOTE: Create a new registration for every
									performance
								</h3>
								<p className="text-xs sm:text-base text-blue-800 mb-3">
									Please ensure all information is accurate.
									You'll receive your unique Artist ID after
									registration, which you'll need to use
									access your dashboard.
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
									<div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-blue-100">
										<div className="flex items-center gap-2">
											<span className="text-xs sm:text-sm font-medium text-gray-700">
												STEP 1: Complete all Required
												sections
											</span>
										</div>
									</div>
									<div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-purple-100">
										<div className="flex items-center gap-2">
											<span className="text-xs sm:text-sm font-medium text-gray-700">
												STEP 2: Fill in optional
												information
											</span>
										</div>
									</div>
									<div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-yellow-100">
										<div className="flex items-center gap-2">
											<span className="text-xs sm:text-sm font-medium text-gray-700">
												STEP 3: Submit your registration
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<main className="container mx-auto px-2 sm:px-4 pb-6 sm:pb-12 max-w-5xl">
				<form
					onSubmit={handleSubmit}
					className="space-y-4 sm:space-y-6"
				>
					<Accordion
						type="single"
						defaultValue="basic-info"
						collapsible
						className="w-full space-y-3 sm:space-y-4"
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
							<AccordionContent className="px-6 pb-6">
								<Card className="border-0 shadow-none">
									<CardContent className="space-y-4 pt-6">
										{/* Profile Image Upload */}
										<div className="mb-6">
											<Label className="text-base font-semibold mb-3 block">
												Profile Image{" "}
												<span className="text-red-500">
													*
												</span>
											</Label>
											<div className="flex flex-col md:flex-row items-center gap-6">
												<div className="relative">
													{profileImage ? (
														<img
															src={`/api/media/${profileImage}`}
															alt="Profile"
															className="w-32 h-32 rounded-full object-cover border-4 border-green-400 shadow-lg"
														/>
													) : (
														<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-red-300 shadow-lg">
															<User className="h-16 w-16 text-purple-400" />
														</div>
													)}
													{uploadingProfileImage && (
														<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
															<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
														</div>
													)}
													{profileImage && (
														<div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
															<CheckCircle className="h-5 w-5 text-white" />
														</div>
													)}
												</div>
												<div className="flex-1 w-full">
													<Label
														htmlFor="profile-image"
														className="cursor-pointer block"
													>
														<div
															className={`border-2 border-dashed rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50 transition-all ${
																profileImage
																	? "border-green-400 bg-green-50"
																	: "border-red-300 bg-red-50"
															}`}
														>
															<div className="flex flex-col items-center gap-2">
																<Upload
																	className={`h-8 w-8 ${
																		profileImage
																			? "text-green-500"
																			: "text-red-400"
																	}`}
																/>
																<p className="text-sm font-medium text-gray-700">
																	{profileImage
																		? "✓ Profile image uploaded"
																		: "Upload profile image *"}
																</p>
																<p className="text-xs text-gray-500">
																	PNG, JPG up
																	to 5MB
																</p>
																{!profileImage && (
																	<p className="text-xs text-red-500 font-medium">
																		Required
																		for
																		registration
																	</p>
																)}
															</div>
														</div>
													</Label>
													<input
														id="profile-image"
														type="file"
														accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
														onChange={
															handleProfileImageUpload
														}
														className="hidden"
														disabled={
															uploadingProfileImage
														}
													/>
													{uploadingProfileImage && (
														<p className="text-sm text-purple-600 mt-2 text-center">
															Uploading profile
															image...
														</p>
													)}
												</div>
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="artist_name">
													Artist/Stage Name *
												</Label>
												<Input
													key={`artist_name_${renderKey}`}
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
													Personal Name *
												</Label>
												<Input
													key={`real_name_${renderKey}`}
													id="real_name"
													value={artistData.real_name}
													onChange={(e) =>
														handleInputChange(
															"real_name",
															e.target.value,
														)
													}
													placeholder="Enter your personal name"
													required
												/>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="email">
													Email *{" "}
													{emailVerified && (
														<span className="text-green-600 text-sm">
															✓ Verified
														</span>
													)}
												</Label>
												<div className="flex gap-2">
													<Input
														key={`email_${renderKey}`}
														id="email"
														type="email"
														value={artistData.email}
														onChange={(e) => {
															handleInputChange(
																"email",
																e.target.value,
															);
															setEmailVerified(
																false,
															);
															setVerificationCodeSent(
																false,
															);
														}}
														placeholder="Enter your email"
														required
														disabled={emailVerified}
														className={
															emailVerified
																? "bg-green-50 border-green-500"
																: ""
														}
													/>
													{!emailVerified && (
														<Button
															type="button"
															onClick={
																sendVerificationCode
															}
															disabled={
																!artistData.email ||
																sendingCode ||
																verificationCodeSent
															}
															variant="outline"
															className="whitespace-nowrap"
														>
															{sendingCode
																? "Sending..."
																: verificationCodeSent
																	? "Code Sent"
																	: "Verify"}
														</Button>
													)}
												</div>
												{verificationCodeSent &&
													!emailVerified && (
														<div className="space-y-3 mt-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
															<div className="flex items-start gap-2">
																<div className="bg-blue-500 rounded-full p-1 mt-0.5">
																	<svg
																		className="h-4 w-4 text-white"
																		fill="none"
																		viewBox="0 0 24 24"
																		stroke="currentColor"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={
																				2
																			}
																			d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
																		/>
																	</svg>
																</div>
																<div className="flex-1">
																	<p className="text-sm font-semibold text-blue-900">
																		📧 Check
																		your
																		email
																		inbox
																	</p>
																	<p className="text-xs text-blue-700 mt-1">
																		We sent
																		a
																		6-digit
																		code to{" "}
																		<strong>
																			{
																				artistData.email
																			}
																		</strong>
																	</p>
																	<p className="text-xs text-blue-800 mt-2 font-medium">
																		⚠️{" "}
																		<strong>
																			Important:
																		</strong>{" "}
																		If you
																		don't
																		see the
																		email in
																		your
																		inbox,
																		please
																		check
																		your{" "}
																		<strong>
																			spam
																			or
																			junk
																			folder
																		</strong>
																		.
																	</p>
																</div>
															</div>

															<div className="space-y-2">
																<Label
																	htmlFor="verification_code"
																	className="text-sm font-medium"
																>
																	Enter
																	Verification
																	Code
																</Label>
																<div className="flex gap-2">
																	<Input
																		id="verification_code"
																		type="text"
																		value={
																			verificationCode
																		}
																		onChange={(
																			e,
																		) =>
																			setVerificationCode(
																				e.target.value
																					.replace(
																						/\D/g,
																						"",
																					)
																					.slice(
																						0,
																						6,
																					),
																			)
																		}
																		placeholder="000000"
																		maxLength={
																			6
																		}
																		className="text-center text-xl tracking-widest font-bold"
																	/>
																	<Button
																		type="button"
																		onClick={
																			verifyEmailCode
																		}
																		disabled={
																			verificationCode.length !==
																				6 ||
																			verifyingCode
																		}
																		className="whitespace-nowrap bg-green-600 hover:bg-green-700"
																	>
																		{verifyingCode
																			? "Verifying..."
																			: "Confirm"}
																	</Button>
																</div>
															</div>

															<div className="flex items-center justify-between text-xs">
																<div className="flex items-center gap-2">
																	<span className="text-muted-foreground">
																		{timeRemaining >
																		0 ? (
																			<>
																				⏰
																				Expires
																				in:{" "}
																				<span className="font-bold text-orange-600">
																					{formatTimeRemaining(
																						timeRemaining,
																					)}
																				</span>
																			</>
																		) : (
																			<span className="text-red-600 font-bold">
																				⚠️
																				Code
																				expired
																			</span>
																		)}
																	</span>
																</div>
																<div>
																	<span className="text-muted-foreground">
																		Didn't
																		receive
																		it?{" "}
																	</span>
																	<button
																		type="button"
																		onClick={
																			sendVerificationCode
																		}
																		className="text-purple-600 hover:underline font-semibold"
																		disabled={
																			sendingCode ||
																			timeRemaining >
																				540
																		}
																	>
																		{sendingCode
																			? "Sending..."
																			: "Resend Code"}
																	</button>
																</div>
															</div>
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
													WhatsApp Number *
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
													placeholder="528411575"
													required
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
													Performance Style *
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
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="performance_type">
													Performance Type *
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
													required
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
										<div className="space-y-2">
											<Label htmlFor="biography">
												Artist Biography *
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
												required
											/>
										</div>

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
									<CardContent className="space-y-4 pt-6">
										<div className="space-y-4">
											<div>
												<Label className="text-base font-medium">
													Performance Track
												</Label>
											</div>
											<div className="space-y-4">
												<div className="border rounded-lg p-4 space-y-4">
													<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
														<p className="text-sm text-blue-900">
															<strong>
																Song Title:
															</strong>{" "}
															{artistData.artist_name ||
																"Your Stage Name"}
														</p>
														<p className="text-xs text-blue-700 mt-1">
															The song will be
															automatically named
															with your stage name
														</p>
													</div>

													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div className="space-y-2">
															<Label>
																What is the
																tempo of your
																show?
															</Label>
															<div className="flex items-center gap-2">
																<Button
																	type="button"
																	variant="outline"
																	size="icon"
																	onClick={() => {
																		const currentTempo =
																			parseFloat(
																				musicTrack.tempo,
																			) ||
																			0;
																		const newTempo =
																			Math.max(
																				-10,
																				currentTempo -
																					0.5,
																			);
																		updateMusicTrack(
																			"tempo",
																			newTempo.toString(),
																		);
																	}}
																	disabled={
																		parseFloat(
																			musicTrack.tempo,
																		) <= -10
																	}
																	className="h-10 w-10"
																>
																	-
																</Button>
																<Input
																	type="number"
																	value={
																		musicTrack.tempo ||
																		"0"
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
																				-10 &&
																			value <=
																				10
																		) {
																			updateMusicTrack(
																				"tempo",
																				e
																					.target
																					.value,
																			);
																		}
																	}}
																	step="0.5"
																	min="-10"
																	max="10"
																	className="text-center"
																	placeholder="0"
																/>
																<Button
																	type="button"
																	variant="outline"
																	size="icon"
																	onClick={() => {
																		const currentTempo =
																			parseFloat(
																				musicTrack.tempo,
																			) ||
																			0;
																		const newTempo =
																			Math.min(
																				10,
																				currentTempo +
																					0.5,
																			);
																		updateMusicTrack(
																			"tempo",
																			newTempo.toString(),
																		);
																	}}
																	disabled={
																		parseFloat(
																			musicTrack.tempo,
																		) >= 10
																	}
																	className="h-10 w-10"
																>
																	+
																</Button>
															</div>
														</div>
													</div>
													<div className="space-y-2">
														<Label>
															Notes for the DJ
														</Label>
														<Textarea
															value={
																musicTrack.notes
															}
															onChange={(e) =>
																updateMusicTrack(
																	"notes",
																	e.target
																		.value,
																)
															}
															placeholder="Any special notes about this track"
															rows={2}
														/>
													</div>

													{/* Loading state while uploading */}
													{uploadingMusic && (
														<div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 shadow-md">
															<div className="flex items-center gap-3">
																<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
																<div className="flex-1">
																	<p className="text-sm font-semibold text-blue-900">
																		Uploading
																		music
																		file...
																	</p>
																	<div className="mt-2 w-full bg-blue-300 rounded-full h-2.5">
																		<div
																			className="bg-blue-700 h-2.5 rounded-full transition-all duration-300"
																			style={{
																				width: `${musicUploadProgress}%`,
																			}}
																		></div>
																	</div>
																	<p className="text-xs font-semibold text-blue-800 mt-1">
																		{
																			musicUploadProgress
																		}
																		%
																		complete
																	</p>
																</div>
															</div>
														</div>
													)}

													{/* Success state after upload */}
													{musicTrack.file_url &&
														!uploadingMusic && (
															<div className="bg-green-100 border-2 border-green-500 rounded-lg p-3 shadow-md">
																<div className="flex justify-between items-center mb-2">
																	<div className="flex items-center gap-2">
																		<CheckCircle className="h-5 w-5 text-green-700" />
																		<p className="text-green-900 text-sm font-semibold">
																			✓ "
																			{
																				artistData.artist_name
																			}
																			"
																			uploaded
																			successfully
																		</p>
																	</div>
																	<Button
																		type="button"
																		variant="destructive"
																		size="sm"
																		onClick={
																			handleDeleteMusic
																		}
																		className="h-6 px-2 text-xs"
																	>
																		Delete
																	</Button>
																</div>
																<AudioPlayer
																	track={{
																		song_title:
																			artistData.artist_name ||
																			"Artist Track",
																		duration:
																			musicTrack.duration ||
																			0,
																		notes:
																			musicTrack.notes ||
																			"",
																		is_main_track: true,
																		tempo:
																			musicTrack.tempo ||
																			"0",
																		file_url:
																			musicTrack.file_url,
																		file_path:
																			musicTrack.file_path,
																	}}
																	onError={
																		handleAudioError
																	}
																/>
															</div>
														)}
												</div>
											</div>

											{/* Upload area - only show if no file uploaded */}
											{!musicTrack.file_url &&
												!uploadingMusic && (
													<div className="border-2 border-dashed border-pink-300 rounded-lg p-6 hover:border-pink-400 hover:bg-pink-50/50 transition-all duration-300">
														<div className="text-center space-y-3">
															<Upload className="h-10 w-10 mx-auto text-pink-500" />
															<div>
																<Label
																	htmlFor="music-upload"
																	className="inline-block"
																>
																	<span className="text-pink-600 font-semibold text-base underline cursor-pointer hover:text-pink-700 transition-colors">
																		Upload
																		Music
																		File
																	</span>
																</Label>
																<Input
																	id="music-upload"
																	type="file"
																	accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma,.aiff"
																	onChange={
																		handleMusicUpload
																	}
																	className="hidden"
																/>
															</div>
															<p className="text-sm text-muted-foreground">
																Click to upload
																audio file (Max
																50MB)
															</p>
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
								<Card className="border-0 shadow-none">
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
											<div className="space-y-2">
												<Label htmlFor="props_needed">
													Props and Equipment Needed
												</Label>
												<Textarea
													id="props_needed"
													value={
														artistData.props_needed
													}
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
															<SelectItem value="off-stage">
																OFF stage
															</SelectItem>
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
															<SelectItem value="off-stage">
																OFF stage
															</SelectItem>
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
														</SelectContent>
													</Select>
												</div>
											</div>
											{/* Visual Stage Preview */}
											<StagePositionPreview
												startPosition={
													artistData.stage_position_start
												}
												endPosition={
													artistData.stage_position_end
												}
												className="mb-4"
											/>

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
															htmlFor="rehearsal-video-input"
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
												id="rehearsal-video-input"
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
																etc.) - Max
																500MB
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

										{/* Performance Video Link */}
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

										{/* Social Media Links */}
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
										{/* Gallery Upload */}
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Image & Video Gallery
											</h3>

											{/* Loading State */}
											{uploadingGallery && (
												<div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
													<div className="flex items-center gap-4">
														<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
														<div className="flex-1">
															<p className="text-base font-semibold text-blue-900 mb-2">
																Uploading{" "}
																{
																	galleryUploadingCount
																}{" "}
																{galleryUploadingCount ===
																1
																	? "file"
																	: "files"}
																...
															</p>
															<div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
																<div
																	className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
																	style={{
																		width: `${galleryUploadProgress}%`,
																	}}
																>
																	<span className="text-xs text-white font-bold">
																		{
																			galleryUploadProgress
																		}
																		%
																	</span>
																</div>
															</div>
															<p className="text-sm text-blue-700 mt-2">
																Uploading gallery assets using robust chunks to handle mobile and slow connections. <strong>Please keep this screen open and active.</strong>
															</p>
														</div>
													</div>
												</div>
											)}

											{/* Upload Area - Hidden during upload */}
											{!uploadingGallery && (
												<div className="border-2 border-dashed border-purple-300 rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300">
													<div className="text-center space-y-4">
														<div className="bg-purple-100 rounded-full p-3 inline-block">
															<ImageIcon className="h-8 w-8 text-purple-600" />
														</div>

														<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
															<Label
																htmlFor="gallery-files"
																className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition-all shadow-sm"
															>
																<Upload className="h-5 w-5 text-purple-600" />
																<span className="text-purple-700 font-medium">
																	Choose Files
																</span>
															</Label>
														</div>
														<p className="text-xs text-gray-500">
															Images (max 10MB) •
															Videos (max 500MB)
														</p>
														<Input
															id="gallery-photo"
															type="file"
															multiple
															accept="image/*"
															capture="environment"
															onChange={
																handleGalleryUpload
															}
															className="hidden"
														/>
														<Input
															id="gallery-video"
															type="file"
															accept=".mp4,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.3g2,.wmv,.flv,.m4v,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/mpeg,video/3gpp,video/3gpp2,video/x-ms-wmv,video/x-flv,video/x-m4v"
															capture="environment"
															onChange={
																handleGalleryUpload
															}
															className="hidden"
														/>
														<Input
															id="gallery-files"
															type="file"
															multiple
															accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.mp4,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.3g2,.wmv,.flv,.m4v,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/mpeg,video/3gpp,video/3gpp2,video/x-ms-wmv,video/x-flv,video/x-m4v"
															onChange={
																handleGalleryUpload
															}
															className="hidden"
														/>
													</div>
												</div>
											)}
											{/* Gallery Preview */}
											{galleryFiles.length > 0 && (
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
																						"Failed to load image file. Please check the file format.",
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
																						"Failed to play video file. Please check the file format.",
																					variant:
																						"destructive",
																				},
																			);
																		}}
																		className="aspect-square"
																	/>
																)}
																<Button
																	type="button"
																	variant="destructive"
																	size="sm"
																	onClick={() =>
																		handleDeleteGalleryFile(
																			index,
																		)
																	}
																	className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
																>
																	x
																</Button>
																<p className="text-xs text-muted-foreground mt-1 truncate">
																	{file.name}
																</p>
															</div>
														),
													)}
												</div>
											)}
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

					{/* Enhanced Submit Button */}
					<div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-300">
						<div className="space-y-4">
							<div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
								<div className="flex items-start gap-3">
									<CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
									<div>
										<h3 className="font-semibold text-gray-900 mb-1">
											Ready to Submit?
										</h3>
										<p className="text-sm text-gray-600">
											Please review all your information
											before submitting. You'll receive
											your Artist ID immediately after
											registration.
										</p>
									</div>
								</div>
							</div>
							<Button
								type="submit"
								disabled={submitting}
								className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50llowed"
							>
								{submitting ? (
									<div className="flex items-center gap-3">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
										<span>Registering Your Profile...</span>
									</div>
								) : (
									<div className="flex items-center gap-2">
										<CheckCircle className="h-5 w-5" />
										<span>Complete Registration</span>
									</div>
								)}
							</Button>
						</div>
					</div>
				</form>
			</main>

			<Dialog
				open={showSuccessDialog}
				onOpenChange={setShowSuccessDialog}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<div className="flex justify-center mb-4">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 animate-scale-in">
								<CheckCircle className="h-10 w-10 text-green-600" />
							</div>
						</div>
						<DialogTitle className="text-center text-2xl">
							Registration Successful!
						</DialogTitle>
						<DialogDescription className="text-center">
							Your artist profile has been created successfully
							for{" "}
							<span className="font-semibold">{event?.name}</span>
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{/* Artist ID */}
						{registeredArtistId && (
							<div className="bg-gray-100 rounded-lg p-4">
								<Label className="text-sm font-medium mb-2 block">
									Your Artist ID
								</Label>
								<div className="flex items-center gap-2">
									<Input
										value={registeredArtistId}
										readOnly
										className="font-mono text-center bg-white"
									/>
									<Button
										size="sm"
										variant="outline"
										onClick={async () => {
											try {
												await navigator.clipboard.writeText(
													registeredArtistId,
												);
												toast({
													title: "Copied!",
													description:
														"Artist ID copied to clipboard",
												});
											} catch (error) {
												console.error(
													"Failed to copy:",
													error,
												);
											}
										}}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
								<p className="text-xs text-muted-foreground mt-2 text-center">
									Save this ID to access your profile later
								</p>
							</div>
						)}
						{/* Artist Name Display */}
						{artistData.artist_name && (
							<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
								<Label className="text-sm font-medium mb-1 block text-purple-900">
									Artist Name
								</Label>
								<p className="text-base font-semibold text-purple-700">
									{artistData.artist_name}
								</p>
							</div>
						)}

						{/* Email Display */}
						{artistData.email && (
							<div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
								<Label className="text-sm font-medium mb-1 block text-pink-900">
									Registered Email
								</Label>
								<p className="text-base font-semibold text-pink-700">
									{artistData.email}
								</p>
							</div>
						)}

						{/* Email Confirmation Notice */}
						{artistData.email && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-3">
								<p className="text-sm text-green-900 font-medium mb-1">
									📝 Important Note:
								</p>
								<p className="text-sm text-green-800">
									We have sent a confirmation email to{" "}
									<strong>{artistData.email}</strong> with
									your registration details. Please check your
									inbox (and spam folder).
								</p>
							</div>
						)}

						{/* Go to Login Button */}
						<Button
							className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
							size="lg"
							onClick={() => {
								// Store login data in sessionStorage to pre-fill after splash
								const artistId =
									registeredArtistId ||
									new URLSearchParams(
										window.location.search,
									).get("artistId");

								sessionStorage.setItem(
									"artistLoginData",
									JSON.stringify({
										artistId: artistId || "",
										artistName: artistData.artist_name,
										email: artistData.email,
									}),
								);

								// Redirect to splash screen first
								router.push("/artist-splash");
							}}
						>
							Go to Login
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function ArtistRegistration() {
	return (
		<ClientWrapper>
			<ArtistRegistrationForm />
		</ClientWrapper>
	);
}
