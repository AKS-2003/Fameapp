import { NextRequest, NextResponse } from "next/server";
import { getEventById, getEventData, saveEventData } from "@/lib/data-access";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, EventShowModel } from "@/database/models/FameLinkModels";

// Declare global io for WebSocket
declare global {
	var io: any;
}

/**
 * Normalize a date string to YYYY-MM-DD format for consistent file naming
 */
function normalizeDate(dateStr: string): string {
	if (!dateStr) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
	if (dateStr.includes("T")) return dateStr.split("T")[0];
	try {
		const date = new Date(dateStr);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	} catch (error) {
		return dateStr;
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const performanceDateParam = searchParams.get("performanceDate");

		if (!performanceDateParam) {
			return NextResponse.json({ success: false, error: "Performance date is required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const key = `show_order_${performanceDate}`;
		
        // Use MongoDB instead of GCS
		const showOrderData = await getEventData(eventId, key);

		if (!showOrderData) {
			return NextResponse.json({
				success: true,
				data: {
					order: [],
					version: 0,
					timestamp: new Date().toISOString(),
					isDraft: true,
					isConfirmed: false,
				},
			});
		}

		return NextResponse.json({ success: true, data: showOrderData });
	} catch (error) {
		console.error("Error fetching show order:", error);
		return NextResponse.json({ success: false, error: "Failed to fetch show order from MongoDB" }, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { performanceDate: performanceDateParam, newOrder, clientRequestId, isDraft, isConfirmed } = body;

		if (!performanceDateParam || !newOrder || !Array.isArray(newOrder)) {
			return NextResponse.json({ success: false, error: "Performance date and newOrder array are required" }, { status: 400 });
		}

		const performanceDate = normalizeDate(performanceDateParam);
		const eventData = await getEventById(eventId);
		if (!eventData) {
			return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
		}

		// Connect to DB and update the individual items' performance order
		await connectToDatabase();

		for (const item of newOrder) {
			const { id, type, performance_order } = item;
			if (type === "artist") {
				// 1. Try updating manual/draft artist in EventArtistModel
				const result = await EventArtistModel.updateOne(
					{ id, eventId },
					{
						$set: {
							performance_order,
							performanceOrder: performance_order,
							performance_date: performanceDate,
							performanceDate: performanceDate,
							updatedAt: new Date().toISOString()
						}
					}
				);
				
				// 2. If no match in EventArtistModel, update EventShow overrides (FameLink artist)
				if (result.matchedCount === 0) {
					let eventShow = await EventShowModel.findOne({ id, eventId });
					if (!eventShow) {
						eventShow = await EventShowModel.findOne({ artistId: id, eventId });
					}
					if (eventShow) {
						const overrides = eventShow.overrides || {};
						await EventShowModel.updateOne(
							{ id: eventShow.id, eventId },
							{
								$set: {
									overrides: {
										...overrides,
										performanceOrder: performance_order,
										performance_order: performance_order,
										performanceDate: performanceDate,
										performance_date: performanceDate
									},
									updatedBy: "stage_manager",
									updatedAt: new Date()
								}
							}
						);
					}
				}
			}
		}

		// 3. Update Cues order
		const cuesKey = `cues:${performanceDate}`;
		let cues = await getEventData(eventId, cuesKey) || [];
		const cueUpdates = newOrder.filter(item => item.type === "cue");
		if (cueUpdates.length > 0 && cues.length > 0) {
			let cuesChanged = false;
			cues = cues.map((cue: any) => {
				const matchingUpdate = cueUpdates.find(u => u.id === cue.id);
				if (matchingUpdate) {
					cuesChanged = true;
					return {
						...cue,
						performance_order: matchingUpdate.performance_order,
						updated_at: new Date().toISOString()
					};
				}
				return cue;
			});
			if (cuesChanged) {
				await saveEventData(eventId, cuesKey, cues);
			}
		}

		const key = `show_order_${performanceDate}`;
		const currentData = await getEventData(eventId, key);
		const currentVersion = currentData?.version || 0;
		const newVersion = currentVersion + 1;
		const timestamp = new Date().toISOString();

		const showOrderData = {
			eventId,
			performanceDate,
			order: newOrder,
			version: newVersion,
			timestamp,
			updatedBy: "stage_manager",
			clientRequestId,
			isDraft: isDraft !== undefined ? isDraft : true,
			isConfirmed: isConfirmed !== undefined ? isConfirmed : false,
		};

        // Save to MongoDB
		await saveEventData(eventId, key, showOrderData);

		// Broadcast WebSocket event
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("show-order-updated", {
				eventId, performanceDate, newOrder, version: newVersion, timestamp,
				source: "stage_manager", clientRequestId, isDraft: showOrderData.isDraft,
				isConfirmed: showOrderData.isConfirmed,
			});
		}

		return NextResponse.json({ success: true, data: { version: newVersion, timestamp, order: newOrder } });
	} catch (error) {
		console.error("Error updating show order:", error);
		return NextResponse.json({ success: false, error: "Failed to update show order on VPS" }, { status: 500 });
	}
}
