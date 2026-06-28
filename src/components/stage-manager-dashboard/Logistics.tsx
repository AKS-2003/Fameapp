"use client";

import { useEffect, useState, useCallback } from "react";
import {
	Loader2,
	Search,
	ChevronRight,
	Users,
	ArrowUpDown,
	RefreshCw,
	Settings,
	UserCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import HotelsTab from "./HotelsTab";
import DriversTab from "./DriversTab";
import VenuesTab from "./VenuesTab";
import CateringTab from "./CateringTab";
import CurrenciesTab from "./CurrenciesTab";
import CustomQuestionsTab from "./CustomQuestionsTab";
import DeadlineRulesTab from "./DeadlineRulesTab";
import NotesTab from "./NotesTab";









interface LogisticsArtist {
	id: string;
	artistName?: string;
	realName?: string;
	email?: string;
	performanceType?: string;
	members?: Array<{ name: string }>;
	tshirtSizes?: Array<{ name: string; size: string; fit?: string }>;
	logistics?: {
		crewSize?: string;
		travelRequirements?: string;
		hospitalityNotes?: string;
		status?: string;
		contractStatus?: string;
	};
	status?: string;
	updatedAt?: string;
	createdAt?: string;
	eventId?: string;
	eventName?: string;
}

interface LogisticsProps {
	providedEventId: string;
}

type SortKey = "name" | "travelers" | "updated";
type ActiveTab = "Artists" | "Settings";
type SettingsTab = "Hotels" | "Drivers" | "Venues" | "Catering" | "Currencies" | "Custom Questions" | "Deadline Rules" | "Notes";


const LOGISTICS_STATUS_COLORS: Record<string, string> = {
	"Booking In Progress": "bg-amber-100 text-amber-700",
	"Locked": "bg-slate-100 text-slate-600",
	"Completed": "bg-emerald-100 text-emerald-700",
	"Waiting For Artist": "bg-orange-100 text-orange-700",
	"Submitted": "bg-blue-100 text-blue-700",
	"Confirmed": "bg-green-100 text-green-700",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
	"Artist Signed": "bg-emerald-100 text-emerald-700",
	"Under Review": "bg-amber-100 text-amber-700",
	"Completed": "bg-blue-100 text-blue-700",
	"Draft": "bg-slate-100 text-slate-600",
	"Sent": "bg-violet-100 text-violet-700",
};

function deriveLogisticsStatus(artist: LogisticsArtist): string {
	if (artist.logistics?.status) return artist.logistics.status;
	if (artist.status === "confirmed") return "Locked";
	if (artist.status === "pending") return "Booking In Progress";
	if (artist.status === "submitted") return "Submitted";
	return "Booking In Progress";
}

function deriveContractStatus(artist: LogisticsArtist): string {
	if (artist.logistics?.contractStatus) return artist.logistics.contractStatus;
	if (artist.status === "confirmed") return "Artist Signed";
	if (artist.status === "pending") return "Draft";
	return "Draft";
}

export default function Logistics({ providedEventId }: LogisticsProps) {
	const [artists, setArtists] = useState<LogisticsArtist[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<ActiveTab>("Artists");
	const [settingsTab, setSettingsTab] = useState<SettingsTab>("Hotels");
	const [eventName, setEventName] = useState("");


	const loadArtists = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const [artistsRes, eventRes] = await Promise.all([
				fetch(`/api/events/${providedEventId}/artists`),
				fetch(`/api/events/${providedEventId}`),
			]);

			const artistsData = await artistsRes.json();
			if (eventRes.ok) {
				const evtData = await eventRes.json();
				setEventName(evtData.data?.name || evtData.name || "");
			}

			if (!artistsRes.ok || !artistsData.success) {
				setError(artistsData.error?.message || "Failed to load artists");
				setArtists([]);
				return;
			}

			const list: LogisticsArtist[] = (artistsData.data?.artists || []).map(
				(a: any) => ({
					id: a.id,
					artistName: a.artistName || a.name || "Unknown Artist",
					realName: a.realName,
					email: a.email,
					performanceType: a.performanceType || a.style,
					members: a.members || [],
					tshirtSizes: a.tshirtSizes || [],
					logistics: a.logistics || {},
					status: a.status,
					updatedAt: a.updatedAt || a.createdAt,
					createdAt: a.createdAt,
				}),
			);
			setArtists(list);
		} catch {
			setError("Failed to load logistics data");
		} finally {
			setLoading(false);
		}
	}, [providedEventId]);

	useEffect(() => { loadArtists(); }, [loadArtists]);

	const filtered = artists
		.filter((a) =>
			!search ||
			(a.artistName || "").toLowerCase().includes(search.toLowerCase()) ||
			(a.email || "").toLowerCase().includes(search.toLowerCase()),
		)
		.sort((a, b) => {
			if (sortKey === "name") return (a.artistName || "").localeCompare(b.artistName || "");
			if (sortKey === "travelers") return ((b.members?.length || 0) + 1) - ((a.members?.length || 0) + 1);
			if (sortKey === "updated") return (b.updatedAt || "").localeCompare(a.updatedAt || "");
			return 0;
		});

	const formatDate = (d?: string) => {
		if (!d) return "—";
		try { return new Date(d).toISOString().split("T")[0]; }
		catch { return d; }
	};

	return (
		<div className="flex h-full flex-col bg-white">
			{/* ── Header ─────────────────────────────────────────── */}
			<div className="border-b border-slate-100 px-8 pt-8 pb-0">
				<h1 className="text-2xl font-bold text-slate-900">Logistics Management</h1>
				<p className="mt-1 text-sm text-slate-500">
					Manage artists, vendors, and event-specific questions
				</p>

				{/* Tabs */}
				<div className="mt-5 flex gap-6 border-b border-slate-100">
					{(["Artists", "Settings"] as ActiveTab[]).map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={`flex items-center gap-1.5 pb-3 text-sm font-medium transition border-b-2 -mb-px ${
								activeTab === tab
									? "border-fuchsia-600 text-fuchsia-600"
									: "border-transparent text-slate-500 hover:text-slate-800"
							}`}
						>
							{tab === "Artists" ? (
								<UserCircle2 className="h-4 w-4" />
							) : (
								<Settings className="h-4 w-4" />
							)}
							{tab}
						</button>
					))}
				</div>
			</div>

			{/* ── Artists Tab ─────────────────────────────────────── */}
			{activeTab === "Artists" && (
				<>
					{/* Filter bar */}
					<div className="flex flex-wrap items-center gap-3 px-8 py-4 border-b border-slate-100">
						<div className="relative flex-1 min-w-[200px] max-w-xs">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search artists..."
								className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
							/>
						</div>

						{/* Event badge */}
						{eventName && (
							<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
								{eventName}
							</div>
						)}

						{/* Sort */}
						<button
							type="button"
							onClick={() => setSortKey((k) => k === "name" ? "travelers" : k === "travelers" ? "updated" : "name")}
							className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
						>
							<ArrowUpDown className="h-3.5 w-3.5" />
							{sortKey === "name" ? "A–Z (Name)" : sortKey === "travelers" ? "Travelers" : "Updated"}
						</button>

						<div className="flex items-center gap-1.5 text-sm text-slate-500">
							<Users className="h-4 w-4" />
							{filtered.length} artist{filtered.length !== 1 ? "s" : ""}
						</div>

						<button
							type="button"
							onClick={loadArtists}
							disabled={loading}
							className="ml-auto rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
						>
							<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						</button>
					</div>

					{/* Table */}
					<div className="flex-1 overflow-auto">
						{loading ? (
							<div className="flex min-h-[300px] items-center justify-center">
								<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
							</div>
						) : error ? (
							<div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
						) : filtered.length === 0 ? (
							<div className="flex min-h-[300px] flex-col items-center justify-center text-center px-8">
								<Users className="mb-3 h-12 w-12 text-slate-200" />
								<h3 className="text-base font-semibold text-slate-600">No artists found</h3>
								<p className="mt-1 text-sm text-slate-400">
									{search ? "Try a different search term." : "No artists have been assigned to this event yet."}
								</p>
							</div>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/60">
										<th className="px-8 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-6"></th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Artist</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Event</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
										<th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Travelers</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Logistics Status</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Agreement</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Updated</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{filtered.map((artist) => {
										const isExpanded = expandedId === artist.id;
										const travelers = (artist.members?.length || 0) + 1;
										const logStatus = deriveLogisticsStatus(artist);
										const contractStatus = deriveContractStatus(artist);

										return (
											<>
												<tr
													key={artist.id}
													onClick={() => setExpandedId(isExpanded ? null : artist.id)}
													className="cursor-pointer transition hover:bg-fuchsia-50/40"
												>
													<td className="px-8 py-4 text-slate-400">
														<ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
													</td>
													<td className="px-4 py-4">
														<p className="font-semibold text-fuchsia-600 hover:underline">
															{artist.artistName}
														</p>
														<p className="text-xs text-slate-400 capitalize">
															{artist.performanceType || "Solo"}
														</p>
													</td>
													<td className="px-4 py-4 text-slate-700">{eventName || "—"}</td>
													<td className="px-4 py-4 text-slate-500">{formatDate(artist.updatedAt)}</td>
													<td className="px-4 py-4 text-center font-medium text-slate-800">{travelers}</td>
													<td className="px-4 py-4">
														<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${LOGISTICS_STATUS_COLORS[logStatus] || "bg-slate-100 text-slate-600"}`}>
															{logStatus}
														</span>
													</td>
													<td className="px-4 py-4">
														<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${CONTRACT_STATUS_COLORS[contractStatus] || "bg-slate-100 text-slate-600"}`}>
															{contractStatus}
														</span>
													</td>
													<td className="px-4 py-4 text-slate-400">{formatDate(artist.updatedAt)}</td>
												</tr>

												{/* Expanded row */}
												{isExpanded && (
													<tr key={`${artist.id}-expanded`}>
														<td colSpan={8} className="bg-slate-50/70 px-16 py-4">
															<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
																{/* Travel */}
																<div>
																	<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Travel</p>
																	<div className="space-y-1 text-sm text-slate-700">
																		{artist.logistics?.travelRequirements ? (
																			<p>{artist.logistics.travelRequirements}</p>
																		) : (
																			<p className="italic text-slate-400">No travel info</p>
																		)}
																	</div>
																</div>

																{/* Crew */}
																<div>
																	<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
																		Crew ({artist.members?.length || 0})
																	</p>
																	{artist.members && artist.members.length > 0 ? (
																		<ul className="space-y-1 text-sm text-slate-700">
																			{artist.members.map((m, i) => (
																				<li key={i} className="flex items-center gap-1.5">
																					<div className="h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">
																						{m.name[0]?.toUpperCase()}
																					</div>
																					{m.name}
																				</li>
																			))}
																		</ul>
																	) : (
																		<p className="text-sm italic text-slate-400">Solo artist</p>
																	)}
																</div>

																{/* T-shirts */}
																<div>
																	<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">T-Shirts</p>
																	{artist.tshirtSizes && artist.tshirtSizes.length > 0 ? (
																		<div className="flex flex-wrap gap-1.5">
																			{artist.tshirtSizes.map((t, i) => (
																				<span key={i} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
																					{t.name}: <strong>{t.size}</strong>{t.fit ? ` · ${t.fit}` : ""}
																				</span>
																			))}
																		</div>
																	) : (
																		<p className="text-sm italic text-slate-400">Not specified</p>
																	)}
																</div>

																{/* Hospitality */}
																{artist.logistics?.hospitalityNotes && (
																	<div className="sm:col-span-3">
																		<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hospitality</p>
																		<p className="text-sm text-slate-700">{artist.logistics.hospitalityNotes}</p>
																	</div>
																)}
															</div>
														</td>
													</tr>
												)}
											</>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</>
			)}

			{/* ── Settings Tab ──────────────────────────────────── */}
			{activeTab === "Settings" && (
				<div className="flex flex-col">
					{/* Settings sub-tabs */}
					<div className="flex flex-wrap gap-1 border-b border-slate-100 px-6 py-3 bg-slate-50/60">
						{(["Hotels", "Drivers", "Venues", "Catering", "Currencies", "Custom Questions", "Deadline Rules", "Notes"] as SettingsTab[]).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setSettingsTab(t)}
								className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
									settingsTab === t
										? "bg-white text-slate-800 shadow-sm border border-slate-200"
										: "text-slate-500 hover:text-slate-800"
								}`}
							>
								{t}
							</button>
						))}
					</div>
					{/* Hotels — real MongoDB data */}
					{settingsTab === "Hotels" && <HotelsTab eventId={providedEventId} />}
					{/* Drivers — real MongoDB data */}
					{settingsTab === "Drivers" && <DriversTab eventId={providedEventId} />}
					{/* Venues — real MongoDB data */}
					{settingsTab === "Venues" && <VenuesTab eventId={providedEventId} />}
					{/* Catering — real MongoDB data */}
					{settingsTab === "Catering" && <CateringTab eventId={providedEventId} />}
					{/* Currencies — real MongoDB data */}
					{settingsTab === "Currencies" && <CurrenciesTab eventId={providedEventId} />}
					{/* Custom Questions — real MongoDB data */}
					{settingsTab === "Custom Questions" && <CustomQuestionsTab eventId={providedEventId} />}
					{/* Deadline Rules — real MongoDB data */}
					{settingsTab === "Deadline Rules" && <DeadlineRulesTab eventId={providedEventId} />}
					{/* Notes — real MongoDB data */}
					{settingsTab === "Notes" && <NotesTab eventId={providedEventId} />}
					{/* Other tabs — coming soon */}
					{settingsTab !== "Hotels" && settingsTab !== "Drivers" && settingsTab !== "Venues" && settingsTab !== "Catering" && settingsTab !== "Currencies" && settingsTab !== "Custom Questions" && settingsTab !== "Deadline Rules" && settingsTab !== "Notes" && (






						<div className="flex min-h-[250px] flex-col items-center justify-center p-10 text-center">
							<p className="font-medium text-slate-500">{settingsTab}</p>
							<p className="mt-1 text-sm text-slate-400">This section is coming soon.</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
