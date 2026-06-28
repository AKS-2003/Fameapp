import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData } from "@/lib/data-access";
import {
	generateDefaultChecklist,
	type EventChecklist,
	type ChecklistItem,
	type ChecklistStatus,
	type ChecklistPhase,
} from "@/lib/checklist-template";

// Declare global io for WebSocket
declare global {
	var io: any;
}

function getChecklistKey(): string {
	return `checklist`;
}

// GET — fetch checklist, auto-create default if missing
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const key = getChecklistKey();

		let checklist = await getEventData(eventId, key);

		if (!checklist) {
			// Return default empty structure but don't persist yet
			checklist = generateDefaultChecklist(eventId);
		}

		return NextResponse.json({ success: true, data: checklist });
	} catch (error) {
		console.error("Error fetching checklist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch checklist" },
			{ status: 500 }
		);
	}
}

// PUT — full checklist update (for bulk operations like import/reset)
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const key = getChecklistKey();

		const current = await getEventData(eventId, key);
		const version = (current?.version || 0) + 1;

		const updated: EventChecklist = {
			...body,
			eventId,
			updatedAt: new Date().toISOString(),
			version,
		};

		await saveEventData(eventId, key, updated);

		// Broadcast via WebSocket
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("checklist_updated", {
				eventId,
				action: body.action || "bulk_update",
				checklist: updated,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json({ success: true, data: updated });
	} catch (error) {
		console.error("Error updating checklist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update checklist" },
			{ status: 500 }
		);
	}
}

// PATCH — update individual item or perform specific action
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = await Promise.resolve(params);
		const body = await request.json();
		const { action } = body;
		const key = getChecklistKey();

		let checklist: EventChecklist = await getEventData(eventId, key);
		if (!checklist) {
			checklist = generateDefaultChecklist(eventId);
		}

		const now = new Date().toISOString();

		switch (action) {
			case "update_status": {
				const { itemId, status } = body;
				checklist.items = checklist.items.map((item) =>
					item.id === itemId
						? { ...item, status: status as ChecklistStatus, updatedAt: now }
						: item
				);
				break;
			}

			case "update_item": {
				const { itemId: editItemId, updates } = body;
				checklist.items = checklist.items.map((item) =>
					item.id === editItemId
						? { ...item, ...updates, updatedAt: now }
						: item
				);
				break;
			}

			case "add_item": {
				const newItem: ChecklistItem = {
					id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
					phase: body.phase as ChecklistPhase,
					category: body.category || "Custom",
					title: body.title,
					status: "pending",
					owner: body.owner || "",
					notes: body.notes || "",
					createdAt: now,
					updatedAt: now,
					isCustom: true,
				};
				checklist.items.push(newItem);
				break;
			}

			case "delete_item": {
				const { itemId: deleteItemId } = body;
				checklist.items = checklist.items.filter(
					(item) => item.id !== deleteItemId
				);
				break;
			}

			case "reset_completion": {
				checklist.items = checklist.items.map((item) => ({
					...item,
					status: "pending" as ChecklistStatus,
					updatedAt: now,
				}));
				break;
			}

			default:
				return NextResponse.json(
					{ success: false, error: `Unknown action: ${action}` },
					{ status: 400 }
				);
		}

		checklist.updatedAt = now;
		checklist.version = (checklist.version || 0) + 1;

		await saveEventData(eventId, key, checklist);

		// Broadcast via WebSocket
		if (global.io) {
			global.io.to(`event_${eventId}`).emit("checklist_updated", {
				eventId,
				action,
				checklist,
				itemId: body.itemId || body.deleteItemId,
				timestamp: now,
			});
		}

		return NextResponse.json({ success: true, data: checklist });
	} catch (error) {
		console.error("Error patching checklist:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to update checklist" },
			{ status: 500 }
		);
	}
}
