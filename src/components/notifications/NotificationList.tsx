"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtistNotification } from "@/types/famelink";
import {
	Bell,
	Calendar,
	MessageSquare,
	AlertCircle,
	Check,
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
			return <Calendar className="h-4 w-4 text-blue-500" />;
		case "event_update":
			return <Bell className="h-4 w-4 text-yellow-500" />;
		case "message":
			return <MessageSquare className="h-4 w-4 text-green-500" />;
		case "system":
			return <AlertCircle className="h-4 w-4 text-gray-500" />;
		default:
			return <Bell className="h-4 w-4" />;
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
		<Card className="w-80 shadow-lg">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">Notifications</CardTitle>
					<Button variant="ghost" size="icon" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>
				{unreadCount > 0 && (
					<Button
						variant="link"
						size="sm"
						className="p-0 h-auto"
						onClick={onMarkAllRead}
					>
						Mark all as read
					</Button>
				)}
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-80">
					{notifications.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							No notifications yet
						</div>
					) : (
						<div className="divide-y">
							{notifications.map((notification) => (
								<div
									key={notification.id}
									className={`p-3 hover:bg-gray-50 cursor-pointer ${
										!notification.read
											? "bg-blue-50/50"
											: ""
									}`}
									onClick={() =>
										!notification.read &&
										onMarkRead(notification.id)
									}
								>
									<div className="flex gap-3">
										<div className="mt-0.5">
											{getIcon(notification.type)}
										</div>
										<div className="flex-1 min-w-0">
											<p
												className={`text-sm ${!notification.read ? "font-medium" : ""}`}
											>
												{notification.title}
											</p>
											<p className="text-xs text-gray-500 truncate">
												{notification.message}
											</p>
											<p className="text-xs text-gray-400 mt-1">
												{formatDistanceToNow(
													new Date(
														notification.createdAt,
													),
													{ addSuffix: true },
												)}
											</p>
										</div>
										{!notification.read && (
											<div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
