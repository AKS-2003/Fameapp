"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pipette, X, ChevronDown, Check } from "lucide-react";

// Preset color palette for quick selection - mobile friendly
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

interface ColorPickerProps {
	id?: string;
	label?: string;
	value: string;
	onChange: (color: string) => void;
	placeholder?: string;
	className?: string;
	required?: boolean;
	showClear?: boolean;
}

export function ColorPicker({
	id,
	label,
	value,
	onChange,
	placeholder = "Select or enter a color",
	className = "",
	required = false,
	showClear = false,
}: ColorPickerProps) {
	const colorInputRef = useRef<HTMLInputElement>(null);
	const [showPalette, setShowPalette] = useState(false);

	const getDisplayColor = (color: string) => {
		if (!color) return "";
		return color;
	};

	const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value);
	};

	const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value);
	};

	const openColorPicker = () => {
		console.log("openColorPicker called"); // Debug log
		// Try to trigger the native color picker
		if (colorInputRef.current) {
			// For mobile devices, we need to ensure the input is temporarily visible
			const input = colorInputRef.current;
			const originalStyle = input.style.cssText;
			console.log("Attempting to open native color picker"); // Debug log

			// Make it temporarily visible but still hidden
			input.style.cssText =
				"position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0.01; z-index: -1;";

			// Focus and click
			input.focus();
			input.click();
			console.log("Native color picker triggered"); // Debug log

			// Restore original style after a short delay
			setTimeout(() => {
				input.style.cssText = originalStyle;
			}, 100);
		} else {
			console.log("colorInputRef.current is null"); // Debug log
		}
	};

	const clearColor = () => {
		onChange("");
	};

	return (
		<div className={`space-y-2 ${className}`}>
			{label && (
				<Label htmlFor={id}>
					{label}
					{required && " *"}
				</Label>
			)}
			<div className="flex items-center gap-2">
				{/* Native color picker - visually hidden but functional */}
				<input
					ref={colorInputRef}
					type="color"
					value={value && value.startsWith("#") ? value : "#000000"}
					onChange={handleColorInputChange}
					className="absolute opacity-0 w-px h-px overflow-hidden"
					style={{ clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap" }}
				/>

				{/* Color preview button - large touch target for mobile */}
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => setShowPalette(!showPalette)}
					className="h-12 w-12 min-w-12 p-1 border-2 hover:border-purple-400 active:border-purple-500 transition-colors touch-manipulation"
					style={{
						backgroundColor: value || "transparent",
					}}
					title="Tap to open color picker"
				>
					{!value && <Pipette className="h-5 w-5 text-gray-400" />}
				</Button>

				{/* Text input for manual hex entry */}
				<Input
					id={id}
					type="text"
					value={getDisplayColor(value)}
					onChange={handleTextInputChange}
					placeholder={placeholder}
					className="flex-1 h-12 text-base"
				/>

				{/* Clear button */}
				{showClear && value && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={clearColor}
						className="h-12 w-12 min-w-12 text-gray-400 hover:text-red-500 touch-manipulation"
						title="Clear color"
					>
						<X className="h-5 w-5" />
					</Button>
				)}
			</div>

			{/* Color palette for mobile-friendly selection */}
			{showPalette && (
				<div className="p-3 bg-white border-2 border-gray-200 rounded-lg shadow-lg">
					<div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-3">
						{PRESET_COLORS.map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => {
									onChange(color);
									setShowPalette(false);
								}}
								className={`w-8 h-8 sm:w-7 sm:h-7 rounded-md border-2 transition-all touch-manipulation active:scale-90 ${
									value?.toUpperCase() === color
										? "border-purple-500 ring-2 ring-purple-300"
										: "border-gray-300 hover:border-gray-400"
								}`}
								style={{ backgroundColor: color }}
								title={color}
							>
								{value?.toUpperCase() === color && (
									<Check className="w-4 h-4 mx-auto text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
								)}
							</button>
						))}
					</div>
					<div className="flex gap-2 pt-2 border-t">
						<button
							type="button"
							onClick={openColorPicker}
							className="flex-1 h-10 px-3 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg border border-purple-200 transition-colors touch-manipulation flex items-center justify-center gap-2"
						>
							<Pipette className="w-4 h-4" />
							Custom Color
						</button>
						<button
							type="button"
							onClick={() => setShowPalette(false)}
							className="h-10 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation"
						>
							Close
						</button>
					</div>
				</div>
			)}

			{/* Color preview bar */}
			{value && !showPalette && (
				<div
					className="w-full h-8 rounded border-2 border-gray-200 shadow-inner"
					style={{ backgroundColor: value }}
					title={value}
				/>
			)}
		</div>
	);
}

// Compact version for inline use - optimized for mobile
export function ColorPickerCompact({
	value,
	onChange,
	placeholder = "#000000",
	showClear = false,
}: {
	value: string;
	onChange: (color: string) => void;
	placeholder?: string;
	showClear?: boolean;
}) {
	const colorInputRef = useRef<HTMLInputElement>(null);
	const [showPalette, setShowPalette] = useState(false);

	return (
		<div className="relative">
			<div className="flex items-center gap-2">
				<input
					ref={colorInputRef}
					type="color"
					value={value && value.startsWith("#") ? value : "#000000"}
					onChange={(e) => onChange(e.target.value)}
					className="absolute opacity-0 w-px h-px overflow-hidden"
					style={{ clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap" }}
				/>
				<button
					type="button"
					onClick={() => setShowPalette(!showPalette)}
					className="h-10 w-10 min-w-10 rounded border-2 border-gray-300 hover:border-purple-400 active:border-purple-500 transition-colors cursor-pointer touch-manipulation flex items-center justify-center"
					style={{ backgroundColor: value || "transparent" }}
					title="Tap to pick color"
				>
					{!value && <Pipette className="h-4 w-4 text-gray-400" />}
				</button>
				<Input
					type="text"
					value={value || ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-28 h-10 text-sm"
				/>
				{showClear && value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="h-10 w-10 min-w-10 rounded border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors touch-manipulation flex items-center justify-center"
						title="Clear"
					>
						<X className="h-4 w-4 text-gray-400 hover:text-red-500" />
					</button>
				)}
			</div>

			{/* Compact color palette */}
			{showPalette && (
				<div className="absolute z-50 mt-2 p-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl">
					<div className="grid grid-cols-6 gap-1 mb-2">
						{PRESET_COLORS.slice(0, 36).map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => {
									onChange(color);
									setShowPalette(false);
								}}
								className={`w-7 h-7 rounded border-2 transition-all touch-manipulation active:scale-90 ${
									value?.toUpperCase() === color
										? "border-purple-500"
										: "border-gray-200 hover:border-gray-400"
								}`}
								style={{ backgroundColor: color }}
								title={color}
							/>
						))}
					</div>
					<div className="flex gap-1 pt-1 border-t">
						<button
							type="button"
							onClick={() => {
								setShowPalette(false);
								// Robust mobile color picker trigger
								if (colorInputRef.current) {
									const input = colorInputRef.current;
									const originalStyle = input.style.cssText;

									// Make it temporarily visible but still hidden
									input.style.cssText =
										"position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0.01; z-index: -1;";

									// Focus and click
									input.focus();
									input.click();

									// Restore original style after a short delay
									setTimeout(() => {
										input.style.cssText = originalStyle;
									}, 100);
								}
							}}
							className="flex-1 h-8 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors touch-manipulation"
						>
							More...
						</button>
						<button
							type="button"
							onClick={() => setShowPalette(false)}
							className="h-8 px-2 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors touch-manipulation"
						>
							✕
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

// Full-width color picker for primary use - mobile optimized with palette
export function ColorPickerFull({
	label,
	value,
	onChange,
	placeholder = "Tap to select color",
	required = false,
	showClear = true,
}: {
	label: string;
	value: string;
	onChange: (color: string) => void;
	placeholder?: string;
	required?: boolean;
	showClear?: boolean;
}) {
	const [showPalette, setShowPalette] = useState(false);
	const [showCustomPicker, setShowCustomPicker] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close palette when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setShowPalette(false);
				setShowCustomPicker(false);
			}
		};

		if (showPalette || showCustomPicker) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showPalette, showCustomPicker]);

	return (
		<div className="space-y-2" ref={containerRef}>
			<Label className="text-sm font-medium">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</Label>
			<div className="flex items-center gap-3">
				{/* Large touch-friendly color picker button */}
				<button
					type="button"
					onClick={() => {
						setShowPalette(!showPalette);
						setShowCustomPicker(false);
					}}
					className="h-14 w-14 min-w-14 rounded-lg border-2 border-gray-300 hover:border-purple-400 active:border-purple-500 active:scale-95 transition-all cursor-pointer touch-manipulation flex items-center justify-center shadow-sm relative"
					style={{ backgroundColor: value || "#f3f4f6" }}
					title="Tap to pick color"
				>
					{!value && <Pipette className="h-6 w-6 text-gray-400" />}
					{value && (
						<div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow border">
							<ChevronDown className="h-3 w-3 text-gray-500" />
						</div>
					)}
				</button>

				{/* Hex input */}
				<div className="flex-1">
					<Input
						type="text"
						value={value || ""}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						className="h-14 text-base font-mono"
					/>
				</div>

				{/* Clear button */}
				{showClear && value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="h-14 w-14 min-w-14 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 active:bg-red-100 transition-all touch-manipulation flex items-center justify-center"
						title="Clear color"
					>
						<X className="h-5 w-5 text-gray-400 hover:text-red-500" />
					</button>
				)}
			</div>

			{/* Mobile-friendly color palette */}
			{showPalette && !showCustomPicker && (
				<div className="p-4 bg-white border-2 border-purple-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
					<p className="text-xs text-gray-500 mb-3 font-medium">
						Tap a color to select:
					</p>
					<div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-4">
						{PRESET_COLORS.map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => {
									onChange(color);
									setShowPalette(false);
								}}
								className={`aspect-square w-full min-h-[36px] rounded-lg border-2 transition-all touch-manipulation active:scale-90 ${
									value?.toUpperCase() === color
										? "border-purple-500 ring-2 ring-purple-300 ring-offset-1"
										: "border-gray-200 hover:border-gray-400 hover:scale-105"
								}`}
								style={{ backgroundColor: color }}
								title={color}
							>
								{value?.toUpperCase() === color && (
									<Check className="w-4 h-4 mx-auto text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
								)}
							</button>
						))}
					</div>
					<div className="flex gap-2 pt-3 border-t border-gray-200">
						<button
							type="button"
							onClick={() => {
								setShowPalette(false);
								setShowCustomPicker(true);
							}}
							className="flex-1 h-12 px-4 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-lg border border-purple-200 transition-colors touch-manipulation flex items-center justify-center gap-2"
						>
							<Pipette className="w-4 h-4" />
							Pick Custom Color
						</button>
						<button
							type="button"
							onClick={() => setShowPalette(false)}
							className="h-12 px-5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation"
						>
							Done
						</button>
					</div>
				</div>
			)}

			{/* Custom color picker - visible inline */}
			{showCustomPicker && (
				<div className="p-4 bg-white border-2 border-purple-200 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
					<p className="text-xs text-gray-500 mb-3 font-medium">
						Pick your custom color:
					</p>
					<div className="flex flex-col gap-4">
						{/* Large visible color input */}
						<input
							type="color"
							value={
								value && value.startsWith("#")
									? value
									: "#000000"
							}
							onChange={(e) => onChange(e.target.value)}
							className="w-full h-32 rounded-lg border-2 border-gray-300 cursor-pointer"
							style={{ padding: 0 }}
						/>
						{/* Current color preview */}
						<div className="flex items-center gap-3">
							<div
								className="w-12 h-12 rounded-lg border-2 border-gray-300"
								style={{ backgroundColor: value || "#000000" }}
							/>
							<div className="flex-1">
								<p className="text-sm text-gray-600">
									Selected:
								</p>
								<p className="font-mono text-lg font-medium">
									{value || "#000000"}
								</p>
							</div>
						</div>
					</div>
					<div className="flex gap-2 pt-3 mt-3 border-t border-gray-200">
						<button
							type="button"
							onClick={() => {
								setShowCustomPicker(false);
								setShowPalette(true);
							}}
							className="flex-1 h-12 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-manipulation"
						>
							← Back to Palette
						</button>
						<button
							type="button"
							onClick={() => setShowCustomPicker(false)}
							className="h-12 px-5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-colors touch-manipulation"
						>
							Done
						</button>
					</div>
				</div>
			)}

			{/* Color preview bar - only show when palette is closed */}
			{value && !showPalette && !showCustomPicker && (
				<div
					className="w-full h-10 rounded-lg border-2 border-gray-200 shadow-inner cursor-pointer hover:border-purple-300 transition-colors"
					style={{ backgroundColor: value }}
					title={`${value} - Tap to change`}
					onClick={() => setShowPalette(true)}
				/>
			)}
		</div>
	);
}
