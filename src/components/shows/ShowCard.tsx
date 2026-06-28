"use client";

import { BaseShow } from "@/types/famelink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Copy,
	Share2,
	FileText,
	Edit,
	Trash2,
	Globe,
	Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShowCardProps {
	show: BaseShow;
	onEdit: () => void;
	onDelete: () => void;
	onCopyLink: () => void;
	onShare: () => void;
	onExportPdf: () => void;
}

export function ShowCard({
	show,
	onEdit,
	onDelete,
	onCopyLink,
	onShare,
	onExportPdf,
}: ShowCardProps) {
	const { toast } = useToast();

	const handleCopyLink = () => {
		const link = `${window.location.origin}/show/${show.slug}`;
		navigator.clipboard.writeText(link);
		toast({
			title: "Link copied!",
			description: "FameLink URL copied to clipboard",
		});
		onCopyLink();
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg flex items-center gap-2">
							{show.name}
							{show.isPublic ? (
								<Globe className="h-4 w-4 text-green-500" />
							) : (
								<Lock className="h-4 w-4 text-gray-400" />
							)}
						</CardTitle>
						<p className="text-sm text-gray-500 mt-1">
							{show.style}
						</p>
					</div>
					<span className="text-sm bg-gray-100 px-2 py-1 rounded">
						{show.duration} min
					</span>
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-gray-600 line-clamp-2 mb-4">
					{show.description}
				</p>

				{show.music.genres.length > 0 && (
					<div className="flex flex-wrap gap-1 mb-4">
						{show.music.genres.slice(0, 3).map((genre, i) => (
							<span
								key={i}
								className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
							>
								{genre}
							</span>
						))}
						{show.music.genres.length > 3 && (
							<span className="text-xs text-gray-500">
								+{show.music.genres.length - 3} more
							</span>
						)}
					</div>
				)}

				<div className="flex flex-wrap gap-2">
					<Button size="sm" variant="outline" onClick={onEdit}>
						<Edit className="h-3 w-3 mr-1" /> Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={handleCopyLink}
					>
						<Copy className="h-3 w-3 mr-1" /> Copy Link
					</Button>
					<Button size="sm" variant="outline" onClick={onShare}>
						<Share2 className="h-3 w-3 mr-1" /> Share
					</Button>
					<Button size="sm" variant="outline" onClick={onExportPdf}>
						<FileText className="h-3 w-3 mr-1" /> PDF
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={onDelete}
						className="text-red-600 hover:text-red-700"
					>
						<Trash2 className="h-3 w-3 mr-1" /> Delete
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
