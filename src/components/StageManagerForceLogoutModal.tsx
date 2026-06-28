"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ForceLogoutData {
	action: string;
	message: string;
}

export function StageManagerForceLogoutModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [logoutData, setLogoutData] = useState<ForceLogoutData | null>(null);
	const [countdown, setCountdown] = useState(3);

	useEffect(() => {
		const handleForceLogout = (event: CustomEvent<ForceLogoutData>) => {
			setLogoutData(event.detail);
			setIsOpen(true);

			// Start countdown
			let count = 3;
			const interval = setInterval(() => {
				count--;
				setCountdown(count);
				if (count <= 0) {
					clearInterval(interval);
				}
			}, 1000);
		};

		window.addEventListener(
			"stage-manager-force-logout",
			handleForceLogout as EventListener
		);

		return () => {
			window.removeEventListener(
				"stage-manager-force-logout",
				handleForceLogout as EventListener
			);
		};
	}, []);

	const getTitle = () => {
		if (!logoutData) return "Account Update";

		switch (logoutData.action) {
			case "delete":
			case "deleted":
				return "Account Deleted";
			case "deactivate":
			case "deactivated":
				return "Account Deactivated";
			case "suspend":
			case "suspended":
				return "Account Suspended";
			case "reject":
			case "rejected":
				return "Registration Rejected";
			case "changeCredentials":
			case "credentials_changed":
				return "Credentials Changed";
			default:
				return "Account Update";
		}
	};

	const getMessage = () => {
		if (!logoutData) return "";

		return (
			logoutData.message ||
			"Your account has been updated by an administrator. You will be logged out shortly."
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-red-600">
						<AlertTriangle className="h-5 w-5" />
						{getTitle()}
					</DialogTitle>
					<DialogDescription asChild>
						<div className="space-y-3 pt-4">
							<span className="block text-base font-medium text-gray-900">
								{getMessage()}
							</span>
							<span className="block text-sm text-muted-foreground">
								You will be logged out in {countdown} seconds...
							</span>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
								<span className="block text-sm text-yellow-800">
									If you believe this is an error, please
									contact the administrator:
								</span>
								<div className="mt-2 space-y-1 text-sm text-yellow-900">
									<span className="block">
										📞 Phone:{" "}
										<a
											href="tel:+971528411575"
											className="font-medium hover:underline"
										>
											+971 52 841 1575
										</a>
									</span>
									<span className="block">
										📧 Email:{" "}
										<a
											href="mailto:ericlaltaevents@gmail.com"
											className="font-medium hover:underline"
										>
											ericlaltaevents@gmail.com
										</a>
									</span>
								</div>
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
