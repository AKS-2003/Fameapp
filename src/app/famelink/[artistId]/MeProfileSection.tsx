import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Loader2,
	User,
	Camera,
	Upload,
	Trash2,
	Music,
	Calendar,
	ImageIcon,
	Globe,
	Plus,
	Link2,
	Copy,
	Check,
	ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadToGCS } from "@/lib/upload-utils";
import { FILE_LIMITS } from "@/lib/constants";
import { QRCodeDialog } from "@/components/ui/qr-code-dialog";

interface KnownForItem {
	title: string;
	description: string;
	thumbnail: string;
	video: string;
}

interface EventItem {
	year: string;
	name: string;
	role: string;
	location: string;
}

interface MeProfile {
	slug?: string;
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
		instagram: string;
		facebook: string;
		youtube: string;
		website: string;
	};
}

const EMPTY_PROFILE: MeProfile = {
	stageName: "",
	tagline: "",
	city: "",
	country: "",
	profileImage: "",
	bannerImage: "",
	biography: "",
	languages: "",
	performanceStyles: "",
	knownFor: [],
	events: [],
	photos: [],
	socialMedia: { instagram: "", facebook: "", youtube: "", website: "" },
};

type MeTab = "basics" | "bio" | "knownFor" | "events" | "photos" | "social";

const TABS: { id: MeTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
	{ id: "basics", label: "Basics", icon: User },
	{ id: "bio", label: "Bio", icon: Globe },
	{ id: "knownFor", label: "Known For", icon: Music },
	{ id: "events", label: "Events", icon: Calendar },
	{ id: "photos", label: "Photos", icon: ImageIcon },
	{ id: "social", label: "Social", icon: Globe },
];

function getMediaUrl(src: string): string {
	if (!src) return "";
	if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
	return `/api/media/${src}`;
}

export function MeProfileSection({ artistId }: { artistId: string }) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [tab, setTab] = useState<MeTab>("basics");
	const [profile, setProfile] = useState<MeProfile>(EMPTY_PROFILE);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("/api/me-profile");
				const data = await res.json();
				if (data.success && data.data.profile) {
					const p = data.data.profile;
					setProfile({
						slug: p.slug,
						stageName: p.stageName || "",
						tagline: p.tagline || "",
						city: p.city || "",
						country: p.country || "",
						profileImage: p.profileImage || "",
						bannerImage: p.bannerImage || "",
						biography: p.biography || "",
						languages: p.languages || "",
						performanceStyles: p.performanceStyles || "",
						knownFor: p.knownFor || [],
						events: p.events || [],
						photos: p.photos || [],
						socialMedia: {
							instagram: p.socialMedia?.instagram || "",
							facebook: p.socialMedia?.facebook || "",
							youtube: p.socialMedia?.youtube || "",
							website: p.socialMedia?.website || "",
						},
					});
				}
			} catch {
				/* ignore — start from empty profile */
			} finally {
				setLoading(false);
			}
		})();
	}, [artistId]);

	async function handleSave() {
		setSaving(true);
		try {
			const res = await fetch("/api/me-profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(profile),
			});
			const data = await res.json();
			if (data.success) {
				setProfile((prev) => ({ ...prev, slug: data.data.profile.slug }));
				toast({ title: "Profile saved", description: "Your public profile has been updated." });
			} else {
				throw new Error(data.error?.message || "Failed to save");
			}
		} catch (err) {
			toast({
				title: "Error saving profile",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	}

	async function handleImageUpload(
		e: React.ChangeEvent<HTMLInputElement>,
		onDone: (fileName: string) => void,
	) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/") || file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
			toast({ title: "Invalid file", description: "Please upload an image under 100MB", variant: "destructive" });
			return;
		}
		try {
			const result = await uploadToGCS({ file, eventId: "famelink", artistId, fileType: "profile" });
			onDone(result.fileName);
		} catch {
			toast({ title: "Upload failed", variant: "destructive" });
		} finally {
			e.target.value = "";
		}
	}

	const publicUrl = profile.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${profile.slug}` : "";

	function copyPublicLink() {
		if (!publicUrl) return;
		navigator.clipboard.writeText(publicUrl);
		setCopied(true);
		toast({ title: "Link copied", description: "Public profile link copied to clipboard" });
		setTimeout(() => setCopied(false), 2000);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
						<User className="h-6 w-6 text-purple-400" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-white leading-tight">Me</h1>
						<p className="text-sm text-purple-200/50">
							Everything here appears on your public profile
						</p>
					</div>
				</div>
			</div>

			{/* Public link */}
			<div className="rounded-2xl border border-purple-500/20 bg-[#1a1429] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<Link2 className="h-4 w-4 text-purple-400 shrink-0" />
					<span className="text-sm text-purple-200/70 truncate">
						{publicUrl || "Save your profile to get a public link"}
					</span>
				</div>
				{publicUrl && (
					<div className="flex gap-2 shrink-0">
						<Button
							onClick={copyPublicLink}
							size="sm"
							className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl gap-1.5"
						>
							{copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
							Copy
						</Button>
						<QRCodeDialog
							url={publicUrl}
							title={profile.stageName || "My Profile"}
							description="Scan this code to open your public profile."
							triggerText="QR"
							triggerVariant="outline"
							triggerSize="sm"
							triggerClassName="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl"
						/>
						<Button
							onClick={() => window.open(publicUrl, "_blank")}
							size="sm"
							variant="outline"
							className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-1.5"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							View
						</Button>
					</div>
				)}
			</div>

			{/* Tabs */}
			<div className="flex gap-2 overflow-x-auto pb-1">
				{TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
							tab === t.id
								? "bg-[#bf1ed4] text-white"
								: "bg-white/5 text-purple-200/60 hover:bg-white/10"
						}`}
					>
						<t.icon className="h-3.5 w-3.5" />
						{t.label}
					</button>
				))}
			</div>

			{/* Tab content */}
			<div className="rounded-2xl border border-white/5 bg-[#1a1429] p-6 shadow-xl">
				{tab === "basics" && (
					<BasicsTab
						profile={profile}
						setProfile={setProfile}
						onUpload={handleImageUpload}
					/>
				)}
				{tab === "bio" && <BioTab profile={profile} setProfile={setProfile} />}
				{tab === "knownFor" && (
					<KnownForTab profile={profile} setProfile={setProfile} onUpload={handleImageUpload} artistId={artistId} toast={toast} />
				)}
				{tab === "events" && <EventsTab profile={profile} setProfile={setProfile} />}
				{tab === "photos" && (
					<PhotosTab profile={profile} setProfile={setProfile} artistId={artistId} toast={toast} />
				)}
				{tab === "social" && <SocialTab profile={profile} setProfile={setProfile} />}

				<div className="pt-6 mt-6 border-t border-white/5">
					<Button
						onClick={handleSave}
						disabled={saving}
						className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white rounded-xl border-0 h-11 px-8"
					>
						{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
						Save profile
					</Button>
				</div>
			</div>
		</div>
	);
}

// ── Basics ───────────────────────────────────────────────────────────────────

function BasicsTab({
	profile,
	setProfile,
	onUpload,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>, onDone: (fileName: string) => void) => void;
}) {
	return (
		<div className="space-y-5">
			<div className="flex items-center gap-5">
				<div
					className="relative group cursor-pointer shrink-0"
					onClick={() => document.getElementById("me-profile-image-input")?.click()}
				>
					{profile.profileImage ? (
						<img
							src={getMediaUrl(profile.profileImage)}
							alt="Profile"
							className="w-[72px] h-[72px] rounded-full object-cover border-2 border-purple-500/50"
						/>
					) : (
						<div className="w-[72px] h-[72px] rounded-full bg-purple-900/40 border-2 border-purple-500/30 flex items-center justify-center">
							<Camera className="w-6 h-6 text-purple-400" />
						</div>
					)}
					<div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
						<Camera className="w-4 h-4 text-white" />
					</div>
				</div>
				<input
					type="file"
					id="me-profile-image-input"
					accept="image/*"
					className="hidden"
					onChange={(e) => onUpload(e, (fileName) => setProfile((p) => ({ ...p, profileImage: fileName })))}
				/>
				<p className="text-sm text-purple-200/50">
					Tap the photo to upload a new profile image. This is your main avatar on your public profile.
				</p>
			</div>

			<div className="space-y-2">
				<Label className="text-white">Profile Banner</Label>
				<div
					className="relative h-28 rounded-xl border border-dashed border-white/15 bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center cursor-pointer overflow-hidden"
					onClick={() => document.getElementById("me-banner-input")?.click()}
				>
					{profile.bannerImage ? (
						<img src={getMediaUrl(profile.bannerImage)} alt="Banner" className="w-full h-full object-cover" />
					) : (
						<span className="text-sm text-white/70 font-medium">No banner yet — falls back to your photo</span>
					)}
				</div>
				<input
					type="file"
					id="me-banner-input"
					accept="image/*"
					className="hidden"
					onChange={(e) => onUpload(e, (fileName) => setProfile((p) => ({ ...p, bannerImage: fileName })))}
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={() => document.getElementById("me-banner-input")?.click()}
					className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-lg gap-1.5"
				>
					<Upload className="h-3.5 w-3.5" /> Upload banner
				</Button>
			</div>

			<div className="space-y-2">
				<Label className="text-white">Stage Name</Label>
				<Input
					value={profile.stageName}
					onChange={(e) => setProfile((p) => ({ ...p, stageName: e.target.value }))}
					placeholder="e.g. Maria L."
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>

			<div className="space-y-2">
				<Label className="text-white">Tagline</Label>
				<Input
					value={profile.tagline}
					onChange={(e) => setProfile((p) => ({ ...p, tagline: e.target.value }))}
					placeholder="e.g. Dancer · Choreographer · Instructor"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label className="text-white">City</Label>
					<Input
						value={profile.city}
						onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
						className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
					/>
				</div>
				<div className="space-y-2">
					<Label className="text-white">Country</Label>
					<Input
						value={profile.country}
						onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))}
						className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
					/>
				</div>
			</div>
		</div>
	);
}

// ── Bio ──────────────────────────────────────────────────────────────────────

function BioTab({
	profile,
	setProfile,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
}) {
	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<Label className="text-white">Biography</Label>
				<Textarea
					value={profile.biography}
					onChange={(e) => setProfile((p) => ({ ...p, biography: e.target.value }))}
					rows={6}
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
				<p className="text-xs text-purple-300/30 text-right">{profile.biography.length} chars</p>
			</div>
			<div className="space-y-2">
				<Label className="text-white">Languages</Label>
				<Input
					value={profile.languages}
					onChange={(e) => setProfile((p) => ({ ...p, languages: e.target.value }))}
					placeholder="e.g. English · Spanish · Portuguese"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
			<div className="space-y-2">
				<Label className="text-white">Performance Styles</Label>
				<Input
					value={profile.performanceStyles}
					onChange={(e) => setProfile((p) => ({ ...p, performanceStyles: e.target.value }))}
					placeholder="e.g. Salsa · Bachata Sensual · Afro-Latin"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
		</div>
	);
}

// ── Known For ────────────────────────────────────────────────────────────────

function KnownForTab({
	profile,
	setProfile,
	onUpload,
	artistId,
	toast,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>, onDone: (fileName: string) => void) => void;
	artistId: string;
	toast: ReturnType<typeof useToast>["toast"];
}) {
	function updateItem(index: number, updates: Partial<KnownForItem>) {
		setProfile((p) => ({
			...p,
			knownFor: p.knownFor.map((item, i) => (i === index ? { ...item, ...updates } : item)),
		}));
	}

	function removeItem(index: number) {
		setProfile((p) => ({ ...p, knownFor: p.knownFor.filter((_, i) => i !== index) }));
	}

	async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>, index: number) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("video/")) {
			toast({ title: "Invalid file", description: "Please upload a video file", variant: "destructive" });
			return;
		}
		try {
			const result = await uploadToGCS({ file, eventId: "famelink", artistId, fileType: "knownfor" });
			updateItem(index, { video: result.fileName });
		} catch {
			toast({ title: "Upload failed", variant: "destructive" });
		} finally {
			e.target.value = "";
		}
	}

	return (
		<div className="space-y-5">
			<p className="text-sm text-purple-200/50">
				Showcase your signature shows. Upload a video and thumbnail for each.
			</p>
			{profile.knownFor.map((item, i) => (
				<div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-purple-300/60 uppercase tracking-wider">Show {i + 1}</span>
						<button onClick={() => removeItem(i)} className="text-red-400 text-xs font-semibold hover:text-red-300">
							Remove
						</button>
					</div>
					<Input
						value={item.title}
						onChange={(e) => updateItem(i, { title: e.target.value })}
						placeholder="Title"
						className="bg-white/5 border-white/10 text-white"
					/>
					<Input
						value={item.description}
						onChange={(e) => updateItem(i, { description: e.target.value })}
						placeholder="Description"
						className="bg-white/5 border-white/10 text-white"
					/>
					<div className="flex gap-3">
						<div
							className="w-[72px] h-[72px] rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
							onClick={() => document.getElementById(`known-for-thumb-${i}`)?.click()}
						>
							{item.thumbnail ? (
								<img src={getMediaUrl(item.thumbnail)} alt="" className="w-full h-full object-cover" />
							) : (
								<ImageIcon className="h-5 w-5 text-white/40" />
							)}
						</div>
						<input
							type="file"
							id={`known-for-thumb-${i}`}
							accept="image/*"
							className="hidden"
							onChange={(e) => onUpload(e, (fileName) => updateItem(i, { thumbnail: fileName }))}
						/>
						<label
							htmlFor={`known-for-video-${i}`}
							className="flex-1 h-[72px] rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer gap-1"
						>
							{item.video ? (
								<span className="text-xs text-green-400 font-semibold">Video uploaded</span>
							) : (
								<>
									<Plus className="h-4 w-4 text-purple-300/50" />
									<span className="text-xs text-purple-300/50">Upload video</span>
								</>
							)}
						</label>
						<input
							type="file"
							id={`known-for-video-${i}`}
							accept="video/*"
							className="hidden"
							onChange={(e) => handleVideoUpload(e, i)}
						/>
					</div>
				</div>
			))}
			<Button
				variant="outline"
				onClick={() =>
					setProfile((p) => ({
						...p,
						knownFor: [...p.knownFor, { title: "", description: "", thumbnail: "", video: "" }],
					}))
				}
				className="w-full bg-transparent border-dashed border-purple-500/40 text-purple-300 hover:bg-purple-500/10 rounded-xl gap-2"
			>
				<Plus className="h-4 w-4" /> Add another show
			</Button>
		</div>
	);
}

// ── Events ───────────────────────────────────────────────────────────────────

function EventsTab({
	profile,
	setProfile,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
}) {
	function updateItem(index: number, updates: Partial<EventItem>) {
		setProfile((p) => ({
			...p,
			events: p.events.map((item, i) => (i === index ? { ...item, ...updates } : item)),
		}));
	}

	function removeItem(index: number) {
		setProfile((p) => ({ ...p, events: p.events.filter((_, i) => i !== index) }));
	}

	return (
		<div className="space-y-5">
			<p className="text-sm text-purple-200/50">
				List the events, festivals and congresses on your public timeline.
			</p>
			{profile.events.map((item, i) => (
				<div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<div className="flex items-start gap-3">
						<Input
							value={item.year}
							onChange={(e) => updateItem(i, { year: e.target.value })}
							placeholder="Year"
							className="bg-white/5 border-white/10 text-white w-24"
						/>
						<div className="flex-1" />
						<button onClick={() => removeItem(i)} className="text-red-400 text-xs font-semibold hover:text-red-300 mt-2.5">
							Remove
						</button>
					</div>
					<Input
						value={item.name}
						onChange={(e) => updateItem(i, { name: e.target.value })}
						placeholder="Event name"
						className="bg-white/5 border-white/10 text-white"
					/>
					<Input
						value={item.role}
						onChange={(e) => updateItem(i, { role: e.target.value })}
						placeholder="Role / show"
						className="bg-white/5 border-white/10 text-white"
					/>
					<Input
						value={item.location}
						onChange={(e) => updateItem(i, { location: e.target.value })}
						placeholder="Location"
						className="bg-white/5 border-white/10 text-white"
					/>
				</div>
			))}
			<Button
				variant="outline"
				onClick={() =>
					setProfile((p) => ({
						...p,
						events: [...p.events, { year: "", name: "", role: "", location: "" }],
					}))
				}
				className="w-full bg-transparent border-dashed border-purple-500/40 text-purple-300 hover:bg-purple-500/10 rounded-xl gap-2"
			>
				<Plus className="h-4 w-4" /> Add event
			</Button>
		</div>
	);
}

// ── Photos ───────────────────────────────────────────────────────────────────

function PhotosTab({
	profile,
	setProfile,
	artistId,
	toast,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
	artistId: string;
	toast: ReturnType<typeof useToast>["toast"];
}) {
	async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/") || file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
			toast({ title: "Invalid file", description: "Please upload an image under 100MB", variant: "destructive" });
			return;
		}
		try {
			const result = await uploadToGCS({ file, eventId: "famelink", artistId, fileType: "photo" });
			setProfile((p) => ({ ...p, photos: [...p.photos, result.fileName] }));
		} catch {
			toast({ title: "Upload failed", variant: "destructive" });
		} finally {
			e.target.value = "";
		}
	}

	function removePhoto(index: number) {
		setProfile((p) => ({ ...p, photos: p.photos.filter((_, i) => i !== index) }));
	}

	return (
		<div className="space-y-5">
			<p className="text-sm text-purple-200/50">Add photos organisers see in your public gallery.</p>
			<div className="grid grid-cols-3 gap-3">
				{profile.photos.map((photo, i) => (
					<div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
						<img src={getMediaUrl(photo)} alt="" className="w-full h-full object-cover" />
						<button
							onClick={() => removePhoto(i)}
							className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
						>
							<Trash2 className="h-3 w-3 text-white" />
						</button>
					</div>
				))}
				<label
					htmlFor="me-photo-input"
					className="aspect-square rounded-xl border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
				>
					<Plus className="h-6 w-6 text-purple-300/50" />
				</label>
				<input type="file" id="me-photo-input" accept="image/*" className="hidden" onChange={handleAddPhoto} />
			</div>
		</div>
	);
}

// ── Social ───────────────────────────────────────────────────────────────────

function SocialTab({
	profile,
	setProfile,
}: {
	profile: MeProfile;
	setProfile: React.Dispatch<React.SetStateAction<MeProfile>>;
}) {
	return (
		<div className="space-y-5">
			<p className="text-sm text-purple-200/50">
				Link your official channels so organisers can verify and follow you.
			</p>
			<div className="space-y-2">
				<Label className="text-white">Instagram</Label>
				<Input
					value={profile.socialMedia.instagram}
					onChange={(e) =>
						setProfile((p) => ({ ...p, socialMedia: { ...p.socialMedia, instagram: e.target.value } }))
					}
					placeholder="https://instagram.com/username"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
			<div className="space-y-2">
				<Label className="text-white">Facebook</Label>
				<Input
					value={profile.socialMedia.facebook}
					onChange={(e) =>
						setProfile((p) => ({ ...p, socialMedia: { ...p.socialMedia, facebook: e.target.value } }))
					}
					placeholder="https://facebook.com/username"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
			<div className="space-y-2">
				<Label className="text-white">YouTube</Label>
				<Input
					value={profile.socialMedia.youtube}
					onChange={(e) =>
						setProfile((p) => ({ ...p, socialMedia: { ...p.socialMedia, youtube: e.target.value } }))
					}
					placeholder="https://youtube.com/@username"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
			<div className="space-y-2">
				<Label className="text-white">Website</Label>
				<Input
					value={profile.socialMedia.website}
					onChange={(e) =>
						setProfile((p) => ({ ...p, socialMedia: { ...p.socialMedia, website: e.target.value } }))
					}
					placeholder="https://yourdomain.com"
					className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
				/>
			</div>
		</div>
	);
}
