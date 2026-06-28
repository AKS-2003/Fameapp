import { User, Event, Performance, ArtistRegistration } from "@/types";
import { generateId } from "./utils";
import { 
  getAllUsers as daGetAllUsers,
  createUser as daCreateUser,
  updateUser as daUpdateUser,
  getAllEvents as daGetAllEvents,
  getEventById as daGetEventById,
  createEvent as daCreateEvent,
  updateEvent as daUpdateEvent,
  getPerformancesByEvent as daGetPerformancesByEvent,
  createPerformance as daCreatePerformance,
  updatePerformance as daUpdatePerformance
} from "./data-access";

export async function getAllUsers(): Promise<User[]> {
	return daGetAllUsers();
}

export async function saveUser(user: User): Promise<void> {
	await daUpdateUser(user);
}

export async function createUser(
	userData: Omit<User, "id" | "createdAt" | "lastLogin">
): Promise<User> {
	const user: User = {
		...userData,
		id: generateId(),
		createdAt: new Date(),
		lastLogin: new Date(),
	};
	await daCreateUser(user);
	return user;
}

export async function getAllEvents(): Promise<Event[]> {
	return daGetAllEvents();
}

export async function getEventById(eventId: string): Promise<Event | null> {
	return daGetEventById(eventId);
}

export async function saveEvent(event: Event): Promise<void> {
	await daUpdateEvent(event);
}

export async function createEvent(
	eventData: Omit<Event, "id" | "registrationUrl">
): Promise<Event> {
	const eventId = generateId();
	const event: Event = {
		...eventData,
		id: eventId,
		registrationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/register/${eventId}`,
	};
	await daCreateEvent(event as any);
	return event;
}

export async function getPerformancesByEvent(
	eventId: string
): Promise<Performance[]> {
	return daGetPerformancesByEvent(eventId);
}

export async function savePerformance(performance: Performance): Promise<void> {
	await daUpdatePerformance(performance);
}

export async function getArtistRegistrations(
	eventId: string
): Promise<ArtistRegistration[]> {
	return []; // Deprecated, use EventParticipations in data-access.ts
}

export async function saveArtistRegistration(
	registration: ArtistRegistration
): Promise<void> {
    // Deprecated
}

export async function initializeDataStructure(): Promise<void> {
    // No longer needed with MongoDB
	console.log("Data structure initialized successfully (MongoDB)");
}

export async function ensureSuperAdminExists(): Promise<void> {
	try {
		const users = await getAllUsers();
		const superAdmin = users.find((u) => u.role === "super_admin");

		if (!superAdmin) {
			console.log("No super admin found, creating default super admin");
			const defaultAdmin: Omit<User, "id" | "createdAt" | "lastLogin"> = {
				email: "admin@fame.com",
				passwordHash: await import("./auth").then((auth) =>
					auth.hashPassword("admin123")
				),
				role: "super_admin",
				status: "active",
				profile: {
					firstName: "Super",
					lastName: "Admin",
				},
			};

			await createUser(defaultAdmin);
			console.log(
				"Default super admin created: admin@fame.com / admin123"
			);
		}
	} catch (error) {
		console.error("Error ensuring super admin exists:", error);
	}
}
