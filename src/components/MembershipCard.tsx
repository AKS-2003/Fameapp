"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QrCode, CheckCircle, Music, Theater } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MembershipCardProps {
	artistName: string;
	artistId: string;
	eventId: string;
	memberSince?: string;
	profileImage?: string;
	isFameLinkArtist?: boolean;
	rehearsalCheckedIn?: boolean;
	performanceCheckedIn?: boolean;
}

export function MembershipCard({
	artistName,
	artistId,
	eventId,
	memberSince,
	profileImage,
	isFameLinkArtist = true,
	rehearsalCheckedIn = false,
	performanceCheckedIn = false,
}: MembershipCardProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	const year = new Date().getFullYear();
	const shortId = artistId.slice(-5).padStart(5, "0");
	const membershipId = `FL-${year}-${shortId}`;

	const formattedSince = memberSince
		? new Date(memberSince).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: `${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

	const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

	const rehearsalQrUrl = `${baseUrl}/api/events/${eventId}/check-in/scan?artistId=${artistId}&eventId=${eventId}&type=rehearsal`;
	const performanceQrUrl = `${baseUrl}/api/events/${eventId}/check-in/scan?artistId=${artistId}&eventId=${eventId}&type=performance`;

	const brandLabel = isFameLinkArtist ? "FameLink" : "Fame";
	const logoSrc = "/fame-logo.png";

	return (
		<>
			{/* Compact badge button - saves space */}
			<Button
				variant="outline"
				className="gap-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 h-10 px-4"
				onClick={() => setDialogOpen(true)}
			>
				<div className="flex items-center gap-2">
					<img
						src={logoSrc}
						alt={brandLabel}
						className="h-5 w-5 object-contain"
					/>
					<span className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
						Membership Card
					</span>
				</div>
				<div className="flex items-center gap-1.5 ml-1">
					{rehearsalCheckedIn ? (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-green-400 text-green-600 bg-green-50"
						>
							<CheckCircle className="h-2.5 w-2.5 mr-0.5" />R
						</Badge>
					) : (
						<div
							className="h-3 w-3 rounded-full border-2 border-gray-300"
							title="Rehearsal not checked in"
						/>
					)}
					{performanceCheckedIn ? (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-green-400 text-green-600 bg-green-50"
						>
							<CheckCircle className="h-2.5 w-2.5 mr-0.5" />P
						</Badge>
					) : (
						<div
							className="h-3 w-3 rounded-full border-2 border-gray-300"
							title="Performance not checked in"
						/>
					)}
				</div>
				<QrCode className="h-4 w-4 text-purple-500 ml-1" />
			</Button>

			{/* Full Membership Card Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md bg-[#0a0618] border-purple-500/30 text-white p-0 overflow-hidden">
					<DialogHeader className="sr-only">
						<DialogTitle>Membership Card</DialogTitle>
					</DialogHeader>

					{/* Card header */}
					<div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 p-5 text-white">
						<div className="flex items-center justify-between mb-3">
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
								{brandLabel} Artist
							</p>
							<img
								src={logoSrc}
								alt={brandLabel}
								className="h-8 w-8 object-contain drop-shadow-lg"
							/>
						</div>
						<div className="flex items-center gap-3 mb-3">
							<Avatar className="h-14 w-14 border-2 border-white/30">
								<AvatarImage
									src={profileImage}
									alt={artistName}
								/>
								<AvatarFallback className="bg-white/20 text-white text-lg">
									{artistName?.charAt(0)?.toUpperCase() ||
										"A"}
								</AvatarFallback>
							</Avatar>
							<div>
								<h3 className="text-lg font-bold">
									{artistName}
								</h3>
								<p className="text-xs text-white/70">
									{membershipId}
								</p>
							</div>
						</div>
						<div className="flex items-center justify-between text-xs">
							<div>
								<p className="text-[9px] uppercase tracking-wider text-white/60">
									Status
								</p>
								<p className="font-semibold">Active Member</p>
							</div>
							<div className="text-right">
								<p className="text-[9px] uppercase tracking-wider text-white/60">
									Since
								</p>
								<p className="font-semibold">
									{formattedSince}
								</p>
							</div>
						</div>
					</div>

					{/* QR Code Tabs - 2 separate QR codes */}
					<div className="px-5 py-4">
						<p className="text-center text-[10px] uppercase tracking-[0.2em] text-purple-300/70 mb-3">
							Show QR to Stage Manager
						</p>
						<Tabs defaultValue="rehearsal" className="w-full">
							<TabsList className="grid w-full grid-cols-2 bg-purple-900/50 mb-3">
								<TabsTrigger
									value="rehearsal"
									className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-purple-300 text-xs gap-1.5"
								>
									<Music className="h-3.5 w-3.5" />
									Rehearsal
									{rehearsalCheckedIn && (
										<CheckCircle className="h-3 w-3 text-green-400" />
									)}
								</TabsTrigger>
								<TabsTrigger
									value="performance"
									className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300 text-xs gap-1.5"
								>
									<Theater className="h-3.5 w-3.5" />
									Performance
									{performanceCheckedIn && (
										<CheckCircle className="h-3 w-3 text-green-400" />
									)}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="rehearsal" className="mt-0">
								<div className="flex flex-col items-center gap-2">
									{rehearsalCheckedIn ? (
										<div className="flex flex-col items-center gap-2 py-4">
											<CheckCircle className="h-12 w-12 text-green-400" />
											<p className="text-green-400 font-semibold text-sm">
												Rehearsal Checked In
											</p>
										</div>
									) : (
										<div className="p-3 bg-white rounded-xl">
											<QRCodeSVG
												value={rehearsalQrUrl}
												size={180}
												level="M"
												includeMargin={false}
											/>
										</div>
									)}
									<p className="text-[10px] text-purple-400">
										{rehearsalCheckedIn
											? "You are checked in for rehearsal"
											: "Scan for rehearsal check-in"}
									</p>
								</div>
							</TabsContent>

							<TabsContent value="performance" className="mt-0">
								<div className="flex flex-col items-center gap-2">
									{performanceCheckedIn ? (
										<div className="flex flex-col items-center gap-2 py-4">
											<CheckCircle className="h-12 w-12 text-green-400" />
											<p className="text-green-400 font-semibold text-sm">
												Performance Checked In
											</p>
										</div>
									) : (
										<div className="p-3 bg-white rounded-xl">
											<QRCodeSVG
												value={performanceQrUrl}
												size={180}
												level="M"
												includeMargin={false}
											/>
										</div>
									)}
									<p className="text-[10px] text-purple-400">
										{performanceCheckedIn
											? "You are checked in for performance"
											: "Scan for performance check-in"}
									</p>
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* Check-in status footer */}
					<div className="flex justify-center gap-6 px-5 pb-4">
						<div className="flex items-center gap-1.5">
							{rehearsalCheckedIn ? (
								<CheckCircle className="h-4 w-4 text-green-400" />
							) : (
								<div className="h-4 w-4 rounded-full border-2 border-purple-400/50" />
							)}
							<span className="text-xs text-purple-200">
								Rehearsal
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							{performanceCheckedIn ? (
								<CheckCircle className="h-4 w-4 text-green-400" />
							) : (
								<div className="h-4 w-4 rounded-full border-2 border-purple-400/50" />
							)}
							<span className="text-xs text-purple-200">
								Performance
							</span>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
