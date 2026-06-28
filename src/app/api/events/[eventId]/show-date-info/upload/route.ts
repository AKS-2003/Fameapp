import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/lib/storage-service";
import path from "path";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const showDate = formData.get("showDate") as string;

		if (!file) {
			return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
		}

		// Validate file type (PDF only)
		if (file.type !== "application/pdf") {
			return NextResponse.json({ success: false, error: "Only PDF files are allowed" }, { status: 400 });
		}

		// Validate file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			return NextResponse.json({ success: false, error: "File size must be under 10MB" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const sanitizedDate = showDate ? showDate.split("T")[0].replace(/-/g, "") : "general";
		
        const fileName = `${fileId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const relativePath = `show-date-attachments/${eventId}/${sanitizedDate}/${fileName}`;

        // Save to VPS local storage via StorageService
		const success = await StorageService.saveFile(relativePath, buffer);

        if (!success) {
            throw new Error("Failed to save file to VPS storage");
        }

		// Local serving URL
		const localUrl = `/api/media/serve?file=${encodeURIComponent(relativePath)}`;

		return NextResponse.json({
			success: true,
			data: {
				id: fileId,
				fileName: fileName,
				originalName: file.name,
				fileUrl: localUrl,
				filePath: relativePath,
				uploadedAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error("Error uploading show date attachment to VPS:", error);
		return NextResponse.json({ success: false, error: "Failed to upload file to VPS" }, { status: 500 });
	}
}
