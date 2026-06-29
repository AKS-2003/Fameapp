import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, style, ...props }, ref) => {
		const cls = className || "";
		const isDark =
			cls.includes("text-white") ||
			cls.includes("bg-white/") ||
			cls.includes("input-modern") ||
			cls.includes("input-dark");

		return (
			<input
				suppressHydrationWarning
				type={type}
				className={cn(
					"flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
					isDark
						? "border-white/10 bg-white/5 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/20"
						: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
					className,
				)}
				style={isDark ? { colorScheme: "dark", background: 'rgba(255,255,255,0.05)', ...style } : style}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
