import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// POST /api/contracts/famelink-invites/action — Artist actions on contract invites
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { eventId, artistContractId, action, data } = body;

		if (!eventId || !artistContractId || !action) {
			return NextResponse.json(
				{
					success: false,
					error: "eventId, artistContractId, and action are required",
				},
				{ status: 400 },
			);
		}

		switch (action) {
			case "approve_agreement": {
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						status: "awaiting",
						agreementApprovedAt: new Date().toISOString(),
						agreementApprovedByArtist: true,
					},
				);
				// Add system message to conversation
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: "✅ Artist approved the agreement terms.",
					timestamp: new Date().toISOString(),
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Agreement approved",
				});
			}

			case "request_changes": {
				const { message } = data || {};
				if (!message) {
					return NextResponse.json(
						{
							success: false,
							error: "message is required for change requests",
						},
						{ status: 400 },
					);
				}
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						status: "negotiation",
						lastChangeRequestAt: new Date().toISOString(),
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "artist",
					senderName: data?.artistName || "Artist",
					text: `📝 Change Request: ${message}`,
					timestamp: new Date().toISOString(),
					type: "change_request",
				});
				return NextResponse.json({
					success: true,
					message: "Change request sent",
				});
			}

			case "send_message": {
				const { message: msgText, artistName } = data || {};
				if (!msgText) {
					return NextResponse.json(
						{ success: false, error: "message is required" },
						{ status: 400 },
					);
				}
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "artist",
					senderName: artistName || "Artist",
					text: msgText,
					timestamp: new Date().toISOString(),
				});
				return NextResponse.json({
					success: true,
					message: "Message sent",
				});
			}

			case "accept_contract": {
				const { signatureName } = data || {};
				const existing = await ContractService.getArtist(eventId, artistContractId);
				const now = new Date().toISOString();
				// Only mark the contract fully "confirmed" once the ORGANISER has also signed —
				// otherwise the artist's own signature must not flip the organiser's status to SIGNED.
				const organiserAlreadySigned =
					existing?.contractDocStatus === "confirmed" ||
					existing?.contractDocStatus === "signed_by_organiser" ||
					!!existing?.contractSignedByOrganiser;
				const docStatus = organiserAlreadySigned ? "confirmed" : "signed";
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						contractDocStatus: docStatus,
						contractSignedAt: now,
						contractSignedByArtist: true,
						contractSignatureName: signatureName || "",
						// Server appends this to whatever log currently exists in the DB.
						signatureLogEntry: { actor: "artist", action: "signed", name: signatureName || "Artist", timestamp: now },
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: `✅ Artist signed the contract${signatureName ? ` (Signed as: ${signatureName})` : "."}`,
					timestamp: now,
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Contract signed",
				});
			}

			case "withdraw_signature": {
				const existing = await ContractService.getArtist(eventId, artistContractId);
				// Revert to whatever status reflects only the organiser's signature (if any),
				// never touching the organiser's own signed fields.
				const organiserSigned =
					existing?.contractDocStatus === "confirmed" ||
					existing?.contractDocStatus === "signed_by_organiser" ||
					!!existing?.contractSignedByOrganiser;
				const docStatus = organiserSigned ? "signed_by_organiser" : "pending";
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						contractDocStatus: docStatus,
						contractSignedAt: null,
						contractSignedByArtist: false,
						contractSignatureName: "",
						// Server appends this to whatever log currently exists in the DB.
						signatureLogEntry: { actor: "artist", action: "unsigned", name: existing?.contractSignatureName || "Artist", timestamp: new Date().toISOString() },
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: `❌ Artist withdrew their digital signature.`,
					timestamp: new Date().toISOString(),
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Signature withdrawn",
				});
			}

			case "accept_invitation": {
				// Artist accepts the invitation (like "Yes I am performing")
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						status: "awaiting",
						invitationAcceptedAt: new Date().toISOString(),
						invitationResponse: "accepted",
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: "✅ Artist accepted the invitation and confirmed participation.",
					timestamp: new Date().toISOString(),
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Invitation accepted",
				});
			}

			case "reject_invitation": {
				// Artist rejects the invitation (like "Not performing")
				const { reason } = data || {};
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						status: "cancelled",
						invitationRejectedAt: new Date().toISOString(),
						invitationResponse: "rejected",
						rejectionReason: reason || "",
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: `❌ Artist declined the invitation.${reason ? ` Reason: ${reason}` : ""}`,
					timestamp: new Date().toISOString(),
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Invitation rejected",
				});
			}

			case "update_profile": {
				const { profileData } = data || {};
				if (!profileData) {
					return NextResponse.json(
						{ success: false, error: "profileData is required" },
						{ status: 400 },
					);
				}
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						...profileData,
						profileStatus: "received",
						profileUpdatedAt: new Date().toISOString(),
					},
				);
				return NextResponse.json({
					success: true,
					message: "Profile updated",
				});
			}

			case "update_answers": {
				const { eventQuestions } = data || {};
				if (!eventQuestions) {
					return NextResponse.json(
						{ success: false, error: "eventQuestions is required" },
						{ status: 400 },
					);
				}
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						eventQuestions,
						questionsUpdatedAt: new Date().toISOString(),
					},
				);
				return NextResponse.json({
					success: true,
					message: "Answers updated",
				});
			}

			case "submit_logistics": {
				const { selectedTravelers, totalTravelers, needs, questions } = data || {};
				await ContractService.updateArtist(
					eventId,
					artistContractId,
					{
						travelLogistics: {
							status: "submitted",
							selectedTravelers,
							totalTravelers,
							needs,
							questions,
							submittedAt: new Date().toISOString(),
						},
					},
				);
				await ContractService.addConversationMessage(eventId, {
					id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					artistId: artistContractId,
					sender: "system",
					senderName: "System",
					text: `✅ Artist submitted logistics intake (Total travelers: ${totalTravelers}).`,
					timestamp: new Date().toISOString(),
					type: "system",
				});
				return NextResponse.json({
					success: true,
					message: "Logistics submitted",
				});
			}

			default:
				return NextResponse.json(
					{ success: false, error: `Unknown action: ${action}` },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("Error processing famelink invite action:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to process action" },
			{ status: 500 },
		);
	}
}
