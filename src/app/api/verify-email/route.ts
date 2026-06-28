import { NextRequest, NextResponse } from "next/server";

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<
	string,
	{ code: string; email: string; expiresAt: number }
>();

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification code to email
 * POST /api/verify-email
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, action, type = "artist" } = body; // type can be 'artist', 'stage_manager', or 'famelink_artist'

		if (!email) {
			return NextResponse.json(
				{ success: false, error: "Email is required" },
				{ status: 400 },
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ success: false, error: "Invalid email format" },
				{ status: 400 },
			);
		}

		if (action === "send") {
			// Generate verification code
			const code = generateVerificationCode();
			const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

			// Store code
			verificationCodes.set(email, { code, email, expiresAt });

			// Send email with verification code
			try {
				console.log(`📧 Attempting to send verification email to ${email}...`);
				
				if (process.env.RESEND_API_KEY) {
					console.log(`🔑 RESEND_API_KEY found, initializing Resend...`);
					const { Resend } = await import("resend");
					const resend = new Resend(process.env.RESEND_API_KEY);

					// Determine subject and title based on type
					const isStageManager = type === "stage_manager";
					const isFameLinkArtist = type === "famelink_artist";
					const subject = isStageManager
						? "Email Verification Code - FAME Stage Manager Registration"
						: isFameLinkArtist
							? "Email Verification Code - FameLink Artist Registration"
							: "Email Verification Code - FAME Artist Registration";
					const title = isStageManager
						? "Stage Manager Registration"
						: isFameLinkArtist
							? "FameLink Artist Registration"
							: "Artist Registration";
					const description = isStageManager
						? "Thank you for registering as a Stage Manager with FAME. To complete your registration, please verify your email address."
						: isFameLinkArtist
							? "Thank you for joining FameLink! To complete your artist registration, please verify your email address."
							: "Thank you for registering as an artist with FAME. To complete your registration, please verify your email address.";

					const fromEmail = `${process.env.RESEND_FROM_NAME || "FAME"} <${
						process.env.RESEND_FROM_EMAIL ||
						"onboarding@resend.dev"
					}>`;
					
					console.log(`📤 Sending from: ${fromEmail}`);

					const { data, error } = await resend.emails.send({
						from: fromEmail,
						to: email,
						subject: subject,
						html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: white; border: 2px solid #9333ea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: bold; color: #9333ea; letter-spacing: 5px; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .important-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Email Verification</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px;">${title}</p>
    </div>
    <div class="content">
      <p>Hello!</p>
      <p>${description}</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code:</p>
        <div class="code" id="verificationCode" style="user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${code}</div>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0; font-weight: bold; color: #92400e;">⏰ This code will expire in 10 minutes.</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} FAME. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
						`,
					});

					if (error) {
						console.error("❌ Resend API Error:", error);
						throw error;
					}

					console.log(
						`✅ Verification code sent successfully to ${email}. ID: ${data?.id}`,
					);
				} else {
					// Development mode - log code
					console.warn("⚠️ RESEND_API_KEY NOT FOUND! Email not sent via Resend.");
					console.log(
						`📧 [DEV MODE] Verification code for ${email}: ${code} (expires in 10 minutes)`,
					);
				}

				return NextResponse.json({
					success: true,
					message: "Verification code sent to your email",
				});
			} catch (error) {
				console.error("Error sending verification email:", error);
				return NextResponse.json(
					{
						success: false,
						error: "Failed to send verification email",
					},
					{ status: 500 },
				);
			}
		} else if (action === "verify") {
			const { code } = body;

			if (!code) {
				return NextResponse.json(
					{ success: false, error: "Verification code is required" },
					{ status: 400 },
				);
			}

			// Check if code exists and is valid
			const storedData = verificationCodes.get(email);

			if (!storedData) {
				return NextResponse.json(
					{
						success: false,
						error: "No verification code found for this email",
					},
					{ status: 400 },
				);
			}

			// Check if code has expired
			if (Date.now() > storedData.expiresAt) {
				verificationCodes.delete(email);
				return NextResponse.json(
					{
						success: false,
						error: "Verification code has expired. Please request a new one.",
					},
					{ status: 400 },
				);
			}

			// Verify code
			if (storedData.code !== code) {
				return NextResponse.json(
					{
						success: false,
						error: "Invalid verification code",
					},
					{ status: 400 },
				);
			}

			// Code is valid - remove it
			verificationCodes.delete(email);

			return NextResponse.json({
				success: true,
				message: "Email verified successfully",
			});
		} else {
			return NextResponse.json(
				{ success: false, error: "Invalid action" },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("Email verification error:", error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
