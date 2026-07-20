// =========================================================================
// FameLink Types — BaseShow, EventShow, EventRequest, EventParticipation
// =========================================================================

// ---- Constants ----

export const FREE_TIER_MAX_SHOWS = 3;

export function canCreateShow(
	currentCount: number,
	tier: "free" | "pro" | "pro_plus" = "free",
): boolean {
	if (tier === "pro" || tier === "pro_plus") return true;
	return currentCount < FREE_TIER_MAX_SHOWS;
}

// ---- Base Show (artist-owned, permanent) ----

export interface BaseShow {
	id: string;
	artistId: string;
	name: string;
	slug: string;
	style?: string;
	performanceType?: string;
	duration: number;
	description?: string;
	isDraft?: boolean;
	isPublic?: boolean;
	pinned?: boolean;

	// Artist-level fields (matching artist-register)
	realName?: string;
	email?: string;
	phone?: string;
	countryLiving?: string;
	homeCountry?: string;
	managedBy?: string;

	// Visual / Stage
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	customCostumeColor?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	lightRequests?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	customStagePosition?: string;

	// Media
	profileImage?: string;
	musicTrack?: {
		file_url: string;
		file_path: string;
		duration: number;
		notes: string;
		tempo: string;
	};
	galleryFiles?: Array<{
		url: string;
		type: "image" | "video";
		name: string;
		file_path?: string;
		size?: number;
		contentType?: string;
	}>;
	rehearsalVideo?: {
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	} | null;

	// Tech / Equipment
	techRider?: string;
	equipment?: string;
	showLink?: string;

	// Notes
	biography?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	internalNotes?: string;

	// Social
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};

	// Members & logistics
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
	tshirtSizes?: Array<{
		name: string;
		size: string;
		fit: "oversized" | "regular";
	}>;
	logistics?: {
		crewSize?: string;
		travelRequirements?: string;
		hospitalityNotes?: string;
	};

	// Legacy compat
	music?: {
		files?: Array<{ id: string; name: string; url: string }>;
	};
	stageVisual?: {
		performancePhotos?: string[];
		videos?: string[];
	};
	additionalInfo?: Record<string, unknown>;

	createdAt: string;
	updatedAt: string;
}

// ---- Event Show Overrides (stage-manager editable) ----

export interface EventShowOverrides {
	duration?: number;
	notes?: string;
	timing?: string;
	performanceDate?: string;
	performanceOrder?: number;
	backstageReadyTime?: string;
	showStartTime?: string;
	rehearsalStartTime?: string;
	[key: string]: unknown;
}

// ---- Event Show (per-event snapshot + overrides) ----

export interface EventShow {
	id: string;
	eventId: string;
	artistId: string;
	baseShowId: string;
	snapshotJson: BaseShow; // IMMUTABLE after creation
	snapshotCreatedAt: string;
	overrides: EventShowOverrides;
	status: "pending" | "submitted" | "confirmed" | "cancelled" | "draft" | "scheduled";
	performanceStatus:
		| "not_started"
		| "scheduled"
		| "ready"
		| "performing"
		| "completed";
	createdAt: string;
	updatedAt: string;
	updatedBy?: string;
}

// ---- Event Request Status ----

export type EventRequestStatus =
	| "pending"
	| "accepted"
	| "declined"
	| "expired";

// ---- Event Request (stage-manager → artist invitation) ----

export interface EventRequest {
	id: string;
	eventId: string;
	artistId?: string;
	artistEmail: string;
	stageManagerId: string;
	message?: string;
	requestedShowDates: string[];
	status: EventRequestStatus;
	respondedAt?: string;
	eventShowId?: string;
	createdAt: string;
	expiresAt: string;
}

// ---- Event Participation (link-based join, no email needed) ----

export type EventParticipationStatus =
	| "pending" // Artist joined via link but hasn't submitted a show yet
	| "submitted" // Artist submitted a show, waiting for organizer
	| "confirmed" // Organizer assigned the artist into performance order
	| "declined"; // Artist explicitly declined the event

export interface EventParticipation {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	status: EventParticipationStatus;
	baseShowId?: string; // Set when artist selects/creates a show
	eventShowId?: string; // Set when EventShow snapshot is created
	joinedAt: string; // When artist first clicked "Yes, I'm performing"
	submittedAt?: string; // When artist submitted a show
	confirmedAt?: string; // When organizer confirmed/assigned
	declinedAt?: string;
	updatedAt: string;
}

// ---- Artist Notifications ----

export interface ArtistNotification {
	id: string;
	userId: string;
	type: "event_request" | "event_update" | "message" | "system" | "performance_date_assigned";
	title: string;
	message: string;
	eventId?: string;
	read: boolean;
	readAt?: string;
	createdAt: string;
}

// ---- Create Event Show Request ----

export interface CreateEventShowRequest {
	eventId: string;
	baseShowId: string;
}

// ---- Helper: create immutable snapshot ----

export function createBaseShowSnapshot(baseShow: BaseShow): BaseShow {
	// Deep clone to ensure immutability — snapshot must never reference original
	return JSON.parse(JSON.stringify(baseShow));
}

// ---- Helper: generate URL-safe slug ----

export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
