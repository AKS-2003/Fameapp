import { NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongodb";
import { getAllUsers } from "@/lib/data-access";

export async function POST() {
	try {
		await connectToDatabase();
		const users = await getAllUsers();

		return NextResponse.json({
			success: true,
			message: "MongoDB connected and initialized",
			userCount: users.length,
		});
	} catch (error) {
		console.error("Error initializing MongoDB:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to connect to MongoDB",
			},
			{ status: 500 }
		);
	}
}
