"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Pin,
  Flag,
  File,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, LogisticsNote } from "../types";

interface LogisticsNotesProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
}

export function LogisticsNotes({ artist, eventId, onRefresh }: LogisticsNotesProps) {
  const notes = artist.logistics?.notesData || [];

  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");

  const saveNotes = async (updated: LogisticsNote[]) => {
    const res = await fetch(`/api/contracts/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: artist.id,
        travelLogistics: {
          ...(artist.logistics as any),
          notesData: updated,
        },
      }),
    });
    if (res.ok && onRefresh) onRefresh();
    return res.ok;
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const newNote: LogisticsNote = {
        id: `note-${Date.now()}`,
        author: "Stage Manager",
        date: new Date().toISOString().slice(0, 10),
        content: content.trim(),
        isPinned: false,
        isFlagged: false,
      };
      const ok = await saveNotes([newNote, ...notes]);
      if (ok) {
        setContent("");
        setIsAdding(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await saveNotes(notes.filter((n) => n.id !== id));
  };

  const togglePinned = async (id: string) => {
    await saveNotes(notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)));
  };

  const toggleFlagged = async (id: string) => {
    await saveNotes(notes.map((n) => (n.id === id ? { ...n, isFlagged: !n.isFlagged } : n)));
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-end px-2">
        <Button
          onClick={() => setIsAdding(true)}
          className="h-10 rounded-xl bg-fuchsia-600 text-white font-bold px-6 hover:bg-fuchsia-700 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Note
        </Button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddNote}
          className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">New Note</p>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setContent("");
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a logistics note..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-900 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setContent("");
              }}
              className="text-slate-500"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-fuchsia-600 text-white hover:bg-fuchsia-700">
              <Check className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Add Note"}
            </Button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => togglePinned(note.id)}
                  className={cn(
                    "h-8 w-8 rounded-lg",
                    note.isPinned ? "text-fuchsia-600 bg-fuchsia-50" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <Pin className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFlagged(note.id)}
                  className={cn(
                    "h-8 w-8 rounded-lg",
                    note.isFlagged ? "text-red-600 bg-red-50" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <Flag className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(note.id)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-600 leading-relaxed pl-7">
              {note.content}
            </p>
          </div>
        ))}

        {notes.length === 0 && !isAdding && (
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
