import { ParticipantType } from "./requestTemplates";

export type InvitationStatus =
  | "invited"
  | "waiting"
  | "submitted"
  | "negotiation"
  | "awaiting_signature"
  | "confirmed";

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  invited: "Invited",
  waiting: "Waiting for Info",
  submitted: "Information Submitted",
  negotiation: "Negotiation",
  awaiting_signature: "Awaiting Signature",
  confirmed: "Confirmed",
};

export interface ArtistInvitation {
  id: string;
  eventId: string;
  templateId: string;
  templateName: string;
  participantType: ParticipantType;
  artistName: string;
  artistEmail: string;
  status: InvitationStatus;
  invitationLink: string;
  createdAt: string;
  respondedAt: string | null;
}

let _invId = 500;
export const generateInvitationId = () => `inv-${_invId++}`;

export const generateInvitationLink = (invitationId: string) =>
  `/invite/${invitationId}`;

// Map invitation IDs to FameLink invite IDs (for "Open in FameLink" flow)
export const invitationToFamelinkMap: Record<string, string> = {
  "inv-001": "fl-1",
  "inv-002": "fl-5",
  "inv-003": "fl-3",
  "inv-004": "fl-4",
  "inv-005": "fl-2",
};

export const mockInvitations: ArtistInvitation[] = [
  {
    id: "inv-001",
    eventId: "evt-001",
    templateId: "tpl-dancer",
    templateName: "Dancer / Instructor",
    participantType: "dancer",
    artistName: "Maria & Carlos",
    artistEmail: "maria.carlos@email.com",
    status: "waiting",
    invitationLink: "/event-request/inv-001",
    createdAt: "2026-02-15",
    respondedAt: null,
  },
  {
    id: "inv-002",
    eventId: "evt-001",
    templateId: "tpl-dj",
    templateName: "DJ",
    participantType: "dj",
    artistName: "DJ Luis",
    artistEmail: "djluis@email.com",
    status: "negotiation",
    invitationLink: "/event-request/inv-002",
    createdAt: "2026-02-10",
    respondedAt: "2026-02-18",
  },
  {
    id: "inv-003",
    eventId: "evt-001",
    templateId: "tpl-dancer",
    templateName: "Dancer / Instructor",
    participantType: "dancer",
    artistName: "Anna Torres",
    artistEmail: "anna@email.com",
    status: "confirmed",
    invitationLink: "/event-request/inv-003",
    createdAt: "2026-01-20",
    respondedAt: "2026-01-25",
  },
  {
    id: "inv-004",
    eventId: "evt-001",
    templateId: "tpl-band",
    templateName: "Band / Live Act",
    participantType: "band",
    artistName: "Kizomba Kings",
    artistEmail: "kings@email.com",
    status: "invited",
    invitationLink: "/event-request/inv-004",
    createdAt: "2026-03-01",
    respondedAt: null,
  },
  {
    id: "inv-005",
    eventId: "evt-001",
    templateId: "tpl-dancer",
    templateName: "Dancer / Instructor",
    participantType: "dancer",
    artistName: "Sophie & Maxime",
    artistEmail: "sophie.maxime@email.com",
    status: "awaiting_signature",
    invitationLink: "/event-request/inv-005",
    createdAt: "2026-02-01",
    respondedAt: "2026-02-08",
  },
];
