// Data Validation and Consistency Utilities
// Ensures data integrity across all pages and WebSocket events

export interface Artist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	actual_duration?: number | null;
	quality_rating?: number | null;
	performance_order?: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
}

export interface Cue {
	id: string;
	type: string;
	title: string;
	duration?: number;
	performance_order: number;
	notes?: string;
	is_completed?: boolean;
	performance_status?: string | null;
}

export interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
	status?: string | null;
}

// Validation schemas
export const VALIDATION_SCHEMAS = {
	artist: {
		required: ["id", "artist_name", "style", "performance_duration"],
		optional: [
			"actual_duration",
			"quality_rating",
			"performance_order",
			"rehearsal_completed",
			"performance_status",
			"performance_date",
		],
		types: {
			id: "string",
			artist_name: "string",
			style: "string",
			performance_duration: "number",
			actual_duration: "number",
			quality_rating: "number",
			performance_order: "number",
			rehearsal_completed: "boolean",
			performance_status: "string",
			performance_date: "string",
		},
	},
	cue: {
		required: ["id", "type", "title", "performance_order"],
		optional: ["duration", "notes", "is_completed", "performance_status"],
		types: {
			id: "string",
			type: "string",
			title: "string",
			duration: "number",
			performance_order: "number",
			notes: "string",
			is_completed: "boolean",
			performance_status: "string",
		},
	},
};

// Valid status values
export const VALID_STATUSES = [
	"not_started",
	"next_on_deck",
	"next_on_stage",
	"currently_on_stage",
	"completed",
];

// Valid cue types
export const VALID_CUE_TYPES = [
	"mc_break",
	"video_break",
	"cleaning_break",
	"speech_break",
	"opening",
	"countdown",
	"artist_ending",
	"animation",
];

// Data validation functions
export function validateArtist(artist: any): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!artist || typeof artist !== "object") {
		return { isValid: false, errors: ["Artist must be an object"] };
	}

	// Check required fields
	for (const field of VALIDATION_SCHEMAS.artist.required) {
		if (
			!(field in artist) ||
			artist[field] === null ||
			artist[field] === undefined
		) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Check field types
	for (const [field, expectedType] of Object.entries(
		VALIDATION_SCHEMAS.artist.types
	)) {
		if (
			field in artist &&
			artist[field] !== null &&
			artist[field] !== undefined
		) {
			const actualType = typeof artist[field];
			if (actualType !== expectedType) {
				errors.push(
					`Field ${field} should be ${expectedType}, got ${actualType}`
				);
			}
		}
	}

	// Validate specific field values
	if (
		artist.performance_status &&
		!VALID_STATUSES.includes(artist.performance_status)
	) {
		errors.push(`Invalid performance_status: ${artist.performance_status}`);
	}

	if (
		artist.quality_rating &&
		(artist.quality_rating < 1 || artist.quality_rating > 3)
	) {
		errors.push("Quality rating must be between 1 and 3");
	}

	if (artist.performance_duration && artist.performance_duration <= 0) {
		errors.push("Performance duration must be positive");
	}

	return { isValid: errors.length === 0, errors };
}

export function validateCue(cue: any): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!cue || typeof cue !== "object") {
		return { isValid: false, errors: ["Cue must be an object"] };
	}

	// Check required fields
	for (const field of VALIDATION_SCHEMAS.cue.required) {
		if (
			!(field in cue) ||
			cue[field] === null ||
			cue[field] === undefined
		) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Check field types
	for (const [field, expectedType] of Object.entries(
		VALIDATION_SCHEMAS.cue.types
	)) {
		if (field in cue && cue[field] !== null && cue[field] !== undefined) {
			const actualType = typeof cue[field];
			if (actualType !== expectedType) {
				errors.push(
					`Field ${field} should be ${expectedType}, got ${actualType}`
				);
			}
		}
	}

	// Validate specific field values
	if (cue.type && !VALID_CUE_TYPES.includes(cue.type)) {
		errors.push(`Invalid cue type: ${cue.type}`);
	}

	if (
		cue.performance_status &&
		!VALID_STATUSES.includes(cue.performance_status)
	) {
		errors.push(`Invalid performance_status: ${cue.performance_status}`);
	}

	if (cue.duration && cue.duration <= 0) {
		errors.push("Duration must be positive");
	}

	return { isValid: errors.length === 0, errors };
}

// WebSocket event validation
export function validateWebSocketEvent(
	eventType: string,
	data: any
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!eventType || typeof eventType !== "string") {
		errors.push("Event type must be a non-empty string");
	}

	if (!data || typeof data !== "object") {
		errors.push("Event data must be an object");
	}

	// Validate event-specific data
	switch (eventType) {
		case "artist_registered":
		case "artist_assigned":
		case "artist_status_changed":
			if (!data.eventId) errors.push("Missing eventId");
			if (!data.artistId && !data.id)
				errors.push("Missing artistId or id");
			break;

		case "rehearsal_updated":
			if (!data.eventId) errors.push("Missing eventId");
			if (!data.action) errors.push("Missing action");
			break;

		case "performance-order-update":
			if (!data.eventId) errors.push("Missing eventId");
			break;

		case "cue_updated":
			if (!data.eventId) errors.push("Missing eventId");
			if (!data.cueId) errors.push("Missing cueId");
			if (!data.action) errors.push("Missing action");
			break;

		case "emergency-alert":
		case "emergency-clear":
			if (!data.message && eventType === "emergency-alert")
				errors.push("Missing message");
			break;
	}

	return { isValid: errors.length === 0, errors };
}

// Data consistency checks
export function checkShowOrderConsistency(items: ShowOrderItem[]): {
	isConsistent: boolean;
	issues: string[];
} {
	const issues: string[] = [];

	// Check for duplicate performance orders
	const orders = items
		.map((item) => item.performance_order)
		.filter((order) => order !== null);
	const uniqueOrders = new Set(orders);
	if (orders.length !== uniqueOrders.size) {
		issues.push("Duplicate performance orders detected");
	}

	// Check for gaps in performance order
	const sortedOrders = [...uniqueOrders].sort((a, b) => a - b);
	for (let i = 0; i < sortedOrders.length - 1; i++) {
		if (sortedOrders[i + 1] - sortedOrders[i] > 1) {
			issues.push(
				`Gap in performance order between ${sortedOrders[i]} and ${
					sortedOrders[i + 1]
				}`
			);
		}
	}

	// Check for invalid status combinations
	const currentlyOnStage = items.filter(
		(item) => item.status === "currently_on_stage"
	);
	if (currentlyOnStage.length > 1) {
		issues.push("Multiple items marked as currently on stage");
	}

	// Check for artists without rehearsal completion in show order
	const artistsInShow = items.filter(
		(item) => item.type === "artist" && item.artist
	);
	const unrehearsedInShow = artistsInShow.filter(
		(item) =>
			item.artist &&
			!item.artist.rehearsal_completed &&
			item.status !== "not_started"
	);
	if (unrehearsedInShow.length > 0) {
		issues.push("Artists in show order without completed rehearsal");
	}

	return { isConsistent: issues.length === 0, issues };
}

// Data reconciliation utilities
export function reconcileArtistData(
	localData: Artist,
	serverData: Artist
): Artist {
	// Server data takes precedence for most fields
	const reconciled: Artist = { ...serverData };

	// Keep local optimistic updates for certain fields if server data is stale
	const localTimestamp = (localData as any).lastUpdated || 0;
	const serverTimestamp = (serverData as any).lastUpdated || 0;

	if (localTimestamp > serverTimestamp) {
		// Keep local updates for fields that might have been optimistically updated
		if (localData.performance_status !== serverData.performance_status) {
			reconciled.performance_status = localData.performance_status;
		}
		if (localData.performance_order !== serverData.performance_order) {
			reconciled.performance_order = localData.performance_order;
		}
	}

	return reconciled;
}

export function reconcileShowOrder(
	localItems: ShowOrderItem[],
	serverItems: ShowOrderItem[]
): ShowOrderItem[] {
	const reconciled: ShowOrderItem[] = [];
	const serverMap = new Map(serverItems.map((item) => [item.id, item]));
	const localMap = new Map(localItems.map((item) => [item.id, item]));

	// Start with server data as base
	for (const serverItem of serverItems) {
		const localItem = localMap.get(serverItem.id);

		if (localItem) {
			// Reconcile differences
			const reconciledItem = { ...serverItem };

			// Keep local status if it's more recent
			if (localItem.status !== serverItem.status) {
				const localTimestamp = (localItem as any).lastUpdated || 0;
				const serverTimestamp = (serverItem as any).lastUpdated || 0;

				if (localTimestamp > serverTimestamp) {
					reconciledItem.status = localItem.status;
				}
			}

			reconciled.push(reconciledItem);
		} else {
			reconciled.push(serverItem);
		}
	}

	// Add any local items not in server data (might be new)
	for (const localItem of localItems) {
		if (!serverMap.has(localItem.id)) {
			reconciled.push(localItem);
		}
	}

	// Sort by performance order
	return reconciled.sort((a, b) => a.performance_order - b.performance_order);
}

// Data sanitization
export function sanitizeArtistData(artist: any): Artist | null {
	try {
		const validation = validateArtist(artist);
		if (!validation.isValid) {
			console.warn("Invalid artist data:", validation.errors);
			return null;
		}

		return {
			id: String(artist.id),
			artist_name: String(artist.artist_name).trim(),
			style: String(artist.style).trim(),
			performance_duration: Number(artist.performance_duration),
			actual_duration: artist.actual_duration
				? Number(artist.actual_duration)
				: null,
			quality_rating: artist.quality_rating
				? Number(artist.quality_rating)
				: null,
			performance_order: artist.performance_order
				? Number(artist.performance_order)
				: null,
			rehearsal_completed: Boolean(artist.rehearsal_completed),
			performance_status: artist.performance_status
				? String(artist.performance_status)
				: null,
			performance_date: artist.performance_date
				? String(artist.performance_date)
				: null,
		};
	} catch (error) {
		console.error("Error sanitizing artist data:", error);
		return null;
	}
}

export function sanitizeCueData(cue: any): Cue | null {
	try {
		const validation = validateCue(cue);
		if (!validation.isValid) {
			console.warn("Invalid cue data:", validation.errors);
			return null;
		}

		return {
			id: String(cue.id),
			type: String(cue.type),
			title: String(cue.title).trim(),
			duration: cue.duration ? Number(cue.duration) : undefined,
			performance_order: Number(cue.performance_order),
			notes: cue.notes ? String(cue.notes).trim() : undefined,
			is_completed: cue.is_completed
				? Boolean(cue.is_completed)
				: undefined,
			performance_status: cue.performance_status
				? String(cue.performance_status)
				: null,
		};
	} catch (error) {
		console.error("Error sanitizing cue data:", error);
		return null;
	}
}

// Utility to check if data has changed significantly
export function hasSignificantChange(
	oldData: any,
	newData: any,
	significantFields: string[]
): boolean {
	for (const field of significantFields) {
		if (oldData[field] !== newData[field]) {
			return true;
		}
	}
	return false;
}

// Performance order validation
export function validatePerformanceOrder(items: ShowOrderItem[]): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check each item
	for (const item of items) {
		if (item.type === "artist" && item.artist) {
			const artistValidation = validateArtist(item.artist);
			if (!artistValidation.isValid) {
				errors.push(
					`Invalid artist ${item.id}: ${artistValidation.errors.join(
						", "
					)}`
				);
			}
		} else if (item.type === "cue" && item.cue) {
			const cueValidation = validateCue(item.cue);
			if (!cueValidation.isValid) {
				errors.push(
					`Invalid cue ${item.id}: ${cueValidation.errors.join(", ")}`
				);
			}
		}
	}

	// Check overall consistency
	const consistencyCheck = checkShowOrderConsistency(items);
	if (!consistencyCheck.isConsistent) {
		errors.push(...consistencyCheck.issues);
	}

	return { isValid: errors.length === 0, errors };
}
