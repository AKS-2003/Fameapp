import { NextRequest, NextResponse } from "next/server";
import { isPathAllowed, AccessType } from "@/lib/types/access-grant";

const ACCESS_GRANT_COOKIE = "fame-access-grant";

// GET /api/access/check?eventId=...&path=... - Check if current user has access via grant
export async function GET(request: NextRequest) {
	try {
		const eventId = request.nextUrl.searchParams.get("eventId");
		const pathname = request.nextUrl.searchParams.get("path") || "";

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: { code: "VALIDATION_ERROR", message: "eventId is required" } },
				{ status: 400 },
			);
		}

		const grantCookie = request.cookies.get(ACCESS_GRANT_COOKIE);
		if (!grantCookie?.value) {
			return NextResponse.json({
				success: true,
				data: { hasAccess: false },
			});
		}

		try {
			const cookieString =
				typeof atob !== "undefined"
					? atob(grantCookie.value)
					: Buffer.from(grantCookie.value, "base64").toString("utf-8");

			const grantData = JSON.parse(cookieString);

			// Fetch fresh grant from GCS to ensure it wasn't revoked or modified
			const { EventDataService } = await import("@/lib/storage-service");
			
			// Extract grant data from cookie
			const { grantId, eventId: cookieEventId } = grantData;
			
			// Basic validation
			if (!grantId || !cookieEventId || typeof grantId !== "string") {
				return NextResponse.json({
					success: true,
					data: { hasAccess: false },
				});
			}

			// Check if grant is for this event
			if (cookieEventId !== eventId) {
				return NextResponse.json({
					success: true,
					data: { hasAccess: false },
				});
			}
			
			// Verify against database
			const grants = await EventDataService.getAccessGrants(eventId);
			const activeGrant = grants.find(
				(g: any) => g.id === grantId && g.status === "active"
			);

			if (!activeGrant) {
				// Grant was revoked or deleted
				return NextResponse.json({
					success: true,
					data: { hasAccess: false },
				});
			}

			// Use the fresh accessTypes from DB, not from cookie 
			const currentAccessTypes = activeGrant.accessTypes;

			// Extract sub-path from the full pathname
			const eventPathPrefix = `/stage-manager/events/${eventId}/`;
			let subPath = "";
			if (pathname.startsWith(eventPathPrefix)) {
				subPath = pathname.slice(eventPathPrefix.length).replace(/\/+$/, "");
			}

			// Check if path is allowed
			// Access hub is always accessible for any grant user
			const isAccessHub = subPath === "access-hub";
			const hasAccess = isAccessHub
				? currentAccessTypes.length > 0
				: subPath
					? isPathAllowed(subPath, currentAccessTypes as AccessType[])
					: currentAccessTypes.length > 0;

			return NextResponse.json({
				success: true,
				data: {
					hasAccess,
					accessTypes: currentAccessTypes,
					email: activeGrant.email,
					grantId: activeGrant.id,
				},
			});
		} catch {
			return NextResponse.json({
				success: true,
				data: { hasAccess: false },
			});
		}
	} catch (error) {
		console.error("Error checking access:", error);
		return NextResponse.json(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to check access" } },
			{ status: 500 },
		);
	}
}
