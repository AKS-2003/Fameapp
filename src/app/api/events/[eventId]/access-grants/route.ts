import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { EventDataService } from "@/lib/storage-service";
import { generateAccessToken } from "@/lib/access-token";
import { sendAccessGrantEmail } from "@/lib/email-service";
import { getBaseUrl } from "@/lib/url-utils";
import {
	AccessGrant,
	ACCESS_TYPE_CONFIG,
	AccessType,
} from "@/lib/types/access-grant";

// GET /api/events/[eventId]/access-grants - List all access grants
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const session = getSessionFromRequest(request);
		if (
			!session ||
			(session.role !== "stage_manager" && session.role !== "super_admin")
		) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
				{ status: 401 },
			);
		}

		const { eventId } = await params;
		const grants = await EventDataService.getAccessGrants(eventId);

		return NextResponse.json({
			success: true,
			data: { grants },
		});
	} catch (error) {
		console.error("Error listing access grants:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list access grants" } },
			{ status: 500 },
		);
	}
}

// POST /api/events/[eventId]/access-grants - Create new access grant
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
		const session = getSessionFromRequest(request);
		if (
			!session ||
			(session.role !== "stage_manager" && session.role !== "super_admin")
		) {
			return NextResponse.json(
				{ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
				{ status: 401 },
			);
		}

		const { eventId } = await params;
		const body = await request.json();
		const { email, accessTypes, createdByName } = body;

		if (!email || !accessTypes || !Array.isArray(accessTypes) || accessTypes.length === 0) {
			return NextResponse.json(
				{ success: false, error: { code: "VALIDATION_ERROR", message: "Email and at least one access type are required" } },
				{ status: 400 },
			);
		}

		// Validate access types
		const validTypes: AccessType[] = Object.keys(ACCESS_TYPE_CONFIG) as AccessType[];
		for (const type of accessTypes) {
			if (!validTypes.includes(type)) {
				return NextResponse.json(
					{ success: false, error: { code: "VALIDATION_ERROR", message: `Invalid access type: ${type}` } },
					{ status: 400 },
				);
			}
		}

		// Get existing grants
		const grants = await EventDataService.getAccessGrants(eventId);

		// Check if email already has an active grant
		const existingGrant = grants.find(
			(g: AccessGrant) => g.email === email && g.status === "active",
		);
		if (existingGrant) {
			return NextResponse.json(
				{ success: false, error: { code: "DUPLICATE_ERROR", message: "This email already has an active access grant. Please edit the existing grant instead." } },
				{ status: 409 },
			);
		}

		// Generate grant ID and token
		const grantId = `grant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		const token = generateAccessToken({
			grantId,
			eventId,
			email,
			accessTypes,
		});

		const now = new Date().toISOString();
		const newGrant: AccessGrant = {
			id: grantId,
			eventId,
			email,
			accessTypes,
			token,
			createdAt: now,
			updatedAt: now,
			createdBy: session.userId,
			createdByName: createdByName || session.email,
			status: "active",
		};

		// Get event data for email
		const event = await EventDataService.getEvent(eventId);
		const eventName = event?.name || "Event";

		// Build access link
		const baseUrl = getBaseUrl(request.headers);
		const accessLink = `${baseUrl}/api/access/verify?token=${encodeURIComponent(token)}`;

		// Send email
		const accessTypeLabels = accessTypes.map(
			(type: AccessType) => ACCESS_TYPE_CONFIG[type]?.label || type,
		);

		const emailSent = await sendAccessGrantEmail({
			email,
			eventName,
			accessTypes: accessTypeLabels,
			accessLink,
			grantedBy: createdByName || session.email,
		});

		newGrant.emailSentAt = emailSent ? now : undefined;

		// Save grant
		grants.push(newGrant);
		await EventDataService.saveAccessGrants(eventId, grants);

		return NextResponse.json({
			success: true,
			data: {
				grant: newGrant,
				emailSent,
			},
		});
	} catch (error) {
		console.error("Error creating access grant:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create access grant" } },
			{ status: 500 },
		);
	}
}
