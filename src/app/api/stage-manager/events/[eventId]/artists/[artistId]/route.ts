import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { APIResponse } from "@/types";

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string; artistId: string }> }
) {
	try {
		const resolvedParams = await params;
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 }
			);
		}

		if (
			session.role !== "stage_manager" &&
			session.role !== "super_admin"
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "Access denied. Stage manager role required.",
					},
				},
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { approvalStatus } = body;

		if (
			!approvalStatus ||
			!["approved", "rejected", "pending"].includes(approvalStatus)
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message:
							"Valid approval status is required (approved, rejected, pending)",
					},
				},
				{ status: 400 }
			);
		}

		// In a real implementation, you would:
		// 1. Verify the event belongs to this stage manager
		// 2. Update the artist's approval status in the database
		// 3. Send notification email to the artist
		// 4. Log the action

		// Simulate processing
		await new Promise((resolve) => setTimeout(resolve, 500));

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: `Artist ${approvalStatus} successfully`,
				artistId: resolvedParams.artistId,
				eventId: resolvedParams.eventId,
				approvalStatus,
			},
		});
	} catch (error) {
		console.error("Artist approval API error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update artist approval status",
				},
			},
			{ status: 500 }
		);
	}
}
