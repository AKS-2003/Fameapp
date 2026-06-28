import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, EventParticipationModel, EventDataModel } from "@/database/models/FameLinkModels";
import { getUnifiedArtistsForEvent } from "@/lib/contract-utils";
import { EventDataService } from "@/lib/storage-service";

// GET /api/contracts/famelink-invites?email=xxx — Get all contract invites for a FameLink artist
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email");
		const artistId = searchParams.get("artistId");

		if (!email && !artistId) {
			return NextResponse.json(
				{ success: false, error: "email or artistId is required" },
				{ status: 400 },
			);
		}

		console.log(`[GET /api/contracts/famelink-invites] Search: email=${email}, artistId=${artistId}`);
		
		// 1. Find all events where the artist is involved
		await connectToDatabase();
		
		// Search in Draft Artists
		const draftArtistEvents = await EventArtistModel.find({ 
			$or: [
				...(email ? [{ email: { $regex: new RegExp(`^${email}$`, "i") } }] : []),
				...(artistId ? [{ famelinkArtistId: artistId }, { id: artistId }] : [])
			]
		}).select("eventId").lean();
		console.log(`[GET /api/contracts/famelink-invites] Draft events found:`, draftArtistEvents.length);

		// Search in Participations
		const participationEvents = artistId ? await EventParticipationModel.find({ 
			artistId: artistId 
		}).select("eventId").lean() : [];
		console.log(`[GET /api/contracts/famelink-invites] Participation events found:`, participationEvents.length);

		// Search in JSON contract_artists blobs (all events that have contract data)
		const contractDataDocs = await EventDataModel.find({ 
			key: "contract_artists" 
		}).select("eventId").lean();

		const potentialEventIds = new Set([
			...draftArtistEvents.map((e: any) => e.eventId),
			...participationEvents.map((e: any) => e.eventId),
			...contractDataDocs.map((e: any) => e.eventId)
		]);
		console.log(`[GET /api/contracts/famelink-invites] Potential Event IDs:`, Array.from(potentialEventIds));

		const inviteResults: any[] = [];

		for (const eventId of potentialEventIds) {
			try {
				// Get unified artists for this event
				const allArtists = await getUnifiedArtistsForEvent(eventId);
				
				// Find matches in the unified list
				const matchingArtists = allArtists.filter((a: any) => {
					if (email && a.email?.toLowerCase() === email.toLowerCase()) return true;
					if (artistId && (a.famelinkArtistId === artistId || a.id === artistId)) return true;
					return false;
				});

				if (matchingArtists.length === 0) continue;

				// Get event details
				const eventData = await EventDataService.getEvent(eventId);

				// If the event itself is gone, don't show the invite/contract
				if (!eventData) {
					console.warn(`[GET /api/contracts/famelink-invites] Event ${eventId} not found, skipping.`);
					continue;
				}

				// Get invitations for this event
				const invitations = await ContractService.getInvitations(eventId);

				// Get settings for this event
				const settings = await ContractService.getSettings(eventId);

				for (const artist of matchingArtists) {
					// Find matching invitation
					const invitation = invitations.find(
						(inv: any) =>
							inv.artistId === artist.id ||
							inv.email?.toLowerCase() === artist.email?.toLowerCase(),
					);

					// Get conversations for this artist
					const conversations = await ContractService.getConversationsForArtist(
						eventId,
						artist.id,
					);

					inviteResults.push({
						id: `fl-${eventId}-${artist.id}`,
						eventId,
						artistContractId: artist.id,
						eventName: eventData?.name || eventData?.eventName || "Unknown Event",
						eventDates: eventData?.dates || `${eventData?.startDate || ""} – ${eventData?.endDate || ""}`,
						eventStartDate: eventData?.startDate,
						eventEndDate: eventData?.endDate,
						location: eventData?.location || eventData?.venue || "",
						organizerName: eventData?.organizerName || eventData?.stageManagerName || "Event Organizer",
						role: artist.role || "performer",
						status: mapArtistToFLStatus(artist),
						requireContractFirst: eventData?.requireContractFirst ?? true,
						artist,
						invitation,
						conversations,
						settings,
						event: eventData,
					});
				}
			} catch (err) {
				console.error(`Error processing event ${eventId}:`, err);
			}
		}

		return NextResponse.json({ success: true, invites: inviteResults });
	} catch (error) {
		console.error("Error fetching famelink invites:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch invites" },
			{ status: 500 },
		);
	}
}

function mapArtistToFLStatus(artist: any): string {
	if (artist.invitationResponse === "rejected") return "cancelled";
	if (artist.contractDocStatus === "confirmed" || artist.status === "confirmed") return "confirmed";
	if (
		artist.contractDocStatus === "awaiting_signature" ||
		artist.contractDocStatus === "sent"
	)
		return "contract_sent";
	if (artist.status === "awaiting") return "awaiting_approval";
	if (artist.status === "negotiation") return "discussion";
	if (artist.status === "waiting" || artist.status === "waiting_info" || artist.status === "pending") return "waiting";
	if (artist.status === "cancelled") return "cancelled";
	return "new_invite";
}
