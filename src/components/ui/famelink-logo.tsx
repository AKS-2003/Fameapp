import React from "react";

interface FameLinkLogoProps {
	width?: number;
	height?: number;
	className?: string;
	badgeClassName?: string;
}

export function FameLinkLogo({
	width = 120,
	height = 120,
	className = "",
	badgeClassName = "",
}: FameLinkLogoProps) {
	// Calculate badge dimensions based on logo size
	const badgeWidth = width * 0.85;
	const badgeFontSize = width * 0.18;
	const badgePadding = width * 0.08;
	const badgeMarginTop = -(height * 0.15);

	return (
		<div
			className={`inline-flex flex-col items-center justify-center ${className}`}
		>
			<img
				src="/fame-logo.png"
				alt="FAME Logo"
				width={width}
				height={height}
				className="object-contain"
			/>
			<div
				className={`bg-[#1a1a2e] text-white font-bold rounded-full flex items-center justify-center shadow-lg ${badgeClassName}`}
				style={{
					width: `${badgeWidth}px`,
					fontSize: `${badgeFontSize}px`,
					padding: `${badgePadding}px ${badgePadding * 1.5}px`,
					marginTop: `${badgeMarginTop}px`,
					letterSpacing: "0.05em",
				}}
			>
				link
			</div>
		</div>
	);
}
