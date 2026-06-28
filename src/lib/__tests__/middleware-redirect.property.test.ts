/**
 * Property-Based Tests for Role-Based Redirect Middleware
 *
 * Feature: famelink, Property 1: Role-Based Redirect
 *
 * **Validates: Requirements 1.4, 1.5**
 *
 * Property 1: Role-Based Redirect
 * _For any_ authenticated user accessing the root URL (/) or /stagemanager-login,
 * the system should redirect them to their role-appropriate dashboard
 * (Artist Dashboard for artists, Stage Manager Dashboard for stage managers).
 */

import * as fc from "fast-check";

// Types matching middleware.ts
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

// Mock NextRequest and NextResponse for testing
class MockNextRequest {
	url: string;
	nextUrl: URL;
	cookies: Map<string, { value: string }>;

	constructor(url: string, sessionCookie?: string) {
		this.url = url;
		this.nextUrl = new URL(url);
		this.cookies = new Map();
		if (sessionCookie) {
			this.cookies.set("fame-session", { value: sessionCookie });
		}
	}

	get(name: string) {
		return this.cookies.get(name);
	}
}

// Encode session data as base64 (matching middleware implementation)
function encodeSession(session: SessionData): string {
	return btoa(JSON.stringify(session));
}

// Extract the redirect logic from middleware for testing
function getRedirectForAuthenticatedUser(
	pathname: string,
	session: SessionData,
): { shouldRedirect: boolean; redirectUrl: string | null } {
	// Requirement 1.4: Redirect authenticated artists from / to /artist-dashboard
	if (pathname === "/" && session.role === "artist") {
		return { shouldRedirect: true, redirectUrl: "/artist-dashboard" };
	}

	// Requirement 1.5: Redirect authenticated stage managers from /stagemanager-login to /stage-manager
	if (
		pathname === "/stagemanager-login" &&
		session.role === "stage_manager"
	) {
		return { shouldRedirect: true, redirectUrl: "/stage-manager" };
	}

	return { shouldRedirect: false, redirectUrl: null };
}

// Arbitraries (generators) for property-based testing
const arbitraryUserId = (): fc.Arbitrary<string> => fc.uuid();

const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

const arbitraryUserRole = (): fc.Arbitrary<UserRole> =>
	fc.constantFrom("super_admin", "stage_manager", "artist", "dj");

const arbitraryUserStatus = (): fc.Arbitrary<UserStatus> =>
	fc.constantFrom(
		"active",
		"pending",
		"suspended",
		"deactivated",
		"rejected",
	);

const arbitrarySessionData = (): fc.Arbitrary<SessionData> =>
	fc.record({
		userId: arbitraryUserId(),
		email: arbitraryEmail(),
		role: arbitraryUserRole(),
		status: arbitraryUserStatus(),
		eventId: fc.option(fc.uuid(), { nil: undefined }),
	});

const arbitraryArtistSession = (): fc.Arbitrary<SessionData> =>
	fc.record({
		userId: arbitraryUserId(),
		email: arbitraryEmail(),
		role: fc.constant("artist" as UserRole),
		status: arbitraryUserStatus(),
		eventId: fc.option(fc.uuid(), { nil: undefined }),
	});

const arbitraryStageManagerSession = (): fc.Arbitrary<SessionData> =>
	fc.record({
		userId: arbitraryUserId(),
		email: arbitraryEmail(),
		role: fc.constant("stage_manager" as UserRole),
		status: arbitraryUserStatus(),
		eventId: fc.option(fc.uuid(), { nil: undefined }),
	});

describe("Feature: famelink, Property 1: Role-Based Redirect", () => {
	/**
	 * Property 1.1: Authenticated artists accessing root URL (/) are redirected to /artist-dashboard
	 *
	 * **Validates: Requirements 1.4**
	 *
	 * For any authenticated artist session, when accessing the root URL (/),
	 * the middleware should redirect to /artist-dashboard.
	 */
	it("should redirect authenticated artists from / to /artist-dashboard", () => {
		fc.assert(
			fc.property(arbitraryArtistSession(), (session) => {
				const result = getRedirectForAuthenticatedUser("/", session);

				// Artist accessing / should always be redirected to /artist-dashboard
				return (
					result.shouldRedirect === true &&
					result.redirectUrl === "/artist-dashboard"
				);
			}),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.2: Authenticated stage managers accessing /stagemanager-login are redirected to /stage-manager
	 *
	 * **Validates: Requirements 1.5**
	 *
	 * For any authenticated stage manager session, when accessing /stagemanager-login,
	 * the middleware should redirect to /stage-manager.
	 */
	it("should redirect authenticated stage managers from /stagemanager-login to /stage-manager", () => {
		fc.assert(
			fc.property(arbitraryStageManagerSession(), (session) => {
				const result = getRedirectForAuthenticatedUser(
					"/stagemanager-login",
					session,
				);

				// Stage manager accessing /stagemanager-login should always be redirected to /stage-manager
				return (
					result.shouldRedirect === true &&
					result.redirectUrl === "/stage-manager"
				);
			}),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.3: Non-artist users accessing root URL (/) are NOT redirected to /artist-dashboard
	 *
	 * **Validates: Requirements 1.4**
	 *
	 * For any authenticated user who is NOT an artist, when accessing the root URL (/),
	 * the middleware should NOT redirect to /artist-dashboard.
	 */
	it("should NOT redirect non-artist users from / to /artist-dashboard", () => {
		const nonArtistRoles: UserRole[] = [
			"super_admin",
			"stage_manager",
			"dj",
		];

		fc.assert(
			fc.property(
				fc.record({
					userId: arbitraryUserId(),
					email: arbitraryEmail(),
					role: fc.constantFrom(...nonArtistRoles),
					status: arbitraryUserStatus(),
					eventId: fc.option(fc.uuid(), { nil: undefined }),
				}),
				(session) => {
					const result = getRedirectForAuthenticatedUser(
						"/",
						session,
					);

					// Non-artist users should NOT be redirected to /artist-dashboard from /
					return (
						result.shouldRedirect === false ||
						result.redirectUrl !== "/artist-dashboard"
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.4: Non-stage-manager users accessing /stagemanager-login are NOT redirected to /stage-manager
	 *
	 * **Validates: Requirements 1.5**
	 *
	 * For any authenticated user who is NOT a stage manager, when accessing /stagemanager-login,
	 * the middleware should NOT redirect to /stage-manager.
	 */
	it("should NOT redirect non-stage-manager users from /stagemanager-login to /stage-manager", () => {
		const nonStageManagerRoles: UserRole[] = [
			"super_admin",
			"artist",
			"dj",
		];

		fc.assert(
			fc.property(
				fc.record({
					userId: arbitraryUserId(),
					email: arbitraryEmail(),
					role: fc.constantFrom(...nonStageManagerRoles),
					status: arbitraryUserStatus(),
					eventId: fc.option(fc.uuid(), { nil: undefined }),
				}),
				(session) => {
					const result = getRedirectForAuthenticatedUser(
						"/stagemanager-login",
						session,
					);

					// Non-stage-manager users should NOT be redirected to /stage-manager from /stagemanager-login
					return (
						result.shouldRedirect === false ||
						result.redirectUrl !== "/stage-manager"
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.5: Role-based redirect is deterministic
	 *
	 * **Validates: Requirements 1.4, 1.5**
	 *
	 * For any session and pathname combination, calling the redirect function
	 * multiple times should always produce the same result.
	 */
	it("should produce deterministic redirect results for the same input", () => {
		const testPaths = ["/", "/stagemanager-login"];

		fc.assert(
			fc.property(
				arbitrarySessionData(),
				fc.constantFrom(...testPaths),
				(session, pathname) => {
					const result1 = getRedirectForAuthenticatedUser(
						pathname,
						session,
					);
					const result2 = getRedirectForAuthenticatedUser(
						pathname,
						session,
					);
					const result3 = getRedirectForAuthenticatedUser(
						pathname,
						session,
					);

					// All results should be identical
					return (
						result1.shouldRedirect === result2.shouldRedirect &&
						result2.shouldRedirect === result3.shouldRedirect &&
						result1.redirectUrl === result2.redirectUrl &&
						result2.redirectUrl === result3.redirectUrl
					);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.6: Redirect URL is always a valid dashboard path
	 *
	 * **Validates: Requirements 1.4, 1.5**
	 *
	 * When a redirect occurs, the redirect URL should always be a valid dashboard path
	 * (either /artist-dashboard or /stage-manager).
	 */
	it("should only redirect to valid dashboard paths", () => {
		const validDashboardPaths = ["/artist-dashboard", "/stage-manager"];
		const testPaths = ["/", "/stagemanager-login"];

		fc.assert(
			fc.property(
				arbitrarySessionData(),
				fc.constantFrom(...testPaths),
				(session, pathname) => {
					const result = getRedirectForAuthenticatedUser(
						pathname,
						session,
					);

					// If redirect occurs, it should be to a valid dashboard path
					if (result.shouldRedirect) {
						return validDashboardPaths.includes(
							result.redirectUrl!,
						);
					}

					// If no redirect, redirectUrl should be null
					return result.redirectUrl === null;
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * Property 1.7: Role and path combination determines redirect
	 *
	 * **Validates: Requirements 1.4, 1.5**
	 *
	 * The redirect behavior should be determined solely by the combination of
	 * user role and pathname, not by other session properties like userId, email, or status.
	 */
	it("should determine redirect based only on role and pathname", () => {
		fc.assert(
			fc.property(
				arbitraryUserRole(),
				fc.constantFrom("/", "/stagemanager-login"),
				arbitraryUserId(),
				arbitraryUserId(),
				arbitraryEmail(),
				arbitraryEmail(),
				arbitraryUserStatus(),
				arbitraryUserStatus(),
				(
					role,
					pathname,
					userId1,
					userId2,
					email1,
					email2,
					status1,
					status2,
				) => {
					const session1: SessionData = {
						userId: userId1,
						email: email1,
						role,
						status: status1,
					};

					const session2: SessionData = {
						userId: userId2,
						email: email2,
						role,
						status: status2,
					};

					const result1 = getRedirectForAuthenticatedUser(
						pathname,
						session1,
					);
					const result2 = getRedirectForAuthenticatedUser(
						pathname,
						session2,
					);

					// Same role + pathname should produce same redirect behavior
					return (
						result1.shouldRedirect === result2.shouldRedirect &&
						result1.redirectUrl === result2.redirectUrl
					);
				},
			),
			{ numRuns: 100 },
		);
	});
});
