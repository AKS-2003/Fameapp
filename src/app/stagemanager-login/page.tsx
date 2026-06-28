"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { Eye, EyeOff, LogIn, AlertCircle, Shield, AlertTriangle, LogOut } from "lucide-react";

function StageManagerLoginContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const accessToken = searchParams.get("accessToken");
	const redirectUrl = searchParams.get("redirect");
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [checkingSession, setCheckingSession] = useState(true);
	const [sessionConflict, setSessionConflict] = useState(false);

	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						const { role, status } = result.data;

						// ── SESSION CONFLICT: Artist is trying to login as Stage Manager ──
						if (role === "artist") {
							setSessionConflict(true);
							setCheckingSession(false);
							return;
						}

						if (redirectUrl) {
							router.push(redirectUrl);
							return;
						}
						if (status === "pending")
							router.push("/stage-manager-pending");
						else if (role === "super_admin")
							router.push("/super-admin");
						else if (role === "stage_manager")
							router.push("/stage-manager");
						else if (role === "dj") router.push("/dj");
						else router.push("/");
						return;
					}
				}
			} catch (error) {
				console.log("No active session found");
			} finally {
				setCheckingSession(false);
			}
		};
		checkSession();
	}, [router, redirectUrl]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
		if (error) setError("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			const result = await response.json();
			if (result.success) {
				router.push(redirectUrl || result.data.redirectUrl || "/");
			} else {
				setError(result.error?.message || "Login failed");
			}
		} catch (error) {
			console.error("Login error:", error);
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (checkingSession) {
		return (
			<div className="min-h-screen bg-[#06000f] text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4" />
					<p className="text-gray-400">Checking session...</p>
				</div>
			</div>
		);
	}

	// ── SESSION CONFLICT SCREEN ──────────────────────────────────────────────
	if (sessionConflict) {
		const handleLogout = async () => {
			await fetch("/api/auth/logout", { method: "POST" });
			window.location.reload();
		};

		return (
			<div className="min-h-screen bg-[#06000f] text-white flex items-center justify-center p-4">
				<div
					className="w-full max-w-md rounded-2xl border border-orange-500/30 p-8 text-center"
					style={{
						background: "rgba(15, 5, 30, 0.85)",
						backdropFilter: "blur(20px)",
						boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,165,0,0.1)",
					}}
				>
					<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/30">
						<AlertTriangle className="h-8 w-8 text-orange-400" />
					</div>
					<h2 className="text-2xl font-bold text-white mb-2">Session Conflict</h2>
					<p className="text-gray-400 text-sm mb-6">
						You are currently logged in as an{" "}
						<span className="font-semibold text-orange-400">Artist</span>.
					</p>
					<div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-sm text-orange-300 leading-relaxed mb-6 text-left">
						⚠️ Please <strong>logout from your Artist profile</strong> before logging in as a Stage Manager. You cannot be logged into two different roles in the same browser.
					</div>
					<div className="space-y-3">
						<Button
							onClick={handleLogout}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11 rounded-xl"
						>
							<LogOut className="h-4 w-4 mr-2" />
							Logout from Artist Profile
						</Button>
						<Button
							variant="outline"
							onClick={() => router.back()}
							className="w-full h-11 rounded-xl border-white/10 text-gray-300 hover:bg-white/5"
						>
							Go Back
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-white relative overflow-hidden">
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
			{/* Background */}
			<div
				className="absolute inset-0 z-0"
				style={{
					backgroundImage: "url('/background.png')",
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}
			/>
			<div className="absolute inset-0 z-0 bg-black/50" />
			<div className="absolute inset-0 z-0">
				<div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[150px]" />
				<div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] bg-pink-900/15 rounded-full blur-[150px]" />
			</div>

			{/* Content */}
			<div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-20 py-8 pb-20">
				<div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
					{/* ── LEFT: Login Form ── */}
					<div className="flex flex-col items-center lg:items-start w-full max-w-md mx-auto lg:mx-0">
						{/* Logo */}
						<div className="mb-6">
							<FameLogo width={70} height={70} />
						</div>

						{/* Welcome Text */}
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2">
							Welcome Back{" "}
							<span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
								FAME Manager
							</span>
						</h1>
						<p className="text-gray-400 text-sm sm:text-base mb-8">
							Sign in to your account
						</p>

						{/* Access Grant Banner */}
						{accessToken && (
							<div
								className="w-full mb-4 rounded-xl border border-indigo-500/30 p-4 flex items-start gap-3"
								style={{
									background: "rgba(49, 46, 129, 0.3)",
									backdropFilter: "blur(10px)",
								}}
							>
								<Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
								<div>
									<p className="text-indigo-200 font-medium text-sm">
										You&apos;ve been granted event access
									</p>
									<p className="text-indigo-300/70 text-xs mt-1">
										Sign in or create an account to
										continue.
									</p>
								</div>
							</div>
						)}

						{/* Form Card */}
						<div
							className="w-full rounded-2xl border border-white/10 p-6 sm:p-8"
							style={{
								background: "rgba(15, 5, 30, 0.6)",
								backdropFilter: "blur(20px)",
								boxShadow:
									"0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
							}}
						>
							<form onSubmit={handleSubmit} className="space-y-5">
								{error && (
									<Alert className="bg-red-900/20 border-red-800 text-red-400">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{error}
										</AlertDescription>
									</Alert>
								)}

								<div className="space-y-2">
									<Label
										htmlFor="email"
										className="text-gray-300 text-sm font-medium"
									>
										Email Address
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										value={formData.email}
										onChange={handleInputChange}
										placeholder="Enter your email"
										required
										className="input-modern h-11"
									/>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="password"
										className="text-gray-300 text-sm font-medium"
									>
										Password
									</Label>
									<div className="relative">
										<Input
											id="password"
											name="password"
											type={
												showPassword
													? "text"
													: "password"
											}
											value={formData.password}
											onChange={handleInputChange}
											placeholder="Enter your password"
											required
											className="input-modern h-11 pr-10"
										/>
										<button
											type="button"
											onClick={() =>
												setShowPassword(!showPassword)
											}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>

								<Button
									type="submit"
									disabled={loading}
									className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] h-12"
								>
									{loading ? (
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
											Signing In...
										</div>
									) : (
										<div className="flex items-center justify-center">
											<LogIn className="h-4 w-4 mr-2" />
											Sign In
										</div>
									)}
								</Button>
							</form>

							<div className="mt-6 space-y-3">
								<div className="text-center">
									<Link
										href="/forgot-password"
										className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
									>
										Forgot Password?
									</Link>
								</div>
								<div className="text-center text-gray-500 text-sm">
									Don&apos;t have an account?{" "}
									<Link
										href={
											accessToken && redirectUrl
												? `/stagemanager-register?accessToken=${encodeURIComponent(accessToken)}&redirect=${encodeURIComponent(redirectUrl)}`
												: "/stagemanager-register"
										}
										className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
									>
										Sign up here
									</Link>
								</div>
							</div>
						</div>
					</div>

					{/* ── RIGHT: Empty (background shows through) ── */}
					<div className="hidden lg:block" />
				</div>
			</div>

			{/* Footer */}
			<div className="absolute bottom-0 left-0 right-0 z-10 px-6 lg:px-20 py-4">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}

export default function StageManagerLoginPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#06000f] flex items-center justify-center p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4" />
				</div>
			}
		>
			<StageManagerLoginContent />
		</Suspense>
	);
}
