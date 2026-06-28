"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketProps {
	userId?: string;
	role?: string;
	onStatusChange?: (data: any) => void;
	onAdminNotification?: (data: any) => void;
	onNewRegistration?: (data: any) => void;
	onAdminActionPerformed?: (data: any) => void;
}

export function useWebSocket({
	userId,
	role,
	onStatusChange,
	onAdminNotification,
	onNewRegistration,
	onAdminActionPerformed,
}: UseWebSocketProps) {
	const socketRef = useRef<Socket | null>(null);

	useEffect(() => {
		if (!userId || !role) return;

		// Initialize socket connection
		// Force WebSocket-only transport for Cloud Run compatibility
		socketRef.current = io(undefined, {
			path: "/socket.io",
			transports: ["polling", "websocket"],
			withCredentials: true,
		});


		const socket = socketRef.current;

		// Store socket reference so useSubscription can reuse it
		(window as any).__stageManagerSocket = socket;

		socket.on("connect", () => {
			console.log("Connected to WebSocket server");

			// Authenticate user
			socket.emit("authenticate", { userId, role });
		});

		socket.on("account_status_changed", (data) => {
			console.log("Account status changed:", data);
			if (onStatusChange) {
				onStatusChange(data);
			}
		});

		socket.on("admin_notification", (data) => {
			console.log("Admin notification received:", data);
			if (onAdminNotification) {
				onAdminNotification(data);
			}
		});

		socket.on("stage_manager_account_updated", (data) => {
			console.log("Stage manager account updated:", data);
			if (onAdminNotification) {
				onAdminNotification(data);
			}
		});

		socket.on("new_registration", (data) => {
			console.log("New registration received:", data);
			if (onNewRegistration) {
				onNewRegistration(data);
			}
		});

		socket.on("admin_action_performed", (data) => {
			console.log("Admin action performed:", data);
			if (onAdminActionPerformed) {
				onAdminActionPerformed(data);
			}
		});

		socket.on("disconnect", () => {
			console.log("Disconnected from WebSocket server");
		});

		return () => {
			if (socketRef.current) {
				socketRef.current.disconnect();
			}
			delete (window as any).__stageManagerSocket;
		};
	}, [
		userId,
		role,
		onStatusChange,
		onAdminNotification,
		onNewRegistration,
		onAdminActionPerformed,
	]);

	const sendStatusUpdate = (
		targetUserId: string,
		status: string,
		message: string,
	) => {
		if (socketRef.current) {
			socketRef.current.emit("status_update", {
				userId: targetUserId,
				status,
				message,
			});
		}
	};

	const sendAdminAction = (
		targetUserId: string,
		action: string,
		message: string,
	) => {
		if (socketRef.current) {
			socketRef.current.emit("admin_action", {
				targetUserId,
				action,
				message,
			});
		}
	};

	return {
		sendStatusUpdate,
		sendAdminAction,
	};
}
