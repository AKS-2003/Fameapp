import { NextRequest, NextResponse } from "next/server";
import { EventShow } from "@/types/famelink";
import { EventDataService } from "@/lib/storage-service";
import { APIResponse } from "@/types";
import {
	getEventShowsByEvent,
	updateEventShowOverrides,
	updateEventShowStatus,
	getEventParticipation,
	updateEventParticipation,
	getFameLinkArtistById,
} from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel } from "@/database/models/FameLinkModels";
import { ContractService } from "@/lib/contract-service";

/** snapshotJson may be stored as a JSON string or as a plain object */
function parseSnapshot(raw: any): any {
	if (!raw) return {};
	if (typeof raw === "string") {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw;
}


export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } },
) {
	try {
		const { eventId, artistId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const requestedEventShowId = searchParams.get("eventShowId");

		// Get artist directly from MongoDB
		await connectToDatabase();
		const artist = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;

		if (!artist) {
			// Not in FAME artists.json — check if this is a FameLink EventShow submission
			try {
				const eventShows = await getEventShowsByEvent(eventId);
				// If a specific eventShowId was requested, find that exact show
				// Otherwise fall back to finding by artistId (first match)
				const eventShow = requestedEventShowId
					? eventShows.find(
							(es: EventShow) =>
								es.id === requestedEventShowId &&
								es.artistId === artistId,
						)
					: eventShows.find((es: EventShow) => es.artistId === artistId);

				if (!eventShow) {
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
				}

				// Return EventShow snapshot data merged with overrides in FAME artist format (READ-ONLY)
				const rawSnapshot = parseSnapshot(eventShow.snapshotJson);
				const snapshot = {
					...rawSnapshot,
					...(eventShow.overrides || {}),
					socialMedia: {
						...(rawSnapshot.socialMedia || {}),
						...(eventShow.overrides?.socialMedia || {}),
					},
				};
				const fameLinkArtist = await getFameLinkArtistById(artistId).catch(() => null) as any;

				let latestMusicTrack = fameLinkArtist?.musicTrack || snapshot.musicTrack || null;
				if (latestMusicTrack?.file_url && !latestMusicTrack.url) {
					latestMusicTrack = { ...latestMusicTrack, url: latestMusicTrack.file_url };
				}

				const galleryFiles = fameLinkArtist?.galleryFiles?.length
					? fameLinkArtist.galleryFiles
					: snapshot.galleryFiles || [];

				const rehearsalVideo = fameLinkArtist?.rehearsalVideo || snapshot.rehearsalVideo || null;
				const imageUrl = fameLinkArtist?.image_url || snapshot.profileImage || "";

				return NextResponse.json<APIResponse>({
					success: true,
					data: {
						artist: {
							id: eventShow.artistId,
							eventId,
							artistName: snapshot?.name || "FameLink Artist",
							realName: snapshot?.name || "",
							email: fameLinkArtist?.email || snapshot?.email || "",
							phone: fameLinkArtist?.phone || snapshot?.phone || "",
							style: snapshot?.style || "",
							performanceType: snapshot?.performanceType || "",
							performanceDuration: snapshot?.duration || 0,
							biography:
								snapshot?.biography ||
								snapshot?.description ||
								"",
							costumeColor: snapshot?.costumeColor || "",
							manualCostumeColor:
								snapshot?.manualCostumeColor || "",
							manualCostumeColorTwo:
								snapshot?.manualCostumeColorTwo || "",
							manualCostumeColorThree:
								snapshot?.manualCostumeColorThree || "",
							lightColorSingle: snapshot?.lightColorSingle || "",
							manualLightColor: snapshot?.manualLightColor || "",
							manualLightColorTwo:
								snapshot?.manualLightColorTwo || "",
							manualLightColorThree:
								snapshot?.manualLightColorThree || "",
							lightRequests: snapshot?.lightRequests || "",
							stagePositionStart:
								snapshot?.stagePositionStart || "",
							stagePositionEnd: snapshot?.stagePositionEnd || "",
							equipment: snapshot?.equipment || "",
							showLink: snapshot?.showLink || "",
							socialMedia: snapshot?.socialMedia || {},
							mcNotes: snapshot?.mcNotes || "",
							notes: snapshot?.notes || "",
							musicTrack: latestMusicTrack,
							galleryFiles: galleryFiles,
							rehearsalVideo: rehearsalVideo,
							image_url: imageUrl,
							members: snapshot?.members || [],
							tshirtSizes: snapshot?.tshirtSizes || [],
							isFameLinkSubmission: true,
							eventShowId: eventShow.id,
							baseShowId: eventShow.baseShowId,
							performanceDate:
								eventShow.overrides?.performanceDate || null,
							performance_date:
								eventShow.overrides?.performanceDate || null,
							artists_page_color:
								eventShow.overrides?.artistsPageColor || null,
							artistsPageColor:
								eventShow.overrides?.artistsPageColor || null,
							artists_page_tag:
								eventShow.overrides?.artistsPageTag || null,
							artistsPageTag:
								eventShow.overrides?.artistsPageTag || null,
							rehearsal_dept_notes:
								eventShow.overrides?.rehearsal_dept_notes || null,
							status: eventShow.status,
							createdAt: eventShow.createdAt,
							updatedAt: eventShow.updatedAt,
						},
					},
				});
			} catch (err) {
				console.error("Error fetching FameLink artist:", err);
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
			}
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				artist,
			},
		});
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

export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } },
) {
	try {
		const { eventId, artistId } = await Promise.resolve(params);
		const updateData = await request.json();

		// Fetch existing artist from MongoDB directly
		await connectToDatabase();
		const existingArtist = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;

		if (!existingArtist) {
			// Not a FAME draft artist - check if FameLink EventShow
			const eventShows = await getEventShowsByEvent(eventId);
			const fl = eventShows.find((es: any) => es.artistId === artistId);
			if (!fl) {
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
			}
			return NextResponse.json<APIResponse>({ success: false, error: { code: "NOT_SUPPORTED", message: "Use FameLink flow to update this artist" } }, { status: 400 });
		}

		// Build updated artist
		const updatedArtist = {
			...existingArtist,
			artistName: updateData.artistName,
			realName: updateData.realName,
			email: updateData.email,
			phone: updateData.phone,
			style: updateData.style,
			performanceType: updateData.performanceType,
			performanceDuration: updateData.performanceDuration,
			biography: updateData.biography,
			costumeColor: updateData.costumeColor,
			costumeColorTwo: updateData.costumeColorTwo,
			costumeColorThree: updateData.costumeColorThree,
			customCostumeColor: updateData.customCostumeColor,
			lightColorSingle: updateData.lightColorSingle,
			lightColorTwo: updateData.lightColorTwo,
			lightColorThree: updateData.lightColorThree,
			lightRequests: updateData.lightRequests,
			stagePositionStart: updateData.stagePositionStart,
			stagePositionEnd: updateData.stagePositionEnd,
			customStagePosition: updateData.customStagePosition,
			equipment: updateData.equipment,
			showLink: updateData.showLink,
			socialMedia: updateData.socialMedia,
			mcNotes: updateData.mcNotes,
			stageManagerNotes: updateData.stageManagerNotes,
			notes: updateData.notes,
			eventName: updateData.eventName,
			musicTrack:
				updateData.musicTrack || updateData.musicTracks?.[0] || null,
			galleryFiles: updateData.galleryFiles || [],
			rehearsalVideo:
				updateData.rehearsalVideo !== undefined
					? updateData.rehearsalVideo
					: existingArtist.rehearsalVideo || null,
			image_url:
				updateData.image_url !== undefined
					? updateData.image_url
					: existingArtist.image_url || "",
			// Nationality fields - preserve existing if not provided
			countryLiving:
				updateData.countryLiving !== undefined
					? updateData.countryLiving
					: existingArtist.countryLiving || "",
			homeCountry:
				updateData.homeCountry !== undefined
					? updateData.homeCountry
					: existingArtist.homeCountry || "",
			members:
				updateData.members !== undefined
					? updateData.members
					: existingArtist.members || [],
			// T-shirt sizes
			tshirtSizes:
				updateData.tshirtSizes ||
				existingArtist.tshirtSizes ||
				[],
			// Managed by
			managedBy:
				updateData.managedBy !== undefined
					? updateData.managedBy
					: existingArtist.managedBy || "",
			// Update status from draft to pending if completing registration
			status:
				existingArtist.status === "draft" && updateData.style
					? "pending"
					: updateData.status ||
						existingArtist.status ||
						"pending",
			updatedAt: new Date().toISOString(),
		};

		// Save to MongoDB directly
		await EventArtistModel.findOneAndUpdate(
			{ id: artistId, eventId },
			{ $set: updatedArtist },
			{ upsert: false, new: true },
		);

		// Broadcast WebSocket update if status changed from draft to pending
		if (
			existingArtist.status === "draft" &&
			updatedArtist.status === "pending" &&
			global.io
		) {
			console.log(
				`Broadcasting artist_registered event for ${updatedArtist.artistName} (draft -> pending)`,
			);
			global.io.to(`event_${eventId}`).emit("artist_registered", {
				eventId,
				artistId,
				artist_name: updatedArtist.artistName,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				artist: updatedArtist,
			},
		});
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

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } },
) {
	try {
		const { eventId, artistId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const updateData = await request.json();
		const requestedEventShowId = updateData.eventShowId || searchParams.get("eventShowId");

		// Try to find artist in MongoDB (FAME/draft artists)
		await connectToDatabase();
		const eventArtistDoc = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;
		const artists: any[] = eventArtistDoc ? [eventArtistDoc] : [];
		const artistIndex = eventArtistDoc ? 0 : -1;

		if (artistIndex === -1) {
			// Not a FAME/draft artist — check FameLink EventShow first, then contract blob
			try {
				const eventShows = await getEventShowsByEvent(eventId);
				const eventShow = requestedEventShowId
					? eventShows.find(
							(es: EventShow) =>
								es.id === requestedEventShowId &&
								es.artistId === artistId,
						)
					: eventShows.find((es: EventShow) => es.artistId === artistId);

				if (!eventShow) {
					// ── 3rd path: artist only exists in contract_artists blob ──
					// This is a manually-added contract artist. Save directly via ContractService.
					const workflowPayload: Record<string, any> = {};
					if (updateData.workflowContract !== undefined) workflowPayload.workflowContract = updateData.workflowContract;
					if (updateData.workflowLogistics !== undefined) workflowPayload.workflowLogistics = updateData.workflowLogistics;
					if (updateData.workflowShow !== undefined) workflowPayload.workflowShow = updateData.workflowShow;
					if (updateData.artists_page_color !== undefined) workflowPayload.artists_page_color = updateData.artists_page_color;
					if (updateData.artists_page_tag !== undefined) workflowPayload.artists_page_tag = updateData.artists_page_tag;
					if (updateData.artistsPageColor !== undefined) workflowPayload.artistsPageColor = updateData.artistsPageColor;
					if (updateData.artistsPageTag !== undefined) workflowPayload.artistsPageTag = updateData.artistsPageTag;
					// Also handle other general fields that may be passed
					const knownWorkflowKeys = new Set(Object.keys(workflowPayload));
					for (const key of Object.keys(updateData)) {
						if (!knownWorkflowKeys.has(key) && key !== 'eventShowId') {
							workflowPayload[key] = updateData[key];
						}
					}

					if (Object.keys(workflowPayload).length > 0) {
						const ok = await ContractService.updateArtist(eventId, artistId, workflowPayload);
						if (ok) {
							return NextResponse.json<APIResponse>({
								success: true,
								data: { artist: { id: artistId, eventId, ...workflowPayload } },
							});
						}
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
				}


				// This is a FameLink submission — route updates to EventShow.overrides
				// Respects data separation: never writes to BaseShow or ArtistProfile
				const overrideUpdates: Record<string, unknown> = {};

				if (
					updateData.performance_date !== undefined ||
					updateData.performanceDate !== undefined
				) {
					const perfDate =
						updateData.performance_date ??
						updateData.performanceDate;

					// Validate date if not null
					if (perfDate !== null) {
						let normalizedDate: string;
						try {
							normalizedDate = new Date(perfDate)
								.toISOString()
								.split("T")[0];
						} catch {
							return NextResponse.json<APIResponse>(
								{
									success: false,
									error: {
										code: "INVALID_DATE_FORMAT",
										message: "Invalid date format provided",
									},
								},
								{ status: 400 },
							);
						}

						// Validate against event showDates
						const eventData =
							await EventDataService.getEvent(eventId);
						if (eventData) {
							const showDates = eventData.showDates || [];
							const isValidDate = showDates.some(
								(showDate: string) => {
									const showDateStr = new Date(showDate)
										.toISOString()
										.split("T")[0];
									return showDateStr === normalizedDate;
								},
							);
							if (!isValidDate) {
								return NextResponse.json<APIResponse>(
									{
										success: false,
										error: {
											code: "INVALID_DATE",
											message: `The selected date is not a valid show date for this event.`,
										},
									},
									{ status: 400 },
								);
							}
						}

						overrideUpdates.performanceDate = normalizedDate;
					} else {
						overrideUpdates.performanceDate = null;
					}
				}

				if (updateData.performance_order !== undefined) {
					overrideUpdates.performanceOrder =
						updateData.performance_order;
				}
				if (updateData.backstage_color !== undefined) {
					overrideUpdates.backstageColor = updateData.backstage_color;
				}
				if (updateData.artists_page_color !== undefined) {
					overrideUpdates.artistsPageColor =
						updateData.artists_page_color;
				}
				if (updateData.notes !== undefined) {
					overrideUpdates.notes = updateData.notes;
				}
				if (
					updateData.mc_notes !== undefined ||
					updateData.mcNotes !== undefined
				) {
					overrideUpdates.mcNotes =
						updateData.mc_notes ?? updateData.mcNotes;
				}
				if (
					updateData.backstageReadyTime !== undefined ||
					updateData.backstage_ready_time !== undefined
				) {
					overrideUpdates.backstageReadyTime =
						updateData.backstageReadyTime ??
						updateData.backstage_ready_time;
				}
				if (
					updateData.showStartTime !== undefined ||
					updateData.show_start_time !== undefined
				) {
					overrideUpdates.showStartTime =
						updateData.showStartTime ?? updateData.show_start_time;
				}
				if (
					updateData.rehearsalStartTime !== undefined ||
					updateData.rehearsal_start_time !== undefined
				) {
					overrideUpdates.rehearsalStartTime =
						updateData.rehearsalStartTime ??
						updateData.rehearsal_start_time;
				}
				if (
					updateData.duration !== undefined ||
					updateData.performance_duration !== undefined
				) {
					overrideUpdates.duration =
						updateData.duration ?? updateData.performance_duration;
				}

				// Rehearsal fields — stored in overrides for FameLink artists
				if (updateData.rehearsal_order !== undefined) {
					overrideUpdates.rehearsalOrder = updateData.rehearsal_order;
				}
				if (updateData.rehearsal_date !== undefined) {
					overrideUpdates.rehearsalDate = updateData.rehearsal_date;
				}
				if (updateData.rehearsal_completed !== undefined) {
					overrideUpdates.rehearsalCompleted =
						updateData.rehearsal_completed;
				}
				if (updateData.rehearsal_marked !== undefined) {
					overrideUpdates.rehearsalMarked =
						updateData.rehearsal_marked;
				}
				if (updateData.quality_rating !== undefined) {
					overrideUpdates.qualityRating = updateData.quality_rating;
				}
				if (updateData.cue_notes !== undefined) {
					overrideUpdates.cueNotes = updateData.cue_notes;
				}
				if (updateData.rehearsal_dept_notes !== undefined) {
					overrideUpdates.rehearsal_dept_notes = updateData.rehearsal_dept_notes;
				}
				if (updateData.available_order !== undefined) {
					overrideUpdates.availableOrder = updateData.available_order;
				}
				if (updateData.performance_status !== undefined) {
					overrideUpdates.performanceStatus =
						updateData.performance_status;
				}
				if (updateData.is_confirmed !== undefined) {
					overrideUpdates.isConfirmed = updateData.is_confirmed;
				}
				if (updateData.is_completed !== undefined) {
					overrideUpdates.isCompleted = updateData.is_completed;
				}
				if (updateData.completed_at !== undefined) {
					overrideUpdates.completedAt = updateData.completed_at;
				}
				if (updateData.backstageColor !== undefined) {
					overrideUpdates.backstageColor = updateData.backstageColor;
				}
				if (updateData.artistsPageColor !== undefined) {
					overrideUpdates.artistsPageColor =
						updateData.artistsPageColor;
				}
				// artists_page_tag
				if (updateData.artists_page_tag !== undefined) {
					overrideUpdates.artistsPageTag = updateData.artists_page_tag;
				}
				// Workflow status fields (per-artist)
				if (updateData.workflowContract !== undefined) {
					overrideUpdates.workflowContract = updateData.workflowContract;
				}
				if (updateData.workflowLogistics !== undefined) {
					overrideUpdates.workflowLogistics = updateData.workflowLogistics;
				}
				if (updateData.workflowShow !== undefined) {
					overrideUpdates.workflowShow = updateData.workflowShow;
				}

				// Update EventShow overrides (safe — never touches snapshotJson)
				await updateEventShowOverrides(eventShow.id, eventId, {
					...eventShow.overrides,
					...overrideUpdates,
				});

				// ── Sync workflow & metadata fields to contract_artists blob ──
				// getUnifiedArtistsForEvent reads contract_artists for enriched artists.
				// FameLink artists that have been seen before may exist in that blob too.
				const contractSyncFields: Record<string, any> = {};
				if (overrideUpdates.workflowContract !== undefined) contractSyncFields.workflowContract = overrideUpdates.workflowContract;
				if (overrideUpdates.workflowLogistics !== undefined) contractSyncFields.workflowLogistics = overrideUpdates.workflowLogistics;
				if (overrideUpdates.workflowShow !== undefined) contractSyncFields.workflowShow = overrideUpdates.workflowShow;
				if (overrideUpdates.artistsPageColor !== undefined) contractSyncFields.artists_page_color = overrideUpdates.artistsPageColor;
				if (overrideUpdates.artistsPageTag !== undefined) contractSyncFields.artists_page_tag = overrideUpdates.artistsPageTag;
				if (Object.keys(contractSyncFields).length > 0) {
					ContractService.updateArtist(eventId, artistId, contractSyncFields).catch((e: Error) =>
						console.error("[PATCH FameLink] contract_artists blob sync failed:", e.message)
					);
				}

				// If assigning a performance date, update EventParticipation status to "confirmed"
				// and update EventShow status to "confirmed"
				const assigningDate =
					overrideUpdates.performanceDate !== undefined &&
					overrideUpdates.performanceDate !== null;
				const unassigningDate =
					overrideUpdates.performanceDate === null;

				if (assigningDate) {
					await updateEventShowStatus(
						eventShow.id,
						eventId,
						"confirmed",
					);

					try {
						const participation = await getEventParticipation(
							artistId,
							eventId,
						);
						if (
							participation &&
							participation.status !== "confirmed"
						) {
							await updateEventParticipation({
								...participation,
								status: "confirmed",
								confirmedAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							});
						}
					} catch (err) {
						console.error(
							"Error updating participation status:",
							err,
						);
					}
				} else if (unassigningDate) {
					await updateEventShowStatus(
						eventShow.id,
						eventId,
						"pending",
					);

					try {
						const participation = await getEventParticipation(
							artistId,
							eventId,
						);
						if (
							participation &&
							participation.status === "confirmed"
						) {
							await updateEventParticipation({
								...participation,
								status: "submitted",
								confirmedAt: undefined,
								updatedAt: new Date().toISOString(),
							});
						}
					} catch (err) {
						console.error(
							"Error reverting participation status:",
							err,
						);
					}
				}

				// Broadcast WebSocket events for FameLink artist updates
				if (global.io) {
					const artistName =
						eventShow.snapshotJson?.name || "FameLink Artist";

					if (overrideUpdates.performanceDate !== undefined) {
						const eventData = {
							eventId,
							artistId,
							id: artistId,
							artist_name: artistName,
							performance_date: overrideUpdates.performanceDate,
							isFameLinkSubmission: true,
							timestamp: new Date().toISOString(),
						};

						if (overrideUpdates.performanceDate === null) {
							global.io
								.to(`event_${eventId}`)
								.emit("artist_unassigned", eventData);
							// Also notify the artist's dashboard
							global.io
								.to(`user_${artistId}`)
								.emit("participation_status_changed", {
									...eventData,
									newStatus: "submitted",
								});
						} else {
							global.io
								.to(`event_${eventId}`)
								.emit("artist_assigned", eventData);
							// Also notify the artist's dashboard
							global.io
								.to(`user_${artistId}`)
								.emit("participation_status_changed", {
									...eventData,
									newStatus: "confirmed",
								});
						}
					}
				}

				const mergedOverrides = {
					...eventShow.overrides,
					...overrideUpdates,
				};
				const rawSnapshot = parseSnapshot(eventShow.snapshotJson);

				const snapshot = {
					...rawSnapshot,
					...mergedOverrides,
					socialMedia: {
						...(rawSnapshot.socialMedia || {}),
						...(mergedOverrides.socialMedia || {})
					}
				};
				return NextResponse.json<APIResponse>({
					success: true,
					data: {
						artist: {
							id: artistId,
							eventId,
							artistName: snapshot?.name || "FameLink Artist",
							isFameLinkSubmission: true,
							eventShowId: eventShow.id,
							performance_date:
								mergedOverrides.performanceDate ?? null,
							performanceDate:
								mergedOverrides.performanceDate ?? null,
							performance_order:
								mergedOverrides.performanceOrder ?? null,
							performance_status:
								mergedOverrides.performanceStatus ?? null,
							rehearsal_order:
								mergedOverrides.rehearsalOrder ?? null,
							rehearsal_date:
								mergedOverrides.rehearsalDate ?? null,
							rehearsal_completed:
								mergedOverrides.rehearsalCompleted ?? false,
							rehearsal_marked:
								mergedOverrides.rehearsalMarked ?? false,
							quality_rating:
								mergedOverrides.qualityRating ?? null,
							cue_notes: mergedOverrides.cueNotes ?? "",
							rehearsal_dept_notes: mergedOverrides.rehearsal_dept_notes ?? null,
							available_order:
								mergedOverrides.availableOrder ?? null,
							is_confirmed: mergedOverrides.isConfirmed ?? false,
							is_completed: mergedOverrides.isCompleted ?? false,
							completed_at: mergedOverrides.completedAt ?? null,
							backstage_color:
								mergedOverrides.backstageColor ?? null,
							artists_page_color:
								mergedOverrides.artistsPageColor ?? null,
							artists_page_tag:
								mergedOverrides.artistsPageTag ?? null,
							workflowContract:
								mergedOverrides.workflowContract ?? "Required",
							workflowLogistics:
								mergedOverrides.workflowLogistics ?? "Required",
							workflowShow:
								mergedOverrides.workflowShow ?? "Required",
							status: assigningDate
								? "confirmed"
								: eventShow.status,
						},
					},
				});
			} catch (err) {
				console.error("Error handling FameLink artist PATCH:", err);
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
			}
		}

		// VALIDATE PERFORMANCE DATE: If trying to assign a performance_date,
		// check if the date is valid and exists in the event's showDates
		if (
			updateData.performance_date !== undefined &&
			updateData.performance_date !== null
		) {
			// Normalize the performance date to YYYY-MM-DD format
			let normalizedPerformanceDate: string;
			try {
				normalizedPerformanceDate = new Date(
					updateData.performance_date,
				)
					.toISOString()
					.split("T")[0];
			} catch (error) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "INVALID_DATE_FORMAT",
							message: "Invalid date format provided",
						},
					},
					{ status: 400 },
				);
			}

			// Update the data with normalized date
			updateData.performance_date = normalizedPerformanceDate;

			// Get event data to validate against showDates
			const eventData = await EventDataService.getEvent(eventId);

			if (!eventData) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "EVENT_NOT_FOUND",
							message: "Event not found",
						},
					},
					{ status: 404 },
				);
			}

			// Check if the performance_date is in the event's showDates
			const showDates = eventData.showDates || [];
			const isValidDate = showDates.some((showDate: string) => {
				// Compare dates as strings (YYYY-MM-DD format)
				const showDateStr = new Date(showDate)
					.toISOString()
					.split("T")[0];
				return showDateStr === normalizedPerformanceDate;
			});

			if (!isValidDate) {
				return NextResponse.json<APIResponse>(
					{
						success: false,
						error: {
							code: "INVALID_DATE",
							message: `The selected date is not a valid show date for this event. Valid dates are: ${showDates.map((d: string) => new Date(d).toISOString().split("T")[0]).join(", ")}`,
						},
					},
					{ status: 400 },
				);
			}

			// PREVENT DUPLICATE ASSIGNMENT: Check if this artist is already assigned to a different date
			const currentArtist = artists[artistIndex];
			const currentDate =
				currentArtist.performanceDate || currentArtist.performance_date;

			// Normalize current date for comparison
			let normalizedCurrentDate: string | null = null;
			if (currentDate) {
				try {
					normalizedCurrentDate = new Date(currentDate)
						.toISOString()
						.split("T")[0];
				} catch (error) {
					console.error(
						"Error normalizing current date:",
						currentDate,
						error,
					);
				}
			}

			// Only prevent assignment if:
			// 1. Artist already has a performance date AND
			// 2. The new date is different from current date AND
			// 3. This is not a rehearsal-related update (allow rehearsal flow)
			// 4. Allow force override with query parameter
			if (
				normalizedCurrentDate &&
				normalizedCurrentDate !== normalizedPerformanceDate
			) {
				// Check if this is a "force" update or rehearsal-related update
				const forceAssign = searchParams.get("force") === "true";
				const isRehearsalUpdate =
					updateData.rehearsal_completed !== undefined ||
					updateData.rehearsal_order !== undefined ||
					updateData.rehearsal_date !== undefined;

				// Allow the update if it's forced or part of rehearsal flow
				if (!forceAssign && !isRehearsalUpdate) {
					return NextResponse.json<APIResponse>(
						{
							success: false,
							error: {
								code: "ALREADY_ASSIGNED",
								message: `This artist is already assigned to ${normalizedCurrentDate}. Please unassign them first before assigning to a new date, or add ?force=true to override.`,
								details: {
									currentDate: normalizedCurrentDate,
									newDate: normalizedPerformanceDate,
								},
							},
						},
						{ status: 409 },
					);
				}
			}
		}

		// Update only the provided fields
		// Handle both snake_case and camelCase for consistency
		const updatedArtist = {
			...artists[artistIndex],
			...updateData,
			updatedAt: new Date().toISOString(),
		};

		// Ensure mc_notes is also saved as mcNotes for consistency
		if (updateData.mc_notes !== undefined) {
			updatedArtist.mcNotes = updateData.mc_notes;
		}
		if (updateData.mcNotes !== undefined) {
			updatedArtist.mc_notes = updateData.mcNotes;
		}

		// Ensure performance_order is also saved as performanceOrder for consistency
		if (updateData.performance_order !== undefined) {
			updatedArtist.performanceOrder = updateData.performance_order;
		}

		// Ensure performance_date is also saved as performanceDate for consistency
		if (updateData.performance_date !== undefined) {
			updatedArtist.performanceDate = updateData.performance_date;
		}

		// Ensure performance_status is also saved as performanceStatus for consistency
		if (updateData.performance_status !== undefined) {
			updatedArtist.performanceStatus = updateData.performance_status;
		}

		// Save to MongoDB directly (EventArtistModel — draft/FAME artists)
		await EventArtistModel.findOneAndUpdate(
			{ id: artistId, eventId },
			{ $set: updatedArtist },
			{ upsert: false, new: true },
		);

		// ── Dual-write workflow & metadata fields to contract_artists blob ──
		// ContractService.getArtists() reads from EventDataModel (key: contract_artists),
		// which is a separate store from EventArtistModel. We keep both in sync so
		// that page refreshes always reflect the latest workflow state.
		const workflowOrMetaUpdate = [
			"workflowContract", "workflowLogistics", "workflowShow",
			"artists_page_color", "artistsPageColor",
			"artists_page_tag", "artistsPageTag",
		].some(k => updateData[k] !== undefined);
		if (workflowOrMetaUpdate) {
			const contractSyncPayload: Record<string, any> = {};
			if (updateData.workflowContract !== undefined) contractSyncPayload.workflowContract = updateData.workflowContract;
			if (updateData.workflowLogistics !== undefined) contractSyncPayload.workflowLogistics = updateData.workflowLogistics;
			if (updateData.workflowShow !== undefined) contractSyncPayload.workflowShow = updateData.workflowShow;
			if (updateData.artists_page_color !== undefined) contractSyncPayload.artists_page_color = updateData.artists_page_color;
			if (updateData.artistsPageColor !== undefined) contractSyncPayload.artistsPageColor = updateData.artistsPageColor;
			if (updateData.artists_page_tag !== undefined) contractSyncPayload.artists_page_tag = updateData.artists_page_tag;
			if (updateData.artistsPageTag !== undefined) contractSyncPayload.artistsPageTag = updateData.artistsPageTag;
			// Fire-and-forget — don't block the response
			ContractService.updateArtist(eventId, artistId, contractSyncPayload).catch((e: Error) =>
				console.error("[PATCH] contract_artists blob sync failed:", e.message)
			);
		}

		// Check if WebSocket events should be skipped (for batch updates)
		const skipWebSocket = searchParams.get("skipWebSocket") === "true";

		// Broadcast WebSocket updates to all connected clients for this event
		if (global.io && !skipWebSocket) {
			// Notify about rehearsal status or scheduling updates
			const isRehearsalFieldUpdated =
				updateData.rehearsal_completed !== undefined ||
				updateData.rehearsal_order !== undefined ||
				updateData.rehearsal_date !== undefined ||
				updateData.rehearsal_marked !== undefined ||
				updateData.rehearsalCompleted !== undefined ||
				updateData.rehearsalOrder !== undefined ||
				updateData.rehearsalDate !== undefined ||
				updateData.rehearsalMarked !== undefined;

			if (isRehearsalFieldUpdated) {
				let action = "updated";
				if (updateData.rehearsal_completed !== undefined || updateData.rehearsalCompleted !== undefined) {
					action = (updateData.rehearsal_completed ?? updateData.rehearsalCompleted) ? "completed" : "uncompleted";
				} else if (updateData.rehearsal_date !== undefined || updateData.rehearsalDate !== undefined) {
					const dateVal = updateData.rehearsal_date ?? updateData.rehearsalDate;
					action = dateVal ? "scheduled" : "removed";
				} else if (updateData.rehearsal_order !== undefined || updateData.rehearsalOrder !== undefined) {
					action = "reordered";
				}

				global.io.to(`event_${eventId}`).emit("rehearsal_updated", {
					eventId,
					artistId,
					id: artistId,
					artist_name: updatedArtist.artistName || updatedArtist.artist_name || "Artist",
					action,
					rehearsal_completed: updatedArtist.rehearsal_completed,
					rehearsal_order: updatedArtist.rehearsal_order,
					rehearsal_date: updatedArtist.rehearsal_date,
					performance_order: updatedArtist.performance_order,
					performance_status: updatedArtist.performance_status,
					timestamp: new Date().toISOString(),
				});
			}

			// Notify about artist status changes
			if (updateData.performance_status !== undefined) {
				global.io.to(`event_${eventId}`).emit("artist_status_changed", {
					eventId,
					id: artistId,
					artist_name: updatedArtist.artistName,
					performance_status: updateData.performance_status,
					timestamp: new Date().toISOString(),
				});
			}

			// Notify about performance order changes
			if (updateData.performance_order !== undefined) {
				global.io
					.to(`event_${eventId}`)
					.emit("performance-order-update", {
						eventId,
						type: "artist",
						action:
							updateData.performance_order === null
								? "removed"
								: "updated",
						artistId,
						artist_name: updatedArtist.artistName,
						timestamp: new Date().toISOString(),
					});
			}

			// Notify about performance date changes
			if (updateData.performance_date !== undefined) {
				const eventData = {
					eventId,
					artistId,
					id: artistId,
					artist_name: updatedArtist.artistName,
					performance_date: updateData.performance_date,
					timestamp: new Date().toISOString(),
				};

				if (updateData.performance_date === null) {
					// Artist unassigned
					global.io
						.to(`event_${eventId}`)
						.emit("artist_unassigned", eventData);
					global.io
						.to(`user_artist_${artistId}`)
						.emit("artist_unassigned", eventData);
				} else {
					// Artist assigned
					global.io
						.to(`event_${eventId}`)
						.emit("artist_assigned", eventData);
					global.io
						.to(`user_artist_${artistId}`)
						.emit("artist_assigned", eventData);
				}
			}

			// Notify about MC notes changes
			if (
				updateData.mc_notes !== undefined ||
				updateData.mcNotes !== undefined
			) {
				global.io.to(`event_${eventId}`).emit("artist_status_changed", {
					eventId,
					id: artistId,
					artistId,
					artist_name: updatedArtist.artistName,
					action: "mc_notes_updated",
					mc_notes: updatedArtist.mc_notes || updatedArtist.mcNotes,
					timestamp: new Date().toISOString(),
				});
			}

			// Notify about backstage color changes
			if (updateData.backstage_color !== undefined) {
				global.io.to(`event_${eventId}`).emit("artist_color_updated", {
					eventId,
					artistId,
					id: artistId,
					artist_name: updatedArtist.artistName,
					backstage_color: updateData.backstage_color,
					performanceDate:
						updatedArtist.performanceDate ||
						updatedArtist.performance_date,
					timestamp: new Date().toISOString(),
				});
			}

			// Notify about completion status changes
			if (updateData.is_completed !== undefined) {
				global.io
					.to(`event_${eventId}`)
					.emit("artist_completion_toggled", {
						eventId,
						artistId,
						id: artistId,
						artist_name: updatedArtist.artistName,
						is_completed: updateData.is_completed,
						completed_at: updateData.completed_at,
						performanceDate:
							updatedArtist.performanceDate ||
							updatedArtist.performance_date,
						timestamp: new Date().toISOString(),
					});
			}
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				artist: updatedArtist,
			},
		});
	} catch (error) {
		console.error("Patch artist error:", error);
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
	{ params }: { params: { eventId: string; artistId: string } },
) {
	try {
		const { eventId, artistId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const requestedEventShowId = searchParams.get("eventShowId");

		// Delete from MongoDB directly (FAME/draft artist)
		await connectToDatabase();
		const artistToDelete = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;
		const deletedCount = artistToDelete ? (await EventArtistModel.deleteOne({ id: artistId, eventId })).deletedCount : 0;

		if (!artistToDelete || deletedCount === 0) {
			// Not a FAME/draft artist artists.json — check if this is a FameLink EventShow submission
			try {
				const eventShows = await getEventShowsByEvent(eventId);
				// Use specific eventShowId if provided, otherwise fall back to first show for this artist
				const eventShow = requestedEventShowId
					? eventShows.find(es => es.id === requestedEventShowId && es.artistId === artistId)
					: eventShows.find(es => es.artistId === artistId);

				if (!eventShow) {
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
				}

				// Import deleteEventShow dynamically to avoid circular deps
				const { deleteEventShow } = await import("@/lib/data-access");

				// Delete the EventShow (this only removes the event copy, never touches BaseShow)
				await deleteEventShow(eventShow.id, eventId);

				// Broadcast WebSocket update
				if (global.io) {
					global.io.to(`event_${eventId}`).emit("artist_deleted", {
						eventId,
						id: artistId,
						artist_name:
							eventShow.overrides?.name || eventShow.snapshotJson?.name || "FameLink Artist",
						isFameLinkSubmission: true,
						timestamp: new Date().toISOString(),
					});
				}

				return NextResponse.json<APIResponse>({
					success: true,
					data: {
						message:
							"FameLink artist submission removed from event",
					},
				});
			} catch (err) {
				console.error("Error deleting FameLink artist:", err);
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
			}
		}

		// Broadcast WebSocket update
		if (artistToDelete && global.io) {
			global.io.to(`event_${eventId}`).emit("artist_deleted", {
				eventId,
				id: artistId,
				artist_name: artistToDelete.artistName,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: {
				message: "Artist deleted successfully",
			},
		});
	} catch (error) {
		console.error("Delete artist error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to delete artist",
				},
			},
			{ status: 500 },
		);
	}
}
