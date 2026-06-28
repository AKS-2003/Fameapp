import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";
import { APIResponse } from "@/types";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);

		// Get all artists for this event
		const artists = await EventDataService.getArtists(eventId);

		if (!artists || artists.length === 0) {
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message: "No artists found to clean up",
					updatedCount: 0,
				},
			});
		}

		let updatedCount = 0;
		const updatedArtists = artists.map((artist: any) => {
			let needsUpdate = false;
			const updatedArtist = { ...artist };

			// Normalize performance_date if it exists and is not null
			if (
				artist.performance_date &&
				artist.performance_date !== "unassigned"
			) {
				try {
					const normalizedDate = new Date(artist.performance_date)
						.toISOString()
						.split("T")[0];
					if (normalizedDate !== artist.performance_date) {
						updatedArtist.performance_date = normalizedDate;
						updatedArtist.performanceDate = normalizedDate; // Also update camelCase version
						needsUpdate = true;
					}
				} catch (error) {
					console.error(
						`Invalid date format for artist ${artist.id}:`,
						artist.performance_date,
						error,
					);
					// Set to null if date is invalid
					updatedArtist.performance_date = null;
					updatedArtist.performanceDate = null;
					needsUpdate = true;
				}
			}

			// Normalize performanceDate if it exists and is different from performance_date
			if (
				artist.performanceDate &&
				artist.performanceDate !== "unassigned"
			) {
				try {
					const normalizedDate = new Date(artist.performanceDate)
						.toISOString()
						.split("T")[0];
					if (normalizedDate !== artist.performanceDate) {
						updatedArtist.performanceDate = normalizedDate;
						// Also update snake_case version for consistency
						if (!updatedArtist.performance_date) {
							updatedArtist.performance_date = normalizedDate;
						}
						needsUpdate = true;
					}
				} catch (error) {
					console.error(
						`Invalid performanceDate format for artist ${artist.id}:`,
						artist.performanceDate,
						error,
					);
					// Set to null if date is invalid
					updatedArtist.performanceDate = null;
					if (!updatedArtist.performance_date) {
						updatedArtist.performance_date = null;
					}
					needsUpdate = true;
				}
			}

			// Ensure both fields are consistent
			if (
				updatedArtist.performance_date &&
				!updatedArtist.performanceDate
			) {
				updatedArtist.performanceDate = updatedArtist.performance_date;
				needsUpdate = true;
			} else if (
				updatedArtist.performanceDate &&
				!updatedArtist.performance_date
			) {
				updatedArtist.performance_date = updatedArtist.performanceDate;
				needsUpdate = true;
			}

			if (needsUpdate) {
				updatedArtist.updatedAt = new Date().toISOString();
				updatedCount++;
			}

			return updatedArtist;
		});

		// Save the updated artists if any changes were made
		if (updatedCount > 0) {
			await EventDataService.saveArtists(eventId, updatedArtists);
			console.log(
				`Cleaned up ${updatedCount} artists with inconsistent date formats`,
			);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: `Successfully cleaned up ${updatedCount} artists`,
				updatedCount,
				totalArtists: artists.length,
			},
		});
	} catch (error) {
		console.error("Error cleaning up artist dates:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to clean up artist dates",
				},
			},
			{ status: 500 },
		);
	}
}
