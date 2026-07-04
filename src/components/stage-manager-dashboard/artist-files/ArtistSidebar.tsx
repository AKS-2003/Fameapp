"use client";

import React from "react";
import { Search, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Artist } from "./types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArtistSidebarProps {
  artists: Artist[];
  selectedArtist: Artist | null;
  onSelect: (artist: Artist) => void;
  onBack: () => void;
  onAdd: () => void;
  onDelete?: (artist: Artist) => void;
}


export function ArtistSidebar({
  artists,
  selectedArtist,
  onSelect,
  onBack,
  onAdd,
  onDelete,
}: ArtistSidebarProps) {

  const [searchQuery, setSearchQuery] = React.useState("");
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
      case "Waiting For Info": return "bg-slate-100 text-slate-700 hover:bg-slate-100";
      case "Awaiting Signature": return "bg-slate-100 text-slate-700 hover:bg-slate-100";
      case "Invited": return "bg-slate-100 text-slate-700 hover:bg-slate-100";
      default: return "bg-slate-100 text-slate-700 hover:bg-slate-100";
    }
  };

  const filteredArtists = artists.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.realName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImageUrl = (src: string) => {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:") || src.startsWith("/")) {
      return src;
    }
    return `/api/media/${src}`;
  };

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-slate-100 bg-slate-50/50">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Artist Pipeline</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Bulk</span>
            <Button size="sm" className="h-8 rounded-xl bg-fuchsia-600 px-3 hover:bg-fuchsia-700" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>

          </div>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            All Status ({filteredArtists.length}) <ChevronDown className="h-3 w-3" />
          </div>
          <div className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            All Types <ChevronDown className="h-3 w-3" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredArtists.map((artist) => (
          <div
            key={artist.id}
            className={cn(
              "group mb-1 flex w-full items-center gap-3 rounded-[20px] p-3 transition-all",
              selectedArtist?.id === artist.id ? "bg-fuchsia-50/50 ring-1 ring-fuchsia-100" : "hover:bg-slate-100"
            )}
          >
            <button
              onClick={() => onSelect(artist)}
              className="flex flex-1 items-center gap-3 text-left min-w-0"
            >
              {artist.image && !imageErrors[artist.id] ? (
                <img
                  src={getImageUrl(artist.image)}
                  alt={artist.name}
                  onError={() => setImageErrors(prev => ({ ...prev, [artist.id]: true }))}
                  className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold shadow-sm text-sm transition-colors",
                    selectedArtist?.id === artist.id
                      ? "bg-[#d912b7] text-white"
                      : "bg-[#fae8ff] text-[#d912b7]"
                  )}
                >
                  {artist.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold text-slate-900">{artist.name}</p>
                </div>
                <p className="text-[11px] text-slate-400">{artist.location}</p>
              </div>
              <Badge className={cn("rounded-full px-2 py-0 text-[9px] font-medium uppercase shadow-none shrink-0", getStatusColor(artist.status))}>
                {artist.status}
              </Badge>
            </button>

            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    title="Delete Artist"
                    className="shrink-0 rounded-lg p-1.5 text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Artist</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {artist.name}? This will remove the artist and all
                      associated contract, logistics, and show data from this event. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(artist)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-4">
        <Button 
          variant="outline" 
          className="w-full h-10 rounded-xl border-slate-200 text-slate-600 font-bold"
          onClick={onBack}
        >
          Go back to Dashboard
        </Button>
      </div>
    </div>
  );
}
