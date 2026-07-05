"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { ColorPickerFull } from "@/components/ui/color-picker";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { validateMediaFile } from "@/lib/media-validation";
import { uploadToGCS } from "@/lib/upload-utils";
import { Progress } from "@/components/ui/progress";
import { FILE_LIMITS } from "@/lib/constants";
import { WhatsAppInput } from "@/components/ui/whatsapp-input";
import { NationalityInput } from "@/components/ui/country-select";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import {
	ArrowLeft,
	Loader2,
	Music,
	User,
	Upload,
	Trash2,
	CheckCircle,
	Lightbulb,
	Image as ImageIcon,
	FileText,
	Plus,
	Users,
	Palette,
	Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function CreateShowPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const artistId = params.artistId as string;
	const searchParams = useSearchParams();
	const isEmbedded = searchParams.get("embedded") === "true";

	const [saving, setSaving] = useState(false);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const {
		data: subData,
		loading: subLoading,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();

	const canCreate = subData?.canCreateShow !== false;


	const [formData, setFormData] = useState({
		name: "",
		real_name: "",
		email: "",
		phone: "",
		managed_by: "",
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
		country_living: "",
		home_country: "",
	});

	const [members, setMembers] = useState<
		Array<{ name: string; countryLiving: string; homeCountry: string }>
	>([]);
	const [tshirtSizes, setTshirtSizes] = useState<
		Array<{ name: string; size: string; fit: "oversized" | "regular" }>
	>([]);
	const [musicTrack, setMusicTrack] = useState({
		duration: 0,
		notes: "",
		tempo: "",
		file_url: "",
		file_path: "",
	});
	const [galleryFiles, setGalleryFiles] = useState<
		Array<{
			url: string;
			type: "image" | "video";
			name: string;
			file_path?: string;
			size?: number;
			contentType?: string;
		}>
	>([]);
	const [profileImage, setProfileImage] = useState("");
	const [rehearsalVideo, setRehearsalVideo] = useState<{
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	} | null>(null);

	const [uploadingMusic, setUploadingMusic] = useState(false);
	const [uploadingGallery, setUploadingGallery] = useState(false);
	const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
	const [uploadingRehearsalVideo, setUploadingRehearsalVideo] =
		useState(false);
	const [musicProgress, setMusicProgress] = useState(0);
	const [galleryProgress, setGalleryProgress] = useState(0);
	const [profileImageProgress, setProfileImageProgress] = useState(0);
	const [rehearsalProgress, setRehearsalProgress] = useState(0);

	const getMediaUrl = (url: string, filePath?: string): string => {
		if (!url) return "";
		if (url.startsWith("gs://")) {
			if (filePath) return `/api/media/${filePath}`;
			const match = url.match(/^gs:\/\/[^/]+\/(.+)$/);
			if (match) return `/api/media/${match[1]}`;
			return url;
		}
		return url;
	};

	const handleInputChange = (field: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// If we arrived here via "Duplicate", pre-fill the form with the source show's data
	useEffect(() => {
		if (typeof window === "undefined") return;
		const raw = sessionStorage.getItem("duplicateShowData");
		if (!raw) return;
		sessionStorage.removeItem("duplicateShowData");
		try {
			const s = JSON.parse(raw);
			setFormData({
				name: s.name ? `Copy of ${s.name}` : "",
				real_name: s.realName || "",
				email: s.email || "",
				phone: s.phone || "",
				managed_by: s.managedBy || "",
				style: s.style || "",
				performance_type: s.performanceType || "",
				biography: s.biography || s.description || "",
				notes: s.notes || "",
				props_needed: s.equipment || s.techRider || "",
				performance_duration: s.duration || 5,
				costume_color: s.costumeColor || "",
				costume_color_two: s.costumeColorTwo || "none",
				costume_color_three: s.costumeColorThree || "none",
				custom_costume_color: s.customCostumeColor || "",
				manual_costume_color: s.manualCostumeColor || "",
				manual_costume_color_two: s.manualCostumeColorTwo || "",
				manual_costume_color_three: s.manualCostumeColorThree || "",
				light_color_single: s.lightColorSingle || "trust",
				light_color_two: s.lightColorTwo || "none",
				light_color_three: s.lightColorThree || "none",
				light_requests: s.lightRequests || "",
				manual_light_color: s.manualLightColor || "",
				manual_light_color_two: s.manualLightColorTwo || "",
				manual_light_color_three: s.manualLightColorThree || "",
				show_link: s.showLink || "",
				stage_position_start: s.stagePositionStart || "",
				stage_position_end: s.stagePositionEnd || "",
				custom_stage_position: s.customStagePosition || "",
				mc_notes: s.mcNotes || "",
				stage_manager_notes: s.stageManagerNotes || "",
				instagram_link: s.socialMedia?.instagram || "",
				facebook_link: s.socialMedia?.facebook || "",
				tiktok_link: s.socialMedia?.tiktok || "",
				youtube_link: s.socialMedia?.youtube || "",
				website_link: s.socialMedia?.website || "",
				country_living: s.countryLiving || "",
				home_country: s.homeCountry || "",
			});
			if (s.members?.length) setMembers(s.members);
			if (s.tshirtSizes?.length) setTshirtSizes(s.tshirtSizes);
			if (s.musicTrack) setMusicTrack(s.musicTrack);
			if (s.galleryFiles) setGalleryFiles(s.galleryFiles);
			if (s.profileImage) setProfileImage(s.profileImage);
			if (s.rehearsalVideo) setRehearsalVideo(s.rehearsalVideo);
			toast({
				title: "Show Duplicated",
				description: "Review the details below, then save to create your copy.",
			});
		} catch (err) {
			console.error("Error pre-filling duplicated show:", err);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Upload handlers
	const handleProfileImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/") || file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
			toast({
				title: "Invalid file",
				description: "Please upload an image under 100MB",
				variant: "destructive",
			});
			return;
		}
		try {
			setUploadingProfileImage(true);
			setProfileImageProgress(0);
			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "profile",
				onProgress: (pct) => setProfileImageProgress(pct),
			});
			setProfileImage(result.fileName);
			toast({
				title: "Success",
				description: "Show image uploaded",
				variant: "success",
			});
		} catch {
			toast({
				title: "Upload failed",
				description: "Failed to upload image",
				variant: "destructive",
			});
		} finally {
			setUploadingProfileImage(false);
			e.target.value = "";
		}
	};

	const handleMusicUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const validation = validateMediaFile(
			{ name: file.name, size: file.size, type: file.type },
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
		setUploadingMusic(true);
		try {
			const detectDuration = (f: File): Promise<number> =>
				new Promise((resolve) => {
					const audio = new Audio();
					const url = URL.createObjectURL(f);
					audio.addEventListener("loadedmetadata", () => {
						resolve(Math.round(audio.duration));
						URL.revokeObjectURL(url);
					});
					audio.addEventListener("error", () => {
						URL.revokeObjectURL(url);
						resolve(0);
					});
					audio.src = url;
				});
			const duration = await detectDuration(file);

			// ── Rename file to: ArtistName-YYYYMMDD-HHMMSS.ext ──────────────
			const artistName = (formData.name || "Artist").trim();
			const now = new Date();
			const pad = (n: number) => n.toString().padStart(2, "0");
			const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
			const safeArtistName = artistName.replace(/[^a-zA-Z0-9_-]/g, "_");
			const ext = file.name.split(".").pop() || "mp3";
			const renamedFile = new File(
				[file],
				`${safeArtistName}-${timestamp}.${ext}`,
				{ type: file.type }
			);
			// ─────────────────────────────────────────────────────────────────

			setMusicProgress(0);
			const uploadResult = await uploadToGCS({
				file: renamedFile,
				eventId: "famelink",
				artistId,
				fileType: "music",
				onProgress: (pct) => setMusicProgress(pct),
			});
			setMusicTrack({
				file_url: uploadResult.url,
				file_path: uploadResult.fileName,
				duration,
				notes: musicTrack.notes,
				tempo: musicTrack.tempo,
				song_title: artistName,
			} as any);

			// Auto-update the show's duration in the form
			handleInputChange("performance_duration", duration);

			toast({
				title: "Upload successful",
				description: `Music uploaded. Duration: ${duration} seconds.`,
				variant: "success",
			});
		} catch {
			toast({
				title: "Upload failed",
				description: "Failed to upload music file",
				variant: "destructive",
			});
		} finally {
			setUploadingMusic(false);
			e.target.value = "";
		}
	};

	const handleGalleryUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = e.target.files;
		if (!files) return;
		setUploadingGallery(true);
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const isImage = file.type.startsWith("image/");
			const isVideo = file.type.startsWith("video/");
			if (!isImage && !isVideo) continue;
			try {
				setGalleryProgress(0);
				const result = await uploadToGCS({
					file,
					eventId: "famelink",
					artistId,
					fileType: isImage ? "gallery" : "video",
					onProgress: (pct) => setGalleryProgress(pct),
				});
				setGalleryFiles((prev) => [
					...prev,
					{
						url: result.url,
						type: isImage ? "image" : "video",
						name: file.name,
						file_path: result.fileName,
						size: file.size,
						contentType: file.type,
					},
				]);
			} catch {
				console.error("Failed to upload gallery file:", file.name);
			}
		}
		setUploadingGallery(false);
		e.target.value = "";
	};

	const handleRehearsalVideoUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file || !file.type.startsWith("video/")) return;
		setUploadingRehearsalVideo(true);
		try {
			setRehearsalProgress(0);
			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "rehearsal",
				onProgress: (pct) => setRehearsalProgress(pct),
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
				description: "Rehearsal video uploaded",
				variant: "success",
			});
		} catch {
			toast({
				title: "Upload failed",
				description: "Failed to upload video",
				variant: "destructive",
			});
		} finally {
			setUploadingRehearsalVideo(false);
			e.target.value = "";
		}
	};

	const handleAudioError = useCallback((error: string) => {
		console.error("Audio playback error:", error);
	}, []);

	const handleSave = async () => {
		if (!canCreate) {
			setUpgradeModalOpen(true);
			return;
		}

		// Block save while any file is still uploading
		if (uploadingMusic || uploadingGallery || uploadingProfileImage || uploadingRehearsalVideo) {
			toast({
				title: "Upload in progress",
				description: "Please wait for all files to finish uploading before saving.",
				variant: "destructive",
			});
			return;
		}

		const missingFields: string[] = [];

		// 1. Basic Info Section
		if (!profileImage) missingFields.push("Profile Image");
		if (!formData.name.trim()) missingFields.push("Artist/Stage Name");
		if (!formData.real_name.trim()) missingFields.push("Personal Name");
		if (!formData.email.trim()) missingFields.push("Email");
		if (!formData.phone.trim()) missingFields.push("WhatsApp Number");
		if (!formData.style.trim()) missingFields.push("Performance Style");
		if (!formData.performance_type) missingFields.push("Performance Type");

		// 2. Music Section
		if (!musicTrack.file_url) missingFields.push("Music Track File");

		// 3. Technical Show Section
		if (!formData.manual_costume_color.trim()) missingFields.push("Primary Costume Color");
		if (!formData.stage_position_start) missingFields.push("Starting Position");
		if (!formData.stage_position_end) missingFields.push("Ending Position");

		if (missingFields.length > 0) {
			toast({
				title: "Validation Error",
				description: `Please complete the following required fields: ${missingFields.join(", ")}`,
				variant: "destructive",
			});
			return;
		}

		setSaving(true);
		try {
			const response = await fetch("/api/shows", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.name.trim(),
					description: formData.biography || "",
					style: formData.style,
					performanceType: formData.performance_type,
					duration: formData.performance_duration,
					isDraft: false,
					isPublic: true,
					realName: formData.real_name,
					email: formData.email,
					phone: formData.phone,
					managedBy: formData.managed_by,
					countryLiving: formData.country_living,
					homeCountry: formData.home_country,
					costumeColor: formData.costume_color,
					costumeColorTwo: formData.costume_color_two,
					costumeColorThree: formData.costume_color_three,
					customCostumeColor: formData.custom_costume_color,
					manualCostumeColor: formData.manual_costume_color,
					manualCostumeColorTwo: formData.manual_costume_color_two,
					manualCostumeColorThree:
						formData.manual_costume_color_three,
					lightColorSingle: formData.light_color_single,
					lightColorTwo: formData.light_color_two,
					lightColorThree: formData.light_color_three,
					lightRequests: formData.light_requests,
					manualLightColor: formData.manual_light_color,
					manualLightColorTwo: formData.manual_light_color_two,
					manualLightColorThree: formData.manual_light_color_three,
					stagePositionStart: formData.stage_position_start,
					stagePositionEnd: formData.stage_position_end,
					customStagePosition: formData.custom_stage_position,
					profileImage,
					musicTrack: musicTrack.file_url ? musicTrack : null,
					galleryFiles,
					rehearsalVideo,
					techRider: formData.props_needed,
					equipment: formData.props_needed,
					showLink: formData.show_link,
					biography: formData.biography,
					notes: formData.notes,
					mcNotes: formData.mc_notes,
					stageManagerNotes: formData.stage_manager_notes,
					socialMedia: {
						instagram: formData.instagram_link,
						facebook: formData.facebook_link,
						youtube: formData.youtube_link,
						tiktok: formData.tiktok_link,
						website: formData.website_link,
					},
					members,
					tshirtSizes,
					music: musicTrack.file_url
						? {
								files: [
									{
										id: "main",
										name: "Main Track",
										url: musicTrack.file_url,
									},
								],
							}
						: { files: [] },
				}),
			});
			const result = await response.json();
			if (result.success) {
				// Check for join-event context
				const joinEventId =
					typeof window !== "undefined"
						? sessionStorage.getItem("joinEventId")
						: null;
				if (joinEventId) {
					sessionStorage.removeItem("joinEventId");
					router.push(`/join-event/${joinEventId}/confirm`);
					return;
				}
				toast({
					title: "Show Created!",
					description: "Your show has been created successfully",
					variant: "success",
				});
				router.push(`/famelink/${artistId}?tab=shows&justCreatedShow=true`);
			} else {
				if (result.error?.code === "SHOW_002") {
					setUpgradeModalOpen(true);
				} else {
					toast({
						title: "Error",
						description:
							result.error?.message || "Failed to create show",
						variant: "destructive",
					});
				}
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to create show",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={isEmbedded ? "min-h-screen bg-white text-gray-900" : "min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 text-white"}>
			{/* Header — hidden when embedded in iframe */}
			{!isEmbedded && (
				<header className="bg-gradient-to-r from-purple-800 to-pink-700 shadow-xl sticky top-0 z-50">
					<div className="container mx-auto px-4 py-4 flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="bg-white/20 rounded-xl p-2">
								<FameLinkLogo width={64} height={64} />
							</div>
							<div>
								<h1 className="text-2xl font-bold">Create Show</h1>
								<p className="text-purple-100 text-sm">
									Fill in your show details
								</p>
							</div>
						</div>
						<Button
							onClick={() => router.push(`/famelink/${artistId}`)}
							variant="ghost"
							className="text-white hover:bg-white/20"
						>
							<ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
						</Button>
					</div>
				</header>
			)}
			{/* Upgrade Warning if limit reached */}
			{!subLoading && !canCreate && (
				<div className="container mx-auto px-4 pt-6">
					<div className="bg-red-900/30 border-2 border-red-500/30 rounded-xl p-5 text-center">
						<Crown className="h-8 w-8 text-amber-400 mx-auto mb-2" />
						<h3 className="text-lg font-bold text-white mb-1">
							Upgrade Required
						</h3>
						<p className="text-sm text-purple-200/70 mb-4">
							You reached the maximum number of shows. Upgrade to
							FAME LINK PRO to create more shows.
						</p>
						<Button
							onClick={() => setUpgradeModalOpen(true)}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
						>
							<Crown className="h-4 w-4 mr-2" />
							View Upgrade Plans
						</Button>
					</div>
				</div>
			)}
			<UpgradeModal
				open={upgradeModalOpen}
				onOpenChange={(open) => {
					setUpgradeModalOpen(open);
					if (!open) clearUpgraded();
				}}
				type="artist"
				currentCount={subData?.currentShowCount ?? 0}
				maxCount={subData?.maxShows ?? 3}
				justUpgraded={justUpgraded}
				planType={planType}
				userEmail={subData?.userEmail}
				userId={subData?.userId}
			/>{" "}
			<main className="container mx-auto px-4 py-8 max-w-5xl">
				{/* NOTE Banner + 3 Steps */}
				<div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
					<div className="flex items-start gap-3 mb-4">
						<div className="bg-blue-100 rounded-full p-2 mt-0.5">
							<svg
								className="h-5 w-5 text-blue-600"
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
						<div>
							<p className="font-semibold text-blue-900">
								NOTE: Create a new registration for every
								performance
							</p>
							<p className="text-sm text-blue-700 mt-1">
								Please ensure all information is accurate.
								You&apos;ll receive your unique Artist ID after
								registration, which you&apos;ll need to use to
								access your dashboard.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-3">
						<div className="bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-medium text-blue-800">
							STEP 1: Complete all Required sections
						</div>
						<div className="bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-medium text-blue-800">
							STEP 2: Fill in optional information
						</div>
						<div className="bg-white border border-blue-200 rounded-lg px-4 py-2 text-sm font-medium text-blue-800">
							STEP 3: Submit your registration
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<Accordion
						type="single"
						defaultValue="basic-info"
						collapsible
						className="w-full space-y-4"
					>
						{/* Basic Information */}
						<AccordionItem
							value="basic-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 overflow-hidden"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-purple-50">
								<div className="flex items-center gap-3">
									<div className="bg-purple-100 rounded-full p-2">
										<User className="h-5 w-5 text-purple-600" />
									</div>
									<span className="text-gray-900">
										Basic Information
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-6 pb-6">
								<Card className="border-0 shadow-none">
									<CardContent className="space-y-4 pt-6">
										{/* Show Image */}
										<div className="mb-6">
											<Label className="text-base font-semibold mb-3 block">
												Profile Image <span className="text-red-500">*</span>
											</Label>
											<div className="flex flex-col md:flex-row items-center gap-6">
												<div className="relative">
													{profileImage ? (
														<img
															src={`/api/media/${profileImage}`}
															alt="Show"
															className="w-32 h-32 rounded-full object-cover border-4 border-green-400 shadow-lg"
														/>
													) : (
														<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-gray-300 shadow-lg">
															<User className="h-16 w-16 text-purple-400" />
														</div>
													)}
													{uploadingProfileImage && (
														<div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center p-2">
															<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
															<div className="w-full px-2">
																<Progress value={profileImageProgress} className="h-1 bg-white/20" />
																<p className="text-[10px] text-white mt-1 text-center font-bold">{profileImageProgress}%</p>
															</div>
														</div>
													)}
												</div>
												<div className="flex-1 w-full">
													<Label
														htmlFor="create-profile-image"
														className="cursor-pointer block"
													>
														<div
															className={`border-2 border-dashed rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50 transition-all ${profileImage ? "border-green-400 bg-green-50" : "border-gray-300"}`}
														>
															<div className="flex flex-col items-center gap-2">
																<Upload
																	className={`h-8 w-8 ${profileImage ? "text-green-500" : "text-gray-400"}`}
																/>
																<p className="text-sm font-medium text-gray-700">
																	{profileImage
																		? "✓ Profile image uploaded"
																		: "Upload profile image"}
																</p>
																<p className="text-xs text-gray-500">
																	PNG, JPG up
																	to 100MB
																</p>
															</div>
														</div>
													</Label>
													<input
														id="create-profile-image"
														type="file"
														accept="image/*"
														onChange={
															handleProfileImageUpload
														}
														className="hidden"
														disabled={
															uploadingProfileImage
														}
													/>
												</div>
											</div>
										</div>

										{/* Show Name & Real Name */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>
													Artist/Stage Name <span className="text-red-500">*</span>
												</Label>
												<Input
													value={formData.name}
													onChange={(e) =>
														handleInputChange(
															"name",
															e.target.value,
														)
													}
													placeholder="Enter your stage name"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Personal Name <span className="text-red-500">*</span></Label>
												<Input
													value={formData.real_name}
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
										{/* Email & WhatsApp */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Email <span className="text-red-500">*</span></Label>
												<Input
													type="email"
													value={formData.email}
													onChange={(e) =>
														handleInputChange(
															"email",
															e.target.value,
														)
													}
													placeholder="Enter your email"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label className="flex items-center gap-2">
													<svg
														className="h-4 w-4 text-green-600"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
													</svg>
													WhatsApp Number <span className="text-red-500">*</span>
												</Label>
												<WhatsAppInput
													value={formData.phone}
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
										{/* Managed By */}
										<div className="space-y-2">
											<Label className="flex items-center gap-2">
												<Users className="h-4 w-4 text-purple-600" />
												Managed By
											</Label>
											<Input
												value={formData.managed_by}
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
										{/* Style & Type */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Performance Style <span className="text-red-500">*</span></Label>
												<Input
													value={formData.style}
													onChange={(e) =>
														handleInputChange(
															"style",
															e.target.value,
														)
													}
													placeholder="e.g., Contemporary Dance, Fire Show"
												/>
											</div>
											<div className="space-y-2">
												<Label>Performance Type <span className="text-red-500">*</span></Label>
												<Select
													value={
														formData.performance_type
													}
													onValueChange={(v) =>
														handleInputChange(
															"performance_type",
															v,
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="solo">
															Solo
														</SelectItem>
														<SelectItem value="duo">
															Duo
														</SelectItem>
														<SelectItem value="trio">
															Trio
														</SelectItem>
														<SelectItem value="group">
															Group
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
										{/* Nationality Information */}
										{formData.performance_type && (
											<NationalityInput
												performanceType={
													formData.performance_type
												}
												countryLiving={
													formData.country_living
												}
												homeCountry={
													formData.home_country
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
											<Label>Artist Biography</Label>
											<Textarea
												value={formData.biography}
												onChange={(e) =>
													handleInputChange(
														"biography",
														e.target.value,
													)
												}
												placeholder="Tell us about yourself and your performance"
												rows={4}
											/>
										</div>

										{/* T-Shirt Sizes */}
										<div className="space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
											<div className="flex items-center justify-between">
												<Label className="text-base font-semibold text-green-800">
													T-Shirt Sizes
												</Label>
												<span className="text-xs text-green-600">
													Optional
												</span>
											</div>
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
																onClick={() =>
																	setTshirtSizes(
																		tshirtSizes.filter(
																			(
																				_,
																				i,
																			) =>
																				i !==
																				index,
																		),
																	)
																}
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
															<div className="space-y-2">
																<Label>
																	Name
																</Label>
																<Input
																	value={
																		tshirt.name
																	}
																	onChange={(
																		e,
																	) => {
																		const n =
																			[
																				...tshirtSizes,
																			];
																		n[
																			index
																		].name =
																			e.target.value;
																		setTshirtSizes(
																			n,
																		);
																	}}
																	placeholder="Enter name"
																/>
															</div>
															<div className="space-y-2">
																<Label>
																	Size
																</Label>
																<Select
																	value={
																		tshirt.size
																	}
																	onValueChange={(
																		value,
																	) => {
																		const n =
																			[
																				...tshirtSizes,
																			];
																		n[
																			index
																		].size =
																			value;
																		setTshirtSizes(
																			n,
																		);
																	}}
																>
																	<SelectTrigger>
																		<SelectValue placeholder="Select size" />
																	</SelectTrigger>
																	<SelectContent>
																		{[
																			"XS",
																			"S",
																			"M",
																			"L",
																			"XL",
																			"XXL",
																			"XXXL",
																		].map(
																			(
																				s,
																			) => (
																				<SelectItem
																					key={
																						s
																					}
																					value={
																						s
																					}
																				>
																					{
																						s
																					}
																				</SelectItem>
																			),
																		)}
																	</SelectContent>
																</Select>
															</div>
															<div className="space-y-2">
																<Label>
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
																		const n =
																			[
																				...tshirtSizes,
																			];
																		n[
																			index
																		].fit =
																			value;
																		setTshirtSizes(
																			n,
																		);
																	}}
																>
																	<SelectTrigger>
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
												onClick={() =>
													setTshirtSizes([
														...tshirtSizes,
														{
															name: "",
															size: "",
															fit: "regular",
														},
													])
												}
												className="w-full border-green-300 text-green-700 hover:bg-green-50"
											>
												<Plus className="h-4 w-4 mr-2" />{" "}
												Add T-Shirt Size
											</Button>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* Music Information */}
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
															{formData.name ||
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
																		setMusicTrack(
																			(
																				prev,
																			) => ({
																				...prev,
																				tempo: newTempo.toString(),
																			}),
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
																			setMusicTrack(
																				(
																					prev,
																				) => ({
																					...prev,
																					tempo: e
																						.target
																						.value,
																				}),
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
																		setMusicTrack(
																			(
																				prev,
																			) => ({
																				...prev,
																				tempo: newTempo.toString(),
																			}),
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
																setMusicTrack(
																	(prev) => ({
																		...prev,
																		notes: e
																			.target
																			.value,
																	}),
																)
															}
															placeholder="Any special notes about this track"
															rows={2}
														/>
													</div>

													{uploadingMusic && (
														<div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 shadow-md">
															<div className="flex flex-col gap-3">
																<div className="flex items-center gap-3">
																	<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
																	<div className="flex-1">
																		<p className="text-sm font-semibold text-blue-900">
																			Uploading music file...
																		</p>
																	</div>
																</div>
																<div className="w-full space-y-1">
																	<Progress value={musicProgress} className="h-1.5 bg-blue-200" />
																	<p className="text-[10px] text-blue-700 text-right font-bold">{musicProgress}%</p>
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
																			✓
																			&quot;
																			{
																				formData.name
																			}
																			&quot;
																			uploaded
																			successfully
																		</p>
																	</div>
																	<Button
																		type="button"
																		variant="destructive"
																		size="sm"
																		onClick={() =>
																			setMusicTrack(
																				{
																					...musicTrack,
																					file_url:
																						"",
																					file_path:
																						"",
																				},
																			)
																		}
																		className="h-6 px-2 text-xs"
																	>
																		Delete
																	</Button>
																</div>
																<AudioPlayer
																	track={{
																		song_title:
																			formData.name ||
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

											{uploadingMusic && (
												<div className="border-2 border-dashed border-pink-300 bg-pink-50/30 rounded-lg p-10 flex flex-col items-center justify-center space-y-4">
													<Loader2 className="h-10 w-10 text-pink-500 animate-spin" />
													<div className="w-full max-w-xs space-y-2">
														<Progress value={musicProgress} className="h-2 bg-pink-100" />
														<p className="text-center text-pink-600 font-bold">{musicProgress}% Uploaded</p>
													</div>
												</div>
											)}

											{/* Upload area - only show if no file uploaded */}
											{!musicTrack.file_url &&
												!uploadingMusic && (
													<div className="border-2 border-dashed border-pink-300 rounded-lg p-6 hover:border-pink-400 hover:bg-pink-50/50 transition-all duration-300">
														<div className="text-center space-y-3">
															<Upload className="h-10 w-10 mx-auto text-pink-500" />
															<div>
																<Label
																	htmlFor="create-music-upload"
																	className="inline-block"
																>
																	<span className="text-pink-600 font-semibold text-base underline cursor-pointer hover:text-pink-700 transition-colors">
																		Upload
																		Music
																		File
																	</span>
																</Label>
																<input
																	id="create-music-upload"
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
																100MB)
															</p>
														</div>
													</div>
												)}
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* Technical / Lighting */}
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
														formData.manual_costume_color
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
														formData.manual_costume_color_two
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
														formData.manual_costume_color_three
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
											{(formData.manual_costume_color ||
												formData.manual_costume_color_two ||
												formData.manual_costume_color_three) && (
												<div className="space-y-2 mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
													<Label className="text-sm font-medium text-purple-800">
														🎨 Combined Colors
														Preview
													</Label>
													<div className="flex gap-2 h-12">
														{formData.manual_costume_color && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_costume_color,
																}}
																title={`Primary: ${formData.manual_costume_color}`}
															></div>
														)}
														{formData.manual_costume_color_two && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_costume_color_two,
																}}
																title={`Secondary: ${formData.manual_costume_color_two}`}
															></div>
														)}
														{formData.manual_costume_color_three && (
															<div
																className="flex-1 rounded-lg border-2 border-purple-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_costume_color_three,
																}}
																title={`Third: ${formData.manual_costume_color_three}`}
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
														formData.manual_light_color
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
														formData.manual_light_color_two
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
														formData.manual_light_color_three
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
											{(formData.manual_light_color ||
												formData.manual_light_color_two ||
												formData.manual_light_color_three) && (
												<div className="space-y-2 mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
													<Label className="text-sm font-medium text-yellow-800">
														💡 Combined Lighting
														Preview
													</Label>
													<div className="flex gap-2 h-12">
														{formData.manual_light_color && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_light_color,
																}}
																title={`Primary: ${formData.manual_light_color}`}
															></div>
														)}
														{formData.manual_light_color_two && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_light_color_two,
																}}
																title={`Secondary: ${formData.manual_light_color_two}`}
															></div>
														)}
														{formData.manual_light_color_three && (
															<div
																className="flex-1 rounded-lg border-2 border-yellow-200 shadow-inner"
																style={{
																	backgroundColor:
																		formData.manual_light_color_three,
																}}
																title={`Third: ${formData.manual_light_color_three}`}
															></div>
														)}
													</div>
												</div>
											)}
											<div className="space-y-2">
												<Label>
													Special Lighting Requests
												</Label>
												<Textarea
													value={
														formData.light_requests
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

										{/* Stage Positioning */}
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Stage Positioning
											</h3>
											<div className="space-y-2">
												<Label>
													Props and Equipment Needed
												</Label>
												<Textarea
													value={
														formData.props_needed
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
													<Label>
														Starting Position
													</Label>
													<Select
														value={
															formData.stage_position_start
														}
														onValueChange={(v) =>
															handleInputChange(
																"stage_position_start",
																v,
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
													<Label>
														Ending Position
													</Label>
													<Select
														value={
															formData.stage_position_end
														}
														onValueChange={(v) =>
															handleInputChange(
																"stage_position_end",
																v,
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
											<StagePositionPreview
												startPosition={
													formData.stage_position_start
												}
												endPosition={
													formData.stage_position_end
												}
												className="mb-4"
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* Stage Visual Manager */}
						<AccordionItem
							value="gallery-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-blue-50">
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
										{/* Rehearsal Video - FIRST */}
										<div className="space-y-3">
											<div className="flex items-center gap-2">
												<Music className="h-5 w-5 text-purple-600" />
												<h3 className="text-lg font-semibold">
													Rehearsal / Show Video
												</h3>
											</div>
											{rehearsalVideo ? (
												<div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
													<div className="flex items-center justify-between mb-3">
														<div className="flex items-center gap-2">
															<CheckCircle className="h-5 w-5 text-green-600" />
															<span className="font-medium text-green-800">
																Rehearsal Video
																Uploaded
															</span>
														</div>
														<Button
															size="sm"
															variant="ghost"
															onClick={() =>
																setRehearsalVideo(
																	null,
																)
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
														{rehearsalVideo.name}
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
											) : (
												<div>
													<Label
														htmlFor="create-rehearsal-upload"
														className="cursor-pointer block"
													>
														<div className="border-2 border-dashed border-purple-300 rounded-lg p-8 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300 text-center">
															<Upload className="h-10 w-10 text-purple-500 mx-auto mb-3" />
															<p className="text-purple-600 font-semibold text-base">
																Upload a
																Rehearsal or
																Show Video
															</p>
															<p className="text-sm text-muted-foreground mt-1">
																MP4, MOV, WebM
																up to 500MB
															</p>
														</div>
													</Label>
													<input
														id="create-rehearsal-upload"
														type="file"
														accept="video/*"
														onChange={
															handleRehearsalVideoUpload
														}
														className="hidden"
														disabled={
															uploadingRehearsalVideo
														}
													/>
													{uploadingRehearsalVideo && (
														<div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 mt-2 shadow-md">
															<div className="flex flex-col gap-3">
																<div className="flex items-center gap-3">
																	<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
																	<p className="text-sm font-semibold text-blue-900">
																		Uploading video...
																	</p>
																</div>
																<div className="w-full space-y-1">
																	<Progress value={rehearsalProgress} className="h-1.5 bg-blue-200" />
																	<p className="text-[10px] text-blue-700 text-right font-bold">{rehearsalProgress}%</p>
																</div>
															</div>
														</div>
													)}
												</div>
											)}
										</div>

										{/* Performance Video/Demo Link */}
										<div className="space-y-2">
											<Label>
												Performance Video/Demo Link
											</Label>
											<Input
												value={formData.show_link}
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
													<Label>Instagram</Label>
													<Input
														value={
															formData.instagram_link
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
													<Label>Facebook</Label>
													<Input
														value={
															formData.facebook_link
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
													<Label>TikTok</Label>
													<Input
														value={
															formData.tiktok_link
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
													<Label>YouTube</Label>
													<Input
														value={
															formData.youtube_link
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
													<Label>Website</Label>
													<Input
														value={
															formData.website_link
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
											<Label
												htmlFor="create-gallery-upload"
												className="cursor-pointer block"
											>
												<div className="border-2 border-dashed border-purple-300 rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-300 text-center">
													<ImageIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
													<p className="text-purple-600 font-semibold">
														Choose Files
													</p>
													<p className="text-xs text-gray-500 mt-1">
														PNG, JPG, MP4, MOV
													</p>
												</div>
											</Label>
											<input
												id="create-gallery-upload"
												type="file"
												accept="image/*,video/*"
												multiple
												onChange={handleGalleryUpload}
												className="hidden"
												disabled={uploadingGallery}
											/>
											{uploadingGallery && (
												<div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 shadow-md">
													<div className="flex flex-col gap-3">
														<div className="flex items-center gap-3">
															<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
															<p className="text-sm font-semibold text-blue-900">
																Uploading gallery files...
															</p>
														</div>
														<div className="w-full space-y-1">
															<Progress value={galleryProgress} className="h-1.5 bg-blue-200" />
															<p className="text-[10px] text-blue-700 text-right font-bold">{galleryProgress}%</p>
														</div>
													</div>
												</div>
											)}
										</div>
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
																		contentType:
																			file.contentType,
																	}}
																	onError={(
																		error,
																	) =>
																		console.error(
																			"Image viewer error:",
																			error,
																		)
																	}
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
																		contentType:
																			file.contentType,
																	}}
																	onError={(
																		error,
																	) =>
																		console.error(
																			"Video player error:",
																			error,
																		)
																	}
																	className="aspect-square"
																/>
															)}
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	setGalleryFiles(
																		galleryFiles.filter(
																			(
																				_,
																				i,
																			) =>
																				i !==
																				index,
																		),
																	)
																}
																className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10"
															>
																<Trash2 className="h-3 w-3" />
															</Button>
														</div>
													),
												)}
											</div>
										)}
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* Additional Information */}
						<AccordionItem
							value="additional-info"
							className="bg-white rounded-2xl shadow-lg border-2 border-green-100 overflow-hidden"
						>
							<AccordionTrigger className="text-lg font-semibold px-6 py-5 hover:bg-green-50">
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
											<Label>MC Notes</Label>
											<Textarea
												value={formData.mc_notes}
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
											<Label>Stage Manager Notes</Label>
											<Textarea
												value={
													formData.stage_manager_notes
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
											<Label>Additional Notes</Label>
											<Textarea
												value={formData.notes}
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

					{/* Submit */}
					<div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-6 mt-6">
						<div className="flex items-center gap-3 mb-4">
							<h3 className="font-bold text-gray-900">
								Ready to Create?
							</h3>
							<p className="text-sm text-gray-600">
								Review your information before creating.
							</p>
						</div>
						<Button
							onClick={handleSave}
							disabled={saving}
							className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-700 hover:via-pink-700 hover:to-red-600 text-white py-3 text-lg"
						>
							{saving ? (
								<Loader2 className="h-5 w-5 mr-2 animate-spin" />
							) : (
								<CheckCircle className="h-5 w-5 mr-2" />
							)}
							{saving ? "Creating..." : "Create Show"}
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
