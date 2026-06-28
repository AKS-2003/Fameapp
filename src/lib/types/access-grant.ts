/**
 * Access Grant Types for email-based page access control
 * Stage Managers can grant specific page access to users via email
 */

// Available access types that can be granted
export type AccessType =
	| "full_access"
	| "artist_management"
	| "rehearsal"
	| "performance_order"
	| "mc_page"
	| "dj_page";

// Access grant status
export type AccessGrantStatus = "active" | "revoked";

// An access grant record stored in GCS
export interface AccessGrant {
	id: string;
	eventId: string;
	email: string;
	accessTypes: AccessType[];
	token: string;
	createdAt: string;
	updatedAt: string;
	createdBy: string; // stage manager userId
	createdByName: string; // stage manager name for display
	status: AccessGrantStatus;
	lastAccessedAt?: string;
	emailSentAt?: string;
}

// Data for creating a new access grant
export interface CreateAccessGrantData {
	email: string;
	accessTypes: AccessType[];
	eventId: string;
	createdBy: string;
	createdByName: string;
}

// Data for updating an existing access grant
export interface UpdateAccessGrantData {
	accessTypes?: AccessType[];
	status?: AccessGrantStatus;
	resendEmail?: boolean;
}

// Decoded access grant token payload
export interface AccessGrantTokenPayload {
	grantId: string;
	eventId: string;
	email: string;
	accessTypes: AccessType[];
	exp: number; // expiry timestamp in ms
}

// Cookie data stored for a verified access grant
export interface AccessGrantCookieData {
	grantId: string;
	eventId: string;
	email: string;
	accessTypes: AccessType[];
	verifiedAt: string;
}

// Access type configuration: label, color, icon, and allowed paths
export const ACCESS_TYPE_CONFIG: Record<
	AccessType,
	{
		label: string;
		description: string;
		color: string;
		bgColor: string;
		paths: string[]; // relative paths under /stage-manager/events/[eventId]/
	}
> = {
	full_access: {
		label: "Full Access",
		description: "Access to all event management pages",
		color: "text-purple-700",
		bgColor: "bg-purple-100 border-purple-300",
		paths: [
			"artists",
			"rehearsal",
			"performance-order",
			"performance-order/mc",
			"performance-order/dj",
		],
	},
	artist_management: {
		label: "Artist Management",
		description: "Manage artists and submissions",
		color: "text-blue-700",
		bgColor: "bg-blue-100 border-blue-300",
		paths: ["artists"],
	},
	rehearsal: {
		label: "Rehearsal",
		description: "Plan and organize rehearsal times",
		color: "text-green-700",
		bgColor: "bg-green-100 border-green-300",
		paths: ["rehearsal"],
	},
	performance_order: {
		label: "Performance Order",
		description: "Set performance order and timing",
		color: "text-pink-700",
		bgColor: "bg-pink-100 border-pink-300",
		paths: ["performance-order"],
	},
	mc_page: {
		label: "MC Page",
		description: "MC dashboard and cue management",
		color: "text-orange-700",
		bgColor: "bg-orange-100 border-orange-300",
		paths: ["performance-order/mc"],
	},
	dj_page: {
		label: "DJ Page",
		description: "DJ dashboard and music management",
		color: "text-cyan-700",
		bgColor: "bg-cyan-100 border-cyan-300",
		paths: ["performance-order/dj"],
	},
};

// All available access types for dropdown selection
export const ALL_ACCESS_TYPES: AccessType[] = [
	"full_access",
	"artist_management",
	"rehearsal",
	"performance_order",
	"mc_page",
	"dj_page",
];

/**
 * Get all allowed paths for a set of access types
 */
export function getAllowedPaths(accessTypes: AccessType[]): string[] {
	const paths = new Set<string>();
	for (const type of accessTypes) {
		const config = ACCESS_TYPE_CONFIG[type];
		if (config) {
			for (const path of config.paths) {
				paths.add(path);
			}
		}
	}
	return Array.from(paths);
}

/**
 * Check if a specific path is allowed by the given access types
 * @param path - relative path under /stage-manager/events/[eventId]/
 * @param accessTypes - granted access types
 */
export function isPathAllowed(
	path: string,
	accessTypes: AccessType[],
): boolean {
	if (accessTypes.includes("full_access")) return true;

	const allowedPaths = getAllowedPaths(accessTypes);
	// Normalize path: remove leading/trailing slashes
	const normalizedPath = path.replace(/^\/+|\/+$/g, "");

	return allowedPaths.some((allowed) => {
		const normalizedAllowed = allowed.replace(/^\/+|\/+$/g, "");
		return (
			normalizedPath === normalizedAllowed ||
			normalizedPath.startsWith(normalizedAllowed + "/")
		);
	});
}
