"use client";

import { ArtistNotification } from "@/types/famelink";
import {
	Bell,
	Calendar,
	MessageSquare,
	AlertCircle,
	Music,
	X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationListProps {
	notifications: ArtistNotification[];
	onMarkRead: (id: string) => void;
	onMarkAllRead: () => void;
	onClose: () => void;
}

const getIcon = (type: ArtistNotification["type"]) => {
	switch (type) {
		case "event_request":
			return <Calendar className="h-4 w-4 text-blue-400" />;
		case "event_update":
			return <Bell className="h-4 w-4 text-yellow-400" />;
		case "message":
			return <MessageSquare className="h-4 w-4 text-green-400" />;
		case "performance_date_assigned":
			return <Music className="h-4 w-4 text-pink-400" />;
		case "system":
			return <AlertCircle className="h-4 w-4 text-gray-400" />;
		default:
			return <Bell className="h-4 w-4 text-gray-400" />;
	}
};

export function NotificationList({
	notifications,
	onMarkRead,
	onMarkAllRead,
	onClose,
}: NotificationListProps) {
	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="w-80 rounded-2xl border border-purple-500/20 bg-[#1c122f] shadow-2xl shadow-black/40 overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
				<span className="text-sm font-bold text-white">Notifications</span>
				<div className="flex items-center gap-2">
					{unreadCount > 0 && (
						<button
							onClick={onMarkAllRead}
							className="text-[11px] font-medium text-purple-300 hover:text-white transition-colors"
						>
							Mark all read
						</button>
					)}
					<button
						onClick={onClose}
						className="p-1 rounded-lg text-purple-300/50 hover:text-white hover:bg-white/5 transition-colors"
						aria-label="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
			<div className="max-h-80 overflow-y-auto">
				{notifications.length === 0 ? (
					<div className="p-6 text-center text-sm text-purple-300/40">
						No notifications yet
					</div>
				) : (
					<div className="divide-y divide-white/5">
						{notifications.map((notification) => (
							<div
								key={notification.id}
								className={`p-3.5 cursor-pointer transition-colors hover:bg-white/5 ${
									!notification.read ? "bg-purple-500/5" : ""
								}`}
								onClick={() =>
									!notification.read && onMarkRead(notification.id)
								}
							>
								<div className="flex gap-3">
									<div className="mt-0.5 shrink-0">
										{getIcon(notification.type)}
									</div>
									<div className="flex-1 min-w-0">
										<p
											className={`text-sm ${!notification.read ? "font-semibold text-white" : "text-purple-100/70"}`}
										>
											{notification.title}
										</p>
										<p className="text-xs text-purple-300/50 mt-0.5 line-clamp-2">
											{notification.message}
										</p>
										<p className="text-[11px] text-purple-300/30 mt-1">
											{formatDistanceToNow(
												new Date(notification.createdAt),
												{ addSuffix: true },
											)}
										</p>
									</div>
									{!notification.read && (
										<div className="w-2 h-2 rounded-full bg-pink-400 mt-1.5 shrink-0" />
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
