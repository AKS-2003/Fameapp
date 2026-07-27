"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatMinutesToMMSS, parseMMSSToMinutes } from "@/lib/timing-utils";

interface MMSSInputProps {
	id?: string;
	/** Duration in minutes (fractional allowed) */
	minutes: number;
	onChange: (minutes: number) => void;
	className?: string;
	placeholder?: string;
}

/** Text input for a duration that displays/accepts "mm:ss" but stores minutes. */
export function MMSSInput({
	id,
	minutes,
	onChange,
	className,
	placeholder = "mm:ss",
}: MMSSInputProps) {
	const [text, setText] = useState(formatMinutesToMMSS(minutes));

	// Keep the text in sync when the underlying value changes elsewhere
	// (e.g. loading a different cue into the form), but not on every keystroke.
	useEffect(() => {
		setText(formatMinutesToMMSS(minutes));
	}, [minutes]);

	const commit = () => {
		const parsed = parseMMSSToMinutes(text);
		onChange(parsed);
		setText(formatMinutesToMMSS(parsed));
	};

	return (
		<Input
			id={id}
			type="text"
			inputMode="numeric"
			placeholder={placeholder}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					commit();
				}
			}}
			className={className}
		/>
	);
}
