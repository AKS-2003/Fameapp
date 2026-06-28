import { NextRequest, NextResponse } from "next/server";
import { ChatMessage, ChatConversation } from "@/types/chat";
import { EventDataService } from "@/lib/storage-service";
import { getEventData, saveEventData } from "@/lib/data-access";

const STORAGE_KEY = "chat";

/**
 * GET /api/events/[eventId]/chat
 * Get all chat conversations for an event from MongoDB
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const showDate = searchParams.get("showDate");
		const artistId = searchParams.get("artistId");

		// Get all chat data for this event from MongoDB
		const chatData = await getEventData(eventId, STORAGE_KEY);

		if (!chatData) {
			return NextResponse.json({
				success: true,
				data: { conversations: [] },
			});
		}

		let conversations = chatData.conversations || [];

		// Filter by show date if provided
		if (showDate) {
			conversations = conversations.filter(
				(conv: ChatConversation) => conv.showDate === showDate,
			);
		}

		// Filter by artist if provided
		if (artistId) {
			conversations = conversations.filter((conv: ChatConversation) =>
				conv.artistIds.includes(artistId),
			);

			// Mark messages as read for this artist
			for (const conv of conversations) {
				for (const msg of conv.messages) {
					if (!msg.readBy.includes(artistId)) {
						msg.readBy.push(artistId);
						msg.read = true;
					}
				}
			}

			// Save updated read status back to MongoDB
			await saveEventData(eventId, STORAGE_KEY, chatData);
		}

		return NextResponse.json({ success: true, data: { conversations } });
	} catch (error) {
		console.error("Error fetching chat data from MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch chat data" }, { status: 500 });
	}
}

/**
 * POST /api/events/[eventId]/chat
 * Send a new message (from stage manager or artist)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { showDate, message, senderId, senderName, senderRole } = body;

		// Validate input
		if (!showDate || !message || !senderId || !senderName || !senderRole) {
			return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
		}

		// Validate senderRole
		if (senderRole !== "stage_manager" && senderRole !== "artist") {
			return NextResponse.json({ success: false, error: "Invalid sender role" }, { status: 400 });
		}

		// Get artists assigned to this show date (using Proxy to MongoDB in lib/storage-service)
		const artists = await EventDataService.getArtists(eventId);
		const assignedArtists = artists.filter((artist: any) => artist.performanceDate === showDate);

		if (assignedArtists.length === 0) {
			return NextResponse.json({ success: false, error: "No artists assigned to this show date" }, { status: 400 });
		}

		// Get event details for email
		const event = await EventDataService.getEvent(eventId);
		const eventName = event?.name || "Event";

		// Create new message
		const newMessage: ChatMessage = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			eventId,
			showDate,
			senderId,
			senderName,
			senderRole,
			message,
			timestamp: new Date().toISOString(),
			read: false,
			readBy: [],
		};

		// Get or create chat data from MongoDB
		let chatData = await getEventData(eventId, STORAGE_KEY);
		if (!chatData) {
			chatData = {
				eventId,
				conversations: [],
				updatedAt: new Date().toISOString(),
			};
		}

		// Find or create conversation for this show date
		let conversation = chatData.conversations.find((conv: ChatConversation) => conv.showDate === showDate);

		if (!conversation) {
			conversation = {
				eventId,
				showDate,
				messages: [],
				artistIds: assignedArtists.map((a: any) => a.id),
				lastMessageAt: new Date().toISOString(),
				unreadCount: 0,
			};
			chatData.conversations.push(conversation);
		} else {
			conversation.artistIds = assignedArtists.map((a: any) => a.id);
		}

		// Add message to conversation
		conversation.messages.push(newMessage);
		conversation.lastMessageAt = newMessage.timestamp;

		// Update unread count based on sender role
		if (senderRole === "stage_manager") {
			conversation.unreadCount = assignedArtists.length;
		} else {
			conversation.unreadCount = 1;
		}

		// Save chat data to MongoDB
		await saveEventData(eventId, STORAGE_KEY, chatData);

		// Broadcast WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("new_chat_message", {
				eventId,
				showDate,
				message: newMessage,
				artistIds: conversation.artistIds,
				senderRole,
				timestamp: new Date().toISOString(),
			});
		}

		// Send email notifications
		if (senderRole === "stage_manager") {
			const emailPromises = assignedArtists.map(async (artist: any) => {
				if (artist.email) {
					try {
						const { sendChatMessageEmail } = await import("@/lib/email-service");
						await sendChatMessageEmail({
							artistId: artist.id,
							artistEmail: artist.email,
							artistName: artist.artistName || artist.realName,
							eventId,
							eventName,
							showDate,
							message,
							senderName,
							timestamp: newMessage.timestamp,
						});
					} catch (emailError) {
						console.error(`Failed to send email to ${artist.email}:`, emailError);
					}
				}
			});
			await Promise.all(emailPromises);
		} else {
			if (event?.stageManagerEmail) {
				try {
					const { sendArtistReplyEmail } = await import("@/lib/email-service");
					await sendArtistReplyEmail({
						stageManagerEmail: event.stageManagerEmail,
						stageManagerName: event.stageManagerName || "Stage Manager",
						artistName: senderName,
						eventId,
						eventName,
						showDate,
						message,
						timestamp: newMessage.timestamp,
					});
				} catch (emailError) {
					console.error(`Failed to send email to stage manager:`, emailError);
				}
			}
		}

		return NextResponse.json({ success: true, data: { message: newMessage, conversation } });
	} catch (error) {
		console.error("Error sending chat message via MongoDB:", error);
		return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
	}
}
