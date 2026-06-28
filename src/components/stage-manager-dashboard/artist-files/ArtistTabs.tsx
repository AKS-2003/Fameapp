"use client";

import React from "react";
import { FileText, Truck, Music } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkflowStatus = "Required" | "Not Required" | "Not Ready Yet" | "Completed Outside System";
interface WorkflowState { contract: WorkflowStatus; logistics: WorkflowStatus; show: WorkflowStatus; }

interface ArtistTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  eventData?: any;
  artistWorkflow?: WorkflowState;
}

/** A tab is visible when: event has it enabled AND per-artist status is not "Not Required" */
function isTabVisible(
  name: "Contract" | "Logistics" | "Show Management",
  eventData: any,
  workflow: WorkflowState | undefined,
) {
  if (name === "Contract") {
    if (eventData?.contractEnabled === false) return false;
    if (workflow?.contract === "Not Required") return false;
    return true;
  }
  if (name === "Logistics") {
    if (eventData?.logisticsEnabled === false) return false;
    if (workflow?.logistics === "Not Required") return false;
    return true;
  }
  if (name === "Show Management") {
    if (eventData?.showInfoEnabled === false) return false;
    if (workflow?.show === "Not Required") return false;
    return true;
  }
  return true;
}

export function ArtistTabs({ activeTab, onTabChange, eventData, artistWorkflow }: ArtistTabsProps) {
  const tabs = [
    ...(isTabVisible("Contract", eventData, artistWorkflow) ? [{ name: "Contract", icon: FileText }] : []),
    ...(isTabVisible("Logistics", eventData, artistWorkflow) ? [{ name: "Logistics", icon: Truck }] : []),
    ...(isTabVisible("Show Management", eventData, artistWorkflow) ? [{ name: "Show Management", icon: Music }] : []),
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
