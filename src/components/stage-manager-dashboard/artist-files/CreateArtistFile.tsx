"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Save, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateArtistFileProps {
  onBack: () => void;
  onCreated: (artist: any) => void;
}

const ARTIST_TYPES = ["Solo", "Duo", "Trio", "Group", "Band", "DJ", "MC", "Other"];

export function CreateArtistFile({ onBack, onCreated }: CreateArtistFileProps) {
  const [form, setForm] = useState({
    artistName: "",
    artistType: "Solo",
    internalOwner: "",
    notes: "",
    leadContactName: "",
    email: "",
    phone: "",
    eventName: "",
    eventDate: "",
    destination: "",
    famelinkSearch: "",
  });
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [famelinkResults, setFamelinkResults] = useState<any[]>([]);
  const [linkedFameLink, setLinkedFameLink] = useState<any>(null);
  const [searchingFL, setSearchingFL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events on mount
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        const evts = d.data || [];
        setEvents(evts);
        if (evts.length > 0) setSelectedEventId(evts[0].id);
      })
      .catch(console.error);
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const searchFameLink = async () => {
    if (!form.famelinkSearch.trim()) return;
    setSearchingFL(true);
    setFamelinkResults([]);
    try {
      const r = await fetch(
        `/api/artists/profile?search=${encodeURIComponent(form.famelinkSearch)}`
      );
      const d = await r.json();
      setFamelinkResults(d.data || []);
    } catch {
      setFamelinkResults([]);
    } finally {
      setSearchingFL(false);
    }
  };

  const handleSave = async (asDraft = false) => {
    if (!form.artistName.trim()) {
      setError("Artist / Act Name is required.");
      return;
    }
    if (!selectedEventId) {
      setError("Please select an event.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        artistName: form.artistName,
        realName: form.leadContactName,
        email: form.email,
        phone: form.phone,
        performanceType: form.artistType,
        notes: form.notes,
        stageManagerNotes: form.internalOwner,
        countryLiving: form.destination,
        eventName: form.eventName || events.find((e) => e.id === selectedEventId)?.name || "",
        status: asDraft ? "draft" : "pending",
        famelinkArtistId: linkedFameLink?.id || "",
      };
      const res = await fetch(`/api/events/${selectedEventId}/artists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onCreated({ ...payload, id: data.data?.id, eventId: selectedEventId });
      } else {
        setError(data.error?.message || "Failed to create artist file.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f5fb]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-fuchsia-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Artist Files
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-slate-900">Create Artist File</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new artist record and link to an event
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Event selector */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Link to Event</h2>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            >
              <option value="">Select an event...</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Basic Artist Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Basic Artist Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Artist / Act Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.artistName}
                    onChange={(e) => set("artistName", e.target.value)}
                    placeholder="Enter artist or act name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Artist Type
                  </label>
                  <select
                    value={form.artistType}
                    onChange={(e) => set("artistType", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  >
                    {ARTIST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Internal Owner
                  </label>
                  <input
                    type="text"
                    value={form.internalOwner}
                    onChange={(e) => set("internalOwner", e.target.value)}
                    placeholder="Booking owner"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes</label>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Internal notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Contact Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Lead Contact Name
                  </label>
                  <input
                    type="text"
                    value={form.leadContactName}
                    onChange={(e) => set("leadContactName", e.target.value)}
                    placeholder="Primary contact person"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Event Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={form.eventName}
                    onChange={(e) => set("eventName", e.target.value)}
                    placeholder="Event name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => set("eventDate", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="City, Country"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                </div>
              </div>
            </div>

            {/* FameLink Connection */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-base font-semibold text-slate-900">FameLink Connection</h2>
              <p className="mb-4 text-xs text-slate-500">
                Link an existing FameLink artist profile or invite the artist to create one.
              </p>

              {linkedFameLink ? (
                <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-600 font-bold text-white">
                    {linkedFameLink.artistName?.[0] || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {linkedFameLink.artistName}
                    </p>
                    <p className="text-xs text-slate-500">{linkedFameLink.email}</p>
                  </div>
                  <button
                    onClick={() => setLinkedFameLink(null)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      FameLink Username or Email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.famelinkSearch}
                        onChange={(e) => set("famelinkSearch", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchFameLink()}
                        placeholder="Search FameLink..."
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                      />
                    </div>
                  </div>
                  <button
                    onClick={searchFameLink}
                    disabled={searchingFL}
                    className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {searchingFL ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search FameLink
                  </button>

                  {famelinkResults.length > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      {famelinkResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setLinkedFameLink(r); setFamelinkResults([]); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fuchsia-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-100 font-bold text-fuchsia-700 text-xs">
                            {r.artistName?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{r.artistName}</p>
                            <p className="text-xs text-slate-500">{r.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <button
              onClick={onBack}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Artist File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
