import { NextRequest, NextResponse } from "next/server";
import {
	getEventParticipationsByArtist,
	getFameLinkArtistById,
} from "@/lib/data-access";
import { EventDataService } from "@/lib/storage-service";

/**
 * GET /api/artists/[artistId]/events
 * Returns event IDs that this artist is associated with.
 * Works for both legacy and FameLink artists.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { artistId: string } },
) {
	try {
		const { artistId } = await Promise.resolve(params);
		const eventIds: string[] = [];

		// Check FameLink event participations
		try {
			const participations =
				await getEventParticipationsByArtist(artistId);
			for (const p of participations) {
				if (p.eventId && !eventIds.includes(p.eventId)) {
					eventIds.push(p.eventId);
				}
			}
		} catch {
			// Ignore
		}

		// Check legacy events
		try {
			const events = await EventDataService.listEvents();
			for (const event of events) {
				const artists = await EventDataService.getArtists(event.id);
				if (artists.some((a: any) => a.id === artistId)) {
					if (!eventIds.includes(event.id)) {
						eventIds.push(event.id);
					}
				}
			}
		} catch {
			// Ignore
		}

		return NextResponse.json({
			success: true,
			data: { eventIds },
		});
	} catch (error) {
		console.error("Error fetching artist events:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch artist events" },
			{ status: 500 },
		);
	}
}
