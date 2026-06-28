import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongodb";
import TestData from "@/database/models/TestData";

export async function POST(request: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Generate random username and password
    const randomUsername = `testuser_${Math.random().toString(36).substring(2, 8)}`;
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create a new record in the database
    const newTestRecord = await TestData.create({
      username: randomUsername,
      password: randomPassword,
      timestamp: new Date(),
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Data successfully saved to MongoDB!", 
        data: newTestRecord 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Database Test Error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to save data to MongoDB", 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
