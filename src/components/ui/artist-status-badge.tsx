"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusInfo } from "@/lib/client/artist-status";

interface ArtistStatusBadgeProps {
	status: string | null;
	className?: string;
}

export function ArtistStatusBadge({
	status,
	className,
}: ArtistStatusBadgeProps) {
	const statusInfo = getStatusInfo(status);

	const getVariant = (color: string) => {
		switch (color) {
			case "green":
				return "default";
			case "blue":
				return "secondary";
			case "yellow":
				return "outline";
			case "red":
				return "destructive";
			case "orange":
				return "outline";
			case "gray":
			default:
				return "secondary";
		}
	};

	return (
		<Badge
			variant={getVariant(statusInfo.color)}
			className={className}
			title={statusInfo.description}
		>
			{statusInfo.label}
		</Badge>
	);
}
