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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	Loader2,
	Upload,
	Image as ImageIcon,
	Sparkles,
	Shield,
	Send,
	Mail,
	CheckCircle,
	ChevronDown,
	Pencil,
	Trash2,
	RotateCw,
	X,
	Users,
	Crown,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, EventFormData } from "@/lib/schemas/event";
import { Event } from "@/lib/types/event";
import { motion } from "framer-motion";
import { uploadToGCS } from "@/lib/upload-utils";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
	AccessGrant,
	AccessType,
	ALL_ACCESS_TYPES,
	ACCESS_TYPE_CONFIG,
} from "@/lib/types/access-grant";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function EditEventPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.eventId as string;
	const { toast } = useToast();
	const {
		data: subData,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);
	const [user, setUser] = useState<any>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string>("");
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [existingLogoUrl, setExistingLogoUrl] = useState<string>("");
	const [artistEditEnabled, setArtistEditEnabled] = useState(false);
	const [registrationLinkEnabled, setRegistrationLinkEnabled] =
		useState(true);

	// Access control state
	const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
	const [accessEmail, setAccessEmail] = useState("");
	const [selectedAccessTypes, setSelectedAccessTypes] = useState<
		AccessType[]
	>([]);
	const [accessSending, setAccessSending] = useState(false);
	const [accessDropdownOpen, setAccessDropdownOpen] = useState(false);
	const [editGrantDialog, setEditGrantDialog] = useState(false);
	const [editingGrant, setEditingGrant] = useState<AccessGrant | null>(null);
	const [editAccessTypes, setEditAccessTypes] = useState<AccessType[]>([]);
	const [editSaving, setEditSaving] = useState(false);
	const accessDropdownRef = useRef<HTMLDivElement>(null);

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

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				accessDropdownRef.current &&
				!accessDropdownRef.current.contains(e.target as Node)
			) {
				setAccessDropdownOpen(false);
			}
		};
		if (accessDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [accessDropdownOpen]);

	useEffect(() => {
		fetchUserProfile();
		fetchEvent();
		fetchAccessGrants();
	}, [eventId]);

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

	const fetchEvent = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/events/${eventId}`);

			if (response.ok) {
				const result = await response.json();
				const event: Event = result.data;

				setValue("name", event.name);
				setValue("venueName", event.venueName);
				setValue("startDate", new Date(event.startDate));
				setValue("endDate", new Date(event.endDate));
				setValue("description", event.description);

				if (event.logoUrl) {
					setExistingLogoUrl(event.logoUrl);
					setLogoPreview(`/api/media/${event.logoUrl}`);
				}

				setArtistEditEnabled(event.artist_edit_enabled ?? false);
				setRegistrationLinkEnabled(
					event.registration_link_enabled ?? true,
				);
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

	// ─── Access Control functions ───────────────────────────────────────────
	const fetchAccessGrants = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/access-grants`,
			);
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setAccessGrants(result.data.grants || []);
				}
			}
		} catch (error) {
			console.error("Error fetching access grants:", error);
		}
	};

	const toggleAccessType = (
		type: AccessType,
		list: AccessType[],
		setList: (v: AccessType[]) => void,
	) => {
		if (list.includes(type)) {
			setList(list.filter((t) => t !== type));
		} else {
			if (type === "full_access") {
				setList(["full_access"]);
			} else {
				setList([...list.filter((t) => t !== "full_access"), type]);
			}
		}
	};

	const handleSendAccess = async () => {
		if (!accessEmail.trim() || selectedAccessTypes.length === 0) {
			toast({
				title: "Missing information",
				description:
					"Please enter an email and select at least one access type.",
				variant: "destructive",
			});
			return;
		}
		setAccessSending(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/access-grants`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: accessEmail.trim(),
						accessTypes: selectedAccessTypes,
						createdByName: user?.name || "Stage Manager",
					}),
				},
			);
			const result = await response.json();
			if (result.success) {
				toast({
					title: "✅ Access granted!",
					description: `Access email sent to ${accessEmail}`,
					variant: "success",
				});
				setAccessEmail("");
				setSelectedAccessTypes([]);
				fetchAccessGrants();
			} else {
				toast({
					title: "Failed to send access",
					description: result.error?.message || "Please try again",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error sending access:", error);
			toast({
				title: "Error",
				description: "Failed to send access email.",
				variant: "destructive",
			});
		} finally {
			setAccessSending(false);
		}
	};

	const handleEditGrant = (grant: AccessGrant) => {
		setEditingGrant(grant);
		setEditAccessTypes([...grant.accessTypes]);
		setEditGrantDialog(true);
	};

	const handleSaveEditGrant = async (resend: boolean = false) => {
		if (!editingGrant) return;
		setEditSaving(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/access-grants/${editingGrant.id}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						accessTypes: editAccessTypes,
						resendEmail: resend,
					}),
				},
			);
			const result = await response.json();
			if (result.success) {
				toast({
					title: resend
						? "✅ Updated & email resent!"
						: "✅ Access updated!",
					description: `Permissions updated for ${editingGrant.email}`,
					variant: "success",
				});
				setEditGrantDialog(false);
				setEditingGrant(null);
				fetchAccessGrants();
			} else {
				toast({
					title: "Update failed",
					description: result.error?.message || "Please try again",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error updating grant:", error);
			toast({
				title: "Error",
				description: "Failed to update access.",
				variant: "destructive",
			});
		} finally {
			setEditSaving(false);
		}
	};

	const handleResendGrant = async (grant: AccessGrant) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/access-grants/${grant.id}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ resendEmail: true }),
				},
			);
			const result = await response.json();
			if (result.success && result.data.emailSent) {
				toast({
					title: "✅ Email resent!",
					description: `Access email resent to ${grant.email}`,
					variant: "success",
				});
				fetchAccessGrants();
			} else {
				toast({
					title: "Resend failed",
					description: "Email could not be sent",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error resending grant:", error);
			toast({
				title: "Error",
				description: "Failed to resend email.",
				variant: "destructive",
			});
		}
	};

	const handleRevokeGrant = async (grantId: string, email: string) => {
		if (!confirm(`Revoke access for ${email}?`)) return;
		try {
			const response = await fetch(
				`/api/events/${eventId}/access-grants/${grantId}`,
				{ method: "DELETE" },
			);
			const result = await response.json();
			if (result.success) {
				toast({
					title: "Access revoked",
					description: `Access revoked for ${email}`,
					variant: "success",
				});
				fetchAccessGrants();
			}
		} catch (error) {
			console.error("Error revoking grant:", error);
			toast({
				title: "Error",
				description: "Failed to revoke access.",
				variant: "destructive",
			});
		}
	};

	const activeGrants = accessGrants.filter((g) => g.status === "active");
	// ────────────────────────────────────────────────────────────────────────

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

	const onSubmit = async (data: EventFormData) => {
		try {
			setSaving(true);

			let logoUrl = existingLogoUrl;

			if (logoFile) {
				setUploadingLogo(true);
				try {
					const result = await uploadToGCS({
						file: logoFile,
						eventId,
						artistId: "event-logo",
						fileType: "event-logo",
					});
					logoUrl = result.fileName;
				} finally {
					setUploadingLogo(false);
				}
			}

			const response = await fetch(`/api/events/${eventId}`, {
				method: "PUT",
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
				}),
			});

			if (response.ok) {
				toast({
					title: "Event updated!",
					description: "Your event details have been saved.",
					variant: "success",
				});
				router.push("/stage-manager");
			} else {
				console.error("Failed to update event");
				toast({
					title: "Update failed",
					description: "Please try again.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error updating event:", error);
		} finally {
			setSaving(false);
		}
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

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link
								href="/stage-manager"
								className="mr-4"
							>
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
									Edit Event
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



			{/* Two-column layout */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
					{/* ── LEFT: Edit Event form ── */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						<Card className="shadow-lg bg-white">
							<CardHeader>
								<CardTitle className="text-2xl font-bold text-gray-900">
									Edit Event
								</CardTitle>
								<CardDescription className="text-gray-600">
									Update your event details and settings.
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
																PNG, JPG up to
																5MB
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
											className="text-gray-700"
										>
											Event Name *
										</Label>
										<Input
											id="name"
											placeholder="Enter event name"
											{...register("name")}
											className={cn(
												"bg-white border-gray-300 text-gray-900 placeholder-gray-500",
												errors.name && "border-red-500",
											)}
										/>
										{errors.name && (
											<p className="text-sm text-red-600">
												{errors.name.message}
											</p>
										)}
									</div>

									{/* Venue Name */}
									<div className="space-y-2">
										<Label
											htmlFor="venueName"
											className="text-gray-700"
										>
											Venue Name *
										</Label>
										<Input
											id="venueName"
											placeholder="Enter venue name"
											{...register("venueName")}
											className={cn(
												"bg-white border-gray-300 text-gray-900 placeholder-gray-500",
												errors.venueName &&
													"border-red-500",
											)}
										/>
										{errors.venueName && (
											<p className="text-sm text-red-600">
												{errors.venueName.message}
											</p>
										)}
									</div>

									{/* Date Range */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Start Date */}
										<div className="space-y-2">
											<Label className="text-gray-700">
												Start Date *
											</Label>
											<Popover
												open={showStartCalendar}
												onOpenChange={
													setShowStartCalendar
												}
											>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														className={cn(
															"w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900",
															!startDate &&
																"text-gray-500",
															errors.startDate &&
																"border-red-500",
														)}
													>
														<CalendarIcon className="mr-2 h-4 w-4" />
														{startDate
															? format(
																	startDate,
																	"PPP",
																)
															: "Pick start date"}
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto p-0 bg-white"
													align="start"
												>
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
													/>
												</PopoverContent>
											</Popover>
											{errors.startDate && (
												<p className="text-sm text-red-600">
													{errors.startDate.message}
												</p>
											)}
										</div>

										{/* End Date */}
										<div className="space-y-2">
											<Label className="text-gray-700">
												End Date *
											</Label>
											<Popover
												open={showEndCalendar}
												onOpenChange={
													setShowEndCalendar
												}
											>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														className={cn(
															"w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900",
															!endDate &&
																"text-gray-500",
															errors.endDate &&
																"border-red-500",
														)}
													>
														<CalendarIcon className="mr-2 h-4 w-4" />
														{endDate
															? format(
																	endDate,
																	"PPP",
																)
															: "Pick end date"}
													</Button>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto p-0 bg-white"
													align="start"
												>
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
													/>
												</PopoverContent>
											</Popover>
											{errors.endDate && (
												<p className="text-sm text-red-600">
													{errors.endDate.message}
												</p>
											)}
										</div>
									</div>

									{/* Description */}
									<div className="space-y-2">
										<Label
											htmlFor="description"
											className="text-gray-700"
										>
											Description *
										</Label>
										<Textarea
											id="description"
											placeholder="Enter event description"
											rows={4}
											{...register("description")}
											className={cn(
												"bg-white border-gray-300 text-gray-900 placeholder-gray-500",
												errors.description &&
													"border-red-500",
											)}
										/>
										{errors.description && (
											<p className="text-sm text-red-600">
												{errors.description.message}
											</p>
										)}
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
											<div className="flex items-center gap-2">
												<Switch
													checked={
														registrationLinkEnabled
													}
													onCheckedChange={
														setRegistrationLinkEnabled
													}
													className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
												/>
												<span
													className={`text-sm font-medium ${registrationLinkEnabled ? "text-green-500" : "text-gray-400"}`}
												>
													{registrationLinkEnabled
														? "On"
														: "Off"}
												</span>
											</div>
										</div>

										<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div className="space-y-0.5">
												<Label className="text-sm font-medium text-gray-700">
													Artist Edit Profile
												</Label>
												<p className="text-xs text-gray-500">
													Allow artists to edit their
													profile in the event
													dashboard
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Switch
													checked={artistEditEnabled}
													onCheckedChange={
														setArtistEditEnabled
													}
													className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
												/>
												<span
													className={`text-sm font-medium ${artistEditEnabled ? "text-green-500" : "text-gray-400"}`}
												>
													{artistEditEnabled
														? "On"
														: "Off"}
												</span>
											</div>
										</div>
									</div>

									{/* Action Buttons */}
									<div className="flex flex-col sm:flex-row gap-4 pt-6">
										<Button
											type="submit"
											disabled={saving}
											className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
										>
											{saving ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Updating Event...
												</>
											) : (
												"Update Event"
											)}
										</Button>
										<Link
											href={`/stage-manager/events/${eventId}`}
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

					{/* ── RIGHT: Access Control ── */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.15 }}
						className="space-y-0"
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
												Grant page access to coworkers
												via email
											</CardDescription>
										</div>
									</div>
									{activeGrants.length > 0 && (
										<Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
											{activeGrants.length} active
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
										{/* Email Input */}
										<div>
											<Label
												htmlFor="access-email-edit"
												className="text-sm text-gray-700"
											>
												Email Address
											</Label>
											<div className="relative mt-1">
												<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
												<Input
													id="access-email-edit"
													type="email"
													value={accessEmail}
													onChange={(e) =>
														setAccessEmail(
															e.target.value,
														)
													}
													placeholder="coworker@example.com"
													className="pl-10"
													disabled={accessSending}
												/>
											</div>
										</div>

										{/* Access Type Selector */}
										<div>
											<Label className="text-sm text-gray-700">
												Access Type(s)
											</Label>
											<div
												className="relative mt-1"
												ref={accessDropdownRef}
											>
												<button
													type="button"
													onClick={() =>
														setAccessDropdownOpen(
															!accessDropdownOpen,
														)
													}
													className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
													disabled={accessSending}
												>
													<span
														className={
															selectedAccessTypes.length ===
															0
																? "text-gray-400"
																: "text-gray-900"
														}
													>
														{selectedAccessTypes.length ===
														0
															? "Select access types..."
															: selectedAccessTypes
																	.map(
																		(t) =>
																			ACCESS_TYPE_CONFIG[
																				t
																			]
																				?.label,
																	)
																	.join(", ")}
													</span>
													<ChevronDown
														className={`h-4 w-4 text-gray-400 transition-transform ${accessDropdownOpen ? "rotate-180" : ""}`}
													/>
												</button>
												{accessDropdownOpen && (
													<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
														<div className="py-1">
															{ALL_ACCESS_TYPES.map(
																(type) => {
																	const config =
																		ACCESS_TYPE_CONFIG[
																			type
																		];
																	const isSelected =
																		selectedAccessTypes.includes(
																			type,
																		);
																	return (
																		<button
																			key={
																				type
																			}
																			type="button"
																			onClick={() =>
																				toggleAccessType(
																					type,
																					selectedAccessTypes,
																					setSelectedAccessTypes,
																				)
																			}
																			className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 ${isSelected ? "bg-indigo-50" : ""}`}
																		>
																			<div
																				className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
																			>
																				{isSelected && (
																					<CheckCircle className="h-3 w-3 text-white" />
																				)}
																			</div>
																			<div>
																				<div className="font-medium text-gray-900">
																					{
																						config.label
																					}
																				</div>
																				<div className="text-xs text-gray-500">
																					{
																						config.description
																					}
																				</div>
																			</div>
																		</button>
																	);
																},
															)}
														</div>
														{/* Done button */}
														<div className="border-t border-gray-100 p-2">
															<button
																type="button"
																onClick={() =>
																	setAccessDropdownOpen(
																		false,
																	)
																}
																className="w-full py-1.5 px-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center gap-1.5"
															>
																<CheckCircle className="h-3.5 w-3.5" />
																Done{" "}
																{selectedAccessTypes.length >
																0
																	? `(${selectedAccessTypes.length} selected)`
																	: ""}
															</button>
														</div>
													</div>
												)}
											</div>
											{/* Selected badges */}
											{selectedAccessTypes.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{selectedAccessTypes.map(
														(type) => (
															<span
																key={type}
																className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ACCESS_TYPE_CONFIG[type].bgColor} ${ACCESS_TYPE_CONFIG[type].color}`}
															>
																{
																	ACCESS_TYPE_CONFIG[
																		type
																	].label
																}
																<button
																	type="button"
																	onClick={() =>
																		toggleAccessType(
																			type,
																			selectedAccessTypes,
																			setSelectedAccessTypes,
																		)
																	}
																>
																	<X className="h-3 w-3" />
																</button>
															</span>
														),
													)}
												</div>
											)}
										</div>

										{/* Send Button */}
										<Button
											onClick={handleSendAccess}
											disabled={
												accessSending ||
												!accessEmail.trim() ||
												selectedAccessTypes.length === 0
											}
											className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
										>
											{accessSending ? (
												<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
											) : (
												<Send className="h-4 w-4 mr-2" />
											)}
											{accessSending
												? "Sending..."
												: "Send via Email"}
										</Button>
									</div>
								</div>

								{/* Active Grants List */}
								{activeGrants.length > 0 ? (
									<div>
										<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
											<Users className="h-4 w-4" />
											Active Grants ({activeGrants.length}
											)
										</h3>
										<div className="space-y-3">
											{activeGrants.map((grant) => (
												<div
													key={grant.id}
													className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors"
												>
													<div className="flex items-start justify-between">
														<div className="flex-1 min-w-0">
															<p className="font-medium text-gray-900 text-sm truncate">
																{grant.email}
															</p>
															<div className="flex flex-wrap gap-1 mt-1.5">
																{grant.accessTypes.map(
																	(
																		type: AccessType,
																	) => (
																		<span
																			key={
																				type
																			}
																			className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ACCESS_TYPE_CONFIG[type]?.bgColor || "bg-gray-100"} ${ACCESS_TYPE_CONFIG[type]?.color || "text-gray-700"}`}
																		>
																			{ACCESS_TYPE_CONFIG[
																				type
																			]
																				?.label ||
																				type}
																		</span>
																	),
																)}
															</div>
															{grant.lastAccessedAt && (
																<p className="text-[10px] text-gray-400 mt-1">
																	Last
																	accessed:{" "}
																	{format(
																		new Date(
																			grant.lastAccessedAt,
																		),
																		"MMM d, yyyy",
																	)}
																</p>
															)}
														</div>
														<div className="flex items-center gap-1 ml-2 flex-shrink-0">
															<button
																onClick={() =>
																	handleEditGrant(
																		grant,
																	)
																}
																className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
																title="Edit permissions"
															>
																<Pencil className="h-3.5 w-3.5" />
															</button>
															<button
																onClick={() =>
																	handleResendGrant(
																		grant,
																	)
																}
																className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-colors"
																title="Resend email"
															>
																<RotateCw className="h-3.5 w-3.5" />
															</button>
															<button
																onClick={() =>
																	handleRevokeGrant(
																		grant.id,
																		grant.email,
																	)
																}
																className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
																title="Revoke access"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</button>
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="text-center py-8 text-gray-400">
										<Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
										<p className="text-sm">
											No active grants yet.
										</p>
										<p className="text-xs mt-1">
											Use the form above to grant access
											to coworkers.
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>

			{/* Edit Access Grant Dialog */}
			<Dialog open={editGrantDialog} onOpenChange={setEditGrantDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="h-5 w-5 text-indigo-600" />
							Edit Access Permissions
						</DialogTitle>
						<DialogDescription>
							Update access permissions for {editingGrant?.email}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 mt-2">
						<div>
							<Label className="text-sm text-gray-700">
								Access Types
							</Label>
							<div className="mt-2 space-y-1">
								{ALL_ACCESS_TYPES.map((type) => {
									const config = ACCESS_TYPE_CONFIG[type];
									const isSelected =
										editAccessTypes.includes(type);
									return (
										<button
											key={type}
											type="button"
											onClick={() =>
												toggleAccessType(
													type,
													editAccessTypes,
													setEditAccessTypes,
												)
											}
											className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 rounded-md hover:bg-gray-50 ${isSelected ? "bg-indigo-50 border border-indigo-200" : "border border-transparent"}`}
										>
											<div
												className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
											>
												{isSelected && (
													<CheckCircle className="h-3 w-3 text-white" />
												)}
											</div>
											<div>
												<div className="font-medium text-gray-900">
													{config.label}
												</div>
												<div className="text-xs text-gray-500">
													{config.description}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>
						<div className="flex gap-2 pt-2">
							<Button
								onClick={() => handleSaveEditGrant(false)}
								disabled={
									editSaving || editAccessTypes.length === 0
								}
								className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
							>
								{editSaving ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								onClick={() => handleSaveEditGrant(true)}
								disabled={
									editSaving || editAccessTypes.length === 0
								}
								variant="outline"
								className="flex-1"
							>
								<RotateCw className="h-4 w-4 mr-1" />
								Save & Resend
							</Button>
						</div>
					</div>
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
