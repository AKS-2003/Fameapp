import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

// Declare global io for WebSocket
declare global {
	var io: any;
}

export interface ArtistUpdateNotification {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	changedFields: string[];
	summary: string;
	timestamp: string;
	readBy: string[]; // stage manager IDs who have read this
}

interface ArtistUpdatesData {
	eventId: string;
	notifications: ArtistUpdateNotification[];
	updatedAt: string;
}

/**
 * GET /api/events/[eventId]/artist-updates
 * Get artist profile update notifications for this event
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");
		const stageManagerId = searchParams.get("stageManagerId");

		const data = await getArtistUpdatesData(eventId);

		if (!data) {
			return NextResponse.json({
				success: true,
				data: { notifications: [], unreadCounts: {} },
			});
		}

		let notifications = data.notifications || [];

		if (artistId) {
			notifications = notifications.filter(
				(n) => n.artistId === artistId,
			);
		}

		// Calculate unread counts per artist
		const unreadCounts: Record<string, number> = {};
		if (stageManagerId) {
			for (const n of data.notifications) {
				if (!n.readBy.includes(stageManagerId)) {
					unreadCounts[n.artistId] =
						(unreadCounts[n.artistId] || 0) + 1;
				}
			}
		}

		return NextResponse.json({
			success: true,
			data: { notifications, unreadCounts },
		});
	} catch (error) {
		console.error("Error fetching artist updates:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch artist updates from VPS" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/events/[eventId]/artist-updates
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		// Mark as read action
		if (body.action === "markRead") {
			const { stageManagerId, artistId } = body;
			if (!stageManagerId) {
				return NextResponse.json(
					{ success: false, error: "stageManagerId is required" },
					{ status: 400 },
				);
			}

			let data = await getArtistUpdatesData(eventId);
			if (!data) {
				return NextResponse.json({ success: true, data: { marked: 0 } });
			}

			let marked = 0;
			for (const n of data.notifications) {
				if (artistId && n.artistId !== artistId) continue;
				if (!n.readBy.includes(stageManagerId)) {
					n.readBy.push(stageManagerId);
					marked++;
				}
			}

			if (marked > 0) {
				await saveArtistUpdatesData(eventId, data);
			}

			return NextResponse.json({ success: true, data: { marked } });
		}

		// Create new notification
		const { artistId, artistName, changedFields, summary } = body;

		if (!artistId || !artistName || !changedFields || changedFields.length === 0) {
			return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
		}

		let data = await getArtistUpdatesData(eventId);
		if (!data) {
			data = {
				eventId,
				notifications: [],
				updatedAt: new Date().toISOString(),
			};
		}

		const notification: ArtistUpdateNotification = {
			id: `au-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			eventId,
			artistId,
			artistName,
			changedFields,
			summary,
			timestamp: new Date().toISOString(),
			readBy: [],
		};

		data.notifications.push(notification);

		// Keep only last 200 notifications
		if (data.notifications.length > 200) {
			data.notifications = data.notifications.slice(-200);
		}

		await saveArtistUpdatesData(eventId, data);

		// Broadcast via WebSocket
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("artist_profile_updated", {
				eventId, artistId, artistName, changedFields, summary, notification,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, data: { notification } });
	} catch (error) {
		console.error("Error creating artist update notification:", error);
		return NextResponse.json({ success: false, error: "Failed to create notification on VPS" }, { status: 500 });
	}
}

async function getArtistUpdatesData(eventId: string): Promise<ArtistUpdatesData | null> {
	return await getEventData(eventId, "artist_updates");
}

async function saveArtistUpdatesData(eventId: string, data: ArtistUpdatesData): Promise<boolean> {
	await saveEventData(eventId, "artist_updates", { ...data, updatedAt: new Date().toISOString() });
	return true;
}
