"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Calendar, 
  CreditCard, 
  Check, 
  Music,
  Edit2,
  Clock,
  Send,
  ShieldCheck,
  Bell,
  CheckCircle2,
  PenLine,
  MessageSquare,
  History,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, SectionItemStatus } from "./types";
import { StageDiscussion } from "./StageDiscussion";
import { ArtistContract } from "./agreement/ArtistContract";
import { ArtistSchedule } from "./agreement/ArtistSchedule";
import { ArtistPayment } from "./agreement/ArtistPayment";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ArtistAgreementProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
  selectedShow?: any;
  allShows?: any[];
}

const sectionStatusColors: Record<SectionItemStatus, string> = {
  required:       "text-emerald-600 bg-emerald-50 border-emerald-200",
  not_required:   "text-amber-600 bg-amber-50 border-amber-200",
  not_applicable: "text-slate-400 bg-slate-100 border-slate-200",
};

export function ArtistAgreement({ artist, eventId, onRefresh, selectedShow, allShows }: ArtistAgreementProps) {
  const [signatureName, setSignatureName] = useState("");
  const [signing, setSigning] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [signaturesStatus, setSignaturesStatus] = useState<SectionItemStatus>(
    (artist.sectionStatuses?.["signatures"] as SectionItemStatus) ?? "required"
  );
  const [chatStatus, setChatStatus] = useState<SectionItemStatus>(
    (artist.sectionStatuses?.["agreement_chat"] as SectionItemStatus) ?? "required"
  );

  React.useEffect(() => {
    setSignaturesStatus((artist.sectionStatuses?.["signatures"] as SectionItemStatus) ?? "required");
    setChatStatus((artist.sectionStatuses?.["agreement_chat"] as SectionItemStatus) ?? "required");
  }, [artist.id, artist.sectionStatuses?.["signatures"], artist.sectionStatuses?.["agreement_chat"]]);

  const handleAutoOpen = (itemValue: string) => {
    setOpenItems((prev) => prev.includes(itemValue) ? prev : [...prev, itemValue]);
  };

  const saveSectionStatus = async (section: string, status: SectionItemStatus) => {
    try {
      await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, sectionStatuses: { ...(artist.sectionStatuses || {}), [section]: status } }),
      });
    } catch {}
  };

  const organiserSig = artist.agreement?.signatureStatus?.organiser;
  const artistSig = artist.agreement?.signatureStatus?.artist;

  const isOrganiserSigned = organiserSig?.status === "SIGNED";
  const isArtistSigned = artistSig?.status === "SIGNED";

  const signedCount = (isOrganiserSigned ? 1 : 0) + (isArtistSigned ? 1 : 0);

  const handleSignContract = async () => {
    if (!signatureName.trim()) return;
    setSigning(true);
    try {
      // Only mark the contract as fully "confirmed" once the ARTIST has also signed.
      // Otherwise the organiser's own signature must not flip the artist's status to SIGNED.
      const docStatus = isArtistSigned ? "confirmed" : "signed_by_organiser";
      const now = new Date().toISOString();
      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          contractDocStatus: docStatus,
          status: docStatus === "confirmed" ? "confirmed" : artist.status,
          organiserSignedAt: now,
          contractSignedByOrganiser: true,
          organiserSignatureName: signatureName.trim(),
          // Server appends this to whatever log currently exists in the DB —
          // never send the full array, since a stale client copy would drop history.
          signatureLogEntry: { actor: "organiser", action: "signed", name: signatureName.trim(), timestamp: now },
        }),
      });
      const d = await res.json();
      if (d.success) {
        if (onRefresh) onRefresh();
        setSignatureName("");
      } else {
        alert(d.error || "Failed to sign contract");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  const handleUnsignContract = async () => {
    if (!confirm("Remove the organiser's signature from this agreement?")) return;
    setSigning(true);
    try {
      // Revert to whatever status reflects only the artist's signature (if any),
      // never touching the artist's own signed fields.
      const docStatus = isArtistSigned ? "signed" : "pending";
      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          contractDocStatus: docStatus,
          status: artist.status === "confirmed" ? "pending" : artist.status,
          organiserSignedAt: null,
          contractSignedByOrganiser: false,
          organiserSignatureName: "",
          // Server appends this to whatever log currently exists in the DB —
          // never send the full array, since a stale client copy would drop history.
          signatureLogEntry: { actor: "organiser", action: "unsigned", name: organiserSig?.name || "Organiser", timestamp: new Date().toISOString() },
        }),
      });
      const d = await res.json();
      if (d.success) {
        if (onRefresh) onRefresh();
      } else {
        alert(d.error || "Failed to remove signature");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to remove signature");
    } finally {
      setSigning(false);
    }
  };

  const handleRemindOrganiser = () => {
    alert("Reminder notification sent to organiser team.");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-100">
      {/* Combined Content in Accordions */}
      <div className="animate-in fade-in duration-300 mt-6">
        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-4">
          <ArtistContract artist={artist} eventId={eventId} onRefresh={onRefresh} allShows={allShows} selectedShow={selectedShow} onAutoOpen={handleAutoOpen} />
          <ArtistSchedule artist={artist} eventId={eventId} onRefresh={onRefresh} onAutoOpen={handleAutoOpen} />
          <ArtistPayment artist={artist} eventId={eventId} onRefresh={onRefresh} onAutoOpen={handleAutoOpen} />
        </Accordion>

        {/* Signatures Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100 mt-6">
          <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <PenLine className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Signatures</h2>
            <Badge className="bg-pink-50 text-pink-600 hover:bg-pink-50 border-none ml-2 font-bold">{signedCount}/2</Badge>
            <select
              value={signaturesStatus}
              onChange={(e) => { const val = e.target.value as SectionItemStatus; setSignaturesStatus(val); saveSectionStatus("signatures", val); }}
              className={`ml-2 text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/40 transition-colors ${sectionStatusColors[signaturesStatus]}`}
            >
              <option value="required">Required</option>
              <option value="not_required">Not Required</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
          <div className="p-6">
              <div className="space-y-4">
                
                {/* Secure double signature banner */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-3 text-slate-800">
                    <ShieldCheck className="h-5 w-5 text-slate-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Secure Double Signature</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Both signatures required to lock the agreement.</span>
                </div>

                {/* Organiser Signed or Pending */}
                {isOrganiserSigned ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">Organiser · {organiserSig?.name || "Organiser"}</span>
                        <span className="text-xs text-slate-500">Signed on {organiserSig?.date ? new Date(organiserSig.date).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Signed</span>
                      <Button
                        onClick={handleUnsignContract}
                        disabled={signing}
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm"
                      >
                        Unsign
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">Organiser</span>
                        <span className="text-xs text-slate-500">Awaiting signature</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500">Pending</span>
                  </div>
                )}

                {/* Artist Signed or Pending */}
                {isArtistSigned ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">Artist · {artistSig?.name || artist.name}</span>
                        <span className="text-xs text-slate-500">Signed on {artistSig?.date ? new Date(artistSig.date).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Signed</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">Artist · {artist.name}</span>
                        <span className="text-xs text-slate-500">Awaiting signature</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-500">Pending</span>
                  </div>
                )}

                {!isOrganiserSigned ? (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-500 font-medium">Organiser still needs to sign.</span>
                      <Button onClick={handleRemindOrganiser} variant="outline" className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                        <Bell className="h-4 w-4 mr-2" /> Remind organiser
                      </Button>
                    </div>

                    {/* Sign Agreement Form */}
                    <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50/30 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Type your full legal name as signature</p>
                      <input 
                        type="text" 
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="e.g. Elena Rodriguez" 
                        className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/20 shadow-sm mb-4"
                      />
                      <Button 
                        onClick={handleSignContract}
                        disabled={signing || !signatureName.trim()}
                        className="w-full h-11 rounded-xl bg-[#e879f9] hover:bg-[#d946ef] text-white font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PenLine className="h-4 w-4 mr-2" /> {signing ? "Signing..." : "Sign Agreement"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">You have signed this agreement.</span>
                  </div>
                )}

              </div>
          </div>
        </div>

        {/* Activity Log — full sign/unsign history, in chronological order */}
        {(artist.agreement?.signatureLog?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100 mt-6">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                <History className="h-5 w-5 text-pink-500" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Activity Log</h2>
              <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">
                {artist.agreement?.signatureLog?.length ?? 0}
              </Badge>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[...(artist.agreement?.signatureLog ?? [])]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((entry, idx) => {
                    const isSigned = entry.action === "signed";
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3.5 shadow-sm",
                          isSigned ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                            isSigned ? "bg-emerald-100" : "bg-slate-100"
                          )}>
                            {isSigned ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 capitalize">
                              {entry.actor} {isSigned ? "signed" : "removed their signature"}
                              {entry.name ? ` · ${entry.name}` : ""}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(entry.timestamp).toLocaleString(undefined, {
                                weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Agreement Chat Section */}
        {artist.agreement?.stageDiscussion && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100 mt-6">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                  <MessageSquare className="h-5 w-5 text-pink-500" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Agreement Chat</h2>
                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">{artist.agreement.stageDiscussion.length || 0}</Badge>
                <select
                  value={chatStatus}
                  onChange={(e) => { const val = e.target.value as SectionItemStatus; setChatStatus(val); saveSectionStatus("agreement_chat", val); }}
                  className={`ml-2 text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/40 transition-colors ${sectionStatusColors[chatStatus]}`}
                >
                  <option value="required">Required</option>
                  <option value="not_required">Not Required</option>
                  <option value="not_applicable">N/A</option>
                </select>
              </div>
            </div>
            <div className="p-6">
              <StageDiscussion 
                messages={artist.agreement.stageDiscussion} 
                artistName={artist.name} 
                eventId={eventId}
                artistId={artist.id}
                isContractChat={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
