import type { NextRequest, NextResponse } from "next/server";

/**
 * Push an "artist_data_changed" socket event so FameLink artist pages refetch
 * their invitations/participations instantly (no reload or polling needed).
 */
export function notifyArtistDataChanged(eventId?: string, artistId?: string) {
	const io = (global as any).io;
	if (!io) return;
	const payload = { eventId, artistId, timestamp: new Date().toISOString() };
	if (artistId) io.to(`user_${artistId}`).emit("artist_data_changed", payload);
	if (eventId) io.to(`event_${eventId}`).emit("artist_data_changed", payload);
}

/** Wrap a route handler so a successful response triggers a live update. */
export function withArtistNotify<A extends any[]>(
	handler: (req: NextRequest, ...args: A) => Promise<NextResponse | Response>,
	getIds: (...args: A) => Promise<{ eventId?: string; artistId?: string }>,
) {
	return async (req: NextRequest, ...args: A) => {
		const res = await handler(req, ...args);
		if (res.ok) {
			try {
				const { eventId, artistId } = await getIds(...args);
				notifyArtistDataChanged(eventId, artistId);
			} catch {
				/* never break the request over a notification */
			}
		}
		return res;
	};
}

/** Like withArtistNotify, but takes the ids from the JSON request body (read from a clone). */
export function withBodyNotify(
	handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse | Response>,
	pick: (body: any) => { eventId?: string; artistId?: string },
) {
	return async (req: NextRequest, ...args: any[]) => {
		let ids: { eventId?: string; artistId?: string } = {};
		try {
			ids = pick(await req.clone().json());
		} catch {
			/* body not JSON, nothing to notify */
		}
		const res = await handler(req, ...args);
		if (res.ok && (ids.eventId || ids.artistId)) {
			try {
				notifyArtistDataChanged(ids.eventId, ids.artistId);
			} catch {
				/* never break the request over a notification */
			}
		}
		return res;
	};
}
