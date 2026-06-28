import React from "react";
import Image from "next/image";

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
		<div
			className={`flex items-center justify-center gap-2 text-xs ${className}`}
		>
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
	);
}
