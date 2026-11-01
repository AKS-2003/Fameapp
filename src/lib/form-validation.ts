/** Shared text/URL validation helpers for show and profile forms. */

/** True when the value has content but no letters at all (e.g. "12345", "###"). */
export function isNumericOnly(value: string): boolean {
	const v = (value || "").trim();
	return v.length > 0 && !/\p{L}/u.test(v);
}

/** Accepts http(s) URLs with a real host (a dot, e.g. instagram.com). Empty is allowed by callers. */
export function isValidUrl(value: string): boolean {
	const v = (value || "").trim();
	if (!v) return false;
	try {
		const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
		const u = new URL(withProtocol);
		return /^[^\s.]+(\.[^\s.]+)+$/.test(u.hostname) && !/^\d+(\.\d+)*$/.test(u.hostname);
	} catch {
		return false;
	}
}

type Field = { label: string; value: string | undefined | null };

/** Returns messages for text fields that are numeric-only. */
export function checkTextFields(fields: Field[]): string[] {
	return fields
		.filter((f) => f.value && isNumericOnly(String(f.value)))
		.map((f) => `${f.label} must contain letters, not only numbers`);
}

/** Returns messages for non-empty URL fields that aren't valid URLs. */
export function checkUrlFields(fields: Field[]): string[] {
	return fields
		.filter((f) => f.value && String(f.value).trim() && !isValidUrl(String(f.value)))
		.map((f) => `${f.label} must be a valid link (e.g. https://example.com)`);
}

/**
 * Server-side validation for show payloads (used by POST/PUT /api/shows), so every client
 * (web and mobile) gets the same rules. Required-field checks only apply to non-draft shows.
 */
export function validateShowPayload(body: any, checkRequired = true): string | null {
	const errors: string[] = [
		...checkTextFields([
			{ label: "Show name", value: body.name },
			{ label: "Personal name", value: body.realName },
			{ label: "Performance style", value: body.style },
		]),
		...checkUrlFields([
			{ label: "Instagram", value: body.socialMedia?.instagram },
			{ label: "Facebook", value: body.socialMedia?.facebook },
			{ label: "TikTok", value: body.socialMedia?.tiktok },
			{ label: "YouTube", value: body.socialMedia?.youtube },
			{ label: "Website", value: body.socialMedia?.website },
		]),
	];
	if (checkRequired && body.isDraft === false) {
		if (!String(body.realName || "").trim()) errors.push("Your name is required");
		if (!String(body.phone || "").trim()) errors.push("WhatsApp number is required");
		if (!String(body.email || "").trim()) errors.push("Email is required");
	}
	return errors.length ? errors.join(". ") : null;
}

/** Validation for the public "Me" profile; returns a list of problems (empty when valid). */
export function validateMeProfile(p: any): string[] {
	const errors: string[] = [
		...checkTextFields([
			{ label: "Stage name", value: p.stageName },
			{ label: "Tagline", value: p.tagline },
			{ label: "City", value: p.city },
			{ label: "Country", value: p.country },
			{ label: "Biography", value: p.biography },
			{ label: "Languages", value: p.languages },
			{ label: "Performance styles", value: p.performanceStyles },
		]),
		...checkUrlFields([
			{ label: "Instagram", value: p.socialMedia?.instagram },
			{ label: "Facebook", value: p.socialMedia?.facebook },
			{ label: "YouTube", value: p.socialMedia?.youtube },
			{ label: "Website", value: p.socialMedia?.website },
		]),
	];
	if (p.biography && String(p.biography).length > 2000) errors.push("Biography must be 2000 characters or fewer");
	const thisYear = new Date().getFullYear();
	(p.knownFor || []).forEach((k: any, i: number) => {
		errors.push(...checkTextFields([{ label: `Known for #${i + 1} title`, value: k?.title }]));
		errors.push(...checkUrlFields([{ label: `Known for #${i + 1} video link`, value: k?.video }]));
	});
	(p.events || []).forEach((e: any, i: number) => {
		errors.push(...checkTextFields([{ label: `Event #${i + 1} name`, value: e?.name }, { label: `Event #${i + 1} location`, value: e?.location }]));
		if (e?.year && (!/^\d{4}$/.test(String(e.year)) || +e.year < 1900 || +e.year > thisYear + 1)) {
			errors.push(`Event #${i + 1} year must be a 4-digit year between 1900 and ${thisYear + 1}`);
		}
	});
	return errors;
}
