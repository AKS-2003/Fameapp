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
import { MessageCircle, Calendar, Send, Lock, User } from "lucide-react";
import { ChatMessage, PersonalMessage } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";

interface ArtistChatViewProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	artistId: string;
	showDate?: string;
}

interface CombinedMessage {
	id: string;
	type: "broadcast" | "personal";
	message: string;
	senderName: string;
	senderRole: "stage_manager" | "artist";
	timestamp: string;
	showDate?: string;
}

export function ArtistChatView({
	open,
	onOpenChange,
	eventId,
	artistId,
	showDate,
}: ArtistChatViewProps) {
	const { toast } = useToast();
	const [messages, setMessages] = useState<CombinedMessage[]>([]);
	const [loading, setLoading] = useState(false);
	const [replyMessage, setReplyMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [artistName, setArtistName] = useState("");

	useEffect(() => {
		if (open) {
			loadMessages();
			loadArtistName();
		}
	}, [open, artistId, showDate]);

	const loadArtistName = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data?.artist) {
					setArtistName(
						data.data.artist.artistName ||
							data.data.artist.artist_name ||
							"Artist",
					);
				}
			}
		} catch (error) {
			console.error("Failed to load artist name:", error);
		}
	};

	const loadMessages = async () => {
		setLoading(true);
		try {
			// Load broadcast messages
			let broadcastUrl = `/api/events/${eventId}/chat?artistId=${artistId}`;
			if (showDate) {
				broadcastUrl += `&showDate=${encodeURIComponent(showDate)}`;
			}

			const broadcastResponse = await fetch(broadcastUrl);
			const broadcastData = await broadcastResponse.json();

			let broadcastMessages: CombinedMessage[] = [];
			if (
				broadcastData.success &&
				broadcastData.data.conversations.length > 0
			) {
				broadcastMessages = broadcastData.data.conversations.flatMap(
					(conv: any) =>
						(conv.messages || []).map((msg: ChatMessage) => ({
							id: msg.id,
							type: "broadcast" as const,
							message: msg.message,
							senderName: msg.senderName,
							senderRole: msg.senderRole,
							timestamp: msg.timestamp,
							showDate: msg.showDate,
						})),
				);
			}

			// Load personal messages
			const personalResponse = await fetch(
				`/api/events/${eventId}/personal-messages?artistId=${artistId}`,
			);
			const personalData = await personalResponse.json();

			let personalMessages: CombinedMessage[] = [];
			if (personalData.success && personalData.data.messages) {
				personalMessages = personalData.data.messages.map(
					(msg: PersonalMessage) => ({
						id: msg.id,
						type: "personal" as const,
						message: msg.message,
						senderName: msg.senderName,
						senderRole:
							msg.senderRole || ("stage_manager" as const),
						timestamp: msg.timestamp,
					}),
				);
			}

			// Combine and sort by timestamp
			const allMessages = [
				...broadcastMessages,
				...personalMessages,
			].sort(
				(a, b) =>
					new Date(a.timestamp).getTime() -
					new Date(b.timestamp).getTime(),
			);
			setMessages(allMessages);
		} catch (error) {
			console.error("Failed to load messages:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSendReply = async () => {
		if (!replyMessage.trim()) {
			toast({
				title: "Cannot Send",
				description: "Please enter a message",
				variant: "destructive",
			});
			return;
		}

		setSending(true);
		try {
			// Send as a private message to the stage manager
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
						message: replyMessage.trim(),
						senderId: artistId,
						senderName: artistName,
						senderRole: "artist",
					}),
				},
			);

			const data = await response.json();

			if (data.success) {
				setReplyMessage("");
				// Add new message to local state
				setMessages((prev) => [
					...prev,
					{
						id: data.data.message.id,
						type: "personal" as const,
						message: data.data.message.message,
						senderName: artistName,
						senderRole: "artist" as const,
						timestamp: data.data.message.timestamp,
					},
				]);
				toast({
					title: "✅ Private Message Sent",
					description:
						"Your private message has been sent to the stage manager.",
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
			setSending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MessageCircle className="h-5 w-5 text-purple-600" />
						Messages with Stage Manager
					</DialogTitle>
					<DialogDescription>
						View and reply to messages from the stage manager
						regarding your performance.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 flex flex-col space-y-4">
					{/* Messages */}
					<div className="border rounded-lg p-4 h-[300px] overflow-y-auto">
						{loading ? (
							<div className="flex items-center justify-center h-full">
								<div className="text-center">
									<div className="animate-spin text-4xl mb-2">
										⏳
									</div>
									<p className="text-sm text-gray-500">
										Loading messages...
									</p>
								</div>
							</div>
						) : messages.length === 0 ? (
							<div className="flex items-center justify-center h-full">
								<div className="text-center">
									<MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
									<p className="text-sm text-gray-500">
										No messages yet
									</p>
									<p className="text-xs text-gray-400 mt-1">
										Messages from the stage manager will
										appear here
									</p>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{messages.map((msg) => {
									const isPersonal = msg.type === "personal";
									const isFromArtist =
										msg.senderRole === "artist";
									const formattedDate = msg.showDate
										? new Date(
												msg.showDate,
											).toLocaleDateString("en-US", {
												weekday: "short",
												month: "short",
												day: "numeric",
											})
										: null;

									return (
										<div
											key={msg.id}
											className={`${
												isFromArtist
													? "bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 ml-8"
													: isPersonal
														? "bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500"
														: "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500"
											} p-4 rounded-lg`}
										>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													{isFromArtist ? (
														<Badge
															variant="secondary"
															className="bg-blue-100 text-blue-700 flex items-center gap-1"
														>
															<User className="h-3 w-3" />
															You
														</Badge>
													) : (
														<Badge
															variant="secondary"
															className={
																isPersonal
																	? "bg-indigo-100 text-indigo-700"
																	: "bg-purple-100 text-purple-700"
															}
														>
															{msg.senderName}
														</Badge>
													)}
													{isPersonal && (
														<Badge
															variant="outline"
															className="bg-indigo-50 text-indigo-600 border-indigo-200 flex items-center gap-1"
														>
															<Lock className="h-3 w-3" />
															Personal Message
														</Badge>
													)}
													{!isPersonal &&
														formattedDate && (
															<div className="flex items-center gap-1 text-xs text-gray-500">
																<Calendar className="h-3 w-3" />
																{formattedDate}
															</div>
														)}
												</div>
												<span className="text-xs text-gray-500">
													{new Date(
														msg.timestamp,
													).toLocaleString()}
												</span>
											</div>
											{isPersonal && !isFromArtist && (
												<p className="text-xs text-indigo-600 mb-2 flex items-center gap-1">
													<Lock className="h-3 w-3" />
													This message is only sent to
													you by the stage manager
												</p>
											)}
											{isPersonal && isFromArtist && (
												<p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
													<Lock className="h-3 w-3" />
													Your private message to the
													stage manager
												</p>
											)}
											<p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
												{msg.message}
											</p>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Reply Section */}
					<div className="space-y-2 border-t pt-4">
						<label className="text-sm font-medium flex items-center gap-2">
							<Lock className="h-4 w-4 text-indigo-500" />
							Send a Private Reply to Stage Manager
						</label>
						<Textarea
							value={replyMessage}
							onChange={(e) => setReplyMessage(e.target.value)}
							placeholder="Type your private message to the stage manager..."
							rows={3}
							className="resize-none"
							disabled={sending}
						/>
						<div className="flex justify-between items-center">
							<p className="text-xs text-gray-500">
								🔒 Your message will be sent privately to the
								stage manager only
							</p>
							<Button
								onClick={handleSendReply}
								disabled={sending || !replyMessage.trim()}
								className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
							>
								{sending ? (
									<>
										<span className="animate-spin mr-2">
											⏳
										</span>
										Sending...
									</>
								) : (
									<>
										<Send className="h-4 w-4 mr-2" />
										Send Private Reply
									</>
								)}
							</Button>
						</div>
					</div>

					{/* Footer */}
					<div className="flex justify-end pt-4 border-t">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
