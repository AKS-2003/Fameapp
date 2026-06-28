"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";

interface SubscriptionData {
	subscription: {
		plan_type: string;
		plan_quantity: number;
		stripe_customer_id?: string;
		stripe_subscription_id?: string;
		plan_expiration?: string;
	};
	maxEvents?: number;
	currentEventCount?: number;
	canCreateEvent?: boolean;
	maxShows?: number;
	currentShowCount?: number;
	canCreateShow?: boolean;
	userType: "stage_manager" | "artist";
	userId?: string;
	userEmail?: string;
}

export function useSubscription() {
	const [data, setData] = useState<SubscriptionData | null>(null);
	const [loading, setLoading] = useState(true);
	const [justUpgraded, setJustUpgraded] = useState(false);
	const socketRef = useRef<any>(null);
	const prevPlanRef = useRef<string | null>(null); // null = not yet loaded
	const prevQuantityRef = useRef<number>(0);
	const prevSubIdRef = useRef<string | null>(null);
	const initialLoadDoneRef = useRef(false);
	const socketListenerAttachedRef = useRef(false);
	const syncAttemptedRef = useRef(false);

	const detectUpgrade = useCallback(
		(newPlan: string, newQty: number, newSubId: string | null) => {
			if (!initialLoadDoneRef.current || prevPlanRef.current === null)
				return false;

			const planChanged = newPlan !== prevPlanRef.current;
			const qtyChanged = newQty !== prevQuantityRef.current;
			const subIdChanged = newSubId !== prevSubIdRef.current;

			if (planChanged || qtyChanged || subIdChanged) {
				if (
					newPlan !== "free" &&
					(prevPlanRef.current === "free" ||
						planChanged ||
						qtyChanged)
				) {
					return true;
				}
			}
			return false;
		},
		[],
	);

	const fetchSubscription = useCallback(async () => {
		try {
			const response = await fetch(`/api/subscription?t=${Date.now()}`);
			const result = await response.json();
			if (result.success) {
				const newPlan = result.data.subscription?.plan_type || "free";
				const newQty = result.data.subscription?.plan_quantity || 0;
				const newSubId =
					result.data.subscription?.stripe_subscription_id || null;

				if (detectUpgrade(newPlan, newQty, newSubId)) {
					setJustUpgraded(true);
				}

				setData(result.data);
				prevPlanRef.current = newPlan;
				prevQuantityRef.current = newQty;
				prevSubIdRef.current = newSubId;
				initialLoadDoneRef.current = true;
			}
		} catch (err) {
			console.error("Error fetching subscription:", err);
		} finally {
			setLoading(false);
		}
	}, [detectUpgrade]);

	useEffect(() => {
		fetchSubscription();
	}, [fetchSubscription]);

	// If user returned from Stripe checkout and plan is still "free" after
	// initial load, force-sync from Stripe API as a fallback.
	// We check sessionStorage instead of URL params because the page component
	// cleans up ?upgraded=true from the URL before this effect can read it.
	useEffect(() => {
		if (!initialLoadDoneRef.current || syncAttemptedRef.current) return;
		if (typeof window === "undefined") return;

		// Check both URL params AND sessionStorage — the page component
		// stores the flag in sessionStorage before cleaning the URL
		const params = new URLSearchParams(window.location.search);
		const fromUrl = params.get("upgraded") === "true";
		const fromStorage =
			sessionStorage.getItem("stripe_checkout_returned") === "true";

		if (!fromUrl && !fromStorage) return;

		const currentPlan = prevPlanRef.current;
		if (currentPlan && currentPlan !== "free") {
			// Already upgraded — clean up storage and trigger success
			sessionStorage.removeItem("stripe_checkout_returned");
			setJustUpgraded(true);
			return;
		}

		// Plan is still free after returning from checkout — force sync
		syncAttemptedRef.current = true;
		console.log(
			"[useSubscription] Plan still free after checkout return, force-syncing from Stripe...",
		);

		const doSync = async (attempt: number) => {
			try {
				const res = await fetch("/api/subscription/sync", {
					method: "POST",
				});
				if (!res.ok) {
					console.warn(
						`[useSubscription] Sync attempt ${attempt} returned ${res.status}`,
					);
					if (attempt < 3) {
						setTimeout(() => doSync(attempt + 1), 3000 * attempt);
					} else {
						sessionStorage.removeItem("stripe_checkout_returned");
					}
					return;
				}
				const result = await res.json();
				if (result.success && result.synced) {
					console.log(
						"[useSubscription] Sync successful:",
						result.planType,
					);
					sessionStorage.removeItem("stripe_checkout_returned");
					await fetchSubscription();
					setJustUpgraded(true);
				} else {
					console.log(
						"[useSubscription] Sync attempt",
						attempt,
						"result:",
						result.message || "not synced",
					);
					if (attempt < 3) {
						setTimeout(() => doSync(attempt + 1), 3000 * attempt);
					} else {
						sessionStorage.removeItem("stripe_checkout_returned");
					}
				}
			} catch (err) {
				console.error("[useSubscription] Sync error:", err);
				if (attempt < 3) {
					setTimeout(() => doSync(attempt + 1), 3000 * attempt);
				} else {
					sessionStorage.removeItem("stripe_checkout_returned");
				}
			}
		};

		// Small delay to let webhook process first
		setTimeout(() => doSync(1), 2000);
	}, [data, fetchSubscription]);

	// Attach subscription_updated listener to a socket (reusable helper)
	const attachListener = useCallback(
		(socket: any, mounted: { current: boolean }) => {
			if (!socket) return;
			// Remove any previous listener to avoid duplicates
			socket.off("subscription_updated");
			socket.on("subscription_updated", () => {
				if (mounted.current) {
					// Delay fetch slightly to let the webhook finish writing to DB
					setTimeout(() => {
						setJustUpgraded(true);
						fetchSubscription();
					}, 500);
				}
			});
		},
		[fetchSubscription],
	);

	// Listen for real-time subscription updates via WebSocket
	useEffect(() => {
		const mounted = { current: true };

		const connectSocket = async () => {
			try {
				if (typeof window === "undefined") return;

				// Reuse existing page socket if available
				const existingSocket =
					(window as any).__fameLinkSocket ||
					(window as any).__stageManagerSocket;
				if (existingSocket && existingSocket.connected) {
					attachListener(existingSocket, mounted);
					socketRef.current = existingSocket;
					socketListenerAttachedRef.current = true;
					return;
				}

				// If existing socket exists but not yet connected, wait for it
				if (existingSocket) {
					existingSocket.on("connect", () => {
						if (mounted.current) {
							attachListener(existingSocket, mounted);
							socketRef.current = existingSocket;
							socketListenerAttachedRef.current = true;
						}
					});
					// Also attach now in case it connects before the event fires
					attachListener(existingSocket, mounted);
					socketRef.current = existingSocket;
					return;
				}

				// Use bundled socket.io-client — no script injection needed
				if (!mounted.current) return;

				const socket = io(undefined, {
					path: "/socket.io",
					transports: ["websocket"],
					upgrade: false,
					withCredentials: true,
				});

				socket.on("connect", () => {
					// Get session info to authenticate and join the right room
					fetch("/api/auth/me")
						.then((r) => r.json())
						.then((result) => {
							if (result.success && result.data) {
								socket.emit("authenticate", {
									userId: result.data.userId,
									role: result.data.role,
								});
							}
						})
						.catch(() => {});
				});

				attachListener(socket, mounted);
				socketRef.current = socket;
				socketListenerAttachedRef.current = true;
			} catch (err) {
				console.error("Subscription WebSocket error:", err);
			}
		};

		connectSocket();

		// Also re-attach listener if the page socket appears later
		const checkInterval = setInterval(() => {
			if (!mounted.current) return;
			const pageSocket =
				(window as any).__fameLinkSocket ||
				(window as any).__stageManagerSocket;
			if (
				pageSocket &&
				pageSocket.connected &&
				socketRef.current !== pageSocket
			) {
				attachListener(pageSocket, mounted);
				socketRef.current = pageSocket;
			}
		}, 1000);

		return () => {
			mounted.current = false;
			clearInterval(checkInterval);
			// Only disconnect if we created our own socket (not reusing page socket)
			const existingSocket =
				(window as any).__fameLinkSocket ||
				(window as any).__stageManagerSocket;
			if (socketRef.current && socketRef.current !== existingSocket) {
				socketRef.current.disconnect();
			}
		};
	}, [fetchSubscription, attachListener]);

	// Poll for subscription changes only when we're actively waiting for a
	// post-checkout subscription update.
	useEffect(() => {
		if (typeof window === "undefined") return;

		const fromStorage =
			sessionStorage.getItem("stripe_checkout_returned") === "true";
		const fromUrl = new URLSearchParams(window.location.search).get(
			"upgraded",
		) === "true";
		const shouldPoll = fromStorage || fromUrl || justUpgraded;

		if (!shouldPoll) {
			return;
		}

		const pollInterval = setInterval(async () => {
			if (!initialLoadDoneRef.current) return;
			try {
				const response = await fetch(
					`/api/subscription?t=${Date.now()}`,
				);
				const result = await response.json();
				if (result.success && result.data) {
					const newPlan =
						result.data.subscription?.plan_type || "free";
					const newQty = result.data.subscription?.plan_quantity || 0;
					const newSubId =
						result.data.subscription?.stripe_subscription_id ||
						null;

					if (
						newPlan !== prevPlanRef.current ||
						newQty !== prevQuantityRef.current ||
						newSubId !== prevSubIdRef.current
					) {
						if (detectUpgrade(newPlan, newQty, newSubId)) {
							setJustUpgraded(true);
						}
						prevPlanRef.current = newPlan;
						prevQuantityRef.current = newQty;
						prevSubIdRef.current = newSubId;
						setData(result.data);
					}
				}
			} catch {
				// ignore polling errors
			}
		}, 15000);

		return () => clearInterval(pollInterval);
	}, [detectUpgrade, justUpgraded]);

	return {
		data,
		loading,
		refresh: fetchSubscription,
		justUpgraded,
		clearUpgraded: () => {
			setJustUpgraded(false);
			if (typeof window !== "undefined") {
				sessionStorage.removeItem("stripe_checkout_returned");
			}
		},
		isPro:
			data?.subscription?.plan_type !== "free" &&
			data?.subscription?.plan_type !== undefined,
		planType: data?.subscription?.plan_type || "free",
	};
}
