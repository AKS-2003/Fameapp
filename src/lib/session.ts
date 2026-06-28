import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SessionData } from "@/types";
import { SESSION_CONFIG } from "./constants";
import { isValidSession } from "./auth";

// Encrypt/decrypt utilities (simple base64 for now, can be enhanced with proper encryption)
function encryptSession(data: SessionData): string {
	const sessionString = JSON.stringify(data);
	// Use btoa for browser compatibility and edge runtime
	return typeof btoa !== "undefined"
		? btoa(sessionString)
		: Buffer.from(sessionString).toString("base64");
}

function decryptSession(encryptedData: string): SessionData | null {
	try {
		// Use atob for browser compatibility and edge runtime
		const sessionString =
			typeof atob !== "undefined"
				? atob(encryptedData)
				: Buffer.from(encryptedData, "base64").toString("utf-8");

		const data = JSON.parse(sessionString);
		console.log("[SESSION] Decrypted data:", { userId: data.userId, role: data.role, status: data.status });

		if (isValidSession(data)) {
			return data;
		}
		console.warn("[SESSION] Invalid session data structure");

		return null;
	} catch (error) {
		console.error("Error decrypting session:", error);
		return null;
	}
}

// Server-side session management (for API routes and server components)
export async function createSession(sessionData: SessionData): Promise<void> {
	const cookieStore = await cookies();
	const encryptedSession = encryptSession(sessionData);

	cookieStore.set(SESSION_CONFIG.COOKIE_NAME, encryptedSession, {
		httpOnly: SESSION_CONFIG.HTTP_ONLY,
		secure: SESSION_CONFIG.SECURE,
		maxAge: SESSION_CONFIG.MAX_AGE,
		path: "/",
	});
}

export async function getSession(): Promise<SessionData | null> {
	try {
		const cookieStore = await cookies();
		// STRICTLY reads the stage manager / admin / DJ cookie only.
		// Artist sessions are NOT returned here — use getArtistSession() instead.
		const smCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);
		if (!smCookie?.value) return null;
		return decryptSession(smCookie.value);
	} catch (error) {
		console.error("Error getting session:", error);
		return null;
	}
}

/**
 * getAnySession — for shared endpoints that accept BOTH stage managers AND artists.
 * Example: /api/auth/me, /api/notifications
 * Priority: stage manager cookie first, then artist cookie.
 */
export async function getAnySession(): Promise<SessionData | null> {
	try {
		const cookieStore = await cookies();
		const smCookie = cookieStore.get(SESSION_CONFIG.COOKIE_NAME);
		if (smCookie?.value) {
			const data = decryptSession(smCookie.value);
			if (data) return data;
		}
		const artistCookie = cookieStore.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
		if (artistCookie?.value) {
			const data = decryptSession(artistCookie.value);
			if (data && data.role === "artist") return data;
		}
		return null;
	} catch (error) {
		console.error("Error getting any session:", error);
		return null;
	}
}

export async function destroySession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_CONFIG.COOKIE_NAME);
}

// ── Artist-specific session (uses a SEPARATE cookie to prevent cross-role bleed) ──

export async function createArtistSession(sessionData: SessionData): Promise<void> {
	const cookieStore = await cookies();
	const encryptedSession = encryptSession(sessionData);
	cookieStore.set(SESSION_CONFIG.ARTIST_COOKIE_NAME, encryptedSession, {
		httpOnly: SESSION_CONFIG.HTTP_ONLY,
		secure: SESSION_CONFIG.SECURE,
		maxAge: SESSION_CONFIG.MAX_AGE,
		path: "/",
	});
}

export async function getArtistSession(): Promise<SessionData | null> {
	try {
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
		if (!sessionCookie?.value) return null;
		const data = decryptSession(sessionCookie.value);
		// Safety: never return a non-artist session from this function
		if (data && data.role !== "artist") return null;
		return data;
	} catch {
		return null;
	}
}

export async function destroyArtistSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_CONFIG.ARTIST_COOKIE_NAME);
}

export function createArtistSessionResponse(
	sessionData: SessionData,
	response: NextResponse = new NextResponse()
): NextResponse {
	const encryptedSession = encryptSession(sessionData);
	response.cookies.set(SESSION_CONFIG.ARTIST_COOKIE_NAME, encryptedSession, {
		httpOnly: SESSION_CONFIG.HTTP_ONLY,
		secure: SESSION_CONFIG.SECURE,
		maxAge: SESSION_CONFIG.MAX_AGE,
		path: "/",
	});
	return response;
}

export function destroyArtistSessionResponse(
	response: NextResponse = new NextResponse()
): NextResponse {
	response.cookies.delete(SESSION_CONFIG.ARTIST_COOKIE_NAME);
	return response;
}


// Client-side session management (for middleware and client components)
export function createSessionResponse(
	sessionData: SessionData,
	response: NextResponse = new NextResponse()
): NextResponse {
	const encryptedSession = encryptSession(sessionData);

	response.cookies.set(SESSION_CONFIG.COOKIE_NAME, encryptedSession, {
		httpOnly: SESSION_CONFIG.HTTP_ONLY,
		secure: SESSION_CONFIG.SECURE,
		maxAge: SESSION_CONFIG.MAX_AGE,
		path: "/",
	});
	return response;
}

export function getSessionFromRequest(
	request: NextRequest
): SessionData | null {
	try {
		// STRICTLY reads the stage manager / admin / DJ cookie only.
		// Use getAnySessionFromRequest() for endpoints that also accept artists.
		const smCookie = request.cookies.get(SESSION_CONFIG.COOKIE_NAME);
		if (!smCookie?.value) return null;
		return decryptSession(smCookie.value);
	} catch (error) {
		console.error("Error getting session from request:", error);
		return null;
	}
}

export function getArtistSessionFromRequest(
	request: NextRequest
): SessionData | null {
	try {
		const artistCookie = request.cookies.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
		if (!artistCookie?.value) return null;
		const data = decryptSession(artistCookie.value);
		if (data && data.role !== "artist") return null;
		return data;
	} catch (error) {
		console.error("Error getting artist session from request:", error);
		return null;
	}
}

/**
 * getAnySessionFromRequest — for shared endpoints (e.g. /api/auth/me)
 * that accept both stage managers and artists.
 */
export function getAnySessionFromRequest(
	request: NextRequest,
	priorityRole?: string
): SessionData | null {
	try {
		// If artist is prioritized, check artist cookie first
		if (priorityRole === "artist") {
			const artistCookie = request.cookies.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
			if (artistCookie?.value) {
				const data = decryptSession(artistCookie.value);
				if (data && data.role === "artist") return data;
			}
			const smCookie = request.cookies.get(SESSION_CONFIG.COOKIE_NAME);
			if (smCookie?.value) {
				return decryptSession(smCookie.value);
			}
			return null;
		}

		// Default priority: Stage Manager / Admin first
		const smCookie = request.cookies.get(SESSION_CONFIG.COOKIE_NAME);
		if (smCookie?.value) {
			const data = decryptSession(smCookie.value);
			if (data) return data;
		}
		const artistCookie = request.cookies.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
		if (artistCookie?.value) {
			const data = decryptSession(artistCookie.value);
			if (data && data.role === "artist") return data;
		}
		return null;
	} catch (error) {
		console.error("Error getting any session from request:", error);
		return null;
	}
}

// Alias for getSessionFromRequest for API compatibility
export function getSessionData(
	request: NextRequest
): Promise<SessionData | null> {
	return Promise.resolve(getSessionFromRequest(request));
}

export function destroySessionResponse(
	response: NextResponse = new NextResponse()
): NextResponse {
	response.cookies.delete(SESSION_CONFIG.COOKIE_NAME);
	return response;
}

// Session validation helpers
export function isSessionExpired(sessionData: SessionData): boolean {
	// For now, we rely on cookie expiration
	// Could add timestamp checking here if needed
	return false;
}

export function requireActiveSession(
	sessionData: SessionData | null
): SessionData {
	if (!sessionData) {
		throw new Error("No active session");
	}

	if (sessionData.status !== "active") {
		throw new Error(`Account status: ${sessionData.status}`);
	}

	if (isSessionExpired(sessionData)) {
		throw new Error("Session expired");
	}

	return sessionData;
}

export function requireRole(
	sessionData: SessionData | null,
	requiredRole: string
): SessionData {
	const session = requireActiveSession(sessionData);

	const roleHierarchy: Record<string, number> = {
		super_admin: 4,
		stage_manager: 3,
		dj: 2,
		artist: 1,
	};

	const userLevel = roleHierarchy[session.role] || 0;
	const requiredLevel = roleHierarchy[requiredRole] || 0;

	if (userLevel < requiredLevel) {
		throw new Error(
			`Insufficient permissions. Required: ${requiredRole}, Current: ${session.role}`
		);
	}

	return session;
}
