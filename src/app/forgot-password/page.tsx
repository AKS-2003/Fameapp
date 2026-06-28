"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				// Start cooldown for resend button
				setResendCooldown(60);
				const interval = setInterval(() => {
					setResendCooldown((prev) => {
						if (prev <= 1) {
							clearInterval(interval);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);

				// Redirect to pending page after 2 seconds
				setTimeout(() => {
					router.push(
						`/forgot-password-pending?email=${encodeURIComponent(
							email,
						)}`,
					);
				}, 2000);
			} else {
				setError(
					result.error?.message || "Failed to send reset request",
				);
			}
		} catch (error) {
			console.error("Forgot password error:", error);
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (resendCooldown > 0) return;

		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email }),
			});

			const result = await response.json();

			if (result.success) {
				// Start cooldown again
				setResendCooldown(60);
				const interval = setInterval(() => {
					setResendCooldown((prev) => {
						if (prev <= 1) {
							clearInterval(interval);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			} else {
				setError(result.error?.message || "Failed to resend email");
			}
		} catch (error) {
			console.error("Resend error:", error);
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-2 sm:p-4">
			<style jsx global>{`
				.input-modern {
					background: rgba(255, 255, 255, 0.03) !important;
					border: 1px solid rgba(255, 255, 255, 0.08) !important;
					border-radius: 14px !important;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
					color: white !important;
				}
				.input-modern:focus {
					background: rgba(255, 255, 255, 0.05) !important;
					border-color: rgba(168, 85, 247, 0.4) !important;
					box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.1) !important;
				}
				.input-modern::placeholder {
					color: rgba(255, 255, 255, 0.2) !important;
				}
			`}</style>
			<div className="w-full max-w-md space-y-4 sm:space-y-8">
				{/* Logo and Header */}
				<div className="text-center">
					<div className="flex justify-center mb-4 sm:mb-6">
						<FameLogo
							width={60}
							height={60}
							className="sm:w-20 sm:h-20"
						/>
					</div>
					<h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
						Forgot Password
					</h1>
					<p className="text-gray-400 text-base sm:text-lg">
						Request a password reset from admin
					</p>
				</div>

				{/* Forgot Password Form */}
				<Card className="bg-purple-800/50 border-purple-600">
					<CardHeader className="p-4 sm:p-6">
						<CardTitle className="text-white text-center text-lg sm:text-xl">
							Reset Your Password
						</CardTitle>
						<CardDescription className="text-gray-400 text-center text-sm">
							Enter your email address and we'll notify the admin
							to reset your password
						</CardDescription>
					</CardHeader>
					<CardContent className="p-4 sm:p-6">
						{!success ? (
							<form
								onSubmit={handleSubmit}
								className="space-y-4 sm:space-y-6"
							>
								{/* Error Alert */}
								{error && (
									<Alert className="bg-red-900/20 border-red-800 text-red-400">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{error}
										</AlertDescription>
									</Alert>
								)}

								{/* Email Field */}
								<div className="space-y-2">
									<Label
										htmlFor="email"
										className="text-gray-300"
									>
										Email Address
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder="Enter your registered email"
										required
										className="input-modern"
									/>
								</div>

								{/* Admin Contact Info */}
								<div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
									<h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
										<Mail className="h-4 w-4" />
										Admin Contact Details
									</h3>
									<div className="space-y-1 text-sm text-gray-300">
										<p>
											📞 Phone:{" "}
											<a
												href="tel:+971528411575"
												className="text-blue-400 hover:underline"
											>
												+971 52 841 1575
											</a>
										</p>
										<p>
											📧 Email:{" "}
											<a
												href="mailto:ericlaltaevents@gmail.com"
												className="text-blue-400 hover:underline"
											>
												ericlaltaevents@gmail.com
											</a>
										</p>
									</div>
								</div>

								{/* Submit Button */}
								<Button
									type="submit"
									disabled={loading}
									className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 sm:py-3 text-sm sm:text-base"
								>
									{loading ? (
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Sending Request...
										</div>
									) : (
										<div className="flex items-center justify-center">
											<Mail className="h-4 w-4 mr-2" />
											Send to Admin
										</div>
									)}
								</Button>
							</form>
						) : (
							<div className="space-y-4">
								{/* Success Alert */}
								<Alert className="bg-green-900/20 border-green-800 text-green-400">
									<CheckCircle className="h-4 w-4" />
									<AlertDescription>
										Password reset request sent
										successfully! The admin will contact you
										shortly.
									</AlertDescription>
								</Alert>

								{/* Resend Button */}
								<Button
									onClick={handleResend}
									disabled={resendCooldown > 0 || loading}
									variant="outline"
									className="w-full"
								>
									{resendCooldown > 0
										? `Resend in ${resendCooldown}s`
										: "Resend Email"}
								</Button>
							</div>
						)}

						{/* Back to Login Link */}
						<div className="mt-4 sm:mt-6 text-center">
							<Link
								href="/login"
								className="text-purple-400 hover:text-purple-300 font-medium text-sm sm:text-base inline-flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Login
							</Link>
						</div>
					</CardContent>
				</Card>

				{/* Footer */}
				<FantasiaFooter variant="dark" className="text-center" />
			</div>
		</div>
	);
}
