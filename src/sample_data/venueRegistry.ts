export interface RegisteredVenue {
	id: string;
	name: string;
	address: string;
	mapLink: string;
	contactPhone: string;
	contactEmail: string;
	capacity: string;
	notes: string;
}

export const registeredVenues: RegisteredVenue[] = [
	{
		id: "venue-1",
		name: "Paradiso",
		address: "Weteringschans 6-8, Amsterdam",
		mapLink: "https://maps.google.com/?q=Paradiso+Amsterdam",
		contactPhone: "+31 20 626 4521",
		contactEmail: "info@paradiso.nl",
		capacity: "1500",
		notes: "Main stage. Load-in via back entrance.",
	},
	{
		id: "venue-2",
		name: "Melkweg",
		address: "Lijnbaansgracht 234A, Amsterdam",
		mapLink: "https://maps.google.com/?q=Melkweg+Amsterdam",
		contactPhone: "+31 20 531 8181",
		contactEmail: "info@melkweg.nl",
		capacity: "1000",
		notes: "Two halls available. Green room on 2nd floor.",
	},
];
