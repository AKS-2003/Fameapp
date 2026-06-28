import { NextRequest, NextResponse } from "next/server";
import { validateUserCredentials, createSessionData } from "@/lib/auth";
import { createSessionResponse } from "@/lib/session";
import { isValidEmail } from "@/lib/utils";
import { APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, password, eventId } = body;

		// Validate input
		if (!email || !password) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "MISSING_CREDENTIALS",
						message: "Email and password are required",
					},
				},
				{ status: 400 }
			);
		}

		if (!isValidEmail(email)) {
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

		// First, check if user exists and their status
		const { getUserByEmail } = await import("@/lib/data-access");
		const existingUser = await getUserByEmail(email);

		if (existingUser) {
			// Check user status BEFORE validating password
			if (existingUser.status === "suspended") {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ACCOUNT_SUSPENDED",
							message:
								"Your account has been suspended by the administrator. Please contact support at ericlaltaevents@gmail.com or +971 52 841 1575.",
						},
					},
					{ status: 403 }
				);
			}

			if (existingUser.status === "deactivated") {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ACCOUNT_DEACTIVATED",
							message:
								"Your account has been deactivated by the administrator. Please contact support at ericlaltaevents@gmail.com or +971 52 841 1575 to reactivate your account.",
						},
					},
					{ status: 403 }
				);
			}

			if (existingUser.status === "rejected") {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ACCOUNT_REJECTED",
							message:
								"Your registration request has been rejected. Please contact support at ericlaltaevents@gmail.com or +971 52 841 1575 for more information.",
						},
					},
					{ status: 403 }
				);
			}
		}

		// Now validate credentials against fame-data bucket
		const user = await validateUserCredentials(email, password);

		if (!user) {
			if (existingUser) {
				// User exists but password is wrong
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "INVALID_PASSWORD",
							message:
								"Incorrect password. Please try again or use 'Forgot Password'.",
						},
					},
					{ status: 401 }
				);
			} else {
				// User doesn't exist
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "USER_NOT_FOUND",
							message:
								"No account found with this email address.",
						},
					},
					{ status: 401 }
				);
			}
		}

		// Handle pending status
		if (user.status === "pending") {
			// For stage managers, allow login but redirect to pending page
			if (user.role === "stage_manager") {
				const sessionData = createSessionData(user);
				const response = NextResponse.json<APIResponse>({
					success: true,
					data: {
						user: {
							id: user.id,
							email: user.email,
							role: user.role,
							status: user.status,
							profile: user.profile,
						},
						redirectUrl: "/stage-manager-pending",
					},
				});
				return createSessionResponse(sessionData, response);
			}

			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "ACCOUNT_PENDING",
						message:
							"Your account is pending approval. Please wait for admin approval.",
					},
				},
				{ status: 403 }
			);
		}

		if (user.status === "deactivated") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "ACCOUNT_DEACTIVATED",
						message:
							"Your account has been deactivated by the administrator. Please contact support at ericlaltaevents@gmail.com or +971 52 841 1575.",
					},
				},
				{ status: 403 }
			);
		}



		// Create session data
		const sessionData = createSessionData(user, eventId);

		// Create response with session cookie
		const response = NextResponse.json<APIResponse>({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					role: user.role,
					status: user.status,
					profile: user.profile,
				},
				redirectUrl: getRedirectUrl(user.role, user.status),
			},
		});

		// Set appropriate session cookie based on role
		if (user.role === "artist") {
			const { createArtistSessionResponse } = await import("@/lib/session");
			return createArtistSessionResponse(sessionData, response);
		}
		
		// Set default session cookie (stage manager, admin, dj)
		return createSessionResponse(sessionData, response);
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred. Please try again.",
				},
			},
			{ status: 500 }
		);
	}
}

// Determine redirect URL based on user role and status
function getRedirectUrl(role: string, status: string): string {
	if (status !== "active") {
		return `/account-${status}`;
	}

	switch (role) {
		case "super_admin":
			return "/super-admin";
		case "stage_manager":
			return "/stage-manager";
		default:
			return "/";
	}
}
