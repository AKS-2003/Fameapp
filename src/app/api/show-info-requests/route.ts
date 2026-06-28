import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
	createShowInfoRequest,
	getShowInfoRequestsByArtist,
	updateShowInfoRequest,
	getBaseShow,
} from "@/lib/data-access";
import { v4 as uuidv4 } from "uuid";

// POST /api/show-info-requests - Create a new show info request (external organizer)
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			artistId,
			requesterEmail,
			requesterName,
			requesterOrganization,
			message,
		} = body;

		if (!artistId || !requesterEmail || !requesterName) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message:
							"artistId, requesterEmail, and requesterName are required",
					},
				},
				{ status: 400 },
			);
		}

		const now = new Date();
		const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

		const showInfoRequest = await createShowInfoRequest({
			id: uuidv4(),
			artistId,
			requesterEmail,
			requesterName,
			requesterOrganization: requesterOrganization || undefined,
			message: message || undefined,
			status: "pending",
			createdAt: now.toISOString(),
			expiresAt: expiresAt.toISOString(),
		});

		return NextResponse.json(
			{ success: true, data: { showInfoRequest } },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating show info request:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}

// GET /api/show-info-requests - Get show info requests for current artist
export async function GET(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const requests = await getShowInfoRequestsByArtist(session.userId);

		return NextResponse.json({ success: true, data: { requests } });
	} catch (error) {
		console.error("Error fetching show info requests:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}

// PUT /api/show-info-requests - Respond to a show info request
export async function PUT(request: NextRequest) {
	try {
		const session = await getSession();
		if (!session?.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "AUTH_003", message: "Unauthorized" },
				},
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { requestId, baseShowId } = body;

		if (!requestId || !baseShowId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_REQUEST",
						message: "requestId and baseShowId are required",
					},
				},
				{ status: 400 },
			);
		}

		// Verify the show belongs to the artist
		const show = await getBaseShow(baseShowId);
		if (!show || show.artistId !== session.userId) {
			return NextResponse.json(
				{
					success: false,
					error: { code: "INVALID_REQUEST", message: "Invalid show" },
				},
				{ status: 400 },
			);
		}

		// Generate shareable link
		const responseLink = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/show/${show.slug}`;

		await updateShowInfoRequest(requestId, {
			status: "responded",
			responseShowId: baseShowId,
			responseLink,
			respondedAt: new Date().toISOString(),
		});

		return NextResponse.json({
			success: true,
			data: { responseLink },
		});
	} catch (error) {
		console.error("Error responding to show info request:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "SERVER_ERROR",
					message: "Internal server error",
				},
			},
			{ status: 500 },
		);
	}
}
