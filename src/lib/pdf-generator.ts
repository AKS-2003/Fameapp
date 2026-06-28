import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ArtistPDFDocument, type ArtistPDFData } from "./pdf-document";
import path from "path";
import fs from "fs";

/**
 * ModernPDFGenerator — React PDF wrapper
 * Backward-compatible class for routes that still use the old API.
 * Now async — callers must await generateArtistOverview().
 */
export class ModernPDFGenerator {
	async generateArtistOverview(
		data: ArtistPDFData,
		eventName: string,
		profileImageBuffer?: ArrayBuffer,
		galleryImageBuffers?: ArrayBuffer[],
	): Promise<Buffer> {
		const profileImageUri = profileImageBuffer
			? this.toDataUri(profileImageBuffer)
			: undefined;

		const galleryImageUris = galleryImageBuffers
			?.map((buf) => this.toDataUri(buf))
			.filter(Boolean) as string[] | undefined;

		let logoUri: string | undefined;
		try {
			const logoPath = path.join(
				process.cwd(),
				"public",
				"fame-logo.png",
			);
			const logoBuf = fs.readFileSync(logoPath);
			logoUri = `data:image/png;base64,${logoBuf.toString("base64")}`;
		} catch {
			/* skip */
		}

		const doc = React.createElement(ArtistPDFDocument, {
			data,
			eventName,
			profileImageUri,
			galleryImageUris,
			logoUri,
		});

		return renderToBuffer(doc as any);
	}

	private toDataUri(buffer: ArrayBuffer): string {
		const uint8 = new Uint8Array(buffer);
		let mime = "image/jpeg";
		if (uint8[0] === 0x89 && uint8[1] === 0x50) mime = "image/png";
		return `data:${mime};base64,${Buffer.from(uint8).toString("base64")}`;
	}
}

// Re-export the type for backward compatibility
export type { ArtistPDFData };
