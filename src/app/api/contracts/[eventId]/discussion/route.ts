import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { connectToDatabase } from "@/database/mongodb";
import { v4 as uuidv4 } from "uuid";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, message } = body;

		if (!eventId || !artistId || !message) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		await connectToDatabase();
		
		const messageWithId = {
			...message,
			id: uuidv4(),
			timestamp: new Date().toISOString()
		};

		const success = await ContractService.addStageDiscussionMessage(eventId, artistId, messageWithId);

		if (!success) {
			return NextResponse.json(
				{ error: "Failed to add message or artist not found" },
				{ status: 404 }
			);
		}

		// Trigger WebSocket event via global IO if available
		if ((global as any).io) {
			(global as any).io.to(`event_${eventId}`).emit("new_stage_discussion_message", {
				eventId,
				artistId,
				...messageWithId
			});
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error("[StageDiscussion API] Error:", error);
		return NextResponse.json(
			{ error: `Internal server error: ${error.message}` },
			{ status: 500 }
		);
	}
}
