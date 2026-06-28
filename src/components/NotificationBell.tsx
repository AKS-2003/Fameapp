"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Bell,
	X,
	FileText,
	Download,
	Clock,
	MapPin,
	User,
	Phone,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Notification {
	id: string;
	eventId: string;
	type: string;
	title: string;
	message: string;
	showDate?: string;
	readBy: string[];
	createdAt: string;
	metadata?: Record<string, any>;
}

interface ShowDateInfo {
	rehearsalTiming: string;
	location: string;
	showtime: string;
	backstageReadyTime: string;
	stageManagerName: string;
	stageManagerContact: string;
	notes: string;
	attachments: Array<{
		id: string;
		fileName: string;
		originalName: string;
		fileUrl: string;
		filePath?: string;
	}>;
}

interface NotificationBellProps {
	eventId: string;
	artistId: string;
	showDate?: string;
}

export function NotificationBell({
	eventId,
	artistId,
	showDate,
}: NotificationBellProps) {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [showDateInfo, setShowDateInfo] = useState<ShowDateInfo | null>(null);
	const [selectedNotification, setSelectedNotification] =
		useState<Notification | null>(null);

	// Helper to format time from 24h (HH:mm) to 12h format
	const formatTime = (time: string): string => {
		if (!time) return "";
		if (
			time.includes("AM") ||
			time.includes("PM") ||
			time.includes(" - ")
		) {
			if (time.includes(" - ")) {
				const [start, end] = time.split(" - ");
				return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
			}
			return time;
		}
		return formatSingleTime(time);
	};

	const formatSingleTime = (time: string): string => {
		if (!time || time.includes("AM") || time.includes("PM")) return time;
		const [hours, minutes] = time.split(":").map(Number);
		if (isNaN(hours)) return time;
		const period = hours >= 12 ? "PM" : "AM";
		const hour12 = hours % 12 || 12;
		return `${hour12}:${
			minutes?.toString().padStart(2, "0") || "00"
		} ${period}`;
	};

	const fetchNotifications = useCallback(async () => {
		try {
			// Fetch ALL notifications for this event (don't filter by showDate)
			// Artists should see notifications for all show dates
			const params = new URLSearchParams({
				artistId,
			});
			const response = await fetch(
				`/api/events/${eventId}/notifications?${params}`
			);
			if (response.ok) {
				const result = await response.json();
				setNotifications(result.data || []);
				setUnreadCount(result.unreadCount || 0);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
		}
	}, [eventId, artistId]);

	const fetchShowDateInfo = useCallback(
		async (date: string) => {
			try {
				const response = await fetch(
					`/api/events/${eventId}/show-date-info?showDate=${date}`
				);
				if (response.ok) {
					const result = await response.json();
					setShowDateInfo(result.data);
				}
			} catch (error) {
				console.error("Error fetching show date info:", error);
			}
		},
		[eventId]
	);

	useEffect(() => {
		fetchNotifications();
		// Poll for new notifications every 10 seconds (reduced from 30 for more responsiveness)
		const interval = setInterval(fetchNotifications, 10000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	// Listen for WebSocket events
	useEffect(() => {
		const handleWebSocketEvent = (event: CustomEvent) => {
			if (event.detail?.eventId === eventId) {
				fetchNotifications();
				if (event.detail?.showDate) {
					fetchShowDateInfo(event.detail.showDate);
				}
			}
		};

		window.addEventListener(
			"show_date_info_updated" as any,
			handleWebSocketEvent
		);
		window.addEventListener(
			"new_notification" as any,
			handleWebSocketEvent
		);

		return () => {
			window.removeEventListener(
				"show_date_info_updated" as any,
				handleWebSocketEvent
			);
			window.removeEventListener(
				"new_notification" as any,
				handleWebSocketEvent
			);
		};
	}, [eventId, fetchNotifications, fetchShowDateInfo]);

	const markAsRead = async (notificationId?: string) => {
		try {
			await fetch(`/api/events/${eventId}/notifications`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId,
					notificationId,
					markAllRead: !notificationId,
				}),
			});
			fetchNotifications();
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const clearAllNotifications = async () => {
		try {
			await fetch(`/api/events/${eventId}/notifications`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId,
					clearAll: true,
				}),
			});
			setNotifications([]);
			setUnreadCount(0);
		} catch (error) {
			console.error("Error clearing notifications:", error);
		}
	};

	const handleNotificationClick = async (notification: Notification) => {
		setSelectedNotification(notification);
		if (!notification.readBy.includes(artistId)) {
			await markAsRead(notification.id);
		}
		if (notification.showDate) {
			await fetchShowDateInfo(notification.showDate);
		}
	};

	const downloadAttachment = async (attachment: {
		fileUrl: string;
		filePath?: string;
		fileName?: string;
		originalName: string;
	}) => {
		try {
			// Use filePath if available, otherwise try to extract from fileUrl or fileName
			let filePath = attachment.filePath || attachment.fileName || "";

			if (!filePath && attachment.fileUrl) {
				// Check if it's a GCS URL
				if (
					attachment.fileUrl.includes("storage.googleapis.com") ||
					attachment.fileUrl.includes("storage.cloud.google.com")
				) {
					// Extract path from GCS URL
					const urlObj = new URL(attachment.fileUrl);
					const pathParts = urlObj.pathname.split("/");
					// Remove bucket name from path
					const bucketIndex = pathParts.findIndex(
						(p) => p === "fame-data"
					);
					if (bucketIndex !== -1) {
						filePath = pathParts.slice(bucketIndex + 1).join("/");
					} else {
						// Try to get path after the first segment
						filePath = pathParts.slice(2).join("/");
					}
				}
			}

			if (filePath) {
				// Use the download API to get a fresh signed URL
				const response = await fetch(`/api/download/${filePath}`);
				if (response.ok) {
					const data = await response.json();
					if (data.downloadUrl) {
						// Create a link and trigger download
						const link = document.createElement("a");
						link.href = data.downloadUrl;
						link.download = attachment.originalName;
						link.target = "_blank";
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						return;
					}
				}
			}

			// Fallback to direct URL
			const link = document.createElement("a");
			link.href = attachment.fileUrl;
			link.download = attachment.originalName;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error("Error downloading file:", error);
			// Fallback to direct URL
			const link = document.createElement("a");
			link.href = attachment.fileUrl;
			link.download = attachment.originalName;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="relative bg-white hover:bg-gray-50 border-gray-200"
				>
					<Bell className="h-5 w-5 text-gray-700" />
					{unreadCount > 0 && (
						<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-96 p-0 bg-white border shadow-xl"
				align="end"
			>
				<div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
					<h3 className="font-semibold text-gray-800">
						Notifications
					</h3>
					<div className="flex items-center gap-2">
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => markAsRead()}
								className="text-xs text-purple-600 hover:text-purple-800 h-7 px-2"
							>
								Mark all read
							</Button>
						)}
						{notifications.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearAllNotifications}
								className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
							>
								<Trash2 className="h-3 w-3 mr-1" />
								Clear all
							</Button>
						)}
					</div>
				</div>

				<div className="h-[400px] overflow-y-auto">
					{selectedNotification && showDateInfo ? (
						<div className="p-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setSelectedNotification(null);
									setShowDateInfo(null);
								}}
								className="mb-3 text-sm"
							>
								← Back to notifications
							</Button>

							<div className="space-y-4">
								<h4 className="font-semibold text-lg text-purple-700">
									Show Information
								</h4>
								{selectedNotification.showDate && (
									<p className="text-sm text-gray-600">
										{format(
											new Date(
												selectedNotification.showDate
											),
											"PPP"
										)}
									</p>
								)}

								<div className="space-y-3 bg-gray-50 rounded-lg p-4">
									{showDateInfo.rehearsalTiming && (
										<div className="flex items-start gap-3">
											<Clock className="h-4 w-4 text-blue-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Rehearsal Timing
												</p>
												<p className="font-medium">
													{formatTime(
														showDateInfo.rehearsalTiming
													)}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.location && (
										<div className="flex items-start gap-3">
											<MapPin className="h-4 w-4 text-red-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Location
												</p>
												<p className="font-medium">
													{showDateInfo.location}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.showtime && (
										<div className="flex items-start gap-3">
											<Clock className="h-4 w-4 text-green-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Showtime
												</p>
												<p className="font-medium">
													{formatTime(
														showDateInfo.showtime
													)}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.backstageReadyTime && (
										<div className="flex items-start gap-3">
											<Clock className="h-4 w-4 text-orange-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Be Ready Backstage
												</p>
												<p className="font-medium">
													{formatTime(
														showDateInfo.backstageReadyTime
													)}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.stageManagerName && (
										<div className="flex items-start gap-3">
											<User className="h-4 w-4 text-purple-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Stage Manager
												</p>
												<p className="font-medium">
													{
														showDateInfo.stageManagerName
													}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.stageManagerContact && (
										<div className="flex items-start gap-3">
											<Phone className="h-4 w-4 text-teal-600 mt-0.5" />
											<div>
												<p className="text-xs text-gray-500">
													Contact
												</p>
												<p className="font-medium">
													{
														showDateInfo.stageManagerContact
													}
												</p>
											</div>
										</div>
									)}

									{showDateInfo.notes && (
										<div className="pt-2 border-t">
											<p className="text-xs text-gray-500 mb-1">
												Notes
											</p>
											<p className="text-sm text-gray-700">
												{showDateInfo.notes}
											</p>
										</div>
									)}
								</div>

								{/* Attachments */}
								{showDateInfo.attachments &&
									showDateInfo.attachments.length > 0 && (
										<div className="mt-4">
											<p className="text-xs text-gray-500 mb-2">
												Attachments
											</p>
											<div className="space-y-2">
												{showDateInfo.attachments.map(
													(attachment) => (
														<div
															key={attachment.id}
															className="flex items-center justify-between p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
														>
															<div className="flex items-center gap-2">
																<FileText className="h-4 w-4 text-red-500" />
																<span className="text-sm truncate max-w-[180px]">
																	{
																		attachment.originalName
																	}
																</span>
															</div>
															<Button
																variant="ghost"
																size="sm"
																onClick={() =>
																	downloadAttachment(
																		attachment
																	)
																}
																className="h-7 px-2 text-purple-600 hover:text-purple-800"
															>
																<Download className="h-4 w-4" />
															</Button>
														</div>
													)
												)}
											</div>
										</div>
									)}
							</div>
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-gray-500">
							<Bell className="h-12 w-12 mb-3 opacity-30" />
							<p className="text-sm">No notifications yet</p>
						</div>
					) : (
						<div className="divide-y">
							{notifications.map((notification) => {
								const isUnread =
									!notification.readBy.includes(artistId);
								return (
									<div
										key={notification.id}
										onClick={() =>
											handleNotificationClick(
												notification
											)
										}
										className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
											isUnread ? "bg-purple-50/50" : ""
										}`}
									>
										<div className="flex items-start gap-3">
											<div
												className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
													isUnread
														? "bg-purple-500"
														: "bg-transparent"
												}`}
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between gap-2">
													<p
														className={`text-sm ${
															isUnread
																? "font-semibold"
																: "font-medium"
														} text-gray-800 truncate`}
													>
														{notification.title}
													</p>
													<span className="text-xs text-gray-400 flex-shrink-0">
														{format(
															new Date(
																notification.createdAt
															),
															"MMM d"
														)}
													</span>
												</div>
												<p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
													{notification.message}
												</p>
												{notification.showDate && (
													<Badge
														variant="secondary"
														className="mt-1 text-xs"
													>
														{format(
															new Date(
																notification.showDate
															),
															"MMM d, yyyy"
														)}
													</Badge>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
