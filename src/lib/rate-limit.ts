/**
 * Simple in-memory rate limiter for auth endpoints
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 10, // 10 requests per window
};

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., IP address or email)
 * @param config Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
	key: string,
	config: RateLimitConfig = DEFAULT_CONFIG,
): { allowed: boolean; remaining: number; resetAt: number } {
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	// Clean up expired entries periodically
	if (Math.random() < 0.01) {
		cleanupExpiredEntries();
	}

	if (!entry || now > entry.resetAt) {
		// Create new entry
		const newEntry: RateLimitEntry = {
			count: 1,
			resetAt: now + config.windowMs,
		};
		rateLimitStore.set(key, newEntry);
		return {
			allowed: true,
			remaining: config.maxRequests - 1,
			resetAt: newEntry.resetAt,
		};
	}

	// Check if limit exceeded
	if (entry.count >= config.maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.resetAt,
		};
	}

	// Increment count
	entry.count++;
	rateLimitStore.set(key, entry);

	return {
		allowed: true,
		remaining: config.maxRequests - entry.count,
		resetAt: entry.resetAt,
	};
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetAt) {
			rateLimitStore.delete(key);
		}
	}
}

/**
 * Get rate limit key from request
 * Uses IP address or forwarded IP
 */
export function getRateLimitKey(request: Request, prefix: string = ""): string {
	const forwarded = request.headers.get("x-forwarded-for");
	const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
	return `${prefix}:${ip}`;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
	// Auth endpoints - stricter limits
	login: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5, // 5 attempts per window
	},
	register: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 3, // 3 registrations per hour
	},
	passwordReset: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 3, // 3 reset requests per hour
	},
	// API endpoints - more lenient
	api: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 60, // 60 requests per minute
	},
};

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
	remaining: number,
	resetAt: number,
): Record<string, string> {
	return {
		"X-RateLimit-Remaining": remaining.toString(),
		"X-RateLimit-Reset": Math.ceil(resetAt / 1000).toString(),
	};
}
