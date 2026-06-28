/**
 * Email Reminder Service for incomplete artist registrations
 * Checks for artists who haven't completed registration within 24 hours
 */

import { EventDataService } from "./storage-service";
import { sendArtistReminderEmail } from "./email-service";
import { getBaseUrl } from "./url-utils";

interface IncompleteRegistration {
	artistId: string;
	artistName: string;
	email: string;
	eventId: string;
	eventName: string;
	createdAt: string;
	status: string;
}

/**
 * Check for incomplete registrations and send reminder emails
 * This should be run as a cron job or scheduled task
 */
export async function checkAndSendReminders(): Promise<{
	checked: number;
	sent: number;
	errors: number;
}> {
	let checked = 0;
	let sent = 0;
	let errors = 0;

	try {
		// Get all events
		const events = await EventDataService.listEvents();

		for (const event of events) {
			try {
				// Get artists for this event
				const artists = await EventDataService.getArtists(event.id);

				for (const artist of artists) {
					checked++;

					// Check if registration is incomplete
					const isIncomplete = isRegistrationIncomplete(artist);

					if (isIncomplete) {
						// Check if 24 hours have passed
						const hoursSinceCreation = getHoursSinceCreation(
							artist.createdAt
						);

						if (hoursSinceCreation >= 24) {
							// Check if reminder was already sent
							const reminderSent =
								artist.reminderSentAt &&
								new Date(artist.reminderSentAt).getTime() >
									Date.now() - 24 * 60 * 60 * 1000;

							if (!reminderSent && artist.email) {
								try {
									// Send reminder email
									const registrationUrl = `${getBaseUrl()}/artist-register/${event.id}?artistId=${
										artist.id
									}`;

									await sendArtistReminderEmail(
										artist.email,
										artist.artistName || "Artist",
										event.name || "Event",
										registrationUrl
									);

									// Update artist record with reminder sent timestamp
									artist.reminderSentAt =
										new Date().toISOString();
									await EventDataService.saveArtists(
										event.id,
										artists
									);

									sent++;
									console.log(
										`✅ Reminder sent to ${artist.email} for event ${event.name}`
									);
								} catch (emailError) {
									errors++;
									console.error(
										`❌ Failed to send reminder to ${artist.email}:`,
										emailError
									);
								}
							}
						}
					}
				}
			} catch (eventError) {
				console.error(
					`Error processing event ${event.id}:`,
					eventError
				);
				errors++;
			}
		}

		console.log(
			`📧 Reminder check complete: ${checked} checked, ${sent} sent, ${errors} errors`
		);

		return { checked, sent, errors };
	} catch (error) {
		console.error("Error in checkAndSendReminders:", error);
		return { checked, sent, errors };
	}
}

/**
 * Check if an artist registration is incomplete
 */
function isRegistrationIncomplete(artist: any): boolean {
	// Check for required fields
	const requiredFields = [
		"artistName",
		"email",
		"costumeColor",
		"musicTracks",
	];

	for (const field of requiredFields) {
		if (!artist[field]) {
			return true;
		}
	}

	// Check if at least one music track has a title
	if (
		!artist.musicTracks ||
		artist.musicTracks.length === 0 ||
		!artist.musicTracks.some((track: any) => track.song_title?.trim())
	) {
		return true;
	}

	// Check if status is still pending or incomplete
	if (artist.status === "pending" || artist.status === "incomplete") {
		return true;
	}

	return false;
}

/**
 * Get hours since creation
 */
function getHoursSinceCreation(createdAt: string): number {
	if (!createdAt) return 0;

	const created = new Date(createdAt).getTime();
	const now = Date.now();
	const diffMs = now - created;
	const diffHours = diffMs / (1000 * 60 * 60);

	return diffHours;
}

/**
 * Manual trigger for testing
 * Call this from an API endpoint for testing
 */
export async function triggerReminderCheck(): Promise<{
	success: boolean;
	message: string;
	stats: { checked: number; sent: number; errors: number };
}> {
	try {
		const stats = await checkAndSendReminders();
		return {
			success: true,
			message: "Reminder check completed",
			stats,
		};
	} catch (error) {
		console.error("Error triggering reminder check:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
			stats: { checked: 0, sent: 0, errors: 1 },
		};
	}
}
