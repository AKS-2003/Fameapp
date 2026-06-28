import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ArtistPDFDocument, type ArtistPDFData } from "./pdf-document";

function bufferToDataUri(buffer: ArrayBuffer): string {
	const uint8 = new Uint8Array(buffer);
	let mime = "image/jpeg";
	if (uint8[0] === 0x89 && uint8[1] === 0x50) mime = "image/png";
	const base64 = Buffer.from(uint8).toString("base64");
	return `data:${mime};base64,${base64}`;
}

interface GenerateShowPDFOptions {
	show: Record<string, any>;
	profileImageBuffer?: ArrayBuffer;
	galleryImageBuffers?: ArrayBuffer[];
	logoBuffer?: ArrayBuffer;
}

/**
 * Generate a branded React PDF for a show/artist profile.
 * Returns a Node.js Buffer of the PDF.
 */
export async function generateShowPDF({
	show,
	profileImageBuffer,
	galleryImageBuffers,
	logoBuffer,
}: GenerateShowPDFOptions): Promise<Buffer> {
	const data: ArtistPDFData = {
		artistName: show.name || "Show",
		artist_name: show.name || "Show",
		realName: show.realName || show.name || "",
		real_name: show.realName || show.name || "",
		email: show.email || "",
		phone: show.phone || "",
		whatsapp: show.whatsapp || "",
		managedBy: show.managedBy || "",
		style: show.style || "Not specified",
		performanceType: show.performanceType || "",
		biography: show.biography || show.description || "",
		notes: show.notes || "",
		socialMedia: show.socialMedia || undefined,
		showLink: show.showLink || "",
		costumeColor: show.costumeColor || "",
		costumeColorTwo: show.costumeColorTwo || "",
		costumeColorThree: show.costumeColorThree || "",
		manualCostumeColor: show.manualCostumeColor || "",
		manualCostumeColorTwo: show.manualCostumeColorTwo || "",
		manualCostumeColorThree: show.manualCostumeColorThree || "",
		customCostumeColor: show.customCostumeColor || "",
		lightColorSingle: show.lightColorSingle || "",
		lightColorTwo: show.lightColorTwo || "",
		lightColorThree: show.lightColorThree || "",
		manualLightColor: show.manualLightColor || "",
		manualLightColorTwo: show.manualLightColorTwo || "",
		manualLightColorThree: show.manualLightColorThree || "",
		lightRequests: show.lightRequests || "",
		stagePositionStart: show.stagePositionStart || "",
		stagePositionEnd: show.stagePositionEnd || "",
		equipment: show.equipment || "",
		propsNeeded: show.propsNeeded || "",
		mcNotes: show.mcNotes || "",
		stageManagerNotes: show.stageManagerNotes || "",
		countryLiving: show.countryLiving || "",
		homeCountry: show.homeCountry || "",
		members: show.members || [],
		tshirtSizes: show.tshirtSizes || [],
		musicTrack: show.musicTrack
			? {
					duration: show.musicTrack.duration || 0,
					song_title: show.musicTrack.song_title || "",
					notes: show.musicTrack.notes || "",
					tempo: show.musicTrack.tempo || "",
				}
			: undefined,
		performanceDuration: show.duration || 0,
		createdAt: show.createdAt || new Date().toISOString(),
	};

	const profileImageUri = profileImageBuffer
		? bufferToDataUri(profileImageBuffer)
		: undefined;

	const galleryImageUris = galleryImageBuffers
		?.map((buf) => bufferToDataUri(buf))
		.filter(Boolean) as string[] | undefined;

	const logoUri = logoBuffer ? bufferToDataUri(logoBuffer) : undefined;

	const doc = React.createElement(ArtistPDFDocument, {
		data,
		eventName: "FameLink Show Profile",
		profileImageUri,
		galleryImageUris,
		logoUri,
	});

	return renderToBuffer(doc as any);
}
