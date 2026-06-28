import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";

// GET /api/contracts/[eventId]/logistics-registries
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const registries =
			await ContractService.getLogisticsRegistries(eventId);
		return NextResponse.json({ success: true, registries });
	} catch (error) {
		console.error("Error fetching logistics registries:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch registries" },
			{ status: 500 },
		);
	}
}

// PUT /api/contracts/[eventId]/logistics-registries
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const existing =
			await ContractService.getLogisticsRegistries(eventId);
		const merged = { ...existing, ...body };
		const success = await ContractService.saveLogisticsRegistries(
			eventId,
			merged,
		);
		if (success) {
			return NextResponse.json({ success: true, registries: merged });
		}
		return NextResponse.json(
			{ success: false, error: "Failed to save registries" },
			{ status: 500 },
		);
	} catch (error) {
		console.error("Error saving logistics registries:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to save registries" },
			{ status: 500 },
		);
	}
}
