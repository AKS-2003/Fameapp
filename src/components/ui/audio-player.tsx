"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./button";
import {
	Play,
	Pause,
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	Timer,
	Music,
} from "lucide-react";
import { convertGcsUrl } from "@/lib/media-utils";

interface AudioPlayerProps {
	track?: {
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
		file_path?: string;
	};
	src?: string;
	onError?: (error: string) => void;
}

export function AudioPlayer({ track, src, onError }: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [hasError, setHasError] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isBuffering, setIsBuffering] = useState(false);
	const [showCountdown, setShowCountdown] = useState(true);
	const [isDragging, setIsDragging] = useState(false);
	const [dragTime, setDragTime] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	const audioRef = useRef<HTMLAudioElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const playPromiseRef = useRef<Promise<void> | null>(null);
	// Keep a live ref to currentTime so skip callbacks don't go stale
	const currentTimeRef = useRef(0);

	const audioUrl = convertGcsUrl(track?.file_url || src || "");
	const songTitle = track?.song_title || "Audio File";

	// Get the time to display (either drag time or current time)
	const displayTime = isDragging ? dragTime : currentTime;

	/** Safe time formatter — returns "--:--" for NaN / Infinity */
	const formatTimeDisplay = (seconds: number): string => {
		if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "--:--";
		const s = Math.floor(seconds);
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	};

	// Seek to specific time — does NOT require a pre-known finite duration
	const seekTo = useCallback(
		(time: number) => {
			const audio = audioRef.current;
			if (!audio || hasError) return;
			// Clamp: if audio.duration is finite, clamp to it; otherwise just don't go negative
			const maxTime = isFinite(audio.duration) ? audio.duration : Infinity;
			const clampedTime = Math.max(0, Math.min(time, maxTime));
			audio.currentTime = clampedTime;
			setCurrentTime(clampedTime);
			currentTimeRef.current = clampedTime;
		},
		[hasError]
	);

	// Skip backward 5 seconds — reads from live ref to avoid stale closure
	const skipBackward = useCallback(() => {
		seekTo(currentTimeRef.current - 5);
	}, [seekTo]);

	// Skip forward 5 seconds
	const skipForward = useCallback(() => {
		seekTo(currentTimeRef.current + 5);
	}, [seekTo]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !audioUrl) return;

		if (playPromiseRef.current) {
			playPromiseRef.current
				.then(() => {
					if (audio && !audio.paused) {
						audio.pause();
					}
				})
				.catch(() => {});
		}

		setHasError(false);
		setIsPlaying(false);
		setIsLoading(true);
		setIsBuffering(false);
		setCurrentTime(0);
		currentTimeRef.current = 0;
		setDuration(0);

		const updateTime = () => {
			if (!isDragging) {
				setCurrentTime(audio.currentTime);
				currentTimeRef.current = audio.currentTime;
			}
		};
		const updateDuration = () => {
			if (
				audio.duration &&
				isFinite(audio.duration) &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				setDuration(audio.duration);
				setIsLoading(false);
			}
		};
		const handleEnd = () => {
			setIsPlaying(false);
			setCurrentTime(0);
			currentTimeRef.current = 0;
			if (audio) {
				audio.currentTime = 0;
			}
		};
		const handleError = (e: Event) => {
			const target = e.target as HTMLAudioElement;
			const errorDetails = target.error
				? `Code: ${target.error.code}, Message: ${target.error.message}`
				: "Unknown error";
			setHasError(true);
			setIsPlaying(false);
			setIsLoading(false);
			setIsBuffering(false);
			if (onError) {
				onError(`Failed to load audio file: ${errorDetails}`);
			}
		};
		const handleCanPlay = () => {
			if (
				audio.duration &&
				isFinite(audio.duration) &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				setDuration(audio.duration);
			}
			setIsLoading(false);
			setIsBuffering(false);
		};
		const handleLoadedMetadata = () => {
			if (
				audio.duration &&
				isFinite(audio.duration) &&
				!isNaN(audio.duration) &&
				audio.duration > 0
			) {
				setDuration(audio.duration);
				setIsLoading(false);
			}
		};
		const handleWaiting = () => setIsBuffering(true);
		const handlePlaying = () => {
			setIsBuffering(false);
			setIsLoading(false);
			setIsPlaying(true);
		};
		const handlePause = () => {
			if (audio && audio.currentTime < audio.duration) {
				setIsPlaying(false);
			}
		};

		audio.addEventListener("timeupdate", updateTime);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("durationchange", updateDuration);
		audio.addEventListener("canplay", handleCanPlay);
		audio.addEventListener("ended", handleEnd);
		audio.addEventListener("error", handleError);
		audio.addEventListener("waiting", handleWaiting);
		audio.addEventListener("playing", handlePlaying);
		audio.addEventListener("pause", handlePause);

		audio.volume = 1.0;
		audio.load();

		const fallbackTimer = setTimeout(() => {
			setIsLoading(false);
		}, 3000);

		return () => {
			clearTimeout(fallbackTimer);
			if (audio && !audio.paused) {
				audio.pause();
			}
			audio.removeEventListener("timeupdate", updateTime);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("durationchange", updateDuration);
			audio.removeEventListener("canplay", handleCanPlay);
			audio.removeEventListener("ended", handleEnd);
			audio.removeEventListener("error", handleError);
			audio.removeEventListener("waiting", handleWaiting);
			audio.removeEventListener("playing", handlePlaying);
			audio.removeEventListener("pause", handlePause);
		};
	}, [audioUrl, onError]);

	// Keyboard controls
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isFocused) return;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					skipBackward();
					break;
				case "ArrowRight":
					e.preventDefault();
					skipForward();
					break;
				case " ":
					e.preventDefault();
					togglePlay();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isFocused, skipBackward, skipForward]);

	const togglePlay = async () => {
		const audio = audioRef.current;
		if (!audio || hasError) return;

		try {
			if (isPlaying) {
				if (playPromiseRef.current) {
					await playPromiseRef.current.catch(() => {});
				}
				audio.pause();
				setIsPlaying(false);
				playPromiseRef.current = null;
			} else {
				if (playPromiseRef.current) {
					await playPromiseRef.current.catch(() => {});
				}
				audio.volume = 1.0;
				setIsBuffering(true);
				playPromiseRef.current = audio.play();
				await playPromiseRef.current;
			}
		} catch (error: any) {
			if (error.name !== "AbortError") {
				if (error.name === "NotSupportedError") {
					setHasError(true);
				}
			}
			setIsPlaying(false);
			setIsBuffering(false);
			playPromiseRef.current = null;
		}
	};

	// Calculate time from mouse/touch position
	const getTimeFromPosition = (clientX: number): number => {
		if (!sliderRef.current) return 0;
		const audioDuration =
			audioRef.current && isFinite(audioRef.current.duration)
				? audioRef.current.duration
				: duration;
		if (!audioDuration) return 0;

		const rect = sliderRef.current.getBoundingClientRect();
		const x = clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		return percentage * audioDuration;
	};

	// Mouse handlers
	const handleMouseDown = (e: React.MouseEvent) => {
		const audioDuration =
			audioRef.current && isFinite(audioRef.current.duration)
				? audioRef.current.duration
				: duration;
		if (!audioDuration) return;
		e.preventDefault();
		e.stopPropagation();

		const time = getTimeFromPosition(e.clientX);
		setIsDragging(true);
		setDragTime(time);
	};

	// Touch handlers
	const handleTouchStart = (e: React.TouchEvent) => {
		const audioDuration =
			audioRef.current && isFinite(audioRef.current.duration)
				? audioRef.current.duration
				: duration;
		if (!audioDuration) return;
		e.preventDefault();
		e.stopPropagation();

		const time = getTimeFromPosition(e.touches[0].clientX);
		setIsDragging(true);
		setDragTime(time);
	};

	// Global event listeners for drag
	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			const time = getTimeFromPosition(e.clientX);
			setDragTime(time);
		};

		const handleTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			const time = getTimeFromPosition(e.touches[0].clientX);
			setDragTime(time);
		};

		const handleMouseUp = (e: MouseEvent) => {
			e.preventDefault();
			const time = getTimeFromPosition(e.clientX);
			seekTo(time);
			setIsDragging(false);
		};

		const handleTouchEnd = () => {
			seekTo(dragTime);
			setIsDragging(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});
		document.addEventListener("touchend", handleTouchEnd);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("touchmove", handleTouchMove);
			document.removeEventListener("touchend", handleTouchEnd);
		};
	}, [isDragging, dragTime, duration, seekTo]);

	// Click on slider track (not drag)
	const handleSliderClick = (e: React.MouseEvent) => {
		const audioDuration =
			audioRef.current && isFinite(audioRef.current.duration)
				? audioRef.current.duration
				: duration;
		if (!audioDuration) return;
		const time = getTimeFromPosition(e.clientX);
		seekTo(time);
	};

	// Use actual audio duration first, then state, then track prop
	const effectiveDuration =
		(audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0
			? audioRef.current.duration
			: null) ??
		(isFinite(duration) && duration > 0 ? duration : null) ??
		(isFinite(track?.duration ?? NaN) && (track?.duration ?? 0) > 0 ? track!.duration : 0);

	const remainingTime = isFinite(effectiveDuration) && effectiveDuration > 0
		? Math.max(0, effectiveDuration - displayTime)
		: 0;

	const progressPercentage =
		isFinite(effectiveDuration) && effectiveDuration > 0
			? (displayTime / effectiveDuration) * 100
			: 0;

	// ── No audio URL — clear "no audio" state ────────────────────────────────
	if (!audioUrl) {
		return (
			<div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700 flex items-center gap-3 text-gray-400">
				<Music className="h-5 w-5 text-gray-500 flex-shrink-0" />
				<span className="text-sm font-medium">No audio file available</span>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 space-y-4 shadow-lg border-2 transition-colors ${
				isFocused ? "border-purple-500" : "border-gray-700"
			}`}
			tabIndex={0}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
			onClick={() => containerRef.current?.focus()}
		>
			<audio
				ref={audioRef}
				src={audioUrl}
				preload="auto"
				crossOrigin="anonymous"
				playsInline
			>
				Your browser does not support the audio element.
			</audio>

			{/* Song Title */}
			<div className="text-center">
				<h3 className="font-semibold text-white truncate">{songTitle}</h3>
				{track?.tempo && (
					<p className="text-xs text-gray-400">Tempo: {track.tempo}</p>
				)}
			</div>

			{/* Progress Slider */}
			<div className="space-y-2">
				{/* Slider Track */}
				<div
					ref={sliderRef}
					className="relative w-full h-6 cursor-pointer select-none"
					onClick={handleSliderClick}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}
					style={{ touchAction: "none" }}
				>
					{/* Background track */}
					<div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-gray-700 rounded-full">
						{/* Progress bar */}
						<div
							className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-none"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>

					{/* Slider thumb */}
					<div
						className={`absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow-lg border-3 border-purple-500 pointer-events-none ${
							isDragging ? "scale-125" : "hover:scale-110"
						} transition-transform`}
						style={{
							left: `${progressPercentage}%`,
							marginLeft: "-14px",
						}}
					/>
				</div>

				{/* Time Display */}
				<div className="flex items-center justify-between text-sm">
					<span className="text-white font-mono text-base min-w-[50px]">
						{formatTimeDisplay(displayTime)}
					</span>

					{/* Toggle Countdown/Count-up Button */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							setShowCountdown(!showCountdown);
						}}
						className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
					>
						{showCountdown ? (
							<>
								<Timer className="h-4 w-4 text-orange-400" />
								<span className="text-orange-400 font-mono text-base font-bold">
									-{formatTimeDisplay(remainingTime)}
								</span>
							</>
						) : (
							<>
								<Clock className="h-4 w-4 text-green-400" />
								<span className="text-green-400 font-mono text-base font-bold">
									{formatTimeDisplay(displayTime)}
								</span>
							</>
						)}
					</button>

					<span className="text-gray-400 font-mono text-base min-w-[50px] text-right">
						{isFinite(effectiveDuration) && effectiveDuration > 0
							? formatTimeDisplay(effectiveDuration)
							: isLoading
							? "..."
							: "--:--"}
					</span>
				</div>
			</div>

			{/* Playback Controls */}
			<div className="flex items-center justify-center gap-2">
				{/* Skip Backward -5s */}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						skipBackward();
					}}
					disabled={hasError}
					className="h-12 w-16 p-0 rounded-xl text-white hover:bg-gray-700 flex items-center justify-center gap-1"
					title="Skip back 5 seconds (← Arrow)"
				>
					<ChevronLeft className="h-6 w-6" />
					<span className="text-lg font-bold">5</span>
				</Button>

				{/* Play/Pause */}
				<Button
					type="button"
					variant="default"
					size="lg"
					onClick={(e) => {
						e.stopPropagation();
						togglePlay();
					}}
					disabled={hasError || isLoading}
					className="h-16 w-16 p-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg mx-4"
				>
					{isBuffering ? (
						<div className="h-7 w-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
					) : isPlaying ? (
						<Pause className="h-7 w-7 text-white" />
					) : (
						<Play className="h-7 w-7 text-white ml-1" />
					)}
				</Button>

				{/* Skip Forward +5s */}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						skipForward();
					}}
					disabled={hasError}
					className="h-12 w-16 p-0 rounded-xl text-white hover:bg-gray-700 flex items-center justify-center gap-1"
					title="Skip forward 5 seconds (→ Arrow)"
				>
					<span className="text-lg font-bold">5</span>
					<ChevronRight className="h-6 w-6" />
				</Button>
			</div>

			{/* Keyboard hint */}
			{isFocused && (
				<p className="text-center text-xs text-gray-500">
					Use ← → arrow keys to skip 5s, Space to play/pause
				</p>
			)}

			{/* Large Countdown Display (when playing) */}
			{isPlaying && showCountdown && (
				<div className="text-center py-3 bg-gray-800/50 rounded-lg border border-gray-700">
					<p className="text-xs text-gray-400 mb-1">Time Remaining</p>
					<p className="text-4xl font-bold font-mono text-orange-400">
						{isFinite(remainingTime) && remainingTime > 0
							? `-${formatTimeDisplay(remainingTime)}`
							: formatTimeDisplay(displayTime)}
					</p>
				</div>
			)}

			{/* Error State */}
			{hasError && (
				<div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-lg p-2">
					<AlertCircle className="h-4 w-4" />
					<span>Failed to load audio file</span>
				</div>
			)}

			{/* Notes */}
			{track?.notes && (
				<p className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2">
					{track.notes}
				</p>
			)}
		</div>
	);
}
