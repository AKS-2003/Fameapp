"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid, Copy, ExternalLink, UserPlus, Check, ChevronDown, Info } from "lucide-react";
import { InviteArtistDialog } from "@/components/stage-manager/InviteArtistDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Artist } from "./types";

type WorkflowStatus = "Required" | "Not Required" | "Not Ready Yet" | "Completed Outside System";
interface WorkflowState { contract: WorkflowStatus; logistics: WorkflowStatus; show: WorkflowStatus; }

interface ArtistHeaderProps {
  artist: Artist;
  eventId?: string;
  eventData?: any;
  onBack?: () => void;
  allShows?: any[];
  selectedShowIndex?: number;
  onSelectShow?: (index: number) => void;
  /** Shared workflow state owned by ArtistFiles */
  artistWorkflow?: WorkflowState;
  onWorkflowChange?: (w: WorkflowState) => void;
}

const WORKFLOW_OPTIONS: WorkflowStatus[] = [
  "Required",
  "Not Required",
  "Not Ready Yet",
  "Completed Outside System",
];

function WorkflowDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: WorkflowStatus;
  onChange: (v: WorkflowStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDirty = value !== "Required";

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="font-medium">{label}:</span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
            isDirty
              ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          {value.length > 12 ? value.slice(0, 12) + "…" : value}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </div>
      {open && (
        <div
          className="absolute left-[52px] top-full mt-1 z-50 min-w-[210px] rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60 overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          {WORKFLOW_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors"
            >
              <span className={`w-4 h-4 flex items-center justify-center ${value === opt ? "text-fuchsia-600" : "text-transparent"}`}>
                <Check className="w-3.5 h-3.5" />
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-sm text-slate-800 ${multiline ? "whitespace-pre-wrap" : ""} ${!value ? "text-slate-400" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function ArtistHeader({
  artist,
  eventId,
  eventData,
  onBack,
  allShows,
  selectedShowIndex,
  onSelectShow,
  artistWorkflow,
  onWorkflowChange,
}: ArtistHeaderProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState<string>("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const openBasicInfo = () => {
    setIsBasicInfoOpen(true);
  };

  // If the artist's email isn't already on the contract record, look it up
  // by their FameLink artist id so the popup can still show it.
  useEffect(() => {
    if (!isBasicInfoOpen) return;
    const existingEmail = (artist as any).email || "";
    if (existingEmail) {
      setResolvedEmail(existingEmail);
      return;
    }
    const lookupId = artist.famelinkArtistId || artist.id;
    if (!lookupId) return;
    setLoadingEmail(true);
    fetch(`/api/artists/profile?artistId=${encodeURIComponent(lookupId)}`)
      .then((r) => r.json())
      .then((d) => setResolvedEmail(d?.data?.email || ""))
      .catch(() => setResolvedEmail(""))
      .finally(() => setLoadingEmail(false));
  }, [isBasicInfoOpen, artist.id, artist.famelinkArtistId]);

  const handleCopyLink = () => {
    const text = fullMagicLink;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback for clipboard API failure
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Local draft of workflow — committed to parent on Save
  const defaultWorkflow: WorkflowState = artistWorkflow || { contract: "Required", logistics: "Required", show: "Required" };
  const [draft, setDraft] = useState<WorkflowState>(defaultWorkflow);
  const [committed, setCommitted] = useState<WorkflowState>(defaultWorkflow);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [artist.id, artist.image]);

  // Sync when parent resets (artist switch)
  useEffect(() => {
    const next: WorkflowState = artistWorkflow || { contract: "Required", logistics: "Required", show: "Required" };
    setDraft(next);
    setCommitted(next);
  }, [artist.id, artistWorkflow?.contract, artistWorkflow?.logistics, artistWorkflow?.show]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(committed);

  const handleSave = async () => {
    if (!eventId || !artist.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/artists/${artist.id}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowContract: draft.contract,
          workflowLogistics: draft.logistics,
          workflowShow: draft.show,
        }),
      });
      if (res.ok) {
        setCommitted(draft);
        onWorkflowChange?.(draft); // push to ArtistFiles → ArtistTabs
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Workflow save failed:", res.status, err);
      }
    } catch (e) {
      console.error("Failed to save workflow:", e);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Build the modules string for the magic link.
   * Rules (event-level AND per-artist):
   *   - event toggle must be true  AND  per-artist status must NOT be "Not Required"
   *   - "Completed Outside System" → still include in link (artist still navigates there)
   *   - "Not Ready Yet"            → still include (just informational label)
   *   - "Not Required"             → EXCLUDE from magic link
   */
  const getModulesPath = (wf: WorkflowState = committed) => {
    const modules: string[] = [];
    if (eventData?.contractEnabled !== false && wf.contract !== "Not Required") modules.push("contract");
    if (eventData?.logisticsEnabled !== false && wf.logistics !== "Not Required") modules.push("logistics");
    if (eventData?.showInfoEnabled !== false && wf.show !== "Not Required") modules.push("showinfo");
    return modules.join(",");
  };

  const modulesParam = getModulesPath(committed);
  const inviteArtistId = artist.famelinkArtistId || artist.id;
  const magicLinkPath = `/famelink/invite?event=${eventId || "unknown"}&artist=${inviteArtistId}${modulesParam ? `&modules=${modulesParam}` : ""}`;
  const fullMagicLink = typeof window !== "undefined" ? `${window.location.origin}${magicLinkPath}` : magicLinkPath;

  const getImageUrl = (src: string) => {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:") || src.startsWith("/")) {
      return src;
    }
    return `/api/media/${src}`;
  };

  return (
    <div className="flex flex-col shrink-0 bg-white">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-50 px-6 py-3">
        <button
          onClick={onBack}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="mr-2">←</span> Go back to Dashboard
        </button>
      </div>

      {/* Artist Profile */}
      <div className="p-6 pb-0">
        <div className="mb-6 flex items-start gap-4">
          {artist.image && !imageError ? (
            <img
              src={getImageUrl(artist.image)}
              alt={artist.name}
              onError={() => setImageError(true)}
              className="h-14 w-14 shrink-0 rounded-full object-cover shadow-lg shadow-fuchsia-200"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d912b7] text-xl font-bold text-white shadow-lg shadow-fuchsia-200">
              {artist.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              {artist.name}
              {(artist as any).artists_page_tag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {(artist as any).artists_page_tag}
                </span>
              )}
              <button
                type="button"
                onClick={openBasicInfo}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-500 hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 transition-colors"
              >
                <Info className="h-3 w-3" />
                Basic Info
              </button>
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              {artist.realName}{artist.location ? ` • ${artist.location}` : ""}
            </p>
          </div>
        </div>

        {/* Invite Link Box — updates live when committed workflow changes */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 pl-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
            <LayoutGrid className="h-4 w-4 text-slate-300" />
          </div>
          <p className="flex-1 truncate text-xs text-slate-500 font-mono select-all" title={fullMagicLink}>
            {fullMagicLink}
          </p>
          <div className="flex items-center gap-2 pr-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm font-medium"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-fuchsia-600 border-fuchsia-200 bg-fuchsia-50/30 hover:bg-fuchsia-50 hover:text-fuchsia-700 shadow-sm font-medium"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm font-medium"
              onClick={() => window.open(magicLinkPath, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
          </div>
        </div>

        {/* WORKFLOW bar */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workflow</span>
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <WorkflowDropdown
              label="Agreement"
              value={draft.contract}
              onChange={v => setDraft(d => ({ ...d, contract: v }))}
            />
            <WorkflowDropdown
              label="Logistics"
              value={draft.logistics}
              onChange={v => setDraft(d => ({ ...d, logistics: v }))}
            />
            <WorkflowDropdown
              label="Show"
              value={draft.show}
              onChange={v => setDraft(d => ({ ...d, show: v }))}
            />
          </div>
          {isDirty && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setDraft(committed)}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold shadow-md shadow-fuchsia-200 text-xs"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </div>

        <InviteArtistDialog
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          artist={artist}
          event={eventData}
          magicLink={fullMagicLink}
          modules={getModulesPath(committed).split(",").filter(Boolean)}
        />

        <Dialog open={isBasicInfoOpen} onOpenChange={setIsBasicInfoOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Basic Artist Info</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-base font-semibold text-slate-900">Basic Artist Info</h2>
                <div className="space-y-4">
                  <InfoField label="Artist / Act Name" value={artist.name} />
                  <InfoField label="Artist Type" value={artist.type} />
                  <InfoField label="Internal Owner" value={(artist as any).internalOwner} />
                  <InfoField label="Notes" value={(artist as any).notes} multiline />
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-base font-semibold text-slate-900">Contact Info</h2>
                <div className="space-y-4">
                  <InfoField label="Lead Contact Name" value={artist.realName} />
                  <InfoField
                    label="Email"
                    value={loadingEmail ? "Loading..." : resolvedEmail}
                  />
                  <InfoField label="Phone" value={(artist as any).phone} />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
