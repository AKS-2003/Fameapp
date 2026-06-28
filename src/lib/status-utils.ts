// Status Color and Display Utilities
// Provides consistent status colors and ordering across all pages

export type ArtistStatus =
	| "not_started"
	| "next_on_deck"
	| "next_on_stage"
	| "currently_on_stage"
	| "completed";

export const STATUS_COLORS = {
	not_started: "bg-white border-gray-300 text-gray-900", // Back Stage - White background
	next_on_deck: "bg-blue-50 border-blue-200 text-blue-800", // Next on Deck - Blue background
	next_on_stage: "bg-yellow-50 border-yellow-200 text-yellow-800", // Next On Stage - Yellow background (not used in dropdown)
	currently_on_stage: "bg-green-50 border-green-200 text-green-800", // Currently on Stage - Green background
	completed: "bg-red-50 border-red-200 text-red-800", // Completed - Red background
} as const;

export const STATUS_LABELS = {
	not_started: "Back Stage", // Changed from "Not Started" to "Back Stage"
	next_on_deck: "Next On Deck",
	next_on_stage: "Next On Stage",
	currently_on_stage: "Currently On Stage",
	completed: "Completed",
} as const;

export const STATUS_ORDER = {
	not_started: 1,
	next_on_deck: 2,
	next_on_stage: 3,
	currently_on_stage: 4,
	completed: 5,
} as const;

export function getStatusColorClasses(status?: string | null): string {
	if (!status || !(status in STATUS_COLORS)) {
		return STATUS_COLORS.not_started;
	}
	return STATUS_COLORS[status as ArtistStatus];
}

export function getStatusLabel(status?: string | null): string {
	if (!status || !(status in STATUS_LABELS)) {
		return STATUS_LABELS.not_started;
	}
	return STATUS_LABELS[status as ArtistStatus];
}

export function getStatusOrder(status?: string | null): number {
	if (!status || !(status in STATUS_ORDER)) {
		return STATUS_ORDER.not_started;
	}
	return STATUS_ORDER[status as ArtistStatus];
}

export function sortByStatus<T extends { status?: string | null }>(
	items: T[]
): T[] {
	return [...items].sort((a, b) => {
		const orderA = getStatusOrder(a.status);
		const orderB = getStatusOrder(b.status);
		return orderA - orderB;
	});
}

// Badge variant mapping for UI components
export function getStatusBadgeVariant(
	status?: string | null
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "completed":
			return "destructive";
		case "currently_on_stage":
			return "default";
		case "next_on_stage":
		case "next_on_deck":
			return "secondary";
		default:
			return "outline";
	}
}
