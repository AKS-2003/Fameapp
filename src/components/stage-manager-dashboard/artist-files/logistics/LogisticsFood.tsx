"use client";

import React, { useState } from "react";
import {
  Utensils,
  Check,
  MessageSquare,
  Send,
  CheckCircle2,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, Food } from "../types";

interface LogisticsFoodProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
}

const toForm = (food?: Food) => ({
  vouchers: food?.vouchers || "",
  dietaryPreferences: food?.dietaryPreferences || "",
  costTotal: food?.estimatedCost?.total || "",
  costBreakdown: food?.estimatedCost?.breakdown || "",
});

export function LogisticsFood({ artist, eventId, onRefresh }: LogisticsFoodProps) {
  const food = artist.logistics?.food;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [form, setForm] = useState(toForm(food));

  const handleOpenEdit = () => {
    setForm(toForm(food));
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updatedFood: Food = {
        vouchers: form.vouchers,
        dietaryPreferences: form.dietaryPreferences,
        estimatedCost: {
          total: form.costTotal,
          breakdown: form.costBreakdown,
        },
        status: food?.status || "Draft",
      };
      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          travelLogistics: {
            ...(artist.logistics as any),
            food: updatedFood,
          },
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        if (onRefresh) onRefresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!food && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-[28px] border border-dashed border-slate-200">
          <Utensils className="h-12 w-12 mb-4 opacity-20" />
          <p>No food & catering data available</p>
          <Button
            onClick={handleOpenEdit}
            className="mt-4 h-9 rounded-xl bg-fuchsia-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-fuchsia-700"
          >
            + Add Food & Catering Details
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
        className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 space-y-4"
      >
        <p className="text-sm font-bold text-slate-900">Food & Catering Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
              Food Vouchers
            </label>
            <input
              value={form.vouchers}
              onChange={(e) => setForm((f) => ({ ...f, vouchers: e.target.value }))}
              placeholder="e.g. 3 vouchers/day"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
              Dietary Preferences
            </label>
            <input
              value={form.dietaryPreferences}
              onChange={(e) => setForm((f) => ({ ...f, dietaryPreferences: e.target.value }))}
              placeholder="Vegetarian, no nuts..."
              className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
              Estimated Cost Total
            </label>
            <input
              value={form.costTotal}
              onChange={(e) => setForm((f) => ({ ...f, costTotal: e.target.value }))}
              placeholder="€120"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
              Cost Breakdown
            </label>
            <input
              value={form.costBreakdown}
              onChange={(e) => setForm((f) => ({ ...f, costBreakdown: e.target.value }))}
              placeholder="4 days x €30"
              className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="text-slate-500"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
            <Check className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
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
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 shadow-none rounded-full px-3 py-1 font-bold text-[10px]">
            {food!.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-700"
            onClick={handleOpenEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Food Info Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Food Vouchers</p>
            <p className="text-sm font-bold text-slate-900">{food!.vouchers || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dietary Preferences</p>
            <p className="text-sm font-bold text-slate-900">{food!.dietaryPreferences || "—"}</p>
          </div>
        </div>
      </div>

      {/* Estimated Cost Card */}
      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Estimated Cost</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-slate-900">{food!.estimatedCost?.total || "—"}</p>
          <p className="text-xs font-medium text-slate-400">{food!.estimatedCost?.breakdown}</p>
        </div>
      </div>

      {/* Approval Row */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between shadow-sm ring-1 ring-slate-50">
        <p className="text-sm font-medium text-slate-400">
          {approved ? "Approved" : "Awaiting approvals"}
        </p>
        <Button
          onClick={() => setApproved((v) => !v)}
          className={cn(
            "h-10 rounded-xl font-bold px-6 shadow-sm",
            approved
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
              : "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
          )}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {approved ? "Approved" : "Approve"}
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
