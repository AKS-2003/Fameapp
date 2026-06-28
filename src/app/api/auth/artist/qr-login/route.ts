import { NextRequest, NextResponse } from "next/server";
import { getFameLinkArtistById } from "@/lib/data-access";
import { createArtistSessionResponse } from "@/lib/session";
import { SessionData } from "@/types";

export async function GET(request: NextRequest) {
	const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "fameapp.cloud";
	const proto = request.headers.get("x-forwarded-proto") || "https";
	const baseUrl = `${proto}://${host}`;

	try {
		const searchParams = request.nextUrl.searchParams;
		const artistId = searchParams.get("artistId");
		const redirectUrl = searchParams.get("redirect");

		if (!artistId || !redirectUrl) {
			return NextResponse.redirect(new URL("/famelink-auth", baseUrl));
		}

		let email = "";

		// Try to find the artist in FameLink Artists
		if (artistId.startsWith("artist-") || artistId.includes("-")) {
			const flArtist = await getFameLinkArtistById(artistId);
			if (flArtist) {
				email = flArtist.email || `${artistId}@temp.famelink.app`;
			}
		}

		if (!email) {
			// If we couldn't fetch the DB record (maybe it's a stub or mock), 
			// the QR code URL is considered an invite link so we let them in.
			email = `${artistId}@temp.famelink.app`;
		}

		const sessionData: SessionData = {
			userId: artistId,
			email: email,
			role: "artist",
			status: "active",
		};

		const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));
		return createArtistSessionResponse(sessionData, response);
	} catch (error) {
		console.error("QR login error:", error);
		return NextResponse.redirect(new URL("/famelink-auth", baseUrl));
	}
}
