"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { StageManagerDashboard } from "@/components/stage-manager-dashboard/StageManagerDashboard";

export default function EventManagementPage() {
	const params = useParams();
	const eventId = params.eventId as string;

	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#f6f5fb] flex items-center justify-center">
					<div className="h-12 w-12 animate-spin rounded-full border-b-2 border-fuchsia-600" />
				</div>
			}
		>
			<StageManagerDashboard initialEventId={eventId} />
		</Suspense>
	);
}
