import mongoose from 'mongoose';

const BaseShowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  duration: { type: Number },
  
  // Performance details
  style: { type: String },
  performanceType: { type: String },
  isDraft: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  
  // Artist personal details
  realName: { type: String },
  email: { type: String },
  phone: { type: String },
  countryLiving: { type: String },
  homeCountry: { type: String },
  managedBy: { type: String },
  
  // Stage / Visual
  costumeColor: { type: String },
  costumeColorTwo: { type: String },
  costumeColorThree: { type: String },
  customCostumeColor: { type: String },
  manualCostumeColor: { type: String },
  manualCostumeColorTwo: { type: String },
  manualCostumeColorThree: { type: String },
  lightColorSingle: { type: String },
  lightColorTwo: { type: String },
  lightColorThree: { type: String },
  lightRequests: { type: String },
  manualLightColor: { type: String },
  manualLightColorTwo: { type: String },
  manualLightColorThree: { type: String },
  stagePositionStart: { type: String },
  stagePositionEnd: { type: String },
  customStagePosition: { type: String },
  
  // Media
  profileImage: { type: String },
  musicTrack: { type: mongoose.Schema.Types.Mixed },
  galleryFiles: [{ type: mongoose.Schema.Types.Mixed }],
  rehearsalVideo: { type: mongoose.Schema.Types.Mixed },
  
  // Tech / Notes
  techRider: { type: String },
  equipment: { type: String },
  showLink: { type: String },
  biography: { type: String },
  notes: { type: String },
  mcNotes: { type: String },
  stageManagerNotes: { type: String },
  internalNotes: { type: String },
  
  // Extra data
  socialMedia: { type: mongoose.Schema.Types.Mixed },
  members: [{ type: mongoose.Schema.Types.Mixed }],
  tshirtSizes: [{ type: mongoose.Schema.Types.Mixed }],
  logistics: { type: mongoose.Schema.Types.Mixed },
  
  // Legacy / Misc
  music: { type: mongoose.Schema.Types.Mixed },
  stageVisual: { type: mongoose.Schema.Types.Mixed },
  additionalInfo: { type: mongoose.Schema.Types.Mixed },

  createdAt: { type: String },
  updatedAt: { type: String }
}, { timestamps: true, strict: false });

const EventShowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  artistId: { type: String, required: true, index: true },
  baseShowId: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'draft', 'submitted', 'confirmed', 'cancelled', 'scheduled'],
    default: 'pending'
  },
  performanceStatus: {
    type: String,
    enum: ['not_started', 'scheduled', 'ready', 'performing', 'completed'],
    default: 'not_started'
  },
  overrides: { type: mongoose.Schema.Types.Mixed },
  snapshotJson: { type: mongoose.Schema.Types.Mixed }, // stored as object or JSON string
  snapshotCreatedAt: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
  updatedBy: { type: String }
}, { timestamps: true, strict: false });

const EventRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  eventName: { type: String },
  eventDate: { type: String },
  stageManagerId: { type: String, required: true },
  stageManagerName: { type: String },
  artistEmail: { type: String, required: true },
  artistId: { type: String }, // can be null initially
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  message: { type: String },
  createdAt: { type: String },
  respondedAt: { type: String },
  eventShowId: { type: String }
}, { timestamps: true });

const EventParticipationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  artistId: { type: String, required: true, index: true },
  artistName: { type: String },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'confirmed', 'declined', 'joined', 'withdrawn'],
    default: 'pending'
  },
  baseShowId: { type: String },
  eventShowId: { type: String },
  joinedAt: { type: String },
  submittedAt: { type: String },
  confirmedAt: { type: String },
  declinedAt: { type: String },
  updatedAt: { type: String },
  joinMethod: { type: String, enum: ['link', 'email_invite', 'direct'] },
  shareLinkId: { type: String }
}, { timestamps: true, strict: false });

const PerformanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true },
  eventId: { type: String, required: true, index: true },
  scheduledTime: { type: Date },
  duration: { type: Number },
  order: { type: Number },
  status: { type: String },
  musicRequirements: [{ type: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  type: { type: String },
  title: { type: String },
  message: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ShowInfoRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true, index: true },
  eventId: { type: String },
  status: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const MediaFileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: String, required: true, index: true },
  category: { type: String, enum: ['image', 'audio', 'video', 'document'], required: true },
  eventId: { type: String, index: true } // Optional: track if file belongs to an event context
}, { timestamps: true });

const ShareLinkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  label: { type: String },
  linkType: { type: String, enum: ['show_info', 'logistics_info', 'both'], default: 'show_info' },
  showId: { type: String },
  showName: { type: String },
  showSlug: { type: String },
  thumbnail: { type: String },
  organizerName: { type: String },
  organizerEmail: { type: String },
  emailRestriction: { type: String },
  logisticsPerson: { type: String },
  visibilityLevel: { type: String, enum: ['L1', 'L2', 'L3'], default: 'L1' },
  eventDate: { type: String },
  requestDate: { type: String },
  expiryDate: { type: String },
  status: { type: String, enum: ['sent', 'viewed', 'downloaded'], default: 'sent' },
  viewedAt: { type: Date, default: null },
  downloadedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

const EventDataSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  key: { type: String, required: true }, // e.g., 'emergency-broadcasts', 'chat'
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

EventDataSchema.index({ eventId: 1, key: 1 }, { unique: true });

// EventArtist: Stores FAME/draft artists added by stage managers for a specific event
const EventArtistSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  artistName: { type: String },
  realName: { type: String },
  email: { type: String, index: true },
  phone: { type: String },
  style: { type: String },
  performanceType: { type: String },
  performanceDuration: { type: Number },
  biography: { type: String },
  // Costume
  costumeColor: { type: String },
  costumeColorTwo: { type: String },
  costumeColorThree: { type: String },
  customCostumeColor: { type: String },
  manualCostumeColor: { type: String },
  manualCostumeColorTwo: { type: String },
  manualCostumeColorThree: { type: String },
  // Lighting
  lightColorSingle: { type: String },
  lightColorTwo: { type: String },
  lightColorThree: { type: String },
  lightRequests: { type: String },
  manualLightColor: { type: String },
  manualLightColorTwo: { type: String },
  manualLightColorThree: { type: String },
  // Stage
  stagePositionStart: { type: String },
  stagePositionEnd: { type: String },
  customStagePosition: { type: String },
  // Tech
  equipment: { type: String },
  showLink: { type: String },
  // Notes
  mcNotes: { type: String },
  stageManagerNotes: { type: String },
  notes: { type: String },
  eventName: { type: String },
  // Media
  musicTrack: { type: mongoose.Schema.Types.Mixed },
  galleryFiles: [{ type: mongoose.Schema.Types.Mixed }],
  rehearsalVideo: { type: mongoose.Schema.Types.Mixed },
  image_url: { type: String },
  // Social
  socialMedia: { type: mongoose.Schema.Types.Mixed },
  // People
  members: [{ type: mongoose.Schema.Types.Mixed }],
  tshirtSizes: [{ type: mongoose.Schema.Types.Mixed }],
  managedBy: { type: String },
  // Location
  countryLiving: { type: String },
  homeCountry: { type: String },
  // Performance scheduling
  performance_date: { type: String },
  performanceDate: { type: String },
  performance_order: { type: Number },
  actual_duration: { type: Number },
  // Status
  status: { type: String, default: 'pending', index: true },
  // Timestamps
  createdAt: { type: String },
  updatedAt: { type: String }
}, { timestamps: true, strict: false });

EventArtistSchema.index({ eventId: 1, email: 1 });
EventArtistSchema.index({ eventId: 1, status: 1 });


// ── Force-clear cached models so schema changes take effect on hot-reload ──
if (mongoose.models.EventShow) delete (mongoose.models as any).EventShow;
if (mongoose.models.EventParticipation) delete (mongoose.models as any).EventParticipation;
if (mongoose.models.BaseShow) delete (mongoose.models as any).BaseShow;

export const BaseShowModel = mongoose.model('BaseShow', BaseShowSchema, 'famelink_baseshows');
export const EventShowModel = mongoose.model('EventShow', EventShowSchema, 'famelink_eventshows');
export const EventRequestModel = mongoose.models.EventRequest || mongoose.model('EventRequest', EventRequestSchema, 'famelink_eventrequests');
export const EventParticipationModel = mongoose.model('EventParticipation', EventParticipationSchema, 'famelink_eventparticipations');
export const PerformanceModel = mongoose.models.Performance || mongoose.model('Performance', PerformanceSchema, 'famelink_performances');
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema, 'famelink_notifications');
export const ShowInfoRequestModel = mongoose.models.ShowInfoRequest || mongoose.model('ShowInfoRequest', ShowInfoRequestSchema, 'famelink_showinforequests');
export const ShareLinkModel = mongoose.models.ShareLink || mongoose.model('ShareLink', ShareLinkSchema, 'famelink_sharelinks');
export const MediaFileModel = mongoose.models.MediaFile || mongoose.model('MediaFile', MediaFileSchema, 'famelink_mediafiles');
export const EventDataModel = mongoose.models.EventData || mongoose.model('EventData', EventDataSchema, 'famelink_eventdata');
export const EventArtistModel = mongoose.models.EventArtist || mongoose.model('EventArtist', EventArtistSchema, 'famelink_event_artists');

// ── Event Hotel (accommodation) ──────────────────────────────────────────────
const EventHotelSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  eventId:    { type: String, required: true, index: true },
  name:       { type: String, required: true },
  address:    { type: String },
  phone:      { type: String },
  email:      { type: String },
  mapsLink:   { type: String },
  notes:      { type: String },
  roomRates:  [{ type: mongoose.Schema.Types.Mixed }], // [{ type: "Single", currency: "€", price: 95 }]
  createdAt:  { type: String },
  updatedAt:  { type: String },
}, { timestamps: true, strict: false });

EventHotelSchema.index({ eventId: 1 });

export const EventHotelModel = mongoose.models.EventHotel
  || mongoose.model('EventHotel', EventHotelSchema, 'famelink_event_hotels');

// ── Event Driver (artist transfers) ─────────────────────────────────────────
const EventDriverSchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true },
  eventId:       { type: String, required: true, index: true },
  name:          { type: String, required: true },
  phone:         { type: String },
  whatsapp:      { type: String },
  vehicle:       { type: String },
  capacity:      { type: Number },
  costPerTrip:   { type: Number },
  costPerPerson: { type: Number },
  notes:         { type: String },
  createdAt:     { type: String },
  updatedAt:     { type: String },
}, { timestamps: true, strict: false });

EventDriverSchema.index({ eventId: 1 });

export const EventDriverModel = mongoose.models.EventDriver
  || mongoose.model('EventDriver', EventDriverSchema, 'famelink_event_drivers');

// ── Event Venue (performance locations) ─────────────────────────────────────
const EventVenueSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  eventId:    { type: String, required: true, index: true },
  name:       { type: String, required: true },
  address:    { type: String },
  phone:      { type: String },
  email:      { type: String },
  capacity:   { type: Number },
  mapsLink:   { type: String },
  notes:      { type: String },
  createdAt:  { type: String },
  updatedAt:  { type: String },
}, { timestamps: true, strict: false });

EventVenueSchema.index({ eventId: 1 });

export const EventVenueModel = mongoose.models.EventVenue
  || mongoose.model('EventVenue', EventVenueSchema, 'famelink_event_venues');

// ── Event Catering (food options) ───────────────────────────────────────────
const EventCateringSchema = new mongoose.Schema({
  id:            { type: String, required: true, unique: true },
  eventId:       { type: String, required: true, index: true },
  mealType:      { type: String, required: true }, // Breakfast, Lunch, Dinner, Custom
  name:          { type: String, required: true },
  costPerPerson: { type: Number },
  description:   { type: String },
  notes:         { type: String },
  createdAt:     { type: String },
  updatedAt:     { type: String },
}, { timestamps: true, strict: false });

EventCateringSchema.index({ eventId: 1 });

export const EventCateringModel = mongoose.models.EventCatering
  || mongoose.model('EventCatering', EventCateringSchema, 'famelink_event_catering');

// ── Event Currency (enabled currencies) ─────────────────────────────────────
const EventCurrencySchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  eventId:    { type: String, required: true, index: true },
  code:       { type: String, required: true }, // e.g., USD, EUR
  name:       { type: String, required: true }, // e.g., US Dollar
  symbol:     { type: String }, // e.g., $
  isDefault:  { type: Boolean, default: false },
  createdAt:  { type: String },
  updatedAt:  { type: String },
}, { timestamps: true, strict: false });

EventCurrencySchema.index({ eventId: 1 });
EventCurrencySchema.index({ eventId: 1, code: 1 }, { unique: true });

export const EventCurrencyModel = mongoose.models.EventCurrency
  || mongoose.model('EventCurrency', EventCurrencySchema, 'famelink_event_currencies');

// ── Event Custom Question (logistics questions for artists) ────────────────
const EventCustomQuestionSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  eventId:    { type: String, required: true, index: true },
  text:       { type: String, required: true },
  type:       { type: String, required: true }, // Text, Yes/No, Number, Multiple Choice
  required:   { type: Boolean, default: false },
  options:    [{ type: String }], // Only used for Multiple Choice
  order:      { type: Number, default: 0 },
  createdAt:  { type: String },
  updatedAt:  { type: String },
}, { timestamps: true, strict: false });

EventCustomQuestionSchema.index({ eventId: 1, order: 1 });

export const EventCustomQuestionModel = mongoose.models.EventCustomQuestion
  || mongoose.model('EventCustomQuestion', EventCustomQuestionSchema, 'famelink_event_questions');

// ── Event Logistics Note (internal team notes) ──────────────────────────────
const EventLogisticsNoteSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  eventId:    { type: String, required: true, index: true },
  text:       { type: String, required: true },
  createdAt:  { type: String },
  updatedAt:  { type: String },
}, { timestamps: true, strict: false });

EventLogisticsNoteSchema.index({ eventId: 1, createdAt: -1 });

export const EventLogisticsNoteModel = mongoose.models.EventLogisticsNote
  || mongoose.model('EventLogisticsNote', EventLogisticsNoteSchema, 'famelink_event_logistics_notes');

// ── Artist Logistics (Dedicated collection) ──────────────────────────────────
const ArtistLogisticsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true, index: true },
  actName: { type: String },
  leadContact: { type: String },
  expectedTravelers: { type: Number, default: 0 },
  travelers: [{ type: mongoose.Schema.Types.Mixed }],
  createdAt: { type: String },
  updatedAt: { type: String }
}, { timestamps: true, strict: false });

ArtistLogisticsSchema.index({ artistId: 1 }, { unique: true });

export const ArtistLogisticsModel = mongoose.models.ArtistLogistics
  || mongoose.model('ArtistLogistics', ArtistLogisticsSchema, 'famelink_artist_logistics');

// ── Artist Documents (Dedicated collection) ──────────────────────────────────
const ArtistDocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  artistId: { type: String, required: true, index: true },
  files: [{ type: mongoose.Schema.Types.Mixed }], // Array of file objects
  contractDetails: { type: mongoose.Schema.Types.Mixed }, // Object with legalName, company, etc.
  createdAt: { type: String },
  updatedAt: { type: String }
}, { timestamps: true, strict: false });

ArtistDocumentSchema.index({ artistId: 1 }, { unique: true });

export const ArtistDocumentModel = mongoose.models.ArtistDocument
  || mongoose.model('ArtistDocument', ArtistDocumentSchema, 'famelink_artist_documents');

