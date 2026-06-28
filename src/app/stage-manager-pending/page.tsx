"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useStageManagerWebSocket } from "@/hooks/useStageManagerWebSocket";
import { StageManagerForceLogoutModal } from "@/components/StageManagerForceLogoutModal";
import { useToast } from "@/hooks/use-toast";

export default function StageManagerPendingPage() {
	const [status, setStatus] = useState<string>("pending");
	const [loading, setLoading] = useState(false);
	const [alert, setAlert] = useState<{
		type: "success" | "error" | "info";
		message: string;
	} | null>(null);
	const [userId, setUserId] = useState<string>("");
	const router = useRouter();
	const { toast } = useToast();

	// WebSocket for force logout monitoring
	useStageManagerWebSocket({
		userId: userId || "",
		onAccountUpdate: (data) => {
			console.log("Stage Manager account update on pending page:", data);

			// Update status based on action
			if (data.action === "reject" || data.action === "rejected") {
				setStatus("rejected");
				setAlert({
					type: "error",
					message: data.message,
				});
			} else if (
				data.action === "deactivate" ||
				data.action === "deactivated"
			) {
				setStatus("deactivated");
				setAlert({
					type: "error",
					message: data.message,
				});
			} else if (
				data.action === "suspend" ||
				data.action === "suspended"
			) {
				setStatus("suspended");
				setAlert({
					type: "error",
					message: data.message,
				});
			} else if (
				data.action === "approve" ||
				data.action === "approved" ||
				data.action === "activate" ||
				data.action === "activated"
			) {
				setStatus("active");
				setAlert({
					type: "success",
					message:
						data.message ||
						"Your account has been approved! Redirecting to dashboard...",
				});

				// Refresh session and redirect
				(async () => {
					try {
						const refreshResponse = await fetch(
							"/api/auth/refresh-session",
							{
								method: "POST",
							}
						);

						if (refreshResponse.ok) {
							console.log("Session refreshed successfully");
							// Redirect to dashboard after 2 seconds
							setTimeout(() => {
								router.push("/stage-manager");
							}, 2000);
						} else {
							console.error("Failed to refresh session");
							// Still try to redirect
							setTimeout(() => {
								router.push("/stage-manager");
							}, 2000);
						}
					} catch (error) {
						console.error("Error refreshing session:", error);
						// Still try to redirect
						setTimeout(() => {
							router.push("/stage-manager");
						}, 2000);
					}
				})();
			}
		},
	});

	// WebSocket for real-time notifications
	useWebSocket({
		userId,
		role: "stage_manager",
		onStatusChange: async (data) => {
			setStatus(data.status);
			setAlert({
				type: "success",
				message: data.message,
			});

			if (data.status === "active") {
				// Refresh session to update status
				try {
					await fetch("/api/auth/refresh-session", {
						method: "POST",
					});
				} catch (error) {
					console.error("Failed to refresh session:", error);
				}

				setTimeout(() => {
					router.push("/stage-manager");
				}, 2000);
			}
		},
		onAdminNotification: (data) => {
			// Only force logout for delete and changeCredentials
			if (
				data.action === "delete" ||
				data.action === "changeCredentials"
			) {
				setAlert({
					type: "error",
					message: data.message,
				});

				// Redirect to login after showing the message
				setTimeout(() => {
					router.push("/login");
				}, 3000);
			}
			// For reject, deactivate, suspend - just show message and update status
			else if (
				data.action === "reject" ||
				data.action === "deactivate" ||
				data.action === "suspend"
			) {
				setAlert({
					type: "error",
					message: data.message,
				});

				// Update status
				if (data.action === "reject") setStatus("rejected");
				else if (data.action === "deactivate") setStatus("deactivated");
				else if (data.action === "suspend") setStatus("suspended");
			}
		},
	});

	// Listen for WebSocket toast events
	useEffect(() => {
		const handleWebSocketToast = (event: CustomEvent) => {
			const { title, description, variant } = event.detail;
			toast({ title, description, variant });
		};

		window.addEventListener(
			"websocket-toast",
			handleWebSocketToast as EventListener
		);

		return () => {
			window.removeEventListener(
				"websocket-toast",
				handleWebSocketToast as EventListener
			);
		};
	}, [toast]);

	const checkStatus = async () => {
		setLoading(true);
		try {
			// Try to refresh the session first
			const refreshResponse = await fetch("/api/auth/refresh-session", {
				method: "POST",
			});

			if (refreshResponse.ok) {
				const refreshResult = await refreshResponse.json();
				if (refreshResult.success) {
					const newStatus = refreshResult.data.user.status;
					setStatus(newStatus);

					if (newStatus === "active") {
						setAlert({
							type: "success",
							message:
								"Your account has been approved! Redirecting to dashboard...",
						});

						// Redirect to dashboard after 2 seconds
						setTimeout(() => {
							router.push("/stage-manager");
						}, 2000);
						return;
					} else if (newStatus === "rejected") {
						setAlert({
							type: "error",
							message:
								"Your account has been rejected. Please contact support.",
						});
						return;
					} else if (newStatus === "suspended") {
						setAlert({
							type: "error",
							message:
								"Your account has been suspended. Please contact support.",
						});
						return;
					} else if (newStatus === "deactivated") {
						setAlert({
							type: "error",
							message:
								"Your account has been deactivated. Please contact support.",
						});
						return;
					} else if (newStatus === "pending") {
						setAlert({
							type: "info",
							message: "Your account is still pending approval.",
						});
						return;
					}
				}
			} else if (refreshResponse.status === 401) {
				// Session expired or invalid - redirect to login
				setAlert({
					type: "error",
					message: "Your session has expired. Please log in again.",
				});
				setTimeout(() => {
					router.push("/login");
				}, 2000);
				return;
			}

			// If refresh didn't work, try check-status
			const response = await fetch("/api/auth/check-status");
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					const newStatus = result.data.status;
					setStatus(newStatus);

					if (newStatus === "active") {
						setAlert({
							type: "success",
							message:
								"Your account has been approved! Redirecting to dashboard...",
						});

						// Redirect to dashboard after 2 seconds
						setTimeout(() => {
							router.push("/stage-manager");
						}, 2000);
					} else if (newStatus === "rejected") {
						setAlert({
							type: "error",
							message:
								"Your account has been rejected. Please contact support.",
						});
					} else if (newStatus === "suspended") {
						setAlert({
							type: "error",
							message:
								"Your account has been suspended. Please contact support.",
						});
					} else if (newStatus === "deactivated") {
						setAlert({
							type: "error",
							message:
								"Your account has been deactivated. Please contact support.",
						});
					} else {
						setAlert({
							type: "info",
							message: "Your account is still pending approval.",
						});
					}
				}
			} else if (response.status === 401) {
				// Session expired - redirect to login
				setAlert({
					type: "error",
					message: "Your session has expired. Please log in again.",
				});
				setTimeout(() => {
					router.push("/login");
				}, 2000);
			}
		} catch (error) {
			console.error("Error checking status:", error);
			setAlert({
				type: "error",
				message: "Failed to check status. Please try logging in again.",
			});
			setTimeout(() => {
				router.push("/login");
			}, 3000);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Check status on page load and get user ID
		const fetchUserData = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success) {
						setUserId(result.data.userId);
					}
				}
			} catch (error) {
				console.error("Error fetching user data:", error);
			}
		};

		fetchUserData();
		checkStatus();
	}, []);

	return (
		<>
			<StageManagerForceLogoutModal />
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md w-full mx-4">
					<Card className="shadow-lg">
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Image
									src="/fame-logo.png"
									alt="FAME Logo"
									width={60}
									height={60}
								/>
							</div>
							<CardTitle className="text-2xl font-bold text-gray-900">
								Waiting for Admin Approval{" "}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{alert && (
								<Alert
									className={`${
										alert.type === "success"
											? "border-green-500 bg-green-50"
											: alert.type === "error"
											? "border-red-500 bg-red-50"
											: "border-blue-500 bg-blue-50"
									}`}
								>
									<AlertDescription
										className={`${
											alert.type === "success"
												? "text-green-700"
												: alert.type === "error"
												? "text-red-700"
												: "text-blue-700"
										}`}
									>
										{alert.message}
									</AlertDescription>
								</Alert>
							)}

							<div className="text-center space-y-4">
								{status === "pending" && (
									<>
										<div className="flex justify-center">
											<Clock className="h-16 w-16 text-yellow-500" />
										</div>
										<div>
											<p className="text-gray-600">
												Your stage manager account is
												currently under review. An
												administrator will approve your
												account soon.
											</p>
										</div>
									</>
								)}

								{status === "active" && (
									<>
										<div className="flex justify-center">
											<CheckCircle className="h-16 w-16 text-green-500" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-green-700 mb-2">
												Account Approved!
											</h3>
											<p className="text-gray-600">
												Your account has been approved.
												You will be redirected to your
												dashboard.
											</p>
										</div>
									</>
								)}

								{(status === "rejected" ||
									status === "suspended" ||
									status === "deactivated") && (
									<>
										<div className="flex justify-center">
											<AlertCircle className="h-16 w-16 text-red-500" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-red-700 mb-2">
												Account{" "}
												{status === "rejected"
													? "Rejected"
													: status === "suspended"
													? "Suspended"
													: "Deactivated"}
											</h3>
											<p className="text-gray-600">
												Please contact the administrator
												for more information or to
												request reactivation.
											</p>
										</div>
									</>
								)}
							</div>

							{/* What happens next section */}
							{/* <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
							<h3 className="text-yellow-800 font-semibold mb-3 flex items-center gap-2">
								⚡ What happens next?
							</h3>
							<ol className="space-y-2 text-sm text-yellow-900">
								<li className="flex items-start gap-2">
									<span className="font-semibold min-w-[20px]">
										1.
									</span>
									<span>
										Your registration will be reviewed by
										the administrator
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="font-semibold min-w-[20px]">
										2.
									</span>
									<span>
										You'll receive a notification once your
										account is approved
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="font-semibold min-w-[20px]">
										3.
									</span>
									<span>
										After approval, you can log in and start
										managing events
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="font-semibold min-w-[20px]">
										4.
									</span>
									<span>
										The approval process typically takes
										24-48 hours
									</span>
								</li>
							</ol>
						</div> */}

							{/* Administrator Contact section */}
							<div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
								<h3 className="text-blue-800 font-semibold mb-3">
									Administrator Contact:
								</h3>
								<div className="space-y-2 text-sm text-blue-900">
									<div className="flex items-center gap-2">
										<span className="font-semibold">
											📞 Phone:
										</span>
										<a
											href="tel:+971528411575"
											className="text-blue-600 hover:underline"
										>
											+971 52 841 1575
										</a>
									</div>
									<div className="flex items-center gap-2">
										<span className="font-semibold">
											📧 Email:
										</span>
										<a
											href="mailto:info@ericlalta.com"
											className="text-blue-600 hover:underline"
										>
											info@ericlalta.com
										</a>
									</div>
								</div>
								<p className="text-xs text-blue-700 mt-3">
									If you have any questions or need immediate
									assistance, please contact the
									administrator.
								</p>
							</div>

							<div className="space-y-3">
								<Button
									onClick={checkStatus}
									disabled={loading}
									className="w-full bg-purple-600 hover:bg-purple-700"
								>
									{loading ? "Checking..." : "Check Status"}
								</Button>

								<Button
									variant="outline"
									onClick={() => router.push("/login")}
									className="w-full"
								>
									Back to Login
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
