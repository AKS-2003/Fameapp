import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { EventDataService } from "@/lib/storage-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";

// GET /api/contracts/invite/[invitationId] — Public: look up invitation details
export async function GET(
	request: NextRequest,
	{ params }: { params: { invitationId: string } }
) {
	try {
		const { invitationId } = await Promise.resolve(params);

		// Search for the invitation across all events
		const result = await ContractService.getInvitationById(invitationId);
		if (!result) {
			return NextResponse.json(
				{ success: false, error: "Invitation not found" },
				{ status: 404 }
			);
		}

		const { invitation, eventId } = result;

		// Resolve artist email — prefer stored artistEmail, then look up by artist id
		let artistEmail = invitation.artistEmail || "";
		if (!artistEmail) {
			await connectToDatabase();
			// invitation.id == artist id in the draft system
			const artist = await EventArtistModel.findOne({
				id: invitationId,
				eventId,
			}).lean() as any;
			if (artist?.email) {
				artistEmail = artist.email;
			} else {
				// Fallback: FameLink artists table
				const FameLinkArtistModel = (await import("@/database/models/FameLinkArtist")).default;
				const fameLinkArtist = await FameLinkArtistModel.findOne({ id: invitationId }).lean() as any;
				if (fameLinkArtist?.email) artistEmail = fameLinkArtist.email;
			}
		}

		// Get event details
		const eventData = await EventDataService.getEvent(eventId);

		return NextResponse.json({
			success: true,
			invitation: { ...invitation, artistEmail },
			event: eventData ? {
				id: eventData.id,
				name: eventData.name || eventData.eventName,
				dates: eventData.dates,
				location: eventData.location || eventData.venue,
				description: eventData.description,
			} : null,
		});
	} catch (error) {
		console.error("Error fetching invitation:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch invitation" },
			{ status: 500 }
		);
	}
}

// POST /api/contracts/invite/[invitationId] — Artist accepts/declines
export async function POST(
	request: NextRequest,
	{ params }: { params: { invitationId: string } }
) {
	try {
		const { invitationId } = await Promise.resolve(params);
		const body = await request.json();
		const { action } = body; // "accept" | "decline"

		const result = await ContractService.getInvitationById(invitationId);
		if (!result) {
			return NextResponse.json(
				{ success: false, error: "Invitation not found" },
				{ status: 404 }
			);
		}

		const { eventId } = result;
		const newStatus = action === "accept" ? "waiting" : "cancelled";

		await ContractService.updateInvitation(eventId, invitationId, {
			status: newStatus,
			respondedAt: new Date().toISOString(),
		});

		// Also update the artist status if they exist
		const artists = await ContractService.getArtists(eventId);
		const artist = artists.find((a: any) => a.id === invitationId);
		if (artist) {
			await ContractService.updateArtist(eventId, invitationId, {
				status: action === "accept" ? "waiting" : "cancelled",
			});
		}

		return NextResponse.json({ success: true, status: newStatus });
	} catch (error) {
		console.error("Error responding to invitation:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to respond to invitation" },
			{ status: 500 }
		);
	}
}
