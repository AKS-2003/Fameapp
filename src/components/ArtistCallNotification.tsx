"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, X, Volume2 } from "lucide-react";

interface ArtistCallNotificationProps {
	/** The artist ID this component listens for */
	artistId: string;
	/** The event ID for WebSocket filtering */
	eventId: string;
}

interface CallData {
	artistId: string;
	artistName: string;
	callType: "rehearsal" | "performance";
	timestamp: string;
}

/**
 * Audio unlock strategy:
 * Browsers block autoplay until the user has interacted with the page.
 * We silently "unlock" the audio context on the very first user gesture
 * (click, touch, scroll, keydown) so that when a call arrives later,
 * the alarm can play automatically without requiring another tap.
 */
let audioUnlocked = false;
let audioContext: AudioContext | null = null;

function unlockAudio() {
	if (audioUnlocked) return;
	try {
		// Create or resume an AudioContext — this is the most reliable unlock method
		if (!audioContext) {
			audioContext = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
		}
		if (audioContext.state === "suspended") {
			audioContext.resume();
		}
		// Also play a silent HTML audio to unlock that path too
		const silent = new Audio(
			"data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
		);
		silent.volume = 0;
		silent
			.play()
			.then(() => {
				silent.pause();
				audioUnlocked = true;
			})
			.catch(() => {});
	} catch {}
}

// Install unlock listeners once globally
if (typeof window !== "undefined") {
	const events = ["click", "touchstart", "touchend", "keydown", "scroll"];
	const onFirstInteraction = () => {
		unlockAudio();
		// Keep listeners for a bit — some browsers need multiple interactions
		setTimeout(() => {
			events.forEach((e) =>
				window.removeEventListener(e, onFirstInteraction, true),
			);
		}, 5000);
	};
	events.forEach((e) =>
		window.addEventListener(e, onFirstInteraction, {
			capture: true,
			passive: true,
		}),
	);
}

export function ArtistCallNotification({
	artistId,
	eventId,
}: ArtistCallNotificationProps) {
	const [callData, setCallData] = useState<CallData | null>(null);
	const [audioBlocked, setAudioBlocked] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const vibrateIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const [flash, setFlash] = useState(false);

	// Request notification permission on mount
	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			"Notification" in window &&
			Notification.permission === "default"
		) {
			Notification.requestPermission().catch(() => {});
		}
	}, []);

	// Listen for call events via window custom events
	useEffect(() => {
		const handleCall = (e: CustomEvent<CallData & { eventId: string }>) => {
			console.log("[ArtistCallNotification] Received artist_called custom event:", e.detail);
			const detailArtistId = e.detail?.artistId || "";
			const currentArtistId = artistId || "";
			const detailEventId = e.detail?.eventId || "";
			const currentEventId = eventId || "";

			if (
				detailArtistId.toLowerCase() === currentArtistId.toLowerCase() &&
				detailEventId.toLowerCase() === currentEventId.toLowerCase()
			) {
				console.log("[ArtistCallNotification] MATCH! Opening notification dialog.", e.detail);
				setCallData(e.detail);
			} else {
				console.log("[ArtistCallNotification] Mismatch. Expected:", { artistId: currentArtistId, eventId: currentEventId }, "Got:", { artistId: detailArtistId, eventId: detailEventId });
			}
		};

		window.addEventListener("artist_called" as any, handleCall);
		return () => {
			window.removeEventListener("artist_called" as any, handleCall);
		};
	}, [artistId, eventId]);

	// Try to play alarm audio — attempts multiple strategies
	const tryPlayAlarm = useCallback(() => {
		try {
			// Stop any existing audio
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			}

			// Resume AudioContext if it was suspended
			if (audioContext && audioContext.state === "suspended") {
				audioContext.resume().catch(() => {});
			}

			const audio = new Audio("/alarm.mp3");
			audio.loop = true;
			audio.volume = 1.0;

			const playPromise = audio.play();
			if (playPromise) {
				playPromise
					.then(() => {
						audioRef.current = audio;
						setAudioBlocked(false);
					})
					.catch(() => {
						// Autoplay blocked — try one more time via AudioContext
						if (audioContext && audioContext.state === "running") {
							// Use AudioContext to play (sometimes works when HTMLAudio doesn't)
							fetch("/alarm.mp3")
								.then((r) => r.arrayBuffer())
								.then((buf) =>
									audioContext!.decodeAudioData(buf),
								)
								.then((decoded) => {
									const source =
										audioContext!.createBufferSource();
									source.buffer = decoded;
									source.loop = true;
									source.connect(audioContext!.destination);
									source.start(0);
									// Store a reference so we can stop it
									(audioRef as any).current = {
										pause: () => source.stop(),
										currentTime: 0,
										_webAudio: true,
									};
									setAudioBlocked(false);
								})
								.catch(() => {
									setAudioBlocked(true);
								});
						} else {
							setAudioBlocked(true);
						}
					});
			}
			audioRef.current = audio;
		} catch {
			setAudioBlocked(true);
		}
	}, []);

	// Start alarm, flash, vibration, and system notification when call is active
	useEffect(() => {
		if (!callData) return;

		// 1. Try to play alarm sound immediately
		tryPlayAlarm();

		// 2. If autoplay was blocked, retry after a short delay (sometimes helps)
		const retryTimeout = setTimeout(() => {
			if (!audioRef.current || audioRef.current.paused) {
				tryPlayAlarm();
			}
		}, 300);

		// 3. Flash effect
		flashIntervalRef.current = setInterval(() => {
			setFlash((prev) => !prev);
		}, 500);

		// 4. Vibrate pattern
		if (typeof navigator !== "undefined" && navigator.vibrate) {
			const vibratePattern = () => {
				try {
					navigator.vibrate([500, 300, 500, 300, 500]);
				} catch {}
			};
			vibratePattern();
			vibrateIntervalRef.current = setInterval(vibratePattern, 3000);
		}

		// 5. System notification
		if (
			typeof window !== "undefined" &&
			"Notification" in window &&
			Notification.permission === "granted"
		) {
			try {
				const title =
					callData.callType === "rehearsal"
						? "🎵 Rehearsal Call"
						: "🎭 Stage Call";
				const body =
					callData.callType === "rehearsal"
						? "You are being called for Rehearsal! Please proceed immediately."
						: "You are being called to the Stage! Please proceed immediately.";
				const notification = new Notification(title, {
					body,
					icon: "/fame-logo.png",
					tag: "artist-call",
					requireInteraction: true,
					vibrate: [500, 300, 500, 300, 500],
				} as any);
				notification.onclick = () => {
					window.focus();
					notification.close();
				};
			} catch {}
		}

		return () => {
			clearTimeout(retryTimeout);
			if (audioRef.current) {
				try {
					audioRef.current.pause();
					audioRef.current.currentTime = 0;
				} catch {}
				audioRef.current = null;
			}
			if (flashIntervalRef.current) {
				clearInterval(flashIntervalRef.current);
				flashIntervalRef.current = null;
			}
			if (vibrateIntervalRef.current) {
				clearInterval(vibrateIntervalRef.current);
				vibrateIntervalRef.current = null;
			}
			if (typeof navigator !== "undefined" && navigator.vibrate) {
				try {
					navigator.vibrate(0);
				} catch {}
			}
			setFlash(false);
			setAudioBlocked(false);
		};
	}, [callData, tryPlayAlarm]);

	const dismissCall = useCallback(() => {
		if (audioRef.current) {
			try {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			} catch {}
			audioRef.current = null;
		}
		if (flashIntervalRef.current) {
			clearInterval(flashIntervalRef.current);
			flashIntervalRef.current = null;
		}
		if (vibrateIntervalRef.current) {
			clearInterval(vibrateIntervalRef.current);
			vibrateIntervalRef.current = null;
		}
		if (typeof navigator !== "undefined" && navigator.vibrate) {
			try {
				navigator.vibrate(0);
			} catch {}
		}
		setFlash(false);
		setAudioBlocked(false);

		window.dispatchEvent(
			new CustomEvent("artist_call_dismiss", {
				detail: { eventId, artistId },
			}),
		);

		setCallData(null);
	}, [eventId, artistId]);

	const handleManualPlay = useCallback(() => {
		unlockAudio();
		tryPlayAlarm();
	}, [tryPlayAlarm]);

	if (!callData) return null;

	return (
		<Dialog
			open={!!callData}
			onOpenChange={(open) => !open && dismissCall()}
		>
			<DialogContent
				className={`sm:max-w-sm border-2 transition-colors duration-300 ${
					flash
						? "bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-500"
						: "bg-white border-orange-400 dark:bg-gray-900 dark:border-orange-400"
				}`}
			>
				<DialogHeader>
					<DialogTitle className="text-center flex flex-col items-center gap-3">
						<div
							className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
								flash ? "bg-red-500" : "bg-orange-500"
							}`}
						>
							<Phone className="h-8 w-8 text-white animate-pulse" />
						</div>
						<span className="text-xl text-gray-900 dark:text-white">
							{callData.callType === "rehearsal"
								? "🎵 Rehearsal Call"
								: "🎭 Stage Call"}
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="text-center space-y-3 py-4">
					<p className="text-lg font-semibold text-gray-900 dark:text-white">
						{callData.callType === "rehearsal"
							? "You are being called for Rehearsal!"
							: "You are being called to the Stage!"}
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-200">
						{callData.callType === "rehearsal"
							? `This is a Rehearsal call with alarm to ${callData.artistName || "you"}. You will see this popup with a continuous alarm sound until you dismiss it.`
							: "The Stage Manager is calling you. Please proceed immediately."}
					</p>
					{audioBlocked && (
						<Button
							onClick={handleManualPlay}
							variant="outline"
							className="mt-2 border-orange-400 text-orange-600 hover:bg-orange-50"
						>
							<Volume2 className="h-4 w-4 mr-2" />
							Tap to enable alarm sound
						</Button>
					)}
				</div>

				<Button
					onClick={dismissCall}
					className="w-full h-12 text-base"
					variant="destructive"
				>
					<X className="h-5 w-5 mr-2" />
					Dismiss
				</Button>
			</DialogContent>
		</Dialog>
	);
}
