"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import {
	MapPin,
	Instagram,
	Facebook,
	Youtube,
	Globe,
	Music,
	Calendar,
	ImageIcon,
	Play,
	Sparkles,
} from "lucide-react";

interface KnownForItem {
	title?: string;
	description?: string;
	thumbnail?: string;
	video?: string;
}

interface EventItem {
	year?: string;
	name?: string;
	role?: string;
	location?: string;
}

interface MeProfileData {
	stageName: string;
	tagline: string;
	city: string;
	country: string;
	profileImage: string;
	bannerImage: string;
	biography: string;
	languages: string;
	performanceStyles: string;
	knownFor: KnownForItem[];
	events: EventItem[];
	photos: string[];
	socialMedia: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		website?: string;
	};
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
			<div className={`w-8 h-8 rounded-lg ${colors[accent]} flex items-center justify-center`}>
				<Icon className="h-4 w-4" />
			</div>
			{children}
		</h3>
	);
}

function getMediaUrl(src?: string): string {
	if (!src) return "";
	if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
	return `/api/media/${src}`;
}

export default function PublicMeProfilePage() {
	const params = useParams();
	const slug = params.slug as string;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [profile, setProfile] = useState<MeProfileData | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch(`/api/me-profile/by-slug/${slug}`);
				const data = await res.json();
				if (data.success) setProfile(data.data.profile);
				else setError(data.error?.message || "Profile not found");
			} catch {
				setError("Failed to load this profile");
			} finally {
				setLoading(false);
			}
		})();
	}, [slug]);

	if (loading) {
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
					<p className="text-purple-300/60 text-sm tracking-widest uppercase">Loading profile</p>
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
				<Glass className="max-w-md p-10 text-center">
					<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
						<Sparkles className="h-8 w-8 text-purple-400/40" />
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
					<p className="text-purple-200/50 text-sm">
						{error || "This profile doesn't exist or is no longer public."}
					</p>
				</Glass>
			</div>
		);
	}

	const hasSocials =
		profile.socialMedia?.instagram ||
		profile.socialMedia?.facebook ||
		profile.socialMedia?.youtube ||
		profile.socialMedia?.website;

	return (
		<div className="min-h-screen bg-[#0a0a0f] text-white">
			{/* Hero */}
			<div className="relative overflow-hidden">
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={
						profile.bannerImage
							? { backgroundImage: `url('${getMediaUrl(profile.bannerImage)}')` }
							: undefined
					}
				/>
				{!profile.bannerImage && (
					<div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-pink-900/40" />
				)}
				<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#0a0a0f]" />

				<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20 sm:pt-12 sm:pb-24">
					<div className="flex items-center gap-2.5 mb-8">
						<div className="bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
							<FameLinkLogo width={28} height={28} />
						</div>
						<span className="text-xs text-white/40 font-medium tracking-wider uppercase">
							FameLink Profile
						</span>
					</div>

					<div className="flex flex-col items-center text-center">
						<div className="relative mb-5">
							<div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-60 blur-md" />
							{profile.profileImage ? (
								<img
									src={getMediaUrl(profile.profileImage)}
									alt={profile.stageName}
									className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-[3px] border-white/20 shadow-2xl"
								/>
							) : (
								<div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-[3px] border-white/20 shadow-2xl">
									<Music className="h-12 w-12 sm:h-16 sm:w-16 text-white/70" />
								</div>
							)}
						</div>

						<h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1.5">
							<span className="bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
								{profile.stageName || "FameLink Artist"}
							</span>
						</h1>
						{profile.tagline && (
							<p className="text-white/50 text-base font-light mb-3">{profile.tagline}</p>
						)}
						{(profile.city || profile.country) && (
							<p className="flex items-center gap-1.5 text-sm text-white/40">
								<MapPin className="h-3.5 w-3.5" />
								{[profile.city, profile.country].filter(Boolean).join(", ")}
							</p>
						)}

						{hasSocials && (
							<div className="flex items-center gap-2 mt-5">
								{profile.socialMedia.instagram && (
									<a
										href={profile.socialMedia.instagram}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-pink-500/20 hover:border-pink-400/30 transition-all"
									>
										<Instagram className="h-4 w-4 text-white/50" />
									</a>
								)}
								{profile.socialMedia.facebook && (
									<a
										href={profile.socialMedia.facebook}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-400/30 transition-all"
									>
										<Facebook className="h-4 w-4 text-white/50" />
									</a>
								)}
								{profile.socialMedia.youtube && (
									<a
										href={profile.socialMedia.youtube}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-red-500/20 hover:border-red-400/30 transition-all"
									>
										<Youtube className="h-4 w-4 text-white/50" />
									</a>
								)}
								{profile.socialMedia.website && (
									<a
										href={profile.socialMedia.website}
										target="_blank"
										rel="noopener noreferrer"
										className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center hover:bg-green-500/20 hover:border-green-400/30 transition-all"
									>
										<Globe className="h-4 w-4 text-white/50" />
									</a>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 -mt-8 pb-16 space-y-6">
				{/* Bio */}
				{(profile.biography || profile.languages || profile.performanceStyles) && (
					<Glass className="p-6 sm:p-8">
						<SecHead icon={Sparkles} accent="pink">
							About
						</SecHead>
						{profile.biography && (
							<p className="text-[15px] text-gray-300/90 leading-relaxed whitespace-pre-wrap mb-4">
								{profile.biography}
							</p>
						)}
						<div className="flex flex-wrap gap-2">
							{profile.languages &&
								profile.languages.split("·").map((l) => l.trim()).filter(Boolean).map((l) => (
									<Badge key={l} className="bg-white/8 text-purple-200 border border-purple-500/20 rounded-lg">
										{l}
									</Badge>
								))}
							{profile.performanceStyles &&
								profile.performanceStyles.split("·").map((s) => s.trim()).filter(Boolean).map((s) => (
									<Badge key={s} className="bg-pink-500/10 text-pink-200 border border-pink-500/20 rounded-lg">
										{s}
									</Badge>
								))}
						</div>
					</Glass>
				)}

				{/* Known For */}
				{profile.knownFor?.length > 0 && (
					<Glass className="p-6 sm:p-8">
						<SecHead icon={Music} accent="blue">
							Known For
						</SecHead>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{profile.knownFor.map((item, i) => (
								<div
									key={i}
									className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]"
								>
									<div className="aspect-video bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center relative">
										{item.thumbnail ? (
											<img
												src={getMediaUrl(item.thumbnail)}
												alt={item.title || "Known for"}
												className="w-full h-full object-cover"
											/>
										) : (
											<Play className="h-8 w-8 text-white/30" />
										)}
									</div>
									<div className="p-4">
										<p className="font-semibold text-white text-sm">{item.title || "Untitled"}</p>
										{item.description && (
											<p className="text-xs text-purple-300/50 mt-1">{item.description}</p>
										)}
									</div>
								</div>
							))}
						</div>
					</Glass>
				)}

				{/* Events */}
				{profile.events?.length > 0 && (
					<Glass className="p-6 sm:p-8">
						<SecHead icon={Calendar} accent="amber">
							Event History
						</SecHead>
						<div className="divide-y divide-white/[0.06]">
							{profile.events.map((ev, i) => (
								<div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
									<span className="text-sm font-bold text-white w-12 shrink-0">{ev.year}</span>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold text-white">{ev.name}</p>
										{ev.role && <p className="text-xs text-purple-300/50 mt-0.5">{ev.role}</p>}
										{ev.location && (
											<p className="text-xs text-purple-300/40 mt-0.5 flex items-center gap-1">
												<MapPin className="h-3 w-3" />
												{ev.location}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					</Glass>
				)}

				{/* Photos */}
				{profile.photos?.length > 0 && (
					<Glass className="p-6 sm:p-8">
						<SecHead icon={ImageIcon}>Photos</SecHead>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
							{profile.photos.map((photo, i) => (
								<div
									key={i}
									className="aspect-square rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]"
								>
									<img src={getMediaUrl(photo)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
								</div>
							))}
						</div>
					</Glass>
				)}
			</div>

			<footer className="border-t border-white/[0.04] py-6">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
					<FameLinkLogo width={20} height={20} className="opacity-30" />
					<span className="text-xs text-white/20">Powered by FameLink</span>
				</div>
			</footer>
		</div>
	);
}
