"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import {
	Eye,
	EyeOff,
	LogIn,
	UserPlus,
	AlertCircle,
	CheckCircle,
	ArrowLeft,
	Sparkles,
	ArrowRight,
	Loader2,
	Mail,
	Lock,
	User,
	MapPin,
} from "lucide-react";

type AuthMode = "signin" | "signup";

function FameLinkAuthContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [mode, setMode] = useState<AuthMode>("signin");
	const [mounted, setMounted] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);
	const [registrationSuccess, setRegistrationSuccess] = useState(false);

	const [eventRequestId, setEventRequestId] = useState<string | null>(null);
	const [joinEventId, setJoinEventId] = useState<string | null>(null);
	const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

	const [signInData, setSignInData] = useState({ email: "", password: "" });
	const [signUpData, setSignUpData] = useState({
		artistName: "",
		email: "",
		password: "",
		confirmPassword: "",
		country: "",
		city: "",
	});

	const [emailVerified, setEmailVerified] = useState(false);
	const [verificationCodeSent, setVerificationCodeSent] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");
	const [sendingCode, setSendingCode] = useState(false);
	const [verifyingCode, setVerifyingCode] = useState(false);

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setMounted(true);
		const requestId = searchParams.get("eventRequestId");
		if (requestId) setEventRequestId(requestId);
		const joinId = searchParams.get("joinEventId");
		if (joinId) setJoinEventId(joinId);
		const redir = searchParams.get("redirect");
		if (redir) setRedirectUrl(redir);
	}, [searchParams]);

	useEffect(() => {

		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me?role=artist");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						const { role, status, userId } = result.data;
						const joinId = searchParams.get("joinEventId");
						
						// Only auto-redirect artists to their dashboard. 
						// Stage managers shouldn't be automatically redirected from the artist login page.
						if (role === "artist") {
							// To break potential loops, don't auto-redirect if we're coming from a page that just failed auth
							if (searchParams.get("auth_failed") === "true") {
								setCheckingSession(false);
								return;
							}

							// Read directly from searchParams to avoid race condition with state
							const redirParam = searchParams.get("redirect");
							if (redirParam)
								window.location.href = redirParam;
							else if (joinId)
								router.push(`/join-event/${joinId}/confirm`);
							else router.push(`/famelink/${userId}`);
							return;
						}
					}
				}
			} catch (error) {
				console.log('No active session found');
			} finally {
				setCheckingSession(false);
			}
		};
		checkSession();
	}, [router, searchParams]);

	const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSignInData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
		if (error) setError("");
	};

	const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSignUpData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
		if (error) setError("");
	};

	const sendVerificationCode = async () => {
		if (!signUpData.email) {
			setError("Please enter your email address first");
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(signUpData.email)) {
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
					email: signUpData.email,
					action: "send",
					type: "famelink_artist",
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
					email: signUpData.email,
					code: verificationCode,
					action: "verify",
					type: "famelink_artist",
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
			setError("Network error. Please try again.");
		} finally {
			setVerifyingCode(false);
		}
	};

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const response = await fetch("/api/auth/artist/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...signInData,
					eventRequestId: eventRequestId || undefined,
				}),
			});
			const result = await response.json();
			if (result.success) {
				if (result.data?.artist)
					localStorage.setItem(
						"artistProfile",
						JSON.stringify(result.data.artist),
					);
				const artistId = result.data?.artist?.id;
				// Read directly from searchParams to avoid stale closure on redirectUrl state
				const redirParam = searchParams.get("redirect");
				const joinParam = searchParams.get("joinEventId");
				const reqParam = searchParams.get("eventRequestId");
				if (redirParam)
					window.location.href = redirParam;
				else if (joinParam)
					router.push(`/join-event/${joinParam}/confirm`);
				else if (reqParam)
					router.push(`/event-request/${reqParam}`);
				else router.push(`/famelink/${artistId}`);
			} else {
				setError(
					result.error?.message ||
						"Sign in failed. Please check your credentials.",
				);
			}
		} catch (error) {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		if (!signUpData.artistName.trim()) {
			setError("Artist/Stage name is required");
			setLoading(false);
			return;
		}
		if (!signUpData.email.trim()) {
			setError("Email is required");
			setLoading(false);
			return;
		}
		if (!emailVerified) {
			setError("Please verify your email address first");
			setLoading(false);
			return;
		}
		if (signUpData.password !== signUpData.confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}
		if (signUpData.password.length < 8) {
			setError("Password must be at least 8 characters long");
			setLoading(false);
			return;
		}
		try {
			const response = await fetch("/api/auth/artist/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistName: signUpData.artistName,
					email: signUpData.email,
					password: signUpData.password,
					country: signUpData.country || undefined,
					city: signUpData.city || undefined,
					eventRequestId: eventRequestId || undefined,
				}),
			});
			const result = await response.json();
			if (result.success) {
				const redirParam = searchParams.get("redirect");
				const joinParam = searchParams.get("joinEventId");
				if (redirParam) {
					window.location.href = redirParam;
				} else if (joinParam) {
					router.push(`/join-event/${joinParam}/confirm`);
				} else {
					setRegistrationSuccess(true);
				}
			} else {
				setError(
					result.error?.message ||
						"Registration failed. Please try again.",
				);
			}
		} catch (error) {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// ── Loading state ───────────────────────────────────────────
	if (checkingSession) {
		return (
			<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center">
				<div className="text-center">
					<div className="relative w-14 h-14 mx-auto mb-5">
						<div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
						<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
					</div>
					<p className="text-purple-300/40 text-sm">Loading...</p>
				</div>
			</div>
		);
	}

	// ── Registration success ────────────────────────────────────
	if (registrationSuccess) {
		return (
			<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center p-4 relative overflow-hidden">
				<style jsx global>{`
					@keyframes successPop {
						from {
							opacity: 0;
							transform: scale(0.8) translateY(20px);
						}
						to {
							opacity: 1;
							transform: scale(1) translateY(0);
						}
					}
					.success-pop {
						animation: successPop 0.6s cubic-bezier(0.16, 1, 0.3, 1)
							forwards;
						opacity: 0;
					}
				`}</style>
				{/* Ambient */}
				<div className="fixed inset-0 pointer-events-none">
					<div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-green-600/5 blur-[120px]" />
					<div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-purple-600/5 blur-[120px]" />
				</div>

				<div className="relative z-10 w-full max-w-md success-pop">
					<div className="text-center mb-8">
						<FameLinkLogo width={60} height={60} />
					</div>

					<div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 text-center">
						<div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
							<CheckCircle className="h-10 w-10 text-green-400" />
						</div>
						<h2 className="text-2xl font-bold text-white mb-2">
							Registration Successful!
						</h2>
						<p className="text-purple-200/40 mb-6">
							Your FameLink artist account has been created.
						</p>

						<div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-6 text-left">
							<p className="text-purple-400/70 text-sm font-semibold mb-3 flex items-center gap-2">
								<Sparkles className="h-4 w-4" /> What's Next?
							</p>
							<ul className="text-purple-200/40 text-sm space-y-2">
								<li className="flex items-center gap-2">
									<CheckCircle className="h-3.5 w-3.5 text-green-400/60 flex-shrink-0" />{" "}
									Sign in with your email and password
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-3.5 w-3.5 text-green-400/60 flex-shrink-0" />{" "}
									Create your first show profile
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-3.5 w-3.5 text-green-400/60 flex-shrink-0" />{" "}
									Share your FameLink with stage managers
								</li>
								<li className="flex items-center gap-2">
									<CheckCircle className="h-3.5 w-3.5 text-green-400/60 flex-shrink-0" />{" "}
									Get invited to events!
								</li>
							</ul>
						</div>

						<Button
							onClick={() => {
								setRegistrationSuccess(false);
								setMode("signin");
								setSignInData({
									email: signUpData.email,
									password: "",
								});
								setSignUpData({
									artistName: "",
									email: "",
									password: "",
									confirmPassword: "",
									country: "",
									city: "",
								});
								setEmailVerified(false);
								setVerificationCodeSent(false);
							}}
							className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl py-5 gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-base font-semibold"
						>
							<LogIn className="h-4 w-4" />
							Go to Sign In
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// ══════════════════════════════════════════════════════════════
	// ██  MAIN AUTH RENDER  ██
	// ══════════════════════════════════════════════════════════════
	return (
		<div className="min-h-screen bg-[#06020f] text-white relative overflow-hidden">
			<style jsx global>{`
				@keyframes authFadeUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes authFadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				@keyframes glowPulse {
					0%,
					100% {
						opacity: 0.4;
					}
					50% {
						opacity: 0.7;
					}
				}
				@keyframes tabSlide {
					from {
						transform: scaleX(0);
					}
					to {
						transform: scaleX(1);
					}
				}
				@keyframes gradientFlow {
					0% {
						background-position: 0% 50%;
					}
					50% {
						background-position: 100% 50%;
					}
					100% {
						background-position: 0% 50%;
					}
				}
				.auth-fade-up {
					animation: authFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)
						forwards;
					opacity: 0;
				}
				.auth-fade-in {
					animation: authFadeIn 0.6s ease forwards;
					opacity: 0;
				}
				.glow-pulse {
					animation: glowPulse 3s ease-in-out infinite;
				}
				input.input-modern {
					background: #0f071d !important;
					border: 1px solid rgba(255, 255, 255, 0.1) !important;
					border-radius: 14px !important;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
					color: white !important;
				}
				input.input-modern:focus {
					background: #150a29 !important;
					border-color: rgba(168, 85, 247, 0.6) !important;
					box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.15) !important;
				}
				.input-modern::placeholder {
					color: rgba(255, 255, 255, 0.2) !important;
				}
				.input-modern:disabled {
					opacity: 0.5;
				}
			`}</style>

			{/* Ambient glow */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[140px] glow-pulse" />
				<div
					className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-pink-600/6 blur-[140px] glow-pulse"
					style={{ animationDelay: "1.5s" }}
				/>
			</div>

			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
				<div className="w-full max-w-md">
					{/* ── Logo & Header ──────────────────────────── */}
					<div
						className="auth-fade-up text-center mb-8"
						style={{ animationDelay: "0.05s" }}
					>
						<Link href="/" className="inline-block mb-5 group">
							<div className="relative">
								<div className="absolute inset-0 bg-purple-500/15 rounded-2xl blur-xl scale-150 group-hover:bg-purple-500/25 transition-all duration-300" />
								<FameLinkLogo width={64} height={64} />
							</div>
						</Link>
						<h1
							className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent mb-1.5"
							style={{
								backgroundSize: "200% 200%",
								animation: "gradientFlow 4s ease infinite",
							}}
						>
							Welcome to FameLink
						</h1>
						<p className="text-purple-300/35 text-sm">
							For Artists
						</p>
					</div>

					{/* ── Auth Card ──────────────────────────────── */}
					<div
						className="auth-fade-up"
						style={{ animationDelay: "0.15s" }}
					>
						<div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/5">
							{/* Tab Switcher */}
							<div className="flex border-b border-white/[0.06]">
								{(["signin", "signup"] as AuthMode[]).map(
									(tab) => (
										<button
											key={tab}
											onClick={() => {
												setMode(tab);
												setError("");
											}}
											className={`flex-1 py-4 text-center text-sm font-medium transition-all duration-300 relative ${
												mode === tab
													? "text-white"
													: "text-purple-300/30 hover:text-purple-300/50"
											}`}
										>
											<span className="relative z-10 flex items-center justify-center gap-2">
												{tab === "signin" ? (
													<LogIn className="h-4 w-4" />
												) : (
													<UserPlus className="h-4 w-4" />
												)}
												{tab === "signin"
													? "Sign In"
													: "Sign Up"}
											</span>
											{mode === tab && (
												<div
													className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500"
													style={{
														animation:
															"tabSlide 0.3s ease forwards",
														transformOrigin: "left",
													}}
												/>
											)}
										</button>
									),
								)}
							</div>

							<div className="p-6 sm:p-8">
								{/* Header text */}
								<div className="text-center mb-6">
									<h2 className="text-xl font-semibold text-white mb-1">
										{mode === "signin"
											? "Welcome Back, Artist"
											: "Join FameLink for Artists"}
									</h2>
									<p className="text-purple-200/30 text-sm">
										{mode === "signin"
											? "Sign in to manage your shows and events"
											: "Create your artist account to get started"}
									</p>
								</div>

								{/* Error */}
								{error && (
									<div className="mb-5 bg-red-500/8 border border-red-500/15 rounded-xl p-3.5 flex items-start gap-2.5 auth-fade-in">
										<AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-red-300/80">
											{error}
										</p>
									</div>
								)}

								{mode === "signin" ? (
									/* ── Sign In Form ──────────────────── */
									<form
										onSubmit={handleSignIn}
										className="space-y-4"
									>
										<div className="space-y-2">
											<Label
												htmlFor="signin-email"
												className="text-purple-200/50 text-sm font-medium"
											>
												Email Address
											</Label>
											<div className="relative">
												<Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
												<Input
													id="signin-email"
													name="email"
													type="email"
													value={signInData.email}
													onChange={
														handleSignInChange
													}
													placeholder="Enter your email"
													required
													className="input-modern pl-10 h-12"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<Label
												htmlFor="signin-password"
												className="text-purple-200/50 text-sm font-medium"
											>
												Password
											</Label>
											<div className="relative">
												<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
												<Input
													id="signin-password"
													name="password"
													type={
														showPassword
															? "text"
															: "password"
													}
													value={signInData.password}
													onChange={
														handleSignInChange
													}
													placeholder="Enter your password"
													required
													className="input-modern pl-10 pr-10 h-12"
												/>
												<button
													type="button"
													onClick={() =>
														setShowPassword(
															!showPassword,
														)
													}
													className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-purple-400/30 hover:text-purple-300/60 transition-colors"
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
											className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl py-5 gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-base font-semibold mt-2"
										>
											{loading ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />{" "}
													Signing In...
												</>
											) : (
												<>
													<LogIn className="h-4 w-4" />{" "}
													Sign In
												</>
											)}
										</Button>

										<div className="text-center pt-1">
											<Link
												href="/famelink-forgot-password"
												className="text-purple-400/60 hover:text-purple-400 text-sm transition-colors duration-200"
											>
												Forgot Password?
											</Link>
										</div>
									</form>
								) : (
									/* ── Sign Up Form ──────────────────── */
									<form
										onSubmit={handleSignUp}
										className="space-y-4"
									>
										{/* Artist Name */}
										<div className="space-y-2">
											<Label
												htmlFor="signup-artistName"
												className="text-purple-200/50 text-sm font-medium"
											>
												Artist/Stage Name{" "}
												<span className="text-pink-400">
													*
												</span>
											</Label>
											<div className="relative">
												<User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
												<Input
													id="signup-artistName"
													name="artistName"
													type="text"
													value={
														signUpData.artistName
													}
													onChange={
														handleSignUpChange
													}
													placeholder="Your stage name"
													required
													className="input-modern pl-10 h-12"
												/>
											</div>
										</div>

										{/* Email with Verification */}
										<div className="space-y-2">
											<Label
												htmlFor="signup-email"
												className="text-purple-200/50 text-sm font-medium flex items-center gap-2"
											>
												Email Address{" "}
												<span className="text-pink-400">
													*
												</span>
												{emailVerified && (
													<span className="text-green-400 text-xs flex items-center gap-1">
														<CheckCircle className="h-3 w-3" />{" "}
														Verified
													</span>
												)}
											</Label>
											<div className="flex gap-2">
												<div className="relative flex-1">
													<Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
													<Input
														id="signup-email"
														name="email"
														type="email"
														value={signUpData.email}
														onChange={(e) => {
															handleSignUpChange(
																e,
															);
															setEmailVerified(
																false,
															);
															setVerificationCodeSent(
																false,
															);
														}}
														placeholder="Enter your email"
														required
														disabled={emailVerified}
														className={`input-modern pl-10 h-12 ${emailVerified ? "border-green-500/30 bg-green-500/5" : ""}`}
													/>
												</div>
												{!emailVerified && (
													<Button
														type="button"
														onClick={
															sendVerificationCode
														}
														disabled={
															sendingCode ||
															!signUpData.email ||
															verificationCodeSent
														}
														className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 rounded-xl h-12 px-4 text-sm whitespace-nowrap transition-all duration-200 disabled:opacity-40"
													>
														{sendingCode ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : verificationCodeSent ? (
															"Code Sent"
														) : (
															"Verify"
														)}
													</Button>
												)}
											</div>

											{/* Verification Code Input */}
											{verificationCodeSent &&
												!emailVerified && (
													<div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 space-y-3 auth-fade-in">
														<div className="text-indigo-300/70 text-sm">
															<p className="font-semibold mb-0.5 flex items-center gap-1.5">
																<Mail className="h-3.5 w-3.5" />{" "}
																Verification
																code sent!
															</p>
															<p className="text-xs text-purple-200/30">
																Check your email
																(and spam
																folder) for a
																6-digit code
															</p>
														</div>
														<div className="flex gap-2">
															<Input
																type="text"
																value={
																	verificationCode
																}
																onChange={(
																	e,
																) => {
																	const v =
																		e.target.value.replace(
																			/\D/g,
																			"",
																		);
																	if (
																		v.length <=
																		6
																	)
																		setVerificationCode(
																			v,
																		);
																}}
																placeholder="000000"
																maxLength={6}
																className="input-modern text-center text-lg tracking-[0.3em] font-mono h-12"
															/>
															<Button
																type="button"
																onClick={
																	verifyEmailCode
																}
																disabled={
																	verifyingCode ||
																	verificationCode.length !==
																		6
																}
																className="bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/20 rounded-xl h-12 px-4 text-sm whitespace-nowrap transition-all duration-200 disabled:opacity-40"
															>
																{verifyingCode ? (
																	<Loader2 className="h-4 w-4 animate-spin" />
																) : (
																	"Verify"
																)}
															</Button>
														</div>
														<button
															type="button"
															onClick={
																sendVerificationCode
															}
															disabled={
																sendingCode
															}
															className="text-indigo-400/40 hover:text-indigo-400/70 text-xs w-full text-center transition-colors duration-200"
														>
															{sendingCode
																? "Sending..."
																: "Resend Code"}
														</button>
													</div>
												)}
										</div>

										{/* Country & City */}
										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-2">
												<Label
													htmlFor="signup-country"
													className="text-purple-200/50 text-sm font-medium"
												>
													Country
												</Label>
												<div className="relative">
													<MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
													<Input
														id="signup-country"
														name="country"
														type="text"
														value={
															signUpData.country
														}
														onChange={
															handleSignUpChange
														}
														placeholder="Optional"
														className="input-modern pl-10 h-12"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="signup-city"
													className="text-purple-200/50 text-sm font-medium"
												>
													City
												</Label>
												<div className="relative">
													<MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
													<Input
														id="signup-city"
														name="city"
														type="text"
														value={signUpData.city}
														onChange={
															handleSignUpChange
														}
														placeholder="Optional"
														className="input-modern pl-10 h-12"
													/>
												</div>
											</div>
										</div>

										{/* Password */}
										<div className="space-y-2">
											<Label
												htmlFor="signup-password"
												className="text-purple-200/50 text-sm font-medium"
											>
												Password{" "}
												<span className="text-pink-400">
													*
												</span>
											</Label>
											<div className="relative">
												<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
												<Input
													id="signup-password"
													name="password"
													type={
														showPassword
															? "text"
															: "password"
													}
													value={signUpData.password}
													onChange={
														handleSignUpChange
													}
													placeholder="At least 8 characters"
													required
													className="input-modern pl-10 pr-10 h-12"
												/>
												<button
													type="button"
													onClick={() =>
														setShowPassword(
															!showPassword,
														)
													}
													className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-purple-400/30 hover:text-purple-300/60 transition-colors"
												>
													{showPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</button>
											</div>
										</div>

										{/* Confirm Password */}
										<div className="space-y-2">
											<Label
												htmlFor="signup-confirmPassword"
												className="text-purple-200/50 text-sm font-medium"
											>
												Confirm Password{" "}
												<span className="text-pink-400">
													*
												</span>
											</Label>
											<div className="relative">
												<Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/25" />
												<Input
													id="signup-confirmPassword"
													name="confirmPassword"
													type={
														showConfirmPassword
															? "text"
															: "password"
													}
													value={
														signUpData.confirmPassword
													}
													onChange={
														handleSignUpChange
													}
													placeholder="Confirm your password"
													required
													className="input-modern pl-10 pr-10 h-12"
												/>
												<button
													type="button"
													onClick={() =>
														setShowConfirmPassword(
															!showConfirmPassword,
														)
													}
													className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-purple-400/30 hover:text-purple-300/60 transition-colors"
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
											disabled={loading || !emailVerified}
											className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl py-5 gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5 text-base font-semibold mt-2 disabled:opacity-40 disabled:shadow-none"
										>
											{loading ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />{" "}
													Creating Account...
												</>
											) : (
												<>
													<UserPlus className="h-4 w-4" />{" "}
													Create Account
												</>
											)}
										</Button>

										{!emailVerified && (
											<p className="text-center text-purple-300/20 text-xs">
												Please verify your email to
												create an account
											</p>
										)}
									</form>
								)}
							</div>
						</div>
					</div>

					{/* Back to home */}
					<div
						className="auth-fade-in text-center mt-6 space-y-2"
						style={{ animationDelay: "0.4s" }}
					>
						<Link
							href="/"
							className="text-purple-400/30 hover:text-purple-400/60 text-sm transition-colors duration-200 flex items-center justify-center gap-1.5"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Back to home
						</Link>
					</div>

					{/* Footer */}
					<div
						className="auth-fade-in mt-8"
						style={{ animationDelay: "0.5s" }}
					>
						<FantasiaFooter variant="dark" />
					</div>
				</div>
			</div>
		</div>
	);
}

function AuthLoadingFallback() {
	return (
		<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center">
			<div className="text-center">
				<div className="relative w-14 h-14 mx-auto mb-5">
					<div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
					<div className="absolute inset-2 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
				</div>
				<p className="text-purple-300/40 text-sm">Loading...</p>
			</div>
		</div>
	);
}

export default function FameLinkAuthPage() {
	return (
		<Suspense fallback={<AuthLoadingFallback />}>
			<FameLinkAuthContent />
		</Suspense>
	);
}
