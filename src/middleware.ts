import { NextRequest, NextResponse } from "next/server";

// Types for middleware (avoiding imports that might cause edge runtime issues)
type UserRole = "super_admin" | "stage_manager" | "artist" | "dj";
type UserStatus =
	| "active"
	| "pending"
	| "suspended"
	| "deactivated"
	| "rejected";

interface SessionData {
	userId: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	eventId?: string;
}

// Access grant cookie data structure
interface AccessGrantCookieData {
	grantId: string;
	eventId: string;
	email: string;
	accessTypes: string[];
	verifiedAt: string;
}

// Access type to allowed sub-paths mapping (must match access-grant.ts)
const ACCESS_TYPE_PATHS: Record<string, string[]> = {
	full_access: [
		"artists",
		"rehearsal",
		"performance-order",
		"performance-order/mc",
		"performance-order/dj",
	],
	artist_management: ["artists"],
	rehearsal: ["rehearsal"],
	performance_order: ["performance-order"],
	mc_page: ["performance-order/mc"],
	dj_page: ["performance-order/dj"],
};

// Define protected routes and their required roles
const PROTECTED_ROUTES: Record<string, UserRole> = {
	"/stage-manager": "stage_manager",
	"/super-admin": "super_admin",
	"/dj": "dj",
};

// Routes that require authentication but no specific role
const AUTH_REQUIRED_ROUTES = ["/profile", "/settings", "/logout"];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
	"/",
	"/login",
	"/register",
	"/about",
	"/contact",
	"/events/register", // Artist registration pages
	"/artist-register", // Artist registration welcome and form pages
	"/famelink-auth", // Artist login page (updated from /artist-login)
	"/artist-splash", // Artist splash page
	"/artist-edit", // Artist edit page (accessed by stage managers in new tab)
	"/forgot-password", // Password reset pages
	"/forgot-password-pending",
	"/verify-email", // Email verification
	"/stagemanager-login", // Stage manager login page (FameManager)
	"/stagemanager-register", // Stage manager registration page (FameManager)
	"/join-event", // Public event join landing page (link-based, no auth needed)
	"/famelink-auth", // FameLink artist login/signup
	"/famelink", // FameLink artist dashboard (auth checked inside page)
	"/event-request", // Event request response page
	"/event-request/invitation", // Event invitation form page
	"/event", // Event management pages (confirmed-lineup, logistics, analytics, workshop-schedule)
	"/show", // Public show page
	"/super-admin-login", // Super admin login page
	"/famelink-admin", // FameLink admin dashboard (requested public)
];

// Status-specific redirect routes
const STATUS_ROUTES: Record<UserStatus, string> = {
	pending: "/stage-manager-pending", // Updated for stage managers
	suspended: "/account-suspended",
	deactivated: "/account-deactivated",
	rejected: "/account-rejected", // Rejected users
	active: "", // No redirect needed for active users
};

// Import session config for cookie names
import { SESSION_CONFIG } from "@/lib/constants";

// Session extraction — stage manager / admin / DJ cookie
function getSessionFromRequest(request: NextRequest): SessionData | null {
	try {
		const sessionCookie = request.cookies.get(SESSION_CONFIG.COOKIE_NAME);
		if (!sessionCookie?.value) return null;

		// Use a try-catch for the atob/JSON parse
		const sessionString = atob(sessionCookie.value);
		const data = JSON.parse(sessionString);

		if (
			data &&
			typeof data.userId === "string" &&
			typeof data.email === "string" &&
			typeof data.role === "string" &&
			typeof data.status === "string" &&
			["super_admin", "stage_manager", "artist", "dj"].includes(data.role) &&
			["active", "pending", "suspended", "deactivated", "rejected"].includes(data.status)
		) {
			return data as SessionData;
		}
		return null;
	} catch {
		return null;
	}
}

// Session extraction — artist-only cookie
function getArtistSessionFromRequest(request: NextRequest): SessionData | null {
	try {
		const sessionCookie = request.cookies.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
		if (!sessionCookie?.value) return null;

		const sessionString = atob(sessionCookie.value);
		const data = JSON.parse(sessionString);

		if (
			data &&
			typeof data.userId === "string" &&
			typeof data.email === "string" &&
			data.role === "artist" &&
			typeof data.status === "string" &&
			["active", "pending", "suspended", "deactivated", "rejected"].includes(data.status)
		) {
			return data as SessionData;
		}
		return null;
	} catch {
		return null;
	}
}


export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// DEBUG: Log cookies for troubleshooting on VPS
	const smCookie = request.cookies.get(SESSION_CONFIG.COOKIE_NAME);
	const artistCookie = request.cookies.get(SESSION_CONFIG.ARTIST_COOKIE_NAME);
	console.log(`[MIDDLEWARE] Path: ${pathname}, SM Cookie: ${smCookie ? "Present" : "Missing"}, Artist Cookie: ${artistCookie ? "Present" : "Missing"}`);

	// 1. Handle common typos/old routes
	if (pathname === "/stage_manager") {
		return NextResponse.redirect(new URL("/stage-manager", request.url));
	}

	// Skip middleware for API routes, static files, and Next.js internals
	if (
		pathname.startsWith("/api/") ||
		pathname.startsWith("/_next/") ||
		pathname.startsWith("/favicon.ico") ||
		pathname.includes(".")
	) {
		return NextResponse.next();
	}

	// ── Artist-specific routes: use the artist cookie ONLY ────────────────────
	const isArtistRoute =
		pathname.startsWith("/artist-dashboard") ||
		pathname.startsWith("/famelink") ||
		pathname.startsWith("/famelink-auth") ||
		pathname.startsWith("/artist-register") ||
		pathname.startsWith("/artist-splash") ||
		pathname.startsWith("/artist-edit") ||
		pathname.startsWith("/join-event") ||     // "Complete Setup" button lands here
		pathname.startsWith("/event-request");

	if (isArtistRoute) {
		// For artist routes, we check BOTH cookies. 
		// Artists from FameLink auth use 'fame-session', while legacy artists use 'fame-artist-session'.
		const artistSession = getArtistSessionFromRequest(request) || getSessionFromRequest(request);

		// Redirect logged-in artists away from login/register pages
		// BUT only if there's no special redirect flow in progress (join event, etc)
		if (
			artistSession && artistSession.role === "artist" &&
			(pathname === "/famelink-auth" || pathname === "/artist-register")
		) {
			const searchParams = request.nextUrl.searchParams;
			const hasRedirectFlow =
				searchParams.has("joinEventId") ||
				searchParams.has("eventRequestId") ||
				searchParams.has("redirect");

			if (!hasRedirectFlow) {
				console.log(`[MIDDLEWARE] Redirecting logged-in artist ${artistSession.userId} to dashboard`);
				return NextResponse.redirect(new URL(`/famelink/${artistSession.userId}`, request.url));
			}

			// If there IS a redirect flow, let the page handle it
			return NextResponse.next();
		}

		// Protect actual artist dashboard — require an artist session
		const isProtectedArtistPage = pathname.startsWith("/artist-dashboard") || pathname.startsWith("/famelink/");
		if (!artistSession && isProtectedArtistPage) {
			console.log(`[MIDDLEWARE] Access denied to artist page ${pathname} (No session)`);
			return NextResponse.redirect(
				new URL(`/famelink-auth?redirect=${encodeURIComponent(pathname)}`, request.url),
			);
		}

		// If they have a session but it's NOT an artist (e.g. Stage Manager trying to see artist dashboard)
		// we allow them to see it if it's a public-ish view, but protect the dashboard
		if (artistSession && artistSession.role !== "artist" && isProtectedArtistPage) {
			// Stage Managers can see /famelink/[id] but not /artist-dashboard
			if (pathname.startsWith("/artist-dashboard")) {
				return NextResponse.redirect(new URL("/unauthorized", request.url));
			}
		}

		return NextResponse.next();
	}

	// ── Stage manager / admin / DJ routes: use the fame-session cookie ONLY ──
	const session = getSessionFromRequest(request);

	// Check if route is public
	if (isPublicRoute(pathname)) {
		// If stage manager is logged in and hits /login, redirect to dashboard
		if (session && pathname === "/login") {
			return redirectToDashboard(request, session);
		}

		// Redirect authenticated stage managers from /stagemanager-login to /stage-manager
		if (session && pathname === "/stagemanager-login" && session.role === "stage_manager") {
			return NextResponse.redirect(new URL("/stage-manager", request.url));
		}

		// Redirect authenticated super admins away from /super-admin-login
		if (session && pathname === "/super-admin-login" && session.role === "super_admin") {
			return NextResponse.redirect(new URL("/super-admin", request.url));
		}

		return NextResponse.next();

	}

	// Check if user is authenticated
	if (!session) {
		return redirectToLogin(request);
	}

	// Block artists from accessing stage manager routes
	if (session.role === "artist" && pathname.startsWith("/stage-manager")) {
		return NextResponse.redirect(new URL("/unauthorized", request.url));
	}

	// Block non-super-admins from accessing super-admin routes
	if (pathname.startsWith("/super-admin") && session.role !== "super_admin") {
		return redirectToLogin(request);
	}

	// Check user status and redirect if necessary
	if (session.status !== "active") {
		if (session.status === "pending" && session.role === "stage_manager") {
			if (pathname !== "/stage-manager-pending" && pathname !== "/stage-manager") {
				return NextResponse.redirect(new URL("/stage-manager-pending", request.url));
			}
			return NextResponse.next();
		}

		const statusRedirect = STATUS_ROUTES[session.status];
		if (statusRedirect && pathname !== statusRedirect) {
			return NextResponse.redirect(new URL(statusRedirect, request.url));
		}
		if (pathname === STATUS_ROUTES[session.status]) {
			return NextResponse.next();
		}
	}

	// Check if route requires specific role
	const requiredRole = getRequiredRole(pathname);
	if (requiredRole) {
		if (!hasRequiredRole(session.role, requiredRole)) {
			const grantAccess = checkAccessGrant(request, pathname);
			if (!grantAccess) {
				return redirectToUnauthorized(request);
			}
		}
	}

	if (requiresAuth(pathname) && !session) {
		return redirectToLogin(request);
	}

	return NextResponse.next();
}


// Helper functions
function isPublicRoute(pathname: string): boolean {
	// Allow public access to standalone dashboard views: DJ, MC, Lighting, Live Board, Organiser
	if (
		pathname.match(
			/^\/stage-manager\/events\/[^/]+\/performance-order\/(dj|mc|lighting|live-board|organiser)/,
		)
	) {
		return true;
	}

	return PUBLIC_ROUTES.some((route) => {
		if (route.endsWith("*")) {
			return pathname.startsWith(route.slice(0, -1));
		}
		return pathname === route || pathname.startsWith(route + "/");
	});
}

function getRequiredRole(pathname: string): UserRole | null {
	for (const [route, role] of Object.entries(PROTECTED_ROUTES)) {
		if (pathname === route || pathname.startsWith(route + "/")) {
			return role;
		}
	}
	return null;
}

function requiresAuth(pathname: string): boolean {
	return AUTH_REQUIRED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(route + "/"),
	);
}

function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
	const roleHierarchy: Record<UserRole, number> = {
		super_admin: 4,
		stage_manager: 3,
		dj: 2,
		artist: 1,
	};

	return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

function redirectToLogin(request: NextRequest): NextResponse {
	const { pathname } = request.nextUrl;
	// Super admin routes redirect to the super admin login portal
	if (pathname.startsWith("/super-admin")) {
		const loginUrl = new URL("/super-admin-login", request.url);
		loginUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(loginUrl);
	}
	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("redirect", pathname);
	return NextResponse.redirect(loginUrl);
}

function redirectToUnauthorized(request: NextRequest): NextResponse {
	return NextResponse.redirect(new URL("/unauthorized", request.url));
}

function redirectToDashboard(request: NextRequest, session: any): NextResponse {
	const dashboardUrl = getDashboardUrl(session.role);
	return NextResponse.redirect(new URL(dashboardUrl, request.url));
}

function getDashboardUrl(role: UserRole): string {
	switch (role) {
		case "super_admin":
			return "/super-admin";
		case "stage_manager":
			return "/stage-manager";
		case "dj":
			return "/dj";
		case "artist":
			return "/artist-dashboard";
		default:
			return "/";
	}
}

// Check if user has valid access grant for the given path
function checkAccessGrant(request: NextRequest, pathname: string): boolean {
	try {
		const grantCookie = request.cookies.get("fame-access-grant");
		if (!grantCookie?.value) return false;

		const grantData: AccessGrantCookieData = JSON.parse(
			atob(grantCookie.value),
		);
		if (
			!grantData ||
			!grantData.eventId ||
			!Array.isArray(grantData.accessTypes)
		) {
			return false;
		}

		// Check if the path matches /stage-manager/events/[eventId]/...
		const eventPathPrefix = `/stage-manager/events/`;
		if (!pathname.startsWith(eventPathPrefix)) return false;

		// Extract eventId and sub-path from the URL
		const afterPrefix = pathname.slice(eventPathPrefix.length);
		const slashIndex = afterPrefix.indexOf("/");
		if (slashIndex === -1) return false; // Just the event page, no sub-path

		const urlEventId = afterPrefix.slice(0, slashIndex);
		const subPath = afterPrefix.slice(slashIndex + 1).replace(/\/+$/, ""); // remove trailing slashes

		// Verify the grant is for this event
		if (grantData.eventId !== urlEventId) return false;

		// Check if access types allow this sub-path
		for (const accessType of grantData.accessTypes) {
			const allowedPaths = ACCESS_TYPE_PATHS[accessType];
			if (!allowedPaths) continue;

			for (const allowed of allowedPaths) {
				if (subPath === allowed || subPath.startsWith(allowed + "/")) {
					return true;
				}
			}
		}

		return false;
	} catch (error) {
		console.error("Error checking access grant:", error);
		return false;
	}
}

// Configure which paths the middleware should run on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
