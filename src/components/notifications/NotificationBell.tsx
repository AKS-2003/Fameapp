"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArtistNotification } from "@/types/famelink";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationList } from "./NotificationList";

export function NotificationBell() {
	const [notifications, setNotifications] = useState<ArtistNotification[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const fetchNotifications = useCallback(async () => {
		try {
			const res = await fetch("/api/notifications");
			const data = await res.json();
			if (data.success) setNotifications(data.data.notifications || []);
		} catch (err) {
			console.error("Error fetching notifications:", err);
		}
	}, []);

	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 60000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	const markRead = async (id: string) => {
		setNotifications((prev) =>
			prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
		);
		try {
			await fetch("/api/notifications", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notificationId: id }),
			});
		} catch (err) {
			console.error("Error marking notification read:", err);
		}
	};

	const markAllRead = async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		try {
			await fetch("/api/notifications", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ markAllRead: true }),
			});
		} catch (err) {
			console.error("Error marking all notifications read:", err);
		}
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="relative" ref={containerRef}>
			<NotificationBadge count={unreadCount} onClick={() => setIsOpen((v) => !v)} />
			{isOpen && (
				<div className="absolute right-0 top-full mt-2 z-50">
					<NotificationList
						notifications={notifications}
						onMarkRead={markRead}
						onMarkAllRead={markAllRead}
						onClose={() => setIsOpen(false)}
					/>
				</div>
			)}
		</div>
	);
}
