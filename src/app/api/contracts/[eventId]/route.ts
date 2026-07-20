import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, EventShowModel, EventParticipationModel } from "@/database/models/FameLinkModels";
import { getEventShowsByEvent, getEventParticipationsByEvent, getAllFameLinkArtists, getFameLinkArtistById, addNotification } from "@/lib/data-access";
import { getUnifiedArtistsForEvent, migrateBase64Screenshots } from "@/lib/contract-utils";
import { EventDataService } from "@/lib/storage-service";
import { sendPerformanceDateAssignedEmail } from "@/lib/email-service";

/** Extract YYYY-MM-DD performance dates from a schedule's performances list */
function extractPerfDates(schedule: any): string[] {
	const perfs: any[] = schedule?.performances || [];
	return perfs.map((p: any) => (p?.date || "").toString().substring(0, 10)).filter(Boolean);
}

/** Safely parse snapshotJson — may be stored as a JSON string or already an object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
	return raw;
}

// GET /api/contracts/[eventId] — Get all artists for an event
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		
		// Auto-migrate any existing heavy Base64 screenshots in the database to static files
		await migrateBase64Screenshots(eventId);

		// Initialize contract data if it doesn't exist
		await ContractService.initializeContractData(eventId);

		// 1. Get unified artists (combining contract, draft, and participations)
		const allArtists = await getUnifiedArtistsForEvent(eventId);
		
		console.log(`[GET /api/contracts/${eventId}] total=${allArtists.length}`);

		return NextResponse.json({ success: true, artists: allArtists });
	} catch (error) {
		console.error("Error fetching contract artists:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch artists" },
			{ status: 500 }
		);
	}
}

// POST /api/contracts/[eventId] — Add a new artist
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		// Generate ID if not provided
		if (!body.id) {
			body.id = `artist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		}
		body.eventId = eventId;

		const success = await ContractService.addArtist(eventId, body);
		if (success) {
			return NextResponse.json({ success: true, artist: body });
		}
		return NextResponse.json(
			{ success: false, error: "Failed to add artist" },
			{ status: 500 }
		);
	} catch (error) {
		console.error("Error adding contract artist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to add artist" },
			{ status: 500 }
		);
	}
}

// PUT /api/contracts/[eventId] — Update an artist
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, ...updates } = body;

		if (!artistId) {
			return NextResponse.json(
				{ success: false, error: "artistId is required" },
				{ status: 400 }
			);
		}

		// Snapshot performance dates before the update so we can detect newly-assigned ones
		const priorArtist = updates.agreement ? await ContractService.getArtist(eventId, artistId) : null;
		const priorDates = new Set(extractPerfDates(priorArtist?.agreement?.schedule));

		const success = await ContractService.updateArtist(eventId, artistId, updates);
		if (success) {
			// Also persist the agreement into EventArtistModel so the stage manager
			// dashboard (which reads from EventArtistModel) shows the correct data on refresh.
			if (updates.agreement) {
				try {
					await connectToDatabase();
					const existing = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;
					if (existing) {
						// Deep-merge: keep fields the blob update didn't touch
						const mergedAgreement = { ...(existing.agreement || {}), ...updates.agreement };
						await EventArtistModel.updateOne(
							{ id: artistId, eventId },
							{ $set: { agreement: mergedAgreement, updatedAt: new Date().toISOString() } }
						);
					}
				} catch (syncErr) {
					// Non-fatal — blob is already saved, log and continue
					console.error("[PUT /api/contracts] Failed to sync agreement to EventArtistModel:", syncErr);
				}
			}

			const updatedArtist = await ContractService.getArtist(eventId, artistId);

			// Notify the artist (in-app + email) if a new performance date was just assigned
			if (updates.agreement) {
				const newDates = extractPerfDates(updatedArtist?.agreement?.schedule).filter((d) => !priorDates.has(d));
				if (newDates.length > 0) {
					try {
						const eventData = await EventDataService.getEvent(eventId);
						const eventName = eventData?.name;
						const fameLinkArtist = await getFameLinkArtistById(artistId).catch(() => null) as any;
						const artistEmail = fameLinkArtist?.email || updatedArtist?.email;
						const artistName = fameLinkArtist?.artistName || updatedArtist?.stageName || "Artist";

						await addNotification(artistId, {
							type: "performance_date_assigned",
							title: "Performance date assigned",
							message: eventName
								? `Your performance date for "${eventName}" has been assigned: ${newDates.join(", ")}.`
								: `Your performance date has been assigned: ${newDates.join(", ")}.`,
							eventId,
						});

						if (artistEmail) {
							await sendPerformanceDateAssignedEmail({
								email: artistEmail,
								artistName,
								artistId,
								eventName: eventName || "your event",
								eventId,
								performanceDates: newDates,
							});
						}
					} catch (notifyErr) {
						console.error("[PUT /api/contracts] Failed to notify artist of new performance date:", notifyErr);
					}
				}
			}

			return NextResponse.json({ success: true, artist: updatedArtist });
		}
		return NextResponse.json(
			{ success: false, error: "Artist not found or update failed" },
			{ status: 404 }
		);
	} catch (error) {
		console.error("Error updating contract artist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update artist" },
			{ status: 500 }
		);
	}
}

// DELETE /api/contracts/[eventId] — Delete an artist from this event
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");

		if (!artistId) {
			return NextResponse.json(
				{ success: false, error: "artistId is required" },
				{ status: 400 }
			);
		}

		// Artists shown in the pipeline can originate from any of three sources
		// (contract blob, draft EventArtist, or FameLink EventShow/Participation) —
		// remove the artist's association with this event from all of them.
		const removedFromContracts = await ContractService.deleteArtist(eventId, artistId);

		await connectToDatabase();
		const [draftResult, showsResult, participationResult] = await Promise.all([
			EventArtistModel.deleteOne({ id: artistId, eventId }),
			EventShowModel.deleteMany({ artistId, eventId }),
			EventParticipationModel.deleteMany({ artistId, eventId }),
		]);

		const removedAny =
			removedFromContracts ||
			draftResult.deletedCount > 0 ||
			showsResult.deletedCount > 0 ||
			participationResult.deletedCount > 0;

		if (!removedAny) {
			return NextResponse.json(
				{ success: false, error: "Artist not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting contract artist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to delete artist" },
			{ status: 500 }
		);
	}
}
