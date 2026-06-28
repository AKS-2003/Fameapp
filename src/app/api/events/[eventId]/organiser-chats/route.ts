import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

interface RouteParams {
	params: Promise<{ eventId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { eventId } = await params;
		if (!eventId) {
			return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
		}

		const chats = await getEventData(eventId, "organiser_chats") || [];
		return NextResponse.json({ success: true, data: { chats } });
	} catch (error) {
		console.error("[organiser-chats GET]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	try {
		const { eventId } = await params;
		if (!eventId) {
			return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 });
		}

		const body = await request.json();
		const { action } = body;

		const chats = await getEventData(eventId, "organiser_chats") || [];

		if (action === "send") {
			const { sender, recipient, text } = body;
			if (!sender || !recipient || !text || !text.trim()) {
				return NextResponse.json({ success: false, error: "Invalid send arguments" }, { status: 400 });
			}

			const newMessage = {
				id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
				sender,
				recipient,
				text: text.trim(),
				createdAt: new Date().toISOString(),
				status: "unread"
			};

			chats.push(newMessage);
			await saveEventData(eventId, "organiser_chats", chats);

			// Emit Socket event to recipient
			const io = (global as any).io;
			if (io) {
				io.to(`event_${eventId}`).emit("new_organiser_message", {
					eventId,
					message: newMessage
				});
			}

			return NextResponse.json({ success: true, data: { message: newMessage } }, { status: 201 });
		} else if (action === "read") {
			const { messageId } = body;
			if (!messageId) {
				return NextResponse.json({ success: false, error: "Message ID is required" }, { status: 400 });
			}

			let updated = false;
			const updatedChats = chats.map((m: any) => {
				if (m.id === messageId) {
					m.status = "read";
					updated = true;
				}
				return m;
			});

			if (updated) {
				await saveEventData(eventId, "organiser_chats", updatedChats);
				
				// Emit Socket event to notify Organiser
				const io = (global as any).io;
				if (io) {
					io.to(`event_${eventId}`).emit("organiser_message_read", {
						eventId,
						messageId
					});
				}
			}

			return NextResponse.json({ success: true });
		}

		return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
	} catch (error) {
		console.error("[organiser-chats POST]", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
