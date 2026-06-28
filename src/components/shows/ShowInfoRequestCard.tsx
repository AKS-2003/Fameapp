"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ShowInfoRequest, BaseShow } from "@/types/famelink";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Building, Check, X, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ShowInfoRequestCardProps {
	request: ShowInfoRequest;
	shows: BaseShow[];
	onRespond: (requestId: string, showId: string) => Promise<void>;
}

export function ShowInfoRequestCard({
	request,
	shows,
	onRespond,
}: ShowInfoRequestCardProps) {
	const { toast } = useToast();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isExpired = new Date(request.expiresAt) < new Date();
	const isPending = request.status === "pending" && !isExpired;

	const handleRespond = async () => {
		if (!selectedShowId) return;
		setIsSubmitting(true);
		try {
			await onRespond(request.id, selectedShowId);
			setIsDialogOpen(false);
			toast({
				title: "Response Sent",
				description: "Your show info has been shared",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to respond",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const copyLink = () => {
		if (request.responseLink) {
			navigator.clipboard.writeText(request.responseLink);
			toast({
				title: "Link Copied",
				description: "Shareable link copied to clipboard",
			});
		}
	};

	return (
		<>
			<Card className={isExpired ? "opacity-60" : ""}>
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-base flex items-center gap-2">
								<User className="h-4 w-4" />{" "}
								{request.requesterName}
							</CardTitle>
							{request.requesterOrganization && (
								<p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
									<Building className="h-3 w-3" />{" "}
									{request.requesterOrganization}
								</p>
							)}
						</div>
						<Badge
							variant={
								isPending
									? "default"
									: isExpired
										? "secondary"
										: "outline"
							}
						>
							{isExpired ? "Expired" : request.status}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{request.message && (
						<p className="text-sm text-gray-600">
							{request.message}
						</p>
					)}
					<p className="text-xs text-gray-400 flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{formatDistanceToNow(new Date(request.createdAt), {
							addSuffix: true,
						})}
					</p>

					{isPending && (
						<Button size="sm" onClick={() => setIsDialogOpen(true)}>
							<Check className="h-3 w-3 mr-1" /> Respond
						</Button>
					)}

					{request.status === "responded" && request.responseLink && (
						<Button size="sm" variant="outline" onClick={copyLink}>
							<Copy className="h-3 w-3 mr-1" /> Copy Shared Link
						</Button>
					)}
				</CardContent>
			</Card>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Select a Show to Share</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 mt-4">
						{shows.length === 0 ? (
							<p className="text-gray-500 text-center py-4">
								No shows available
							</p>
						) : (
							shows.map((show) => (
								<div
									key={show.id}
									onClick={() => setSelectedShowId(show.id)}
									className={`p-3 border rounded cursor-pointer ${
										selectedShowId === show.id
											? "border-primary bg-primary/5"
											: "hover:border-gray-300"
									}`}
								>
									<p className="font-medium">{show.name}</p>
									<p className="text-sm text-gray-500">
										{show.style}
									</p>
								</div>
							))
						)}
					</div>
					<div className="flex justify-end gap-2 mt-4">
						<Button
							variant="outline"
							onClick={() => setIsDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRespond}
							disabled={!selectedShowId || isSubmitting}
						>
							{isSubmitting ? "Sending..." : "Share Show Info"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
