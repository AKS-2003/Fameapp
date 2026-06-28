import { NextRequest, NextResponse } from "next/server";
import { getFameLinkArtistById, getEventParticipationsByArtist, getEventById } from "@/lib/data-access";
import { APIResponse } from "@/types";

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const artistId = url.searchParams.get("artistId");

		if (!artistId) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_ARTIST_ID",
						message: "Artist ID is required",
					},
				},
				{ status: 400 }
			);
		}

		// Find artist in MongoDB global profile
		const artist = await getFameLinkArtistById(artistId);

		if (!artist) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Artist profile not found",
					},
				},
				{ status: 404 }
			);
		}

		// Find event participation context if available
		const participations = await getEventParticipationsByArtist(artistId);
		let contextData = { ...artist };

		if (participations.length > 0) {
			const latestParticipation = participations[0];
			const event = await getEventById(latestParticipation.eventId);
			if (event) {
				(contextData as any).eventId = event.id;
				(contextData as any).eventName = event.name;
			}
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: contextData,
		});
	} catch (error) {
		console.error("Get artist profile error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch artist profile",
				},
			},
			{ status: 500 }
		);
	}
}
