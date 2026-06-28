import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { EventDataService } from "@/lib/storage-service";
import { sendContractInvitationEmail } from "@/lib/email-service";

// GET /api/contracts/[eventId]/invitations — Get all invitations
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const invitations = await ContractService.getInvitations(eventId);
		return NextResponse.json({ success: true, invitations });
	} catch (error) {
		console.error("Error fetching invitations:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch invitations" },
			{ status: 500 },
		);
	}
}

// POST /api/contracts/[eventId]/invitations — Create invitation(s)
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const invitations = Array.isArray(body) ? body : [body];

		// Get event details for email
		const eventData = await EventDataService.getEvent(eventId);

		for (const invitation of invitations) {
			if (!invitation.id) {
				invitation.id = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			}
			invitation.eventId = eventId;
			invitation.invitationLink = `/invite/${invitation.id}`;
			invitation.createdAt =
				invitation.createdAt || new Date().toISOString();
			invitation.status = invitation.status || "invited";

			await ContractService.addInvitation(eventId, invitation);

			// Send email notification to the artist if they have a FameLink account
			if (invitation.email && invitation.famelinkArtistId) {
				try {
					await sendContractInvitationEmail({
						artistEmail: invitation.email,
						artistName:
							invitation.stageName || invitation.name || "Artist",
						eventName:
							eventData?.name || eventData?.eventName || "Event",
						eventDates:
							eventData?.dates ||
							`${eventData?.startDate || ""} – ${eventData?.endDate || ""}`,
						location: eventData?.location || eventData?.venue || "",
						organizerName:
							eventData?.organizerName ||
							eventData?.stageManagerName ||
							"Event Organizer",
						role: invitation.role || "Performer",
						famelinkArtistId: invitation.famelinkArtistId,
					});
				} catch (emailErr) {
					console.error("Error sending invitation email:", emailErr);
				}
			}
		}

		return NextResponse.json({ success: true, invitations });
	} catch (error) {
		console.error("Error creating invitation:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to create invitation" },
			{ status: 500 },
		);
	}
}

// PUT /api/contracts/[eventId]/invitations — Update invitation
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { invitationId, ...updates } = body;

		if (!invitationId) {
			return NextResponse.json(
				{ success: false, error: "invitationId is required" },
				{ status: 400 },
			);
		}

		const success = await ContractService.updateInvitation(
			eventId,
			invitationId,
			updates,
		);
		if (success) {
			return NextResponse.json({ success: true });
		}
		return NextResponse.json(
			{ success: false, error: "Invitation not found" },
			{ status: 404 },
		);
	} catch (error) {
		console.error("Error updating invitation:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update invitation" },
			{ status: 500 },
		);
	}
}
