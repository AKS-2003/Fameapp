"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadToGCS } from "@/lib/upload-utils";
import { FILE_LIMITS } from "@/lib/constants";
import {
	Link2,
	Music,
	ImageIcon,
	Upload,
	Loader2,
	CalendarDays,
	Mail,
	CheckCircle2,
	User,
	Eye,
} from "lucide-react";

interface BaseShow {
	id: string;
	name: string;
	style?: string;
	performanceType?: string;
	duration: number;
	profileImage?: string;
	members?: Array<{
		name: string;
		countryLiving?: string;
		homeCountry?: string;
	}>;
}

type LinkType = "show_info" | "logistics_info" | "both";
type VisibilityLevel = "L1" | "L2" | "L3";

interface GeneratePrivateLinkModalProps {
	artistId: string;
	artistName?: string;
	shows: BaseShow[];
	/** Pre-select this show (e.g. when opened from a specific show's "Share" button) */
	initialShowId?: string;
	onDismiss: () => void;
	onCreated: (link: any) => void;
}

const LINK_TYPE_OPTIONS: { value: LinkType; label: string }[] = [
	{ value: "show_info", label: "Show Info" },
	{ value: "logistics_info", label: "Logistics Info" },
	{ value: "both", label: "Both" },
];

const VISIBILITY_LEVELS: {
	value: VisibilityLevel;
	label: string;
	fields: string[];
	inherited?: string;
}[] = [
	{
		value: "L1",
		label: "Level 1 — Basic logistics",
		fields: [
			"Number of travelers",
			"Departure city",
			"Arrival city",
			"Room preferences",
			"Baggage notes",
			"General logistics notes",
		],
	},
	{
		value: "L2",
		label: "Level 2 — Travel details",
		fields: [
			"Flight numbers & times",
			"Passport details",
			"Dietary requirements",
			"Transfer preferences",
		],
		inherited: "All Level 1 fields",
	},
	{
		value: "L3",
		label: "Level 3 — Full logistics + documents",
		fields: [
			"Passport scans",
			"Insurance documents",
			"Emergency contacts",
			"Medical notes",
		],
		inherited: "All Level 2 fields",
	},
];

export function GeneratePrivateLinkModal({
	artistId,
	artistName,
	shows,
	initialShowId,
	onDismiss,
	onCreated,
}: GeneratePrivateLinkModalProps) {
	const { toast } = useToast();
	const [label, setLabel] = useState("");
	const [linkType, setLinkType] = useState<LinkType>("show_info");
	const [selectedShowId, setSelectedShowId] = useState<string>(
		(initialShowId && shows.some((s) => s.id === initialShowId)) ? initialShowId : (shows[0]?.id || ""),
	);
	const [thumbnail, setThumbnail] = useState("");
	const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
	const [thumbnailProgress, setThumbnailProgress] = useState(0);
	const [expiryDate, setExpiryDate] = useState("");
	const [emailRestriction, setEmailRestriction] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [selectedPerson, setSelectedPerson] = useState<string>("");
	const [visibilityLevel, setVisibilityLevel] = useState<VisibilityLevel>("L1");

	const selectedShow = shows.find((s) => s.id === selectedShowId) || null;
	const needsLogistics = linkType === "logistics_info" || linkType === "both";

	const people = selectedShow
		? [
				{ name: artistName || "Main Artist", role: "Main Artist" },
				...(selectedShow.members || []).map((m) => ({ name: m.name, role: "Group Member" })),
			]
		: [];

	// Reset person selection when the show changes so a stale name from another show isn't kept
	useEffect(() => {
		setSelectedPerson(people[0]?.name || "");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedShowId]);

	async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
			setUploadingThumbnail(true);
			setThumbnailProgress(0);
			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "thumbnail",
				onProgress: (pct) => setThumbnailProgress(pct),
			});
			setThumbnail(result.fileName);
		} catch {
			toast({
				title: "Upload failed",
				description: "Failed to upload thumbnail",
				variant: "destructive",
			});
		} finally {
			setUploadingThumbnail(false);
			e.target.value = "";
		}
	}

	async function handleGenerate() {
		if (!label.trim()) {
			toast({
				title: "Error",
				description: "Label is required",
				variant: "destructive",
			});
			return;
		}
		if (!selectedShowId) {
			toast({
				title: "Error",
				description: "Please select a show",
				variant: "destructive",
			});
			return;
		}
		if (needsLogistics && !selectedPerson) {
			toast({
				title: "Error",
				description: "Please select a person for logistics info",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);
		try {
			const response = await fetch("/api/shows/share-links", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					label: label.trim(),
					linkType,
					showId: selectedShowId,
					showName: selectedShow?.name || "",
					showSlug: selectedShowId,
					thumbnail,
					emailRestriction: emailRestriction.trim(),
					expiryDate,
					...(needsLogistics && {
						logisticsPerson: selectedPerson,
						visibilityLevel,
					}),
				}),
			});
			const result = await response.json();
			if (result.success) {
				const url = `${window.location.origin}/private-link/${result.data.link.token}`;
				await navigator.clipboard.writeText(url);
				toast({
					title: "Link generated!",
					description: "Private link copied to clipboard",
					variant: "success",
				});
				onCreated(result.data.link);
			} else {
				toast({
					title: "Error",
					description: result.error?.message || "Failed to generate link",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: "Error",
				description: "Failed to generate link",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
			<DialogContent className="bg-[#0f0b20] border border-purple-500/20 text-white max-w-lg rounded-2xl shadow-2xl shadow-purple-500/10 max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl text-white flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center">
							<Link2 className="h-4 w-4 text-pink-400" />
						</div>
						Generate Private Link
					</DialogTitle>
					<DialogDescription className="text-purple-200/40">
						Creates a copy for the organizer. Your original stays untouched.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 mt-2">
					{/* Label */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">
							Label <span className="text-pink-400">*</span>
						</Label>
						<Input
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="e.g. Solo Lady Style — Pa'lante for Berlin Congress"
							className="border-white/10 text-white rounded-xl placeholder:text-purple-300/30 focus:border-purple-400/50 focus:ring-purple-400/20"
							style={{ background: "rgba(255,255,255,0.05)" }}
						/>
					</div>

					{/* Link Type */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">Link Type</Label>
						<div className="grid grid-cols-3 gap-2">
							{LINK_TYPE_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => setLinkType(opt.value)}
									className={`text-xs font-semibold py-2.5 rounded-xl border transition-all ${
										linkType === opt.value
											? "bg-pink-500/20 border-pink-400/50 text-pink-200"
											: "bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10"
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					{/* Select show */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">
							Select show <span className="text-pink-400">*</span>
						</Label>
						{shows.length === 0 ? (
							<div className="p-4 rounded-xl bg-white/5 border border-purple-500/15 text-sm text-purple-200/60 text-center">
								No shows yet. Create a show first.
							</div>
						) : (
							<div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
								{shows.map((show) => {
									const isSelected = selectedShowId === show.id;
									return (
										<button
											key={show.id}
											type="button"
											onClick={() => setSelectedShowId(show.id)}
											className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-pink-500/15 border-pink-400/50"
													: "bg-white/5 border-white/10 hover:bg-white/10"
											}`}
										>
											<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center shrink-0 border border-purple-500/20 overflow-hidden">
												{show.profileImage ? (
													<img src={`/api/media/${show.profileImage}`} alt={show.name} className="w-full h-full object-cover" />
												) : (
													<Music className="h-4 w-4 text-purple-300/60" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className={`text-sm font-semibold truncate ${isSelected ? "text-pink-200" : "text-white"}`}>
													{show.name}
												</p>
												<p className="text-xs text-purple-300/50 truncate mt-0.5">
													{show.performanceType || "Performance"} · {show.duration} min
												</p>
											</div>
											{isSelected && (
												<span className="text-[10px] font-bold text-pink-300 shrink-0">SELECTED</span>
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Select person(s) + Visibility level — only for Logistics Info / Both */}
					{needsLogistics && selectedShow && (
						<>
							<div className="space-y-2">
								<Label className="text-white font-medium text-sm">
									Select person(s) <span className="text-pink-400">*</span>
								</Label>
								<div className="flex flex-col gap-2">
									{people.map((person) => {
										const isSelected = selectedPerson === person.name;
										return (
											<button
												key={person.name}
												type="button"
												onClick={() => setSelectedPerson(person.name)}
												className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
													isSelected
														? "bg-pink-500/15 border-pink-400/50"
														: "bg-white/5 border-white/10 hover:bg-white/10"
												}`}
											>
												<div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 border border-purple-500/20">
													<User className="h-4 w-4 text-purple-300/70" />
												</div>
												<div className="flex-1 min-w-0">
													<p className={`text-sm font-semibold truncate ${isSelected ? "text-pink-200" : "text-white"}`}>
														{person.name}
													</p>
													<p className="text-xs text-purple-300/50 mt-0.5">{person.role}</p>
												</div>
												{isSelected && (
													<span className="text-[10px] font-bold text-pink-300 shrink-0">SELECTED</span>
												)}
											</button>
										);
									})}
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-white font-medium text-sm flex items-center gap-2">
									<Eye className="h-4 w-4 text-purple-300/40" />
									Visibility level
								</Label>
								<div className="grid grid-cols-3 gap-2">
									{VISIBILITY_LEVELS.map((lvl) => (
										<button
											key={lvl.value}
											type="button"
											onClick={() => setVisibilityLevel(lvl.value)}
											className={`text-xs font-semibold py-2.5 px-1 rounded-xl border transition-all ${
												visibilityLevel === lvl.value
													? "bg-pink-500/20 border-pink-400/50 text-pink-200"
													: "bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10"
											}`}
										>
											{lvl.label}
										</button>
									))}
								</div>
								{(() => {
									const active = VISIBILITY_LEVELS.find((l) => l.value === visibilityLevel)!;
									return (
										<div className="rounded-xl border border-purple-500/15 bg-white/4 p-3.5">
											<p className="text-xs font-semibold text-purple-300/70 mb-2">
												Visible fields at {active.value}:
											</p>
											<ul className="text-xs text-purple-200/60 space-y-1 list-disc pl-4">
												{active.inherited && <li>{active.inherited}</li>}
												{active.fields.map((f) => (
													<li key={f}>{f}</li>
												))}
											</ul>
										</div>
									);
								})()}
							</div>
						</>
					)}

					{/* Thumbnail */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">Thumbnail</Label>
						<div className="flex items-center gap-3">
							<div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center shrink-0 overflow-hidden">
								{uploadingThumbnail ? (
									<>
										<Loader2 className="h-5 w-5 text-purple-300/60 animate-spin" />
										<span className="text-[9px] text-purple-300/50 mt-1">{thumbnailProgress}%</span>
									</>
								) : thumbnail ? (
									<img src={`/api/media/${thumbnail}`} alt="Thumbnail" className="w-full h-full object-cover" />
								) : (
									<ImageIcon className="h-5 w-5 text-purple-300/30" />
								)}
							</div>
							<div className="flex-1">
								{!thumbnail ? (
									<p className="text-xs text-purple-300/40 mb-2">No thumbnail selected</p>
								) : (
									<p className="text-xs text-green-400/70 mb-2 flex items-center gap-1">
										<CheckCircle2 className="h-3 w-3" /> Thumbnail uploaded
									</p>
								)}
								<label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-purple-200 hover:bg-white/10 cursor-pointer transition-all">
									<Upload className="h-3 w-3" />
									{thumbnail ? "Replace" : "Upload"}
									<input
										type="file"
										accept="image/*"
										className="hidden"
										onChange={handleThumbnailUpload}
										disabled={uploadingThumbnail}
									/>
								</label>
							</div>
						</div>
					</div>

					{/* Expiry date */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">
							Expiry date <span className="text-purple-300/40">(optional)</span>
						</Label>
						<div className="relative">
							<CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/40" />
							<Input
								type="date"
								value={expiryDate}
								onChange={(e) => setExpiryDate(e.target.value)}
								className="border-white/10 text-white pl-10 rounded-xl focus:border-purple-400/50 focus:ring-purple-400/20"
								style={{ background: "rgba(255,255,255,0.05)", colorScheme: "dark" }}
							/>
						</div>
					</div>

					{/* Email restriction */}
					<div className="space-y-2">
						<Label className="text-white font-medium text-sm">
							Email restriction <span className="text-purple-300/40">(optional)</span>
						</Label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300/40" />
							<Input
								type="email"
								value={emailRestriction}
								onChange={(e) => setEmailRestriction(e.target.value)}
								placeholder="organizer@example.com"
								className="border-white/10 text-white pl-10 rounded-xl placeholder:text-purple-300/30 focus:border-purple-400/50 focus:ring-purple-400/20"
								style={{ background: "rgba(255,255,255,0.05)" }}
							/>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-2">
						<Button
							onClick={onDismiss}
							className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl transition-all duration-200"
						>
							Cancel
						</Button>
						<Button
							onClick={handleGenerate}
							disabled={
								submitting ||
								uploadingThumbnail ||
								!label.trim() ||
								!selectedShowId ||
								(needsLogistics && !selectedPerson)
							}
							className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
						>
							{submitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Link2 className="h-4 w-4" />
							)}
							Generate & Copy Link
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
