"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import {
	Eye,
	EyeOff,
	LogIn,
	AlertCircle,
	Shield,
	ShieldCheck,
	Lock,
	AlertTriangle,
	LogOut,
} from "lucide-react";

function SuperAdminLoginContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectUrl = searchParams.get("redirect");
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [checkingSession, setCheckingSession] = useState(true);
	const [sessionConflict, setSessionConflict] = useState<
		"artist" | "stage_manager" | null
	>(null);

	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						const { role, status } = result.data;

						// Already logged in as super admin
						if (role === "super_admin") {
							router.push(redirectUrl || "/super-admin");
							return;
						}

						// Session conflict — different role logged in
						if (role === "artist") {
							setSessionConflict("artist");
							setCheckingSession(false);
							return;
						}
						if (role === "stage_manager" || role === "dj") {
							setSessionConflict("stage_manager");
							setCheckingSession(false);
							return;
						}
					}
				}
			} catch {
				// No session — show login form
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
				const { role } = result.data.user || {};
				if (role !== "super_admin") {
					setError(
						"Access denied. This portal is only for Super Admins.",
					);
					// Log them out immediately
					await fetch("/api/auth/logout", { method: "POST" });
					return;
				}
				router.push(redirectUrl || "/super-admin");
			} else {
				setError(result.error?.message || "Login failed. Please check your credentials.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		window.location.reload();
	};

	if (checkingSession) {
		return (
			<div className="min-h-screen bg-[#06000f] text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4" />
					<p className="text-gray-400">Checking session...</p>
				</div>
			</div>
		);
	}

	// ── SESSION CONFLICT SCREEN ──────────────────────────────────────────────
	if (sessionConflict) {
		const roleLabel =
			sessionConflict === "artist" ? "Artist" : "Stage Manager";
		return (
			<div className="min-h-screen bg-[#06000f] text-white flex items-center justify-center p-4">
				<div
					className="w-full max-w-md rounded-2xl border border-orange-500/30 p-8 text-center"
					style={{
						background: "rgba(15, 5, 30, 0.85)",
						backdropFilter: "blur(20px)",
						boxShadow:
							"0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,165,0,0.1)",
					}}
				>
					<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/30">
						<AlertTriangle className="h-8 w-8 text-orange-400" />
					</div>
					<h2 className="text-2xl font-bold text-white mb-2">
						Session Conflict
					</h2>
					<p className="text-gray-400 text-sm mb-6">
						You are currently logged in as a{" "}
						<span className="font-semibold text-orange-400">
							{roleLabel}
						</span>
						. Please log out first to access the Super Admin portal.
					</p>
					<div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-sm text-orange-300 leading-relaxed mb-6 text-left">
						⚠️ You cannot be logged into two different roles in the
						same browser. Logout from your{" "}
						<strong>{roleLabel} profile</strong> to continue.
					</div>
					<div className="space-y-3">
						<Button
							onClick={handleLogout}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-11 rounded-xl"
						>
							<LogOut className="h-4 w-4 mr-2" />
							Logout from {roleLabel} Profile
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
				.input-admin {
					background: rgba(255, 255, 255, 0.03) !important;
					border: 1px solid rgba(255, 255, 255, 0.08) !important;
					border-radius: 14px !important;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
					color: white !important;
				}
				.input-admin:focus {
					background: rgba(255, 255, 255, 0.05) !important;
					border-color: rgba(245, 158, 11, 0.5) !important;
					box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1) !important;
				}
				.input-admin::placeholder {
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
			<div className="absolute inset-0 z-0 bg-black/60" />
			<div className="absolute inset-0 z-0">
				<div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-amber-900/15 rounded-full blur-[150px]" />
				<div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] bg-purple-900/15 rounded-full blur-[150px]" />
			</div>

			{/* Content */}
			<div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-20 py-8 pb-24">
				<div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
					{/* ── LEFT: Login Form ── */}
					<div className="flex flex-col items-center lg:items-start w-full max-w-md mx-auto lg:mx-0">
						{/* Logo + Badge */}
						<div className="mb-6 flex items-center gap-3">
							<FameLogo width={60} height={60} />
							<div
								className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
								style={{
									background: "rgba(245, 158, 11, 0.15)",
									border: "1px solid rgba(245, 158, 11, 0.3)",
									color: "#FCD34D",
								}}
							>
								<ShieldCheck className="h-3.5 w-3.5" />
								Super Admin Portal
							</div>
						</div>

						{/* Welcome Text */}
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2">
							Admin{" "}
							<span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
								Access Only
							</span>
						</h1>
						<p className="text-gray-400 text-sm sm:text-base mb-8">
							Sign in with your Super Admin credentials to
							continue.
						</p>

						{/* Security Notice */}
						<div
							className="w-full mb-5 rounded-xl border border-amber-500/20 p-4 flex items-start gap-3"
							style={{
								background: "rgba(120, 80, 0, 0.15)",
								backdropFilter: "blur(10px)",
							}}
						>
							<Lock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
							<p className="text-amber-200/80 text-xs leading-relaxed">
								This is a restricted area. Unauthorized access
								attempts are logged. Only Super Admins may
								proceed.
							</p>
						</div>

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
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}

								<div className="space-y-2">
									<Label
										htmlFor="email"
										className="text-gray-300 text-sm font-medium"
									>
										Admin Email
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										value={formData.email}
										onChange={handleInputChange}
										placeholder="admin@yourdomain.com"
										required
										className="input-admin h-11"
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
											className="input-admin h-11 pr-10"
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
									className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] h-12"
								>
									{loading ? (
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
											Authenticating...
										</div>
									) : (
										<div className="flex items-center justify-center">
											<Shield className="h-4 w-4 mr-2" />
											Secure Sign In
										</div>
									)}
								</Button>
							</form>
						</div>
					</div>

					{/* ── RIGHT: Info Panel ── */}
					<div className="hidden lg:flex flex-col gap-6">
						<div
							className="rounded-2xl border border-amber-500/15 p-8"
							style={{
								background: "rgba(15, 5, 30, 0.5)",
								backdropFilter: "blur(20px)",
							}}
						>
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25">
									<ShieldCheck className="h-6 w-6 text-amber-400" />
								</div>
								<h2 className="text-xl font-bold text-white">
									Super Admin Dashboard
								</h2>
							</div>
							<p className="text-gray-400 text-sm mb-6 leading-relaxed">
								The FAME Super Admin portal gives you full
								control over Stage Manager accounts, artist
								management, and subscription oversight across
								the platform.
							</p>
							<ul className="space-y-3 text-sm">
								{[
									"Approve & reject Stage Manager registrations",
									"Manage account statuses (activate, suspend, deactivate)",
									"Change credentials for any Stage Manager",
									"View all artists and their subscription plans",
									"Monitor real-time platform activity",
								].map((item) => (
									<li
										key={item}
										className="flex items-start gap-2 text-gray-300"
									>
										<div className="mt-0.5 h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
											<div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										</div>
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="absolute bottom-0 left-0 right-0 z-10 px-6 lg:px-20 py-4">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}

export default function SuperAdminLoginPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#06000f] flex items-center justify-center p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4" />
				</div>
			}
		>
			<SuperAdminLoginContent />
		</Suspense>
	);
}
