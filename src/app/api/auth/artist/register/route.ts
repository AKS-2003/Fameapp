import { NextRequest, NextResponse } from "next/server";
import {
	createFameLinkArtist,
	getFameLinkArtistByEmail,
	FameLinkArtistProfile,
} from "@/lib/data-access";
import { hashPassword } from "@/lib/auth";
import { sendFameLinkArtistVerificationEmail } from "@/lib/email-service";
import { APIResponse } from "@/types";
import crypto from "crypto";
import { EventArtistModel } from "@/database/models/FameLinkModels";
import { connectToDatabase } from "@/database/mongodb";

/**
 * Artist Registration API Endpoint
 * POST /api/auth/artist/register
 */
export async function POST(request: NextRequest) {
	console.log("🚀 [API] Artist Registration Started");
	try {
		const body = await request.json();
		const { artistName, email, password, country, city, eventRequestId } = body;

		console.log(`🚀 [API] Registering artist: ${email}`);

		if (!artistName || !email || !password) {
			return NextResponse.json({
				success: false,
				error: { code: "AUTH_001", message: "All fields are required" }
			}, { status: 400 });
		}

		// Check if email already exists
		const existingArtist = await getFameLinkArtistByEmail(email);
		if (existingArtist) {
			return NextResponse.json({
				success: false,
				error: { code: "AUTH_002", message: "An account with this email already exists" }
			}, { status: 409 });
		}

		const hashedPassword = await hashPassword(password);

		// Check if stage manager pre-assigned an artistId for this email
		let artistId = `artist-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
		try {
			await connectToDatabase();
			const eventArtist = await EventArtistModel.findOne({
				email: email.toLowerCase().trim(),
				famelinkArtistId: { $exists: true, $ne: "" },
			}).lean() as any;
			if (eventArtist?.famelinkArtistId) {
				artistId = eventArtist.famelinkArtistId;
				console.log(`✅ [API] Using pre-assigned artistId from event file: ${artistId}`);
			}
		} catch (lookupErr) {
			console.error("Failed to look up pre-assigned artistId:", lookupErr);
		}
		const verificationToken = crypto.randomBytes(32).toString("hex");
		const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

		const artistProfile: FameLinkArtistProfile = {
			id: artistId,
			email: email.toLowerCase().trim(),
			passwordHash: hashedPassword,
			artistName: artistName.trim(),
			country: country?.trim() || undefined,
			city: city?.trim() || undefined,
			tier: "free",
			emailVerified: true, // We already verified email via code in frontend
			verificationToken,
			verificationTokenExpiry,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await createFameLinkArtist(artistProfile);
		console.log(`✅ [API] Artist created successfully: ${artistId}`);

		// Automatically create a session for the newly registered artist
		const { createArtistSessionResponse } = await import("@/lib/session");
		const sessionData = {
			userId: artistId,
			email: artistProfile.email,
			role: "artist" as const,
			status: "active" as const,
		};

		const response = NextResponse.json({
			success: true,
			data: { artistId, email: artistProfile.email }
		});

		return createArtistSessionResponse(sessionData, response);
	} catch (error: any) {
		console.error("❌ [API] Artist registration error:", error);
		return NextResponse.json({
			success: false,
			error: { code: "INTERNAL_ERROR", message: error.message || "Failed to create account" }
		}, { status: 500 });
	}
}
