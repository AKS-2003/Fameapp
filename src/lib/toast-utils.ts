// Toast Notification Utilities
// Provides comprehensive toast messaging with context-aware notifications

export interface ToastOptions {
	title: string;
	description: string;
	variant?: "default" | "destructive" | "success" | "warning";
	duration?: number;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export interface ToastContextOptions {
	context: string;
	showContext?: boolean;
	icon?: string;
}

// Toast message templates for different operations
export const TOAST_TEMPLATES = {
	// Artist operations
	artist: {
		registered: (name: string) => ({
			title: "New Artist Registration",
			description: `${name} has submitted their application`,
			variant: "default" as const,
		}),
		assigned: (name: string, date: string) => ({
			title: "Artist Assigned",
			description: `${name} assigned to ${date}`,
			variant: "success" as const,
		}),
		statusChanged: (name: string, status: string) => ({
			title: "Status Updated",
			description: `${name} is now ${status}`,
			variant: "default" as const,
		}),
		mcNotesUpdated: (name: string) => ({
			title: "MC Notes Updated",
			description: `MC notes for ${name} have been updated`,
			variant: "success" as const,
		}),
		deleted: (name: string) => ({
			title: "Artist Removed",
			description: `${name} has been removed from the event`,
			variant: "destructive" as const,
		}),
	},

	// Rehearsal operations
	rehearsal: {
		scheduled: (name: string) => ({
			title: "Rehearsal Scheduled",
			description: `${name} added to rehearsal schedule`,
			variant: "success" as const,
		}),
		completed: (name: string) => ({
			title: "Rehearsal Complete",
			description: `${name} has completed rehearsal`,
			variant: "success" as const,
		}),
		removed: (name: string) => ({
			title: "Rehearsal Cancelled",
			description: `${name} removed from rehearsal schedule`,
			variant: "warning" as const,
		}),
	},

	// Performance order operations
	performance: {
		orderUpdated: () => ({
			title: "Show Order Updated",
			description: "Performance lineup has been modified",
			variant: "default" as const,
		}),
		itemAdded: (name: string) => ({
			title: "Added to Show",
			description: `${name} added to performance order`,
			variant: "success" as const,
		}),
		itemRemoved: (name: string) => ({
			title: "Removed from Show",
			description: `${name} removed from performance order`,
			variant: "warning" as const,
		}),
	},

	// Cue operations
	cue: {
		created: (title: string) => ({
			title: "Cue Added",
			description: `${title} added to show order`,
			variant: "success" as const,
		}),
		updated: (title: string) => ({
			title: "Cue Updated",
			description: `${title} has been modified`,
			variant: "default" as const,
		}),
		mcNotesUpdated: (title: string) => ({
			title: "MC Notes Updated",
			description: `MC notes for ${title} have been updated`,
			variant: "success" as const,
		}),
		deleted: (title: string) => ({
			title: "Cue Removed",
			description: `${title} removed from show order`,
			variant: "warning" as const,
		}),
		statusChanged: (title: string, status: string) => ({
			title: "Cue Status",
			description: `${title} is now ${status}`,
			variant: "default" as const,
		}),
	},

	// System operations
	system: {
		connected: () => ({
			title: "Connected",
			description: "Real-time updates are active",
			variant: "success" as const,
		}),
		disconnected: () => ({
			title: "Connection Lost",
			description: "Switching to polling mode",
			variant: "warning" as const,
		}),
		reconnected: () => ({
			title: "Reconnected",
			description: "Real-time updates restored",
			variant: "success" as const,
		}),
		error: (message: string) => ({
			title: "System Error",
			description: message,
			variant: "destructive" as const,
		}),
	},

	// Emergency operations
	emergency: {
		alert: (code: string, message: string) => ({
			title: `${code.toUpperCase()} EMERGENCY ALERT`,
			description: message,
			variant: "destructive" as const,
			duration: 10000, // Show longer for emergencies
		}),
		cleared: () => ({
			title: "Emergency Cleared",
			description: "Emergency alert has been deactivated",
			variant: "success" as const,
		}),
	},

	// Data operations
	data: {
		refreshed: (context: string) => ({
			title: "Data Refreshed",
			description: `${context} updated from server`,
			variant: "default" as const,
		}),
		saved: (context: string) => ({
			title: "Changes Saved",
			description: `${context} saved successfully`,
			variant: "success" as const,
		}),
		loadError: (context: string) => ({
			title: "Loading Error",
			description: `Failed to load ${context}`,
			variant: "destructive" as const,
		}),
	},
};

// Context-aware toast dispatcher
export class ToastManager {
	private toastQueue: ToastOptions[] = [];
	private isProcessing = false;
	private maxQueueSize = 5;

	constructor(
		private toastFunction: (options: ToastOptions) => void,
		private context?: ToastContextOptions
	) {}

	// Show toast with automatic context
	show(template: ToastOptions, immediate = false): void {
		const contextualToast = this.addContext(template);

		if (immediate) {
			this.toastFunction(contextualToast);
		} else {
			this.enqueue(contextualToast);
		}
	}

	// Show toast from template
	showFromTemplate(
		category: keyof typeof TOAST_TEMPLATES,
		action: string,
		...args: any[]
	): void {
		const template = (TOAST_TEMPLATES[category] as any)[action];
		if (template && typeof template === "function") {
			const toastOptions = template(...args);
			this.show(toastOptions);
		} else {
			console.warn(`Toast template not found: ${category}.${action}`);
		}
	}

	// Emergency toast (bypasses queue)
	emergency(message: string, code: string = "RED"): void {
		const emergencyToast = TOAST_TEMPLATES.emergency.alert(code, message);
		this.show(emergencyToast, true);
	}

	// Success toast shorthand
	success(title: string, description: string): void {
		this.show({ title, description, variant: "success" });
	}

	// Error toast shorthand
	error(title: string, description: string): void {
		this.show({ title, description, variant: "destructive" });
	}

	// Warning toast shorthand
	warning(title: string, description: string): void {
		this.show({ title, description, variant: "warning" });
	}

	private addContext(toast: ToastOptions): ToastOptions {
		if (!this.context?.showContext) return toast;

		return {
			...toast,
			title: this.context.context
				? `[${this.context.context}] ${toast.title}`
				: toast.title,
		};
	}

	private enqueue(toast: ToastOptions): void {
		// Prevent queue overflow
		if (this.toastQueue.length >= this.maxQueueSize) {
			this.toastQueue.shift(); // Remove oldest toast
		}

		this.toastQueue.push(toast);
		this.processQueue();
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.toastQueue.length === 0) return;

		this.isProcessing = true;

		while (this.toastQueue.length > 0) {
			const toast = this.toastQueue.shift()!;
			this.toastFunction(toast);

			// Small delay between toasts to prevent overwhelming
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		this.isProcessing = false;
	}

	// Clear all queued toasts
	clear(): void {
		this.toastQueue = [];
	}

	// Get queue status
	getQueueStatus(): { length: number; isProcessing: boolean } {
		return {
			length: this.toastQueue.length,
			isProcessing: this.isProcessing,
		};
	}
}

// Factory function to create toast manager for specific contexts
export function createToastManager(
	toastFunction: (options: ToastOptions) => void,
	context?: ToastContextOptions
): ToastManager {
	return new ToastManager(toastFunction, context);
}

// Utility to create toast from WebSocket event data
export function createToastFromWebSocketEvent(
	eventType: string,
	data: any
): ToastOptions | null {
	switch (eventType) {
		case "artist_registered":
			return TOAST_TEMPLATES.artist.registered(
				data.artist_name || "New artist"
			);

		case "artist_assigned":
			return TOAST_TEMPLATES.artist.assigned(
				data.artist_name || "Artist",
				data.performance_date || "performance date"
			);

		case "artist_status_changed":
			// Handle MC notes updates
			if (data.action === "mc_notes_updated") {
				return TOAST_TEMPLATES.artist.mcNotesUpdated(
					data.artist_name || "Artist"
				);
			}
			// Handle performance status changes
			return TOAST_TEMPLATES.artist.statusChanged(
				data.artist_name || "Artist",
				data.performance_status || data.status || "updated"
			);

		case "rehearsal_updated":
			const action = data.action || "updated";
			if (action === "completed") {
				return TOAST_TEMPLATES.rehearsal.completed(
					data.artist_name || "Artist"
				);
			} else if (action === "scheduled") {
				return TOAST_TEMPLATES.rehearsal.scheduled(
					data.artist_name || "Artist"
				);
			}
			break;

		case "performance-order-update":
			return TOAST_TEMPLATES.performance.orderUpdated();

		case "cue_updated":
			const cueAction = data.action || "updated";
			const cueTitle = data.cue?.title || "Cue";

			switch (cueAction) {
				case "created":
					return TOAST_TEMPLATES.cue.created(cueTitle);
				case "updated":
					return TOAST_TEMPLATES.cue.updated(cueTitle);
				case "mc_notes_updated":
					return TOAST_TEMPLATES.cue.mcNotesUpdated(cueTitle);
				case "deleted":
					return TOAST_TEMPLATES.cue.deleted(cueTitle);
				case "status_updated":
					return TOAST_TEMPLATES.cue.statusChanged(
						cueTitle,
						data.status || "unknown"
					);
			}
			break;

		case "emergency-alert":
			return TOAST_TEMPLATES.emergency.alert(
				data.emergency_code || "RED",
				data.message
			);

		case "emergency-clear":
			return TOAST_TEMPLATES.emergency.cleared();

		default:
			return null;
	}

	return null;
}
