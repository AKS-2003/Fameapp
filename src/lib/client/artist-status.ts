export interface StatusInfo {
	label: string;
	description: string;
	color: string;
}

export function getStatusInfo(status: string | null): StatusInfo {
	switch (status) {
		case "pending":
			return {
				label: "Pending",
				description: "Application submitted, awaiting review",
				color: "yellow",
			};
		case "approved":
			return {
				label: "Approved",
				description: "Application approved, ready for assignment",
				color: "green",
			};
		case "rejected":
			return {
				label: "Rejected",
				description: "Application rejected",
				color: "red",
			};
		case "assigned":
			return {
				label: "Assigned",
				description: "Assigned to performance date",
				color: "blue",
			};
		case "confirmed":
			return {
				label: "Confirmed",
				description: "Artist confirmed participation",
				color: "green",
			};
		case "cancelled":
			return {
				label: "Cancelled",
				description: "Artist cancelled participation",
				color: "red",
			};
		case "no_show":
			return {
				label: "No Show",
				description: "Artist did not show up",
				color: "red",
			};
		case "completed":
			return {
				label: "Completed",
				description: "Performance completed",
				color: "green",
			};
		default:
			return {
				label: "Unknown",
				description: "Status unknown",
				color: "gray",
			};
	}
}
