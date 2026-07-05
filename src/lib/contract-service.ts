import * as dataAccess from "./data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventDataModel, EventArtistModel, EventShowModel } from "@/database/models/FameLinkModels";

/**
 * ContractService — Purely MongoDB-driven service for Contracts and Negotiations.
 * Data is stored as JSON blobs in the 'famelink_eventdata' collection.
 */
export class ContractService {
	// ===================== ARTISTS =====================

	static async getArtists(eventId: string): Promise<any[]> {
		const data = await dataAccess.getEventData(eventId, "contract_artists");
		return data?.artists || [];
	}

	static async saveArtists(
		eventId: string,
		artists: any[],
	): Promise<boolean> {
		await dataAccess.saveEventData(eventId, "contract_artists", {
			artists,
			updatedAt: new Date().toISOString(),
		});
		return true;
	}

	static async getArtist(
		eventId: string,
		artistId: string,
	): Promise<any | null> {
		await connectToDatabase();
		const doc = await EventDataModel.findOne({
			eventId,
			key: "contract_artists",
			"data.artists.id": artistId
		}).lean() as any;

		if (!doc?.data?.artists) return null;
		return doc.data.artists.find((a: any) => a.id === artistId) || null;
	}

	static async addArtist(eventId: string, artist: any): Promise<boolean> {
		const artists = await this.getArtists(eventId);
		artists.push({
			...artist,
			createdAt: artist.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		return await this.saveArtists(eventId, artists);
	}

	/**
	 * Updates an artist's profile within a contract.
	 * If the artist is not yet in the contract blob, it looks them up in Drafts/FameLink 
	 * and migrates them to the event-specific contract storage.
	 */
	static async updateArtist(
		eventId: string,
		artistId: string,
		updates: any,
	): Promise<boolean> {
		await connectToDatabase();
		const artists = await this.getArtists(eventId);
		let index = artists.findIndex((a: any) => a.id === artistId);

		// First-ever write for this artist — signatureLogEntry just becomes the sole entry.
		if (index === -1 && updates.signatureLogEntry) {
			updates.signatureLog = [updates.signatureLogEntry];
			delete updates.signatureLogEntry;
		}

		if (index === -1) {
			// If not in contract_artists blob, look in other sources (Drafts/FameLink)
			console.log(`[ContractService] Artist ${artistId} not in blob, migrating from Drafts/FameLink...`);
			
			// Use string conversion to avoid Mongoose casting issues with IDs starting with 'artist-'
			const sArtistId = String(artistId);

			const draftArtist = await EventArtistModel.findOne({ 
				eventId, 
				id: sArtistId
			}).lean() as any;
			
			if (draftArtist) {
				artists.push({
					id: draftArtist.id,
					eventId,
					stageName: draftArtist.artistName || "Unknown Artist",
					legalName: draftArtist.realName || draftArtist.artistName || "",
					email: draftArtist.email || "",
					phone: draftArtist.phone || "",
					status: "waiting_info",
					...updates,
					updatedAt: new Date().toISOString(),
				});
				index = artists.length - 1;
			} else {
				// 2. Check FameLink Submissions
				const es = await EventShowModel.findOne({ eventId, artistId: sArtistId }).lean() as any;
				if (es) {
					const FameLinkArtistModel = (await import("@/database/models/FameLinkArtist")).default;
					const freshProfile = await FameLinkArtistModel.findOne({ id: sArtistId }).lean() as any;
					const snapshot = es.snapshotJson ? (typeof es.snapshotJson === "string" ? JSON.parse(es.snapshotJson) : es.snapshotJson) : {};

					artists.push({
						id: sArtistId,
						eventId,
						stageName: freshProfile?.artistName || snapshot.name || "FameLink Artist",
						legalName: freshProfile?.realName || freshProfile?.artistName || snapshot.name || "",
						email: freshProfile?.email || "",
						phone: freshProfile?.phone || "",
						status: "invited",
						...updates,
						updatedAt: new Date().toISOString(),
					});
					index = artists.length - 1;
				}
			}
			
			if (index === -1) {
				console.error(`[ContractService] Artist ${artistId} NOT FOUND in any source for event ${eventId}`);
				return false;
			}
		} else {
			// Update existing blob entry
			const existingArtist = artists[index];

			// Append-only signature history: the caller sends a single new entry via
			// `signatureLogEntry` and we append it to whatever is CURRENTLY in the DB,
			// so a stale client-side copy of the log can never clobber earlier entries.
			if (updates.signatureLogEntry) {
				updates.signatureLog = [
					...(existingArtist.signatureLog || []),
					updates.signatureLogEntry,
				];
				delete updates.signatureLogEntry;
			}

			// Deep merge for 'agreement' to prevent overwriting other tabs (Contract/Schedule/Payment)
			// We only overwrite fields that are explicitly provided in updates.agreement
			if (updates.agreement && existingArtist.agreement) {
				const mergedAgreement = { ...existingArtist.agreement };
				for (const key in updates.agreement) {
					if (updates.agreement[key] !== undefined && updates.agreement[key] !== null) {
						mergedAgreement[key] = updates.agreement[key];
					}
				}
				updates.agreement = mergedAgreement;
			}

			// Deep merge for 'travelLogistics' to prevent overwriting flight documents and other fields
			if (updates.travelLogistics && existingArtist.travelLogistics) {
				const mergedLogistics = { ...existingArtist.travelLogistics };
				
				if (Array.isArray(updates.travelLogistics.flights) && Array.isArray(existingArtist.travelLogistics.flights)) {
					mergedLogistics.flights = updates.travelLogistics.flights.map((newFlight: any) => {
						const oldFlight = existingArtist.travelLogistics.flights.find((of: any) => of.id === newFlight.id);
						if (oldFlight) {
							return {
								...oldFlight,
								...newFlight,
								// Restore screenshot/document if omitted
								screenshotUrl: newFlight.screenshotUrl !== undefined ? newFlight.screenshotUrl : oldFlight.screenshotUrl,
								documentName: newFlight.documentName !== undefined ? newFlight.documentName : oldFlight.documentName,
							};
						}
						return newFlight;
					});
				} else if (updates.travelLogistics.flights) {
					mergedLogistics.flights = updates.travelLogistics.flights;
				}

				// Merge other top-level logistics fields
				for (const key in updates.travelLogistics) {
					if (key !== 'flights' && updates.travelLogistics[key] !== undefined && updates.travelLogistics[key] !== null) {
						mergedLogistics[key] = updates.travelLogistics[key];
					}
				}
				updates.travelLogistics = mergedLogistics;
			}

			artists[index] = {
				...existingArtist,
				...updates,
				updatedAt: new Date().toISOString(),
			};
		}

		// Cascade confirmation to other models (EventArtistModel, EventParticipationModel, EventShowModel)
		if (updates.contractDocStatus === "confirmed") {
			const sArtistId = String(artistId);
			
			// 1. Update EventArtistModel
			try {
				const { EventArtistModel } = await import("@/database/models/FameLinkModels");
				await EventArtistModel.updateOne(
					{ id: sArtistId, eventId },
					{ $set: { status: "confirmed", contractDocStatus: "confirmed" } }
				);
			} catch (err) {
				console.error("[ContractService.updateArtist] Failed to update EventArtistModel:", err);
			}

			// 2. Update EventParticipationModel
			try {
				const { EventParticipationModel } = await import("@/database/models/FameLinkModels");
				await EventParticipationModel.updateOne(
					{ artistId: sArtistId, eventId },
					{ $set: { status: "confirmed", confirmedAt: new Date().toISOString() } }
				);
			} catch (err) {
				console.error("[ContractService.updateArtist] Failed to update EventParticipationModel:", err);
			}

			// 3. Update EventShowModel overrides
			try {
				const { EventShowModel } = await import("@/database/models/FameLinkModels");
				const es = await EventShowModel.findOne({ artistId: sArtistId, eventId }).lean() as any;
				if (es) {
					await EventShowModel.updateOne(
						{ id: es.id },
						{
							$set: {
								status: "confirmed",
								"overrides.isConfirmed": true,
								"overrides.status": "confirmed",
								"overrides.performanceStatus": "confirmed",
							}
						}
					);
				}
			} catch (err) {
				console.error("[ContractService.updateArtist] Failed to update EventShowModel:", err);
			}
		}
		
		console.log(`[ContractService] Saving update for artist ${artistId} in event ${eventId}`);
		return await this.saveArtists(eventId, artists);
	}

	static async addStageDiscussionMessage(
		eventId: string,
		artistId: string,
		message: any,
	): Promise<boolean> {
		await connectToDatabase();
		const artists = await this.getArtists(eventId);
		const index = artists.findIndex((a: any) => a.id === artistId);
		
		if (index === -1) return false;
		
		if (!artists[index].agreement) artists[index].agreement = {};
		// Support both for migration, but prefer stageDiscussion
		const discussion = artists[index].agreement.stageDiscussion || artists[index].agreement.discussion || [];
		
		discussion.push({
			...message,
			timestamp: message.timestamp || new Date().toISOString(),
		});
		
		artists[index].agreement.stageDiscussion = discussion;
		artists[index].updatedAt = new Date().toISOString();
		return await this.saveArtists(eventId, artists);
	}

	static async deleteArtist(
		eventId: string,
		artistId: string,
	): Promise<boolean> {
		const artists = await this.getArtists(eventId);
		const filtered = artists.filter((a: any) => a.id !== artistId);
		if (filtered.length === artists.length) return false;
		return await this.saveArtists(eventId, filtered);
	}

	// ===================== INVITATIONS =====================

	static async getInvitations(eventId: string): Promise<any[]> {
		const data = await dataAccess.getEventData(eventId, "contract_invitations");
		return data?.invitations || [];
	}

	static async saveInvitations(
		eventId: string,
		invitations: any[],
	): Promise<boolean> {
		await dataAccess.saveEventData(eventId, "contract_invitations", {
			invitations,
			updatedAt: new Date().toISOString(),
		});
		return true;
	}

	static async addInvitation(
		eventId: string,
		invitation: any,
	): Promise<boolean> {
		const invitations = await this.getInvitations(eventId);
		invitations.push({
			...invitation,
			createdAt: invitation.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		return await this.saveInvitations(eventId, invitations);
	}

	// ===================== CONVERSATIONS =====================

	static async getConversations(eventId: string): Promise<any[]> {
		const data = await dataAccess.getEventData(
			eventId,
			"contract_conversations",
		);
		return data?.messages || [];
	}

	static async saveConversations(
		eventId: string,
		messages: any[],
	): Promise<boolean> {
		await dataAccess.saveEventData(eventId, "contract_conversations", {
			messages,
			updatedAt: new Date().toISOString(),
		});
		return true;
	}

	static async addConversationMessage(
		eventId: string,
		message: any,
	): Promise<boolean> {
		const messages = await this.getConversations(eventId);
		messages.push({
			...message,
			timestamp: message.timestamp || new Date().toISOString(),
		});
		return await this.saveConversations(eventId, messages);
	}

	static async getConversationsForArtist(
		eventId: string,
		artistId: string,
	): Promise<any[]> {
		const all = await this.getConversations(eventId);
		return all.filter((m: any) => m.artistId === artistId);
	}

	// ===================== SETTINGS =====================

	static async getSettings(eventId: string): Promise<any | null> {
		return await dataAccess.getEventData(eventId, "contract_settings");
	}

	static async saveSettings(eventId: string, settings: any): Promise<boolean> {
		await dataAccess.saveEventData(eventId, "contract_settings", {
			...settings,
			updatedAt: new Date().toISOString(),
		});
		return true;
	}

	// ===================== INITIALIZE =====================

	static async initializeContractData(eventId: string): Promise<boolean> {
		try {
			const settings = await dataAccess.getEventData(eventId, "contract_settings");
			if (!settings) {
				await dataAccess.saveEventData(eventId, "contract_settings", {
					eventId,
					defaultCurrency: "EUR",
					defaultHotelCostPerNight: 120,
					defaultTransportCost: 80,
					defaultFoodCostPerDay: 35,
					customQuestions: [],
					updatedAt: new Date().toISOString(),
				});
			}
			return true;
		} catch (error) {
			console.error(`Error initializing contract data for event ${eventId}:`, error);
			return false;
		}
	}
}
