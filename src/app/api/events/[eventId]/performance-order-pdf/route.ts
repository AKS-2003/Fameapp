import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PerformanceOrderPDF } from "@/lib/performance-order-pdf";
import React from "react";
import fs from "fs";
import path from "path";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const body = await request.json();

		const {
			eventName,
			eventDate,
			performances,
			backstageReadyTime,
			showStartTime,
			venue,
		} = body;

		console.log("PDF Generation Request:", {
			eventName,
			eventDate,
			performanceCount: performances?.length,
		});

		// Convert logo to base64
		const logoPath = path.join(process.cwd(), "public", "fame-logo.png");
		let logoBase64 = "";

		try {
			const logoBuffer = fs.readFileSync(logoPath);
			logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
		} catch (error) {
			console.error("Error loading logo:", error);
			// Logo will be empty if not found
		}

		// Create the PDF document
		const pdfDoc = React.createElement(PerformanceOrderPDF, {
			eventName,
			eventDate,
			performances,
			backstageReadyTime,
			showStartTime,
			venue,
			logoBase64,
		});

		// Render to buffer
		const pdfBuffer = await renderToBuffer(pdfDoc);

		// Format filename: remove extra spaces, special chars, and format date properly
		const cleanEventName = (eventName || "Event")
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/gi, "");
		const cleanDate = (eventDate || "Date")
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/gi, "");
		const filename = `Performance-Order-${cleanEventName}-${cleanDate}.pdf`;

		// Return the PDF with inline disposition for preview
		return new NextResponse(pdfBuffer as any, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("PDF generation error:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "PDF_GENERATION_ERROR",
					message: "Failed to generate PDF",
					details:
						error instanceof Error
							? error.message
							: "Unknown error",
				},
			},
			{ status: 500 },
		);
	}
}
