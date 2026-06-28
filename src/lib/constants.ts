// Application Constants
export const APP_NAME = "FAME";
export const APP_FULL_NAME = "Festival Artist Management & Events System";

// User Roles
export const USER_ROLES = {
	SUPER_ADMIN: "super_admin",
	STAGE_MANAGER: "stage_manager",
	ARTIST: "artist",
	DJ: "dj",
} as const;

// User Status
export const USER_STATUS = {
	ACTIVE: "active",
	PENDING: "pending",
	SUSPENDED: "suspended",
	DEACTIVATED: "deactivated",
} as const;

// Event Status
export const EVENT_STATUS = {
	PLANNING: "planning",
	REGISTRATION_OPEN: "registration_open",
	LIVE: "live",
	COMPLETED: "completed",
} as const;

// Performance Status
export const PERFORMANCE_STATUS = {
	SCHEDULED: "scheduled",
	READY: "ready",
	PERFORMING: "performing",
	COMPLETED: "completed",
} as const;

// File Upload Limits
export const FILE_LIMITS = {
	MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB (for videos)
	MAX_IMAGE_SIZE: 100 * 1024 * 1024, // 100MB
	MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
	ALLOWED_AUDIO_TYPES: ["audio/mpeg", "audio/wav", "audio/mp3"],
	ALLOWED_DOCUMENT_TYPES: ["application/pdf", "text/plain"],
} as const;

// WebSocket Events
export const WS_EVENTS = {
	STATUS_UPDATE: "status_update",
	ORDER_CHANGE: "order_change",
	EMERGENCY: "emergency",
	CUE_UPDATE: "cue_update",
} as const;

// API Routes
export const API_ROUTES = {
	AUTH: {
		LOGIN: "/api/auth/login",
		LOGOUT: "/api/auth/logout",
		VERIFY: "/api/auth/verify",
		REGISTER_STAGE_MANAGER: "/api/auth/register-stage-manager",
	},
	EVENTS: {
		CREATE: "/api/events/create",
		LIST: "/api/events",
		DETAIL: "/api/events/[eventId]",
		REGISTER: "/api/events/[eventId]/register",
	},
	FILES: {
		UPLOAD: "/api/files/upload",
		GET: "/api/files/[fileId]",
	},
	USERS: {
		PROFILE: "/api/users/profile",
		LIST: "/api/users",
	},
} as const;

// Google Cloud Storage
export const GCS_CONFIG = {
	BUCKET_NAME: "fame-data",
	FOLDERS: {
		EVENTS: "events",
		USERS: "users",
		UPLOADS: "uploads",
	},
} as const;

// Session Configuration
export const SESSION_CONFIG = {
	COOKIE_NAME: "fame-session", // Stage manager / admin / DJ sessions
	ARTIST_COOKIE_NAME: "fame-artist-session", // FameLink artist sessions (completely separate)
	MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
	SECURE: false, // Set to false to allow login over HTTP (useful for VPS without SSL/IP access)
	HTTP_ONLY: true,
} as const;

