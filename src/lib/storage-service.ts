import fs from "fs";
import path from "path";
import * as dataAccess from "./data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";

const writeFile = fs.promises.writeFile;
const unlink = fs.promises.unlink;
const mkdir = fs.promises.mkdir;
const readdir = fs.promises.readdir;
const stat = fs.promises.stat;
const existsSync = fs.existsSync;

/**
 * VPS STORAGE CONFIGURATION
 * We store all files at /www/wwwroot/uploads on the Hostinger VPS.
 */
const UPLOADS_ROOT = process.env.NODE_ENV === "production" 
    ? "/www/wwwroot/uploads" 
    : path.join(process.cwd(), "uploads");

// Helper to ensure directory exists
const ensureDir = async (dirPath: string) => {
    try {
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
        }
    } catch (err) {
        console.error(`Error creating directory ${dirPath}:`, err);
    }
};

/**
 * StorageService — Purely Local VPS File Storage.
 * Handles images, audio, and document uploads.
 */
export class StorageService {
	/**
	 * Save binary data (Buffer) to local VPS disk.
	 * Used for binary media: images, audio, PDFs.
	 * JSON/structured data must go through MongoDB (data-access.ts).
	 */
	static async saveFile(filePath: string, data: Buffer | string): Promise<boolean> {
		try {
			const absolutePath = path.join(UPLOADS_ROOT, filePath);
			await ensureDir(path.dirname(absolutePath));
			if (Buffer.isBuffer(data)) {
				await writeFile(absolutePath, data);
			} else {
				await writeFile(absolutePath, typeof data === "string" ? data : JSON.stringify(data, null, 2));
			}
			return true;
		} catch (error) {
			console.error(`[Storage] Save error: ${filePath}`, error);
			return false;
		}
	}

	/**
	 * Read a file from VPS disk and return as a Buffer.
	 * Used by download-zip and generate-pdf routes to serve binary media.
	 */
	static async readFileAsBuffer(filePath: string): Promise<ArrayBuffer | null> {
		try {
			// Strip leading slash if present
			const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
			const absolutePath = path.join(UPLOADS_ROOT, cleanPath);
			if (!existsSync(absolutePath)) return null;
			const buffer = await fs.promises.readFile(absolutePath);
			return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
		} catch (error) {
			console.error(`[Storage] readFileAsBuffer error: ${filePath}`, error);
			return null;
		}
	}

	/** Read a text/JSON file from VPS disk. */
	static async readFile(filePath: string): Promise<any | null> {
		try {
			const absolutePath = path.join(UPLOADS_ROOT, filePath);
			if (!existsSync(absolutePath)) return null;
			const contents = fs.readFileSync(absolutePath, "utf8");
			try {
				return JSON.parse(contents);
			} catch {
				return contents;
			}
		} catch (error) {
			console.error(`[Storage] Read error: ${filePath}`, error);
			return null;
		}
	}

	/** Delete a file from VPS disk. */
	static async deleteFile(filePath: string): Promise<boolean> {
		try {
			const absolutePath = path.join(UPLOADS_ROOT, filePath);
			if (existsSync(absolutePath)) await unlink(absolutePath);
			return true;
		} catch (error) {
			console.error(`[Storage] Delete error: ${filePath}`, error);
			return false;
		}
	}

	/** Check if a file exists on VPS disk. */
	static async fileExists(filePath: string): Promise<boolean> {
		return existsSync(path.join(UPLOADS_ROOT, filePath));
	}
}

/**
 * EventDataService — MongoDB-backed service for event-related operations.
 */
export class EventDataService {
	static async saveEvent(eventId: string, eventData: any): Promise<boolean> {
		await dataAccess.updateEvent(eventData);
		return true;
	}

	static async getEvent(eventId: string): Promise<any | null> {
		return await dataAccess.getEventById(eventId);
	}

	static async listEvents(): Promise<any[]> {
		return await dataAccess.getAllEvents();
	}

	static async deleteEvent(eventId: string): Promise<boolean> {
		await dataAccess.deleteEvent(eventId);
		return true;
	}

	// Save artists list to MongoDB famelink_event_artists collection
	static async saveArtists(eventId: string, artists: any[]): Promise<boolean> {
		try {
			await connectToDatabase();
			const ops = artists.map(artist => ({
				updateOne: {
					filter: { id: artist.id },
					update: { $set: { ...artist, eventId, updatedAt: new Date().toISOString() } },
					upsert: true
				}
			}));
			if (ops.length > 0) {
				await EventArtistModel.bulkWrite(ops);
			}
			return true;
		} catch (err) {
			console.error('[EventDataService] saveArtists error:', err);
			return false;
		}
	}

	static async getArtists(eventId: string): Promise<any[]> {
		try {
			await connectToDatabase();
			return await EventArtistModel.find({ eventId }).lean() as any[];
		} catch (err) {
			console.error('[EventDataService] getArtists error:', err);
			return [];
		}
	}

    static async saveShowOrder(eventId: string, showOrder: any): Promise<boolean> {
		await dataAccess.saveEventData(eventId, "show_order", showOrder);
		return true;
	}

	static async getShowOrder(eventId: string): Promise<any | null> {
		return await dataAccess.getEventData(eventId, "show_order");
	}
}

export async function uploadFile(
	fileName: string,
	fileBuffer: Buffer,
	contentType: string
): Promise<string> {
    const absolutePath = path.join(UPLOADS_ROOT, fileName);
    await ensureDir(path.dirname(absolutePath));
    await fs.promises.writeFile(absolutePath, fileBuffer);
    return `/api/files/serve?file=${encodeURIComponent(fileName)}`;
}

export const readJsonFile = StorageService.readFile;
export const writeJsonFile = StorageService.saveFile;
export const deleteFile = StorageService.deleteFile;
export const getSignedUrl = async (filePath: string) => `/api/files/serve?file=${encodeURIComponent(filePath)}`;

// Re-export event service methods as top-level functions for backward compatibility
export const getEvent = EventDataService.getEvent;
export const updateEvent = async (id: string, data: any) => {
    const event = { ...data, id };
    await dataAccess.updateEvent(event as any);
    return event;
};
export const deleteEvent = EventDataService.deleteEvent;
export const getUser = async (id: string) => await dataAccess.getUserById(id);

// Helper for file path creation
export function createFilePath(ownerType: string, ownerId: string, category: string): string {
    return `${ownerType}s/${ownerId}/${category}`;
}
