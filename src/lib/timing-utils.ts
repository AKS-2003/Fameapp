// Show Timing Calculation Utilities
// Prioritizes actual_duration from uploaded music tracks over performance_duration

interface Artist {
	id: string;
	artist_name: string;
	performance_duration: number;
	actual_duration?: number; // in seconds from uploaded music
}

interface Cue {
	id: string;
	title: string;
	duration?: number; // in minutes
	extraTime?: number; // buffer time in seconds, added on top of duration
}

interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
}

interface TimingCalculation {
	startTime: string;
	endTime: string;
	duration: number; // in minutes for display
	actualDurationSeconds: number; // for calculations
}

export function calculateTotalShowTime(items: ShowOrderItem[]): number {
	// Calculate total in seconds first for accuracy
	const totalSeconds = items.reduce((total, item) => {
		if (item.type === "artist" && item.artist) {
			// Use actual duration if available, otherwise fall back to performance duration
			const durationSeconds = item.artist.actual_duration
				? item.artist.actual_duration // Already in seconds
				: (item.artist.performance_duration || 0) * 60; // Convert minutes to seconds
			return total + durationSeconds;
		} else if (item.type === "cue" && item.cue) {
			return total + (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0); // Convert minutes to seconds, plus extra time
		}
		return total;
	}, 0);

	// Return total seconds for more accurate calculations
	return totalSeconds;
}

export function formatTotalTime(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	} else {
		return `${seconds}s`;
	}
}

export function formatTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function calculateItemTiming(
	items: ShowOrderItem[],
	index: number,
	showStartTime?: string,
): TimingCalculation {
	if (!showStartTime) {
		return {
			startTime: "",
			endTime: "",
			duration: 0,
			actualDurationSeconds: 0,
		};
	}

	const [hours, minutes] = showStartTime.split(":").map(Number);
	let currentTime = hours * 60 + minutes;

	// Calculate start time for this item
	for (let i = 0; i < index; i++) {
		const item = items[i];
		if (item.type === "artist" && item.artist) {
			// Use actual duration if available, otherwise fall back to performance duration
			const duration = item.artist.actual_duration
				? Math.ceil(item.artist.actual_duration / 60) // Convert seconds to minutes
				: item.artist.performance_duration || 0;
			currentTime += duration;
		} else if (item.type === "cue" && item.cue) {
			currentTime += (item.cue.duration || 0) + (item.cue.extraTime || 0) / 60;
		}
	}

	const startTime = currentTime;
	const item = items[index];
	let duration = 0;
	let actualDurationSeconds = 0;

	if (item.type === "artist" && item.artist) {
		// Use actual duration if available, otherwise fall back to performance duration
		if (item.artist.actual_duration) {
			actualDurationSeconds = item.artist.actual_duration;
			duration = Math.ceil(item.artist.actual_duration / 60); // Convert seconds to minutes
		} else {
			duration = item.artist.performance_duration || 0;
			actualDurationSeconds = duration * 60; // Convert minutes to seconds
		}
	} else if (item.type === "cue" && item.cue) {
		duration = (item.cue.duration || 0) + (item.cue.extraTime || 0) / 60;
		actualDurationSeconds = duration * 60; // Convert minutes to seconds
	}

	const endTime = startTime + duration;

	const formatMinutesToTime = (mins: number) => {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return `${h.toString().padStart(2, "0")}:${m
			.toString()
			.padStart(2, "0")}`;
	};

	return {
		startTime: formatMinutesToTime(startTime),
		endTime: formatMinutesToTime(endTime),
		duration,
		actualDurationSeconds,
	};
}

export function formatDuration(seconds: number | null): string {
	if (!seconds) return "N/A";
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Format a duration given in minutes (fractional allowed) as "mm:ss". */
export function formatMinutesToMMSS(minutes: number): string {
	const totalSeconds = Math.round((minutes || 0) * 60);
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Parse an "mm:ss" (or plain "mm") string back into minutes (fractional). */
export function parseMMSSToMinutes(value: string): number {
	if (!value) return 0;
	const parts = value.split(":");
	if (parts.length === 2) {
		const mins = parseInt(parts[0], 10) || 0;
		const secs = parseInt(parts[1], 10) || 0;
		return mins + secs / 60;
	}
	return parseFloat(value) || 0;
}

/** Format a buffer/extra-time value given in seconds as a short label (e.g. "+1m 30s", "+45s"). */
export function formatExtraTime(seconds: number): string {
	if (!seconds) return "None";
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins > 0 && secs > 0) return `+${mins}m ${secs}s`;
	if (mins > 0) return `+${mins}m`;
	return `+${secs}s`;
}

export function getDisplayDuration(artist: Artist): string {
	if (artist.actual_duration) {
		return formatDuration(artist.actual_duration);
	}
	return `${artist.performance_duration} min`;
}

export function getDurationInMinutes(artist: Artist): number {
	if (artist.actual_duration) {
		return Math.ceil(artist.actual_duration / 60);
	}
	return artist.performance_duration || 0;
}

// Enhanced item with completion tracking
interface LiveShowOrderItem extends ShowOrderItem {
	status?: string;
	is_completed?: boolean;
	completed_at?: string | null;
	started_at?: string | null;
}

export interface LiveTimingResult {
	startTime: string; // HH:MM
	endTime: string; // HH:MM
	durationSeconds: number;
	isActual: boolean; // true if based on actual completion data
}

/**
 * Calculate live start/end times for all items, using actual completion
 * timestamps when available. If a 5-min cue ends after 1 min, all
 * subsequent items shift 4 minutes earlier. If a show starts earlier
 * than planned (via started_at), all following shows shift accordingly.
 *
 * timeOverrides: optional map of itemId -> "HH:MM" that forces an item's
 * start time. All subsequent items cascade from the overridden item's end.
 */
export function calculateLiveTimings(
	items: LiveShowOrderItem[],
	showStartTime?: string,
	timeOverrides?: Record<string, string>,
): LiveTimingResult[] {
	if (!showStartTime || items.length === 0) {
		return items.map(() => ({
			startTime: "",
			endTime: "",
			durationSeconds: 0,
			isActual: false,
		}));
	}

	const [startH, startM] = showStartTime.split(":").map(Number);
	// Work in seconds for precision
	let cursor = (startH * 60 + startM) * 60; // seconds since midnight

	const results: LiveTimingResult[] = [];

	// Track whether we've hit a time override — once we do,
	// all subsequent items cascade purely by planned durations
	// (ignoring actual started_at / completed_at timestamps)
	let overrideCascadeActive = false;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		// Check for a manual time override on this item
		const override = timeOverrides?.[item.id];
		if (override) {
			const [oh, om] = override.split(":").map(Number);
			if (!isNaN(oh) && !isNaN(om)) {
				cursor = (oh * 60 + om) * 60;
				overrideCascadeActive = true; // From here on, cascade by planned durations
			}
		}

		let actualStartSec: number | null = null;
		let actualEndSec: number | null = null;

		// Only use actual timestamps if we are NOT in override cascade mode
		if (!overrideCascadeActive) {
			// Check if this item has an actual started_at timestamp
			const startedAt =
				item.started_at ||
				(item.type === "artist" &&
					item.artist &&
					(item.artist as any).started_at) ||
				(item.type === "cue" && item.cue && (item.cue as any).started_at);

			if (startedAt) {
				try {
					const d = new Date(startedAt as string);
					if (!isNaN(d.getTime())) {
						actualStartSec =
							d.getHours() * 3600 +
							d.getMinutes() * 60 +
							d.getSeconds();
					}
				} catch {
					// ignore parse errors
				}
			}

			// If this item has a completed_at timestamp, use it to derive actual end
			const isCompleted =
				item.is_completed ||
				item.status === "completed" ||
				(item.type === "artist" &&
					item.artist &&
					(item.artist as any).is_completed) ||
				(item.type === "cue" && item.cue && (item.cue as any).is_completed);

			const completedAt =
				item.completed_at ||
				(item.type === "artist" &&
					item.artist &&
					(item.artist as any).completed_at) ||
				(item.type === "cue" && item.cue && (item.cue as any).completed_at);

			if (isCompleted && completedAt) {
				try {
					const d = new Date(completedAt as string);
					if (!isNaN(d.getTime())) {
						actualEndSec =
							d.getHours() * 3600 +
							d.getMinutes() * 60 +
							d.getSeconds();
					}
				} catch {
					// ignore parse errors
				}
			}
		}

		// Use actual start if available (and not in cascade mode), otherwise cursor
		const itemStart = actualStartSec !== null ? actualStartSec : cursor;

		// Get planned duration in seconds
		let plannedSec = 0;
		if (item.type === "artist" && item.artist) {
			plannedSec = item.artist.actual_duration
				? item.artist.actual_duration
				: (item.artist.performance_duration || 0) * 60;
		} else if (item.type === "cue" && item.cue) {
			plannedSec = (item.cue.duration || 0) * 60 + (item.cue.extraTime || 0);
		}

		const itemEnd =
			actualEndSec !== null ? actualEndSec : itemStart + plannedSec;
		const durationSec = itemEnd - itemStart;

		const hasActualData = actualStartSec !== null || actualEndSec !== null;

		results.push({
			startTime: formatSecondsToHHMM(itemStart),
			endTime: formatSecondsToHHMM(itemEnd),
			durationSeconds: Math.max(0, durationSec),
			isActual: hasActualData,
		});

		// Move cursor to end of this item
		cursor = itemEnd;
	}

	return results;
}


function formatSecondsToHHMM(totalSeconds: number): string {
	// Handle wrap-around midnight
	const normalized = ((totalSeconds % 86400) + 86400) % 86400;
	const h = Math.floor(normalized / 3600);
	const m = Math.floor((normalized % 3600) / 60);
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
