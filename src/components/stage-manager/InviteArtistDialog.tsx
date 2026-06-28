import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InviteArtistDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  artist: any;
  event: any;
  magicLink: string;
  modules: string[];
}

export function InviteArtistDialog({
  isOpen,
  onOpenChange,
  artist,
  event,
  magicLink,
  modules,
}: InviteArtistDialogProps) {
  const [message, setMessage] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingArtist, setSavingArtist] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const globalMsg = localStorage.getItem(`event_${event?.id}_invite_msg`);
      const artistMsg = localStorage.getItem(`artist_${artist?.id}_invite_msg`);
      if (artistMsg) {
        setMessage(artistMsg);
      } else if (globalMsg) {
        setMessage(globalMsg);
      } else {
        setMessage("");
      }
    }
  }, [isOpen, artist?.id, event?.id]);

  const handleSaveArtist = async () => {
    setSavingArtist(true);
    try {
      localStorage.setItem(`artist_${artist?.id}_invite_msg`, message);
      toast({ title: "Saved!", description: "Message saved for this artist only." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save message.", variant: "destructive" });
    } finally {
      setSavingArtist(false);
    }
  };

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    try {
      localStorage.setItem(`event_${event?.id}_invite_msg`, message);
      toast({ title: "Saved!", description: "Message saved globally for this event." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save message.", variant: "destructive" });
    } finally {
      setSavingGlobal(false);
    }
  };

  const constructFullInvite = () => {
    const defaultMessage = `Hi ${artist?.artist_name || artist?.name}, you're invited to perform at ${event?.name}. Once you accept, you'll be asked to complete: ${modules.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}.\n\nOpen the invitation below to accept and get started on FameLink.`;
    const finalMsg = message.trim() ? message : defaultMessage;
    return `${finalMsg}\n\nPersonal Magic Link:\n${magicLink}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] bg-slate-50 border-slate-200 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 bg-white border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Sparkles className="h-4 w-4 text-pink-500" />
            Personal Magic Link & Invitation
          </DialogTitle>
          <p className="text-[13px] text-slate-500 mt-0.5 font-medium">
            {artist?.artist_name || artist?.name} &middot; {event?.name}
          </p>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Active Modules */}
          <div className="bg-pink-50/50 rounded-xl border border-pink-200 p-4">
            <p className="text-[11px] font-bold text-pink-500 mb-2.5 uppercase tracking-wider">
              ACTIVE MODULES FOR THIS ARTIST
            </p>
            <div className="space-y-1.5">
              {modules.map((mod) => (
                <div key={mod} className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-600 capitalize">{mod}</span>
                  <span className="font-semibold text-slate-900">Required</span>
                </div>
              ))}
            </div>
          </div>

          {/* Message Textbox */}
          <div className="space-y-2">
            <div className="flex justify-between items-end mb-1">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                YOUR INVITE MESSAGE
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSaveArtist}
                  disabled={savingArtist}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
                  title="Save for this artist only"
                >
                  {savingArtist ? "Saving..." : "Save Artist"}
                </button>
                <button 
                  onClick={handleSaveGlobal}
                  disabled={savingGlobal}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
                  title="Save globally for all artists in event"
                >
                  {savingGlobal ? "Saving..." : "Save Global"}
                </button>
                <button 
                  onClick={() => setMessage("")} 
                  className="text-[11px] text-pink-500 hover:text-pink-600 font-medium"
                >
                  Reset to suggested
                </button>
              </div>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${artist?.artist_name || artist?.name}, you're invited to perform at ${event?.name}. Once you accept, you'll be asked to complete: Contract, Logistics, Show Info.\n\nOpen the invitation below to accept and get started on FameLink.`}
              className="min-h-[110px] resize-none bg-white border-pink-100 focus-visible:ring-pink-500 text-[13px] text-slate-700 shadow-sm rounded-xl p-3"
            />
            <p className="text-[11px] text-slate-500 leading-snug pt-1">
              Auto-adjusted for {modules.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}. The artist's Personal Magic Link is appended automatically when you copy or share.
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Magic Link */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-pink-500 uppercase tracking-wider">
              PERSONAL MAGIC LINK
            </p>
            <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 font-mono text-[12px] text-slate-700 break-all select-all">
              {magicLink}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(magicLink);
                  toast({ title: "Copied!", description: "Link copied to clipboard" });
                }}
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 rounded-lg h-9 shadow-sm"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(constructFullInvite())}`, "_blank");
                }}
                className="bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 rounded-lg h-9 shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(magicLink, "_blank")}
                className="bg-white hover:bg-pink-50 border-pink-200 text-pink-600 hover:text-pink-700 rounded-lg h-9 shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Unique to {artist?.artist_name || artist?.name} for {event?.name}. Reflects this artist's active modules and overrides.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-5 bg-white border-t border-slate-100 flex flex-col gap-3">
          <Button 
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl h-11 text-[13px] font-bold shadow-md"
            onClick={() => {
              navigator.clipboard.writeText(constructFullInvite());
              toast({ title: "Copied!", description: "Full invitation copied to clipboard" });
            }}
          >
            <Copy className="h-4 w-4 mr-2" /> Copy Full Invite (Message + Link)
          </Button>
          <Button 
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl h-11 text-[13px] font-bold shadow-md"
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(constructFullInvite())}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" /> Share Full Invite via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
