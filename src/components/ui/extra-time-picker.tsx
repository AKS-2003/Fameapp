"use client";

import { useState, useRef, useEffect } from "react";
import { Minus, Plus, Timer } from "lucide-react";
import { formatExtraTime } from "@/lib/timing-utils";

const PRESETS = [
	{ label: "None", seconds: 0 },
	{ label: "+30s", seconds: 30 },
	{ label: "+45s", seconds: 45 },
	{ label: "+1m", seconds: 60 },
	{ label: "+1m 30s", seconds: 90 },
	{ label: "+2m", seconds: 120 },
];

interface ExtraTimePickerProps {
	label?: string;
	value: number; // seconds
	onChange: (seconds: number) => void;
	/** Render as a small square icon button (to sit alongside Edit/Remove row actions) instead of a labeled pill */
	compact?: boolean;
	className?: string;
}

export function ExtraTimePicker({
	label = "Extra Time",
	value,
	onChange,
	compact = false,
	className,
}: ExtraTimePickerProps) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open]);

	return (
		<div className="relative" ref={containerRef}>
			{compact ? (
				<button
					type="button"
					onClick={() => setOpen(!open)}
					title={`${label}: ${formatExtraTime(value)}`}
					className={
						className ||
						"relative flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0 rounded-lg border p-0 text-xs font-normal transition-all border-gray-200 text-gray-500 hover:border-fuchsia-300 hover:text-fuchsia-600"
					}
				>
					<Timer className="h-3.5 w-3.5" />
					<span className="mt-0.5 text-[9px] font-medium">
						{value > 0 ? formatExtraTime(value) : "Extra"}
					</span>
					{value > 0 && (
						<span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-fuchsia-600" />
					)}
				</button>
			) : (
				<button
					type="button"
					onClick={() => setOpen(!open)}
					className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-fuchsia-300 hover:text-fuchsia-600 transition-colors"
				>
					{formatExtraTime(value)} {label}
				</button>
			)}

			{open && (
				<div className="absolute z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
					<p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
						{label}
					</p>

					<div className="grid grid-cols-3 gap-2 mb-4">
						{PRESETS.map((preset) => (
							<button
								key={preset.label}
								type="button"
								onClick={() => onChange(preset.seconds)}
								className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
									value === preset.seconds
										? "border-fuchsia-600 bg-fuchsia-600 text-white"
										: "border-gray-200 text-gray-700 hover:border-fuchsia-300"
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1">
						<button
							type="button"
							onClick={() => onChange(Math.max(0, value - 5))}
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
						>
							<Minus className="h-4 w-4" />
						</button>
						<div className="flex flex-1 items-center justify-center gap-1">
							<span className="text-base font-bold text-gray-900">
								{value}
							</span>
							<span className="text-xs text-gray-400">sec</span>
						</div>
						<button
							type="button"
							onClick={() => onChange(value + 5)}
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
						>
							<Plus className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
