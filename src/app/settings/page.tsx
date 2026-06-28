"use client";

import { useState } from "react";
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
import { Loader2, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { FameLogo } from "@/components/ui/fame-logo";
import Link from "next/link";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function SettingsPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [formData, setFormData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		if (formData.newPassword !== formData.confirmPassword) {
			setError("New passwords do not match");
			setLoading(false);
			return;
		}

		if (formData.newPassword.length < 8) {
			setError("New password must be at least 8 characters long");
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("/api/users/change-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess("Password changed successfully!");
				setFormData({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
			} else {
				setError(data.error?.message || "Failed to change password");
			}
		} catch (error) {
			console.error("Password change error:", error);
			setError("Network error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 p-4">
			<div className="max-w-2xl mx-auto">
				<Card className="mb-6">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<FameLogo width={60} height={60} />
						</div>
						<CardTitle className="text-2xl font-bold">
							Account Settings
						</CardTitle>
						<CardDescription>
							Manage your account security and preferences
						</CardDescription>
					</CardHeader>
				</Card>

				<div className="grid gap-6">
					{/* Navigation */}
					<Card>
						<CardContent className="p-4">
							<div className="flex flex-wrap gap-2">
								<Link href="/profile">
									<Button
										variant="outline"
										className="flex items-center gap-2"
									>
										<Shield className="h-4 w-4" />
										Profile
									</Button>
								</Link>
								<Button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
									<Lock className="h-4 w-4" />
									Security
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Password Change Form */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Lock className="h-5 w-5" />
								Change Password
							</CardTitle>
							<CardDescription>
								Update your password to keep your account secure
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="currentPassword">
										Current Password
									</Label>
									<div className="relative">
										<Input
											id="currentPassword"
											type={
												showCurrentPassword
													? "text"
													: "password"
											}
											value={formData.currentPassword}
											onChange={(e) =>
												handleInputChange(
													"currentPassword",
													e.target.value,
												)
											}
											required
											placeholder="Enter your current password"
											className="pr-10"
										/>
										<button
											type="button"
											className="absolute inset-y-0 right-0 pr-3 flex items-center"
											onClick={() =>
												setShowCurrentPassword(
													!showCurrentPassword,
												)
											}
										>
											{showCurrentPassword ? (
												<EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											) : (
												<Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											)}
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="newPassword">
										New Password
									</Label>
									<div className="relative">
										<Input
											id="newPassword"
											type={
												showNewPassword
													? "text"
													: "password"
											}
											value={formData.newPassword}
											onChange={(e) =>
												handleInputChange(
													"newPassword",
													e.target.value,
												)
											}
											required
											placeholder="Enter your new password (min 8 characters)"
											className="pr-10"
										/>
										<button
											type="button"
											className="absolute inset-y-0 right-0 pr-3 flex items-center"
											onClick={() =>
												setShowNewPassword(
													!showNewPassword,
												)
											}
										>
											{showNewPassword ? (
												<EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											) : (
												<Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											)}
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="confirmPassword">
										Confirm New Password
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											type={
												showConfirmPassword
													? "text"
													: "password"
											}
											value={formData.confirmPassword}
											onChange={(e) =>
												handleInputChange(
													"confirmPassword",
													e.target.value,
												)
											}
											required
											placeholder="Confirm your new password"
											className="pr-10"
										/>
										<button
											type="button"
											className="absolute inset-y-0 right-0 pr-3 flex items-center"
											onClick={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
										>
											{showConfirmPassword ? (
												<EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											) : (
												<Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
											)}
										</button>
									</div>
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
									disabled={loading}
								>
									{loading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Changing Password...
										</>
									) : (
										<>
											<Lock className="mr-2 h-4 w-4" />
											Change Password
										</>
									)}
								</Button>
							</form>
						</CardContent>
					</Card>

					{/* Security Tips */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Security Tips
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2 text-sm text-gray-600">
								<li>
									- Use a strong password with at least 8
									characters
								</li>
								<li>
									- Include uppercase and lowercase letters,
									numbers, and symbols
								</li>
								<li>
									- Don't reuse passwords from other accounts
								</li>
								<li>- Change your password regularly</li>
								<li>- Never share your password with anyone</li>
							</ul>
						</CardContent>
					</Card>
				</div>
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="light" />
				</div>
			</div>
		</div>
	);
}
