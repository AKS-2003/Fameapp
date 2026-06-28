// Data Validation Test Suite
// Tests data validation and consistency checks

import {
	validateArtist,
	validateCue,
	validateWebSocketEvent,
	checkShowOrderConsistency,
	reconcileArtistData,
	reconcileShowOrder,
	sanitizeArtistData,
	sanitizeCueData,
	hasSignificantChange,
	validatePerformanceOrder,
} from "../data-validation";

describe("Data Validation", () => {
	describe("validateArtist", () => {
		const validArtist = {
			id: "artist-123",
			artist_name: "Test Artist",
			style: "Comedy",
			performance_duration: 10,
			actual_duration: 600,
			quality_rating: 2,
			performance_order: 1,
			rehearsal_completed: true,
			performance_status: "not_started",
			performance_date: "2025-01-01",
		};

		it("should validate a correct artist object", () => {
			const result = validateArtist(validArtist);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject artist with missing required fields", () => {
			const invalidArtist = {
				id: "artist-123",
				// Missing artist_name, style, performance_duration
			};

			const result = validateArtist(invalidArtist);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Missing required field: artist_name"
			);
			expect(result.errors).toContain("Missing required field: style");
			expect(result.errors).toContain(
				"Missing required field: performance_duration"
			);
		});

		it("should reject artist with wrong field types", () => {
			const invalidArtist = {
				...validArtist,
				performance_duration: "10", // Should be number
				rehearsal_completed: "true", // Should be boolean
			};

			const result = validateArtist(invalidArtist);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Field performance_duration should be number, got string"
			);
			expect(result.errors).toContain(
				"Field rehearsal_completed should be boolean, got string"
			);
		});

		it("should reject invalid performance status", () => {
			const invalidArtist = {
				...validArtist,
				performance_status: "invalid_status",
			};

			const result = validateArtist(invalidArtist);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Invalid performance_status: invalid_status"
			);
		});

		it("should reject invalid quality rating", () => {
			const invalidArtist = {
				...validArtist,
				quality_rating: 5, // Should be 1-3
			};

			const result = validateArtist(invalidArtist);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Quality rating must be between 1 and 3"
			);
		});

		it("should reject negative performance duration", () => {
			const invalidArtist = {
				...validArtist,
				performance_duration: -5,
			};

			const result = validateArtist(invalidArtist);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Performance duration must be positive"
			);
		});
	});

	describe("validateCue", () => {
		const validCue = {
			id: "cue-123",
			type: "mc_break",
			title: "MC Break",
			duration: 5,
			performance_order: 1,
			notes: "Test notes",
			is_completed: false,
			performance_status: "not_started",
		};

		it("should validate a correct cue object", () => {
			const result = validateCue(validCue);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject cue with missing required fields", () => {
			const invalidCue = {
				id: "cue-123",
				// Missing type, title, performance_order
			};

			const result = validateCue(invalidCue);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Missing required field: type");
			expect(result.errors).toContain("Missing required field: title");
			expect(result.errors).toContain(
				"Missing required field: performance_order"
			);
		});

		it("should reject invalid cue type", () => {
			const invalidCue = {
				...validCue,
				type: "invalid_type",
			};

			const result = validateCue(invalidCue);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid cue type: invalid_type");
		});

		it("should reject negative duration", () => {
			const invalidCue = {
				...validCue,
				duration: -5,
			};

			const result = validateCue(invalidCue);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Duration must be positive");
		});
	});

	describe("validateWebSocketEvent", () => {
		it("should validate correct WebSocket events", () => {
			const validEvent = {
				eventId: "event-123",
				artistId: "artist-123",
				status: "currently_on_stage",
			};

			const result = validateWebSocketEvent(
				"artist_status_changed",
				validEvent
			);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject events with missing required fields", () => {
			const invalidEvent = {
				artistId: "artist-123",
				// Missing eventId
			};

			const result = validateWebSocketEvent(
				"artist_status_changed",
				invalidEvent
			);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Missing eventId");
		});

		it("should reject events with invalid event type", () => {
			const result = validateWebSocketEvent("", { eventId: "test" });
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Event type must be a non-empty string"
			);
		});
	});

	describe("checkShowOrderConsistency", () => {
		it("should pass for consistent show order", () => {
			const consistentItems = [
				{
					id: "1",
					type: "artist" as const,
					performance_order: 1,
					status: "not_started" as const,
				},
				{
					id: "2",
					type: "artist" as const,
					performance_order: 2,
					status: "next_on_deck" as const,
				},
			];

			const result = checkShowOrderConsistency(consistentItems);
			expect(result.isConsistent).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it("should detect duplicate performance orders", () => {
			const duplicateItems = [
				{
					id: "1",
					type: "artist" as const,
					performance_order: 1,
					status: "not_started" as const,
				},
				{
					id: "2",
					type: "artist" as const,
					performance_order: 1, // Duplicate
					status: "next_on_deck" as const,
				},
			];

			const result = checkShowOrderConsistency(duplicateItems);
			expect(result.isConsistent).toBe(false);
			expect(result.issues).toContain(
				"Duplicate performance orders detected"
			);
		});

		it("should detect gaps in performance order", () => {
			const gappedItems = [
				{
					id: "1",
					type: "artist" as const,
					performance_order: 1,
					status: "not_started" as const,
				},
				{
					id: "2",
					type: "artist" as const,
					performance_order: 3, // Gap at 2
					status: "next_on_deck" as const,
				},
			];

			const result = checkShowOrderConsistency(gappedItems);
			expect(result.isConsistent).toBe(false);
			expect(result.issues).toContain(
				"Gap in performance order between 1 and 3"
			);
		});

		it("should detect multiple currently on stage", () => {
			const multipleOnStage = [
				{
					id: "1",
					type: "artist" as const,
					performance_order: 1,
					status: "currently_on_stage" as const,
				},
				{
					id: "2",
					type: "artist" as const,
					performance_order: 2,
					status: "currently_on_stage" as const, // Multiple on stage
				},
			];

			const result = checkShowOrderConsistency(multipleOnStage);
			expect(result.isConsistent).toBe(false);
			expect(result.issues).toContain(
				"Multiple items marked as currently on stage"
			);
		});

		it("should detect unrehearsed artists in show order", () => {
			const unrehearsedItems = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						artist_name: "Artist",
						rehearsal_completed: false, // Not rehearsed
					},
					performance_order: 1,
					status: "next_on_stage" as const, // But in show order
				},
			];

			const result = checkShowOrderConsistency(unrehearsedItems);
			expect(result.isConsistent).toBe(false);
			expect(result.issues).toContain(
				"Artists in show order without completed rehearsal"
			);
		});
	});

	describe("reconcileArtistData", () => {
		it("should prefer server data by default", () => {
			const localData = {
				id: "1",
				artist_name: "Local Name",
				style: "Comedy",
				performance_duration: 10,
				rehearsal_completed: true,
				performance_status: "next_on_stage",
			};

			const serverData = {
				id: "1",
				artist_name: "Server Name",
				style: "Comedy",
				performance_duration: 10,
				rehearsal_completed: true,
				performance_status: "currently_on_stage",
			};

			const reconciled = reconcileArtistData(localData, serverData);
			expect(reconciled.artist_name).toBe("Server Name");
			expect(reconciled.performance_status).toBe("currently_on_stage");
		});

		it("should keep local updates when they are newer", () => {
			const localData = {
				id: "1",
				artist_name: "Artist",
				style: "Comedy",
				performance_duration: 10,
				rehearsal_completed: true,
				performance_status: "currently_on_stage",
				lastUpdated: 1000,
			};

			const serverData = {
				id: "1",
				artist_name: "Artist",
				style: "Comedy",
				performance_duration: 10,
				rehearsal_completed: true,
				performance_status: "next_on_stage",
				lastUpdated: 500, // Older
			};

			const reconciled = reconcileArtistData(localData, serverData);
			expect(reconciled.performance_status).toBe("currently_on_stage"); // Local wins
		});
	});

	describe("sanitizeArtistData", () => {
		it("should sanitize valid artist data", () => {
			const rawData = {
				id: 123, // Number
				artist_name: "  Test Artist  ", // With whitespace
				style: "Comedy",
				performance_duration: "10", // String number
				rehearsal_completed: 1, // Truthy value
				performance_status: "not_started",
			};

			const sanitized = sanitizeArtistData(rawData);
			expect(sanitized).not.toBeNull();
			expect(sanitized!.id).toBe("123");
			expect(sanitized!.artist_name).toBe("Test Artist");
			expect(sanitized!.performance_duration).toBe(10);
			expect(sanitized!.rehearsal_completed).toBe(true);
		});

		it("should return null for invalid data", () => {
			const invalidData = {
				// Missing required fields
				style: "Comedy",
			};

			const sanitized = sanitizeArtistData(invalidData);
			expect(sanitized).toBeNull();
		});
	});

	describe("hasSignificantChange", () => {
		it("should detect significant changes", () => {
			const oldData = {
				status: "not_started",
				order: 1,
				name: "Artist",
			};

			const newData = {
				status: "currently_on_stage", // Changed
				order: 1,
				name: "Artist",
			};

			const hasChange = hasSignificantChange(oldData, newData, [
				"status",
				"order",
			]);
			expect(hasChange).toBe(true);
		});

		it("should not detect insignificant changes", () => {
			const oldData = {
				status: "not_started",
				order: 1,
				name: "Artist",
			};

			const newData = {
				status: "not_started",
				order: 1,
				name: "Different Artist", // Changed but not significant
			};

			const hasChange = hasSignificantChange(oldData, newData, [
				"status",
				"order",
			]);
			expect(hasChange).toBe(false);
		});
	});

	describe("validatePerformanceOrder", () => {
		it("should validate correct performance order", () => {
			const validOrder = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						artist_name: "Artist 1",
						style: "Comedy",
						performance_duration: 10,
						rehearsal_completed: true,
					},
					performance_order: 1,
				},
			];

			const result = validatePerformanceOrder(validOrder);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect invalid items in performance order", () => {
			const invalidOrder = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						// Missing required fields
						style: "Comedy",
					},
					performance_order: 1,
				},
			];

			const result = validatePerformanceOrder(invalidOrder);
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});
