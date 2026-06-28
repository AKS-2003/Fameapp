"use client";

import React from "react";
import { 
  FileText, 
  Plus, 
  Pin, 
  Flag,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist } from "../types";

interface LogisticsNotesProps {
  artist: Artist;
}

export function LogisticsNotes({ artist }: LogisticsNotesProps) {
  const notes = artist.logistics?.notesData;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-end px-2">
        <Button className="h-10 rounded-xl bg-fuchsia-600 text-white font-bold px-6 hover:bg-fuchsia-700 shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes?.map((note) => (
          <div key={note.id} className={cn(
            "rounded-[28px] border bg-white p-6 shadow-sm ring-1 ring-slate-50 transition-all",
            note.isFlagged ? "border-red-100 shadow-red-500/5" : "border-slate-100"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <File className="h-4 w-4 text-slate-400" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{note.author}</span>
                  <span className="text-xs font-medium text-slate-400">{note.date}</span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {note.isPinned && <Pin className="h-3 w-3 text-fuchsia-500 fill-fuchsia-500" />}
                    {note.isFlagged && <Flag className="h-3 w-3 text-red-500 fill-red-500" />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className={cn(
                  "h-8 w-8 rounded-lg",
                  note.isPinned ? "text-fuchsia-600 bg-fuchsia-50" : "text-slate-400 hover:bg-slate-50"
                )}>
                  <Pin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className={cn(
                  "h-8 w-8 rounded-lg",
                  note.isFlagged ? "text-red-600 bg-red-50" : "text-slate-400 hover:bg-slate-50"
                )}>
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <p className="text-sm font-medium text-slate-600 leading-relaxed pl-7">
              {note.content}
            </p>
          </div>
        ))}

        {!notes?.length && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[28px] border border-dashed border-slate-200">
            <FileText className="h-12 w-12 mb-4 opacity-10" />
            <p className="text-sm font-medium">No logistics notes yet</p>
            <p className="text-xs mt-1">Click "Add Note" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
