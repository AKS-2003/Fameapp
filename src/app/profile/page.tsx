"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Mail, Phone, Save } from "lucide-react";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

interface UserProfile {
	id: string;
	email: string;
	role: string;
	status: string;
	profile: {
		firstName: string;
		lastName: string;
		phone?: string;
	};
	createdAt: string;
	lastLogin: string;
}

export default function ProfilePage() {
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
	});

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const response = await fetch("/api/users/profile");
			const data = await response.json();

			if (data.success) {
				setProfile(data.data.user);
				setFormData({
					firstName: data.data.user.profile.firstName,
					lastName: data.data.user.profile.lastName,
					email: data.data.user.email,
					phone: data.data.user.profile.phone || "",
				});
			} else {
				setError(data.error?.message || "Failed to load profile");
			}
		} catch (error) {
			console.error("Profile fetch error:", error);
			setError("Network error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const response = await fetch("/api/users/profile", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (data.success) {
				setProfile(data.data.user);
				setSuccess("Profile updated successfully!");
			} else {
				setError(data.error?.message || "Failed to update profile");
			}
		} catch (error) {
			console.error("Profile update error:", error);
			setError("Network error occurred. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center justify-center p-8">
						<FameLogo width={80} height={80} className="mb-4" />
						<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
						<p className="mt-4 text-gray-600">Loading profile...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 p-4">
			<div className="max-w-2xl mx-auto">
				<Card className="mb-6">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<FameLogo width={60} height={60} />
						</div>
						<CardTitle className="text-2xl font-bold">
							Profile Settings
						</CardTitle>
						<CardDescription>
							Manage your account information
						</CardDescription>
					</CardHeader>
				</Card>

				{profile && (
					<div className="grid gap-6">
						{/* Account Information */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="h-5 w-5" />
									Account Information
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-sm font-medium text-gray-600">
											Role
										</Label>
										<p className="text-lg font-semibold capitalize">
											{profile.role.replace("_", " ")}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-600">
											Status
										</Label>
										<p
											className={`text-lg font-semibold capitalize ${
												profile.status === "active"
													? "text-green-600"
													: profile.status ===
														  "pending"
														? "text-yellow-600"
														: "text-red-600"
											}`}
										>
											{profile.status}
										</p>
									</div>
								</div>
								<div>
									<Label className="text-sm font-medium text-gray-600">
										Member Since
									</Label>
									<p className="text-lg">
										{new Date(
											profile.createdAt,
										).toLocaleDateString()}
									</p>
								</div>
							</CardContent>
						</Card>

						{/* Profile Form */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Mail className="h-5 w-5" />
									Personal Information
								</CardTitle>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={handleSubmit}
									className="space-y-4"
								>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="firstName">
												First Name
											</Label>
											<Input
												id="firstName"
												type="text"
												value={formData.firstName}
												onChange={(e) =>
													handleInputChange(
														"firstName",
														e.target.value,
													)
												}
												required
												placeholder="First name"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="lastName">
												Last Name
											</Label>
											<Input
												id="lastName"
												type="text"
												value={formData.lastName}
												onChange={(e) =>
													handleInputChange(
														"lastName",
														e.target.value,
													)
												}
												required
												placeholder="Last name"
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="email">
											Email Address
										</Label>
										<Input
											id="email"
											type="email"
											value={formData.email}
											onChange={(e) =>
												handleInputChange(
													"email",
													e.target.value,
												)
											}
											required
											placeholder="Enter your email"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="phone"
											className="flex items-center gap-2"
										>
											<svg
												className="h-4 w-4 text-green-600"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
											</svg>
											WhatsApp Number
										</Label>
										<Input
											id="phone"
											type="tel"
											value={formData.phone}
											onChange={(e) =>
												handleInputChange(
													"phone",
													e.target.value,
												)
											}
											placeholder="+971528411575"
										/>
									</div>

									{error && (
										<Alert variant="destructive">
											<AlertDescription>
												{error}
											</AlertDescription>
										</Alert>
									)}

									{success && (
										<Alert className="border-green-200 bg-green-50">
											<AlertDescription className="text-green-800">
												{success}
											</AlertDescription>
										</Alert>
									)}

									<Button
										type="submit"
										className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
										disabled={saving}
									>
										{saving ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Saving...
											</>
										) : (
											<>
												<Save className="mr-2 h-4 w-4" />
												Save Changes
											</>
										)}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>
				)}
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="light" />
				</div>
			</div>
		</div>
	);
}
