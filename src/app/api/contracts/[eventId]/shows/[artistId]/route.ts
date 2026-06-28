import { NextRequest, NextResponse } from "next/server";
import { 
  getEventShowsByArtistAndEventArray, 
  updateEventShowStatus,
  getBaseShow,
  getBaseShowsByArtist
} from "@/lib/data-access";
import { EventArtistModel, EventParticipationModel } from "@/database/models/FameLinkModels";
import { connectToDatabase } from "@/database/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; artistId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { eventId, artistId } = resolvedParams;
    console.log(`[ShowAPI GET] Fetching show for artist: ${artistId}, event: ${eventId}`);

    // Fetch the event shows for this artist and event
    const eventShows = await getEventShowsByArtistAndEventArray(artistId, eventId);
    console.log(`[ShowAPI GET] Found eventShows? ${eventShows.length}`);
    
    if (eventShows && eventShows.length > 0) {
      const enrichedShows = await Promise.all(eventShows.map(async (eventShow) => {
        const snapshot = typeof eventShow.snapshotJson === 'string' ? JSON.parse(eventShow.snapshotJson) : eventShow.snapshotJson;
        const baseShow = await getBaseShow(eventShow.baseShowId, artistId);
        return {
          ...snapshot,
          ...baseShow,
          ...eventShow,
          name: baseShow?.name || eventShow?.name || snapshot?.name || "Untitled Show",
          status: eventShow.status
        };
      }));

      return NextResponse.json({
        success: true,
        show: enrichedShows[0], // for backwards compatibility
        shows: enrichedShows
      });
    }

    // If no EventShow, check if it's a Draft Artist (EventArtist)
    await connectToDatabase();
    const eventArtist = await EventArtistModel.findOne({ id: artistId, eventId }).lean();
    console.log(`[ShowAPI GET] Found eventArtist? ${!!eventArtist}`);

    if (eventArtist) {
      const draftedShow = {
        ...eventArtist,
        name: eventArtist.artistName || eventArtist.realName || "Draft Artist",
        duration: eventArtist.performanceDuration || 0,
        status: eventArtist.status || "pending",
        isDraftArtist: true,
      };
      return NextResponse.json({
        success: true,
        show: draftedShow,
        shows: [draftedShow]
      });
    }

    // If still not found, check if it's a ContractArtist (stored in EventData blob)
    const { ContractService } = await import("@/lib/contract-service");
    const contractArtist = await ContractService.getArtist(eventId, artistId);
    console.log(`[ShowAPI GET] Found contractArtist? ${!!contractArtist}`);

    if (contractArtist) {
      const conShow = {
        ...contractArtist,
        name: contractArtist.stageName || contractArtist.legalName || "Contract Artist",
        // Contract artists might not have these specific technical fields yet, but we map what we can
        style: contractArtist.style || contractArtist.role || "",
        performanceType: contractArtist.performanceType || contractArtist.role || "",
        duration: contractArtist.performanceDuration || 0,
        status: contractArtist.status || "pending",
        isContractArtist: true,
      };
      return NextResponse.json({
        success: true,
        show: conShow,
        shows: [conShow]
      });
    }

    // If still not found, check if the artist has any BaseShow created (even if not explicitly linked to this event yet)
    const baseShows = await getBaseShowsByArtist(artistId);
    console.log(`[ShowAPI GET] Found baseShows? ${baseShows.length}`);

    if (baseShows && baseShows.length > 0) {
      const baseShow = baseShows[0];
      const baseShowObj = {
        ...baseShow,
        name: baseShow.name || "Artist Show",
        duration: baseShow.duration || 0,
        status: "pending", // Implicitly pending since not submitted as an EventShow
        isBaseShowOnly: true,
      };
      return NextResponse.json({
        success: true,
        show: baseShowObj,
        shows: [baseShowObj]
      });
    }

    return NextResponse.json({
      success: true,
      show: null,
      shows: [],
      message: "No show submitted for this event yet."
    });
  } catch (error) {
    console.error("[ShowAPI] Error fetching show:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; artistId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { eventId, artistId } = resolvedParams;
    const body = await request.json();
    const { status, showId } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "Status is required" }, { status: 400 });
    }

    // Map UI statuses to Database statuses if needed
    // The UI sends "approved", but participation needs "confirmed"
    const participationStatus = status === "approved" ? "confirmed" : status;

    // Try EventShow first
    const eventShows = await getEventShowsByArtistAndEventArray(artistId, eventId);
    
    if (eventShows && eventShows.length > 0) {
      // Update specific show if showId is provided, otherwise update all
      for (const eventShow of eventShows) {
        if (!showId || eventShow.id === showId) {
          await updateEventShowStatus(eventShow.id, eventId, status, "Stage Manager");
        }
      }
      
      // Update global participation status
      await connectToDatabase();
      await EventParticipationModel.updateOne(
        { artistId, eventId },
        { $set: { status: participationStatus, updatedAt: new Date().toISOString() } }
      );

      return NextResponse.json({
        success: true,
        message: `Show status updated to ${status}`
      });
    }

    // Try EventArtist
    await connectToDatabase();
    const eventArtist = await EventArtistModel.findOne({ id: artistId, eventId });
    
    if (eventArtist) {
      await EventArtistModel.updateOne(
        { id: artistId, eventId }, 
        { $set: { status: participationStatus, updatedAt: new Date().toISOString() } }
      );
      return NextResponse.json({
        success: true,
        message: `Draft Artist status updated to ${status}`
      });
    }

    // Try ContractArtist
    const { ContractService } = await import("@/lib/contract-service");
    const contractArtist = await ContractService.getArtist(eventId, artistId);

    if (contractArtist) {
      await ContractService.updateArtist(eventId, artistId, {
        status: participationStatus
      });
      return NextResponse.json({
        success: true,
        message: `Contract Artist status updated to ${status}`
      });
    }

    return NextResponse.json({ success: false, error: "No show found for this artist/event" }, { status: 404 });

  } catch (error) {
    console.error("[ShowAPI] Error updating show status:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
