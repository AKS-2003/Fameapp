// Status Utilities Test Suite
// Ensures consistent status colors and ordering across all pages

import {
	getStatusColorClasses,
	getStatusLabel,
	getStatusOrder,
	getStatusBadgeVariant,
	sortByStatus,
	ArtistStatus,
} from "../status-utils";

describe("Status Utilities", () => {
	describe("getStatusColorClasses", () => {
		it("should return correct color classes for each status", () => {
			expect(getStatusColorClasses("not_started")).toBe(
				"bg-white border-gray-300 text-gray-900"
			);
			expect(getStatusColorClasses("next_on_deck")).toBe(
				"bg-white border-blue-300 text-blue-900"
			);
			expect(getStatusColorClasses("next_on_stage")).toBe(
				"bg-white border-yellow-300 text-yellow-900"
			);
			expect(getStatusColorClasses("currently_on_stage")).toBe(
				"bg-white border-green-300 text-green-900"
			);
			expect(getStatusColorClasses("completed")).toBe(
				"bg-white border-red-300 text-red-900"
			);
		});

		it("should return default color for invalid status", () => {
			expect(getStatusColorClasses("invalid_status")).toBe(
				"bg-white border-gray-300 text-gray-900"
			);
			expect(getStatusColorClasses(null)).toBe(
				"bg-white border-gray-300 text-gray-900"
			);
			expect(getStatusColorClasses(undefined)).toBe(
				"bg-white border-gray-300 text-gray-900"
			);
		});
	});

	describe("getStatusLabel", () => {
		it("should return correct labels for each status", () => {
			expect(getStatusLabel("not_started")).toBe("Not Started");
			expect(getStatusLabel("next_on_deck")).toBe("Next On Deck");
			expect(getStatusLabel("next_on_stage")).toBe("Next On Stage");
			expect(getStatusLabel("currently_on_stage")).toBe(
				"Currently On Stage"
			);
			expect(getStatusLabel("completed")).toBe("Completed");
		});

		it("should return default label for invalid status", () => {
			expect(getStatusLabel("invalid_status")).toBe("Not Started");
			expect(getStatusLabel(null)).toBe("Not Started");
			expect(getStatusLabel(undefined)).toBe("Not Started");
		});
	});

	describe("getStatusOrder", () => {
		it("should return correct order for each status", () => {
			expect(getStatusOrder("not_started")).toBe(1);
			expect(getStatusOrder("next_on_deck")).toBe(2);
			expect(getStatusOrder("next_on_stage")).toBe(3);
			expect(getStatusOrder("currently_on_stage")).toBe(4);
			expect(getStatusOrder("completed")).toBe(5);
		});

		it("should return default order for invalid status", () => {
			expect(getStatusOrder("invalid_status")).toBe(1);
			expect(getStatusOrder(null)).toBe(1);
			expect(getStatusOrder(undefined)).toBe(1);
		});
	});

	describe("getStatusBadgeVariant", () => {
		it("should return correct badge variants for each status", () => {
			expect(getStatusBadgeVariant("not_started")).toBe("outline");
			expect(getStatusBadgeVariant("next_on_deck")).toBe("secondary");
			expect(getStatusBadgeVariant("next_on_stage")).toBe("secondary");
			expect(getStatusBadgeVariant("currently_on_stage")).toBe("default");
			expect(getStatusBadgeVariant("completed")).toBe("destructive");
		});

		it("should return default variant for invalid status", () => {
			expect(getStatusBadgeVariant("invalid_status")).toBe("outline");
			expect(getStatusBadgeVariant(null)).toBe("outline");
			expect(getStatusBadgeVariant(undefined)).toBe("outline");
		});
	});

	describe("sortByStatus", () => {
		it("should sort items by status priority", () => {
			const items = [
				{ id: "1", status: "completed" },
				{ id: "2", status: "not_started" },
				{ id: "3", status: "currently_on_stage" },
				{ id: "4", status: "next_on_deck" },
				{ id: "5", status: "next_on_stage" },
			];

			const sorted = sortByStatus(items);

			expect(sorted.map((item) => item.status)).toEqual([
				"not_started",
				"next_on_deck",
				"next_on_stage",
				"currently_on_stage",
				"completed",
			]);
		});

		it("should handle items with null/undefined status", () => {
			const items = [
				{ id: "1", status: "completed" },
				{ id: "2", status: null },
				{ id: "3", status: undefined },
				{ id: "4", status: "currently_on_stage" },
			];

			const sorted = sortByStatus(items);

			// null and undefined should be treated as 'not_started' (order 1)
			expect(sorted[0].status).toBe(null);
			expect(sorted[1].status).toBe(undefined);
			expect(sorted[2].status).toBe("currently_on_stage");
			expect(sorted[3].status).toBe("completed");
		});

		it("should not mutate original array", () => {
			const items = [
				{ id: "1", status: "completed" },
				{ id: "2", status: "not_started" },
			];
			const originalOrder = [...items];

			sortByStatus(items);

			expect(items).toEqual(originalOrder);
		});
	});
});
