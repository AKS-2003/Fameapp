"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatDialog } from "./ChatDialog";

interface ChatButtonProps {
	eventId: string;
	eventName: string;
	showDate: string;
	artistCount: number;
	senderId: string;
	senderName: string;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function ChatButton({
	eventId,
	eventName,
	showDate,
	artistCount,
	senderId,
	senderName,
	variant = "outline",
	size = "default",
	className = "",
}: ChatButtonProps) {
	const [open, setOpen] = useState(false);
	const [messageCount, setMessageCount] = useState(0);
	const lastSeenCountRef = useRef(0);
	const totalCountRef = useRef(0);

	const loadMessageCount = useCallback(async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/chat?showDate=${encodeURIComponent(
					showDate,
				)}`,
			);
			const data = await response.json();

			if (data.success && data.data.conversations.length > 0) {
				const total = data.data.conversations[0].messages?.length || 0;
				totalCountRef.current = total;
				// Unread = total messages minus what we've already seen
				const unread = Math.max(0, total - lastSeenCountRef.current);
				setMessageCount(unread);
			}
		} catch (error) {
			console.error("Failed to load message count:", error);
		}
	}, [eventId, showDate]);

	useEffect(() => {
		if (!eventId || !showDate) return;

		// Initial load
		loadMessageCount();

		// Listen for new chat messages via window event
		const handleNewMessage = (event: CustomEvent) => {
			const data = event.detail;
			if (data.eventId === eventId && data.showDate === showDate) {
				totalCountRef.current += 1;
				// Only show unread if dialog is closed
				if (!open) {
					setMessageCount((prev) => prev + 1);
				}
			}
		};

		window.addEventListener(
			"new_chat_message",
			handleNewMessage as EventListener,
		);

		return () => {
			window.removeEventListener(
				"new_chat_message",
				handleNewMessage as EventListener,
			);
		};
	}, [eventId, showDate, open, loadMessageCount]);

	// When dialog opens, mark all as read; when it closes, update the seen count
	useEffect(() => {
		if (open) {
			// Mark all current messages as seen
			setMessageCount(0);
			lastSeenCountRef.current = totalCountRef.current;
		}
	}, [open]);

	const handleMessageSent = () => {
		totalCountRef.current += 1;
		lastSeenCountRef.current = totalCountRef.current;
		// Don't increment unread for own messages
	};

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setOpen(true)}
				className={`relative ${className}`}
				disabled={artistCount === 0 || !senderId}
				title={!senderId ? "Loading..." : undefined}
			>
				<MessageCircle className="h-4 w-4 mr-2" />
				Message Artists
				{messageCount > 0 && (
					<span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
						{messageCount}
					</span>
				)}
			</Button>

			<ChatDialog
				open={open}
				onOpenChange={setOpen}
				eventId={eventId}
				eventName={eventName}
				showDate={showDate}
				artistCount={artistCount}
				senderId={senderId}
				senderName={senderName}
				onMessageSent={handleMessageSent}
			/>
		</>
	);
}
