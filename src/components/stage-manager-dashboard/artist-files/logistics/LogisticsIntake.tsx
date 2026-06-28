"use client";

import React from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Artist } from "../types";

interface LogisticsIntakeProps {
  artist: Artist;
}

// All Step 2 questions in display order
const STEP2_QUESTIONS = [
  // Needs section
  { key: "needsFlights",   label: "Flights needed",           type: "bool" },
  { key: "needsHotel",     label: "Hotel needed",             type: "bool" },
  { key: "needsTransport", label: "Transport needed",         type: "bool" },
  { key: "needsVisa",      label: "Visa support needed",      type: "bool" },
  // Questions section
  { key: "arrivalDate",          label: "Arrival date",                type: "text" },
  { key: "dietary",              label: "Dietary requirements",        type: "text" },
  { key: "checkedLuggage",       label: "Checked luggage (pieces)",    type: "text" },
  { key: "hotelRoomType",        label: "Hotel room type",             type: "text" },
  { key: "vipMeetGreet",         label: "VIP meet & greet",           type: "bool" },
  { key: "separateVehicle",      label: "Separate vehicle needed",     type: "bool" },
  { key: "visaLetters",          label: "Visa letters required",       type: "bool" },
  { key: "additionalNights",     label: "Additional nights",           type: "bool" },
  { key: "accessibility",        label: "Accessibility requirements",  type: "text" },
  { key: "groundTransportPrefs", label: "Ground transport preferences", type: "text" },
];

export function LogisticsIntake({ artist }: LogisticsIntakeProps) {
  const logistics = artist.logistics;

  if (!logistics) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">No intake data available for this artist.</p>
      </div>
    );
  }

  // Check if any intake data was actually submitted
  const hasData = logistics.intakeDetails.length > 0
    || logistics.arrivalDate
    || logistics.dietary
    || logistics.checkedLuggage;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">Artist has not submitted the intake form yet.</p>
      </div>
    );
  }

  // Build a flat lookup of all values
  const values: Record<string, any> = {
    needsFlights:        logistics.needsFlights,
    needsHotel:          logistics.needsHotel,
    needsTransport:      logistics.needsTransport,
    needsVisa:           logistics.needsVisa,
    arrivalDate:         logistics.arrivalDate,
    dietary:             logistics.dietary,
    checkedLuggage:      logistics.checkedLuggage,
    hotelRoomType:       logistics.hotelRoomType,
    // bool fields from intakeDetails if available
    vipMeetGreet:        logistics.intakeDetails.find(d => d.question === "VIP Meet & Greet")?.answer,
    separateVehicle:     logistics.intakeDetails.find(d => d.question === "Separate Vehicle")?.answer,
    visaLetters:         logistics.intakeDetails.find(d => d.question === "Visa Letters")?.answer,
    additionalNights:    logistics.intakeDetails.find(d => d.question === "Additional Nights")?.answer,
    accessibility:       logistics.intakeDetails.find(d => d.question === "Accessibility")?.answer,
    groundTransportPrefs:logistics.intakeDetails.find(d => d.question === "Ground Transport Prefs")?.answer,
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-900">Step 2 — Travel Needs & Questions</h3>
        <p className="text-xs text-slate-400 mt-0.5">Submitted by the artist via the intake form.</p>
      </div>

      <div className="divide-y divide-slate-50">
        {STEP2_QUESTIONS.map(({ key, label, type }) => {
          const raw = values[key];
          const isEmpty = raw === undefined || raw === null || raw === "";

          return (
            <div key={key} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-sm text-slate-500">{label}</span>

              {isEmpty ? (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>—</span>
                </span>
              ) : type === "bool" ? (
                raw === true || raw === "Yes" ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Yes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400 text-sm font-bold">
                    <XCircle className="w-4 h-4" /> No
                  </span>
                )
              ) : (
                <span className="text-sm font-bold text-slate-900 text-right max-w-[55%]">{String(raw)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
