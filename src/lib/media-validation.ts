interface MediaFile {
	name: string;
	size: number;
	type: string;
}

interface ValidationResult {
	isValid: boolean;
	error?: string;
}

// File size limits
export const FILE_SIZE_LIMITS = {
	video: Infinity, // No limit for videos - handled by GCS signed URL (up to 500MB)
	audio: 50 * 1024 * 1024, // 50MB for music/audio
	image: 10 * 1024 * 1024, // 10MB for images
};

const VALIDATION_CONFIG = {
	image: {
		maxSize: FILE_SIZE_LIMITS.image,
		allowedTypes: [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/bmp",
			"image/tiff",
			"image/heic",
			"image/heif",
		],
		allowedExtensions: [
			".jpg",
			".jpeg",
			".png",
			".gif",
			".webp",
			".bmp",
			".tiff",
			".tif",
			".heic",
			".heif",
		],
	},
	video: {
		maxSize: FILE_SIZE_LIMITS.video,
		allowedTypes: [
			"video/mp4",
			"video/quicktime", // MOV
			"video/x-msvideo", // AVI
			"video/x-matroska", // MKV
			"video/webm", // WebM
			"video/mpeg",
			"video/3gpp", // 3GP (mobile)
			"video/3gpp2", // 3G2 (mobile)
			"video/x-ms-wmv", // WMV
			"video/x-flv", // FLV
			"video/ogg", // OGG video
			"video/x-m4v", // M4V
			"video/mp2t", // TS
			"video/x-msvideo", // AVI
			"video/divx", // DivX
			"video/x-divx", // DivX
			"application/octet-stream", // Allow unknown types (browser may not recognize some formats)
		],
		allowedExtensions: [
			".mp4",
			".mov",
			".avi",
			".mkv",
			".webm",
			".mpeg",
			".mpg",
			".3gp",
			".3g2",
			".wmv",
			".flv",
			".ogv",
			".m4v",
			".ts",
			".mts",
			".m2ts",
			".divx",
			".vob",
			".f4v",
		],
	},
	audio: {
		maxSize: FILE_SIZE_LIMITS.audio,
		allowedTypes: [
			"audio/mpeg",
			"audio/mp3",
			"audio/wav",
			"audio/wave",
			"audio/x-wav",
			"audio/mp4",
			"audio/m4a",
			"audio/x-m4a",
			"audio/aac",
			"audio/ogg",
			"audio/flac",
			"audio/x-flac",
			"audio/webm",
			"audio/x-ms-wma",
			"audio/aiff",
			"audio/x-aiff",
			"application/octet-stream", // Allow unknown types
		],
		allowedExtensions: [
			".mp3",
			".wav",
			".m4a",
			".aac",
			".ogg",
			".flac",
			".wma",
			".aiff",
			".aif",
		],
	},
};

export function validateMediaFile(
	file: MediaFile,
	category: "image" | "video" | "audio",
): ValidationResult {
	// Check file name
	if (!file.name || file.name.trim() === "") {
		return {
			isValid: false,
			error: "File name is required",
		};
	}

	// Check if file has content
	if (file.size === 0) {
		return {
			isValid: false,
			error: "File appears to be empty",
		};
	}

	const config = VALIDATION_CONFIG[category];

	// Check file size
	if (file.size > config.maxSize) {
		const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
		const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return {
			isValid: false,
			error: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit for ${category} files`,
		};
	}

	// Check file extension
	const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
	if (!fileExtension || !config.allowedExtensions.includes(fileExtension)) {
		const allowedExts = config.allowedExtensions.join(", ");
		return {
			isValid: false,
			error: `Only ${allowedExts} files are allowed for ${category}`,
		};
	}

	// Check MIME type - be more lenient for video files as browsers may not recognize all formats
	if (category !== "video" || file.type !== "application/octet-stream") {
		if (!config.allowedTypes.includes(file.type) && file.type !== "") {
			let allowedFormats = "";
			if (category === "audio") {
				allowedFormats = "MP3, WAV, M4A, AAC, OGG, FLAC, WMA, AIFF";
			} else if (category === "video") {
				allowedFormats =
					"MP4, MOV, AVI, MKV, WebM, MPEG, 3GP, WMV, FLV, M4V";
			} else if (category === "image") {
				allowedFormats = "JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC";
			}

			// For video files, only reject if extension is also not valid
			if (
				category === "video" &&
				fileExtension &&
				config.allowedExtensions.includes(fileExtension)
			) {
				// Extension is valid, allow even if MIME type is not recognized
				return { isValid: true };
			}

			return {
				isValid: false,
				error: `Only ${allowedFormats} files are allowed`,
			};
		}
	}

	return { isValid: true };
}

export function getFileCategory(
	mimeType: string,
): "image" | "video" | "audio" | "document" {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType.startsWith("video/")) return "video";
	if (mimeType.startsWith("audio/")) return "audio";
	return "document";
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
