/**
 * Utility functions for consistent date handling across the application
 * Prevents timezone issues when displaying dates
 */

/**
 * Safely format a date string for display without timezone issues
 * @param dateString - Date string in various formats (ISO, YYYY-MM-DD, etc.)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatDateSafely(
	dateString: string,
	options: Intl.DateTimeFormatOptions = {}
): string {
	try {
		let date: Date;

		if (dateString.includes("T")) {
			// ISO format: 2025-09-08T00:00:00.000Z
			// Extract date part and create date at noon to avoid timezone issues
			const datePart = dateString.split("T")[0];
			date = new Date(datePart + "T12:00:00");
		} else if (dateString.includes("-") && dateString.length === 10) {
			// YYYY-MM-DD format: add noon time to avoid timezone issues
			date = new Date(dateString + "T12:00:00");
		} else {
			// Fallback for other formats
			date = new Date(dateString);
		}

		// Default options for consistent formatting
		const defaultOptions: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
			...options,
		};

		return date.toLocaleDateString("en-US", defaultOptions);
	} catch (error) {
		console.error("Error formatting date:", dateString, error);
		return dateString; // Return original string if formatting fails
	}
}

/**
 * Format date for dropdown display with weekday
 * @param dateString - Date string to format
 * @returns Formatted date string with weekday
 */
export function formatDateForDropdown(dateString: string): string {
	return formatDateSafely(dateString, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Format date for simple display (no weekday)
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export function formatDateSimple(dateString: string): string {
	return formatDateSafely(dateString, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	});
}

/**
 * Normalize date string to YYYY-MM-DD format for consistent storage/comparison
 * @param dateString - Date string in various formats
 * @returns Date string in YYYY-MM-DD format
 */
export function normalizeDateString(dateString: string): string {
	try {
		let date: Date;

		if (dateString.includes("T")) {
			// ISO format: extract date part
			const datePart = dateString.split("T")[0];
			date = new Date(datePart + "T12:00:00");
		} else if (dateString.includes("-") && dateString.length === 10) {
			// Already in YYYY-MM-DD format, but create date safely
			date = new Date(dateString + "T12:00:00");
		} else {
			// Other formats
			date = new Date(dateString);
		}

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error("Error normalizing date:", dateString, error);
		return dateString; // Return original if normalization fails
	}
}
