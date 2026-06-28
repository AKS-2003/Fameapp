import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { APIResponse, Event } from "@/types";
import { getEvent, updateEvent, deleteEvent } from "@/lib/storage-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	try {
		const resolvedParams = await params;
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 }
			);
		}

		if (
			session.role !== "stage_manager" &&
			session.role !== "super_admin"
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "Access denied. Stage manager role required.",
					},
				},
				{ status: 403 }
			);
		}

		const eventData = await getEvent(resolvedParams.eventId);

		if (!eventData) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Event not found",
					},
				},
				{ status: 404 }
			);
		}

		const event = eventData as Event;

		// Check if user has access to this event
		if (
			session.role !== "super_admin" &&
			event.stageManagerId !== session.userId
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message:
							"Access denied. You don't have permission to view this event.",
					},
				},
				{ status: 403 }
			);
		}

		return NextResponse.json<APIResponse>({
			success: true,
			data: { event },
		});
	} catch (error) {
		console.error("Get event API error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to load event",
				},
			},
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	try {
		const resolvedParams = await params;
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 }
			);
		}

		if (
			session.role !== "stage_manager" &&
			session.role !== "super_admin"
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "Access denied. Stage manager role required.",
					},
				},
				{ status: 403 }
			);
		}

		const eventData = await getEvent(resolvedParams.eventId);

		if (!eventData) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Event not found",
					},
				},
				{ status: 404 }
			);
		}

		const event = eventData as Event;

		// Check if user has access to this event
		if (
			session.role !== "super_admin" &&
			event.stageManagerId !== session.userId
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message:
							"Access denied. You don't have permission to edit this event.",
					},
				},
				{ status: 403 }
			);
		}

		const body = await request.json();
		const updatedEvent = await updateEvent(resolvedParams.eventId, body);

		return NextResponse.json<APIResponse>({
			success: true,
			data: { event: updatedEvent },
		});
	} catch (error) {
		console.error("Update event API error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update event",
				},
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> }
) {
	try {
		const resolvedParams = await params;
		const session = getSessionFromRequest(request);

		if (!session) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required",
					},
				},
				{ status: 401 }
			);
		}

		if (
			session.role !== "stage_manager" &&
			session.role !== "super_admin"
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "Access denied. Stage manager role required.",
					},
				},
				{ status: 403 }
			);
		}

		const eventData = await getEvent(resolvedParams.eventId);

		if (!eventData) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Event not found",
					},
				},
				{ status: 404 }
			);
		}

		const event = eventData as Event;

		// Check if user has access to this event
		if (
			session.role !== "super_admin" &&
			event.stageManagerId !== session.userId
		) {
			return NextResponse.json<APIResponse>(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message:
							"Access denied. You don't have permission to delete this event.",
					},
				},
				{ status: 403 }
			);
		}

		await deleteEvent(resolvedParams.eventId);

		return NextResponse.json<APIResponse>({
			success: true,
			data: { message: "Event deleted successfully" },
		});
	} catch (error) {
		console.error("Delete event API error:", error);
		return NextResponse.json<APIResponse>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to delete event",
				},
			},
			{ status: 500 }
		);
	}
}
