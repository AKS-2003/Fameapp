"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface ArtistUpdateNotification {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	changedFields: string[];
	summary: string;
	timestamp: string;
	readBy: string[];
}

interface ArtistUpdateBadgeProps {
	eventId: string;
	artistId: string;
	artistName: string;
	stageManagerId: string;
	initialUnreadCount?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

// Human-readable field name mapping
const FIELD_LABELS: Record<string, string> = {
	artist_name: "Artist Name",
	real_name: "Real Name",
	email: "Email",
	phone: "Phone",
	style: "Style",
	performance_type: "Performance Type",
	biography: "Biography",
	notes: "Notes",
	props_needed: "Props / Equipment",
	performance_duration: "Performance Duration",
	costume_color: "Costume Color",
	costume_color_two: "Costume Color 2",
	costume_color_three: "Costume Color 3",
	custom_costume_color: "Custom Costume Color",
	manual_costume_color: "Manual Costume Color",
	manual_costume_color_two: "Manual Costume Color 2",
	manual_costume_color_three: "Manual Costume Color 3",
	light_color_single: "Light Color",
	light_color_two: "Light Color 2",
	light_color_three: "Light Color 3",
	light_requests: "Light Requests",
	manual_light_color: "Manual Light Color",
	manual_light_color_two: "Manual Light Color 2",
	manual_light_color_three: "Manual Light Color 3",
	show_link: "Show Link",
	stage_position_start: "Stage Position (Start)",
	stage_position_end: "Stage Position (End)",
	custom_stage_position: "Custom Stage Position",
	mc_notes: "MC Notes",
	stage_manager_notes: "Stage Manager Notes",
	instagram_link: "Instagram",
	facebook_link: "Facebook",
	tiktok_link: "TikTok",
	youtube_link: "YouTube",
	website_link: "Website",
	country_living: "Country Living In",
	home_country: "Home Country",
	managed_by: "Managed By",
	profile_image: "Profile Image",
	music_tracks: "Music Tracks",
	gallery_files: "Gallery Files",
	rehearsal_video: "Rehearsal Video",
	members: "Group Members",
	tshirt_sizes: "T-Shirt Sizes",
};

function getFieldLabel(field: string): string {
	return (
		FIELD_LABELS[field] ||
		field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Categorize fields for display
function categorizeFields(fields: string[]): Record<string, string[]> {
	const categories: Record<string, string[]> = {};
	const categoryMap: Record<string, string> = {
		artist_name: "Basic Info",
		real_name: "Basic Info",
		email: "Basic Info",
		phone: "Basic Info",
		style: "Basic Info",
		performance_type: "Basic Info",
		biography: "Basic Info",
		managed_by: "Basic Info",
		country_living: "Basic Info",
		home_country: "Basic Info",
		members: "Basic Info",
		tshirt_sizes: "Basic Info",
		performance_duration: "Performance",
		notes: "Performance",
		props_needed: "Performance",
		show_link: "Performance",
		mc_notes: "Performance",
		stage_manager_notes: "Performance",
		costume_color: "Costume",
		costume_color_two: "Costume",
		costume_color_three: "Costume",
		custom_costume_color: "Costume",
		manual_costume_color: "Costume",
		manual_costume_color_two: "Costume",
		manual_costume_color_three: "Costume",
		light_color_single: "Lighting",
		light_color_two: "Lighting",
		light_color_three: "Lighting",
		light_requests: "Lighting",
		manual_light_color: "Lighting",
		manual_light_color_two: "Lighting",
		manual_light_color_three: "Lighting",
		stage_position_start: "Stage Position",
		stage_position_end: "Stage Position",
		custom_stage_position: "Stage Position",
		instagram_link: "Social Media",
		facebook_link: "Social Media",
		tiktok_link: "Social Media",
		youtube_link: "Social Media",
		website_link: "Social Media",
		profile_image: "Media",
		music_tracks: "Media",
		gallery_files: "Media",
		rehearsal_video: "Media",
	};

	for (const field of fields) {
		const cat = categoryMap[field] || "Other";
		if (!categories[cat]) categories[cat] = [];
		categories[cat].push(field);
	}
	return categories;
}

export function ArtistUpdateBadge({
	eventId,
	artistId,
	artistName,
	stageManagerId,
	initialUnreadCount = 0,
	variant = "outline",
	size = "sm",
	className = "",
}: ArtistUpdateBadgeProps) {
	const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
	const [notifications, setNotifications] = useState<
		ArtistUpdateNotification[]
	>([]);
	const [open, setOpen] = useState(false);
	const lastCountRef = useRef(initialUnreadCount);

	const loadUnreadCount = useCallback(async () => {
		if (!eventId || !artistId || !stageManagerId) return;
		try {
			const response = await fetch(
				`/api/events/${eventId}/artist-updates?artistId=${artistId}&stageManagerId=${stageManagerId}`,
			);
			const data = await response.json();
			if (data.success) {
				const count = data.data.unreadCounts[artistId] || 0;
				if (count !== lastCountRef.current) {
					lastCountRef.current = count;
					setUnreadCount(count);
				}
				setNotifications(data.data.notifications || []);
			}
		} catch (error) {
			console.error("Failed to load artist update count:", error);
		}
	}, [eventId, artistId, stageManagerId]);

	useEffect(() => {
		// Listen for real-time artist profile updates
		const handleProfileUpdate = (event: CustomEvent) => {
			const detail = event.detail;
			if (detail.eventId === eventId && detail.artistId === artistId) {
				// Increment count immediately for real-time feel
				setUnreadCount((prev) => {
					const newCount = prev + 1;
					lastCountRef.current = newCount;
					return newCount;
				});
				// Add the notification to local state
				if (detail.notification) {
					setNotifications((prev) => [...prev, detail.notification]);
				}
			}
		};

		window.addEventListener(
			"artist_profile_updated",
			handleProfileUpdate as EventListener,
		);

		return () => {
			window.removeEventListener(
				"artist_profile_updated",
				handleProfileUpdate as EventListener,
			);
		};
	}, [eventId, artistId]);

	useEffect(() => {
		lastCountRef.current = initialUnreadCount;
		setUnreadCount(initialUnreadCount);
	}, [initialUnreadCount]);

	const handleOpen = async () => {
		setOpen(true);
		await loadUnreadCount();
	};

	const handleClose = async () => {
		setOpen(false);
		// Mark all as read for this artist
		if (unreadCount > 0) {
			try {
				await fetch(`/api/events/${eventId}/artist-updates`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "markRead",
						stageManagerId,
						artistId,
					}),
				});
				setUnreadCount(0);
				lastCountRef.current = 0;
			} catch (error) {
				console.error("Failed to mark updates as read:", error);
			}
		}
	};

	// Don't render if no updates ever
	if (unreadCount === 0 && notifications.length === 0) return null;

	// Sort notifications newest first
	const sortedNotifications = [...notifications].sort(
		(a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	// Determine which are unread
	const isUnread = (n: ArtistUpdateNotification) =>
		!n.readBy || !n.readBy.includes(stageManagerId);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={handleOpen}
				className={`relative ${className}`}
				title={`${artistName} profile updates${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`}
			>
				<FileText className="h-4 w-4" />
				{unreadCount > 0 && (
					<span className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium animate-pulse">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</Button>

			<Dialog
				open={open}
				onOpenChange={(o) => {
					if (!o) {
						handleClose();
					}
				}}
			>
				<DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5 text-blue-500" />
							Profile Updates — {artistName}
						</DialogTitle>
						<DialogDescription>
							History of profile changes made by this artist.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto space-y-3 pr-1">
						{sortedNotifications.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								No profile updates yet.
							</p>
						) : (
							sortedNotifications.map((n) => {
								const unread = isUnread(n);
								const categorized = categorizeFields(
									n.changedFields,
								);

								return (
									<div
										key={n.id}
										className={`rounded-lg border p-3 ${
											unread
												? "bg-blue-50 border-blue-200"
												: "bg-white border-gray-200"
										}`}
									>
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs text-muted-foreground">
												{formatTimestamp(n.timestamp)}
											</span>
											{unread && (
												<span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
													New
												</span>
											)}
										</div>
										{n.summary && (
											<p className="text-sm font-medium mb-2">
												{n.summary}
											</p>
										)}
										<div className="space-y-1">
											{Object.entries(categorized).map(
												([category, fields]) => (
													<div key={category}>
														<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
															{category}
														</span>
														<div className="flex flex-wrap gap-1 mt-0.5">
															{fields.map(
																(field) => (
																	<span
																		key={
																			field
																		}
																		className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-inset ring-blue-200"
																	>
																		{getFieldLabel(
																			field,
																		)}
																	</span>
																),
															)}
														</div>
													</div>
												),
											)}
										</div>
									</div>
								);
							})
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

/**
 * Hook to get total unread artist update counts for all artists in an event.
 * Used by the parent page to show aggregate counts.
 */
export function useArtistUpdateCounts(eventId: string, stageManagerId: string) {
	const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
		{},
	);

	const loadCounts = useCallback(async () => {
		if (!eventId || !stageManagerId) return;
		try {
			const response = await fetch(
				`/api/events/${eventId}/artist-updates?stageManagerId=${stageManagerId}`,
			);
			const data = await response.json();
			if (data.success) {
				setUnreadCounts(data.data.unreadCounts || {});
			}
		} catch (error) {
			console.error("Failed to load artist update counts:", error);
		}
	}, [eventId, stageManagerId]);

	useEffect(() => {
		loadCounts();

		// Listen for real-time updates
		const handleProfileUpdate = (event: CustomEvent) => {
			const detail = event.detail;
			if (detail.eventId === eventId) {
				setUnreadCounts((prev) => ({
					...prev,
					[detail.artistId]: (prev[detail.artistId] || 0) + 1,
				}));
			}
		};

		window.addEventListener(
			"artist_profile_updated",
			handleProfileUpdate as EventListener,
		);

		return () => {
			window.removeEventListener(
				"artist_profile_updated",
				handleProfileUpdate as EventListener,
			);
		};
	}, [eventId, stageManagerId, loadCounts]);

	return { unreadCounts, refreshCounts: loadCounts };
}
