"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Calendar, Users } from "lucide-react";
import { ChatMessage, ChatConversation } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

interface ChatDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	eventName: string;
	showDate: string;
	artistCount: number;
	senderId: string;
	senderName: string;
	onMessageSent?: () => void;
}

export function ChatDialog({
	open,
	onOpenChange,
	eventId,
	eventName,
	showDate,
	artistCount,
	senderId,
	senderName,
	onMessageSent,
}: ChatDialogProps) {
	const { toast } = useToast();
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [loadingMessages, setLoadingMessages] = useState(false);

	// Load existing messages when dialog opens
	useEffect(() => {
		if (open) {
			loadMessages();
		}
	}, [open, showDate]);

	const loadMessages = async () => {
		setLoadingMessages(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/chat?showDate=${encodeURIComponent(
					showDate,
				)}`,
			);
			const data = await response.json();

			if (data.success && data.data.conversations.length > 0) {
				setMessages(data.data.conversations[0].messages || []);
			} else {
				setMessages([]);
			}
		} catch (error) {
			console.error("Failed to load messages:", error);
		} finally {
			setLoadingMessages(false);
		}
	};

	const handleSendMessage = async () => {
		if (!message.trim()) return;

		// Validate required fields
		if (!senderId || !senderName) {
			toast({
				title: "❌ Error",
				description:
					"Unable to identify sender. Please refresh the page and try again.",
				variant: "destructive",
			});
			return;
		}

		setLoading(true);
		try {
			const response = await fetch(`/api/events/${eventId}/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					showDate,
					message: message.trim(),
					senderId,
					senderName,
					senderRole: "stage_manager",
				}),
			});

			const data = await response.json();

			if (data.success) {
				setMessage("");
				// Add new message to local state
				setMessages((prev) => [...prev, data.data.message]);
				onMessageSent?.();
				toast({
					title: "✅ Message Sent",
					description: `Your message has been sent to ${artistCount} artist${
						artistCount === 1 ? "" : "s"
					}.`,
				});
				// Auto-close dialog after successful send
				setTimeout(() => onOpenChange(false), 600);
			} else {
				toast({
					title: "❌ Failed to Send",
					description: data.error || "Failed to send message",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Failed to send message:", error);
			toast({
				title: "❌ Error",
				description: "Failed to send message. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const formattedDate = new Date(showDate).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MessageCircle className="h-5 w-5 text-purple-600" />
						Send Message to Artists
					</DialogTitle>
					<DialogDescription>
						Send a message to all artists performing on this date.
						Artists will receive an email notification and can view
						the message in their dashboard.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 flex-1 flex flex-col">
					{/* Event Info */}
					<div className="bg-gray-50 rounded-lg p-4 space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<Calendar className="h-4 w-4 text-gray-500" />
							<span className="font-medium">
								Performance Date:
							</span>
							<span className="text-gray-700">
								{formattedDate}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4 text-gray-500" />
							<span className="font-medium">Recipients:</span>
							<Badge variant="secondary">
								{artistCount}{" "}
								{artistCount === 1 ? "Artist" : "Artists"}
							</Badge>
						</div>
					</div>

					{/* Previous Messages */}
					{messages.length > 0 && (
						<div className="flex flex-col">
							<h3 className="text-sm font-medium mb-2">
								Conversation
							</h3>
							<div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto">
								<div className="space-y-3">
									{messages.map((msg) => {
										const isFromArtist =
											msg.senderRole === "artist";
										return (
											<div
												key={msg.id}
												className={`${
													isFromArtist
														? "bg-green-50 border-l-4 border-green-500"
														: "bg-blue-50 border-l-4 border-blue-500"
												} p-3 rounded`}
											>
												<div className="flex items-center justify-between mb-1">
													<span
														className={`text-xs font-medium ${
															isFromArtist
																? "text-green-900"
																: "text-blue-900"
														}`}
													>
														{msg.senderName}
														{isFromArtist &&
															" (Artist)"}
													</span>
													<span className="text-xs text-gray-500">
														{new Date(
															msg.timestamp,
														).toLocaleString()}
													</span>
												</div>
												<p className="text-sm text-gray-700 whitespace-pre-wrap">
													{msg.message}
												</p>
												{!isFromArtist && (
													<div className="mt-2 text-xs text-gray-500">
														Read by{" "}
														{msg.readBy.length} /{" "}
														{artistCount} artists
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* Message Input */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							Your Message
						</label>
						<Textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Type your message to artists here..."
							rows={6}
							className="resize-none"
							disabled={loading}
						/>
						<p className="text-xs text-gray-500">
							💡 Tip: Artists can now reply to your messages.
							Their replies will appear in this conversation.
						</p>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-4 border-t">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSendMessage}
							disabled={loading || !message.trim()}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
						>
							{loading ? (
								<>
									<span className="animate-spin mr-2">
										⏳
									</span>
									Sending...
								</>
							) : (
								<>
									<Send className="h-4 w-4 mr-2" />
									Send to {artistCount}{" "}
									{artistCount === 1 ? "Artist" : "Artists"}
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
