"use client";

import { useState, useRef, useEffect } from "react";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";

// Same preset colors as the costume color picker in artist-register
const PRESET_COLORS = [
	// Row 1 - Primary colors
	"#FF0000",
	"#FF4500",
	"#FFA500",
	"#FFD700",
	"#FFFF00",
	"#9ACD32",
	"#00FF00",
	"#00FA9A",
	"#00FFFF",
	"#00BFFF",
	"#0000FF",
	"#8A2BE2",
	// Row 2 - Secondary colors
	"#FF1493",
	"#FF69B4",
	"#FFC0CB",
	"#DDA0DD",
	"#EE82EE",
	"#DA70D6",
	"#BA55D3",
	"#9932CC",
	"#800080",
	"#4B0082",
	"#483D8B",
	"#6A5ACD",
	// Row 3 - Warm tones
	"#8B0000",
	"#A52A2A",
	"#B22222",
	"#CD5C5C",
	"#DC143C",
	"#FF6347",
	"#FF7F50",
	"#F08080",
	"#FA8072",
	"#E9967A",
	"#FFA07A",
	"#FFB6C1",
	// Row 4 - Cool tones
	"#000080",
	"#00008B",
	"#0000CD",
	"#1E90FF",
	"#4169E1",
	"#6495ED",
	"#87CEEB",
	"#87CEFA",
	"#ADD8E6",
	"#B0E0E6",
	"#AFEEEE",
	"#E0FFFF",
	// Row 5 - Earth tones
	"#8B4513",
	"#A0522D",
	"#D2691E",
	"#CD853F",
	"#DEB887",
	"#F5DEB3",
	"#D2B48C",
	"#BC8F8F",
	"#F4A460",
	"#DAA520",
	"#B8860B",
	"#FFE4B5",
	// Row 6 - Neutrals
	"#000000",
	"#1C1C1C",
	"#363636",
	"#4F4F4F",
	"#696969",
	"#808080",
	"#A9A9A9",
	"#C0C0C0",
	"#D3D3D3",
	"#DCDCDC",
	"#F5F5F5",
	"#FFFFFF",
];

interface CueColorPickerProps {
	label: string;
	value: string;
	onChange: (color: string) => void;
	placeholder?: string;
	required?: boolean;
}

export function CueColorPicker({
	label,
	value,
	onChange,
	placeholder = "Tap to select",
	required = false,
}: CueColorPickerProps) {
	const [showPalette, setShowPalette] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close palette when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setShowPalette(false);
			}
		};

		if (showPalette) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showPalette]);

	return (
		<div className="space-y-2" ref={containerRef}>
			<label className="text-sm font-medium">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<div className="flex items-center gap-3">
				{/* Color picker button */}
				<button
					type="button"
					onClick={() => setShowPalette(!showPalette)}
					className="h-12 w-12 min-w-12 rounded-lg border-2 border-gray-300 hover:border-purple-400 active:border-purple-500 transition-all cursor-pointer touch-manipulation flex items-center justify-center shadow-sm"
					style={{ backgroundColor: value || "#f3f4f6" }}
					title="Tap to pick color"
				>
					{!value && <Pipette className="h-5 w-5 text-gray-400" />}
				</button>

				{/* Hex input */}
				<Input
					type="text"
					value={value || ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="flex-1 h-12 text-base font-mono"
				/>
			</div>

			{/* Color palette - same style as costume colors */}
			{showPalette && (
				<div className="p-3 bg-white border-2 border-gray-200 rounded-lg shadow-lg">
					<p className="text-xs text-gray-500 mb-2">
						Tap a color to select:
					</p>
					<div className="grid grid-cols-12 gap-1.5 mb-3">
						{PRESET_COLORS.map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => {
									onChange(color);
									setShowPalette(false);
								}}
								className={`w-6 h-6 rounded-md border-2 transition-all touch-manipulation active:scale-90 ${
									value?.toUpperCase() === color.toUpperCase()
										? "border-purple-500 ring-2 ring-purple-300"
										: "border-gray-200 hover:border-gray-400"
								}`}
								style={{ backgroundColor: color }}
								title={color}
							/>
						))}
					</div>
					<div className="flex justify-end pt-2 border-t">
						<button
							type="button"
							onClick={() => setShowPalette(false)}
							className="h-8 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation"
						>
							Done
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

// Helper function to determine if a color is light or dark
export function isLightColor(color: string): boolean {
	if (!color) return true;

	// Remove # if present
	const hex = color.replace("#", "");

	// Convert to RGB
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);

	// Calculate luminance
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.5;
}

// Legacy component - kept for backward compatibility but no longer used
// Cue colors are now applied as full background on the cue card
export function CueColorBadge({
	color,
	cueType,
	size = "md",
}: {
	color?: string;
	cueType?: string;
	size?: "sm" | "md" | "lg";
}) {
	return null; // No longer renders anything - colors are applied to full card background
}
