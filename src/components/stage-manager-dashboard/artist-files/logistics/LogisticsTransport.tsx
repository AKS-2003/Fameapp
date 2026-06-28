"use client";

import React from "react";
import { 
  Car, 
  Check, 
  MessageSquare,
  Send,
  CheckCircle2,
  Truck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist } from "../types";

interface LogisticsTransportProps {
  artist: Artist;
}

export function LogisticsTransport({ artist }: LogisticsTransportProps) {
  const transports = artist.logistics?.transports;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-end">
        <Button className="h-9 rounded-xl bg-fuchsia-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-fuchsia-700">
          + Add Transport
        </Button>
      </div>

      {(!transports || transports.length === 0) ? (
        <div className="flex h-24 items-center justify-center rounded-[16px] border border-slate-100 bg-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
        {transports.map((transport) => (
          <div key={transport.id} className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-900">{transport.type}</h3>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Vehicle</p>
                <p className="text-sm font-bold text-slate-900">{transport.vehicle}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Pickup Time</p>
                <p className="text-sm font-bold text-slate-900">{transport.pickupTime}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Pickup</p>
                <p className="text-sm font-bold text-slate-900">{transport.pickupLocation}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Drop-off</p>
                <p className="text-sm font-bold text-slate-900">{transport.dropOffLocation}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Driver</p>
                <p className="text-sm font-bold text-slate-900">{transport.driver}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1">Notes</p>
                <p className="text-sm font-bold text-slate-900">{transport.notes}</p>
              </div>
            </div>

            <Button className="h-10 rounded-xl bg-fuchsia-600 text-white font-bold px-6 hover:bg-fuchsia-700 shadow-sm">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        ))}
        </div>
      )}

      {/* Discussion Section */}
      {transports && transports.length > 0 && (
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 mt-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">Discussion</h4>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12 border-t border-slate-50">
            <MessageSquare className="h-10 w-10 text-slate-100 mb-4" />
            <p className="text-sm font-bold text-slate-300">No messages yet</p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Start a conversation about transport details.</p>
          </div>

          <div className="relative mt-6">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-4 pl-6 pr-14 text-sm outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-400"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-fuchsia-600 flex items-center justify-center text-white shadow-sm hover:bg-fuchsia-700 transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
