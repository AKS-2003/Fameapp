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
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist } from "./types";
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

export function ArtistAgreement({ artist, eventId, onRefresh, selectedShow, allShows }: ArtistAgreementProps) {
  const [signatureName, setSignatureName] = useState("");
  const [signing, setSigning] = useState(false);

  const organiserSig = artist.agreement?.signatureStatus?.organiser;
  const artistSig = artist.agreement?.signatureStatus?.artist;

  const isOrganiserSigned = organiserSig?.status === "SIGNED";
  const isArtistSigned = artistSig?.status === "SIGNED";

  const signedCount = (isOrganiserSigned ? 1 : 0) + (isArtistSigned ? 1 : 0);

  const handleSignContract = async () => {
    if (!signatureName.trim()) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          contractDocStatus: "confirmed",
          status: "confirmed",
          organiserSignedAt: new Date().toISOString(),
          contractSignedByOrganiser: true,
          organiserSignatureName: signatureName.trim(),
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

  const handleRemindOrganiser = () => {
    alert("Reminder notification sent to organiser team.");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-100">
      {/* Combined Content in Accordions */}
      <div className="animate-in fade-in duration-300 mt-6">
        <Accordion type="multiple" className="w-full space-y-4">
          <ArtistContract artist={artist} eventId={eventId} onRefresh={onRefresh} allShows={allShows} selectedShow={selectedShow} />
          <ArtistSchedule artist={artist} eventId={eventId} onRefresh={onRefresh} />
          <ArtistPayment artist={artist} eventId={eventId} onRefresh={onRefresh} />
        </Accordion>

        {/* Signatures Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100 mt-6">
          <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <PenLine className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Signatures</h2>
            <Badge className="bg-pink-50 text-pink-600 hover:bg-pink-50 border-none ml-2 font-bold">{signedCount}/2</Badge>
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
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Signed</span>
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
