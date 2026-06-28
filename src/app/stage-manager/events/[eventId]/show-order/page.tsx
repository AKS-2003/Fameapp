"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	ArrowLeft,
	Clock,
	Music,
	User,
	GripVertical,
	Plus,
	Save,
	Eye,
	Edit,
	Trash2,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface Artist {
	id: string;
	artistName: string;
	realName: string;
	style: string;
	performanceDuration: number;
	status: string;
}

interface ShowOrderItem {
	id: string;
	artistId: string;
	artist: Artist;
	position: number;
	startTime: string;
	endTime: string;
	notes: string;
	setupTime: number; // minutes
	breakTime: number; // minutes after performance
}

interface ShowOrder {
	id: string;
	eventId: string;
	eventName: string;
	showDate: string;
	startTime: string;
	totalDuration: number;
	items: ShowOrderItem[];
	status: "draft" | "published" | "active" | "completed";
	createdAt: string;
	updatedAt: string;
}

export default function ShowOrderManagement() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	const [artists, setArtists] = useState<Artist[]>([]);
	const [showOrder, setShowOrder] = useState<ShowOrder | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
	const [showOrderForm, setShowOrderForm] = useState({
		showDate: "",
		startTime: "19:00",
		notes: "",
	});
	const [wsConnected, setWsConnected] = useState(false);
	const [isDraftShowOrder, setIsDraftShowOrder] = useState<boolean>(true);
	const [isShowOrderConfirmed, setIsShowOrderConfirmed] =
		useState<boolean>(false);

	useEffect(() => {
		fetchData();
		initializeWebSocket();
	}, [eventId]);

	const fetchData = async () => {
		try {
			// Fetch approved artists
			const artistsResponse = await fetch(
				`/api/events/${eventId}/artists`,
			);
			if (artistsResponse.ok) {
				const artistsData = await artistsResponse.json();
				const approvedArtists =
					artistsData.artists?.filter(
						(artist: Artist) => artist.status === "approved",
					) || [];
				setArtists(approvedArtists);
			}

			// Fetch existing show order
			const showOrderResponse = await fetch(
				`/api/events/${eventId}/show-order`,
			);
			if (showOrderResponse.ok) {
				const showOrderData = await showOrderResponse.json();
				setShowOrder(showOrderData);
				if (showOrderData) {
					setShowOrderForm({
						showDate: showOrderData.showDate,
						startTime: showOrderData.startTime,
						notes: showOrderData.notes || "",
					});
				}
			}

			// Fetch show order metadata for draft/confirmed status
			// Try fetching with the show date if available
			try {
				const dateParam = showOrderForm.showDate
					? `?performanceDate=${showOrderForm.showDate}`
					: "";
				const metadataResponse = await fetch(
					`/api/events/${eventId}/show-order${dateParam}`,
				);
				if (metadataResponse.ok) {
					const metadataResult = await metadataResponse.json();
					if (metadataResult.success && metadataResult.data) {
						setIsDraftShowOrder(
							metadataResult.data.isDraft !== false,
						);
						setIsShowOrderConfirmed(
							metadataResult.data.isConfirmed === true,
						);
					}
				}
			} catch (metadataError) {
				console.error(
					"Error fetching show order metadata:",
					metadataError,
				);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const createShowOrder = async () => {
		if (!showOrderForm.showDate || !showOrderForm.startTime) {
			alert("Please fill in show date and start time");
			return;
		}

		setSaving(true);
		try {
			const newShowOrder: ShowOrder = {
				id: `show_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`,
				eventId,
				eventName: "Event Name", // Would be fetched from event data
				showDate: showOrderForm.showDate,
				startTime: showOrderForm.startTime,
				totalDuration: 0,
				items: [],
				status: "draft",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const response = await fetch(`/api/events/${eventId}/show-order`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newShowOrder),
			});

			if (response.ok) {
				const data = await response.json();
				setShowOrder(data.showOrder);
			}
		} catch (error) {
			console.error("Error creating show order:", error);
		} finally {
			setSaving(false);
		}
	};

	const addArtistToShowOrder = (artist: Artist) => {
		if (!showOrder) return;

		const newItem: ShowOrderItem = {
			id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			artistId: artist.id,
			artist,
			position: showOrder.items.length + 1,
			startTime: calculateStartTime(showOrder.items.length),
			endTime: calculateEndTime(
				showOrder.items.length,
				artist.performanceDuration,
			),
			notes: "",
			setupTime: 5, // default 5 minutes setup
			breakTime: 5, // default 5 minutes break
		};

		const updatedShowOrder = {
			...showOrder,
			items: [...showOrder.items, newItem],
			updatedAt: new Date().toISOString(),
		};

		setShowOrder(updatedShowOrder);
		saveShowOrder(updatedShowOrder);
	};

	const removeArtistFromShowOrder = (itemId: string) => {
		if (!showOrder) return;

		const updatedItems = showOrder.items
			.filter((item) => item.id !== itemId)
			.map((item, index) => ({
				...item,
				position: index + 1,
				startTime: calculateStartTime(index),
				endTime: calculateEndTime(
					index,
					item.artist.performanceDuration,
				),
			}));

		const updatedShowOrder = {
			...showOrder,
			items: updatedItems,
			updatedAt: new Date().toISOString(),
		};

		setShowOrder(updatedShowOrder);
		saveShowOrder(updatedShowOrder);
	};

	const moveItem = (fromIndex: number, toIndex: number) => {
		if (!showOrder) return;

		const items = Array.from(showOrder.items);
		const [reorderedItem] = items.splice(fromIndex, 1);
		items.splice(toIndex, 0, reorderedItem);

		// Update positions and times
		const updatedItems = items.map((item, index) => ({
			...item,
			position: index + 1,
			startTime: calculateStartTime(index),
			endTime: calculateEndTime(index, item.artist.performanceDuration),
		}));

		const updatedShowOrder = {
			...showOrder,
			items: updatedItems,
			updatedAt: new Date().toISOString(),
		};

		setShowOrder(updatedShowOrder);
		saveShowOrder(updatedShowOrder);
	};

	const calculateStartTime = (index: number): string => {
		if (!showOrder || index === 0) {
			return showOrder?.startTime || "19:00";
		}

		let totalMinutes = 0;
		const [hours, minutes] = showOrder.startTime.split(":").map(Number);
		totalMinutes = hours * 60 + minutes;

		for (let i = 0; i < index; i++) {
			const item = showOrder.items[i];
			totalMinutes +=
				item.setupTime +
				item.artist.performanceDuration +
				item.breakTime;
		}

		const newHours = Math.floor(totalMinutes / 60);
		const newMinutes = totalMinutes % 60;
		return `${newHours.toString().padStart(2, "0")}:${newMinutes
			.toString()
			.padStart(2, "0")}`;
	};

	const calculateEndTime = (index: number, duration: number): string => {
		const startTime = calculateStartTime(index);
		const [hours, minutes] = startTime.split(":").map(Number);
		const totalMinutes = hours * 60 + minutes + duration;

		const endHours = Math.floor(totalMinutes / 60);
		const endMinutes = totalMinutes % 60;
		return `${endHours.toString().padStart(2, "0")}:${endMinutes
			.toString()
			.padStart(2, "0")}`;
	};

	const initializeWebSocket = async () => {
		try {
			const { createWebSocketManager } =
				await import("@/lib/websocket-manager");

			const wsManager = createWebSocketManager({
				eventId,
				role: "stage_manager",
				userId: `stage_manager_show_order_${eventId}`,
				showToasts: false,
				onConnect: () => {
					console.log("Show Order WebSocket connected");
					setWsConnected(true);
				},
				onDisconnect: () => {
					console.log("Show Order WebSocket disconnected");
					setWsConnected(false);
				},
				onDataUpdate: () => {
					console.log("Show order data update triggered");
					fetchData();
				},
			});

			await wsManager.initialize();

			// Listen for show-order-updated events for real-time draft/confirmed status
			wsManager.on("show-order-updated", (data: any) => {
				if (data.eventId === eventId) {
					if (data.isDraft !== undefined) {
						setIsDraftShowOrder(data.isDraft);
					}
					if (data.isConfirmed !== undefined) {
						setIsShowOrderConfirmed(data.isConfirmed);
					}
				}
			});

			// Store reference for cleanup and emitting events
			(window as any).showOrderWsManager = wsManager;

			return () => {
				if ((window as any).showOrderWsManager) {
					(window as any).showOrderWsManager.destroy();
					delete (window as any).showOrderWsManager;
				}
			};
		} catch (error) {
			console.error("Failed to initialize WebSocket:", error);
		}
	};

	const saveShowOrder = async (orderToSave: ShowOrder) => {
		try {
			await fetch(`/api/events/${eventId}/show-order`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(orderToSave),
			});

			// Emit WebSocket event for real-time updates
			const wsManager = (window as any).showOrderWsManager;
			if (wsManager) {
				wsManager.emit("performance-order-update", {
					eventId,
					type: "show_order",
					action: "updated",
				});
			}
		} catch (error) {
			console.error("Error saving show order:", error);
		}
	};

	const publishShowOrder = async () => {
		if (!showOrder) return;

		setSaving(true);
		try {
			const updatedShowOrder = {
				...showOrder,
				status: "published" as const,
				updatedAt: new Date().toISOString(),
			};

			const response = await fetch(
				`/api/events/${eventId}/show-order/publish`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(updatedShowOrder),
				},
			);

			if (response.ok) {
				setShowOrder(updatedShowOrder);

				// Emit WebSocket event for real-time updates
				const wsManager = (window as any).showOrderWsManager;
				if (wsManager) {
					wsManager.emit("performance-order-update", {
						eventId,
						type: "show_order",
						action: "published",
					});
				}

				alert("Show order published! Artists will be notified.");
			}
		} catch (error) {
			console.error("Error publishing show order:", error);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading show order...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link
								href={`/stage-manager/events/${eventId}`}
								className="mr-4"
							>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Event
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
								<h1 className="text-xl font-semibold text-gray-900">
									Show Order Management
								</h1>
								<p className="text-sm text-gray-500">
									Create and manage the performance schedule
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{showOrder && (
								<Button
									onClick={publishShowOrder}
									disabled={
										saving ||
										showOrder.status === "published"
									}
								>
									{showOrder.status === "published"
										? "Published"
										: "Publish Show Order"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Draft / Confirmed Banner */}
				{isDraftShowOrder && !isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-yellow-400 bg-yellow-50 px-4 py-4">
						<Edit className="h-8 w-8 text-yellow-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-yellow-700 leading-tight">
							DRAFT ORDER
						</p>
					</div>
				)}
				{!isDraftShowOrder && isShowOrderConfirmed && (
					<div className="mb-4 sm:mb-6 flex items-center justify-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-4">
						<Eye className="h-8 w-8 text-green-600 flex-shrink-0" />
						<p className="text-3xl sm:text-4xl md:text-[48px] font-bold text-green-700 leading-tight">
							CONFIRMED ORDER LIST
						</p>
					</div>
				)}

				{!showOrder ? (
					/* Create Show Order Form */
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<Card className="max-w-2xl mx-auto">
							<CardHeader>
								<CardTitle>Create Show Order</CardTitle>
								<p className="text-muted-foreground">
									Set up the basic information for your show
								</p>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="showDate">
											Show Date
										</Label>
										<Input
											id="showDate"
											type="date"
											value={showOrderForm.showDate}
											onChange={(e) =>
												setShowOrderForm({
													...showOrderForm,
													showDate: e.target.value,
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="startTime">
											Start Time
										</Label>
										<Input
											id="startTime"
											type="time"
											value={showOrderForm.startTime}
											onChange={(e) =>
												setShowOrderForm({
													...showOrderForm,
													startTime: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="notes">Notes</Label>
									<Textarea
										id="notes"
										placeholder="Any special notes for the show..."
										value={showOrderForm.notes}
										onChange={(e) =>
											setShowOrderForm({
												...showOrderForm,
												notes: e.target.value,
											})
										}
									/>
								</div>
								<Button
									onClick={createShowOrder}
									disabled={saving}
									className="w-full"
								>
									{saving
										? "Creating..."
										: "Create Show Order"}
								</Button>
							</CardContent>
						</Card>
					</motion.div>
				) : (
					/* Show Order Management */
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Available Artists */}
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
						>
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<User className="h-5 w-5" />
										Available Artists
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										Approved artists ready to perform
									</p>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{artists
											.filter(
												(artist) =>
													!showOrder.items.some(
														(item) =>
															item.artistId ===
															artist.id,
													),
											)
											.map((artist) => (
												<div
													key={artist.id}
													className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
												>
													<div>
														<p className="font-medium">
															{artist.artistName}
														</p>
														<p className="text-sm text-muted-foreground">
															{artist.style} -{" "}
															{
																artist.performanceDuration
															}{" "}
															min
														</p>
													</div>
													<Button
														size="sm"
														onClick={() =>
															addArtistToShowOrder(
																artist,
															)
														}
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
											))}
									</div>
								</CardContent>
							</Card>
						</motion.div>

						{/* Show Order */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="lg:col-span-2"
						>
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Music className="h-5 w-5" />
												Show Order
											</CardTitle>
											<p className="text-sm text-muted-foreground">
												{showOrder.showDate} at{" "}
												{showOrder.startTime}
											</p>
										</div>
										<Badge
											variant={
												showOrder.status === "published"
													? "default"
													: "secondary"
											}
										>
											{showOrder.status}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									{showOrder.items.length === 0 ? (
										<div className="text-center py-8">
											<Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
											<p className="text-gray-500">
												No artists added to the show
												order yet
											</p>
										</div>
									) : (
										<div className="space-y-2">
											{showOrder.items.map(
												(item, index) => (
													<div
														key={item.id}
														className="p-4 border rounded-lg bg-white"
													>
														<div className="flex items-center gap-4">
															<div className="cursor-grab">
																<GripVertical className="h-5 w-5 text-gray-400" />
															</div>
															<div className="flex-1">
																<div className="flex items-center justify-between">
																	<div>
																		<p className="font-medium">
																			{
																				item.position
																			}
																			.{" "}
																			{
																				item
																					.artist
																					.artistName
																			}
																		</p>
																		<p className="text-sm text-muted-foreground">
																			{
																				item
																					.artist
																					.style
																			}{" "}
																			-{" "}
																			{
																				item
																					.artist
																					.performanceDuration
																			}{" "}
																			min
																		</p>
																	</div>
																	<div className="text-right">
																		<p className="text-sm font-medium">
																			{
																				item.startTime
																			}{" "}
																			-{" "}
																			{
																				item.endTime
																			}
																		</p>
																		<p className="text-xs text-muted-foreground">
																			Setup:{" "}
																			{
																				item.setupTime
																			}
																			min
																			-
																			Break:{" "}
																			{
																				item.breakTime
																			}
																			min
																		</p>
																	</div>
																</div>
															</div>
															<div className="flex gap-2">
																{index > 0 && (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			moveItem(
																				index,
																				index -
																					1,
																			)
																		}
																	>
																		Up
																	</Button>
																)}
																{index <
																	showOrder
																		.items
																		.length -
																		1 && (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			moveItem(
																				index,
																				index +
																					1,
																			)
																		}
																	>
																		Down
																	</Button>
																)}
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		removeArtistFromShowOrder(
																			item.id,
																		)
																	}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</div>
														</div>
													</div>
												),
											)}
										</div>
									)}
								</CardContent>
							</Card>
						</motion.div>
					</div>
				)}
			</div>
		</div>
	);
}
