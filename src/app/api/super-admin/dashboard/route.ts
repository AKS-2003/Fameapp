import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { APIResponse } from "@/types";
import { connectToDatabase } from "@/database/mongodb";
import FameLinkArtistModel from "@/database/models/FameLinkArtist";

export async function GET(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);

		// ── AUTH GUARD: Only super admins may access this endpoint ──────────
		if (!session || session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Super admin access required.",
					},
				},
				{ status: 401 },
			);
		}

		// Ensure DB connection
		await connectToDatabase();

		// Import data access
		const {
			getAllUsers,
			getPendingStageManagers,
		} = await import("@/lib/data-access");

		const allUsers = await getAllUsers();
		const pendingUsers = await getPendingStageManagers();
		
		// Also count total registered artists
		const totalArtistsCount = await FameLinkArtistModel.countDocuments();
		const proArtistsCount = await FameLinkArtistModel.countDocuments({
			tier: { $in: ["pro", "pro_plus"] }
		});

		const stageManagers = allUsers.filter(
			(user) => user.role === "stage_manager" && user.status !== "pending",
		);

		// Calculate stats
		const stats = {
			totalUsers: allUsers.length,
			totalStageManagers: stageManagers.length,
			pendingApprovals: pendingUsers.length,
			activeStageManagers: stageManagers.filter(
				(sm: any) => sm.status === "active"
			).length,
			totalArtists: totalArtistsCount,
			proArtists: proArtistsCount
		};

		const dashboardData = {
			user: {
				id: session.userId,
				email: session.email,
				role: session.role,
				status: session.status,
				profile: {
					firstName: "Super",
					lastName: "Admin",
				},
			},
			stats,
			pendingRegistrations: pendingUsers,
			allStageManagers: stageManagers,
		};

		return NextResponse.json<APIResponse>({
			success: true,
			data: dashboardData,
		});
	} catch (error) {
		console.error("[SUPER-ADMIN-API] Error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to load dashboard data: " + (error as Error).message,
				},
			},
			{ status: 500 }
		);
	}
}
