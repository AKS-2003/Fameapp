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
import { MessageSquare, Send, User } from "lucide-react";
import { PersonalMessage } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

interface PersonalMessageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	eventName: string;
	artistId: string;
	artistName: string;
	senderId: string;
	senderName: string;
	onMessageSent?: () => void;
}

export function PersonalMessageDialog({
	open,
	onOpenChange,
	eventId,
	eventName,
	artistId,
	artistName,
	senderId,
	senderName,
	onMessageSent,
}: PersonalMessageDialogProps) {
	const { toast } = useToast();
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<PersonalMessage[]>([]);
	const [loadingMessages, setLoadingMessages] = useState(false);

	// Load existing personal messages when dialog opens
	useEffect(() => {
		if (open) {
			loadMessages();
		}
	}, [open, artistId]);

	const loadMessages = async () => {
		setLoadingMessages(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/personal-messages?artistId=${artistId}&viewer=stage_manager`,
			);
			const data = await response.json();

			if (data.success) {
				setMessages(data.data.messages || []);
			} else {
				setMessages([]);
			}
		} catch (error) {
			console.error("Failed to load personal messages:", error);
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
			const response = await fetch(
				`/api/events/${eventId}/personal-messages`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistId,
						artistName,
						message: message.trim(),
						senderId,
						senderName: `${senderName} (${eventName})`,
					}),
				},
			);

			const data = await response.json();

			if (data.success) {
				setMessage("");
				// Add new message to local state
				setMessages((prev) => [...prev, data.data.message]);
				onMessageSent?.();
				toast({
					title: "✅ Personal Message Sent",
					description: `Your message has been sent to ${artistName}.`,
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
			console.error("Failed to send personal message:", error);
			toast({
				title: "❌ Error",
				description: "Failed to send message. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MessageSquare className="h-5 w-5 text-blue-600" />
						Personal Message to {artistName}
					</DialogTitle>
					<DialogDescription>
						Send a private message to this artist only. This message
						will not be visible to other artists. The artist can
						reply privately.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 flex-1 flex flex-col">
					{/* Artist Info */}
					<div className="bg-blue-50 rounded-lg p-4 space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<User className="h-4 w-4 text-blue-500" />
							<span className="font-medium">Recipient:</span>
							<Badge
								variant="secondary"
								className="bg-blue-100 text-blue-700"
							>
								{artistName}
							</Badge>
						</div>
						<p className="text-xs text-blue-600">
							🔒 This is a private message - only {artistName}{" "}
							will see it.
						</p>
					</div>

					{/* Previous Personal Messages */}
					{messages.length > 0 && (
						<div className="flex flex-col">
							<h3 className="text-sm font-medium mb-2">
								Conversation
							</h3>
							<div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto">
								<div className="space-y-3">
									{messages.map((msg) => {
										const isFromArtist =
											msg.senderRole === "artist" ||
											msg.senderId === artistId;
										return (
											<div
												key={msg.id}
												className={`${
													isFromArtist
														? "bg-green-50 border-l-4 border-green-500 ml-8"
														: "bg-blue-50 border-l-4 border-blue-500"
												} p-3 rounded`}
											>
												<div className="flex items-center justify-between mb-1">
													<span
														className={`text-xs font-medium ${isFromArtist ? "text-green-900" : "text-blue-900"}`}
													>
														{isFromArtist
															? `${msg.senderName} (Artist)`
															: msg.senderName}
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
												<div className="mt-2 text-xs text-gray-500">
													{msg.read
														? "✓ Read"
														: "○ Unread"}
												</div>
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
							placeholder={`Type your personal message to ${artistName}...`}
							rows={6}
							className="resize-none"
							disabled={loading}
						/>
						<p className="text-xs text-gray-500">
							💡 Tip: The artist can reply privately to your
							messages. You will see their replies in this
							conversation.
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
							className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
									Send to {artistName}
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
