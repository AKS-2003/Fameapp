"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
	id: string;
	title: string;
	message: string;
	type: "info" | "success" | "warning" | "error";
	timestamp: string;
	read: boolean;
}

interface NotificationContextType {
	notifications: Notification[];
	unreadCount: number;
	addNotification: (
		notification: Omit<Notification, "id" | "timestamp" | "read">
	) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined
);

export function useNotifications() {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error(
			"useNotifications must be used within NotificationProvider"
		);
	}
	return context;
}

interface NotificationProviderProps {
	children: React.ReactNode;
	userRole?: string;
}

export function NotificationProvider({
	children,
	userRole,
}: NotificationProviderProps) {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	const addNotification = (
		notification: Omit<Notification, "id" | "timestamp" | "read">
	) => {
		const newNotification: Notification = {
			...notification,
			id: `notification-${Date.now()}-${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			timestamp: new Date().toISOString(),
			read: false,
		};

		setNotifications((prev) => [newNotification, ...prev]);
	};

	const markAsRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((notification) =>
				notification.id === id
					? { ...notification, read: true }
					: notification
			)
		);
	};

	const markAllAsRead = () => {
		setNotifications((prev) =>
			prev.map((notification) => ({ ...notification, read: true }))
		);
	};

	const removeNotification = (id: string) => {
		setNotifications((prev) =>
			prev.filter((notification) => notification.id !== id)
		);
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	const value: NotificationContextType = {
		notifications,
		unreadCount,
		addNotification,
		markAsRead,
		markAllAsRead,
		removeNotification,
	};

	return (
		<NotificationContext.Provider value={value}>
			{children}
		</NotificationContext.Provider>
	);
}

export function NotificationBell() {
	const {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		removeNotification,
	} = useNotifications();
	const [open, setOpen] = useState(false);

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60)
		);

		if (diffInMinutes < 1) return "Just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440)
			return `${Math.floor(diffInMinutes / 60)}h ago`;
		return date.toLocaleDateString();
	};

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "success":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "error":
				return "text-red-600";
			default:
				return "text-blue-600";
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" className="relative">
					<Bell className="h-4 w-4" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
						>
							{unreadCount > 99 ? "99+" : unreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0 bg-white border shadow-lg z-50" align="end">
				<div className="p-4 border-b">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold">Notifications</h3>
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={markAllAsRead}
								className="text-xs"
							>
								Mark all read
							</Button>
						)}
					</div>
				</div>
				<div className="max-h-96 overflow-y-auto">
					{notifications.length === 0 ? (
						<div className="p-4 text-center text-muted-foreground">
							No notifications
						</div>
					) : (
						notifications.slice(0, 10).map((notification) => (
							<div
								key={notification.id}
								className={`p-4 border-b hover:bg-muted/50 cursor-pointer ${
									!notification.read ? "bg-blue-50/50" : ""
								}`}
								onClick={() =>
									!notification.read &&
									markAsRead(notification.id)
								}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<div
												className={`w-2 h-2 rounded-full ${getNotificationColor(
													notification.type
												)} bg-current`}
											/>
											<p className="font-medium text-sm truncate">
												{notification.title}
											</p>
											{!notification.read && (
												<div className="w-2 h-2 bg-blue-600 rounded-full" />
											)}
										</div>
										<p className="text-sm text-muted-foreground mt-1">
											{notification.message}
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											{formatTimestamp(
												notification.timestamp
											)}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											removeNotification(notification.id);
										}}
										className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
