"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

/**
 * useContractSocket — Establishes a Socket.IO connection for contract-related pages
 * and bridges server events ↔ window CustomEvents.
 *
 * This is the MISSING LINK that connects:
 *   - Stage manager pages (artist-contracts, logistics, analytics, workshop)
 *   - FameLink artist dashboard
 *   - Socket.IO server (server.js)
 *
 * It does two things:
 *   1. INCOMING: Server Socket.IO events → window.dispatchEvent (so useContractData picks them up)
 *   2. OUTGOING: Stores socket as window.__fame_socket (so useContractData.emitContractEvent can send to server)
 */

// All contract-related event names that the server broadcasts
const CONTRACT_EVENTS = [
	"contract_artist_updated",
	"contract_invitation_created",
	"contract_message_new",
	"contract_payment_updated",
	"contract_status_changed",
	"contract_action",
	"contract_invite_sent",
	"contract_invite_update",
	"contract_message_to_artist",
	"contract_message_received",
	"logistics_updated",
	"logistics_registries_updated",
	"workshop_schedule_updated",
	"booking_stage_updated",
	"booking_negotiation_added",
	"booking_signature_submitted",
	"booking_created",
] as const;

interface UseContractSocketOptions {
	eventId: string;
	userId?: string;
	role?: "organiser" | "artist";
}

export function useContractSocket({
	eventId,
	userId,
	role = "organiser",
}: UseContractSocketOptions) {
	const socketRef = useRef<any>(null);
	const connectedRef = useRef(false);

	useEffect(() => {
		if (!eventId) return;

		let mounted = true;
		let socket: any = null;

		const connect = async () => {
			try {
				socket = io(undefined, {
					path: "/socket.io",
					transports: ["polling", "websocket"],
					withCredentials: true,
				});


				socketRef.current = socket;

				socket.on("connect", () => {
					if (!mounted) return;
					connectedRef.current = true;
					console.log(
						`[ContractSocket] Connected for event ${eventId}`,
					);

					// Store as __fame_socket so useContractData.emitContractEvent can use it
					(window as any).__fame_socket = socket;

					// Authenticate and join event room
					socket.emit("authenticate", {
						userId: userId || "anonymous",
						role: role,
						eventId: eventId,
					});

					// Also explicitly join the event room
					socket.emit("join_event_room", { eventId });
				});

				// Bridge ALL contract events from server → window CustomEvents
				for (const eventName of CONTRACT_EVENTS) {
					socket.on(eventName, (data: any) => {
						if (!mounted) return;
						// Only dispatch if this event is for our eventId (or has no eventId filter)
						if (data?.eventId && data.eventId !== eventId) return;

						console.log(
							`[ContractSocket] Received: ${eventName}`,
							data,
						);
						window.dispatchEvent(
							new CustomEvent(eventName, { detail: data }),
						);
					});
				}

				socket.on("disconnect", () => {
					connectedRef.current = false;
					console.log("[ContractSocket] Disconnected");
				});

				socket.on("connect_error", (err: any) => {
					console.error(
						"[ContractSocket] Connection error:",
						err.message,
					);
				});
			} catch (err) {
				console.error("[ContractSocket] Failed to connect:", err);
			}
		};

		connect();

		return () => {
			mounted = false;
			if (socket) {
				// Remove __fame_socket if it's ours
				if ((window as any).__fame_socket === socket) {
					delete (window as any).__fame_socket;
				}
				socket.disconnect();
			}
			socketRef.current = null;
			connectedRef.current = false;
		};
	}, [eventId, userId, role]);

	return { socketRef, isConnected: connectedRef.current };
}
