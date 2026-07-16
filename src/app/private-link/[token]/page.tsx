"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import {
	Music,
	Image as ImageIcon,
	Clock,
	User,
	Mail,
	Phone,
	Users,
	Palette,
	Lightbulb,
	Navigation,
	FileText,
	Mic2,
	Sparkles,
	MapPin,
	Copy,
	Check,
	ArrowLeft,
	Play,
	Plane,
	Luggage,
	BedDouble,
	Utensils,
	Shield,
	Contact,
} from "lucide-react";
import { getCountryName, getCountryFlag } from "@/components/ui/country-select";

interface ShowData {
	id: string;
	slug: string;
	name: string;
	description?: string;
	biography?: string;
	style?: string;
	performanceType?: string;
	duration: number;
	profileImage?: string;
	realName?: string;
	email?: string;
	phone?: string;
	countryLiving?: string;
	homeCountry?: string;
	managedBy?: string;
	costumeColor?: string;
	manualCostumeColor?: string;
	lightColorSingle?: string;
	manualLightColor?: string;
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
	}>;
	techRider?: string;
	equipment?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	socialMedia?: Record<string, string>;
	members?: Array<{ name: string; countryLiving?: string; homeCountry?: string }>;
}

interface LogisticsData {
	actName: string;
	leadContactName: string;
	leadContactEmail: string;
	leadContactPhone: string;
	visibilityLevel: "L1" | "L2" | "L3";
	person: string;
	travelers: Array<Record<string, any>>;
}

interface LinkData {
	label: string;
	linkType: "show_info" | "logistics_info" | "both";
	thumbnail: string;
	expiryDate: string;
}

function Section({
	icon: Icon,
	title,
	accent = "purple",
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	accent?: "purple" | "pink" | "amber" | "green" | "blue";
	children: React.ReactNode;
}) {
	const colors = {
		purple: "bg-purple-500/15 text-purple-400",
		pink: "bg-pink-500/15 text-pink-400",
		amber: "bg-amber-500/15 text-amber-400",
		green: "bg-green-500/15 text-green-400",
		blue: "bg-blue-500/15 text-blue-400",
	};
	return (
		<div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-7">
			<h3 className="text-lg font-semibold text-white flex items-center gap-2.5 mb-5">
				<div className={`w-8 h-8 rounded-lg ${colors[accent]} flex items-center justify-center`}>
					<Icon className="h-4 w-4" />
				</div>
				{title}
			</h3>
			{children}
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="py-2.5 border-b border-white/[0.06] last:border-0">
			<p className="text-[11px] text-purple-300/50 uppercase tracking-wider font-medium mb-0.5">
				{label}
			</p>
			<div className="text-sm text-gray-200">{children}</div>
		</div>
	);
}

const TRAVELER_FIELD_LABELS: Record<string, string> = {
	fullPassportName: "Name",
	homeDepartureCity: "Departure City",
	preferredAirport: "Arrival Airport",
	roomPreference: "Room Preference",
	baggageNotes: "Baggage Notes",
	specialRemarks: "General Logistics Notes",
	frequentFlyer: "Flight / Frequent Flyer",
	passportNumber: "Passport Number",
	passportExpiry: "Passport Expiry",
	dietaryRequirements: "Dietary Requirements",
	visaNotes: "Transfer / Visa Notes",
	passportCopyUrl: "Passport Scan",
	visaCopyUrl: "Insurance Document",
	emergencyContact: "Emergency Contact",
	nationality: "Nationality",
	dateOfBirth: "Date of Birth",
};

export default function PrivateLinkPage() {
	const params = useParams();
	const router = useRouter();
	const token = params.token as string;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [link, setLink] = useState<LinkData | null>(null);
	const [show, setShow] = useState<ShowData | null>(null);
	const [logistics, setLogistics] = useState<LogisticsData | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch(`/api/private-link/${token}`);
				const data = await res.json();
				if (data.success) {
					setLink(data.data.link);
					setShow(data.data.show);
					setLogistics(data.data.logistics);
				} else {
					setError(data.error?.message || "This link could not be loaded");
				}
			} catch {
				setError("Failed to load this link");
			} finally {
				setLoading(false);
			}
		})();
	}, [token]);

	const getMediaUrl = (url?: string, filePath?: string): string => {
		if (!url) return "";
		if (url.startsWith("gs://")) {
			if (filePath) return `/api/media/${filePath}`;
			const match = url.match(/^gs:\/\/[^/]+\/(.+)$/);
			return match ? `/api/media/${match[1]}` : url;
		}
		if (url.startsWith("/") || url.startsWith("http")) return url;
		return `/api/media/${url}`;
	};

	const handleCopyLink = () => {
		navigator.clipboard.writeText(window.location.href);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
				<div className="text-center">
					<div className="relative w-16 h-16 mx-auto mb-5">
						<div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
						<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
					</div>
					<p className="text-purple-300/60 text-sm tracking-widest uppercase">Loading</p>
				</div>
			</div>
		);
	}

	if (error || !link) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
				<div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-xl max-w-md p-10 text-center">
					<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
						<Music className="h-8 w-8 text-purple-400/40" />
					</div>
					<h2 className="text-xl font-semibold text-white mb-2">Link unavailable</h2>
					<p className="text-purple-200/50 text-sm">{error}</p>
				</div>
			</div>
		);
	}

	const musicUrl = show?.musicTrack?.file_url
		? getMediaUrl(show.musicTrack.file_url, show.musicTrack.file_path)
		: "";

	return (
		<div className="min-h-screen bg-[#0a0a0f] text-white">
			{/* Top bar */}
			<div className="border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-20">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
					<button
						onClick={() => router.back()}
						className="text-white/40 hover:text-white/80 transition-colors shrink-0"
					>
						<ArrowLeft className="h-5 w-5" />
					</button>
					<div className="flex-1 min-w-0">
						<p className="text-xs text-white/40 uppercase tracking-wider">Shared FAME-link</p>
						<p className="text-sm font-semibold text-white truncate">{link.label}</p>
					</div>
					<Button
						onClick={handleCopyLink}
						size="sm"
						variant="outline"
						className="bg-white/[0.06] border-white/[0.12] text-white/80 hover:bg-white/[0.12] hover:text-white rounded-xl gap-1.5 shrink-0"
					>
						{copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
						{copied ? "Copied" : "Copy"}
					</Button>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
				{/* ── Show Info ── */}
				{show && (
					<>
						{/* Hero */}
						<div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
							<div className="relative h-48 sm:h-64 bg-gradient-to-br from-purple-900/60 to-pink-900/40">
								{(link.thumbnail || show.profileImage) && (
									<img
										src={getMediaUrl(link.thumbnail || show.profileImage)}
										alt={show.name}
										className="absolute inset-0 w-full h-full object-cover"
									/>
								)}
								<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
								<div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
									<p className="text-[11px] text-purple-300/70 uppercase tracking-widest font-medium mb-1">
										Show Profile
									</p>
									<h1 className="text-2xl sm:text-3xl font-bold text-white">{show.name}</h1>
									{show.realName && <p className="text-white/50 text-sm mt-0.5">{show.realName}</p>}
								</div>
							</div>
							<div className="p-5 sm:p-6 flex flex-wrap items-center gap-2">
								{show.style && (
									<Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/20 rounded-full px-3 py-1">
										{show.style}
									</Badge>
								)}
								{show.performanceType && (
									<Badge className="bg-pink-500/20 text-pink-200 border border-pink-400/20 rounded-full px-3 py-1 capitalize">
										{show.performanceType}
									</Badge>
								)}
								{show.duration > 0 && (
									<Badge className="bg-white/10 text-white/70 border border-white/10 rounded-full px-3 py-1">
										<Clock className="h-3 w-3 mr-1.5" />
										{show.duration} min
									</Badge>
								)}
								{show.members && show.members.length > 0 && (
									<Badge className="bg-white/10 text-white/70 border border-white/10 rounded-full px-3 py-1">
										<Users className="h-3 w-3 mr-1.5" />
										{show.members.length + 1}
									</Badge>
								)}
								{show.countryLiving && (
									<Badge className="bg-white/10 text-white/70 border border-white/10 rounded-full px-3 py-1">
										<MapPin className="h-3 w-3 mr-1.5" />
										{getCountryFlag(show.countryLiving)} {getCountryName(show.countryLiving)}
									</Badge>
								)}
							</div>
						</div>

						{/* Biography */}
						{show.biography && (
							<Section icon={Sparkles} title="Biography" accent="pink">
								<p className="text-[15px] text-gray-300/90 leading-relaxed whitespace-pre-wrap">
									{show.biography}
								</p>
							</Section>
						)}

						{/* Artist & Contact */}
						<Section icon={User} title="Artist & Contact">
							{show.realName && <Field label="Real Name">{show.realName}</Field>}
							{show.name && <Field label="Stage Name">{show.name}</Field>}
							{show.email && (
								<Field label="Email">
									<a href={`mailto:${show.email}`} className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1.5">
										<Mail className="h-3.5 w-3.5" />
										{show.email}
									</a>
								</Field>
							)}
							{show.phone && (
								<Field label="Phone">
									<a href={`tel:${show.phone}`} className="text-green-400 hover:text-green-300 inline-flex items-center gap-1.5">
										<Phone className="h-3.5 w-3.5" />
										{show.phone}
									</a>
								</Field>
							)}
							{show.managedBy && <Field label="Managed By">{show.managedBy}</Field>}
							{show.members && show.members.length > 0 && (
								<Field label="Group Members">
									<div className="flex flex-col gap-1.5 mt-1">
										{show.members.map((m, i) => (
											<span key={i} className="flex items-center gap-1.5">
												<Users className="h-3 w-3 text-purple-400" />
												{m.name}
											</span>
										))}
									</div>
								</Field>
							)}
						</Section>

						{/* Performance */}
						<Section icon={Sparkles} title="Performance" accent="amber">
							{show.performanceType && (
								<Field label="Performance Type">
									<span className="capitalize">{show.performanceType}</span>
								</Field>
							)}
							{show.style && <Field label="Performance Style">{show.style}</Field>}
							{show.duration > 0 && <Field label="Duration">{show.duration} min</Field>}
							<Field label="Performers">{(show.members?.length || 0) + 1}</Field>
						</Section>

						{/* Music & Sound */}
						<Section icon={Music} title="Music & Sound" accent="pink">
							{musicUrl ? (
								<div className="space-y-4">
									{show.musicTrack?.notes && (
										<p className="text-sm text-gray-400 italic border-l-2 border-purple-500/30 pl-3">
											{show.musicTrack.notes}
										</p>
									)}
									<AudioPlayer src={musicUrl} />
								</div>
							) : (
								<p className="text-sm text-white/30">No music track uploaded yet</p>
							)}
						</Section>

						{/* Costume & Lighting */}
						<Section icon={Palette} title="Costume & Lighting" accent="amber">
							{(show.manualCostumeColor || show.costumeColor) && (
								<Field label="Costume">{show.manualCostumeColor || show.costumeColor}</Field>
							)}
							{(show.manualLightColor || show.lightColorSingle) && (
								<Field label="Lighting Notes">
									<span className="flex items-center gap-1.5">
										<Lightbulb className="h-3.5 w-3.5 text-amber-400" />
										{show.manualLightColor || show.lightColorSingle}
									</span>
								</Field>
							)}
							{show.lightRequests && <Field label="Special Lighting Requests">{show.lightRequests}</Field>}
							{!show.manualCostumeColor &&
								!show.costumeColor &&
								!show.manualLightColor &&
								!show.lightColorSingle &&
								!show.lightRequests && (
									<p className="text-sm text-white/30">No costume or lighting details provided</p>
								)}
						</Section>

						{/* Stage & Tech Rider */}
						<Section icon={Navigation} title="Stage & Tech Rider" accent="blue">
							{show.customStagePosition && <Field label="Stage Plot">{show.customStagePosition}</Field>}
							{show.techRider && <Field label="Tech Rider">{show.techRider}</Field>}
							{show.equipment && <Field label="Props & Equipment">{show.equipment}</Field>}
							{!show.customStagePosition && !show.techRider && !show.equipment && (
								<p className="text-sm text-white/30">No stage or tech details provided</p>
							)}
						</Section>

						{/* Additional Notes */}
						{(show.notes || show.mcNotes || show.stageManagerNotes) && (
							<Section icon={FileText} title="Additional Notes" accent="green">
								{show.notes && <Field label="General Notes">{show.notes}</Field>}
								{show.mcNotes && (
									<Field label="MC Notes">
										<span className="flex items-center gap-1.5">
											<Mic2 className="h-3.5 w-3.5 text-green-400" />
											{show.mcNotes}
										</span>
									</Field>
								)}
								{show.stageManagerNotes && <Field label="Stage Manager Notes">{show.stageManagerNotes}</Field>}
							</Section>
						)}

						{/* Gallery */}
						{show.galleryFiles && show.galleryFiles.length > 0 && (
							<Section icon={ImageIcon} title="Gallery">
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{show.galleryFiles.map((file, i) => (
										<div
											key={i}
											className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] aspect-square"
										>
											{file.type === "image" ? (
												<ImageViewer
													file={{ name: file.name, type: "image", url: file.url, file_path: file.file_path, size: 0 }}
													className="w-full h-full"
												/>
											) : (
												<VideoPlayer
													file={{ name: file.name, type: "video", url: file.url, file_path: file.file_path, size: 0 }}
													className="w-full h-full"
												/>
											)}
										</div>
									))}
								</div>
							</Section>
						)}
					</>
				)}

				{/* ── Logistics Info ── */}
				{logistics && (
					<>
						<div className="pt-2">
							<h2 className="text-sm font-bold text-purple-300/50 uppercase tracking-widest mb-4 flex items-center gap-2">
								<Plane className="h-4 w-4" /> Logistics Info
								{logistics.person && (
									<span className="normal-case text-white/40 font-normal">— {logistics.person}</span>
								)}
							</h2>
						</div>

						{(logistics.actName || logistics.leadContactName) && (
							<Section icon={Contact} title="Act Contact" accent="blue">
								{logistics.actName && <Field label="Act Name">{logistics.actName}</Field>}
								{logistics.leadContactName && <Field label="Lead Contact">{logistics.leadContactName}</Field>}
								{logistics.leadContactEmail && (
									<Field label="Contact Email">
										<a href={`mailto:${logistics.leadContactEmail}`} className="text-purple-400 hover:text-purple-300">
											{logistics.leadContactEmail}
										</a>
									</Field>
								)}
								{logistics.leadContactPhone && <Field label="Contact Phone">{logistics.leadContactPhone}</Field>}
							</Section>
						)}

						{logistics.travelers.length === 0 && (
							<Section icon={Luggage} title="Traveler Details" accent="purple">
								<p className="text-sm text-white/30">No logistics details available for this person yet</p>
							</Section>
						)}

						{logistics.travelers.map((traveler, i) => (
							<Section key={i} icon={Luggage} title={traveler.fullPassportName || "Traveler"} accent="purple">
								{Object.entries(traveler)
									.filter(([key]) => key !== "fullPassportName")
									.map(([key, value]) => {
										if (!value) return null;
										const label = TRAVELER_FIELD_LABELS[key] || key;
										const isDoc = key === "passportCopyUrl" || key === "visaCopyUrl";
										return (
											<Field key={key} label={label}>
												{isDoc ? (
													<a
														href={getMediaUrl(value as string)}
														target="_blank"
														rel="noopener noreferrer"
														className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1.5"
													>
														<Shield className="h-3.5 w-3.5" />
														View document
													</a>
												) : (
													String(value)
												)}
											</Field>
										);
									})}
							</Section>
						))}
					</>
				)}
			</div>

			{/* Footer */}
			<footer className="border-t border-white/[0.04] py-6">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2">
					<FameLinkLogo width={20} height={20} className="opacity-30" />
					<span className="text-xs text-white/20">Powered by FameLink</span>
				</div>
			</footer>
		</div>
	);
}
