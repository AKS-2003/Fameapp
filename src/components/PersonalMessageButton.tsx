"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { PersonalMessageDialog } from "./PersonalMessageDialog";

interface PersonalMessageButtonProps {
	eventId: string;
	eventName: string;
	artistId: string;
	artistName: string;
	senderId: string;
	senderName: string;
	initialUnreadCount?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function PersonalMessageButton({
	eventId,
	eventName,
	artistId,
	artistName,
	senderId,
	senderName,
	initialUnreadCount = 0,
	variant = "outline",
	size = "sm",
	className = "",
}: PersonalMessageButtonProps) {
	const [open, setOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
	const lastCountRef = useRef(initialUnreadCount);

	const loadUnreadCount = useCallback(async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/personal-messages?artistId=${artistId}&countOnly=true`,
			);
			const data = await response.json();

			if (data.success && data.data.messages) {
				// Count unread messages from artists (replies)
				const unread = data.data.messages.filter(
					(msg: any) =>
						msg.senderRole === "artist" && !msg.readByStageManager,
				).length;

				if (unread !== lastCountRef.current) {
					lastCountRef.current = unread;
					setUnreadCount(unread);
				}
			}
		} catch (error) {
			console.error(
				"Failed to load personal message unread count:",
				error,
			);
		}
	}, [eventId, artistId]);

	useEffect(() => {
		if (!eventId || !artistId) return;

		// Listen for new personal messages from artists
		const handleNewPersonalMessage = (event: CustomEvent) => {
			const data = event.detail;
			if (
				data.eventId === eventId &&
				data.artistId === artistId &&
				data.senderRole === "artist"
			) {
				setUnreadCount((prev) => {
					const newCount = prev + 1;
					lastCountRef.current = newCount;
					return newCount;
				});
			}
		};

		window.addEventListener(
			"new_personal_message",
			handleNewPersonalMessage as EventListener,
		);

		return () => {
			window.removeEventListener(
				"new_personal_message",
				handleNewPersonalMessage as EventListener,
			);
		};
	}, [eventId, artistId]);

	useEffect(() => {
		lastCountRef.current = initialUnreadCount;
		setUnreadCount(initialUnreadCount);
	}, [initialUnreadCount]);

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
				disabled={!senderId}
				title={
					!senderId
						? "Loading..."
						: `Send personal message to ${artistName}`
				}
			>
				<MessageSquare className="h-4 w-4" />
				{unreadCount > 0 && (
					<span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium animate-pulse">
						{unreadCount}
					</span>
				)}
			</Button>

			<PersonalMessageDialog
				open={open}
				onOpenChange={handleOpenChange}
				eventId={eventId}
				eventName={eventName}
				artistId={artistId}
				artistName={artistName}
				senderId={senderId}
				senderName={senderName}
			/>
		</>
	);
}
