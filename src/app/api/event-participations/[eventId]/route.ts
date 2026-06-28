import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";
import {
	deleteEventParticipation,
	getEventShowsByEvent,
	deleteEventShow,
} from "@/lib/data-access";
import { EventDataService } from "@/lib/storage-service";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const session = await getArtistSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		console.log(
			`[event-participations] Deleting participation for artist ${session.userId} in event ${eventId}`,
		);

		// Delete participation
		await deleteEventParticipation(session.userId, eventId);

		// Delete all Event_Shows for this artist in this event
		try {
			const eventShows = await getEventShowsByEvent(eventId);
			const artistEventShows = eventShows.filter(
				(es: any) => es.artistId === session.userId,
			);
			for (const es of artistEventShows) {
				try {
					await deleteEventShow(es.id, eventId);
				} catch (err) {
					console.error(`Failed to delete event-show ${es.id}:`, err);
				}
			}
			console.log(
				`[event-participations] Deleted ${artistEventShows.length} event-shows for artist ${session.userId}`,
			);
		} catch (err) {
			console.error("Failed to clean up event-shows:", err);
		}

		// Remove the artist from the event's artists listing (Submitted Applications & Assigned Date)
		try {
			const artists = await EventDataService.getArtists(eventId);
			const filteredArtists = artists.filter(
				(a: any) => a.id !== session.userId,
			);

			if (filteredArtists.length < artists.length) {
				await EventDataService.saveArtists(
					eventId,
					filteredArtists,
				);
			}

			// Broadcast WebSocket update for Stage Manager Notification
			if (global.io) {
				const artistName = "Artist";

				// Optional: get event details for a better notification
				let eventName = "an event";
				try {
					const event = await EventDataService.getEvent(
						eventId,
					);
					if (event) {
						eventName = event.name;
					}
				} catch (e) {
					console.error(
						"Failed to get event details for notification:",
						e,
					);
				}

				global.io
					.to(`event_${eventId}`)
					.emit("artist_deleted_event", {
						eventId,
						eventName: eventName,
						artistId: session.userId,
						artistName: artistName,
						timestamp: new Date().toISOString(),
					});

				// Send to stage manager specifically (if needed)
				global.io.emit("admin_notification_event_deleted", {
					eventId,
					eventName: eventName,
					artistId: session.userId,
					artistName: artistName,
					timestamp: new Date().toISOString(),
				});
			}
		} catch (error) {
			console.error(
				"Failed to clean up artist from event artists JSON:",
				error,
			);
		}

		return NextResponse.json({
			success: true,
			data: { message: "Event participation deleted successfully" },
		});
	} catch (error: any) {
		console.error("Error deleting event participation:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: error.message || "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
