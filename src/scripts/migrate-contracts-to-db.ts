import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

// Define models locally to avoid import issues in script
const EventDataSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  key: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'famelink_eventdata' });

const EventDataModel = mongoose.models.EventData || mongoose.model('EventData', EventDataSchema);

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in .env");
        return;
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const contractDir = path.join(UPLOADS_ROOT, "contracts");
    if (!fs.existsSync(contractDir)) {
        console.log("No contracts directory found.");
        return;
    }

    const events = fs.readdirSync(contractDir);
    for (const eventId of events) {
        const eventPath = path.join(contractDir, eventId);
        if (!fs.statSync(eventPath).isDirectory()) continue;

        const files = fs.readdirSync(eventPath);
        for (const file of files) {
            if (!file.endsWith(".json")) continue;

            const filePath = path.join(eventPath, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            let key = "";
            switch (file) {
                case "artists.json": key = "contract_artists"; break;
                case "invitations.json": key = "contract_invitations"; break;
                case "conversations.json": key = "contract_conversations"; break;
                case "settings.json": key = "contract_settings"; break;
                case "logistics-registries.json": key = "contract_logistics_registries"; break;
                case "bookings.json": key = "contract_bookings"; break;
                default: continue;
            }

            console.log(`Migrating ${file} for ${eventId} to MongoDB key: ${key}...`);
            await EventDataModel.findOneAndUpdate(
                { eventId, key },
                { eventId, key, data: content },
                { upsert: true }
            );
        }
    }

    console.log("Migration complete!");
    await mongoose.disconnect();
}

migrate().catch(console.error);
