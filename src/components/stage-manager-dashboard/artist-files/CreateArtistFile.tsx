"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Save, Loader2, Search, CheckCircle2, KeyRound, Copy, Check } from "lucide-react";

interface CreateArtistFileProps {
  onBack: () => void;
  onCreated: (artist: any) => void;
  defaultEventId?: string;
}

const ARTIST_TYPES = ["Solo", "Duo", "Trio", "Group", "Band", "DJ", "MC", "Other"];

export function CreateArtistFile({ onBack, onCreated, defaultEventId }: CreateArtistFileProps) {
  const [form, setForm] = useState({
    artistName: "",
    artistType: "Solo",
    internalOwner: "",
    notes: "",
    leadContactName: "",
    email: "",
    phone: "",
    famelinkSearch: "",
  });
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [famelinkResults, setFamelinkResults] = useState<any[]>([]);
  const [linkedFameLink, setLinkedFameLink] = useState<any>(null);
  const [searchingFL, setSearchingFL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When creating a brand-new artist, the server generates login credentials —
  // shown here once so the stage manager can copy/share them before moving on.
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [pendingCreatedArtist, setPendingCreatedArtist] = useState<any>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        const evts = d.data || [];
        setEvents(evts);
        if (defaultEventId && evts.some((e: { id: string }) => e.id === defaultEventId)) {
          setSelectedEventId(defaultEventId);
        } else if (evts.length > 0) {
          setSelectedEventId(evts[0].id);
        }
      })
      .catch(console.error);
  }, [defaultEventId]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const searchFameLink = async (query: string) => {
    if (!query.trim()) {
      setFamelinkResults([]);
      return;
    }
    setSearchingFL(true);
    try {
      const r = await fetch(
        `/api/artists/profile?search=${encodeURIComponent(query)}`
      );
      const d = await r.json();
      setFamelinkResults(d.data || []);
    } catch {
      setFamelinkResults([]);
    } finally {
      setSearchingFL(false);
    }
  };

  // Auto-search as the user types, debounced to avoid firing on every keystroke
  useEffect(() => {
    if (!form.famelinkSearch.trim()) {
      setFamelinkResults([]);
      setSearchingFL(false);
      return;
    }
    setSearchingFL(true);
    const timeout = setTimeout(() => searchFameLink(form.famelinkSearch), 400);
    return () => clearTimeout(timeout);
  }, [form.famelinkSearch]);

  const handleSelectFameLink = (artist: any) => {
    setLinkedFameLink(artist);
    setFamelinkResults([]);
    // Auto-fill form fields from the FameLink profile
    setForm((prev) => ({
      ...prev,
      artistName: artist.artistName || prev.artistName,
      email: artist.email || prev.email,
      leadContactName: artist.realName || artist.artistName || prev.leadContactName,
      phone: artist.phone || prev.phone,
    }));
  };

  const handleSave = async (asDraft = false) => {
    if (!form.artistName.trim()) {
      setError("Artist / Act Name is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!selectedEventId) {
      setError("Please select an event.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Use the linked FameLink artist's existing ID, or generate a new one
      // so the invite link and future signup both resolve to the same artist
      const famelinkArtistId =
        linkedFameLink?.id ||
        `artist-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

      const payload = {
        artistName: form.artistName,
        realName: form.leadContactName,
        email: form.email,
        phone: form.phone,
        performanceType: form.artistType,
        notes: form.notes,
        stageManagerNotes: form.internalOwner,
        eventName: events.find((e) => e.id === selectedEventId)?.name || "",
        status: asDraft ? "draft" : "pending",
        famelinkArtistId,
      };
      const res = await fetch(`/api/events/${selectedEventId}/artists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const createdArtist = { ...payload, id: data.data?.id, eventId: selectedEventId };
        if (data.data?.generatedPassword) {
          // Hold off notifying the parent until the stage manager has seen the password
          setCreatedCredentials({ email: form.email, password: data.data.generatedPassword });
          setPendingCreatedArtist(createdArtist);
        } else {
          onCreated(createdArtist);
        }
      } else {
        setError(data.error?.message || "Failed to create artist file.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPassword = () => {
    if (!createdCredentials) return;
    navigator.clipboard?.writeText(createdCredentials.password).then(() => {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    });
  };

  const handleDismissCredentials = () => {
    setCreatedCredentials(null);
    setCopiedPassword(false);
    if (pendingCreatedArtist) {
      onCreated(pendingCreatedArtist);
      setPendingCreatedArtist(null);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400";
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-500";

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
              className={inputCls}
            >
              <option value="">Select an event...</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>

          {/* FameLink Connection — FIRST, above artist details */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 text-base font-semibold text-slate-900">FameLink Connection</h2>
            <p className="mb-4 text-xs text-slate-500">
              Search by email or name to link an existing FameLink artist. Their details will be auto-filled below.
            </p>

            {linkedFameLink ? (
              <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-600 font-bold text-white shrink-0">
                  {linkedFameLink.artistName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {linkedFameLink.artistName}
                    </p>
                    <CheckCircle2 className="h-4 w-4 text-fuchsia-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{linkedFameLink.email}</p>
                </div>
                <button
                  onClick={() => setLinkedFameLink(null)}
                  className="text-xs text-red-400 hover:text-red-600 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.famelinkSearch}
                    onChange={(e) => set("famelinkSearch", e.target.value)}
                    placeholder="Search by email or artist name..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  />
                  {searchingFL && (
                    <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fuchsia-500" />
                  )}
                </div>

                {famelinkResults.length > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {famelinkResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectFameLink(r)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fuchsia-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-100 font-bold text-fuchsia-700 text-xs shrink-0">
                          {r.artistName?.[0] || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{r.artistName}</p>
                          <p className="text-xs text-slate-500 truncate">{r.email}</p>
                        </div>
                        <span className="text-xs text-fuchsia-600 font-medium shrink-0">Select →</span>
                      </button>
                    ))}
                  </div>
                )}

                {!searchingFL && form.famelinkSearch && famelinkResults.length === 0 && (
                  <p className="mt-3 text-xs text-slate-400 text-center py-2">
                    No FameLink artists found. You can still create the file manually below.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Basic Artist Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Basic Artist Info</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>
                    Artist / Act Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.artistName}
                    onChange={(e) => set("artistName", e.target.value)}
                    placeholder="Enter artist or act name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Artist Type</label>
                  <select
                    value={form.artistType}
                    onChange={(e) => set("artistType", e.target.value)}
                    className={inputCls}
                  >
                    {ARTIST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Internal Owner</label>
                  <input
                    type="text"
                    value={form.internalOwner}
                    onChange={(e) => set("internalOwner", e.target.value)}
                    placeholder="Booking owner"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
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
                  <label className={labelCls}>Lead Contact Name</label>
                  <input
                    type="text"
                    value={form.leadContactName}
                    onChange={(e) => set("leadContactName", e.target.value)}
                    placeholder="Primary contact person"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="contact@example.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 234 567 890"
                    className={inputCls}
                  />
                </div>
              </div>
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

      {/* Generated login credentials — shown once right after creating a brand-new artist */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 shrink-0">
                <KeyRound className="h-5 w-5 text-fuchsia-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Artist Account Created</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              A new FameLink login was created for this artist. We&apos;ve emailed these credentials to them —
              you can also share them directly now.
            </p>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Email</label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800">
                  {createdCredentials.email}
                </div>
              </div>
              <div>
                <label className={labelCls}>Temporary Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-800">
                    {createdCredentials.password}
                  </div>
                  <button
                    onClick={handleCopyPassword}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shrink-0"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              The artist can log in with these credentials right away, and reset the password anytime from the login page.
            </p>

            <button
              onClick={handleDismissCredentials}
              className="mt-5 w-full rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
