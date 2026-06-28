/**
 * Artist Registration Validation
 * Comprehensive validation for all required fields
 */

export interface ArtistData {
	artist_name: string;
	real_name: string;
	email: string;
	phone: string;
	style: string;
	performance_type: string;
	biography: string;
	notes: string;
	props_needed: string;
	performance_duration: number;
	costume_color: string;
	custom_costume_color: string;
	light_color_single: string;
	light_color_two: string;
	light_color_three: string;
	light_requests: string;
	show_link: string;
	stage_position_start: string;
	stage_position_end: string;
	custom_stage_position: string;
	mc_notes: string;
	stage_manager_notes: string;
	instagram_link: string;
	facebook_link: string;
	tiktok_link: string;
	youtube_link: string;
	website_link: string;
}

export interface MusicTrack {
	song_title: string;
	duration: number;
	notes: string;
	is_main_track: boolean;
	tempo: string;
	file_url: string;
	file_path?: string;
}

export interface ValidationError {
	field: string;
	message: string;
	section: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	missingFields: string[];
}

/**
 * Validate artist registration data
 * @param artistData - Artist information
 * @param musicTracks - Music tracks
 * @returns Validation result with errors
 */
export function validateArtistRegistration(
	artistData: ArtistData,
	musicTracks: MusicTrack[]
): ValidationResult {
	const errors: ValidationError[] = [];
	const missingFields: string[] = [];

	// 1. BASIC INFORMATION (Required)
	if (!artistData.artist_name || !artistData.artist_name.trim()) {
		errors.push({
			field: "artist_name",
			message: "Artist/Stage Name is required",
			section: "Basic Information",
		});
		missingFields.push("Artist Name");
	}

	if (!artistData.email || !artistData.email.trim()) {
		errors.push({
			field: "email",
			message: "Email is required",
			section: "Basic Information",
		});
		missingFields.push("Email");
	} else if (!isValidEmail(artistData.email)) {
		errors.push({
			field: "email",
			message: "Please enter a valid email address",
			section: "Basic Information",
		});
	}

	// 2. MUSIC INFORMATION (Required)
	const validTracks = musicTracks.filter(
		(track) => track.song_title && track.song_title.trim()
	);

	if (validTracks.length === 0) {
		errors.push({
			field: "musicTracks",
			message: "At least one music track with a title is required",
			section: "Music Information",
		});
		missingFields.push("Music Track");
	}

	// Check if tracks have file URLs
	const tracksWithFiles = validTracks.filter((track) => track.file_url);
	if (tracksWithFiles.length === 0 && validTracks.length > 0) {
		errors.push({
			field: "musicTracks",
			message: "Please upload audio files for your music tracks",
			section: "Music Information",
		});
		missingFields.push("Music Files");
	}

	// 3. TECHNICAL INFORMATION (Required)
	if (!artistData.costume_color || artistData.costume_color === "") {
		errors.push({
			field: "costume_color",
			message: "Costume Color is required",
			section: "Technical Show Director Information",
		});
		missingFields.push("Costume Color");
	}

	// If custom costume color is selected, require description
	if (
		artistData.costume_color === "custom" &&
		(!artistData.custom_costume_color ||
			!artistData.custom_costume_color.trim())
	) {
		errors.push({
			field: "custom_costume_color",
			message: "Please describe your custom costume color",
			section: "Technical Show Director Information",
		});
		missingFields.push("Custom Costume Color Description");
	}

	// 4. PERFORMANCE DURATION (Required)
	if (
		!artistData.performance_duration ||
		artistData.performance_duration <= 0
	) {
		errors.push({
			field: "performance_duration",
			message: "Performance duration must be greater than 0",
			section: "Basic Information",
		});
		missingFields.push("Performance Duration");
	}

	return {
		isValid: errors.length === 0,
		errors,
		missingFields,
	};
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Get validation error message for display
 */
export function getValidationErrorMessage(result: ValidationResult): string {
	if (result.isValid) return "";

	if (result.missingFields.length > 0) {
		return `Please fill in the following required fields: ${result.missingFields.join(
			", "
		)}`;
	}

	return result.errors[0]?.message || "Please complete all required fields";
}

/**
 * Get all validation errors grouped by section
 */
export function getErrorsBySection(
	result: ValidationResult
): Record<string, ValidationError[]> {
	const grouped: Record<string, ValidationError[]> = {};

	for (const error of result.errors) {
		if (!grouped[error.section]) {
			grouped[error.section] = [];
		}
		grouped[error.section].push(error);
	}

	return grouped;
}

/**
 * Check if a specific field has an error
 */
export function hasFieldError(
	result: ValidationResult,
	fieldName: string
): boolean {
	return result.errors.some((error) => error.field === fieldName);
}

/**
 * Get error message for a specific field
 */
export function getFieldError(
	result: ValidationResult,
	fieldName: string
): string | null {
	const error = result.errors.find((error) => error.field === fieldName);
	return error ? error.message : null;
}

/**
 * Validate before allowing login
 * Artists can only login if they have completed registration
 */
export function canArtistLogin(
	artistData: ArtistData,
	musicTracks: MusicTrack[]
): { canLogin: boolean; reason?: string } {
	const validation = validateArtistRegistration(artistData, musicTracks);

	if (!validation.isValid) {
		return {
			canLogin: false,
			reason: `Registration incomplete. Missing: ${validation.missingFields.join(
				", "
			)}`,
		};
	}

	return { canLogin: true };
}

/**
 * Get completion percentage
 */
export function getCompletionPercentage(
	artistData: ArtistData,
	musicTracks: MusicTrack[]
): number {
	let completed = 0;
	let total = 0;

	// Required fields
	const requiredFields = [
		artistData.artist_name,
		artistData.email,
		artistData.costume_color,
	];

	for (const field of requiredFields) {
		total++;
		if (field && field.trim()) completed++;
	}

	// Music tracks
	total++;
	const validTracks = musicTracks.filter(
		(track) => track.song_title && track.song_title.trim() && track.file_url
	);
	if (validTracks.length > 0) completed++;

	// Performance duration
	total++;
	if (artistData.performance_duration > 0) completed++;

	return Math.round((completed / total) * 100);
}

/**
 * Highlight required fields that are missing
 */
export function getRequiredFieldsStatus(
	artistData: ArtistData,
	musicTracks: MusicTrack[]
): Record<string, boolean> {
	return {
		artist_name: !!(
			artistData.artist_name && artistData.artist_name.trim()
		),
		email: !!(
			artistData.email &&
			artistData.email.trim() &&
			isValidEmail(artistData.email)
		),
		costume_color: !!(
			artistData.costume_color && artistData.costume_color !== ""
		),
		musicTracks: musicTracks.some(
			(track) =>
				track.song_title && track.song_title.trim() && track.file_url
		),
		performance_duration: artistData.performance_duration > 0,
	};
}
