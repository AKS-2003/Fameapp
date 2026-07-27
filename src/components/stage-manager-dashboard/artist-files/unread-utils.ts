// Lightweight client-side "last seen" tracking for artist-file discussion threads.
// No server-side read-state exists for these chats today, so unread status is
// derived by comparing the current artist-authored message count against the
// count that was last marked as seen in this browser (per artist + discussion).

export type DiscussionKind = "agreement" | "logistics";

function storageKey(eventId: string, artistId: string, kind: DiscussionKind) {
  return `artistfiles_seen_${kind}_${eventId}_${artistId}`;
}

function getSeenCount(eventId: string, artistId: string, kind: DiscussionKind): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(storageKey(eventId, artistId, kind));
  const n = raw ? parseInt(raw, 10) : 0;
  return isNaN(n) ? 0 : n;
}

export function markDiscussionSeen(eventId: string, artistId: string, kind: DiscussionKind, count: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(eventId, artistId, kind), String(count));
}

/** Count of artist-authored (non-isMe) messages the stage manager hasn't marked as seen yet. */
export function countUnseenArtistMessages(
  eventId: string,
  artistId: string,
  kind: DiscussionKind,
  messages: { isMe?: boolean }[] | undefined,
): number {
  const fromArtist = (messages || []).filter((m) => !m.isMe).length;
  const seen = getSeenCount(eventId, artistId, kind);
  return Math.max(0, fromArtist - seen);
}
