"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
	findBestDateToSelect,
	subscribeToDateChanges,
} from "@/lib/date-selection-utils";

const LightingDesignerDashboard = dynamic(
	() => import("@/components/LightingDesignerDashboard"),
	{ ssr: false },
);

export default function LightingDesignerStandalone() {
	const params = useParams();
	const searchParams = useSearchParams();
	const eventId = params.eventId as string;
	const isStandalone = searchParams.get("standalone") === "true";

	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");

	useEffect(() => {
		const fetchDates = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`);
				if (response.ok) {
					const data = await response.json();
					const evt = data.data || data.event || data;
					const showDates = evt.show_dates || evt.showDates || [];
					if (showDates.length > 0) {
						const bestDate = findBestDateToSelect(
							showDates,
							eventId,
						);
						setSelectedPerformanceDate(bestDate);
					}
				}
			} catch (error) {
				console.error("Error fetching event dates:", error);
			}
		};
		if (eventId) fetchDates();

		const unsubscribe = subscribeToDateChanges(eventId, (newDate) => {
			setSelectedPerformanceDate(newDate);
		});
		return () => unsubscribe();
	}, [eventId]);

	if (!selectedPerformanceDate) {
		return (
			<div className="h-screen flex items-center justify-center bg-gray-900 text-white">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
			</div>
		);
	}

	return (
		<LightingDesignerDashboard
			eventId={eventId}
			isOpen={true}
			onClose={() => window.close()}
			performanceDate={selectedPerformanceDate}
			isStandalone={isStandalone}
		/>
	);
}
