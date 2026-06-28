import { NextRequest, NextResponse } from "next/server";

/**
 * Call Artist API - Stage manager calls a specific artist via WebSocket.
 * This is a real-time-only operation (no persistent storage needed).
 * The call is targeted to a specific artist, not broadcast to all.
 */

// POST - Call a specific artist
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const { eventId } = await params;

	try {
		const body = await request.json();
		const { artistId, artistName, callType } = body;

		if (!artistId) {
			return NextResponse.json(
				{ success: false, error: { message: "artistId is required" } },
				{ status: 400 },
			);
		}

		if (
			!callType ||
			(callType !== "rehearsal" && callType !== "performance")
		) {
			return NextResponse.json(
				{
					success: false,
					error: {
						message:
							"callType must be 'rehearsal' or 'performance'",
					},
				},
				{ status: 400 },
			);
		}

		// Broadcast via WebSocket to the specific event room
		// The client-side will filter to show only to the target artist
		if ((global as any).io) {
			(global as any).io.to(`event_${eventId}`).emit("artist_called", {
				eventId,
				artistId,
				artistName: artistName || "Artist",
				callType,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({
			success: true,
			data: { message: `Call sent to ${artistName || "artist"}` },
		});
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				error: { message: error.message || "Failed to call artist" },
			},
			{ status: 500 },
		);
	}
}
