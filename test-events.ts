import { connectToDatabase } from "./src/database/mongodb";
import EventModel from "./src/database/models/Event";

async function test() {
    await connectToDatabase();
    const events = await EventModel.find({}).lean();
    console.log("Total events:", events.length);
    if (events.length > 0) {
        console.log("Latest:", events[events.length - 1]);
    } else {
        console.log("No events found in famelink_events collection.");
    }
    process.exit(0);
}

test().catch(console.error);
