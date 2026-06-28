"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw, CheckCircle } from "lucide-react";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function AccountPendingPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			router.push("/login");
		} catch (error) {
			console.error("Logout error:", error);
			router.push("/login");
		}
	};

	const checkAccountStatus = async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/auth/check-status");
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data.status === "active") {
					// Account has been approved, redirect to dashboard
					router.push("/stage-manager");
				}
			}
		} catch (error) {
			console.error("Error checking account status:", error);
		} finally {
			setLoading(false);
		}
	};

	// Auto-check status every 30 seconds
	useEffect(() => {
		const interval = setInterval(checkAccountStatus, 30000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-8">
				{/* Logo and Header */}
				<div className="text-center">
					<div className="flex justify-center mb-6">
						<FameLogo width={80} height={80} />
					</div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
						Account Pending
					</h1>
					<p className="text-gray-600 text-lg">
						Your Stage Manager account is awaiting approval
					</p>
				</div>

				{/* Pending Status Card */}
				<Card className="bg-white border-gray-200 shadow-lg">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<div className="relative">
								<Clock className="h-16 w-16 text-yellow-500" />
								<div className="absolute -top-1 -right-1 h-6 w-6 bg-yellow-100 rounded-full flex items-center justify-center">
									<div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
								</div>
							</div>
						</div>
						<CardTitle className="text-gray-900 text-2xl">
							Approval Required
						</CardTitle>
						<CardDescription className="text-gray-600 text-lg">
							Your account is currently under review
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<h3 className="font-semibold text-yellow-800 mb-2">
								What happens next?
							</h3>
							<ul className="text-sm text-yellow-700 space-y-2">
								<li className="flex items-start">
									<CheckCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
									Your registration has been submitted
									successfully
								</li>
								<li className="flex items-start">
									<Clock className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
									An administrator will review your
									application
								</li>
								<li className="flex items-start">
									<CheckCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
									You'll receive access once approved
								</li>
							</ul>
						</div>

						<div className="text-center space-y-4">
							<p className="text-sm text-gray-600">
								This page will automatically refresh when your
								account is approved.
							</p>

							<Button
								onClick={checkAccountStatus}
								disabled={loading}
								variant="outline"
								className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
							>
								{loading ? (
									<div className="flex items-center">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
										Checking Status...
									</div>
								) : (
									<div className="flex items-center">
										<RefreshCw className="h-4 w-4 mr-2" />
										Check Status Now
									</div>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="text-center space-y-4">
					<p className="text-gray-500 text-sm">
						Need help? Contact support at{" "}
						<a
							href="mailto:support@fame.dev"
							className="text-purple-600 hover:text-purple-700"
						>
							support@fame.dev
						</a>
					</p>

					<Button
						onClick={handleLogout}
						variant="outline"
						className="border-gray-300 text-gray-600 hover:bg-gray-50"
					>
						<LogOut className="h-4 w-4 mr-2" />
						Sign Out
					</Button>
				</div>

				{/* Footer */}
				<FantasiaFooter variant="dark" className="text-center" />
			</div>
		</div>
	);
}
