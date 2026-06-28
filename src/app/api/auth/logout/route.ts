import { NextRequest, NextResponse } from "next/server";
import {
	destroySessionResponse,
	destroyArtistSessionResponse,
	getSessionFromRequest,
} from "@/lib/session";
import { APIResponse } from "@/types";

function handleLogout(request: NextRequest, method: string) {
	const session = getSessionFromRequest(request);
	if (session) {
		console.log(`User ${session.email} (${session.role}) logged out via ${method}`);
	} else {
		console.log(`Logout requested via ${method} without valid session`);
	}

	// Determine redirect based on role or query param
	const { searchParams } = new URL(request.url);
	const customRedirect = searchParams.get("redirect");
	const isArtist = session?.role === "artist";
	const redirectUrl = customRedirect || (isArtist ? "/famelink-auth" : "/login");

	let response: NextResponse;
	if (method === "GET") {
		response = NextResponse.redirect(new URL(redirectUrl, request.url));
	} else {
		response = NextResponse.json<APIResponse>({
			success: true,
			data: { message: "Successfully logged out", redirectUrl },
		});
	}

	// Clear BOTH cookies so there is zero cross-role bleed
	destroySessionResponse(response);
	destroyArtistSessionResponse(response);

	return response;
}

export async function POST(request: NextRequest) {
	try {
		return handleLogout(request, "POST");
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: { code: "INTERNAL_ERROR", message: "An error occurred during logout" },
			},
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		return handleLogout(request, "GET");
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: { code: "INTERNAL_ERROR", message: "An error occurred during logout" },
			},
			{ status: 500 },
		);
	}
}
