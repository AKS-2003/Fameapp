// Core User Types
export type UserRole = "super_admin" | "stage_manager" | "artist" | "dj";

export type UserStatus =
	| "active"
	| "pending"
	| "suspended"
	| "deactivated"
	| "rejected";

export interface User {
	id: string;
	email: string;
	passwordHash: string;
	role: UserRole;
	status: UserStatus;
	profile: UserProfile;
	createdAt: Date;
	lastLogin: Date;
	subscription?: {
		plan_type: string;
		plan_quantity: number;
		stripe_customer_id?: string;
		stripe_subscription_id?: string;
		plan_expiration?: string;
		created_at: string;
		updated_at: string;
	};
}

export interface UserProfile {
	firstName: string;
	lastName: string;
	phone?: string;
	avatar?: string;
}

// T-shirt size types
export interface TShirtSize {
	name: string;
	size: string;
	fit: "oversized" | "regular";
}

// Artist-specific types
export interface ArtistProfile extends UserProfile {
	artistName: string;
	realName: string;
	performanceStyle: string;
	duration: number;
	biography: string;
	mediaFiles: MediaFile[];
	eventId: string;
	tshirtSizes?: TShirtSize[];
}

// Event Types
export type EventStatus =
	| "planning"
	| "registration_open"
	| "live"
	| "completed";

export interface Event {
	id: string;
	name: string;
	date: Date;
	venue: string;
	stageManagerId: string;
	registrationUrl: string;
	artists: ArtistRegistration[];
	djId?: string;
	status: EventStatus;
	settings: EventSettings;
}

export interface EventSettings {
	maxArtists: number;
	registrationDeadline: Date;
	allowLateRegistration: boolean;
	requireApproval: boolean;
}

export interface ArtistRegistration {
	artistId: string;
	eventId: string;
	registrationDate: Date;
	approvalStatus: "pending" | "approved" | "rejected";
	approvedBy?: string;
	approvalDate?: Date;
}

// Performance Types
export type PerformanceStatus =
	| "scheduled"
	| "ready"
	| "performing"
	| "completed";

export interface Performance {
	id: string;
	artistId: string;
	eventId: string;
	scheduledTime: Date;
	duration: number;
	order: number;
	status: PerformanceStatus;
	musicRequirements: MusicRequirement[];
}

export interface MusicRequirement {
	id: string;
	artistId: string;
	trackName: string;
	artist: string;
	bpm?: number;
	genre?: string;
	notes?: string;
}

// File and Media Types
export interface MediaFile {
	id: string;
	filename: string;
	originalName: string;
	mimeType: string;
	size: number;
	url: string;
	uploadedBy: string;
	uploadedAt: Date;
	category: "image" | "audio" | "video" | "document";
}

export interface MusicFile extends MediaFile {
	bpm?: number;
	genre?: string;
	duration?: number;
	metadata?: {
		title?: string;
		artist?: string;
		album?: string;
	};
}

// WebSocket Types
export type WebSocketMessageType =
	| "status_update"
	| "order_change"
	| "emergency"
	| "cue_update";
export type MessagePriority = "low" | "normal" | "high" | "emergency";

export interface WebSocketMessage {
	type: WebSocketMessageType;
	eventId: string;
	payload: any;
	priority: MessagePriority;
	timestamp: number;
	senderId: string;
}

// API Response Types
export interface APIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
}

// Session Types
export interface SessionData {
	userId: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	eventId?: string; // For artists tied to specific events
}

// File Storage Structure
export interface FileStorageStructure {
	events: {
		[eventId: string]: {
			artists: {
				[artistId: string]: {
					media: MediaFile[];
					documents: MediaFile[];
				};
			};
			dj: {
				music: MusicFile[];
			};
		};
	};
}
