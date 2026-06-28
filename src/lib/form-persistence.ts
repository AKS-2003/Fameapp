/**
 * Form Persistence Utility
 * Automatically saves and restores form data using localStorage
 * Prevents data loss on page refresh or accidental close
 */

const STORAGE_PREFIX = "fame_form_";
const EXPIRY_HOURS = 24; // Data expires after 24 hours

interface StorageData<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

/**
 * Save form data to localStorage
 * @param key - Unique identifier for the form (e.g., "artist-register-123")
 * @param data - Form data to save
 */
export function saveFormData<T>(key: string, data: T): void {
	try {
		const storageKey = `${STORAGE_PREFIX}${key}`;
		const now = Date.now();
		const expiresAt = now + EXPIRY_HOURS * 60 * 60 * 1000;

		const storageData: StorageData<T> = {
			data,
			timestamp: now,
			expiresAt,
		};

		localStorage.setItem(storageKey, JSON.stringify(storageData));
		console.log(`✅ Form data saved: ${key}`);
	} catch (error) {
		console.error("Failed to save form data:", error);
	}
}

/**
 * Load form data from localStorage
 * @param key - Unique identifier for the form
 * @returns Saved form data or null if not found/expired
 */
export function loadFormData<T>(key: string): T | null {
	try {
		const storageKey = `${STORAGE_PREFIX}${key}`;
		const stored = localStorage.getItem(storageKey);

		if (!stored) {
			return null;
		}

		const storageData: StorageData<T> = JSON.parse(stored);
		const now = Date.now();

		// Check if data has expired
		if (now > storageData.expiresAt) {
			console.log(`⏰ Form data expired: ${key}`);
			clearFormData(key);
			return null;
		}

		console.log(`✅ Form data loaded: ${key}`);
		return storageData.data;
	} catch (error) {
		console.error("Failed to load form data:", error);
		return null;
	}
}

/**
 * Clear form data from localStorage
 * @param key - Unique identifier for the form
 */
export function clearFormData(key: string): void {
	try {
		const storageKey = `${STORAGE_PREFIX}${key}`;
		localStorage.removeItem(storageKey);
		console.log(`🗑️ Form data cleared: ${key}`);
	} catch (error) {
		console.error("Failed to clear form data:", error);
	}
}

/**
 * Check if form data exists
 * @param key - Unique identifier for the form
 * @returns True if data exists and is not expired
 */
export function hasFormData(key: string): boolean {
	const data = loadFormData(key);
	return data !== null;
}

/**
 * Get all saved form keys
 * @returns Array of form keys
 */
export function getAllFormKeys(): string[] {
	try {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(STORAGE_PREFIX)) {
				keys.push(key.replace(STORAGE_PREFIX, ""));
			}
		}
		return keys;
	} catch (error) {
		console.error("Failed to get form keys:", error);
		return [];
	}
}

/**
 * Clear all expired form data
 */
export function clearExpiredFormData(): void {
	try {
		const now = Date.now();
		const keys = getAllFormKeys();

		for (const key of keys) {
			const storageKey = `${STORAGE_PREFIX}${key}`;
			const stored = localStorage.getItem(storageKey);

			if (stored) {
				try {
					const storageData: StorageData<any> = JSON.parse(stored);
					if (now > storageData.expiresAt) {
						localStorage.removeItem(storageKey);
						console.log(`🗑️ Expired form data cleared: ${key}`);
					}
				} catch {
					// Invalid data, remove it
					localStorage.removeItem(storageKey);
				}
			}
		}
	} catch (error) {
		console.error("Failed to clear expired form data:", error);
	}
}

/**
 * React hook for form persistence
 * @param key - Unique identifier for the form
 * @param initialData - Initial form data
 * @param autoSaveDelay - Delay in ms before auto-saving (default: 1000ms)
 * @returns [data, setData, clearData, hasUnsavedChanges]
 */
export function useFormPersistence<T>(
	key: string,
	initialData: T,
	autoSaveDelay: number = 1000
): {
	data: T;
	setData: (data: T) => void;
	clearData: () => void;
	hasUnsavedChanges: boolean;
	saveNow: () => void;
} {
	// This is a utility function, actual hook implementation
	// will be in the component
	return {
		data: initialData,
		setData: () => {},
		clearData: () => {},
		hasUnsavedChanges: false,
		saveNow: () => {},
	};
}

/**
 * Debounce function for auto-save
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Show notification when form data is restored
 */
export function showRestoredNotification(
	message: string = "Your previous progress has been restored"
): void {
	// This can be integrated with your toast system
	console.log(`📋 ${message}`);
}

/**
 * Warn user before leaving page with unsaved changes
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @returns Cleanup function
 */
export function setupBeforeUnloadWarning(
	hasUnsavedChanges: boolean
): (() => void) | undefined {
	if (typeof window === "undefined") return undefined;

	const handleBeforeUnload = (e: BeforeUnloadEvent) => {
		if (hasUnsavedChanges) {
			e.preventDefault();
			e.returnValue = "";
			return "";
		}
	};

	if (hasUnsavedChanges) {
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}

	return undefined;
}
