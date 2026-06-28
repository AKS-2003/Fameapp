import React from "react";

interface FameLogoProps {
	width?: number;
	height?: number;
	className?: string;
}

export function FameLogo({
	width = 120,
	height = 120,
	className = "",
}: FameLogoProps) {
	return (
		<div className={`inline-flex items-center justify-center ${className}`}>
			<img
				src="/fame-logo.png"
				alt="FAME Logo"
				width={width}
				height={height}
				className="object-contain"
			/>
		</div>
	);
}
