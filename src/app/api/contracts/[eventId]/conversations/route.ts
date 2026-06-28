import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// GET /api/contracts/[eventId]/conversations — Get conversations (optionally filtered by artistId)
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");

		let messages;
		if (artistId) {
			messages = await ContractService.getConversationsForArtist(eventId, artistId);
		} else {
			messages = await ContractService.getConversations(eventId);
		}

		return NextResponse.json({ success: true, messages });
	} catch (error) {
		console.error("Error fetching conversations:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch conversations" },
			{ status: 500 }
		);
	}
}

// POST /api/contracts/[eventId]/conversations — Add a new message
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		if (!body.id) {
			body.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		}

		const success = await ContractService.addConversationMessage(eventId, body);
		if (success) {
			return NextResponse.json({ success: true, message: body });
		}
		return NextResponse.json(
			{ success: false, error: "Failed to add message" },
			{ status: 500 }
		);
	} catch (error) {
		console.error("Error adding conversation message:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to add message" },
			{ status: 500 }
		);
	}
}
