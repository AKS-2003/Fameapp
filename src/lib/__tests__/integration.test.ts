// Integration Test Suite
// Tests cross-page synchronization and end-to-end workflows

import { WebSocketManager } from "../websocket-manager";
import { validateArtist, checkShowOrderConsistency } from "../data-validation";
import { calculateTotalShowTime, getDurationInMinutes } from "../timing-utils";
import { getStatusColorClasses, sortByStatus } from "../status-utils";

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Socket.IO
const mockSocket = {
	on: jest.fn(),
	emit: jest.fn(),
	disconnect: jest.fn(),
	connected: true,
};

(global as any).io = jest.fn(() => mockSocket);

// Mock DOM APIs
Object.defineProperty(document, "hidden", { writable: true, value: false });
Object.defineProperty(document, "addEventListener", { value: jest.fn() });
Object.defineProperty(document, "removeEventListener", { value: jest.fn() });
Object.defineProperty(window, "dispatchEvent", { value: jest.fn() });

describe("Integration Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		(fetch as jest.Mock).mockClear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Cross-Page Data Synchronization", () => {
		it("should synchronize artist status changes across all pages", async () => {
			// Simulate WebSocket managers for different pages
			const performanceOrderWS = new WebSocketManager({
				eventId: "test-event",
				role: "stage_manager",
				showToasts: true,
				onDataUpdate: jest.fn(),
			});

			const djWS = new WebSocketManager({
				eventId: "test-event",
				role: "dj",
				showToasts: true,
				onDataUpdate: jest.fn(),
			});

			const mcWS = new WebSocketManager({
				eventId: "test-event",
				role: "mc",
				showToasts: true,
				onDataUpdate: jest.fn(),
			});

			await Promise.all([
				performanceOrderWS.initialize(),
				djWS.initialize(),
				mcWS.initialize(),
			]);

			// Simulate artist status change event
			const statusChangeEvent = {
				eventId: "test-event",
				artistId: "artist-123",
				artist_name: "Test Artist",
				status: "currently_on_stage",
			};

			// Find the event handler for artist_status_changed
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			// Trigger the event
			eventHandler(statusChangeEvent);

			// Verify all pages receive the update
			expect(performanceOrderWS.options.onDataUpdate).toHaveBeenCalled();
			expect(djWS.options.onDataUpdate).toHaveBeenCalled();
			expect(mcWS.options.onDataUpdate).toHaveBeenCalled();

			// Verify toast notifications are dispatched
			expect(window.dispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "websocket-toast",
					detail: expect.objectContaining({
						title: "Status Updated",
						description: "Test Artist is now Currently On Stage",
					}),
				})
			);

			// Cleanup
			performanceOrderWS.destroy();
			djWS.destroy();
			mcWS.destroy();
		});

		it("should handle rehearsal completion workflow", async () => {
			const rehearsalWS = new WebSocketManager({
				eventId: "test-event",
				role: "stage_manager",
				onDataUpdate: jest.fn(),
			});

			const performanceOrderWS = new WebSocketManager({
				eventId: "test-event",
				role: "stage_manager",
				onDataUpdate: jest.fn(),
			});

			await Promise.all([
				rehearsalWS.initialize(),
				performanceOrderWS.initialize(),
			]);

			// Simulate rehearsal completion
			const rehearsalEvent = {
				eventId: "test-event",
				artistId: "artist-123",
				artist_name: "Test Artist",
				action: "completed",
			};

			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "rehearsal_updated"
			)[1];

			eventHandler(rehearsalEvent);

			// Both pages should update
			expect(rehearsalWS.options.onDataUpdate).toHaveBeenCalled();
			expect(performanceOrderWS.options.onDataUpdate).toHaveBeenCalled();

			rehearsalWS.destroy();
			performanceOrderWS.destroy();
		});
	});

	describe("End-to-End Show Management Workflow", () => {
		const mockArtists = [
			{
				id: "artist-1",
				artist_name: "Comedian 1",
				style: "Comedy",
				performance_duration: 10,
				actual_duration: 480, // 8 minutes
				rehearsal_completed: true,
				performance_order: 1,
				performance_status: "not_started",
			},
			{
				id: "artist-2",
				artist_name: "Dancer 1",
				style: "Dance",
				performance_duration: 15,
				actual_duration: null,
				rehearsal_completed: true,
				performance_order: 2,
				performance_status: "not_started",
			},
		];

		const mockCues = [
			{
				id: "cue-1",
				type: "mc_break",
				title: "MC Break",
				duration: 5,
				performance_order: 3,
				performance_status: "not_started",
			},
		];

		it("should validate complete show order", () => {
			// Validate individual artists
			mockArtists.forEach((artist) => {
				const validation = validateArtist(artist);
				expect(validation.isValid).toBe(true);
			});

			// Create show order items
			const showOrderItems = [
				...mockArtists.map((artist) => ({
					id: artist.id,
					type: "artist" as const,
					artist,
					performance_order: artist.performance_order,
					status: artist.performance_status,
				})),
				...mockCues.map((cue) => ({
					id: cue.id,
					type: "cue" as const,
					cue,
					performance_order: cue.performance_order,
					status: cue.performance_status,
				})),
			];

			// Check consistency
			const consistency = checkShowOrderConsistency(showOrderItems);
			expect(consistency.isConsistent).toBe(true);

			// Calculate total show time
			const totalTime = calculateTotalShowTime(showOrderItems);
			expect(totalTime).toBe(28); // 8 + 15 + 5 minutes
		});

		it("should handle status progression workflow", () => {
			const artist = { ...mockArtists[0] };
			const statusProgression = [
				"not_started",
				"next_on_deck",
				"next_on_stage",
				"currently_on_stage",
				"completed",
			];

			statusProgression.forEach((status) => {
				artist.performance_status = status;

				// Validate status
				const validation = validateArtist(artist);
				expect(validation.isValid).toBe(true);

				// Check status colors
				const colorClass = getStatusColorClasses(status);
				expect(colorClass).toBeDefined();
				expect(colorClass).toContain("bg-white");
			});
		});

		it("should sort artists by status priority", () => {
			const mixedStatusArtists = [
				{ id: "1", status: "completed" },
				{ id: "2", status: "not_started" },
				{ id: "3", status: "currently_on_stage" },
				{ id: "4", status: "next_on_deck" },
				{ id: "5", status: "next_on_stage" },
			];

			const sorted = sortByStatus(mixedStatusArtists);
			const expectedOrder = [
				"not_started",
				"next_on_deck",
				"next_on_stage",
				"currently_on_stage",
				"completed",
			];

			expect(sorted.map((a) => a.status)).toEqual(expectedOrder);
		});
	});

	describe("Performance and Resource Management", () => {
		it("should handle high-frequency updates efficiently", async () => {
			const wsManager = new WebSocketManager({
				eventId: "test-event",
				role: "test",
				onDataUpdate: jest.fn(),
			});

			await wsManager.initialize();

			// Simulate rapid events
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			// Fire multiple rapid events
			for (let i = 0; i < 10; i++) {
				eventHandler({
					eventId: "test-event",
					artistId: `artist-${i}`,
					status: "currently_on_stage",
				});
			}

			// Should be debounced - not called immediately
			expect(wsManager.options.onDataUpdate).not.toHaveBeenCalled();

			// Should be called once after debounce
			jest.advanceTimersByTime(100);
			expect(wsManager.options.onDataUpdate).toHaveBeenCalledTimes(1);

			wsManager.destroy();
		});

		it("should reduce polling when page is hidden", async () => {
			const wsManager = new WebSocketManager({
				eventId: "test-event",
				role: "test",
				onDataUpdate: jest.fn(),
			});

			await wsManager.initialize();

			// Normal polling
			jest.advanceTimersByTime(2000);
			expect(wsManager.options.onDataUpdate).toHaveBeenCalledTimes(1);

			// Simulate page becoming hidden
			(document as any).hidden = true;
			const visibilityHandler = (
				document.addEventListener as jest.Mock
			).mock.calls.find((call) => call[0] === "visibilitychange")[1];
			visibilityHandler();

			// Should poll less frequently when hidden
			jest.advanceTimersByTime(6000); // 3x normal interval
			expect(wsManager.options.onDataUpdate).toHaveBeenCalledTimes(2);

			wsManager.destroy();
		});
	});

	describe("Error Handling and Recovery", () => {
		it("should handle WebSocket disconnection gracefully", async () => {
			const wsManager = new WebSocketManager({
				eventId: "test-event",
				role: "test",
				onConnect: jest.fn(),
				onDisconnect: jest.fn(),
				onDataUpdate: jest.fn(),
			});

			await wsManager.initialize();

			// Simulate connection
			const connectHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "connect"
			)[1];
			connectHandler();
			expect(wsManager.options.onConnect).toHaveBeenCalled();

			// Simulate disconnection
			const disconnectHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "disconnect"
			)[1];
			disconnectHandler("transport close");
			expect(wsManager.options.onDisconnect).toHaveBeenCalled();

			// Polling should continue
			jest.advanceTimersByTime(2000);
			expect(wsManager.options.onDataUpdate).toHaveBeenCalled();

			wsManager.destroy();
		});

		it("should validate and sanitize incoming data", () => {
			// Test with malformed artist data
			const malformedArtist = {
				id: 123, // Wrong type
				artist_name: null, // Missing required field
				style: "Comedy",
				performance_duration: "10", // Wrong type
				performance_status: "invalid_status", // Invalid value
			};

			const validation = validateArtist(malformedArtist);
			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});

		it("should handle API failures with polling fallback", async () => {
			// Mock API failure
			(fetch as jest.Mock).mockRejectedValueOnce(
				new Error("Network error")
			);

			const wsManager = new WebSocketManager({
				eventId: "test-event",
				role: "test",
				onDataUpdate: jest.fn(),
			});

			await wsManager.initialize();

			// Even with API failures, polling should continue
			jest.advanceTimersByTime(2000);
			expect(wsManager.options.onDataUpdate).toHaveBeenCalled();

			wsManager.destroy();
		});
	});

	describe("Data Consistency Across Pages", () => {
		it("should maintain consistent show timing calculations", () => {
			const showItems = [
				{
					id: "1",
					type: "artist" as const,
					artist: {
						id: "1",
						artist_name: "Artist 1",
						performance_duration: 10,
						actual_duration: 480, // 8 minutes
					},
					performance_order: 1,
				},
				{
					id: "2",
					type: "cue" as const,
					cue: {
						id: "2",
						title: "Break",
						duration: 5,
					},
					performance_order: 2,
				},
			];

			// All pages should calculate the same total time
			const performanceOrderTime = calculateTotalShowTime(showItems);
			const djDashboardTime = calculateTotalShowTime(showItems);
			const mcDashboardTime = calculateTotalShowTime(showItems);

			expect(performanceOrderTime).toBe(djDashboardTime);
			expect(djDashboardTime).toBe(mcDashboardTime);
			expect(performanceOrderTime).toBe(13); // 8 + 5 minutes
		});

		it("should maintain consistent status colors across pages", () => {
			const statuses = [
				"not_started",
				"next_on_deck",
				"next_on_stage",
				"currently_on_stage",
				"completed",
			];

			statuses.forEach((status) => {
				// All pages should use the same color classes
				const performanceOrderColor = getStatusColorClasses(status);
				const djColor = getStatusColorClasses(status);
				const mcColor = getStatusColorClasses(status);
				const liveBoardColor = getStatusColorClasses(status);

				expect(performanceOrderColor).toBe(djColor);
				expect(djColor).toBe(mcColor);
				expect(mcColor).toBe(liveBoardColor);
			});
		});
	});
});
