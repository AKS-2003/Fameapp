import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/data-access";
import { hashPassword } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import { User, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
	// Only allow in development
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "NOT_ALLOWED",
					message: "This endpoint is only available in development",
				},
			},
			{ status: 403 }
		);
	}

	try {
		// Create a super admin user
		const superAdmin: User = {
			id: generateId(),
			email: "admin@fame.dev",
			passwordHash: await hashPassword("admin123"),
			role: "super_admin",
			status: "active",
			profile: {
				firstName: "Super",
				lastName: "Admin",
				phone: "+1234567890",
			},
			createdAt: new Date(),
			lastLogin: new Date(),
		};

		// Create the user using data access layer
		await createUser(superAdmin);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Super admin created successfully",
				user: {
					id: superAdmin.id,
					email: superAdmin.email,
					role: superAdmin.role,
					status: superAdmin.status,
				},
			},
		});
	} catch (error) {
		console.error("Error creating super admin:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "CREATE_ERROR",
					message:
						"Failed to create super admin: " +
						(error as Error).message,
				},
			},
			{ status: 500 }
		);
	}
}
