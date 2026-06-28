import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionFromRequest } from "./session";
import { UserRole, UserStatus, SessionData, APIResponse } from "@/types";

// Route protection for API routes
export function withAuth<T = any>(
	handler: (
		request: NextRequest,
		session: SessionData,
		context?: any
	) => Promise<NextResponse<APIResponse<T>>>,
	options?: {
		requiredRole?: UserRole;
		allowedStatuses?: UserStatus[];
	}
) {
	return async (
		request: NextRequest,
		context?: any
	): Promise<NextResponse<APIResponse<T>>> => {
		try {
			// Get session from request
			const session = getSessionFromRequest(request);

			if (!session) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "UNAUTHORIZED",
							message: "Authentication required",
						},
					},
					{ status: 401 }
				);
			}

			// Check user status
			const allowedStatuses = options?.allowedStatuses || ["active"];
			if (!allowedStatuses.includes(session.status)) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ACCOUNT_STATUS_INVALID",
							message: `Account status '${session.status}' is not allowed for this action`,
						},
					},
					{ status: 403 }
				);
			}

			// Check required role
			if (
				options?.requiredRole &&
				!hasRequiredRole(session.role, options.requiredRole)
			) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "INSUFFICIENT_PERMISSIONS",
							message: `Required role: ${options.requiredRole}, current role: ${session.role}`,
						},
					},
					{ status: 403 }
				);
			}

			// Call the protected handler
			return await handler(request, session, context);
		} catch (error) {
			console.error("Route protection error:", error);
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INTERNAL_ERROR",
						message: "An internal error occurred",
					},
				},
				{ status: 500 }
			);
		}
	};
}

// Route protection for server components and server actions
export async function requireAuth(options?: {
	requiredRole?: UserRole;
	allowedStatuses?: UserStatus[];
}): Promise<SessionData> {
	const session = await getSession();

	if (!session) {
		throw new Error("Authentication required");
	}

	// Check user status
	const allowedStatuses = options?.allowedStatuses || ["active"];
	if (!allowedStatuses.includes(session.status)) {
		throw new Error(`Account status '${session.status}' is not allowed`);
	}

	// Check required role
	if (
		options?.requiredRole &&
		!hasRequiredRole(session.role, options.requiredRole)
	) {
		throw new Error(
			`Insufficient permissions. Required: ${options.requiredRole}`
		);
	}

	return session;
}

// Role hierarchy check
function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
	const roleHierarchy: Record<UserRole, number> = {
		super_admin: 4,
		stage_manager: 3,
		dj: 2,
		artist: 1,
	};

	return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Utility to check if user can access specific event
export async function requireEventAccess(
	eventId: string,
	options?: {
		requiredRole?: UserRole;
		allowedStatuses?: UserStatus[];
	}
): Promise<SessionData> {
	const session = await requireAuth(options);

	// Super admins can access any event
	if (session.role === "super_admin") {
		return session;
	}

	// Stage managers can access events they manage
	if (session.role === "stage_manager") {
		// TODO: Add event ownership check when event management is implemented
		return session;
	}

	// Artists can only access their registered events
	if (session.role === "artist" && session.eventId !== eventId) {
		throw new Error("Access denied: Not registered for this event");
	}

	// DJs can access events they're assigned to
	if (session.role === "dj") {
		// TODO: Add DJ assignment check when event management is implemented
		return session;
	}

	return session;
}

// Utility for checking permissions in components
export function canUserAccess(
	userRole: UserRole,
	userStatus: UserStatus,
	requiredRole?: UserRole,
	allowedStatuses: UserStatus[] = ["active"]
): boolean {
	// Check status
	if (!allowedStatuses.includes(userStatus)) {
		return false;
	}

	// Check role if required
	if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
		return false;
	}

	return true;
}

// Error response helpers
export function createUnauthorizedResponse(
	message = "Authentication required"
): NextResponse<APIResponse> {
	return NextResponse.json<APIResponse>(
		{
			success: false,
			error: {
				code: "UNAUTHORIZED",
				message,
			},
		},
		{ status: 401 }
	);
}

export function createForbiddenResponse(
	message = "Insufficient permissions"
): NextResponse<APIResponse> {
	return NextResponse.json<APIResponse>(
		{
			success: false,
			error: {
				code: "FORBIDDEN",
				message,
			},
		},
		{ status: 403 }
	);
}

export function createInternalErrorResponse(
	message = "An internal error occurred"
): NextResponse<APIResponse> {
	return NextResponse.json<APIResponse>(
		{
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message,
			},
		},
		{ status: 500 }
	);
}
