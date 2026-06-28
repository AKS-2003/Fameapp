"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface LazyMediaLoaderProps {
	src: string;
	type: "image" | "video" | "audio";
	className?: string;
	alt?: string;
	controls?: boolean;
	autoPlay?: boolean;
	loop?: boolean;
	muted?: boolean;
}

export function LazyMediaLoader({
	src,
	type,
	className = "",
	alt = "",
	controls = true,
	autoPlay = false,
	loop = false,
	muted = false,
}: LazyMediaLoaderProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [inView, setInView] = useState(false);
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		if (elementRef.current) {
			observer.observe(elementRef.current);
		}

		return () => observer.disconnect();
	}, []);

	const handleLoad = () => {
		setLoading(false);
		setError(false);
	};

	const handleError = () => {
		setLoading(false);
		setError(true);
	};

	if (!inView) {
		return (
			<div
				ref={elementRef}
				className={`flex items-center justify-center bg-gray-100 ${className}`}
			>
				<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={`flex items-center justify-center bg-gray-100 text-gray-500 ${className}`}
			>
				Failed to load {type}
			</div>
		);
	}

	return (
		<div ref={elementRef} className="relative">
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
					<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
				</div>
			)}

			{type === "image" && (
				<img
					src={src}
					alt={alt}
					className={className}
					onLoad={handleLoad}
					onError={handleError}
					style={{ display: loading ? "none" : "block" }}
				/>
			)}

			{type === "video" && (
				<video
					src={src}
					className={className}
					controls={controls}
					autoPlay={autoPlay}
					loop={loop}
					muted={muted}
					onLoadedData={handleLoad}
					onError={handleError}
					style={{ display: loading ? "none" : "block" }}
				/>
			)}

			{type === "audio" && (
				<audio
					src={src}
					className={className}
					controls={controls}
					autoPlay={autoPlay}
					loop={loop}
					muted={muted}
					onLoadedData={handleLoad}
					onError={handleError}
					style={{ display: loading ? "none" : "block" }}
				/>
			)}
		</div>
	);
}
