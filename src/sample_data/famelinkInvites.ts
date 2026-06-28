import { mockArtists, type Artist } from "./artistContracts";
import { mockConversations } from "./conversationMessages";

export type FLInviteStatus =
  | "new_invite"
  | "waiting"
  | "discussion"
  | "awaiting_approval"
  | "contract_sent"
  | "confirmed";

export interface FLInvite {
  id: string;
  eventName: string;
  eventDates: string;
  location: string;
  organizerName: string;
  role: string;
  status: FLInviteStatus;
  artistId: string;
}

export const flStatusLabels: Record<FLInviteStatus, string> = {
  new_invite: "New Invite",
  waiting: "Waiting for Your Info",
  discussion: "Under Discussion",
  awaiting_approval: "Awaiting Your Approval",
  contract_sent: "Contract Sent",
  confirmed: "Confirmed",
};

export const flStatusColors: Record<FLInviteStatus, string> = {
  new_invite: "bg-[hsl(var(--fl-new-invite))]/15 text-[hsl(var(--fl-new-invite))] border-[hsl(var(--fl-new-invite))]/30",
  waiting: "bg-[hsl(var(--fl-waiting))]/15 text-[hsl(var(--fl-waiting))] border-[hsl(var(--fl-waiting))]/30",
  discussion: "bg-[hsl(var(--fl-discussion))]/15 text-[hsl(var(--fl-discussion))] border-[hsl(var(--fl-discussion))]/30",
  awaiting_approval: "bg-[hsl(var(--fl-approval))]/15 text-[hsl(var(--fl-approval))] border-[hsl(var(--fl-approval))]/30",
  contract_sent: "bg-[hsl(var(--fl-contract-sent))]/15 text-[hsl(var(--fl-contract-sent))] border-[hsl(var(--fl-contract-sent))]/30",
  confirmed: "bg-[hsl(var(--fl-confirmed))]/15 text-[hsl(var(--fl-confirmed))] border-[hsl(var(--fl-confirmed))]/30",
};

// Map artist contract status to FameLink invite status
function mapStatus(artist: typeof mockArtists[0]): FLInviteStatus {
  if (artist.contractDocStatus === "confirmed") return "confirmed";
  if (artist.contractDocStatus === "awaiting_signature" || artist.contractDocStatus === "sent") return "contract_sent";
  if (artist.status === "awaiting") return "awaiting_approval";
  if (artist.status === "negotiation") return "discussion";
  if (artist.status === "waiting") return "waiting";
  return "new_invite";
}

function mapRole(artist: typeof mockArtists[0]): string {
  const roles: Record<string, string> = {
    solo: "Dancer",
    couple: "Dancer (Couple)",
    group: "Band / Live Act",
    dj: "DJ",
    ambassador: "Ambassador",
  };
  return roles[artist.role] || artist.role;
}

export const mockFLInvites: FLInvite[] = mockArtists.map((artist) => ({
  id: `fl-${artist.id}`,
  eventName: "Amsterdam International Salsa Festival",
  eventDates: "Apr 10 – Apr 16, 2026",
  location: "Amsterdam, NL",
  organizerName: "Fantasia Events",
  role: mapRole(artist),
  status: mapStatus(artist),
  artistId: artist.id,
}));

export function getArtistForInvite(invite: FLInvite): Artist | undefined {
  return mockArtists.find((a) => a.id === invite.artistId);
}
