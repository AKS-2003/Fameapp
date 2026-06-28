import { WSWorkshop, WSConflict, WSBlockedTime } from "@/sample_types/workshop";

/**
 * Checks if two time ranges overlap.
 * Times are "HH:mm" strings.
 */
const timesOverlap = (
	startA: string,
	endA: string,
	startB: string,
	endB: string,
): boolean => {
	const toMin = (t: string) => {
		const [h, m] = t.split(":").map(Number);
		return h * 60 + m;
	};
	const a0 = toMin(startA),
		a1 = toMin(endA);
	const b0 = toMin(startB),
		b1 = toMin(endB);
	return a0 < b1 && b0 < a1;
};

/**
 * Detect room overlap: two workshops in the same room with overlapping times on the same day.
 */
export const detectRoomOverlap = (
	workshop: WSWorkshop,
	allWorkshops: WSWorkshop[],
): WSConflict[] => {
	return allWorkshops
		.filter(
			(w) =>
				w.id !== workshop.id &&
				w.dayId === workshop.dayId &&
				w.roomId === workshop.roomId &&
				!w.isHidden &&
				timesOverlap(
					workshop.startTime,
					workshop.endTime,
					w.startTime,
					w.endTime,
				),
		)
		.map((w) => ({
			type: "room_overlap" as const,
			workshopId: workshop.id,
			conflictingId: w.id,
			message: `Room conflict with "${w.title}" (${w.startTime}–${w.endTime})`,
			severity: "error" as const,
		}));
};

/**
 * Detect artist double booking: an artist assigned to overlapping workshops on the same day.
 */
export const detectArtistDoubleBooking = (
	workshop: WSWorkshop,
	allWorkshops: WSWorkshop[],
): WSConflict[] => {
	if (workshop.artistIds.length === 0) return [];

	const conflicts: WSConflict[] = [];
	const sameDayWs = allWorkshops.filter(
		(w) =>
			w.id !== workshop.id &&
			w.dayId === workshop.dayId &&
			!w.isHidden &&
			timesOverlap(
				workshop.startTime,
				workshop.endTime,
				w.startTime,
				w.endTime,
			),
	);

	for (const w of sameDayWs) {
		const overlap = workshop.artistIds.filter((id) =>
			w.artistIds.includes(id),
		);
		if (overlap.length > 0) {
			conflicts.push({
				type: "artist_double_booking",
				workshopId: workshop.id,
				conflictingId: w.id,
				message: `Artist double-booked with "${w.title}" (${w.startTime}–${w.endTime})`,
				severity: "error",
			});
		}
	}
	return conflicts;
};

/**
 * Detect blocked time overlap.
 */
export const detectBlockedTimeConflict = (
	workshop: WSWorkshop,
	blockedTimes: WSBlockedTime[],
): WSConflict[] => {
	return blockedTimes
		.filter(
			(bt) =>
				bt.dayId === workshop.dayId &&
				(!bt.roomId || bt.roomId === workshop.roomId) &&
				timesOverlap(
					workshop.startTime,
					workshop.endTime,
					bt.startTime,
					bt.endTime,
				),
		)
		.map((bt) => ({
			type: "blocked_time" as const,
			workshopId: workshop.id,
			conflictingId: bt.id,
			message: `Conflicts with blocked time "${bt.title}" (${bt.startTime}–${bt.endTime})`,
			severity: "warning" as const,
		}));
};

/**
 * Detect if workshop falls outside the day range.
 */
export const detectDayRangeViolation = (
	workshop: WSWorkshop,
	dayStartTime: string,
	dayEndTime: string,
): WSConflict[] => {
	const toMin = (t: string) => {
		const [h, m] = t.split(":").map(Number);
		return h * 60 + m;
	};
	const wsStart = toMin(workshop.startTime);
	const wsEnd = toMin(workshop.endTime);
	const dayStart = toMin(dayStartTime);
	const dayEnd = toMin(dayEndTime);

	const conflicts: WSConflict[] = [];
	if (wsStart < dayStart || wsEnd > dayEnd) {
		conflicts.push({
			type: "day_range",
			workshopId: workshop.id,
			conflictingId: workshop.dayId,
			message: `Workshop time (${workshop.startTime}–${workshop.endTime}) exceeds day range (${dayStartTime}–${dayEndTime})`,
			severity: "warning",
		});
	}
	return conflicts;
};

/**
 * Run all conflict checks for a single workshop.
 */
export const detectAllConflicts = (
	workshop: WSWorkshop,
	allWorkshops: WSWorkshop[],
	blockedTimes: WSBlockedTime[],
	dayStartTime: string,
	dayEndTime: string,
): WSConflict[] => {
	return [
		...detectRoomOverlap(workshop, allWorkshops),
		...detectArtistDoubleBooking(workshop, allWorkshops),
		...detectBlockedTimeConflict(workshop, blockedTimes),
		...detectDayRangeViolation(workshop, dayStartTime, dayEndTime),
	];
};
