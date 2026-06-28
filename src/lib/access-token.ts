/**
 * Access Token Utility
 * Generates and verifies secure tokens for access grants
 * Uses HMAC-SHA256 signing with a server-side secret
 */

import crypto from "crypto";
import { AccessGrantTokenPayload, AccessType } from "./types/access-grant";

// Token expiry: 90 days
const TOKEN_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Get the signing secret from environment or use a fallback
 */
function getSecret(): string {
	return (
		process.env.ACCESS_TOKEN_SECRET ||
		process.env.RESEND_API_KEY ||
		"fame-access-grant-default-secret-change-me"
	);
}

/**
 * Create an HMAC-SHA256 signature for the given data
 */
function sign(data: string): string {
	return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

/**
 * Generate a secure access grant token
 */
export function generateAccessToken(params: {
	grantId: string;
	eventId: string;
	email: string;
	accessTypes: AccessType[];
}): string {
	const payload: AccessGrantTokenPayload = {
		grantId: params.grantId,
		eventId: params.eventId,
		email: params.email,
		accessTypes: params.accessTypes,
		exp: Date.now() + TOKEN_EXPIRY_MS,
	};

	const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const signature = sign(payloadStr);

	return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an access grant token
 * Returns the payload if valid, null if invalid or expired
 */
export function verifyAccessToken(
	token: string,
): AccessGrantTokenPayload | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 2) {
			console.error("Invalid token format: expected 2 parts");
			return null;
		}

		const [payloadStr, signature] = parts;

		// Verify signature
		const expectedSignature = sign(payloadStr);
		if (signature !== expectedSignature) {
			console.error("Invalid token signature");
			return null;
		}

		// Decode payload
		const payloadJson = Buffer.from(payloadStr, "base64url").toString("utf-8");
		const payload: AccessGrantTokenPayload = JSON.parse(payloadJson);

		// Check expiry
		if (payload.exp && payload.exp < Date.now()) {
			console.error("Token expired");
			return null;
		}

		// Validate payload structure
		if (
			!payload.grantId ||
			!payload.eventId ||
			!payload.email ||
			!Array.isArray(payload.accessTypes)
		) {
			console.error("Invalid token payload structure");
			return null;
		}

		return payload;
	} catch (error) {
		console.error("Error verifying access token:", error);
		return null;
	}
}
