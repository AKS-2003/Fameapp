"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallArtistButtonProps {
	eventId: string;
	artistId: string;
	artistName: string;
	callType: "rehearsal" | "performance";
	size?: "sm" | "default" | "icon";
	variant?: "outline" | "ghost" | "default" | "destructive" | "secondary";
	className?: string;
	showLabel?: boolean;
}

export function CallArtistButton({
	eventId,
	artistId,
	artistName,
	callType,
	size = "icon",
	variant = "ghost",
	className = "",
	showLabel = false,
}: CallArtistButtonProps) {
	const { toast } = useToast();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleCall = useCallback(async () => {
		if (loading) return;
		setLoading(true);

		// Emit directly via client-side wsManager for instant real-time delivery
		const wsManager =
			(window as any).rehearsalWsManager ||
			(window as any).performanceOrderWsManager ||
			(window as any).artistLiveBoardWsManager;

		if (wsManager) {
			try {
				wsManager.emit("artist_called", {
					eventId,
					artistId,
					artistName: artistName || "Artist",
					callType,
					timestamp: new Date().toISOString(),
				});
			} catch (err) {
				console.error("Failed to emit artist_called via WebSocket:", err);
			}
		}

		try {
			const res = await fetch(`/api/events/${eventId}/call-artist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ artistId, artistName, callType }),
			});
			const data = await res.json();
			if (data.success) {
				toast({
					title: `📞 Call Sent`,
					description: `${artistName} has been called for ${callType}.`,
					variant: "success",
				});
			} else {
				// Only show error if WebSocket didn't handle it
				if (!wsManager) {
					toast({
						title: "Call Failed",
						description: data.error?.message || "Something went wrong",
						variant: "destructive",
					});
				}
			}
		} catch {
			if (!wsManager) {
				toast({
					title: "Call Failed",
					description: "Network error. Please try again.",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
			setConfirmOpen(false);
		}
	}, [eventId, artistId, artistName, callType, loading, toast]);

	return (
		<>
			<Button
				size={size}
				variant={variant}
				className={`text-orange-500 hover:text-orange-600 hover:bg-orange-50 ${className}`}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setConfirmOpen(true);
				}}
				title={`Call ${artistName} for ${callType}`}
			>
				<Phone className="h-4 w-4" />
				{showLabel && (
					<span className="text-[9px] mt-0.5 font-medium">Call</span>
				)}
			</Button>

			<Dialog
				open={confirmOpen}
				onOpenChange={(open) => {
					if (!loading) setConfirmOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Call {artistName}?</DialogTitle>
						<DialogDescription>
							This will send a{" "}
							<span className="font-semibold">
								{callType === "rehearsal"
									? "Rehearsal"
									: "Performance"}
							</span>{" "}
							call with alarm to {artistName}. The artist will see
							a popup with a continuous alarm sound until they
							dismiss it.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2 sm:gap-0">
						<Button
							variant="outline"
							disabled={loading}
							onClick={() => setConfirmOpen(false)}
						>
							Cancel
						</Button>
						<Button
							disabled={loading}
							onClick={handleCall}
							className="bg-orange-500 hover:bg-orange-600 text-white"
						>
							{loading ? "Calling..." : "📞 Call Now"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
