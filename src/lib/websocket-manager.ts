// WebSocket-Only Manager with Toast Notifications
// This utility provides real-time updates via WebSocket only - no polling fallback
import { io } from "socket.io-client";

interface WebSocketManagerOptions {
	eventId: string;
	role: string;
	userId?: string;
	showToasts?: boolean;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onDataUpdate?: () => void;
}

interface WebSocketEvents {
	[key: string]: (data: any) => void;
}

export class WebSocketManager {
	public socket: any = null;
	private eventId: string;
	private role: string;
	private userId: string;
	private isConnected = false;
	private options: WebSocketManagerOptions;
	private eventHandlers: WebSocketEvents = {};
	// Polling properties removed - WebSocket-only mode

	constructor(options: WebSocketManagerOptions) {
		this.options = options;
		this.eventId = options.eventId;
		this.role = options.role;
		this.userId = options.userId || `${options.role}_${options.eventId}`;
		// Polling interval removed - WebSocket-only mode
	}

	async initialize(): Promise<void> {
		try {
			await this.loadSocketIO();
			await this.setupWebSocket();
		} catch (error) {
			console.error("Failed to initialize WebSocket:", error);
		}
	}

	private loadSocketIO(): Promise<void> {
		return new Promise((resolve) => {
			// socket.io-client is bundled via npm; no need to load external script.
			// Ensure the global io function exists (imported below). Resolve immediately.
			resolve();
		});
	}

	private setupWebSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				// Use polling+websocket so it works behind Nginx reverse proxy on VPS.
				// Socket.IO will start with polling then upgrade to websocket automatically.
				this.socket = io(undefined, {
					path: "/socket.io",
					transports: ["polling", "websocket"],
					withCredentials: true,
				});


				this.socket.on("connect", () => {
					this.isConnected = true;
					this.resetReconnectAttempts();

					// Authenticate
					this.socket.emit("authenticate", {
						userId: this.userId,
						role: this.role,
						eventId: this.eventId,
					});

					// Re-add any custom event handlers that were registered before connection
					Object.entries(this.eventHandlers).forEach(
						([event, handler]) => {
							this.socket.on(event, handler);
						},
					);

					this.options.onConnect?.();
					this.showToast(
						"🟢 Connected",
						"Real-time updates are now active.",
					);

					resolve();
				});

				this.socket.on("disconnect", (reason: string) => {
					this.isConnected = false;
					this.options.onDisconnect?.();

					// Don't show toast for intentional disconnects
					if (reason !== "io client disconnect") {
						this.showToast(
							"🔴 Connection Lost",
							"Reconnecting... Updates may be delayed.",
							"destructive",
						);
					}
				});

				this.socket.on("connect_error", (error: any) => {
					console.error(
						`WebSocket connection error for ${this.role}:`,
						error,
					);
					this.isConnected = false;
					this.handleConnectionError(error);
					// Don't reject here - let reconnection logic handle it
				});

				this.socket.on("error", (error: any) => {
					console.error(`WebSocket error for ${this.role}:`, error);
					this.handleConnectionError(error);
				});

				// Set up common event listeners
				this.setupCommonEventListeners();
			} catch (error) {
				console.error("WebSocket setup failed:", error);
				this.isConnected = false;
				this.handleConnectionError(error);
				reject(error);
			}
		});
	}

	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;

	private handleConnectionError(_error: any): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = Math.min(
				1000 * Math.pow(2, this.reconnectAttempts - 1),
				30000,
			);

			setTimeout(() => {
				if (!this.isConnected) {
					this.setupWebSocket().catch((err) => {
						console.error("Reconnection failed:", err);
					});
				}
			}, delay);
		} else {
			console.error("Max WebSocket reconnection attempts reached");
			this.showToast(
				"❌ Connection Failed",
				"Real-time updates unavailable. Please refresh the page.",
				"destructive",
			);
		}
	}

	private resetReconnectAttempts(): void {
		this.reconnectAttempts = 0;
	}

	private setupCommonEventListeners(): void {
		if (!this.socket) return;

		// Artist-related events
		this.socket.on("artist_registered", (data: any) => {
			if (data.eventId === this.eventId) {
				this.showToast(
					"🎭 New Artist",
					`${data.artist_name || "An artist"} has registered.`,
				);
				this.triggerDataUpdate();
			}
		});

		this.socket.on("artist_assigned", (data: any) => {
			if (data.eventId === this.eventId) {
				const dateText = data.performance_date
					? new Date(data.performance_date).toLocaleDateString(
							"en-US",
							{
								month: "short",
								day: "numeric",
								year: "numeric",
							},
						)
					: "a performance date";
				this.showToast(
					"📅 Artist Assigned",
					`${data.artist_name || "Artist"} assigned to ${dateText}.`,
				);
				this.triggerDataUpdate();
			}
		});

		this.socket.on("artist_unassigned", (data: any) => {
			if (data.eventId === this.eventId) {
				this.showToast(
					"📅 Artist Unassigned",
					`${
						data.artist_name || "Artist"
					} removed from performance date.`,
				);
				this.triggerDataUpdate();
			}
		});

		this.socket.on("artist_status_changed", (data: any) => {
			if (data.eventId === this.eventId) {
				// Handle MC notes updates separately
				if (data.action === "mc_notes_updated") {
					this.showToast(
						"📝 MC Notes Updated",
						`MC notes for ${
							data.artist_name || "artist"
						} have been updated.`,
					);
					this.triggerDataUpdate();
					return;
				}

				// Handle performance status changes
				const statusMap: { [key: string]: string } = {
					completed: "completed their performance",
					currently_on_stage: "is now on stage",
					next_on_deck: "is next on deck",
					not_started: "moved to backstage",
				};
				const status = data.performance_status || data.status;
				const statusText = statusMap[status] || status;
				if (statusText) {
					this.showToast(
						"🎤 Status Changed",
						`${data.artist_name || "Artist"} ${statusText}.`,
					);
				}
				this.triggerDataUpdate();
			}
		});

		this.socket.on("artist_quality_rating_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				const stars = "★".repeat(data.quality_rating || 0);
				this.showToast(
					"⭐ Rating Updated",
					`${data.artist_name || "Artist"} rated ${stars} (${
						data.quality_rating
					}/5).`,
				);
				this.triggerDataUpdate();
			}
		});

		this.socket.on("artist_deleted", (data: any) => {
			if (data.eventId === this.eventId) {
				this.showToast(
					"🗑️ Artist Removed",
					"An artist has been removed from the event.",
				);
				this.triggerDataUpdate();
			}
		});

		// Rehearsal events
		this.socket.on("rehearsal_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				const actionMap: { [key: string]: string } = {
					scheduled: "scheduled for rehearsal",
					completed: "completed rehearsal",
					uncompleted: "marked as rehearsal not completed",
					removed_from_rehearsal: "removed from rehearsal schedule",
					removed: "removed from rehearsal schedule",
				};
				const actionText = actionMap[data.action] || data.action;
				const artistName = data.artist_name || "Artist";
				this.showToast(
					"🎬 Rehearsal Updated",
					`${artistName} ${actionText}.`,
				);
				this.triggerDataUpdate();
			}
		});

		// Performance order events
		this.socket.on("performance-order-update", (data: any) => {
			if (data.eventId === this.eventId) {
				const actionMap: { [key: string]: string } = {
					assigned: "Artist assigned to show order",
					removed: "Artist removed from show order",
					reordered: "Performance order updated",
					order_changed: "Performance order changed",
				};
				const message =
					actionMap[data.action] || "Performance order updated";
				this.showToast("📋 Show Order Updated", `${message}.`);
				this.triggerDataUpdate();
			}
		});

		// Show order updated event (for batch reordering)
		this.socket.on("show-order-updated", (data: any) => {
			if (data.eventId === this.eventId) {
				// Only show toast and update if this is not from the current client
				const localRequestId = (window as any).lastShowOrderRequestId;
				if (data.clientRequestId !== localRequestId) {
					this.showToast(
						"📋 Show Order Updated",
						"Performance order has been updated.",
					);
					this.triggerDataUpdate();
				}
			}
		});

		// Cue events
		this.socket.on("cue_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				const actionMap: { [key: string]: string } = {
					created: "added",
					updated: "updated",
					deleted: "removed",
					status_updated: "status changed",
				};
				const actionText = actionMap[data.action] || data.action;
				this.showToast("🎬 Cue Updated", `Custom cue ${actionText}.`);
				this.triggerDataUpdate();
			}
		});

		// Live board events
		this.socket.on("live-board-update", (data: any) => {
			if (data.eventId === this.eventId) {
				this.showToast("📺 Live Board", "Performance status updated.");
				this.triggerDataUpdate();
			}
		});

		// Emergency events
		this.socket.on("emergency-alert", (data: any) => {
			this.showToast("🚨 EMERGENCY ALERT", data.message, "destructive");
			this.triggerDataUpdate();
		});

		this.socket.on("emergency-clear", (data: any) => {
			this.showToast(
				"✅ Emergency Cleared",
				"Emergency alert has been deactivated.",
			);
			this.triggerDataUpdate();
		});

		// Timing settings events
		this.socket.on("timing-settings-updated", (data: any) => {
			if (data.eventId === this.eventId) {
				this.showToast(
					"⏰ Timing Updated",
					"Event timing settings have been updated.",
				);
				this.triggerDataUpdate();
			}
		});

		// Artist info updated events (force logout)
		this.socket.on("artist_info_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				console.log(
					"WebSocket Manager: Received artist_info_updated event",
					data,
				);
				// Don't show toast here - let the specific handler deal with it
				// This is just to ensure the event is received by all listeners
			}
		});

		// Stage manager account updated events (force logout)
		this.socket.on("stage_manager_account_updated", (data: any) => {
			console.log(
				"WebSocket Manager: Received stage_manager_account_updated event",
				data,
			);
			// This will be handled by specific page components
		});

		// Show date info updated events
		this.socket.on("show_date_info_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				window.dispatchEvent(
					new CustomEvent("show_date_info_updated", {
						detail: data,
					}),
				);
				this.triggerDataUpdate();
			}
		});

		// Access grant updated events
		this.socket.on("access_grant_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				window.dispatchEvent(
					new CustomEvent("access_grant_updated", {
						detail: data,
					}),
				);
				this.showToast(
					"🔒 Access Updated",
					"Access permissions have been updated.",
				);
				this.triggerDataUpdate();
			}
		});

		// Notification events
		this.socket.on("new_notification", (data: any) => {
			console.log("WebSocket Manager: Received new_notification event", {
				eventId: data.eventId,
				thisEventId: this.eventId,
			});
			if (data.eventId === this.eventId) {
				// Dispatch custom window event for components to listen to
				console.log(
					"WebSocket Manager: Dispatching new_notification window event",
				);
				try {
					window.dispatchEvent(
						new CustomEvent("new_notification", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching window event",
						e,
					);
				}

				this.showToast(
					`🔔 ${data.title || "New Notification"}`,
					data.message || "You have a new notification.",
				);
				this.triggerDataUpdate();
			}
		});

		// Chat message events
		this.socket.on("new_chat_message", (data: any) => {
			console.log("WebSocket Manager: Received new_chat_message event", {
				eventId: data.eventId,
				showDate: data.showDate,
				thisEventId: this.eventId,
			});
			if (data.eventId === this.eventId) {
				// Dispatch custom window event for components to listen to
				console.log(
					"WebSocket Manager: Dispatching new_chat_message window event",
				);
				try {
					window.dispatchEvent(
						new CustomEvent("new_chat_message", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching window event",
						e,
					);
				}

				// Show toast notification
				const dateText = new Date(data.showDate).toLocaleDateString(
					"en-US",
					{
						month: "short",
						day: "numeric",
					},
				);
				this.showToast(
					`💬 New Message`,
					`Stage Manager sent a message for ${dateText}.`,
				);
				this.triggerDataUpdate();
			}
		});

		// Personal message events
		this.socket.on("new_personal_message", (data: any) => {
			console.log(
				"WebSocket Manager: Received new_personal_message event",
				{
					eventId: data.eventId,
					artistId: data.artistId,
					thisEventId: this.eventId,
				},
			);
			if (data.eventId === this.eventId) {
				// Dispatch custom window event for components to listen to
				console.log(
					"WebSocket Manager: Dispatching new_personal_message window event",
				);
				try {
					window.dispatchEvent(
						new CustomEvent("new_personal_message", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching window event",
						e,
					);
				}

				this.triggerDataUpdate();
			}
		});

		// Stage discussion message events
		this.socket.on("new_stage_discussion_message", (data: any) => {
			console.log(
				"WebSocket Manager: Received new_stage_discussion_message event",
				{
					eventId: data.eventId,
					artistId: data.artistId,
					thisEventId: this.eventId,
				},
			);
			if (data.eventId === this.eventId) {
				try {
					window.dispatchEvent(
						new CustomEvent("new_stage_discussion_message", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching new_stage_discussion_message event",
						e,
					);
				}
				this.triggerDataUpdate();
			}
		});

		// Artist profile update notifications (artist saves from edit page)
		this.socket.on("artist_profile_updated", (data: any) => {
			console.log(
				"WebSocket Manager: Received artist_profile_updated event",
				{
					eventId: data.eventId,
					artistId: data.artistId,
					thisEventId: this.eventId,
				},
			);
			if (data.eventId === this.eventId) {
				try {
					window.dispatchEvent(
						new CustomEvent("artist_profile_updated", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching artist_profile_updated event",
						e,
					);
				}

				const fields = data.changedFields || [];
				const fieldCount = fields.length;
				this.showToast(
					"📝 Artist Profile Updated",
					`${data.artistName || "An artist"} updated ${fieldCount} field${fieldCount !== 1 ? "s" : ""}.`,
				);
			}
		});

		// Checklist updates (real-time sync across browsers)
		this.socket.on("checklist_updated", (data: any) => {
			if (data.eventId === this.eventId) {
				try {
					window.dispatchEvent(
						new CustomEvent("checklist_updated", {
							detail: data,
						}),
					);
				} catch (e) {
					console.error(
						"WebSocket Manager: Error dispatching checklist_updated event",
						e,
					);
				}

				this.showToast(
					"📋 Checklist Updated",
					"Event checklist has been updated.",
				);
				this.triggerDataUpdate();
			}
		});
	}

	// Polling functionality removed - WebSocket-only mode

	// Visibility handling removed - WebSocket-only mode

	private debounceTimer: NodeJS.Timeout | null = null;

	private triggerDataUpdate(): void {
		// Reduced debounce for more responsive updates
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.options.onDataUpdate?.();
			this.debounceTimer = null;
		}, 50); // Reduced to 50ms for faster response
	}

	private showToast(
		title: string,
		description: string,
		variant: "default" | "destructive" = "default",
	): void {
		if (!this.options.showToasts) return;

		// Try to use toast if available
		try {
			const toastEvent = new CustomEvent("websocket-toast", {
				detail: { title, description, variant },
			});
			window.dispatchEvent(toastEvent);
		} catch (error) {
			// Silent fail
		}
	}

	// Emit events to server
	emit(event: string, data: any): void {
		if (this.socket && this.isConnected) {
			this.socket.emit(event, data);
		} else {
			// WebSocket not connected
		}
	}

	// Add custom event listener
	on(event: string, handler: (data: any) => void): void {
		console.log(
			`WebSocket Manager: Adding custom handler for event: ${event}, socket exists: ${!!this
				.socket}, isConnected: ${this.isConnected}`,
		);
		this.eventHandlers[event] = handler;
		if (this.socket) {
			this.socket.on(event, handler);
			console.log(
				`WebSocket Manager: Handler added to socket for event: ${event}`,
			);
		} else {
			console.log(
				`WebSocket Manager: Socket not ready, handler stored for event: ${event}`,
			);
		}
	}

	// Remove event listener
	off(event: string): void {
		if (this.eventHandlers[event]) {
			delete this.eventHandlers[event];
		}
		if (this.socket) {
			this.socket.off(event);
		}
	}

	// Check connection status
	isWebSocketConnected(): boolean {
		return this.isConnected;
	}

	// Cleanup
	destroy(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.isConnected = false;
	}
}

// Utility function to create WebSocket manager
export function createWebSocketManager(
	options: WebSocketManagerOptions,
): WebSocketManager {
	return new WebSocketManager(options);
}
