"use client";

import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeDialogProps {
	url: string;
	title: string;
	description: string;
	triggerText?: ReactNode;
	triggerIcon?: ReactNode;
	triggerVariant?:
		| "default"
		| "outline"
		| "secondary"
		| "ghost"
		| "link"
		| "destructive";
	triggerSize?: "default" | "sm" | "lg" | "icon";
	triggerClassName?: string;
}

export function QRCodeDialog({
	url,
	title,
	description,
	triggerText = "QR Code",
	triggerIcon = <QrCode className="h-4 w-4" />,
	triggerVariant = "outline",
	triggerSize = "sm",
	triggerClassName = "",
}: QRCodeDialogProps) {
	const { toast } = useToast();
	const [isOpen, setIsOpen] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(url);
			toast({
				title: "Link copied!",
				description: "URL copied to clipboard",
				variant: "success",
			});
		} catch (error) {
			console.error("Failed to copy link:", error);
			toast({
				title: "Copy failed",
				description: "Failed to copy link to clipboard",
				variant: "destructive",
			});
		}
	};

	const downloadQRCode = () => {
		const svg = document.getElementById("qr-code-svg");
		if (!svg) return;

		const svgData = new XMLSerializer().serializeToString(svg);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const img = new Image();

		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);

			const pngFile = canvas.toDataURL("image/png");
			const downloadLink = document.createElement("a");
			downloadLink.download = `${title.replace(/\s+/g, "_")}_QR_Code.png`;
			downloadLink.href = pngFile;
			downloadLink.click();
		};

		img.src = "data:image/svg+xml;base64," + btoa(svgData);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant={triggerVariant}
					size={triggerSize}
					className={`flex items-center gap-2 ${triggerClassName}`}
				>
					{triggerIcon}
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<QrCode className="h-5 w-5" />
						{title} QR Code
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center space-y-4 py-4">
					{/* QR Code */}
					<div className="p-4 bg-white rounded-lg border-2 border-gray-200">
						<QRCodeSVG
							id="qr-code-svg"
							value={url}
							size={200}
							level="M"
							includeMargin={true}
						/>
					</div>

					{/* URL Display */}
					<div className="w-full p-3 bg-gray-50 rounded-md text-sm break-all text-center text-gray-700 border">
						{url}
					</div>

					{/* Action Button */}
					<div className="w-full">
						<Button
							onClick={downloadQRCode}
							variant="outline"
							className="w-full"
						>
							<Download className="h-4 w-4 mr-2" />
							Download QR
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
