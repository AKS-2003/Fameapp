import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { availableCurrencies } from "@/sample_data/currencyRegistry";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		let settings = await ContractService.getSettings(eventId);
		
		if (!settings) {
			settings = {};
		}
		
		if (!settings.currencies) {
			settings.currencies = [
				{ id: "cur-1", code: "EUR", name: "Euro", symbol: "€", isDefault: true },
				{ id: "cur-2", code: "USD", name: "US Dollar", symbol: "$", isDefault: false },
			];
		}

		return NextResponse.json({ success: true, settings, availableCurrencies });
	} catch (error) {
		console.error("Error fetching settings:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch settings" },
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

		let currentSettings = await ContractService.getSettings(eventId) || {};
		const updatedSettings = { ...currentSettings, ...body };

		const success = await ContractService.saveSettings(eventId, updatedSettings);
		if (success) {
			// Trigger WebSocket so other clients update in real time
			try {
				fetch(`${request.nextUrl.origin}/api/contracts/socket`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "contract_action",
						eventId,
						room: `event_${eventId}`,
						event: "contract_settings_updated",
						data: { eventId, settings: updatedSettings }
					})
				}).catch(() => {});
			} catch (e) {}

			return NextResponse.json({ success: true, settings: updatedSettings });
		}
		return NextResponse.json(
			{ success: false, error: "Failed to update settings" },
			{ status: 500 }
		);
	} catch (error) {
		console.error("Error updating settings:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update settings" },
			{ status: 500 }
		);
	}
}
