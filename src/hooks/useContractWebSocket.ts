"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseContractWebSocketOptions {
	eventId: string;
	role?: string;
	userId?: string;
	onArtistUpdated?: (data: any) => void;
	onInvitationCreated?: (data: any) => void;
	onMessageNew?: (data: any) => void;
	onPaymentUpdated?: (data: any) => void;
	onStatusChanged?: (data: any) => void;
	showToasts?: boolean;
}

export function useContractWebSocket({
	eventId,
	role = "organiser",
	userId,
	onArtistUpdated,
	onInvitationCreated,
	onMessageNew,
	onPaymentUpdated,
	onStatusChanged,
	showToasts = true,
}: UseContractWebSocketOptions) {
	const socketRef = useRef<any>(null);
	const handlersRef = useRef({
		onArtistUpdated,
		onInvitationCreated,
		onMessageNew,
		onPaymentUpdated,
		onStatusChanged,
	});

	// Keep handlers ref up to date
	useEffect(() => {
		handlersRef.current = {
			onArtistUpdated,
			onInvitationCreated,
			onMessageNew,
			onPaymentUpdated,
			onStatusChanged,
		};
	});

	useEffect(() => {
		if (!eventId) return;

		// Set up listeners
		const handleArtistUpdated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId) {
				handlersRef.current.onArtistUpdated?.(detail);
				if (showToasts) {
					showWebSocketToast(
						"📋 Contract Updated",
						detail.action === "create"
							? `${detail.artist?.stageName || "Artist"} added to pipeline`
							: detail.action === "delete"
								? "Artist removed from pipeline"
								: "Artist contract updated",
					);
				}
			}
		};

		const handleInvitationCreated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId) {
				handlersRef.current.onInvitationCreated?.(detail);
				if (showToasts) {
					showWebSocketToast(
						"✉️ Invitation Sent",
						detail.bulk
							? `${detail.invitations?.length || 0} invitations sent`
							: `Invitation sent to ${detail.invitation?.artistName || "artist"}`,
					);
				}
			}
		};

		const handleMessageNew = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId) {
				handlersRef.current.onMessageNew?.(detail);
				if (showToasts) {
					showWebSocketToast(
						"💬 New Message",
						`New message from ${detail.message?.senderName || "someone"}`,
					);
				}
			}
		};

		const handlePaymentUpdated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId) {
				handlersRef.current.onPaymentUpdated?.(detail);
				if (showToasts) {
					showWebSocketToast(
						"💰 Payment Updated",
						"Payment status has been updated",
					);
				}
			}
		};

		const handleStatusChanged = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId) {
				handlersRef.current.onStatusChanged?.(detail);
				if (showToasts) {
					showWebSocketToast(
						"🔄 Status Changed",
						`${detail.artistName || "Artist"} moved to ${detail.newStatus || "new status"}`,
					);
				}
			}
		};

		window.addEventListener(
			"contract_artist_updated",
			handleArtistUpdated as EventListener,
		);
		window.addEventListener(
			"contract_invitation_created",
			handleInvitationCreated as EventListener,
		);
		window.addEventListener(
			"contract_message_new",
			handleMessageNew as EventListener,
		);
		window.addEventListener(
			"contract_payment_updated",
			handlePaymentUpdated as EventListener,
		);
		window.addEventListener(
			"contract_status_changed",
			handleStatusChanged as EventListener,
		);

		// Listen for artist actions (approve, sign, message, etc.)
		const handleContractAction = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId === eventId && showToasts) {
				const actionLabels: Record<string, string> = {
					approve_agreement: "approved the agreement",
					request_changes: "requested changes",
					send_message: "sent a message",
					accept_contract: "signed the contract",
					update_profile: "updated their profile",
					update_answers: "submitted answers",
				};
				const label =
					actionLabels[detail.artistAction || detail.action] ||
					"took an action";
				showWebSocketToast(
					"🎭 Artist Action",
					`${detail.artistName || "Artist"} ${label}`,
				);
			}
		};
		window.addEventListener(
			"contract_action",
			handleContractAction as EventListener,
		);

		return () => {
			window.removeEventListener(
				"contract_artist_updated",
				handleArtistUpdated as EventListener,
			);
			window.removeEventListener(
				"contract_invitation_created",
				handleInvitationCreated as EventListener,
			);
			window.removeEventListener(
				"contract_message_new",
				handleMessageNew as EventListener,
			);
			window.removeEventListener(
				"contract_payment_updated",
				handlePaymentUpdated as EventListener,
			);
			window.removeEventListener(
				"contract_status_changed",
				handleStatusChanged as EventListener,
			);
			window.removeEventListener(
				"contract_action",
				handleContractAction as EventListener,
			);
		};
	}, [eventId, showToasts]);

	// Emit function
	const emit = useCallback(
		(eventName: string, data: any) => {
			try {
				window.dispatchEvent(
					new CustomEvent(eventName, {
						detail: {
							...data,
							eventId,
							timestamp: new Date().toISOString(),
						},
					}),
				);

				// Also try Socket.IO
				const socket = (window as any).__fame_socket;
				if (socket?.connected) {
					socket.emit(eventName, {
						...data,
						eventId,
						timestamp: new Date().toISOString(),
					});
				}
			} catch (e) {
				console.error("Error emitting event:", e);
			}
		},
		[eventId],
	);

	return { emit };
}

function showWebSocketToast(
	title: string,
	description: string,
	variant: "default" | "destructive" = "default",
) {
	try {
		window.dispatchEvent(
			new CustomEvent("websocket-toast", {
				detail: { title, description, variant },
			}),
		);
	} catch (e) {
		// Silent fail
	}
}
