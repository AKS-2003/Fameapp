export interface RegisteredDriver {
	id: string;
	name: string;
	phone: string;
	vehicle: string;
	capacity: number;
	costPerTrip: string;
	costPerPerson: string;
	notes: string;
}

export const registeredDrivers: RegisteredDriver[] = [
	{
		id: "driver-1",
		name: "Ahmed B.",
		phone: "+31 6 1234 5678",
		vehicle: "Silver Mercedes Vito (8-seater)",
		capacity: 8,
		costPerTrip: "€120",
		costPerPerson: "€15",
		notes: "Reliable. Speaks English & Arabic.",
	},
	{
		id: "driver-2",
		name: "Jan de Vries",
		phone: "+31 6 9876 5432",
		vehicle: "Black VW Transporter (6-seater)",
		capacity: 6,
		costPerTrip: "€100",
		costPerPerson: "€18",
		notes: "Airport specialist. Available 24/7.",
	},
	{
		id: "driver-3",
		name: "Marco R.",
		phone: "+31 6 5555 4444",
		vehicle: "Tesla Model X (4-seater)",
		capacity: 4,
		costPerTrip: "€180",
		costPerPerson: "€45",
		notes: "Premium transfers only. VIP artists.",
	},
];
