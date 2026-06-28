"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import {
	Eye,
	EyeOff,
	Loader2,
	CheckCircle,
	AlertCircle,
	Lock,
} from "lucide-react";

function ResetPasswordContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") || "";

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (newPassword.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (!token) {
			setError("Invalid reset link. Please request a new one.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/artist/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, newPassword }),
			});
			const data = await res.json();
			if (data.success) {
				setSuccess(true);
				setTimeout(() => router.push("/famelink-auth"), 3000);
			} else {
				setError(data.error?.message || "Failed to reset password");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (!token) {
		return (
			<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center p-4">
				<div className="w-full max-w-md text-center space-y-6">
					<FameLinkLogo width={64} height={64} />
					<div
						className="rounded-2xl border border-red-500/20 p-8 space-y-4"
						style={{ background: "rgba(15,5,30,0.7)" }}
					>
						<AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
						<h2 className="text-xl font-bold">
							Invalid Reset Link
						</h2>
						<p className="text-gray-400 text-sm">
							This password reset link is invalid or has expired.
						</p>
						<Link
							href="/famelink-forgot-password"
							className="inline-block text-purple-400 hover:text-purple-300 text-sm"
						>
							Request a new reset link
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center p-4">
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
			<div className="w-full max-w-md">
				<div className="flex justify-center mb-6">
					<FameLinkLogo width={64} height={64} />
				</div>

				{success ? (
					<div
						className="rounded-2xl border border-white/10 p-8 text-center space-y-5"
						style={{
							background: "rgba(15,5,30,0.7)",
							backdropFilter: "blur(20px)",
						}}
					>
						<div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
							<CheckCircle className="h-8 w-8 text-green-400" />
						</div>
						<h2 className="text-2xl font-bold">Password Reset</h2>
						<p className="text-gray-400 text-sm">
							Your password has been updated successfully.
							Redirecting to sign in...
						</p>
						<Link
							href="/famelink-auth"
							className="inline-block text-purple-400 hover:text-purple-300 text-sm"
						>
							Go to Sign In
						</Link>
					</div>
				) : (
					<div
						className="rounded-2xl border border-white/10 p-8 space-y-6"
						style={{
							background: "rgba(15,5,30,0.7)",
							backdropFilter: "blur(20px)",
						}}
					>
						<div className="text-center">
							<div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
								<Lock className="h-7 w-7 text-purple-400" />
							</div>
							<h1 className="text-2xl font-bold mb-2">
								Set New Password
							</h1>
							<p className="text-gray-400 text-sm">
								Enter your new password below.
							</p>
						</div>

						{error && (
							<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
								<AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
								<p className="text-sm text-red-300">{error}</p>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label
									htmlFor="newPassword"
									className="text-gray-300 text-sm"
								>
									New Password
								</Label>
								<div className="relative">
									<Input
										id="newPassword"
										type={
											showPassword ? "text" : "password"
										}
										value={newPassword}
										onChange={(e) => {
											setNewPassword(e.target.value);
											setError("");
										}}
										placeholder="Min 8 characters"
										required
										className="input-modern h-11 pr-10"
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="confirmPassword"
									className="text-gray-300 text-sm"
								>
									Confirm New Password
								</Label>
								<Input
									id="confirmPassword"
									type={showPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value);
										setError("");
									}}
									placeholder="Confirm new password"
									required
									className="input-modern h-11"
								/>
							</div>
							<Button
								type="submit"
								disabled={loading}
								className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl h-12 font-semibold shadow-lg shadow-purple-500/20"
							>
								{loading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
										Resetting...
									</>
								) : (
									<>
										<Lock className="h-4 w-4 mr-2" /> Reset
										Password
									</>
								)}
							</Button>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}

export default function FameLinkResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#06020f] flex items-center justify-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
				</div>
			}
		>
			<ResetPasswordContent />
		</Suspense>
	);
}
