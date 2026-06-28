import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/access-token";
import { EventDataService } from "@/lib/storage-service";
import { AccessGrant, AccessGrantCookieData } from "@/lib/types/access-grant";
import { SESSION_CONFIG } from "@/lib/constants";

const ACCESS_GRANT_COOKIE = "fame-access-grant";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

// GET /api/access/verify?token=... - Verify access token and redirect
export async function GET(request: NextRequest) {
	try {
		const token = request.nextUrl.searchParams.get("token");

		if (!token) {
			return redirectToError(request, "Missing access token");
		}

		// Verify token
		const payload = verifyAccessToken(token);
		if (!payload) {
			return redirectToError(request, "Invalid or expired access link");
		}

		// Check grant exists in GCS and is active
		const grants = await EventDataService.getAccessGrants(payload.eventId);
		const grant = grants.find(
			(g: AccessGrant) =>
				g.id === payload.grantId && g.status === "active",
		);

		if (!grant) {
			return redirectToError(
				request,
				"This access grant has been revoked or does not exist",
			);
		}

		// Update last accessed
		const grantIndex = grants.findIndex(
			(g: AccessGrant) => g.id === payload.grantId,
		);
		if (grantIndex !== -1) {
			grants[grantIndex].lastAccessedAt = new Date().toISOString();
			await EventDataService.saveAccessGrants(payload.eventId, grants);
		}

		// Check if user has an active session
		const sessionCookie = request.cookies.get("fame-session");
		let hasSession = false;

		if (sessionCookie?.value) {
			try {
				const sessionString = atob(sessionCookie.value);
				const sessionData = JSON.parse(sessionString);
				if (
					sessionData &&
					sessionData.userId &&
					sessionData.status === "active"
				) {
					hasSession = true;
				}
			} catch {
				// Invalid session, proceed without
			}
		}

		// Create access grant cookie data
		const cookieData: AccessGrantCookieData = {
			grantId: payload.grantId,
			eventId: payload.eventId,
			email: payload.email,
			accessTypes: grant.accessTypes, // Use the latest from DB
			verifiedAt: new Date().toISOString(),
		};

		const encodedCookie = btoa(JSON.stringify(cookieData));

		// Determine redirect target using latest access types from DB: hub for multiple types, direct page for single type
		const effectiveTypes = grant.accessTypes.filter((t: string) => t !== "full_access");
		const isSinglePage = effectiveTypes.length === 1 && !grant.accessTypes.includes("full_access");
		const targetPage = isSinglePage
			? getDefaultPagePath(grant.accessTypes)
			: "access-hub";
		const eventPageUrl = `/stage-manager/events/${payload.eventId}/${targetPage}`;

		if (hasSession) {
			// User is logged in → set access grant cookie and redirect to event page
			const response = NextResponse.redirect(
				new URL(eventPageUrl, request.url),
			);

			response.cookies.set(ACCESS_GRANT_COOKIE, encodedCookie, {
				httpOnly: true,
				secure: SESSION_CONFIG.SECURE,
				maxAge: COOKIE_MAX_AGE,
				sameSite: "lax",
				path: "/",
			});

			return response;
		} else {
			// User is NOT logged in → redirect to login with token preserved
			const loginUrl = new URL("/stagemanager-login", request.url);
			loginUrl.searchParams.set("accessToken", token);
			loginUrl.searchParams.set("redirect", eventPageUrl);

			// Still set the cookie so it's available after login
			const response = NextResponse.redirect(loginUrl);

			response.cookies.set(ACCESS_GRANT_COOKIE, encodedCookie, {
				httpOnly: true,
				secure: SESSION_CONFIG.SECURE,
				maxAge: COOKIE_MAX_AGE,
				sameSite: "lax",
				path: "/",
			});

			return response;
		}
	} catch (error) {
		console.error("Error verifying access token:", error);
		return redirectToError(request, "An error occurred while processing your access link");
	}
}

function redirectToError(request: NextRequest, message: string) {
	const errorUrl = new URL("/stagemanager-login", request.url);
	errorUrl.searchParams.set("error", message);
	return NextResponse.redirect(errorUrl);
}

function getDefaultPagePath(accessTypes: string[]): string {
	if (accessTypes.includes("full_access")) return "artists";
	if (accessTypes.includes("artist_management")) return "artists";
	if (accessTypes.includes("rehearsal")) return "rehearsal";
	if (accessTypes.includes("performance_order")) return "performance-order";
	if (accessTypes.includes("mc_page")) return "performance-order/mc";
	if (accessTypes.includes("dj_page")) return "performance-order/dj";
	return "artists";
}
