import React from "react";
import Image from "next/image";
import Link from "next/link";

interface FantasiaFooterProps {
	className?: string;
	variant?: "light" | "dark";
}

export function FantasiaFooter({
	className = "",
	variant = "dark",
}: FantasiaFooterProps) {
	// For dark backgrounds, use the original brown/gold colors from the image
	// For light backgrounds, might need slight opacity adjustment
	const imageOpacity = variant === "light" ? "opacity-80" : "opacity-70";
	const textColor = variant === "light" ? "text-gray-600" : "text-gray-400";

	return (
		<div className={`flex flex-col items-center gap-2 text-xs ${className}`}>
			<div className="flex items-center justify-center gap-2">
				<span className={textColor}>Powered by</span>
				<Image
					src="/fantasia.png"
					alt="Fantasia DXB"
					width={180}
					height={35}
					className={`object-contain ${imageOpacity}`}
					style={{ width: "auto", height: "auto" }}
				/>
			</div>
			<div className={`flex items-center gap-3 ${textColor}`}>
				<Link href="/privacy-policy" className="underline-offset-2 hover:underline">
					Privacy Policy
				</Link>
				<span aria-hidden="true">·</span>
				<Link href="/terms" className="underline-offset-2 hover:underline">
					Terms
				</Link>
				<span aria-hidden="true">·</span>
				<Link href="/delete-account" className="underline-offset-2 hover:underline">
					Delete account
				</Link>
				<span aria-hidden="true">·</span>
				<Link href="/support" className="underline-offset-2 hover:underline">
					Support
				</Link>
			</div>
		</div>
	);
}
