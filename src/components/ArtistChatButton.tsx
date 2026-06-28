"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ArtistChatView } from "./ArtistChatView";

interface ArtistChatButtonProps {
	eventId: string;
	artistId: string;
	showDate?: string;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function ArtistChatButton({
	eventId,
	artistId,
	showDate,
	variant = "outline",
	size = "default",
	className = "",
}: ArtistChatButtonProps) {
	const [open, setOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [wsConnected, setWsConnected] = useState(false);
	const lastCountRef = useRef(0);

	const loadUnreadCount = useCallback(async () => {
		try {
			// Load broadcast messages unread count
			let broadcastUrl = `/api/events/${eventId}/chat`;
			if (showDate) {
				broadcastUrl += `?showDate=${encodeURIComponent(showDate)}`;
			}

			const broadcastResponse = await fetch(broadcastUrl);
			const broadcastData = await broadcastResponse.json();

			let broadcastUnread = 0;
			if (
				broadcastData.success &&
				broadcastData.data.conversations.length > 0
			) {
				broadcastData.data.conversations.forEach((conv: any) => {
					if (conv.artistIds?.includes(artistId)) {
						conv.messages?.forEach((msg: any) => {
							if (!msg.readBy?.includes(artistId)) {
								broadcastUnread++;
							}
						});
					}
				});
			}

			// Load personal messages unread count
			const personalResponse = await fetch(
				`/api/events/${eventId}/personal-messages?artistId=${artistId}&countOnly=true`,
			);
			const personalData = await personalResponse.json();

			let personalUnread = 0;
			if (personalData.success && personalData.data.messages) {
				personalData.data.messages.forEach((msg: any) => {
					if (msg.senderRole !== "artist" && !msg.read) {
						personalUnread++;
					}
				});
			}

			const totalUnread = broadcastUnread + personalUnread;

			// Only update if count changed (to avoid unnecessary re-renders)
			if (totalUnread !== lastCountRef.current) {
				console.log(
					`ArtistChatButton: Unread count changed from ${lastCountRef.current} to ${totalUnread} (broadcast: ${broadcastUnread}, personal: ${personalUnread})`,
				);
				lastCountRef.current = totalUnread;
				setUnreadCount(totalUnread);
			}
		} catch (error) {
			console.error("Failed to load unread count:", error);
		}
	}, [eventId, artistId, showDate]);

	useEffect(() => {
		if (!eventId) return;

		// Initial load
		loadUnreadCount();

		// Listen for new chat messages via window event (dispatched by WebSocket manager)
		const handleNewMessage = (event: CustomEvent) => {
			const data = event.detail;
			console.log("ArtistChatButton received new_chat_message:", data);
			if (
				data.eventId === eventId &&
				data.artistIds?.includes(artistId)
			) {
				// Increment unread count immediately for better UX
				setUnreadCount((prev) => {
					const newCount = prev + 1;
					lastCountRef.current = newCount;
					return newCount;
				});
			}
		};

		// Listen for new personal messages via window event
		const handleNewPersonalMessage = (event: CustomEvent) => {
			const data = event.detail;
			console.log(
				"ArtistChatButton received new_personal_message:",
				data,
			);
			if (data.eventId === eventId && data.artistId === artistId) {
				// Increment unread count immediately for better UX
				setUnreadCount((prev) => {
					const newCount = prev + 1;
					lastCountRef.current = newCount;
					return newCount;
				});
			}
		};

		// Listen for WebSocket connection status
		const handleWsStatus = (event: CustomEvent) => {
			const connected = event.detail?.connected;
			console.log(
				"ArtistChatButton: WebSocket status changed:",
				connected,
			);
			setWsConnected(connected);
		};

		window.addEventListener(
			"new_chat_message",
			handleNewMessage as EventListener,
		);
		window.addEventListener(
			"new_personal_message",
			handleNewPersonalMessage as EventListener,
		);
		window.addEventListener(
			"websocket_status",
			handleWsStatus as EventListener,
		);

		// Aggressive polling as fallback - every 5 seconds when dialog is closed
		// This ensures we catch messages even if WebSocket fails
		const pollInterval = setInterval(() => {
			if (!open) {
				loadUnreadCount();
			}
		}, 5000); // Poll every 5 seconds

		return () => {
			window.removeEventListener(
				"new_chat_message",
				handleNewMessage as EventListener,
			);
			window.removeEventListener(
				"new_personal_message",
				handleNewPersonalMessage as EventListener,
			);
			window.removeEventListener(
				"websocket_status",
				handleWsStatus as EventListener,
			);
			clearInterval(pollInterval);
		};
	}, [eventId, artistId, showDate, open, loadUnreadCount]);

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			// Reload count after closing (messages should be marked as read)
			setTimeout(() => {
				loadUnreadCount();
			}, 500);
		}
	};

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setOpen(true)}
				className={`relative ${className}`}
			>
				<MessageCircle className="h-4 w-4 mr-2" />
				Messages
				{unreadCount > 0 && (
					<span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium animate-pulse">
						{unreadCount}
					</span>
				)}
			</Button>

			<ArtistChatView
				open={open}
				onOpenChange={handleOpenChange}
				eventId={eventId}
				artistId={artistId}
				showDate={showDate}
			/>
		</>
	);
}
