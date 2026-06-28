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
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function StageManagerRegisterContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const accessToken = searchParams.get("accessToken");
	const redirectUrl = searchParams.get("redirect");
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		phone: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);

	const [emailVerified, setEmailVerified] = useState(false);
	const [verificationCodeSent, setVerificationCodeSent] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [sendingCode, setSendingCode] = useState(false);
	const [verifyingCode, setVerifyingCode] = useState(false);

	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						if (redirectUrl) {
							router.push(redirectUrl);
							return;
						}
						const { role, status } = result.data;
						if (status === "pending")
							router.push("/stage-manager-pending");
						else if (role === "super_admin")
							router.push("/super-admin");
						else if (role === "stage_manager")
							router.push("/stage-manager");
						else if (role === "artist")
							router.push("/artist-dashboard");
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

	const sendVerificationCode = async () => {
		if (!formData.email) {
			setError("Please enter your email address first");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			setError("Please enter a valid email address");
			return;
		}
		setSendingCode(true);
		setError("");
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: formData.email,
					action: "send",
					type: "stage_manager",
				}),
			});
			const data = await response.json();
			if (data.success) {
				setVerificationCodeSent(true);
				setError("");
			} else
				setError(
					data.error?.message || "Failed to send verification code",
				);
		} catch (error) {
			setError("Network error. Please try again.");
		} finally {
			setSendingCode(false);
		}
	};

	const verifyEmailCode = async () => {
		if (verificationCode.length !== 6) {
			setError("Please enter the 6-digit verification code");
			return;
		}
		setVerifyingCode(true);
		setError("");
		try {
			const response = await fetch("/api/verify-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: formData.email,
					code: verificationCode,
					action: "verify",
					type: "stage_manager",
				}),
			});
			const data = await response.json();
			if (data.success) {
				setEmailVerified(true);
				setVerificationCodeSent(false);
				setVerificationCode("");
				setError("");
			} else setError(data.error?.message || "Invalid verification code");
		} catch (error) {
			setError("Network error. Please try again.");
		} finally {
			setVerifyingCode(false);
		}
	};

	const validateForm = () => {
		if (
			!formData.email ||
			!formData.password ||
			!formData.firstName ||
			!formData.lastName
		) {
			setError("Please fill in all required fields");
			return false;
		}
		if (!emailVerified) {
			setError("Please verify your email address first");
			return false;
		}
		if (formData.password !== formData.confirmPassword) {
			setError("Passwords do not match");
			return false;
		}
		if (formData.password.length < 8) {
			setError("Password must be at least 8 characters long");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;
		setLoading(true);
		setError("");
		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: formData.email,
					password: formData.password,
					firstName: formData.firstName,
					lastName: formData.lastName,
					phone: formData.phone || undefined,
				}),
			});
			const result = await response.json();
			if (result.success) {
				setSuccess(true);
				try {
					const loginResponse = await fetch("/api/auth/login", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: formData.email,
							password: formData.password,
						}),
					});
					const loginResult = await loginResponse.json();
					const destination = redirectUrl || "/stage-manager-pending";
					setTimeout(
						() =>
							router.push(
								loginResult.success
									? destination
									: accessToken && redirectUrl
										? `/stagemanager-login?accessToken=${encodeURIComponent(accessToken)}&redirect=${encodeURIComponent(redirectUrl)}`
										: "/stagemanager-login",
							),
						2000,
					);
				} catch (error) {
					setTimeout(() => router.push("/stagemanager-login"), 2000);
				}
			} else setError(result.error?.message || "Registration failed");
		} catch (error) {
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

	if (success) {
		return (
			<div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center p-4">
				<div
					className="absolute inset-0 z-0"
					style={{
						backgroundImage: "url('/background.png')",
						backgroundSize: "cover",
						backgroundPosition: "center",
					}}
				/>
				<div className="absolute inset-0 z-0 bg-black/60" />
				<div className="relative z-10 w-full max-w-md text-center space-y-6">
					<div className="flex justify-center mb-6">
						<FameLogo width={80} height={80} />
					</div>
					<Card className="bg-purple-300/50 border-purple-600">
						<CardContent className="p-8">
							<div className="text-center space-y-4">
								<CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
								<h2 className="text-2xl font-bold text-white">
									Registration Successful!
								</h2>
								<p className="text-gray-400">
									Your account has been created. Your account
									is pending admin approval.
								</p>
								<p className="text-sm text-gray-500 mt-4">
									Redirecting...
								</p>
							</div>
						</CardContent>
					</Card>
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
					{/* ── LEFT: Register Form ── */}
					<div className="flex flex-col items-center lg:items-start w-full max-w-md mx-auto lg:mx-0">
						{/* Logo */}
						<div className="mb-4">
							<FameLogo width={60} height={60} />
						</div>

						{/* Header */}
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-1">
							Welcome to{" "}
							<span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
								FAME Manager
							</span>
						</h1>
						<p className="text-gray-400 text-sm sm:text-base mb-6">
							Create your account to get started
						</p>

						{/* Form Card */}
						<div
							className="w-full rounded-2xl border border-white/10 p-5 sm:p-6"
							style={{
								background: "rgba(15, 5, 30, 0.6)",
								backdropFilter: "blur(20px)",
								boxShadow:
									"0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
							}}
						>
							<form
								onSubmit={handleSubmit}
								className="space-y-3.5"
							>
								{error && (
									<Alert className="bg-red-900/20 border-red-800 text-red-400">
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											{error}
										</AlertDescription>
									</Alert>
								)}

								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1.5">
										<Label
											htmlFor="firstName"
											className="text-gray-300 text-xs font-medium"
										>
											First Name *
										</Label>
										<Input
											id="firstName"
											name="firstName"
											type="text"
											value={formData.firstName}
											onChange={handleInputChange}
											placeholder="First name"
											required
											className="input-modern h-10 text-sm"
										/>
									</div>
									<div className="space-y-1.5">
										<Label
											htmlFor="lastName"
											className="text-gray-300 text-xs font-medium"
										>
											Last Name *
										</Label>
										<Input
											id="lastName"
											name="lastName"
											type="text"
											value={formData.lastName}
											onChange={handleInputChange}
											placeholder="Last name"
											required
											className="input-modern h-10 text-sm"
										/>
									</div>
								</div>

								{/* Email with Verification */}
								<div className="space-y-1.5">
									<Label
										htmlFor="email"
										className="text-gray-300 text-xs font-medium"
									>
										Email Address *{" "}
										{emailVerified && (
											<span className="text-green-400 text-xs">
												✓ Verified
											</span>
										)}
									</Label>
									<div className="flex gap-2">
										<Input
											id="email"
											name="email"
											type="email"
											value={formData.email}
											onChange={(e) => {
												handleInputChange(e);
												setEmailVerified(false);
												setVerificationCodeSent(false);
											}}
											placeholder="Enter your email"
											required
											disabled={emailVerified}
											className={`input-modern h-10 text-sm ${emailVerified ? "!bg-green-900/20 !border-green-500" : ""}`}
										/>
										{!emailVerified && (
											<Button
												type="button"
												onClick={sendVerificationCode}
												disabled={
													sendingCode ||
													!formData.email ||
													verificationCodeSent
												}
												className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap text-xs px-3 rounded-xl h-10"
											>
												{sendingCode
													? "Sending..."
													: verificationCodeSent
														? "Code Sent"
														: "Verify Email"}
											</Button>
										)}
									</div>
									{verificationCodeSent && !emailVerified && (
										<div className="space-y-2 mt-2 p-3 bg-blue-900/20 border border-blue-600/50 rounded-xl">
											<div className="text-blue-400 text-xs">
												<p className="font-semibold">
													📧 Verification code sent!
												</p>
												<p className="text-gray-400 mt-0.5">
													Check your email for a
													6-digit code
												</p>
											</div>
											<div className="flex gap-2">
												<Input
													type="text"
													value={verificationCode}
													onChange={(e) => {
														const v =
															e.target.value.replace(
																/\D/g,
																"",
															);
														if (v.length <= 6)
															setVerificationCode(
																v,
															);
													}}
													placeholder="000000"
													maxLength={6}
													className="input-modern text-center text-base tracking-widest font-mono h-10"
												/>
												<Button
													type="button"
													onClick={verifyEmailCode}
													disabled={
														verifyingCode ||
														verificationCode.length !==
															6
													}
													className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap text-xs px-3 rounded-xl h-10"
												>
													{verifyingCode
														? "Verifying..."
														: "Verify"}
												</Button>
											</div>
											<Button
												type="button"
												onClick={sendVerificationCode}
												disabled={sendingCode}
												variant="ghost"
												className="text-blue-400 hover:text-blue-300 text-xs w-full h-8"
											>
												{sendingCode
													? "Sending..."
													: "Resend Code"}
											</Button>
										</div>
									)}
								</div>

								<div className="space-y-1.5">
									<Label
										htmlFor="phone"
										className="text-gray-300 text-xs font-medium"
									>
										Phone Number
									</Label>
									<Input
										id="phone"
										name="phone"
										type="tel"
										value={formData.phone}
										onChange={handleInputChange}
										placeholder="(Optional)"
										className="input-modern h-10 text-sm"
									/>
								</div>

								<div className="space-y-1.5">
									<Label
										htmlFor="password"
										className="text-gray-300 text-xs font-medium"
									>
										Password *
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
											placeholder="At least 8 characters"
											required
											className="input-modern h-10 text-sm pr-10"
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

								<div className="space-y-1.5">
									<Label
										htmlFor="confirmPassword"
										className="text-gray-300 text-xs font-medium"
									>
										Confirm Password *
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											name="confirmPassword"
											type={
												showConfirmPassword
													? "text"
													: "password"
											}
											value={formData.confirmPassword}
											onChange={handleInputChange}
											placeholder="Confirm your password"
											required
											className="input-modern h-10 text-sm pr-10"
										/>
										<button
											type="button"
											onClick={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
											className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
										>
											{showConfirmPassword ? (
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
									className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] h-11 mt-2"
								>
									{loading ? (
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
											Creating Account...
										</div>
									) : (
										<div className="flex items-center justify-center">
											<UserPlus className="h-4 w-4 mr-2" />
											Create Account
										</div>
									)}
								</Button>
							</form>

							<div className="mt-4 space-y-2">
								<div className="text-center text-gray-500 text-sm">
									Already have an account?{" "}
									<Link
										href={
											accessToken && redirectUrl
												? `/stagemanager-login?accessToken=${encodeURIComponent(accessToken)}&redirect=${encodeURIComponent(redirectUrl)}`
												: "/stagemanager-login"
										}
										className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
									>
										Sign in here
									</Link>
								</div>
							</div>
						</div>
					</div>

					{/* ── RIGHT: Empty (background shows through) ── */}
					<div className="hidden lg:block" />
				</div>
			</div>

			<div className="absolute bottom-0 left-0 right-0 z-10 px-6 lg:px-20 py-4">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}

export default function StageManagerRegisterPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#06000f] flex items-center justify-center p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4" />
				</div>
			}
		>
			<StageManagerRegisterContent />
		</Suspense>
	);
}
