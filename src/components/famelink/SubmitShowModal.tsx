import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BaseShow } from "@/types/famelink";
import { Loader2, Check, Music, Video, FileText, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubmitShowModalProps {
	isOpen: boolean;
	onClose: () => void;
	eventId: string;
	artistId: string;
	shows: BaseShow[];
	alreadySubmittedShowIds: string[];
	onSubmitSuccess: () => void;
}

export function SubmitShowModal({
	isOpen,
	onClose,
	eventId,
	artistId,
	shows,
	alreadySubmittedShowIds,
	onSubmitSuccess,
}: SubmitShowModalProps) {
	const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const { toast } = useToast();

	// Reset selected shows when modal opens
	useEffect(() => {
		if (isOpen) {
			setSelectedShowIds([]);
		}
	}, [isOpen]);

	const toggleShowSelection = (showId: string) => {
		if (alreadySubmittedShowIds.includes(showId)) return; // Can't select already submitted show

		setSelectedShowIds((prev) =>
			prev.includes(showId)
				? prev.filter((id) => id !== showId)
				: [...prev, showId]
		);
	};

	const handleSubmit = async () => {
		if (selectedShowIds.length === 0) {
			toast({
				title: "Selection Required",
				description: "Please select at least one show to submit.",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);
		try {
			// Submit each selected show
			let successCount = 0;
			let errorMsg = "";

			for (const baseShowId of selectedShowIds) {
				const response = await fetch("/api/event-shows", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						eventId,
						baseShowId,
					}),
				});

				const result = await response.json();
				if (result.success) {
					successCount++;
				} else {
					errorMsg = result.error?.message || "Failed to submit show.";
				}
			}

			if (successCount === selectedShowIds.length) {
				toast({
					title: "🎉 Shows Submitted!",
					description: `Successfully submitted ${successCount} show${successCount > 1 ? "s" : ""} to the event.`,
				});
				
				// Try to trigger real-time updates via WebSockets if available
				try {
					const socket = (window as any).__fameLinkSocket;
					if (socket?.connected) {
						socket.emit("contract_action", {
							eventId,
							artistId,
							action: "update_profile",
							artistName: "Artist",
						});
					}
				} catch {}

				onSubmitSuccess();
				onClose();
			} else if (successCount > 0) {
				toast({
					title: "Partial Success",
					description: `Submitted ${successCount} show(s), but some failed: ${errorMsg}`,
					variant: "destructive",
				});
				onSubmitSuccess();
				onClose();
			} else {
				toast({
					title: "Submission Failed",
					description: errorMsg || "Failed to submit shows to the event.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error submitting event show:", error);
			toast({
				title: "Error",
				description: "An unexpected error occurred during submission.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !submitting && !open && onClose()}>
			<DialogContent className="bg-white text-slate-900 border border-slate-200 max-w-2xl p-0 overflow-hidden rounded-2xl shadow-2xl">
				{/* Header with premium white background styling */}
				<div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start gap-4">
					<div className="w-12 h-12 bg-gradient-to-br from-[#bf1ed4] to-[#ff66e5] rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
						<Sparkles className="w-6 h-6 text-white" />
					</div>
					<div>
						<DialogTitle className="text-xl font-bold text-slate-900 leading-snug">Submit a Show</DialogTitle>
						<DialogDescription className="text-slate-500 text-sm mt-0.5">
							Select the shows from your profile to perform at this event. Organizers will receive immutable snapshots of your show data.
						</DialogDescription>
					</div>
				</div>

				{/* Body Content */}
				<div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
					{shows.length === 0 ? (
						<div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
							<AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-700 font-semibold mb-1">No Shows Created Yet</p>
							<p className="text-slate-500 text-xs max-w-xs mx-auto mb-4">
								You need to create at least one show in your "My Shows" tab before submitting to this event.
							</p>
						</div>
					) : (
						<div className="grid gap-3">
							{shows.map((show) => {
								const isAlreadySubmitted = alreadySubmittedShowIds.includes(show.id);
								const isSelected = selectedShowIds.includes(show.id);

								return (
									<div
										key={show.id}
										onClick={() => toggleShowSelection(show.id)}
										className={cn(
											"p-4 rounded-xl border transition-all select-none relative flex items-center justify-between gap-4",
											isAlreadySubmitted
												? "border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed"
												: isSelected
												? "border-[#ff66e5] bg-pink-50/20 shadow-sm cursor-pointer"
												: "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
										)}
									>
										{/* Main Details */}
										<div className="flex items-center gap-4 flex-1 min-w-0">
											<div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
												{show.profileImage ? (
													<img
														src={show.profileImage}
														alt={show.name}
														className="w-full h-full object-cover"
													/>
												) : (
													<Music className="w-5 h-5 text-slate-400" />
												)}
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">{show.name}</h4>
													{isAlreadySubmitted && (
														<Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-semibold py-0.5">
															Submitted
														</Badge>
													)}
												</div>
												<p className="text-slate-500 text-xs mt-0.5 flex flex-wrap items-center gap-2">
													<span>{show.style || "Generic style"}</span>
													<span>•</span>
													<span>{show.duration || 0} min</span>
												</p>

												{/* Show Media Badges */}
												<div className="flex items-center gap-2 mt-2">
													{show.musicTrack?.file_url && (
														<Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] flex items-center gap-1">
															<Music className="w-2.5 h-2.5 text-purple-600" /> Track
														</Badge>
													)}
													{show.rehearsalVideo?.url && (
														<Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] flex items-center gap-1">
															<Video className="w-2.5 h-2.5 text-purple-600" /> Video
														</Badge>
													)}
													{show.techRider && (
														<Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] flex items-center gap-1">
															<FileText className="w-2.5 h-2.5 text-purple-600" /> Tech Rider
														</Badge>
													)}
												</div>
											</div>
										</div>

										{/* Checkbox state */}
										<div className="shrink-0">
											{isAlreadySubmitted ? (
												<div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
													<Check className="w-3 h-3 text-emerald-600" />
												</div>
											) : isSelected ? (
												<div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] flex items-center justify-center shadow-md shadow-pink-500/20">
													<Check className="w-3 h-3 text-white" />
												</div>
											) : (
												<div className="w-5 h-5 rounded-full border border-slate-200 hover:border-[#ff66e5]/50 transition-colors" />
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer with premium action buttons */}
				<div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
					<Button
						variant="ghost"
						onClick={onClose}
						disabled={submitting}
						className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-xl px-5 py-2"
					>
						Cancel
					</Button>
					
					<Button
						onClick={handleSubmit}
						disabled={submitting || selectedShowIds.length === 0}
						className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white font-semibold rounded-xl px-6 py-2 shadow-lg shadow-pink-500/10 border-0 flex items-center gap-2"
					>
						{submitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" /> Submitting...
							</>
						) : (
							<>Submit Show{selectedShowIds.length > 1 ? "s" : ""}</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
