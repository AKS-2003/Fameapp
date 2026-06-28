import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, LogOut, User, Check, Camera, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadToGCS } from "@/lib/upload-utils";

interface AccountSectionProps {
	artistId: string;
	profile: any;
	onUpdateProfile: (updates: any) => Promise<void>;
	onLogout: () => void;
}

export function AccountSection({ artistId, profile, onUpdateProfile, onLogout }: AccountSectionProps) {
	const { toast } = useToast();
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [imageError, setImageError] = useState(false);
	
	const [formData, setFormData] = useState({
		artistName: profile?.artistName || "",
		realName: profile?.realName || "",
		email: profile?.email || "",
	});

	// Upload states
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [imageUrl, setImageUrl] = useState(profile?.image_url || profile?.profileImage || "");

	// For notifications
	const [notifications, setNotifications] = useState({
		infoRequested: profile?.notifications?.infoRequested ?? true,
		taskApproved: profile?.notifications?.taskApproved ?? true,
		marketing: profile?.notifications?.marketing ?? false,
	});

	// Sync state when profile is loaded asynchronously
	useEffect(() => {
		if (profile) {
			setFormData({
				artistName: profile.artistName || "",
				realName: profile.realName || "",
				email: profile.email || "",
			});
			setNotifications({
				infoRequested: profile.notifications?.infoRequested ?? true,
				taskApproved: profile.notifications?.taskApproved ?? true,
				marketing: profile.notifications?.marketing ?? false,
			});
			setImageUrl(profile.image_url || profile.profileImage || "");
		}
	}, [profile]);

	// Reset image error if image changes
	useEffect(() => {
		setImageError(false);
	}, [profile?.image_url, profile?.profileImage]);

	const handleNotificationChange = async (key: string, value: boolean) => {
		const newNotifs = { ...notifications, [key]: value };
		setNotifications(newNotifs);
		
		// Auto-save notifications
		try {
			await onUpdateProfile({ notifications: newNotifs });
			toast({ title: "Preferences saved" });
		} catch (error) {
			// Revert on error
			setNotifications(notifications);
			toast({ 
				title: "Error saving preferences", 
				variant: "destructive" 
			});
		}
	};

	const handleSaveProfile = async () => {
		setSaving(true);
		try {
			await onUpdateProfile({
				artistName: formData.artistName,
				realName: formData.realName,
				image_url: imageUrl
			});
			toast({
				title: "Profile updated successfully",
			});
			setEditModalOpen(false);
		} catch (error) {
			toast({
				title: "Error updating profile",
				variant: "destructive"
			});
		} finally {
			setSaving(false);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Limit file types
		const validTypes = ["image/jpeg", "image/png", "image/webp"];
		if (!validTypes.includes(file.type)) {
			toast({
				title: "Invalid file type",
				description: "Please upload a PNG, JPG, or WEBP image.",
				variant: "destructive",
			});
			return;
		}

		// Limit file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "Profile picture must be under 10MB.",
				variant: "destructive",
			});
			return;
		}

		try {
			setUploading(true);
			setUploadProgress(0);

			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "profile",
				onProgress: (pct) => setUploadProgress(pct),
			});

			if (result.success && result.fileName) {
				setImageUrl(result.fileName);
				toast({
					title: "Success",
					description: "Photo uploaded. Save changes to update your profile.",
				});
			} else {
				throw new Error("Upload failed");
			}
		} catch (error) {
			console.error("Profile upload error:", error);
			toast({
				title: "Upload failed",
				description: "Could not upload profile picture.",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
		}
	};

	const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Limit file types
		const validTypes = ["image/jpeg", "image/png", "image/webp"];
		if (!validTypes.includes(file.type)) {
			toast({
				title: "Invalid file type",
				description: "Please upload a PNG, JPG, or WEBP image.",
				variant: "destructive",
			});
			return;
		}

		// Limit file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "Profile picture must be under 10MB.",
				variant: "destructive",
			});
			return;
		}

		try {
			toast({
				title: "Uploading profile photo...",
				description: "Please wait a moment.",
			});

			const result = await uploadToGCS({
				file,
				eventId: "famelink",
				artistId,
				fileType: "profile",
			});

			if (result.success && result.fileName) {
				await onUpdateProfile({ image_url: result.fileName });
				toast({
					title: "Profile photo updated",
				});
			} else {
				throw new Error("Upload failed");
			}
		} catch (error) {
			console.error("Profile upload error:", error);
			toast({
				title: "Upload failed",
				description: "Could not upload profile picture.",
				variant: "destructive",
			});
		}
	};

	// Get initials for Avatar
	const getInitials = (name: string) => {
		if (!name) return "A";
		return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
	};

	const profileImgSrc = profile?.image_url || profile?.profileImage;

	const getImageUrl = (src: string) => {
		if (!src) return "";
		if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:") || src.startsWith("/")) {
			return src;
		}
		return `/api/media/${src}`;
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			{/* Header */}
			<div className="flex items-center gap-4 mb-4">
				<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
					<User className="h-6 w-6 text-purple-400" />
				</div>
				<div>
					<h1 className="text-2xl font-bold text-white leading-tight">Account</h1>
				</div>
			</div>

			{/* Profile Card */}
			<div className="rounded-2xl border border-white/5 bg-[#1a1429] p-6 shadow-xl">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
					<div className="flex items-center gap-5">
						<div 
							className="relative group cursor-pointer shrink-0"
							onClick={() => document.getElementById("main-profile-upload-input")?.click()}
							title="Click to change profile picture"
						>
							{!imageError && profileImgSrc ? (
								<img 
									src={getImageUrl(profileImgSrc)} 
									alt="Profile" 
									onError={() => setImageError(true)}
									className="w-[72px] h-[72px] rounded-full object-cover border-2 border-purple-500/50 group-hover:opacity-80 transition-opacity"
								/>
							) : (
								<div className="w-[72px] h-[72px] rounded-full bg-[#bf1ed4] flex items-center justify-center shrink-0 group-hover:bg-[#a61bb8] transition-colors">
									<span className="text-2xl font-bold text-white">{getInitials(profile?.realName || profile?.artistName)}</span>
								</div>
							)}
							<div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<Camera className="w-4 h-4 text-white" />
							</div>
						</div>
						
						<input 
							type="file" 
							id="main-profile-upload-input" 
							accept="image/png, image/jpeg, image/webp" 
							className="hidden" 
							onChange={handleMainFileChange}
						/>
						
						<div className="space-y-1">
							<h3 className="text-[20px] font-semibold text-white leading-tight">{profile?.realName || "No Real Name Set"}</h3>
							<p className="text-[14px] text-purple-200/50">{profile?.email}</p>
							<p className="text-[14px] text-purple-200/50">Stage name: {profile?.artistName || "None"}</p>
						</div>
					</div>

					<Button 
						variant="outline" 
						onClick={() => {
							setFormData({
								artistName: profile?.artistName || "",
								realName: profile?.realName || "",
								email: profile?.email || "",
							});
							setImageUrl(profile?.image_url || profile?.profileImage || "");
							setEditModalOpen(true);
						}}
						className="border-white/10 hover:bg-white/5 text-white bg-transparent rounded-xl h-10 px-6 font-medium shrink-0"
					>
						Edit profile
					</Button>
				</div>
			</div>

			{/* Notifications Card */}
			<div className="rounded-2xl border border-white/5 bg-[#1a1429] p-6 shadow-xl space-y-6">
				<h3 className="text-lg font-bold text-white">Notifications</h3>
				
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="text-[15px] font-normal text-purple-100/80 cursor-pointer flex-1" onClick={() => handleNotificationChange("infoRequested", !notifications.infoRequested)}>
							Email me when an organizer requests info
						</Label>
						<button 
							onClick={() => handleNotificationChange("infoRequested", !notifications.infoRequested)}
							className={`w-[22px] h-[22px] rounded-sm flex items-center justify-center shrink-0 transition-colors ${notifications.infoRequested ? "bg-[#e83ce8] border-none" : "bg-white/10 border border-white/20"}`}
						>
							{notifications.infoRequested && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
						</button>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-[15px] font-normal text-purple-100/80 cursor-pointer flex-1" onClick={() => handleNotificationChange("taskApproved", !notifications.taskApproved)}>
							Email me when a task is approved
						</Label>
						<button 
							onClick={() => handleNotificationChange("taskApproved", !notifications.taskApproved)}
							className={`w-[22px] h-[22px] rounded-sm flex items-center justify-center shrink-0 transition-colors ${notifications.taskApproved ? "bg-[#e83ce8] border-none" : "bg-white/10 border border-white/20"}`}
						>
							{notifications.taskApproved && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
						</button>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-[15px] font-normal text-purple-100/80 cursor-pointer flex-1" onClick={() => handleNotificationChange("marketing", !notifications.marketing)}>
							Marketing & product updates
						</Label>
						<button 
							onClick={() => handleNotificationChange("marketing", !notifications.marketing)}
							className={`w-[22px] h-[22px] rounded-sm flex items-center justify-center shrink-0 transition-colors ${notifications.marketing ? "bg-[#e83ce8] border-none" : "bg-white/10 border border-white/20"}`}
						>
							{notifications.marketing && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
						</button>
					</div>
				</div>
			</div>

			{/* Sign Out Button */}
			<div className="pt-2">
				<Button 
					variant="ghost" 
					onClick={onLogout}
					className="hover:bg-white/5 text-[#ff6b8b] hover:text-[#ff8ca5] rounded-xl gap-2 h-10 px-4 border border-[#ff6b8b]/20"
				>
					<LogOut className="w-4 h-4" /> Sign out
				</Button>
			</div>

			{/* Edit Profile Dialog */}
			<Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
				<DialogContent className="bg-[#0f0b20] border border-purple-500/20 text-white rounded-2xl">
					<DialogHeader>
						<DialogTitle>Edit Profile</DialogTitle>
						<DialogDescription className="text-purple-200/50">
							Update your personal and artist details.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Profile Image Section */}
						<div className="flex flex-col items-center gap-4 pb-4 border-b border-purple-500/10">
							<div className="relative group cursor-pointer" onClick={() => document.getElementById("profile-upload-input")?.click()}>
								{uploading ? (
									<div className="w-[100px] h-[100px] rounded-full bg-purple-900/30 border-2 border-purple-500/50 flex flex-col items-center justify-center">
										<Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-1" />
										<span className="text-[10px] text-purple-300 font-semibold">{uploadProgress}%</span>
									</div>
								) : imageUrl ? (
									<div className="relative">
										<img 
											src={getImageUrl(imageUrl)} 
											alt="Preview" 
											className="w-[100px] h-[100px] rounded-full object-cover border-2 border-purple-500/50 hover:opacity-85 transition-opacity"
										/>
										<div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
											<Camera className="w-5 h-5 text-white" />
										</div>
									</div>
								) : (
									<div className="w-[100px] h-[100px] rounded-full bg-purple-900/40 border-2 border-purple-500/30 flex items-center justify-center hover:bg-purple-900/50 transition-colors">
										<Camera className="w-6 h-6 text-purple-400" />
									</div>
								)}
							</div>

							<input 
								type="file" 
								id="profile-upload-input" 
								accept="image/png, image/jpeg, image/webp" 
								className="hidden" 
								onChange={handleFileChange}
								disabled={uploading}
							/>

							<div className="flex gap-2.5">
								<Button 
									type="button" 
									variant="outline" 
									size="sm" 
									onClick={() => document.getElementById("profile-upload-input")?.click()}
									disabled={uploading}
									className="border-white/10 hover:bg-white/5 text-xs h-8 text-white rounded-lg"
								>
									<Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Photo
								</Button>
								{imageUrl && (
									<Button 
										type="button" 
										variant="ghost" 
										size="sm" 
										onClick={() => setImageUrl("")}
										disabled={uploading}
										className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-8 rounded-lg"
									>
										<Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
									</Button>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Label>Real Name</Label>
							<Input 
								value={formData.realName}
								onChange={(e) => setFormData({...formData, realName: e.target.value})}
								className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
								placeholder="E.g. Maria Lopez"
							/>
						</div>
						
						<div className="space-y-2">
							<Label>Stage Name</Label>
							<Input 
								value={formData.artistName}
								onChange={(e) => setFormData({...formData, artistName: e.target.value})}
								className="bg-white/5 border-white/10 text-white focus:border-[#bf1ed4]"
								placeholder="E.g. Maria L."
							/>
						</div>

						<div className="space-y-2">
							<Label>Email</Label>
							<Input 
								value={formData.email}
								disabled
								className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
							/>
							<p className="text-xs text-purple-200/30 mt-1">Email cannot be changed directly.</p>
						</div>
					</div>

					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditModalOpen(false)} className="text-purple-200 hover:text-white hover:bg-white/5">
							Cancel
						</Button>
						<Button 
							onClick={handleSaveProfile} 
							disabled={saving || uploading}
							className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white rounded-xl border-0"
						>
							{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
