"use client";

import React from "react";
import { 
  Utensils, 
  Check, 
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist } from "../types";

interface LogisticsFoodProps {
  artist: Artist;
}

export function LogisticsFood({ artist }: LogisticsFoodProps) {
  const food = artist.logistics?.food;

  if (!food) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Utensils className="h-12 w-12 mb-4 opacity-20" />
        <p>No food & catering data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Food Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-bold text-slate-900">Food & Catering</h3>
        </div>
        <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 shadow-none rounded-full px-3 py-1 font-bold text-[10px]">
          {food.status}
        </Badge>
      </div>

      {/* Food Info Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Food Vouchers</p>
            <p className="text-sm font-bold text-slate-900">{food.vouchers}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dietary Preferences</p>
            <p className="text-sm font-bold text-slate-900">{food.dietaryPreferences}</p>
          </div>
        </div>
      </div>

      {/* Estimated Cost Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Estimated Cost</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-slate-900">{food.estimatedCost.total}</p>
          <p className="text-xs font-medium text-slate-400">{food.estimatedCost.breakdown}</p>
        </div>
      </div>

      {/* Total Food Cost Row */}
      <div className="rounded-2xl bg-fuchsia-50/50 p-4 flex items-center justify-between ring-1 ring-fuchsia-100/50">
        <div className="flex items-center gap-3">
          <Utensils className="h-4 w-4 text-fuchsia-600" />
          <p className="text-sm font-bold text-slate-900">Total Food Cost</p>
        </div>
        <p className="text-sm font-bold text-red-600">{food.estimatedCost.total}.00</p>
      </div>

      {/* Approval Row */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between shadow-sm ring-1 ring-slate-50">
        <p className="text-sm font-medium text-slate-400">Awaiting approvals</p>
        <Button className="h-10 rounded-xl bg-fuchsia-600 text-white font-bold px-6 hover:bg-fuchsia-700 shadow-sm">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </Button>
      </div>

      {/* Discussion Section */}
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">Discussion</h4>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 border-t border-slate-50">
          <MessageSquare className="h-10 w-10 text-slate-100 mb-4" />
          <p className="text-sm font-bold text-slate-300">No messages yet</p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Start a conversation about food & catering details.</p>
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
    </div>
  );
}
