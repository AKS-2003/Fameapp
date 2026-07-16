import { NextRequest, NextResponse } from "next/server";
import { getMeProfileBySlug } from "@/lib/data-access";

// GET /api/me-profile/by-slug/[slug] - Public, no-login lookup of an artist's "Me" profile
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;
		if (!slug) {
			return NextResponse.json(
				{ success: false, error: { message: "Slug is required" } },
				{ status: 400 },
			);
		}

		const profile = await getMeProfileBySlug(slug);
		if (!profile || profile.isPublic === false) {
			return NextResponse.json(
				{ success: false, error: { message: "Profile not found" } },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				profile: {
					stageName: profile.stageName || "",
					tagline: profile.tagline || "",
					city: profile.city || "",
					country: profile.country || "",
					profileImage: profile.profileImage || "",
					bannerImage: profile.bannerImage || "",
					biography: profile.biography || "",
					languages: profile.languages || "",
					performanceStyles: profile.performanceStyles || "",
					knownFor: profile.knownFor || [],
					events: profile.events || [],
					photos: profile.photos || [],
					socialMedia: profile.socialMedia || {},
				},
			},
		});
	} catch (error) {
		console.error("Error fetching public me-profile:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}
