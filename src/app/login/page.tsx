"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
	const router = useRouter();
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [checkingSession, setCheckingSession] = useState(true);

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
							router.push("/artist");
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (result.success) {
				// Redirect based on the redirect URL from the API
				router.push(result.data.redirectUrl || "/");
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

	// Show loading while checking session
	if (checkingSession) {
		return (
			<div className="min-h-screen bg-[#06000f] text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
					<p className="text-gray-400">Checking session...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen text-white relative overflow-x-hidden">
			{/* Background Image */}
			<div
				className="absolute inset-0 z-0"
				style={{
					backgroundImage: "url('/background.png')",
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			/>
			{/* Dark overlay */}
			<div className="absolute inset-0 z-0 bg-black/50" />

			{/* Ambient glow effects */}
			<div className="absolute inset-0 z-0">
				<div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[150px]" />
				<div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] bg-pink-900/15 rounded-full blur-[150px]" />
			</div>

			{/* Content */}
			<div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-20 py-8 pb-20">
				<div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
					{/* ── LEFT: Login Form ── */}
					<motion.div
						className="flex flex-col items-center lg:items-start w-full max-w-md mx-auto lg:mx-0"
						initial={{ opacity: 0, x: -40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.7, ease: "easeOut" }}
					>
						{/* Logo */}
						<motion.div
							className="mb-6"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
						>
							<FameLogo width={70} height={70} />
						</motion.div>

						{/* Header */}
						<motion.h1
							className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
						>
							Welcome Back{" "}
							<span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
								FAME Manager
							</span>
						</motion.h1>
						<motion.p
							className="text-gray-400 text-sm sm:text-base mb-8"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.2 }}
						>
							Sign in to your FAME Manager account
						</motion.p>

						{/* Glassmorphism Form Card */}
						<motion.div
							className="w-full rounded-2xl border border-white/10 p-6 sm:p-8"
							style={{
								background: "rgba(15, 5, 30, 0.6)",
								backdropFilter: "blur(20px)",
								boxShadow:
									"0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
							}}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.25 }}
						>
							<form onSubmit={handleSubmit} className="space-y-5">
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
										className="input-dark rounded-xl h-11"
									/>
								</div>

								{/* Password Field */}
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
											className="input-dark rounded-xl h-11 pr-10"
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

								{/* Submit Button */}
								<Button
									type="submit"
									disabled={loading}
									className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] h-12"
								>
									{loading ? (
										<div className="flex items-center justify-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

							{/* Links */}
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
										href="/stagemanager-register"
										className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
									>
										Sign up here
									</Link>
								</div>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</div>

			{/* Footer */}
			<div className="absolute bottom-0 left-0 right-0 z-10 px-6 lg:px-20 py-4">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}
