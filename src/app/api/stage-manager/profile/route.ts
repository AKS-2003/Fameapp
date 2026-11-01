import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
import { getUserById } from "@/lib/data-access";
import { APIResponse } from "@/types";
import { connectToDatabase } from "@/database/mongodb";
import UserModel from "@/database/models/User";
import { isValidPhone, PHONE_ERROR_MESSAGE } from "@/lib/phone-validation";

// Get stage manager profile using the data access layer
export const GET = async (request: NextRequest) => {
	try {
		console.log("Profile API called - checking session...");

		// Manual session check for debugging
		const sessionData = await import("@/lib/session").then((m) =>
			m.getSessionFromRequest(request)
		);
		console.log("Session data:", sessionData);

		if (!sessionData) {
			console.log("No session found");
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "No session found - please log in",
					},
				},
				{ status: 401 }
			);
		}

		// Now call the original withAuth wrapper
		return await withAuthWrapper(request, sessionData);
	} catch (error) {
		console.error("Profile API outer error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Session check failed",
				},
			},
			{ status: 500 }
		);
	}
};

const withAuthWrapper = async (request: NextRequest, session: any) => {
	try {
		console.log("Profile API called with session:", {
			userId: session.userId,
			role: session.role,
			status: session.status,
		});

		// Get fresh user data first to check current role and status
		console.log("Fetching user data for userId:", session.userId);
		const user = await getUserById(session.userId);

		if (!user) {
			console.log("User not found in database");
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "Stage manager not found",
					},
				},
				{ status: 404 }
			);
		}

		// Check if user is a stage manager (use fresh data from database)
		if (user.role !== "stage_manager" && user.role !== "super_admin") {
			console.log("Access denied - not a stage manager:", user.role);
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

		// Check if user status allows access (active or pending)
		if (user.status !== "active" && user.status !== "pending") {
			console.log("Access denied - invalid status:", user.status);
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: `Account status: ${user.status}. Please contact support.`,
					},
				},
				{ status: 403 }
			);
		}

		console.log("User data retrieved:", user ? "Found" : "Not found");

		// Return user profile without sensitive data
		const userProfile = {
			id: user.id,
			email: user.email,
			role: user.role,
			status: user.status,
			profile: {
				firstName: user.profile?.firstName || "",
				lastName: user.profile?.lastName || "",
				phone: user.profile?.phone || "",
				avatar: user.profile?.avatar || null,
			},
			createdAt: user.createdAt,
			lastLogin: user.lastLogin,
		};

		console.log("Returning user profile successfully");

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: userProfile,
			},
		});
	} catch (error) {
		console.error("Get stage manager profile error:", error);
		console.error(
			"Error stack:",
			error instanceof Error ? error.stack : "No stack trace"
		);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred",
				},
			},
			{ status: 500 }
		);
	}
};

// Update the logged-in stage manager's name and phone
export const PATCH = async (request: NextRequest) => {
	try {
		const session = (await import("@/lib/session")).getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json<APIResponse>(
				{ success: false, error: { code: "UNAUTHORIZED", message: "No session found - please log in" } },
				{ status: 401 }
			);
		}
		if (session.role !== "stage_manager" && session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{ success: false, error: { code: "FORBIDDEN", message: "Access denied." } },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const firstName = String(body.firstName ?? "").trim();
		const lastName = String(body.lastName ?? "").trim();
		const phone = String(body.phone ?? "").trim();

		const errors: Record<string, string> = {};
		if (!firstName) errors.firstName = "First name is required";
		if (!lastName) errors.lastName = "Last name is required";
		if (phone && !isValidPhone(phone)) errors.phone = PHONE_ERROR_MESSAGE;
		if (Object.keys(errors).length > 0) {
			return NextResponse.json<APIResponse>(
				{ success: false, error: { code: "VALIDATION_ERROR", message: Object.values(errors)[0], details: errors } as any },
				{ status: 400 }
			);
		}

		await connectToDatabase();
		await UserModel.findOneAndUpdate(
			{ id: session.userId },
			{ $set: { "profile.firstName": firstName, "profile.lastName": lastName, "profile.phone": phone } }
		);

		return NextResponse.json<APIResponse>({
			success: true,
			data: { firstName, lastName, phone },
		});
	} catch (error) {
		console.error("Update stage manager profile error:", error);
		return NextResponse.json<APIResponse>(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update profile" } },
			{ status: 500 }
		);
	}
};
