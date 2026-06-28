import { NextRequest, NextResponse } from "next/server";
import { getFameLinkArtistByEmail, getFameLinkArtistById, getEventParticipationsByArtist, getEventById } from "@/lib/data-access";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const { email, artistName, artistId } = await request.json();

		if (!email || !artistName) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FIELDS",
						message: "Email and artist name are required",
					},
				},
				{ status: 400 }
			);
		}

		let artist = null;

		if (artistId && artistId.trim() !== "") {
			artist = await getFameLinkArtistById(artistId);
		} else {
			artist = await getFameLinkArtistByEmail(email);
		}

		if (!artist || 
			artist.email.toLowerCase() !== email.toLowerCase() || 
			artist.artistName.toLowerCase() !== artistName.toLowerCase()) {
			
			const errorMessage = artistId && artistId.trim() !== ""
				? "Artist not found. Please check your Artist ID, email, and artist name are all correct."
				: "Artist not found with the provided email and artist name.";

			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: errorMessage,
					},
				},
				{ status: 404 }
			);
		}

		// Find event participation context
		const participations = await getEventParticipationsByArtist(artist.id);
		const foundArtist = { ...artist };
		if (participations.length > 0) {
			const event = await getEventById(participations[0].eventId);
			if (event) {
				(foundArtist as any).eventId = event.id;
				(foundArtist as any).eventName = event.name;
			}
		}

		// Create session data and set cookie to prevent auth loops in FameLink system
		const { createArtistSessionResponse } = await import("@/lib/session");
		const sessionData = {
			userId: artist.id,
			email: artist.email,
			role: "artist" as const,
			status: "active" as const,
		};

		const response = NextResponse.json<APIResponse>({
			success: true,
			data: {
				artist: foundArtist,
			},
		});

		return createArtistSessionResponse(sessionData, response);
	} catch (error) {
		console.error("Artist login error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to authenticate artist",
				},
			},
			{ status: 500 }
		);
	}
}
