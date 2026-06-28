"use client";

import React from "react";
import { User, Eye } from "lucide-react";
import { Artist, LogisticsMember } from "../types";

interface LogisticsMembersProps {
  artist: Artist;
}

function StatusBadge({ uploaded, url }: { uploaded: boolean; url?: string }) {
  if (!uploaded) {
    return <span className="text-slate-300 text-sm">—</span>;
  }
  
  if (url) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
      >
        <span>Uploaded</span>
        <Eye className="h-3 w-3" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-700">
      Uploaded
    </span>
  );
}

function TravelerCard({ member }: { member: LogisticsMember & { role?: string; passportCopyUrl?: string; visaDocument?: string; visaCopyUrl?: string } }) {
  const rows: { label: string; value: string | boolean; isBool?: boolean }[] = [
    { label: "Role",           value: member.role || "—" },
    { label: "Nationality",    value: member.nationality || "—" },
    { label: "Passport #",     value: member.passport || "—" },
    { label: "Passport expiry",value: member.passportExpiry || "—" },
    { label: "Departure city", value: member.departureCity || "—" },
    { label: "Airport",        value: member.airport || "—" },
    { label: "Room",           value: member.room || "—" },
    { label: "Dietary",        value: member.dietary || "None" },
    { label: "Passport upload",value: member.passportUpload, isBool: true },
    { label: "Visa doc",       value: member.visaDoc, isBool: true },
  ];

  const isComplete = member.passportUpload && !!member.passport;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <span className="text-sm font-bold text-slate-900">{member.name}</span>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
          isComplete
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-amber-50 text-amber-700 border-amber-100"
        }`}>
          {isComplete ? "Complete" : "Incomplete"}
        </span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-slate-50">
        {rows.map(({ label, value, isBool }) => (
          <div key={label} className="flex items-center justify-between px-5 py-2.5">
            <span className="text-xs text-purple-500 font-medium">{label}</span>
            {isBool ? (
              member.passportCopyUrl && label === "Passport upload" ? (
                <a 
                  href={member.passportCopyUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1 transition-colors"
                >
                  View Passport <Eye className="h-3.5 w-3.5" />
                </a>
              ) : member.visaCopyUrl && label === "Visa doc" ? (
                <a 
                  href={member.visaCopyUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1 transition-colors"
                >
                  View Visa <Eye className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className={`text-xs font-bold ${value ? "text-emerald-600" : "text-slate-400"}`}>
                  {value ? "✓" : "—"}
                </span>
              )
            ) : (
              <span className={`text-xs font-semibold ${value === "—" || value === "None" ? "text-slate-400" : "text-slate-800"}`}>
                {String(value)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LogisticsMembers({ artist }: LogisticsMembersProps) {
  const logistics = artist.logistics;
  const members = logistics?.members;

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <User className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-sm">No traveler data available. Please ensure the artist has submitted their intake form.</p>
      </div>
    );
  }

  const passportsUploaded  = members.filter(m => m.passportUpload).length;
  const visaDocsUploaded   = members.filter(m => m.visaDoc).length;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="rounded-2xl bg-blue-50/60 px-5 py-3 text-sm font-medium text-blue-700 ring-1 ring-blue-100 flex flex-wrap items-center gap-3">
        <span>{members.length} traveler{members.length !== 1 ? "s" : ""} complete</span>
        {passportsUploaded < members.length && (
          <>
            <span className="text-blue-300">•</span>
            <span>{members.length - passportsUploaded} passport(s) missing</span>
          </>
        )}
        {visaDocsUploaded < members.length && (
          <>
            <span className="text-blue-300">•</span>
            <span>{members.length - visaDocsUploaded} visa doc(s) missing</span>
          </>
        )}
      </div>

      {/* Traveler cards — 2-column grid */}
      <div className="grid grid-cols-2 gap-4">
        {members.map((member) => (
          <TravelerCard key={member.id} member={member} />
        ))}
      </div>

      {/* Documents table */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Documents</h4>
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Traveler</span>
            <span>Passport</span>
            <span>Visa</span>
            <span>Residence Permit</span>
            <span>Other</span>
          </div>
          {/* Table rows */}
          {members.map((member) => (
            <div key={member.id} className="grid grid-cols-5 items-center px-5 py-3 border-b border-slate-50 last:border-0">
              <span className="text-sm font-semibold text-slate-900">{member.name}</span>
              <StatusBadge uploaded={member.passportUpload} url={member.passportCopyUrl} />
              <StatusBadge uploaded={member.visaDoc} url={member.visaCopyUrl} />
              <span className="text-slate-300 text-sm">—</span>
              <span className="text-slate-300 text-sm">—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
