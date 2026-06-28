"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";

export default function RehearsalPDFPreviewPage() {
	const params = useParams();
	const eventId = params.eventId as string;
	const [pdfUrl, setPdfUrl] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		const generatePDF = async () => {
			try {
				// Get data from sessionStorage (passed from parent page)
				const pdfDataStr = sessionStorage.getItem(
					`rehearsal-pdf-data-${eventId}`,
				);
				if (!pdfDataStr) {
					throw new Error("No PDF data found");
				}

				const pdfData = JSON.parse(pdfDataStr);

				// Generate PDF
				const response = await fetch(
					`/api/events/${eventId}/rehearsal-schedule-pdf`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(pdfData),
					},
				);

				if (!response.ok) {
					throw new Error("Failed to generate PDF");
				}

				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				setPdfUrl(url);
				setLoading(false);

				// Clean up sessionStorage
				sessionStorage.removeItem(`rehearsal-pdf-data-${eventId}`);
			} catch (err) {
				console.error("PDF generation error:", err);
				setError(
					err instanceof Error
						? err.message
						: "Failed to generate PDF",
				);
				setLoading(false);
			}
		};

		generatePDF();

		// Cleanup
		return () => {
			if (pdfUrl) {
				window.URL.revokeObjectURL(pdfUrl);
			}
		};
	}, [eventId]);

	const handleDownload = () => {
		if (!pdfUrl) return;

		const link = document.createElement("a");
		link.href = pdfUrl;
		link.download = `Rehearsal-Schedule-${new Date().toISOString().split("T")[0]}.pdf`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">
						Generating rehearsal schedule PDF preview...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-100">
				<div className="text-center">
					<p className="text-red-600 text-lg">{error}</p>
					<Button
						onClick={() => window.close()}
						className="mt-4"
						variant="outline"
					>
						Close Window
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header with download button */}
			<div className="bg-white border-b shadow-sm sticky top-0 z-10">
				<div className="container mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.close()}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Close
						</Button>
						<h1 className="text-lg font-semibold">
							Rehearsal Schedule PDF Preview
						</h1>
					</div>
					<Button
						onClick={handleDownload}
						className="flex items-center gap-2"
					>
						<Download className="h-4 w-4" />
						Download PDF
					</Button>
				</div>
			</div>

			{/* PDF Viewer */}
			<div className="container mx-auto p-4">
				<div
					className="bg-white rounded-lg shadow-lg overflow-hidden"
					style={{ height: "calc(100vh - 100px)" }}
				>
					<iframe
						src={pdfUrl}
						className="w-full h-full"
						title="PDF Preview"
					/>
				</div>
			</div>
		</div>
	);
}
