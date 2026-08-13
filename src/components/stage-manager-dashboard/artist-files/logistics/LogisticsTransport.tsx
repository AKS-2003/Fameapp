"use client";

import React, { useState } from "react";
import {
  Check,
  MessageSquare,
  Send,
  CheckCircle2,
  Truck,
  X,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, Transport } from "../types";

interface LogisticsTransportProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
}

const emptyForm = {
  type: "",
  vehicle: "",
  pickupTime: "",
  pickupLocation: "",
  dropOffLocation: "",
  driver: "",
  notes: "",
};

export function LogisticsTransport({ artist, eventId, onRefresh }: LogisticsTransportProps) {
  const transports = artist.logistics?.transports || [];

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

  const handleOpenEdit = (transport: Transport) => {
    setForm({
      type: transport.type || "",
      vehicle: transport.vehicle || "",
      pickupTime: transport.pickupTime || "",
      pickupLocation: transport.pickupLocation || "",
      dropOffLocation: transport.dropOffLocation || "",
      driver: transport.driver || "",
      notes: transport.notes || "",
    });
    setEditingId(transport.id);
    setIsOpen(true);
  };

  const saveTransports = async (updated: Transport[]) => {
    const res = await fetch(`/api/contracts/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: artist.id,
        travelLogistics: {
          ...(artist.logistics as any),
          transports: updated,
        },
      }),
    });
    if (res.ok && onRefresh) onRefresh();
    return res.ok;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type.trim() || isSaving) return;
    setIsSaving(true);
    try {
      let updated: Transport[];
      if (editingId) {
        updated = transports.map((t) => (t.id === editingId ? { ...t, ...form } : t));
      } else {
        const newTransport: Transport = { id: `transport-${Date.now()}`, ...form };
        updated = [...transports, newTransport];
      }
      const ok = await saveTransports(updated);
      if (ok) {
        setIsOpen(false);
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transport booking?")) return;
    await saveTransports(transports.filter((t) => t.id !== id));
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
          + Add Transport
        </Button>
      </div>

      {isOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">
              {editingId ? "Edit Transport" : "Add Transport"}
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
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Type *
              </label>
              <input
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Airport Transfer"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Vehicle
              </label>
              <input
                value={form.vehicle}
                onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
                placeholder="Mercedes Vito"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Pickup Time
              </label>
              <input
                type="datetime-local"
                value={form.pickupTime}
                onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Driver
              </label>
              <input
                value={form.driver}
                onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Pickup Location
              </label>
              <input
                value={form.pickupLocation}
                onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Drop-off Location
              </label>
              <input
                value={form.dropOffLocation}
                onChange={(e) => setForm((f) => ({ ...f, dropOffLocation: e.target.value }))}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1 block">
                Notes
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Transport"}
            </Button>
          </div>
        </form>
      )}

      {transports.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-[16px] border border-slate-100 bg-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transports.map((transport) => (
            <div
              key={transport.id}
              className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900">{transport.type}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    onClick={() => handleOpenEdit(transport)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(transport.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Vehicle</p>
                  <p className="text-sm font-bold text-slate-900">{transport.vehicle || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Pickup Time</p>
                  <p className="text-sm font-bold text-slate-900">{transport.pickupTime || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Pickup</p>
                  <p className="text-sm font-bold text-slate-900">{transport.pickupLocation || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Drop-off</p>
                  <p className="text-sm font-bold text-slate-900">{transport.dropOffLocation || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Driver</p>
                  <p className="text-sm font-bold text-slate-900">{transport.driver || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">Notes</p>
                  <p className="text-sm font-bold text-slate-900">{transport.notes || "—"}</p>
                </div>
              </div>

              <Button
                onClick={() => toggleApproved(transport.id)}
                className={cn(
                  "h-10 rounded-xl font-bold px-6 shadow-sm",
                  approvedIds[transport.id]
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                    : "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
                )}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {approvedIds[transport.id] ? "Approved" : "Approve"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Discussion Section */}
      {transports.length > 0 && (
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
