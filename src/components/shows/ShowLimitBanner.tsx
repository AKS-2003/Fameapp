"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";

interface ShowLimitBannerProps {
	currentCount: number;
	maxCount: number;
	onUpgrade: () => void;
}

export function ShowLimitBanner({
	currentCount,
	maxCount,
	onUpgrade,
}: ShowLimitBannerProps) {
	const remaining = maxCount - currentCount;
	const isAtLimit = remaining <= 0;

	if (remaining > 1) return null;

	return (
		<Alert variant={isAtLimit ? "destructive" : "default"} className="mb-4">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>
				{isAtLimit ? "Show Limit Reached" : "Almost at Limit"}
			</AlertTitle>
			<AlertDescription className="flex items-center justify-between">
				<span>
					{isAtLimit
						? `You've reached the maximum of ${maxCount} shows on the free tier.`
						: `You have ${remaining} show slot remaining on the free tier.`}
				</span>
				<Button size="sm" onClick={onUpgrade} className="ml-4">
					<Sparkles className="h-3 w-3 mr-1" /> Upgrade to Pro
				</Button>
			</AlertDescription>
		</Alert>
	);
}
