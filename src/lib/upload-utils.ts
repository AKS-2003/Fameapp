/**
 * Upload utility for sending files to GCS.
 *
 * For files > 30MB (Cloud Run's proxy limit), we use a two-step approach:
 *   1. Request a GCS signed URL from our API (small JSON request)
 *   2. Upload the file directly from the browser to GCS (bypasses Cloud Run)
 *
 * For files <= 30MB, we use the original /api/storage/upload multipart POST
 * which streams through server.js with busboy.
 */

interface UploadParams {
	file: File;
	eventId?: string;
	artistId?: string;
	fileType?: string;
	folder?: string;
	onProgress?: (percent: number) => void;
}

interface UploadResult {
	url: string;
	fileName: string;
	success: boolean;
}

// Max rehearsal video size: 800MB
export const MAX_REHEARSAL_VIDEO_SIZE = 800 * 1024 * 1024;

/**
 * Upload a file. Since we migrated to Local VPS Storage, we always use the multipart/form-data
 * approach through server.js, which bypasses Next.js limits and handles large files.
 * For files larger than 15MB, we use chunked uploads (10MB chunks) to reliably handle
 * 500–800MB rehearsal videos on mobile and slow connections.
 */
export async function uploadToGCS(params: UploadParams): Promise<UploadResult> {
	const fileSizeMB = (params.file.size / 1024 / 1024).toFixed(1);
	if (params.file.size > 15 * 1024 * 1024) {
		console.log(`[Upload] Chunked upload starting: ${params.file.name} (${fileSizeMB} MB)`);
		return uploadViaChunks(params);
	}
	return uploadViaServer(params);
}

/**
 * Split large files into 10MB chunks and upload sequentially with retries.
 * 10MB chunks = ~80 requests for an 800MB file — fast and reliable.
 * Highly robust on mobile cellular and slow Wi-Fi connections.
 */
async function uploadViaChunks(params: UploadParams): Promise<UploadResult> {
	const { file, eventId, artistId, fileType, folder, onProgress } = params;
	const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks — good balance for 500-800MB files
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
	const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

	let wakeLock: any = null;
	try {
		if (typeof window !== "undefined" && "wakeLock" in navigator) {
			wakeLock = await (navigator as any).wakeLock.request("screen");
			console.log("[Upload] Screen Wake Lock acquired!");
		}
	} catch (err) {
		console.warn("[Upload] Failed to acquire screen wake lock:", err);
	}

	try {
		onProgress?.(0);

		for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
			const start = chunkIndex * CHUNK_SIZE;
			const end = Math.min(start + CHUNK_SIZE, file.size);
			const chunk = file.slice(start, end);

			let attempts = 0;
			const maxAttempts = 5; // 5 attempts per chunk — handles flaky VPS connections
			let success = false;
			let chunkResult: any = null;

			while (attempts < maxAttempts && !success) {
				attempts++;
				try {
					chunkResult = await uploadChunk({
						chunk,
						chunkIndex,
						totalChunks,
						uploadId,
						fileName: file.name,
						eventId,
						artistId,
						fileType,
						folder,
						onProgress: (pct) => {
							const overallPct = Math.round(
								((chunkIndex + pct / 100) / totalChunks) * 100
							);
							onProgress?.(Math.min(overallPct, 99)); // Cap at 99% until fully assembled
						},
					});
					success = true;
				} catch (error) {
					console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} attempt ${attempts}/${maxAttempts} failed:`, error);
					if (attempts >= maxAttempts) {
						const fileSizeMB = (file.size / 1024 / 1024).toFixed(0);
						throw new Error(
							`Part ${chunkIndex + 1} of ${totalChunks} failed after ${maxAttempts} attempts. ` +
							`Your video (${fileSizeMB} MB) may be too large for your internet connection. ` +
							`Please try again on a faster connection (Wi-Fi recommended).`
						);
					}
					// Exponential backoff: 2s, 4s, 6s, 8s
					await new Promise((resolve) => setTimeout(resolve, attempts * 2000));
				}
			}
			
			// If last chunk, it resolves the completed assembled file metadata
			if (chunkIndex === totalChunks - 1 && chunkResult && chunkResult.url) {
				onProgress?.(100);
				return {
					url: chunkResult.url,
					fileName: chunkResult.fileName,
					success: true,
				};
			}
		}

		throw new Error("Upload completed but server did not return file details");
	} finally {
		if (wakeLock) {
			try {
				await wakeLock.release();
				console.log("[Upload] Screen Wake Lock released!");
			} catch (err) {
				console.warn("[Upload] Failed to release wake lock:", err);
			}
		}
	}
}

/**
 * Helper to upload a single chunk using XMLHttpRequest to enable progress tracking.
 */
async function uploadChunk(params: {
	chunk: Blob;
	chunkIndex: number;
	totalChunks: number;
	uploadId: string;
	fileName: string;
	eventId?: string;
	artistId?: string;
	fileType?: string;
	folder?: string;
	onProgress?: (percent: number) => void;
}): Promise<any> {
	const { chunk, chunkIndex, totalChunks, uploadId, fileName, eventId, artistId, fileType, folder, onProgress } = params;

	const formData = new FormData();
	formData.append("file", chunk, fileName);
	formData.append("chunkIndex", chunkIndex.toString());
	formData.append("totalChunks", totalChunks.toString());
	formData.append("uploadId", uploadId);
	formData.append("fileName", fileName);

	if (folder) {
		formData.append("folder", folder);
	} else {
		if (eventId) formData.append("eventId", eventId);
		if (artistId) formData.append("artistId", artistId);
		if (fileType) formData.append("fileType", fileType);
	}

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable) {
				const pct = Math.round((e.loaded / e.total) * 100);
				onProgress?.(pct);
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const result = JSON.parse(xhr.responseText);
					resolve(result);
				} catch {
					reject(new Error("Invalid response from upload server"));
				}
			} else {
				let errorMsg = `Chunk upload failed with status ${xhr.status}`;
				try {
					const errData = JSON.parse(xhr.responseText);
					if (errData.error) errorMsg = errData.error;
				} catch {
					/* ignore */
				}
				reject(new Error(errorMsg));
			}
		});

		xhr.addEventListener("error", () => reject(new Error("Network error during chunk upload")));
		xhr.addEventListener("abort", () => reject(new Error("Chunk upload was cancelled")));
		xhr.addEventListener("timeout", () => reject(new Error("Chunk upload timed out")));

		xhr.open("POST", "/api/storage/upload-chunk");
		xhr.timeout = 180 * 1000; // 3 minutes timeout per chunk
		xhr.send(formData);
	});
}


/**
 * Upload directly to GCS using a signed resumable URL.
 * Bypasses Cloud Run's 32MB body size limit entirely.
 */
async function uploadViaSignedUrl(params: UploadParams): Promise<UploadResult> {
	const { file, eventId, artistId, fileType, folder, onProgress } = params;

	// Step 1: Get a signed URL from our API (tiny JSON request, no file data)
	onProgress?.(2);

	const body: Record<string, string> = {
		fileName: file.name,
		contentType: file.type || "application/octet-stream",
	};
	if (folder) {
		body.folder = folder;
	} else {
		if (eventId) body.eventId = eventId;
		if (artistId) body.artistId = artistId;
		if (fileType) body.fileType = fileType;
	}

	const signedUrlRes = await fetch("/api/gcs/signed-url", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!signedUrlRes.ok) {
		let errMsg = `Failed to get upload URL (${signedUrlRes.status})`;
		try {
			const errData = await signedUrlRes.json();
			if (errData.error) errMsg = errData.error;
		} catch {
			/* ignore */
		}
		throw new Error(errMsg);
	}

	const { signedUrl, gcsUrl, fileName } = await signedUrlRes.json();

	onProgress?.(5);

	// Step 2: Initiate the resumable upload session with GCS
	const initRes = await fetch(signedUrl, {
		method: "POST",
		headers: {
			"Content-Type": file.type || "application/octet-stream",
			"x-goog-resumable": "start",
		},
	});

	if (!initRes.ok) {
		throw new Error(`Failed to initiate GCS upload (${initRes.status})`);
	}

	const sessionUri = initRes.headers.get("Location");
	if (!sessionUri) {
		throw new Error("GCS did not return a resumable session URI");
	}

	onProgress?.(8);

	// Step 3: Upload the file data directly to GCS with progress tracking
	return new Promise<UploadResult>((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable) {
				// Map to 8-98% range (8% used for setup above)
				const pct = 8 + Math.round((e.loaded / e.total) * 90);
				onProgress?.(pct);
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress?.(100);
				resolve({ url: gcsUrl, fileName, success: true });
			} else {
				reject(
					new Error(`GCS upload failed with status ${xhr.status}`),
				);
			}
		});

		xhr.addEventListener("error", () =>
			reject(new Error("Network error during GCS upload")),
		);
		xhr.addEventListener("abort", () =>
			reject(new Error("Upload was cancelled")),
		);
		xhr.addEventListener("timeout", () =>
			reject(new Error("Upload timed out")),
		);

		xhr.open("PUT", sessionUri);
		xhr.timeout = 15 * 60 * 1000; // 15 minutes
		xhr.setRequestHeader(
			"Content-Type",
			file.type || "application/octet-stream",
		);
		xhr.send(file);
	});
}

/**
 * Upload via our server (original approach). Works for files under Cloud Run's limit.
 */
async function uploadViaServer(params: UploadParams): Promise<UploadResult> {
	const { file, eventId, artistId, fileType, folder, onProgress } = params;

	const formData = new FormData();
	formData.append("file", file);
	if (folder) {
		formData.append("folder", folder);
	} else {
		if (eventId) formData.append("eventId", eventId);
		if (artistId) formData.append("artistId", artistId);
		if (fileType) formData.append("fileType", fileType);
	}

	return new Promise<UploadResult>((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable) {
				const pct = Math.round((e.loaded / e.total) * 95);
				onProgress?.(pct);
			}
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const result = JSON.parse(xhr.responseText);
					onProgress?.(100);
					resolve({
						url: result.url,
						fileName: result.fileName,
						success: true,
					});
				} catch {
					reject(new Error("Invalid response from upload server"));
				}
			} else {
				let errorMsg = `Upload failed with status ${xhr.status}`;
				try {
					const errData = JSON.parse(xhr.responseText);
					if (errData.error) errorMsg = errData.error;
				} catch {
					/* ignore */
				}
				reject(new Error(errorMsg));
			}
		});

		xhr.addEventListener("error", () =>
			reject(new Error("Network error during upload")),
		);
		xhr.addEventListener("abort", () =>
			reject(new Error("Upload was cancelled")),
		);
		xhr.addEventListener("timeout", () =>
			reject(new Error("Upload timed out")),
		);

		xhr.open("POST", "/api/storage/upload");
		xhr.timeout = 15 * 60 * 1000;
		xhr.send(formData);
	});
}
