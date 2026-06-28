export interface RegisteredHotel {
	id: string;
	name: string;
	address: string;
	mapLink: string;
	contactPhone: string;
	contactEmail: string;
	notes: string;
}

export const registeredHotels: RegisteredHotel[] = [
	{
		id: "hotel-1",
		name: "NH Amsterdam Centre",
		address: "Stadhouderskade 7, Amsterdam",
		mapLink: "https://maps.google.com/?q=NH+Amsterdam+Centre",
		contactPhone: "+31 20 685 1311",
		contactEmail: "reservations@nh-hotels.com",
		notes: "Main artist hotel. 5 min walk from venue.",
	},
	{
		id: "hotel-2",
		name: "Park Plaza Victoria",
		address: "Damrak 1-5, Amsterdam",
		mapLink: "https://maps.google.com/?q=Park+Plaza+Victoria+Amsterdam",
		contactPhone: "+31 20 623 4255",
		contactEmail: "info@parkplaza.com",
		notes: "Near Central Station. Good for artists arriving by train.",
	},
	{
		id: "hotel-3",
		name: "Marriott Amsterdam",
		address: "Stadhouderskade 12, Amsterdam",
		mapLink: "https://maps.google.com/?q=Marriott+Hotel+Amsterdam",
		contactPhone: "+31 20 607 5555",
		contactEmail: "amsterdam@marriott.com",
		notes: "Premium option. Business class artists.",
	},
];
