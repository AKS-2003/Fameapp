"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import {
	Music,
	Image as ImageIcon,
	Clock,
	User,
	Download,
	Loader2,
	Archive,
	Globe,
	Play,
	Instagram,
	Facebook,
	Youtube,
	Users,
	Palette,
	Mail,
	Navigation,
	Sparkles,
	FileText,
	Mic2,
	MapPin,
	Home,
	Shirt,
	Lightbulb,
} from "lucide-react";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";

const getColorStyle = (colorValue: string) => {
	const map: Record<string, string> = {
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
	return map[colorValue] || "#888888";
};

interface ShowData {
	id: string;
	slug: string;
	name: string;
	description?: string;
	biography?: string;
	style?: string;
	performanceType?: string;
	duration: number;
	isDraft?: boolean;
	isPublic?: boolean;
	profileImage?: string;
	realName?: string;
	email?: string;
	phone?: string;
	countryLiving?: string;
	homeCountry?: string;
	managedBy?: string;
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	lightRequests?: string;
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
	techRider?: string;
	equipment?: string;
	showLink?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	internalNotes?: string;
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
	music?: { files?: Array<{ id: string; name: string; url: string }> };
	createdAt: string;
	updatedAt: string;
}

const formatDuration = (s: number) =>
	`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Glass({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-xl shadow-black/10 ${className}`}
		>
			{children}
		</div>
	);
}

function SecHead({
	icon: Icon,
	children,
	accent = "purple",
}: {
	icon: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
	accent?: "purple" | "pink" | "amber" | "green" | "blue";
}) {
	const colors = {
		purple: "bg-purple-500/15 text-purple-400",
		pink: "bg-pink-500/15 text-pink-400",
		amber: "bg-amber-500/15 text-amber-400",
		green: "bg-green-500/15 text-green-400",
		blue: "bg-blue-500/15 text-blue-400",
	};
	return (
		<h3 className="text-lg font-semibold text-white flex items-center gap-2.5 mb-5">
			<div
				className={`w-8 h-8 rounded-lg ${colors[accent]} flex items-center justify-center`}
			>
				<Icon className="h-4 w-4" />
			</div>
			{children}
		</h3>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-[11px] text-purple-300/50 uppercase tracking-wider font-medium mb-0.5">
				{label}
			</p>
			<div className="text-sm text-gray-200">{children}</div>
		</div>
	);
}

function ColorSwatch({
	bg,
	label,
	value,
}: {
	bg: string;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
			<div
				className="w-10 h-10 rounded-xl border border-white/10 shadow-lg shadow-black/20 flex-shrink-0"
				style={{ backgroundColor: bg }}
			/>
			<div>
				<p className="text-[11px] text-purple-300/50 uppercase tracking-wider">
					{label}
				</p>
				<p className="text-sm font-mono text-gray-300">{value}</p>
			</div>
		</div>
	);
}

export default function PublicShowPage() {
	const params = useParams();
	const showSlug = params.showSlug as string;
	const [loading, setLoading] = useState(true);
	const [show, setShow] = useState<ShowData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const [downloadingZip, setDownloadingZip] = useState(false);

	useEffect(() => {
		const fetchShow = async () => {
			try {
				const response = await fetch(`/api/shows/by-slug/${showSlug}`);
				const data = await response.json();
				if (data.success) setShow(data.data.show);
				else setError(data.error?.message || "Show not found");
			} catch {
				setError("Failed to load show");
			} finally {
				setLoading(false);
			}
		};
		fetchShow();
	}, [showSlug]);

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

	const handleDownloadPdf = async () => {
		if (!show) return;
		setDownloadingPdf(true);
		try {
			const r = await fetch(`/api/shows/${show.id}/generate-pdf`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					slug: showSlug,
					baseUrl: window.location.origin,
				}),
			});
			if (r.ok) {
				const b = await r.blob();
				const u = window.URL.createObjectURL(b);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = u;
				a.download = `${show.name || "Show"}_FameLink.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(u);
				document.body.removeChild(a);
			}
		} catch {
			/* ignore */
		} finally {
			setDownloadingPdf(false);
		}
	};

	const handleDownloadZip = async () => {
		if (!show) return;
		setDownloadingZip(true);
		try {
			const r = await fetch(`/api/shows/${show.id}/download-zip`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slug: showSlug }),
			});
			if (r.ok) {
				const b = await r.blob();
				const u = window.URL.createObjectURL(b);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = u;
				a.download = `${show.name || "Show"}_FameLink_Complete.zip`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(u);
				document.body.removeChild(a);
			}
		} catch {
			/* ignore */
		} finally {
			setDownloadingZip(false);
		}
	};

	const getMusicUrl = (): string => {
		if (show?.musicTrack?.file_url)
			return getMediaUrl(
				show.musicTrack.file_url,
				show.musicTrack.file_path,
			);
		if (show?.music?.files?.[0]?.url)
			return getMediaUrl(show.music.files[0].url);
		return "";
	};

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
				<div className="text-center">
					<div className="relative w-20 h-20 mx-auto mb-6">
						<div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
						<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
						<div className="absolute inset-5 rounded-full bg-purple-500/20 animate-pulse flex items-center justify-center">
							<FameLinkLogo width={24} height={24} />
						</div>
					</div>
					<p className="text-purple-300/60 text-sm tracking-widest uppercase">
						Loading show
					</p>
				</div>
			</div>
		);

	if (error || !show)
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
				<Glass className="max-w-md p-10 text-center">
					<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
						<Music className="h-8 w-8 text-purple-400/40" />
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">
						Show Not Found
					</h2>
					<p className="text-purple-200/50 text-sm">
						{error ||
							"This show doesn't exist or has been removed."}
					</p>
				</Glass>
			</div>
		);

	const musicUrl = getMusicUrl();
	const hasSocials =
		show.socialMedia?.instagram ||
		show.socialMedia?.facebook ||
		show.socialMedia?.youtube ||
		show.socialMedia?.website ||
		show.showLink;

	return (
		<div className="min-h-screen bg-[#0a0a0f] text-white">
			{/* ── Hero Section with Background Image ── */}
			<div className="relative overflow-hidden">
				{/* Background image */}
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: "url('/showBG.jpg')" }}
				/>
				{/* Dark overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#0a0a0f]" />
				{/* Colored accent overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-pink-900/20" />

				{/* Top bar */}
				<div className="relative z-10">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
								<FameLinkLogo width={28} height={28} />
							</div>
							<span className="text-xs text-white/40 font-medium tracking-wider uppercase hidden sm:block">
								Show Profile
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={handleDownloadPdf}
								disabled={downloadingPdf}
								variant="outline"
								size="sm"
								className="bg-white/[0.08] border-white/[0.12] text-white/80 hover:bg-white/[0.15] hover:text-white rounded-xl gap-1.5 backdrop-blur-md transition-all"
							>
								{downloadingPdf ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Download className="h-3.5 w-3.5" />
								)}
								<span className="hidden sm:inline">PDF</span>
							</Button>
							<Button
								onClick={handleDownloadZip}
								disabled={downloadingZip}
								size="sm"
								className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl gap-1.5 shadow-lg shadow-purple-900/40 transition-all hover:shadow-purple-700/50 border-0"
							>
								{downloadingZip ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Archive className="h-3.5 w-3.5" />
								)}
								<span className="hidden sm:inline">
									Download Zip
								</span>
							</Button>
						</div>
					</div>
				</div>

				{/* Hero content */}
				<div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20 sm:pt-12 sm:pb-28">
					<div className="flex flex-col items-center text-center">
						{/* Profile image */}
						<div className="relative mb-6">
							<div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-60 blur-md" />
							{show.profileImage ? (
								<img
									src={getMediaUrl(show.profileImage)}
									alt={show.name}
									className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-[3px] border-white/20 shadow-2xl"
								/>
							) : (
								<div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-[3px] border-white/20 shadow-2xl">
									<User className="h-16 w-16 sm:h-20 sm:w-20 text-white/70" />
								</div>
							)}
						</div>

						{/* Name & details */}
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-2">
							<span className="bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
								{show.name}
							</span>
						</h1>
						{show.realName && (
							<p className="text-lg text-white/50 font-light mb-4">
								{show.realName}
							</p>
						)}

						{/* Badges row */}
						<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
							{show.style && (
								<Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/20 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-md">
									{show.style}
								</Badge>
							)}
							{show.performanceType && (
								<Badge className="bg-pink-500/20 text-pink-200 border border-pink-400/20 rounded-full px-4 py-1.5 text-sm capitalize font-medium backdrop-blur-md">
									{show.performanceType}
								</Badge>
							)}
							{show.duration > 0 && (
								<Badge className="bg-white/10 text-white/70 border border-white/10 rounded-full px-4 py-1.5 text-sm backdrop-blur-md">
									<Clock className="h-3.5 w-3.5 mr-1.5" />
									{show.musicTrack?.duration
										? formatDuration(
											show.musicTrack.duration,
										)
										: "N/A"}
									{show.musicTrack?.tempo &&
										` · ${show.musicTrack.tempo}`}
								</Badge>
							)}
						</div>

						{/* Country flags */}
						{(show.countryLiving || show.homeCountry) && (
							<div className="flex items-center gap-4 mt-4 text-sm text-white/40">
								{show.countryLiving && (
									<span className="flex items-center gap-1.5">
										<MapPin className="h-3.5 w-3.5" />
										{getCountryFlag(
											show.countryLiving,
										)}{" "}
										{getCountryName(show.countryLiving)}
									</span>
								)}
								{show.homeCountry && (
									<span className="flex items-center gap-1.5">
										<Home className="h-3.5 w-3.5" />
										{getCountryFlag(show.homeCountry)}{" "}
										{getCountryName(show.homeCountry)}
									</span>
								)}
							</div>
						)}

						{/* Social links inline */}
						{hasSocials && (
							<div className="flex items-center gap-2 mt-5">
								{show.socialMedia?.instagram && (
									<a
										href={show.socialMedia.instagram}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-400/30 transition-all group"
									>
										<Instagram className="h-4 w-4 text-white/50 group-hover:text-pink-300" />
									</a>
								)}
								{show.socialMedia?.facebook && (
									<a
										href={show.socialMedia.facebook}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-400/30 transition-all group"
									>
										<Facebook className="h-4 w-4 text-white/50 group-hover:text-blue-300" />
									</a>
								)}
								{show.socialMedia?.youtube && (
									<a
										href={show.socialMedia.youtube}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-red-500/20 hover:border-red-400/30 transition-all group"
									>
										<Youtube className="h-4 w-4 text-white/50 group-hover:text-red-300" />
									</a>
								)}
								{show.socialMedia?.website && (
									<a
										href={show.socialMedia.website}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-green-500/20 hover:border-green-400/30 transition-all group"
									>
										<Globe className="h-4 w-4 text-white/50 group-hover:text-green-300" />
									</a>
								)}
								{show.showLink && (
									<a
										href={show.showLink}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-400/30 transition-all group"
									>
										<Play className="h-4 w-4 text-white/50 group-hover:text-purple-300" />
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Content Section ── */}
			<div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 -mt-10 pb-16">
				{/* Ambient glows behind content */}
				<div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
					<div className="absolute top-[30%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/[0.04] blur-[120px]" />
					<div className="absolute bottom-[10%] right-[-5%] w-[350px] h-[350px] rounded-full bg-pink-600/[0.03] blur-[100px]" />
				</div>

				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-1.5 grid w-full grid-cols-4 mb-8 backdrop-blur-xl">
						<TabsTrigger
							value="overview"
							className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-pink-600/20 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/20 text-white/40 font-medium transition-all"
						>
							Overview
						</TabsTrigger>
						<TabsTrigger
							value="music"
							className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-pink-600/20 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/20 text-white/40 font-medium transition-all"
						>
							Music
						</TabsTrigger>
						<TabsTrigger
							value="technical"
							className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-pink-600/20 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/20 text-white/40 font-medium transition-all"
						>
							Technical
						</TabsTrigger>
						<TabsTrigger
							value="gallery"
							className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-pink-600/20 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/20 text-white/40 font-medium transition-all"
						>
							Gallery
						</TabsTrigger>
					</TabsList>

					{/* ═══ OVERVIEW ═══ */}
					<TabsContent value="overview" className="space-y-6">
						{/* Biography - full width, prominent */}
						{show.biography && (
							<Glass className="p-6 sm:p-8">
								<SecHead icon={FileText} accent="pink">
									About
								</SecHead>
								<p className="text-[15px] text-gray-300/90 leading-relaxed whitespace-pre-wrap">
									{show.biography}
								</p>
							</Glass>
						)}

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Contact & Info */}
							<Glass className="p-6">
								<SecHead icon={User}>Artist Details</SecHead>
								<div className="space-y-4">
									{show.email && (
										<Field label="Email">
											<a
												href={`mailto:${show.email}`}
												className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1.5"
											>
												<Mail className="h-3.5 w-3.5" />
												{show.email}
											</a>
										</Field>
									)}
									{show.phone && (
										<Field label="WhatsApp">
											<a
												href={`https://wa.me/${show.phone.replace(/[^0-9]/g, "")}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-green-400 hover:text-green-300 transition-colors inline-flex items-center gap-1.5"
											>
												<Globe className="h-3.5 w-3.5" />
												{show.phone}
											</a>
										</Field>
									)}
									{show.managedBy && (
										<Field label="Managed By">
											<span className="inline-flex items-center gap-1.5">
												<Users className="h-3.5 w-3.5 text-purple-400" />
												{show.managedBy}
											</span>
										</Field>
									)}
									{show.style && (
										<Field label="Performance Style">
											{show.style}
										</Field>
									)}
									{show.performanceType && (
										<Field label="Performance Type">
											<span className="capitalize">
												{show.performanceType}
											</span>
										</Field>
									)}
									<div className="pt-2 border-t border-white/[0.06]">
										<p className="text-[10px] text-white/20 font-mono">
											ID: {show.id}
										</p>
									</div>
								</div>
							</Glass>

							{/* Members or T-Shirt Sizes */}
							<div className="space-y-6">
								{show.members && show.members.length > 0 && (
									<Glass className="p-6">
										<SecHead icon={Users} accent="blue">
											Group Members
										</SecHead>
										<div className="space-y-2">
											{show.members.map((member, i) => (
												<div
													key={i}
													className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
												>
													<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xs font-bold text-white/60">
														{member.name
															.charAt(0)
															.toUpperCase()}
													</div>
													<div className="flex-1">
														<p className="text-sm font-medium text-white">
															{member.name}
														</p>
														<p className="text-xs text-white/40">
															{member.countryLiving &&
																`${getCountryFlag(member.countryLiving)} ${getCountryName(member.countryLiving)}`}
															{member.countryLiving &&
																member.homeCountry &&
																" · "}
															{member.homeCountry &&
																`${getCountryFlag(member.homeCountry)} ${getCountryName(member.homeCountry)}`}
														</p>
													</div>
												</div>
											))}
										</div>
									</Glass>
								)}

								{show.tshirtSizes &&
									show.tshirtSizes.length > 0 && (
										<Glass className="p-6">
											<SecHead
												icon={Shirt}
												accent="green"
											>
												T-Shirt Sizes
											</SecHead>
											<div className="space-y-2">
												{show.tshirtSizes.map(
													(tshirt, i) => (
														<div
															key={i}
															className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
														>
															<span className="text-sm font-medium text-white">
																{tshirt.name}
															</span>
															<div className="flex items-center gap-2">
																<Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/20 rounded-lg text-xs">
																	{
																		tshirt.size
																	}
																</Badge>
																<span className="text-xs text-white/30">
																	{tshirt.fit ===
																		"oversized"
																		? "Oversized"
																		: "Regular"}
																</span>
															</div>
														</div>
													),
												)}
											</div>
										</Glass>
									)}

								{/* Description / Notes if no members or tshirts */}
								{(!show.members || show.members.length === 0) &&
									(!show.tshirtSizes ||
										show.tshirtSizes.length === 0) &&
									!show.biography && (
										<Glass className="p-6">
											<SecHead
												icon={FileText}
												accent="pink"
											>
												About
											</SecHead>
											<p className="text-sm text-gray-400 italic">
												No biography provided.
											</p>
										</Glass>
									)}
							</div>
						</div>
					</TabsContent>

					{/* ═══ MUSIC ═══ */}
					<TabsContent value="music" className="space-y-6">
						<Glass className="p-6 sm:p-8">
							<SecHead icon={Music} accent="pink">
								Music Tracks
							</SecHead>
							{musicUrl ? (
								<div className="space-y-5">
									<div className="bg-gradient-to-br from-purple-500/[0.08] to-pink-500/[0.05] border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
										<div className="flex items-center justify-between">
											<div>
												<h4 className="font-semibold text-white text-lg">
													{show.name}
												</h4>
												<p className="text-xs text-purple-300/50 mt-1">
													Duration:{" "}
													{show.musicTrack?.duration
														? formatDuration(
															show.musicTrack
																.duration,
														)
														: "N/A"}
													{show.musicTrack?.tempo &&
														` · Tempo: ${show.musicTrack.tempo}`}
												</p>
											</div>
											<Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/20 rounded-full px-3 py-1">
												Main Track
											</Badge>
										</div>
										{show.musicTrack?.notes && (
											<p className="text-sm text-gray-400 italic border-l-2 border-purple-500/30 pl-3">
												{show.musicTrack.notes}
											</p>
										)}
										<AudioPlayer
											src={musicUrl}
											onError={(err: any) =>
												console.error(
													"Audio playback error:",
													err,
												)
											}
										/>
										<div className="flex justify-end">
											<Button
												variant="outline"
												size="sm"
												onClick={async () => {
													const { downloadFile } =
														await import("@/lib/media-utils");
													await downloadFile(
														show.musicTrack
															?.file_url || "",
														`${show.name} - Music`,
														show.name
													);
												}}
												className="bg-white/[0.05] border-white/[0.1] text-purple-200 hover:bg-white/[0.1] hover:text-white rounded-xl gap-2"
											>
												<Download className="h-4 w-4" />
												Download Track
											</Button>
										</div>
									</div>
								</div>
							) : (
								<div className="text-center py-16">
									<div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
										<Music className="h-10 w-10 text-purple-400/20" />
									</div>
									<p className="text-white/30 text-sm">
										No music tracks uploaded yet
									</p>
								</div>
							)}
						</Glass>
					</TabsContent>

					{/* ═══ TECHNICAL ═══ */}
					<TabsContent value="technical" className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Costume & Lighting */}
							<Glass className="p-6">
								<SecHead icon={Palette} accent="amber">
									Costume & Lighting
								</SecHead>
								<div className="space-y-5">
									{(show.manualCostumeColor ||
										show.manualCostumeColorTwo ||
										show.manualCostumeColorThree ||
										show.costumeColor) && (
											<div>
												<p className="text-[11px] text-purple-300/50 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
													<Palette className="h-3 w-3" />
													Costume Colors
												</p>
												<div className="space-y-2">
													{(show.manualCostumeColor ||
														show.costumeColor) && (
															<ColorSwatch
																bg={
																	show.manualCostumeColor ||
																	getColorStyle(
																		show.costumeColor ||
																		"",
																	)
																}
																label="Primary"
																value={
																	show.manualCostumeColor ||
																	show.costumeColor ||
																	""
																}
															/>
														)}
													{(show.manualCostumeColorTwo ||
														(show.costumeColorTwo &&
															show.costumeColorTwo !==
															"none")) && (
															<ColorSwatch
																bg={
																	show.manualCostumeColorTwo ||
																	getColorStyle(
																		show.costumeColorTwo ||
																		"",
																	)
																}
																label="Secondary"
																value={
																	show.manualCostumeColorTwo ||
																	show.costumeColorTwo ||
																	""
																}
															/>
														)}
													{(show.manualCostumeColorThree ||
														(show.costumeColorThree &&
															show.costumeColorThree !==
															"none")) && (
															<ColorSwatch
																bg={
																	show.manualCostumeColorThree ||
																	getColorStyle(
																		show.costumeColorThree ||
																		"",
																	)
																}
																label="Third"
																value={
																	show.manualCostumeColorThree ||
																	show.costumeColorThree ||
																	""
																}
															/>
														)}
												</div>
											</div>
										)}
									{(show.manualLightColor ||
										show.manualLightColorTwo ||
										show.manualLightColorThree ||
										show.lightColorSingle) && (
											<div className="border-t border-white/[0.06] pt-5">
												<p className="text-[11px] text-purple-300/50 uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
													<Lightbulb className="h-3 w-3" />
													Lighting Colors
												</p>
												<div className="space-y-2">
													{(show.manualLightColor ||
														show.lightColorSingle) && (
															<ColorSwatch
																bg={
																	show.manualLightColor ||
																	getColorStyle(
																		show.lightColorSingle ||
																		"",
																	)
																}
																label="Primary"
																value={
																	show.manualLightColor ||
																	show.lightColorSingle ||
																	""
																}
															/>
														)}
													{(show.manualLightColorTwo ||
														(show.lightColorTwo &&
															show.lightColorTwo !==
															"none")) && (
															<ColorSwatch
																bg={
																	show.manualLightColorTwo ||
																	getColorStyle(
																		show.lightColorTwo ||
																		"",
																	)
																}
																label="Secondary"
																value={
																	show.manualLightColorTwo ||
																	show.lightColorTwo ||
																	""
																}
															/>
														)}
													{(show.manualLightColorThree ||
														(show.lightColorThree &&
															show.lightColorThree !==
															"none")) && (
															<ColorSwatch
																bg={
																	show.manualLightColorThree ||
																	getColorStyle(
																		show.lightColorThree ||
																		"",
																	)
																}
																label="Third"
																value={
																	show.manualLightColorThree ||
																	show.lightColorThree ||
																	""
																}
															/>
														)}
												</div>
												{!show.manualLightColor &&
													!show.manualLightColorTwo &&
													!show.manualLightColorThree &&
													show.lightColorSingle ===
													"trust" && (
														<p className="text-sm text-yellow-400/70 italic mt-3">
															💡 Trust the Lighting
															Designer
														</p>
													)}
											</div>
										)}
									{show.lightRequests && (
										<div className="border-t border-white/[0.06] pt-4">
											<Field label="Special Lighting Requests">
												{show.lightRequests}
											</Field>
										</div>
									)}
								</div>
							</Glass>

							{/* Stage Positioning */}
							<Glass className="p-6">
								<SecHead icon={Navigation} accent="blue">
									Stage Positioning
								</SecHead>
								<div className="space-y-4">
									{(show.stagePositionStart ||
										show.stagePositionEnd) && (
											<StagePositionPreview
												startPosition={
													show.stagePositionStart || ""
												}
												endPosition={
													show.stagePositionEnd || ""
												}
											/>
										)}
									{show.stagePositionStart && (
										<Field label="Starting Position">
											<span className="capitalize">
												{show.stagePositionStart.replace(
													"-",
													" ",
												)}
											</span>
										</Field>
									)}
									{show.stagePositionEnd && (
										<Field label="Ending Position">
											<span className="capitalize">
												{show.stagePositionEnd.replace(
													"-",
													" ",
												)}
											</span>
										</Field>
									)}
									{show.customStagePosition && (
										<Field label="Custom Position Details">
											{show.customStagePosition}
										</Field>
									)}
									{show.equipment && (
										<div className="border-t border-white/[0.06] pt-4">
											<Field label="Props and Equipment">
												{show.equipment}
											</Field>
										</div>
									)}
								</div>
							</Glass>
						</div>

						{/* Notes row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Glass className="p-6">
								<SecHead icon={Mic2} accent="green">
									MC Notes
								</SecHead>
								<p className="text-sm text-gray-300/80 leading-relaxed">
									{show.mcNotes || "No special notes for MC"}
								</p>
							</Glass>
							<Glass className="p-6">
								<SecHead icon={Sparkles} accent="amber">
									Stage Manager Notes
								</SecHead>
								<p className="text-sm text-gray-300/80 leading-relaxed">
									{show.stageManagerNotes ||
										"No special notes for stage manager"}
								</p>
							</Glass>
						</div>
					</TabsContent>

					{/* ═══ GALLERY ═══ */}
					<TabsContent value="gallery" className="space-y-6">
						{show.rehearsalVideo && (
							<Glass className="overflow-hidden">
								<div className="px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/[0.06] to-transparent">
									<h3 className="text-lg font-semibold text-white flex items-center gap-2.5">
										<div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
											<Play className="h-4 w-4 text-amber-400" />
										</div>
										Rehearsal / Show Video
									</h3>
									<p className="text-xs text-amber-300/40 mt-1 ml-[42px]">
										Video for show order planning and
										lighting setup
									</p>
								</div>
								<div className="p-6">
									<div className="max-w-2xl mx-auto">
										<VideoPlayer
											file={{
												name: show.rehearsalVideo.name,
												type: "video" as const,
												url: show.rehearsalVideo.url,
												file_path:
													show.rehearsalVideo
														.file_path,
												size: show.rehearsalVideo.size,
												contentType:
													show.rehearsalVideo
														.contentType,
											}}
											className="aspect-video rounded-xl overflow-hidden"
										/>
										<div className="flex items-center justify-between mt-3">
											<p className="text-sm text-gray-400">
												{show.rehearsalVideo.name}
												{show.rehearsalVideo.size && (
													<span className="ml-2 text-gray-500">
														(
														{(
															show.rehearsalVideo
																.size /
															(1024 * 1024)
														).toFixed(1)}{" "}
														MB)
													</span>
												)}
											</p>
											<Button
												variant="ghost"
												size="sm"
												onClick={async () => {
													const { downloadFile } =
														await import("@/lib/media-utils");
													await downloadFile(
														show.rehearsalVideo!
															.url,
														show.rehearsalVideo!
															.name,
														show.name
													);
												}}
												className="text-purple-300 hover:text-white hover:bg-white/[0.05] rounded-xl"
											>
												<Download className="h-4 w-4 mr-1" />
												Download
											</Button>
										</div>
									</div>
								</div>
							</Glass>
						)}

						<Glass className="p-6 sm:p-8">
							<SecHead icon={ImageIcon}>Media Gallery</SecHead>
							{show.galleryFiles &&
								show.galleryFiles.length > 0 ? (
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
									{show.galleryFiles.map((file, index) => (
										<div
											key={index}
											className="relative group rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/20 transition-all duration-300"
										>
											{file.type === "image" ? (
												<ImageViewer
													file={{
														name: file.name,
														type: "image" as const,
														url: file.url,
														file_path:
															file.file_path,
														size: file.size || 0,
														contentType:
															file.contentType,
													}}
													className="aspect-square"
												/>
											) : (
												<VideoPlayer
													file={{
														name: file.name,
														type: "video" as const,
														url: file.url,
														file_path:
															file.file_path,
														size: file.size || 0,
														contentType:
															file.contentType,
													}}
													className="aspect-square"
												/>
											)}
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-16">
									<div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
										<ImageIcon className="h-10 w-10 text-purple-400/20" />
									</div>
									<p className="text-white/30 text-sm">
										No gallery files uploaded yet
									</p>
								</div>
							)}
						</Glass>
					</TabsContent>
				</Tabs>
			</div>

			{/* Footer */}
			<footer className="border-t border-white/[0.04] py-6">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
					<FameLinkLogo
						width={20}
						height={20}
						className="opacity-30"
					/>
					<span className="text-xs text-white/20">
						Powered by FameLink
					</span>
				</div>
			</footer>
		</div>
	);
}
