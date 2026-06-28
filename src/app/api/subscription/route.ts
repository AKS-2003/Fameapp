import { NextRequest, NextResponse } from "next/server";
import { getAnySessionFromRequest } from "@/lib/session";

import { getUserById } from "@/lib/data-access";
import { getFameLinkArtistById } from "@/lib/data-access";
import { EventDataService } from "@/lib/storage-service";
import { getBaseShowsByArtist } from "@/lib/data-access";
import {
	getMaxEvents,
	getMaxShows,
	defaultSubscription,
} from "@/lib/subscription";

// Prevent Next.js from caching this route — subscription data must always be fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noCacheHeaders() {
	return {
		"Cache-Control":
			"no-store, no-cache, must-revalidate, proxy-revalidate",
		Pragma: "no-cache",
		Expires: "0",
	};
}

export async function GET(request: NextRequest) {
	try {
		const session = getAnySessionFromRequest(request);

		if (!session) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401, headers: noCacheHeaders() },
			);
		}

		if (session.role === "stage_manager") {
			const user = await getUserById(session.userId);
			if (!user) {
				return NextResponse.json(
					{ success: false, error: "User not found" },
					{ status: 404, headers: noCacheHeaders() },
				);
			}

			const subscription = user.subscription || defaultSubscription();
			const maxEvents = getMaxEvents(subscription as any);


			// Count current events
			let events = await EventDataService.listEvents();
			events = events.filter(
				(e: any) => e.stageManagerId === session.userId,
			);
			const currentEventCount = events.length;

			return NextResponse.json(
				{
					success: true,
					data: {
						subscription,
						maxEvents,
						currentEventCount,
						canCreateEvent: true,
						userType: "stage_manager",
						userId: user.id,
						userEmail: user.email,
					},
				},
				{ headers: noCacheHeaders() },
			);
		}

		// FameLink artist
		const artist = await getFameLinkArtistById(session.userId);
		if (!artist) {
			return NextResponse.json(
				{ success: false, error: "Artist not found" },
				{ status: 404, headers: noCacheHeaders() },
			);
		}

		const subscription = artist.subscription || defaultSubscription();
		const maxShows = getMaxShows(subscription as any);

		const shows = await getBaseShowsByArtist(session.userId);
		const currentShowCount = shows.length;

		return NextResponse.json(
			{
				success: true,
				data: {
					subscription,
					maxShows,
					currentShowCount,
					canCreateShow: currentShowCount < maxShows,
					userType: "artist",
					userId: artist.id,
					userEmail: artist.email,
				},
			},
			{ headers: noCacheHeaders() },
		);

	} catch (error) {
		console.error("[Subscription API] Error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch subscription" },
			{ status: 500, headers: noCacheHeaders() },
		);
	}
}
