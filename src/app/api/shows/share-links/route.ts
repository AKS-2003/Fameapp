import { NextRequest, NextResponse } from "next/server";
import { getArtistSession } from "@/lib/session";

import {
	getShareLinksByArtist,
	createShareLink,
	deleteShareLink,
	updateShareLink,
} from "@/lib/data-access";
import crypto from "crypto";

// GET /api/shows/share-links?artistId=xxx
export async function GET(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const artistId =
			request.nextUrl.searchParams.get("artistId") || session.userId;
		if (artistId !== session.userId) {
			return NextResponse.json(
				{ success: false, error: { message: "Forbidden" } },
				{ status: 403 },
			);
		}

		const links = await getShareLinksByArtist(artistId);
		return NextResponse.json({ success: true, data: { links } });
	} catch (error) {
		console.error("Error fetching share links:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}

// POST /api/shows/share-links - Create a new share link
export async function POST(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const {
			label,
			linkType,
			showId,
			showName,
			showSlug,
			thumbnail,
			organizerName,
			organizerEmail,
			emailRestriction,
			eventDate,
			expiryDate,
			logisticsPerson,
			visibilityLevel,
		} = body;

		if (!label?.trim()) {
			return NextResponse.json(
				{
					success: false,
					error: { message: "Label is required" },
				},
				{ status: 400 },
			);
		}
		if (!showId) {
			return NextResponse.json(
				{
					success: false,
					error: { message: "A show must be selected" },
				},
				{ status: 400 },
			);
		}

		const token = crypto.randomBytes(32).toString("hex");
		const now = new Date().toISOString();

		const link = {
			id: crypto.randomUUID(),
			label: label.trim(),
			linkType: linkType || "show_info",
			showId,
			showName: showName || "",
			showSlug: showSlug || "",
			thumbnail: thumbnail || "",
			token,
			organizerName: organizerName?.trim() || "",
			organizerEmail: organizerEmail?.trim() || "",
			emailRestriction: emailRestriction?.trim() || "",
			logisticsPerson: logisticsPerson || "",
			visibilityLevel: visibilityLevel || "L1",
			eventDate: eventDate || "",
			requestDate: now,
			expiryDate: expiryDate || "",
			status: "sent",
			viewedAt: null,
			downloadedAt: null,
			createdAt: now,
			updatedAt: now,
		};

		await createShareLink(session.userId, link);

		return NextResponse.json({ success: true, data: { link } });
	} catch (error) {
		console.error("Error creating share link:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}

// DELETE /api/shows/share-links?id=xxx
export async function DELETE(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const linkId = request.nextUrl.searchParams.get("id");
		if (!linkId) {
			return NextResponse.json(
				{ success: false, error: { message: "Link ID required" } },
				{ status: 400 },
			);
		}

		await deleteShareLink(session.userId, linkId);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting share link:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}

// PUT /api/shows/share-links - Update a share link
export async function PUT(request: NextRequest) {
	try {
		const session = await getArtistSession();
		if (!session || session.role !== "artist") {
			return NextResponse.json(
				{ success: false, error: { message: "Unauthorized" } },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const {
			linkId,
			label,
			linkType,
			thumbnail,
			organizerName,
			organizerEmail,
			emailRestriction,
			eventDate,
			expiryDate,
			logisticsPerson,
			visibilityLevel,
		} = body;

		if (!linkId) {
			return NextResponse.json(
				{ success: false, error: { message: "Link ID required" } },
				{ status: 400 },
			);
		}

		const updates: Record<string, any> = {};
		if (label !== undefined) updates.label = label;
		if (linkType !== undefined) updates.linkType = linkType;
		if (thumbnail !== undefined) updates.thumbnail = thumbnail;
		if (organizerName !== undefined) updates.organizerName = organizerName;
		if (organizerEmail !== undefined) updates.organizerEmail = organizerEmail;
		if (emailRestriction !== undefined) updates.emailRestriction = emailRestriction;
		if (eventDate !== undefined) updates.eventDate = eventDate;
		if (expiryDate !== undefined) updates.expiryDate = expiryDate;
		if (logisticsPerson !== undefined) updates.logisticsPerson = logisticsPerson;
		if (visibilityLevel !== undefined) updates.visibilityLevel = visibilityLevel;

		const updated = await updateShareLink(session.userId, linkId, updates);
		return NextResponse.json({ success: true, data: { link: updated } });
	} catch (error) {
		console.error("Error updating share link:", error);
		return NextResponse.json(
			{ success: false, error: { message: "Internal server error" } },
			{ status: 500 },
		);
	}
}
