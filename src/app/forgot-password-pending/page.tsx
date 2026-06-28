"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
	Clock,
	Mail,
	CheckCircle,
	AlertTriangle,
	RefreshCw,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function ForgotPasswordPendingContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const email = searchParams.get("email") || "";
	const { toast } = useToast();

	const [wsConnected, setWsConnected] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");
	const [showRedirectDialog, setShowRedirectDialog] = useState(false);
	const [redirectCountdown, setRedirectCountdown] = useState(5);

	useEffect(() => {
		if (!email) {
			router.push("/forgot-password");
			return;
		}

		// Initialize WebSocket connection
		const initializeWebSocket = async () => {
			try {
				const { createWebSocketManager } =
					await import("@/lib/websocket-manager");

				const wsManager = createWebSocketManager({
					eventId: "password_reset",
					role: "stage_manager",
					userId: `password_reset_${email}`,
					showToasts: true,
					onConnect: () => {
						console.log(
							`[Password Reset] WebSocket connected for ${email}`,
						);
						console.log(
							`[Password Reset] Authenticated with userId: password_reset_${email}`,
						);
						setWsConnected(true);
					},
					onDisconnect: () => {
						console.log("Password reset WebSocket disconnected");
						setWsConnected(false);
					},
					onDataUpdate: () => {
						console.log("Password reset data update");
					},
				});

				await wsManager.initialize();

				console.log(
					`[Password Reset] WebSocket initialized for email: ${email}`,
				);
				console.log(
					`[Password Reset] Listening in room: user_password_reset_${email}`,
				);

				// Listen for password reset completion
				wsManager.on("password_reset_completed", (data: any) => {
					console.log("🔐 Password reset completed:", data);

					if (data.email === email) {
						setStatusMessage(
							"Your password has been reset by the admin!",
						);
						setShowRedirectDialog(true);

						// Show toast notification
						toast({
							title: "Password Reset Complete",
							description:
								"Your password has been successfully reset!",
							variant: "default",
						});

						// Start countdown
						let countdown = 5;
						const interval = setInterval(() => {
							countdown--;
							setRedirectCountdown(countdown);
							if (countdown <= 0) {
								clearInterval(interval);
								router.push("/login");
							}
						}, 1000);
					}
				});

				// Listen for admin messages
				wsManager.on("password_reset_message", (data: any) => {
					console.log("💬 Admin message:", data);

					if (data.email === email) {
						setStatusMessage(data.message);

						// Show toast for admin message
						toast({
							title: "Admin Message",
							description: data.message,
							variant: "default",
						});
					}
				});

				(window as any).passwordResetWsManager = wsManager;

				return () => {
					if ((window as any).passwordResetWsManager) {
						(window as any).passwordResetWsManager.destroy();
						delete (window as any).passwordResetWsManager;
					}
				};
			} catch (error) {
				console.error("Failed to initialize WebSocket:", error);
			}
		};

		// Listen for WebSocket toast events
		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toast({ title, description, variant });
		};

		window.addEventListener(
			"websocket-toast",
			handleWebSocketToast as EventListener,
		);

		initializeWebSocket();

		return () => {
			window.removeEventListener(
				"websocket-toast",
				handleWebSocketToast as EventListener,
			);

			if ((window as any).passwordResetWsManager) {
				(window as any).passwordResetWsManager.destroy();
				delete (window as any).passwordResetWsManager;
			}
		};
	}, [email, router, toast]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-2 sm:p-4">
			{/* Redirect Dialog */}
			<Dialog
				open={showRedirectDialog}
				onOpenChange={setShowRedirectDialog}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-green-600">
							<CheckCircle className="h-5 w-5" />
							Password Reset Complete
						</DialogTitle>
						<DialogDescription className="space-y-3 pt-4">
							<span className="block text-base font-medium">
								Your password has been successfully reset!
							</span>
							<span className="block text-sm text-muted-foreground">
								Redirecting to login page in {redirectCountdown}{" "}
								seconds...
							</span>
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 mt-4">
						<Button
							onClick={() => router.push("/login")}
							className="bg-green-600 hover:bg-green-700"
						>
							Go to Login Now
						</Button>
					</div>
				</DialogContent>
			</Dialog>

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
						Password Reset Pending
					</h1>
					<p className="text-gray-400 text-base sm:text-lg">
						Waiting for admin to reset your password
					</p>
				</div>

				{/* Pending Status Card */}
				<Card className="bg-purple-800/50 border-purple-600">
					<CardHeader className="p-4 sm:p-6">
						<CardTitle className="text-white text-center text-lg sm:text-xl flex items-center justify-center gap-2">
							<Clock className="h-5 w-5 animate-pulse" />
							Request Submitted
						</CardTitle>
						<CardDescription className="text-gray-400 text-center text-sm">
							Your password reset request has been sent to the
							admin
						</CardDescription>
					</CardHeader>
					<CardContent className="p-4 sm:p-6 space-y-4">
						{/* Email Confirmation */}
						<Alert className="bg-blue-900/20 border-blue-800 text-blue-400">
							<Mail className="h-4 w-4" />
							<AlertDescription>
								Request sent for: <strong>{email}</strong>
							</AlertDescription>
						</Alert>

						{/* Status Message */}
						{statusMessage && (
							<Alert className="bg-green-900/20 border-green-800 text-green-400">
								<CheckCircle className="h-4 w-4" />
								<AlertDescription>
									{statusMessage}
								</AlertDescription>
							</Alert>
						)}

						{/* Admin Contact Info */}
						<div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
							<h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
								<Mail className="h-4 w-4" />
								Admin Contact Details
							</h3>
							<div className="space-y-2 text-sm text-gray-300">
								<p className="flex items-center gap-2">
									📞 Phone:{" "}
									<a
										href="tel:+971528411575"
										className="text-purple-400 hover:underline"
									>
										+971 52 841 1575
									</a>
								</p>
								<p className="flex items-center gap-2">
									📧 Email:{" "}
									<a
										href="mailto:ericlaltaevents@gmail.com"
										className="text-purple-400 hover:underline"
									>
										ericlaltaevents@gmail.com
									</a>
								</p>
							</div>
						</div>

						{/* Instructions */}
						<div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
							<h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
								<AlertTriangle className="h-4 w-4" />
								What happens next?
							</h3>
							<ul className="space-y-2 text-sm text-gray-300">
								<li className="flex items-start gap-2">
									<span className="text-yellow-400 mt-0.5">
										1.
									</span>
									<span>
										The admin will receive your password
										reset request
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-yellow-400 mt-0.5">
										2.
									</span>
									<span>
										They will contact you via phone or email
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="text-yellow-400 mt-0.5">
										3.
									</span>
									<span>
										Once your password is reset, you'll be
										automatically redirected to login
									</span>
								</li>
							</ul>
						</div>

						{/* Back to Login Link */}
						<div className="text-center pt-4">
							<Link
								href="/login"
								className="text-purple-400 hover:text-purple-300 font-medium text-sm"
							>
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

export default function ForgotPasswordPendingPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
						<p className="text-gray-400">Loading...</p>
					</div>
				</div>
			}
		>
			<ForgotPasswordPendingContent />
		</Suspense>
	);
}
