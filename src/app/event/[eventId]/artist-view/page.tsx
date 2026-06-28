"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
	ArrowLeft,
	Calendar,
	MapPin,
	Clock,
	Users,
	Music,
	Settings,
	Image,
	Info,
} from "lucide-react";

interface EventData {
	id: string;
	name: string;
	description?: string;
	venue?: string;
	showDates?: string[];
}

interface EventShowData {
	id: string;
	status: string;
	performanceStatus: string;
	snapshot: any;
	overrides: any;
}

export default function ArtistEventViewPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [loading, setLoading] = useState(true);
	const [event, setEvent] = useState<EventData | null>(null);
	const [eventShow, setEventShow] = useState<EventShowData | null>(null);
	const [activeTab, setActiveTab] = useState("live-board");

	useEffect(() => {
		fetchEventData();
	}, [eventId]);

	const fetchEventData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/artist-view`);
			const data = await response.json();

			if (data.success) {
				setEvent(data.data.event);
				setEventShow(data.data.eventShow);
			} else {
				toast({
					title: "Error",
					description: data.error?.message || "Failed to load event",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error fetching event:", error);
			toast({
				title: "Error",
				description: "Failed to load event",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Card className="max-w-md">
					<CardContent className="py-8 text-center">
						<p className="text-gray-500">
							Event not found or you don't have access.
						</p>
						<Button
							className="mt-4"
							onClick={() => router.push("/artist-dashboard")}
						>
							Back to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const showData = eventShow?.snapshot || {};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b px-6 py-4">
				<div className="max-w-6xl mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							onClick={() => router.push("/artist-dashboard")}
						>
							<ArrowLeft className="h-4 w-4 mr-2" /> Back
						</Button>
						<div>
							<h1 className="text-xl font-bold">{event.name}</h1>
							<div className="flex items-center gap-4 text-sm text-gray-500">
								{event.venue && (
									<span className="flex items-center gap-1">
										<MapPin className="h-3 w-3" />{" "}
										{event.venue}
									</span>
								)}
								{eventShow && (
									<Badge
										variant={
											eventShow.status === "confirmed"
												? "default"
												: "secondary"
										}
									>
										{eventShow.status}
									</Badge>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-6xl mx-auto p-6">
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="mb-6">
						<TabsTrigger value="live-board">Live Board</TabsTrigger>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="music">Music</TabsTrigger>
						<TabsTrigger value="technical">Technical</TabsTrigger>
						<TabsTrigger value="gallery">Gallery</TabsTrigger>
						<TabsTrigger value="artists">
							Assigned Artists
						</TabsTrigger>
						<TabsTrigger value="details">Event Details</TabsTrigger>
					</TabsList>

					{/* Live Board Tab */}
					<TabsContent value="live-board">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Clock className="h-5 w-5" /> Live Board
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-500">
									Live performance order and status will
									appear here during the event.
								</p>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Overview Tab */}
					<TabsContent value="overview">
						<Card>
							<CardHeader>
								<CardTitle>
									Your Show: {showData.name || "N/A"}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<p className="text-sm font-medium text-gray-500">
										Style
									</p>
									<p>{showData.style || "Not specified"}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-500">
										Duration
									</p>
									<p>
										{eventShow?.overrides?.duration ||
											showData.duration ||
											0}{" "}
										minutes
									</p>
								</div>
								<div>
									<p className="text-sm font-medium text-gray-500">
										Description
									</p>
									<p>
										{showData.description ||
											"No description"}
									</p>
								</div>
								{eventShow?.overrides?.performanceNotes && (
									<div className="p-3 bg-yellow-50 rounded">
										<p className="text-sm font-medium">
											Stage Manager Notes:
										</p>
										<p className="text-sm">
											{
												eventShow.overrides
													.performanceNotes
											}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Music Tab */}
					<TabsContent value="music">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Music className="h-5 w-5" /> Music
								</CardTitle>
							</CardHeader>
							<CardContent>
								{showData.music?.tracks?.length > 0 ? (
									<div className="space-y-2">
										{showData.music.tracks.map(
											(track: any, i: number) => (
												<div
													key={i}
													className="p-3 border rounded"
												>
													<p className="font-medium">
														{track.name}
													</p>
													<p className="text-sm text-gray-500">
														{track.artist} •{" "}
														{track.duration}s
													</p>
												</div>
											),
										)}
									</div>
								) : (
									<p className="text-gray-500">
										No music tracks specified.
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Technical Tab */}
					<TabsContent value="technical">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Settings className="h-5 w-5" /> Technical
									Rider
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{showData.techRider ? (
									<>
										<div>
											<p className="text-sm font-medium text-gray-500">
												Stage Requirements
											</p>
											<p>
												{showData.techRider
													.stageRequirements ||
													"None specified"}
											</p>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-500">
												Sound Requirements
											</p>
											<p>
												{showData.techRider
													.soundRequirements ||
													"None specified"}
											</p>
										</div>
										<div>
											<p className="text-sm font-medium text-gray-500">
												Lighting Requirements
											</p>
											<p>
												{showData.techRider
													.lightingRequirements ||
													"None specified"}
											</p>
										</div>
									</>
								) : (
									<p className="text-gray-500">
										No technical requirements specified.
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Gallery Tab */}
					<TabsContent value="gallery">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Image className="h-5 w-5" /> Gallery
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-500">
									Photos and videos will appear here.
								</p>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Assigned Artists Tab */}
					<TabsContent value="artists">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" /> Assigned
									Artists
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-500">
									Other artists performing at this event will
									appear here.
								</p>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Event Details Tab */}
					<TabsContent value="details">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Info className="h-5 w-5" /> Event Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<p className="text-sm font-medium text-gray-500">
										Event Name
									</p>
									<p>{event.name}</p>
								</div>
								{event.venue && (
									<div>
										<p className="text-sm font-medium text-gray-500">
											Venue
										</p>
										<p>{event.venue}</p>
									</div>
								)}
								{event.showDates &&
									event.showDates.length > 0 && (
										<div>
											<p className="text-sm font-medium text-gray-500">
												Show Dates
											</p>
											<div className="flex flex-wrap gap-2 mt-1">
												{event.showDates.map(
													(date, i) => (
														<Badge
															key={i}
															variant="outline"
														>
															{new Date(
																date,
															).toLocaleDateString()}
														</Badge>
													),
												)}
											</div>
										</div>
									)}
								{event.description && (
									<div>
										<p className="text-sm font-medium text-gray-500">
											Description
										</p>
										<p>{event.description}</p>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
