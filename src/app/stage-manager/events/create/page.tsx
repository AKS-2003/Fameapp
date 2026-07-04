"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	Loader2,
	Upload,
	Image as ImageIcon,
	Sparkles,
	Crown,
	FileText,
	Plane,
	Music2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, EventFormData } from "@/lib/schemas/event";
import { motion } from "framer-motion";
import { uploadToGCS } from "@/lib/upload-utils";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function CreateEventPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);
	const [user, setUser] = useState<any>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string>("");
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [artistEditEnabled, setArtistEditEnabled] = useState(false);
	const [registrationLinkEnabled, setRegistrationLinkEnabled] =
		useState(true);
	// Workflow toggles — Agreement is always mandatory and must always be completed first
	const contractEnabled = true;
	const requireContractFirst = true;
	const [logisticsEnabled, setLogisticsEnabled] = useState(true);
	const [showInfoEnabled, setShowInfoEnabled] = useState(true);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const {
		data: subData,
		loading: subLoading,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();

	const canCreate = true;

	useEffect(() => {
		fetchUserProfile();
	}, []);

	const fetchUserProfile = async () => {
		try {
			const response = await fetch("/api/stage-manager/profile");
			const result = await response.json();

			if (result.success && result.data?.user) {
				const userData = result.data.user;
				setUser({
					name:
						`${userData.profile?.firstName || ""} ${
							userData.profile?.lastName || ""
						}`.trim() || userData.email,
					email: userData.email,
					role: userData.role,
				});
			}
		} catch (error) {
			console.error("Error fetching user profile:", error);
		}
	};

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<EventFormData>({
		resolver: zodResolver(eventFormSchema),
	});

	const startDate = watch("startDate");
	const endDate = watch("endDate");

	const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate image
		if (!file.type.startsWith("image/")) {
			alert("Please upload an image file (PNG, JPG, etc.)");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			alert("Image must be under 5MB");
			return;
		}

		setLogoFile(file);
		const reader = new FileReader();
		reader.onloadend = () => {
			setLogoPreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const onSubmit = async (data: EventFormData) => {
		try {
			setLoading(true);

			let logoUrl = "";

			// Upload logo if provided
			if (logoFile) {
				setUploadingLogo(true);
				try {
					const result = await uploadToGCS({
						file: logoFile,
						eventId: "temp",
						artistId: "event-logo",
						fileType: "event-logo",
					});
					logoUrl = result.fileName;
				} finally {
					setUploadingLogo(false);
				}
			}

			const response = await fetch("/api/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: data.name,
					venueName: data.venueName,
					startDate: data.startDate.toISOString(),
					endDate: data.endDate.toISOString(),
					description: data.description,
					logoUrl: logoUrl,
					artist_edit_enabled: artistEditEnabled,
					registration_link_enabled: registrationLinkEnabled,
					contractEnabled,
					logisticsEnabled,
					showInfoEnabled,
					requireContractFirst,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				// Redirect to show-dates page after successful creation
				router.push(
					`/stage-manager/events/${result.data.id}/show-dates`,
				);
			} else {
				const errorResult = await response.json();
				console.error("Failed to create event:", errorResult.error);
				alert("Failed to create event. Please try again.");
			}
		} catch (error) {
			console.error("Error creating event:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link href="/stage-manager" className="mr-4">
								<Button variant="ghost" size="sm">
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
								<h1 className="text-xl font-semibold text-gray-900">
									Create New Event
								</h1>
								<p className="text-xs sm:text-sm text-gray-500 truncate">
									{user ? (
										<>
											{user.name} - {user.email} - Stage
											Manager
										</>
									) : (
										"Stage Manager"
									)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</header>

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

			<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<Card className="shadow-lg bg-white">
						<CardHeader>
							<CardTitle className="text-2xl font-bold text-gray-900">
								Create New Event
							</CardTitle>
							<CardDescription className="text-gray-600">
								Create a new event that can be assigned to stage
								managers and artists.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleSubmit(onSubmit)}
								className="space-y-6"
							>
								{/* Event Logo */}
								<div className="space-y-2">
									<Label className="text-gray-700 font-medium">
										Event Logo
									</Label>
									<div className="flex flex-col md:flex-row items-center gap-6">
										<div className="relative">
											{logoPreview ? (
												<img
													src={logoPreview}
													alt="Event Logo"
													className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-lg"
												/>
											) : (
												<div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-purple-200 shadow-lg">
													<ImageIcon className="h-16 w-16 text-purple-400" />
												</div>
											)}
											{uploadingLogo && (
												<div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
													<Loader2 className="h-8 w-8 text-white animate-spin" />
												</div>
											)}
										</div>
										<div className="flex-1 w-full">
											<Label
												htmlFor="event-logo"
												className="cursor-pointer block"
											>
												<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 hover:bg-purple-50 transition-all">
													<div className="flex flex-col items-center gap-2">
														<Upload className="h-8 w-8 text-gray-400" />
														<p className="text-sm font-medium text-gray-700">
															{logoPreview
																? "Change event logo"
																: "Upload event logo"}
														</p>
														<p className="text-xs text-gray-500">
															PNG, JPG up to 5MB
														</p>
													</div>
												</div>
											</Label>
											<input
												id="event-logo"
												type="file"
												accept="image/*"
												onChange={handleLogoUpload}
												className="hidden"
												disabled={uploadingLogo}
											/>
										</div>
									</div>
								</div>

								{/* Event Name */}
								<div className="space-y-2">
									<Label
										htmlFor="name"
										className="text-gray-700 font-medium"
									>
										Event Name *
									</Label>
									<Input
										id="name"
										placeholder="Enter event name"
										{...register("name")}
										className={cn(
											"bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all",
											errors.name &&
												"border-red-500 focus:border-red-500 focus:ring-red-200",
										)}
									/>
									{errors.name && (
										<p className="text-sm text-red-600 flex items-center mt-1">
											<span className="mr-1">!</span>
											{errors.name.message}
										</p>
									)}
								</div>

								{/* Venue Name */}
								<div className="space-y-2">
									<Label
										htmlFor="venueName"
										className="text-gray-700 font-medium"
									>
										Venue Name *
									</Label>
									<Input
										id="venueName"
										placeholder="Enter venue name"
										{...register("venueName")}
										className={cn(
											"bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all",
											errors.venueName &&
												"border-red-500 focus:border-red-500 focus:ring-red-200",
										)}
									/>
									{errors.venueName && (
										<p className="text-sm text-red-600 flex items-center mt-1">
											<span className="mr-1">!</span>
											{errors.venueName.message}
										</p>
									)}
								</div>

								{/* Date Range */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Start Date */}
									<div className="space-y-2">
										<Label className="text-gray-700 font-medium">
											Start Date *
										</Label>
										<Popover
											open={showStartCalendar}
											onOpenChange={setShowStartCalendar}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal bg-white border-2 border-gray-200 text-gray-900 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200",
														!startDate &&
															"text-gray-500",
														errors.startDate &&
															"border-red-500 focus:border-red-500 focus:ring-red-200",
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
													{startDate
														? format(
																startDate,
																"PPP",
															)
														: "Pick start date"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto max-w-[95vw] p-0 bg-white border-2 border-gray-200 shadow-xl z-50 rounded-lg"
												align="start"
												side="bottom"
												sideOffset={4}
											>
												<div className="p-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
													<h4 className="font-semibold text-gray-900">
														Select Start Date
													</h4>
													<p className="text-sm text-gray-600">
														Choose when your event
														begins
													</p>
												</div>
												<div className="overflow-x-auto">
													<Calendar
														mode="single"
														selected={startDate}
														onSelect={(
															date:
																| Date
																| undefined,
														) => {
															if (date) {
																setValue(
																	"startDate",
																	date,
																);
																setShowStartCalendar(
																	false,
																);
															}
														}}
														disabled={(
															date: Date,
														) => date < new Date()}
														className="rounded-md border-0 p-2 sm:p-3 min-w-[280px]"
													/>
												</div>
											</PopoverContent>
										</Popover>
										{errors.startDate && (
											<p className="text-sm text-red-600 flex items-center mt-1">
												<span className="mr-1">!</span>
												{errors.startDate.message}
											</p>
										)}
									</div>

									{/* End Date */}
									<div className="space-y-2">
										<Label className="text-gray-700 font-medium">
											End Date *
										</Label>
										<Popover
											open={showEndCalendar}
											onOpenChange={setShowEndCalendar}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal bg-white border-2 border-gray-200 text-gray-900 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200",
														!endDate &&
															"text-gray-500",
														errors.endDate &&
															"border-red-500 focus:border-red-500 focus:ring-red-200",
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
													{endDate
														? format(endDate, "PPP")
														: "Pick end date"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto max-w-[95vw] p-0 bg-white border-2 border-gray-200 shadow-xl z-50 rounded-lg"
												align="start"
												side="bottom"
												sideOffset={4}
											>
												<div className="p-3 border-b bg-gradient-to-r from-purple-50 to-pink-50">
													<h4 className="font-semibold text-gray-900">
														Select End Date
													</h4>
													<p className="text-sm text-gray-600">
														Choose when your event
														ends
													</p>
												</div>
												<div className="overflow-x-auto">
													<Calendar
														mode="single"
														selected={endDate}
														onSelect={(
															date:
																| Date
																| undefined,
														) => {
															if (date) {
																setValue(
																	"endDate",
																	date,
																);
																setShowEndCalendar(
																	false,
																);
															}
														}}
														disabled={(
															date: Date,
														) =>
															date <
															(startDate ||
																new Date())
														}
														className="rounded-md border-0 p-2 sm:p-3 min-w-[280px]"
													/>
												</div>
											</PopoverContent>
										</Popover>
										{errors.endDate && (
											<p className="text-sm text-red-600 flex items-center mt-1">
												<span className="mr-1">!</span>
												{errors.endDate.message}
											</p>
										)}
									</div>
								</div>

								{/* Description */}
								<div className="space-y-2">
									<Label
										htmlFor="description"
										className="text-gray-700 font-medium"
									>
										Description *
									</Label>
									<Textarea
										id="description"
										placeholder="Enter event description"
										rows={4}
										{...register("description")}
										className={cn(
											"bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none",
											errors.description &&
												"border-red-500 focus:border-red-500 focus:ring-red-200",
										)}
									/>
									{errors.description && (
										<p className="text-sm text-red-600 flex items-center mt-1">
											<span className="mr-1">!</span>
											{errors.description.message}
										</p>
									)}
								</div>

								{/* Artist Workflow Setup */}
								<div className="space-y-4 border-t pt-6">
									<div>
										<Label className="text-gray-900 font-semibold text-base">
											Artist Workflow Setup
										</Label>
										<p className="text-sm text-pink-500 mt-0.5">
											Choose which tasks artists must complete for this event
										</p>
									</div>

									{/* Agreement — always mandatory, no toggle */}
									<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div className="flex items-start gap-3">
											<div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center mt-0.5 shrink-0">
												<FileText className="h-4 w-4 text-purple-600" />
											</div>
											<div className="space-y-0.5">
												<Label className="text-sm font-semibold text-gray-800">
													Agreement
												</Label>
												<p className="text-xs text-gray-500">
													Artist reviews and signs an agreement — always required before other tasks
												</p>
											</div>
										</div>
										<span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
											Mandatory
										</span>
									</div>

									{/* Logistics toggle */}
									<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div className="flex items-start gap-3">
											<div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
												<Plane className="h-4 w-4 text-blue-600" />
											</div>
											<div className="space-y-0.5">
												<Label className="text-sm font-semibold text-gray-800">
													Logistics
												</Label>
												<p className="text-xs text-gray-500">
													Travel, hotel, passports, transport
												</p>
											</div>
										</div>
										<Switch
											checked={logisticsEnabled}
											onCheckedChange={setLogisticsEnabled}
											className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-300"
										/>
									</div>

									{/* Show Info toggle */}
									<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div className="flex items-start gap-3">
											<div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center mt-0.5 shrink-0">
												<Music2 className="h-4 w-4 text-pink-600" />
											</div>
											<div className="space-y-0.5">
												<Label className="text-sm font-semibold text-gray-800">
													Show Info
												</Label>
												<p className="text-xs text-gray-500">
													Technical rider, schedule, stage
												</p>
											</div>
										</div>
										<Switch
											checked={showInfoEnabled}
											onCheckedChange={setShowInfoEnabled}
											className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-300"
										/>
									</div>

								</div>

								{/* Event Settings */}
								<div className="space-y-4 border-t pt-6">
									<Label className="text-gray-700 font-medium text-base">
										Event Settings
									</Label>

									<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
										<div className="space-y-0.5">
											<Label className="text-sm font-medium text-gray-700">
												Registration Link
											</Label>
											<p className="text-xs text-gray-500">
												Allow copying the artist
												registration link
											</p>
										</div>
										<Switch
											checked={registrationLinkEnabled}
											onCheckedChange={
												setRegistrationLinkEnabled
											}
											className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
										/>
									</div>

									<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
										<div className="space-y-0.5">
											<Label className="text-sm font-medium text-gray-700">
												Artist Edit Profile
											</Label>
											<p className="text-xs text-gray-500">
												Allow artists to edit their
												profile in the event dashboard
											</p>
										</div>
										<Switch
											checked={artistEditEnabled}
											onCheckedChange={
												setArtistEditEnabled
											}
											className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
										/>
									</div>
								</div>

								{/* Action Buttons */}
								<div className="flex flex-col sm:flex-row gap-4 pt-6">
									<Button
										type="submit"
										disabled={loading}
										className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
									>
										{loading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Creating Event...
											</>
										) : (
											"Create Event"
										)}
									</Button>
									<Link
										href="/stage-manager"
										className="flex-1"
									>
										<Button
											type="button"
											variant="outline"
											className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
										>
											Cancel
										</Button>
									</Link>
								</div>
							</form>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
