/**
 * URL Utilities for dynamic base URL generation
 * Automatically detects the correct base URL for localhost and production
 */

/**
 * Get the base URL for the application
 * - In production: Uses NEXT_PUBLIC_BASE_URL if set, otherwise uses the request headers
 * - In development: Uses localhost with the appropriate port
 * - For server-side: Can accept request headers to determine the URL
 */
export function getBaseUrl(headersList?: Headers): string {
	// 1. Highest priority: NEXT_PUBLIC_BASE_URL environment variable
	// This is the recommended way for production (e.g. VPS, Cloud Run)
	if (process.env.NEXT_PUBLIC_BASE_URL) {
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
		
		// Ensure it has a protocol
		if (!baseUrl.startsWith("http")) {
			return `https://${baseUrl}`;
		}
		
		// In production, ignore localhost values that were left in env by mistake
		if (
			process.env.NODE_ENV === "production" &&
			(baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1") || baseUrl.includes("0.0.0.0"))
		) {
			// Fall through to header detection / fallbacks
		} else {
			return baseUrl;
		}
	}

	// 2. Second priority: Request headers (dynamic detection)
	if (headersList) {
		const protocol = headersList.get("x-forwarded-proto") || "http";
		const host = headersList.get("x-forwarded-host") || headersList.get("host");
		
		if (host && !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes("0.0.0.0")) {
			// Determine if it's a raw IP address (v4)
			const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
			
			// If it has a port or is a raw IP, default to the detected protocol (usually http)
			// Only force https if it's a domain name without a port (typical production setup)
			const finalProtocol = (host.includes(":") || isIp) ? protocol : "https";
			return `${finalProtocol}://${host}`;
		}
		
		if (host) {
			return `${protocol}://${host}`;
		}
	}

	// 3. Client-side fallback if in browser
	if (typeof window !== "undefined") {
		const origin = window.location.origin;
		if (origin && !origin.includes("localhost") && !origin.includes("0.0.0.0") && !origin.includes("127.0.0.1")) {
			return origin;
		}
	}

	// 4. Fallback for production if no env or headers
	if (process.env.NODE_ENV === "production") {
		console.warn("⚠️ getBaseUrl: Production detected but NEXT_PUBLIC_BASE_URL is not set or invalid. Falling back to https://fameapp.cloud");
		return "https://fameapp.cloud";
	}

	// 5. Development environment - use localhost
	return "http://localhost:3000";
}

/**
 * Get the base URL for client-side usage
 * This should be used in browser/client components
 */
export function getClientBaseUrl(): string {
	// In the browser, we can use window.location
	if (typeof window !== "undefined") {
		return `${window.location.protocol}//${window.location.host}`;
	}

	// Fallback to environment variable
	if (process.env.NEXT_PUBLIC_BASE_URL) {
		return process.env.NEXT_PUBLIC_BASE_URL;
	}

	// Production fallback
	if (process.env.NODE_ENV === "production") {
		return "https://fameapp.cloud";
	}

	// Development fallback
	return "http://localhost:3000";
}
