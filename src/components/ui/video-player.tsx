"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "./button";
import { Play, Eye, AlertCircle, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./dialog";
import { convertGcsUrl } from "@/lib/media-utils";

interface MediaFile {
	name: string;
	type: "image" | "video";
	url: string;
	file_path?: string;
	size?: number;
	uploadedAt?: string;
	contentType?: string;
}

interface VideoPlayerProps {
	file?: MediaFile;
	src?: string;
	onError?: (error: string) => void;
	className?: string;
}

interface ImageViewerProps {
	file?: MediaFile;
	src?: string;
	alt?: string;
	onError?: (error: string) => void;
	className?: string;
}

export function VideoPlayer({
	file,
	src,
	onError,
	className,
}: VideoPlayerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const videoRef = useRef<HTMLVideoElement>(null);

	const rawUrl = file?.url || src || "";
	const videoUrl = convertGcsUrl(rawUrl);
	const fileName = file?.name || rawUrl.split("/").pop() || "video";

	const handleVideoError = useCallback(() => {
		console.error("Video playback error for:", videoUrl);
		setHasError(true);
		setIsLoading(false);
	}, [videoUrl]);

	const handleCanPlay = useCallback(() => {
		setIsLoading(false);
		setHasError(false);
	}, []);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (open) {
			setHasError(false);
			setIsLoading(true);
		} else {
			// Pause video when closing dialog
			if (videoRef.current) {
				videoRef.current.pause();
			}
		}
	};

	const openInNewTab = () => {
		window.open(videoUrl, "_blank");
	};

	if (!videoUrl) {
		return (
			<div
				className={`bg-muted rounded-lg flex items-center justify-center p-4 ${className}`}
			>
				<div className="text-center text-muted-foreground">
					<AlertCircle className="h-8 w-8 mx-auto mb-2" />
					<p className="text-xs">No video available</p>
				</div>
			</div>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<div className={`relative group cursor-pointer ${className}`}>
					<div className="w-full h-full bg-muted rounded-lg flex items-center justify-center min-h-[80px]">
						<div className="text-center">
							<Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
							<p className="text-xs text-muted-foreground truncate max-w-[120px] mx-auto">
								{fileName}
							</p>
						</div>
					</div>
					<div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
						<Play className="h-6 w-6 text-white" />
					</div>
				</div>
			</DialogTrigger>
			<DialogContent className="max-w-4xl p-2 sm:p-6 bg-white dark:bg-gray-900">
				<DialogTitle className="sr-only">Video Player: {fileName}</DialogTitle>
				<DialogDescription className="sr-only">
					Watch the performance video for this show.
				</DialogDescription>
				<div className="space-y-2 sm:space-y-4 relative">
					{hasError ? (
						<div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
							<AlertCircle className="h-12 w-12 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium mb-1">
									Cannot play this video in the browser
								</p>
								<p className="text-xs text-muted-foreground mb-4">
									The format may not be supported. Try opening
									or downloading it instead.
								</p>
							</div>
							<div className="flex gap-3">
								<Button
									variant="outline"
									size="sm"
									onClick={openInNewTab}
								>
									<ExternalLink className="h-4 w-4 mr-2" />
									Open in new tab
								</Button>
								<a href={videoUrl} download={fileName}>
									<Button variant="default" size="sm">
										<Download className="h-4 w-4 mr-2" />
										Download
									</Button>
								</a>
							</div>
						</div>
					) : (
						<>
							<video
								ref={videoRef}
								key={videoUrl}
								controls
								autoPlay
								playsInline
								preload="auto"
								className="w-full max-h-[70vh] rounded-lg bg-black"
								src={videoUrl}
								onError={handleVideoError}
								onCanPlay={handleCanPlay}
								onLoadedData={handleCanPlay}
							/>
							{isLoading && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
									<div className="flex flex-col items-center gap-2">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
										<p className="text-white text-sm">
											Loading video...
										</p>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function ImageViewer({
	file,
	src,
	alt,
	onError,
	className,
}: ImageViewerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [hasError, setHasError] = useState(false);

	const imageUrl = convertGcsUrl(file?.url || src || "");
	const imageName = file?.name || alt || "image";

	const handleImageError = () => {
		setHasError(true);
	};

	if (!imageUrl) {
		return (
			<div
				className={`bg-muted rounded-lg flex items-center justify-center p-4 ${className}`}
			>
				<div className="text-center text-muted-foreground">
					<AlertCircle className="h-8 w-8 mx-auto mb-2" />
					<p className="text-xs">No image available</p>
				</div>
			</div>
		);
	}

	return hasError ? (
		<div
			className={`bg-muted rounded-lg flex items-center justify-center p-4 ${className}`}
		>
			<div className="text-center text-muted-foreground">
				<AlertCircle className="h-8 w-8 mx-auto mb-2" />
				<p className="text-xs">Cannot display image</p>
			</div>
		</div>
	) : (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<div className={`relative group cursor-pointer ${className}`}>
					<img
						src={imageUrl}
						alt={imageName}
						className="w-full h-full object-cover rounded-lg"
						onError={handleImageError}
					/>
					<div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
						<Eye className="h-6 w-6 text-white" />
					</div>
				</div>
			</DialogTrigger>
			<DialogContent className="max-w-4xl p-2 sm:p-6 bg-white dark:bg-gray-900">
				<DialogTitle className="sr-only">Image Viewer: {imageName}</DialogTitle>
				<DialogDescription className="sr-only">
					View the full-size image.
				</DialogDescription>
				<img
					src={imageUrl}
					alt={imageName}
					className="w-full max-h-[80vh] object-contain rounded-lg"
					onError={handleImageError}
				/>
			</DialogContent>
		</Dialog>
	);
}
