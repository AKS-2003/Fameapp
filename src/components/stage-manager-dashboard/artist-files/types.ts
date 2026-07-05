export type SectionItemStatus = "required" | "not_required" | "not_applicable";

export interface Artist {
  id: string;
  name: string;
  realName: string;
  location: string;
  city?: string;
  country?: string;
  status: string;
  type: string;
  image?: string;
  inviteLink?: string;
  famelinkArtistId?: string;
  agreement?: Agreement;
  logistics?: Logistics;
  sectionStatuses?: Record<string, SectionItemStatus>;
  // Basic info fields shown in the "Basic Info" popup
  email?: string;
  phone?: string;
  internalOwner?: string;
  notes?: string;
}

export interface Logistics {
  status: string;
  travelers: string;
  missingItemsCount: number;
  // Logistics Needs from intake form
  needsFlights?: boolean;
  needsHotel?: boolean;
  needsTransport?: boolean;
  needsVisa?: boolean;
  // Intake answers
  arrivalDate?: string;
  dietary?: string;
  checkedLuggage?: string;
  hotelRoomType?: string;
  // Progress
  totalTravelersCount?: number;
  passportsUploaded?: number;
  visaDocsUploaded?: number;
  bookingsCreated?: number;
  intakeOverview: {
    status: string;
    lastSubmitted: string;
    travelers: string;
    passports: string;
  };
  intakeDetails: {
    question: string;
    answer: string;
  }[];
  missingItems: string[];
  members?: LogisticsMember[];
  flights?: Flight[];
  hotels?: Hotel[];
  transports?: Transport[];
  food?: Food;
  notesData?: LogisticsNote[];
}

export interface LogisticsNote {
  id: string;
  author: string;
  date: string;
  content: string;
  isPinned: boolean;
  isFlagged: boolean;
}

export interface Food {
  vouchers: string;
  dietaryPreferences: string;
  estimatedCost: {
    total: string;
    breakdown: string;
  };
  status: string;
}

export interface Transport {
  id: string;
  type: string;
  vehicle: string;
  pickupTime: string;
  pickupLocation: string;
  dropOffLocation: string;
  driver: string;
  notes: string;
}

export interface Hotel {
  id: string;
  name: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  roomingList: string;
  breakfast: string;
  ref: string;
}

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  status: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  baggage: string;
  pnr: string;
  notes: string;
}

export interface LogisticsMember {
  id: string;
  name: string;
  status: string;
  nationality: string;
  passport: string;
  passportExpiry: string;
  departureCity: string;
  airport: string;
  room: string;
  dietary: string;
  passportUpload: boolean;
  visaDoc: boolean;
  role?: string;
  passportCopyUrl?: string;
  visaCopyUrl?: string;
  visaDocument?: string;
}

export interface Agreement {
  performance: string;
  proposedFee: string;
  bookingTerms: string;
  deliverables: string;
  arrivalDate?: string;
  departureDate?: string;
  bookingDateFrom?: string;
  bookingDateTo?: string;
  contractDetails: ContractDetails;
  signatureStatus: SignatureStatus;
  schedule?: Schedule;
  payment?: Payment;
  contractTimeline?: TimelineItem[];
  stageDiscussion?: DiscussionMessage[];
  signatureLog?: SignatureLogEntry[];
}

// Append-only history of every sign/unsign action, in the order they occurred.
export interface SignatureLogEntry {
  actor: "artist" | "organiser";
  action: "signed" | "unsigned";
  name: string;
  timestamp: string;
}

export interface Payment {
  fieldsCompleted: string;
  calculation: {
    performanceFee: string;
    downpayment: string;
    remainingBalance: string;
    status: string;
  };
  details: {
    performanceFee: string;
    downpayment: string;
    downpaymentDate: string;
    balanceDueDate: string;
    amountPaid: string;
    paymentDate: string;
    paymentMethod: string;
    paymentStatus: string;
    notes: string;
  };
  customLines?: {
    id: string;
    name: string;
    value: string;
  }[];
}

export interface Schedule {
  deliverablesCount: number;
  overview: {
    workshops: number;
    shows: number;
    tasks: number;
    dateRange: string;
  };
  workshops: ScheduleItem[];
  performances: ScheduleItem[];
  tasks: ScheduleTask[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  status: string;
}

export interface ScheduleTask {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  terms?: string;
}

export interface ContractDetails {
  description: string;
  bookingTerms: string;
  deliverables?: string;
  responsibilities?: string;
  specialClauses?: string;
  cancellationTerms?: string;
  exclusivity?: string;
  notes?: string;
  clauses?: { id: string; title: string; content: string }[];
  documents?: { id: string; name: string; size: string; url?: string }[];
}

export interface SignatureStatus {
  artist: SignatureInfo;
  organiser: SignatureInfo;
}

export interface SignatureInfo {
  name: string;
  date?: string;
  status: string;
}

export interface TimelineItem {
  label: string;
  date: string;
}

export interface DiscussionMessage {
  id?: string;
  sender: string;
  time: string;
  message: string;
  isMe: boolean;
  status?: string;
  isContract?: boolean;
}
