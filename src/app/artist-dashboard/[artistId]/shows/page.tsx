"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BaseShow, FREE_TIER_MAX_SHOWS, canCreateShow } from "@/types/famelink";
import { BaseShowForm } from "@/components/shows/BaseShowForm";
import { ShowCard } from "@/components/shows/ShowCard";
import { ShowLimitBanner } from "@/components/shows/ShowLimitBanner";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function ArtistShowsPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const artistId = params.artistId as string;

	const [shows, setShows] = useState<BaseShow[]>([]);
	const [loading, setLoading] = useState(true);
	const [tier, setTier] = useState<"free" | "pro" | "pro_plus">("free");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingShow, setEditingShow] = useState<BaseShow | undefined>();
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		fetchShows();
	}, [artistId]);

	const fetchShows = async () => {
		try {
			const response = await fetch(`/api/shows?artistId=${artistId}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setShows(data.data.shows || []);
					setTier(data.data.tier || "free");
				}
			}
		} catch (error) {
			console.error("Error fetching shows:", error);
			toast({
				title: "Error",
				description: "Failed to load shows",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleCreateShow = () => {
		if (!canCreateShow(shows.length, tier)) {
			toast({
				title: "Show Limit Reached",
				description: "Upgrade to Pro to create more shows",
				variant: "destructive",
			});
			return;
		}
		setEditingShow(undefined);
		setIsFormOpen(true);
	};

	const handleEditShow = (show: BaseShow) => {
		setEditingShow(show);
		setIsFormOpen(true);
	};

	const handleSaveShow = async (showData: Partial<BaseShow>) => {
		setIsSaving(true);
		try {
			const url = editingShow
				? `/api/shows/${editingShow.id}`
				: "/api/shows";
			const method = editingShow ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...showData, artistId }),
			});

			const data = await response.json();

			if (data.success) {
				toast({
					title: editingShow ? "Show Updated" : "Show Created",
					description: `"${showData.name}" has been ${editingShow ? "updated" : "created"} successfully`,
				});
				setIsFormOpen(false);
				fetchShows();
			} else {
				toast({
					title: "Error",
					description: data.error?.message || "Failed to save show",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error saving show:", error);
			toast({
				title: "Error",
				description: "Failed to save show",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteShow = async (show: BaseShow) => {
		if (!confirm(`Are you sure you want to delete "${show.name}"?`)) return;

		try {
			const response = await fetch(`/api/shows/${show.id}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (data.success) {
				toast({
					title: "Show Deleted",
					description: `"${show.name}" has been deleted`,
				});
				fetchShows();
			} else {
				toast({
					title: "Error",
					description: data.error?.message || "Failed to delete show",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error deleting show:", error);
			toast({
				title: "Error",
				description: "Failed to delete show",
				variant: "destructive",
			});
		}
	};

	const handleCopyLink = () => {};
	const handleShare = () => {
		toast({
			title: "Coming Soon",
			description: "Share feature will be available soon",
		});
	};
	const handleExportPdf = () => {
		toast({
			title: "Coming Soon",
			description: "PDF export will be available soon",
		});
	};
	const handleUpgrade = () => {
		toast({
			title: "Coming Soon",
			description: "Pro tier will be available soon",
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-6xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							onClick={() =>
								router.push(`/artist-dashboard/${artistId}`)
							}
						>
							<ArrowLeft className="h-4 w-4 mr-2" /> Back to
							Dashboard
						</Button>
						<h1 className="text-2xl font-bold">My Shows</h1>
					</div>
					<Button
						onClick={handleCreateShow}
						disabled={!canCreateShow(shows.length, tier)}
					>
						<Plus className="h-4 w-4 mr-2" /> Create New Show
					</Button>
				</div>

				<ShowLimitBanner
					currentCount={shows.length}
					maxCount={FREE_TIER_MAX_SHOWS}
					onUpgrade={handleUpgrade}
				/>

				{shows.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<p className="text-gray-500 mb-4">
								You haven't created any shows yet.
							</p>
							<Button onClick={handleCreateShow}>
								<Plus className="h-4 w-4 mr-2" /> Create Your
								First Show
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{shows.map((show) => (
							<ShowCard
								key={show.id}
								show={show}
								onEdit={() => handleEditShow(show)}
								onDelete={() => handleDeleteShow(show)}
								onCopyLink={handleCopyLink}
								onShare={handleShare}
								onExportPdf={handleExportPdf}
							/>
						))}
					</div>
				)}

				<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>
								{editingShow ? "Edit Show" : "Create New Show"}
							</DialogTitle>
						</DialogHeader>
						<BaseShowForm
							show={editingShow}
							onSave={handleSaveShow}
							onCancel={() => setIsFormOpen(false)}
							isLoading={isSaving}
						/>
					</DialogContent>
				</Dialog>
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="light" />
				</div>
			</div>
		</div>
	);
}
