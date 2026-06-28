import { NextRequest, NextResponse } from "next/server";
import { APIResponse } from "@/types";
import {
	getFameLinkArtistById,
	getBaseShowsByArtist,
	deleteFameLinkArtist,
	getEventShowsByArtist,
	deleteEventShow,
} from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, ArtistLogisticsModel } from "@/database/models/FameLinkModels";

/** Safely parse snapshotJson — may be stored as a JSON string or already an object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { artistId: string } },
) {
	try {
		const { artistId } = await Promise.resolve(params);

		await connectToDatabase();

		// ── 1. FameLink artist (logged in via email/Gmail) ──────────────────────
		const fameLinkArtist = await getFameLinkArtistById(artistId);

		if (fameLinkArtist) {
			// Get the artist's shows
			const shows = await getBaseShowsByArtist(artistId);

			// ── Merge event-specific assignment data from EventShows ─────────
			// The stage manager assigns shows via EventShow overrides
			const eventShows = await getEventShowsByArtist(artistId);

			// Find the most relevant event assignment:
			// prefer confirmed/assigned over pending, then most recent
			let eventAssignment: any = null;
			let assignedEventId: string | null = null;

			if (eventShows.length > 0) {
				// Sort: confirmed first, then by most recently updated
				const sorted = [...eventShows].sort((a: any, b: any) => {
					const aScore = a.status === "confirmed" ? 2 : a.overrides?.performanceOrder != null ? 1 : 0;
					const bScore = b.status === "confirmed" ? 2 : b.overrides?.performanceOrder != null ? 1 : 0;
					if (bScore !== aScore) return bScore - aScore;
					return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
				});
				const best = sorted[0] as any;
				const snap = parseSnapshot(best.snapshotJson);
				eventAssignment = {
					eventId: best.eventId,
					eventShowId: best.id,
					// Performance scheduling set by stage manager
					performanceDate: best.overrides?.performanceDate ?? null,
					performance_date: best.overrides?.performanceDate ?? null,
					performanceOrder: best.overrides?.performanceOrder ?? null,
					performance_order: best.overrides?.performanceOrder ?? null,
					performanceStatus: best.overrides?.performanceStatus ?? null,
					performance_status: best.overrides?.performanceStatus ?? null,
					rehearsalOrder: best.overrides?.rehearsalOrder ?? null,
					rehearsal_order: best.overrides?.rehearsalOrder ?? null,
					rehearsalDate: best.overrides?.rehearsalDate ?? null,
					rehearsal_date: best.overrides?.rehearsalDate ?? null,
					rehearsalCompleted: best.overrides?.rehearsalCompleted ?? false,
					rehearsal_completed: best.overrides?.rehearsalCompleted ?? false,
					backstageColor: best.overrides?.backstageColor ?? null,
					backstage_color: best.overrides?.backstageColor ?? null,
					// Show info
					showName: best.overrides?.name || snap.name || "Show",
					mcNotes: best.overrides?.mcNotes || snap.mcNotes || "",
					mc_notes: best.overrides?.mcNotes || snap.mcNotes || "",
					status: best.status || "pending",
					// Snapshot data as fallback
					...snap,
					// Overrides take priority over snapshot
					...(best.overrides || {}),
				};
				assignedEventId = best.eventId;
			}

			// ── Also check EventArtistModel (draft artists added by stage manager) ─
			if (!eventAssignment) {
				const draftEntry = await EventArtistModel.findOne({
					$or: [{ id: artistId }, { email: fameLinkArtist.email?.toLowerCase() }],
				}).lean() as any;

				if (draftEntry) {
					eventAssignment = {
						eventId: draftEntry.eventId,
						performanceDate: draftEntry.performance_date ?? draftEntry.performanceDate ?? null,
						performance_date: draftEntry.performance_date ?? draftEntry.performanceDate ?? null,
						performanceOrder: draftEntry.performance_order ?? draftEntry.performanceOrder ?? null,
						performance_order: draftEntry.performance_order ?? draftEntry.performanceOrder ?? null,
						performanceStatus: draftEntry.performance_status ?? draftEntry.performanceStatus ?? null,
						performance_status: draftEntry.performance_status ?? draftEntry.performanceStatus ?? null,
						rehearsalOrder: draftEntry.rehearsal_order ?? null,
						rehearsal_order: draftEntry.rehearsal_order ?? null,
						rehearsalDate: draftEntry.rehearsal_date ?? null,
						rehearsal_date: draftEntry.rehearsal_date ?? null,
						rehearsalCompleted: draftEntry.rehearsal_completed ?? false,
						rehearsal_completed: draftEntry.rehearsal_completed ?? false,
						backstageColor: draftEntry.backstage_color ?? draftEntry.backstageColor ?? null,
						backstage_color: draftEntry.backstage_color ?? draftEntry.backstageColor ?? null,
						mcNotes: draftEntry.mcNotes ?? draftEntry.mc_notes ?? "",
						mc_notes: draftEntry.mcNotes ?? draftEntry.mc_notes ?? "",
						status: draftEntry.status || "pending",
					};
					assignedEventId = draftEntry.eventId;
				}
			}

			// Fetch dedicated artist logistics
			const logisticsDoc = await ArtistLogisticsModel.findOne({ artistId }).lean() as any;

			// Return the safe profile merged with event assignment data
			const {
				passwordHash,
				verificationToken,
				verificationTokenExpiry,
				...safeProfile
			} = fameLinkArtist;

			const merged = {
				...safeProfile,
				shows,
				isFameLinkArtist: true,
				// Flatten event assignment into top-level profile so the artist dashboard
				// receives performance_date, performance_order, etc. directly
				...(eventAssignment || {}),
				// Ensure eventId is always set
				eventId: assignedEventId || (safeProfile as any).eventId || null,
				// Include logistics
				logistics: logisticsDoc || null,
			};

			console.log(`[GET /api/artists/${artistId}] FameLink artist found. eventShows=${eventShows.length} eventId=${assignedEventId} performanceDate=${eventAssignment?.performanceDate}`);

			return NextResponse.json<APIResponse>({
				success: true,
				data: merged,
			});
		}

		// ── 2. Draft artist added manually by stage manager ──────────────────────
		const draftArtist = await EventArtistModel.findOne({ id: artistId }).lean() as any;

		if (draftArtist) {
			const logisticsDoc = await ArtistLogisticsModel.findOne({ artistId }).lean() as any;
			console.log(`[GET /api/artists/${artistId}] Draft artist found in eventId=${draftArtist.eventId}`);
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					...draftArtist,
					isFameLinkArtist: false,
					logistics: logisticsDoc || null,
				},
			});
		}

		// ── 3. Artist not found ────────────────────────────────────────────────
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "NOT_FOUND",
					message: "Artist not found",
				},
			},
			{ status: 404 },
		);
	} catch (error) {
		console.error("Get artist error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch artist",
				},
			},
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { artistId: string } },
) {
	try {
		const { artistId } = await Promise.resolve(params);
		const updateData = await request.json();

		await connectToDatabase();

		// Handle logistics extraction
		let updatedLogistics = null;
		if (updateData.logistics) {
			const logisticsPayload = updateData.logistics;
			delete updateData.logistics; // Remove from main artist data
			
			updatedLogistics = await ArtistLogisticsModel.findOneAndUpdate(
				{ artistId },
				{ 
					$set: { 
						...logisticsPayload, 
						updatedAt: new Date().toISOString() 
					},
					$setOnInsert: {
						id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						createdAt: new Date().toISOString()
					}
				},
				{ new: true, upsert: true, lean: true }
			) as any;
		}

		// First, check if this is a FameLink artist
		const fameLinkArtist = await getFameLinkArtistById(artistId);

		if (fameLinkArtist) {
			const { updateFameLinkArtist } = await import("@/lib/data-access");

			const updatedArtist = await updateFameLinkArtist({
				...fameLinkArtist,
				...updateData,
				updatedAt: new Date().toISOString(),
			});

			const {
				passwordHash: _pw,
				verificationToken: _vt,
				verificationTokenExpiry: _vte,
				...safeUpdated
			} = updatedArtist;
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					...safeUpdated,
					isFameLinkArtist: true,
					...(updatedLogistics ? { logistics: updatedLogistics } : {})
				},
			});
		}

		// Draft artist in EventArtistModel
		const updated = await EventArtistModel.findOneAndUpdate(
			{ id: artistId },
			{ $set: { ...updateData, updatedAt: new Date().toISOString() } },
			{ new: true, lean: true },
		) as any;

		if (updated) {
			return NextResponse.json<APIResponse>({
				success: true,
				data: {
					...updated,
					...(updatedLogistics ? { logistics: updatedLogistics } : {})
				},
			});
		}

		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "NOT_FOUND",
					message: "Artist not found",
				},
			},
			{ status: 404 },
		);
	} catch (error) {
		console.error("Update artist error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update artist",
				},
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { artistId: string } },
) {
	try {
		const { artistId } = await Promise.resolve(params);

		await connectToDatabase();

		const fameLinkArtist = await getFameLinkArtistById(artistId);
		if (!fameLinkArtist) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: { code: "NOT_FOUND", message: "Artist not found" },
				},
				{ status: 404 },
			);
		}

		const affectedEventIds: string[] = [];

		// 1. Delete all EventShows for this artist
		try {
			const eventShows = await getEventShowsByArtist(artistId);
			for (const es of eventShows) {
				await deleteEventShow(es.id, es.eventId);
				if (!affectedEventIds.includes(es.eventId)) affectedEventIds.push(es.eventId);
			}
		} catch (err) {
			console.error("Failed to delete EventShows:", err);
		}

		// 2. Delete all BaseShows for this artist
		try {
			const baseShows = await getBaseShowsByArtist(artistId);
			const { deleteBaseShow } = await import("@/lib/data-access");
			for (const show of baseShows) {
				await deleteBaseShow(show.id, artistId);
			}
		} catch (err) {
			console.error("Failed to delete BaseShows:", err);
		}

		// 3. Delete any draft EventArtist entries matching this artist
		try {
			await EventArtistModel.deleteMany({
				$or: [{ id: artistId }, { email: fameLinkArtist.email?.toLowerCase() }],
			});
		} catch (err) {
			console.error("Failed to delete EventArtist draft entries:", err);
		}

		// 4. Delete the FameLink artist profile
		await deleteFameLinkArtist(artistId);

		// 5. Broadcast WebSocket event
		if ((global as any).io) {
			const artistName = fameLinkArtist.artistName || fameLinkArtist.realName || "Artist";
			for (const eventId of affectedEventIds) {
				(global as any).io.to(`event_${eventId}`).emit("famelink_artist_deleted", {
					artistId, eventId, artistName, timestamp: new Date().toISOString(),
				});
			}
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: { message: "Account deleted successfully" },
		});
	} catch (error) {
		console.error("Delete artist error:", error);
		return NextResponse.json<APIResponse>(
			{ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete account" } },
			{ status: 500 },
		);
	}
}
