import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  venueName: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  description: { type: String },
  logoUrl: { type: String },
  showDates: { type: [String], default: [] },
  stageManagerId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ["draft", "active", "completed", "cancelled", "planning", "registration_open", "live"],
    default: "draft"
  },
  artist_edit_enabled: { type: Boolean, default: false },
  registration_link_enabled: { type: Boolean, default: true },
  // Artist workflow configuration
  contractEnabled: { type: Boolean, default: true },
  logisticsEnabled: { type: Boolean, default: true },
  showInfoEnabled: { type: Boolean, default: true },
  requireContractFirst: { type: Boolean, default: true },
  // Optional backward compatibility fields
  date: { type: Date },
  venue: { type: String },
  registrationUrl: { type: String },
  djId: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String }
}, { 
  timestamps: true,
  strict: false // Allow unknown fields to be saved to avoid silent stripping during migration
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema, 'famelink_events');
