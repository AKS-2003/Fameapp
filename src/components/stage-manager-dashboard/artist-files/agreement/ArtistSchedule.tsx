"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Music, 
  CheckCircle2, 
  Clock, 
  Briefcase,
  Target,
  Edit2,
  Save,
  Send,
  Eye,
  Trash2,
  Plus,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, Schedule, ScheduleItem, ScheduleTask, SectionItemStatus } from "../types";
import { StageDiscussion } from "../StageDiscussion";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";

interface ArtistScheduleProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
  onAutoOpen?: (itemValue: string) => void;
}

const sectionStatusColors: Record<SectionItemStatus, string> = {
  required:       "text-emerald-600 bg-emerald-50 border-emerald-200",
  not_required:   "text-amber-600 bg-amber-50 border-amber-200",
  not_applicable: "text-slate-400 bg-slate-100 border-slate-200",
};

export function ArtistSchedule({ artist, eventId, onRefresh, onAutoOpen }: ArtistScheduleProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workshopsStatus, setWorkshopsStatus] = useState<SectionItemStatus>(
    (artist.sectionStatuses?.["workshops"] as SectionItemStatus) ?? "required"
  );
  const [performancesStatus, setPerformancesStatus] = useState<SectionItemStatus>(
    (artist.sectionStatuses?.["performances"] as SectionItemStatus) ?? "required"
  );
  const [tasksStatus, setTasksStatus] = useState<SectionItemStatus>(
    (artist.sectionStatuses?.["custom_tasks"] as SectionItemStatus) ?? "required"
  );

  useEffect(() => {
    setWorkshopsStatus((artist.sectionStatuses?.["workshops"] as SectionItemStatus) ?? "required");
    setPerformancesStatus((artist.sectionStatuses?.["performances"] as SectionItemStatus) ?? "required");
    setTasksStatus((artist.sectionStatuses?.["custom_tasks"] as SectionItemStatus) ?? "required");
  }, [artist.id, artist.sectionStatuses?.["workshops"], artist.sectionStatuses?.["performances"], artist.sectionStatuses?.["custom_tasks"]]);

  const saveSectionStatus = async (section: string, status: SectionItemStatus) => {
    try {
      await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id, sectionStatuses: { ...(artist.sectionStatuses || {}), [section]: status } }),
      });
    } catch {}
  };
  const [scheduleData, setScheduleData] = useState<Schedule>(
    artist.agreement?.schedule || {
      deliverablesCount: 0,
      overview: { workshops: 0, shows: 0, tasks: 0, dateRange: "" },
      workshops: [],
      performances: [],
      tasks: []
    }
  );

  useEffect(() => {
    if (artist.agreement?.schedule) {
      setScheduleData(artist.agreement.schedule);
    }
  }, [artist.agreement?.schedule]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const workshopsCount = scheduleData.workshops.length;
      const showsCount = scheduleData.performances.length;
      const tasksCount = scheduleData.tasks.length;
      const deliverablesCount = workshopsCount + showsCount + tasksCount;

      const updatedSchedule = {
        ...scheduleData,
        deliverablesCount,
        overview: {
          ...scheduleData.overview,
          workshops: workshopsCount,
          shows: showsCount,
          tasks: tasksCount
        }
      };

      const response = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          agreement: {
            ...artist.agreement,
            schedule: updatedSchedule
          }
        })
      });

      if (response.ok) {
        setIsEditing(false);
        toast({
          title: "Schedule Saved",
          description: "Artist schedule has been updated successfully.",
        });
        if (onRefresh) onRefresh();
      } else {
        throw new Error("Failed to save schedule");
      }
    } catch (err) {
      console.error("Error saving schedule:", err);
      toast({
        title: "Save Failed",
        description: "There was an error saving the schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (type: 'workshops' | 'performances' | 'tasks') => {
    if (type === 'tasks') {
      const newTask: ScheduleTask = {
        id: uuidv4(),
        title: "",
        date: "",
        time: "",
        description: "",
        terms: ""
      };
      setScheduleData({ ...scheduleData, tasks: [...scheduleData.tasks, newTask] });
    } else {
      const newItem: ScheduleItem = {
        id: uuidv4(),
        title: "",
        date: "",
        time: "",
        location: "",
        status: "Confirmed"
      };
      setScheduleData({ ...scheduleData, [type]: [...scheduleData[type], newItem] });
    }
  };

  const removeItem = (type: 'workshops' | 'performances' | 'tasks', id: string) => {
    setScheduleData({
      ...scheduleData,
      [type]: scheduleData[type].filter((item: any) => item.id !== id)
    });
  };

  const updateItem = (type: 'workshops' | 'performances' | 'tasks', id: string, fields: any) => {
    setScheduleData({
      ...scheduleData,
      [type]: scheduleData[type].map((item: any) => 
        item.id === id ? { ...item, ...fields } : item
      )
    });
  };

  return (
    <>
      {/* Workshops Section */}
      <AccordionItem value="workshops" className="border-none bg-white rounded-2xl shadow-sm mb-4 overflow-hidden ring-1 ring-slate-100">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <Briefcase className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Workshops</h2>
            <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">{scheduleData.workshops.length}</Badge>
            <select
              value={workshopsStatus}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { const val = e.target.value as SectionItemStatus; setWorkshopsStatus(val); saveSectionStatus("workshops", val); if (onAutoOpen) onAutoOpen("workshops"); }}
              className={`ml-2 text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/40 transition-colors ${sectionStatusColors[workshopsStatus]}`}
            >
              <option value="required">Required</option>
              <option value="not_required">Not Required</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">

        {workshopsStatus === "not_required" ? (
          <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-amber-50 border border-amber-200 mt-2">
            <span className="text-amber-600 text-sm font-medium">This section has been marked as Not Required</span>
          </div>
        ) : (
        <>
        <div className="flex justify-end mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setIsEditing(true)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {scheduleData.workshops.map((item) => (
            <div key={item.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input 
                  disabled={!isEditing}
                  value={item.title}
                  onChange={(e) => updateItem('workshops', item.id, { title: e.target.value })}
                  placeholder="Workshop Name"
                  className="flex-1 h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                />
                {isEditing && (
                  <button 
                    onClick={() => removeItem('workshops', item.id)}
                    className="text-red-400 hover:text-red-500 transition-colors shrink-0 p-1"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex gap-3 flex-col md:flex-row">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    disabled={!isEditing}
                    value={item.date}
                    onChange={(e) => updateItem('workshops', item.id, { date: e.target.value })}
                    placeholder="Date (e.g., April 10th, 2026)"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-10 pr-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                </div>
                <div className="relative w-full md:w-32">
                  <input 
                    disabled={!isEditing}
                    value={item.time || ""}
                    onChange={(e) => updateItem('workshops', item.id, { time: e.target.value })}
                    placeholder="Start"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
                <div className="relative w-full md:w-32">
                  <input 
                    disabled={!isEditing}
                    value={(item as any).endTime || ""}
                    onChange={(e) => updateItem('workshops', item.id, { endTime: e.target.value })}
                    placeholder="End"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <input 
                    disabled={!isEditing}
                    value={item.location}
                    onChange={(e) => updateItem('workshops', item.id, { location: e.target.value })}
                    placeholder="Location"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                </div>
              </div>
              <input 
                disabled={!isEditing}
                value={item.description || ""}
                onChange={(e) => updateItem('workshops', item.id, { description: e.target.value })}
                placeholder="Level / Description"
                className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
              />
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => addItem('workshops')}
              className="w-full h-12 bg-slate-50/50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Workshop
            </Button>
          )}
        </div>
        </>
        )}
        </AccordionContent>
      </AccordionItem>

      {/* Performances Section */}
      <AccordionItem value="performances" className="border-none bg-white rounded-2xl shadow-sm mb-4 overflow-hidden ring-1 ring-slate-100">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <Music className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Performances</h2>
            <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">{scheduleData.performances.length}</Badge>
            <select
              value={performancesStatus}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { const val = e.target.value as SectionItemStatus; setPerformancesStatus(val); saveSectionStatus("performances", val); if (onAutoOpen) onAutoOpen("performances"); }}
              className={`ml-2 text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/40 transition-colors ${sectionStatusColors[performancesStatus]}`}
            >
              <option value="required">Required</option>
              <option value="not_required">Not Required</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">

        {performancesStatus === "not_required" ? (
          <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-amber-50 border border-amber-200 mt-2">
            <span className="text-amber-600 text-sm font-medium">This section has been marked as Not Required</span>
          </div>
        ) : (
        <>
        <div className="flex justify-end mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setIsEditing(true)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {scheduleData.performances.map((item) => (
            <div key={item.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input 
                  disabled={!isEditing}
                  value={item.title}
                  onChange={(e) => updateItem('performances', item.id, { title: e.target.value })}
                  placeholder="Show Name"
                  className="flex-1 h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                />
                {isEditing && (
                  <button 
                    onClick={() => removeItem('performances', item.id)}
                    className="text-red-400 hover:text-red-500 transition-colors shrink-0 p-1"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex gap-3 flex-col md:flex-row">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    disabled={!isEditing}
                    value={item.date}
                    onChange={(e) => updateItem('performances', item.id, { date: e.target.value })}
                    placeholder="Date (e.g., April 11th, 2026)"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-10 pr-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                </div>
                <div className="relative w-full md:w-32">
                  <input 
                    disabled={!isEditing}
                    value={item.time || ""}
                    onChange={(e) => updateItem('performances', item.id, { time: e.target.value })}
                    placeholder="Start"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
                <div className="relative w-full md:w-32">
                  <input 
                    disabled={!isEditing}
                    value={(item as any).endTime || ""}
                    onChange={(e) => updateItem('performances', item.id, { endTime: e.target.value })}
                    placeholder="End"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <input 
                    disabled={!isEditing}
                    value={item.location}
                    onChange={(e) => updateItem('performances', item.id, { location: e.target.value })}
                    placeholder="Location"
                    className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
                  />
                </div>
              </div>
              <input 
                disabled={!isEditing}
                value={item.description || ""}
                onChange={(e) => updateItem('performances', item.id, { description: e.target.value })}
                placeholder="Notes (level, requirements, etc.)"
                className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-pink-500/10 outline-none disabled:bg-slate-50/50 disabled:border-slate-100"
              />
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => addItem('performances')}
              className="w-full h-12 bg-slate-50/50 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Performance
            </Button>
          )}
        </div>
        </>
        )}
        </AccordionContent>
      </AccordionItem>

      {/* Custom Tasks Section */}
      <AccordionItem value="tasks" className="border-none bg-white rounded-2xl shadow-sm mb-4 overflow-hidden ring-1 ring-slate-100">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <Target className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Custom Tasks</h2>
            <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">{scheduleData.tasks.length}</Badge>
            <select
              value={tasksStatus}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { const val = e.target.value as SectionItemStatus; setTasksStatus(val); saveSectionStatus("custom_tasks", val); if (onAutoOpen) onAutoOpen("tasks"); }}
              className={`ml-2 text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/40 transition-colors ${sectionStatusColors[tasksStatus]}`}
            >
              <option value="required">Required</option>
              <option value="not_required">Not Required</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">

        {tasksStatus === "not_required" ? (
          <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-amber-50 border border-amber-200 mt-2">
            <span className="text-amber-600 text-sm font-medium">This section has been marked as Not Required</span>
          </div>
        ) : (
        <>
        <div className="flex justify-end mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setIsEditing(true)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {scheduleData.tasks.map((item) => (
            <div key={item.id} className="flex gap-4 items-start">
              <input 
                disabled={!isEditing}
                value={item.title}
                onChange={(e) => updateItem('tasks', item.id, { title: e.target.value })}
                placeholder="Task Title"
                className="w-[200px] md:w-[240px] shrink-0 h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
              />
              <div className="flex-1 relative">
                <textarea 
                  disabled={!isEditing}
                  value={item.description}
                  onChange={(e) => updateItem('tasks', item.id, { description: e.target.value })}
                  placeholder="Task details (e.g. April 11 - 23:00 - 30 min in social area)..."
                  rows={2}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 pr-12 text-sm font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
                />
                {isEditing && (
                  <button 
                    onClick={() => removeItem('tasks', item.id)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => addItem('tasks')}
              className="w-full h-11 bg-slate-50 border border-dashed border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Custom Task
            </Button>
          )}
        </div>
        </>
        )}
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
