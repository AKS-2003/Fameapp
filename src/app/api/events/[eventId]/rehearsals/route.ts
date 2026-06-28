import { NextRequest, NextResponse } from "next/server";
import { EventDataService } from "@/lib/storage-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);

		// Fetch rehearsals from Google Cloud Storage
		const rehearsals = await EventDataService.getRehearsals(eventId);

		return NextResponse.json({
			success: true,
			data: rehearsals,
		});
	} catch (error) {
		console.error("Error fetching rehearsals:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch rehearsals from Google Cloud Storage",
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { artistId, date, startTime, endTime, notes } = body;

		// Validate required fields
		if (!artistId || !date || !startTime) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Missing required fields",
					},
				},
				{ status: 400 }
			);
		}

		// Create new rehearsal
		const newRehearsal = {
			id: `rehearsal-${Date.now()}-${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			eventId,
			artistId,
			scheduledDate: date,
			scheduledTime: startTime,
			endTime: endTime || startTime,
			duration: 15, // default duration
			status: "scheduled",
			rating: 0,
			notes: notes || "",
			feedback: "",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Save to Google Cloud Storage
		const saved = await EventDataService.addRehearsal(eventId, newRehearsal);

		if (!saved) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INTERNAL_ERROR",
						message:
							"Failed to save rehearsal to Google Cloud Storage",
					},
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data: newRehearsal,
		});
	} catch (error) {
		console.error("Error creating rehearsal:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to create rehearsal",
				},
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { rehearsalId, ...updates } = body;

		if (!rehearsalId) {
			return NextResponse.json(
				{
					success: false,
					error: "Rehearsal ID is required",
				},
				{ status: 400 }
			);
		}

		// Update rehearsal in Google Cloud Storage
		const updated = await EventDataService.updateRehearsal(
			eventId,
			rehearsalId,
			updates
		);

		if (!updated) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to update rehearsal in Google Cloud Storage",
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Rehearsal updated successfully",
		});
	} catch (error) {
		console.error("Error updating rehearsal:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update rehearsal",
			},
			{ status: 500 }
		);
	}
}
