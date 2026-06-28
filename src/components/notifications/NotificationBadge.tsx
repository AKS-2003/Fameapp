"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationBadgeProps {
	count: number;
	onClick: () => void;
}

export function NotificationBadge({ count, onClick }: NotificationBadgeProps) {
	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative"
			onClick={onClick}
		>
			<Bell className="h-5 w-5" />
			{count > 0 && (
				<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
					{count > 99 ? "99+" : count}
				</span>
			)}
		</Button>
	);
}
