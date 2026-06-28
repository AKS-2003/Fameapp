import { NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongodb";
import EventModel from "@/database/models/Event";

export async function GET() {
    try {
        await connectToDatabase();
        const events = await EventModel.find({}).lean();
        return NextResponse.json({
            count: events.length,
            events: events,
            latest: events[events.length - 1]
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
