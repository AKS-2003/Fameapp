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

// PUT /api/events/[eventId]/access-grants/[grantId] - Update access grant
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string; grantId: string }> },
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

		const { eventId, grantId } = await params;
		const body = await request.json();
		const { accessTypes, resendEmail } = body;

		const grants = await EventDataService.getAccessGrants(eventId);
		const grantIndex = grants.findIndex((g: AccessGrant) => g.id === grantId);

		if (grantIndex === -1) {
			return NextResponse.json(
				{ success: false, error: { code: "NOT_FOUND", message: "Access grant not found" } },
				{ status: 404 },
			);
		}

		const grant = grants[grantIndex] as AccessGrant;
		const now = new Date().toISOString();

		// Update access types if provided
		if (accessTypes && Array.isArray(accessTypes) && accessTypes.length > 0) {
			grant.accessTypes = accessTypes;
			// Regenerate token with new access types
			grant.token = generateAccessToken({
				grantId: grant.id,
				eventId,
				email: grant.email,
				accessTypes,
			});
		}

		grant.updatedAt = now;
		grants[grantIndex] = grant;

		// Resend email if requested
		let emailSent = false;
		if (resendEmail) {
			const event = await EventDataService.getEvent(eventId);
			const eventName = event?.name || "Event";
			const baseUrl = getBaseUrl(request.headers);
			const accessLink = `${baseUrl}/api/access/verify?token=${encodeURIComponent(grant.token)}`;

			const accessTypeLabels = grant.accessTypes.map(
				(type: AccessType) => ACCESS_TYPE_CONFIG[type]?.label || type,
			);

			emailSent = await sendAccessGrantEmail({
				email: grant.email,
				eventName,
				accessTypes: accessTypeLabels,
				accessLink,
				grantedBy: grant.createdByName || session.email,
			});

			if (emailSent) {
				grant.emailSentAt = now;
				grants[grantIndex] = grant;
			}
		}

		await EventDataService.saveAccessGrants(eventId, grants);

		return NextResponse.json({
			success: true,
			data: { grant, emailSent },
		});
	} catch (error) {
		console.error("Error updating access grant:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update access grant" } },
			{ status: 500 },
		);
	}
}

// DELETE /api/events/[eventId]/access-grants/[grantId] - Revoke access grant
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string; grantId: string }> },
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

		const { eventId, grantId } = await params;
		const grants = await EventDataService.getAccessGrants(eventId);
		const grantIndex = grants.findIndex((g: AccessGrant) => g.id === grantId);

		if (grantIndex === -1) {
			return NextResponse.json(
				{ success: false, error: { code: "NOT_FOUND", message: "Access grant not found" } },
				{ status: 404 },
			);
		}

		// Set status to revoked instead of deleting
		grants[grantIndex].status = "revoked";
		grants[grantIndex].updatedAt = new Date().toISOString();

		await EventDataService.saveAccessGrants(eventId, grants);

		return NextResponse.json({
			success: true,
			data: { message: "Access grant revoked successfully" },
		});
	} catch (error) {
		console.error("Error revoking access grant:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to revoke access grant" } },
			{ status: 500 },
		);
	}
}
