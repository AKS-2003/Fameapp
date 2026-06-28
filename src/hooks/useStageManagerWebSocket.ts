import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

interface UseStageManagerWebSocketOptions {
	userId: string;
	onAccountUpdate?: (data: any) => void;
}

export function useStageManagerWebSocket(
	options: UseStageManagerWebSocketOptions
) {
	const { userId, onAccountUpdate } = options;
	const router = useRouter();
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		if (!userId) return;

		let socket: any = null;
		let mounted = true;

		const initializeWebSocket = async () => {
			try {
				// Use bundled socket.io-client - no script injection needed
				if (!mounted) return;

				socket = io(undefined, {
					path: "/socket.io",
					transports: ["polling", "websocket"],
					withCredentials: true,
				});


				socket.on("connect", () => {
					if (!mounted) return;
					setIsConnected(true);

					// Authenticate
					socket.emit("authenticate", {
						userId,
						role: "stage_manager",
					});

					console.log("Stage Manager WebSocket connected:", userId);
				});

				socket.on("disconnect", () => {
					if (!mounted) return;
					setIsConnected(false);
					console.log("Stage Manager WebSocket disconnected");
				});

				// Listen for account updates
				socket.on("stage_manager_account_updated", (data: any) => {
					if (!mounted) return;

					console.log("Stage Manager account updated:", data);

					if (data.userId === userId) {
						// Call custom handler if provided
						if (onAccountUpdate) {
							onAccountUpdate(data);
						}

						// Actions that require force logout with modal (delete, deactivate, suspend, changeCredentials)
						if (
							data.action === "delete" ||
							data.action === "deleted" ||
							data.action === "deactivate" ||
							data.action === "deactivated" ||
							data.action === "suspend" ||
							data.action === "suspended" ||
							data.action === "changeCredentials" ||
							data.action === "credentials_changed"
						) {
							// Show modal and force logout
							const event = new CustomEvent(
								"stage-manager-force-logout",
								{
									detail: {
										action: data.action,
										message: data.message,
									},
								}
							);
							window.dispatchEvent(event);

							// Logout after a delay
							setTimeout(async () => {
								try {
									await fetch("/api/auth/logout", {
										method: "POST",
									});
								} catch (error) {
									console.error("Logout error:", error);
								}
								router.push("/login");
							}, 3000);
						}
						// Actions that show toast but don't force logout (reject only)
						else if (
							data.action === "reject" ||
							data.action === "rejected"
						) {
							// Show toast notification
							const toastEvent = new CustomEvent(
								"websocket-toast",
								{
									detail: {
										title: "Registration Rejected",
										description: data.message,
										variant: "destructive",
									},
								}
							);
							window.dispatchEvent(toastEvent);

							// Refresh the page to update UI
							setTimeout(() => {
								window.location.reload();
							}, 2000);
						}
						// Actions that show success toast (approve, activate)
						else if (
							data.action === "approve" ||
							data.action === "approved" ||
							data.action === "activate" ||
							data.action === "activated"
						) {
							// Show success toast
							const toastEvent = new CustomEvent(
								"websocket-toast",
								{
									detail: {
										title: "Account Activated",
										description: data.message,
										variant: "success",
									},
								}
							);
							window.dispatchEvent(toastEvent);

							// Refresh the page to update UI
							setTimeout(() => {
								window.location.reload();
							}, 2000);
						}
					}
				});

				// Listen for status changes
				socket.on("account_status_changed", (data: any) => {
					if (!mounted) return;

					console.log("Account status changed:", data);

					if (
						data.status === "suspended" ||
						data.status === "deactivated"
					) {
						// Show modal and force logout
						const event = new CustomEvent(
							"stage-manager-force-logout",
							{
								detail: {
									action: data.status,
									message: data.message,
								},
							}
						);
						window.dispatchEvent(event);

						// Logout after a delay
						setTimeout(async () => {
							try {
								await fetch("/api/auth/logout", {
									method: "POST",
								});
							} catch (error) {
								console.error("Logout error:", error);
							}
							router.push("/login");
						}, 3000);
					}
				});
			} catch (error) {
				console.error(
					"Failed to initialize Stage Manager WebSocket:",
					error
				);
			}
		};

		initializeWebSocket();

		return () => {
			mounted = false;
			if (socket) {
				socket.disconnect();
			}
		};
	}, [userId, router, onAccountUpdate]);

	return { isConnected };
}
