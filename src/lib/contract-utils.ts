import { ContractService } from "./contract-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, EventShowModel, EventParticipationModel, ArtistLogisticsModel } from "@/database/models/FameLinkModels";
import { getEventShowsByEvent, getEventParticipationsByEvent } from "./data-access";

/** Safely parse snapshotJson — may be stored as a JSON string or already an object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
	return raw;
}

/**
 * Unified function to get all artists for an event, combining:
 * 1. Manually added contract artists (GCS/JSON)
 * 2. Draft artists (EventArtistModel)
 * 3. FameLink participants (EventParticipationModel + EventShowModel)
 */
export async function getUnifiedArtistsForEvent(eventId: string) {
	await connectToDatabase();

	// 1. Contract-specific artists (manually added via the contracts UI)
	const contractArtists = await ContractService.getArtists(eventId);
	const contractArtistIds = new Set(contractArtists.map((a: any) => a.id));

	// 2. FAME draft artists from EventArtistModel (added by stage manager)
	const draftArtists = (await EventArtistModel.find({ eventId }).lean()) as any[];

	// 3. FameLink EventShow submissions & participations
	const [eventShows, participations] = await Promise.all([
		getEventShowsByEvent(eventId),
		getEventParticipationsByEvent(eventId),
	]);

	// Extract unique artist IDs and emails associated with this event
	const associatedArtistIds = new Set<string>();
	const associatedEmails = new Set<string>();

	contractArtists.forEach((a: any) => {
		if (a.id) associatedArtistIds.add(a.id);
		if (a.email) associatedEmails.add(a.email.toLowerCase().trim());
	});

	draftArtists.forEach((a: any) => {
		if (a.id) associatedArtistIds.add(a.id);
		if (a.email) associatedEmails.add(a.email.toLowerCase().trim());
	});

	eventShows.forEach((es: any) => {
		if (es.artistId) associatedArtistIds.add(es.artistId);
	});

	participations.forEach((p: any) => {
		if (p.artistId) associatedArtistIds.add(p.artistId);
	});

	// Query ONLY the associated FameLink artists from DB (massive speedup!)
	const queryConditions: any[] = [];
	if (associatedArtistIds.size > 0) {
		queryConditions.push({ id: { $in: Array.from(associatedArtistIds) } });
	}
	if (associatedEmails.size > 0) {
		queryConditions.push({ email: { $in: Array.from(associatedEmails) } });
	}

	let allFameLinkArtists: any[] = [];
	if (queryConditions.length > 0) {
		const FameLinkArtistModel = (await import("@/database/models/FameLinkArtist")).default;
		allFameLinkArtists = await FameLinkArtistModel.find({ $or: queryConditions }).lean() as any[];
	}

	const artistProfileMap = new Map(allFameLinkArtists.map((a: any) => [a.id, a]));

	// Batch-fetch all logistics docs for all artist IDs involved
	const allArtistIds = [
		...contractArtists.map((a: any) => a.id),
		...draftArtists.map((a: any) => a.id),
		...allFameLinkArtists.map((a: any) => a.id),
	].filter(Boolean);
	const allLogisticsDocs = await ArtistLogisticsModel.find({ artistId: { $in: allArtistIds } }).lean();
	const logisticsMap = new Map((allLogisticsDocs as any[]).map((doc: any) => [doc.artistId, doc]));

	// Helper to find logistics by artist id or by email match
	const getLogisticsForArtist = (artistId: string, email?: string): any => {
		if (logisticsMap.has(artistId)) return logisticsMap.get(artistId);
		if (email) {
			const profileByEmail = allFameLinkArtists.find((p: any) => p.email && p.email.toLowerCase() === email.toLowerCase()) as any;
			if (profileByEmail && logisticsMap.has(profileByEmail.id)) return logisticsMap.get(profileByEmail.id);
		}
		return null;
	};

	// Convert FAME draft artists to ContractArtist format
	const mappedDraftArtists = draftArtists
		.filter((a: any) => !contractArtistIds.has(a.id))
		.map((a: any) => ({
			id: a.id,
			eventId,
			stageName: a.artistName || "Unknown Artist",
			legalName: a.realName || a.artistName || "",
			email: a.email || "",
			phone: a.phone || "",
			image: a.image || a.profileImage || a.image_url || "",
			country: a.country || a.countryLiving || a.homeCountry || "",
			city: a.city || "",
			nationality: "",
			nearestAirport: "",
			travelPreferences: "",
			dietaryPreferences: "",
			hotelRoomPreference: "",
			role: a.performanceType === "DJ" ? "dj" : a.performanceType === "Group" || a.performanceType === "Band" ? "group" : "solo",
			requestTemplate: "dancer",
			status: a.status === "confirmed" ? "confirmed" : a.status === "pending" ? "waiting_info" : "invited",
			contractDocStatus: "draft",
			profileStatus: a.status === "confirmed" ? "complete" : "requested",
			missingItems: [],
			agreement: {
				agreedFee: "", paymentSchedule: "", paymentMethod: "",
				workshopsConfirmed: 0, workshopDaysAgreed: 0, showsConfirmed: 0,
				djSets: 0, panels: 0, hotelNights: 0, roomSharing: "",
				airportTransfer: false, foodVouchers: false, flightBudget: "",
				travelClass: "", arrivalDate: "", departureDate: "",
				promoObligations: "", socialMediaPosts: 0, ambassadorTasks: "",
				payments: { feePaid: false, flightsPaid: false, hotelPaid: false, transportPaid: false, foodPaid: false },
			},
			groupMembers: a.members || [],
			travelLogistics: {
				flights: [], hotelBookingFile: "", workshopSchedule: "",
				pickupInfo: "", dropoffInfo: "", additionalNotes: "",
				driverName: "", driverPhone: "", driverNotes: "",
				hotelId: "", hotelName: "", hotelAddress: "",
				hotelMapLink: "", hotelCheckIn: "", hotelCheckOut: "",
				hotelNotes: "", hotelRooms: [], eventVenueName: "",
				eventVenueAddress: "", eventVenueMapLink: "",
			},
			eventQuestions: [],
			// ── Persist workflow fields saved by stage manager ──
			workflowContract: a.workflowContract || "Required",
			workflowLogistics: a.workflowLogistics || "Required",
			workflowShow: a.workflowShow || "Required",
			// ── Persist color/tag fields ──
			artists_page_color: a.artists_page_color || a.artistsPageColor || undefined,
			artists_page_tag: a.artists_page_tag || a.artistsPageTag || undefined,
			createdAt: a.createdAt || new Date().toISOString(),
			updatedAt: a.updatedAt || new Date().toISOString(),
			famelinkArtistId: a.famelinkArtistId || "",
		}));

	// Convert FameLink EventShow submissions to ContractArtist format
	const fameLinkContractArtists: any[] = [];
	const coveredIds = new Set([...contractArtistIds, ...draftArtists.map((a: any) => a.id)]);
	for (const es of eventShows) {
		if (coveredIds.has(es.artistId)) continue;
		if (!es.snapshotJson) continue;
		const snapshot = parseSnapshot(es.snapshotJson);
		const freshProfile = artistProfileMap.get(es.artistId) as any;
		const participation = participations.find(p => p.artistId === es.artistId && p.eventId === eventId);
		fameLinkContractArtists.push({
			id: es.artistId,
			eventId,
			stageName: freshProfile?.artistName || snapshot.name || "FameLink Artist",
			legalName: freshProfile?.realName || snapshot.name || "",
			email: freshProfile?.email || "",
			phone: freshProfile?.phone || "",
			image: freshProfile?.image_url || snapshot.image_url || snapshot.image || snapshot.profilePic || "",
			country: (freshProfile?.country && freshProfile.country !== "null") ? freshProfile.country : 
					 (freshProfile?.countryLiving && freshProfile.countryLiving !== "null") ? freshProfile.countryLiving : 
					 (snapshot.countryLiving && snapshot.countryLiving !== "null") ? snapshot.countryLiving : "",
			city: (freshProfile?.city && freshProfile.city !== "null") ? freshProfile.city : "",
			nationality: "",
			nearestAirport: "",
			travelPreferences: "",
			dietaryPreferences: "",
			hotelRoomPreference: "",
			role: "solo",
			requestTemplate: "dancer",
			status: participation?.status === "confirmed" ? "confirmed" : (participation?.status === "submitted" || participation?.status === "pending") ? "waiting_info" : "invited",
			contractDocStatus: "draft",
			profileStatus: "complete",
			missingItems: [],
			agreement: {
				agreedFee: snapshot.fee || snapshot.proposedFee || "", paymentSchedule: "", paymentMethod: "",
				workshopsConfirmed: 0, workshopDaysAgreed: 0, showsConfirmed: 0,
				djSets: 0, panels: 0, hotelNights: 0, roomSharing: "",
				airportTransfer: false, foodVouchers: false, flightBudget: "",
				travelClass: "", arrivalDate: "", departureDate: "",
				promoObligations: "", socialMediaPosts: 0, ambassadorTasks: "",
				payments: { feePaid: false, flightsPaid: false, hotelPaid: false, transportPaid: false, foodPaid: false },
				proposedFee: snapshot.fee || snapshot.proposedFee || "",
			},
			groupMembers: snapshot.members || [],
			travelLogistics: {
				flights: [], hotelBookingFile: "", workshopSchedule: "",
				pickupInfo: "", dropoffInfo: "", additionalNotes: "",
				driverName: "", driverPhone: "", driverNotes: "",
				hotelId: "", hotelName: "", hotelAddress: "",
				hotelMapLink: "", hotelCheckIn: "", hotelCheckOut: "",
				hotelNotes: "", hotelRooms: [], eventVenueName: "",
				eventVenueAddress: "", eventVenueMapLink: "",
			},
			eventQuestions: [],
			isFameLinkArtist: true,
			logistics: getLogisticsForArtist(es.artistId, freshProfile?.email) || freshProfile?.logistics || null,
			eventShowId: es.id,
			// ── Workflow fields saved in EventShow.overrides by stage manager ──
			workflowContract: es.overrides?.workflowContract || "Required",
			workflowLogistics: es.overrides?.workflowLogistics || "Required",
			workflowShow: es.overrides?.workflowShow || "Required",
			// ── Color/tag fields saved in EventShow.overrides ──
			artists_page_color: es.overrides?.artistsPageColor || undefined,
			artists_page_tag: es.overrides?.artistsPageTag || undefined,
			createdAt: es.createdAt || new Date().toISOString(),
			updatedAt: es.updatedAt || new Date().toISOString(),
		});
		coveredIds.add(es.artistId);
	}
	// Enrich contract artists with fresh FameLink profile data (city, country, etc.)
	let hasDbUpdates = false;
	const enrichedContractArtists = contractArtists.map((a: any) => {
		// 1. Try matching by ID
		let freshProfile = artistProfileMap.get(a.id) as any;
		
		// 2. If no ID match, try matching by email (case-insensitive)
		if (!freshProfile && a.email) {
			const searchEmail = a.email.toLowerCase().trim();
			freshProfile = allFameLinkArtists.find((p: any) => 
				p.email && p.email.toLowerCase().trim() === searchEmail
			);
		}

		if (freshProfile) {
			const stageName = (a.stageName && a.stageName !== "FameLink Artist") ? a.stageName : (freshProfile.artistName || a.stageName || "Unknown Artist");
			const legalName = a.legalName || freshProfile.realName || freshProfile.artistName || "";

			if (a.stageName !== stageName || a.legalName !== legalName) {
				a.stageName = stageName;
				a.legalName = legalName;
				hasDbUpdates = true;
			}

			return {
				...a,
				city: (a.city && a.city !== "null") ? a.city : (freshProfile.city && freshProfile.city !== "null") ? freshProfile.city : "",
				country: (a.country && a.country !== "null") ? a.country : 
						 (freshProfile.country && freshProfile.country !== "null") ? freshProfile.country : 
						 (freshProfile.countryLiving && freshProfile.countryLiving !== "null") ? freshProfile.countryLiving : "",
				stageName,
				legalName,
				email: a.email || freshProfile.email || "",
				phone: a.phone || freshProfile.phone || "",
				image: a.image || a.profileImage || freshProfile.image_url || "",
				logistics: getLogisticsForArtist(freshProfile.id, freshProfile.email) || freshProfile.logistics || null,
			};
		}
		return a;
	});

	if (hasDbUpdates) {
		console.log(`[getUnifiedArtistsForEvent] Automatically updating stageName/legalName in DB for event ${eventId}`);
		await ContractService.saveArtists(eventId, enrichedContractArtists);
	}

	// Enrich draft artists with fresh FameLink profile data
	const enrichedDraftArtists = mappedDraftArtists.map((a: any) => {
		// Try matching by email since draft artists may have different IDs
		if (a.email) {
			const searchEmail = a.email.toLowerCase().trim();
			const byEmail = allFameLinkArtists.find((p: any) => 
				p.email && p.email.toLowerCase().trim() === searchEmail
			);
			
			if (byEmail) {
				return {
					...a,
					city: (a.city && a.city !== "null") ? a.city : (byEmail.city && byEmail.city !== "null") ? byEmail.city : "",
					country: (a.country && a.country !== "null") ? a.country : 
							 (byEmail.country && byEmail.country !== "null") ? byEmail.country : 
							 (byEmail.countryLiving && byEmail.countryLiving !== "null") ? byEmail.countryLiving : "",
					// Also update names if they exist in profile
					stageName: (byEmail as any).artistName || a.stageName || "Unknown Artist",
					legalName: (byEmail as any).realName || a.legalName || "",
					image: a.image || a.profileImage || (byEmail as any).image_url || "",
					logistics: getLogisticsForArtist((byEmail as any).id, (byEmail as any).email) || (byEmail as any).logistics || null,
				};
			}
		}
		return a;
	});

	console.log(`[getUnifiedArtistsForEvent] Event=${eventId}: enriched ${enrichedContractArtists.length} contract, ${enrichedDraftArtists.length} draft, ${fameLinkContractArtists.length} famelink artists.`);
	
	return [...enrichedContractArtists, ...enrichedDraftArtists, ...fameLinkContractArtists];
}

/**
 * Scans all artists in the event and automatically extracts any heavy Base64 flight screenshots,
 * saving them as static files under /uploads/ and replacing their URL references in the database.
 * This instantly shrinks the database document size and makes database operations lightning-fast.
 */
export async function migrateBase64Screenshots(eventId: string) {
	try {
		const artists = await ContractService.getArtists(eventId);
		let hasChanges = false;

		const { promises: fsPromises } = await import("fs");
		const { join } = await import("path");
		const { existsSync } = await import("fs");

		for (let i = 0; i < artists.length; i++) {
			const artist = artists[i];
			if (artist.travelLogistics && Array.isArray(artist.travelLogistics.flights)) {
				for (let j = 0; j < artist.travelLogistics.flights.length; j++) {
					const flight = artist.travelLogistics.flights[j];
					if (flight.screenshotUrl && flight.screenshotUrl.startsWith("data:")) {
						// Extract base64 details
						const parts = flight.screenshotUrl.split(",");
						if (parts.length >= 2) {
							const metadata = parts[0];
							const base64Data = parts[1];
							
							// Detect extension
							let ext = "png";
							if (metadata.includes("pdf")) ext = "pdf";
							else if (metadata.includes("jpeg") || metadata.includes("jpg")) ext = "jpg";
							
							const buffer = Buffer.from(base64Data, "base64");
							const uploadDir = join(process.cwd(), "public", "uploads");
							
							if (!existsSync(uploadDir)) {
								await fsPromises.mkdir(uploadDir, { recursive: true });
							}
							
							const filename = `migrated-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
							const filepath = join(uploadDir, filename);
							
							await fsPromises.writeFile(filepath, buffer);
							
							// Replace with clean URL
							flight.screenshotUrl = `/uploads/${filename}`;
							hasChanges = true;
							console.log(`[Base64 Migration] Migrated flight screenshot for artist ${artist.id} in event ${eventId} to ${flight.screenshotUrl}`);
						}
					}
				}
			}
		}

		if (hasChanges) {
			console.log(`[Base64 Migration] Saving shrunk artists blob for event ${eventId} (Base64 screenshots cleared)`);
			await ContractService.saveArtists(eventId, artists);
		}
	} catch (err) {
		console.error("[Base64 Migration] Error migrating screenshots:", err);
	}
}

