"use client";

import React, { useState, useEffect } from "react";
import { ArtistSidebar } from "./artist-files/ArtistSidebar";
import { ArtistHeader } from "./artist-files/ArtistHeader";
import { ArtistTabs } from "./artist-files/ArtistTabs";
import { ArtistAgreement } from "./artist-files/ArtistAgreement";
import { ArtistLogistics } from "./artist-files/ArtistLogistics";
import { ArtistShowManagement } from "./artist-files/ArtistShowManagement";
import { CreateArtistFile } from "./artist-files/CreateArtistFile";
import { Artist } from "./artist-files/types";


interface ArtistFilesProps {
  providedEventId: string;
  eventData?: any;
  onBack: () => void;
  initialArtistId?: string | null;
}

/** Map a ContractArtist (from /api/contracts/:eventId) to the Artist type used by sub-components */
function mapContractArtistToArtist(a: any, eventId: string): Artist {
  const agr = a.agreement || {};
  return {
    id: a.id,
    name: (a.stageName && a.stageName !== "FameLink Artist" && a.stageName !== "Unknown Artist") ? a.stageName : (a.legalName || a.realName || a.name || a.stageName || "Unknown Artist"),
    realName: a.legalName || a.realName || "",
    location: [a.city, a.country].filter(Boolean).join(", ") || "",
    city: a.city || "",
    country: a.country || "",
    status: mapStatus(a.status),
    type: mapRole(a.role || a.requestTemplate),
    image: a.image || a.profileImage || a.image_url || a.avatar || a.profilePic || "",
    inviteLink: a.inviteLink || "",
    agreement: {
      stageDiscussion: agr.stageDiscussion || agr.discussion || [],
      performance: (agr.schedule?.workshops?.length > 0 || agr.schedule?.performances?.length > 0)
        ? `${agr.schedule.workshops.length} workshops + ${agr.schedule.performances.length} shows`
        : (agr.performance || ""),
      proposedFee: agr.payment?.details?.performanceFee 
        ? `€${Number(agr.payment.details.performanceFee).toLocaleString()}` 
        : (agr.agreedFee ? `€${Number(agr.agreedFee).toLocaleString()}` : ""),
      bookingTerms: agr.bookingTerms || (agr.arrivalDate
        ? `Available ${agr.arrivalDate}`
        : ""),
      deliverables: agr.deliverables || (agr.workshopsConfirmed
        ? `${agr.workshopsConfirmed} workshops, ${agr.showsConfirmed} shows, ${agr.djSets || 0} DJ sets`
        : ""),
      contractDetails: {
        description:
          agr.contractDetails?.description || "Agreement signature is the operational trigger for Logistics and Show Management",
        bookingTerms: agr.contractDetails?.bookingTerms || agr.promoObligations || "",
        deliverables: agr.contractDetails?.deliverables || "",
        responsibilities: agr.contractDetails?.responsibilities || "",
        specialClauses: agr.contractDetails?.specialClauses || "",
        cancellationTerms: agr.contractDetails?.cancellationTerms || "",
        exclusivity: agr.contractDetails?.exclusivity || "",
        notes: agr.contractDetails?.notes || "",
        clauses: agr.contractDetails?.clauses,
        documents: agr.contractDetails?.documents,
      },
      signatureStatus: {
        artist: {
          name: a.contractSignatureName || a.legalName || a.realName || "Artist Signature",
          date: a.contractSignedAt || a.artistSignedAt || "",
          status: a.contractDocStatus === "signed" || a.contractDocStatus === "confirmed" || a.contractSignedByArtist
            ? "SIGNED"
            : "PENDING",
        },
        organiser: {
          name: a.organiserSignatureName || "Organiser Signature",
          date: a.organiserSignedAt || "",
          status: a.contractDocStatus === "confirmed" || a.contractSignedByOrganiser ? "SIGNED" : "PENDING",
        },
      },
      schedule: agr.schedule || {
        deliverablesCount: 0,
        overview: { workshops: 0, shows: 0, tasks: 0, dateRange: "" },
        workshops: [],
        performances: [],
        tasks: []
      },
      payment: agr.payment || {
        fieldsCompleted: "0/11",
        calculation: {
          performanceFee: agr.agreedFee ? `€${agr.agreedFee}` : "—",
          downpayment: "—",
          remainingBalance: agr.agreedFee ? `€${agr.agreedFee}` : "—",
          status: agr.payments?.feePaid ? "Paid" : "Pending",
        },
        details: {
          performanceFee: agr.agreedFee || "",
          downpayment: "",
          downpaymentDate: "",
          balanceDueDate: "",
          amountPaid: "",
          paymentDate: "",
          paymentMethod: agr.paymentMethod || "",
          paymentStatus: agr.payments?.feePaid ? "Paid" : "Pending",
          notes: "",
        },
      },
    },
    logistics: (() => {
      const tl = a.travelLogistics || {};
      const logisticsTravelers: any[] = a.logistics?.travelers || a.groupMembers || [];
      const selectedIds: string[] = tl.selectedTravelers || [];
      
      // If a selection was made, filter to only selected travelers; otherwise use all
      let activeTravelers = logisticsTravelers;
      if (selectedIds.length > 0) {
        const filtered = logisticsTravelers.filter((m: any) => 
          selectedIds.includes(m.id) || selectedIds.includes(m.name) || selectedIds.includes(m.fullPassportName)
        );
        // Only use filtered result if it actually matched something
        if (filtered.length > 0) activeTravelers = filtered;
      }

      const totalTravelers = Number(tl.totalTravelers) || activeTravelers.length || 1;
      const passportsUploaded = activeTravelers.filter((m: any) => m.passportUpload || m.passportCopyUrl).length;
      const visaDocsUploaded = activeTravelers.filter((m: any) => m.visaDoc || m.visaDocument || m.visaCopyUrl).length;

      // Logistics needs come from the artist's intake form (Step 2)
      const needs = tl.needs || {};
      const questions = tl.questions || {};

      // Compute missing items
      const missingItems: string[] = [];
      if (!tl.arrivalDate && !questions.arrivalDate) missingItems.push("Arrival date not provided");
      if (!questions.dietary) missingItems.push("Dietary requirements missing");
      if (passportsUploaded < totalTravelers) missingItems.push(`${totalTravelers - passportsUploaded} passport(s) missing`);
      if (visaDocsUploaded < totalTravelers && (needs.visa || tl.visaRequired)) missingItems.push("Visa documents missing");

      const intakeDetails: { question: string; answer: string }[] = [];
      if (questions.arrivalDate || tl.arrivalDate) intakeDetails.push({ question: "Arrival Date", answer: questions.arrivalDate || tl.arrivalDate });
      if (questions.dietary) intakeDetails.push({ question: "Dietary Requirements", answer: questions.dietary });
      if (questions.checkedLuggage) intakeDetails.push({ question: "Checked Luggage", answer: questions.checkedLuggage });
      if (questions.hotelRoomType) intakeDetails.push({ question: "Room Type", answer: questions.hotelRoomType });
      if (typeof questions.vipMeetGreet !== "undefined") intakeDetails.push({ question: "VIP Meet & Greet", answer: questions.vipMeetGreet ? "Yes" : "No" });
      if (typeof questions.separateVehicle !== "undefined") intakeDetails.push({ question: "Separate Vehicle", answer: questions.separateVehicle ? "Yes" : "No" });
      if (questions.accessibility) intakeDetails.push({ question: "Accessibility", answer: questions.accessibility });

      if (!tl.status && !a.travelLogistics) return undefined;

      return {
        status: tl.status === "submitted" ? "Submitted" : "In Progress",
        travelers: String(totalTravelers),
        missingItemsCount: missingItems.length,
        // Logistics Needs (from intake Step 2)
        needsFlights: needs.flights !== false,
        needsHotel: needs.hotel !== false,
        needsTransport: needs.transport !== false,
        needsVisa: !!(needs.visa),
        // Questions answers
        arrivalDate: questions.arrivalDate || tl.arrivalDate || "",
        dietary: questions.dietary || "",
        checkedLuggage: questions.checkedLuggage || "",
        hotelRoomType: questions.hotelRoomType || "",
        // Progress tracking
        totalTravelersCount: totalTravelers,
        passportsUploaded,
        visaDocsUploaded,
        bookingsCreated: (a.travelLogistics?.flights?.length || 0) + (a.travelLogistics?.hotels?.length || 0),
        intakeOverview: {
          status: tl.status === "submitted" ? "Submitted" : "Draft",
          lastSubmitted: a.updatedAt || "",
          travelers: String(totalTravelers),
          passports: `${passportsUploaded} of ${totalTravelers}`,
        },
        intakeDetails,
        missingItems,
        members: logisticsTravelers.map((m: any) => ({
          id: m.id || m.name,
          name: m.fullPassportName || m.name || "Unknown",
          status: m.status || "Active",
          nationality: m.nationality || "",
          passport: m.passportNumber || "",
          passportExpiry: m.passportExpiry || "",
          departureCity: m.departureCity || m.homeDepartureCity || "",
          airport: m.departureAirport || m.departureCity || "",
          room: m.roomType || m.room || "",
          dietary: m.dietaryRequirements || m.dietary || "",
          passportUpload: !!(m.passportUpload || m.passportCopyUrl),
          visaDoc: !!(m.visaDoc || m.visaDocument || m.visaCopyUrl),
          // extra rich fields from the profile
          role: m.role || m.relationship || "",
          passportCopyUrl: m.passportCopyUrl || "",
          visaCopyUrl: m.visaCopyUrl || "",
          visaDocument: m.visaDocument || "",
        })),
        flights: a.travelLogistics?.flights || [],
        hotels: a.travelLogistics?.hotelName
          ? [{
              id: "hotel-1",
              name: a.travelLogistics.hotelName,
              roomType: questions.hotelRoomType || "Standard",
              checkIn: a.travelLogistics.hotelCheckIn || "",
              checkOut: a.travelLogistics.hotelCheckOut || "",
              rooms: 1,
              roomingList: "—",
              breakfast: "—",
              ref: "—",
            }]
          : [],
        transports: [],
        food: undefined,
        notesData: [],
      };
    })(),
    // Workflow status (per-artist, saved by stage manager)
    workflowContract: a.workflowContract || a.overrides?.workflowContract || "Required",
    workflowLogistics: a.workflowLogistics || a.overrides?.workflowLogistics || "Required",
    workflowShow: a.workflowShow || a.overrides?.workflowShow || "Required",
    artists_page_color: a.artists_page_color || a.artistsPageColor || "",
    artists_page_tag: a.artists_page_tag || a.artistsPageTag || "",
    sectionStatuses: a.sectionStatuses || {},
  } as any;
}

function mapStatus(status: string): string {
  switch (status) {
    case "confirmed": return "Confirmed";
    case "waiting_info": return "Waiting For Info";
    case "awaiting_signature": return "Awaiting Signature";
    case "invited": return "Invited";
    case "declined": return "Declined";
    default: return status ? (status.charAt(0).toUpperCase() + status.slice(1)) : "Pending";
  }
}

function mapRole(role: string): string {
  switch (role) {
    case "dj": return "DJ";
    case "group": return "Group";
    case "solo": return "Solo";
    case "band": return "Band";
    case "mc": return "MC";
    default: return role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "Artist";
  }
}

export default function ArtistFiles({ providedEventId, eventData, onBack, initialArtistId }: ArtistFilesProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  
  // Initialize default active tab based on what's available
  const defaultTab = eventData?.contractEnabled !== false ? "Contract" 
                   : eventData?.logisticsEnabled !== false ? "Logistics" 
                   : eventData?.showInfoEnabled !== false ? "Show Management" 
                   : "Contract";
                   
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  const [allShows, setAllShows] = useState<any[]>([]);
  const [selectedShowIndex, setSelectedShowIndex] = useState(0);

  // Per-artist workflow state (lifted so ArtistHeader + ArtistTabs share it)
  type WorkflowStatus = "Required" | "Not Required" | "Not Ready Yet" | "Completed Outside System";
  interface WorkflowState { contract: WorkflowStatus; logistics: WorkflowStatus; show: WorkflowStatus; }
  const [artistWorkflow, setArtistWorkflow] = useState<WorkflowState>({
    contract: "Required", logistics: "Required", show: "Required",
  });

  // Reset workflow when artist changes
  useEffect(() => {
    if (selectedArtist) {
      setArtistWorkflow({
        contract: (selectedArtist as any).workflowContract || "Required",
        logistics: (selectedArtist as any).workflowLogistics || "Required",
        show: (selectedArtist as any).workflowShow || "Required",
      });
    }
  }, [selectedArtist?.id]);

  // Update active tab if per-artist workflow makes it unavailable
  useEffect(() => {
    const isTabEnabled = (tab: string) => {
      if (tab === "Contract") return eventData?.contractEnabled !== false && artistWorkflow.contract !== "Not Required";
      if (tab === "Logistics") return eventData?.logisticsEnabled !== false && artistWorkflow.logistics !== "Not Required";
      if (tab === "Show Management") return eventData?.showInfoEnabled !== false && artistWorkflow.show !== "Not Required";
      return true;
    };
    if (!isTabEnabled(activeTab)) setActiveTab(defaultTab);
  }, [artistWorkflow, eventData, activeTab, defaultTab]);

  // Update active tab if the currently selected tab becomes disabled (event-level)
  useEffect(() => {
    if (activeTab === "Contract" && eventData?.contractEnabled === false) setActiveTab(defaultTab);
    else if (activeTab === "Logistics" && eventData?.logisticsEnabled === false) setActiveTab(defaultTab);
    else if (activeTab === "Show Management" && eventData?.showInfoEnabled === false) setActiveTab(defaultTab);
  }, [eventData, activeTab, defaultTab]);

  // Fetch shows when selected artist changes
  useEffect(() => {
    if (!selectedArtist || !providedEventId) {
      setAllShows([]);
      return;
    }
    fetch(`/api/contracts/${providedEventId}/shows/${selectedArtist.id}?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && (d.shows?.length > 0 || d.show)) {
          const showsArray = d.shows?.length > 0 ? d.shows : [d.show];
          setAllShows(showsArray);
          setSelectedShowIndex(0);
        } else {
          setAllShows([]);
        }
      })
      .catch(console.error);
  }, [selectedArtist, providedEventId]);

  // Step 2: when an event is selected, fetch its contract artists
  useEffect(() => {
    if (!providedEventId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/contracts/${providedEventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const mapped: Artist[] = (d.artists || []).map((a: any) =>
            mapContractArtistToArtist(a, providedEventId)
          );
          setArtists(mapped);
          const initial = initialArtistId ? mapped.find(a => a.id === initialArtistId) : null;
          setSelectedArtist(initial || (mapped.length > 0 ? mapped[0] : null));
        } else {
          setError(d.error || "Failed to load artists");
          setArtists([]);
          setSelectedArtist(null);
        }
      })
      .catch((err) => {
        console.error("Error loading contract artists:", err);
        setError("Failed to load artists");
        setArtists([]);
        setSelectedArtist(null);
      })
      .finally(() => setLoading(false));
  }, [providedEventId]);

  // Function to refresh a specific artist's data without full reload
  const refreshArtistData = async (artistId: string) => {
    if (!providedEventId) return;
    try {
      const res = await fetch(`/api/contracts/${providedEventId}?t=${Date.now()}`, { cache: 'no-store' });
      const d = await res.json();
      if (d.success) {
        const mapped: Artist[] = (d.artists || []).map((a: any) =>
          mapContractArtistToArtist(a, providedEventId)
        );
        setArtists(mapped);
        
        // Update selected artist with new data
        const updated = mapped.find((a) => a.id === artistId);
        if (updated) setSelectedArtist(updated);
      }
    } catch (err) {
      console.error("Error refreshing artist data:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-fuchsia-600" />
          <p className="text-sm text-slate-500">Loading artists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible */}
        <ArtistSidebar
          artists={artists}
          selectedArtist={creating ? null : selectedArtist}
          onSelect={(a) => { setSelectedArtist(a); setCreating(false); }}
          onBack={onBack}
          onAdd={() => { setCreating(true); setSelectedArtist(null); }}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {creating ? (
            <CreateArtistFile
              onBack={() => setCreating(false)}
              onCreated={(newArtist) => {
                // Refresh artists list for the current event
                if (providedEventId) {
                  fetch(`/api/contracts/${providedEventId}?t=${Date.now()}`, { cache: 'no-store' })
                    .then((r) => r.json())
                    .then((d) => {
                      if (d.success) {
                        const mapped: Artist[] = (d.artists || []).map((a: any) =>
                          mapContractArtistToArtist(a, providedEventId)
                        );
                        setArtists(mapped);
                        // Select the newly added artist
                        const created = mapped.find((a) => a.id === newArtist.id) || mapped[mapped.length - 1];
                        setSelectedArtist(created || null);
                      }
                    })
                    .catch(console.error);
                }
                setCreating(false);
              }}
            />
          ) : artists.length === 0 ? (

            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-sm font-medium">No artists in this event yet</p>
              <p className="text-xs text-slate-400">
                Add artists from the Show Management section
              </p>
            </div>
          ) : selectedArtist ? (
            <React.Fragment key={selectedArtist.id}>
              <ArtistHeader
                artist={selectedArtist} 
                eventId={providedEventId}
                eventData={eventData}
                allShows={allShows}
                selectedShowIndex={selectedShowIndex}
                onSelectShow={setSelectedShowIndex}
                artistWorkflow={artistWorkflow}
                onWorkflowChange={setArtistWorkflow}
              />
              <ArtistTabs 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
                eventData={eventData}
                artistWorkflow={artistWorkflow}
              />
              {activeTab === "Contract" ? (
                <ArtistAgreement 
                  artist={selectedArtist} 
                  eventId={providedEventId} 
                  selectedShow={allShows[selectedShowIndex]}
                  allShows={allShows}
                  onRefresh={() => refreshArtistData(selectedArtist.id)}
                />
              ) : activeTab === "Logistics" ? (
                <ArtistLogistics artist={selectedArtist} selectedShow={allShows[selectedShowIndex]} eventId={providedEventId} onRefresh={() => refreshArtistData(selectedArtist.id)} />
              ) : activeTab === "Show Management" ? (
                <ArtistShowManagement 
                  artist={selectedArtist} 
                  eventId={providedEventId} 
                  selectedShow={allShows[selectedShowIndex]}
                  allShows={allShows}
                  selectedShowIndex={selectedShowIndex}
                  onSelectShow={setSelectedShowIndex}
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-100">
                  <div className="flex h-64 flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-100 bg-slate-50/30">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <span className="text-slate-300 font-bold text-xl">?</span>
                    </div>
                    <p className="text-sm font-medium text-slate-400">
                      {activeTab} section coming soon
                    </p>
                  </div>
                </div>
              )}
            </React.Fragment>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Select an artist to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
