/**
 * Phone validation (E.164): optional leading "+", country code not starting with 0,
 * 8–15 digits total. Spaces, dashes, dots and parentheses are ignored.
 */
export function normalizePhone(raw: string): string {
	return (raw || "").replace(/[\s\-().]/g, "");
}

export function isValidPhone(raw: string): boolean {
	const value = normalizePhone(raw);
	return /^\+?[1-9]\d{7,14}$/.test(value);
}

export const PHONE_ERROR_MESSAGE =
	"Enter a valid phone number with country code, e.g. +971501234567 (8–15 digits).";
