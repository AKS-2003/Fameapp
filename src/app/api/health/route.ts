import { NextResponse } from "next/server";

export async function GET() {
	try {
		return NextResponse.json(
			{
				status: "healthy",
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV,
				port: process.env.PORT || 3000,
			},
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				error: "Health check failed",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
