import { NextRequest, NextResponse } from "next/server";
import { getBaseShowBySlug } from "@/lib/data-access";

interface RouteParams {
	params: Promise<{ slug: string }>;
}

// GET /api/shows/by-slug/[slug] - Get public show by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { slug } = await params;

		if (!slug) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "SHOW_001", message: "Slug is required" },
				},
				{ status: 400 },
			);
		}

		const show = await getBaseShowBySlug(slug);

		if (!show) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "SHOW_003", message: "Show not found" },
				},
				{ status: 404 },
			);
		}

		// Only return public shows
		if (!show.isPublic) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "SHOW_003", message: "Show not found" },
				},
				{ status: 404 },
			);
		}

		// Return show without sensitive data
		return NextResponse.json({
			success: true,
			data: {
				show: {
					id: show.id,
					slug: show.slug,
					name: show.name,
					description: show.description,
					biography: show.biography,
					style: show.style,
					performanceType: show.performanceType,
					duration: show.duration,
					isDraft: show.isDraft,
					isPublic: show.isPublic,
					// Artist-level fields
					realName: show.realName,
					email: show.email,
					phone: show.phone,
					countryLiving: show.countryLiving,
					homeCountry: show.homeCountry,
					managedBy: show.managedBy,
					// Visual / Stage
					profileImage: show.profileImage,
					costumeColor: show.costumeColor,
					costumeColorTwo: show.costumeColorTwo,
					costumeColorThree: show.costumeColorThree,
					manualCostumeColor: show.manualCostumeColor,
					manualCostumeColorTwo: show.manualCostumeColorTwo,
					manualCostumeColorThree: show.manualCostumeColorThree,
					lightColorSingle: show.lightColorSingle,
					lightColorTwo: show.lightColorTwo,
					lightColorThree: show.lightColorThree,
					manualLightColor: show.manualLightColor,
					manualLightColorTwo: show.manualLightColorTwo,
					manualLightColorThree: show.manualLightColorThree,
					lightRequests: show.lightRequests,
					stagePositionStart: show.stagePositionStart,
					stagePositionEnd: show.stagePositionEnd,
					customStagePosition: show.customStagePosition,
					// Media
					musicTrack: show.musicTrack,
					galleryFiles: show.galleryFiles,
					rehearsalVideo: show.rehearsalVideo,
					// Tech / Equipment
					techRider: show.techRider,
					equipment: show.equipment,
					showLink: show.showLink,
					// Notes
					notes: show.notes,
					mcNotes: show.mcNotes,
					stageManagerNotes: show.stageManagerNotes,
					internalNotes: show.internalNotes,
					// Social / Members
					socialMedia: show.socialMedia,
					members: show.members,
					tshirtSizes: show.tshirtSizes,
					// Legacy
					music: show.music,
					stageVisual: show.stageVisual,
					additionalInfo: show.additionalInfo,
					logistics: show.logistics,
					createdAt: show.createdAt,
					updatedAt: show.updatedAt,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching show by slug:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
