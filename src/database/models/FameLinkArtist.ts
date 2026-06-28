import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  plan_type: { type: String },
  plan_quantity: { type: Number },
  stripe_customer_id: { type: String },
  stripe_subscription_id: { type: String },
  plan_expiration: { type: String },
  created_at: { type: String },
  updated_at: { type: String }
}, { _id: false });

const MediaFileSchema = new mongoose.Schema({
  url: { type: String },
  type: { type: String, enum: ['image', 'video'] },
  name: { type: String },
  file_path: { type: String },
  size: { type: Number },
  contentType: { type: String }
}, { _id: false });

const MemberSchema = new mongoose.Schema({
  name: { type: String },
  countryLiving: { type: String },
  homeCountry: { type: String }
}, { _id: false });

const TShirtSizeSchema = new mongoose.Schema({
  name: { type: String },
  size: { type: String },
  fit: { type: String, enum: ['oversized', 'regular'] }
}, { _id: false });

const FameLinkArtistSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  artistName: { type: String, required: true },
  country: { type: String },
  city: { type: String },
  tier: { type: String, enum: ['free', 'pro', 'pro_plus'], default: 'free' },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpiry: { type: String },
  lastLoginAt: { type: String },
  subscription: SubscriptionSchema,

  // Extended profile fields
  realName: { type: String },
  phone: { type: String },
  style: { type: String },
  performanceType: { type: String },
  biography: { type: String },
  performanceDuration: { type: Number },

  // Costume
  costumeColor: { type: String },
  costumeColorTwo: { type: String },
  costumeColorThree: { type: String },
  customCostumeColor: { type: String },
  manualCostumeColor: { type: String },
  manualCostumeColorTwo: { type: String },
  manualCostumeColorThree: { type: String },

  // Lights
  lightColorSingle: { type: String },
  lightColorTwo: { type: String },
  lightColorThree: { type: String },
  lightRequests: { type: String },
  manualLightColor: { type: String },
  manualLightColorTwo: { type: String },
  manualLightColorThree: { type: String },

  // Stage Position
  stagePositionStart: { type: String },
  stagePositionEnd: { type: String },
  customStagePosition: { type: String },

  equipment: { type: String },
  showLink: { type: String },
  notes: { type: String },
  mcNotes: { type: String },
  stageManagerNotes: { type: String },
  image_url: { type: String },

  musicTrack: {
    file_url: { type: String },
    file_path: { type: String },
    duration: { type: Number },
    notes: { type: String },
    tempo: { type: String }
  },

  galleryFiles: [MediaFileSchema],
  rehearsalVideo: MediaFileSchema,

  socialMedia: {
    instagram: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    tiktok: { type: String },
    website: { type: String }
  },

  countryLiving: { type: String },
  homeCountry: { type: String },
  members: [MemberSchema],
  tshirtSizes: [TShirtSizeSchema],
  profileComplete: { type: Boolean, default: false }
}, {
  timestamps: true // adds createdAt, updatedAt
});

export default mongoose.models.FameLinkArtist || mongoose.model('FameLinkArtist', FameLinkArtistSchema, 'famelink_artists');
