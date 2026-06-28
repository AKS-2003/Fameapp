import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/route-protection";
// import { readJsonFile } from "@/lib/storage-service";
import { getMediaFilesByUser } from "@/lib/data-access";
import { APIResponse, MediaFile } from "@/types";

export const GET = withAuth(async (request: NextRequest, session) => {
	try {
		const { searchParams } = new URL(request.url);
		const category = searchParams.get("category");
		const eventId = searchParams.get("eventId");

		let allFiles: MediaFile[] = [];

		// Get user files from MongoDB
		allFiles = (await getMediaFilesByUser(session.userId)) as unknown as MediaFile[];

		// Filter by event if specified (if the schema supports tracking eventId)
		if (eventId) {
			allFiles = allFiles.filter(f => (f as any).eventId === eventId);
		}

		// Filter by category if specified
		if (category) {
			allFiles = allFiles.filter((file) => file.category === category);
		}

		// Sort by upload date (newest first)
		allFiles.sort(
			(a, b) =>
				new Date(b.uploadedAt).getTime() -
				new Date(a.uploadedAt).getTime()
		);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				files: allFiles,
				total: allFiles.length,
			},
		});
	} catch (error) {
		console.error("List files error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to list files",
				},
			},
			{ status: 500 }
		);
	}
});
