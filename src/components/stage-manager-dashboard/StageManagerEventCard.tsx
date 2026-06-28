"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Edit, Settings, Trash2 } from "lucide-react";
import { Event } from "@/lib/types/event";

interface StageManagerEventCardProps {
	event: Event;
	onDelete: (event: Event) => void;
	onManage?: (event: Event) => void;
	onEdit?: (event: Event) => void;
	manageButtonText?: string;
}

const blockedStatuses = new Set(["cancelled"]);

function formatDate(dateString?: string) {
	if (!dateString) return "No date";
	try {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "Invalid date";
	}
}

export function StageManagerEventCard({
	event,
	onDelete,
	onManage,
	onEdit,
	manageButtonText = "Manage Event",
}: StageManagerEventCardProps) {
	const showDateCount = event.showDates?.length || 0;

	return (
		<div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<h3 className="line-clamp-2 text-[18px] font-semibold text-slate-950">
						{event.name || "Untitled Event"}
					</h3>
					<p className="mt-2 text-[15px] text-slate-500">
						{event.venueName || "Venue not added"}
					</p>
				</div>
				{blockedStatuses.has(event.status) && (
					<Badge className="rounded-full bg-red-100 px-3 py-1 text-red-600 hover:bg-red-100">
						Blocked
					</Badge>
				)}
			</div>

			<div className="mb-3 flex items-center gap-2 text-[15px] text-slate-600">
				<Calendar className="h-4 w-4" />
				<span>
					{formatDate(event.startDate)} - {formatDate(event.endDate)}
				</span>
			</div>

			<p className="mb-3 line-clamp-2 min-h-[48px] text-[15px] text-slate-600">
				{event.description || "No description added for this event yet."}
			</p>

			<div className="mb-5 text-[15px] text-slate-600">
				<span className="font-medium text-slate-950">{showDateCount}</span>{" "}
				show dates scheduled
			</div>

			<div className="space-y-3">
				{onManage ? (
					<Button 
						onClick={() => onManage(event)}
						className="h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-700 hover:to-violet-700"
					>
						<Settings className="mr-2 h-4 w-4" />
						{manageButtonText}
					</Button>
				) : (
					<Link href={`/stage-manager/events/${event.id}`}>
						<Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-700 hover:to-violet-700">
							<Settings className="mr-2 h-4 w-4" />
							{manageButtonText}
						</Button>
					</Link>
				)}

				<div className="grid grid-cols-2 gap-3">
					{onEdit ? (
						<Button
							variant="outline"
							onClick={() => onEdit(event)}
							className="h-11 w-full rounded-2xl border-slate-200"
						>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</Button>
					) : (
						<Link href={`/stage-manager/events/${event.id}/edit`}>
							<Button
								variant="outline"
								className="h-11 w-full rounded-2xl border-slate-200"
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit
							</Button>
						</Link>
					)}
					<Button
						variant="outline"
						onClick={() => onDelete(event)}
						className="h-11 rounded-2xl border-slate-200 text-red-600 hover:bg-red-50 hover:text-red-700"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</Button>
				</div>
			</div>
		</div>
	);
}
