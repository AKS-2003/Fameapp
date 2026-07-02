/**
 * Utility functions for handling media files and URLs
 */

/**
 * Convert Google Cloud Storage URL to HTTP URL
 * @param url - The GCS URL (gs://) or HTTP URL
 * @returns HTTP URL that can be accessed by browsers
 */
export function convertGcsUrl(url: string): string {
	if (!url) return "";

	// Decode /api/files/serve?file=... to /api/media/...
	if (url.startsWith("/api/files/serve")) {
		try {
			const queryIndex = url.indexOf("?");
			if (queryIndex !== -1) {
				const params = new URLSearchParams(url.substring(queryIndex));
				const fileParam = params.get("file");
				if (fileParam) {
					return `/api/media/${fileParam}`;
				}
			}
		} catch (e) {
			console.error("[media-utils] Error converting serve URL:", e);
		}
	}

	// Convert direct GCS HTTP URLs to use our API proxy (to avoid CORS)
	if (
		url.startsWith("https://storage.cloud.google.com/") ||
		url.startsWith("https://storage.googleapis.com/")
	) {
		// Extract the path after the bucket name
		const match = url.match(
			/https:\/\/storage\.(cloud\.google|googleapis)\.com\/[^/]+\/(.+)/
		);
		if (match && match[2]) {
			return `/api/media/${match[2]}`;
		}
	}

	// If it's already using our API, return as is
	if (url.startsWith("/api/media/")) {
		return url;
	}

	// If it's another HTTP URL, return as is
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}

	// Convert gs:// URL to use our API endpoint
	if (url.startsWith("gs://")) {
		// Remove gs:// and bucket name to get just the path
		const path = url.replace(/^gs:\/\/[^/]+\//, "");
		return `/api/media/${path}`;
	}

	// If it's a relative path, use the media API
	if (!url.startsWith("/")) {
		return `/api/media/${url}`;
	}

	return url;
}

/**
 * Convert GCS URL to direct Google Storage URL (fallback)
 * @param url - The GCS URL (gs://) or HTTP URL
 * @returns Direct Google Storage HTTP URL
 */
export function convertGcsUrlDirect(url: string): string {
	if (!url) return "";

	// If it's already an HTTP URL, return as is
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}

	// Convert gs:// URL to direct HTTP URL
	if (url.startsWith("gs://")) {
		const path = url.replace("gs://", "");
		return `https://storage.cloud.google.com/${path}`;
	}

	return url;
}

/**
 * Get file extension from filename
 * @param filename - The filename
 * @returns File extension with dot (e.g., ".mp3")
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	return lastDot !== -1 ? filename.substring(lastDot) : "";
}

/**
 * Format file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format duration in seconds to mm:ss format
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "3:45")
 */
export function formatDuration(seconds: number): string {
	if (!seconds || isNaN(seconds)) return "0:00";

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);

	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Check if a URL is a valid media URL
 * @param url - The URL to check
 * @returns True if the URL appears to be valid
 */
export function isValidMediaUrl(url: string): boolean {
	if (!url) return false;

	try {
		new URL(convertGcsUrl(url));
		return true;
	} catch {
		return false;
	}
}

/**
 * Get media type from file extension or MIME type
 * @param filename - The filename or MIME type
 * @returns Media type ("audio", "video", "image", or "unknown")
 */
export function getMediaType(
	filename: string
): "audio" | "video" | "image" | "unknown" {
	const extension = getFileExtension(filename.toLowerCase());

	// Audio extensions
	if (
		[".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"].includes(
			extension
		)
	) {
		return "audio";
	}

	// Video extensions
	if ([".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"].includes(extension)) {
		return "video";
	}

	// Image extensions
	if (
		[".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(
			extension
		)
	) {
		return "image";
	}

	// Check MIME type if extension doesn't match
	if (filename.startsWith("audio/")) return "audio";
	if (filename.startsWith("video/")) return "video";
	if (filename.startsWith("image/")) return "image";

	return "unknown";
}

/**
 * Open media file in a new window for playback
 * @param url - The media URL
 * @param filename - The filename (optional, for window title)
 */
export function playInNewWindow(url: string, filename?: string): void {
	const convertedUrl = convertGcsUrlDirect(url);

	if (!convertedUrl) {
		console.error("Invalid URL for playback:", url);
		return;
	}

	// Open in new window with appropriate size for media playback
	const windowFeatures =
		"width=800,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no";
	const newWindow = window.open(
		convertedUrl,
		filename || "media-player",
		windowFeatures
	);

	if (!newWindow) {
		// Fallback if popup is blocked - open in new tab
		window.open(convertedUrl, "_blank", "noopener,noreferrer");
	}
}

let activeDownloadPopups: { [key: string]: HTMLElement } = {};
// Order in which popups were added — determines their stacking position.
let downloadPopupOrder: string[] = [];

const DOWNLOAD_POPUP_GAP = 12; // px gap between stacked popups

/** Recompute each active popup's vertical offset so they stack above one another. */
function relayoutDownloadPopups() {
	let offset = 24; // matches bottom-6 (1.5rem = 24px)
	// Stack newest-on-top: iterate in reverse add order so the most recent
	// download sits closest to the bottom of the screen.
	for (let i = downloadPopupOrder.length - 1; i >= 0; i--) {
		const key = downloadPopupOrder[i];
		const popup = activeDownloadPopups[key];
		if (!popup) continue;
		popup.style.bottom = `${offset}px`;
		offset += popup.offsetHeight + DOWNLOAD_POPUP_GAP;
	}
}

export function showDownloadProgressPopup(filename: string, progress: number, totalBytes: number) {
	if (typeof document === "undefined") return;

	let popup = activeDownloadPopups[filename];
	if (popup) return;

	popup = document.createElement("div");
	popup.id = `download-progress-${encodeURIComponent(filename)}`;
	popup.className = "fixed right-6 z-[9999] w-96 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 flex flex-col gap-3 font-sans transition-all duration-300 transform translate-y-10 opacity-0";

	popup.innerHTML = `
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2.5 min-w-0">
				<div class="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100 animate-pulse">
					<svg class="h-5 w-5 text-purple-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
				</div>
				<div class="min-w-0 flex flex-col">
					<span class="text-sm font-semibold text-slate-800 truncate" title="${filename}">${filename}</span>
					<span class="text-[11px] font-medium text-slate-400 download-bytes">Connecting...</span>
				</div>
			</div>
			<span class="text-sm font-bold text-purple-600 download-percent shrink-0">0%</span>
		</div>
		<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
			<div class="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all duration-150 ease-out download-progress-bar" style="width: 0%"></div>
		</div>
	`;

	document.body.appendChild(popup);
	activeDownloadPopups[filename] = popup;
	downloadPopupOrder.push(filename);
	relayoutDownloadPopups();

	requestAnimationFrame(() => {
		popup.classList.remove("translate-y-10", "opacity-0");
		popup.classList.add("translate-y-0", "opacity-100");
	});
}

export function updateDownloadProgressPopup(filename: string, progress: number, receivedBytes: number, totalBytes: number) {
	if (typeof document === "undefined") return;

	const popup = activeDownloadPopups[filename];
	if (!popup) return;

	const progressBar = popup.querySelector(".download-progress-bar") as HTMLElement;
	const percentText = popup.querySelector(".download-percent") as HTMLElement;
	const bytesText = popup.querySelector(".download-bytes") as HTMLElement;

	if (progressBar) progressBar.style.width = `${progress}%`;
	if (percentText) percentText.textContent = `${progress}%`;
	
	if (bytesText) {
		const formattedReceived = formatFileSize(receivedBytes);
		if (totalBytes > 0) {
			const formattedTotal = formatFileSize(totalBytes);
			bytesText.textContent = `${formattedReceived} of ${formattedTotal}`;
		} else {
			bytesText.textContent = `${formattedReceived}`;
		}
	}
}

export function hideDownloadProgressPopup(filename: string, success: boolean, errorMessage?: string) {
	if (typeof document === "undefined") return;

	const popup = activeDownloadPopups[filename];
	if (!popup) return;

	const percentText = popup.querySelector(".download-percent") as HTMLElement;
	const bytesText = popup.querySelector(".download-bytes") as HTMLElement;
	const progressBar = popup.querySelector(".download-progress-bar") as HTMLElement;
	const iconContainer = popup.querySelector(".bg-purple-50, .bg-emerald-50, .bg-rose-50") as HTMLElement;

	if (success) {
		if (percentText) percentText.textContent = "Done";
		if (bytesText) bytesText.textContent = "Saved successfully";
		if (progressBar) {
			progressBar.className = "bg-emerald-500 h-2 rounded-full transition-all duration-150 ease-out download-progress-bar";
			progressBar.style.width = "100%";
		}
		if (iconContainer) {
			iconContainer.className = "h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100";
			iconContainer.innerHTML = `
				<svg class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			`;
		}
	} else {
		if (percentText) percentText.textContent = "Failed";
		if (bytesText) bytesText.textContent = errorMessage || "Failed to download";
		if (progressBar) {
			progressBar.className = "bg-rose-500 h-2 rounded-full transition-all duration-150 ease-out download-progress-bar";
		}
		if (iconContainer) {
			iconContainer.className = "h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100";
			iconContainer.innerHTML = `
				<svg class="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			`;
		}
	}

	setTimeout(() => {
		popup.classList.remove("translate-y-0", "opacity-100");
		popup.classList.add("translate-y-10", "opacity-0");
		setTimeout(() => {
			popup.remove();
			delete activeDownloadPopups[filename];
			downloadPopupOrder = downloadPopupOrder.filter((key) => key !== filename);
			relayoutDownloadPopups();
		}, 300);
	}, success ? 2000 : 5000);
}

/**
 * Create a download link for a media file using our download API
 * @param url - The media URL (GCS URL)
 * @param filename - The filename for download
 * @param artistName - The artist name
 */
export async function downloadFile(
	url: string,
	filename?: string,
	artistName?: string
): Promise<void> {
	if (!url) {
		console.error("Invalid URL for download:", url);
		return;
	}

	try {
		// Extract path from GCS URL or local API URL
		let filePath = "";
		if (url.startsWith("gs://")) {
			filePath = url.replace("gs://", "").replace(/^[^/]+\//, ""); // Remove bucket name
		} else if (url.startsWith("https://storage.cloud.google.com/")) {
			filePath = url
				.replace("https://storage.cloud.google.com/", "")
				.replace(/^[^/]+\//, "");
		} else if (url.includes("/api/media/")) {
			filePath = url.substring(url.indexOf("/api/media/") + "/api/media/".length);
		} else if (url.includes("/api/files/serve")) {
			try {
				const queryIndex = url.indexOf("?");
				if (queryIndex !== -1) {
					const params = new URLSearchParams(url.substring(queryIndex));
					const fileParam = params.get("file");
					if (fileParam) {
						filePath = fileParam;
					}
				}
			} catch (e) {
				console.error("Error parsing serve API URL:", e);
			}
		}

		if (!filePath) {
			filePath = url;
		}

		// Clean up any remaining leading slashes
		filePath = filePath.replace(/^\/+/, "");

		// If it contains /uploads/, extract everything after it
		if (filePath.includes("/uploads/")) {
			filePath = filePath.substring(filePath.indexOf("/uploads/") + "/uploads/".length);
		}

		// If it's still a full URL, extract the filename from the end
		if (filePath.includes("://")) {
			try {
				const urlObj = new URL(filePath);
				filePath = urlObj.pathname.substring(urlObj.pathname.lastIndexOf("/") + 1);
			} catch (urlErr) {
				console.error("[media-utils] Error parsing full URL:", urlErr);
			}
		}

		console.log("Attempting to download file:", filePath);

		// Call our download API to get a signed URL
		const response = await fetch(
			`/api/download/${encodeURIComponent(filePath)}`
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Download API failed: ${response.status}`, errorText);
			throw new Error(
				`Download API failed: ${response.status} - ${errorText}`
			);
		}

		const data = await response.json();

		if (data.downloadUrl) {
			console.log("Using signed download URL for:", filename);

			// Detect and enforce file extension
			let fileExt = getFileExtension(url || "").toLowerCase();
			if (!fileExt && data.filename) {
				fileExt = getFileExtension(data.filename).toLowerCase();
			}
			if (fileExt && !fileExt.startsWith(".")) {
				fileExt = "." + fileExt;
			}

			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const hours = String(now.getHours()).padStart(2, '0');
			const minutes = String(now.getMinutes()).padStart(2, '0');
			const seconds = String(now.getSeconds()).padStart(2, '0');
			const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

			let finalFilename = "";
			if (artistName) {
				const sanitizedArtist = artistName
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "_")
					.replace(/_+/g, "_")
					.replace(/(^_|_$)/g, "");
				finalFilename = `${sanitizedArtist}_${timestamp}${fileExt}`;
			} else {
				const cleanFilename = (filename || data.filename || "download")
					.replace(/\.[^/.]+$/, "");
				const sanitizedBase = cleanFilename
					.toLowerCase()
					.replace(/[^a-z0-9]/g, "_")
					.replace(/_+/g, "_")
					.replace(/(^_|_$)/g, "");
				finalFilename = `${sanitizedBase}_${timestamp}${fileExt}`;
			}

			// Fetch the file as a blob and trigger download with custom filename
			try {
				const fileResponse = await fetch(data.downloadUrl);
				if (!fileResponse.ok) {
					throw new Error(
						`Failed to fetch file: ${fileResponse.status}`
					);
				}

				const reader = fileResponse.body?.getReader();
				const contentLength = parseInt(fileResponse.headers.get("content-length") || "0", 10);

				let receivedLength = 0;
				const chunks: any[] = [];

				if (reader) {
					showDownloadProgressPopup(finalFilename, 0, contentLength);
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) {
								break;
							}
							chunks.push(value);
							receivedLength += value.length;
							const progress = contentLength > 0
								? Math.round((receivedLength / contentLength) * 100)
								: 0;
							updateDownloadProgressPopup(finalFilename, progress, receivedLength, contentLength);
						}
						hideDownloadProgressPopup(finalFilename, true);
					} catch (streamErr: any) {
						hideDownloadProgressPopup(finalFilename, false, streamErr.message || "Failed to read stream");
						throw streamErr;
					}
				} else {
					const blob = await fileResponse.blob();
					chunks.push(new Uint8Array(await blob.arrayBuffer()));
				}

				const blob = new Blob(chunks);
				const blobUrl = URL.createObjectURL(blob);

				// Create a download link with the blob URL
				const link = document.createElement("a");
				link.href = blobUrl;
				link.download = finalFilename;
				link.style.display = "none";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Clean up the blob URL after a short delay
				setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

				console.log("Download initiated for:", finalFilename);
			} catch (blobError: any) {
				console.error(
					"Blob download failed, trying direct link:",
					blobError
				);
				hideDownloadProgressPopup(finalFilename, false, blobError.message || "Fetch failed");
				// Fallback to direct link
				const link = document.createElement("a");
				link.href = data.downloadUrl;
				link.download = finalFilename;
				link.target = "_blank";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		} else {
			throw new Error("No download URL received from API");
		}
	} catch (error) {
		console.error("Download failed, trying fallback:", error);

		// Fallback 1: Try the media API route
		try {
			let filePath = "";
			if (url.startsWith("gs://")) {
				filePath = url.replace("gs://", "").replace(/^[^/]+\//, "");
			} else if (url.startsWith("https://storage.cloud.google.com/")) {
				filePath = url
					.replace("https://storage.cloud.google.com/", "")
					.replace(/^[^/]+\//, "");
			} else {
				filePath = url;
			}

			const mediaUrl = `/api/media/${filePath}`;
			console.log("Trying media API fallback:", mediaUrl);
			window.open(mediaUrl, "_blank");
			return;
		} catch (fallbackError) {
			console.error("Media API fallback failed:", fallbackError);
		}

		// Fallback 2: Try direct GCS URL
		try {
			const directUrl = convertGcsUrlDirect(url);
			if (directUrl) {
				console.log("Trying direct GCS URL fallback:", directUrl);
				window.open(directUrl, "_blank");
				return;
			}
		} catch (directError) {
			console.error("Direct URL fallback failed:", directError);
		}

		// If all else fails, show an error message
		alert(
			`Failed to download file: ${
				filename || "Unknown file"
			}. Please contact support.`
		);
	}
}

/**
 * Validate media file before upload
 * @param file - The file to validate
 * @param maxSize - Maximum file size in bytes
 * @param allowedTypes - Array of allowed MIME types
 * @returns Validation result
 */
export function validateMediaFile(
	file: File,
	maxSize: number = Infinity,
	allowedTypes: string[] = []
): { isValid: boolean; error?: string } {
	// Check if file exists and has content
	if (!file || file.size === 0) {
		return {
			isValid: false,
			error: "File appears to be empty or invalid",
		};
	}

	// Check file name
	if (!file.name || file.name.trim() === "") {
		return {
			isValid: false,
			error: "File name is required",
		};
	}

	// No size or type restrictions - allow all files
	return { isValid: true };
}

/**
 * Detect audio duration from URL
 * @param url - The audio URL
 * @returns Promise that resolves to duration in seconds
 */
export function detectDurationFromUrl(url: string): Promise<number> {
	return new Promise((resolve) => {
		const audio = new Audio();
		let resolved = false;

		const resolveOnce = (duration: number) => {
			if (!resolved) {
				resolved = true;
				resolve(duration);
			}
		};

		const timeout = setTimeout(() => {
			console.warn(`Duration detection from URL timeout: ${url}`);
			resolveOnce(0);
		}, 15000);

		audio.addEventListener("loadedmetadata", () => {
			if (
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				clearTimeout(timeout);
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Duration detected from URL: ${durationInSeconds} seconds`
				);
				resolveOnce(durationInSeconds);
			}
		});

		audio.addEventListener("error", (e) => {
			clearTimeout(timeout);
			console.error(`Error detecting duration from URL:`, e);
			resolveOnce(0);
		});

		audio.preload = "metadata";
		audio.src = convertGcsUrl(url);
		audio.load();
	});
}

/**
 * Alternative audio duration detection method
 * @param file - The audio file
 * @returns Promise that resolves to duration in seconds
 */
export function detectAudioDurationAlternative(file: File): Promise<number> {
	return new Promise((resolve) => {
		const audio = new Audio();
		const url = URL.createObjectURL(file);
		let resolved = false;

		const cleanup = () => {
			URL.revokeObjectURL(url);
		};

		const resolveOnce = (duration: number) => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(duration);
			}
		};

		// Try a different approach - wait for duration change
		let checkCount = 0;
		const checkDuration = () => {
			checkCount++;
			if (
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Alternative method detected duration: ${durationInSeconds} seconds`
				);
				resolveOnce(durationInSeconds);
			} else if (checkCount < 50) {
				// Try for 5 seconds (50 * 100ms)
				setTimeout(checkDuration, 100);
			} else {
				console.warn(
					`Alternative duration detection failed after ${checkCount} attempts`
				);
				resolveOnce(0);
			}
		};

		audio.addEventListener("loadstart", () => {
			setTimeout(checkDuration, 100);
		});

		audio.addEventListener("error", (e) => {
			console.error(`Alternative duration detection error:`, e);
			resolveOnce(0);
		});

		audio.preload = "auto";
		audio.src = url;
		audio.load();
	});
}

/**
 * Detect audio duration from file
 * @param file - The audio file
 * @returns Promise that resolves to duration in seconds
 */
export function detectAudioDuration(file: File): Promise<number> {
	return new Promise((resolve) => {
		const audio = new Audio();
		const url = URL.createObjectURL(file);
		let resolved = false;

		const cleanup = () => {
			URL.revokeObjectURL(url);
		};

		const resolveOnce = (duration: number) => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(duration);
			}
		};

		// Set a timeout to prevent hanging
		const timeout = setTimeout(() => {
			console.warn(`Primary duration detection timeout for ${file.name}`);
			resolveOnce(0);
		}, 15000); // 15 second timeout

		// Multiple event listeners for better compatibility
		audio.addEventListener("loadedmetadata", () => {
			if (
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				clearTimeout(timeout);
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Duration detected via loadedmetadata: ${durationInSeconds} seconds for ${file.name}`
				);
				resolveOnce(durationInSeconds);
			}
		});

		audio.addEventListener("durationchange", () => {
			if (
				!resolved &&
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				clearTimeout(timeout);
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Duration detected via durationchange: ${durationInSeconds} seconds for ${file.name}`
				);
				resolveOnce(durationInSeconds);
			}
		});

		audio.addEventListener("canplay", () => {
			if (
				!resolved &&
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				clearTimeout(timeout);
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Duration detected via canplay: ${durationInSeconds} seconds for ${file.name}`
				);
				resolveOnce(durationInSeconds);
			}
		});

		audio.addEventListener("canplaythrough", () => {
			if (
				!resolved &&
				audio.duration &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				clearTimeout(timeout);
				const durationInSeconds = Math.round(audio.duration);
				console.log(
					`Duration detected via canplaythrough: ${durationInSeconds} seconds for ${file.name}`
				);
				resolveOnce(durationInSeconds);
			}
		});

		audio.addEventListener("error", (e) => {
			clearTimeout(timeout);
			console.error(
				`Primary duration detection error for ${file.name}:`,
				e
			);
			resolveOnce(0);
		});

		// Set preload and load the audio
		audio.preload = "metadata";
		audio.src = url;
		audio.load(); // Explicitly load the audio
	});
}
