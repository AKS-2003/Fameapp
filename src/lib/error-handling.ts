// Error Handling and Retry Logic Utilities
// Provides robust error handling with exponential backoff and graceful degradation

interface RetryOptions {
	maxRetries?: number;
	baseDelay?: number;
	maxDelay?: number;
	backoffFactor?: number;
	retryCondition?: (error: any) => boolean;
}

interface CacheOptions {
	key: string;
	ttl?: number; // Time to live in milliseconds
}

// Exponential backoff retry utility
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = 3,
		baseDelay = 1000,
		maxDelay = 10000,
		backoffFactor = 2,
		retryCondition = (error) => true,
	} = options;

	let lastError: any;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if condition is not met
			if (!retryCondition(error)) {
				throw error;
			}

			// Don't retry on last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(
				baseDelay * Math.pow(backoffFactor, attempt),
				maxDelay
			);

			console.warn(
				`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
				error
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

// Network error detection
export function isNetworkError(error: any): boolean {
	if (!error) return false;

	// Check for common network error indicators
	return (
		error.name === "NetworkError" ||
		error.code === "NETWORK_ERROR" ||
		error.message?.includes("fetch") ||
		error.message?.includes("network") ||
		error.message?.includes("connection") ||
		(error.status >= 500 && error.status < 600) ||
		error.status === 0 ||
		error.status === 408 || // Request Timeout
		error.status === 429 // Too Many Requests
	);
}

// API error wrapper with retry logic
export async function apiCallWithRetry<T>(
	url: string,
	options: RequestInit = {},
	retryOptions: RetryOptions = {}
): Promise<T> {
	return retryWithBackoff(
		async () => {
			const response = await fetch(url, {
				...options,
				headers: {
					"Content-Type": "application/json",
					...options.headers,
				},
			});

			if (!response.ok) {
				const error = new Error(
					`HTTP ${response.status}: ${response.statusText}`
				);
				(error as any).status = response.status;
				(error as any).response = response;
				throw error;
			}

			return response.json();
		},
		{
			...retryOptions,
			retryCondition: (error) => {
				// Only retry on network errors or server errors
				return (
					isNetworkError(error) &&
					(retryOptions.retryCondition?.(error) ?? true)
				);
			},
		}
	);
}

// Simple in-memory cache for offline resilience
class SimpleCache {
	private cache = new Map<
		string,
		{ data: any; timestamp: number; ttl: number }
	>();

	set(key: string, data: any, ttl: number = 300000): void {
		// Default 5 minutes
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	get(key: string): any | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	clear(): void {
		this.cache.clear();
	}

	delete(key: string): void {
		this.cache.delete(key);
	}
}

export const cache = new SimpleCache();

// Enhanced API call with caching
export async function cachedApiCall<T>(
	url: string,
	options: RequestInit = {},
	cacheOptions: CacheOptions,
	retryOptions: RetryOptions = {}
): Promise<T> {
	// Try to get from cache first
	const cachedData = cache.get(cacheOptions.key);
	if (cachedData) {
		console.log(`Cache hit for ${cacheOptions.key}`);
		return cachedData;
	}

	try {
		const data = await apiCallWithRetry<T>(url, options, retryOptions);

		// Cache successful response
		cache.set(cacheOptions.key, data, cacheOptions.ttl);

		return data;
	} catch (error) {
		console.error(`API call failed for ${url}:`, error);

		// Try to return stale cache data as fallback
		const staleData = cache.get(cacheOptions.key + "_stale");
		if (staleData) {
			console.warn(`Using stale cache data for ${cacheOptions.key}`);
			return staleData;
		}

		throw error;
	}
}

// WebSocket error handling
export class WebSocketErrorHandler {
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private maxReconnectDelay = 30000;

	constructor(
		private onReconnect: () => void,
		private onMaxRetriesReached: () => void
	) {}

	handleError(error: any): void {
		console.error("WebSocket error:", error);
		this.attemptReconnect();
	}

	handleClose(event: CloseEvent): void {
		console.warn("WebSocket closed:", event.code, event.reason);

		// Don't reconnect if it was a clean close
		if (event.code === 1000) {
			return;
		}

		this.attemptReconnect();
	}

	private async attemptReconnect(): Promise<void> {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error("Max reconnection attempts reached");
			this.onMaxRetriesReached();
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(
			this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
			this.maxReconnectDelay
		);

		console.log(
			`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
		);

		setTimeout(() => {
			try {
				this.onReconnect();
			} catch (error) {
				console.error("Reconnection failed:", error);
				this.attemptReconnect();
			}
		}, delay);
	}

	reset(): void {
		this.reconnectAttempts = 0;
	}
}

// Error boundary utility for React components
export function createErrorBoundary(
	fallbackComponent: React.ComponentType<{ error: Error }>
) {
	return class ErrorBoundary extends React.Component<
		{ children: React.ReactNode },
		{ hasError: boolean; error?: Error }
	> {
		constructor(props: { children: React.ReactNode }) {
			super(props);
			this.state = { hasError: false };
		}

		static getDerivedStateFromError(error: Error) {
			return { hasError: true, error };
		}

		componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
			console.error("Error boundary caught error:", error, errorInfo);
		}

		render() {
			if (this.state.hasError && this.state.error) {
				return React.createElement(fallbackComponent, {
					error: this.state.error,
				});
			}

			return this.props.children;
		}
	};
}

// Toast notification for errors
export function showErrorToast(
	error: any,
	toast: (options: {
		title: string;
		description: string;
		variant?: string;
	}) => void,
	context: string = "Operation"
): void {
	let title = `${context} Failed`;
	let description = "An unexpected error occurred";

	if (isNetworkError(error)) {
		title = "Connection Error";
		description = "Please check your internet connection and try again";
	} else if (error.message) {
		description = error.message;
	}

	toast({
		title,
		description,
		variant: "destructive",
	});
}
