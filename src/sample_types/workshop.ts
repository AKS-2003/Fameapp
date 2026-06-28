// Workshop Schedule Builder — Full Data Architecture
// Aligned with the target database schema while keeping local-state compatibility.

// ─── Event ───────────────────────────────────────────────
export interface WSEvent {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  description: string;
  venueName?: string;
  timezone?: string;
  startDate: string;
  endDate: string;
  location: string;
  status: WSEventStatus;
  brandColor: string;
  logoUrl?: string;
  themeSettings?: Record<string, unknown>;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type WSEventStatus = "draft" | "active" | "archived" | "cancelled";

// ─── Day ─────────────────────────────────────────────────
export interface WSDay {
  id: string;
  eventId: string;
  label: string;
  date: string;
  sortOrder: number;
  startTime?: string;   // day-specific override
  endTime?: string;      // day-specific override
  isPublicVisible: boolean;
  draftStatus: WSDraftStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type WSDraftStatus = "draft" | "published";

// ─── Venue ───────────────────────────────────────────────
export interface WSVenue {
  id: string;
  eventId: string;
  name: string;
  address: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Room ────────────────────────────────────────────────
export interface WSRoom {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  shortName?: string;
  capacity?: number;
  sortOrder: number;
  colorTag?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Level ───────────────────────────────────────────────
export interface WSLevel {
  id: string;
  eventId?: string; // null = global
  name: string;
  code: string;
  defaultColor: string; // HSL value
  textColor?: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Convenience type for level codes used in UI
export type WSLevelCode = "BEG" | "INT" | "ADV" | "SPE" | string;

// ─── Category ────────────────────────────────────────────
export interface WSCategory {
  id: string;
  eventId?: string;
  name: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Pass Type ───────────────────────────────────────────
export interface WSPassType {
  id: string;
  eventId?: string;
  name: string;
  code?: string;
  description?: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Artist ──────────────────────────────────────────────
export interface WSArtist {
  id: string;
  eventId?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  bio?: string;
  photoUrl?: string;
  country?: string;
  specialties?: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Convenience alias (used by legacy UI)
  name: string;
}

// ─── Workshop ────────────────────────────────────────────
export type WSWorkshopStatus = "draft" | "confirmed" | "tentative" | "cancelled";

export interface WSWorkshop {
  id: string;
  eventId: string;
  dayId: string;
  venueId?: string;
  roomId: string;
  title: string;
  subtitle?: string;
  description?: string;
  startTime: string;  // "HH:mm"
  endTime: string;    // "HH:mm"
  levelId?: string;
  level: string;      // denormalized level code for fast UI access
  categoryId?: string;
  passTypeId?: string;
  danceStyle?: string;
  capacity?: number;
  status: WSWorkshopStatus;
  isSpecialClass: boolean;
  isBreak: boolean;
  isHidden: boolean;
  isFeatured: boolean;
  isLocked: boolean;
  colorOverride?: string;
  publicNote?: string;
  internalNote?: string;
  sortOrder: number;
  // Denormalized for UI speed — mirrors workshop_artists join
  artistIds: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Workshop–Artist join ────────────────────────────────
export type WSWorkshopArtistRole = "lead" | "co-teacher" | "guest";

export interface WSWorkshopArtist {
  id: string;
  workshopId: string;
  artistId: string;
  role: WSWorkshopArtistRole;
  sortOrder: number;
  createdAt?: string;
}

// ─── Blocked Time ────────────────────────────────────────
export type WSBlockType = "break" | "lunch" | "cleaning" | "rehearsal" | "reserved" | "setup";

export interface WSBlockedTime {
  id: string;
  eventId: string;
  dayId: string;
  roomId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  blockType: WSBlockType;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Schedule Settings ───────────────────────────────────
export interface WSScheduleSettings {
  id: string;
  eventId: string;
  timeSlotMinutes: number;
  snapIntervalMinutes: 5 | 10 | 15 | 30;
  dayStartHour: number;
  dayEndHour: number;
  showLevelLegend: boolean;
  showArtistNames: boolean;
  showFilters: boolean;
  defaultPublicView: "grid" | "list";
  publicThemeMode?: string;
  printThemeMode?: string;
  pdfHeaderNote?: string;
  embedAllowFilters: boolean;
  embedDefaultDay?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Publication Version ─────────────────────────────────
export interface WSPublicationVersion {
  id: string;
  eventId: string;
  versionNumber: number;
  publishedBy?: string;
  publishedAt: string;
  notes?: string;
  isCurrent: boolean;
}

// ─── Audit / Change Log ──────────────────────────────────
export type WSAuditAction = "create" | "update" | "delete" | "move" | "resize" | "publish" | "unpublish";

export interface WSAuditEntry {
  id: string;
  eventId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  actionType: WSAuditAction;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  createdAt: string;
}

// ─── Conflict Detection ──────────────────────────────────
export type WSConflictType = "room_overlap" | "artist_double_booking" | "blocked_time" | "day_range";

export interface WSConflict {
  type: WSConflictType;
  workshopId: string;
  conflictingId: string; // other workshop or blocked time id
  message: string;
  severity: "error" | "warning";
}

// ─── Time Settings (backward compat helper) ──────────────
export interface WSTimeSettings {
  dayStartTime: string;
  dayEndTime: string;
  snapInterval: 5 | 10 | 15 | 30;
}

// ─── Legacy compat: Level config (used by UI color system) ──
export interface WSLevelConfig {
  level: string;
  label: string;
  color: string;
}

// Default level definitions
export const DEFAULT_LEVELS: WSLevel[] = [
  { id: "lvl-beg", name: "Beginner", code: "BEG", defaultColor: "142 70% 45%", sortOrder: 1, isDefault: true },
  { id: "lvl-int", name: "Intermediate", code: "INT", defaultColor: "220 10% 50%", sortOrder: 2, isDefault: true },
  { id: "lvl-adv", name: "Advanced", code: "ADV", defaultColor: "0 70% 50%", sortOrder: 3, isDefault: true },
  { id: "lvl-spe", name: "Special / Masterclass", code: "SPE", defaultColor: "270 60% 45%", sortOrder: 4, isDefault: true },
];

// Convert WSLevel[] to WSLevelConfig[] for backward compat
export const levelsToConfigs = (levels: WSLevel[]): WSLevelConfig[] =>
  levels.map(l => ({
    level: l.code.toLowerCase(),
    label: l.name,
    color: l.defaultColor,
  }));

export const DEFAULT_LEVEL_CONFIGS: WSLevelConfig[] = levelsToConfigs(DEFAULT_LEVELS);
