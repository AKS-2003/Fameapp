// Default Event Checklist Template
// This template is automatically loaded for every new event

export type ChecklistPhase = "before_event" | "during_event" | "after_event";
export type ChecklistStatus = "pending" | "next_on_todo" | "urgent" | "done";

export interface ChecklistItem {
	id: string;
	phase: ChecklistPhase;
	category: string;
	title: string;
	status: ChecklistStatus;
	owner: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
	isCustom?: boolean;
}

export interface EventChecklist {
	eventId: string;
	items: ChecklistItem[];
	createdAt: string;
	updatedAt: string;
	version: number;
}

export const PHASE_LABELS: Record<ChecklistPhase, string> = {
	before_event: "BEFORE EVENT — PRODUCTION CHECKLIST",
	during_event: "DURING EVENT — PRODUCTION CHECKLIST",
	after_event: "AFTER EVENT — CLOSE-OUT CHECKLIST",
};

export const STATUS_OPTIONS: { value: ChecklistStatus; label: string; color: string; bgColor: string }[] = [
	{ value: "pending", label: "Pending", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.15)" },
	{ value: "next_on_todo", label: "Next on my To-Do", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.15)" },
	{ value: "urgent", label: "Urgent", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.15)" },
	{ value: "done", label: "Done", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.15)" },
];

export function getStatusStyle(status: ChecklistStatus): { color: string; bgColor: string; label: string } {
	const opt = STATUS_OPTIONS.find((s) => s.value === status);
	return opt || { color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.15)", label: "Pending" };
}

let _idCounter = 0;
function genId(): string {
	_idCounter++;
	return `chk_${Date.now()}_${_idCounter}_${Math.random().toString(36).substring(2, 8)}`;
}

interface TemplateCategory {
	category: string;
	items: string[];
}

const BEFORE_EVENT_CATEGORIES: TemplateCategory[] = [];
const DURING_EVENT_CATEGORIES: TemplateCategory[] = [];
const AFTER_EVENT_CATEGORIES: TemplateCategory[] = [];

export function generateDefaultChecklist(eventId: string): EventChecklist {
	_idCounter = 0;
	const now = new Date().toISOString();
	const items: ChecklistItem[] = [];

	const addPhase = (phase: ChecklistPhase, categories: TemplateCategory[]) => {
		categories.forEach((cat) => {
			cat.items.forEach((title) => {
				items.push({
					id: genId(),
					phase,
					category: cat.category,
					title,
					status: "pending",
					owner: "",
					notes: "",
					createdAt: now,
					updatedAt: now,
					isCustom: false,
				});
			});
		});
	};

	addPhase("before_event", BEFORE_EVENT_CATEGORIES);
	addPhase("during_event", DURING_EVENT_CATEGORIES);
	addPhase("after_event", AFTER_EVENT_CATEGORIES);

	return {
		eventId,
		items,
		createdAt: now,
		updatedAt: now,
		version: 1,
	};
}

export function getCategories(phase: ChecklistPhase): string[] {
	switch (phase) {
		case "before_event":
			return BEFORE_EVENT_CATEGORIES.map((c) => c.category);
		case "during_event":
			return DURING_EVENT_CATEGORIES.map((c) => c.category);
		case "after_event":
			return AFTER_EVENT_CATEGORIES.map((c) => c.category);
		default:
			return [];
	}
}

export function getAllCategories(): Record<ChecklistPhase, string[]> {
	return {
		before_event: getCategories("before_event"),
		during_event: getCategories("during_event"),
		after_event: getCategories("after_event"),
	};
}
