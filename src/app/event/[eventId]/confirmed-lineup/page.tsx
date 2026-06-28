"use client";

import { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	Upload,
	Download,
	Users,
	CheckCircle2,
	Clock,
	AlertTriangle,
	Calendar,
	Phone,
	Mail,
	ChevronDown,
	ChevronRight,
	X,
	Music,
	Loader2,
	FileText,
	Car,
	PieChart,
	RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableHeader,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
} from "@/components/ui/table";
import { useContractData } from "@/hooks/useContractData";
import { useContractSocket } from "@/hooks/useContractSocket";
import { ContractArtist } from "@/types/contracts";

export interface EventDay {
	id: string;
	label: string;
	date: string;
	dayName: string;
}

export const eventDays: EventDay[] = [
	{ id: "day-1", label: "Day 1", date: "2026-04-10", dayName: "Friday" },
	{ id: "day-2", label: "Day 2", date: "2026-04-11", dayName: "Saturday" },
	{ id: "day-3", label: "Day 3", date: "2026-04-12", dayName: "Sunday" },
];

export type LineupStatus = "confirmed" | "pending" | "incomplete";

export interface LineupEntry {
	id: string;
	artistId: string;
	stageName: string;
	legalName: string;
	role: string;
	phone: string;
	email: string;
	status: LineupStatus;
	agreedFee: string;
	workshopsConfirmed: number;
	showsConfirmed: number;
	arrivalDate: string;
	departureDate: string;
	performanceDays: string[];
	totalPerformances: number;
	profileComplete: boolean;
	contractSigned: boolean;
	imported?: boolean; // For XML parsing
}

export const lineupStatusLabels: Record<LineupStatus, string> = {
	confirmed: "Confirmed",
	pending: "Pending",
	incomplete: "Incomplete",
};

const statusStyle: Record<LineupStatus, string> = {
	confirmed: "bg-green-500/10 text-green-600 border-green-500/20",
	pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
	incomplete: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusIcon: Record<LineupStatus, React.ElementType> = {
	confirmed: CheckCircle2,
	pending: Clock,
	incomplete: AlertTriangle,
};

function resolveLineupStatus(artist: ContractArtist): LineupStatus {
	if (
		artist.status === "confirmed" &&
		artist.contractDocStatus === "confirmed"
	)
		return "confirmed";
	if (artist.status === "invited" || artist.status === "negotiation")
		return "incomplete";
	return "pending";
}

function resolvePerformanceDays(artist: ContractArtist): string[] {
	const arrival = artist.agreement?.arrivalDate;
	const departure = artist.agreement?.departureDate;
	if (!arrival || !departure) return [];
	return eventDays
		.filter((d) => d.date >= arrival && d.date <= departure)
		.map((d) => d.id);
}

export function parseArtistXml(xmlString: string): Partial<LineupEntry>[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xmlString, "text/xml");
	const artists = doc.querySelectorAll("artist");
	const entries: Partial<LineupEntry>[] = [];

	artists.forEach((node) => {
		const get = (tag: string) =>
			node.querySelector(tag)?.textContent?.trim() ?? "";
		const days: string[] = [];
		node.querySelectorAll("performanceDay").forEach((d) => {
			const val = d.textContent?.trim();
			if (val) days.push(val);
		});

		entries.push({
			id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			stageName: get("stageName") || get("name"),
			legalName: get("legalName") || get("name"),
			role: get("role") || "Solo",
			phone: get("phone"),
			email: get("email"),
			status: "incomplete",
			agreedFee: get("fee"),
			workshopsConfirmed: parseInt(get("workshops")) || 0,
			showsConfirmed: parseInt(get("shows")) || 0,
			arrivalDate: get("arrivalDate"),
			departureDate: get("departureDate"),
			performanceDays: days,
			totalPerformances:
				(parseInt(get("workshops")) || 0) +
				(parseInt(get("shows")) || 0),
			profileComplete: false,
			contractSigned: false,
			imported: true,
		});
	});
	return entries;
}

export default function ConfirmedLineupPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	const { artists, isLoading, refetch, addArtist } = useContractData({
		eventId,
	});
	useContractSocket({ eventId, role: "organiser" });
	const fileRef = useRef<HTMLInputElement>(null);

	const [localEntries, setLocalEntries] = useState<LineupEntry[]>([]);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [dayFilter, setDayFilter] = useState("all");

	// Combine real artists + local imported ones
	const entries = useMemo(() => {
		const realEntries: LineupEntry[] = artists.map((a) => ({
			id: a.id,
			artistId: a.id,
			stageName: a.stageName,
			legalName: a.legalName || "",
			role: a.role,
			phone: a.phone || "",
			email: a.email || "",
			status: resolveLineupStatus(a),
			agreedFee: a.agreement?.agreedFee || "",
			workshopsConfirmed: a.agreement?.workshopsConfirmed || 0,
			showsConfirmed: a.agreement?.showsConfirmed || 0,
			arrivalDate: a.agreement?.arrivalDate || "",
			departureDate: a.agreement?.departureDate || "",
			performanceDays: resolvePerformanceDays(a),
			totalPerformances:
				(a.agreement?.workshopsConfirmed || 0) +
				(a.agreement?.showsConfirmed || 0) +
				(a.agreement?.djSets || 0),
			profileComplete: true,
			contractSigned:
				a.contractDocStatus === "signed" ||
				a.contractDocStatus === "confirmed",
			imported: false,
		}));
		return [...realEntries, ...localEntries];
	}, [artists, localEntries]);

	const confirmed = entries.filter((e) => e.status === "confirmed").length;
	const pending = entries.filter((e) => e.status === "pending").length;
	const incomplete = entries.filter((e) => e.status === "incomplete").length;
	const progress =
		entries.length > 0 ? Math.round((confirmed / entries.length) * 100) : 0;

	const filtered = useMemo(() => {
		if (dayFilter === "all") return entries;
		return entries.filter((e) => e.performanceDays.includes(dayFilter));
	}, [entries, dayFilter]);

	// Import XML
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			const parsed = parseArtistXml(text);
			const newEntries = parsed as LineupEntry[];
			setLocalEntries((prev) => [...prev, ...newEntries]);
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	// Export CSV
	const handleExport = () => {
		const header =
			"Stage Name,Legal Name,Role,Status,Phone,Email,Workshops,Shows,Arrival,Departure,Days\n";
		const rows = entries
			.map(
				(e) =>
					`"${e.stageName}","${e.legalName}","${e.role}","${e.status}","${e.phone}","${e.email}",${e.workshopsConfirmed},${e.showsConfirmed},"${e.arrivalDate}","${e.departureDate}","${e.performanceDays.join(";")}"`,
			)
			.join("\n");

		const blob = new Blob([header + rows], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "confirmed-lineup.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen bg-background text-foreground">
			{/* Header */}
			<header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
				<div className="flex items-center gap-3">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-muted rounded-lg transition-colors"
					>
						<ArrowLeft className="w-4 h-4 text-foreground" />
					</button>
					<Image
						src="/fame-logo.png"
						alt="FAME"
						width={32}
						height={32}
						className="rounded-lg"
					/>
					<div>
						<h1 className="text-sm font-bold text-foreground">
							Confirmed Lineup
						</h1>
						<p className="text-xs text-muted-foreground">
							Total: {entries.length} artists · Apr 10–12, 2026
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<input
						ref={fileRef}
						type="file"
						accept=".xml"
						className="hidden"
						onChange={handleFileUpload}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							router.push(`/event/${eventId}/artist-contracts`)
						}
						className="bg-secondary hover:bg-muted border-0 flex gap-2"
					>
						<FileText className="w-3.5 h-3.5" /> Contracts
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileRef.current?.click()}
						className="bg-secondary hover:bg-muted border-0 flex gap-2"
					>
						<Upload className="w-3.5 h-3.5" /> Import XML
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="bg-secondary hover:bg-muted border-0 flex gap-2"
					>
						<Download className="w-3.5 h-3.5" /> Export CSV
					</Button>
				</div>
			</header>

			{/* Stats bar */}
			<div className="px-6 py-4 border-b border-border bg-background">
				<div className="flex items-center gap-4 mb-3">
					<StatCard
						icon={Users}
						label="Total Artists"
						value={entries.length}
						colorClass="text-muted-foreground"
						bgClass="bg-primary/10"
					/>
					<StatCard
						icon={CheckCircle2}
						label="Confirmed"
						value={confirmed}
						colorClass="text-green-600"
						bgClass="bg-green-500/10"
					/>
					<StatCard
						icon={Clock}
						label="Pending"
						value={pending}
						colorClass="text-yellow-600"
						bgClass="bg-yellow-500/10"
					/>
					<StatCard
						icon={AlertTriangle}
						label="Incomplete"
						value={incomplete}
						colorClass="text-red-600"
						bgClass="bg-red-500/10"
					/>
				</div>
				<div className="flex items-center gap-3 w-full max-w-2xl">
					<Progress
						value={progress}
						className="flex-1 h-2 bg-muted"
					/>
					<span className="text-xs font-semibold text-foreground">
						{progress}% confirmed
					</span>
				</div>
			</div>

			{/* Day tabs & Table */}
			<div className="flex-1 flex flex-col min-h-0">
				<Tabs
					value={dayFilter}
					onValueChange={setDayFilter}
					className="flex flex-col flex-1 h-full"
				>
					<div className="px-6 pt-4">
						<TabsList className="bg-card border border-border w-fit">
							<TabsTrigger
								value="all"
								className="text-xs data-[state=active]:bg-primary"
							>
								All Days ({entries.length})
							</TabsTrigger>
							{eventDays.map((day) => {
								const count = entries.filter((e) =>
									e.performanceDays.includes(day.id),
								).length;
								return (
									<TabsTrigger
										key={day.id}
										value={day.id}
										className="text-xs data-[state=active]:bg-primary"
									>
										<Calendar className="w-3 h-3 mr-1" />
										{day.dayName} · {day.date.slice(5)} (
										{count})
									</TabsTrigger>
								);
							})}
						</TabsList>
					</div>

					<div className="flex-1 overflow-auto p-6">
						<div className="rounded-xl border border-border bg-card  overflow-hidden shadow-xl shadow-primary/10">
							<Table>
								<TableHeader>
									<TableRow className="bg-card border-border hover:bg-card">
										<TableHead className="w-8"></TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Artist
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Role
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Status
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Contact
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Performances
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground">
											Event Days
										</TableHead>
										<TableHead className="text-xs font-semibold text-foreground text-right">
											Fee
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.length === 0 && (
										<TableRow className="border-border hover:bg-secondary/30">
											<TableCell
												colSpan={8}
												className="text-center py-10 text-muted-foreground"
											>
												No artists found for this day.
											</TableCell>
										</TableRow>
									)}
									{filtered.map((entry) => {
										const isExpanded =
											expandedId === entry.id;
										const Icon = statusIcon[entry.status];
										return (
											<ArtistRow
												key={entry.id}
												entry={entry}
												isExpanded={isExpanded}
												onToggle={() =>
													setExpandedId(
														isExpanded
															? null
															: entry.id,
													)
												}
												Icon={Icon}
											/>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	colorClass,
	bgClass,
}: {
	icon: React.ElementType;
	label: string;
	value: number;
	colorClass: string;
	bgClass: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card backdrop-blur-md px-4 py-3 basis-1/4">
			<div
				className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center shrink-0`}
			>
				<Icon className={`w-5 h-5 ${colorClass}`} />
			</div>
			<div>
				<p className="text-xl font-bold text-foreground leading-tight">
					{value}
				</p>
				<p
					className={`text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}
				>
					{label}
				</p>
			</div>
		</div>
	);
}

function ArtistRow({
	entry,
	isExpanded,
	onToggle,
	Icon,
}: {
	entry: LineupEntry;
	isExpanded: boolean;
	onToggle: () => void;
	Icon: React.ElementType;
}) {
	return (
		<>
			<TableRow
				className="cursor-pointer border-border hover:bg-secondary transition-colors"
				onClick={onToggle}
			>
				<TableCell className="w-10 pr-0">
					{isExpanded ? (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronRight className="w-4 h-4 text-muted-foreground" />
					)}
				</TableCell>
				<TableCell>
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
							{entry.stageName.charAt(0).toUpperCase()}
						</div>
						<div>
							<p className="font-semibold text-sm text-foreground flex items-center gap-2">
								{entry.stageName}{" "}
								{entry.imported && (
									<Badge
										variant="outline"
										className="text-[9px] h-4 px-1 py-0 bg-blue-500/20 text-blue-600 border-0 pointer-events-none"
									>
										XML
									</Badge>
								)}
							</p>
							<p className="text-xs text-muted-foreground">
								{entry.legalName}
							</p>
						</div>
					</div>
				</TableCell>
				<TableCell>
					<Badge
						variant="outline"
						className="text-[10px] bg-secondary border-border text-foreground"
					>
						{entry.role}
					</Badge>
				</TableCell>
				<TableCell>
					<Badge
						className={`text-[10px] border ${statusStyle[entry.status]} pointer-events-none`}
					>
						<Icon className="w-3 h-3 mr-1" />
						{lineupStatusLabels[entry.status]}
					</Badge>
				</TableCell>
				<TableCell>
					<div className="flex flex-col gap-1 text-xs text-foreground">
						{entry.phone && (
							<span className="flex items-center gap-1.5">
								<Phone className="w-3 h-3 text-muted-foreground" />{" "}
								{entry.phone}
							</span>
						)}
						{entry.email && (
							<span className="flex items-center gap-1.5">
								<Mail className="w-3 h-3 text-muted-foreground" />{" "}
								{entry.email.length > 15
									? entry.email.slice(0, 15) + "..."
									: entry.email}
							</span>
						)}
					</div>
				</TableCell>
				<TableCell>
					<span className="text-sm font-semibold text-foreground">
						{entry.totalPerformances}
					</span>
					<span className="text-xs text-muted-foreground ml-1">
						({entry.workshopsConfirmed}W {entry.showsConfirmed}S)
					</span>
				</TableCell>
				<TableCell>
					<div className="flex gap-1.5 flex-wrap">
						{eventDays.map((d) => {
							const active = entry.performanceDays.includes(d.id);
							return (
								<span
									key={d.id}
									className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${active ? "bg-primary text-foreground shadow-sm" : "bg-card border border-border text-muted-foreground"}`}
								>
									{d.dayName.slice(0, 3)}
								</span>
							);
						})}
					</div>
				</TableCell>
				<TableCell className="text-right">
					<span className="text-sm font-semibold text-green-600">
						{entry.agreedFee ? `€${entry.agreedFee}` : "—"}
					</span>
				</TableCell>
			</TableRow>

			{isExpanded && (
				<TableRow className="bg-secondary/30 border-border hover:bg-secondary/30"><TableCell colSpan={8} className="p-0 border-b-0">
						<div className="px-10 py-5 space-y-5">
							<div className="grid grid-cols-4 gap-6 bg-background p-4 rounded-xl border border-border">
								<DetailBlock label="Travel Logistics">
									<p className="text-xs text-foreground bg-muted p-2 rounded flex items-center justify-between">
										<span className="text-foreground">
											Arrival:
										</span>{" "}
										{entry.arrivalDate || "TBD"}
									</p>
									<p className="text-xs text-foreground bg-muted p-2 rounded mt-1 flex items-center justify-between">
										<span className="text-foreground">
											Departure:
										</span>{" "}
										{entry.departureDate || "TBD"}
									</p>
								</DetailBlock>
								<DetailBlock label="Performances Assured">
									<div className="text-xs space-y-1">
										<p className="text-foreground flex items-center gap-2">
											<div className="w-1.5 h-1.5 rounded-full bg-primary/60" />{" "}
											{entry.workshopsConfirmed} workshops
										</p>
										<p className="text-foreground flex items-center gap-2">
											<div className="w-1.5 h-1.5 rounded-full bg-pink-400" />{" "}
											{entry.showsConfirmed} shows
										</p>
									</div>
								</DetailBlock>
								<DetailBlock label="Tasks Checklist">
									<div className="text-xs space-y-1.5 mt-1">
										<CheckItem
											done={entry.profileComplete}
											label="Profile submitted"
										/>
										<CheckItem
											done={entry.contractSigned}
											label="Contract signed"
										/>
										<CheckItem
											done={
												entry.performanceDays.length > 0
											}
											label="Schedule assigned"
										/>
									</div>
								</DetailBlock>
								<DetailBlock label="Extra Info">
									<p className="text-xs text-muted-foreground">
										Manage their full profile, contract
										documents, and flights inside the Artist
										Contracts dashboard module.
									</p>
								</DetailBlock>
							</div>

							<div>
								<p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
									Per-Day Performance Verification
								</p>
								<div className="flex gap-3">
									{eventDays.map((d) => {
										const active =
											entry.performanceDays.includes(
												d.id,
											);
										return (
											<div
												key={d.id}
												className={`flex-1 rounded-lg border p-3 text-center transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-muted/30 opacity-60"}`}
											>
												<p className="text-xs font-semibold text-foreground">
													{d.dayName}
												</p>
												<p className="text-[10px] text-muted-foreground mt-0.5">
													{d.date}
												</p>
												{active ? (
													<CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mt-2" />
												) : (
													<X className="w-5 h-5 text-muted-foreground/40 mx-auto mt-2" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</TableCell>
				</TableRow>
			)}
		</>
	);
}

function DetailBlock({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
				{label}
			</p>
			{children}
		</div>
	);
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
	return (
		<div className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded">
			{done ? (
				<CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
			) : (
				<AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
			)}
			<span className={done ? "text-foreground" : "text-muted-foreground"}>
				{label}
			</span>
		</div>
	);
}
