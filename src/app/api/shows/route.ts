/**
 * Base_Show API Routes
 *
 * GET /api/shows - List all shows for the authenticated artist
 * POST /api/shows - Create a new Base_Show
 *
 * Requirements: 3.3, 3.5, 3.7, 3.8, 11.3
 */

import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";

import {
	getBaseShowsByArtist,
	createBaseShow,
	generateUniqueSlug,
	getFameLinkArtistById,
} from "@/lib/data-access";
import { FREE_TIER_MAX_SHOWS, BaseShow } from "@/types/famelink";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/shows
 * List all Base_Shows for the authenticated artist
 *
 * Response:
 * - 200: { success: true, data: { shows: BaseShow[], count: number, limit: number } }
 * - 401: Unauthorized
 * - 403: SHOW_006 - Unauthorized access
 */
export async function GET(request: NextRequest) {
	try {
		// Get authenticated session
		const session = await getArtistSession();

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Unauthorized - Please log in",
					},
				},
				{ status: 401 },
			);
		}

		// Only artists can access their shows
		if (session.role !== "artist") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - Only artists can access shows",
					},
				},
				{ status: 403 },
			);
		}

		// Get artist profile to determine tier
		const artist = await getFameLinkArtistById(session.userId);
		const tier = artist?.tier || "free";
		const isPaid = tier === "pro" || tier === "pro_plus";
		const limit = isPaid ? Infinity : FREE_TIER_MAX_SHOWS;

		// Get all shows for the artist
		const shows = await getBaseShowsByArtist(session.userId);

		return NextResponse.json({
			success: true,
			data: {
				shows,
				count: shows.length,
				limit: isPaid ? -1 : FREE_TIER_MAX_SHOWS, // -1 indicates unlimited
			},
		});
	} catch (error) {
		console.error("Error fetching shows:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An error occurred while fetching shows",
				},
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/shows
 * Create a new Base_Show
 *
 * Request Body: CreateShowRequest
 *
 * Response:
 * - 201: { success: true, data: { show: BaseShow } }
 * - 400: SHOW_001 - Missing required fields
 * - 401: Unauthorized
 * - 403: SHOW_002 - Show limit reached (free tier)
 * - 403: SHOW_006 - Unauthorized access
 * - 409: SHOW_005 - Slug already exists
 */
export async function POST(request: NextRequest) {
	try {
		// Get authenticated session
		const session = await getArtistSession();

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "AUTH_003",
						message: "Unauthorized - Please log in",
					},
				},
				{ status: 401 },
			);
		}

		// Only artists can create shows
		if (session.role !== "artist") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - Only artists can create shows",
					},
				},
				{ status: 403 },
			);
		}

		// Get artist profile to check tier and show limit
		const artist = await getFameLinkArtistById(session.userId);
		const tier = artist?.tier || "free";

		// Get current show count
		const existingShows = await getBaseShowsByArtist(session.userId);
		const currentCount = existingShows.length;

		// Enforce show limit based on subscription
		const { getMaxShows, defaultSubscription } =
			await import("@/lib/subscription");
		const subscription = artist?.subscription || defaultSubscription();
		const maxShows = getMaxShows(subscription as any);

		if (currentCount >= maxShows) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_002",
						message: `Show limit reached. Your plan allows maximum ${maxShows} shows. Upgrade to create more shows.`,
						maxShows,
						currentCount,
					},
				},
				{ status: 403 },
			);
		}

		// Parse request body
		const body = await request.json();

		// Validate required fields (simplified validation)
		if (
			!body.name ||
			typeof body.name !== "string" ||
			body.name.trim().length === 0
		) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_001",
						message: "Show name is required",
					},
				},
				{ status: 400 },
			);
		}

		// Generate unique slug for FameLink URL (Requirement 3.5)
		const slug = await generateUniqueSlug(body.name);

		// Create the Base_Show with all profile fields
		const now = new Date().toISOString();
		const newShow = {
			id: uuidv4(),
			artistId: session.userId,
			slug,
			name: body.name.trim(),
			description: body.description || "",
			style: body.style || "",
			performanceType: body.performanceType || "",
			duration:
				typeof body.duration === "number"
					? body.duration
					: parseInt(body.duration) || 15,
			isDraft: body.isDraft !== false,
			isPublic: body.isPublic ?? !body.isDraft,

			// Artist-level fields
			realName: body.realName || "",
			email: body.email || "",
			phone: body.phone || "",
			countryLiving: body.countryLiving || "",
			homeCountry: body.homeCountry || "",
			managedBy: body.managedBy || "",

			// Visual / Stage
			costumeColor: body.costumeColor || "",
			costumeColorTwo: body.costumeColorTwo || "",
			costumeColorThree: body.costumeColorThree || "",
			customCostumeColor: body.customCostumeColor || "",
			manualCostumeColor: body.manualCostumeColor || "",
			manualCostumeColorTwo: body.manualCostumeColorTwo || "",
			manualCostumeColorThree: body.manualCostumeColorThree || "",
			lightColorSingle: body.lightColorSingle || "",
			lightColorTwo: body.lightColorTwo || "",
			lightColorThree: body.lightColorThree || "",
			lightRequests: body.lightRequests || "",
			manualLightColor: body.manualLightColor || "",
			manualLightColorTwo: body.manualLightColorTwo || "",
			manualLightColorThree: body.manualLightColorThree || "",
			stagePositionStart: body.stagePositionStart || "",
			stagePositionEnd: body.stagePositionEnd || "",
			customStagePosition: body.customStagePosition || "",

			// Media
			profileImage: body.profileImage || "",
			musicTrack: body.musicTrack || null,
			galleryFiles: body.galleryFiles || [],
			rehearsalVideo: body.rehearsalVideo || null,

			// Tech / Equipment
			techRider: body.techRider || "",
			equipment: body.equipment || "",
			showLink: body.showLink || "",

			// Notes
			biography: body.biography || "",
			notes: body.notes || "",
			mcNotes: body.mcNotes || "",
			stageManagerNotes: body.stageManagerNotes || "",
			internalNotes: body.internalNotes || "",

			// Social
			socialMedia: body.socialMedia || {},

			// Members & logistics
			members: body.members || [],
			tshirtSizes: body.tshirtSizes || [],
			logistics: body.logistics || {},

			// Legacy compat
			music: body.music || { files: [] },
			stageVisual: body.stageVisual || {
				performancePhotos: [],
				videos: [],
			},
			additionalInfo: body.additionalInfo || {},

			createdAt: now,
			updatedAt: now,
		};

		// Persist to GCS immediately (Requirement 3.7)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const createdShow = await createBaseShow(newShow as any);

		return NextResponse.json(
			{
				success: true,
				data: {
					show: createdShow,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating show:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message === "Show slug already exists") {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "SHOW_005",
							message:
								"A show with this name already exists. Please choose a different name.",
						},
					},
					{ status: 409 },
				);
			}
		}

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An error occurred while creating the show",
				},
			},
			{ status: 500 },
		);
	}
}
