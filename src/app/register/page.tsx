"use client";

import { useState, useEffect } from "react";
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
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterPage() {
	const router = useRouter();
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

	// Email verification state
	const [emailVerified, setEmailVerified] = useState(false);
	const [verificationCodeSent, setVerificationCodeSent] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [sendingCode, setSendingCode] = useState(false);
	const [verifyingCode, setVerifyingCode] = useState(false);

	// Check if user is already logged in
	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						// User is already logged in, redirect based on role
						const { role, status } = result.data;

						if (status === "pending") {
							router.push("/stage-manager-pending");
						} else if (role === "super_admin") {
							router.push("/super-admin");
						} else if (role === "stage_manager") {
							router.push("/stage-manager");
						} else if (role === "artist") {
							router.push("/artist-dashboard");
						} else if (role === "dj") {
							router.push("/dj");
						} else {
							router.push("/");
						}
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
	}, [router]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
		// Clear error when user starts typing
		if (error) setError("");
	};

	// Email verification functions
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
			} else {
				setError(
					data.error?.message || "Failed to send verification code",
				);
			}
		} catch (error) {
			console.error("Error sending verification code:", error);
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
			} else {
				setError(data.error?.message || "Invalid verification code");
			}
		} catch (error) {
			console.error("Error verifying code:", error);
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

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			setError("Please enter a valid email address");
			return false;
		}

		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
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
				// Auto-login the user with pending status and redirect to pending page
				try {
					const loginResponse = await fetch("/api/auth/login", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							email: formData.email,
							password: formData.password,
						}),
					});

					const loginResult = await loginResponse.json();

					if (loginResult.success) {
						// Redirect to pending page after 2 seconds
						setTimeout(() => {
							router.push("/stage-manager-pending");
						}, 2000);
					} else {
						// If auto-login fails, still redirect to login page
						setTimeout(() => {
							router.push("/login");
						}, 2000);
					}
				} catch (error) {
					console.error("Auto-login error:", error);
					// If auto-login fails, redirect to login page
					setTimeout(() => {
						router.push("/login");
					}, 2000);
				}
			} else {
				setError(result.error?.message || "Registration failed");
			}
		} catch (error) {
			console.error("Registration error:", error);
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Show loading while checking session
	if (checkingSession) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
					<p className="text-gray-400">Checking session...</p>
				</div>
			</div>
		);
	}

	if (success) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-4">
				<div className="w-full max-w-md text-center space-y-6">
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
									Your Stage Manager account has been created
									successfully.
									<span className="block mt-3 text-green-400">
										📧 A verification email has been sent to
										your email address.
									</span>
									<span className="block mt-2 text-yellow-400">
										Your account is pending approval. Please
										wait on the pending page for admin
										approval.
									</span>
								</p>
								<div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
									<p className="text-blue-400 text-sm font-semibold mb-2">
										📝 What's Next?
									</p>
									<ul className="text-gray-300 text-sm text-left space-y-1">
										<li>
											✓ Check your email for confirmation
										</li>
										<li>✓ Stay on the pending page</li>
										<li>
											✓ Wait for admin approval (24-48
											hours)
										</li>
										<li>
											✓ You'll be redirected automatically
											when approved
										</li>
									</ul>
								</div>
								<p className="text-sm text-gray-500 mt-4">
									Redirecting to pending page...
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-2 sm:p-4">
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
						Join FAME
					</h1>
					<p className="text-gray-400 text-base sm:text-lg">
						Create your account to get started
					</p>
				</div>

				{/* Registration Form */}
				<Card className="bg-purple-800/50 border-purple-600">
					<CardHeader className="p-4 sm:p-6">
						<CardTitle className="text-white text-center text-lg sm:text-xl">
							Create Account
						</CardTitle>
						<CardDescription className="text-gray-400 text-center text-sm">
							Fill in your details to register
						</CardDescription>
					</CardHeader>
					<CardContent className="p-4 sm:p-6">
						<form
							onSubmit={handleSubmit}
							className="space-y-3 sm:space-y-4"
						>
							{/* Error Alert */}
							{error && (
								<Alert className="bg-red-900/20 border-red-800 text-red-400">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							{/* Name Fields */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
								<div className="space-y-2">
									<Label
										htmlFor="firstName"
										className="text-gray-300 text-sm"
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
										className="bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 text-sm"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="lastName"
										className="text-gray-300 text-sm"
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
										className="bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 text-sm"
									/>
								</div>
							</div>

							{/* Email Field with Verification */}
							<div className="space-y-2">
								<Label
									htmlFor="email"
									className="text-gray-300 text-sm"
								>
									Email Address *{" "}
									{emailVerified && (
										<span className="text-green-400 text-sm">
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
										className={`bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 text-sm ${
											emailVerified
												? "bg-green-900/20 border-green-500"
												: ""
										}`}
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
											className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap text-sm px-3"
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
									<div className="space-y-3 mt-3 p-4 bg-blue-900/20 border-2 border-blue-600 rounded-lg">
										<div className="flex items-start gap-2">
											<div className="text-blue-400 text-sm flex-1">
												<p className="font-semibold mb-1">
													📧 Verification code sent!
												</p>
												<p className="text-xs text-gray-400">
													Check your email (and spam
													folder) for a 6-digit code
												</p>
											</div>
										</div>
										<div className="space-y-2">
											<Label
												htmlFor="verificationCode"
												className="text-gray-300 text-sm"
											>
												Enter 6-digit code
											</Label>
											<div className="flex gap-2">
												<Input
													id="verificationCode"
													type="text"
													value={verificationCode}
													onChange={(e) => {
														const value =
															e.target.value.replace(
																/\D/g,
																"",
															);
														if (value.length <= 6) {
															setVerificationCode(
																value,
															);
														}
													}}
													placeholder="000000"
													maxLength={6}
													className="bg-gray-300 border-gray-700 text-center text-lg tracking-widest font-mono"
												/>
												<Button
													type="button"
													onClick={verifyEmailCode}
													disabled={
														verifyingCode ||
														verificationCode.length !==
															6
													}
													className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap text-sm px-3"
												>
													{verifyingCode
														? "Verifying..."
														: "Verify"}
												</Button>
											</div>
										</div>
										<Button
											type="button"
											onClick={sendVerificationCode}
											disabled={sendingCode}
											variant="ghost"
											className="text-blue-400 hover:text-blue-300 text-xs w-full"
										>
											{sendingCode
												? "Sending..."
												: "Resend Code"}
										</Button>
									</div>
								)}
							</div>

							{/* Phone Field */}
							<div className="space-y-2">
								<Label
									htmlFor="phone"
									className="text-gray-300 text-sm"
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
									className="bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 text-sm"
								/>
							</div>

							{/* Password Fields */}
							<div className="space-y-2">
								<Label
									htmlFor="password"
									className="text-gray-300 text-sm"
								>
									Password *
								</Label>
								<div className="relative">
									<Input
										id="password"
										name="password"
										type={
											showPassword ? "text" : "password"
										}
										value={formData.password}
										onChange={handleInputChange}
										placeholder="At least 8 characters"
										required
										className="bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 pr-10 text-sm"
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
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
										className="bg-gray-300 border-gray-700 placeholder-white focus:border-purple-500 focus:ring-purple-500 pr-10 text-sm"
									/>
									<button
										type="button"
										onClick={() =>
											setShowConfirmPassword(
												!showConfirmPassword,
											)
										}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
									>
										{showConfirmPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={loading}
								className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 sm:py-3 mt-4 sm:mt-6 text-sm sm:text-base"
							>
								{loading ? (
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

						{/* Links */}
						<div className="mt-4 sm:mt-6 text-center text-gray-400 text-sm sm:text-base">
							Already have an account?{" "}
							<Link
								href="/login"
								className="text-purple-400 hover:text-purple-300 font-medium"
							>
								Sign in here
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
