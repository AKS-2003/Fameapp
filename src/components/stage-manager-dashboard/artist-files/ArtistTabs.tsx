"use client";

import React from "react";
import { FileText, Truck, Music } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkflowStatus = "Required" | "Not Required" | "Not Ready Yet" | "Completed Outside System";
interface WorkflowState { contract: WorkflowStatus; logistics: WorkflowStatus; show: WorkflowStatus; }

interface ArtistTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  artistWorkflow?: WorkflowState;
}

/**
 * A tab is visible unless its resolved workflow status is "Not Required".
 * `artistWorkflow` is already resolved with artist-override-first, event-toggle-fallback
 * priority upstream (see ArtistFiles.tsx's resolveArtistWorkflow), so an explicit
 * per-artist "Required" here always wins even if the event has that module disabled.
 */
function isTabVisible(
  name: "Contract" | "Logistics" | "Show Management",
  workflow: WorkflowState | undefined,
) {
  if (name === "Contract") return workflow?.contract !== "Not Required";
  if (name === "Logistics") return workflow?.logistics !== "Not Required";
  if (name === "Show Management") return workflow?.show !== "Not Required";
  return true;
}

export function ArtistTabs({ activeTab, onTabChange, artistWorkflow }: ArtistTabsProps) {
  const tabs = [
    ...(isTabVisible("Contract", artistWorkflow) ? [{ name: "Contract", icon: FileText }] : []),
    ...(isTabVisible("Logistics", artistWorkflow) ? [{ name: "Logistics", icon: Truck }] : []),
    ...(isTabVisible("Show Management", artistWorkflow) ? [{ name: "Show Management", icon: Music }] : []),
  ];

  return (
    <div className="flex gap-1 bg-white p-2 px-6 shrink-0 border-b border-slate-100">
      {tabs.map(tab => (
        <button
          key={tab.name}
          onClick={() => onTabChange(tab.name)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all",
            activeTab === tab.name
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.name === "Contract" ? "Agreement" : tab.name}
        </button>
      ))}
    </div>
  );
}
