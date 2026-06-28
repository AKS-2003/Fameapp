"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Clock,
	MapPin,
	User,
	Phone,
	FileText,
	Download,
	Calendar,
	AlertCircle,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface ShowDateInfo {
	id: string;
	eventId: string;
	showDate: string;
	rehearsalTiming: string;
	location: string;
	showtime: string;
	backstageReadyTime: string;
	stageManagerName: string;
	stageManagerContact: string;
	notes: string;
	attachments: Array<{
		id: string;
		fileName: string;
		originalName: string;
		fileUrl: string;
		filePath?: string;
		uploadedAt: string;
	}>;
	updatedAt: string;
}

interface ShowDateInfoCardProps {
	eventId: string;
	showDate: string;
	refreshKey?: number;
}

export function ShowDateInfoCard({
	eventId,
	showDate,
	refreshKey,
}: ShowDateInfoCardProps) {
	const [info, setInfo] = useState<ShowDateInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(true);
	const [localRefresh, setLocalRefresh] = useState(0);

	const fetchShowDateInfo = useCallback(
		async (silent = false) => {
			if (!eventId || !showDate) return;

			try {
				if (!silent) setLoading(true);
				const timestamp = Date.now();

				const response = await fetch(
					`/api/events/${eventId}/show-date-info?showDate=${showDate}&_t=${timestamp}`,
					{
						cache: "no-store",
						headers: {
							"Cache-Control":
								"no-cache, no-store, must-revalidate",
							Pragma: "no-cache",
						},
					}
				);
				if (response.ok) {
					const result = await response.json();
					setInfo(result.data);
				}
			} catch (error) {
				console.error("Error fetching show date info:", error);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[eventId, showDate]
	);

	// Fetch when props or localRefresh changes
	useEffect(() => {
		fetchShowDateInfo();
	}, [eventId, showDate, refreshKey, localRefresh, fetchShowDateInfo]);

	// Poll every 10 seconds as backup
	useEffect(() => {
		const interval = setInterval(() => {
			fetchShowDateInfo(true);
		}, 10000);
		return () => clearInterval(interval);
	}, [fetchShowDateInfo]);

	// Listen for WebSocket window events directly
	useEffect(() => {
		const handleUpdate = (event: CustomEvent) => {
			if (event.detail?.eventId === eventId) {
				fetchShowDateInfo(true);
			}
		};

		window.addEventListener(
			"show_date_info_updated",
			handleUpdate as EventListener
		);
		return () => {
			window.removeEventListener(
				"show_date_info_updated",
				handleUpdate as EventListener
			);
		};
	}, [eventId, fetchShowDateInfo]);

	const downloadAttachment = async (attachment: {
		fileUrl: string;
		filePath?: string;
		fileName?: string;
		originalName: string;
	}) => {
		try {
			// Use filePath if available, otherwise try to extract from fileUrl or fileName
			let filePath = attachment.filePath || attachment.fileName || "";

			if (!filePath && attachment.fileUrl) {
				// Check if it's a GCS URL
				if (
					attachment.fileUrl.includes("storage.googleapis.com") ||
					attachment.fileUrl.includes("storage.cloud.google.com")
				) {
					// Extract path from GCS URL
					const urlObj = new URL(attachment.fileUrl);
					const pathParts = urlObj.pathname.split("/");
					// Remove bucket name from path
					const bucketIndex = pathParts.findIndex(
						(p) => p === "fame-data"
					);
					if (bucketIndex !== -1) {
						filePath = pathParts.slice(bucketIndex + 1).join("/");
					} else {
						// Try to get path after the first segment
						filePath = pathParts.slice(2).join("/");
					}
				}
			}

			if (filePath) {
				// Use the download API to get a fresh signed URL
				const response = await fetch(`/api/download/${filePath}`);
				if (response.ok) {
					const data = await response.json();
					if (data.downloadUrl) {
						// Create a link and trigger download
						const link = document.createElement("a");
						link.href = data.downloadUrl;
						link.download = attachment.originalName;
						link.target = "_blank";
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						return;
					}
				}
			}

			// Fallback to direct URL
			const link = document.createElement("a");
			link.href = attachment.fileUrl;
			link.download = attachment.originalName;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error("Error downloading file:", error);
			// Fallback to direct URL
			const link = document.createElement("a");
			link.href = attachment.fileUrl;
			link.download = attachment.originalName;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	// Helper to format time from 24h (HH:mm) to 12h format
	const formatTime = (time: string): string => {
		if (!time) return "";
		// If already contains AM/PM or is a range, return as is
		if (
			time.includes("AM") ||
			time.includes("PM") ||
			time.includes(" - ")
		) {
			// Format range times
			if (time.includes(" - ")) {
				const [start, end] = time.split(" - ");
				return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
			}
			return time;
		}
		return formatSingleTime(time);
	};

	const formatSingleTime = (time: string): string => {
		if (!time || time.includes("AM") || time.includes("PM")) return time;
		const [hours, minutes] = time.split(":").map(Number);
		if (isNaN(hours)) return time;
		const period = hours >= 12 ? "PM" : "AM";
		const hour12 = hours % 12 || 12;
		return `${hour12}:${
			minutes?.toString().padStart(2, "0") || "00"
		} ${period}`;
	};

	if (loading) {
		return (
			<Card className="mb-4 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
				<CardContent className="py-4">
					<div className="flex items-center justify-center">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
						<span className="ml-2 text-sm text-gray-500">
							Loading show information...
						</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!info || (!info.rehearsalTiming && !info.location && !info.showtime)) {
		return null; // Don't show card if no info available
	}

	const formattedDate = showDate
		? format(new Date(showDate), "EEEE, MMMM d, yyyy")
		: "";

	return (
		<Card className="mb-4 border-purple-300 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 shadow-lg overflow-hidden">
			<CardHeader
				className="py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 cursor-pointer"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center justify-between">
					<CardTitle className="text-white text-sm sm:text-base flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						Show Information - {formattedDate}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge
							variant="secondary"
							className="bg-white/20 text-white text-xs"
						>
							From Stage Manager
						</Badge>
						{expanded ? (
							<ChevronUp className="h-4 w-4 text-white" />
						) : (
							<ChevronDown className="h-4 w-4 text-white" />
						)}
					</div>
				</div>
			</CardHeader>

			{expanded && (
				<CardContent className="py-4 px-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Rehearsal Timing */}
						{info.rehearsalTiming && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
								<div className="p-2 bg-blue-100 rounded-lg">
									<Clock className="h-4 w-4 text-blue-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Rehearsal Timing
									</p>
									<p className="font-semibold text-gray-800">
										{formatTime(info.rehearsalTiming)}
									</p>
								</div>
							</div>
						)}

						{/* Location */}
						{info.location && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-100 shadow-sm">
								<div className="p-2 bg-red-100 rounded-lg">
									<MapPin className="h-4 w-4 text-red-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Location
									</p>
									<p className="font-semibold text-gray-800">
										{info.location}
									</p>
								</div>
							</div>
						)}

						{/* Showtime */}
						{info.showtime && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100 shadow-sm">
								<div className="p-2 bg-green-100 rounded-lg">
									<Clock className="h-4 w-4 text-green-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Showtime
									</p>
									<p className="font-semibold text-gray-800">
										{formatTime(info.showtime)}
									</p>
								</div>
							</div>
						)}

						{/* Backstage Ready Time */}
						{info.backstageReadyTime && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-100 shadow-sm">
								<div className="p-2 bg-orange-100 rounded-lg">
									<AlertCircle className="h-4 w-4 text-orange-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Be Ready Backstage
									</p>
									<p className="font-semibold text-gray-800">
										{formatTime(info.backstageReadyTime)}
									</p>
								</div>
							</div>
						)}

						{/* Stage Manager Name */}
						{info.stageManagerName && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
								<div className="p-2 bg-purple-100 rounded-lg">
									<User className="h-4 w-4 text-purple-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Stage Manager
									</p>
									<p className="font-semibold text-gray-800">
										{info.stageManagerName}
									</p>
								</div>
							</div>
						)}

						{/* Stage Manager Contact */}
						{info.stageManagerContact && (
							<div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-100 shadow-sm">
								<div className="p-2 bg-teal-100 rounded-lg">
									<Phone className="h-4 w-4 text-teal-600" />
								</div>
								<div>
									<p className="text-xs text-gray-500 font-medium">
										Contact Number
									</p>
									<p className="font-semibold text-gray-800">
										{info.stageManagerContact}
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Notes */}
					{info.notes && (
						<div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
							<p className="text-xs text-yellow-700 font-medium mb-1">
								📝 Notes from Stage Manager
							</p>
							<p className="text-sm text-gray-700">
								{info.notes}
							</p>
						</div>
					)}

					{/* Attachments */}
					{info.attachments && info.attachments.length > 0 && (
						<div className="mt-4">
							<p className="text-xs text-gray-500 font-medium mb-2">
								📎 Attachments
							</p>
							<div className="flex flex-wrap gap-2">
								{info.attachments.map((attachment) => (
									<Button
										key={attachment.id}
										variant="outline"
										size="sm"
										onClick={() =>
											downloadAttachment(attachment)
										}
										className="flex items-center gap-2 bg-white hover:bg-gray-50"
									>
										<FileText className="h-4 w-4 text-red-500" />
										<span className="truncate max-w-[150px]">
											{attachment.originalName}
										</span>
										<Download className="h-3 w-3 text-gray-400" />
									</Button>
								))}
							</div>
						</div>
					)}

					{/* Last Updated */}
					{info.updatedAt && (
						<p className="mt-3 text-xs text-gray-400 text-right">
							Last updated:{" "}
							{format(
								new Date(info.updatedAt),
								"MMM d, yyyy 'at' h:mm a"
							)}
						</p>
					)}
				</CardContent>
			)}
		</Card>
	);
}
