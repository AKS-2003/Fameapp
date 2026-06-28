"use client";

import { useState } from "react";
import { ChatButton } from "@/components/ChatButton";
import { ArtistChatButton } from "@/components/ArtistChatButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestChatPage() {
	// Test data
	const [stageManagerId] = useState("test-sm-123");
	const [stageManagerName] = useState("John Doe");
	const [artistId] = useState("test-artist-456");
	const [eventId] = useState("event-1761237916544-g88brdp4w");
	const [eventName] = useState("December New Event");
	const [showDate] = useState("2025-10-27");

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Header */}
				<div className="text-center space-y-4">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
						Chat System Test Page
					</h1>
					<p className="text-gray-400">
						Test the chat buttons before integrating them into your
						pages
					</p>
				</div>

				{/* Stage Manager Section */}
				<Card className="bg-gray-900/60 border-gray-700/50">
					<CardHeader>
						<CardTitle className="text-white">
							Stage Manager Chat Button
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-gray-400 text-sm">
							This is what stage managers will see on the artists
							page. Click the button to send messages to artists.
						</p>

						<div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/30">
							<div>
								<h3 className="text-white font-semibold">
									Day 1
								</h3>
								<p className="text-gray-400 text-sm">
									Monday, October 27, 2025
								</p>
								<p className="text-gray-500 text-xs">
									3 artists assigned
								</p>
							</div>

							{/* Chat Button */}
							<ChatButton
								eventId={eventId}
								eventName={eventName}
								showDate={showDate}
								artistCount={3}
								senderId={stageManagerId}
								senderName={stageManagerName}
								variant="outline"
							/>
						</div>

						<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
							<p className="text-blue-300 text-sm">
								💡 <strong>Tip:</strong> The button will be
								disabled if no artists are assigned to the date.
								Try changing artistCount to 0 to see this.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Artist Section */}
				<Card className="bg-gray-900/60 border-gray-700/50">
					<CardHeader>
						<CardTitle className="text-white">
							Artist Chat Button
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-gray-400 text-sm">
							This is what artists will see in their dashboard.
							Click the button to view messages from the stage
							manager.
						</p>

						<div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/30">
							<div>
								<h3 className="text-white font-semibold">
									Artist Dashboard
								</h3>
								<p className="text-gray-400 text-sm">
									Welcome back, Flora!
								</p>
							</div>

							{/* Artist Chat Button */}
							<ArtistChatButton
								eventId={eventId}
								artistId={artistId}
								showDate={showDate}
								variant="outline"
							/>
						</div>

						<div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
							<p className="text-purple-300 text-sm">
								💡 <strong>Tip:</strong> The badge will show
								unread message count and pulse when there are
								new messages.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Instructions */}
				<Card className="bg-gray-900/60 border-gray-700/50">
					<CardHeader>
						<CardTitle className="text-white">
							How to Test
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3 text-gray-300">
							<div className="flex items-start gap-3">
								<span className="text-purple-400 font-bold">
									1.
								</span>
								<p>
									Click the "Message Artists" button above to
									send a test message
								</p>
							</div>
							<div className="flex items-start gap-3">
								<span className="text-purple-400 font-bold">
									2.
								</span>
								<p>
									Type a message and click "Send to 3 Artists"
								</p>
							</div>
							<div className="flex items-start gap-3">
								<span className="text-purple-400 font-bold">
									3.
								</span>
								<p>
									Click the "Messages" button in the Artist
									section to view the message
								</p>
							</div>
							<div className="flex items-start gap-3">
								<span className="text-purple-400 font-bold">
									4.
								</span>
								<p>
									Check your email inbox (if you have artists
									with real email addresses)
								</p>
							</div>
						</div>

						<div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
							<p className="text-green-300 text-sm">
								✅ <strong>Ready to integrate?</strong> See{" "}
								<code className="bg-gray-800 px-2 py-1 rounded">
									ADD_CHAT_BUTTONS_HERE.md
								</code>{" "}
								for copy-paste code snippets!
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Test Data Info */}
				<Card className="bg-gray-900/60 border-gray-700/50">
					<CardHeader>
						<CardTitle className="text-white text-sm">
							Test Data Being Used
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-gray-500">Event ID:</p>
								<p className="text-gray-300 font-mono">
									{eventId}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Event Name:</p>
								<p className="text-gray-300">{eventName}</p>
							</div>
							<div>
								<p className="text-gray-500">Show Date:</p>
								<p className="text-gray-300">{showDate}</p>
							</div>
							<div>
								<p className="text-gray-500">Artist Count:</p>
								<p className="text-gray-300">3</p>
							</div>
							<div>
								<p className="text-gray-500">
									Stage Manager ID:
								</p>
								<p className="text-gray-300 font-mono">
									{stageManagerId}
								</p>
							</div>
							<div>
								<p className="text-gray-500">Artist ID:</p>
								<p className="text-gray-300 font-mono">
									{artistId}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
