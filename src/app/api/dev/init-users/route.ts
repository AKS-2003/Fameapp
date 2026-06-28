import { NextRequest, NextResponse } from "next/server";
import { APIResponse } from "@/types";
import { createUser, getAllUsers } from "@/lib/storage-service";

export async function POST(request: NextRequest) {
	try {
		// Check if we're in development mode
		if (process.env.NODE_ENV !== "development") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message:
							"This endpoint is only available in development mode",
					},
				},
				{ status: 403 }
			);
		}

		// Check if users already exist
		const existingUsers = await getAllUsers();
		if (existingUsers.length > 0) {
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					message: "Users already exist",
					userCount: existingUsers.length,
				},
			});
		}

		// Create sample users
		const sampleUsers = [
			{
				email: "admin@fame.dev",
				passwordHash: "hashed_password_admin123", // In real app, this would be properly hashed
				role: "super_admin",
				status: "active",
				profile: {
					firstName: "Super",
					lastName: "Admin",
					phone: "+1-555-0001",
				},
			},
			{
				email: "john.smith@example.com",
				passwordHash: "hashed_password_john123",
				role: "stage_manager",
				status: "pending",
				profile: {
					firstName: "John",
					lastName: "Smith",
					phone: "+1-555-0123",
				},
			},
			{
				email: "sarah.johnson@example.com",
				passwordHash: "hashed_password_sarah123",
				role: "stage_manager",
				status: "pending",
				profile: {
					firstName: "Sarah",
					lastName: "Johnson",
					phone: "+1-555-0456",
				},
			},
			{
				email: "mike.wilson@example.com",
				passwordHash: "hashed_password_mike123",
				role: "stage_manager",
				status: "active",
				profile: {
					firstName: "Mike",
					lastName: "Wilson",
					phone: "+1-555-0789",
				},
			},
			{
				email: "lisa.brown@example.com",
				passwordHash: "hashed_password_lisa123",
				role: "stage_manager",
				status: "active",
				profile: {
					firstName: "Lisa",
					lastName: "Brown",
					phone: "+1-555-0321",
				},
			},
		];

		const createdUsers = [];
		for (const userData of sampleUsers) {
			const user = await createUser(userData);
			createdUsers.push(user);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Sample users created successfully",
				users: createdUsers.map((user) => ({
					id: user.id,
					email: user.email,
					role: user.role,
					status: user.status,
					name: `${user.profile.firstName} ${user.profile.lastName}`,
				})),
			},
		});
	} catch (error) {
		console.error("Init users error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to initialize users",
				},
			},
			{ status: 500 }
		);
	}
}
