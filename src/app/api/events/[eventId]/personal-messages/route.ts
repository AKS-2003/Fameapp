import { NextRequest, NextResponse } from "next/server";
import { PersonalMessage, PersonalMessageData } from "@/types/chat";
import { EventDataService } from "@/lib/storage-service";
import { getEventData, saveEventData } from "@/lib/data-access";

const STORAGE_KEY = "personal-messages";

/**
 * GET /api/events/[eventId]/personal-messages
 * Get personal messages for a specific artist from MongoDB
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");
		const viewer = searchParams.get("viewer");
		const countOnly = searchParams.get("countOnly") === "true";

		// Get personal messages data for this event from MongoDB
		const personalData = await getEventData(eventId, STORAGE_KEY);

		if (!personalData) {
			return NextResponse.json({
				success: true,
				data: { messages: [], unreadCounts: {} },
			});
		}

		if (countOnly && !artistId) {
			const unreadCounts = (personalData.messages || []).reduce(
				(acc: Record<string, number>, msg: PersonalMessage) => {
					if (msg.senderRole === "artist" && !msg.readByStageManager) {
						acc[msg.artistId] = (acc[msg.artistId] || 0) + 1;
					}
					return acc;
				},
				{},
			);

			return NextResponse.json({ success: true, data: { messages: [], unreadCounts } });
		}

		if (!artistId) {
			return NextResponse.json({ success: false, error: "artistId is required" }, { status: 400 });
		}

		// Filter messages for this specific artist
		const artistMessages = (personalData.messages || []).filter(
			(msg: PersonalMessage) => msg.artistId === artistId,
		);

		// Mark messages as read based on viewer
		let hasUpdates = false;
		if (!countOnly) {
			for (const msg of artistMessages) {
				if (viewer === "stage_manager") {
					if (msg.senderRole === "artist" && !msg.readByStageManager) {
						msg.readByStageManager = true;
						hasUpdates = true;
					}
				} else {
					if (msg.senderRole !== "artist" && !msg.read) {
						msg.read = true;
						hasUpdates = true;
					}
				}
			}
		}

		// Save updated read status if there were changes
		if (hasUpdates) {
			await saveEventData(eventId, STORAGE_KEY, personalData);
		}

		return NextResponse.json({ success: true, data: { messages: artistMessages, unreadCounts: {} } });
	} catch (error) {
		console.error("Error fetching personal messages from MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch personal messages" }, { status: 500 });
	}
}

/**
 * POST /api/events/[eventId]/personal-messages
 * Send a personal message to a specific artist or private reply to stage manager
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, artistName, message, senderId, senderName, senderRole } = body;

		// Validate input
		if (!artistId || !artistName || !message || !senderId || !senderName) {
			return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
		}

		const role = senderRole || "stage_manager";
		const event = await EventDataService.getEvent(eventId);
		const eventName = event?.name || "Event";

		// Create new personal message
		const newMessage: PersonalMessage = {
			id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			eventId,
			artistId,
			artistName,
			senderId,
			senderName,
			senderRole: role,
			message,
			timestamp: new Date().toISOString(),
			read: false,
		};

		// Get or create personal messages data from MongoDB
		let personalData = await getEventData(eventId, STORAGE_KEY);
		if (!personalData) {
			personalData = { eventId, messages: [], updatedAt: new Date().toISOString() };
		}

		personalData.messages.push(newMessage);

		// Save personal messages data to MongoDB
		await saveEventData(eventId, STORAGE_KEY, personalData);

		// Broadcast WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("new_personal_message", {
				eventId, artistId, artistName, senderRole: role, message: newMessage,
				timestamp: new Date().toISOString(),
			});
		}

		// Send email notifications
		if (role === "artist") {
			if (event?.stageManagerEmail) {
				try {
					const { sendArtistPrivateReplyEmail } = await import("@/lib/email-service");
					await sendArtistPrivateReplyEmail({
						stageManagerEmail: event.stageManagerEmail,
						stageManagerName: event.stageManagerName || "Stage Manager",
						artistName, artistId, eventId, eventName, message,
						timestamp: newMessage.timestamp,
					});
				} catch (emailError) {
					console.error(`Failed to send artist private reply email:`, emailError);
				}
			}
		} else {
			const artists = await EventDataService.getArtists(eventId);
			const artist = artists.find((a: any) => a.id === artistId);

			if (artist?.email) {
				try {
					const { sendPersonalMessageEmail } = await import("@/lib/email-service");
					await sendPersonalMessageEmail({
						artistId: artist.id,
						artistEmail: artist.email,
						artistName: artist.artistName || artist.realName || artistName,
						eventId, eventName, message, senderName,
						timestamp: newMessage.timestamp,
					});
				} catch (emailError) {
					console.error(`Failed to send personal message email to ${artist.email}:`, emailError);
				}
			}
		}

		return NextResponse.json({ success: true, data: { message: newMessage } });
	} catch (error) {
		console.error("Error sending personal message via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to send personal message" }, { status: 500 });
	}
}
