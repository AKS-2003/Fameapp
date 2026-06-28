import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

/**
 * GET /api/events/[eventId]/hidden-artists
 * Get list of hidden artists for an event
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: "Event ID is required" },
				{ status: 400 }
			);
		}

		const hiddenArtists = await getEventData(eventId, "hidden-artists");

		return NextResponse.json({
			success: true,
			data: hiddenArtists || [],
		});
	} catch (error) {
		console.error("Error fetching hidden artists:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch hidden artists",
			},
			{ status: 500 }
		);
	}
}

/**
 * POST /api/events/[eventId]/hidden-artists
 * Hide or unhide an artist
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, artistName, action } = body;

		if (!eventId || !artistId || !action) {
			return NextResponse.json(
				{
					success: false,
					error: "Event ID, artist ID, and action are required",
				},
				{ status: 400 }
			);
		}

		if (action !== "hide" && action !== "unhide") {
			return NextResponse.json(
				{
					success: false,
					error: "Action must be 'hide' or 'unhide'",
				},
				{ status: 400 }
			);
		}

		// Get current hidden artists
		let hiddenArtists = (await getEventData(eventId, "hidden-artists")) || [];

		// Update the list based on action
		if (action === "hide") {
			if (!hiddenArtists.includes(artistId)) {
				hiddenArtists.push(artistId);
			}
		} else {
			hiddenArtists = hiddenArtists.filter((id: string) => id !== artistId);
		}

		// Save updated list
		await saveEventData(eventId, "hidden-artists", hiddenArtists);

		// Emit WebSocket event for real-time updates
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("hidden_artists_updated", {
				eventId,
				hiddenArtists,
				action,
				artistId,
				artistName,
				timestamp: new Date().toISOString(),
			});
			console.log(
				`WebSocket event emitted: hidden_artists_updated (${action}) for event ${eventId}`
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				hiddenArtists,
				message: `Artist ${
					action === "hide" ? "hidden" : "restored"
				} successfully`,
			},
		});
	} catch (error) {
		console.error("Error updating hidden artists:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update hidden artists",
			},
			{ status: 500 }
		);
	}
}
