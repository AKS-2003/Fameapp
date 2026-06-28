"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	User,
	Calendar,
	Shield,
	LogOut,
	Camera,
	Trash2,
	Loader2,
	CheckCircle,
	AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function ProfilePage({
	isDashboardTab = false,
}: {
	isDashboardTab?: boolean;
} = {}) {
	const [profileData, setProfileData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	// Avatar state
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarStatus, setAvatarStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [avatarError, setAvatarError] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const router = useRouter();

	useEffect(() => {
		if (!isDashboardTab) {
			router.replace("/stage-manager?tab=Settings");
			return;
		}
		fetchProfile();
	}, [isDashboardTab, router]);

	const fetchProfile = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/stage-manager/profile");
			const result = await response.json();

			if (result.success && result.data?.user) {
				const user = result.data.user;
				setProfileData({
					id: user.id,
					name:
						`${user.profile?.firstName || ""} ${
							user.profile?.lastName || ""
						}`.trim() || user.email,
					email: user.email,
					role: user.role,
					accountStatus: user.status,
					subscriptionStatus: user.subscriptionStatus || "active",
					eventId: user.eventId || null,
					firstName: user.profile?.firstName || "",
					lastName: user.profile?.lastName || "",
					phone: user.profile?.phone || "",
				});
				// Set existing avatar if stored
				if (user.profile?.avatar) {
					setAvatarUrl(user.profile.avatar);
				}
			}
		} catch (error) {
			console.error("Error fetching profile:", error);
		} finally {
			setLoading(false);
		}
	};

	// ─── Avatar upload logic ───────────────────────────────────────────────────

	const handleAvatarFileChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Local preview immediately
		const reader = new FileReader();
		reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
		reader.readAsDataURL(file);

		// Upload
		await uploadAvatar(file);

		// Reset input so the same file can be picked again
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const uploadAvatar = async (file: File) => {
		setAvatarUploading(true);
		setAvatarStatus("idle");
		setAvatarError("");
		try {
			const form = new FormData();
			form.append("avatar", file);
			const res = await fetch("/api/stage-manager/profile/avatar", {
				method: "POST",
				body: form,
			});
			const data = await res.json();
			if (data.success) {
				// Add a cache-busting param so the image reloads
				setAvatarUrl(data.data.avatarUrl + `&t=${Date.now()}`);
				setAvatarPreview(null); // drop local preview, use server URL
				setAvatarStatus("success");
				setTimeout(() => setAvatarStatus("idle"), 3000);
			} else {
				setAvatarStatus("error");
				setAvatarError(data.error?.message || "Upload failed");
				setAvatarPreview(null);
			}
		} catch {
			setAvatarStatus("error");
			setAvatarError("Network error – please try again");
			setAvatarPreview(null);
		} finally {
			setAvatarUploading(false);
		}
	};

	const handleRemoveAvatar = async () => {
		setAvatarUploading(true);
		setAvatarStatus("idle");
		setAvatarError("");
		try {
			const res = await fetch("/api/stage-manager/profile/avatar", {
				method: "DELETE",
			});
			const data = await res.json();
			if (data.success) {
				setAvatarUrl(null);
				setAvatarPreview(null);
				setAvatarStatus("success");
				setTimeout(() => setAvatarStatus("idle"), 2000);
			} else {
				setAvatarStatus("error");
				setAvatarError(data.error?.message || "Remove failed");
			}
		} catch {
			setAvatarStatus("error");
			setAvatarError("Network error – please try again");
		} finally {
			setAvatarUploading(false);
		}
	};

	// ──────────────────────────────────────────────────────────────────────────

	if (loading || !profileData) {
		return (
			<div
				className={
					isDashboardTab
						? "flex h-64 items-center justify-center"
						: "min-h-screen bg-gray-50 flex items-center justify-center"
				}
			>
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading profile...</p>
				</div>
			</div>
		);
	}

	const displayAvatar = avatarPreview || avatarUrl;

	return (
		<div
			className={
				isDashboardTab ? "bg-[#f6f5fb] px-0 py-0" : "min-h-screen bg-gray-50"
			}
		>
			{/* Standalone header — only shown when NOT embedded in the dashboard */}
			{!isDashboardTab && (
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
										Profile Settings
									</h1>
									<p className="text-sm text-gray-500">
										Manage your account information
									</p>
								</div>
							</div>
							<Button
								variant="outline"
								onClick={async () => {
									try {
										const res = await fetch("/api/auth/logout", {
											method: "POST",
										});
										if (res.ok) window.location.href = "/stagemanager-login";
									} catch (err) {
										console.error("Logout error:", err);
									}
								}}
							>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</Button>
						</div>
					</div>
				</header>
			)}

			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* ── Left: Profile Card with Photo Upload ───────────────────── */}
					<div className="lg:col-span-1">
						<Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100">
							<CardHeader className="text-center pb-4">
								{/* Avatar circle */}
								<div className="relative mx-auto mb-4 w-24 h-24 group">
									{/* Image / placeholder */}
									<div
										className={`w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white ring-2 ring-purple-200 cursor-pointer transition-all duration-200 ${
											avatarUploading
												? "opacity-60"
												: "group-hover:ring-purple-400"
										}`}
										onClick={() =>
											!avatarUploading && fileInputRef.current?.click()
										}
									>
										{displayAvatar ? (
											<img
												src={displayAvatar}
												alt="Profile photo"
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
												<User className="h-10 w-10 text-white" />
											</div>
										)}
									</div>

									{/* Upload overlay on hover */}
									{!avatarUploading && (
										<div
											className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
											onClick={() => fileInputRef.current?.click()}
										>
											<Camera className="h-6 w-6 text-white" />
										</div>
									)}

									{/* Uploading spinner overlay */}
									{avatarUploading && (
										<div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
											<Loader2 className="h-6 w-6 text-white animate-spin" />
										</div>
									)}

									{/* Hidden file input */}
									<input
										ref={fileInputRef}
										type="file"
										accept="image/jpeg,image/png,image/webp,image/gif"
										className="hidden"
										onChange={handleAvatarFileChange}
									/>
								</div>

								{/* Status feedback */}
								{avatarStatus === "success" && (
									<p className="text-xs text-emerald-600 flex items-center justify-center gap-1 mb-1">
										<CheckCircle className="h-3 w-3" />
										Photo updated!
									</p>
								)}
								{avatarStatus === "error" && (
									<p className="text-xs text-red-500 flex items-center justify-center gap-1 mb-1">
										<AlertCircle className="h-3 w-3" />
										{avatarError}
									</p>
								)}

								{/* Upload / Remove buttons */}
								<div className="flex items-center justify-center gap-2 flex-wrap mb-2">
									<Button
										size="sm"
										variant="outline"
										className="text-xs h-7 px-3 border-purple-300 text-purple-700 hover:bg-purple-50"
										disabled={avatarUploading}
										onClick={() => fileInputRef.current?.click()}
									>
										<Camera className="h-3 w-3 mr-1" />
										{displayAvatar ? "Change" : "Upload"} Photo
									</Button>
									{displayAvatar && (
										<Button
											size="sm"
											variant="ghost"
											className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
											disabled={avatarUploading}
											onClick={handleRemoveAvatar}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									)}
								</div>
								<p className="text-[10px] text-purple-400">
									JPG, PNG, WebP · max 5 MB
								</p>

								{/* Name & role */}
								<CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
									{profileData?.name}
								</CardTitle>
								<CardDescription className="text-purple-700 font-medium">
									Stage Manager
								</CardDescription>
								<div className="mt-3">
									<Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md">
										{profileData?.accountStatus?.charAt(0).toUpperCase() +
											profileData?.accountStatus?.slice(1)}
									</Badge>
								</div>
							</CardHeader>
						</Card>
					</div>

					{/* ── Right: Info Cards ────────────────────────────────────── */}
					<div className="lg:col-span-2 space-y-6">
						{/* Personal Information */}
						<Card className="border-2 border-purple-100 shadow-lg">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
								<CardTitle className="flex items-center text-purple-800">
									<User className="h-5 w-5 mr-2 text-purple-600" />
									Personal Information
								</CardTitle>
								<CardDescription className="text-purple-600">
									Your basic account information
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 bg-white">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<Label
											htmlFor="name"
											className="text-purple-700 font-medium"
										>
											Full Name
										</Label>
										<Input
											id="name"
											value={profileData?.name || ""}
											disabled
											className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-800"
										/>
									</div>
									<div>
										<Label
											htmlFor="email"
											className="text-purple-700 font-medium"
										>
											Email Address
										</Label>
										<Input
											id="email"
											value={profileData?.email || ""}
											disabled
											className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-800"
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Account Status */}
						<Card className="border-2 border-purple-100 shadow-lg">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
								<CardTitle className="flex items-center text-purple-800">
									<Shield className="h-5 w-5 mr-2 text-purple-600" />
									Account Status
								</CardTitle>
								<CardDescription className="text-purple-600">
									Your account details
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 bg-white">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<Label className="text-purple-700 font-medium">
											Account Status
										</Label>
										<div className="mt-1">
											<Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md">
												{profileData?.accountStatus?.charAt(0).toUpperCase() +
													profileData?.accountStatus?.slice(1)}
											</Badge>
										</div>
									</div>
									<div>
										<Label className="text-purple-700 font-medium">
											Subscription Status
										</Label>
										<div className="mt-1">
											<Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md">
												{(
													profileData?.subscriptionStatus
														?.charAt(0)
														.toUpperCase() +
													profileData?.subscriptionStatus?.slice(1)
												) || "Active"}
											</Badge>
										</div>
									</div>
								</div>

								{profileData?.eventId && (
									<div>
										<Label className="text-purple-700 font-medium">
											Assigned Event ID
										</Label>
										<Input
											value={profileData.eventId}
											disabled
											className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 font-mono text-sm text-purple-800"
										/>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Registration Details */}
						<Card className="border-2 border-purple-100 shadow-lg">
							<CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
								<CardTitle className="flex items-center text-purple-800">
									<Calendar className="h-5 w-5 mr-2 text-purple-600" />
									Registration Details
								</CardTitle>
								<CardDescription className="text-purple-600">
									Information about your account registration
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 bg-white">
								<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
									<p className="text-sm text-blue-800 mb-2 font-semibold">
										Account Information:
									</p>
									<ul className="text-sm text-blue-700 space-y-1">
										<li>- Role: Stage Manager</li>
										<li>- Account Type: Professional</li>
										<li>- Registration Method: Web Interface</li>
										<li>
											- Approval Status:{" "}
											{profileData?.accountStatus === "active"
												? "Approved by Admin"
												: "Pending Admin Review"}
										</li>
									</ul>
								</div>

								{profileData?.accountStatus === "pending" && (
									<div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
										<p className="text-sm text-yellow-800">
											<strong>Pending Approval:</strong> Your account is
											currently being reviewed by our admin team. You&apos;ll
											receive full access once approved.
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>

				{!isDashboardTab && (
					<div className="mt-12 pb-8">
						<FantasiaFooter variant="light" />
					</div>
				)}
			</div>
		</div>
	);
}
