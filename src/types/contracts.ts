// =========================================================================
// Artist Contracts Types — Full type definitions for the contracts module
// =========================================================================

// ---- Status Enums ----

export type ContractItemStatus = "required" | "not_required" | "not_applicable";

export type ContractStatus =
	| "invited"
	| "waiting"
	| "negotiation"
	| "awaiting"
	| "confirmed"
	| "cancelled";
export type ArtistRole = "solo" | "couple" | "group" | "dj" | "ambassador";
export type RequestTemplateType =
	| "dancer"
	| "dj"
	| "band"
	| "mc"
	| "ambassador"
	| "guest";
export type ContractDocStatus =
	| "draft"
	| "sent"
	| "awaiting_signature"
	| "signed"
	| "confirmed";
export type PaymentStatus = "unpaid" | "downpayment" | "paid";

// ---- Group Members ----

export interface GroupMember {
	id: string;
	fullName: string;
	nationality: string;
	passportFile: string;
	email: string;
	phone: string;
	dietaryPreferences: string;
}

// ---- Flight Details ----

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
	pairedFlightId?: string;
}

// ---- Hotel Room Booking ----

export interface HotelRoomBooking {
	id: string;
	roomType: "single" | "double" | "twin" | "suite";
	guestNames: string;
	costPerNight: string;
	totalCost: string;
	notes: string;
}

// ---- Travel Logistics ----

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

// ---- Payment Detail ----

export interface PaymentDetail {
	status: PaymentStatus;
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

// ---- Payment Tracker ----

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

// ---- Agreement ----

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

// ---- Event Question ----

export interface EventQuestion {
	id: string;
	question: string;
	answer: string | null;
	category: "stable" | "flexible" | "event_specific";
}

// ---- Artist ----

export interface ContractArtist {
	id: string;
	eventId: string;
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
	contractItemStatuses?: Record<string, ContractItemStatus>;
	createdAt: string;
	updatedAt: string;
}

// ---- Invitation ----

export interface ContractInvitation {
	id: string;
	eventId: string;
	templateId: string;
	templateName: string;
	participantType: RequestTemplateType;
	artistName: string;
	artistEmail: string;
	status:
		| "invited"
		| "waiting"
		| "submitted"
		| "negotiation"
		| "awaiting_signature"
		| "confirmed"
		| "cancelled";
	invitationLink: string;
	createdAt: string;
	respondedAt: string | null;
	expiresAt?: string;
	message?: string;
}

// ---- Conversation Message ----

export interface ConversationMessage {
	id: string;
	artistId: string;
	invitationId: string;
	sender: "organiser" | "artist";
	senderName: string;
	text: string;
	timestamp: string;
	attachments?: {
		type: "document" | "link" | "image";
		name: string;
		url: string;
	}[];
}

// ---- Contract Settings ----

export interface ContractSettings {
	eventId: string;
	defaultCurrency: string;
	defaultHotelCostPerNight: number;
	defaultTransportCost: number;
	defaultFoodCostPerDay: number;
	contractTemplateUrl?: string;
	customQuestions: TemplateQuestion[];
	updatedAt: string;
}

// ---- Template Question ----

export interface TemplateQuestion {
	id: string;
	label: string;
	type:
		| "short_text"
		| "paragraph"
		| "number"
		| "yes_no"
		| "multiple_choice"
		| "dropdown"
		| "date"
		| "file_upload"
		| "link";
	required: boolean;
	placeholder?: string;
	options?: string[];
	category?: "stable" | "flexible" | "event_specific";
}

// ---- FameLink Invite Status Mapping ----

export type FLInviteStatus =
	| "new_invite"
	| "waiting"
	| "discussion"
	| "awaiting_approval"
	| "contract_sent"
	| "confirmed";

export function mapContractToFLStatus(artist: ContractArtist): FLInviteStatus {
	if (artist.contractDocStatus === "confirmed") return "confirmed";
	if (artist.contractDocStatus === "awaiting_signature")
		return "contract_sent";
	if (artist.status === "awaiting") return "awaiting_approval";
	if (artist.status === "negotiation") return "discussion";
	if (artist.status === "waiting") return "waiting";
	return "new_invite";
}

// ---- Logistics Registries ----

export interface RegisteredHotel {
	id: string;
	name: string;
	address: string;
	mapLink: string;
	contactPhone: string;
	contactEmail: string;
	notes: string;
}

export interface RegisteredDriver {
	id: string;
	name: string;
	phone: string;
	vehicle: string;
	capacity: number;
	costPerTrip: number;
	costPerPerson: number;
}

export interface RegisteredVenue {
	id: string;
	name: string;
	address: string;
	mapLink: string;
	contactPhone: string;
	capacity: number;
	notes: string;
}

export interface CateringOption {
	id: string;
	mealType: "breakfast" | "lunch" | "dinner" | "snack";
	name: string;
	costPerPerson: number;
	description: string;
}

export interface CurrencyOption {
	code: string;
	name: string;
	symbol: string;
	isDefault: boolean;
}

// ---- Cost Breakdown ----

export interface CostBreakdown {
	fee: number;
	flights: number;
	hotel: number;
	transport: number;
	food: number;
	extra: number;
	total: number;
}

// ---- Status Labels ----

export const statusLabels: Record<ContractStatus, string> = {
	invited: "Invited",
	waiting: "Waiting for Info",
	negotiation: "Negotiation",
	awaiting: "Awaiting Signature",
	confirmed: "Confirmed",
	cancelled: "Cancelled",
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

// ---- Status Colors ----

export const statusColors: Record<ContractStatus, string> = {
	invited: "bg-blue-50 text-blue-600 border-blue-200",
	waiting: "bg-yellow-50 text-yellow-700 border-yellow-200",
	negotiation: "bg-orange-50 text-orange-600 border-orange-200",
	awaiting: "bg-purple-50 text-purple-600 border-purple-200",
	confirmed: "bg-green-50 text-green-600 border-green-200",
	cancelled: "bg-red-50 text-red-600 border-red-200",
};

// ---- Empty Defaults ----

export const emptyAgreement: Agreement = {
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
	payments: {
		feePaid: false,
		flightsPaid: false,
		hotelPaid: false,
		transportPaid: false,
		foodPaid: false,
	},
};

export const emptyTravelLogistics: TravelLogistics = {
	flights: [],
	hotelBookingFile: "",
	workshopSchedule: "",
	pickupInfo: "",
	dropoffInfo: "",
	additionalNotes: "",
	driverName: "",
	driverPhone: "",
	driverNotes: "",
	hotelId: "",
	hotelName: "",
	hotelAddress: "",
	hotelMapLink: "",
	hotelCheckIn: "",
	hotelCheckOut: "",
	hotelNotes: "",
	hotelRooms: [],
	eventVenueName: "",
	eventVenueAddress: "",
	eventVenueMapLink: "",
};
