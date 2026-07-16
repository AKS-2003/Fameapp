import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";
import {
	getMeProfileByArtist,
	generateUniqueMeProfileSlug,
	upsertMeProfile,
	getFameLinkArtistById,
} from "@/lib/data-access";

// GET /api/me-profile - Get the authenticated artist's own "Me" profile
export async function GET() {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const profile = await getMeProfileByArtist(session.userId);
		return NextResponse.json({ success: true, data: { profile } });
	} catch (error) {
		console.error("Error fetching me-profile:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}

// PUT /api/me-profile - Create or update the authenticated artist's "Me" profile
export async function PUT(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const {
			stageName,
			tagline,
			city,
			country,
			profileImage,
			bannerImage,
			biography,
			languages,
			performanceStyles,
			knownFor,
			events,
			photos,
			socialMedia,
		} = body;

		const existing = await getMeProfileByArtist(session.userId);

		let slug = existing?.slug;
		if (!slug) {
			const artist = await getFameLinkArtistById(session.userId);
			const nameForSlug = (stageName || artist?.artistName || artist?.realName || "artist").trim();
			slug = await generateUniqueMeProfileSlug(nameForSlug, session.userId);
		}

		const updates = {
			slug,
			...(stageName !== undefined && { stageName }),
			...(tagline !== undefined && { tagline }),
			...(city !== undefined && { city }),
			...(country !== undefined && { country }),
			...(profileImage !== undefined && { profileImage }),
			...(bannerImage !== undefined && { bannerImage }),
			...(biography !== undefined && { biography }),
			...(languages !== undefined && { languages }),
			...(performanceStyles !== undefined && { performanceStyles }),
			...(knownFor !== undefined && { knownFor }),
			...(events !== undefined && { events }),
			...(photos !== undefined && { photos }),
			...(socialMedia !== undefined && { socialMedia }),
		};

		const profile = await upsertMeProfile(session.userId, updates);
		return NextResponse.json({ success: true, data: { profile } });
	} catch (error) {
		console.error("Error saving me-profile:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}
