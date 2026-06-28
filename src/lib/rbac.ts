import { UserRole, SessionData } from "@/types";

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
	super_admin: 4,
	stage_manager: 3,
	dj: 2,
	artist: 1,
};

// Permission definitions
export interface Permission {
	resource: string;
	action: string;
	roles: UserRole[];
}

// Define all permissions in the system
export const PERMISSIONS: Permission[] = [
	// User management
	{ resource: "users", action: "create", roles: ["super_admin"] },
	{
		resource: "users",
		action: "read",
		roles: ["super_admin", "stage_manager"],
	},
	{ resource: "users", action: "update", roles: ["super_admin"] },
	{ resource: "users", action: "delete", roles: ["super_admin"] },

	// Event management
	{
		resource: "events",
		action: "create",
		roles: ["super_admin", "stage_manager"],
	},
	{
		resource: "events",
		action: "read",
		roles: ["super_admin", "stage_manager", "artist", "dj"],
	},
	{
		resource: "events",
		action: "update",
		roles: ["super_admin", "stage_manager"],
	},
	{ resource: "events", action: "delete", roles: ["super_admin"] },

	// Artist management
	{
		resource: "artists",
		action: "approve",
		roles: ["super_admin", "stage_manager"],
	},
	{ resource: "artists", action: "register", roles: ["artist"] },
	{ resource: "artists", action: "update_profile", roles: ["artist"] },

	// Performance management
	{
		resource: "performances",
		action: "create",
		roles: ["super_admin", "stage_manager"],
	},
	{
		resource: "performances",
		action: "update",
		roles: ["super_admin", "stage_manager"],
	},
	{
		resource: "performances",
		action: "reorder",
		roles: ["super_admin", "stage_manager"],
	},

	// DJ management
	{ resource: "music", action: "upload", roles: ["dj"] },
	{
		resource: "music",
		action: "manage",
		roles: ["super_admin", "stage_manager", "dj"],
	},

	// File management
	{
		resource: "files",
		action: "upload",
		roles: ["super_admin", "stage_manager", "artist", "dj"],
	},
	{
		resource: "files",
		action: "delete",
		roles: ["super_admin", "stage_manager"],
	},

	// System administration
	{ resource: "system", action: "monitor", roles: ["super_admin"] },
	{ resource: "system", action: "configure", roles: ["super_admin"] },
];

// Check if user has permission for a specific action
export function hasPermission(
	userRole: UserRole,
	resource: string,
	action: string,
): boolean {
	const permission = PERMISSIONS.find(
		(p) => p.resource === resource && p.action === action,
	);

	if (!permission) {
		console.warn(`Permission not found: ${resource}:${action}`);
		return false;
	}

	return permission.roles.includes(userRole);
}

// Check if user has role hierarchy permission (e.g., admin can do manager tasks)
export function hasRoleLevel(
	userRole: UserRole,
	requiredRole: UserRole,
): boolean {
	return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
	return PERMISSIONS.filter((p) => p.roles.includes(role));
}

// Middleware helper to check permissions
export function requirePermission(
	session: SessionData | null,
	resource: string,
	action: string,
): void {
	if (!session) {
		throw new Error("Authentication required");
	}

	if (session.status !== "active") {
		throw new Error(`Account status: ${session.status}`);
	}

	if (!hasPermission(session.role, resource, action)) {
		throw new Error(`Insufficient permissions for ${resource}:${action}`);
	}
}

// Check if user can access a specific route
export function canAccessRoute(
	session: SessionData | null,
	route: string,
): boolean {
	if (!session || session.status !== "active") {
		return false;
	}

	// Define route permissions
	const routePermissions: Record<string, UserRole[]> = {
		"/super-admin": ["super_admin"],
		"/stage-manager": ["super_admin", "stage_manager"],
		"/dj": ["super_admin", "stage_manager", "dj"],
	};

	const allowedRoles = routePermissions[route];
	if (!allowedRoles) {
		return true; // No specific restrictions
	}

	return allowedRoles.includes(session.role);
}

// Get dashboard URL for user role
export function getDashboardUrl(role: UserRole): string {
	switch (role) {
		case "super_admin":
			return "/super-admin";
		case "stage_manager":
			return "/stage-manager";
		case "dj":
			return "/dj";
		default:
			return "/";
	}
}

// Check if user can manage another user
export function canManageUser(
	managerRole: UserRole,
	targetRole: UserRole,
): boolean {
	// Super admin can manage everyone
	if (managerRole === "super_admin") {
		return true;
	}

	// Stage managers can manage artists and DJs
	if (managerRole === "stage_manager") {
		return ["artist", "dj"].includes(targetRole);
	}

	return false;
}

// =============================================================================
// FAMELINK-SPECIFIC RBAC UTILITIES
// =============================================================================

/**
 * Check if user can access artist-owned resources (Base_Show, Artist_Profile)
 * Only the owner artist can modify their own resources
 */
export function canAccessArtistResource(
	userRole: UserRole,
	userId: string,
	resourceOwnerId: string,
	action: "read" | "write",
): boolean {
	// Owner can always access their own resources
	if (userId === resourceOwnerId) {
		return true;
	}

	// Stage managers can read artist resources (for event management)
	if (userRole === "stage_manager" && action === "read") {
		return true;
	}

	// Super admins can read artist resources
	if (userRole === "super_admin" && action === "read") {
		return true;
	}

	// No one else can write to artist resources
	return false;
}

/**
 * Check if user can modify Base_Show data
 * CRITICAL: Only the owner artist can modify Base_Show
 * Stage managers CANNOT modify Base_Show data
 */
export function canModifyBaseShow(
	userRole: UserRole,
	userId: string,
	showOwnerId: string,
): boolean {
	// Only the owner artist can modify their Base_Show
	return userRole === "artist" && userId === showOwnerId;
}

/**
 * Check if user can modify Event_Show overrides
 * Only stage managers can modify Event_Show overrides
 */
export function canModifyEventShowOverrides(userRole: UserRole): boolean {
	return userRole === "stage_manager" || userRole === "super_admin";
}

/**
 * Check if user can access Event_Show data
 */
export function canAccessEventShow(
	userRole: UserRole,
	userId: string,
	eventShowArtistId: string,
	action: "read" | "write",
): boolean {
	// Owner artist can read their Event_Show
	if (userId === eventShowArtistId && action === "read") {
		return true;
	}

	// Stage managers can read and write (overrides only) Event_Shows
	if (userRole === "stage_manager") {
		return true;
	}

	// Super admins can read and write
	if (userRole === "super_admin") {
		return true;
	}

	return false;
}

/**
 * Validate that a stage manager operation does not modify Base_Show data
 * Returns true if the operation is safe (doesn't touch Base_Show)
 */
export function isStageManagerOperationSafe(
	operationType: string,
	targetResource: string,
): boolean {
	// Stage managers should never directly modify Base_Show
	if (targetResource === "base_show") {
		return false;
	}

	// Stage managers can modify Event_Show overrides
	if (targetResource === "event_show_overrides") {
		return true;
	}

	// Stage managers can modify event-level data
	if (targetResource === "event") {
		return true;
	}

	return false;
}
