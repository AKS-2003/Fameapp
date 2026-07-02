"use client";

import { useEffect, useState } from "react";
import {
	Users,
	FileText,
	PenLine,
	Clock,
	AlertTriangle,
	Loader2,
} from "lucide-react";

interface EventOverviewProps {
	providedEventId: string;
	onSelectTab?: (tab: string) => void;
}

interface UrgentAction {
	key: string;
	artistName: string;
	reason: string;
	date?: string;
	severity: "high" | "medium";
}

function isOrganiserSigned(a: any) {
	return a.contractDocStatus === "confirmed" || !!a.contractSignedByOrganiser;
}

function isArtistSigned(a: any) {
	return (
		a.contractDocStatus === "signed" ||
		a.contractDocStatus === "confirmed" ||
		!!a.contractSignedByArtist
	);
}

function formatDate(dateString?: string) {
	if (!dateString) return "";
	try {
		return new Date(dateString).toISOString().slice(0, 10);
	} catch {
		return "";
	}
}

export default function EventOverview({ providedEventId, onSelectTab }: EventOverviewProps) {
	const [artists, setArtists] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/contracts/${providedEventId}`);
				if (res.ok) {
					const json = await res.json();
					if (!cancelled) setArtists(json.artists || []);
				}
			} catch (error) {
				console.error("Failed to load event overview data:", error);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [providedEventId]);

	const activeArtists = artists.length;
	const contractsSigned = artists.filter(
		(a) => isOrganiserSigned(a) && isArtistSigned(a),
	).length;
	const awaitingSignature = artists.filter(
		(a) => isArtistSigned(a) !== isOrganiserSigned(a),
	).length;
	const agreementsWaiting = artists.filter(
		(a) => !isArtistSigned(a) && !isOrganiserSigned(a),
	).length;

	const urgentActions: UrgentAction[] = [];
	for (const a of artists) {
		const name =
			(a.stageName && a.stageName !== "FameLink Artist" && a.stageName !== "Unknown Artist"
				? a.stageName
				: a.legalName || a.realName || a.name) || "Unknown Artist";

		if (isArtistSigned(a) && !isOrganiserSigned(a)) {
			urgentActions.push({
				key: `${a.id}-org-sig`,
				artistName: name,
				reason: "Awaiting organiser signature",
				date: formatDate(a.artistSignedAt || a.contractSignedAt),
				severity: "high",
			});
		} else if (!isArtistSigned(a) && isOrganiserSigned(a)) {
			urgentActions.push({
				key: `${a.id}-artist-sig`,
				artistName: name,
				reason: "Awaiting artist signature",
				date: formatDate(a.organiserSignedAt),
				severity: "high",
			});
		}

		const hasFee = !!(a.agreement?.agreedFee || a.agreement?.payment?.details?.performanceFee);
		if (!hasFee) {
			urgentActions.push({
				key: `${a.id}-payment`,
				artistName: name,
				reason: "Payment terms not set",
				severity: "medium",
			});
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
				<div className="text-center">
					<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-fuchsia-600" />
					<p className="text-sm text-slate-500">Loading dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1>
				<p className="mt-1 text-sm text-slate-500">Organiser — Operations overview</p>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard
					label="Active Artists"
					value={activeArtists}
					icon={Users}
					iconBg="bg-fuchsia-100 text-fuchsia-600"
				/>
				<StatCard
					label="Agreements Waiting"
					value={agreementsWaiting}
					icon={FileText}
					iconBg="bg-violet-100 text-violet-600"
					footnote={agreementsWaiting > 0 ? "Need review" : undefined}
					footnoteClass="text-green-600"
				/>
				<StatCard
					label="Contracts Signed"
					value={contractsSigned}
					icon={PenLine}
					iconBg="bg-purple-100 text-purple-600"
					footnote={
						activeArtists > 0
							? `${Math.round((contractsSigned / activeArtists) * 100)}% complete`
							: undefined
					}
					footnoteClass="text-green-600"
				/>
				<StatCard
					label="Awaiting Signature"
					value={awaitingSignature}
					icon={Clock}
					iconBg="bg-purple-100 text-purple-600"
				/>
			</div>

			<div className="rounded-[20px] border border-slate-200 bg-white">
				<div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-500" />
						<h2 className="font-semibold text-slate-950">Urgent Actions</h2>
					</div>
					{urgentActions.length > 0 && (
						<span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-semibold text-white">
							{urgentActions.length}
						</span>
					)}
				</div>

				{urgentActions.length === 0 ? (
					<div className="px-6 py-10 text-center text-sm text-slate-500">
						No urgent actions — everything is up to date.
					</div>
				) : (
					<div className="max-h-[420px] overflow-y-auto">
						{urgentActions.map((action) => (
							<button
								key={action.key}
								onClick={() => onSelectTab?.("Artist Files")}
								className="flex w-full items-center justify-between gap-4 border-b border-slate-50 px-6 py-4 text-left last:border-b-0 hover:bg-slate-50"
							>
								<div className="flex items-center gap-3">
									<span
										className={`h-2 w-2 shrink-0 rounded-full ${
											action.severity === "high" ? "bg-red-500" : "bg-amber-500"
										}`}
									/>
									<div>
										<p className="text-sm font-medium text-slate-900">{action.artistName}</p>
										<p className="text-sm text-slate-500">{action.reason}</p>
									</div>
								</div>
								{action.date && (
									<div className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500">
										<Clock className="h-3.5 w-3.5" />
										{action.date}
									</div>
								)}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	icon: Icon,
	iconBg,
	footnote,
	footnoteClass,
}: {
	label: string;
	value: number;
	icon: React.ElementType;
	iconBg: string;
	footnote?: string;
	footnoteClass?: string;
}) {
	return (
		<div className="rounded-[20px] border border-slate-200 bg-white p-5">
			<div className="flex items-start justify-between">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					{label}
				</p>
				<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
					<Icon className="h-4 w-4" />
				</div>
			</div>
			<p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
			{footnote && <p className={`mt-1 text-sm ${footnoteClass || "text-slate-500"}`}>{footnote}</p>}
		</div>
	);
}
