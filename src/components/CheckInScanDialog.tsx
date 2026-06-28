"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Music, Theater, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckInScanDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	artistId: string;
	artistName: string;
	rehearsalCheckedIn?: boolean;
	performanceCheckedIn?: boolean;
	onCheckInComplete?: (type: "rehearsal" | "performance", checkedIn: boolean) => void;
}

export function CheckInScanDialog({
	open,
	onOpenChange,
	eventId,
	artistId,
	artistName,
	rehearsalCheckedIn = false,
	performanceCheckedIn = false,
	onCheckInComplete,
}: CheckInScanDialogProps) {
	const { toast } = useToast();
	const [confirmState, setConfirmState] = useState<{
		type: "rehearsal" | "performance";
		action: "checkin" | "uncheck";
	} | null>(null);
	const [loading, setLoading] = useState(false);

	const handleAction = async (state: NonNullable<typeof confirmState>) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/events/${eventId}/check-in`, {
				method: state.action === "checkin" ? "POST" : "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId,
					type: state.type,
					checkedInBy: "stage_manager",
				}),
			});
			const data = await res.json();
			if (data.success) {
				toast({
					title: state.action === "checkin" 
						? `✅ ${state.type === "rehearsal" ? "Rehearsal" : "Performance"} Check-In`
						: `🔄 ${state.type === "rehearsal" ? "Rehearsal" : "Performance"} Unchecked`,
					description: state.action === "checkin" 
						? `${artistName} checked in for ${state.type} successfully.`
						: `${artistName} was unchecked from ${state.type}.`,
					variant: "success",
				});
				onCheckInComplete?.(state.type, state.action === "checkin");
			} else {
				toast({
					title: state.action === "checkin" ? "Check-In Failed" : "Uncheck Failed",
					description: data.error?.message || "Something went wrong",
					variant: "destructive",
				});
			}
		} catch {
			toast({
				title: state.action === "checkin" ? "Check-In Failed" : "Uncheck Failed",
				description: "Network error. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			setConfirmState(null);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Check In — {artistName}</DialogTitle>
						<DialogDescription>
							Select check-in type for this artist.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-2">
						{/* Rehearsal Check-In */}
						<Button
							className="w-full justify-start gap-3 h-14"
							variant={rehearsalCheckedIn ? "secondary" : "outline"}
							disabled={loading}
							onClick={() => setConfirmState({
								type: "rehearsal", 
								action: rehearsalCheckedIn ? "uncheck" : "checkin"
							})}
						>
							{rehearsalCheckedIn ? (
								<CheckCircle className="h-5 w-5 text-green-500" />
							) : (
								<Music className="h-5 w-5 text-blue-500" />
							)}
							<div className="text-left flex-1 border-r pr-2 border-border/50">
								<div className="font-medium">Rehearsal</div>
								<div className="text-xs text-muted-foreground">
									{rehearsalCheckedIn
										? "Already checked in ✓"
										: "Check in for rehearsal"}
								</div>
							</div>
							{rehearsalCheckedIn && (
								<div className="flex flex-col items-center justify-center pl-1 text-muted-foreground hover:text-destructive transition-colors">
									<XCircle className="h-4 w-4" />
									<span className="text-[10px] mt-0.5 opacity-80">Undo</span>
								</div>
							)}
						</Button>

						{/* Performance Check-In */}
						<Button
							className="w-full justify-start gap-3 h-14"
							variant={performanceCheckedIn ? "secondary" : "outline"}
							disabled={loading}
							onClick={() => setConfirmState({
								type: "performance",
								action: performanceCheckedIn ? "uncheck" : "checkin"
							})}
						>
							{performanceCheckedIn ? (
								<CheckCircle className="h-5 w-5 text-green-500" />
							) : (
								<Theater className="h-5 w-5 text-purple-500" />
							)}
							<div className="text-left flex-1 border-r pr-2 border-border/50">
								<div className="font-medium">
									Performance Order
								</div>
								<div className="text-xs text-muted-foreground">
									{performanceCheckedIn
										? "Already checked in ✓"
										: "Check in for performance"}
								</div>
							</div>
							{performanceCheckedIn && (
								<div className="flex flex-col items-center justify-center pl-1 text-muted-foreground hover:text-destructive transition-colors">
									<XCircle className="h-4 w-4" />
									<span className="text-[10px] mt-0.5 opacity-80">Undo</span>
								</div>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Confirmation Dialog */}
			<AlertDialog
				open={!!confirmState}
				onOpenChange={() => setConfirmState(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmState?.action === "uncheck" ? "Confirm Uncheck" : "Confirm Check-In"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmState?.action === "uncheck" ? "Are you sure you want to uncheck " : "Check in "}
							<span className="font-semibold">{artistName}</span>{" "}
							from{" "}
							<span className="font-semibold">
								{confirmState?.type === "rehearsal"
									? "Rehearsal"
									: "Performance Order"}
							</span>
							?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={loading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={loading}
							className={confirmState?.action === "uncheck" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
							onClick={() =>
								confirmState && handleAction(confirmState)
							}
						>
							{loading 
								? (confirmState?.action === "uncheck" ? "Unchecking..." : "Checking in...") 
								: (confirmState?.action === "uncheck" ? "Uncheck" : "OK")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
