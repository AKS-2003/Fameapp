"use client";

import React, { useState } from "react";
import {
  Building2,
  Check,
  MessageSquare,
  Send,
  CheckCircle2,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, Hotel } from "../types";

interface LogisticsHotelProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
}

const emptyForm = {
  name: "",
  roomType: "",
  checkIn: "",
  checkOut: "",
  rooms: "1",
  roomingList: "",
  breakfast: "",
  ref: "",
};

export function LogisticsHotel({ artist, eventId, onRefresh }: LogisticsHotelProps) {
  const hotels = artist.logistics?.hotels || [];

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [approvedIds, setApprovedIds] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (hotel: Hotel) => {
    setForm({
      name: hotel.name || "",
      roomType: hotel.roomType || "",
      checkIn: hotel.checkIn || "",
      checkOut: hotel.checkOut || "",
      rooms: String(hotel.rooms || 1),
      roomingList: hotel.roomingList || "",
      breakfast: hotel.breakfast || "",
      ref: hotel.ref || "",
    });
    setEditingId(hotel.id);
    setIsOpen(true);
  };

  const saveHotels = async (updatedHotels: Hotel[]) => {
    const res = await fetch(`/api/contracts/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: artist.id,
        travelLogistics: {
          ...(artist.logistics as any),
          hotels: updatedHotels,
        },
      }),
    });
    if (res.ok && onRefresh) onRefresh();
    return res.ok;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      let updatedHotels: Hotel[];
      if (editingId) {
        updatedHotels = hotels.map((h) =>
          h.id === editingId
            ? { ...h, ...form, rooms: Number(form.rooms) || 1 }
            : h,
        );
      } else {
        const newHotel: Hotel = {
          id: `hotel-${Date.now()}`,
          ...form,
          rooms: Number(form.rooms) || 1,
        };
        updatedHotels = [...hotels, newHotel];
      }
      const ok = await saveHotels(updatedHotels);
      if (ok) {
        setIsOpen(false);
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hotel booking?")) return;
    await saveHotels(hotels.filter((h) => h.id !== id));
  };

  const toggleApproved = (id: string) => {
    setApprovedIds((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-end">
        <Button
          onClick={handleOpenAdd}
          className="h-9 rounded-xl bg-fuchsia-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-fuchsia-700"
        >
          + Add Hotel
        </Button>
      </div>

      {isOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">
              {editingId ? "Edit Hotel" : "Add Hotel"}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Hotel Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. NH Amsterdam Centre"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Room Type
              </label>
              <input
                value={form.roomType}
                onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
                placeholder="Double"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Rooms
              </label>
              <input
                type="number"
                min="1"
                value={form.rooms}
                onChange={(e) => setForm((f) => ({ ...f, rooms: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Check-in
              </label>
              <input
                type="date"
                value={form.checkIn}
                onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Check-out
              </label>
              <input
                type="date"
                value={form.checkOut}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Rooming List
              </label>
              <input
                value={form.roomingList}
                onChange={(e) => setForm((f) => ({ ...f, roomingList: e.target.value }))}
                placeholder="Names of guests per room"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Breakfast
              </label>
              <input
                value={form.breakfast}
                onChange={(e) => setForm((f) => ({ ...f, breakfast: e.target.value }))}
                placeholder="Included / Not included"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Booking Ref
              </label>
              <input
                value={form.ref}
                onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="text-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-fuchsia-600 text-white hover:bg-fuchsia-700"
            >
              <Check className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Hotel"}
            </Button>
          </div>
        </form>
      )}

      {hotels.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-[16px] border border-slate-100 bg-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900">{hotel.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    onClick={() => handleOpenEdit(hotel)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(hotel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Room Type</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.roomType || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Check-in</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.checkIn || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Check-out</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.checkOut || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Rooms</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.rooms || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Rooming List</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.roomingList || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Breakfast</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.breakfast || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Ref</p>
                  <p className="text-sm font-bold text-slate-900">{hotel.ref || "—"}</p>
                </div>
              </div>

              <Button
                onClick={() => toggleApproved(hotel.id)}
                className={cn(
                  "h-10 rounded-xl font-bold px-6 shadow-sm",
                  approvedIds[hotel.id]
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                    : "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
                )}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {approvedIds[hotel.id] ? "Approved" : "Approve"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Discussion Section */}
      {hotels.length > 0 && (
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 mt-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">Discussion</h4>
          </div>

          <div className="flex flex-col items-center justify-center py-12 border-t border-slate-50">
            <MessageSquare className="h-10 w-10 text-slate-100 mb-4" />
            <p className="text-sm font-bold text-slate-300">No messages yet</p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">Start a conversation about hotel details.</p>
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
