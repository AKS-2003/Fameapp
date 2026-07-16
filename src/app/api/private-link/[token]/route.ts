import { NextRequest, NextResponse } from "next/server";
import {
	getShareLinkByToken,
	getBaseShowById,
	updateShareLink,
} from "@/lib/data-access";
import { ArtistLogisticsModel } from "@/database/models/FameLinkModels";
import { connectToDatabase } from "@/database/mongodb";

// Maps each visibility level to the traveler fields the organizer is allowed to see.
// Each level includes everything from the levels below it.
const LEVEL_FIELDS: Record<string, string[]> = {
	L1: [
		"fullPassportName",
		"homeDepartureCity",
		"preferredAirport",
		"roomPreference",
		"baggageNotes",
		"specialRemarks",
	],
	L2: ["frequentFlyer", "passportNumber", "passportExpiry", "dietaryRequirements", "visaNotes"],
	L3: ["passportCopyUrl", "visaCopyUrl", "emergencyContact", "nationality", "dateOfBirth"],
};

function fieldsForLevel(level: string): string[] {
	if (level === "L3") return [...LEVEL_FIELDS.L1, ...LEVEL_FIELDS.L2, ...LEVEL_FIELDS.L3];
	if (level === "L2") return [...LEVEL_FIELDS.L1, ...LEVEL_FIELDS.L2];
	return [...LEVEL_FIELDS.L1];
}

// GET /api/private-link/[token] - Public lookup for an organizer viewing a generated share link
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	try {
		const { token } = await params;
		if (!token) {
			return NextResponse.json(
				{ success: false, error: { message: "Token is required" } },
				{ status: 400 },
			);
		}

		const link = await getShareLinkByToken(token);
		if (!link) {
			return NextResponse.json(
				{ success: false, error: { message: "This link is invalid or has been removed" } },
				{ status: 404 },
			);
		}

		if (link.expiryDate) {
			const expiry = new Date(link.expiryDate);
			if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
				return NextResponse.json(
					{ success: false, error: { message: "This link has expired" } },
					{ status: 410 },
				);
			}
		}

		const show = await getBaseShowById(link.showId);
		if (!show) {
			return NextResponse.json(
				{ success: false, error: { message: "The show for this link no longer exists" } },
				{ status: 404 },
			);
		}

		const linkType = link.linkType || "show_info";
		const includeShowInfo = linkType === "show_info" || linkType === "both";
		const includeLogistics = linkType === "logistics_info" || linkType === "both";

		let logistics: any = null;
		if (includeLogistics) {
			await connectToDatabase();
			const logisticsDoc = await ArtistLogisticsModel.findOne({ artistId: link.artistId }).lean() as any;
			const travelers: any[] = logisticsDoc?.travelers || [];
			const allowedFields = fieldsForLevel(link.visibilityLevel || "L1");

			const matchingTravelers = link.logisticsPerson
				? travelers.filter((t) => t.fullPassportName === link.logisticsPerson)
				: travelers;

			logistics = {
				actName: logisticsDoc?.actName || "",
				leadContactName: logisticsDoc?.leadContactName || "",
				leadContactEmail: logisticsDoc?.leadContactEmail || "",
				leadContactPhone: logisticsDoc?.leadContactPhone || "",
				visibilityLevel: link.visibilityLevel || "L1",
				person: link.logisticsPerson || "",
				travelers: matchingTravelers.map((t) => {
					const filtered: Record<string, any> = {};
					for (const field of allowedFields) {
						if (t[field] !== undefined) filtered[field] = t[field];
					}
					return filtered;
				}),
			};
		}

		// Mark as viewed on first view (fire-and-forget, doesn't block the response)
		if (link.status === "sent") {
			updateShareLink(link.artistId, link.id, {
				status: "viewed",
				viewedAt: new Date().toISOString(),
			}).catch(() => {/* ignore */});
		}

		return NextResponse.json({
			success: true,
			data: {
				link: {
					label: link.label,
					linkType,
					thumbnail: link.thumbnail || "",
					expiryDate: link.expiryDate || "",
				},
				show: includeShowInfo
					? {
							id: show.id,
							slug: show.slug,
							name: show.name,
							description: show.description,
							biography: show.biography,
							style: show.style,
							performanceType: show.performanceType,
							duration: show.duration,
							profileImage: show.profileImage,
							realName: show.realName,
							email: show.email,
							phone: show.phone,
							countryLiving: show.countryLiving,
							homeCountry: show.homeCountry,
							managedBy: show.managedBy,
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
							musicTrack: show.musicTrack,
							galleryFiles: show.galleryFiles,
							rehearsalVideo: show.rehearsalVideo,
							techRider: show.techRider,
							equipment: show.equipment,
							showLink: show.showLink,
							notes: show.notes,
							mcNotes: show.mcNotes,
							stageManagerNotes: show.stageManagerNotes,
							socialMedia: show.socialMedia,
							members: show.members,
							tshirtSizes: show.tshirtSizes,
							music: show.music,
						}
					: null,
				logistics,
			},
		});
	} catch (error) {
		console.error("Error fetching private link:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}
