export interface CateringOption {
	id: string;
	mealType: "breakfast" | "lunch" | "dinner" | "custom";
	name: string;
	costPerPerson: number;
	description: string;
	notes: string;
}

export const registeredCateringOptions: CateringOption[] = [
	{
		id: "cat-1",
		mealType: "breakfast",
		name: "Continental Breakfast",
		costPerPerson: 12,
		description: "Coffee, juice, pastries, fruit",
		notes: "",
	},
	{
		id: "cat-2",
		mealType: "breakfast",
		name: "Full Breakfast Buffet",
		costPerPerson: 18,
		description: "Hot & cold items, eggs, bacon, cereals",
		notes: "",
	},
	{
		id: "cat-3",
		mealType: "lunch",
		name: "Light Lunch",
		costPerPerson: 15,
		description: "Sandwiches, salads, soup",
		notes: "",
	},
	{
		id: "cat-4",
		mealType: "lunch",
		name: "Full Lunch Buffet",
		costPerPerson: 25,
		description: "Hot meals, sides, salad bar, dessert",
		notes: "",
	},
	{
		id: "cat-5",
		mealType: "dinner",
		name: "Casual Dinner",
		costPerPerson: 20,
		description: "2-course meal with drinks",
		notes: "",
	},
	{
		id: "cat-6",
		mealType: "dinner",
		name: "Gala Dinner",
		costPerPerson: 45,
		description: "3-course fine dining, wine pairing",
		notes: "",
	},
];
