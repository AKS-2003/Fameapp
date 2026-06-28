import { NextRequest, NextResponse } from "next/server";
import { sendArtistVerificationEmail } from "@/lib/email-service";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { artistName, artistId, email, eventName, eventId } = body;

		// Validate required fields
		if (!artistName || !artistId || !email || !eventName || !eventId) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Missing required fields",
					},
				},
				{ status: 400 }
			);
		}

		// Send verification email
		const emailSent = await sendArtistVerificationEmail({
			artistName,
			artistId,
			email,
			eventName,
			eventId,
		});

		if (emailSent) {
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message: "Verification email sent successfully",
				},
			});
		} else {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "EMAIL_ERROR",
						message: "Failed to send verification email",
					},
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Send verification email error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to send verification email",
				},
			},
			{ status: 500 }
		);
	}
}
