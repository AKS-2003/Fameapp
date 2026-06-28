// =========================================================================
// Booking Stages Types — Multi-stage booking workflow for artist contracts
// =========================================================================

export type StageStatus =
	| "draft"
	| "sent"
	| "under_review"
	| "changes_requested"
	| "approved"
	| "waiting_artist_signature"
	| "waiting_organiser_signature"
	| "completed";

export type StageName =
	| "contract"
	| "logistics"
	| "schedule"
	| "payment"
	| "communication";

export interface StageSignature {
	signed: boolean;
	signedAt?: string;
	signatureDataUrl?: string;
}

export interface NegotiationMessage {
	id: string;
	sender: "organizer" | "artist";
	senderName: string;
	text: string;
	timestamp: string;
	type: "question" | "change_request" | "approval" | "message";
}

export interface BookingStage {
	name: StageName;
	label: string;
	status: StageStatus;
	artistSignature: StageSignature;
	organiserSignature: StageSignature;
	negotiation: NegotiationMessage[];
}

export interface ContractStageData {
	performanceAgreement: string;
	bookingTerms: string;
	deliverables: string;
	conditions: string;
	responsibilities: string;
	cancellationTerms: string;
	specialClauses: string;
}

export interface LogisticsStageData {
	travelDetails: string;
	pickupDropoff: string;
	hotelAccommodation: string;
	hospitalityRequirements: string;
	technicalNeeds: string;
	localContactName: string;
	localContactPhone: string;
	localContactEmail: string;
}

export interface ScheduleStageData {
	rehearsalTimes: string;
	soundcheck: string;
	callTime: string;
	performanceSlot: string;
	showFlowTiming: string;
	reportingTime: string;
	otherMilestones: string;
}

export interface PaymentStageData {
	performanceFee: string;
	deposit: string;
	depositDueDate: string;
	remainingBalance: string;
	balanceDueDate: string;
	paymentMethod: string;
	invoiceStatus: "not_sent" | "sent" | "received" | "paid";
	paymentConditions: string;
}

export interface Booking {
	id: string;
	eventId: string;
	artistContractId: string;
	eventName: string;
	eventDates: string;
	location: string;
	organizerName: string;
	artistName: string;
	role: string;
	stages: BookingStage[];
	contractData: ContractStageData;
	logisticsData: LogisticsStageData;
	scheduleData: ScheduleStageData;
	paymentData: PaymentStageData;
	communication: NegotiationMessage[];
	createdAt: string;
	updatedAt: string;
}

export const stageStatusLabels: Record<StageStatus, string> = {
	draft: "Draft",
	sent: "Sent",
	under_review: "Under Review",
	changes_requested: "Changes Requested",
	approved: "Approved",
	waiting_artist_signature: "Waiting for Artist Signature",
	waiting_organiser_signature: "Waiting for Organiser Signature",
	completed: "Signed / Completed",
};

export const stageStatusColors: Record<StageStatus, string> = {
	draft: "text-muted-foreground bg-muted/50 border-border",
	sent: "text-blue-500 bg-blue-500/10 border-blue-500/30",
	under_review: "text-orange-500 bg-orange-500/10 border-orange-500/30",
	changes_requested: "text-amber-500 bg-amber-500/10 border-amber-500/30",
	approved: "text-green-500 bg-green-500/10 border-green-500/30",
	waiting_artist_signature:
		"text-purple-500 bg-purple-500/10 border-purple-500/30",
	waiting_organiser_signature:
		"text-orange-500 bg-orange-500/10 border-orange-500/30",
	completed: "text-green-500 bg-green-500/10 border-green-500/30",
};

export const emptyContractStageData: ContractStageData = {
	performanceAgreement: "",
	bookingTerms: "",
	deliverables: "",
	conditions: "",
	responsibilities: "",
	cancellationTerms: "",
	specialClauses: "",
};

export const emptyLogisticsStageData: LogisticsStageData = {
	travelDetails: "",
	pickupDropoff: "",
	hotelAccommodation: "",
	hospitalityRequirements: "",
	technicalNeeds: "",
	localContactName: "",
	localContactPhone: "",
	localContactEmail: "",
};

export const emptyScheduleStageData: ScheduleStageData = {
	rehearsalTimes: "",
	soundcheck: "",
	callTime: "",
	performanceSlot: "",
	showFlowTiming: "",
	reportingTime: "",
	otherMilestones: "",
};

export const emptyPaymentStageData: PaymentStageData = {
	performanceFee: "",
	deposit: "",
	depositDueDate: "",
	remainingBalance: "",
	balanceDueDate: "",
	paymentMethod: "",
	invoiceStatus: "not_sent",
	paymentConditions: "",
};

export function createDefaultBooking(params: {
	eventId: string;
	artistContractId: string;
	eventName: string;
	eventDates: string;
	location: string;
	organizerName: string;
	artistName: string;
	role: string;
}): Booking {
	const now = new Date().toISOString();
	return {
		id: `bk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		eventId: params.eventId,
		artistContractId: params.artistContractId,
		eventName: params.eventName,
		eventDates: params.eventDates,
		location: params.location,
		organizerName: params.organizerName,
		artistName: params.artistName,
		role: params.role,
		stages: [
			{
				name: "contract",
				label: "Contract",
				status: "draft",
				artistSignature: { signed: false },
				organiserSignature: { signed: false },
				negotiation: [],
			},
			{
				name: "logistics",
				label: "Logistics",
				status: "draft",
				artistSignature: { signed: false },
				organiserSignature: { signed: false },
				negotiation: [],
			},
			{
				name: "schedule",
				label: "Schedule",
				status: "draft",
				artistSignature: { signed: false },
				organiserSignature: { signed: false },
				negotiation: [],
			},
			{
				name: "payment",
				label: "Payment",
				status: "draft",
				artistSignature: { signed: false },
				organiserSignature: { signed: false },
				negotiation: [],
			},
			{
				name: "communication",
				label: "Communication",
				status: "draft",
				artistSignature: { signed: false },
				organiserSignature: { signed: false },
				negotiation: [],
			},
		],
		contractData: emptyContractStageData,
		logisticsData: emptyLogisticsStageData,
		scheduleData: emptyScheduleStageData,
		paymentData: emptyPaymentStageData,
		communication: [],
		createdAt: now,
		updatedAt: now,
	};
}
