"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	Undo2,
	Redo2,
	Plus,
	Loader2,
	X,
	Trash2,
	Settings,
	Upload,
	FileText,
	Clock,
	MapPin,
	User,
	Phone,
	Bell,
	Edit,
	Crown,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Event } from "@/lib/types/event";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";

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
		uploadedAt: string;
	}>;
	createdAt: string;
	updatedAt: string;
}

export default function ShowDateSelectionPage({
	providedEventId,
	onTabChange,
}: {
	providedEventId?: string;
	onTabChange?: (tab: string) => void;
} = {}) {
	const router = useRouter();
	const params = useParams();
	const eventId = providedEventId || (params.eventId as string);
	const { toast } = useToast();
	const {
		data: subData,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [history, setHistory] = useState<Date[][]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	// Modal state
	const [showInfoModal, setShowInfoModal] = useState(false);
	const [selectedShowDate, setSelectedShowDate] = useState<Date | null>(null);
	const [showDateInfo, setShowDateInfo] = useState<ShowDateInfo | null>(null);
	const [savingInfo, setSavingInfo] = useState(false);
	const [uploadingFile, setUploadingFile] = useState(false);
	const [showDateInfoMap, setShowDateInfoMap] = useState<
		Map<string, ShowDateInfo>
	>(new Map());

	// Form state for modal
	const [formData, setFormData] = useState({
		rehearsalTiming: "",
		location: "",
		showtime: "",
		backstageReadyTime: "",
		stageManagerName: "",
		stageManagerContact: "",
		notes: "",
		attachments: [] as ShowDateInfo["attachments"],
	});

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	useEffect(() => {
		if (selectedDates.length > 0) {
			fetchAllShowDateInfo();
		}
	}, [selectedDates]);

	// Initialize WebSocket for real-time updates
	useEffect(() => {
		if (!eventId) return;

		let wsManager: any = null;

		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				wsManager = createWebSocketManager({
					eventId,
					role: "stage_manager",
					userId: `stage_manager_${eventId}`,
					showToasts: false,
					onConnect: () => {
						console.log("Show dates page: WebSocket connected");
					},
					onDisconnect: () => {
						console.log("Show dates page: WebSocket disconnected");
					},
				});

				await wsManager.initialize();
				(window as any).showDatesWsManager = wsManager;
			} catch (error) {
				console.error("Error initializing WebSocket:", error);
			}
		};

		initializeWebSocket();

		return () => {
			if ((window as any).showDatesWsManager) {
				(window as any).showDatesWsManager.destroy();
				delete (window as any).showDatesWsManager;
			}
		};
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/events/${eventId}`);

			if (response.ok) {
				const result = await response.json();
				setEvent(result.data);
				const existingDates =
					result.data.showDates?.map((date: string) => {
						if (date.includes("T")) {
							const datePart = date.split("T")[0];
							const [year, month, day] = datePart
								.split("-")
								.map(Number);
							return new Date(year, month - 1, day, 12, 0, 0);
						} else {
							const [year, month, day] = date
								.split("-")
								.map(Number);
							return new Date(year, month - 1, day, 12, 0, 0);
						}
					}) || [];
				setSelectedDates(existingDates);
				setHistory([existingDates]);
				setHistoryIndex(0);
			} else {
				console.error("Failed to fetch event");
				router.push("/stage-manager/events");
			}
		} catch (error) {
			console.error("Error fetching event:", error);
			router.push("/stage-manager/events");
		} finally {
			setLoading(false);
		}
	};

	const fetchAllShowDateInfo = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/show-date-info`,
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					const infoMap = new Map<string, ShowDateInfo>();
					result.data.forEach((info: ShowDateInfo) => {
						const dateKey = info.showDate.includes("T")
							? info.showDate.split("T")[0]
							: info.showDate;
						infoMap.set(dateKey, info);
					});
					setShowDateInfoMap(infoMap);
				}
			}
		} catch (error) {
			console.error("Error fetching show date info:", error);
		}
	};

	const addToHistory = (dates: Date[]) => {
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push([...dates]);
		setHistory(newHistory);
		setHistoryIndex(newHistory.length - 1);
	};

	const removeDate = (date: Date) => {
		const newDates = selectedDates.filter(
			(d) => d.getTime() !== date.getTime(),
		);
		setSelectedDates(newDates);
		addToHistory(newDates);
	};

	const clearAllDates = () => {
		setSelectedDates([]);
		addToHistory([]);
	};

	const undo = () => {
		if (historyIndex > 0) {
			setHistoryIndex(historyIndex - 1);
			setSelectedDates([...history[historyIndex - 1]]);
		}
	};

	const redo = () => {
		if (historyIndex < history.length - 1) {
			setHistoryIndex(historyIndex + 1);
			setSelectedDates([...history[historyIndex + 1]]);
		}
	};

	const openShowDateInfoModal = (date: Date) => {
		setSelectedShowDate(date);
		const dateKey = format(date, "yyyy-MM-dd");
		const existingInfo = showDateInfoMap.get(dateKey);

		if (existingInfo) {
			setFormData({
				rehearsalTiming: existingInfo.rehearsalTiming || "",
				location: existingInfo.location || "",
				showtime: existingInfo.showtime || "",
				backstageReadyTime: existingInfo.backstageReadyTime || "",
				stageManagerName: existingInfo.stageManagerName || "",
				stageManagerContact: existingInfo.stageManagerContact || "",
				notes: existingInfo.notes || "",
				attachments: existingInfo.attachments || [],
			});
			setShowDateInfo(existingInfo);
		} else {
			setFormData({
				rehearsalTiming: "",
				location: "",
				showtime: "",
				backstageReadyTime: "",
				stageManagerName: "",
				stageManagerContact: "",
				notes: "",
				attachments: [],
			});
			setShowDateInfo(null);
		}
		setShowInfoModal(true);
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !selectedShowDate) return;

		if (file.type !== "application/pdf") {
			toast({
				title: "⚠️ Invalid File Type",
				description:
					"Only PDF files are allowed. Please select a PDF document.",
				variant: "destructive",
			});
			return;
		}

		// Check file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			toast({
				title: "⚠️ File Too Large",
				description:
					"File size must be under 10MB. Please compress or select a smaller file.",
				variant: "destructive",
			});
			return;
		}

		setUploadingFile(true);
		try {
			const uploadFormData = new FormData();
			uploadFormData.append("file", file);
			uploadFormData.append(
				"showDate",
				format(selectedShowDate, "yyyy-MM-dd"),
			);

			const response = await fetch(
				`/api/events/${eventId}/show-date-info/upload`,
				{
					method: "POST",
					body: uploadFormData,
				},
			);

			if (response.ok) {
				const result = await response.json();
				setFormData((prev) => ({
					...prev,
					attachments: [...prev.attachments, result.data],
				}));
				toast({
					title: "📎 File Uploaded",
					description: `"${file.name}" has been attached successfully.`,
					variant: "default",
				});
			} else {
				throw new Error("Upload failed");
			}
		} catch (error) {
			console.error("Error uploading file:", error);
			toast({
				title: "❌ Upload Failed",
				description: "Failed to upload PDF file. Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploadingFile(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const removeAttachment = (attachmentId: string) => {
		const attachment = formData.attachments.find(
			(a) => a.id === attachmentId,
		);
		setFormData((prev) => ({
			...prev,
			attachments: prev.attachments.filter((a) => a.id !== attachmentId),
		}));
		toast({
			title: "🗑️ Attachment Removed",
			description: attachment
				? `"${attachment.originalName}" has been removed.`
				: "Attachment removed.",
			variant: "default",
		});
	};

	const saveShowDateInfo = async () => {
		if (!selectedShowDate) return;

		setSavingInfo(true);
		try {
			const dateKey = format(selectedShowDate, "yyyy-MM-dd");
			const existingInfo = showDateInfoMap.get(dateKey);

			// Use PUT for updates, POST for new entries
			const method = existingInfo ? "PUT" : "POST";

			const response = await fetch(
				`/api/events/${eventId}/show-date-info`,
				{
					method,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						showDate: dateKey,
						...formData,
					}),
				},
			);

			if (response.ok) {
				const result = await response.json();

				// Update local map
				setShowDateInfoMap((prev) => {
					const newMap = new Map(prev);
					newMap.set(dateKey, result.data);
					return newMap;
				});

				// Send notification to artists
				await fetch(`/api/events/${eventId}/notifications`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "show_date_info",
						title: result.isNew
							? "New Show Information"
							: "Show Information Updated",
						message: `Information for ${format(
							selectedShowDate,
							"PPP",
						)} has been ${
							result.isNew ? "added" : "updated"
						} by the stage manager.`,
						showDate: dateKey,
						targetAudience: "all_artists", // Changed to notify ALL artists
						createdBy: "stage_manager",
						metadata: {
							showDateInfoId: result.data.id,
						},
					}),
				});

				// Emit WebSocket event for real-time update using global io
				try {
					if (typeof window !== "undefined") {
						// Use the existing WebSocket manager if available
						const wsManager = (window as any).showDatesWsManager;

						if (wsManager && wsManager.socket) {
							console.log(
								"📤 Stage Manager: Emitting show_date_info_updated event",
								{
									eventId,
									showDate: dateKey,
									isNew: result.isNew,
								},
							);
							// Emit show_date_info_updated event
							wsManager.socket.emit("show_date_info_updated", {
								eventId,
								showDate: dateKey,
								showDateInfo: result.data,
								isNew: result.isNew,
							});

							// Also emit new_notification event
							wsManager.socket.emit("new_notification", {
								eventId,
								title: result.isNew
									? "New Show Information"
									: "Show Information Updated",
								message: `Information for ${format(
									selectedShowDate,
									"PPP",
								)} has been ${
									result.isNew ? "added" : "updated"
								}.`,
								type: "show_date_info",
								showDate: dateKey,
								targetAudience: "all_artists", // Notify ALL artists
							});

							console.log(
								"WebSocket events emitted: show_date_info_updated, new_notification",
							);
						} else if ((window as any).io) {
							// Fallback to creating a socket connection
							const socket = (window as any).io();
							socket.emit("show_date_info_updated", {
								eventId,
								showDate: dateKey,
								showDateInfo: result.data,
								isNew: result.isNew,
							});
							socket.emit("new_notification", {
								eventId,
								title: result.isNew
									? "New Show Information"
									: "Show Information Updated",
								message: `Information for ${format(
									selectedShowDate,
									"PPP",
								)} has been ${
									result.isNew ? "added" : "updated"
								}.`,
								type: "show_date_info",
								showDate: dateKey,
								targetAudience: "all_artists",
							});
							console.log(
								"WebSocket events emitted via fallback",
							);
						}
					}
				} catch (wsError) {
					console.error("Error emitting WebSocket event:", wsError);
				}

				toast({
					title: result.isNew
						? "✅ Show Info Created"
						: "✅ Show Info Updated",
					description: `Information for ${format(
						selectedShowDate,
						"EEEE, MMM d",
					)} has been ${
						result.isNew ? "created" : "updated"
					} and all artists have been notified.`,
					variant: "default",
				});

				setShowInfoModal(false);
			} else {
				throw new Error("Failed to save");
			}
		} catch (error) {
			console.error("Error saving show date info:", error);
			toast({
				title: "❌ Save Failed",
				description:
					"Failed to save show date information. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSavingInfo(false);
		}
	};

	const saveShowDates = async () => {
		try {
			setSaving(true);
			const response = await fetch(`/api/events/${eventId}/show-dates`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dates: selectedDates.map((date) => {
						const normalizedDate = new Date(
							date.getFullYear(),
							date.getMonth(),
							date.getDate(),
							12,
							0,
							0,
						);
						return normalizedDate.toISOString();
					}),
				}),
			});

			if (response.ok) {
				router.push("/stage-manager");
			} else {
				console.error("Failed to save show dates");
			}
		} catch (error) {
			console.error("Error saving show dates:", error);
		} finally {
			setSaving(false);
		}
	};

	const skipForNow = () => {
		router.push("/stage-manager");
	};

	const hasShowDateInfo = (date: Date): boolean => {
		const dateKey = format(date, "yyyy-MM-dd");
		const info = showDateInfoMap.get(dateKey);
		return !!(
			info &&
			(info.rehearsalTiming || info.location || info.showtime)
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading event...</p>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600">Event not found</p>
				</div>
			</div>
		);
	}

	const eventStart = event.startDate ? parseISO(event.startDate) : new Date();
	const eventEnd = event.endDate ? parseISO(event.endDate) : new Date();

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link href="/stage-manager" className="mr-4">
								<Button variant="outline" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Dashboard
								</Button>
							</Link>
							<Image
								src="/fame-logo.png"
								alt="FAME Logo"
								width={40}
								height={40}
								className="mr-3"
							/>
							<div>
								<h1 className="text-xl font-semibold">
									Select Show Dates
								</h1>
								<p className="text-sm text-muted-foreground">
									Stage Manager
								</p>
							</div>
						</div>

						{/* Step Nav Buttons - desktop */}
						<div className="hidden md:flex items-center gap-1 shrink-0">
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() => onTabChange && onTabChange("Artist Files")}
							>
								1. Artists
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Show Management")
										: router.push(
												`/stage-manager/events/${eventId}/artists`,
											)
								}
							>
								2. Shows
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Rehearsals")
										: router.push(
												`/stage-manager/events/${eventId}/rehearsal`,
											)
								}
							>
								3. Rehearsals
							</Button>
							<Button
								size="sm"
								className="text-[11px] h-7 px-2.5 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Stage")
										: router.push(
												`/stage-manager/events/${eventId}/performance-order`,
											)
								}
							>
								4. Stage
							</Button>
						</div>

						{/* Step Nav - mobile only */}
						<div className="flex md:hidden items-center gap-1 shrink-0">
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() => onTabChange && onTabChange("Artist Files")}
							>
								1. Artists
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Show Management")
										: router.push(
												`/stage-manager/events/${eventId}/artists`,
											)
								}
							>
								2. Shows
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Rehearsals")
										: router.push(
												`/stage-manager/events/${eventId}/rehearsal`,
											)
								}
							>
								3. Rehearsals
							</Button>
							<Button
								size="sm"
								className="text-[10px] h-6 px-2 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 shadow-sm rounded-full"
								onClick={() =>
									onTabChange
										? onTabChange("Stage")
										: router.push(
												`/stage-manager/events/${eventId}/performance-order`,
											)
								}
							>
								4. Stage
							</Button>
						</div>
					</div>
				</div>
			</header>



			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-2xl font-semibold">
								Select Show Dates
							</CardTitle>
							<CardDescription>
								Choose which dates from{" "}
								<span className="font-semibold text-primary">
									{event.name}
								</span>{" "}
								event will have shows
							</CardDescription>
							<div className="flex items-center text-sm mt-3 bg-muted rounded-lg p-3">
								<CalendarIcon className="h-4 w-4 mr-2" />
								<span>
									Event runs from {format(eventStart, "PPP")}{" "}
									to {format(eventEnd, "PPP")}
								</span>
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Undo/Redo Controls */}
							<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
								<Button
									variant="outline"
									size="sm"
									onClick={undo}
									disabled={historyIndex <= 0}
									className="flex-1 sm:flex-none"
								>
									<Undo2 className="h-4 w-4 mr-1 sm:mr-2" />
									<span className="hidden xs:inline">
										Undo
									</span>
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={redo}
									disabled={
										historyIndex >= history.length - 1
									}
									className="flex-1 sm:flex-none"
								>
									<Redo2 className="h-4 w-4 mr-1 sm:mr-2" />
									<span className="hidden xs:inline">
										Redo
									</span>
								</Button>
							</div>

							<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
								{/* Calendar */}
								<div className="w-full order-1 xl:order-1">
									<h3 className="text-lg font-semibold mb-4">
										Available Dates For Shows
									</h3>
									<div className="border rounded-lg p-2 sm:p-4 bg-card">
										<div className="w-full flex justify-center">
											<div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
												<Calendar
													mode="multiple"
													selected={selectedDates}
													onSelect={(dates) => {
														if (dates) {
															setSelectedDates(
																dates,
															);
															addToHistory(dates);
														}
													}}
													disabled={(date) =>
														!isWithinInterval(
															date,
															{
																start: eventStart,
																end: eventEnd,
															},
														) || date < new Date()
													}
													className="rounded-md w-full"
												/>
											</div>
										</div>
									</div>
									<p className="text-sm text-muted-foreground mt-2 bg-muted p-3 rounded-lg">
										Click dates to select/deselect show
										dates. Only dates within the event
										period are available.
									</p>
								</div>

								{/* Selected Dates */}
								<div className="order-2 xl:order-2">
									<h3 className="text-lg font-semibold mb-4">
										Selected Show Dates
									</h3>
									{selectedDates.length > 0 && (
										<div className="flex items-center justify-end mb-3">
											<Button
												type="button"
												variant="outline"
												onClick={clearAllDates}
												className="h-8 px-2 py-1 text-sm border-red-200 text-red-600 hover:bg-red-50"
											>
												<Trash2 className="h-3 w-3 mr-1" />
												Clear All
											</Button>
										</div>
									)}
									<div className="space-y-3">
										{selectedDates.length === 0 ? (
											<div className="text-center py-8 bg-muted rounded-lg border">
												<CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
												<p className="font-medium">
													No show dates selected yet
												</p>
												<p className="text-sm text-muted-foreground">
													Click on the calendar to add
													dates
												</p>
											</div>
										) : (
											<div className="grid gap-2">
												{selectedDates.map(
													(date, index) => (
														<motion.div
															key={date.getTime()}
															initial={{
																opacity: 0,
																x: -20,
															}}
															animate={{
																opacity: 1,
																x: 0,
															}}
															transition={{
																duration: 0.3,
																delay:
																	index * 0.1,
															}}
														>
															<div
																className="flex items-center justify-between p-3 bg-muted rounded-lg border shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
																onClick={() =>
																	openShowDateInfoModal(
																		date,
																	)
																}
															>
																<div className="flex items-center">
																	<CalendarIcon className="h-4 w-4 mr-2" />
																	<span className="font-medium">
																		{format(
																			date,
																			"PPP",
																		)}
																	</span>
																</div>
																<div className="flex items-center gap-2">
																	{hasShowDateInfo(
																		date,
																	) ? (
																		<Badge
																			variant="secondary"
																			className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
																			onClick={(
																				e,
																			) => {
																				e.stopPropagation();
																				openShowDateInfoModal(
																					date,
																				);
																			}}
																		>
																			<Edit className="h-3 w-3 mr-1" />
																			Edit
																			Info
																		</Badge>
																	) : (
																		<Badge
																			variant="secondary"
																			className="bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
																			onClick={(
																				e,
																			) => {
																				e.stopPropagation();
																				openShowDateInfoModal(
																					date,
																				);
																			}}
																		>
																			<Plus className="h-3 w-3 mr-1" />
																			Add
																			Info
																		</Badge>
																	)}
																	<Badge className="hover:bg-purple-600">
																		<Settings className="h-3 w-3 mr-1" />
																		Show #
																		{index +
																			1}
																	</Badge>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		onClick={(
																			e,
																		) => {
																			e.stopPropagation();
																			removeDate(
																				date,
																			);
																		}}
																		className="h-7 w-7 p-0"
																		aria-label={`Remove ${format(
																			date,
																			"PPP",
																		)}`}
																	>
																		<X className="h-3 w-3" />
																	</Button>
																</div>
															</div>
														</motion.div>
													),
												)}
											</div>
										)}
									</div>

									{selectedDates.length > 0 && (
										<div className="mt-4 p-3 bg-muted rounded-lg border">
											<p className="text-sm font-medium">
												<span className="font-bold text-green-700 text-base">
													{selectedDates.length}
												</span>{" "}
												show dates selected
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												Click on "Show #" badge to add
												rehearsal timing, location, and
												other details for each show
												date.
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t-2 border-gray-200">
								<Button
									onClick={saveShowDates}
									disabled={
										saving || selectedDates.length === 0
									}
									className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
								>
									{saving ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Saving Show Dates...
										</>
									) : (
										<>
											<Plus className="mr-2 h-4 w-4" />
											Save Show Dates (
											{selectedDates.length})
										</>
									)}
								</Button>
								<Button
									variant="outline"
									onClick={skipForNow}
									className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
								>
									Skip for Now
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Show Date Info Modal */}
			<Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CalendarIcon className="h-5 w-5 text-purple-600" />
							Show Information -{" "}
							{selectedShowDate &&
								format(selectedShowDate, "PPP")}
						</DialogTitle>
						<DialogDescription>
							Add details for this show date. Artists will be
							notified when you save.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Rehearsal Timing - Start and End */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-blue-600" />
								Rehearsal Timing
							</Label>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label
										htmlFor="rehearsalStart"
										className="text-xs text-gray-500 mb-1 block"
									>
										Start Time
									</Label>
									<Input
										id="rehearsalStart"
										type="time"
										value={
											formData.rehearsalTiming.split(
												" - ",
											)[0] || ""
										}
										onChange={(e) => {
											const endTime =
												formData.rehearsalTiming.split(
													" - ",
												)[1] || "";
											setFormData((prev) => ({
												...prev,
												rehearsalTiming: endTime
													? `${e.target.value} - ${endTime}`
													: e.target.value,
											}));
										}}
										className="w-full"
									/>
								</div>
								<div>
									<Label
										htmlFor="rehearsalEnd"
										className="text-xs text-gray-500 mb-1 block"
									>
										End Time
									</Label>
									<Input
										id="rehearsalEnd"
										type="time"
										value={
											formData.rehearsalTiming.split(
												" - ",
											)[1] || ""
										}
										onChange={(e) => {
											const startTime =
												formData.rehearsalTiming.split(
													" - ",
												)[0] || "";
											setFormData((prev) => ({
												...prev,
												rehearsalTiming: startTime
													? `${startTime} - ${e.target.value}`
													: `- ${e.target.value}`,
											}));
										}}
										className="w-full"
									/>
								</div>
							</div>
						</div>

						{/* Location */}
						<div className="space-y-2">
							<Label
								htmlFor="location"
								className="flex items-center gap-2"
							>
								<MapPin className="h-4 w-4 text-red-600" />
								Location
							</Label>
							<Input
								id="location"
								placeholder="e.g., Main Stage, Ballroom A"
								value={formData.location}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										location: e.target.value,
									}))
								}
							/>
						</div>

						{/* Showtime */}
						<div className="space-y-2">
							<Label
								htmlFor="showtime"
								className="flex items-center gap-2"
							>
								<Clock className="h-4 w-4 text-green-600" />
								Showtime
							</Label>
							<Input
								id="showtime"
								type="time"
								value={formData.showtime}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										showtime: e.target.value,
									}))
								}
							/>
						</div>

						{/* Backstage Ready Time */}
						<div className="space-y-2">
							<Label
								htmlFor="backstageReadyTime"
								className="flex items-center gap-2"
							>
								<Clock className="h-4 w-4 text-orange-600" />
								Be Ready Backstage
							</Label>
							<Input
								id="backstageReadyTime"
								type="time"
								value={formData.backstageReadyTime}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										backstageReadyTime: e.target.value,
									}))
								}
							/>
						</div>

						{/* Stage Manager Name */}
						<div className="space-y-2">
							<Label
								htmlFor="stageManagerName"
								className="flex items-center gap-2"
							>
								<User className="h-4 w-4 text-purple-600" />
								Stage Manager Name
							</Label>
							<Input
								id="stageManagerName"
								placeholder="Your name"
								value={formData.stageManagerName}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										stageManagerName: e.target.value,
									}))
								}
							/>
						</div>

						{/* Stage Manager Contact */}
						<div className="space-y-2">
							<Label
								htmlFor="stageManagerContact"
								className="flex items-center gap-2"
							>
								<Phone className="h-4 w-4 text-teal-600" />
								Stage Manager Contact Number
							</Label>
							<Input
								id="stageManagerContact"
								placeholder="e.g., +1 234 567 8900"
								value={formData.stageManagerContact}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										stageManagerContact: e.target.value,
									}))
								}
							/>
						</div>

						{/* Notes */}
						<div className="space-y-2">
							<Label
								htmlFor="notes"
								className="flex items-center gap-2"
							>
								<FileText className="h-4 w-4 text-gray-600" />
								Notes
							</Label>
							<Textarea
								id="notes"
								placeholder="Any additional notes for artists..."
								value={formData.notes}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										notes: e.target.value,
									}))
								}
								rows={3}
							/>
						</div>

						{/* PDF Attachments */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Upload className="h-4 w-4 text-indigo-600" />
								Attachments (PDF)
							</Label>
							<div className="border-2 border-dashed rounded-lg p-4 bg-gray-50">
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf,application/pdf"
									onChange={handleFileUpload}
									className="hidden"
									id="pdf-upload"
								/>
								<label
									htmlFor="pdf-upload"
									className="flex flex-col items-center justify-center cursor-pointer"
								>
									{uploadingFile ? (
										<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
									) : (
										<>
											<Upload className="h-8 w-8 text-gray-400 mb-2" />
											<span className="text-sm text-gray-600">
												Click to upload PDF
											</span>
											<span className="text-xs text-gray-400">
												Max 10MB
											</span>
										</>
									)}
								</label>
							</div>

							{/* Uploaded Files List */}
							{formData.attachments.length > 0 && (
								<div className="space-y-2 mt-3">
									{formData.attachments.map((attachment) => (
										<div
											key={attachment.id}
											className="flex items-center justify-between p-2 bg-white border rounded-lg"
										>
											<div className="flex items-center gap-2">
												<FileText className="h-4 w-4 text-red-500" />
												<span className="text-sm truncate max-w-[200px]">
													{attachment.originalName}
												</span>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													removeAttachment(
														attachment.id,
													)
												}
												className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowInfoModal(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={saveShowDateInfo}
							disabled={savingInfo}
							className="bg-purple-600 hover:bg-purple-700"
						>
							{savingInfo ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Bell className="mr-2 h-4 w-4" />
									{selectedShowDate &&
									showDateInfoMap.has(
										format(selectedShowDate, "yyyy-MM-dd"),
									)
										? "Update & Notify Artists"
										: "Save & Notify Artists"}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<UpgradeModal
				open={upgradeModalOpen}
				onOpenChange={(open) => {
					setUpgradeModalOpen(open);
					if (!open) clearUpgraded();
				}}
				type="stage_manager"
				currentCount={subData?.currentEventCount ?? 0}
				maxCount={subData?.maxEvents ?? 1}
				justUpgraded={justUpgraded}
				planType={planType}
				userEmail={subData?.userEmail}
				userId={subData?.userId}
			/>
		</div>
	);
}
