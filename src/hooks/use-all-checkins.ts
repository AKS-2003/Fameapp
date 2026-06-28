"use client";

import { useState, useEffect, useCallback } from "react";

interface CheckInRecord {
	checkedIn: boolean;
	timestamp: string | null;
}

interface ArtistCheckIn {
	rehearsal: CheckInRecord;
	performance: CheckInRecord;
}

export interface AllCheckIns {
	[artistId: string]: ArtistCheckIn;
}

export function useAllCheckIns(eventId: string) {
	const [checkIns, setCheckIns] = useState<AllCheckIns>({});

	const fetchAll = useCallback(async () => {
		if (!eventId) return;
		try {
			const res = await fetch(`/api/events/${eventId}/check-in`);
			const data = await res.json();
			if (data.success && data.data) {
				setCheckIns(data.data);
			}
		} catch {}
	}, [eventId]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const getStatus = useCallback(
		(artistId: string) => {
			const record = checkIns[artistId];
			return {
				rehearsalCheckedIn: record?.rehearsal?.checkedIn || false,
				performanceCheckedIn: record?.performance?.checkedIn || false,
			};
		},
		[checkIns],
	);

	const markCheckedIn = useCallback(
		(
			artistId: string, 
			type: "rehearsal" | "performance",
			checkedIn: boolean = true
		) => {
			setCheckIns((prev) => ({
				...prev,
				[artistId]: {
					...prev[artistId],
					rehearsal: prev[artistId]?.rehearsal || {
						checkedIn: false,
						timestamp: null,
					},
					performance: prev[artistId]?.performance || {
						checkedIn: false,
						timestamp: null,
					},
					[type]: {
						checkedIn,
						timestamp: checkedIn ? new Date().toISOString() : null,
					},
				},
			}));
		},
		[],
	);

	return { checkIns, getStatus, markCheckedIn, refetch: fetchAll };
}
