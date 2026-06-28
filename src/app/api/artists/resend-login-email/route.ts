import { NextRequest, NextResponse } from "next/server";
import { resendArtistLoginEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { artistName, artistId, email, eventName, eventId } = body;

		// Validate required fields
		if (!artistName || !artistId || !email || !eventName) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields: artistName, artistId, email, eventName",
				},
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid email format",
				},
				{ status: 400 }
			);
		}

		// Send the resend login email
		const emailSent = await resendArtistLoginEmail({
			artistName,
			artistId,
			email,
			eventName,
			eventId: eventId || "",
		});

		if (emailSent) {
			return NextResponse.json({
				success: true,
				message: `Login credentials email sent successfully to ${email}`,
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to send email. Please check email configuration.",
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in resend-login-email API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 }
		);
	}
}
