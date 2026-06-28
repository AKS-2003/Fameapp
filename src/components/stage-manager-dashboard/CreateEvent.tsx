"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	Calendar as CalendarIcon,
	Loader2,
	Upload,
	Image as ImageIcon,
	FileText,
	Plane,
	Music2,
	Lock,
	ArrowLeft,
	Plus,
	Edit,
	Clock,
	MapPin,
	User,
	Phone,
	AlignLeft,
	X,
	Shield,
	Send,
	Mail,
	ChevronDown,
	CheckCircle,
	Users,
	RotateCw,
	Pencil,
	Trash2,
	Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, EventFormData } from "@/lib/schemas/event";
import { motion } from "framer-motion";
import { uploadToGCS } from "@/lib/upload-utils";
import { Switch } from "@/components/ui/switch";

interface CreateEventProps {
	editEventId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export default function CreateEvent({ editEventId, onSuccess, onCancel }: CreateEventProps) {
	const [loading, setLoading] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string>("");
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [artistEditEnabled, setArtistEditEnabled] = useState(false);
	const [registrationLinkEnabled, setRegistrationLinkEnabled] = useState(true);
	// Workflow toggles
	const [contractEnabled, setContractEnabled] = useState(true);
	const [logisticsEnabled, setLogisticsEnabled] = useState(true);
	const [showInfoEnabled, setShowInfoEnabled] = useState(true);
	const [requireContractFirst, setRequireContractFirst] = useState(true);
	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [showInfoModal, setShowInfoModal] = useState(false);
	const [selectedShowDate, setSelectedShowDate] = useState<Date | null>(null);
	const [showDateInfoMap, setShowDateInfoMap] = useState<Map<string, any>>(new Map());
	const [formDataModal, setFormDataModal] = useState({
		rehearsalTiming: "",
		location: "",
		showtime: "",
		backstageReadyTime: "",
		stageManagerName: "",
		stageManagerContact: "",
		notes: "",
		attachments: [] as any[],
	});

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadingFile, setUploadingFile] = useState(false);

	// Access Control State
	const [accessEmail, setAccessEmail] = useState("");
	const [selectedAccessTypes, setSelectedAccessTypes] = useState<string[]>([]);
	const [accessDropdownOpen, setAccessDropdownOpen] = useState(false);
	const [accessSending, setAccessSending] = useState(false);
	const [pendingGrants, setPendingGrants] = useState<any[]>([]);

	const ALL_ACCESS_TYPES = ["read", "write", "admin"];
	const ACCESS_TYPE_CONFIG: Record<string, any> = {
		read: { label: "View Only", description: "Can view event details", bgColor: "bg-blue-100", color: "text-blue-700" },
		write: { label: "Edit", description: "Can modify event details", bgColor: "bg-green-100", color: "text-green-700" },
		admin: { label: "Admin", description: "Full control", bgColor: "bg-purple-100", color: "text-purple-700" }
	};

	const toggleAccessType = (type: string) => {
		setSelectedAccessTypes(prev => 
			prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
		);
	};

	const handleSendAccess = () => {
		if (!accessEmail || selectedAccessTypes.length === 0) return;
		setAccessSending(true);
		setTimeout(() => {
			setPendingGrants(prev => [...prev, { 
				id: Date.now().toString(),
				email: accessEmail, 
				accessTypes: selectedAccessTypes,
				lastAccessedAt: null
			}]);
			setAccessEmail("");
			setSelectedAccessTypes([]);
			setAccessDropdownOpen(false);
			setAccessSending(false);
		}, 600);
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

	useEffect(() => {
		if (editEventId) {
			const fetchEvent = async () => {
				try {
					const res = await fetch(`/api/events/${editEventId}`);
					if (res.ok) {
						const { data } = await res.json();
						setValue("name", data.name);
						setValue("venueName", data.venueName);
						if (data.startDate) setValue("startDate", new Date(data.startDate));
						if (data.endDate) setValue("endDate", new Date(data.endDate));
						if (data.description) setValue("description", data.description);
						
						if (data.logoUrl) {
							setLogoPreview(data.logoUrl);
						}
						
						if (data.artist_edit_enabled !== undefined) setArtistEditEnabled(data.artist_edit_enabled);
						if (data.registration_link_enabled !== undefined) setRegistrationLinkEnabled(data.registration_link_enabled);
						if (data.contractEnabled !== undefined) setContractEnabled(data.contractEnabled);
						if (data.logisticsEnabled !== undefined) setLogisticsEnabled(data.logisticsEnabled);
						if (data.showInfoEnabled !== undefined) setShowInfoEnabled(data.showInfoEnabled);
						if (data.requireContractFirst !== undefined) setRequireContractFirst(data.requireContractFirst);
						
						if (data.showDates && Array.isArray(data.showDates)) {
							setSelectedDates(data.showDates.map((d: string) => new Date(d)));
						}
					}
				} catch (error) {
					console.error("Error fetching event for edit:", error);
				}
			};
			fetchEvent();
		}
	}, [editEventId, setValue]);

	const startDate = watch("startDate");
	const endDate = watch("endDate");

	const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

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

	const openShowDateInfoModal = (date: Date) => {
		setSelectedShowDate(date);
		const dateKey = format(date, "yyyy-MM-dd");
		const existingInfo = showDateInfoMap.get(dateKey);

		if (existingInfo) {
			setFormDataModal({ ...existingInfo });
		} else {
			setFormDataModal({
				rehearsalTiming: "",
				location: "",
				showtime: "",
				backstageReadyTime: "",
				stageManagerName: "",
				stageManagerContact: "",
				notes: "",
				attachments: [],
			});
		}
		setShowInfoModal(true);
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 10 * 1024 * 1024) {
			alert("File size must be under 10MB");
			return;
		}

		setUploadingFile(true);
		try {
			const result = await uploadToGCS({
				file,
				eventId: "temp",
				artistId: "show-date-attachment",
				fileType: "show-date-attachment",
			});
			setFormDataModal((prev) => ({
				...prev,
				attachments: [...prev.attachments, { 
					id: Date.now().toString(), 
					originalName: file.name, 
					url: result.publicUrl 
				}],
			}));
		} catch (error) {
			console.error("Upload failed", error);
		} finally {
			setUploadingFile(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const removeAttachment = (attachmentId: string) => {
		setFormDataModal((prev) => ({
			...prev,
			attachments: prev.attachments.filter((a) => a.id !== attachmentId),
		}));
	};

	const saveShowDateInfo = () => {
		if (!selectedShowDate) return;
		const dateKey = format(selectedShowDate, "yyyy-MM-dd");
		setShowDateInfoMap((prev) => {
			const newMap = new Map(prev);
			newMap.set(dateKey, formDataModal);
			return newMap;
		});
		setShowInfoModal(false);
	};
	
	const hasShowDateInfo = (date: Date): boolean => {
		const dateKey = format(date, "yyyy-MM-dd");
		const info = showDateInfoMap.get(dateKey);
		return !!(info && (info.rehearsalTiming || info.location || info.showtime));
	};

	const onSubmit = async (data: EventFormData) => {
		try {
			setLoading(true);

			let logoUrl = "";

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

			const url = editEventId ? `/api/events/${editEventId}` : "/api/events";
			const method = editEventId ? "PUT" : "POST";

			const response = await fetch(url, {
				method: method,
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
					showDates: selectedDates.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString()),
				}),
			});

			if (response.ok) {
				const result = await response.json();
				const eventId = editEventId || result.data.id;
				
				// Save show dates info if present
				for (const [dateKey, info] of Array.from(showDateInfoMap.entries())) {
					if (info.rehearsalTiming || info.location || info.showtime) {
						await fetch(`/api/events/${eventId}/show-date-info`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								showDate: dateKey,
								...info
							}),
						});
					}
				}

				onSuccess?.();
			} else {
				const errorResult = await response.json();
				console.error("Failed to save event:", errorResult.error);
				alert(`Failed to ${editEventId ? "update" : "create"} event. Please try again.`);
			}
		} catch (error) {
			console.error("Error saving event:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-7xl mx-auto py-2 pb-10">
			<div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 lg:gap-8">
				<div className="space-y-6">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
				{/* Back button */}
				{onCancel && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onCancel}
						className="mb-4 text-slate-600 hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
					</Button>
				)}

				<Card className="shadow-lg bg-white">
					<CardHeader>
						<CardTitle className="text-2xl font-bold text-gray-900">
							{editEventId ? "Edit Event" : "Create New Event"}
						</CardTitle>
						<CardDescription className="text-gray-600">
							Create a new event, select show dates, and configure workflow.
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
											htmlFor="event-logo-inline"
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
											id="event-logo-inline"
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
													? format(startDate, "PPP")
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
													Choose when your event begins
												</p>
											</div>
											<div className="overflow-x-auto">
												<Calendar
													mode="single"
													selected={startDate}
													onSelect={(
														date: Date | undefined,
													) => {
														if (date) {
															setValue("startDate", date);
															setShowStartCalendar(false);
														}
													}}
													disabled={(date: Date) => date < new Date()}
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
													!endDate && "text-gray-500",
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
													Choose when your event ends
												</p>
											</div>
											<div className="overflow-x-auto">
												<Calendar
													mode="single"
													selected={endDate}
													onSelect={(
														date: Date | undefined,
													) => {
														if (date) {
															setValue("endDate", date);
															setShowEndCalendar(false);
														}
													}}
													disabled={(date: Date) =>
														date < (startDate || new Date())
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

								{/* Contract toggle */}
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
												Artist reviews and signs an agreement
											</p>
										</div>
									</div>
									<Switch
										checked={contractEnabled}
										onCheckedChange={setContractEnabled}
										className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-300"
									/>
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

								{/* Require contract completion toggle */}
								<div className="flex items-center justify-between p-4 bg-amber-50/60 rounded-lg border border-amber-200/60">
									<div className="flex items-start gap-3">
										<div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center mt-0.5 shrink-0">
											<Lock className="h-4 w-4 text-amber-600" />
										</div>
										<div className="space-y-0.5">
											<Label className="text-sm font-semibold text-gray-800">
												Require agreement completion before other tasks
											</Label>
											<p className="text-xs text-amber-600">
												If on, artist must sign the agreement before seeing logistics or show info
											</p>
										</div>
									</div>
									<Switch
										checked={requireContractFirst}
										onCheckedChange={setRequireContractFirst}
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
											Allow copying the artist registration link
										</p>
									</div>
									<Switch
										checked={registrationLinkEnabled}
										onCheckedChange={setRegistrationLinkEnabled}
										className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
									/>
								</div>

								<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div className="space-y-0.5">
										<Label className="text-sm font-medium text-gray-700">
											Artist Edit Profile
										</Label>
										<p className="text-xs text-gray-500">
											Allow artists to edit their profile in the event dashboard
										</p>
									</div>
									<Switch
										checked={artistEditEnabled}
										onCheckedChange={setArtistEditEnabled}
										className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
									/>
								</div>
							</div>

							{/* Select Show Dates */}
							<div className="space-y-4 border-t pt-6">
								<div>
									<Label className="text-gray-900 font-semibold text-base">
										Select Show Dates
									</Label>
									<p className="text-sm text-gray-500 mt-0.5">
										Choose which dates will have shows (requires Start and End dates to be set above)
									</p>
								</div>
								
								<div className="flex flex-col gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
									{/* Calendar Section */}
									<div className="w-full">
										<div className="w-full flex justify-center bg-white p-2 sm:p-4 rounded-xl border shadow-sm">
											<div className="w-full max-w-sm sm:max-w-md">
												<Calendar
													mode="multiple"
													selected={selectedDates}
													onSelect={(dates) => setSelectedDates(dates as Date[] || [])}
													disabled={(date) => {
														if (!startDate || !endDate) return true;
														const start = new Date(startDate);
														start.setHours(0, 0, 0, 0);
														const end = new Date(endDate);
														end.setHours(23, 59, 59, 999);
														return !isWithinInterval(date, { start, end });
													}}
													className="rounded-md w-full"
												/>
											</div>
										</div>
									</div>

									{/* Selected Dates Section */}
									<div className="w-full">
										<Label className="mb-4 text-lg font-semibold text-gray-800 block border-b pb-2">Selected Show Dates</Label>
										<div className="flex-1 bg-white rounded-xl border shadow-sm p-4">
											{selectedDates.length === 0 ? (
												<div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
													<CalendarIcon className="h-10 w-10 mx-auto mb-3 text-gray-400" />
													<p className="font-medium text-gray-600">No show dates selected yet</p>
													<p className="text-sm text-gray-500 mt-1">Click on the calendar to add dates</p>
												</div>
											) : (
												<div className="space-y-3">
													{[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map((date, idx) => (
														<div 
															key={idx} 
															className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer gap-3 sm:gap-0"
															onClick={() => openShowDateInfoModal(date)}
														>
															<div className="flex items-center text-gray-800">
																<CalendarIcon className="h-5 w-5 mr-3 text-purple-600" />
																<span className="font-semibold">{format(date, "EEEE, MMMM d, yyyy")}</span>
															</div>
															<div className="flex items-center gap-2">
																<Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 shadow-none border-gray-200">
																	Show #{idx + 1}
																</Badge>
																{hasShowDateInfo(date) ? (
																	<Badge
																		variant="secondary"
																		className="bg-green-100 text-green-700 cursor-pointer hover:bg-green-200 px-3 py-1 text-xs"
																		onClick={(e) => {
																			e.stopPropagation();
																			openShowDateInfoModal(date);
																		}}
																	>
																		<Edit className="h-3 w-3 mr-1" />
																		Edit Info
																	</Badge>
																) : (
																	<Badge
																		variant="secondary"
																		className="bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 px-3 py-1 text-xs shadow-sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			openShowDateInfoModal(date);
																		}}
																	>
																		<Plus className="h-3 w-3 mr-1" />
																		Add Info
																	</Badge>
																)}
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
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
											{editEventId ? "Saving..." : "Creating Event..."}
										</>
									) : (
										editEventId ? "Save Changes" : "Create Event"
									)}
								</Button>
								{onCancel && (
									<Button
										type="button"
										variant="outline"
										onClick={onCancel}
										className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
									>
										Cancel
									</Button>
								)}
							</div>
						</form>
					</CardContent>
				</Card>
			</motion.div>
			</div>

			{/* ── RIGHT: Access Control ── */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.15 }}
				className="space-y-0 sticky top-6 self-start"
			>
				<Card className="shadow-lg bg-white">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Shield className="h-6 w-6 text-indigo-600" />
								<div>
									<CardTitle className="text-xl font-bold text-gray-900">
										Access Control
									</CardTitle>
									<CardDescription className="text-gray-600">
										Grant page access to coworkers via email
									</CardDescription>
								</div>
							</div>
							{pendingGrants.length > 0 && (
								<Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
									{pendingGrants.length} active
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Grant Access Form */}
						<div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
							<h3 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center gap-2">
								<Send className="h-4 w-4" />
								Grant New Access
							</h3>
							<div className="space-y-3">
								<div>
									<Label htmlFor="access-email-edit" className="text-sm text-gray-700">Email Address</Label>
									<div className="relative mt-1">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
										<Input
											id="access-email-edit"
											type="email"
											value={accessEmail}
											onChange={(e) => setAccessEmail(e.target.value)}
											placeholder="coworker@example.com"
											className="pl-10"
											disabled={accessSending}
										/>
									</div>
								</div>

								<div>
									<Label className="text-sm text-gray-700">Access Type(s)</Label>
									<div className="relative mt-1">
										<button
											type="button"
											onClick={() => setAccessDropdownOpen(!accessDropdownOpen)}
											className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-left hover:border-gray-400"
											disabled={accessSending}
										>
											<span className={selectedAccessTypes.length === 0 ? "text-gray-400" : "text-gray-900"}>
												{selectedAccessTypes.length === 0 ? "Select access types..." : selectedAccessTypes.map(t => ACCESS_TYPE_CONFIG[t]?.label).join(", ")}
											</span>
											<ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${accessDropdownOpen ? "rotate-180" : ""}`} />
										</button>
										{accessDropdownOpen && (
											<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
												<div className="py-1">
													{ALL_ACCESS_TYPES.map(type => {
														const config = ACCESS_TYPE_CONFIG[type];
														const isSelected = selectedAccessTypes.includes(type);
														return (
															<button
																key={type}
																type="button"
																onClick={() => toggleAccessType(type)}
																className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 ${isSelected ? "bg-indigo-50" : ""}`}
															>
																<div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
																	{isSelected && <CheckCircle className="h-3 w-3 text-white" />}
																</div>
																<div>
																	<div className="font-medium text-gray-900">{config.label}</div>
																	<div className="text-xs text-gray-500">{config.description}</div>
																</div>
															</button>
														);
													})}
												</div>
												<div className="border-t border-gray-100 p-2">
													<button type="button" onClick={() => setAccessDropdownOpen(false)} className="w-full py-1.5 px-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1.5">
														<CheckCircle className="h-3.5 w-3.5" /> Done {selectedAccessTypes.length > 0 ? `(${selectedAccessTypes.length} selected)` : ""}
													</button>
												</div>
											</div>
										)}
									</div>
									{selectedAccessTypes.length > 0 && (
										<div className="flex flex-wrap gap-1 mt-2">
											{selectedAccessTypes.map(type => (
												<span key={type} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ACCESS_TYPE_CONFIG[type].bgColor} ${ACCESS_TYPE_CONFIG[type].color}`}>
													{ACCESS_TYPE_CONFIG[type].label}
													<button type="button" onClick={() => toggleAccessType(type)}>
														<X className="h-3 w-3" />
													</button>
												</span>
											))}
										</div>
									)}
								</div>

								<Button
									onClick={handleSendAccess}
									disabled={accessSending || !accessEmail.trim() || selectedAccessTypes.length === 0}
									className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
								>
									{accessSending ? (
										<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
									) : (
										<Send className="h-4 w-4 mr-2" />
									)}
									{accessSending ? "Saving..." : "Save for Creation"}
								</Button>
							</div>
						</div>

						{/* Active Grants List */}
						{pendingGrants.length > 0 ? (
							<div>
								<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
									<Users className="h-4 w-4" />
									Grants to be Created ({pendingGrants.length})
								</h3>
								<div className="space-y-3">
									{pendingGrants.map((grant) => (
										<div key={grant.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors">
											<div className="flex items-start justify-between">
												<div className="flex-1 min-w-0">
													<p className="font-medium text-gray-900 text-sm truncate">{grant.email}</p>
													<div className="flex flex-wrap gap-1 mt-1.5">
														{grant.accessTypes.map((type: string) => (
															<span key={type} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ACCESS_TYPE_CONFIG[type]?.bgColor || "bg-gray-100"} ${ACCESS_TYPE_CONFIG[type]?.color || "text-gray-700"}`}>
																{ACCESS_TYPE_CONFIG[type]?.label || type}
															</span>
														))}
													</div>
												</div>
												<button
													onClick={() => setPendingGrants(prev => prev.filter(g => g.id !== grant.id))}
													className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-gray-400">
								<Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
								<p className="text-sm">No active grants yet.</p>
								<p className="text-xs mt-1">Use the form above to grant access.</p>
							</div>
						)}
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
							Show Information - {selectedShowDate && format(selectedShowDate, "PPP")}
						</DialogTitle>
						<DialogDescription>
							Add details for this show date. Artists will be notified when you create the event.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Rehearsal Timing */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-blue-600" />
								Rehearsal Timing
							</Label>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label className="text-xs text-gray-500 mb-1 block">Start Time</Label>
									<Input
										type="time"
										value={formDataModal.rehearsalTiming.split(" - ")[0] || ""}
										onChange={(e) => {
											const endTime = formDataModal.rehearsalTiming.split(" - ")[1] || "";
											setFormDataModal((prev) => ({
												...prev,
												rehearsalTiming: endTime ? `${e.target.value} - ${endTime}` : `${e.target.value} - `
											}));
										}}
									/>
								</div>
								<div>
									<Label className="text-xs text-gray-500 mb-1 block">End Time</Label>
									<Input
										type="time"
										value={formDataModal.rehearsalTiming.split(" - ")[1] || ""}
										onChange={(e) => {
											const startTime = formDataModal.rehearsalTiming.split(" - ")[0] || "";
											setFormDataModal((prev) => ({
												...prev,
												rehearsalTiming: startTime ? `${startTime} - ${e.target.value}` : ` - ${e.target.value}`
											}));
										}}
									/>
								</div>
							</div>
						</div>

						{/* Location */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<MapPin className="h-4 w-4 text-red-600" />
								Rehearsal Location / Stage
							</Label>
							<Input
								value={formDataModal.location}
								onChange={(e) => setFormDataModal((prev) => ({ ...prev, location: e.target.value }))}
								placeholder="e.g. Main Stage, Room B"
							/>
						</div>

						{/* Showtime and Backstage Ready */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-purple-600" />
									Showtime
								</Label>
								<Input
									type="time"
									value={formDataModal.showtime}
									onChange={(e) => setFormDataModal((prev) => ({ ...prev, showtime: e.target.value }))}
								/>
							</div>
							<div className="space-y-2">
								<Label className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-amber-600" />
									Backstage Ready Time
								</Label>
								<Input
									type="time"
									value={formDataModal.backstageReadyTime}
									onChange={(e) => setFormDataModal((prev) => ({ ...prev, backstageReadyTime: e.target.value }))}
								/>
							</div>
						</div>

						{/* Stage Manager Info */}
						<div className="space-y-3 pt-2">
							<Label className="text-sm font-semibold text-gray-700 border-b pb-1">Stage Manager Contact</Label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label className="flex items-center gap-2 text-xs text-gray-600">
										<User className="h-3 w-3" /> Name
									</Label>
									<Input
										value={formDataModal.stageManagerName}
										onChange={(e) => setFormDataModal((prev) => ({ ...prev, stageManagerName: e.target.value }))}
										placeholder="Name"
									/>
								</div>
								<div className="space-y-2">
									<Label className="flex items-center gap-2 text-xs text-gray-600">
										<Phone className="h-3 w-3" /> Phone
									</Label>
									<Input
										value={formDataModal.stageManagerContact}
										onChange={(e) => setFormDataModal((prev) => ({ ...prev, stageManagerContact: e.target.value }))}
										placeholder="Phone number"
									/>
								</div>
							</div>
						</div>

						{/* Additional Notes */}
						<div className="space-y-2 pt-2">
							<Label className="flex items-center gap-2">
								<AlignLeft className="h-4 w-4 text-gray-600" />
								Additional Notes
							</Label>
							<Textarea
								value={formDataModal.notes}
								onChange={(e) => setFormDataModal((prev) => ({ ...prev, notes: e.target.value }))}
								placeholder="Any extra information for the artists..."
								rows={3}
								className="resize-none"
							/>
						</div>

						{/* PDF Attachments */}
						<div className="space-y-2 pt-2">
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
								<label htmlFor="pdf-upload" className="flex flex-col items-center justify-center cursor-pointer">
									{uploadingFile ? (
										<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
									) : (
										<>
											<Upload className="h-8 w-8 text-gray-400 mb-2" />
											<span className="text-sm text-gray-600">Click to upload PDF</span>
											<span className="text-xs text-gray-400">Max 10MB</span>
										</>
									)}
								</label>
							</div>

							{/* Uploaded Files List */}
							{formDataModal.attachments.length > 0 && (
								<div className="space-y-2 mt-3">
									{formDataModal.attachments.map((attachment) => (
										<div key={attachment.id} className="flex items-center justify-between p-2 bg-white border rounded-lg">
											<div className="flex items-center gap-2">
												<FileText className="h-4 w-4 text-red-500" />
												<span className="text-sm truncate max-w-[200px]">{attachment.originalName}</span>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removeAttachment(attachment.id)}
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
						<Button variant="outline" onClick={() => setShowInfoModal(false)}>
							Cancel
						</Button>
						<Button onClick={saveShowDateInfo} className="bg-purple-600 hover:bg-purple-700">
							Save Information
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
