import { NextRequest, NextResponse } from "next/server";
import { createDevUsers } from "@/lib/dev-setup";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	// Only allow in development
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "NOT_ALLOWED",
					message: "This endpoint is only available in development",
				},
			},
			{ status: 403 }
		);
	}

	try {
		await createDevUsers();

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Development users created successfully",
				users: [
					"admin@fame.dev / admin123 (Super Admin)",
					"manager@fame.dev / manager123 (Stage Manager)",
				],
			},
		});
	} catch (error) {
		console.error("Error initializing development data:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INIT_ERROR",
					message: "Failed to initialize development data",
				},
			},
			{ status: 500 }
		);
	}
}
