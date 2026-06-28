import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  avatar: { type: String },
  // Artist specific fields inside profile
  artistName: { type: String },
  realName: { type: String },
  performanceStyle: { type: String },
  duration: { type: Number },
  biography: { type: String },
  eventId: { type: String },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  // Mongoose automatically adds an _id, but we keep a custom id if needed for legacy mapping
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["super_admin", "stage_manager", "artist", "dj"],
    required: true 
  },
  status: { 
    type: String, 
    enum: ["active", "pending", "suspended", "deactivated", "rejected"],
    default: "pending" 
  },
  profile: { type: UserProfileSchema, required: true },
  lastLogin: { type: Date, default: Date.now }
}, { 
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Check if the model exists to prevent Next.js hot-reload errors
export default mongoose.models.User || mongoose.model('User', UserSchema);
