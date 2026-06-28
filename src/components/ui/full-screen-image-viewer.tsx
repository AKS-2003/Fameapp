"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface FullScreenImageViewerProps {
	src: string;
	alt: string;
	className?: string;
	children?: React.ReactNode;
}

export function FullScreenImageViewer({
	src,
	alt,
	className = "",
	children,
}: FullScreenImageViewerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	return (
		<>
			{/* Trigger Element */}
			<div
				className={`relative cursor-pointer transition-all duration-300 ${
					isHovered ? "scale-105 shadow-2xl" : ""
				} ${className}`}
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen(true);
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				{children || (
					<img
						src={src}
						alt={alt}
						className="w-full h-full object-cover rounded-full"
					/>
				)}

				{/* Hover Overlay */}
				{isHovered && (
					<div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-all duration-300">
						<div className="bg-white/90 rounded-full p-2">
							<ZoomIn className="h-6 w-6 text-gray-800" />
						</div>
					</div>
				)}
			</div>

			{/* Full Screen Overlay - rendered via portal-like fixed positioning with very high z-index */}
			{isOpen && (
				<div
					className="fixed inset-0 flex items-center justify-center"
					style={{
						zIndex: 99999,
						backgroundColor: "rgba(0,0,0,0.95)",
					}}
					onClick={() => setIsOpen(false)}
				>
					{/* Close hint */}
					<button
						className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
						onClick={() => setIsOpen(false)}
						aria-label="Close"
					>
						<X className="h-6 w-6" />
					</button>

					{/* Full Screen Image */}
					<img
						src={src}
						alt={alt}
						className="max-w-full max-h-full object-contain"
						style={{ maxWidth: "90vw", maxHeight: "90vh" }}
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			)}
		</>
	);
}
