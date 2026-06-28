import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";

// Declare global io for WebSocket
declare global {
	var io: any;
}

export interface ShowDateInfo {
	id: string;
	eventId: string;
	showDate: string;
	rehearsalTiming: string;
	location: string;
	showtime: string;
	backstageReadyTime: string;
	stageManagerName: string;
	stageManagerContact: string;
	notes: string;
	attachments: Array<{
		id: string;
		fileName: string;
		originalName: string;
		fileUrl: string;
		uploadedAt: string;
	}>;
	createdAt: string;
	updatedAt: string;
}

const getInfoKey = () => "show_date_info";

// GET - Fetch show date info for an event
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const { searchParams } = new URL(request.url);
		const showDate = searchParams.get("showDate");

		const data = await getEventData(eventId, getInfoKey());

		if (!data) {
			return NextResponse.json({
				success: true,
				data: [],
			});
		}

		const showDateInfoList: ShowDateInfo[] = data.showDateInfo || [];

		// If specific show date requested, filter
		if (showDate) {
			const info = showDateInfoList.find((item) => {
				const itemDate = item.showDate.includes("T")
					? item.showDate.split("T")[0]
					: item.showDate;
				const queryDate = showDate.includes("T")
					? showDate.split("T")[0]
					: showDate;
				return itemDate === queryDate;
			});

			const response = NextResponse.json({
				success: true,
				data: info || null,
			});
			// Prevent caching
			response.headers.set(
				"Cache-Control",
				"no-store, no-cache, must-revalidate, proxy-revalidate",
			);
			response.headers.set("Pragma", "no-cache");
			response.headers.set("Expires", "0");
			return response;
		}

		const response = NextResponse.json({
			success: true,
			data: showDateInfoList,
		});
		// Prevent caching
		response.headers.set(
			"Cache-Control",
			"no-store, no-cache, must-revalidate, proxy-revalidate",
		);
		response.headers.set("Pragma", "no-cache");
		response.headers.set("Expires", "0");
		return response;
	} catch (error) {
		console.error("Error fetching show date info:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch show date info",
			},
			{ status: 500 },
		);
	}
}

// POST - Create new show date info
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		const {
			showDate,
			rehearsalTiming,
			location,
			showtime,
			backstageReadyTime,
			stageManagerName,
			stageManagerContact,
			notes,
			attachments,
		} = body;

		if (!showDate) {
			return NextResponse.json(
				{
					success: false,
					error: "Show date is required",
				},
				{ status: 400 },
			);
		}

		const existingData = await getEventData(eventId, getInfoKey());
		const showDateInfoList: ShowDateInfo[] =
			existingData?.showDateInfo || [];

		// Check if info for this date already exists
		const existingIndex = showDateInfoList.findIndex((item) => {
			const itemDate = item.showDate.includes("T")
				? item.showDate.split("T")[0]
				: item.showDate;
			const queryDate = showDate.includes("T")
				? showDate.split("T")[0]
				: showDate;
			return itemDate === queryDate;
		});

		// If already exists, return error - should use PUT for updates
		if (existingIndex >= 0) {
			return NextResponse.json(
				{
					success: false,
					error: "Show date info already exists. Use PUT to update.",
					existingId: showDateInfoList[existingIndex].id,
				},
				{ status: 409 },
			);
		}

		const now = new Date().toISOString();
		const newInfo: ShowDateInfo = {
			id: `sdi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			eventId,
			showDate,
			rehearsalTiming: rehearsalTiming || "",
			location: location || "",
			showtime: showtime || "",
			backstageReadyTime: backstageReadyTime || "",
			stageManagerName: stageManagerName || "",
			stageManagerContact: stageManagerContact || "",
			notes: notes || "",
			attachments: attachments || [],
			createdAt: now,
			updatedAt: now,
		};

		showDateInfoList.push(newInfo);

		await saveEventData(eventId, getInfoKey(), {
			showDateInfo: showDateInfoList,
			updatedAt: now,
		});

		// Emit WebSocket event for real-time updates
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("show_date_info_updated", {
				eventId,
				showDate,
				showDateInfo: newInfo,
				isNew: true,
				timestamp: new Date().toISOString(),
			});
			console.log(
				`Show date info created - WebSocket event emitted for event ${eventId}, date ${showDate}`,
			);
		}

		return NextResponse.json({
			success: true,
			data: newInfo,
			message: "Show date info created",
			isNew: true,
		});
	} catch (error) {
		console.error("Error creating show date info:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create show date info",
			},
			{ status: 500 },
		);
	}
}

// PUT - Update existing show date info
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } },
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();

		const {
			showDate,
			rehearsalTiming,
			location,
			showtime,
			backstageReadyTime,
			stageManagerName,
			stageManagerContact,
			notes,
			attachments,
		} = body;

		if (!showDate) {
			return NextResponse.json(
				{
					success: false,
					error: "Show date is required",
				},
				{ status: 400 },
			);
		}

		const existingData = await getEventData(eventId, getInfoKey());
		const showDateInfoList: ShowDateInfo[] =
			existingData?.showDateInfo || [];

		// Find existing info for this date
		const existingIndex = showDateInfoList.findIndex((item) => {
			const itemDate = item.showDate.includes("T")
				? item.showDate.split("T")[0]
				: item.showDate;
			const queryDate = showDate.includes("T")
				? showDate.split("T")[0]
				: showDate;
			return itemDate === queryDate;
		});

		const now = new Date().toISOString();

		// If doesn't exist, create new (upsert behavior)
		if (existingIndex < 0) {
			const newInfo: ShowDateInfo = {
				id: `sdi_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`,
				eventId,
				showDate,
				rehearsalTiming: rehearsalTiming || "",
				location: location || "",
				showtime: showtime || "",
				backstageReadyTime: backstageReadyTime || "",
				stageManagerName: stageManagerName || "",
				stageManagerContact: stageManagerContact || "",
				notes: notes || "",
				attachments: attachments || [],
				createdAt: now,
				updatedAt: now,
			};
			showDateInfoList.push(newInfo);

			await saveEventData(eventId, getInfoKey(), {
				showDateInfo: showDateInfoList,
				updatedAt: now,
			});

			// Emit WebSocket event for real-time updates
			if (global.io) {
				global.io
					.to(`event_${eventId}`)
					.emit("show_date_info_updated", {
						eventId,
						showDate,
						showDateInfo: newInfo,
						isNew: true,
						timestamp: new Date().toISOString(),
					});
				console.log(
					`Show date info created (upsert) - WebSocket event emitted for event ${eventId}, date ${showDate}`,
				);
			}

			return NextResponse.json({
				success: true,
				data: newInfo,
				message: "Show date info created",
				isNew: true,
			});
		}

		// Update existing
		const updatedInfo: ShowDateInfo = {
			...showDateInfoList[existingIndex],
			rehearsalTiming: rehearsalTiming || "",
			location: location || "",
			showtime: showtime || "",
			backstageReadyTime: backstageReadyTime || "",
			stageManagerName: stageManagerName || "",
			stageManagerContact: stageManagerContact || "",
			notes: notes || "",
			attachments: attachments || [],
			updatedAt: now,
		};

		showDateInfoList[existingIndex] = updatedInfo;

		await saveEventData(eventId, getInfoKey(), {
			showDateInfo: showDateInfoList,
			updatedAt: now,
		});

		// Emit WebSocket event for real-time updates
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("show_date_info_updated", {
				eventId,
				showDate,
				showDateInfo: updatedInfo,
				isNew: false,
				timestamp: new Date().toISOString(),
			});
			console.log(
				`Show date info updated - WebSocket event emitted for event ${eventId}, date ${showDate}`,
			);
		}

		return NextResponse.json({
			success: true,
			data: updatedInfo,
			message: "Show date info updated",
			isNew: false,
		});
	} catch (error) {
		console.error("Error updating show date info:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update show date info",
			},
			{ status: 500 },
		);
	}
}
