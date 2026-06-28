import { z } from "zod";

export const eventFormSchema = z
	.object({
		name: z.string().min(1, "Event name is required"),
		venueName: z.string().min(1, "Venue name is required"),
		startDate: z.date({
			required_error: "Start date is required",
		}),
		endDate: z.date({
			required_error: "End date is required",
		}),
		description: z.string().min(1, "Description is required"),
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: "End date must be after start date",
		path: ["endDate"],
	});

export type EventFormData = z.infer<typeof eventFormSchema>;
