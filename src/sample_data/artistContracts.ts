import { stableQuestions, defaultTemplates, sampleEventSpecificQuestions, type TemplateQuestion } from "./requestTemplates";

export type ContractStatus = "invited" | "waiting" | "negotiation" | "awaiting" | "confirmed";
export type ArtistRole = "solo" | "couple" | "group" | "dj" | "ambassador";
export type RequestTemplateType = "dancer" | "dj" | "band" | "mc" | "ambassador" | "guest";
export type ContractDocStatus = "draft" | "sent" | "awaiting_signature" | "signed" | "confirmed";

export interface GroupMember {
  id: string;
  fullName: string;
  nationality: string;
  passportFile: string;
  email: string;
  phone: string;
  dietaryPreferences: string;
}

export interface FlightDetail {
  id: string;
  type: "arrival" | "departure";
  passengerName: string;
  flightNumber: string;
  airport: string;
  date: string;
  time: string;
  cost: string;
  ticketFile: string;
  notes: string;
}

export interface HotelRoomBooking {
  id: string;
  roomType: "single" | "double" | "twin" | "suite";
  guestNames: string;
  costPerNight: string;
  totalCost: string;
  notes: string;
}

export interface TravelLogistics {
  flights: FlightDetail[];
  hotelBookingFile: string;
  workshopSchedule: string;
  pickupInfo: string;
  dropoffInfo: string;
  additionalNotes: string;
  driverName: string;
  driverPhone: string;
  driverNotes: string;
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  hotelMapLink: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  hotelNotes: string;
  hotelRooms: HotelRoomBooking[];
  eventVenueName: string;
  eventVenueAddress: string;
  eventVenueMapLink: string;
}

export interface Artist {
  id: string;
  stageName: string;
  legalName: string;
  country: string;
  city: string;
  nationality: string;
  role: ArtistRole;
  requestTemplate: RequestTemplateType;
  status: ContractStatus;
  contractDocStatus: ContractDocStatus;
  missingItems: string[];
  email: string;
  phone: string;
  nearestAirport: string;
  travelPreferences: string;
  dietaryPreferences: string;
  hotelRoomPreference: string;
  profileStatus: "received" | "incomplete" | "requested";
  eventQuestions: EventQuestion[];
  agreement: Agreement;
  groupMembers: GroupMember[];
  travelLogistics: TravelLogistics;
}

export interface EventQuestion {
  id: string;
  question: string;
  answer: string | null;
  category: "stable" | "flexible" | "event_specific";
}

export interface PaymentDetail {
  status: "unpaid" | "downpayment" | "paid";
  totalAmount: number;
  amountPaid: number;
  downpaymentAmount: number;
  downpaymentDate: string;
  paymentDueDate: string;
  paymentDate: string;
  notes: string;
}

export const emptyPaymentDetail: PaymentDetail = {
  status: "unpaid",
  totalAmount: 0,
  amountPaid: 0,
  downpaymentAmount: 0,
  downpaymentDate: "",
  paymentDueDate: "",
  paymentDate: "",
  notes: "",
};

export interface PaymentTracker {
  feePaid: boolean;
  flightsPaid: boolean;
  hotelPaid: boolean;
  transportPaid: boolean;
  foodPaid: boolean;
  feeDetail?: PaymentDetail;
  flightsDetail?: PaymentDetail;
  hotelDetail?: PaymentDetail;
  transportDetail?: PaymentDetail;
  foodDetail?: PaymentDetail;
}

export interface Agreement {
  agreedFee: string;
  paymentSchedule: string;
  paymentMethod: string;
  workshopsConfirmed: number;
  workshopDaysAgreed: number;
  showsConfirmed: number;
  djSets: number;
  panels: number;
  hotelNights: number;
  roomSharing: string;
  airportTransfer: boolean;
  foodVouchers: boolean;
  flightBudget: string;
  travelClass: string;
  arrivalDate: string;
  departureDate: string;
  promoObligations: string;
  socialMediaPosts: number;
  ambassadorTasks: string;
  payments: PaymentTracker;
}

// Helper to build event questions from templates
function buildEventQuestions(
  templateType: RequestTemplateType,
  stableAnswers: Record<string, string | null>,
  flexibleAnswers: Record<string, string | null>,
  eventSpecificAnswers: Record<string, string | null> = {}
): EventQuestion[] {
  const questions: EventQuestion[] = [];

  // Stable questions
  stableQuestions.forEach((q) => {
    questions.push({
      id: q.id,
      question: q.label,
      answer: stableAnswers[q.id] ?? null,
      category: "stable",
    });
  });

  // Flexible questions from role template
  const template = defaultTemplates.find((t) => t.participantType === templateType);
  if (template) {
    template.questions.forEach((q) => {
      questions.push({
        id: q.id,
        question: q.label,
        answer: flexibleAnswers[q.id] ?? null,
        category: "flexible",
      });
    });
  }

  // Event-specific questions
  sampleEventSpecificQuestions.forEach((q) => {
    if (eventSpecificAnswers[q.id] !== undefined) {
      questions.push({
        id: q.id,
        question: q.label,
        answer: eventSpecificAnswers[q.id],
        category: "event_specific",
      });
    }
  });

  return questions;
}

// Get flexible question IDs per template for referencing
const dancerFlexIds = defaultTemplates.find(t => t.participantType === "dancer")!.questions.map(q => q.id);
const djFlexIds = defaultTemplates.find(t => t.participantType === "dj")!.questions.map(q => q.id);
const bandFlexIds = defaultTemplates.find(t => t.participantType === "band")!.questions.map(q => q.id);

export const mockArtists: Artist[] = [
  {
    id: "1",
    stageName: "Maria & Carlos",
    legalName: "Maria Silva & Carlos Perez",
    country: "Argentina",
    city: "Buenos Aires",
    nationality: "Argentine",
    role: "couple",
    requestTemplate: "dancer",
    status: "waiting",
    contractDocStatus: "draft",
    missingItems: ["Profile photo", "Bio"],
    email: "maria.carlos@email.com",
    phone: "+54 11 1234 5678",
    nearestAirport: "EZE",
    travelPreferences: "Direct flights preferred",
    dietaryPreferences: "No restrictions",
    hotelRoomPreference: "Double room",
    profileStatus: "incomplete",
    eventQuestions: buildEventQuestions(
      "dancer",
      {
        "stable-1": "Maria Silva & Carlos Perez",
        "stable-2": "Maria & Carlos",
        "stable-3": "maria.carlos@email.com",
        "stable-4": "+54 11 1234 5678",
        "stable-5": "Argentina",
        "stable-6": "Buenos Aires",
        "stable-7": "EZE",
        "stable-9": "Argentine",
        "stable-10": "Yes",
        "stable-11": "2026-04-10",
        "stable-12": "2026-04-16",
        "stable-13": "No",
        "stable-14": "Yes",
        "stable-15": "Private room",
        "stable-16": "No restrictions",
      },
      {
        [dancerFlexIds[0]]: "3",
        [dancerFlexIds[2]]: "2",
        [dancerFlexIds[3]]: "Couple",
        [dancerFlexIds[4]]: "No",
      },
      {
        "evt-1": null,
        "evt-2": "Yes",
      }
    ),
    agreement: {
      agreedFee: "€2,500",
      paymentSchedule: "50% upfront, 50% on arrival",
      paymentMethod: "Bank transfer",
      workshopsConfirmed: 3,
      workshopDaysAgreed: 2,
      showsConfirmed: 2,
      djSets: 0,
      panels: 1,
      hotelNights: 6,
      roomSharing: "Private",
      airportTransfer: true,
      foodVouchers: true,
      flightBudget: "€800",
      travelClass: "Economy",
      arrivalDate: "2026-04-10",
      departureDate: "2026-04-16",
      promoObligations: "2 Instagram stories",
      socialMediaPosts: 3,
      ambassadorTasks: "N/A",
      payments: { feePaid: false, flightsPaid: false, hotelPaid: false, transportPaid: false, foodPaid: false },
    },
    groupMembers: [
      { id: "m1", fullName: "Maria Silva", nationality: "Argentine", passportFile: "passport_maria.pdf", email: "maria@email.com", phone: "+54 11 1234 0001", dietaryPreferences: "No restrictions" },
      { id: "m2", fullName: "Carlos Perez", nationality: "Argentine", passportFile: "passport_carlos.pdf", email: "carlos@email.com", phone: "+54 11 1234 0002", dietaryPreferences: "No restrictions" },
    ],
    travelLogistics: { flights: [], hotelBookingFile: "", workshopSchedule: "", pickupInfo: "", dropoffInfo: "", additionalNotes: "", driverName: "", driverPhone: "", driverNotes: "", hotelId: "", hotelName: "", hotelAddress: "", hotelMapLink: "", hotelCheckIn: "", hotelCheckOut: "", hotelNotes: "", hotelRooms: [], eventVenueName: "Festival Hall Amsterdam", eventVenueAddress: "Europaplein 24, 1078 GZ Amsterdam", eventVenueMapLink: "https://maps.google.com/?q=Festival+Hall+Amsterdam" },
  },
  {
    id: "2",
    stageName: "DJ Luis",
    legalName: "Luis Fernando Gomez",
    country: "Colombia",
    city: "Medellín",
    nationality: "Colombian",
    role: "dj",
    requestTemplate: "dj",
    status: "negotiation",
    contractDocStatus: "draft",
    missingItems: ["Workshop count"],
    email: "djluis@email.com",
    phone: "+57 300 123 4567",
    nearestAirport: "MDE",
    travelPreferences: "Any",
    dietaryPreferences: "Vegetarian",
    hotelRoomPreference: "Single room",
    profileStatus: "received",
    eventQuestions: buildEventQuestions(
      "dj",
      {
        "stable-1": "Luis Fernando Gomez",
        "stable-2": "DJ Luis",
        "stable-3": "djluis@email.com",
        "stable-4": "+57 300 123 4567",
        "stable-5": "Colombia",
        "stable-6": "Medellín",
        "stable-7": "MDE",
        "stable-9": "Colombian",
        "stable-10": "No",
        "stable-11": "2026-04-11",
        "stable-12": "2026-04-15",
        "stable-13": "No",
        "stable-14": "Yes",
        "stable-15": "Private room",
        "stable-16": "Vegetarian",
        "stable-17": "Need late check-out on departure day",
      },
      {
        [djFlexIds[0]]: "3",
        [djFlexIds[1]]: "2 hours",
        [djFlexIds[3]]: "Yes",
        [djFlexIds[4]]: "Kizomba / Afro House",
      },
      {
        "evt-1": "Yes",
        "evt-3": null,
      }
    ),
    agreement: {
      agreedFee: "€1,800",
      paymentSchedule: "Full on arrival",
      paymentMethod: "PayPal",
      workshopsConfirmed: 0,
      workshopDaysAgreed: 0,
      showsConfirmed: 0,
      djSets: 3,
      panels: 0,
      hotelNights: 4,
      roomSharing: "N/A",
      airportTransfer: true,
      foodVouchers: true,
      flightBudget: "€600",
      travelClass: "Economy",
      arrivalDate: "2026-04-11",
      departureDate: "2026-04-15",
      promoObligations: "1 Instagram post",
      socialMediaPosts: 2,
      ambassadorTasks: "N/A",
      payments: { feePaid: false, flightsPaid: true, hotelPaid: true, transportPaid: false, foodPaid: false },
    },
    groupMembers: [
      { id: "m3", fullName: "Luis Fernando Gomez", nationality: "Colombian", passportFile: "passport_luis.pdf", email: "djluis@email.com", phone: "+57 300 123 4567", dietaryPreferences: "Vegetarian" },
    ],
    travelLogistics: { flights: [{ id: "f1", type: "arrival", passengerName: "Luis Fernando Gomez", flightNumber: "AV204", airport: "AMS", date: "2026-04-11", time: "09:30", cost: "€450", ticketFile: "ticket_luis.pdf", notes: "" }, { id: "f2", type: "departure", passengerName: "Luis Fernando Gomez", flightNumber: "AV205", airport: "AMS", date: "2026-04-15", time: "17:45", cost: "€450", ticketFile: "", notes: "" }], hotelBookingFile: "hotel_luis.pdf", workshopSchedule: "", pickupInfo: "Airport pickup arranged", dropoffInfo: "", additionalNotes: "", driverName: "Ahmed B.", driverPhone: "+31 6 1234 5678", driverNotes: "Silver Mercedes van", hotelId: "hotel-1", hotelName: "NH Amsterdam Centre", hotelAddress: "Stadhouderskade 7, Amsterdam", hotelMapLink: "https://maps.google.com/?q=NH+Amsterdam+Centre", hotelCheckIn: "2026-04-11", hotelCheckOut: "2026-04-15", hotelNotes: "Need late check-out on departure day", hotelRooms: [{ id: "r1", roomType: "single", guestNames: "Luis Fernando Gomez", costPerNight: "€120", totalCost: "€480", notes: "" }], eventVenueName: "Festival Hall Amsterdam", eventVenueAddress: "Europaplein 24, 1078 GZ Amsterdam", eventVenueMapLink: "https://maps.google.com/?q=Festival+Hall+Amsterdam" },
  },
  {
    id: "3",
    stageName: "Anna Torres",
    legalName: "Anna Maria Torres",
    country: "Spain",
    city: "Madrid",
    nationality: "Spanish",
    role: "solo",
    requestTemplate: "dancer",
    status: "confirmed",
    contractDocStatus: "confirmed",
    missingItems: [],
    email: "anna@email.com",
    phone: "+34 612 345 678",
    nearestAirport: "MAD",
    travelPreferences: "Direct flights",
    dietaryPreferences: "Gluten-free",
    hotelRoomPreference: "Single room",
    profileStatus: "received",
    eventQuestions: buildEventQuestions(
      "dancer",
      {
        "stable-1": "Anna Maria Torres",
        "stable-2": "Anna Torres",
        "stable-3": "anna@email.com",
        "stable-4": "+34 612 345 678",
        "stable-5": "Spain",
        "stable-6": "Madrid",
        "stable-7": "MAD",
        "stable-8": "passport_anna.pdf",
        "stable-9": "Spanish",
        "stable-10": "No",
        "stable-11": "2026-04-09",
        "stable-12": "2026-04-16",
        "stable-13": "No",
        "stable-14": "Yes",
        "stable-15": "Private room",
        "stable-16": "Gluten-free",
        "stable-17": "Looking forward to the event!",
      },
      {
        [dancerFlexIds[0]]: "4",
        [dancerFlexIds[1]]: "Lady Styling, Footwork, Musicality, Performance",
        [dancerFlexIds[2]]: "2",
        [dancerFlexIds[3]]: "Solo",
        [dancerFlexIds[4]]: "No",
      },
      {
        "evt-1": "Yes",
        "evt-2": "Yes",
        "evt-3": "No",
      }
    ),
    agreement: {
      agreedFee: "€3,000",
      paymentSchedule: "50% upfront, 50% on arrival",
      paymentMethod: "Bank transfer",
      workshopsConfirmed: 4,
      workshopDaysAgreed: 3,
      showsConfirmed: 2,
      djSets: 0,
      panels: 1,
      hotelNights: 7,
      roomSharing: "Private",
      airportTransfer: true,
      foodVouchers: true,
      flightBudget: "€400",
      travelClass: "Economy",
      arrivalDate: "2026-04-09",
      departureDate: "2026-04-16",
      promoObligations: "3 Instagram stories, 1 reel",
      socialMediaPosts: 4,
      ambassadorTasks: "Brand mention in workshops",
      payments: { feePaid: true, flightsPaid: true, hotelPaid: true, transportPaid: true, foodPaid: true },
    },
    groupMembers: [
      { id: "m4", fullName: "Anna Maria Torres", nationality: "Spanish", passportFile: "passport_anna.pdf", email: "anna@email.com", phone: "+34 612 345 678", dietaryPreferences: "Gluten-free" },
    ],
    travelLogistics: { flights: [{ id: "f3", type: "arrival", passengerName: "Anna Maria Torres", flightNumber: "IB3214", airport: "AMS", date: "2026-04-09", time: "11:00", cost: "€280", ticketFile: "ticket_anna.pdf", notes: "" }, { id: "f4", type: "departure", passengerName: "Anna Maria Torres", flightNumber: "IB3215", airport: "AMS", date: "2026-04-16", time: "14:20", cost: "€280", ticketFile: "", notes: "" }], hotelBookingFile: "hotel_anna.pdf", workshopSchedule: "Day 1: 14:00 Lady Styling, Day 2: 10:00 Footwork", pickupInfo: "Self-arranged", dropoffInfo: "Self-arranged", additionalNotes: "", driverName: "", driverPhone: "", driverNotes: "", hotelId: "hotel-2", hotelName: "Park Plaza Victoria", hotelAddress: "Damrak 1-5, Amsterdam", hotelMapLink: "https://maps.google.com/?q=Park+Plaza+Victoria+Amsterdam", hotelCheckIn: "2026-04-09", hotelCheckOut: "2026-04-16", hotelNotes: "", hotelRooms: [{ id: "r2", roomType: "single", guestNames: "Anna Maria Torres", costPerNight: "€110", totalCost: "€770", notes: "" }], eventVenueName: "Festival Hall Amsterdam", eventVenueAddress: "Europaplein 24, 1078 GZ Amsterdam", eventVenueMapLink: "https://maps.google.com/?q=Festival+Hall+Amsterdam" },
  },
  {
    id: "4",
    stageName: "Kizomba Kings",
    legalName: "Group Registration",
    country: "Angola",
    city: "Luanda",
    nationality: "Angolan",
    role: "group",
    requestTemplate: "band",
    status: "invited",
    contractDocStatus: "draft",
    missingItems: ["Profile", "Event questions"],
    email: "kings@email.com",
    phone: "+244 923 456 789",
    nearestAirport: "LAD",
    travelPreferences: "",
    dietaryPreferences: "",
    hotelRoomPreference: "",
    profileStatus: "requested",
    // All answers null — just invited, nothing submitted yet
    eventQuestions: buildEventQuestions("band", {}, {}, {
      "evt-1": null,
      "evt-2": null,
    }),
    agreement: {
      agreedFee: "",
      paymentSchedule: "",
      paymentMethod: "",
      workshopsConfirmed: 0,
      workshopDaysAgreed: 0,
      showsConfirmed: 0,
      djSets: 0,
      panels: 0,
      hotelNights: 0,
      roomSharing: "",
      airportTransfer: false,
      foodVouchers: false,
      flightBudget: "",
      travelClass: "",
      arrivalDate: "",
      departureDate: "",
      promoObligations: "",
      socialMediaPosts: 0,
      ambassadorTasks: "",
      payments: { feePaid: false, flightsPaid: false, hotelPaid: false, transportPaid: false, foodPaid: false },
    },
    groupMembers: [
      { id: "m5", fullName: "Nelson Fonseca", nationality: "Angolan", passportFile: "passport_nelson.pdf", email: "nelson@kizombakings.com", phone: "+244 923 111 001", dietaryPreferences: "No restrictions" },
      { id: "m6", fullName: "Edson Malembe", nationality: "Angolan", passportFile: "passport_edson.pdf", email: "edson@kizombakings.com", phone: "+244 923 111 002", dietaryPreferences: "Halal" },
      { id: "m7", fullName: "Tatiana dos Santos", nationality: "Angolan", passportFile: "", email: "tatiana@kizombakings.com", phone: "+244 923 111 003", dietaryPreferences: "Vegetarian" },
      { id: "m8", fullName: "Ricardo Mendes", nationality: "Portuguese", passportFile: "passport_ricardo.pdf", email: "ricardo@kizombakings.com", phone: "+351 912 345 678", dietaryPreferences: "No restrictions" },
      { id: "m9", fullName: "Aida Semedo", nationality: "Cape Verdean", passportFile: "", email: "aida@kizombakings.com", phone: "+238 991 234 567", dietaryPreferences: "No pork" },
      { id: "m10", fullName: "Paulo Cardoso", nationality: "Angolan", passportFile: "", email: "paulo@kizombakings.com", phone: "+244 923 111 006", dietaryPreferences: "" },
    ],
    travelLogistics: { flights: [], hotelBookingFile: "", workshopSchedule: "", pickupInfo: "", dropoffInfo: "", additionalNotes: "", driverName: "", driverPhone: "", driverNotes: "", hotelId: "", hotelName: "", hotelAddress: "", hotelMapLink: "", hotelCheckIn: "", hotelCheckOut: "", hotelNotes: "", hotelRooms: [], eventVenueName: "Festival Hall Amsterdam", eventVenueAddress: "Europaplein 24, 1078 GZ Amsterdam", eventVenueMapLink: "https://maps.google.com/?q=Festival+Hall+Amsterdam" },
  },
  {
    id: "5",
    stageName: "Sophie & Maxime",
    legalName: "Sophie Dupont & Maxime Laurent",
    country: "France",
    city: "Paris",
    nationality: "French",
    role: "couple",
    requestTemplate: "dancer",
    status: "awaiting",
    contractDocStatus: "awaiting_signature",
    missingItems: [],
    email: "sophie.maxime@email.com",
    phone: "+33 6 12 34 56 78",
    nearestAirport: "CDG",
    travelPreferences: "Business class if available",
    dietaryPreferences: "No pork",
    hotelRoomPreference: "Double room",
    profileStatus: "received",
    eventQuestions: buildEventQuestions(
      "dancer",
      {
        "stable-1": "Sophie Dupont & Maxime Laurent",
        "stable-2": "Sophie & Maxime",
        "stable-3": "sophie.maxime@email.com",
        "stable-4": "+33 6 12 34 56 78",
        "stable-5": "France",
        "stable-6": "Paris",
        "stable-7": "CDG",
        "stable-8": "passports_sm.pdf",
        "stable-9": "French",
        "stable-10": "No",
        "stable-11": "2026-04-10",
        "stable-12": "2026-04-15",
        "stable-13": "No",
        "stable-14": "Yes",
        "stable-15": "Private room",
        "stable-16": "No pork",
        "stable-17": "We'd love a room with a view if possible",
      },
      {
        [dancerFlexIds[0]]: "5",
        [dancerFlexIds[1]]: "Connection, Musicality, Patterns, Styling, Performance",
        [dancerFlexIds[2]]: "2",
        [dancerFlexIds[3]]: "Couple",
        [dancerFlexIds[4]]: "No",
      },
      {
        "evt-1": "Yes",
        "evt-2": "Yes",
        "evt-3": "Yes",
      }
    ),
    agreement: {
      agreedFee: "€3,500",
      paymentSchedule: "30% deposit, 70% on arrival",
      paymentMethod: "Bank transfer",
      workshopsConfirmed: 5,
      workshopDaysAgreed: 3,
      showsConfirmed: 2,
      djSets: 0,
      panels: 1,
      hotelNights: 5,
      roomSharing: "Private",
      airportTransfer: true,
      foodVouchers: true,
      flightBudget: "€500",
      travelClass: "Business",
      arrivalDate: "2026-04-10",
      departureDate: "2026-04-15",
      promoObligations: "2 posts, 3 stories",
      socialMediaPosts: 5,
      ambassadorTasks: "Event ambassador role",
      payments: { feePaid: true, flightsPaid: true, hotelPaid: false, transportPaid: false, foodPaid: false },
    },
    groupMembers: [
      { id: "m8", fullName: "Sophie Dupont", nationality: "French", passportFile: "passport_sophie.pdf", email: "sophie@email.com", phone: "+33 6 12 34 56 78", dietaryPreferences: "No pork" },
      { id: "m9", fullName: "Maxime Laurent", nationality: "French", passportFile: "passport_maxime.pdf", email: "maxime@email.com", phone: "+33 6 98 76 54 32", dietaryPreferences: "No pork" },
    ],
    travelLogistics: { flights: [{ id: "f5", type: "arrival", passengerName: "Sophie Dupont", flightNumber: "AF1340", airport: "AMS", date: "2026-04-10", time: "08:15", cost: "€650", ticketFile: "ticket_sophie.pdf", notes: "Business class" }, { id: "f6", type: "arrival", passengerName: "Maxime Laurent", flightNumber: "AF1342", airport: "AMS", date: "2026-04-10", time: "10:30", cost: "€650", ticketFile: "ticket_maxime.pdf", notes: "Business class, different flight from Lyon" }, { id: "f7", type: "departure", passengerName: "Sophie Dupont & Maxime Laurent", flightNumber: "AF1341", airport: "AMS", date: "2026-04-15", time: "19:30", cost: "€650", ticketFile: "", notes: "Shared return flight" }], hotelBookingFile: "hotel_sm.pdf", workshopSchedule: "Day 1: 16:00 Connection, Day 2: 11:00 Musicality, Day 3: 14:00 Patterns", pickupInfo: "CDG pickup 10:00 Apr 10", dropoffInfo: "CDG dropoff 14:00 Apr 15", additionalNotes: "Business class confirmed", driverName: "Pierre D.", driverPhone: "+31 6 9876 5432", driverNotes: "Black BMW, will hold sign at arrivals", hotelId: "hotel-3", hotelName: "Marriott Amsterdam", hotelAddress: "Stadhouderskade 12, Amsterdam", hotelMapLink: "https://maps.google.com/?q=Marriott+Hotel+Amsterdam", hotelCheckIn: "2026-04-10", hotelCheckOut: "2026-04-15", hotelNotes: "Room with a view requested", hotelRooms: [{ id: "r3", roomType: "double", guestNames: "Sophie Dupont & Maxime Laurent", costPerNight: "€180", totalCost: "€900", notes: "High floor with city view" }], eventVenueName: "Festival Hall Amsterdam", eventVenueAddress: "Europaplein 24, 1078 GZ Amsterdam", eventVenueMapLink: "https://maps.google.com/?q=Festival+Hall+Amsterdam" },
  },
];

export const statusLabels: Record<ContractStatus, string> = {
  invited: "Invited",
  waiting: "Waiting for Info",
  negotiation: "Negotiation",
  awaiting: "Awaiting Signature",
  confirmed: "Confirmed",
};

export const roleLabels: Record<ArtistRole, string> = {
  solo: "Solo",
  couple: "Couple",
  group: "Group",
  dj: "DJ",
  ambassador: "Ambassador",
};

export const contractDocStatusLabels: Record<ContractDocStatus, string> = {
  draft: "Draft",
  sent: "Sent to Artist",
  awaiting_signature: "Awaiting Signature",
  signed: "Signed",
  confirmed: "Confirmed",
};

export const requestTemplateLabels: Record<RequestTemplateType, string> = {
  dancer: "Dancer / Instructor",
  dj: "DJ",
  band: "Band / Live Act",
  mc: "MC / Host",
  ambassador: "Ambassador / Promoter",
  guest: "Guest Artist",
};
