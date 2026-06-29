import { NextRequest, NextResponse } from "next/server";
import { getFameLinkArtistById, getEventParticipationsByArtist, getEventById, getFameLinkArtistByEmail } from "@/lib/data-access";
import FameLinkArtistModel from "@/database/models/FameLinkArtist";
import { connectToDatabase } from "@/database/mongodb";
import { APIResponse } from "@/types";

export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const artistId = url.searchParams.get("artistId");
		const search = url.searchParams.get("search");

		// ── Search mode: find by email (exact) or artistName (partial) ──
		if (search) {
			await connectToDatabase();
			const q = search.trim();
			const byEmail = await getFameLinkArtistByEmail(q);
			let results: any[] = [];
			if (byEmail) {
				results = [byEmail];
			} else {
				// Case-insensitive partial match on artistName
				results = await FameLinkArtistModel.find({
					artistName: { $regex: q, $options: "i" },
				})
					.limit(10)
					.lean();
			}
			return NextResponse.json<APIResponse>({
				success: true,
				data: results.map((a: any) => ({
					id: a.id || a._id,
					artistName: a.artistName,
					email: a.email,
					realName: a.realName,
					phone: a.phone,
					image_url: a.image_url,
				})),
			});
		}

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
