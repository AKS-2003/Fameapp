import { NextRequest, NextResponse } from "next/server";
import { triggerReminderCheck } from "@/lib/email-reminder-service";

/**
 * API endpoint to check for incomplete registrations and send reminders
 * This should be called by a cron job every 24 hours
 *
 * Example cron setup (using Vercel Cron or similar):
 * - Schedule: 0 9 * * * (every day at 9 AM)
 * - URL: https://yourdomain.com/api/cron/check-reminders
 *
 * For local testing:
 * - GET http://localhost:3000/api/cron/check-reminders
 */
export async function GET(request: NextRequest) {
	try {
		// Optional: Add authentication to prevent unauthorized access
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;

		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		console.log("🔄 Starting reminder check...");

		const result = await triggerReminderCheck();

		return NextResponse.json({
			success: result.success,
			message: result.message,
			stats: result.stats,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error in reminder check endpoint:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
	return GET(request);
}
