import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
import { getUserById } from "@/lib/auth";
// import { writeJsonFile, readJsonFile } from "@/lib/storage-service";
import { getUserById as dataAccessGetUserById, updateUser, getUserByEmail } from "@/lib/data-access";
import { isValidEmail } from "@/lib/utils";
import { User, APIResponse } from "@/types";

// Get user profile
export const GET = withAuth(async (request: NextRequest, session) => {
	try {
		const user = await getUserById(session.userId);

		if (!user) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "User not found",
					},
				},
				{ status: 404 }
			);
		}

		// Return user profile without sensitive data
		const { passwordHash, ...userProfile } = user;

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: userProfile,
			},
		});
	} catch (error) {
		console.error("Get profile error:", error);
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
});

// Update user profile
export const PUT = withAuth(async (request: NextRequest, session) => {
	try {
		const body = await request.json();
		const { firstName, lastName, phone, email } = body;

		// Validate input
		if (!firstName || !lastName) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_FIELDS",
						message: "First name and last name are required",
					},
				},
				{ status: 400 }
			);
		}

		if (email && !isValidEmail(email)) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "INVALID_EMAIL",
						message: "Please provide a valid email address",
					},
				},
				{ status: 400 }
			);
		}

		// Read existing user
		const user = await dataAccessGetUserById(session.userId);
		if (!user) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "USER_NOT_FOUND",
						message: "User not found",
					},
				},
				{ status: 404 }
			);
		}

		// Check if email is being changed and if it's already taken
		if (email && email !== user.email) {
			const existingUser = await getUserByEmail(email);
			if (existingUser && existingUser.id !== session.userId) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "EMAIL_EXISTS",
							message:
								"This email is already in use by another account",
						},
					},
					{ status: 409 }
				);
			}
		}

		// Update user profile
		user.profile = {
			...user.profile,
			firstName,
			lastName,
			phone: phone || user.profile.phone,
		};

		// Update email if provided
		if (email) {
			user.email = email.toLowerCase();
		}

		// Save updated user
		await updateUser(user);

		// Return updated profile without sensitive data
		const { passwordHash, ...updatedProfile } = user;

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: updatedProfile,
				message: "Profile updated successfully",
			},
		});
	} catch (error) {
		console.error("Update profile error:", error);
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
});
