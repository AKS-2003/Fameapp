"use client";

import { Bell } from "lucide-react";

interface NotificationBadgeProps {
	count: number;
	onClick: () => void;
}

export function NotificationBadge({ count, onClick }: NotificationBadgeProps) {
	return (
		<button
			onClick={onClick}
			className="relative p-2 rounded-lg text-purple-300 hover:text-white hover:bg-white/5 transition-colors"
			aria-label="Notifications"
		>
			<Bell className="h-5 w-5" />
			{count > 0 && (
				<span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
					{count > 9 ? "9+" : count}
				</span>
			)}
		</button>
	);
}
