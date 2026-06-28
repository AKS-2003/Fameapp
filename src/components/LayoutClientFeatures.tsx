"use client";

import { Toaster } from "@/components/ui/toaster";
import { GlobalStageManagerMonitor } from "@/components/GlobalStageManagerMonitor";

export default function LayoutClientFeatures() {
	return (
		<>
			<GlobalStageManagerMonitor />
			<Toaster />
		</>
	);
}
