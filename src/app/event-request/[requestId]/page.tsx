"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BaseShow, EventRequest } from "@/types/famelink";
import { Calendar, MapPin, Check, X, ArrowRight } from "lucide-react";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

interface EventSummary {
	id: string;
	name: string;
	description?: string;
	showDates?: string[];
	venue?: string;
}

export default function EventRequestPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const requestId = params.requestId as string;

	const [loading, setLoading] = useState(true);
	const [request, setRequest] = useState<EventRequest | null>(null);
	const [event, setEvent] = useState<EventSummary | null>(null);
	const [shows, setShows] = useState<BaseShow[]>([]);
	const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
	const [step, setStep] = useState<"view" | "select" | "confirm">("view");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	useEffect(() => {
		checkAuth();
		fetchRequest();
	}, [requestId]);

	const checkAuth = () => {
		const session = localStorage.getItem("artistSession");
		setIsLoggedIn(!!session);
	};

	const fetchRequest = async () => {
		try {
			const response = await fetch(`/api/event-requests/${requestId}`);
			const data = await response.json();

			if (data.success) {
				setRequest(data.data.request);
				setEvent(data.data.event);
				if (isLoggedIn) {
					fetchShows();
				}
			} else {
				toast({
					title: "Error",
					description:
						data.error?.message || "Failed to load request",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error fetching request:", error);
			toast({
				title: "Error",
				description: "Failed to load request",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchShows = async () => {
		try {
			const response = await fetch("/api/shows");
			const data = await response.json();
			if (data.success) {
				setShows(data.data.shows || []);
			}
		} catch (error) {
			console.error("Error fetching shows:", error);
		}
	};

	const handleLogin = () => {
		router.push(`/?eventRequestId=${requestId}`);
	};

	const handleSelectShow = () => {
		if (!isLoggedIn) {
			handleLogin();
			return;
		}
		fetchShows();
		setStep("select");
	};

	const handleConfirm = () => {
		if (!selectedShowId) {
			toast({
				title: "Select a Show",
				description: "Please select a show to continue",
			});
			return;
		}
		setStep("confirm");
	};

	const handleSubmit = async (action: "accept" | "decline") => {
		setIsSubmitting(true);
		try {
			const response = await fetch(
				`/api/event-requests/${requestId}/respond`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action,
						baseShowId:
							action === "accept" ? selectedShowId : undefined,
					}),
				},
			);

			const data = await response.json();

			if (data.success) {
				toast({
					title:
						action === "accept"
							? "Request Accepted!"
							: "Request Declined",
					description:
						action === "accept"
							? "You've been added to the event. Check your dashboard for details."
							: "The request has been declined.",
				});
				router.push("/artist-dashboard");
			} else {
				toast({
					title: "Error",
					description: data.error?.message || "Failed to respond",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error responding:", error);
			toast({
				title: "Error",
				description: "Failed to respond",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!request || !event) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Card className="max-w-md">
					<CardContent className="py-8 text-center">
						<p className="text-gray-500">
							Request not found or has expired.
						</p>
						<Button
							className="mt-4"
							onClick={() => router.push("/")}
						>
							Go to Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-2xl mx-auto">
				{/* Event Info */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>{event.name}</CardTitle>
						{event.description && (
							<CardDescription>
								{event.description}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent className="space-y-2">
						{event.venue && (
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<MapPin className="h-4 w-4" /> {event.venue}
							</div>
						)}
						{event.showDates && event.showDates.length > 0 && (
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<Calendar className="h-4 w-4" />
								{event.showDates
									.map((d) =>
										new Date(d).toLocaleDateString(),
									)
									.join(", ")}
							</div>
						)}
						{request.message && (
							<div className="mt-4 p-3 bg-gray-100 rounded">
								<p className="text-sm font-medium">
									Message from organizer:
								</p>
								<p className="text-sm text-gray-600">
									{request.message}
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Step: View */}
				{step === "view" && (
					<Card>
						<CardHeader>
							<CardTitle>You've Been Invited!</CardTitle>
							<CardDescription>
								You've received an invitation to perform at this
								event.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{!isLoggedIn ? (
								<Button
									onClick={handleLogin}
									className="w-full"
								>
									Login to Respond{" "}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							) : (
								<div className="flex gap-4">
									<Button
										onClick={handleSelectShow}
										className="flex-1"
									>
										Accept & Select Show{" "}
										<Check className="ml-2 h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										onClick={() => handleSubmit("decline")}
										disabled={isSubmitting}
									>
										Decline <X className="ml-2 h-4 w-4" />
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Step: Select Show */}
				{step === "select" && (
					<Card>
						<CardHeader>
							<CardTitle>Select a Show</CardTitle>
							<CardDescription>
								Choose which show profile to use for this event.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{shows.length === 0 ? (
								<div className="text-center py-4">
									<p className="text-gray-500 mb-4">
										You don't have any shows yet.
									</p>
									<Button
										onClick={() =>
											router.push(
												"/artist-dashboard/shows",
											)
										}
									>
										Create a Show First
									</Button>
								</div>
							) : (
								<>
									<div className="space-y-2">
										{shows.map((show) => (
											<div
												key={show.id}
												onClick={() =>
													setSelectedShowId(show.id)
												}
												className={`p-4 border rounded-lg cursor-pointer transition-colors ${
													selectedShowId === show.id
														? "border-primary bg-primary/5"
														: "hover:border-gray-300"
												}`}
											>
												<div className="flex items-center justify-between">
													<div>
														<h4 className="font-medium">
															{show.name}
														</h4>
														<p className="text-sm text-gray-500">
															{show.style} •{" "}
															{show.duration} min
														</p>
													</div>
													{selectedShowId ===
														show.id && (
														<Check className="h-5 w-5 text-primary" />
													)}
												</div>
											</div>
										))}
									</div>
									<div className="flex gap-4">
										<Button
											variant="outline"
											onClick={() => setStep("view")}
										>
											Back
										</Button>
										<Button
											onClick={handleConfirm}
											disabled={!selectedShowId}
											className="flex-1"
										>
											Continue{" "}
											<ArrowRight className="ml-2 h-4 w-4" />
										</Button>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				)}

				{/* Step: Confirm */}
				{step === "confirm" && (
					<Card>
						<CardHeader>
							<CardTitle>Confirm Your Response</CardTitle>
							<CardDescription>
								You're about to accept this invitation with the
								selected show.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-4 bg-gray-50 rounded-lg">
								<p className="text-sm font-medium">
									Selected Show:
								</p>
								<p className="text-lg">
									{
										shows.find(
											(s) => s.id === selectedShowId,
										)?.name
									}
								</p>
							</div>
							<p className="text-sm text-gray-600">
								By accepting, your show information will be
								shared with the event organizer. They may make
								event-specific adjustments, but your original
								show profile will remain unchanged.
							</p>
							<div className="flex gap-4">
								<Button
									variant="outline"
									onClick={() => setStep("select")}
								>
									Back
								</Button>
								<Button
									onClick={() => handleSubmit("accept")}
									disabled={isSubmitting}
									className="flex-1"
								>
									{isSubmitting
										? "Submitting..."
										: "Confirm & Accept"}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="light" />
				</div>
			</div>
		</div>
	);
}
