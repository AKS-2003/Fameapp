import { Artist, mockArtists } from "./artistContracts";

export interface EventDay {
  id: string;
  label: string;
  date: string; // ISO date
  dayName: string;
}

export const eventDays: EventDay[] = [
  { id: "day-1", label: "Day 1", date: "2026-04-10", dayName: "Friday" },
  { id: "day-2", label: "Day 2", date: "2026-04-11", dayName: "Saturday" },
  { id: "day-3", label: "Day 3", date: "2026-04-12", dayName: "Sunday" },
];

export type LineupStatus = "confirmed" | "pending" | "incomplete";

export interface LineupEntry {
  id: string;
  artistId: string;
  stageName: string;
  legalName: string;
  role: string;
  phone: string;
  email: string;
  status: LineupStatus;
  agreedFee: string;
  workshopsConfirmed: number;
  showsConfirmed: number;
  arrivalDate: string;
  departureDate: string;
  /** Which event days they perform on */
  performanceDays: string[]; // day IDs
  totalPerformances: number;
  profileComplete: boolean;
  contractSigned: boolean;
}

export const lineupStatusLabels: Record<LineupStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  incomplete: "Incomplete",
};

function resolveLineupStatus(artist: Artist): LineupStatus {
  if (artist.status === "confirmed" && artist.contractDocStatus === "confirmed") return "confirmed";
  if (artist.missingItems.length > 0 || artist.profileStatus !== "received") return "incomplete";
  return "pending";
}

function resolvePerformanceDays(artist: Artist): string[] {
  const arrival = artist.agreement.arrivalDate;
  const departure = artist.agreement.departureDate;
  if (!arrival || !departure) return [];
  return eventDays
    .filter((d) => d.date >= arrival && d.date <= departure)
    .map((d) => d.id);
}

/** Build lineup entries from contract data — dancers only */
export function buildLineupFromContracts(): LineupEntry[] {
  return mockArtists
    .filter((a) => a.requestTemplate === "dancer")
    .map((a) => ({
      id: `lineup-${a.id}`,
      artistId: a.id,
      stageName: a.stageName,
      legalName: a.legalName,
      role: a.role === "couple" ? "Couple" : a.role === "solo" ? "Solo" : "Group",
      phone: a.phone,
      email: a.email,
      status: resolveLineupStatus(a),
      agreedFee: a.agreement.agreedFee,
      workshopsConfirmed: a.agreement.workshopsConfirmed,
      showsConfirmed: a.agreement.showsConfirmed,
      arrivalDate: a.agreement.arrivalDate,
      departureDate: a.agreement.departureDate,
      performanceDays: resolvePerformanceDays(a),
      totalPerformances: a.agreement.workshopsConfirmed + a.agreement.showsConfirmed,
      profileComplete: a.profileStatus === "received" && a.missingItems.length === 0,
      contractSigned: a.contractDocStatus === "signed" || a.contractDocStatus === "confirmed",
    }));
}

/** Parse a simple XML artist list into LineupEntry[] */
export function parseArtistXml(xmlString: string): Partial<LineupEntry>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  const artists = doc.querySelectorAll("artist");
  const entries: Partial<LineupEntry>[] = [];

  artists.forEach((node) => {
    const get = (tag: string) => node.querySelector(tag)?.textContent?.trim() ?? "";
    const days: string[] = [];
    node.querySelectorAll("performanceDay").forEach((d) => {
      const val = d.textContent?.trim();
      if (val) days.push(val);
    });

    entries.push({
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stageName: get("stageName") || get("name"),
      legalName: get("legalName") || get("name"),
      role: get("role") || "Solo",
      phone: get("phone"),
      email: get("email"),
      status: "incomplete",
      agreedFee: get("fee"),
      workshopsConfirmed: parseInt(get("workshops")) || 0,
      showsConfirmed: parseInt(get("shows")) || 0,
      arrivalDate: get("arrivalDate"),
      departureDate: get("departureDate"),
      performanceDays: days,
      totalPerformances: (parseInt(get("workshops")) || 0) + (parseInt(get("shows")) || 0),
      profileComplete: false,
      contractSigned: false,
    });
  });
  return entries;
}
