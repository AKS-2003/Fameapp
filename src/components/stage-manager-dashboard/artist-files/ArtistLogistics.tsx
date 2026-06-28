"use client";

import React, { useState } from "react";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Artist } from "./types";
import { LogisticsIntake } from "./logistics/LogisticsIntake";
import { LogisticsMembers } from "./logistics/LogisticsMembers";
import { LogisticsFlights } from "./logistics/LogisticsFlights";
import { LogisticsHotel } from "./logistics/LogisticsHotel";
import { LogisticsTransport } from "./logistics/LogisticsTransport";
import { LogisticsFood } from "./logistics/LogisticsFood";
import { LogisticsNotes } from "./logistics/LogisticsNotes";
import { LogisticsDiscussion } from "./LogisticsDiscussion";

interface ArtistLogisticsProps {
  artist: Artist;
  selectedShow?: any;
  eventId: string;
  onRefresh?: () => void;
}

export function ArtistLogistics({ artist, selectedShow, eventId, onRefresh }: ArtistLogisticsProps) {
  const [innerTab, setInnerTab] = useState("Overview");
  const logistics = artist.logistics;

  if (!logistics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-6">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Truck className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-400">Logistics data not available for this artist</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-100">
      {/* Status Card — above all tabs */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-sm flex flex-wrap items-center gap-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Status</p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
            logistics.status === "Submitted" 
              ? "bg-amber-50 text-amber-600 border-amber-100" 
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}>{logistics.status === "Submitted" ? "Waiting For Artist Confirmation" : logistics.status}</span>
        </div>
        <div className="border-l border-slate-100 pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Travelers</p>
          <p className="text-base font-bold text-slate-900">{logistics.totalTravelersCount ?? logistics.travelers} / {logistics.totalTravelersCount ?? logistics.travelers}</p>
        </div>
        <div className="border-l border-slate-100 pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Missing Items</p>
          <p className={`text-base font-bold ${logistics.missingItemsCount > 0 ? "text-red-500" : "text-emerald-600"}`}>{logistics.missingItemsCount}</p>
        </div>
        <div className="border-l border-slate-100 pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Bookings</p>
          <p className="text-base font-bold text-slate-900">{logistics.bookingsCreated ?? 0}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6 flex gap-1">
        {[
          "Overview",
          "Intake",
          "Travelers",
          "Flights",
          "Hotel",
          "Transport",
          "Food",
          "Event Info"
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setInnerTab(tab)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-all rounded-xl",
              innerTab === tab
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {innerTab === "Overview" && (
          <div className="space-y-4">
            {/* Status bar */}
            <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-slate-100 bg-white px-6 py-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  logistics.status === "Submitted" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-slate-100 text-slate-500"
                }`}>{logistics.status}</span>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Travelers</p>
                <p className="text-sm font-bold text-slate-900">{logistics.totalTravelersCount ?? logistics.travelers} / {logistics.totalTravelersCount ?? logistics.travelers}</p>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Missing Items</p>
                <p className={`text-sm font-bold ${logistics.missingItemsCount > 0 ? "text-red-500" : "text-emerald-600"}`}>{logistics.missingItemsCount}</p>
              </div>
              <div className="border-l border-slate-100 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bookings</p>
                <p className="text-sm font-bold text-slate-900">{logistics.bookingsCreated ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logistics Needs */}
              <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Logistics Needs</p>
                <div className="space-y-3">
                  {([
                    { label: "Flights needed", value: logistics.needsFlights },
                    { label: "Hotel needed", value: logistics.needsHotel },
                    { label: "Transport needed", value: logistics.needsTransport },
                    { label: "Visa support", value: logistics.needsVisa },
                  ] as { label: string; value: boolean | undefined }[]).map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className={`text-sm font-bold ${
                        value === true ? "text-emerald-600" : value === false ? "text-slate-400" : "text-slate-300"
                      }`}>
                        {value === true ? "Yes" : value === false ? "No" : "—"}
                      </span>
                    </div>
                  ))}
                  {logistics.arrivalDate && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-sm text-slate-500">Arrival date</span>
                      <span className="text-sm font-bold text-slate-900">{logistics.arrivalDate}</span>
                    </div>
                  )}
                  {logistics.dietary && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Dietary</span>
                      <span className="text-sm font-bold text-slate-900 truncate max-w-[140px]">{logistics.dietary}</span>
                    </div>
                  )}
                  {logistics.checkedLuggage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Checked luggage</span>
                      <span className="text-sm font-bold text-slate-900">{logistics.checkedLuggage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Progress</p>
                <div className="space-y-3">
                  {([
                    { label: "Travelers complete", val: logistics.totalTravelersCount ?? Number(logistics.travelers), total: logistics.totalTravelersCount ?? Number(logistics.travelers) },
                    { label: "Passports uploaded", val: logistics.passportsUploaded ?? 0, total: logistics.totalTravelersCount ?? Number(logistics.travelers) },
                    { label: "Visa docs uploaded", val: logistics.visaDocsUploaded ?? 0, total: logistics.totalTravelersCount ?? Number(logistics.travelers) },
                  ]).map(({ label, val, total }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className={`text-sm font-bold ${val >= total && total > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                        {val} of {total}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Bookings created</span>
                    <span className="text-sm font-bold text-slate-900">{logistics.bookingsCreated ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Missing Items */}
            <div className={`rounded-[20px] border p-5 shadow-sm ${
              logistics.missingItemsCount > 0 ? "border-red-100 bg-red-50/30" : "border-emerald-100 bg-emerald-50/20"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm font-bold ${
                  logistics.missingItemsCount > 0 ? "text-red-600" : "text-emerald-600"
                }`}>{logistics.missingItemsCount > 0 ? "⚠ Missing Items" : "✓ Missing Items"}</span>
              </div>
              {logistics.missingItems.length === 0 ? (
                <p className="text-sm text-emerald-600 font-medium">Nothing missing.</p>
              ) : (
                <ul className="space-y-1.5">
                  {logistics.missingItems.map((item, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-red-400">•</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {innerTab === "Intake" && (
          <LogisticsIntake artist={artist} />
        )}

        {innerTab === "Travelers" && (
          <LogisticsMembers artist={artist} />
        )}

        {innerTab === "Flights" && (
          <LogisticsFlights artist={artist} eventId={eventId} selectedShow={selectedShow} onRefresh={onRefresh} />
        )}

        {innerTab === "Hotel" && (
          <LogisticsHotel artist={artist} />
        )}

        {innerTab === "Transport" && (
          <LogisticsTransport artist={artist} />
        )}

        {innerTab === "Food" && (
          <LogisticsFood artist={artist} />
        )}

        {innerTab === "Event Info" && (
          <div className="flex h-40 items-center justify-center rounded-[28px] border-2 border-dashed border-slate-100 bg-white">
            <p className="text-sm font-medium text-slate-400">Event Info content here</p>
          </div>
        )}

        {/* Logistics Discussion — shown below every tab */}
        <LogisticsDiscussion
          eventId={eventId}
          artistId={artist.id}
          artistName={artist.name}
          activeTab={innerTab}
        />
      </div>
    </div>
  );
}
