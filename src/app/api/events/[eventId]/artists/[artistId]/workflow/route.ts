import { NextRequest, NextResponse } from "next/server";
import { ContractService } from "@/lib/contract-service";
import { connectToDatabase } from "@/database/mongodb";
import { EventArtistModel, EventShowModel } from "@/database/models/FameLinkModels";
import { updateEventShowOverrides } from "@/lib/data-access";

/**
 * PATCH /api/events/[eventId]/artists/[artistId]/workflow
 * Saves workflow status (Contract/Logistics/Show) for a specific artist.
 * Works for ALL artist types:
 *   1. Contract-blob artist  → ContractService.updateArtist
 *   2. Draft/FAME artist     → EventArtistModel + ContractService.updateArtist
 *   3. FameLink artist       → EventShow.overrides + ContractService.updateArtist
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; artistId: string } },
) {
  try {
    const { eventId, artistId } = await Promise.resolve(params);
    const body = await request.json();

    const { workflowContract, workflowLogistics, workflowShow, ...rest } = body;

    await connectToDatabase();

    const payload: Record<string, any> = {};
    if (workflowContract !== undefined) payload.workflowContract = workflowContract;
    if (workflowLogistics !== undefined) payload.workflowLogistics = workflowLogistics;
    if (workflowShow !== undefined) payload.workflowShow = workflowShow;
    // allow extra fields (color, tag, etc.)
    Object.assign(payload, rest);

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    let saved = false;

    // ── Path 1: Draft / FAME artist in EventArtistModel ──
    const draftDoc = await EventArtistModel.findOne({ id: artistId, eventId }).lean() as any;
    if (draftDoc) {
      await EventArtistModel.findOneAndUpdate(
        { id: artistId, eventId },
        { $set: { ...payload, updatedAt: new Date().toISOString() } },
        { upsert: false, new: true },
      );
      saved = true;
    }

    // ── Path 2: FameLink artist in EventShowModel ──
    const eventShow = await EventShowModel.findOne({ eventId, artistId }).lean() as any;
    if (eventShow) {
      const overrideUpdates: Record<string, any> = { ...eventShow.overrides };
      if (workflowContract !== undefined) overrideUpdates.workflowContract = workflowContract;
      if (workflowLogistics !== undefined) overrideUpdates.workflowLogistics = workflowLogistics;
      if (workflowShow !== undefined) overrideUpdates.workflowShow = workflowShow;
      if (rest.artists_page_color !== undefined) overrideUpdates.artistsPageColor = rest.artists_page_color;
      if (rest.artists_page_tag !== undefined) overrideUpdates.artistsPageTag = rest.artists_page_tag;
      await updateEventShowOverrides(eventShow.id, eventId, overrideUpdates);
      saved = true;
    }

    // ── Path 3 (always): Sync to contract_artists blob ──
    // This is the authoritative source for getUnifiedArtistsForEvent.
    // ContractService.updateArtist will create the entry in the blob if it doesn't exist.
    const contractOk = await ContractService.updateArtist(eventId, artistId, payload);
    if (contractOk) saved = true;

    if (saved) {
      return NextResponse.json({
        success: true,
        data: { id: artistId, eventId, ...payload },
      });
    }

    return NextResponse.json(
      { success: false, error: "Artist not found in any store" },
      { status: 404 },
    );
  } catch (error) {
    console.error("[workflow PATCH] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
