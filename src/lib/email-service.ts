/**
 * Email Service for sending verification and notification emails
 * This is a simple implementation that can be extended with actual email providers
 * like SendGrid, Resend, or Nodemailer
 */

import { getBaseUrl } from "./url-utils";

interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

interface ArtistRegistrationEmailData {
	artistName: string;
	artistId: string;
	email: string;
	eventName: string;
	eventId: string;
}

/**
 * Send email using configured email service
 *
 * To enable actual email sending:
 * 1. Install Resend: npm install resend
 * 2. Get API key from https://resend.com
 * 3. Add to .env: RESEND_API_KEY=re_xxxxx
 * 4. Uncomment the Resend code below
 *
 * Alternative services: SendGrid, AWS SES, Nodemailer with SMTP
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
	try {
		console.log(`📧 Attempting to send email to ${options.to} with subject: ${options.subject}`);
		
		// Check if Resend is configured
		if (!process.env.RESEND_API_KEY) {
			console.warn("⚠️ RESEND_API_KEY not configured. Email not sent.");
			console.log("📧 Email would be sent:");
			console.log("To:", options.to);
			console.log("Subject:", options.subject);
			console.log("To enable emails, add RESEND_API_KEY to .env file");
			return false;
		}

		console.log("🔑 RESEND_API_KEY found, initializing Resend...");
		// Send email using Resend
		const { Resend } = await import("resend");
		const resend = new Resend(process.env.RESEND_API_KEY);

		const fromEmail = `${process.env.RESEND_FROM_NAME || "FAME"} <${
			process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
		}>`;
		
		console.log(`📤 Sending from: ${fromEmail}`);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text,
		});

		if (error) {
			console.error("❌ Resend API Error:", error);
			return false;
		}

		console.log("✅ Email sent successfully to:", options.to);
		console.log("Email ID:", data?.id);
		return true;
	} catch (error) {
		console.error("❌ Email service error:", error);
		return false;
	}
}

/**
 * Send verification email to artist after registration
 */
export async function sendArtistVerificationEmail(
	data: ArtistRegistrationEmailData,
): Promise<boolean> {
	const { artistName, artistId, email, eventName, eventId } = data;

	const baseUrl = getBaseUrl();
	const loginUrl = `${baseUrl}/famelink-auth?artistId=${encodeURIComponent(
		artistId,
	)}&artistName=${encodeURIComponent(artistName)}&email=${encodeURIComponent(
		email,
	)}`;
	const dashboardUrl = `${baseUrl}/artist-dashboard/${artistId}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Successful - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .event-name {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-family: 'Courier New', monospace;
      background: white;
      padding: 10px;
      border-radius: 4px;
      word-break: break-all;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .note-title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
    }
    .note-text {
      color: #78350f;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="success-icon">✓</div>
    
    <h1 style="text-align: center;">Registration Successful!</h1>
    <p class="event-name" style="text-align: center;">Your artist profile has been created successfully for<br><strong>${eventName}</strong></p>
    
    <div class="info-box">
      <div class="info-label">Your Artist ID</div>
      <div class="info-value">${artistId}</div>
    </div>
    
    <div class="note">
      <div class="note-title">📝 Important Note:</div>
      <div class="note-text">
        Please save your Artist ID, Name, and Email. You'll need these to log in to your artist dashboard.
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Go to Login</a>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #1f2937;">Your Login Credentials:</h3>
      <ul style="color: #4b5563; line-height: 2;">
        <li><strong>Artist ID:</strong> ${artistId}</li>
        <li><strong>Artist Name:</strong> ${artistName}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>If you have any questions, please contact the event organizers.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Registration Successful!

Your artist profile has been created successfully for ${eventName}.

Your Artist ID: ${artistId}

Important: Please save your Artist ID, Name, and Email. You'll need these to log in to your artist dashboard.

Your Login Credentials:
- Artist ID: ${artistId}
- Artist Name: ${artistName}
- Email: ${email}

Login here: ${loginUrl}

If you have any questions, please contact the event organizers.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: email,
		subject: `Registration Successful - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send reminder email to artist who hasn't completed registration
 */
export async function sendArtistReminderEmail(
	email: string,
	artistName: string,
	eventName: string,
	registrationUrl: string,
): Promise<boolean> {
	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Complete Your Registration - FAME</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #9333ea;">Complete Your Registration</h1>
    <p>Hi ${artistName},</p>
    <p>We noticed you haven't finished your registration for <strong>${eventName}</strong>.</p>
    <p>Please complete your registration to ensure you're included in the event lineup.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${registrationUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        Complete Registration
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact the event organizers.</p>
  </div>
</body>
</html>
  `;

	return sendEmail({
		to: email,
		subject: `Complete Your Registration - ${eventName}`,
		html,
		text: `Complete your registration for ${eventName}: ${registrationUrl}`,
	});
}

/**
 * Send email to artist when a stage manager assigns them a performance date
 */
export async function sendPerformanceDateAssignedEmail(data: {
	email: string;
	artistName: string;
	artistId: string;
	eventName: string;
	eventId: string;
	performanceDates: string[];
}): Promise<boolean> {
	const { email, artistName, artistId, eventName, performanceDates } = data;

	const baseUrl = getBaseUrl();
	const dashboardUrl = `${baseUrl}/famelink/${encodeURIComponent(artistId)}`;

	const formattedDates = performanceDates
		.map((d) => {
			try {
				return new Date(d).toLocaleDateString("en-US", {
					weekday: "long",
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			} catch {
				return d;
			}
		})
		.join(", ");

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Date Assigned - FAME</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #9333ea;">Your Performance Date is Set!</h1>
    <p>Hi ${artistName},</p>
    <p>Great news — you've been assigned a performance date for <strong>${eventName}</strong>.</p>
    <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">Performance Date${performanceDates.length > 1 ? "s" : ""}</div>
      <div style="font-size: 16px; color: #1f2937;">${formattedDates}</div>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
        View Your Dashboard
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact the event organizers.</p>
  </div>
</body>
</html>
  `;

	const text = `Your Performance Date is Set!

Hi ${artistName},

You've been assigned a performance date for ${eventName}.

Performance Date${performanceDates.length > 1 ? "s" : ""}: ${formattedDates}

View your dashboard: ${dashboardUrl}

If you have any questions, please contact the event organizers.
  `;

	return sendEmail({
		to: email,
		subject: `Performance Date Assigned - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send password reset request email to admin and stage manager
 */
interface PasswordResetRequestData {
	stageManagerEmail: string;
	stageManagerName: string;
	stageManagerPhone: string;
	userId: string;
}

export async function sendPasswordResetRequestEmail(
	data: PasswordResetRequestData,
): Promise<boolean> {
	const { stageManagerEmail, stageManagerName, stageManagerPhone, userId } =
		data;

	const adminEmail = "info@ericlalta.com";
	const adminPhone = "+971 52 841 1575";

	// Email to Admin
	const adminHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .alert-icon {
      width: 64px;
      height: 64px;
      background: #f59e0b;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      width: 150px;
    }
    .info-value {
      color: #1f2937;
      flex: 1;
    }
    .urgent {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="alert-icon">🔐</div>
    
    <h1 style="text-align: center;">Password Reset Request</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">A Stage Manager has requested a password reset</p>
    
    <div class="urgent">
      <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Action Required</p>
      <p style="margin: 5px 0 0; color: #78350f; font-size: 14px;">
        Please contact the Stage Manager and provide them with a new password.
      </p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Stage Manager Details:</h3>
      <div class="info-row">
        <div class="info-label">Name:</div>
        <div class="info-value"><strong>${stageManagerName}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Email:</div>
        <div class="info-value"><a href="mailto:${stageManagerEmail}" style="color: #9333ea;">${stageManagerEmail}</a></div>
      </div>
      <div class="info-row">
        <div class="info-label">Phone:</div>
        <div class="info-value"><a href="tel:${stageManagerPhone}" style="color: #9333ea;">${stageManagerPhone}</a></div>
      </div>
    </div>
    
    <div style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">Next Steps:</h3>
      <ol style="color: #1e3a8a; margin: 0; padding-left: 20px;">
        <li>Contact the Stage Manager via phone or email</li>
        <li>Verify their identity</li>
        <li>Update their password in the system</li>
        <li>The Stage Manager will be automatically redirected to login via WebSocket</li>
      </ol>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from FAME System</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const adminText = `
Password Reset Request - FAME

A Stage Manager has requested a password reset.

Stage Manager Details:
- Name: ${stageManagerName}
- Email: ${stageManagerEmail}
- Phone: ${stageManagerPhone}


Action Required:
Please contact the Stage Manager and provide them with a new password.

Next Steps:
1. Contact the Stage Manager via phone or email
2. Verify their identity
3. Update their password in the system
4. The Stage Manager will be automatically redirected to login via WebSocket

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	// Email to Stage Manager
	const stageManagerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request Received - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .contact-box {
      background: #dbeafe;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .contact-row {
      display: flex;
      align-items: center;
      padding: 10px 0;
    }
    .contact-icon {
      font-size: 24px;
      margin-right: 15px;
    }
    .contact-info {
      flex: 1;
    }
    .contact-label {
      font-weight: 600;
      color: #1e40af;
      font-size: 14px;
    }
    .contact-value {
      color: #1e3a8a;
      font-size: 16px;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="success-icon">✓</div>
    
    <h1 style="text-align: center;">Password Reset Request Received</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">Your request has been sent to the admin</p>
    
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        ✅ Your password reset request has been successfully submitted. The admin will contact you shortly to verify your identity and provide a new password.
      </p>
    </div>
    
    <div class="contact-box">
      <h3 style="margin-top: 0; color: #1e40af;">Admin Contact Details:</h3>
      <div class="contact-row">
        <div class="contact-icon">📞</div>
        <div class="contact-info">
          <div class="contact-label">Phone</div>
          <div class="contact-value"><a href="tel:${adminPhone}" style="color: #9333ea; text-decoration: none;">${adminPhone}</a></div>
        </div>
      </div>
      <div class="contact-row">
        <div class="contact-icon">📧</div>
        <div class="contact-info">
          <div class="contact-label">Email</div>
          <div class="contact-value"><a href="mailto:${adminEmail}" style="color: #9333ea; text-decoration: none;">${adminEmail}</a></div>
        </div>
      </div>
    </div>
    
    <div class="note">
      <p style="margin: 0; color: #92400e; font-weight: 600;">📝 What happens next?</p>
      <ol style="color: #78350f; margin: 10px 0 0; padding-left: 20px;">
        <li>The admin will receive your password reset request</li>
        <li>They will contact you via phone or email to verify your identity</li>
        <li>Once verified, they will update your password</li>
        <li>You'll be automatically redirected to the login page via real-time notification</li>
        <li>Stay on the pending page to receive updates</li>
      </ol>
    </div>
    
    <div class="footer">
      <p>If you didn't request this password reset, please contact the admin immediately.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const stageManagerText = `
Password Reset Request Received - FAME

Your password reset request has been sent to the admin.

Your request has been successfully submitted. The admin will contact you shortly to verify your identity and provide a new password.

Admin Contact Details:
- Phone: ${adminPhone}
- Email: ${adminEmail}

What happens next?
1. The admin will receive your password reset request
2. They will contact you via phone or email to verify your identity
3. Once verified, they will update your password
4. You'll be automatically redirected to the login page via real-time notification
5. Stay on the pending page to receive updates

If you didn't request this password reset, please contact the admin immediately.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	// Send both emails
	const adminEmailSent = await sendEmail({
		to: adminEmail,
		subject: `🔐 Password Reset Request - ${stageManagerName}`,
		html: adminHtml,
		text: adminText,
	});

	const stageManagerEmailSent = await sendEmail({
		to: stageManagerEmail,
		subject: "Password Reset Request Received - FAME",
		html: stageManagerHtml,
		text: stageManagerText,
	});

	return adminEmailSent && stageManagerEmailSent;
}

/**
 * Send verification email to Stage Manager after registration
 */
interface StageManagerRegistrationEmailData {
	stageManagerEmail: string;
	stageManagerName: string;
	stageManagerPhone: string;
	userId: string;
}

export async function sendStageManagerVerificationEmail(
	data: StageManagerRegistrationEmailData,
): Promise<boolean> {
	const { stageManagerEmail, stageManagerName, stageManagerPhone, userId } =
		data;

	const adminEmail = "info@ericlalta.com";
	const adminPhone = "+971 52 841 1575";
	const baseUrl = getBaseUrl();
	const loginUrl = `${baseUrl}/login`;

	// Email to Stage Manager
	const stageManagerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Successful - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .contact-box {
      background: #dbeafe;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="success-icon">✓</div>
    
    <h1 style="text-align: center;">Registration Successful!</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">Welcome to FAME Events Management System</p>
    
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        ✅ Your Stage Manager account has been created successfully! Your registration is currently pending approval from the administrator.
      </p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Your Account Details:</h3>
      <ul style="color: #4b5563; line-height: 2;">
        <li><strong>Name:</strong> ${stageManagerName}</li>
        <li><strong>Email:</strong> ${stageManagerEmail}</li>
        <li><strong>Phone:</strong> ${stageManagerPhone || "Not provided"}</li>
        <li><strong>Status:</strong> Pending Approval</li>
      </ul>
    </div>
    
    <div class="note">
      <p style="margin: 0; color: #92400e; font-weight: 600;">📝 What happens next?</p>
      <ol style="color: #78350f; margin: 10px 0 0; padding-left: 20px;">
        <li>Your registration will be reviewed by the administrator</li>
        <li>You'll receive a notification once your account is approved</li>
        <li>After approval, you can log in and start managing events</li>
        <li>The approval process typically takes 24-48 hours</li>
      </ol>
    </div>
    
    <div class="contact-box">
      <h3 style="margin-top: 0; color: #1e40af;">Administrator Contact:</h3>
      <p style="color: #1e3a8a; margin: 5px 0;">
        📞 <strong>Phone:</strong> <a href="tel:${adminPhone}" style="color: #9333ea; text-decoration: none;">${adminPhone}</a>
      </p>
      <p style="color: #1e3a8a; margin: 5px 0;">
        📧 <strong>Email:</strong> <a href="mailto:${adminEmail}" style="color: #9333ea; text-decoration: none;">${adminEmail}</a>
      </p>
      <p style="color: #1e3a8a; margin-top: 10px; font-size: 14px;">
        If you have any questions or need immediate assistance, please contact the administrator.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Go to Login Page</a>
    </div>
    
    <div class="footer">
      <p>This is an automated email from FAME Events Management System.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const stageManagerText = `
Registration Successful - FAME

Welcome to FAME Events Management System!

Your Stage Manager account has been created successfully! Your registration is currently pending approval from the administrator.

Your Account Details:
- Name: ${stageManagerName}
- Email: ${stageManagerEmail}
- Phone: ${stageManagerPhone || "Not provided"}
- Status: Pending Approval

What happens next?
1. Your registration will be reviewed by the administrator
2. You'll receive a notification once your account is approved
3. After approval, you can log in and start managing events
4. The approval process typically takes 24-48 hours

Administrator Contact:
- Phone: ${adminPhone}
- Email: ${adminEmail}

If you have any questions or need immediate assistance, please contact the administrator.

Login here: ${loginUrl}

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	// Email to Admin
	const adminHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Stage Manager Registration - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .alert-icon {
      width: 64px;
      height: 64px;
      background: #3b82f6;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      width: 150px;
    }
    .info-value {
      color: #1f2937;
      flex: 1;
    }
    .urgent {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="alert-icon">👤</div>
    
    <h1 style="text-align: center;">New Stage Manager Registration</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">A new Stage Manager has registered and is awaiting approval</p>
    
    <div class="urgent">
      <p style="margin: 0; color: #1e40af; font-weight: 600;">⚠️ Action Required</p>
      <p style="margin: 5px 0 0; color: #1e3a8a; font-size: 14px;">
        Please review this registration and approve or reject the account in the Super Admin Dashboard.
      </p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Stage Manager Details:</h3>
      <div class="info-row">
        <div class="info-label">Name:</div>
        <div class="info-value"><strong>${stageManagerName}</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">Email:</div>
        <div class="info-value"><a href="mailto:${stageManagerEmail}" style="color: #9333ea;">${stageManagerEmail}</a></div>
      </div>
      <div class="info-row">
        <div class="info-label">Phone:</div>
        <div class="info-value">${stageManagerPhone || "Not provided"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Registration Date:</div>
        <div class="info-value">${new Date().toLocaleString()}</div>
      </div>
    </div>
    
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #166534;">Next Steps:</h3>
      <ol style="color: #166534; margin: 0; padding-left: 20px;">
        <li>Log in to the Super Admin Dashboard</li>
        <li>Review the Stage Manager's information</li>
        <li>Approve or reject the registration</li>
        <li>The Stage Manager will be notified automatically</li>
      </ol>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from FAME System</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const adminText = `
New Stage Manager Registration - FAME

A new Stage Manager has registered and is awaiting approval.

Stage Manager Details:
- Name: ${stageManagerName}
- Email: ${stageManagerEmail}
- Phone: ${stageManagerPhone || "Not provided"}
- Registration Date: ${new Date().toLocaleString()}

Action Required:
Please review this registration and approve or reject the account in the Super Admin Dashboard.

Next Steps:
1. Log in to the Super Admin Dashboard
2. Review the Stage Manager's information
3. Approve or reject the registration
4. The Stage Manager will be notified automatically

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	// Send both emails
	const stageManagerEmailSent = await sendEmail({
		to: stageManagerEmail,
		subject: "Registration Successful - FAME Events",
		html: stageManagerHtml,
		text: stageManagerText,
	});

	const adminEmailSent = await sendEmail({
		to: adminEmail,
		subject: `🆕 New Stage Manager Registration - ${stageManagerName}`,
		html: adminHtml,
		text: adminText,
	});

	return stageManagerEmailSent && adminEmailSent;
}

/**
 * Send chat message notification email to artist
 */
export async function sendChatMessageEmail(data: {
	artistId: string;
	artistEmail: string;
	artistName: string;
	eventId: string;
	eventName: string;
	showDate: string;
	message: string;
	senderName: string;
	timestamp: string;
}): Promise<boolean> {
	const {
		artistId,
		artistEmail,
		artistName,
		eventName,
		showDate,
		message,
		senderName,
	} = data;

	const baseUrl = getBaseUrl();
	const loginParams = new URLSearchParams({
		artistId: artistId,
		email: artistEmail,
		artistName: artistName,
	});
	const loginUrl = `${baseUrl}/famelink-auth?${loginParams.toString()}`;

	const formattedDate = new Date(showDate).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message from Stage Manager - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .message-icon {
      width: 64px;
      height: 64px;
      background: #3b82f6;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .event-info {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .event-info-row {
      display: flex;
      padding: 5px 0;
    }
    .event-info-label {
      font-weight: 600;
      color: #6b7280;
      width: 120px;
    }
    .event-info-value {
      color: #1f2937;
      flex: 1;
    }
    .message-box {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .message-from {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .message-content {
      color: #1e3a8a;
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="message-icon">💬</div>
    
    <h1 style="text-align: center;">New Message from Stage Manager</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">You have a new message regarding your performance</p>
    
    <div class="event-info">
      <div class="event-info-row">
        <div class="event-info-label">Event:</div>
        <div class="event-info-value"><strong>${eventName}</strong></div>
      </div>
      <div class="event-info-row">
        <div class="event-info-label">Performance Date:</div>
        <div class="event-info-value">${formattedDate}</div>
      </div>
      <div class="event-info-row">
        <div class="event-info-label">Artist:</div>
        <div class="event-info-value">${artistName}</div>
      </div>
    </div>
    
    <div class="message-box">
      <div class="message-from">From: ${senderName} (Stage Manager)</div>
      <div class="message-content">${message}</div>
    </div>
    
    <div class="note">
      <p style="margin: 0; color: #92400e; font-weight: 600;">📝 Important:</p>
      <p style="margin: 5px 0 0; color: #78350f; font-size: 14px;">
        This is a read-only message. You can view all messages in your artist dashboard, but you cannot reply directly.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">View in Dashboard</a>
    </div>
    
    <div class="footer">
      <p>This message was sent to all artists performing on ${formattedDate}.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
New Message from Stage Manager - FAME

You have a new message regarding your performance.

Event: ${eventName}
Performance Date: ${formattedDate}
Artist: ${artistName}

From: ${senderName} (Stage Manager)
Message:
${message}

Important: This is a read-only message. You can view all messages in your artist dashboard, but you cannot reply directly.

View in Dashboard: ${loginUrl}

This message was sent to all artists performing on ${formattedDate}.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: artistEmail,
		subject: `New Message from Stage Manager - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send profile update confirmation email to artist
 */
export async function sendArtistProfileUpdateEmail(
	data: ArtistRegistrationEmailData,
): Promise<boolean> {
	const { artistName, artistId, email, eventName, eventId } = data;

	const baseUrl = getBaseUrl();
	const loginUrl = `${baseUrl}/famelink-auth?artistId=${encodeURIComponent(
		artistId,
	)}&artistName=${encodeURIComponent(artistName)}&email=${encodeURIComponent(
		email,
	)}`;
	const dashboardUrl = `${baseUrl}/artist-dashboard/${artistId}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Updated Successfully - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .event-name {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-family: 'Courier New', monospace;
      background: white;
      padding: 10px;
      border-radius: 4px;
      word-break: break-all;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .note-title {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .note-text {
      color: #1e3a8a;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="success-icon">✓</div>
    
    <h1 style="text-align: center;">Profile Updated Successfully!</h1>
    <p class="event-name" style="text-align: center;">Your artist profile has been updated for<br><strong>${eventName}</strong></p>
    
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        ✅ Your profile information has been successfully updated, including your new email address.
      </p>
    </div>
    
    <div class="info-box">
      <div class="info-label">Your Artist ID</div>
      <div class="info-value">${artistId}</div>
    </div>
    
    <div class="note">
      <div class="note-title">📝 Important Information:</div>
      <div class="note-text">
        Your login credentials have been updated. Use your new email address along with your Artist ID and Name to log in.
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">View Your Dashboard</a>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #1f2937;">Your Updated Login Credentials:</h3>
      <ul style="color: #4b5563; line-height: 2;">
        <li><strong>Artist ID:</strong> ${artistId}</li>
        <li><strong>Artist Name:</strong> ${artistName}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Link:</strong> <a href="${loginUrl}" style="color: #9333ea;">${loginUrl}</a></li>
      </ul>
    </div>
    
    <div class="footer">
      <p>If you didn't make these changes or have any questions, please contact the event organizers immediately.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Profile Updated Successfully!

Your artist profile has been updated for ${eventName}.

Your Artist ID: ${artistId}

Important: Your login credentials have been updated. Use your new email address along with your Artist ID and Name to log in.

Your Updated Login Credentials:
- Artist ID: ${artistId}
- Artist Name: ${artistName}
- Email: ${email}

View your dashboard: ${dashboardUrl}
Login here: ${loginUrl}

If you didn't make these changes or have any questions, please contact the event organizers immediately.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: email,
		subject: `Profile Updated Successfully - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send personal message notification email to a specific artist
 */
export async function sendPersonalMessageEmail(data: {
	artistId: string;
	artistEmail: string;
	artistName: string;
	eventId: string;
	eventName: string;
	message: string;
	senderName: string;
	timestamp: string;
}): Promise<boolean> {
	const {
		artistId,
		artistEmail,
		artistName,
		eventName,
		message,
		senderName,
	} = data;

	const baseUrl = getBaseUrl();
	const loginParams = new URLSearchParams({
		artistId: artistId,
		email: artistEmail,
		artistName: artistName,
	});
	const loginUrl = `${baseUrl}/famelink-auth?${loginParams.toString()}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Message from Stage Manager - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .message-icon {
      width: 64px;
      height: 64px;
      background: #6366f1;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .personal-badge {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin: 10px 0;
    }
    .event-info {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .event-info-row {
      display: flex;
      padding: 5px 0;
    }
    .event-info-label {
      font-weight: 600;
      color: #6b7280;
      width: 120px;
    }
    .event-info-value {
      color: #1f2937;
      flex: 1;
    }
    .message-box {
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
      border-left: 4px solid #6366f1;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .message-from {
      font-weight: 600;
      color: #4338ca;
      margin-bottom: 10px;
    }
    .message-content {
      color: #3730a3;
      font-size: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #eef2ff;
      border-left: 4px solid #6366f1;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="message-icon">🔒</div>
    
    <h1 style="text-align: center;">Personal Message from Stage Manager</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">You have received a private message</p>
    <div style="text-align: center;">
      <span class="personal-badge">🔒 Private Message - Only for You</span>
    </div>
    
    <div class="event-info">
      <div class="event-info-row">
        <div class="event-info-label">Event:</div>
        <div class="event-info-value"><strong>${eventName}</strong></div>
      </div>
      <div class="event-info-row">
        <div class="event-info-label">Recipient:</div>
        <div class="event-info-value">${artistName}</div>
      </div>
    </div>
    
    <div class="message-box">
      <div class="message-from">From: ${senderName} (Stage Manager)</div>
      <div class="message-content">${message}</div>
    </div>
    
    <div class="note">
      <p style="margin: 0; color: #4338ca; font-weight: 600;">🔒 Private Message:</p>
      <p style="margin: 5px 0 0; color: #3730a3; font-size: 14px;">
        This message was sent only to you. Other artists cannot see this message. You can view all your personal messages in your artist dashboard.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">View in Dashboard</a>
    </div>
    
    <div class="footer">
      <p>This is a private message sent only to ${artistName}.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Personal Message from Stage Manager - FAME

You have received a private message.

🔒 Private Message - Only for You

Event: ${eventName}
Recipient: ${artistName}

From: ${senderName} (Stage Manager)
Message:
${message}

Important: This message was sent only to you. Other artists cannot see this message. You can view all your personal messages in your artist dashboard.

View in Dashboard: ${loginUrl}

This is a private message sent only to ${artistName}.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: artistEmail,
		subject: `🔒 Personal Message from Stage Manager - ${eventName}`,
		html,
		text,
	});
}

/**
 * Resend login credentials email to artist
 * Similar to registration email but with different header title
 */
export async function resendArtistLoginEmail(
	data: ArtistRegistrationEmailData,
): Promise<boolean> {
	const { artistName, artistId, email, eventName, eventId } = data;

	const baseUrl = getBaseUrl();
	const loginUrl = `${baseUrl}/famelink-auth?artistId=${encodeURIComponent(
		artistId,
	)}&artistName=${encodeURIComponent(artistName)}&email=${encodeURIComponent(
		email,
	)}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Credentials - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .info-icon {
      width: 64px;
      height: 64px;
      background: #3b82f6;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .event-name {
      color: #6b7280;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-family: 'Courier New', monospace;
      background: white;
      padding: 10px;
      border-radius: 4px;
      word-break: break-all;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .note {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .note-title {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .note-text {
      color: #1e3a8a;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="info-icon">🔑</div>
    
    <h1 style="text-align: center;">Your Login Credentials</h1>
    <p class="event-name" style="text-align: center;">Here are your login details for<br><strong>${eventName}</strong></p>
    
    <div class="info-box">
      <div class="info-label">Your Artist ID</div>
      <div class="info-value">${artistId}</div>
    </div>
    
    <div class="note">
      <div class="note-title">📝 Login Information:</div>
      <div class="note-text">
        Use your Artist ID, Name, and Email to log in to your artist dashboard.
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Go to Login</a>
    </div>
    
    <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #1f2937;">Your Login Credentials:</h3>
      <ul style="color: #4b5563; line-height: 2;">
        <li><strong>Artist ID:</strong> ${artistId}</li>
        <li><strong>Artist Name:</strong> ${artistName}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Link:</strong> <a href="${loginUrl}" style="color: #9333ea;">${loginUrl}</a></li>
      </ul>
    </div>
    
    <div class="footer">
      <p>If you have any questions, please contact the event organizers.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Your Login Credentials - FAME

Here are your login details for ${eventName}.

Your Artist ID: ${artistId}

Login Information:
Use your Artist ID, Name, and Email to log in to your artist dashboard.

Your Login Credentials:
- Artist ID: ${artistId}
- Artist Name: ${artistName}
- Email: ${email}
- Link: ${loginUrl}

Login here: ${loginUrl}

If you have any questions, please contact the event organizers.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: email,
		subject: `Your Login Credentials - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send artist reply notification email to stage manager
 */
export async function sendArtistReplyEmail(data: {
	stageManagerEmail: string;
	stageManagerName: string;
	artistName: string;
	eventId: string;
	eventName: string;
	showDate: string;
	message: string;
	timestamp: string;
}): Promise<boolean> {
	const {
		stageManagerEmail,
		stageManagerName,
		artistName,
		eventName,
		showDate,
		message,
	} = data;

	const baseUrl = getBaseUrl();
	const chatUrl = `${baseUrl}/stage-manager/events/${data.eventId}/artists`;

	const formattedDate = new Date(showDate).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Artist Reply - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .message-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .event-info {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .event-info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .event-info-row:last-child {
      border-bottom: none;
    }
    .event-info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .event-info-value {
      color: #1f2937;
      text-align: right;
    }
    .message-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-left: 4px solid #10b981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .message-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #059669;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .message-content {
      color: #1f2937;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
      <div class="message-icon">💬</div>
      <h1>Artist Reply Received</h1>
      <p style="color: #6b7280; margin: 0;">An artist has responded to your message</p>
    </div>

    <p>Hi ${stageManagerName},</p>
    
    <p><strong>${artistName}</strong> has replied to your message for <strong>${eventName}</strong>.</p>

    <div class="event-info">
      <div class="event-info-row">
        <span class="event-info-label">Event</span>
        <span class="event-info-value">${eventName}</span>
      </div>
      <div class="event-info-row">
        <span class="event-info-label">Performance Date</span>
        <span class="event-info-value">${formattedDate}</span>
      </div>
      <div class="event-info-row">
        <span class="event-info-label">Artist</span>
        <span class="event-info-value">${artistName}</span>
      </div>
    </div>

    <div class="message-box">
      <div class="message-label">Artist's Message</div>
      <div class="message-content">${message}</div>
    </div>

    <div style="text-align: center;">
      <a href="${chatUrl}" class="cta-button">View Full Conversation</a>
    </div>

    <div class="footer">
      <p>This is an automated notification from FAME Event Management System.</p>
      <p style="margin: 5px 0;">You can view and reply to this message in your stage manager dashboard.</p>
    </div>
  </div>
</body>
</html>
`;

	const text = `
FAME - Artist Reply Received

Hi ${stageManagerName},

${artistName} has replied to your message for ${eventName}.

Event: ${eventName}
Performance Date: ${formattedDate}
Artist: ${artistName}

Artist's Message:
${message}

View the full conversation in your stage manager dashboard:
${chatUrl}

---
This is an automated notification from FAME Event Management System.
`;

	return await sendEmail({
		to: stageManagerEmail,
		subject: `Artist Reply: ${artistName} - ${eventName}`,
		html,
		text,
	});
}

/**
 * Send email to stage manager when an artist sends a private reply
 */
export async function sendArtistPrivateReplyEmail(data: {
	stageManagerEmail: string;
	stageManagerName: string;
	artistName: string;
	artistId: string;
	eventId: string;
	eventName: string;
	message: string;
	timestamp: string;
}): Promise<boolean> {
	const {
		stageManagerEmail,
		stageManagerName,
		artistName,
		eventId,
		eventName,
		message,
	} = data;

	const baseUrl = getBaseUrl();
	const dashboardUrl = `${baseUrl}/stage-manager/events/${eventId}/artists`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Private Reply from Artist - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .message-icon {
      width: 64px;
      height: 64px;
      background: #6366f1;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .personal-badge {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin: 10px 0;
    }
    .event-info {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .event-info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .event-info-row:last-child {
      border-bottom: none;
    }
    .event-info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .event-info-value {
      color: #1f2937;
      text-align: right;
    }
    .message-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border-left: 4px solid #6366f1;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .message-from {
      font-size: 14px;
      color: #4338ca;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .message-content {
      color: #1f2937;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
    </div>
    
    <div class="message-icon">🔒</div>
    
    <h1 style="text-align: center;">Private Reply from Artist</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">An artist has sent you a private message</p>
    <div style="text-align: center;">
      <span class="personal-badge">🔒 Private Message</span>
    </div>
    
    <p>Hi ${stageManagerName},</p>
    <p><strong>${artistName}</strong> has sent you a private reply for <strong>${eventName}</strong>.</p>
    
    <div class="event-info">
      <div class="event-info-row">
        <div class="event-info-label">Event:</div>
        <div class="event-info-value"><strong>${eventName}</strong></div>
      </div>
      <div class="event-info-row">
        <div class="event-info-label">From:</div>
        <div class="event-info-value">${artistName}</div>
      </div>
    </div>
    
    <div class="message-box">
      <div class="message-from">From: ${artistName} (Artist)</div>
      <div class="message-content">${message}</div>
    </div>
    
    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="button">View in Dashboard</a>
    </div>
    
    <div class="footer">
      <p>This is a private message from ${artistName}.</p>
      <p>You can reply via the personal message feature in your artist management page.</p>
      <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} FAME. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Private Reply from Artist - FAME

Hi ${stageManagerName},

${artistName} has sent you a private reply for ${eventName}.

Event: ${eventName}
From: ${artistName}

Message:
${message}

View in Dashboard: ${dashboardUrl}

This is a private message from ${artistName}.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return await sendEmail({
		to: stageManagerEmail,
		subject: `🔒 Private Reply from ${artistName} - ${eventName}`,
		html,
		text,
	});
}

/**
 * FameLink Artist Registration Email Data
 */
interface FameLinkArtistRegistrationEmailData {
	artistName: string;
	artistId: string;
	email: string;
	verificationToken: string;
}

/**
 * Send verification email to FameLink artist after registration
 * This is for the FameLink platform (not event-specific registration)
 */
export async function sendFameLinkArtistVerificationEmail(
	data: FameLinkArtistRegistrationEmailData,
): Promise<boolean> {
	const { artistName, artistId, email, verificationToken } = data;

	const baseUrl = getBaseUrl();
	const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(
		verificationToken,
	)}&type=artist`;
	const loginUrl = `${baseUrl}/`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - FameLink</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .email-icon {
      width: 64px;
      height: 64px;
      background: #3b82f6;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 10px;
      font-size: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .info-box {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FameLink</div>
    </div>
    
    <div class="email-icon">✉️</div>
    
    <h1 style="text-align: center;">Verify Your Email</h1>
    <p style="text-align: center; color: #6b7280; font-size: 16px;">Welcome to FameLink, ${artistName}!</p>
    
    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        ✅ Your artist account has been created successfully! Please verify your email address to complete your registration.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verify Email Address</a>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Your Account Details:</h3>
      <ul style="color: #4b5563; line-height: 2;">
        <li><strong>Artist Name:</strong> ${artistName}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
    </div>
    
    <div class="note">
      <p style="margin: 0; color: #92400e; font-weight: 600;">📝 What's next?</p>
      <ol style="color: #78350f; margin: 10px 0 0; padding-left: 20px;">
        <li>Click the verification button above to verify your email</li>
        <li>Once verified, you can log in to your FameLink dashboard</li>
        <li>Create your show profiles and start sharing your FameLinks!</li>
      </ol>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #9333ea; word-break: break-all;">${verificationUrl}</a>
    </p>
    
    <div class="footer">
      <p>If you didn't create this account, please ignore this email.</p>
      <p style="margin-top: 10px;">© ${new Date().getFullYear()} FameLink. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
Verify Your Email - FameLink

Welcome to FameLink, ${artistName}!

Your artist account has been created successfully! Please verify your email address to complete your registration.

Verify your email by clicking this link:
${verificationUrl}

Your Account Details:
- Artist Name: ${artistName}
- Email: ${email}

What's next?
1. Click the verification link above to verify your email
2. Once verified, you can log in to your FameLink dashboard
3. Create your show profiles and start sharing your FameLinks!

If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} FameLink. All rights reserved.
  `;

	return sendEmail({
		to: email,
		subject: "Verify Your Email - FameLink",
		html,
		text,
	});
}

/**
 * Send access grant email to invited user
 */
interface AccessGrantEmailData {
	email: string;
	eventName: string;
	accessTypes: string[];
	accessLink: string;
	grantedBy: string;
}

export async function sendAccessGrantEmail(
	data: AccessGrantEmailData,
): Promise<boolean> {
	const { email, eventName, accessTypes, accessLink, grantedBy } = data;

	const accessBadges = accessTypes
		.map((type) => {
			const colorMap: Record<string, string> = {
				"Full Access": "#9333ea",
				"Artist Management": "#3b82f6",
				Rehearsal: "#10b981",
				"Performance Order": "#ec4899",
				"MC Page": "#f97316",
				"DJ Page": "#06b6d4",
			};
			const color = colorMap[type] || "#6b7280";
			return `<span style="display:inline-block;background:${color};color:white;padding:4px 12px;border-radius:16px;font-size:13px;font-weight:600;margin:4px 4px 4px 0;">${type}</span>`;
		})
		.join("");

	// Build individual page list items for the email
	const iconMap: Record<string, string> = {
		"Full Access": "⭐",
		"Artist Management": "👥",
		Rehearsal: "🎵",
		"Performance Order": "📋",
		"MC Page": "🎤",
		"DJ Page": "🎧",
	};

	const descriptionMap: Record<string, string> = {
		"Full Access": "Access to all event management pages",
		"Artist Management": "Manage artists and submissions",
		Rehearsal: "Plan and organize rehearsal times",
		"Performance Order": "Set performance order and timing",
		"MC Page": "MC dashboard and cue management",
		"DJ Page": "DJ dashboard and music management",
	};

	// If full access, expand to show all pages
	const displayTypes = accessTypes.includes("Full Access")
		? [
				"Artist Management",
				"Rehearsal",
				"Performance Order",
				"MC Page",
				"DJ Page",
			]
		: accessTypes;

	const pageListItems = displayTypes
		.map((type) => {
			const icon = iconMap[type] || "📄";
			const description = descriptionMap[type] || "";
			const borderColorMap: Record<string, string> = {
				"Artist Management": "#3b82f6",
				Rehearsal: "#10b981",
				"Performance Order": "#ec4899",
				"MC Page": "#f97316",
				"DJ Page": "#06b6d4",
			};
			const borderColor = borderColorMap[type] || "#9333ea";
			return `
        <div style="display:flex;align-items:center;padding:14px 16px;background:#f9fafb;border-radius:10px;margin-bottom:8px;border-left:4px solid ${borderColor};">
          <span style="font-size:24px;margin-right:14px;flex-shrink:0;">${icon}</span>
          <div>
            <div style="font-weight:600;color:#1f2937;font-size:15px;margin-bottom:2px;">${type}</div>
            <div style="font-size:13px;color:#6b7280;">${description}</div>
          </div>
        </div>`;
		})
		.join("");

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Access Granted - FAME</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 36px;
      font-weight: 800;
      color: white;
      letter-spacing: 3px;
      margin-bottom: 8px;
    }
    .header-subtitle {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      font-weight: 500;
    }
    .body {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .intro {
      color: #6b7280;
      font-size: 15px;
      margin-bottom: 24px;
    }
    .event-card {
      background: linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%);
      border: 2px solid #e9d5ff;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .event-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9333ea;
      margin-bottom: 6px;
    }
    .event-name {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 16px;
    }
    .access-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
      color: white !important;
      text-decoration: none;
      padding: 16px 48px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(147,51,234,0.4);
    }
    .pages-section {
      margin: 24px 0;
    }
    .pages-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .steps {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .steps-title {
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      font-size: 15px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .step-number {
      width: 24px;
      height: 24px;
      background: #9333ea;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .step-text {
      color: #4b5563;
      font-size: 14px;
      padding-top: 2px;
    }
    .footer {
      text-align: center;
      padding: 24px 30px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    .granted-by {
      color: #9ca3af;
      font-size: 13px;
      margin: 16px 0 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FAME</div>
      <div class="header-subtitle">Event Management Platform</div>
    </div>
    
    <div class="body">
      <div class="greeting">🎉 You've Been Granted Access!</div>
      <p class="intro">You've been invited to access event management pages. Click the button below to get started.</p>
      
      <div class="event-card">
        <div class="event-label">Event</div>
        <div class="event-name">${eventName}</div>
        <p class="granted-by">Invited by <strong>${grantedBy}</strong></p>
      </div>

      <div class="pages-section">
        <div class="pages-title">📄 Your Accessible Pages</div>
        ${pageListItems}
      </div>
      
      <div class="cta-container">
        <a href="${accessLink}" class="cta-button">Access Your Pages →</a>
      </div>
      
      <div class="steps">
        <div class="steps-title">📋 How it works</div>
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-text">Click <strong>"Access Your Pages"</strong> above</div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-text">If you already have a FAME account, you'll be logged in automatically. Otherwise, you'll be guided to create one.</div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-text">You'll see a hub page with all your accessible pages — click any page to start managing.</div>
        </div>
      </div>
      
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
        This link is personal and should not be shared with others. If you believe you received this email by mistake, you can safely ignore it.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">© ${new Date().getFullYear()} FAME. All rights reserved.</p>
      <p style="margin: 8px 0 0;">Event Management Platform</p>
    </div>
  </div>
</body>
</html>
  `;

	const text = `
You've Been Granted Access!

You've been invited to access event management pages for ${eventName}.

Your Accessible Pages:
${displayTypes.map((t) => `- ${t}`).join("\n")}

Invited by: ${grantedBy}

Click the link below to access your pages:
${accessLink}

How it works:
1. Click the link above
2. If you have a FAME account, you'll be logged in. Otherwise, create one.
3. You'll see a hub with all your accessible pages.

This link is personal and should not be shared.

© ${new Date().getFullYear()} FAME. All rights reserved.
  `;

	return sendEmail({
		to: email,
		subject: `🎉 You've been granted access to ${eventName} - FAME`,
		html,
		text,
	});
}

/**
 * Send contract invitation email to a FameLink artist
 */
export async function sendContractInvitationEmail(data: {
	artistEmail: string;
	artistName: string;
	eventName: string;
	eventDates: string;
	location: string;
	organizerName: string;
	role: string;
	famelinkArtistId: string;
}): Promise<boolean> {
	const baseUrl = getBaseUrl();
	const dashboardUrl = `${baseUrl}/famelink/${data.famelinkArtistId}?tab=invites`;

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0618;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#c084fc;font-size:28px;margin:0;">FAME<span style="color:#f472b6;">LINK</span></h1>
  </div>
  <div style="background:rgba(15,10,30,0.9);border:1px solid rgba(168,85,247,0.3);border-radius:16px;padding:32px;">
    <h2 style="color:#ffffff;font-size:22px;margin:0 0 8px;">🎉 New Event Invitation!</h2>
    <p style="color:rgba(196,181,253,0.7);font-size:14px;margin:0 0 24px;">You've been invited to perform at an event.</p>
    <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#ffffff;font-size:18px;margin:0 0 12px;">${data.eventName}</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:rgba(196,181,253,0.5);font-size:13px;padding:4px 0;">📅 Dates</td><td style="color:#ffffff;font-size:13px;padding:4px 0;text-align:right;">${data.eventDates}</td></tr>
        <tr><td style="color:rgba(196,181,253,0.5);font-size:13px;padding:4px 0;">📍 Location</td><td style="color:#ffffff;font-size:13px;padding:4px 0;text-align:right;">${data.location}</td></tr>
        <tr><td style="color:rgba(196,181,253,0.5);font-size:13px;padding:4px 0;">🏢 Organizer</td><td style="color:#ffffff;font-size:13px;padding:4px 0;text-align:right;">${data.organizerName}</td></tr>
        <tr><td style="color:rgba(196,181,253,0.5);font-size:13px;padding:4px 0;">🎭 Role</td><td style="color:#ffffff;font-size:13px;padding:4px 0;text-align:right;">${data.role}</td></tr>
      </table>
    </div>
    <p style="color:rgba(196,181,253,0.6);font-size:14px;margin:0 0 24px;">
      Please review the invitation details, agreement terms, and complete your profile information in your FameLink dashboard.
    </p>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">
        View Invitation →
      </a>
    </div>
  </div>
  <p style="color:rgba(196,181,253,0.3);font-size:12px;text-align:center;margin-top:24px;">
    © ${new Date().getFullYear()} FAME. All rights reserved.
  </p>
</div>
</body>
</html>`;

	const text = `New Event Invitation - ${data.eventName}\n\nHi ${data.artistName},\n\nYou've been invited to ${data.eventName} (${data.eventDates}, ${data.location}) by ${data.organizerName} as ${data.role}.\n\nView your invitation: ${dashboardUrl}`;

	return sendEmail({
		to: data.artistEmail,
		subject: `🎉 New Event Invitation: ${data.eventName} - FameLink`,
		html,
		text,
	});
}

/**
 * Send password reset email to FameLink artist
 */
export async function sendArtistPasswordResetEmail(data: {
	email: string;
	artistName: string;
	resetUrl: string;
}): Promise<boolean> {
	const { email, artistName, resetUrl } = data;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - FameLink</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0520;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0520;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(135deg,#1a0a2e 0%,#16082b 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="color:white;font-size:20px;font-weight:800;">FM</span>
              </div>
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;">Reset Your Password</h1>
              <p style="color:#a78bfa;font-size:14px;margin:0;">Hi ${artistName}, we received a password reset request for your FameLink account.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Click the button below to set a new password. This link will expire in <strong style="color:#e9d5ff;">1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#9333ea,#ec4899);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
                If you didn't request this, you can safely ignore this email. Your password will not change.
              </p>
              <div style="margin-top:20px;padding:12px;background:rgba(139,92,246,0.08);border-radius:8px;border:1px solid rgba(139,92,246,0.15);">
                <p style="color:#9ca3af;font-size:11px;margin:0;word-break:break-all;">
                  If the button doesn't work, copy this link:<br/>
                  <a href="${resetUrl}" style="color:#a78bfa;text-decoration:underline;">${resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(139,92,246,0.1);text-align:center;">
              <p style="color:#6b7280;font-size:11px;margin:0;">Powered by FAME &middot; FameLink Artist Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	return sendEmail({
		to: email,
		subject: "Reset Your FameLink Password",
		html,
		text: `Hi ${artistName}, click this link to reset your password: ${resetUrl} — This link expires in 1 hour.`,
	});
}

/**
 * Send login credentials to an artist whose account was created directly by a
 * stage manager (e.g. from the Artist Files "Create Artist" flow) with a
 * brand-new email that had no existing FameLink account.
 */
export async function sendArtistCredentialsEmail(data: {
	email: string;
	artistName: string;
	password: string;
	eventName?: string;
}): Promise<boolean> {
	const { email, artistName, password, eventName } = data;
	const baseUrl = getBaseUrl();
	const loginUrl = `${baseUrl}/famelink-auth`;

	const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your FameLink Account is Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0520;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0520;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(135deg,#1a0a2e 0%,#16082b 100%);border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="color:white;font-size:20px;font-weight:800;">FM</span>
              </div>
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;">Your FameLink Account is Ready</h1>
              <p style="color:#a78bfa;font-size:14px;margin:0;">
                Hi ${artistName}, an account has been created for you${eventName ? ` for <strong style="color:#e9d5ff;">${eventName}</strong>` : ""} on FameLink.
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 20px;">
                You can log in now using the credentials below:
              </p>
              <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">Email</p>
                <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0 0 14px;word-break:break-all;">${email}</p>
                <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">Temporary Password</p>
                <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0;font-family:monospace;">${password}</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#9333ea,#ec4899);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Log In to FameLink
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
                For your security, we recommend resetting your password after logging in. You can do this anytime from the login page using "Forgot password".
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(139,92,246,0.1);text-align:center;">
              <p style="color:#6b7280;font-size:11px;margin:0;">Powered by FAME &middot; FameLink Artist Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	return sendEmail({
		to: email,
		subject: "Your FameLink Account is Ready — Login Details Inside",
		html,
		text: `Hi ${artistName}, an account has been created for you on FameLink.\n\nEmail: ${email}\nTemporary Password: ${password}\n\nLog in at: ${loginUrl}\n\nWe recommend resetting your password after logging in via "Forgot password" on the login page.`,
	});
}
