/**
 * Base_Show Individual API Routes
 *
 * GET /api/shows/[showId] - Get a specific Base_Show
 * PUT /api/shows/[showId] - Update a Base_Show
 * DELETE /api/shows/[showId] - Delete a Base_Show
 *
 * Requirements: 3.3, 3.5, 3.6, 3.7, 3.8, 11.3
 */

import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";

import {
	getBaseShow,
	updateBaseShow,
	deleteBaseShow,
	generateUniqueSlug,
	getEventShowsByBaseShow,
	deleteEventShow,
} from "@/lib/data-access";

interface RouteParams {
	params: Promise<{
		showId: string;
	}>;
}

/**
 * GET /api/shows/[showId]
 * Get a specific Base_Show by ID
 *
 * Response:
 * - 200: { success: true, data: { show: BaseShow } }
 * - 401: Unauthorized
 * - 403: SHOW_006 - Unauthorized access
 * - 404: SHOW_003 - Show not found
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { showId } = await params;

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

		// Get the show
		const show = await getBaseShow(showId, session.userId);

		if (!show) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_003",
						message: "Show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify ownership
		if (show.artistId !== session.userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - You can only access your own shows",
					},
				},
				{ status: 403 },
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				show,
			},
		});
	} catch (error) {
		console.error("Error fetching show:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An error occurred while fetching the show",
				},
			},
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/shows/[showId]
 * Update a Base_Show
 *
 * Note: Updating a Base_Show does NOT modify any linked Event_Shows (Requirement 3.6)
 *
 * Request Body: UpdateShowRequest (partial)
 *
 * Response:
 * - 200: { success: true, data: { show: BaseShow } }
 * - 400: SHOW_001 - Invalid fields
 * - 401: Unauthorized
 * - 403: SHOW_006 - Unauthorized access
 * - 404: SHOW_003 - Show not found
 * - 409: SHOW_005 - Slug already exists
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
	try {
		const { showId } = await params;

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

		// Only artists can update their shows
		if (session.role !== "artist") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - Only artists can update shows",
					},
				},
				{ status: 403 },
			);
		}

		// Get the existing show
		const existingShow = await getBaseShow(showId, session.userId);

		if (!existingShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_003",
						message: "Show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify ownership
		if (existingShow.artistId !== session.userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - You can only update your own shows",
					},
				},
				{ status: 403 },
			);
		}

		// Parse request body
		const body: Record<string, any> = await request.json();

		// Validate fields if provided
		const errors: string[] = [];

		if (body.name !== undefined) {
			if (
				typeof body.name !== "string" ||
				body.name.trim().length === 0
			) {
				errors.push("Show name cannot be empty");
			}
		}

		if (
			body.description !== undefined &&
			typeof body.description !== "string"
		) {
			errors.push("Description must be a string");
		}

		if (body.style !== undefined && typeof body.style !== "string") {
			errors.push("Style must be a string");
		}

		if (body.duration !== undefined) {
			if (typeof body.duration !== "number" || body.duration <= 0) {
				errors.push("Duration must be a positive number");
			}
		}

		if (errors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_001",
						message: "Invalid fields",
						details: errors,
					},
				},
				{ status: 400 },
			);
		}

		// Generate new slug if name changed (Requirement 3.5)
		let newSlug = existingShow.slug;
		if (body.name && body.name !== existingShow.name) {
			newSlug = await generateUniqueSlug(body.name, showId);
		}

		// Build updated show - merge all fields
		const updatedShow: any = {
			...existingShow,
			name: body.name ?? existingShow.name,
			description: body.description ?? existingShow.description,
			style: body.style ?? existingShow.style,
			performanceType:
				body.performanceType ?? existingShow.performanceType,
			duration: body.duration ?? existingShow.duration,
			isDraft: body.isDraft ?? existingShow.isDraft,
			isPublic: body.isPublic ?? existingShow.isPublic,
			pinned: body.pinned !== undefined ? body.pinned : existingShow.pinned,
			slug: newSlug,
			updatedAt: new Date().toISOString(),
		};

		// Visual / Stage fields
		const visualFields = [
			"costumeColor",
			"costumeColorTwo",
			"costumeColorThree",
			"customCostumeColor",
			"manualCostumeColor",
			"manualCostumeColorTwo",
			"manualCostumeColorThree",
			"lightColorSingle",
			"lightColorTwo",
			"lightColorThree",
			"lightRequests",
			"manualLightColor",
			"manualLightColorTwo",
			"manualLightColorThree",
			"stagePositionStart",
			"stagePositionEnd",
			"customStagePosition",
		];
		for (const field of visualFields) {
			if (body[field] !== undefined) updatedShow[field] = body[field];
		}

		// Artist-level fields
		const artistFields = [
			"realName",
			"email",
			"phone",
			"countryLiving",
			"homeCountry",
			"managedBy",
		];
		for (const field of artistFields) {
			if (body[field] !== undefined) updatedShow[field] = body[field];
		}

		// Media fields
		if (body.profileImage !== undefined)
			updatedShow.profileImage = body.profileImage;
		if (body.musicTrack !== undefined)
			updatedShow.musicTrack = body.musicTrack;
		if (body.galleryFiles !== undefined)
			updatedShow.galleryFiles = body.galleryFiles;
		if (body.rehearsalVideo !== undefined)
			updatedShow.rehearsalVideo = body.rehearsalVideo;

		// Tech / Equipment
		if (body.techRider !== undefined)
			updatedShow.techRider = body.techRider;
		if (body.equipment !== undefined)
			updatedShow.equipment = body.equipment;
		if (body.showLink !== undefined) updatedShow.showLink = body.showLink;

		// Notes
		const noteFields = [
			"biography",
			"notes",
			"mcNotes",
			"stageManagerNotes",
			"internalNotes",
		];
		for (const field of noteFields) {
			if (body[field] !== undefined) updatedShow[field] = body[field];
		}

		// Social / Members / Logistics
		if (body.socialMedia !== undefined)
			updatedShow.socialMedia = body.socialMedia;
		if (body.members !== undefined) updatedShow.members = body.members;
		if (body.tshirtSizes !== undefined)
			updatedShow.tshirtSizes = body.tshirtSizes;
		if (body.logistics !== undefined)
			updatedShow.logistics = body.logistics;

		// Legacy compat
		if (body.music !== undefined) updatedShow.music = body.music;
		if (body.stageVisual !== undefined)
			updatedShow.stageVisual = body.stageVisual;
		if (body.additionalInfo !== undefined)
			updatedShow.additionalInfo = body.additionalInfo;

		// Persist to GCS immediately (Requirement 3.7)
		// Note: This does NOT modify any linked Event_Shows (Requirement 3.6)
		const savedShow = await updateBaseShow(updatedShow);

		return NextResponse.json({
			success: true,
			data: {
				show: savedShow,
			},
		});
	} catch (error) {
		console.error("Error updating show:", error);

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
			if (error.message === "Show not found") {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "SHOW_003",
							message: "Show not found",
						},
					},
					{ status: 404 },
				);
			}
		}

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An error occurred while updating the show",
				},
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/shows/[showId]
 * Delete a Base_Show
 *
 * Note: Cannot delete shows linked to active events (Requirement 3.8)
 *
 * Response:
 * - 200: { success: true, message: "Show deleted successfully" }
 * - 401: Unauthorized
 * - 403: SHOW_006 - Unauthorized access
 * - 404: SHOW_003 - Show not found
 * - 409: SHOW_004 - Cannot delete show linked to active event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const { showId } = await params;

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

		// Only artists can delete their shows
		if (session.role !== "artist") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - Only artists can delete shows",
					},
				},
				{ status: 403 },
			);
		}

		// Get the existing show
		const existingShow = await getBaseShow(showId, session.userId);

		if (!existingShow) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_003",
						message: "Show not found",
					},
				},
				{ status: 404 },
			);
		}

		// Verify ownership
		if (existingShow.artistId !== session.userId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "SHOW_006",
						message:
							"Unauthorized access - You can only delete your own shows",
					},
				},
				{ status: 403 },
			);
		}

		// Check if show is linked to active events (Requirement 3.8)
		const linkedEventShows = await getEventShowsByBaseShow(showId);
		const activeEventShows = linkedEventShows.filter(
			(es) => es.status !== "cancelled",
		);

		// Instead of blocking deletion, cascade-delete all linked Event_Shows and participations
		// This allows the artist to re-register with a different show later
		if (linkedEventShows.length > 0) {
			for (const eventShow of linkedEventShows) {
				try {
					await deleteEventShow(eventShow.id, eventShow.eventId);
				} catch (err) {
					console.error(
						`Failed to delete event-show ${eventShow.id}:`,
						err,
					);
				}
				// Also delete the participation so the artist can re-register
				try {
					const { deleteEventParticipation } =
						await import("@/lib/data-access");
					await deleteEventParticipation(
						session.userId,
						eventShow.eventId,
					);
				} catch (err) {
					// Participation may not exist or already deleted
					console.error(
						`Failed to delete participation for event ${eventShow.eventId}:`,
						err,
					);
				}
			}
		}

		// Delete the show
		await deleteBaseShow(showId, session.userId);

		return NextResponse.json({
			success: true,
			message: "Show deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting show:", error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message === "Show not found") {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "SHOW_003",
							message: "Show not found",
						},
					},
					{ status: 404 },
				);
			}
			if (
				error.message === "Cannot delete show linked to active events"
			) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "SHOW_004",
							message:
								"Cannot delete show linked to active events",
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
					message: "An error occurred while deleting the show",
				},
			},
			{ status: 500 },
		);
	}
}
