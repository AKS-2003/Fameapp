"use client";

/**
 * ConfirmedArtists — Artist Shows & Workshops
 *
 * PRIMARY DATA SOURCE: /api/events/{eventId}/artists
 *   → Same API used by Show Management (returns all 68+ artists)
 *   → Fields used: artistName, realName, style, performanceType,
 *                  status, is_confirmed, performanceDate, performance_date,
 *                  members, performanceDuration
 *
 * SECONDARY (optional merge): /api/contracts/{eventId}
 *   → Only for extra agreement detail (showsConfirmed, workshopsConfirmed)
 *     if the artist also exists in the contracts system.
 *
 * STATUS DERIVATION (no hardcode):
 *   - artist.status === "confirmed" OR artist.is_confirmed === true → "confirmed"
 *   - otherwise → "pending"
 *
 * SHOW SLOTS:
 *   - Grouped by artist.performanceDate / artist.performance_date
 *   - One slot per unique performanceDate per artist
 */

import { useState, useEffect, useMemo } from "react";
import {
	ChevronUp,
	ChevronDown,
	Music,
	GraduationCap,
	CheckCircle2,
	Clock,
	Loader2,
	Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ArtistStatus = "confirmed" | "pending";
type Tab = "performances" | "workshops";

interface ArtistRow {
	id: string;
	stageName: string;
	legalName: string;
	role: string; // performanceType from show management
	danceStyle: string; // style from show management
	status: ArtistStatus;
	// Shows = unique performanceDates this artist is assigned to
	performanceDates: string[];
	// Workshop count from contract agreement if available
	workshopsConfirmed: number;
	workshopSchedule: string;
}

function resolveStatus(artist: any): ArtistStatus {
	if (
		artist.status === "confirmed" ||
		artist.is_confirmed === true ||
		artist.isConfirmed === true
	)
		return "confirmed";
	return "pending";
}

function fmtDate(d: string) {
	if (!d) return "TBD";
	try {
		return new Date(d).toLocaleDateString("en-GB", {
			month: "long",
			day: "numeric",
		});
	} catch {
		return d;
	}
}

interface Props {
	providedEventId?: string;
}

export default function ConfirmedArtists({ providedEventId }: Props) {
	const [allArtists, setAllArtists] = useState<ArtistRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<Tab>("performances");
	const [expanded, setExpanded] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (!providedEventId) return;

		const load = async () => {
			setLoading(true);
			try {
				// PRIMARY: Show Management artists (same source as Cost Analysis)
				const [smRes, contractRes] = await Promise.all([
					fetch(`/api/events/${providedEventId}/artists`),
					fetch(`/api/contracts/${providedEventId}`).catch(() => null),
				]);

				const smData = await smRes.json();
				const smArtists: any[] = smData?.data || [];

				// Build contract map for workshop data (keyed by id or email)
				const contractMap = new Map<string, any>();
				if (contractRes) {
					const cData = await contractRes.json().catch(() => null);
					if (cData?.artists) {
						cData.artists.forEach((a: any) => {
							contractMap.set(a.id, a);
							if (a.email) contractMap.set(a.email, a);
						});
					}
				}

				// Group show management artists by their stage name (same artist can
				// appear multiple times — once per performanceDate)
				const artistMap = new Map<string, ArtistRow>();

				smArtists.forEach((a: any) => {
					const key = a.id || a.artistName;
					const date: string =
						a.performanceDate ||
						a.performance_date ||
						a.performancedate ||
						"";

					if (artistMap.has(key)) {
						// Add this performance date to existing artist
						const existing = artistMap.get(key)!;
						if (date && !existing.performanceDates.includes(date)) {
							existing.performanceDates.push(date);
						}
					} else {
						// Look up contract data for workshops
						const contract =
							contractMap.get(a.id) ||
							contractMap.get(a.email) ||
							null;

						artistMap.set(key, {
							id: a.id || key,
							stageName: a.artistName || a.stageName || a.name || "Unknown",
							legalName: a.realName || a.legalName || "",
							role: a.performanceType || a.role || "",
							danceStyle: a.style || "",
							status: resolveStatus(a),
							performanceDates: date ? [date] : [],
							workshopsConfirmed:
								contract?.agreement?.workshopsConfirmed ?? 0,
							workshopSchedule:
								contract?.travelLogistics?.workshopSchedule || "",
						});
					}
				});

				const rows = Array.from(artistMap.values());
				setAllArtists(rows);

				// Auto-expand confirmed artists that have at least 1 show
				const autoExpand = new Set(
					rows
						.filter(
							(r) =>
								r.status === "confirmed" &&
								r.performanceDates.length > 0,
						)
						.map((r) => r.id),
				);
				setExpanded(autoExpand);
			} catch (e) {
				console.error("ConfirmedArtists error:", e);
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [providedEventId]);

	// Filter by tab
	const filtered = useMemo(() => {
		if (tab === "performances")
			return allArtists.filter((a) => a.performanceDates.length > 0);
		return allArtists.filter((a) => a.workshopsConfirmed > 0);
	}, [allArtists, tab]);

	const toggle = (id: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	if (loading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white px-8 py-8">
			{/* Header */}
			<h1 className="text-2xl font-semibold text-slate-900">
				Artist Shows &amp; Workshops
			</h1>
			<p className="mt-1 text-sm text-slate-500">
				Overview of{" "}
				<span className="font-medium text-slate-700">all</span>{" "}
				<span className="font-medium text-green-600">confirmed</span> and{" "}
				<span className="font-medium text-amber-500">pending</span>{" "}
				performances and workshops from{" "}
				<span className="font-medium text-fuchsia-600">
					artist agreements
				</span>
				.
			</p>

			{/* Artist count info */}
			<div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
				<Users className="h-3.5 w-3.5" />
				<span>
					{allArtists.length} total artists ·{" "}
					{allArtists.filter((a) => a.status === "confirmed").length}{" "}
					confirmed ·{" "}
					{allArtists.filter((a) => a.status === "pending").length} pending
				</span>
			</div>

			{/* Tabs */}
			<div className="mt-5 mb-6 flex items-center gap-1 border-b border-slate-200">
				<TabBtn
					active={tab === "performances"}
					onClick={() => setTab("performances")}
					icon={Music}
					label="Performances"
				/>
				<TabBtn
					active={tab === "workshops"}
					onClick={() => setTab("workshops")}
					icon={GraduationCap}
					label="Workshops"
				/>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-xl border border-slate-200">
				{/* Column headers */}
				<div className="grid grid-cols-[32px_1fr_110px_180px_130px_120px] items-center border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
					<span />
					<span>Artist</span>
					<span>Role</span>
					<span>Dance Style</span>
					<span>Status</span>
					<span>Performances</span>
				</div>

				{/* Rows */}
				{filtered.length === 0 ? (
					<div className="px-6 py-14 text-center text-sm text-slate-400">
						{allArtists.length === 0
							? "No artists found for this event."
							: tab === "performances"
								? "No artists have been assigned to a performance date yet."
								: "No artists have workshops in their agreement yet."}
					</div>
				) : (
					<div className="divide-y divide-slate-100">
						{filtered.map((artist) => {
							const isExp = expanded.has(artist.id);
							const count =
								tab === "performances"
									? artist.performanceDates.length
									: artist.workshopsConfirmed;

							return (
								<div key={artist.id}>
									{/* Artist row */}
									<button
										type="button"
										onClick={() => toggle(artist.id)}
										className="grid w-full grid-cols-[32px_1fr_110px_180px_130px_120px] items-center px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
									>
										<span className="flex items-center justify-center text-slate-400">
											{isExp ? (
												<ChevronUp className="h-4 w-4" />
											) : (
												<ChevronDown className="h-4 w-4" />
											)}
										</span>

										{/* Name */}
										<span>
											<span className="block text-sm font-semibold text-slate-900">
												{artist.stageName}
											</span>
											{artist.legalName && (
												<span className="block text-xs text-fuchsia-500">
													{artist.legalName}
												</span>
											)}
										</span>

										{/* Role */}
										<span>
											{artist.role ? (
												<RoleBadge role={artist.role} />
											) : (
												<span className="text-xs text-slate-400">—</span>
											)}
										</span>

										{/* Dance style */}
										<span className="text-sm text-slate-700">
											{artist.danceStyle || "—"}
										</span>

										{/* Status */}
										<span>
											<StatusBadge status={artist.status} />
										</span>

										{/* Count */}
										<span className="text-sm text-slate-500">
											{count}{" "}
											{tab === "performances" ? "show" : "workshop"}
											{count !== 1 ? "s" : ""}
										</span>
									</button>

									{/* Expanded slots */}
									{isExp && (
										<div className="divide-y divide-slate-50 border-t border-slate-100 bg-slate-50/40">
											{tab === "performances"
												? artist.performanceDates.map((date, i) => (
														<ShowSlot
															key={i}
															index={i}
															date={fmtDate(date)}
														/>
													))
												: Array.from(
														{ length: artist.workshopsConfirmed },
														(_, i) => {
															const lines = artist.workshopSchedule
																? artist.workshopSchedule
																		.split(/[,\n]/)
																		.map((l) => l.trim())
																		.filter(Boolean)
																: [];
															return (
																<WorkshopSlot
																	key={i}
																	index={i}
																	detail={lines[i] || ""}
																/>
															);
														},
													)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

// ── Slot sub-components ────────────────────────────────────────────────────

function ShowSlot({ index, date }: { index: number; date: string }) {
	return (
		<div className="grid grid-cols-[32px_1fr_auto] items-center px-4 py-2.5">
			<span />
			<div className="flex items-center gap-4 text-sm text-slate-600">
				<Music className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
				<span className="w-14 font-medium text-slate-700">
					Show {index + 1}
				</span>
				{date && <span className="text-slate-500">{date}</span>}
				<span className="text-slate-400">Show Stage</span>
			</div>
			<span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
				Scheduled
			</span>
		</div>
	);
}

function WorkshopSlot({
	index,
	detail,
}: {
	index: number;
	detail: string;
}) {
	return (
		<div className="grid grid-cols-[32px_1fr_auto] items-center px-4 py-2.5">
			<span />
			<div className="flex items-center gap-4 text-sm text-slate-600">
				<GraduationCap className="h-3.5 w-3.5 shrink-0 text-blue-400" />
				<span className="w-24 font-medium text-slate-700">
					Workshop {index + 1}
				</span>
				{detail && <span className="text-slate-500">{detail}</span>}
			</div>
			<span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
				Scheduled
			</span>
		</div>
	);
}

// ── Tab button ─────────────────────────────────────────────────────────────
function TabBtn({
	active,
	onClick,
	icon: Icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ElementType;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors",
				active
					? "border-slate-900 text-slate-900"
					: "border-transparent text-slate-500 hover:text-slate-700",
			)}
		>
			<Icon className="h-4 w-4" />
			{label}
		</button>
	);
}

// ── Role badge ─────────────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, string> = {
	solo: "bg-violet-50 text-violet-700 border-violet-200",
	couple: "bg-pink-50 text-pink-700 border-pink-200",
	duo: "bg-pink-50 text-pink-700 border-pink-200",
	group: "bg-blue-50 text-blue-700 border-blue-200",
	trio: "bg-cyan-50 text-cyan-700 border-cyan-200",
	dj: "bg-orange-50 text-orange-700 border-orange-200",
	other: "bg-slate-50 text-slate-600 border-slate-200",
};

function RoleBadge({ role }: { role: string }) {
	const key = role.toLowerCase();
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
				ROLE_STYLE[key] || "border-slate-200 bg-slate-50 text-slate-600",
			)}
		>
			{role.charAt(0).toUpperCase() + role.slice(1)}
		</span>
	);
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ArtistStatus }) {
	if (status === "confirmed") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
				<CheckCircle2 className="h-3.5 w-3.5" />
				Confirmed
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
			<Clock className="h-3.5 w-3.5" />
			Pending
		</span>
	);
}
