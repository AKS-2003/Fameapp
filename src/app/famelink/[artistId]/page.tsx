"use client";

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import DocumentsSection from "./DocumentsSection";
import LogisticsSection from "./LogisticsSection";
import { AccountSection } from "./AccountSection";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadToGCS } from "@/lib/upload-utils";
import { FILE_LIMITS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import {
	Music,
	Plus,
	Edit,
	Trash2,
	LogOut,
	User,
	Mail,
	MapPin,
	Calendar,
	Sparkles,
	Copy,
	Check,
	AlertCircle,
	Clock,
	Eye,
	Share2,
	Send,
	Lock,
	Download,
	CalendarDays,
	Upload,
	Image as ImageIcon,
	CheckCircle,
	X,
	Loader2,
	FileText,
	MessageSquare,
	ChevronDown,
	Crown,
	Bell,
	Settings,
	ClipboardList,
	Star,
	ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ArtistChatButton } from "@/components/ArtistChatButton";
import { MembershipCard } from "@/components/MembershipCard";
import { useSubscription } from "@/hooks/useSubscription";
import { useCheckIn } from "@/hooks/use-checkin";
import { UpgradeModal } from "@/components/UpgradeModal";
import { InvitesContracts, ShowInfoPanel } from "@/components/famelink/InvitesContracts";
import { OnboardingFlowModal, FinishSettingUpBanner } from "@/components/famelink/OnboardingFlowModal";
import { GeneratePrivateLinkModal } from "@/components/famelink/GeneratePrivateLinkModal";

// ── Animation hook ──────────────────────────────────────────────
function useAnimateIn(delay = 0) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setVisible(true), delay);
		return () => clearTimeout(t);
	}, [delay]);
	return {
		ref,
		className: visible ? "animate-in-visible" : "animate-in-hidden",
	};
}

// ── CSS-in-JS animation styles (injected once) ─────────────────
function AnimationStyles() {
	return (
		<style jsx global>{`
			@keyframes fadeSlideUp {
				from {
					opacity: 0;
					transform: translateY(24px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			@keyframes fadeIn {
				from {
					opacity: 0;
				}
				to {
					opacity: 1;
				}
			}
			@keyframes shimmer {
				0% {
					background-position: -200% 0;
				}
				100% {
					background-position: 200% 0;
				}
			}
			@keyframes pulseGlow {
				0%,
				100% {
					box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
				}
				50% {
					box-shadow: 0 0 40px rgba(168, 85, 247, 0.35);
				}
			}
			@keyframes gradientShift {
				0% {
					background-position: 0% 50%;
				}
				50% {
					background-position: 100% 50%;
				}
				100% {
					background-position: 0% 50%;
				}
			}
			@keyframes float {
				0%,
				100% {
					transform: translateY(0px);
				}
				50% {
					transform: translateY(-6px);
				}
			}
			.animate-in-hidden {
				opacity: 0;
				transform: translateY(24px);
			}
			.animate-in-visible {
				animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)
					forwards;
			}
			.animate-fade-in {
				animation: fadeIn 0.5s ease forwards;
			}
			.glass-card {
				background: rgba(12, 8, 28, 0.6);
				backdrop-filter: blur(20px);
				-webkit-backdrop-filter: blur(20px);
				border: 1px solid rgba(168, 85, 247, 0.2);
				transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
			}
			.glass-card:hover {
				border-color: rgba(168, 85, 247, 0.45);
				box-shadow:
					0 8px 40px rgba(168, 85, 247, 0.15),
					0 0 0 1px rgba(168, 85, 247, 0.1);
				transform: translateY(-2px);
			}
			.glass-header {
				background: rgba(8, 4, 20, 0.8);
				backdrop-filter: blur(24px);
				-webkit-backdrop-filter: blur(24px);
			}
			.gradient-text {
				background: linear-gradient(135deg, #c084fc, #f472b6, #818cf8);
				background-size: 200% 200%;
				animation: gradientShift 4s ease infinite;
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				background-clip: text;
			}
			.btn-glow {
				position: relative;
				overflow: hidden;
				transition: all 0.3s ease;
			}
			.btn-glow::before {
				content: "";
				position: absolute;
				inset: -2px;
				background: linear-gradient(135deg, #a855f7, #ec4899, #6366f1);
				border-radius: inherit;
				z-index: -1;
				opacity: 0;
				transition: opacity 0.3s ease;
			}
			.btn-glow:hover::before {
				opacity: 1;
			}
			.btn-glow:hover {
				transform: translateY(-1px);
				box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
			}
			.show-card-enter {
				animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)
					forwards;
			}
			.pulse-dot {
				animation: pulseGlow 2s ease-in-out infinite;
			}
			.floating {
				animation: float 3s ease-in-out infinite;
			}
			.shimmer-bg {
				background: linear-gradient(
					90deg,
					transparent,
					rgba(168, 85, 247, 0.08),
					transparent
				);
				background-size: 200% 100%;
				animation: shimmer 2s infinite;
			}
		`}</style>
	);
}

// ── Interfaces (unchanged) ──────────────────────────────────────
interface ArtistProfile {
	id: string;
	artistName: string;
	email: string;
	country?: string;
	city?: string;
	tier: "free" | "pro" | "pro_plus";
	emailVerified: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
	shows?: BaseShow[];
	isFameLinkArtist?: boolean;
	realName?: string;
	phone?: string;
	style?: string;
	performanceType?: string;
	biography?: string;
	performanceDuration?: number;
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	customCostumeColor?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	lightRequests?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	customStagePosition?: string;
	equipment?: string;
	showLink?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	image_url?: string;
	musicTrack?: {
		file_url: string;
		file_path: string;
		duration: number;
		notes: string;
		tempo: string;
	};
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
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};
	countryLiving?: string;
	homeCountry?: string;
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
	profileComplete?: boolean;
}

interface BaseShow {
	id: string;
	artistId: string;
	pinned?: boolean;
	name: string;
	slug: string;
	style?: string;
	performanceType?: string;
	duration: number;
	description?: string;
	isDraft?: boolean;
	isPublic?: boolean;
	costumeColor?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	profileImage?: string;
	musicTrack?: {
		file_url: string;
		file_path: string;
		duration: number;
		notes: string;
		tempo: string;
	};
	galleryFiles?: Array<{
		url: string;
		type: "image" | "video";
		name: string;
		file_path?: string;
	}>;
	rehearsalVideo?: {
		file_path: string;
		name: string;
	} | null;
	biography?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	notes?: string;
	equipment?: string;
	showLink?: string;
	lightRequests?: string;
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
	tshirtSizes?: Array<{ name: string; size: string; fit: string }>;
	techRider?: string;
	music?: {
		files?: Array<{ id: string; name: string; url: string }>;
	};
	logistics?: {
		crewSize?: string;
		travelRequirements?: string;
		hospitalityNotes?: string;
	};
	internalNotes?: string;
	createdAt: string;
	updatedAt: string;
}

interface ShareLink {
	id: string;
	label?: string;
	linkType?: "show_info" | "logistics_info" | "both";
	showId: string;
	showName: string;
	showSlug: string;
	thumbnail?: string;
	token: string;
	organizerName: string;
	organizerEmail: string;
	emailRestriction?: string;
	logisticsPerson?: string;
	visibilityLevel?: "L1" | "L2" | "L3";
	eventDate: string;
	requestDate: string;
	expiryDate: string;
	status: "sent" | "viewed" | "downloaded";
	viewedAt: string | null;
	downloadedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

interface EventRequestWithEvent {
	id: string;
	eventId: string;
	artistId?: string;
	artistEmail: string;
	stageManagerId: string;
	message?: string;
	requestedShowDates: string[];
	status: "pending" | "accepted" | "declined" | "expired";
	respondedAt?: string;
	eventShowId?: string;
	createdAt: string;
	expiresAt: string;
	stageManagerName?: string;
	event?: {
		id: string;
		name: string;
		venueName: string;
		startDate: string;
		endDate: string;
		description?: string;
		showDates?: string[];
	} | null;
}

interface EventParticipationWithEvent {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	status: "pending" | "submitted" | "confirmed" | "declined";
	baseShowId?: string;
	eventShowId?: string;
	joinedAt: string;
	submittedAt?: string;
	confirmedAt?: string;
	updatedAt: string;
	submittedShows?: Array<{
		eventShowId: string;
		baseShowId: string;
		showName: string;
		status: string;
		performanceDate: string | null;
	}>;
	showCount?: number;
	performanceDates?: string[]; // YYYY-MM-DD dates from contract performances
	event?: {
		id: string;
		name: string;
		venueName: string;
		startDate: string;
		endDate: string;
		showDates?: string[];
		contractEnabled?: boolean;
		logisticsEnabled?: boolean;
		showInfoEnabled?: boolean;
	} | null;
}

// ── Main export ─────────────────────────────────────────────────
export default function FameLinkDashboard() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center">
					<div className="text-center">
						<div className="relative w-16 h-16 mx-auto mb-6">
							<div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
							<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
							<div className="absolute inset-4 rounded-full bg-purple-500/20 animate-pulse" />
						</div>
						<p className="text-purple-300/70 text-sm tracking-wide">
							Loading your dashboard...
						</p>
					</div>
				</div>
			}
		>
			<FameLinkDashboardContent />
		</Suspense>
	);
}

// ── Dashboard Content ───────────────────────────────────────────
function FameLinkDashboardContent() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const artistId = params.artistId as string;
	const searchParams = useSearchParams();

	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [shows, setShows] = useState<BaseShow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sessionConflict, setSessionConflict] = useState<"stage_manager" | "super_admin" | "dj" | null>(null);
	const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
	const [duplicatingShowId, setDuplicatingShowId] = useState<string | null>(null);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [activeSection, setActiveSection] = useState<"dashboard" | "event-tasks" | "shows" | "logistics" | "documents" | "messages" | "account">("dashboard");
	const [selectedEventInviteId, setSelectedEventInviteId] = useState<string | null>(null);
	const [initialSection, setInitialSection] = useState<"contract" | "logistics" | "show_info" | null>(null);
	const [modalTriggerKey, setModalTriggerKey] = useState(0);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const returnedFromCheckoutRef = useRef(false);
	const {
		data: subData,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();

	useEffect(() => {
		if (returnedFromCheckoutRef.current) return; // only run once
		if (searchParams.get("upgraded") === "true") {
			returnedFromCheckoutRef.current = true;
			// Store in sessionStorage BEFORE cleaning URL so useSubscription can detect it
			sessionStorage.setItem("stripe_checkout_returned", "true");
			setUpgradeModalOpen(true);
			// Clean up the URL param without triggering re-render
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, [searchParams]);

	// Switch active section when a tab parameter is provided in the URL
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (
			tab === "shows" ||
			tab === "dashboard" ||
			tab === "event-tasks" ||
			tab === "logistics" ||
			tab === "documents" ||
			tab === "messages" ||
			tab === "account"
		) {
			setActiveSection(tab);
		}
	}, [searchParams]);

	// Share link state
	const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
	const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

	// Edit event request dialog state
	const [editLinkDialogOpen, setEditLinkDialogOpen] = useState(false);
	const [editLinkData, setEditLinkData] = useState<{
		id: string;
		organizerName: string;
		organizerEmail: string;
		showName: string;
		eventDate: string;
		expiryDate: string;
	} | null>(null);
	const [editingSaving, setEditingSaving] = useState(false);

	// Detail dialog state
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);
	// Account settings state
	const [accountTab, setAccountTab] = useState<
		"password" | "picture"
	>("password");
	const [changePwData, setChangePwData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [accountSaving, setAccountSaving] = useState(false);
	const [accountError, setAccountError] = useState("");

	// Helper: convert gs:// URLs to /api/media/ proxy URLs
	const getMediaUrl = (url: string, filePath?: string): string => {
		if (!url) return "";
		if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("/")) {
			return url;
		}
		if (url.startsWith("gs://")) {
			if (filePath) return `/api/media/${filePath}`;
			const match = url.match(/^gs:\/\/[^/]+\/(.+)$/);
			if (match) return `/api/media/${match[1]}`;
			return url;
		}
		return `/api/media/${url}`;
	};

	// Profile image state
	const [profileImage, setProfileImage] = useState<string>("");
	const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	// Event request state
	const [eventRequests, setEventRequests] = useState<EventRequestWithEvent[]>(
		[],
	);
	const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
		null,
	);
	const [requestStep, setRequestStep] = useState<
		Record<string, "select" | "confirm" | "sent">
	>({});
	const [selectedShowIds, setSelectedShowIds] = useState<
		Record<string, string[]>
	>({});
	const [respondingRequestId, setRespondingRequestId] = useState<
		string | null
	>(null);

	// Event participation state
	const [eventParticipations, setEventParticipations] = useState<
		EventParticipationWithEvent[]
	>([]);
	const [expandedParticipationId, setExpandedParticipationId] = useState<
		string | null
	>(null);
	// Show info state: tracks how many event-shows each event has submitted
	const [eventShowCountsMap, setEventShowCountsMap] = useState<Record<string, number>>({});
	// Which event's ShowInfoPanel dialog to auto-open ("submit" or "view")
	const [openShowInfoEventId, setOpenShowInfoEventId] = useState<string | null>(null);
	const [openShowInfoMode, setOpenShowInfoMode] = useState<"submit" | "view">("submit");

	// Derive the active eventId for check-in status
	const activeEventId = useMemo(() => {
		const active = eventParticipations.find(
			(p) => p.status === "submitted" || p.status === "confirmed",
		) || eventRequests.find((r) => r.status === "accepted");
		return active?.eventId || "";
	}, [eventParticipations, eventRequests]);

	// Check-in status for the active event
	const { rehearsalCheckedIn, performanceCheckedIn } = useCheckIn(activeEventId, artistId);

	// Personal messages state
	const [personalMessages, setPersonalMessages] = useState<
		Record<string, any[]>
	>({});
	const [unreadMessageCounts, setUnreadMessageCounts] = useState<
		Record<string, number>
	>({});
	const [viewingMessagesForEvent, setViewingMessagesForEvent] = useState<
		string | null
	>(null);
	const [replyMessage, setReplyMessage] = useState("");
	const [sendingReply, setSendingReply] = useState(false);

	// Event deletion state
	const [deleteEventState, setDeleteEventState] = useState<{
		isOpen: boolean;
		eventId: string | null;
		eventName: string;
		isDeleting: boolean;
		hasShows: boolean;
	}>({
		isOpen: false,
		eventId: null,
		eventName: "",
		isDeleting: false,
		hasShows: false,
	});

	// Onboarding flow modal state
	const [onboardingOpen, setOnboardingOpen] = useState(false);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [generateLinkModalOpen, setGenerateLinkModalOpen] = useState(false);
	// Tracks whether we've already handled the ?justCreatedShow=true redirect this page load
	const justCreatedShowRef = useRef(false);
	// Track whether eventRequests/eventParticipations have finished their first fetch —
	// these load independently of the main `loading` flag, so we can't rely on that alone.
	const [eventRequestsLoaded, setEventRequestsLoaded] = useState(false);
	const [eventParticipationsLoaded, setEventParticipationsLoaded] = useState(false);
	// Dismissed is stored in localStorage so it persists across reloads, keyed by artistId
	const onboardingStorageKey = `onboarding_dismissed_${artistId}`;
	const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
		typeof window !== "undefined" && localStorage.getItem(`onboarding_dismissed_${artistId}`) === "1"
	);

	// ── Data fetching (unchanged logic) ─────────────────────────
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Verify session first to ensure persistence and prevent "unauthorized" errors later
				const authRes = await fetch("/api/auth/me?role=artist");
				const authData = await authRes.json();

				if (!authData.success) {
					console.log("[DASHBOARD] No active session found, redirecting to login");
					router.push(`/famelink-auth?artistId=${artistId}`);
					return;
				}

				// ── SESSION CONFLICT: Stage Manager / Admin trying to access Artist dashboard ──
				const role = authData.data?.role;
				if (role === "stage_manager" || role === "super_admin" || role === "dj") {
					setSessionConflict(role);
					setLoading(false);
					return;
				}

				if (role !== "artist") {
					console.log("[DASHBOARD] Non-artist session, redirecting to login");
					router.push(`/famelink-auth?artistId=${artistId}`);
					return;
				}

				// Verify that the logged-in user matches the requested dashboard
				if (authData.data.userId !== artistId) {
					console.warn("[DASHBOARD] Session mismatch, redirecting to correct dashboard");
					router.push(`/famelink/${authData.data.userId}`);
					return;
				}

				const profileResponse = await fetch(`/api/artists/${artistId}`);
				const profileResult = await profileResponse.json();
				if (!profileResult.success) {
					console.log("[DASHBOARD] Profile not found in database, clearing invalid session...");
					// Redirect to logout with a return path to the auth page
					window.location.href = `/api/auth/logout?redirect=/famelink-auth?artistId=${artistId}`;
					return;
				}
				setProfile(profileResult.data);
				if (profileResult.data.image_url)
					setProfileImage(profileResult.data.image_url);

				const showsResponse = await fetch(
					`/api/shows?artistId=${artistId}`,
				);
				const showsResult = await showsResponse.json();
				if (showsResult.success && showsResult.data) {
					const showsData =
						showsResult.data.shows || showsResult.data;
					setShows(Array.isArray(showsData) ? showsData : []);
				}

				try {
					const linksResponse = await fetch(
						`/api/shows/share-links?artistId=${artistId}`,
					);
					const linksResult = await linksResponse.json();
					if (linksResult.success && linksResult.data?.links) {
						setShareLinks(linksResult.data.links);
					}
				} catch (err) {
					console.error("Error fetching share links:", err);
				}
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load data");
			} finally {
				setLoading(false);
			}
		};
		if (artistId) fetchData();
	}, [artistId, router]);

	// Re-fetch shows when subscription upgrades so limits and counts refresh
	useEffect(() => {
		if (justUpgraded && artistId) {
			const refreshShows = async () => {
				try {
					const showsResponse = await fetch(
						`/api/shows?artistId=${artistId}`,
					);
					const showsResult = await showsResponse.json();
					if (showsResult.success && showsResult.data) {
						const showsData =
							showsResult.data.shows || showsResult.data;
						setShows(Array.isArray(showsData) ? showsData : []);
					}
				} catch (err) {
					console.error("Error refreshing shows after upgrade:", err);
				}
			};
			refreshShows();
		}
	}, [justUpgraded, artistId]);

	// Auto-open onboarding popup on first load once data is ready
	useEffect(() => {
		if (loading) return;          // wait for initial fetch
		if (onboardingDismissed) return; // user already dismissed this session
		if (onboardingOpen) return;   // already open
		if (shareModalOpen) return;   // share popup is taking priority (e.g. just created a show)
		if (justCreatedShowRef.current) return; // let the other effect decide first
		if (
			searchParams.get("justCreatedShow") === "true" &&
			(!eventRequestsLoaded || !eventParticipationsLoaded)
		) {
			return; // still waiting on data before the justCreatedShow effect can decide
		}

		const pendingRequests = eventRequests.filter((r) => r.status === "pending");

		// Participations that still need a show assigned:
		// status=pending with showCount=0 means joined but never submitted a show
		const unsubmittedParticipations = eventParticipations.filter(
			(p) => p.status === "pending" && ((p as any).showCount ?? 0) === 0
		);

		// If there are unsubmitted participations AND the artist now has shows to assign,
		// clear the dismissed flag so the popup re-opens (the state has changed)
		if (unsubmittedParticipations.length > 0 && shows.length > 0 && onboardingDismissed) {
			localStorage.removeItem(onboardingStorageKey);
			setOnboardingDismissed(false);
			return; // will re-run with onboardingDismissed=false
		}

		// Only open if there are actual pending invites that need action
		if (pendingRequests.length > 0 || unsubmittedParticipations.length > 0) {
			setOnboardingOpen(true);
		}
	}, [loading, eventRequests, eventParticipations, shows, onboardingDismissed, onboardingOpen, shareModalOpen, searchParams, eventRequestsLoaded, eventParticipationsLoaded]);

	// Just created a show — if there are events still waiting on a show submission,
	// jump straight to the "Where do you want to share?" popup instead of the tasks list.
	// Uses the same "still needs a show" condition as the Share Modal's own pendingParticipations filter below,
	// so this only opens when the popup will actually have something to show.
	useEffect(() => {
		if (loading) return;
		// eventRequests/eventParticipations load independently of `loading` — wait for both
		// before deciding, otherwise we might see empty arrays and skip the popup incorrectly.
		if (!eventRequestsLoaded || !eventParticipationsLoaded) return;
		if (searchParams.get("justCreatedShow") !== "true") return;
		if (justCreatedShowRef.current) return; // only handle this once per navigation
		justCreatedShowRef.current = true;

		const pendingRequests = eventRequests.filter((r) => r.status === "pending");
		const unsubmittedParticipations = eventParticipations.filter((p) => {
			const perfSlots = (p as any).performanceDates?.length || p.event?.showDates?.length || 0;
			const submitted = (p as any).showCount ?? 0;
			return perfSlots > 0 ? submitted < perfSlots : submitted === 0;
		});

		if (shows.length > 0 && (pendingRequests.length > 0 || unsubmittedParticipations.length > 0)) {
			setOnboardingOpen(false);
			setShareModalOpen(true);
		}

		// Clean up the URL param so this doesn't re-trigger on refresh
		window.history.replaceState({}, "", window.location.pathname + "?tab=shows");
	}, [loading, eventRequestsLoaded, eventParticipationsLoaded, eventRequests, eventParticipations, shows, searchParams]);

	const fetchEventRequests = useCallback(async () => {
		try {
			const response = await fetch("/api/event-requests");
			const result = await response.json();
			if (result.success && result.data?.requests) {
				setEventRequests(result.data.requests);
			}
		} catch (err) {
			console.error("Error fetching event requests:", err);
		} finally {
			setEventRequestsLoaded(true);
		}
	}, []);

	// Fetch event-show count for a specific event (used by My Events show info row)
	const fetchEventShowCount = useCallback(async (eventId: string) => {
		try {
			const res = await fetch(`/api/event-shows?eventId=${eventId}`);
			const result = await res.json();
			if (result.success && result.data?.eventShows) {
				setEventShowCountsMap(prev => ({ ...prev, [eventId]: result.data.eventShows.length }));
			}
		} catch {
			/* ignore */
		}
	}, []);

	const fetchEventParticipations = useCallback(async () => {
		try {
			const response = await fetch("/api/event-participations");
			const result = await response.json();
			if (result.success && result.data?.participations) {
				setEventParticipations(result.data.participations);
				result.data.participations.forEach((p: any) => {
					if (p.eventId) {
						fetchEventShowCount(p.eventId);
					}
				});
			}
		} catch (err) {
			console.error("Error fetching event participations:", err);
		} finally {
			setEventParticipationsLoaded(true);
		}
	}, [fetchEventShowCount]);

	const fetchPersonalMessagesForRequests = useCallback(
		async (requests: EventRequestWithEvent[]) => {
			const counts: Record<string, number> = {};
			for (const req of requests) {
				if (!req.eventId) continue;
				try {
					const response = await fetch(
						`/api/events/${req.eventId}/personal-messages?artistId=${artistId}&countOnly=true`,
					);
					const result = await response.json();
					if (result.success && result.data?.messages) {
						const unread = result.data.messages.filter(
							(msg: any) =>
								msg.senderRole !== "artist" && !msg.read,
						).length;
						counts[req.eventId] = unread;
					}
				} catch {
					/* ignore */
				}
			}
			setUnreadMessageCounts(counts);
		},
		[artistId],
	);

	const fetchPersonalMessagesForEvent = useCallback(
		async (eventId: string) => {
			try {
				const response = await fetch(
					`/api/events/${eventId}/personal-messages?artistId=${artistId}`,
				);
				const result = await response.json();
				if (result.success && result.data?.messages) {
					setPersonalMessages((prev) => ({
						...prev,
						[eventId]: result.data.messages,
					}));
					setUnreadMessageCounts((prev) => ({
						...prev,
						[eventId]: 0,
					}));
				}
			} catch (err) {
				console.error("Error fetching personal messages:", err);
			}
		},
		[artistId],
	);

	const handleSendReply = async (eventId: string) => {
		if (!replyMessage.trim()) return;
		setSendingReply(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/personal-messages`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						artistId,
						artistName: profile?.artistName || "Artist",
						message: replyMessage.trim(),
						senderId: artistId,
						senderName: profile?.artistName || "Artist",
						senderRole: "artist",
					}),
				},
			);
			const result = await response.json();
			if (result.success) {
				setReplyMessage("");
				fetchPersonalMessagesForEvent(eventId);
				toast({
					title: "Reply Sent",
					description:
						"Your reply has been sent to the stage manager.",
				});
				// Auto-close the message view after successful send
				setViewingMessagesForEvent(null);
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to send reply",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to send reply",
				variant: "destructive",
			});
		} finally {
			setSendingReply(false);
		}
	};

	useEffect(() => {
		if (artistId) {
			fetchEventRequests();
			fetchEventParticipations();
		}
	}, [artistId, fetchEventRequests, fetchEventParticipations]);

	useEffect(() => {
		if (eventRequests.length > 0) {
			fetchPersonalMessagesForRequests(eventRequests);
		}
		// Poll for new messages every 15 seconds as a fallback
		if (eventRequests.length > 0) {
			const pollInterval = setInterval(() => {
				fetchPersonalMessagesForRequests(eventRequests);
			}, 15000);
			return () => clearInterval(pollInterval);
		}
	}, [eventRequests, fetchPersonalMessagesForRequests]);

	// ── WebSocket for real-time notifications ───────────────────
	useEffect(() => {
		if (!artistId) return;
		let socket: any = null;
		let mounted = true;

		const connectWebSocket = async () => {
			try {
				if (typeof (window as any).io === "undefined") {
					const script = document.createElement("script");
					script.src = "/socket.io/socket.io.js";
					await new Promise<void>((resolve, reject) => {
						script.onload = () => resolve();
						script.onerror = () => reject();
						document.head.appendChild(script);
					});
				}
				if (!mounted) return;
				socket = (window as any).io({
					transports: ["websocket"],
					upgrade: false,
				});
				socket.on("connect", () => {
					socket.emit("authenticate", {
						userId: artistId,
						role: "artist",
						eventId: "",
					});
				});
				// Store socket reference for joining rooms later
				(window as any).__fameLinkSocket = socket;
				socket.on("event_request_created", () => {
					if (mounted) {
						fetchEventRequests();
						toast({
							title: "New Event Invitation!",
							description:
								"You've received a new event invitation from a stage manager.",
						});
					}
				});
				socket.on("participation_status_changed", (data: any) => {
					if (mounted) {
						fetchEventParticipations();
						const statusMsg =
							data.newStatus === "confirmed"
								? "You've been confirmed for an event!"
								: "Your event assignment was updated.";
						toast({
							title:
								data.newStatus === "confirmed"
									? "🎉 Event Confirmed!"
									: "📅 Event Updated",
							description: statusMsg,
						});
					}
				});
				socket.on("new_personal_message", (data: any) => {
					if (
						mounted &&
						data.artistId === artistId &&
						data.senderRole !== "artist"
					) {
						setUnreadMessageCounts((prev) => ({
							...prev,
							[data.eventId]: (prev[data.eventId] || 0) + 1,
						}));
						if (data.message) {
							setPersonalMessages((prev) => ({
								...prev,
								[data.eventId]: [
									...(prev[data.eventId] || []),
									data.message,
								],
							}));
						}
						toast({
							title: "New Message",
							description:
								"You have a new personal message from the stage manager.",
						});
					}
				});
			} catch (err) {
				console.error("WebSocket connection error:", err);
			}
		};
		connectWebSocket();
		return () => {
			mounted = false;
			if (socket) socket.disconnect();
			delete (window as any).__fameLinkSocket;
		};
	}, [artistId, fetchEventRequests, fetchEventParticipations, toast]);

	// ── Join WebSocket event rooms when requests/participations load ──
	useEffect(() => {
		const socket = (window as any).__fameLinkSocket;
		if (!socket || !socket.connected) return;
		const eventIds = new Set<string>();
		for (const req of eventRequests) {
			if (req.eventId) eventIds.add(req.eventId);
		}
		for (const p of eventParticipations) {
			if (p.eventId) eventIds.add(p.eventId);
		}
		for (const eid of eventIds) {
			socket.emit("join_event_room", { eventId: eid });
		}
	}, [eventRequests, eventParticipations]);

	// ── Action handlers (unchanged logic) ───────────────────────
	const handleDeleteEvent = async () => {
		if (!deleteEventState.eventId) return;

		setDeleteEventState((prev) => ({ ...prev, isDeleting: true }));

		try {
			const response = await fetch(
				`/api/event-participations/${deleteEventState.eventId}`,
				{
					method: "DELETE",
				},
			);
			const result = await response.json();

			if (result.success) {
				toast({
					title: "Event Deleted",
					description: "You have successfully deleted the event.",
				});
				setDeleteEventState({
					isOpen: false,
					eventId: null,
					eventName: "",
					isDeleting: false,
					hasShows: false,
				});
				fetchEventParticipations();
			} else {
				toast({
					title: "Error",
					description:
						result.error?.message || "Failed to delete event",
					variant: "destructive",
				});
				setDeleteEventState((prev) => ({ ...prev, isDeleting: false }));
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete event",
				variant: "destructive",
			});
			setDeleteEventState((prev) => ({ ...prev, isDeleting: false }));
		}
	};

	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			localStorage.removeItem("artistProfile");
			router.push("/");
		} catch (error) {
			console.error("Logout error:", error);
			router.push("/");
		}
	};

	const copyFameLink = (slug: string) => {
		const url = `${window.location.origin}/show/${slug}`;
		navigator.clipboard.writeText(url);
		setCopiedSlug(slug);
		toast({
			title: "Link Copied!",
			description: "FameLink URL copied to clipboard",
		});
		setTimeout(() => setCopiedSlug(null), 2000);
	};

	const handleTogglePinnedShow = async (showId: string, currentPinned: boolean) => {
		try {
			// Optimistically update
			setShows(shows.map(s => s.id === showId ? { ...s, pinned: !currentPinned } : s));
			const response = await fetch(`/api/shows/${showId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ pinned: !currentPinned }),
			});
			const result = await response.json();
			if (!result.success) {
				// Revert on error
				setShows(shows.map(s => s.id === showId ? { ...s, pinned: currentPinned } : s));
				toast({
					title: "Error",
					description: "Failed to pin show",
					variant: "destructive",
				});
			}
		} catch (error) {
			// Revert on error
			setShows(shows.map(s => s.id === showId ? { ...s, pinned: currentPinned } : s));
			toast({
				title: "Error",
				description: "Failed to pin show",
				variant: "destructive",
			});
		}
	};

	const handleDeleteShow = async (showId: string) => {
		if (!confirm("Are you sure you want to delete this show?")) return;
		try {
			const response = await fetch(`/api/shows/${showId}`, {
				method: "DELETE",
			});
			const result = await response.json();
			if (result.success) {
				setShows(shows.filter((s) => s.id !== showId));
				toast({
					title: "Show Deleted",
					description: "Your show has been deleted",
				});
			} else {
				toast({
					title: "Error",
					description:
						result.error?.message || "Failed to delete show",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete show",
				variant: "destructive",
			});
		}
	};

	// Duplicate a show: stash its full data and open the create-show page pre-filled with it
	const handleDuplicateShow = async (showId: string) => {
		setDuplicatingShowId(showId);
		try {
			const response = await fetch(`/api/shows/${showId}`);
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error?.message || "Failed to load show");
			}
			const s = result.data.show || result.data;
			sessionStorage.setItem("duplicateShowData", JSON.stringify(s));
			router.push(`/famelink/${artistId}/shows/create`);
			// Leave duplicatingShowId set — the overlay stays up until the new page mounts and navigates away
		} catch (error) {
			setDuplicatingShowId(null);
			toast({
				title: "Error",
				description: "Failed to duplicate show",
				variant: "destructive",
			});
		}
	};

	const toggleShowSelection = (requestId: string, showId: string) => {
		setSelectedShowIds((prev) => {
			const current = prev[requestId] || [];
			if (current.includes(showId)) {
				return {
					...prev,
					[requestId]: current.filter((id) => id !== showId),
				};
			}
			return { ...prev, [requestId]: [...current, showId] };
		});
	};

	const handleContinueWithShows = (requestId: string) => {
		const selected = selectedShowIds[requestId] || [];
		if (selected.length === 0) {
			toast({
				title: "Select Shows",
				description: "Please select at least one show to continue",
				variant: "destructive",
			});
			return;
		}
		setRequestStep((prev) => ({ ...prev, [requestId]: "confirm" }));
	};

	const handleAcceptRequest = async (requestId: string) => {
		const selected = selectedShowIds[requestId] || [];
		if (selected.length === 0) return;
		setRespondingRequestId(requestId);
		try {
			const response = await fetch(
				`/api/event-requests/${requestId}/respond`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "accept",
						baseShowIds: selected,
					}),
				},
			);
			const result = await response.json();
			if (result.success) {
				setRequestStep((prev) => ({ ...prev, [requestId]: "sent" }));
				try {
					if (typeof (window as any).io !== "undefined") {
						const req = eventRequests.find(
							(r) => r.id === requestId,
						);
						const socket = (window as any).io({
							transports: ["websocket"],
							upgrade: false,
						});
						socket.emit("event_request_responded", {
							requestId,
							eventId: req?.eventId,
							artistId,
							artistName: profile?.artistName || "Artist",
							action: "accept",
							showCount: selected.length,
						});
						socket.disconnect();
					}
				} catch {
					/* best-effort */
				}
				toast({
					title: "Event Request Accepted!",
					description: `You've accepted with ${selected.length} show${selected.length > 1 ? "s" : ""}`,
				});
				fetchEventRequests();
			} else {
				toast({
					title: "Error",
					description:
						result.error?.message || "Failed to accept request",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to respond to request",
				variant: "destructive",
			});
		} finally {
			setRespondingRequestId(null);
		}
	};

	const handleDeclineRequest = async (requestId: string) => {
		if (!confirm("Are you sure you want to decline this event request?"))
			return;
		setRespondingRequestId(requestId);
		try {
			const response = await fetch(
				`/api/event-requests/${requestId}/respond`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "decline" }),
				},
			);
			const result = await response.json();
			if (result.success) {
				try {
					if (typeof (window as any).io !== "undefined") {
						const req = eventRequests.find(
							(r) => r.id === requestId,
						);
						const socket = (window as any).io({
							transports: ["websocket"],
							upgrade: false,
						});
						socket.emit("event_request_responded", {
							requestId,
							eventId: req?.eventId,
							artistId,
							artistName: profile?.artistName || "Artist",
							action: "decline",
							showCount: 0,
						});
						socket.disconnect();
					}
				} catch {
					/* best-effort */
				}
				toast({
					title: "Request Declined",
					description: "The event request has been declined.",
				});
				fetchEventRequests();
			} else {
				toast({
					title: "Error",
					description:
						result.error?.message || "Failed to decline request",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to respond",
				variant: "destructive",
			});
		} finally {
			setRespondingRequestId(null);
		}
	};


	const copyShareLink = (link: ShareLink) => {
		const url = `${window.location.origin}/private-link/${link.token}`;
		navigator.clipboard.writeText(url);
		setCopiedLinkId(link.id);
		toast({
			title: "Link Copied!",
			description: "Share link copied to clipboard",
		});
		setTimeout(() => setCopiedLinkId(null), 2000);
	};

	const handleDeleteShareLink = async (linkId: string) => {
		if (!confirm("Delete this share link?")) return;
		try {
			const response = await fetch(
				`/api/shows/share-links?id=${linkId}`,
				{ method: "DELETE" },
			);
			const result = await response.json();
			if (result.success) {
				setShareLinks(shareLinks.filter((l) => l.id !== linkId));
				toast({
					title: "Deleted",
					description: "Share link has been removed",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete link",
				variant: "destructive",
			});
		}
	};

	// Helper: get today's date in YYYY-MM-DD format for min date validation
	const getTodayDateString = () => {
		const today = new Date();
		return today.toISOString().split("T")[0];
	};

	// Helper: get date + N days in YYYY-MM-DD format
	const getDatePlusDays = (dateStr: string, days: number) => {
		if (!dateStr) return "";
		const d = new Date(dateStr);
		d.setDate(d.getDate() + days);
		return d.toISOString().split("T")[0];
	};

	const handleOpenEditLinkDialog = (link: ShareLink) => {
		setEditLinkData({
			id: link.id,
			organizerName: link.organizerName,
			organizerEmail: link.organizerEmail || "",
			showName: link.showName,
			eventDate: link.eventDate || "",
			expiryDate: link.expiryDate || "",
		});
		setEditLinkDialogOpen(true);
	};

	const handleUpdateShareLink = async () => {
		if (!editLinkData) return;
		if (!editLinkData.organizerName.trim()) {
			toast({
				title: "Error",
				description: "Organizer name is required",
				variant: "destructive",
			});
			return;
		}
		if (!editLinkData.eventDate) {
			toast({
				title: "Error",
				description: "Event date is required",
				variant: "destructive",
			});
			return;
		}
		// Validate event date is not in the past
		const today = getTodayDateString();
		if (editLinkData.eventDate < today) {
			toast({
				title: "Error",
				description: "Event date cannot be in the past",
				variant: "destructive",
			});
			return;
		}
		// Validate expiry date is at least 1 day after event date
		if (
			editLinkData.expiryDate &&
			editLinkData.expiryDate <= editLinkData.eventDate
		) {
			toast({
				title: "Error",
				description:
					"Link valid until date must be at least 1 day after the event date",
				variant: "destructive",
			});
			return;
		}
		setEditingSaving(true);
		try {
			const response = await fetch("/api/shows/share-links", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					linkId: editLinkData.id,
					organizerName: editLinkData.organizerName,
					organizerEmail: editLinkData.organizerEmail,
					eventDate: editLinkData.eventDate,
					expiryDate: editLinkData.expiryDate,
				}),
			});
			const result = await response.json();
			if (result.success) {
				setShareLinks(
					shareLinks.map((l) =>
						l.id === editLinkData.id
							? {
								...l,
								organizerName: editLinkData.organizerName,
								organizerEmail: editLinkData.organizerEmail,
								eventDate: editLinkData.eventDate,
								expiryDate: editLinkData.expiryDate,
							}
							: l,
					),
				);
				setEditLinkDialogOpen(false);
				setEditLinkData(null);
				toast({
					title: "Updated",
					description: "Event request has been updated",
				});
			} else {
				toast({
					title: "Error",
					description: result.error?.message || "Failed to update",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update event request",
				variant: "destructive",
			});
		} finally {
			setEditingSaving(false);
		}
	};

	const handleProfileImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file",
				description: "Please upload an image file",
				variant: "destructive",
			});
			return;
		}
		if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
			toast({
				title: "File too large",
				description: "Image must be under 100MB",
				variant: "destructive",
			});
			return;
		}
		try {
			setUploadingProfileImage(true);
			setUploadProgress(0);
			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "profile",
				onProgress: (pct) => setUploadProgress(pct),
			});
			setProfileImage(result.fileName);

			// Persist to database so it doesn't vanish on refresh
			await fetch(`/api/artists/${artistId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image_url: result.fileName }),
			});

			toast({
				title: "Success",
				description: "Profile image uploaded and saved",
				variant: "success",
			});
		} catch (error) {
			toast({
				title: "Upload failed",
				description: "Failed to upload profile image",
				variant: "destructive",
			});
		} finally {
			setUploadingProfileImage(false);
			e.target.value = "";
		}
	};

	// ── Loading state ───────────────────────────────────────────
	if (loading) {
		return (
			<div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center">
				<div className="text-center">
					<div className="relative w-16 h-16 mx-auto mb-6">
						<div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
						<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
						<div className="absolute inset-4 rounded-full bg-purple-500/20 animate-pulse" />
					</div>
					<p className="text-purple-300/70 text-sm tracking-wide">
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	// \u2500\u2500 SESSION CONFLICT SCREEN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
	if (sessionConflict) {
		const roleLabel =
			sessionConflict === "super_admin"
				? "Super Admin"
				: sessionConflict === "dj"
					? "DJ"
					: "Stage Manager";
		const dashboardPath =
			sessionConflict === "super_admin"
				? "/super-admin"
				: sessionConflict === "dj"
					? "/dj"
					: "/stage-manager";

		const handleLogout = async () => {
			await fetch("/api/auth/logout", { method: "POST" });
			window.location.href = "/famelink-auth";
		};

		return (
			<div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center p-4">
				<AnimationStyles />
				<div
					className="w-full max-w-md rounded-2xl p-8 text-center animate-fade-in"
					style={{
						background: "rgba(15, 5, 35, 0.92)",
						backdropFilter: "blur(24px)",
						border: "1px solid rgba(249, 115, 22, 0.3)",
						boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.1)",
					}}
				>
					<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/30">
						<AlertCircle className="h-8 w-8 text-orange-400" />
					</div>
					<h2 className="text-2xl font-bold text-white mb-2">Session Conflict</h2>
					<p className="text-gray-400 text-sm mb-5">
						You are currently logged in as a{" "}
						<span className="font-semibold text-orange-400">{roleLabel}</span>.
					</p>
					<div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-sm text-orange-300 leading-relaxed mb-6 text-left">
						⚠️ Please <strong>logout from your {roleLabel} profile</strong> before accessing the Artist dashboard. You cannot be logged into two different roles in the same browser.
					</div>
					<div className="space-y-3">
						<Button
							onClick={handleLogout}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11 rounded-xl"
						>
							<LogOut className="h-4 w-4 mr-2" />
							Logout from {roleLabel}
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push(dashboardPath)}
							className="w-full h-11 rounded-xl border-white/10 text-gray-300 hover:bg-white/5"
						>
							Go back to {roleLabel} Dashboard
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center p-4">
				<div className="glass-card rounded-2xl w-full max-w-md p-8 text-center animate-fade-in">
					<AnimationStyles />
					<div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
						<AlertCircle className="h-8 w-8 text-red-400" />
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">
						Something went wrong
					</h2>
					<p className="text-gray-400 mb-6">
						{error || "Profile not found"}
					</p>
					<Button
						onClick={() => router.push("/")}
						className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6"
					>
						Back to Home
					</Button>
				</div>
			</div>
		);
	}

	const maxShows = subData?.maxShows ?? (planType === "free" ? 3 : Infinity);
	const isProfileComplete =
		profile.profileComplete ||
		(profile.realName && profile.style && profile.musicTrack?.file_url);

	// ── Account settings handlers ───────────────────────────────
	const handleChangePassword = async () => {
		setAccountError("");
		if (changePwData.newPassword !== changePwData.confirmPassword) {
			setAccountError("New passwords do not match");
			return;
		}
		if (changePwData.newPassword.length < 8) {
			setAccountError("New password must be at least 8 characters");
			return;
		}
		setAccountSaving(true);
		try {
			const res = await fetch("/api/auth/artist/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					currentPassword: changePwData.currentPassword,
					newPassword: changePwData.newPassword,
				}),
			});
			const result = await res.json();
			if (result.success) {
				toast({
					title: "Password Changed",
					description: "Your password has been updated successfully",
				});
				setChangePwData({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
			} else {
				setAccountError(
					result.error?.message || "Failed to change password",
				);
			}
		} catch {
			setAccountError("Failed to change password");
		} finally {
			setAccountSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (
			!confirm(
				"Are you sure you want to delete your account? This action cannot be undone. All your shows and data will be permanently deleted.",
			)
		)
			return;
		if (
			!confirm(
				"This is your final confirmation. Delete your account permanently?",
			)
		)
			return;
		try {
			const res = await fetch(`/api/artists/${artistId}`, {
				method: "DELETE",
			});
			const result = await res.json();
			if (result.success) {
				await fetch("/api/auth/logout", { method: "POST" });
				localStorage.removeItem("artistProfile");
				router.push("/");
			} else {
				toast({
					title: "Error",
					description:
						result.error?.message || "Failed to delete account",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to delete account",
				variant: "destructive",
			});
		}
	};

	// ══════════════════════════════════════════════════════════════
	// ██  MAIN DASHBOARD RENDER  ██
	// ══════════════════════════════════════════════════════════════
	return (
		<div className="h-screen bg-[#0a0618] text-white flex relative overflow-hidden">
			<AnimationStyles />

			{/* Ambient background */}
			<div className="fixed inset-0 pointer-events-none z-0">
				<div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px]" />
				<div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-pink-600/8 blur-[120px]" />
			</div>

			{/* Mobile Sidebar Backdrop */}
			{isMobileMenuOpen && (
				<div
					className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
			<aside className={`w-52 flex-shrink-0 fixed md:sticky top-0 h-screen bg-[#07031a]/95 backdrop-blur-xl border-r border-purple-500/15 flex flex-col z-40 md:z-20 overflow-hidden transition-transform duration-300 md:translate-x-0 ${
				isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
			}`}>
				{/* Logo */}
				<div className="p-4 pb-3 border-b border-purple-500/10 flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<FameLinkLogo width={30} height={30} />
						<div>
							<p className="text-sm font-bold text-white leading-tight">FameLink</p>
							<p className="text-[9px] text-purple-400/40 tracking-widest uppercase">Artist Portal</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden text-purple-300 hover:text-white hover:bg-white/5 h-8 w-8"
						onClick={() => setIsMobileMenuOpen(false)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Nav Items */}
				<nav className="flex-1 p-2.5 space-y-0.5 overflow-hidden">
					{([
						{ id: "dashboard" as const, label: "Dashboard", icon: <Sparkles className="h-4 w-4" />, badge: 0 },
						{ id: "shows" as const, label: "My Shows", icon: <Music className="h-4 w-4" />, badge: 0 },
						{ id: "logistics" as const, label: "My Logistics Profile", icon: <CalendarDays className="h-4 w-4" />, badge: 0 },
						{ id: "documents" as const, label: "My Documents", icon: <FileText className="h-4 w-4" />, badge: 0 },
						{ id: "account" as const, label: "Account", icon: <Settings className="h-4 w-4" />, badge: 0 },
					]).map((item) => (
						<button
							key={item.id}
							onClick={() => {
								setActiveSection(item.id);
								setIsMobileMenuOpen(false);
							}}
							className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left ${activeSection === item.id
								? "bg-purple-600/25 text-white border border-purple-500/30 shadow-sm shadow-purple-500/10"
								: "text-purple-200/50 hover:text-white hover:bg-white/5 border border-transparent"
								}`}
						>
							<span className={activeSection === item.id ? "text-purple-400" : "text-purple-400/40"}>{item.icon}</span>
							<span className="flex-1 truncate">{item.label}</span>
							{item.badge > 0 && (
								<span className="bg-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
									{item.badge}
								</span>
							)}
						</button>
					))}
				</nav>

				{/* Sign out */}
				<div className="p-3 border-t border-purple-500/10">
					<button
						onClick={() => {
							handleLogout();
							setIsMobileMenuOpen(false);
						}}
						className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-200/40 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
					>
						<LogOut className="h-4 w-4" />
						<span>Sign Out</span>
					</button>
				</div>
			</aside>

			{/* ── MAIN CONTENT AREA ────────────────────────────────────── */}
			<div className="flex-1 min-w-0 flex flex-col relative z-10 h-screen overflow-y-auto">
				{/* Mobile Top Navigation Header */}
				<header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#07031a]/85 backdrop-blur-md border-b border-purple-500/15 sticky top-0 z-30 shrink-0">
					<button
						onClick={() => setIsMobileMenuOpen(true)}
						className="p-2 rounded-lg text-purple-300 hover:text-white hover:bg-white/5 transition-colors"
						aria-label="Open menu"
					>
						<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<div className="flex items-center gap-2">
						<FameLinkLogo width={24} height={24} />
						<span className="font-bold text-sm tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">FameLink</span>
					</div>
					<div className="w-9" />
				</header>

				{/* Profile Header */}
				{activeSection === "dashboard" && (
					<div className="px-4 sm:px-6 pt-6 sm:pt-10 pb-6">
						<div className="flex flex-col gap-6">
							{/* Top row: Avatar + Details */}
							<div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
								{/* Avatar */}
								<div className="relative flex-shrink-0">
									<div className="w-[76px] h-[76px] rounded-full bg-[#bf1ed4] flex items-center justify-center shadow-lg shadow-purple-500/10">
										{profileImage ? (
											<img src={getMediaUrl(profileImage)} alt="Profile" className="w-[76px] h-[76px] rounded-full object-cover" />
										) : (
											<User className="h-9 w-9 text-white" />
										)}
									</div>
									{isProfileComplete && (
										<div className="absolute bottom-0 right-0 w-5 h-5 bg-[#00d885] rounded-full flex items-center justify-center border-[2.5px] border-[#0a0618]">
											<Check className="h-3 w-3 text-white" strokeWidth={3} />
										</div>
									)}
								</div>

								{/* Name + meta */}
								<div className="flex-1 min-w-0 text-center sm:text-left">
									<p className="text-purple-300/40 text-[10px] uppercase tracking-widest font-semibold mb-1">Welcome back</p>
									<h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2 truncate">{profile.artistName}</h1>
									<div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
										<Badge className={`rounded text-[10px] font-bold px-2 py-0.5 border-0 ${planType !== "free" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/60 hover:bg-white/10"}`}>
											{planType !== "free" ? `✦ ${planType.replace(/_/g, " ").toUpperCase()}` : "FREE"}
										</Badge>
										<span className="flex items-center gap-1.5 text-xs text-white/50"><Mail className="h-3.5 w-3.5" />{profile.email}</span>
										{(profile.country || profile.city) && (
											<span className="flex items-center gap-1.5 text-xs text-white/50"><MapPin className="h-3.5 w-3.5" />{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
										)}
									</div>
								</div>
							</div>

							{/* Stat pills + Membership Card */}
							<div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 flex-wrap">
								<div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors w-full sm:w-auto justify-center" onClick={() => setActiveSection("shows")}>
									<Sparkles className="h-3.5 w-3.5 text-[#ff66e5]" />
									<span className="text-[13px] text-white font-medium">{shows.length} Shows</span>
								</div>
								<div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors w-full sm:w-auto justify-center" onClick={() => setActiveSection("event-tasks")}>
									<Calendar className="h-3.5 w-3.5 text-[#9cbdf0]" />
									<span className="text-[13px] text-white font-medium">{eventParticipations.filter((p) => p.status !== "declined").length} Events</span>
								</div>
								{(() => {
									const activeEvent = eventParticipations.find((p) => p.status === "submitted" || p.status === "confirmed") || eventRequests.find((r) => r.status === "accepted");
									if (!activeEvent) return null;
									return (
										<div className="rounded-full shadow-lg shadow-black/20 w-full sm:w-auto flex justify-center">
											<MembershipCard
												artistName={profile?.artistName || "Artist"}
												artistId={artistId}
												eventId={activeEvent.eventId}
												profileImage={profile?.image_url ? getMediaUrl(profile.image_url, profile.image_url) : undefined}
												isFameLinkArtist={true}
												rehearsalCheckedIn={rehearsalCheckedIn}
												performanceCheckedIn={performanceCheckedIn}
											/>
										</div>
									);
								})()}
							</div>
						</div>
					</div>
				)}

				{/* ── SECTION CONTENT ── */}
				<main className="flex-1 p-4 sm:p-6">

					{/* Finish Setting Up banner — shown on dashboard after dismissing popup */}
					{activeSection === "dashboard" && onboardingDismissed && (
						<FinishSettingUpBanner
							artistId={artistId}
							shows={shows}
							pendingRequests={eventRequests.filter((r) => r.status === "pending")}
						pendingParticipations={eventParticipations.filter((p) => {
									const perfSlots = (p as any).performanceDates?.length || p.event?.showDates?.length || 0;
									const submitted = (p as any).showCount ?? 0;
									// Show if there are unfilled slots, or no slots defined but no show submitted yet
									return perfSlots > 0 ? submitted < perfSlots : submitted === 0;
								})}

							hasLogistics={false}
							onOpenModal={() => setOnboardingOpen(true)}
						/>
					)}

					{/* Hidden Modal Trigger from Dashboard */}
					{activeSection !== "event-tasks" && initialSection && selectedEventInviteId && (
						<div className="hidden">
							<InvitesContracts
								key={modalTriggerKey}
								artistId={artistId}
								artistName={profile?.artistName || "Artist"}
								artistEmail={profile?.email || ""}
								initialEventId={selectedEventInviteId}
								initialSection={initialSection}
								onBack={() => {
									setSelectedEventInviteId(null);
									setInitialSection(null);
									fetchEventParticipations();
								}}
								onClose={() => {
									setSelectedEventInviteId(null);
									setInitialSection(null);
									fetchEventParticipations();
								}}
							/>
						</div>
					)}

					{/* Event Tasks */}
					{activeSection === "event-tasks" && (
						<div className="space-y-6">
							<InvitesContracts
								artistId={artistId}
								artistName={profile?.artistName || "Artist"}
								artistEmail={profile?.email || ""}
								initialEventId={selectedEventInviteId}
								initialSection={initialSection}
								onBack={() => {
									setSelectedEventInviteId(null);
									setInitialSection(null);
									fetchEventParticipations();
								}}
								onClose={() => {
									setSelectedEventInviteId(null);
									setInitialSection(null);
									fetchEventParticipations();
								}}
							/>
						</div>
					)}

					{/* Logistics Section */}
					{activeSection === "logistics" && (
						<LogisticsSection artistId={artistId} />
					)}

					{/* Documents Section */}
					{activeSection === "documents" && (
						<DocumentsSection artistId={artistId} />
					)}

					{/* Messages Section */}
					{activeSection === "messages" && (
						selectedEventInviteId ? (
							<div className="space-y-6">
								<InvitesContracts
									artistId={artistId}
									artistName={profile?.artistName || "Artist"}
									artistEmail={profile?.email || ""}
									initialEventId={selectedEventInviteId}
									initialSection={initialSection}
									onBack={() => {
										setSelectedEventInviteId(null);
										setInitialSection(null);
									}}
								/>
							</div>
						) : (
							<div className="space-y-6">
								<div className="flex items-center gap-4 mb-4">
									<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
										<MessageSquare className="h-6 w-6 text-purple-400" />
									</div>
									<div>
										<h1 className="text-2xl font-bold text-white leading-tight">Messages</h1>
										<p className="text-purple-300/60 text-sm mt-0.5">All event-linked conversations.</p>
									</div>
								</div>

								<div className="rounded-2xl border border-purple-500/20 bg-white/5 backdrop-blur-xl overflow-hidden">
									{eventParticipations.filter((p) => p.status === "submitted" || p.status === "confirmed").length === 0 ? (
										<div className="p-12 text-center">
											<MessageSquare className="h-10 w-10 text-purple-400/20 mx-auto mb-3" />
											<p className="text-purple-200/50">No active event chats. Join an event to start messaging.</p>
										</div>
									) : (
										<div className="flex flex-col">
											{eventParticipations.filter((p) => p.status === "submitted" || p.status === "confirmed").map((p) => (
												<div
													key={p.id}
													onClick={() => setSelectedEventInviteId(p.eventId)}
													className="relative flex items-center p-4 sm:p-6 hover:bg-white/5 transition-colors border-b border-purple-500/10 last:border-0 cursor-pointer group"
												>
													{unreadMessageCounts[p.eventId] > 0 && (
														<div className="absolute left-4 w-2 h-2 rounded-full bg-pink-500 shrink-0" />
													)}
													<div className={`flex-1 min-w-0 ${unreadMessageCounts[p.eventId] > 0 ? 'ml-6' : 'ml-2'}`}>
														<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 gap-2">
															<div className="flex items-center gap-3 truncate">
																<span className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors truncate">{p.event?.name || "Unknown Event"}</span>
																<Badge className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] h-5 px-2 py-0 rounded-full font-medium shrink-0">Event Chat</Badge>
																<span className="text-xs text-purple-300/50 truncate hidden sm:inline-block">· {p.event?.venueName || "General Coordination"}</span>
															</div>
															<span className="text-[11px] text-purple-300/40 shrink-0">
																{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ""}
															</span>
														</div>
														<p className="text-sm text-purple-200/70 truncate pr-4">
															Tap to view event details and send messages regarding this event.
														</p>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)
					)}

					{/* Account */}
					{activeSection === "account" && (
						<AccountSection
							artistId={artistId}
							profile={profile}
							onUpdateProfile={async (updates) => {
								const res = await fetch(`/api/artists/${artistId}`, {
									method: "PATCH",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify(updates)
								});
								const json = await res.json();
								if (!json.success) throw new Error(json.error?.message || "Failed to update profile");
								setProfile(prev => {
									if (!prev) return json.data;
									return { ...prev, ...json.data };
								});
							}}
							onLogout={handleLogout}
						/>
					)}

					{/* Dashboard + Shows */}
					{(activeSection === "dashboard" || activeSection === "shows") && (
						<div className={activeSection === "dashboard" ? "grid grid-cols-1 xl:grid-cols-12 gap-6" : ""}>
							{/* ── My Shows Section ────────────────────────────── */}
							{(activeSection === "dashboard" || activeSection === "shows") && (
								<section className={`${activeSection === "dashboard" ? "xl:col-span-8" : ""} min-w-0 border rounded-2xl border-purple-500/20 p-4 sm:p-5`}>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
												<Sparkles className="h-6 w-6 text-purple-400" />
											</div>
											<div>
												<h2 className="text-2xl font-bold text-white">My Shows</h2>
												{activeSection === "dashboard" ? (
													<p className="text-[#a491b5] text-[13px] mt-1 font-medium">
														Showing {shows.filter(s => s.pinned).length > 0
															? `pinned ${shows.filter(s => s.pinned).length}`
															: `latest ${Math.min(shows.length, 2)}`} of {shows.length} — star up to 3 to pin them here
													</p>
												) : (
													<p className="text-purple-300/60 text-sm mt-1">Your original show profiles — reuse them across events.</p>
												)}
											</div>
										</div>
										<Button asChild className="bg-[#bf1ed4] hover:bg-[#a61bb8] text-white rounded-xl gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 h-10 px-5 w-full sm:w-auto shrink-0">
											<Link href={`/famelink/${artistId}/shows/create`}>
												<Plus className="h-4 w-4" />
												Create New Show
											</Link>
										</Button>
									</div>

									{activeSection === "shows" && (
										<div className="mb-6 bg-[#2d1b36]/50 rounded-xl p-4 flex items-center gap-3 border border-purple-500/20">
											<ShieldCheck className="h-5 w-5 text-purple-300/70 shrink-0" />
											<p className="text-sm text-purple-200/80 leading-relaxed">
												The shows on this page are your <span className="text-[#ff66e5] font-semibold">originals</span>. Every time you <span className="text-[#ff66e5] font-semibold">Share Show Info</span>, a <span className="text-[#ff66e5] font-semibold">copy</span> is created for that specific event — so each organizer gets their own version while your originals stay untouched here.
											</p>
										</div>
									)}



									{/* Shows Grid */}
									{shows.length === 0 ? (
										<div className="glass-card rounded-2xl p-8 sm:p-16 text-center border border-dashed border-purple-500/20">
											<div className="floating">
												<div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
													<Music className="h-10 w-10 text-purple-400/40" />
												</div>
											</div>
											<h3 className="text-xl font-semibold text-white mb-2">
												No Shows Yet
											</h3>
											<p className="text-purple-200/50 mb-8 max-w-sm mx-auto">
												Create your first show to start building
												your FameLink portfolio
											</p>
											<Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 shadow-lg shadow-purple-500/20 px-8 py-3 text-base transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5">
												<Link
													href={`/famelink/${artistId}/shows/create`}
												>
													<Plus className="h-5 w-5" />
													Create Your First Show
												</Link>
											</Button>
										</div>
									) : (
										<div className="grid gap-5 grid-cols-1 xl:grid-cols-2">
											{(activeSection === "dashboard" ? (shows.filter(s => s.pinned).length > 0 ? shows.filter(s => s.pinned) : shows.slice(0, 2)) : shows).map((show, idx) => (
												<div
													key={show.id}
													className="show-card-enter flex flex-col h-full"
													style={{
														animationDelay: `${idx * 80}ms`,
														animationFillMode: "both",
													}}
												>
													<div className="bg-[#1c122f] border border-[#3e266b]/40 rounded-[20px] p-5 flex flex-col h-full relative shadow-lg shadow-purple-900/10 transition-all hover:border-[#523381]/80 hover:-translate-y-0.5">
														<button onClick={(e) => { e.preventDefault(); handleTogglePinnedShow(show.id, !!show.pinned); }} className="absolute top-5 right-5 p-1.5 hover:bg-white/5 rounded-full transition-colors z-10">
															<Star className={`h-[18px] w-[18px] ${show.pinned ? "fill-[#d4b3ff] text-[#d4b3ff]" : "text-[#7a6094]"}`} />
														</button>

														{/* Header */}
														<div className="flex gap-4 items-start">
															{show.profileImage ? (
																<div className="w-[48px] h-[48px] rounded-[12px] overflow-hidden shrink-0 bg-[#2d1b4e]/30 border border-[#362354]/60">
																	<img
																		src={show.profileImage.startsWith("gs://") ? getMediaUrl(show.profileImage) : `/api/media/${show.profileImage}`}
																		alt={show.name}
																		className="w-full h-full object-cover"
																	/>
																</div>
															) : (
																<div className="w-[48px] h-[48px] rounded-[12px] bg-[#4d194d] border border-[#5d1f5d]/60 flex items-center justify-center shrink-0">
																	<Music className="h-5 w-5 text-[#e879f9]" />
																</div>
															)}
															<div className="flex-1 pr-8">
																<h3 className="text-[17px] font-bold text-white leading-tight">{show.name}</h3>
																<div className="flex flex-wrap items-center gap-2 mt-2">
																	{(show.performanceType || show.style) && (
																		<span className="bg-[#381e42] text-[#d8a4f0] text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase">
																			{show.performanceType || show.style}
																		</span>
																	)}
																	{show.duration && (
																		<span className="bg-[#2d1b36] text-[#b895c8] text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase">
																			{show.duration} min
																		</span>
																	)}
																	{show.members && show.members.length > 0 && (
																		<span className="bg-[#2d1b36] text-[#b895c8] text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase">
																			{show.members.length} performers
																		</span>
																	)}
																</div>
															</div>
														</div>

														{/* Biography */}
														{(show.biography || show.description) && (
															<p className="text-[13px] text-[#a491b5] mt-4 line-clamp-2 leading-relaxed font-medium">
																{show.biography || show.description}
															</p>
														)}

														{/* Details Grid */}
														<div className="mt-4 grid grid-cols-[65px_1fr] gap-y-1.5 gap-x-2 text-[12px]">
															<span className="text-[#826a97] font-medium">Music</span>
															<span className="text-[#cba5e8] truncate">{show.musicTrack?.file_url ? (show.musicTrack.file_url.split('/').pop()?.split('?')[0] || "Uploaded Audio") : "None"}</span>

															<span className="text-[#826a97] font-medium">Tech</span>
															<span className="text-[#cba5e8] truncate">{show.equipment || show.techRider || "Standard"}</span>

															<span className="text-[#826a97] font-medium">Lights</span>
															<span className="text-[#cba5e8] truncate">{show.lightRequests || show.manualLightColor || "Standard wash"}</span>

															<span className="text-[#826a97] font-medium">Costume</span>
															<span className="text-[#cba5e8] truncate">{show.costumeColor || show.manualCostumeColor || "Not specified"}</span>
														</div>

														<div className="flex-1" /> {/* Spacer */}

														{/* FameLink URL Box */}
														<div className="mt-5 bg-[#231835] border border-[#3e266b]/30 rounded-[10px] p-2.5 flex items-center justify-between gap-3">
															<div className="flex items-center gap-2 overflow-hidden">
																<span className="text-[9px] text-[#826a97] font-bold uppercase tracking-wider shrink-0">FAMELINK PROFILE PAGE</span>
																<code className="text-[12px] text-[#cba5e8] font-mono truncate">/show/{show.slug}</code>
															</div>
															<button onClick={() => copyFameLink(show.slug)} className="text-[#826a97] hover:text-white transition-colors shrink-0 p-1">
																{copiedSlug === show.slug ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
															</button>
														</div>

														{/* Bottom Actions */}
														<div className="mt-4 pt-4 border-t border-[#3e266b]/30 flex items-center justify-between">
															<div className="flex items-center gap-5">
																<Link href={`/show/${show.slug}`} className="flex items-center gap-1.5 text-[13px] font-semibold text-white hover:text-purple-300 transition-colors">
																	<Eye className="h-4 w-4 text-[#a491b5]" /> View
																</Link>
																<Link href={`/famelink/${artistId}/shows/${show.id}/edit`} className="flex items-center gap-1.5 text-[13px] font-semibold text-white hover:text-purple-300 transition-colors">
																	<Edit className="h-4 w-4 text-[#a491b5]" /> Edit
																</Link>
																<button onClick={() => setShareModalOpen(true)} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#f472b6] hover:text-[#fbcfe8] transition-colors">
																	<Share2 className="h-4 w-4" /> Share
																</button>
																<button
																	onClick={() => handleDuplicateShow(show.id)}
																	disabled={duplicatingShowId !== null}
																	className="flex items-center gap-1.5 text-[13px] font-semibold text-white hover:text-purple-300 transition-colors disabled:opacity-50"
																>
																	{duplicatingShowId === show.id ? (
																		<Loader2 className="h-4 w-4 text-[#a491b5] animate-spin" />
																	) : (
																		<Copy className="h-4 w-4 text-[#a491b5]" />
																	)}
																	Duplicate
																</button>
															</div>
															<button onClick={() => handleDeleteShow(show.id)} className="text-[#e16875] hover:text-red-400 transition-colors p-1">
																<Trash2 className="h-4 w-4" />
															</button>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</section>
							)}

							{/* ── FameManager Event Requests (HIDDEN - uncomment to restore) ── */}
							{false && (
								<section className="mb-14">
									<div className="mb-6">
										<h2 className="text-2xl font-bold text-white flex items-center gap-3">
											<div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
												<Mail className="h-5 w-5 text-pink-400" />
											</div>
											FameManager Event Requests
										</h2>
										<p className="text-purple-300/50 text-sm mt-1.5 ml-[52px]">
											Respond to booking inquiries from organizers
										</p>
									</div>

									{eventRequests.length === 0 ? (
										<div className="glass-card rounded-2xl p-12 text-center">
											<div className="floating">
												<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
													<Calendar className="h-8 w-8 text-purple-400/30" />
												</div>
											</div>
											<p className="text-purple-200/50 max-w-md mx-auto">
												No event requests yet. When stage
												managers invite you to events, they'll
												appear here in real-time.
											</p>
										</div>
									) : (
										<div className="space-y-3">
											{eventRequests.map((req) => {
												const isPending =
													req.status === "pending";
												const isAccepted =
													req.status === "accepted";
												const isDeclined =
													req.status === "declined";
												const isExpanded =
													expandedRequestId === req.id;
												const step =
													requestStep[req.id] || "select";
												const selected =
													selectedShowIds[req.id] || [];
												const isResponding =
													respondingRequestId === req.id;

												return (
													<div
														key={req.id}
														className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? "ring-1 ring-purple-500/30" : ""}`}
													>
														{/* Request Header */}
														<div
															className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition-colors duration-200"
															onClick={() =>
																setExpandedRequestId(
																	isExpanded
																		? null
																		: req.id,
																)
															}
														>
															<div className="flex items-center gap-3.5 flex-1 min-w-0">
																<div
																	className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPending ? "bg-yellow-400 pulse-dot" : isAccepted ? "bg-green-400" : "bg-red-400"}`}
																/>
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2.5 flex-wrap">
																		<span className="font-semibold text-white text-sm truncate">
																			{req.event
																				?.name ||
																				"Unknown Event"}
																		</span>
																		<Badge
																			className={`text-[11px] rounded-lg border-0 ${isPending ? "bg-yellow-500/15 text-yellow-300" : isAccepted ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}
																		>
																			{req.status
																				.charAt(
																					0,
																				)
																				.toUpperCase() +
																				req.status.slice(
																					1,
																				)}
																		</Badge>
																		{(unreadMessageCounts[
																			req.eventId
																		] || 0) > 0 && (
																				<Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] animate-pulse rounded-lg">
																					<MessageSquare className="h-3 w-3 mr-1" />
																					{
																						unreadMessageCounts[
																						req
																							.eventId
																						]
																					}{" "}
																					new
																				</Badge>
																			)}
																	</div>
																	<div className="flex items-center gap-3 text-xs text-purple-300/40 mt-1">
																		{req.event
																			?.startDate && (
																				<span className="flex items-center gap-1">
																					<Calendar className="h-3 w-3" />
																					{new Date(
																						req
																							.event
																							.startDate,
																					).toLocaleDateString(
																						"en-US",
																						{
																							month: "short",
																							day: "numeric",
																						},
																					)}
																					{req
																						.event
																						.endDate &&
																						` – ${new Date(req.event.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
																				</span>
																			)}
																		{req.event
																			?.venueName && (
																				<span className="flex items-center gap-1">
																					<MapPin className="h-3 w-3" />
																					{
																						req
																							.event
																							.venueName
																					}
																				</span>
																			)}
																	</div>
																</div>
															</div>
															<ChevronDown
																className={`h-4 w-4 text-purple-400/50 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
															/>
														</div>

														{/* Expanded Content */}
														{isExpanded && (
															<div className="border-t border-white/5 px-5 py-5 animate-fade-in">
																{/* Step Indicator */}
																{isPending && (
																	<div className="flex items-center gap-2 mb-5 text-sm">
																		{[
																			{
																				label: "Select Show",
																				num: 1,
																				active:
																					step ===
																					"select",
																				done:
																					step !==
																					"select",
																			},
																			{
																				label: "Confirm",
																				num: 2,
																				active:
																					step ===
																					"confirm",
																				done:
																					step ===
																					"sent",
																			},
																			{
																				label: "Sent",
																				num: 3,
																				active:
																					step ===
																					"sent",
																				done: false,
																			},
																		].map(
																			(s, i) => (
																				<>
																					{i >
																						0 && (
																							<div className="w-8 h-px bg-purple-700/30" />
																						)}
																					<div
																						key={
																							s.num
																						}
																						className={`flex items-center gap-1.5 ${s.active ? "text-pink-400" : s.done ? "text-green-400" : "text-purple-500/50"}`}
																					>
																						{s.done ? (
																							<CheckCircle className="h-4 w-4" />
																						) : (
																							<span
																								className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${s.active ? "bg-pink-500 text-white" : "bg-purple-800/50 text-purple-400/50"}`}
																							>
																								{
																									s.num
																								}
																							</span>
																						)}
																						<span className="font-medium text-xs">
																							{
																								s.label
																							}
																						</span>
																					</div>
																				</>
																			),
																		)}
																	</div>
																)}

																{/* Event Details */}
																<div className="bg-white/3 rounded-xl p-4 mb-4 border border-white/5">
																	<h3 className="text-base font-semibold text-white">
																		{req.event
																			?.name ||
																			"Unknown Event"}
																	</h3>
																	<p className="text-purple-200/50 text-sm">
																		{
																			req.event
																				?.venueName
																		}
																	</p>
																	<div className="flex items-center gap-4 mt-2 text-xs text-purple-300/40">
																		{req.event
																			?.startDate && (
																				<span className="flex items-center gap-1">
																					<Calendar className="h-3 w-3" />
																					{new Date(
																						req
																							.event
																							.startDate,
																					).toLocaleDateString(
																						"en-US",
																						{
																							month: "short",
																							day: "numeric",
																							year: "numeric",
																						},
																					)}
																					{req
																						.event
																						.endDate &&
																						` – ${new Date(req.event.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
																				</span>
																			)}
																		{req.stageManagerName && (
																			<span className="flex items-center gap-1">
																				<User className="h-3 w-3" />
																				{
																					req.stageManagerName
																				}
																			</span>
																		)}
																	</div>
																	{req.message && (
																		<div className="mt-3 pt-3 border-t border-white/5">
																			<p className="text-xs text-purple-200/50 italic">
																				"
																				{
																					req.message
																				}
																				"
																			</p>
																		</div>
																	)}
																</div>

																{/* Personal Messages */}
																{(unreadMessageCounts[
																	req.eventId
																] || 0) > 0 &&
																	viewingMessagesForEvent !==
																	req.eventId && (
																		<Button
																			onClick={(
																				e,
																			) => {
																				e.stopPropagation();
																				setViewingMessagesForEvent(
																					req.eventId,
																				);
																				fetchPersonalMessagesForEvent(
																					req.eventId,
																				);
																			}}
																			className="mb-4 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/20 rounded-xl gap-2 w-full transition-all duration-200"
																		>
																			<MessageSquare className="h-4 w-4" />
																			View{" "}
																			{
																				unreadMessageCounts[
																				req
																					.eventId
																				]
																			}{" "}
																			New Message
																			{unreadMessageCounts[
																				req
																					.eventId
																			] > 1
																				? "s"
																				: ""}
																		</Button>
																	)}

																{viewingMessagesForEvent ===
																	req.eventId && (
																		<div className="mb-4 bg-white/3 rounded-xl p-4 border border-white/5">
																			<div className="flex items-center justify-between mb-3">
																				<h4 className="text-white font-semibold text-sm flex items-center gap-2">
																					<MessageSquare className="h-4 w-4 text-pink-400" />{" "}
																					Messages
																				</h4>
																				<Button
																					size="sm"
																					variant="ghost"
																					onClick={() =>
																						setViewingMessagesForEvent(
																							null,
																						)
																					}
																					className="text-purple-400/50 hover:text-white h-7 w-7 p-0 rounded-lg"
																				>
																					<X className="h-3.5 w-3.5" />
																				</Button>
																			</div>
																			<div className="space-y-2 max-h-60 overflow-y-auto mb-3">
																				{(
																					personalMessages[
																					req
																						.eventId
																					] || []
																				).map(
																					(
																						msg: any,
																						i: number,
																					) => (
																						<div
																							key={
																								i
																							}
																							className={`p-3 rounded-xl text-sm ${msg.senderRole === "artist" ? "bg-purple-500/10 ml-8 border border-purple-500/15" : "bg-white/5 mr-8 border border-white/5"}`}
																						>
																							<div className="flex items-center gap-2 mb-1">
																								<span className="font-medium text-xs text-purple-300/70">
																									{
																										msg.senderName
																									}
																								</span>
																								<span className="text-[10px] text-purple-400/30">
																									{new Date(
																										msg.createdAt,
																									).toLocaleString()}
																								</span>
																							</div>
																							<p className="text-purple-100/80">
																								{
																									msg.message
																								}
																							</p>
																						</div>
																					),
																				)}
																			</div>
																			<div className="flex gap-2">
																				<Input
																					value={
																						replyMessage
																					}
																					onChange={(
																						e,
																					) =>
																						setReplyMessage(
																							e
																								.target
																								.value,
																						)
																					}
																					placeholder="Type a reply..."
																					className="bg-white/5 border-white/10 text-white rounded-xl text-sm"
																					onKeyDown={(
																						e,
																					) => {
																						if (
																							e.key ===
																							"Enter" &&
																							!e.shiftKey
																						) {
																							e.preventDefault();
																							handleSendReply(
																								req.eventId,
																							);
																						}
																					}}
																				/>
																				<Button
																					onClick={() =>
																						handleSendReply(
																							req.eventId,
																						)
																					}
																					disabled={
																						sendingReply ||
																						!replyMessage.trim()
																					}
																					className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-4"
																				>
																					{sendingReply ? (
																						<Loader2 className="h-4 w-4 animate-spin" />
																					) : (
																						<Send className="h-4 w-4" />
																					)}
																				</Button>
																			</div>
																		</div>
																	)}

																{/* Step: Select Shows */}
																{isPending &&
																	step ===
																	"select" && (
																		<div>
																			<div className="flex items-center justify-between mb-3">
																				<div>
																					<h4 className="text-white font-semibold">
																						Select
																						Shows
																						to
																						Offer
																					</h4>
																					<p className="text-purple-200/40 text-xs">
																						Select
																						one
																						or
																						more
																						shows
																						to
																						send
																						to
																						the
																						organizer
																					</p>
																				</div>
																				{selected.length >
																					0 && (
																						<Badge className="bg-green-500/15 text-green-300 border border-green-500/20 rounded-lg">
																							{
																								selected.length
																							}{" "}
																							selected
																						</Badge>
																					)}
																			</div>

																			{shows.length ===
																				0 ? (
																				<div className="text-center py-8">
																					<Music className="h-10 w-10 text-purple-400/20 mx-auto mb-3" />
																					<p className="text-purple-200/50 text-sm mb-4">
																						You
																						don't
																						have
																						any
																						shows
																						yet.
																					</p>
																					<Link
																						href={`/famelink/${artistId}/shows/create`}
																					>
																						<Button className="bg-purple-600 hover:bg-purple-500 rounded-xl gap-2">
																							Create
																							a
																							Show
																							First
																						</Button>
																					</Link>
																				</div>
																			) : (
																				<div className="space-y-2 mb-4">
																					{shows.map(
																						(
																							show,
																						) => {
																							const isSelected =
																								selected.includes(
																									show.id,
																								);
																							return (
																								<div
																									key={
																										show.id
																									}
																									onClick={() =>
																										toggleShowSelection(
																											req.id,
																											show.id,
																										)
																									}
																									className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${isSelected
																										? "border-pink-500/40 bg-pink-500/8 shadow-lg shadow-pink-500/5"
																										: "border-white/5 bg-white/3 hover:border-purple-500/30 hover:bg-white/5"
																										}`}
																								>
																									<div
																										className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected ? "bg-pink-500 shadow-lg shadow-pink-500/30" : "bg-purple-800/50"}`}
																									>
																										{isSelected ? (
																											<Check className="h-4 w-4 text-white" />
																										) : (
																											<Music className="h-4 w-4 text-purple-400/60" />
																										)}
																									</div>
																									<div className="flex-1 min-w-0">
																										<p className="text-white font-medium text-sm">
																											{
																												show.name
																											}
																										</p>
																										<p className="text-purple-200/40 text-xs">
																											{show.style &&
																												`${show.style} · `}
																											<Clock className="h-3 w-3 inline" />{" "}
																											{
																												show.duration
																											}{" "}
																											min
																										</p>
																									</div>
																									<Badge
																										className={`text-xs rounded-lg ${isSelected ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" : "bg-white/5 text-purple-300/50 border border-white/10"}`}
																									>
																										{isSelected
																											? "Selected"
																											: "Select"}
																									</Badge>
																								</div>
																							);
																						},
																					)}
																				</div>
																			)}

																			<div className="flex gap-3">
																				<Button
																					onClick={() =>
																						handleContinueWithShows(
																							req.id,
																						)
																					}
																					disabled={
																						selected.length ===
																						0
																					}
																					className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl gap-2 shadow-lg shadow-pink-500/20 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
																				>
																					Continue
																					with{" "}
																					{
																						selected.length
																					}{" "}
																					show
																					{selected.length !==
																						1
																						? "s"
																						: ""}
																				</Button>
																				<Button
																					variant="ghost"
																					onClick={() =>
																						handleDeclineRequest(
																							req.id,
																						)
																					}
																					disabled={
																						isResponding
																					}
																					className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl gap-1.5"
																				>
																					<X className="h-4 w-4" />
																					Decline
																					Request
																				</Button>
																			</div>
																		</div>
																	)}

																{/* Step: Confirm */}
																{isPending &&
																	step ===
																	"confirm" && (
																		<div>
																			<div className="bg-white/3 rounded-xl p-4 mb-4 border border-white/5">
																				<h4 className="text-white font-semibold mb-3">
																					Confirm
																					Your
																					Response
																				</h4>
																				<p className="text-purple-200/40 text-xs mb-3">
																					You're
																					offering{" "}
																					{
																						selected.length
																					}{" "}
																					show
																					{selected.length >
																						1
																						? "s"
																						: ""}
																					:
																				</p>
																				<div className="space-y-2 mb-4">
																					{selected.map(
																						(
																							showId,
																						) => {
																							const show =
																								shows.find(
																									(
																										s,
																									) =>
																										s.id ===
																										showId,
																								);
																							if (
																								!show
																							)
																								return null;
																							return (
																								<div
																									key={
																										showId
																									}
																									className="flex items-center gap-3 p-2.5 bg-purple-500/8 rounded-xl border border-purple-500/10"
																								>
																									<div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
																										<Music className="h-4 w-4 text-pink-400" />
																									</div>
																									<div>
																										<p className="text-white text-sm font-medium">
																											{
																												show.name
																											}
																										</p>
																										<p className="text-purple-200/40 text-xs">
																											{show.style &&
																												`${show.style} · `}
																											{
																												show.duration
																											}{" "}
																											min
																										</p>
																									</div>
																								</div>
																							);
																						},
																					)}
																				</div>
																				<p className="text-xs text-purple-200/30">
																					By
																					accepting,
																					your
																					show
																					information
																					will
																					be
																					shared
																					with
																					the
																					event
																					organizer.
																					They
																					may
																					make
																					event-specific
																					adjustments,
																					but
																					your
																					original
																					show
																					profile
																					will
																					remain
																					unchanged.
																				</p>
																			</div>
																			<div className="flex gap-3">
																				<Button
																					onClick={() =>
																						handleAcceptRequest(
																							req.id,
																						)
																					}
																					disabled={
																						isResponding
																					}
																					className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl gap-2 shadow-lg shadow-green-500/20 transition-all duration-300"
																				>
																					{isResponding ? (
																						<Loader2 className="h-4 w-4 animate-spin mr-2" />
																					) : (
																						<Check className="h-4 w-4 mr-1" />
																					)}
																					Accept
																					Event
																					Request
																				</Button>
																				<Button
																					variant="ghost"
																					onClick={() =>
																						setRequestStep(
																							(
																								prev,
																							) => ({
																								...prev,
																								[req.id]:
																									"select",
																							}),
																						)
																					}
																					disabled={
																						isResponding
																					}
																					className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
																				>
																					Back
																				</Button>
																			</div>
																		</div>
																	)}

																{/* Step: Sent / Already responded */}
																{(step === "sent" ||
																	isAccepted ||
																	isDeclined) && (
																		<div className="text-center py-6">
																			{step ===
																				"sent" ||
																				isAccepted ? (
																				<>
																					<div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-3">
																						<CheckCircle className="h-7 w-7 text-green-400" />
																					</div>
																					<p className="text-green-400 font-semibold">
																						Request
																						Accepted!
																					</p>
																					<p className="text-purple-200/40 text-sm mt-1">
																						Your
																						show
																						information
																						has
																						been
																						sent
																						to
																						the
																						organizer.
																					</p>
																				</>
																			) : (
																				<>
																					<div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-3">
																						<AlertCircle className="h-7 w-7 text-red-400" />
																					</div>
																					<p className="text-red-400 font-semibold">
																						Request
																						Declined
																					</p>
																					<p className="text-purple-200/40 text-sm mt-1">
																						You
																						declined
																						this
																						event
																						request.
																					</p>
																				</>
																			)}
																		</div>
																	)}
															</div>
														)}
													</div>
												);
											})}
										</div>
									)}
								</section>
							)}

							{/* ── My Events Section ───────────────────────────── */}
							{activeSection === "dashboard" && (
								<section className="xl:col-span-4 min-w-0 border rounded-2xl border-purple-500/20 p-5">
									<div className="mb-6">
										<h2 className="text-2xl font-bold text-white flex items-center gap-3">
											<div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
												<CalendarDays className="h-5 w-5 text-indigo-400" />
											</div>
											My Events
										</h2>
										<p className="text-purple-300/50 text-sm mt-1.5 ml-[52px]">
											Events you've joined via invite link
										</p>
									</div>

									{eventParticipations.filter(
										(p) => p.status !== "declined",
									).length === 0 ? (
										<div className="glass-card rounded-2xl p-12 text-center">
											<div className="floating">
												<div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
													<CalendarDays className="h-8 w-8 text-indigo-400/30" />
												</div>
											</div>
											<p className="text-purple-200/50 max-w-md mx-auto">
												No events yet. When you join an event via an
												invite link, it will appear here.
											</p>
										</div>
									) : (
										<div className="space-y-3">
											{eventParticipations
												.filter((p) => p.status !== "declined")
												.map((p, idx) => {
													const isExpanded =
														expandedParticipationId === p.id;
													// workflowContract/Logistics/Show are already resolved server-side with
													// artist-override-first, event-toggle-fallback priority (see
													// event-participations route's enrichment), so they alone decide —
													// an explicit per-artist "Required" isn't overridden by the event's toggle.
													const isContractEnabled = ((p as any).workflowContract ?? "Required") !== "Not Required";
													const isLogisticsEnabled = ((p as any).workflowLogistics ?? "Required") !== "Not Required";
													const isShowInfoEnabled = ((p as any).workflowShow ?? "Required") !== "Not Required";

													const getContractStatusAndAction = () => {
														const docStatus = (p as any).contractDocStatus;
														if (docStatus === "confirmed") {
															return { status: "Confirmed", actionText: "View →" };
														}
														if (docStatus === "signed") {
															return { status: "Signed", actionText: "View →" };
														}
														return {
															status: p.status === "confirmed" ? "Pending" : "Not Started",
															actionText: p.status === "confirmed" ? "Continue →" : "Start →"
														};
													};
													const contractStatus = getContractStatusAndAction();

													const modules = [
														{ id: "contract", name: "Agreement", enabled: isContractEnabled, status: contractStatus.status, actionText: contractStatus.actionText },
														{ id: "logistics", name: "Logistics", enabled: isLogisticsEnabled, status: "Not Started", actionText: "Start →" },
														{
															id: "showinfo",
															name: "Event Agenda",
															enabled: isShowInfoEnabled,
															status: (eventShowCountsMap[p.eventId] || 0) > 0 ? "Submitted" : "Not Started",
															actionText: (eventShowCountsMap[p.eventId] || 0) > 0 ? "View →" : "Start →"
														}
													].filter(m => m.enabled);

													const getDisplayDate = (start?: string, end?: string) => {
														if (!start) return "Aug 12–16, 2026";
														try {
															const s = new Date(start);
															if (!end || start === end) return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
															const e = new Date(end);
															if (s.getFullYear() !== e.getFullYear()) return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " - " + e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
															if (s.getMonth() !== e.getMonth()) return s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " - " + e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
															return s.toLocaleDateString("en-US", { month: "short" }) + " " + s.getDate() + "–" + e.getDate() + ", " + s.getFullYear();
														} catch { return "Aug 12–16, 2026"; }
													};

													return (
														<div
															key={p.id}
															className="show-card-enter"
															style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
														>
															<div className={`bg-[#1c122f] border border-white/5 rounded-[20px] overflow-hidden transition-all duration-300 ${isExpanded ? "ring-1 ring-purple-500/30" : ""}`}>
																{/* Header */}
																<div className="px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => { setExpandedParticipationId(isExpanded ? null : p.id); if (!isExpanded && isShowInfoEnabled && !(p.eventId in eventShowCountsMap)) fetchEventShowCount(p.eventId); }}>
																	<div className="flex items-center justify-between mb-3">
																		<div className="flex items-center gap-3">
																			<div className={`w-2.5 h-2.5 rounded-full ${p.status === "confirmed" ? "bg-[#00d68f]" : p.status === "submitted" ? "bg-[#3b82f6]" : "bg-[#fbbf24]"}`} />
																			<span className="font-bold text-white text-base flex items-center gap-2 flex-wrap">
																				{p.event?.name || "Unknown Event"}
																			</span>
																		</div>
																		<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
																	</div>
																	<div className="mb-2.5">
																		{p.status === "confirmed" ? (
																			<Badge className="bg-[#133c30] text-[#00d68f] hover:bg-[#133c30] border-0 text-[11px] font-medium px-2 py-0.5 rounded shadow-none">Confirmed</Badge>
																		) : p.status === "submitted" ? (
																			<Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/20 border-0 text-[11px] font-medium px-2 py-0.5 rounded shadow-none">Pending</Badge>
																		) : (
																			<Badge className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 border-0 text-[11px] font-medium px-2 py-0.5 rounded shadow-none">Waiting</Badge>
																		)}
																	</div>
																	<div className="flex items-center gap-3 text-xs text-gray-400 font-medium mt-3 flex-wrap">
																		{p.event?.startDate && (
																			<span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 opacity-70" />{getDisplayDate(p.event.startDate, p.event.endDate)}</span>
																		)}
																		{p.event?.venueName && (
																			<span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 opacity-70" />{p.event.venueName}</span>
																		)}
																		{/* Performance count badge */}
																		{(() => {
																			const perfCount = (p as any).performanceDates?.length || p.event?.showDates?.length || 0;
																			return perfCount > 0 ? (
																				<span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/25 text-[10px] font-bold">
																					<Music className="h-2.5 w-2.5" />
																					{perfCount} perf{perfCount > 1 ? "s" : ""}
																				</span>
																			) : null;
																		})()}
																	</div>
																</div>

																{/* Expanded Content */}
																{isExpanded && (
																	<div className="px-5 pb-5 animate-fade-in">
																		{(p.status === "submitted" || p.status === "confirmed" || p.status === "pending") && (
																			<div className="grid grid-cols-2 gap-3 mb-3 pt-2 border-t border-white/5">
																				<ArtistChatButton eventId={p.eventId} artistId={artistId} variant="ghost" className="w-full bg-[#26193b] hover:bg-[#31204d] border border-white/5 text-white rounded-xl h-11 gap-2 transition-all font-medium text-sm flex items-center justify-center px-4" />
																				<Button onClick={() => setDeleteEventState({ isOpen: true, eventId: p.eventId, eventName: p.event?.name || "Event", hasShows: (p.submittedShows?.length || 0) > 0, isDeleting: false })} className="w-full bg-[#331c2d] hover:bg-[#42243a] border border-[#ef4444]/20 text-[#f87171] hover:text-[#f87171] rounded-xl h-11 gap-2 transition-all font-medium text-sm">
																					<Trash2 className="h-4 w-4" />
																					Delete
																				</Button>
																			</div>
																		)}

																		{p.status !== "pending" ? (
																			<Button onClick={() => {
																				setOpenShowInfoMode("submit");
																				setOpenShowInfoEventId(p.eventId);
																			}} className="w-full bg-[#26193b] hover:bg-[#31204d] border border-white/5 text-white rounded-xl h-11 gap-2 transition-all mb-5 font-medium text-sm mt-3">
																				<Edit className="h-4 w-4" />
																				Edit Shows & Tasks
																			</Button>
																		) : (
																			<Button onClick={() => router.push(`/join-event/${p.eventId}/confirm`)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl h-11 gap-2 shadow-lg shadow-purple-500/20 transition-all font-medium text-sm mb-5 mt-3">
																				<Music className="h-4 w-4" />
																				Complete Setup
																			</Button>
																		)}

																		{p.status !== "pending" && (
																			<div className="border-t border-white/5 pt-4">
																				<p className="text-gray-400 text-sm mb-3.5 font-semibold">{modules.length} modules active</p>
																				<div className="space-y-2.5">
																					{modules.map(module => (
																						<div key={module.id} className="flex items-center justify-between bg-[#231737] border border-white/5 rounded-xl px-4 py-3.5">
																							<span className="text-white font-medium text-[15px]">{module.name}</span>
																							<div className="flex items-center gap-3">
																								<span className={`text-[11px] px-3 py-1 rounded-full font-medium ${
																									module.status === "Submitted" || module.status === "Confirmed" || module.status === "Signed"
																										? "bg-emerald-500/15 text-emerald-400"
																										: "bg-white/5 text-gray-300"
																								}`}>{module.status}</span>
																								<span
																									className="text-[#ff7ae6] text-sm cursor-pointer hover:text-[#ff9bf0] transition-colors font-medium flex items-center"
																									onClick={() => {
																										if (module.id === "showinfo") {
																											setOpenShowInfoMode((eventShowCountsMap[p.eventId] || 0) > 0 ? "view" : "submit");
																											setOpenShowInfoEventId(p.eventId);
																										} else {
																											setSelectedEventInviteId(p.eventId);
																											setInitialSection(module.id as any);
																											setModalTriggerKey(Date.now());
																										}
																									}}
																								>
																									{module.actionText}
																								</span>
																							</div>
																						</div>
																					))}
																				</div>
																			</div>
																		)}

																		{/* Inline ShowInfoPanel — rendered hidden, dialogs controlled by openShowInfoEventId */}
																		{p.status !== "pending" && isShowInfoEnabled && (
																			<div className="hidden">
																				<ShowInfoPanel
																					invite={{ eventId: p.eventId, artistContractId: artistId, eventName: p.event?.name || "Event" }}
																					onAction={async () => { }}
																					onRefresh={() => { fetchEventShowCount(p.eventId); }}
																					autoOpenDialog={openShowInfoEventId === p.eventId ? openShowInfoMode : undefined}
																					onClose={() => setOpenShowInfoEventId(null)}
																				/>
																			</div>
																		)}
																	</div>
																)}
															</div>
														</div>
													);
												})}
										</div>
									)}
								</section>
							)}
						</div>
					)}

					{/* ── Private Event Requests ──────────────────────── */}
					{activeSection === "dashboard" && (
						<section className="mb-14 border rounded-2xl border-purple-500/20 p-4 sm:p-5">
							<div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
								<div>
									<h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3 flex-wrap">
										<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
											<Send className="h-4 w-4 sm:h-5 sm:w-5 text-pink-400" />
										</div>
										<span>Private Event Requests</span>
										<Badge className="bg-pink-500/15 text-pink-300 border-0 text-[11px] rounded-lg">
											{shareLinks.length}
										</Badge>
									</h2>
									<p className="text-purple-300/50 text-xs sm:text-sm mt-1.5 ml-10 sm:ml-[52px]">
										Track show info sent to external organizers
									</p>
								</div>
								<Button
									onClick={() => setGenerateLinkModalOpen(true)}
									className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5 w-full sm:w-auto shrink-0"
									disabled={shows.length === 0}
								>
									<Send className="h-4 w-4" />
									Send Show Info
								</Button>
							</div>

							{shareLinks.length === 0 ? (
								<div className="glass-card rounded-2xl p-8 sm:p-12 text-center">
									<div className="floating">
										<div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
											<Send className="h-8 w-8 text-pink-400/30" />
										</div>
									</div>
									<p className="text-purple-200/50 max-w-md mx-auto">
										No private requests yet. Send your show to
										external organizers to track them here.
									</p>
								</div>
							) : (
								<div className="glass-card rounded-2xl overflow-hidden transition-all duration-300 border-t border-purple-500/20 animate-fade-in">
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead>
												<tr className="border-b border-purple-500/20">
													<th className="text-left py-3 px-5 text-xs font-medium text-purple-300/40 uppercase tracking-wider">
														Organizer
													</th>
													<th className="text-left py-3 px-5 text-xs font-medium text-purple-300/40 uppercase tracking-wider">
														Show
													</th>
													<th className="text-left py-3 px-5 text-xs font-medium text-purple-300/40 uppercase tracking-wider">
														Event Date
													</th>
													<th className="text-left py-3 px-5 text-xs font-medium text-purple-300/40 uppercase tracking-wider">
														Valid Until
													</th>
													<th className="text-right py-3 px-5 text-xs font-medium text-purple-300/40 uppercase tracking-wider">
														Actions
													</th>
												</tr>
											</thead>
										</table>
										<div className="max-h-[320px] overflow-y-auto">
											<table className="w-full">
												<tbody>
													{shareLinks.map((link) => (
														<tr
															key={link.id}
															className="border-b border-purple-500/20 hover:bg-white/2 transition-colors duration-150"
														>
															<td className="py-3.5 px-5">
																<div className="text-white font-medium text-sm">
																	{link.organizerName}
																</div>
																{link.organizerEmail && (
																	<div className="text-purple-300/30 text-xs mt-0.5">
																		{
																			link.organizerEmail
																		}
																	</div>
																)}
															</td>
															<td className="py-3.5 px-5 text-purple-300/60 text-sm">
																{link.showName}
															</td>
															<td className="py-3.5 px-5 text-purple-200/50 text-sm">
																{link.eventDate
																	? new Date(
																		link.eventDate,
																	).toLocaleDateString(
																		"en-US",
																		{
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																		},
																	)
																	: "—"}
															</td>
															<td className="py-3.5 px-5 text-purple-200/50 text-sm">
																{link.expiryDate
																	? new Date(
																		link.expiryDate,
																	).toLocaleDateString(
																		"en-US",
																		{
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																		},
																	)
																	: "—"}
															</td>
															<td className="py-3.5 px-5">
																<div className="flex items-center justify-end gap-2">
																	<Button
																		onClick={() =>
																			copyShareLink(
																				link,
																			)
																		}
																		className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 text-purple-200 rounded-xl text-xs h-8 px-3 gap-1.5 transition-all duration-200"
																	>
																		{copiedLinkId ===
																			link.id ? (
																			<Check className="h-3 w-3 text-green-400" />
																		) : (
																			<Copy className="h-3 w-3" />
																		)}
																		Copy Link
																	</Button>
																	<Button
																		onClick={() =>
																			handleOpenEditLinkDialog(
																				link,
																			)
																		}
																		className="bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/20 rounded-xl text-xs h-8 px-3 gap-1.5 transition-all duration-200"
																	>
																		<Edit className="h-3 w-3" />
																		Edit Event
																		Request
																	</Button>
																	<Button
																		variant="ghost"
																		onClick={() =>
																			handleDeleteShareLink(
																				link.id,
																			)
																		}
																		className="text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-8 w-8 p-0 transition-all duration-200"
																	>
																		<Trash2 className="h-3.5 w-3.5" />
																	</Button>
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							)}
						</section>
					)}

				</main>

				{/* ── Account Settings Dialog ─────────────────────── */}
				<Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
					<DialogContent className="bg-[#0f0b20] border border-purple-500/20 text-white max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-purple-500/10">
						<DialogHeader>
							<DialogTitle className="text-xl text-white flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
									<User className="h-4 w-4 text-purple-400" />
								</div>
								Account Settings
							</DialogTitle>
							<DialogDescription className="text-purple-200/40">
								Manage your account, security, and profile picture
							</DialogDescription>
						</DialogHeader>

						{/* Profile Info Summary */}
						<div className="bg-white/3 rounded-xl p-4 mb-4 border border-white/5">
							<div className="flex items-center gap-3">
								{profileImage ? (
									<img
										src={getMediaUrl(profileImage)}
										alt="Profile"
										className="w-12 h-12 rounded-xl object-cover border border-purple-400/30"
									/>
								) : (
									<div className="w-12 h-12 rounded-xl bg-purple-600/30 flex items-center justify-center">
										<User className="h-5 w-5 text-purple-300" />
									</div>
								)}
								<div>
									<p className="text-white font-semibold">
										{profile.artistName}
									</p>
									<p className="text-purple-200/40 text-sm">
										{profile.email}
									</p>
								</div>
							</div>
						</div>

						{/* Tab Navigation */}
						<Tabs
							value={accountTab}
							onValueChange={(v) => {
								setAccountTab(
									v as "password" | "picture",
								);
								setAccountError("");
							}}
						>
							<TabsList className="bg-white/5 border border-white/5 w-full rounded-xl p-1">
								<TabsTrigger
									value="password"
									className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg text-xs gap-1.5 transition-all duration-200"
								>
									<Lock className="h-3 w-3" /> Password
								</TabsTrigger>
								<TabsTrigger
									value="picture"
									className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg text-xs gap-1.5 transition-all duration-200"
								>
									<ImageIcon className="h-3 w-3" /> Picture
								</TabsTrigger>
							</TabsList>

							{accountError && (
								<div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
									<AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
									<p className="text-sm text-red-300/80">
										{accountError}
									</p>
								</div>
							)}

							{/* Change Password — redirect to forgot password flow */}
							<TabsContent
								value="password"
								className="space-y-4 mt-4"
							>
								<div className="bg-purple-500/8 rounded-xl p-4 border border-purple-500/10 text-center space-y-3">
									<Lock className="h-8 w-8 text-purple-400/60 mx-auto" />
									<p className="text-sm text-purple-200/60">
										To change your password, we'll send a reset
										link to your email address.
									</p>
									<p className="text-xs text-purple-300/40">
										Current email:{" "}
										<span className="text-white font-medium">
											{profile.email}
										</span>
									</p>
								</div>
								<Button
									onClick={() => {
										setDetailDialogOpen(false);
										router.push("/famelink-forgot-password");
									}}
									className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300"
								>
									<Mail className="h-4 w-4" />
									Send Password Reset Email
								</Button>
							</TabsContent>

							{/* Profile Picture */}
							<TabsContent value="picture" className="space-y-4 mt-4">
								<div className="flex flex-col items-center gap-5">
									{profileImage ? (
										<img
											src={getMediaUrl(profileImage)}
											alt="Profile"
											className="w-32 h-32 rounded-2xl object-cover border-2 border-purple-400/30 shadow-lg shadow-purple-500/10"
										/>
									) : (
										<div className="w-32 h-32 rounded-2xl bg-purple-800/30 flex items-center justify-center border-2 border-purple-600/20">
											<User className="h-16 w-16 text-purple-400/40" />
										</div>
									)}
									<Label
										htmlFor="account-profile-image"
										className="cursor-pointer w-full"
									>
										<div className="border-2 border-dashed border-purple-500/20 rounded-xl px-6 py-5 hover:border-purple-400/40 hover:bg-purple-500/5 transition-all duration-300 text-center group">
											{uploadingProfileImage ? (
												<div className="w-full space-y-2">
													<Loader2 className="h-6 w-6 text-purple-400 animate-spin mx-auto mb-2" />
													<div className="px-4">
														<Progress value={uploadProgress} className="h-1.5 w-full bg-purple-500/10" />
														<p className="text-[10px] text-purple-400/80 mt-1 font-medium">
															{uploadProgress}% Uploaded
														</p>
													</div>
												</div>
											) : (
												<>
													<Upload className="h-6 w-6 text-purple-400/50 mx-auto mb-2 group-hover:text-purple-400 transition-colors duration-200" />
													<p className="text-sm text-purple-200/60 group-hover:text-purple-200/80 transition-colors duration-200">
														Upload new picture
													</p>
												</>
											)}
											<p className="text-xs text-purple-300/30 mt-1">
												PNG, JPG up to 100MB
											</p>
										</div>
									</Label>
									<input
										id="account-profile-image"
										type="file"
										accept="image/*"
										onChange={handleProfileImageUpload}
										className="hidden"
										disabled={uploadingProfileImage}
									/>
								</div>
							</TabsContent>
						</Tabs>

						{/* Danger Zone */}
						<div className="mt-6 pt-5 border-t border-red-500/10">
							<p className="text-sm text-red-400/60 font-medium mb-3">
								Danger Zone
							</p>
							<div className="flex gap-2">
								<Button
									onClick={handleLogout}
									className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300/70 hover:text-white rounded-xl gap-2 transition-all duration-200"
								>
									<LogOut className="h-4 w-4" /> Sign Out
								</Button>
								<Button
									onClick={handleDeleteAccount}
									className="flex-1 bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 text-red-400/70 hover:text-red-400 rounded-xl gap-2 transition-all duration-200"
								>
									<Trash2 className="h-4 w-4" /> Delete Account
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>


				{/* ── Edit Event Request Dialog ──────────────────── */}
				<Dialog
					open={editLinkDialogOpen}
					onOpenChange={setEditLinkDialogOpen}
				>
					<DialogContent className="bg-[#0f0b20] border border-purple-500/20 text-white max-w-lg rounded-2xl shadow-2xl shadow-purple-500/10">
						<DialogHeader>
							<DialogTitle className="text-xl text-white flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
									<Edit className="h-4 w-4 text-purple-400" />
								</div>
								Edit Event Request
							</DialogTitle>
							<DialogDescription className="text-purple-200/40">
								Update event request details or delete the link.
							</DialogDescription>
						</DialogHeader>
						{editLinkData && (
							<div className="space-y-5 mt-4">
								<div className="space-y-2">
									<Label className="text-white font-medium text-sm">
										Organizer name{" "}
										<span className="text-pink-400">*</span>
									</Label>
									<Input
										value={editLinkData.organizerName}
										onChange={(e) =>
											setEditLinkData({
												...editLinkData,
												organizerName: e.target.value,
											})
										}
										placeholder="Enter organizer name"
										className="border-white/10 text-white rounded-xl placeholder:text-purple-300/30 focus:border-purple-400/50 focus:ring-purple-400/20"
										style={{
											background: "rgba(255,255,255,0.05)",
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-white font-medium text-sm">
										Organizer email{" "}
										<span className="text-purple-300/40">
											(optional)
										</span>
									</Label>
									<Input
										type="email"
										value={editLinkData.organizerEmail}
										onChange={(e) =>
											setEditLinkData({
												...editLinkData,
												organizerEmail: e.target.value,
											})
										}
										placeholder="Enter organizer email"
										className="border-white/10 text-white rounded-xl placeholder:text-purple-300/30 focus:border-purple-400/50 focus:ring-purple-400/20"
										style={{
											background: "rgba(255,255,255,0.05)",
											colorScheme: "dark",
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-white font-medium text-sm">
										Show name
									</Label>
									<Input
										value={editLinkData.showName}
										disabled
										className="border-white/5 text-purple-200/60 rounded-xl"
										style={{
											background: "rgba(255,255,255,0.02)",
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-white font-medium text-sm">
										Date of event{" "}
										<span className="text-pink-400">*</span>
									</Label>
									<div className="relative">
										<CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/40" />
										<Input
											type="date"
											value={editLinkData.eventDate}
											min={getTodayDateString()}
											onChange={(e) => {
												const newEventDate = e.target.value;
												const updated = {
													...editLinkData,
													eventDate: newEventDate,
												};
												if (
													newEventDate &&
													updated.expiryDate &&
													updated.expiryDate <=
													newEventDate
												) {
													updated.expiryDate =
														getDatePlusDays(
															newEventDate,
															1,
														);
												}
												setEditLinkData(updated);
											}}
											className="border-white/10 text-white pl-10 rounded-xl focus:border-purple-400/50 focus:ring-purple-400/20"
											style={{
												background:
													"rgba(255,255,255,0.05)",
												colorScheme: "dark",
											}}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label className="text-white font-medium text-sm flex items-center gap-2">
										<Lock className="h-4 w-4 text-purple-300/40" />
										Link valid until
									</Label>
									<p className="text-xs text-purple-200/30">
										Must be at least 1 day after the event date.
									</p>
									<div className="relative">
										<CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/40" />
										<Input
											type="date"
											value={editLinkData.expiryDate}
											min={
												editLinkData.eventDate
													? getDatePlusDays(
														editLinkData.eventDate,
														1,
													)
													: getTodayDateString()
											}
											onChange={(e) =>
												setEditLinkData({
													...editLinkData,
													expiryDate: e.target.value,
												})
											}
											className="border-white/10 text-white pl-10 rounded-xl focus:border-purple-400/50 focus:ring-purple-400/20"
											style={{
												background:
													"rgba(255,255,255,0.05)",
												colorScheme: "dark",
											}}
										/>
									</div>
								</div>
								<div className="flex gap-3 pt-2">
									<Button
										onClick={handleUpdateShareLink}
										disabled={
											editingSaving ||
											!editLinkData.organizerName.trim() ||
											!editLinkData.eventDate
										}
										className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
									>
										{editingSaving ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Check className="h-4 w-4" />
										)}
										Save Changes
									</Button>
									<Button
										onClick={() => setEditLinkDialogOpen(false)}
										className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl transition-all duration-200"
									>
										Cancel
									</Button>
								</div>
								{/* Danger Zone - Delete */}
								<div className="mt-4 pt-4 border-t border-red-500/10">
									<Button
										onClick={() => {
											setEditLinkDialogOpen(false);
											handleDeleteShareLink(editLinkData.id);
										}}
										className="w-full bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 text-red-400/70 hover:text-red-400 rounded-xl gap-2 transition-all duration-200"
									>
										<Trash2 className="h-4 w-4" />
										Delete This Event Request
									</Button>
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>

				{/* ── Delete Event Dialog ────────────────────────────── */}
				<Dialog
					open={deleteEventState.isOpen}
					onOpenChange={(open) =>
						setDeleteEventState((prev) => ({ ...prev, isOpen: open }))
					}
				>
					<DialogContent className="bg-[#0f0b20] border border-red-500/30 text-white max-w-md rounded-2xl shadow-2xl shadow-red-500/10">
						<DialogHeader>
							<DialogTitle className="text-xl text-white flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
									<AlertCircle className="h-4 w-4 text-red-400" />
								</div>
								Delete Event Access
							</DialogTitle>
							<DialogDescription className="text-purple-200/60 mt-2">
								You are about to delete your participation in{" "}
								<strong>{deleteEventState.eventName}</strong>. This
								deletion will only remove your event copy and will
								not affect the main show.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 mt-2">
							{deleteEventState.hasShows ? (
								<Alert className="bg-orange-500/10 border-orange-500/20 text-orange-200">
									<AlertCircle className="h-4 w-4 text-orange-400" />
									<AlertDescription>
										You must delete all your shows inside the
										event first before deleting the event.
										Please close this dialog and click{" "}
										<strong>Edit Shows</strong> to remove your
										shows.
									</AlertDescription>
								</Alert>
							) : (
								<Alert className="bg-red-500/10 border-red-500/20 text-red-200">
									<AlertCircle className="h-4 w-4 text-red-400" />
									<AlertDescription>
										Are you sure? This action cannot be undone.
										You will lose access to this event and be
										removed from the stage manager's dashboard.
									</AlertDescription>
								</Alert>
							)}

							<div className="flex gap-3 justify-end pt-2">
								<Button
									onClick={() =>
										setDeleteEventState((prev) => ({
											...prev,
											isOpen: false,
										}))
									}
									disabled={deleteEventState.isDeleting}
									className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl transition-all duration-200"
								>
									Cancel
								</Button>
								<Button
									onClick={handleDeleteEvent}
									disabled={
										deleteEventState.isDeleting ||
										deleteEventState.hasShows
									}
									className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{deleteEventState.isDeleting ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<Trash2 className="h-4 w-4 mr-2" />
									)}
									Yes, Delete Event
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* ── Onboarding Flow Modal (auto-open for new artists) ── */}
				{onboardingOpen && profile && (
					<OnboardingFlowModal
						artistId={artistId}
						shows={shows}
						pendingRequests={eventRequests.filter((r) => r.status === "pending")}
						pendingParticipations={eventParticipations.filter((p) => {
									const perfSlots = (p as any).performanceDates?.length || p.event?.showDates?.length || 0;
									const submitted = (p as any).showCount ?? 0;
									// Show if there are unfilled slots, or no slots defined but no show submitted yet
									return perfSlots > 0 ? submitted < perfSlots : submitted === 0;
								})}
						hasLogistics={false}
						onDismiss={() => {
							setOnboardingOpen(false);
							setOnboardingDismissed(true);
							localStorage.setItem(onboardingStorageKey, "1");
						}}
						onShowCreated={() => {
							setOnboardingOpen(false);
							router.push(`/famelink/${artistId}/shows/create`);
						}}
						onRequestResponded={() => {
							fetchEventRequests();
							fetchEventParticipations();
						}}
					/>
				)}

				{/* ── Generate Private Link Modal (Send Show Info in Private Event Requests) ── */}
				{generateLinkModalOpen && (
					<GeneratePrivateLinkModal
						artistId={artistId}
						artistName={profile?.artistName || "Main Artist"}
						shows={shows}
						onDismiss={() => setGenerateLinkModalOpen(false)}
						onCreated={(link) => {
							setShareLinks((prev) => [link, ...prev]);
							setGenerateLinkModalOpen(false);
						}}
					/>
				)}

				{/* ── Share Modal (opened from Share button on show cards) ── */}
				{shareModalOpen && profile && (
					<OnboardingFlowModal
						artistId={artistId}
						shows={shows}
						pendingRequests={eventRequests.filter((r) => r.status === "pending")}
						pendingParticipations={eventParticipations.filter((p) => {
									const perfSlots = (p as any).performanceDates?.length || p.event?.showDates?.length || 0;
									const submitted = (p as any).showCount ?? 0;
									// Show if there are unfilled slots, or no slots defined but no show submitted yet
									return perfSlots > 0 ? submitted < perfSlots : submitted === 0;
								})}
						hasLogistics={false}
						initialStep="share_where"
						onDismiss={() => setShareModalOpen(false)}
						onShowCreated={() => {
							setShareModalOpen(false);
							router.push(`/famelink/${artistId}/shows/create`);
						}}
						onRequestResponded={() => {
							setShareModalOpen(false);
							fetchEventRequests();
							fetchEventParticipations();
						}}
					/>
				)}

				{/* ── Upgrade Modal ──────────────────────────────── */}
				<UpgradeModal
					open={upgradeModalOpen}
					onOpenChange={(open) => {
						setUpgradeModalOpen(open);
						if (!open) clearUpgraded();
					}}
					type="artist"
					currentCount={subData?.currentShowCount ?? shows.length}
					maxCount={maxShows === Infinity ? 999 : maxShows}
					justUpgraded={justUpgraded}
					planType={planType}
					userEmail={subData?.userEmail}
					userId={subData?.userId}
					returnedFromCheckout={returnedFromCheckoutRef.current}
					onGoCreate={() =>
						router.push(`/famelink/${artistId}/shows/create`)
					}
				/>

				{/* ── Duplicate Show Loading Overlay ────────────────── */}
				{duplicatingShowId !== null && (
					<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#06020f]/90 backdrop-blur-sm">
						<Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
						<p className="text-white font-semibold">Duplicating show...</p>
						<p className="text-purple-300/50 text-sm">Opening the show creation page</p>
					</div>
				)}

				{/* ── Footer ─────────────────────────────────────── */}
				<footer className="border-t border-white/5 mt-12 py-8">
					<div className="container mx-auto px-4">
						<FantasiaFooter variant="dark" />
					</div>
				</footer>
			</div>
		</div>
	);
}
