import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

export interface Notification {
	id: string;
	eventId: string;
	type:
		| "show_date_info"
		| "rehearsal_update"
		| "general"
		| "emergency"
		| "assignment";
	title: string;
	message: string;
	showDate?: string;
	targetAudience: "all_artists" | "specific_date" | "specific_artist";
	targetIds?: string[]; // Artist IDs if specific
	readBy: string[]; // Artist IDs who have read
	createdAt: string;
	createdBy: string;
	metadata?: Record<string, any>;
}

const getNotificationsKey = () => "notifications";

// GET - Fetch notifications for an event or specific artist
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");
		const showDate = searchParams.get("showDate");
		const unreadOnly = searchParams.get("unreadOnly") === "true";

		const data = await getEventData(eventId, getNotificationsKey());

		if (!data) {
			return NextResponse.json({
				success: true,
				data: [],
				unreadCount: 0,
			});
		}

		let notifications: Notification[] = data.notifications || [];

		// Filter by show date if provided
		if (showDate) {
			notifications = notifications.filter((n) => {
				if (n.targetAudience === "all_artists") return true;
				if (!n.showDate) return false;
				const nDate = n.showDate.includes("T")
					? n.showDate.split("T")[0]
					: n.showDate;
				const qDate = showDate.includes("T")
					? showDate.split("T")[0]
					: showDate;
				return nDate === qDate;
			});
		}

		// Filter by artist if provided
		if (artistId) {
			notifications = notifications.filter((n) => {
				// Filter out notifications cleared by this artist
				const clearedBy = (n as any).clearedBy || [];
				if (clearedBy.includes(artistId)) {
					return false;
				}

				if (n.targetAudience === "all_artists") return true;
				if (n.targetAudience === "specific_artist") {
					return n.targetIds?.includes(artistId);
				}
				return true;
			});
		}

		// Filter unread only
		if (unreadOnly && artistId) {
			notifications = notifications.filter(
				(n) => !n.readBy.includes(artistId)
			);
		}

		// Calculate unread count for artist
		let unreadCount = 0;
		if (artistId) {
			unreadCount = notifications.filter(
				(n) => !n.readBy.includes(artistId)
			).length;
		}

		// Sort by newest first
		notifications.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() -
				new Date(a.createdAt).getTime()
		);

		return NextResponse.json({
			success: true,
			data: notifications,
			unreadCount,
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch notifications",
			},
			{ status: 500 }
		);
	}
}

// POST - Create a new notification
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		const {
			type,
			title,
			message,
			showDate,
			targetAudience,
			targetIds,
			createdBy,
			metadata,
		} = body;

		if (!type || !title || !message) {
			return NextResponse.json(
				{
					success: false,
					error: "Type, title, and message are required",
				},
				{ status: 400 }
			);
		}

		const existingData = await getEventData(eventId, getNotificationsKey());
		const notifications: Notification[] = existingData?.notifications || [];

		const newNotification: Notification = {
			id: `notif_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			eventId,
			type,
			title,
			message,
			showDate,
			targetAudience: targetAudience || "all_artists",
			targetIds,
			readBy: [],
			createdAt: new Date().toISOString(),
			createdBy: createdBy || "stage_manager",
			metadata,
		};

		notifications.push(newNotification);

		await saveEventData(eventId, getNotificationsKey(), {
			notifications,
			updatedAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			data: newNotification,
		});
	} catch (error) {
		console.error("Error creating notification:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create notification",
			},
			{ status: 500 }
		);
	}
}

// PATCH - Mark notification as read
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { notificationId, artistId, markAllRead } = body;

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: "Artist ID is required",
				},
				{ status: 400 }
			);
		}

		const existingData = await getEventData(eventId, getNotificationsKey());

		if (!existingData) {
			return NextResponse.json({
				success: true,
				message: "No notifications to update",
			});
		}

		const notifications: Notification[] = existingData.notifications || [];

		if (markAllRead) {
			// Mark all as read for this artist
			notifications.forEach((n) => {
				if (!n.readBy.includes(artistId)) {
					n.readBy.push(artistId);
				}
			});
		} else if (notificationId) {
			// Mark specific notification as read
			const notification = notifications.find(
				(n) => n.id === notificationId
			);
			if (notification && !notification.readBy.includes(artistId)) {
				notification.readBy.push(artistId);
			}
		}

		await saveEventData(eventId, getNotificationsKey(), {
			notifications,
			updatedAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			message: "Notification(s) marked as read",
		});
	} catch (error) {
		console.error("Error updating notification:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update notification",
			},
			{ status: 500 }
		);
	}
}

// DELETE - Clear all notifications for an artist
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, clearAll } = body;

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: "Artist ID is required",
				},
				{ status: 400 }
			);
		}

		const existingData = await getEventData(eventId, getNotificationsKey());

		if (!existingData) {
			return NextResponse.json({
				success: true,
				message: "No notifications to clear",
			});
		}

		let notifications: Notification[] = existingData.notifications || [];

		if (clearAll) {
			// Remove all notifications that this artist can see
			// For "all_artists" notifications, we add the artistId to a "clearedBy" array
			// For "specific_artist" notifications targeting this artist, we remove them
			notifications = notifications
				.map((n) => {
					if (n.targetAudience === "all_artists") {
						// Add to clearedBy array instead of deleting (so other artists can still see)
						const clearedBy = (n as any).clearedBy || [];
						if (!clearedBy.includes(artistId)) {
							clearedBy.push(artistId);
						}
						return { ...n, clearedBy };
					}
					return n;
				})
				.filter((n) => {
					// Remove notifications specifically for this artist
					if (
						n.targetAudience === "specific_artist" &&
						n.targetIds?.includes(artistId)
					) {
						return false;
					}
					return true;
				});
		}

		await saveEventData(eventId, getNotificationsKey(), {
			notifications,
			updatedAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			message: "Notifications cleared",
		});
	} catch (error) {
		console.error("Error clearing notifications:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to clear notifications",
			},
			{ status: 500 }
		);
	}
}
