import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// PUT /api/contracts/[eventId]/bookings/stages — Update a booking stage
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { bookingId, stageName, stageUpdates, stageData } = body;

		if (!bookingId || !stageName) {
			return NextResponse.json(
				{
					success: false,
					error: "bookingId and stageName are required",
				},
				{ status: 400 },
			);
		}

		// Update stage status/signature
		if (stageUpdates) {
			const success = await ContractService.updateBookingStage(
				eventId,
				bookingId,
				stageName,
				stageUpdates,
			);
			if (!success) {
				return NextResponse.json(
					{ success: false, error: "Failed to update stage" },
					{ status: 500 },
				);
			}
		}

		// Update stage-specific data (contractData, logisticsData, etc.)
		if (stageData) {
			const dataKey = `${stageName}Data`;
			const success = await ContractService.updateBooking(
				eventId,
				bookingId,
				{ [dataKey]: stageData },
			);
			if (!success) {
				return NextResponse.json(
					{ success: false, error: "Failed to update stage data" },
					{ status: 500 },
				);
			}
		}

		const updated = await ContractService.getBooking(eventId, bookingId);
		return NextResponse.json({ success: true, booking: updated });
	} catch (error) {
		console.error("Error updating booking stage:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update stage" },
			{ status: 500 },
		);
	}
}

// POST /api/contracts/[eventId]/bookings/stages — Add negotiation message or sign
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { bookingId, stageName, action, data } = body;

		if (!bookingId || !stageName || !action) {
			return NextResponse.json(
				{
					success: false,
					error: "bookingId, stageName, and action are required",
				},
				{ status: 400 },
			);
		}

		switch (action) {
			case "add_negotiation": {
				const message = data?.message;
				if (!message) {
					return NextResponse.json(
						{ success: false, error: "message is required" },
						{ status: 400 },
					);
				}
				await ContractService.addBookingNegotiation(
					eventId,
					bookingId,
					stageName,
					message,
				);
				break;
			}

			case "artist_sign": {
				const signatureDataUrl = data?.signatureDataUrl;
				await ContractService.updateBookingStage(
					eventId,
					bookingId,
					stageName,
					{
						artistSignature: {
							signed: true,
							signedAt: new Date().toISOString(),
							signatureDataUrl: signatureDataUrl || "",
						},
						status: "waiting_organiser_signature",
					},
				);
				break;
			}

			case "organiser_sign": {
				const orgSignatureDataUrl = data?.signatureDataUrl;
				await ContractService.updateBookingStage(
					eventId,
					bookingId,
					stageName,
					{
						organiserSignature: {
							signed: true,
							signedAt: new Date().toISOString(),
							signatureDataUrl: orgSignatureDataUrl || "",
						},
						status: "completed",
					},
				);
				break;
			}

			case "approve": {
				await ContractService.updateBookingStage(
					eventId,
					bookingId,
					stageName,
					{ status: "approved" },
				);
				// Add approval message
				await ContractService.addBookingNegotiation(
					eventId,
					bookingId,
					stageName,
					{
						id: `neg-${Date.now()}`,
						sender: data?.sender || "artist",
						senderName: data?.senderName || "Artist",
						text: "I approve this stage.",
						timestamp: new Date().toISOString(),
						type: "approval",
					},
				);
				break;
			}

			case "request_changes": {
				await ContractService.updateBookingStage(
					eventId,
					bookingId,
					stageName,
					{ status: "changes_requested" },
				);
				if (data?.message) {
					await ContractService.addBookingNegotiation(
						eventId,
						bookingId,
						stageName,
						data.message,
					);
				}
				break;
			}

			case "send_to_artist": {
				await ContractService.updateBookingStage(
					eventId,
					bookingId,
					stageName,
					{ status: "sent" },
				);
				break;
			}

			default:
				return NextResponse.json(
					{ success: false, error: `Unknown action: ${action}` },
					{ status: 400 },
				);
		}

		const updated = await ContractService.getBooking(eventId, bookingId);
		return NextResponse.json({ success: true, booking: updated });
	} catch (error) {
		console.error("Error processing booking stage action:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to process action" },
			{ status: 500 },
		);
	}
}
