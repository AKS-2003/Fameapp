"use client";

import { useState, useEffect, useCallback } from "react";

interface CheckInStatus {
	rehearsal: { checkedIn: boolean; timestamp: string | null };
	performance: { checkedIn: boolean; timestamp: string | null };
}

export function useCheckIn(eventId: string, artistId: string) {
	const [status, setStatus] = useState<CheckInStatus>({
		rehearsal: { checkedIn: false, timestamp: null },
		performance: { checkedIn: false, timestamp: null },
	});

	const fetchStatus = useCallback(async () => {
		if (!eventId || !artistId) return;
		try {
			const res = await fetch(
				`/api/events/${eventId}/check-in?artistId=${artistId}`,
			);
			const data = await res.json();
			if (data.success && data.data) {
				setStatus({
					rehearsal: data.data.rehearsal || {
						checkedIn: false,
						timestamp: null,
					},
					performance: data.data.performance || {
						checkedIn: false,
						timestamp: null,
					},
				});
			}
		} catch {}
	}, [eventId, artistId]);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	const markCheckedIn = useCallback((type: "rehearsal" | "performance") => {
		setStatus((prev) => ({
			...prev,
			[type]: { checkedIn: true, timestamp: new Date().toISOString() },
		}));
	}, []);

	return {
		rehearsalCheckedIn: status.rehearsal.checkedIn,
		performanceCheckedIn: status.performance.checkedIn,
		markCheckedIn,
		refetch: fetchStatus,
	};
}
