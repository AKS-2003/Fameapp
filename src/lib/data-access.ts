import { User, Event, Performance } from "@/types";
import {
	BaseShow,
	EventShow,
	EventShowOverrides,
	EventRequest,
	EventRequestStatus,
	EventParticipation,
	generateSlug,
} from "@/types/famelink";
import { connectToDatabase } from "@/database/mongodb";
import UserModel from "@/database/models/User";
import EventModel from "@/database/models/Event";
import FameLinkArtistModel from "@/database/models/FameLinkArtist";
import {
	BaseShowModel,
	EventShowModel,
	EventRequestModel,
	EventParticipationModel,
	PerformanceModel,
	NotificationModel,
	ShowInfoRequestModel,
	ShareLinkModel,
	MediaFileModel,
	EventDataModel,
	EventArtistModel,
	EventHotelModel,
	EventDriverModel,
	EventVenueModel,
	EventCateringModel,
	EventCurrencyModel,
	EventCustomQuestionModel,
	EventLogisticsNoteModel,
	ArtistMeProfileModel
} from "@/database/models/FameLinkModels";

// Data access layer fully backed by MongoDB
class DataAccess {
	async getAllUsers(): Promise<User[]> {
		await connectToDatabase();
		const users = await UserModel.find({}).lean();
		return users.map((u: any) => ({ ...u, id: u.id || u._id.toString() })) as User[];
	}

	async getUserById(id: string): Promise<User | null> {
		await connectToDatabase();
		const user = await UserModel.findOne({ id }).lean();
		if (!user) return null;
		return { ...user, id: user.id || user._id.toString() } as User;
	}

	async getUserByEmail(email: string): Promise<User | null> {
		await connectToDatabase();
		const user = await UserModel.findOne({ email }).lean();
		if (!user) return null;
		return { ...user, id: user.id || user._id.toString() } as User;
	}

	async createUser(user: User): Promise<void> {
		await connectToDatabase();
		await UserModel.create(user);
	}

	async updateUser(user: User): Promise<void> {
		await connectToDatabase();
		await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true });
	}

	async deactivateUser(userId: string): Promise<void> {
		await connectToDatabase();
		await UserModel.findOneAndUpdate({ id: userId }, { status: "deactivated" });
	}

	async changeUserPassword(userId: string, newPasswordHash: string): Promise<void> {
		await connectToDatabase();
		await UserModel.findOneAndUpdate({ id: userId }, { passwordHash: newPasswordHash });
	}

	async deleteUser(userId: string): Promise<void> {
		await connectToDatabase();
		await UserModel.deleteOne({ id: userId });
	}

	async getPendingStageManagers(): Promise<User[]> {
		await connectToDatabase();
		const users = await UserModel.find({ role: "stage_manager", status: "pending" }).lean();
		return users.map((u: any) => ({ ...u, id: u.id || u._id.toString() })) as User[];
	}

	async addPendingStageManager(user: User): Promise<void> {
		await connectToDatabase();
		user.status = "pending";
		await UserModel.create(user);
	}

	async approvePendingStageManager(userId: string): Promise<void> {
		await connectToDatabase();
		await UserModel.findOneAndUpdate({ id: userId, role: "stage_manager" }, { status: "active" });
	}

	async rejectPendingStageManager(userId: string): Promise<void> {
		await connectToDatabase();
		await UserModel.deleteOne({ id: userId, status: "pending" });
	}

	async getAllEvents(): Promise<Event[]> {
		await connectToDatabase();
		return EventModel.find({}).lean() as unknown as Event[];
	}

	async getEventById(eventId: string): Promise<Event | null> {
		await connectToDatabase();
		return EventModel.findOne({ id: eventId }).lean() as unknown as Event | null;
	}

	async createEvent(event: Event): Promise<void> {
		await connectToDatabase();
		await EventModel.create(event);
	}

	async updateEvent(event: Event): Promise<void> {
		await connectToDatabase();
		await EventModel.findOneAndUpdate({ id: event.id }, event, { upsert: true });
	}

	async deleteEvent(eventId: string): Promise<void> {
		await connectToDatabase();
		
		// 1. Delete the event itself
		await EventModel.deleteOne({ id: eventId });
		
		// 2. Cascade delete all related records in MongoDB
		// This ensures that artists don't see "Unknown Event" or orphaned contracts
		await Promise.all([
			EventShowModel.deleteMany({ eventId }),
			EventParticipationModel.deleteMany({ eventId }),
			EventRequestModel.deleteMany({ eventId }),
			EventArtistModel.deleteMany({ eventId }),
			EventDataModel.deleteMany({ eventId }),
			PerformanceModel.deleteMany({ eventId }),
			EventHotelModel.deleteMany({ eventId }),
			EventDriverModel.deleteMany({ eventId }),
			EventVenueModel.deleteMany({ eventId }),
			EventCateringModel.deleteMany({ eventId }),
			EventCurrencyModel.deleteMany({ eventId }),
			EventCustomQuestionModel.deleteMany({ eventId }),
			EventLogisticsNoteModel.deleteMany({ eventId }),
			MediaFileModel.deleteMany({ eventId })
		]);

		console.log(`[DataAccess] Cascade deleted all records for event: ${eventId}`);
	}

	async getEventsByStageManager(stageManagerId: string): Promise<Event[]> {
		await connectToDatabase();
		return EventModel.find({ stageManagerId }).lean() as unknown as Event[];
	}

	async getPerformancesByEvent(eventId: string): Promise<Performance[]> {
		await connectToDatabase();
		return PerformanceModel.find({ eventId }).lean() as unknown as Performance[];
	}

	async createPerformance(performance: Performance): Promise<void> {
		await connectToDatabase();
		await PerformanceModel.create(performance);
	}

	async updatePerformance(performance: Performance): Promise<void> {
		await connectToDatabase();
		await PerformanceModel.findOneAndUpdate({ id: performance.id }, performance, { upsert: true });
	}

	async getNextCounter(counterName: string): Promise<number> {
		return Date.now() + Math.floor(Math.random() * 1000);
	}

	async getNotifications(userId: string): Promise<any[]> {
		await connectToDatabase();
		return NotificationModel.find({ userId }).lean();
	}

	async addNotification(userId: string, notification: any): Promise<void> {
		await connectToDatabase();
		await NotificationModel.create({ ...notification, userId, id: String(Date.now()) });
	}

	async updateNotification(userId: string, notificationId: string, updates: any): Promise<void> {
		await connectToDatabase();
		await NotificationModel.findOneAndUpdate({ id: notificationId, userId }, updates);
	}

	async getAllShowInfoRequests(): Promise<any[]> {
		await connectToDatabase();
		return ShowInfoRequestModel.find({}).lean();
	}

	async getShowInfoRequestsByArtist(artistId: string): Promise<any[]> {
		await connectToDatabase();
		return ShowInfoRequestModel.find({ artistId }).lean();
	}

	async createShowInfoRequest(request: any): Promise<any> {
		await connectToDatabase();
		await ShowInfoRequestModel.create(request);
		return request;
	}

	async updateShowInfoRequest(requestId: string, updates: any): Promise<void> {
		await connectToDatabase();
		await ShowInfoRequestModel.findOneAndUpdate({ id: requestId }, updates);
	}

	async createTestData(): Promise<void> {
		console.log("Test data handled via DB");
	}

	async saveMediaFile(file: any): Promise<void> {
		await connectToDatabase();
		await MediaFileModel.create(file);
	}

	async getMediaFilesByUser(userId: string): Promise<any[]> {
		await connectToDatabase();
		return MediaFileModel.find({ uploadedBy: userId }).lean();
	}

	async getMediaFilesByEvent(eventId: string, userId: string): Promise<any[]> {
		await connectToDatabase();
		return MediaFileModel.find({ eventId, uploadedBy: userId }).lean();
	}

	async getMediaFileById(id: string): Promise<any | null> {
		await connectToDatabase();
		return MediaFileModel.findOne({ id }).lean();
	}

	async deleteMediaFile(id: string): Promise<void> {
		await connectToDatabase();
		await MediaFileModel.deleteOne({ id });
	}

	// Merged from FameLinkDataAccess
	async getAllFameLinkArtists(): Promise<FameLinkArtistProfile[]> {
		await connectToDatabase();
		return FameLinkArtistModel.find({}).lean() as unknown as FameLinkArtistProfile[];
	}

	async getFameLinkArtistById(artistId: string): Promise<FameLinkArtistProfile | null> {
		await connectToDatabase();
		let artist = await FameLinkArtistModel.findOne({ id: artistId }).lean() as unknown as FameLinkArtistProfile | null;
		if (!artist) {
			artist = await FameLinkArtistModel.findOne({ userId: artistId }).lean() as unknown as FameLinkArtistProfile | null;
		}
		return artist;
	}

	async getFameLinkArtistByEmail(email: string): Promise<FameLinkArtistProfile | null> {
		await connectToDatabase();
		return FameLinkArtistModel.findOne({ email: email.toLowerCase() }).lean() as unknown as FameLinkArtistProfile | null;
	}

	async getFameLinkArtistByVerificationToken(token: string): Promise<FameLinkArtistProfile | null> {
		await connectToDatabase();
		return FameLinkArtistModel.findOne({ verificationToken: token }).lean() as unknown as FameLinkArtistProfile | null;
	}

	async createFameLinkArtist(artist: FameLinkArtistProfile): Promise<FameLinkArtistProfile> {
		await connectToDatabase();
		await FameLinkArtistModel.create(artist as any);
		return artist;
	}

	async updateFameLinkArtist(artist: FameLinkArtistProfile): Promise<FameLinkArtistProfile> {
		await connectToDatabase();
		await FameLinkArtistModel.findOneAndUpdate({ id: artist.id }, artist as any, { upsert: true });
		return artist;
	}

	async verifyFameLinkArtistEmail(token: string): Promise<boolean> {
		await connectToDatabase();
		const artist = await FameLinkArtistModel.findOne({ verificationToken: token });
		if (!artist || (artist.verificationTokenExpiry && new Date(artist.verificationTokenExpiry) < new Date())) {
			return false;
		}
		artist.emailVerified = true;
		artist.verificationToken = undefined;
		artist.verificationTokenExpiry = undefined;
		await artist.save();
		return true;
	}

	async deleteFameLinkArtist(artistId: string): Promise<void> {
		await connectToDatabase();
		await FameLinkArtistModel.deleteOne({ id: artistId });
	}

	async getBaseShowsByArtist(artistId: string): Promise<BaseShow[]> {
		await connectToDatabase();
		return BaseShowModel.find({ artistId }).lean() as unknown as BaseShow[];
	}

	async getBaseShow(showId: string, artistId: string): Promise<BaseShow | null> {
		await connectToDatabase();
		return BaseShowModel.findOne({ id: showId, artistId }).lean() as unknown as BaseShow | null;
	}

	async getBaseShowById(showId: string): Promise<BaseShow | null> {
		await connectToDatabase();
		return BaseShowModel.findOne({ id: showId }).lean() as unknown as BaseShow | null;
	}

	async getBaseShowBySlug(slug: string): Promise<BaseShow | null> {
		await connectToDatabase();
		return BaseShowModel.findOne({ slug }).lean() as unknown as BaseShow | null;
	}

	async isSlugUnique(slug: string, excludeShowId?: string): Promise<boolean> {
		await connectToDatabase();
		const existing = await BaseShowModel.findOne({ slug, id: { $ne: excludeShowId } });
		return !existing;
	}

	async generateUniqueSlug(name: string, excludeShowId?: string): Promise<string> {
		let baseSlug = generateSlug(name);
		let slug = baseSlug;
		let counter = 1;
		while (!(await this.isSlugUnique(slug, excludeShowId))) {
			slug = baseSlug + "-" + counter;
			counter++;
		}
		return slug;
	}

	async createBaseShow(show: BaseShow): Promise<BaseShow> {
		await connectToDatabase();
		const result = await BaseShowModel.create(show as any);
		return show;
	}

	async updateBaseShow(show: BaseShow): Promise<BaseShow> {
		await connectToDatabase();
		const result = await BaseShowModel.findOneAndUpdate({ id: show.id }, show as any, { upsert: true, new: true });
		return show;
	}

	async deleteBaseShow(showId: string, artistId: string): Promise<void> {
		await connectToDatabase();
		await BaseShowModel.deleteOne({ id: showId, artistId });
	}

	async getEventShowsByEvent(eventId: string): Promise<EventShow[]> {
		await connectToDatabase();
		return EventShowModel.find({ eventId }).lean() as unknown as EventShow[];
	}

	async getEventShowsByArtist(artistId: string): Promise<EventShow[]> {
		await connectToDatabase();
		return EventShowModel.find({ artistId }).lean() as unknown as EventShow[];
	}

	async getEventShowsByBaseShow(baseShowId: string): Promise<EventShow[]> {
		await connectToDatabase();
		return EventShowModel.find({ baseShowId }).lean() as unknown as EventShow[];
	}

	async getEventShow(eventShowId: string, eventId: string): Promise<EventShow | null> {
		await connectToDatabase();
		return EventShowModel.findOne({ id: eventShowId, eventId }).lean() as unknown as EventShow | null;
	}

	async getEventShowByArtistAndEvent(artistId: string, eventId: string): Promise<EventShow | null> {
		await connectToDatabase();
		return EventShowModel.findOne({ artistId, eventId }).lean() as unknown as EventShow | null;
	}

	async getEventShowsByArtistAndEventArray(artistId: string, eventId: string): Promise<EventShow[]> {
		await connectToDatabase();
		return EventShowModel.find({ artistId, eventId }).lean() as unknown as EventShow[];
	}

	async createEventShow(eventShow: EventShow): Promise<EventShow> {
		await connectToDatabase();
		await EventShowModel.create(eventShow as any);
		return eventShow;
	}

	async updateEventShowOverrides(eventShowId: string, eventId: string, overrides: EventShowOverrides, updatedBy?: string): Promise<EventShow> {
		await connectToDatabase();
		const doc = await EventShowModel.findOneAndUpdate({ id: eventShowId, eventId }, { overrides, updatedBy }, { new: true }).lean();
		return doc as unknown as EventShow;
	}

	async updateEventShowStatus(eventShowId: string, eventId: string, status: string, updatedBy?: string): Promise<EventShow> {
		await connectToDatabase();
		const doc = await EventShowModel.findOneAndUpdate({ id: eventShowId, eventId }, { status, updatedBy }, { new: true }).lean();
		return doc as unknown as EventShow;
	}

	async updateEventShowPerformanceStatus(eventShowId: string, eventId: string, performanceStatus: string, updatedBy?: string): Promise<EventShow> {
		await connectToDatabase();
		const doc = await EventShowModel.findOneAndUpdate({ id: eventShowId, eventId }, { performanceStatus, updatedBy }, { new: true }).lean();
		return doc as unknown as EventShow;
	}

	async deleteEventShow(eventShowId: string, eventId: string): Promise<void> {
		await connectToDatabase();
		await EventShowModel.deleteOne({ id: eventShowId, eventId });
	}

	async getEventShowById(eventShowId: string): Promise<EventShow | null> {
		await connectToDatabase();
		return EventShowModel.findOne({ id: eventShowId }).lean() as unknown as EventShow | null;
	}

	async updateEventShow(eventShowId: string, updates: any): Promise<EventShow> {
		await connectToDatabase();
		const doc = await EventShowModel.findOneAndUpdate({ id: eventShowId }, updates, { new: true }).lean();
		return doc as unknown as EventShow;
	}

	async getAllEventRequests(): Promise<EventRequest[]> {
		await connectToDatabase();
		return EventRequestModel.find({}).lean() as unknown as EventRequest[];
	}

	async getEventRequest(requestId: string): Promise<EventRequest | null> {
		await connectToDatabase();
		return EventRequestModel.findOne({ id: requestId }).lean() as unknown as EventRequest | null;
	}

	async getEventRequestsByArtist(artistIdOrEmail: string): Promise<EventRequest[]> {
		await connectToDatabase();
		return EventRequestModel.find({ $or: [{ artistId: artistIdOrEmail }, { artistEmail: artistIdOrEmail }] }).lean() as unknown as EventRequest[];
	}

	async getEventRequestsByEvent(eventId: string): Promise<EventRequest[]> {
		await connectToDatabase();
		return EventRequestModel.find({ eventId }).lean() as unknown as EventRequest[];
	}

	async getEventRequestsByStageManager(stageManagerId: string): Promise<EventRequest[]> {
		await connectToDatabase();
		return EventRequestModel.find({ stageManagerId }).lean() as unknown as EventRequest[];
	}

	async createEventRequest(request: EventRequest): Promise<EventRequest> {
		await connectToDatabase();
		await EventRequestModel.create(request as any);
		return request;
	}

	async updateEventRequestStatus(requestId: string, status: EventRequestStatus, eventShowId?: string): Promise<EventRequest> {
		await connectToDatabase();
		const updates: any = { status, respondedAt: status !== "pending" ? new Date().toISOString() : undefined };
		if (eventShowId) updates.eventShowId = eventShowId;
		const doc = await EventRequestModel.findOneAndUpdate({ id: requestId }, updates, { new: true }).lean();
		return doc as unknown as EventRequest;
	}

	async updateEventRequest(request: EventRequest): Promise<EventRequest> {
		await connectToDatabase();
		await EventRequestModel.findOneAndUpdate({ id: request.id }, request as any, { upsert: true });
		return request;
	}

	async deleteEventRequest(requestId: string): Promise<void> {
		await connectToDatabase();
		await EventRequestModel.deleteOne({ id: requestId });
	}

	async linkArtistToEventRequest(requestId: string, artistId: string): Promise<EventRequest> {
		await connectToDatabase();
		const doc = await EventRequestModel.findOneAndUpdate({ id: requestId }, { artistId }, { new: true }).lean();
		return doc as unknown as EventRequest;
	}

	async getShareLinksByArtist(artistId: string): Promise<any[]> {
		await connectToDatabase();
		return ShareLinkModel.find({ artistId }).lean();
	}

	async createShareLink(artistId: string, link: any): Promise<any> {
		await connectToDatabase();
		await ShareLinkModel.create({ ...link, artistId });
		return link;
	}

	async updateShareLink(artistId: string, linkId: string, updates: any): Promise<any> {
		await connectToDatabase();
		const doc = await ShareLinkModel.findOneAndUpdate({ id: linkId, artistId }, updates, { new: true }).lean();
		return doc;
	}

	async deleteShareLink(artistId: string, linkId: string): Promise<void> {
		await connectToDatabase();
		await ShareLinkModel.deleteOne({ id: linkId, artistId });
	}

	async getShareLinkByToken(token: string): Promise<any | null> {
		await connectToDatabase();
		return ShareLinkModel.findOne({ token }).lean();
	}

	// ── Artist "Me" Profile ──────────────────────────────────────────────

	async getMeProfileByArtist(artistId: string): Promise<any | null> {
		await connectToDatabase();
		return ArtistMeProfileModel.findOne({ artistId }).lean();
	}

	async getMeProfileBySlug(slug: string): Promise<any | null> {
		await connectToDatabase();
		return ArtistMeProfileModel.findOne({ slug }).lean();
	}

	async isMeProfileSlugUnique(slug: string, excludeArtistId?: string): Promise<boolean> {
		await connectToDatabase();
		const existing = await ArtistMeProfileModel.findOne({ slug, artistId: { $ne: excludeArtistId } });
		return !existing;
	}

	async generateUniqueMeProfileSlug(name: string, excludeArtistId?: string): Promise<string> {
		let baseSlug = generateSlug(name);
		let slug = baseSlug;
		let counter = 1;
		while (!(await this.isMeProfileSlugUnique(slug, excludeArtistId))) {
			slug = baseSlug + "-" + counter;
			counter++;
		}
		return slug;
	}

	async upsertMeProfile(artistId: string, updates: any): Promise<any> {
		await connectToDatabase();
		const now = new Date().toISOString();
		const doc = await ArtistMeProfileModel.findOneAndUpdate(
			{ artistId },
			{
				$set: { ...updates, artistId, updatedAt: now },
				$setOnInsert: {
					id: updates.id || `me-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
					createdAt: now,
				},
			},
			{ new: true, upsert: true, lean: true },
		);
		return doc;
	}

	async getEventParticipationsByEvent(eventId: string): Promise<EventParticipation[]> {
		await connectToDatabase();
		return EventParticipationModel.find({ eventId }).lean() as unknown as EventParticipation[];
	}

	async getEventParticipationsByArtist(artistId: string): Promise<EventParticipation[]> {
		await connectToDatabase();
		return EventParticipationModel.find({ artistId }).lean() as unknown as EventParticipation[];
	}

	async getEventParticipation(artistId: string, eventId: string): Promise<EventParticipation | null> {
		await connectToDatabase();
		return EventParticipationModel.findOne({ artistId, eventId }).lean() as unknown as EventParticipation | null;
	}

	async createEventParticipation(participation: EventParticipation): Promise<EventParticipation> {
		await connectToDatabase();
		await EventParticipationModel.create(participation as any);
		return participation;
	}

	async updateEventParticipation(participation: EventParticipation): Promise<EventParticipation> {
		await connectToDatabase();
		await EventParticipationModel.findOneAndUpdate({ id: participation.id }, participation as any, { upsert: true });
		return participation;
	}

	async deleteEventParticipation(artistId: string, eventId: string): Promise<void> {
		await connectToDatabase();
		await EventParticipationModel.deleteOne({ artistId, eventId });
	}

	async getEventData(eventId: string, key: string): Promise<any | null> {
		await connectToDatabase();
		const doc = await EventDataModel.findOne({ eventId, key }).lean();
		return doc ? (doc as any).data : null;
	}

	async saveEventData(eventId: string, key: string, data: any): Promise<void> {
		await connectToDatabase();
		await EventDataModel.findOneAndUpdate(
			{ eventId, key },
			{ data, updatedAt: new Date() },
			{ upsert: true, new: true }
		);
	}
}


// Single unified data access instance
export const dataAccess = new DataAccess();
export const fameLinkDataAccess = dataAccess;

export interface FameLinkArtistProfile {
	id: string;
	email: string;
	passwordHash: string;
	artistName: string;
	country?: string;
	city?: string;
	tier: "free" | "pro" | "pro_plus";
	emailVerified: boolean;
	verificationToken?: string;
	verificationTokenExpiry?: string;
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
	subscription?: any;
	realName?: string;
	phone?: string;
	style?: string;
	performanceType?: string;
	biography?: string;
	performanceDuration?: number;
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	customCostumeColor?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	lightRequests?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	customStagePosition?: string;
	equipment?: string;
	showLink?: string;
	notes?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	image_url?: string;
	musicTrack?: any;
	galleryFiles?: any[];
	rehearsalVideo?: any | null;
	socialMedia?: any;
	countryLiving?: string;
	homeCountry?: string;
	members?: any[];
	tshirtSizes?: any[];
	profileComplete?: boolean;
	passwordResetToken?: string;
	passwordResetTokenExpiry?: string;
}

// User & Auth
export const getAllUsers = () => dataAccess.getAllUsers();
export const getUserById = (id: string) => dataAccess.getUserById(id);
export const getUserByEmail = (email: string) => dataAccess.getUserByEmail(email);
export const createUser = (user: User) => dataAccess.createUser(user);
export const updateUser = (user: User) => dataAccess.updateUser(user);
export const deactivateUser = (userId: string) => dataAccess.deactivateUser(userId);
export const changeUserPassword = (userId: string, hash: string) => dataAccess.changeUserPassword(userId, hash);
export const deleteUser = (userId: string) => dataAccess.deleteUser(userId);

// Stage Manager Approval
export const getPendingStageManagers = () => dataAccess.getPendingStageManagers();
export const addPendingStageManager = (user: User) => dataAccess.addPendingStageManager(user);
export const approvePendingStageManager = (userId: string) => dataAccess.approvePendingStageManager(userId);
export const rejectPendingStageManager = (userId: string) => dataAccess.rejectPendingStageManager(userId);

// Events
export const getAllEvents = () => dataAccess.getAllEvents();
export const getEventById = (eventId: string) => dataAccess.getEventById(eventId);
export const getEvent = (eventId: string) => dataAccess.getEventById(eventId);
export const createEvent = (event: Event) => dataAccess.createEvent(event);
export const updateEvent = (event: Event) => dataAccess.updateEvent(event);
export const deleteEvent = (eventId: string) => dataAccess.deleteEvent(eventId);
export const getEventsByStageManager = (stageManagerId: string) => dataAccess.getEventsByStageManager(stageManagerId);

// Performances
export const getPerformancesByEvent = (eventId: string) => dataAccess.getPerformancesByEvent(eventId);
export const createPerformance = (performance: Performance) => dataAccess.createPerformance(performance);
export const updatePerformance = (performance: Performance) => dataAccess.updatePerformance(performance);

// Counters
export const getNextCounter = (counterName: string) => dataAccess.getNextCounter(counterName);

// Notifications
export const getNotifications = (userId: string) => dataAccess.getNotifications(userId);
export const addNotification = (userId: string, notification: any) => dataAccess.addNotification(userId, notification);
export const updateNotification = (userId: string, notificationId: string, updates: any) => dataAccess.updateNotification(userId, notificationId, updates);
export const getArtistNotifications = getNotifications;
export const updateArtistNotification = updateNotification;

// Show Info Requests
export const getAllShowInfoRequests = () => dataAccess.getAllShowInfoRequests();
export const getShowInfoRequestsByArtist = (artistId: string) => dataAccess.getShowInfoRequestsByArtist(artistId);
export const createShowInfoRequest = (request: any) => dataAccess.createShowInfoRequest(request);
export const updateShowInfoRequest = (requestId: string, updates: any) => dataAccess.updateShowInfoRequest(requestId, updates);
export const createTestData = () => dataAccess.createTestData();

// Media
export const saveMediaFile = (file: any) => dataAccess.saveMediaFile(file);
export const getMediaFilesByUser = (userId: string) => dataAccess.getMediaFilesByUser(userId);
export const getMediaFilesByEvent = (eventId: string, userId: string) => dataAccess.getMediaFilesByEvent(eventId, userId);
export const getMediaFileById = (id: string) => dataAccess.getMediaFileById(id);
export const deleteMediaFile = (id: string) => dataAccess.deleteMediaFile(id);

// FameLink Artists
export const getAllFameLinkArtists = () => dataAccess.getAllFameLinkArtists();
export const getFameLinkArtistById = (artistId: string) => dataAccess.getFameLinkArtistById(artistId);
export const getFameLinkArtistByEmail = (email: string) => dataAccess.getFameLinkArtistByEmail(email);
export const getFameLinkArtistByVerificationToken = (token: string) => dataAccess.getFameLinkArtistByVerificationToken(token);
export const createFameLinkArtist = (artist: FameLinkArtistProfile) => dataAccess.createFameLinkArtist(artist);
export const updateFameLinkArtist = (artist: FameLinkArtistProfile) => dataAccess.updateFameLinkArtist(artist);
export const verifyFameLinkArtistEmail = (token: string) => dataAccess.verifyFameLinkArtistEmail(token);
export const deleteFameLinkArtist = (artistId: string) => dataAccess.deleteFameLinkArtist(artistId);

// Base Shows
export const getBaseShowsByArtist = (artistId: string) => dataAccess.getBaseShowsByArtist(artistId);
export const getBaseShow = (showId: string, artistId: string) => dataAccess.getBaseShow(showId, artistId);
export const getBaseShowById = (showId: string) => dataAccess.getBaseShowById(showId);
export const getBaseShowBySlug = (slug: string) => dataAccess.getBaseShowBySlug(slug);
export const isSlugUnique = (slug: string, excludeShowId?: string) => dataAccess.isSlugUnique(slug, excludeShowId);
export const generateUniqueSlug = (name: string, excludeShowId?: string) => dataAccess.generateUniqueSlug(name, excludeShowId);
export const createBaseShow = (show: BaseShow) => dataAccess.createBaseShow(show);
export const updateBaseShow = (show: BaseShow) => dataAccess.updateBaseShow(show);
export const deleteBaseShow = (showId: string, artistId: string) => dataAccess.deleteBaseShow(showId, artistId);

// Event Shows
export const getEventShowsByEvent = (eventId: string) => dataAccess.getEventShowsByEvent(eventId);
export const getEventShowsByArtist = (artistId: string) => dataAccess.getEventShowsByArtist(artistId);
export const getEventShowsByBaseShow = (baseShowId: string) => dataAccess.getEventShowsByBaseShow(baseShowId);
export const getEventShow = (eventShowId: string, eventId?: string) => eventId ? dataAccess.getEventShow(eventShowId, eventId) : dataAccess.getEventShowById(eventShowId);
export const getEventShowById = (eventShowId: string) => dataAccess.getEventShowById(eventShowId);
export const updateEventShow = (eventShowId: string, updates: any) => dataAccess.updateEventShow(eventShowId, updates);
export const getEventShowByArtistAndEvent = (artistId: string, eventId: string) => dataAccess.getEventShowByArtistAndEvent(artistId, eventId);
export const getEventShowsByArtistAndEventArray = (artistId: string, eventId: string) => dataAccess.getEventShowsByArtistAndEventArray(artistId, eventId);
export const createEventShow = (eventShow: EventShow) => dataAccess.createEventShow(eventShow);
export const updateEventShowOverrides = (eventShowId: string, eventId: string, overrides: EventShowOverrides, updatedBy?: string) => dataAccess.updateEventShowOverrides(eventShowId, eventId, overrides, updatedBy);
export const updateEventShowStatus = (eventShowId: string, eventId: string, status: EventShow["status"], updatedBy?: string) => dataAccess.updateEventShowStatus(eventShowId, eventId, status, updatedBy);
export const updateEventShowPerformanceStatus = (eventShowId: string, eventId: string, performanceStatus: EventShow["performanceStatus"], updatedBy?: string) => dataAccess.updateEventShowPerformanceStatus(eventShowId, eventId, performanceStatus, updatedBy);
export const deleteEventShow = (eventShowId: string, eventId: string) => dataAccess.deleteEventShow(eventShowId, eventId);

// Event Requests
export const getAllEventRequests = () => dataAccess.getAllEventRequests();
export const getEventRequest = (requestId: string) => dataAccess.getEventRequest(requestId);
export const getEventRequestsByArtist = (artistIdOrEmail: string) => dataAccess.getEventRequestsByArtist(artistIdOrEmail);
export const getEventRequestsByEvent = (eventId: string) => dataAccess.getEventRequestsByEvent(eventId);
export const getEventRequestsByStageManager = (stageManagerId: string) => dataAccess.getEventRequestsByStageManager(stageManagerId);
export const createEventRequest = (request: EventRequest) => dataAccess.createEventRequest(request);
export const updateEventRequestStatus = (requestId: string, status: EventRequestStatus, eventShowId?: string) => dataAccess.updateEventRequestStatus(requestId, status, eventShowId);
export const updateEventRequest = (request: EventRequest) => dataAccess.updateEventRequest(request);
export const deleteEventRequest = (requestId: string) => dataAccess.deleteEventRequest(requestId);
export const linkArtistToEventRequest = (requestId: string, artistId: string) => dataAccess.linkArtistToEventRequest(requestId, artistId);

// Share Links
export const getShareLinksByArtist = (artistId: string) => dataAccess.getShareLinksByArtist(artistId);
export const createShareLink = (artistId: string, link: any) => dataAccess.createShareLink(artistId, link);
export const updateShareLink = (artistId: string, linkId: string, updates: any) => dataAccess.updateShareLink(artistId, linkId, updates);
export const deleteShareLink = (artistId: string, linkId: string) => dataAccess.deleteShareLink(artistId, linkId);
export const getShareLinkByToken = (token: string) => dataAccess.getShareLinkByToken(token);

// Artist "Me" Profile
export const getMeProfileByArtist = (artistId: string) => dataAccess.getMeProfileByArtist(artistId);
export const getMeProfileBySlug = (slug: string) => dataAccess.getMeProfileBySlug(slug);
export const generateUniqueMeProfileSlug = (name: string, excludeArtistId?: string) => dataAccess.generateUniqueMeProfileSlug(name, excludeArtistId);
export const upsertMeProfile = (artistId: string, updates: any) => dataAccess.upsertMeProfile(artistId, updates);

// Participations
export const getEventParticipationsByEvent = (eventId: string) => dataAccess.getEventParticipationsByEvent(eventId);
export const getEventParticipationsByArtist = (artistId: string) => dataAccess.getEventParticipationsByArtist(artistId);
export const getEventParticipation = (artistId: string, eventId: string) => dataAccess.getEventParticipation(artistId, eventId);
export const createEventParticipation = (participation: EventParticipation) => dataAccess.createEventParticipation(participation);
export const updateEventParticipation = (participation: EventParticipation) => dataAccess.updateEventParticipation(participation);
export const deleteEventParticipation = (artistId: string, eventId: string) => dataAccess.deleteEventParticipation(artistId, eventId);

// Event Generic Data (MongoDB-based Persistence)
export const getEventData = (eventId: string, key: string) => dataAccess.getEventData(eventId, key);
export const saveEventData = (eventId: string, key: string, data: any) => dataAccess.saveEventData(eventId, key, data);
