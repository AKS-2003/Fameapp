import { createUser, createTestData } from "./data-access";
import { hashPassword } from "./auth";
import { User } from "@/types";

// Create default users for development
export async function createDevUsers() {
	if (process.env.NODE_ENV !== "development") {
		return;
	}

	try {
		// Create test users
		const testUsers: User[] = [
			{
				id: "dev_admin_001",
				email: "admin@fame.dev",
				passwordHash: await hashPassword("admin123"),
				role: "super_admin",
				status: "active",
				profile: {
					firstName: "Admin",
					lastName: "User",
					phone: "+1234567890",
				},
				createdAt: new Date(),
				lastLogin: new Date(),
			},
			{
				id: "dev_manager_001",
				email: "manager@fame.dev",
				passwordHash: await hashPassword("manager123"),
				role: "stage_manager",
				status: "active",
				profile: {
					firstName: "Stage",
					lastName: "Manager",
					phone: "+1234567891",
				},
				createdAt: new Date(),
				lastLogin: new Date(),
			},
			{
				id: "dev_artist_001",
				email: "artist@fame.dev",
				passwordHash: await hashPassword("artist123"),
				role: "artist",
				status: "active",
				profile: {
					firstName: "Test",
					lastName: "Artist",
					phone: "+1234567892",
				},
				createdAt: new Date(),
				lastLogin: new Date(),
			},
		];

		// Create users using data access layer
		for (const user of testUsers) {
			await createUser(user);
		}

		// Create test data
		await createTestData();

		console.log("✓ Development users created successfully!");
		console.log("Test accounts:");
		console.log("- admin@fame.dev / admin123 (Super Admin)");
		console.log("- manager@fame.dev / manager123 (Stage Manager)");
		console.log("- artist@fame.dev / artist123 (Artist)");
	} catch (error) {
		console.error("Error creating development users:", error);
	}
}
