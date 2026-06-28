import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
	getArtistNotifications,
	updateArtistNotification,
} from "@/lib/data-access";

// GET /api/notifications - Get notifications for current artist
export async function GET(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const notifications = await getArtistNotifications(session.userId);

		return NextResponse.json({
			success: true,
			data: {
				notifications,
				unreadCount: notifications.filter((n) => !n.read).length,
			},
		});
	} catch (error) {
		console.error("Error fetching notifications:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { notificationId, markAllRead } = body;

		if (markAllRead) {
			// Mark all notifications as read
			const notifications = await getArtistNotifications(session.userId);
			const now = new Date().toISOString();

			for (const notification of notifications) {
				if (!notification.read) {
					await updateArtistNotification(session.userId, notification.id, {
						read: true,
						readAt: now,
					});
				}
			}

			return NextResponse.json({
				success: true,
				message: "All notifications marked as read",
			});
		}

		if (!notificationId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "notificationId is required",
					},
				},
				{ status: 400 },
			);
		}

		await updateArtistNotification(session.userId, notificationId, {
			read: true,
			readAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			message: "Notification marked as read",
		});
	} catch (error) {
		console.error("Error updating notification:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
