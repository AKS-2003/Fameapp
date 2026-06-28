"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStatusInfo } from "@/lib/client/artist-status";
import { ArtistStatusBadge } from "./artist-status-badge";
import { Clock, User, MessageSquare } from "lucide-react";

interface StatusHistoryEntry {
	id: string;
	previousStatus: string | null;
	newStatus: string;
	changedBy: string;
	changedByName: string;
	reason?: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

interface ArtistStatusDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	artistId: string;
	artistName: string;
	eventId: string;
	currentStatus: string | null;
	onStatusUpdated?: (newStatus: string) => void;
}

export function ArtistStatusDialog({
	open,
	onOpenChange,
	artistId,
	artistName,
	eventId,
	currentStatus,
	onStatusUpdated,
}: ArtistStatusDialogProps) {
	const [loading, setLoading] = useState(false);
	const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>(
		[]
	);
	const [validTransitions, setValidTransitions] = useState<string[]>([]);
	const [selectedStatus, setSelectedStatus] = useState<string>("");
	const [reason, setReason] = useState<string>("");
	const { toast } = useToast();

	useEffect(() => {
		if (open && artistId) {
			fetchStatusData();
		}
	}, [open, artistId]);

	const fetchStatusData = async () => {
		try {
			setLoading(true);
			// For now, provide default valid transitions
			const defaultTransitions = [
				"pending",
				"approved",
				"rejected",
				"assigned",
				"confirmed",
				"cancelled",
			];
			setValidTransitions(
				defaultTransitions.filter((status) => status !== currentStatus)
			);
			setStatusHistory([]);
		} catch (error) {
			console.error("Error fetching status data:", error);
			toast({
				title: "❌ Loading Error",
				description:
					"Failed to load status information. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async () => {
		if (!selectedStatus) {
			toast({
				title: "⚠️ Selection Required",
				description: "Please select a new status.",
				variant: "destructive",
			});
			return;
		}

		try {
			setLoading(true);
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						status: selectedStatus,
						reason: reason.trim() || undefined,
					}),
				}
			);

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					toast({
						title: "✅ Status Updated",
						description: `Artist status changed to ${
							getStatusInfo(selectedStatus).label
						}.`,
					});

					// Reset form
					setSelectedStatus("");
					setReason("");

					// Notify parent component
					onStatusUpdated?.(selectedStatus);

					// Close dialog
					onOpenChange(false);
				} else {
					throw new Error(
						data.error?.message || "Failed to update status"
					);
				}
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to update status"
				);
			}
		} catch (error: any) {
			console.error("Error updating status:", error);
			toast({
				title: "❌ Update Failed",
				description:
					error.message ||
					"Failed to update artist status. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const formatTimestamp = (timestamp: string) => {
		return new Date(timestamp).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Manage Artist Status - {artistName}
					</DialogTitle>
					<DialogDescription>
						Update artist status and view status change history
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Current Status */}
					<div className="space-y-2">
						<Label>Current Status</Label>
						<div className="flex items-center gap-2">
							<ArtistStatusBadge status={currentStatus} />
							<span className="text-sm text-muted-foreground">
								{getStatusInfo(currentStatus).description}
							</span>
						</div>
					</div>

					{/* Status Update Form */}
					<div className="space-y-4 p-4 border rounded-lg">
						<h4 className="font-medium">Update Status</h4>

						<div className="space-y-2">
							<Label htmlFor="new-status">New Status</Label>
							<Select
								value={selectedStatus}
								onValueChange={setSelectedStatus}
								disabled={
									loading || validTransitions.length === 0
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select new status" />
								</SelectTrigger>
								<SelectContent>
									{validTransitions.map((status) => {
										const statusInfo =
											getStatusInfo(status);
										return (
											<SelectItem
												key={status}
												value={status}
											>
												<div className="flex items-center gap-2">
													<span>
														{statusInfo.label}
													</span>
													<span className="text-xs text-muted-foreground">
														-{" "}
														{statusInfo.description}
													</span>
												</div>
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
							{validTransitions.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No status transitions available from current
									status
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="reason">Reason (Optional)</Label>
							<Textarea
								id="reason"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Enter reason for status change..."
								rows={3}
								disabled={loading}
							/>
						</div>
					</div>

					{/* Status History */}
					<div className="space-y-4">
						<h4 className="font-medium">Status History</h4>

						{loading ? (
							<div className="text-center py-4">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
								<p className="text-sm text-muted-foreground mt-2">
									Loading history...
								</p>
							</div>
						) : statusHistory.length > 0 ? (
							<div className="space-y-3 max-h-60 overflow-y-auto">
								{statusHistory
									.slice()
									.reverse()
									.map((entry) => (
										<div
											key={entry.id}
											className="flex items-start gap-3 p-3 border rounded-lg"
										>
											<div className="flex-1 space-y-1">
												<div className="flex items-center gap-2">
													{entry.previousStatus && (
														<ArtistStatusBadge
															status={
																entry.previousStatus
															}
														/>
													)}
													{entry.previousStatus && (
														<span>→</span>
													)}
													<ArtistStatusBadge
														status={entry.newStatus}
													/>
												</div>

												<div className="flex items-center gap-4 text-sm text-muted-foreground">
													<div className="flex items-center gap-1">
														<User className="h-3 w-3" />
														{entry.changedByName}
													</div>
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{formatTimestamp(
															entry.timestamp
														)}
													</div>
												</div>

												{entry.reason && (
													<div className="flex items-start gap-1 text-sm">
														<MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground" />
														<span>
															{entry.reason}
														</span>
													</div>
												)}
											</div>
										</div>
									))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">
								No status history available
							</p>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleStatusUpdate}
						disabled={
							loading ||
							!selectedStatus ||
							validTransitions.length === 0
						}
					>
						{loading ? "Updating..." : "Update Status"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
