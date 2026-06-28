/**
 * Utility functions for generating artist login URLs and handling credentials
 */
import { getBaseUrl } from "./url-utils";

export interface ArtistLoginCredentials {
	artistId: string;
	artistName: string;
	email: string;
}

/**
 * Generate a complete artist login URL with pre-filled credentials
 */
export function generateArtistLoginUrl(
	credentials: ArtistLoginCredentials,
	baseUrl?: string
): string {
	const base =
		baseUrl ||
		(typeof window !== "undefined"
			? window.location.origin
			: getBaseUrl());
	const loginPath = "/famelink-auth";

	const params = new URLSearchParams({
		artistId: credentials.artistId,
		artistName: credentials.artistName,
		email: credentials.email,
	});

	return `${base}${loginPath}?${params.toString()}`;
}

/**
 * Generate formatted artist login info text for copying/sharing
 */
export function generateArtistLoginInfo(
	credentials: ArtistLoginCredentials,
	eventName?: string,
	baseUrl?: string
): string {
	const loginUrl = generateArtistLoginUrl(credentials, baseUrl);

	return `🎭 *FAME Artist Login Info*

*Event:* ${eventName || "Performance Event"}

*Your Login Credentials:*
• *Artist ID:* ${credentials.artistId}
• *Artist Name:* ${credentials.artistName}
• *Email:* ${credentials.email}

*Login Link:* ${loginUrl}

Please use these credentials to access your artist dashboard. If you have any questions, contact the stage manager.`;
}

/**
 * Parse artist credentials from URL parameters
 */
export function parseArtistCredentialsFromUrl(): Partial<ArtistLoginCredentials> {
	if (typeof window === "undefined") return {};

	const urlParams = new URLSearchParams(window.location.search);
	const hashParams = new URLSearchParams(window.location.hash.substring(1));

	// Try multiple parameter name variations
	const getParam = (names: string[]) => {
		for (const name of names) {
			const urlValue = urlParams.get(name);
			if (urlValue) return urlValue;

			const hashValue = hashParams.get(name);
			if (hashValue) return hashValue;
		}
		return null;
	};

	return {
		artistId: getParam(["artistId", "artist_id", "id"]) || undefined,
		artistName:
			getParam(["artistName", "artist_name", "name"]) || undefined,
		email: getParam(["email", "mail"]) || undefined,
	};
}

/**
 * Check if all required credentials are present
 */
export function hasCompleteCredentials(
	credentials: Partial<ArtistLoginCredentials>
): credentials is ArtistLoginCredentials {
	return !!(
		credentials.artistId &&
		credentials.artistName &&
		credentials.email
	);
}
