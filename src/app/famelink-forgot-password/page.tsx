"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import {
	ArrowLeft,
	Mail,
	Loader2,
	CheckCircle,
	AlertCircle,
} from "lucide-react";

export default function FameLinkForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		setLoading(true);
		setError("");
		try {
			const res = await fetch("/api/auth/artist/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim() }),
			});
			const data = await res.json();
			if (data.success) {
				setSent(true);
			} else {
				setError(data.error?.message || "Something went wrong");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await fetch("/api/auth/artist/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim() }),
			});
			const data = await res.json();
			if (data.success) {
				setError("");
			} else {
				setError(data.error?.message || "Failed to resend");
			}
		} catch {
			setError("Network error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="flex justify-center mb-6">
					<FameLinkLogo width={64} height={64} />
				</div>

				{sent ? (
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
						<h2 className="text-2xl font-bold">Check Your Email</h2>
						<p className="text-gray-400 text-sm">
							We sent a password reset link to{" "}
							<span className="text-purple-300 font-medium">
								{email}
							</span>
							. Click the link in the email to set a new password.
						</p>
						<p className="text-gray-500 text-xs">
							The link expires in 1 hour.
						</p>
						<div className="pt-2 space-y-3">
							<Button
								onClick={handleResend}
								disabled={loading}
								variant="outline"
								className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 rounded-xl h-11"
							>
								{loading ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<Mail className="h-4 w-4 mr-2" />
								)}
								Resend Email
							</Button>
							<Link
								href="/famelink-auth"
								className="block text-center text-purple-400 hover:text-purple-300 text-sm transition-colors"
							>
								Back to Sign In
							</Link>
						</div>
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
							<h1 className="text-2xl font-bold mb-2">
								Forgot Password?
							</h1>
							<p className="text-gray-400 text-sm">
								Enter your email and we'll send you a link to
								reset your password.
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
									htmlFor="email"
									className="text-gray-300 text-sm"
								>
									Email Address
								</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setError("");
									}}
									placeholder="Enter your email"
									required
									className="input-dark h-11"
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
										Sending...
									</>
								) : (
									<>
										<Mail className="h-4 w-4 mr-2" /> Send
										Link
									</>
								)}
							</Button>
						</form>

						<div className="text-center">
							<Link
								href="/famelink-auth"
								className="text-purple-400 hover:text-purple-300 text-sm inline-flex items-center gap-1 transition-colors"
							>
								<ArrowLeft className="h-3.5 w-3.5" /> Back to
								Sign In
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
