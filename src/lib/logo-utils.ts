import fs from "fs";
import path from "path";

/**
 * Get FAME logo as base64 string for PDF embedding
 */
export function getFameLogo(): string | null {
	try {
		const logoPath = path.join(process.cwd(), "public", "fame-logo.png");

		if (fs.existsSync(logoPath)) {
			const logoBuffer = fs.readFileSync(logoPath);
			return logoBuffer.toString("base64");
		}

		return null;
	} catch (error) {
		console.error("Error loading FAME logo:", error);
		return null;
	}
}

/**
 * Get FAME logo for client-side use (returns public URL)
 */
export function getFameLogoUrl(): string {
	return "/fame-logo.png";
}
