"use client";

import { Suspense } from "react";
import { StageManagerDashboard } from "@/components/stage-manager-dashboard/StageManagerDashboard";

export default function StageManagerPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#f6f5fb] flex items-center justify-center">
					<div className="h-12 w-12 animate-spin rounded-full border-b-2 border-fuchsia-600" />
				</div>
			}
		>
			<StageManagerDashboard />
		</Suspense>
	);
}
