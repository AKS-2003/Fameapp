// WebSocket Manager Test Suite
// Tests the enhanced WebSocket manager with polling fallback

import { WebSocketManager } from "../websocket-manager";

// Mock Socket.IO
const mockSocket = {
	on: jest.fn(),
	emit: jest.fn(),
	disconnect: jest.fn(),
	connected: false,
};

const mockIo = jest.fn(() => mockSocket);
(global as any).io = mockIo;

// Mock document for visibility API
Object.defineProperty(document, "hidden", {
	writable: true,
	value: false,
});

Object.defineProperty(document, "addEventListener", {
	value: jest.fn(),
});

Object.defineProperty(document, "removeEventListener", {
	value: jest.fn(),
});

// Mock window for custom events
Object.defineProperty(window, "dispatchEvent", {
	value: jest.fn(),
});

describe("WebSocketManager", () => {
	let wsManager: WebSocketManager;
	let mockOptions: any;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		mockOptions = {
			eventId: "test-event-123",
			role: "test-role",
			userId: "test-user",
			showToasts: true,
			onConnect: jest.fn(),
			onDisconnect: jest.fn(),
			onDataUpdate: jest.fn(),
		};

		wsManager = new WebSocketManager(mockOptions);
	});

	afterEach(() => {
		wsManager.destroy();
		jest.useRealTimers();
	});

	describe("Initialization", () => {
		it("should initialize with correct options", () => {
			expect(wsManager).toBeDefined();
			expect(wsManager.isWebSocketConnected()).toBe(false);
		});

		it("should start polling on initialization", async () => {
			await wsManager.initialize();

			// Fast-forward time to trigger polling
			jest.advanceTimersByTime(2000);

			expect(mockOptions.onDataUpdate).toHaveBeenCalled();
		});
	});

	describe("WebSocket Connection", () => {
		beforeEach(async () => {
			await wsManager.initialize();
		});

		it("should handle successful connection", () => {
			const connectHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "connect"
			)[1];

			connectHandler();

			expect(mockOptions.onConnect).toHaveBeenCalled();
			expect(mockSocket.emit).toHaveBeenCalledWith("authenticate", {
				userId: "test-user",
				role: "test-role",
				eventId: "test-event-123",
			});
		});

		it("should handle disconnection", () => {
			const disconnectHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "disconnect"
			)[1];

			disconnectHandler("transport close");

			expect(mockOptions.onDisconnect).toHaveBeenCalled();
		});

		it("should handle connection errors with retry", () => {
			const errorHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "connect_error"
			)[1];

			errorHandler(new Error("Connection failed"));

			// Should attempt reconnection after delay
			jest.advanceTimersByTime(1000);
			expect(mockIo).toHaveBeenCalledTimes(2); // Initial + retry
		});
	});

	describe("Polling Mechanism", () => {
		beforeEach(async () => {
			await wsManager.initialize();
		});

		it("should poll every 2 seconds", () => {
			jest.advanceTimersByTime(2000);
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(2000);
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(2);
		});

		it("should throttle rapid polling calls", () => {
			// Trigger multiple rapid polls
			jest.advanceTimersByTime(1000);
			jest.advanceTimersByTime(1000);
			jest.advanceTimersByTime(500);

			// Should only call once due to throttling
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1);
		});

		it("should skip polling when page is hidden", () => {
			// Simulate page becoming hidden
			(document as any).hidden = true;

			jest.advanceTimersByTime(2000);

			// Should not poll when hidden
			expect(mockOptions.onDataUpdate).not.toHaveBeenCalled();
		});
	});

	describe("Event Handling", () => {
		beforeEach(async () => {
			await wsManager.initialize();
		});

		it("should handle artist status change events", () => {
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			eventHandler({
				eventId: "test-event-123",
				artist_name: "Test Artist",
				status: "currently_on_stage",
			});

			expect(mockOptions.onDataUpdate).toHaveBeenCalled();
		});

		it("should ignore events from other events", () => {
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			eventHandler({
				eventId: "different-event",
				artist_name: "Test Artist",
				status: "currently_on_stage",
			});

			expect(mockOptions.onDataUpdate).not.toHaveBeenCalled();
		});

		it("should emit events when connected", () => {
			// Simulate connection
			mockSocket.connected = true;
			wsManager.emit("test-event", { data: "test" });

			expect(mockSocket.emit).toHaveBeenCalledWith("test-event", {
				data: "test",
			});
		});

		it("should not emit events when disconnected", () => {
			mockSocket.connected = false;
			wsManager.emit("test-event", { data: "test" });

			// Should not emit when disconnected
			const emitCalls = mockSocket.emit.mock.calls.filter(
				(call) => call[0] === "test-event"
			);
			expect(emitCalls).toHaveLength(0);
		});
	});

	describe("Toast Notifications", () => {
		beforeEach(async () => {
			await wsManager.initialize();
		});

		it("should dispatch toast events when enabled", () => {
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			eventHandler({
				eventId: "test-event-123",
				artist_name: "Test Artist",
				status: "currently_on_stage",
			});

			expect(window.dispatchEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "websocket-toast",
					detail: expect.objectContaining({
						title: "Status Updated",
						description: "Test Artist is now Currently On Stage",
					}),
				})
			);
		});

		it("should not dispatch toast events when disabled", async () => {
			const noToastOptions = { ...mockOptions, showToasts: false };
			const noToastManager = new WebSocketManager(noToastOptions);
			await noToastManager.initialize();

			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			eventHandler({
				eventId: "test-event-123",
				artist_name: "Test Artist",
				status: "currently_on_stage",
			});

			expect(window.dispatchEvent).not.toHaveBeenCalled();

			noToastManager.destroy();
		});
	});

	describe("Performance Optimization", () => {
		beforeEach(async () => {
			await wsManager.initialize();
		});

		it("should debounce rapid data updates", () => {
			// Trigger multiple rapid updates
			const eventHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "artist_status_changed"
			)[1];

			eventHandler({ eventId: "test-event-123", status: "status1" });
			eventHandler({ eventId: "test-event-123", status: "status2" });
			eventHandler({ eventId: "test-event-123", status: "status3" });

			// Should not call immediately due to debouncing
			expect(mockOptions.onDataUpdate).not.toHaveBeenCalled();

			// Should call once after debounce delay
			jest.advanceTimersByTime(100);
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1);
		});

		it("should adjust polling frequency based on page visibility", () => {
			const visibilityHandler = (
				document.addEventListener as jest.Mock
			).mock.calls.find((call) => call[0] === "visibilitychange")[1];

			// Simulate page becoming hidden
			(document as any).hidden = true;
			visibilityHandler();

			// Should reduce polling frequency
			jest.advanceTimersByTime(6000); // 3x normal interval
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1);

			// Simulate page becoming visible
			(document as any).hidden = false;
			visibilityHandler();

			// Should resume normal polling and trigger immediate update
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(2);
		});
	});

	describe("Cleanup", () => {
		it("should clean up all resources on destroy", async () => {
			await wsManager.initialize();

			wsManager.destroy();

			expect(mockSocket.disconnect).toHaveBeenCalled();
			expect(document.removeEventListener).toHaveBeenCalledWith(
				"visibilitychange",
				expect.any(Function)
			);
		});

		it("should stop polling on destroy", async () => {
			await wsManager.initialize();

			// Verify polling is active
			jest.advanceTimersByTime(2000);
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1);

			wsManager.destroy();

			// Verify polling stops
			jest.advanceTimersByTime(2000);
			expect(mockOptions.onDataUpdate).toHaveBeenCalledTimes(1); // No additional calls
		});
	});

	describe("Error Recovery", () => {
		it("should attempt reconnection with exponential backoff", async () => {
			await wsManager.initialize();

			const errorHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "connect_error"
			)[1];

			// First error - 1 second delay
			errorHandler(new Error("Connection failed"));
			jest.advanceTimersByTime(1000);
			expect(mockIo).toHaveBeenCalledTimes(2);

			// Second error - 2 second delay
			errorHandler(new Error("Connection failed"));
			jest.advanceTimersByTime(2000);
			expect(mockIo).toHaveBeenCalledTimes(3);

			// Third error - 4 second delay
			errorHandler(new Error("Connection failed"));
			jest.advanceTimersByTime(4000);
			expect(mockIo).toHaveBeenCalledTimes(4);
		});

		it("should stop retrying after max attempts", async () => {
			await wsManager.initialize();

			const errorHandler = mockSocket.on.mock.calls.find(
				(call) => call[0] === "connect_error"
			)[1];

			// Trigger max reconnection attempts
			for (let i = 0; i < 5; i++) {
				errorHandler(new Error("Connection failed"));
				jest.advanceTimersByTime(30000); // Max delay
			}

			// Should not attempt more reconnections
			const initialCalls = mockIo.mock.calls.length;
			errorHandler(new Error("Connection failed"));
			jest.advanceTimersByTime(30000);

			expect(mockIo.mock.calls.length).toBe(initialCalls);
		});
	});
});
