import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PerformanceItem {
	id: string;
	type: "artist" | "cue";
	order: number;
	name: string;
	style?: string;
	duration: number;
	nationality?: string;
	flag?: string;
	cueType?: string;
}

interface UsePerformanceOrderPDFProps {
	eventId: string;
	eventName: string;
	eventDate: string;
	venue?: string;
}

export function usePerformanceOrderPDF({
	eventId,
	eventName,
	eventDate,
	venue,
}: UsePerformanceOrderPDFProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const { toast } = useToast();

	const generatePDF = async (
		performances: PerformanceItem[],
		backstageReadyTime?: string,
		showStartTime?: string,
	) => {
		try {
			setIsGenerating(true);

			toast({
				title: "Generating PDF...",
				description:
					"Please wait while we create your performance order PDF",
			});

			const response = await fetch(
				`/api/events/${eventId}/performance-order-pdf`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						eventName,
						eventDate,
						performances,
						backstageReadyTime,
						showStartTime,
						venue,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to generate PDF");
			}

			// Get the PDF blob
			const blob = await response.blob();

			// Open the PDF in a new tab instead of downloading directly
			const url = window.URL.createObjectURL(blob);
			const newWindow = window.open(url, '_blank');
			
			// If popup blocker blocked it, fallback to default behavior or alert
			if (!newWindow) {
				toast({
					title: "Popup Blocked",
					description: "Please allow popups to preview the PDF, or it may have been blocked.",
					variant: "destructive",
				});
				// Fallback to direct download
				const link = document.createElement("a");
				link.href = url;
				link.download = `performance-order-${eventName.replace(
					/[^a-z0-9]/gi,
					"-",
				)}-${new Date().toISOString().split("T")[0]}.pdf`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
			
			// We cannot reliably revokeObjectURL here because the new tab needs it to load.
			// The browser will clean it up when the document unloads.

			toast({
				title: "✅ PDF Generated!",
				description: "Your PDF has been generated and opened in a new tab.",
				variant: "default",
			});
		} catch (error) {
			console.error("PDF generation error:", error);
			toast({
				title: "❌ PDF Generation Failed",
				description:
					"Failed to generate PDF. Please try again or contact support.",
				variant: "destructive",
			});
		} finally {
			setIsGenerating(false);
		}
	};

	return {
		generatePDF,
		isGenerating,
	};
}
