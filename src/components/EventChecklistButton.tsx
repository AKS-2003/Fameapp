"use client";

import { useState, useEffect } from "react";
import { ClipboardList } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import to keep bundle size down
const EventChecklistComponent = dynamic(
	() => import("@/components/EventChecklist"),
	{ ssr: false }
);

interface EventChecklistButtonProps {
	eventId: string;
}

export function EventChecklistButton({ eventId }: EventChecklistButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [completedCount, setCompletedCount] = useState(0);
	const [totalCount, setTotalCount] = useState(0);

	// Fetch summary count for the badge
	useEffect(() => {
		const fetchSummary = async () => {
			try {
				const response = await fetch(
					`/api/events/${eventId}/checklist`
				);
				if (response.ok) {
					const data = await response.json();
					if (data.success && data.data?.items) {
						const items = data.data.items;
						setTotalCount(items.length);
						setCompletedCount(
							items.filter(
								(i: any) => i.status === "done"
							).length
						);
					}
				}
			} catch (e) {
				// Silent fail
			}
		};
		fetchSummary();

		// Listen for WebSocket-forwarded checklist updates
		const handleUpdate = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.eventId === eventId && detail?.checklist?.items) {
				const items = detail.checklist.items;
				setTotalCount(items.length);
				setCompletedCount(
					items.filter((i: any) => i.status === "done").length
				);
			}
		};
		window.addEventListener(
			"checklist_updated",
			handleUpdate as EventListener
		);
		return () =>
			window.removeEventListener(
				"checklist_updated",
				handleUpdate as EventListener
			);
	}, [eventId]);

	const pendingCount = totalCount - completedCount;
	const percent =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
				title="Event Checklist"
			>
				<ClipboardList className="w-4.5 h-4.5" />
				<span>Checklist</span>
				{totalCount > 0 && (
					<span
						className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
						style={{
							backgroundColor:
								percent === 100
									? "rgba(34, 197, 94, 0.3)"
									: "rgba(255, 255, 255, 0.25)",
							color: percent === 100 ? "#dcfce7" : "white",
						}}
					>
						{percent}%
					</span>
				)}
				{pendingCount > 0 && (
					<span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
						{pendingCount > 99 ? "99+" : pendingCount}
					</span>
				)}
			</button>

			{isOpen && (
				<EventChecklistComponent
					eventId={eventId}
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</>
	);
}
