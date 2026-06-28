import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getUserById, getFameLinkArtistById } from "@/lib/data-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json({ error: "No session" }, { status: 401 });
		}

		const result: any = {
			sessionUserId: session.userId,
			sessionRole: session.role,
		};

		if (session.role === "stage_manager") {
			const user = await getUserById(session.userId);
			result.user = user
				? {
						id: user.id,
						email: user.email,
						subscription: user.subscription || "none",
					}
				: "NOT FOUND";
		} else {
			const artist = await getFameLinkArtistById(session.userId);
			result.artist = artist
				? {
						id: artist.id,
						email: artist.email,
						tier: artist.tier,
						subscription: (artist as any).subscription || "none",
					}
				: "NOT FOUND";
		}

		return NextResponse.json(result);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
