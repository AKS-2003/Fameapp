"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
	ContractArtist,
	ContractInvitation,
	ConversationMessage,
} from "@/types/contracts";

interface UseContractDataOptions {
	eventId: string;
	autoRefresh?: boolean;
}

interface ContractData {
	artists: ContractArtist[];
	invitations: ContractInvitation[];
	conversations: ConversationMessage[];
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	addArtist: (
		artist: Partial<ContractArtist>,
	) => Promise<ContractArtist | null>;
	updateArtist: (
		artistId: string,
		updates: Partial<ContractArtist>,
	) => Promise<boolean>;
	deleteArtist: (artistId: string) => Promise<boolean>;
	addInvitation: (
		invitation: Partial<ContractInvitation>,
	) => Promise<ContractInvitation | null>;
	addInvitations: (
		invitations: Partial<ContractInvitation>[],
	) => Promise<ContractInvitation[]>;
	updateInvitation: (
		invitationId: string,
		updates: Partial<ContractInvitation>,
	) => Promise<boolean>;
	sendMessage: (message: Partial<ConversationMessage>) => Promise<boolean>;
}

// Unique ID per hook instance to detect self-emitted events
let _instanceCounter = 0;

export function useContractData({
	eventId,
	autoRefresh = true,
}: UseContractDataOptions): ContractData {
	const [artists, setArtists] = useState<ContractArtist[]>([]);
	const [invitations, setInvitations] = useState<ContractInvitation[]>([]);
	const [conversations, setConversations] = useState<ConversationMessage[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const instanceId = useRef(`cdata-${++_instanceCounter}-${Date.now()}`);

	// Fetch all data — only sets isLoading on initial load
	const fetchData = useCallback(
		async (showLoading = false) => {
			try {
				if (showLoading) {
					setIsLoading(true);
				}
				setError(null);

				const [artistsRes, invitationsRes, conversationsRes] =
					await Promise.all([
						fetch(`/api/contracts/${eventId}`),
						fetch(`/api/contracts/${eventId}/invitations`),
						fetch(`/api/contracts/${eventId}/conversations`),
					]);

				const [artistsData, invitationsData, conversationsData] =
					await Promise.all([
						artistsRes.json(),
						invitationsRes.json(),
						conversationsRes.json(),
					]);

				if (artistsData.success) {
					const apiArtists = artistsData.artists || [];
					// Normalize: ensure agreement and travelLogistics exist on each artist
					const normalized = apiArtists.map((a: any) => ({
						...a,
						agreement: a.agreement || {
							agreedFee: "",
							paymentSchedule: "",
							paymentMethod: "",
							workshopsConfirmed: 0,
							workshopDaysAgreed: 0,
							showsConfirmed: 0,
							djSets: 0,
							panels: 0,
							hotelNights: 0,
							roomSharing: "",
							airportTransfer: false,
							foodVouchers: false,
							flightBudget: "",
							travelClass: "",
							arrivalDate: "",
							departureDate: "",
							promoObligations: "",
							socialMediaPosts: 0,
							ambassadorTasks: "",
							payments: {
								feePaid: false,
								flightsPaid: false,
								hotelPaid: false,
								transportPaid: false,
								foodPaid: false,
							},
						},
						travelLogistics: a.travelLogistics || {
							flights: [],
							hotelBookingFile: "",
							workshopSchedule: "",
							pickupInfo: "",
							dropoffInfo: "",
							additionalNotes: "",
							driverName: "",
							driverPhone: "",
							driverNotes: "",
							hotelId: "",
							hotelName: "",
							hotelAddress: "",
							hotelMapLink: "",
							hotelCheckIn: "",
							hotelCheckOut: "",
							hotelNotes: "",
							hotelRooms: [],
							eventVenueName: "",
							eventVenueAddress: "",
							eventVenueMapLink: "",
						},
						groupMembers: a.groupMembers || [],
						eventQuestions: a.eventQuestions || [],
						missingItems: a.missingItems || [],
					}));
					setArtists(normalized);
				}
				if (invitationsData.success)
					setInvitations(invitationsData.invitations || []);
				if (conversationsData.success)
					setConversations(conversationsData.messages || []);
			} catch (err) {
				console.error("Error fetching contract data:", err);
				setError("Failed to load contract data");
			} finally {
				setIsLoading(false);
			}
		},
		[eventId],
	);

	// Public refetch (no loading spinner)
	const refetch = useCallback(() => fetchData(false), [fetchData]);

	// Initial fetch (with loading spinner) + polling fallback for real-time
	useEffect(() => {
		if (eventId) {
			fetchData(true);
			// Poll every 20s as fallback alongside WebSocket for real-time without manual refresh
			const interval = setInterval(() => fetchData(false), 20000);
			return () => clearInterval(interval);
		}
	}, [eventId, fetchData]);

	// ===== WebSocket real-time sync — granular updates, no full refetch =====
	useEffect(() => {
		if (!eventId || !autoRefresh) return;

		const handleArtistUpdated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			// Skip self-emitted events — we already did optimistic update
			if (detail?._source === instanceId.current) return;

			const { action, artist, artistId, updates } = detail;
			if (action === "create" && artist) {
				setArtists((prev) => {
					// Avoid duplicates
					if (prev.some((a) => a.id === artist.id)) return prev;
					return [...prev, artist];
				});
			} else if (action === "update" && artistId && updates) {
				setArtists((prev) =>
					prev.map((a) =>
						a.id === artistId ? { ...a, ...updates } : a,
					),
				);
			} else if (action === "delete" && artistId) {
				setArtists((prev) => prev.filter((a) => a.id !== artistId));
			} else {
				// Unknown action shape — background refetch without loading spinner
				fetchData(false);
			}
		};

		const handleInvitationCreated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			if (detail?._source === instanceId.current) return;

			if (detail.bulk && detail.invitations) {
				setInvitations((prev) => {
					const existingIds = new Set(prev.map((i) => i.id));
					const newOnes = detail.invitations.filter(
						(i: any) => !existingIds.has(i.id),
					);
					return [...prev, ...newOnes];
				});
			} else if (detail.invitation) {
				setInvitations((prev) => {
					if (prev.some((i) => i.id === detail.invitation.id))
						return prev;
					return [...prev, detail.invitation];
				});
			} else {
				fetchData(false);
			}
		};

		const handleNewMessage = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			if (detail?._source === instanceId.current) return;

			if (detail.message) {
				setConversations((prev) => {
					if (prev.some((m) => m.id === detail.message.id))
						return prev;
					return [...prev, detail.message];
				});
			} else {
				fetchData(false);
			}
		};

		const handlePaymentUpdated = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			if (detail?._source === instanceId.current) return;
			// Payment updates affect artist data — background refetch
			fetchData(false);
		};

		const handleStatusChanged = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			if (detail?._source === instanceId.current) return;

			if (detail.artistId && detail.newStatus) {
				setArtists((prev) =>
					prev.map((a) =>
						a.id === detail.artistId
							? { ...a, status: detail.newStatus }
							: a,
					),
				);
			} else {
				fetchData(false);
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
			handleNewMessage as EventListener,
		);
		window.addEventListener(
			"contract_payment_updated",
			handlePaymentUpdated as EventListener,
		);
		window.addEventListener(
			"contract_status_changed",
			handleStatusChanged as EventListener,
		);

		// contract_action: artist took an action (approve, sign, message, etc.)
		// This means GCS data changed server-side, so we need to refetch
		const handleContractAction = (event: CustomEvent) => {
			const { detail } = event;
			if (detail?.eventId !== eventId) return;
			// Background refetch to pick up the artist's changes from GCS
			fetchData(false);
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
				handleNewMessage as EventListener,
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
	}, [eventId, autoRefresh, fetchData]);

	// ===== CRUD operations with optimistic updates =====

	// Add artist
	const addArtist = useCallback(
		async (
			artist: Partial<ContractArtist>,
		): Promise<ContractArtist | null> => {
			try {
				const res = await fetch(`/api/contracts/${eventId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(artist),
				});
				const data = await res.json();
				if (data.success) {
					setArtists((prev) => [...prev, data.artist]);
					emitContractEvent("contract_artist_updated", {
						eventId,
						action: "create",
						artist: data.artist,
						_source: instanceId.current,
					});
					return data.artist;
				}
				return null;
			} catch (err) {
				console.error("Error adding artist:", err);
				return null;
			}
		},
		[eventId],
	);

	// Update artist
	const updateArtist = useCallback(
		async (
			artistId: string,
			updates: Partial<ContractArtist>,
		): Promise<boolean> => {
			// Optimistic update immediately
			setArtists((prev) =>
				prev.map((a) => (a.id === artistId ? { ...a, ...updates } : a)),
			);
			try {
				const res = await fetch(`/api/contracts/${eventId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ artistId, ...updates }),
				});
				const data = await res.json();
				if (data.success) {
					emitContractEvent("contract_artist_updated", {
						eventId,
						action: "update",
						artistId,
						updates,
						_source: instanceId.current,
					});
					return true;
				}
				// Revert on failure
				fetchData(false);
				return false;
			} catch (err) {
				console.error("Error updating artist:", err);
				fetchData(false);
				return false;
			}
		},
		[eventId, fetchData],
	);

	// Delete artist
	const deleteArtist = useCallback(
		async (artistId: string): Promise<boolean> => {
			// Optimistic delete
			const prev = artists;
			setArtists((p) => p.filter((a) => a.id !== artistId));
			try {
				const res = await fetch(
					`/api/contracts/${eventId}?artistId=${artistId}`,
					{
						method: "DELETE",
					},
				);
				const data = await res.json();
				if (data.success) {
					emitContractEvent("contract_artist_updated", {
						eventId,
						action: "delete",
						artistId,
						_source: instanceId.current,
					});
					return true;
				}
				// Revert on failure
				setArtists(prev);
				return false;
			} catch (err) {
				console.error("Error deleting artist:", err);
				setArtists(prev);
				return false;
			}
		},
		[eventId, artists],
	);

	// Add invitation
	const addInvitation = useCallback(
		async (
			invitation: Partial<ContractInvitation>,
		): Promise<ContractInvitation | null> => {
			try {
				const res = await fetch(
					`/api/contracts/${eventId}/invitations`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(invitation),
					},
				);
				const data = await res.json();
				if (data.success && data.invitations?.[0]) {
					const newInvitation = data.invitations[0];
					setInvitations((prev) => [...prev, newInvitation]);
					emitContractEvent("contract_invitation_created", {
						eventId,
						invitation: newInvitation,
						_source: instanceId.current,
					});
					return newInvitation;
				}
				return null;
			} catch (err) {
				console.error("Error adding invitation:", err);
				return null;
			}
		},
		[eventId],
	);

	// Bulk add invitations
	const addInvitations = useCallback(
		async (
			invitationList: Partial<ContractInvitation>[],
		): Promise<ContractInvitation[]> => {
			try {
				const res = await fetch(
					`/api/contracts/${eventId}/invitations`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(invitationList),
					},
				);
				const data = await res.json();
				if (data.success) {
					setInvitations((prev) => [...prev, ...data.invitations]);
					emitContractEvent("contract_invitation_created", {
						eventId,
						invitations: data.invitations,
						bulk: true,
						_source: instanceId.current,
					});
					return data.invitations;
				}
				return [];
			} catch (err) {
				console.error("Error adding invitations:", err);
				return [];
			}
		},
		[eventId],
	);

	// Update invitation
	const updateInvitation = useCallback(
		async (
			invitationId: string,
			updates: Partial<ContractInvitation>,
		): Promise<boolean> => {
			setInvitations((prev) =>
				prev.map((i) =>
					i.id === invitationId ? { ...i, ...updates } : i,
				),
			);
			try {
				const res = await fetch(
					`/api/contracts/${eventId}/invitations`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ invitationId, ...updates }),
					},
				);
				const data = await res.json();
				if (data.success) {
					return true;
				}
				fetchData(false);
				return false;
			} catch (err) {
				console.error("Error updating invitation:", err);
				fetchData(false);
				return false;
			}
		},
		[eventId, fetchData],
	);

	// Send message
	const sendMessage = useCallback(
		async (message: Partial<ConversationMessage>): Promise<boolean> => {
			try {
				const res = await fetch(
					`/api/contracts/${eventId}/conversations`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(message),
					},
				);
				const data = await res.json();
				if (data.success) {
					setConversations((prev) => [...prev, data.message]);
					emitContractEvent("contract_message_new", {
						eventId,
						message: data.message,
						_source: instanceId.current,
					});
					return true;
				}
				return false;
			} catch (err) {
				console.error("Error sending message:", err);
				return false;
			}
		},
		[eventId],
	);

	return {
		artists,
		invitations,
		conversations,
		isLoading,
		error,
		refetch,
		addArtist,
		updateArtist,
		deleteArtist,
		addInvitation,
		addInvitations,
		updateInvitation,
		sendMessage,
	};
}

// Helper: emit contract event via Socket.IO + local CustomEvent
function emitContractEvent(eventName: string, data: any) {
	try {
		// Dispatch custom window event for local listeners
		window.dispatchEvent(new CustomEvent(eventName, { detail: data }));

		// Also emit via Socket.IO if available (for other browsers/tabs)
		const socket = (window as any).__fame_socket;
		if (socket?.connected) {
			socket.emit(eventName, {
				...data,
				timestamp: new Date().toISOString(),
			});
		}
	} catch (e) {
		console.error("Error emitting contract event:", e);
	}
}
