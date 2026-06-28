export interface ConversationMessage {
  id: string;
  artistId: string;
  invitationId: string;
  sender: "organizer" | "artist";
  senderName: string;
  text: string;
  timestamp: string;
  attachments?: { type: "document" | "link" | "image"; name: string; url: string }[];
}

export const mockConversations: ConversationMessage[] = [
  {
    id: "msg-1",
    artistId: "1",
    invitationId: "inv-001",
    sender: "organizer",
    senderName: "Fantasia Events",
    text: "Hi Maria & Carlos! Can you confirm if you are available for 3 workshops?",
    timestamp: "2026-05-12T14:30:00",
  },
  {
    id: "msg-2",
    artistId: "1",
    invitationId: "inv-001",
    sender: "artist",
    senderName: "Maria & Carlos",
    text: "Yes, 3 workshops is possible. Can we also discuss the arrival date? We would prefer to arrive on the 9th instead of the 10th.",
    timestamp: "2026-05-12T16:05:00",
  },
  {
    id: "msg-3",
    artistId: "1",
    invitationId: "inv-001",
    sender: "organizer",
    senderName: "Fantasia Events",
    text: "That works! I'll update the agreement to reflect arrival on April 9th. We'll add one extra hotel night.",
    timestamp: "2026-05-12T17:20:00",
  },
  {
    id: "msg-4",
    artistId: "2",
    invitationId: "inv-002",
    sender: "organizer",
    senderName: "Fantasia Events",
    text: "Hi Luis, could you let us know how many DJ sets you'd be comfortable with? We're thinking 3 evenings.",
    timestamp: "2026-05-13T10:00:00",
  },
  {
    id: "msg-5",
    artistId: "2",
    invitationId: "inv-002",
    sender: "artist",
    senderName: "DJ Luis",
    text: "3 sets works for me. Would it be possible to get a rider for my equipment or should I bring my own controller?",
    timestamp: "2026-05-13T11:45:00",
  },
  {
    id: "msg-6",
    artistId: "5",
    invitationId: "inv-005",
    sender: "organizer",
    senderName: "Fantasia Events",
    text: "Hi Sophie & Maxime, your contract is ready for signature. Please review the final terms and let us know if everything looks good.",
    timestamp: "2026-05-14T09:00:00",
  },
];
