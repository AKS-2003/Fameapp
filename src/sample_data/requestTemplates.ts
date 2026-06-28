export type QuestionType =
  | "short_text"
  | "paragraph"
  | "number"
  | "yes_no"
  | "multiple_choice"
  | "dropdown"
  | "date"
  | "file_upload"
  | "link";

export type ParticipantType =
  | "dancer"
  | "dj"
  | "band"
  | "mc"
  | "ambassador"
  | "guest";

export interface TemplateQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // for multiple_choice / dropdown
  category?: "stable" | "flexible" | "event_specific";
}

export interface RequestTemplate {
  id: string;
  name: string;
  participantType: ParticipantType;
  questions: TemplateQuestion[];
}

export const participantTypeLabels: Record<ParticipantType, string> = {
  dancer: "Dancer / Instructor",
  dj: "DJ",
  band: "Band / Live Act",
  mc: "MC / Host",
  ambassador: "Ambassador / Promoter",
  guest: "Guest Artist",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  short_text: "Short Text",
  paragraph: "Paragraph Text",
  number: "Number",
  yes_no: "Yes / No",
  multiple_choice: "Multiple Choice",
  dropdown: "Dropdown",
  date: "Date",
  file_upload: "File Upload",
  link: "Link",
};

let _nextId = 100;
const uid = () => String(_nextId++);

// ─── STABLE QUESTIONS (same for every participant) ───────────────────────────
export const stableQuestions: TemplateQuestion[] = [
  // Identity
  { id: "stable-1", label: "Full Name", type: "short_text", required: true, category: "stable" },
  { id: "stable-2", label: "Artist or Group Name", type: "short_text", required: false, category: "stable" },
  { id: "stable-3", label: "Email Address", type: "short_text", required: true, category: "stable" },
  { id: "stable-4", label: "Phone Number", type: "short_text", required: true, category: "stable" },
  { id: "stable-5", label: "Country of Residence", type: "short_text", required: true, category: "stable" },
  { id: "stable-6", label: "City of Residence", type: "short_text", required: true, category: "stable" },
  { id: "stable-7", label: "Nearest International Airport", type: "short_text", required: true, category: "stable" },
  { id: "stable-8", label: "Passport Copy Upload", type: "file_upload", required: false, category: "stable" },
  { id: "stable-9", label: "Nationality", type: "short_text", required: true, category: "stable" },
  { id: "stable-10", label: "Do you need a visa?", type: "yes_no", required: true, category: "stable" },
  // Travel
  { id: "stable-11", label: "Preferred Arrival Date", type: "date", required: true, category: "stable" },
  { id: "stable-12", label: "Preferred Departure Date", type: "date", required: true, category: "stable" },
  { id: "stable-13", label: "Will you travel with additional performers?", type: "yes_no", required: true, category: "stable" },
  // Accommodation
  { id: "stable-14", label: "Do you require hotel accommodation?", type: "yes_no", required: true, category: "stable" },
  { id: "stable-15", label: "Do you prefer a private room or shared room?", type: "dropdown", required: false, options: ["Private room", "Shared room", "No preference"], category: "stable" },
  // Special Notes
  { id: "stable-16", label: "Dietary Restrictions", type: "short_text", required: false, category: "stable" },
  { id: "stable-17", label: "Additional Notes for Organizer", type: "paragraph", required: false, category: "stable" },
];

// Grouping metadata for rendering
export const stableQuestionGroups = [
  { title: "Identity & Contact", questionIds: ["stable-1", "stable-2", "stable-3", "stable-4", "stable-5", "stable-6", "stable-7", "stable-8", "stable-9", "stable-10"] },
  { title: "Travel Information", questionIds: ["stable-11", "stable-12", "stable-13"] },
  { title: "Accommodation", questionIds: ["stable-14", "stable-15"] },
  { title: "Special Notes", questionIds: ["stable-16", "stable-17"] },
];

// ─── FLEXIBLE QUESTIONS (role-based templates) ───────────────────────────────
export const defaultTemplates: RequestTemplate[] = [
  {
    id: "tpl-dancer",
    name: "Dancer / Instructor",
    participantType: "dancer",
    questions: [
      { id: uid(), label: "How many workshops can you teach?", type: "number", required: true, category: "flexible" },
      { id: uid(), label: "Workshop titles you would like to propose", type: "paragraph", required: false, category: "flexible" },
      { id: uid(), label: "How many shows will you perform?", type: "number", required: true, category: "flexible" },
      { id: uid(), label: "Will you perform as a solo, couple, or group?", type: "dropdown", required: true, options: ["Solo", "Couple", "Group"], category: "flexible" },
      { id: uid(), label: "Will additional dancers join your performance?", type: "yes_no", required: false, category: "flexible" },
    ],
  },
  {
    id: "tpl-dj",
    name: "DJ",
    participantType: "dj",
    questions: [
      { id: uid(), label: "How many DJ sets are you available for?", type: "number", required: true, category: "flexible" },
      { id: uid(), label: "Preferred DJ set duration", type: "short_text", required: false, category: "flexible" },
      { id: uid(), label: "Preferred DJ equipment", type: "short_text", required: false, category: "flexible" },
      { id: uid(), label: "Do you bring your own controller?", type: "yes_no", required: true, category: "flexible" },
      { id: uid(), label: "Music genre specialization", type: "short_text", required: true, category: "flexible" },
    ],
  },
  {
    id: "tpl-band",
    name: "Band / Live Act",
    participantType: "band",
    questions: [
      { id: uid(), label: "Number of musicians", type: "number", required: true, category: "flexible" },
      { id: uid(), label: "List of instruments", type: "paragraph", required: true, category: "flexible" },
      { id: uid(), label: "Do you require a soundcheck?", type: "yes_no", required: true, category: "flexible" },
      { id: uid(), label: "Stage size requirement", type: "short_text", required: false, category: "flexible" },
      { id: uid(), label: "Do you travel with your own sound engineer?", type: "yes_no", required: false, category: "flexible" },
    ],
  },
  {
    id: "tpl-mc",
    name: "MC / Host",
    participantType: "mc",
    questions: [
      { id: uid(), label: "Languages spoken", type: "short_text", required: true, category: "flexible" },
      { id: uid(), label: "Preferred hosting segments", type: "paragraph", required: false, category: "flexible" },
      { id: uid(), label: "Experience hosting festivals", type: "yes_no", required: true, category: "flexible" },
      { id: uid(), label: "Do you require stage rehearsal?", type: "yes_no", required: false, category: "flexible" },
    ],
  },
  {
    id: "tpl-ambassador",
    name: "Ambassador / Promoter",
    participantType: "ambassador",
    questions: [
      { id: uid(), label: "Country you represent", type: "short_text", required: true, category: "flexible" },
      { id: uid(), label: "Estimated number of attendees you promote", type: "number", required: true, category: "flexible" },
      { id: uid(), label: "Social media channels", type: "paragraph", required: false, category: "flexible" },
      { id: uid(), label: "Promotional commitments", type: "paragraph", required: true, category: "flexible" },
    ],
  },
  {
    id: "tpl-guest",
    name: "Guest Artist",
    participantType: "guest",
    questions: [
      { id: uid(), label: "Any special requirements?", type: "paragraph", required: false, category: "flexible" },
    ],
  },
];

// ─── EVENT-SPECIFIC QUESTIONS (example, organizer-added) ─────────────────────
export const sampleEventSpecificQuestions: TemplateQuestion[] = [
  { id: "evt-1", label: "Are you available for the Sunday pool party?", type: "yes_no", required: false, category: "event_specific" },
  { id: "evt-2", label: "Would you like to host a themed workshop?", type: "yes_no", required: false, category: "event_specific" },
  { id: "evt-3", label: "Can you participate in a panel discussion?", type: "yes_no", required: false, category: "event_specific" },
];
