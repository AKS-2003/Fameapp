import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { APIResponse } from "@/types";
import { connectToDatabase } from "@/database/mongodb";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/artists
 * Get all registered artists from the platform for super admin
 */
export async function GET(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);
		
		// Auth guard
		if (!session || session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Super admin access required.",
					},
				},
				{ status: 401 },
			);
		}

		// Ensure DB connection
		await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Database connection not established");

		// 1. Get all events
		const allEvents = await db.collection('famelink_events').find({}).toArray();
		const eventMap = new Map();
		allEvents.forEach((event: any) => {
			const id = event.id || event._id?.toString();
			eventMap.set(id, {
				name: event.name || "Unknown Event",
				venue: event.venue || "",
				startDate: event.start_date || event.startDate,
				endDate: event.end_date || event.endDate,
			});
		});

		// 2. Get all event assignments
		const eventArtists = await db.collection('famelink_event_artists').find({}).toArray();
		const emailToEventArtistMap = new Map();
		eventArtists.forEach((ea: any) => {
			if (ea.email) {
				const normalizedEmail = ea.email.toLowerCase().trim();
				if (!emailToEventArtistMap.has(normalizedEmail)) {
					emailToEventArtistMap.set(normalizedEmail, ea);
				}
			}
		});

		// 3. Get ALL registered artists
		const registeredArtists = await db.collection('famelink_artists').find({}).sort({ createdAt: -1 }).toArray();

		// 4. Transform and merge
		const allArtists = registeredArtists.map((artist: any) => {
			const normalizedEmail = (artist.email || "").toLowerCase().trim();
			const eventArtistInfo = emailToEventArtistMap.get(normalizedEmail);
			
			const eventId = eventArtistInfo?.eventId;
			const eventInfo = eventId ? eventMap.get(eventId) : null;

			return {
				id: artist.id || artist._id?.toString(),
				artistName: eventArtistInfo?.artistName || artist.artistName || "No Name",
				realName: eventArtistInfo?.realName || artist.realName || "",
				email: artist.email,
				phone: eventArtistInfo?.phone || artist.phone || "",
				style: eventArtistInfo?.style || artist.style || eventArtistInfo?.performanceType || artist.performanceType || "",
				performanceType: eventArtistInfo?.performanceType || artist.performanceType || "",
				performanceDuration: eventArtistInfo?.performanceDuration || artist.performanceDuration || eventArtistInfo?.actual_duration || 0,
				eventId: eventId || "",
				eventName: eventInfo?.name || "Not assigned",
				eventVenue: eventInfo?.venue || "",
				status: eventArtistInfo?.status || "registered",
				createdAt: artist.createdAt,
				image_url: eventArtistInfo?.image_url || artist.image_url || "",
				tier: artist.tier || "free",
				emailVerified: artist.emailVerified || false,
				performanceDate: eventArtistInfo?.performanceDate || eventArtistInfo?.performance_date || artist.performanceDate || null,
			};
		});

		// 5. Add event-assigned artists who aren't registered yet
		const registeredEmails = new Set(registeredArtists.map(a => (a.email || "").toLowerCase().trim()));
		
		eventArtists.forEach((ea: any) => {
			const normalizedEmail = (ea.email || "").toLowerCase().trim();
			if (normalizedEmail && !registeredEmails.has(normalizedEmail)) {
				const eventInfo = ea.eventId ? eventMap.get(ea.eventId) : null;
				allArtists.push({
					id: ea.id || ea._id?.toString(),
					artistName: ea.artistName || "No Name",
					realName: ea.realName || "",
					email: ea.email,
					phone: ea.phone || "",
					style: ea.style || ea.performanceType || "",
					performanceType: ea.performanceType || "",
					performanceDuration: ea.performanceDuration || ea.actual_duration || 0,
					eventId: ea.eventId || "",
					eventName: eventInfo?.name || "Not assigned",
					eventVenue: eventInfo?.venue || "",
					status: ea.status || "pending",
					createdAt: ea.createdAt,
					image_url: ea.image_url || "",
					tier: "free",
					emailVerified: false,
					performanceDate: ea.performanceDate || ea.performance_date || null,
				});
			}
		});

		return NextResponse.json({
			success: true,
			data: {
				artists: allArtists,
				totalCount: allArtists.length,
			},
		});
	} catch (error) {
		console.error("Error fetching all artists:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch artists: " + (error as Error).message,
				},
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/super-admin/artists
 * Change password for a FameLink artist (super admin only)
 * Body: { artistId: string, newPassword: string }
 */
export async function PATCH(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);

		if (!session || session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Super admin access required.",
					},
				},
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { artistId, newPassword } = body;

		if (!artistId || !newPassword) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "artistId and newPassword are required",
					},
				},
				{ status: 400 },
			);
		}

		if (newPassword.length < 6) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Password must be at least 6 characters",
					},
				},
				{ status: 400 },
			);
		}

		await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Database connection not established");

		// Find the artist in famelink_artists first (registered artists)
		let artist = await db.collection("famelink_artists").findOne({
			$or: [{ id: artistId }, { _id: artistId }],
		});

		// If not found in famelink_artists, look in famelink_event_artists (pending/unregistered)
		let fromEventArtists = false;
		let eventArtist: any = null;
		if (!artist) {
			eventArtist = await db.collection("famelink_event_artists").findOne({
				$or: [{ id: artistId }, { _id: artistId }],
			});
			if (!eventArtist) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ARTIST_NOT_FOUND",
							message: "Artist not found in either registered artists or event artists",
						},
					},
					{ status: 404 },
				);
			}
			fromEventArtists = true;
		}

		// Hash the new password
		const { hashPassword } = await import("@/lib/auth");
		const hashedPassword = await hashPassword(newPassword);

		if (fromEventArtists && eventArtist) {
			// Artist exists in event_artists but not in famelink_artists yet.
			// Check if a famelink_artists record exists by email (may have been created under different id)
			const email = (eventArtist.email || "").toLowerCase().trim();
			if (email) {
				const existingByEmail = await db.collection("famelink_artists").findOne({
					email: { $regex: new RegExp(`^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
				});
				if (existingByEmail) {
					// Update the existing record
					await db.collection("famelink_artists").updateOne(
						{ _id: existingByEmail._id },
						{ $set: { passwordHash: hashedPassword, updatedAt: new Date().toISOString() } },
					);
					artist = existingByEmail;
				} else {
					// Create a new famelink_artists record so the artist can log in
					const newArtistId = eventArtist.id || artistId;
					const newRecord = {
						id: newArtistId,
						artistName: eventArtist.artistName || eventArtist.artist_name || "",
						realName: eventArtist.realName || "",
						email: eventArtist.email,
						phone: eventArtist.phone || "",
						passwordHash: hashedPassword,
						emailVerified: false,
						tier: "free",
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					await db.collection("famelink_artists").insertOne(newRecord);
					artist = newRecord as any;
				}
			} else {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "ARTIST_NO_EMAIL",
							message: "Cannot set password: artist has no email address",
						},
					},
					{ status: 400 },
				);
			}
		} else {
			// Update the registered artist's password normally
			await db.collection("famelink_artists").updateOne(
				{ $or: [{ id: artistId }, { _id: artistId }] },
				{ $set: { passwordHash: hashedPassword, updatedAt: new Date().toISOString() } },
			);
		}

		const displayName = (artist as any)?.artistName || (artist as any)?.email || artistId;
		console.log(`[SUPER-ADMIN] Artist password changed for artistId: ${artistId} (${displayName})`);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: `Password updated successfully for artist: ${displayName}`,
				artistId,
			},
		});
	} catch (error) {
		console.error("Error changing artist password:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to change artist password: " + (error as Error).message,
				},
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/super-admin/artists
 * Delete a FameLink artist (super admin only)
 * Body: { artistId: string }
 */
export async function DELETE(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);

		if (!session || session.role !== "super_admin") {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Super admin access required.",
					},
				},
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { artistId } = body;

		if (!artistId) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "artistId is required",
					},
				},
				{ status: 400 },
			);
		}

		await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Database connection not established");

		// Find the artist first to get the email (if registered)
		const artist = await db.collection("famelink_artists").findOne({
			$or: [{ id: artistId }, { _id: artistId }],
		});

		let emailToDelete = "";
		let artistName = "Artist";
		
		if (artist) {
			emailToDelete = artist.email || "";
			artistName = artist.artistName || artist.email || "Artist";
			
			// Delete from famelink_artists
			await db.collection("famelink_artists").deleteOne({
				$or: [{ id: artistId }, { _id: artistId }],
			});
		}

		// Also delete from famelink_event_artists
		await db.collection("famelink_event_artists").deleteMany({
			$or: [{ id: artistId }, { _id: artistId }],
		});
		
		if (emailToDelete) {
			await db.collection("famelink_event_artists").deleteMany({
				email: { $regex: new RegExp(`^${emailToDelete.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
			});
		}

		console.log(`[SUPER-ADMIN] Artist deleted: ${artistId} (${emailToDelete})`);

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: `Artist "${artistName}" deleted successfully`,
				artistId,
			},
		});
	} catch (error) {
		console.error("Error deleting artist:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to delete artist: " + (error as Error).message,
				},
			},
			{ status: 500 },
		);
	}
}
