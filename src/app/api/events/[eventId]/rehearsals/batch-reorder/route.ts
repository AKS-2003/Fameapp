import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";
import {
	getEventShowsByEvent,
	updateEventShowOverrides,
} from "@/lib/data-access";

/**
 * Batch rehearsal reorder endpoint.
 *
 * Accepts an array of { id, rehearsal_order } updates and applies them
 * in a single read-modify-write cycle to avoid the GCS race condition
 * that occurs when multiple parallel PATCH requests each read/write
 * the full artists array independently.
 *
 * Respects data separation:
 *  - FAME artists → updated in GCS artists.json (single write)
 *  - FameLink artists → updated via EventShow.overrides (never touches snapshotJson)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { updates } = body as {
			updates: Array<{ id: string; eventShowId?: string; rehearsal_order: number }>;
		};

		if (!updates || !Array.isArray(updates) || updates.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "updates array is required",
					},
				},
				{ status: 400 },
			);
		}

		const timestamp = new Date().toISOString();

		// Single read of FAME artists from GCS
		const artists = await EventDataService.getArtists(eventId);
		const fameArtistIds = new Set(artists.map((a: any) => a.id));

		// Separate FAME vs FameLink updates
		const fameUpdates: Array<{ id: string; eventShowId?: string; rehearsal_order: number }> = [];
		const famelinkUpdates: Array<{ id: string; eventShowId?: string; rehearsal_order: number }> =
			[];

		for (const u of updates) {
			if (fameArtistIds.has(u.id)) {
				fameUpdates.push(u);
			} else {
				famelinkUpdates.push(u);
			}
		}

		// --- FAME artists: single read-modify-write ---
		if (fameUpdates.length > 0) {
			for (const u of fameUpdates) {
				const idx = artists.findIndex((a: any) => a.id === u.id);
				if (idx !== -1) {
					artists[idx].rehearsal_order = u.rehearsal_order;
					artists[idx].updatedAt = timestamp;
				}
			}
			await EventDataService.saveArtists(eventId, artists);
			console.log(
				`Batch rehearsal reorder: updated ${fameUpdates.length} FAME artists in single GCS write`,
			);
		}

		// --- FameLink artists: update via EventShow.overrides ---
		if (famelinkUpdates.length > 0) {
			try {
				const eventShows = await getEventShowsByEvent(eventId);

				for (const u of famelinkUpdates) {
					const eventShow = u.eventShowId
						? eventShows.find(
								(es) =>
									es.id === u.eventShowId &&
									es.artistId === u.id,
							)
						: eventShows.find((es) => es.artistId === u.id);
					if (eventShow) {
						await updateEventShowOverrides(eventShow.id, eventId, {
							...eventShow.overrides,
							rehearsalOrder: u.rehearsal_order,
						});
					}
				}
				console.log(
					`Batch rehearsal reorder: updated ${famelinkUpdates.length} FameLink artists via overrides`,
				);
			} catch (err) {
				console.error(
					"Error updating FameLink artists in batch reorder:",
					err,
				);
			}
		}

		// Broadcast WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("rehearsal_updated", {
				eventId,
				action: "batch_reordered",
				updates,
				timestamp,
			});
		}

		return NextResponse.json({
			success: true,
			data: { updated: updates.length },
		});
	} catch (error) {
		console.error("Batch rehearsal reorder error:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to batch reorder rehearsals",
				},
			},
			{ status: 500 },
		);
	}
}
