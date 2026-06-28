/**
 * Utility functions for automatic date selection and cross-page date synchronization
 * - Automatically selects today's date if available
 * - Syncs selected date across all pages using localStorage
 * - Broadcasts date changes via custom events
 */

const STORAGE_KEY_PREFIX = "fame_selected_date_";

/**
 * Normalize a date string to YYYY-MM-DD format
 */
export function normalizeDate(dateStr: string): string {
	if (!dateStr) return "";

	// If already in YYYY-MM-DD format, return as is
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr;
	}

	// If ISO format with time, extract date part
	if (dateStr.includes("T")) {
		return dateStr.split("T")[0];
	}

	// Try to parse and format
	try {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error(`Failed to normalize date: ${dateStr}`, error);
		return dateStr;
	}
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Find the best date to select from available dates
 * Priority:
 * 1. Previously selected date (from localStorage) if still valid
 * 2. Today's date if it exists in the list
 * 3. The closest future date
 * 4. The first date in the list (fallback)
 */
export function findBestDateToSelect(
	availableDates: string[],
	eventId: string
): string {
	if (!availableDates || availableDates.length === 0) {
		return "";
	}

	const normalizedDates = availableDates.map(normalizeDate);

	// Check if there's a previously selected date in localStorage
	const savedDate = getSelectedDateFromStorage(eventId);
	if (savedDate) {
		const savedNormalized = normalizeDate(savedDate);
		const savedIndex = normalizedDates.findIndex(
			(date) => date === savedNormalized
		);
		if (savedIndex !== -1) {
			return availableDates[savedIndex];
		}
	}

	// Check if today's date is in the list
	const today = getTodayDate();
	const todayIndex = normalizedDates.findIndex((date) => date === today);
	if (todayIndex !== -1) {
		return availableDates[todayIndex];
	}

	// Find the closest future date
	const todayTime = new Date(today).getTime();
	let closestFutureDate = "";
	let closestFutureDiff = Infinity;

	for (let i = 0; i < normalizedDates.length; i++) {
		const dateTime = new Date(normalizedDates[i]).getTime();
		const diff = dateTime - todayTime;

		if (diff > 0 && diff < closestFutureDiff) {
			closestFutureDiff = diff;
			closestFutureDate = availableDates[i];
		}
	}

	if (closestFutureDate) {
		return closestFutureDate;
	}

	// Fallback to first date
	return availableDates[0];
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
	return normalizeDate(dateStr) === getTodayDate();
}

/**
 * Get the storage key for an event
 */
function getStorageKey(eventId: string): string {
	return `${STORAGE_KEY_PREFIX}${eventId}`;
}

/**
 * Save selected date to localStorage for cross-page sync
 */
export function saveSelectedDateToStorage(eventId: string, date: string): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(getStorageKey(eventId), date);

		// Dispatch custom event for same-tab updates
		window.dispatchEvent(
			new CustomEvent("fame-date-changed", {
				detail: { eventId, date },
			})
		);
	} catch (error) {
		console.error("Failed to save date to localStorage:", error);
	}
}

/**
 * Get selected date from localStorage
 */
export function getSelectedDateFromStorage(eventId: string): string | null {
	if (typeof window === "undefined") return null;

	try {
		return localStorage.getItem(getStorageKey(eventId));
	} catch (error) {
		console.error("Failed to get date from localStorage:", error);
		return null;
	}
}

/**
 * Subscribe to date changes from other pages/tabs
 * Returns cleanup function
 */
export function subscribeToDateChanges(
	eventId: string,
	callback: (date: string) => void
): () => void {
	if (typeof window === "undefined") return () => {};

	// Handle storage events (cross-tab)
	const handleStorageChange = (e: StorageEvent) => {
		if (e.key === getStorageKey(eventId) && e.newValue) {
			callback(e.newValue);
		}
	};

	// Handle custom events (same-tab)
	const handleCustomEvent = (
		e: CustomEvent<{ eventId: string; date: string }>
	) => {
		if (e.detail.eventId === eventId) {
			callback(e.detail.date);
		}
	};

	window.addEventListener("storage", handleStorageChange);
	window.addEventListener(
		"fame-date-changed",
		handleCustomEvent as EventListener
	);

	return () => {
		window.removeEventListener("storage", handleStorageChange);
		window.removeEventListener(
			"fame-date-changed",
			handleCustomEvent as EventListener
		);
	};
}
