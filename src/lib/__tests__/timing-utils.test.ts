// Timing Utilities Test Suite
// Tests show timing calculations with actual duration priority

import {
	calculateTotalShowTime,
	formatTime,
	calculateItemTiming,
	formatDuration,
	getDisplayDuration,
	getDurationInMinutes,
} from "../timing-utils";

describe("Timing Utilities", () => {
	const mockArtist1 = {
		id: "1",
		artist_name: "Artist 1",
		performance_duration: 10, // 10 minutes
		actual_duration: 480, // 8 minutes in seconds
	};

	const mockArtist2 = {
		id: "2",
		artist_name: "Artist 2",
		performance_duration: 15, // 15 minutes
		actual_duration: null, // No actual duration
	};

	const mockCue = {
		id: "3",
		title: "MC Break",
		duration: 5, // 5 minutes
	};

	const mockShowOrderItems = [
		{
			id: "1",
			type: "artist" as const,
			artist: mockArtist1,
			performance_order: 1,
		},
		{
			id: "2",
			type: "artist" as const,
			artist: mockArtist2,
			performance_order: 2,
		},
		{
			id: "3",
			type: "cue" as const,
			cue: mockCue,
			performance_order: 3,
		},
	];

	describe("calculateTotalShowTime", () => {
		it("should calculate total time using actual duration when available", () => {
			const totalTime = calculateTotalShowTime(mockShowOrderItems);

			// Artist 1: 8 minutes (actual), Artist 2: 15 minutes (performance), Cue: 5 minutes
			// Total: 8 + 15 + 5 = 28 minutes
			expect(totalTime).toBe(28);
		});

		it("should handle empty show order", () => {
			const totalTime = calculateTotalShowTime([]);
			expect(totalTime).toBe(0);
		});

		it("should handle items without duration", () => {
			const itemsWithoutDuration = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						artist_name: "Artist",
						performance_duration: 0,
						actual_duration: null,
					},
					performance_order: 1,
				},
			];

			const totalTime = calculateTotalShowTime(itemsWithoutDuration);
			expect(totalTime).toBe(0);
		});
	});

	describe("formatTime", () => {
		it("should format minutes only for times under 1 hour", () => {
			expect(formatTime(30)).toBe("30m");
			expect(formatTime(59)).toBe("59m");
		});

		it("should format hours and minutes for times over 1 hour", () => {
			expect(formatTime(60)).toBe("1h 0m");
			expect(formatTime(90)).toBe("1h 30m");
			expect(formatTime(125)).toBe("2h 5m");
		});

		it("should handle zero time", () => {
			expect(formatTime(0)).toBe("0m");
		});
	});

	describe("calculateItemTiming", () => {
		const showStartTime = "19:00";

		it("should calculate correct start and end times", () => {
			const timing = calculateItemTiming(
				mockShowOrderItems,
				0,
				showStartTime
			);

			expect(timing.startTime).toBe("19:00");
			expect(timing.endTime).toBe("19:08"); // 8 minutes actual duration
			expect(timing.duration).toBe(8);
			expect(timing.actualDurationSeconds).toBe(480);
		});

		it("should calculate cumulative timing for subsequent items", () => {
			// Second item (Artist 2)
			const timing = calculateItemTiming(
				mockShowOrderItems,
				1,
				showStartTime
			);

			expect(timing.startTime).toBe("19:08"); // After first artist
			expect(timing.endTime).toBe("19:23"); // 15 minutes performance duration
			expect(timing.duration).toBe(15);
			expect(timing.actualDurationSeconds).toBe(900); // 15 * 60
		});

		it("should handle cue timing", () => {
			// Third item (Cue)
			const timing = calculateItemTiming(
				mockShowOrderItems,
				2,
				showStartTime
			);

			expect(timing.startTime).toBe("19:23"); // After first two items
			expect(timing.endTime).toBe("19:28"); // 5 minutes cue duration
			expect(timing.duration).toBe(5);
			expect(timing.actualDurationSeconds).toBe(300); // 5 * 60
		});

		it("should return empty timing when no show start time", () => {
			const timing = calculateItemTiming(mockShowOrderItems, 0);

			expect(timing.startTime).toBe("");
			expect(timing.endTime).toBe("");
			expect(timing.duration).toBe(0);
			expect(timing.actualDurationSeconds).toBe(0);
		});

		it("should handle times crossing midnight", () => {
			const lateStartTime = "23:30";
			const longItems = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						artist_name: "Artist",
						performance_duration: 90, // 1.5 hours
						actual_duration: null,
					},
					performance_order: 1,
				},
			];

			const timing = calculateItemTiming(longItems, 0, lateStartTime);

			expect(timing.startTime).toBe("23:30");
			expect(timing.endTime).toBe("01:00"); // Next day
		});
	});

	describe("formatDuration", () => {
		it("should format seconds to MM:SS format", () => {
			expect(formatDuration(60)).toBe("1:00");
			expect(formatDuration(90)).toBe("1:30");
			expect(formatDuration(3661)).toBe("61:01"); // Over 1 hour
		});

		it("should handle zero and null values", () => {
			expect(formatDuration(0)).toBe("0:00");
			expect(formatDuration(null)).toBe("N/A");
		});

		it("should pad seconds with leading zero", () => {
			expect(formatDuration(65)).toBe("1:05");
			expect(formatDuration(125)).toBe("2:05");
		});
	});

	describe("getDisplayDuration", () => {
		it("should prefer actual duration over performance duration", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: 480, // 8 minutes
			};

			expect(getDisplayDuration(artist)).toBe("8:00");
		});

		it("should fallback to performance duration when no actual duration", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: null,
			};

			expect(getDisplayDuration(artist)).toBe("10 min");
		});

		it("should handle zero actual duration", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: 0,
			};

			expect(getDisplayDuration(artist)).toBe("0:00");
		});
	});

	describe("getDurationInMinutes", () => {
		it("should convert actual duration from seconds to minutes", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: 480, // 8 minutes
			};

			expect(getDurationInMinutes(artist)).toBe(8);
		});

		it("should return performance duration when no actual duration", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: null,
			};

			expect(getDurationInMinutes(artist)).toBe(10);
		});

		it("should round up partial minutes", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: 450, // 7.5 minutes
			};

			expect(getDurationInMinutes(artist)).toBe(8); // Rounded up
		});

		it("should handle zero durations", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 0,
				actual_duration: null,
			};

			expect(getDurationInMinutes(artist)).toBe(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle very long performances", () => {
			const longPerformance = {
				id: "1",
				type: "artist" as const,
				artist: {
					id: "1",
					artist_name: "Long Artist",
					performance_duration: 180, // 3 hours
					actual_duration: 7200, // 2 hours in seconds
				},
				performance_order: 1,
			};

			const totalTime = calculateTotalShowTime([longPerformance]);
			expect(totalTime).toBe(120); // 2 hours = 120 minutes

			const formatted = formatTime(totalTime);
			expect(formatted).toBe("2h 0m");
		});

		it("should handle fractional seconds in actual duration", () => {
			const artist = {
				id: "1",
				artist_name: "Artist",
				performance_duration: 10,
				actual_duration: 123.456, // Fractional seconds
			};

			const minutes = getDurationInMinutes(artist);
			expect(minutes).toBe(3); // Math.ceil(123.456 / 60) = 3
		});

		it("should handle missing artist or cue data", () => {
			const incompleteItems = [
				{
					id: "1",
					type: "artist" as const,
					artist: undefined,
					performance_order: 1,
				},
				{
					id: "2",
					type: "cue" as const,
					cue: undefined,
					performance_order: 2,
				},
			];

			const totalTime = calculateTotalShowTime(incompleteItems);
			expect(totalTime).toBe(0);
		});
	});
});
