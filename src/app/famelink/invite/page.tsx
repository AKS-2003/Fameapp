"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, User, FileText, Settings, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateSimple } from "@/lib/date-utils";

export default function MagicLinkInvitePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#0a0618] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <MagicLinkInviteContent />
    </React.Suspense>
  );
}

function MagicLinkInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const eventId = searchParams.get("event") || "";
  const artistId = searchParams.get("artist") || "";
  const modulesString = searchParams.get("modules") || "";
  const modules = modulesString ? modulesString.split(",").filter(Boolean) : [];
  
  const isValid = !!eventId && !!artistId;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [artistData, setArtistData] = useState<any>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<"accept" | "decline" | null>(null);
  const [notForMe, setNotForMe] = useState(false);
  const [loggedInArtistId, setLoggedInArtistId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fallback: if loaded without params, restore from sessionStorage
    if (!eventId && !artistId) {
      const saved = sessionStorage.getItem("pending_invite_url");
      if (saved && saved !== window.location.href) {
        window.location.href = saved;
      }
    }
  }, []);


  const handleAction = async (action: "accept" | "decline") => {
    setActionLoading(action);
    try {
      // 1. Check Auth Status — any authenticated artist can accept
      const authRes = await fetch("/api/auth/me?role=artist");
      const authData = await authRes.json();

      if (!authData.success || !authData.data?.userId) {
        // Not logged in — hard redirect to auth preserving full return URL
        toast({ title: "Authentication required", description: "Please log in or sign up to accept this invitation." });
        sessionStorage.setItem("pending_invite_action", action);
        sessionStorage.setItem("pending_invite_event", eventId);
        sessionStorage.setItem("pending_invite_url", window.location.href);
        window.location.href = `/famelink-auth?redirect=${encodeURIComponent(window.location.href)}`;
        return;
      }

      const loggedInArtistId = authData.data.userId;
      const loggedInEmail = authData.data.email?.toLowerCase().trim();
      setLoggedInArtistId(loggedInArtistId);

      // 2. Verify this invite was created for the logged-in artist
      // Allow if: their userId matches the artistId in the link, OR their email
      // matches the email on the EventArtist record that has this famelinkArtistId.
      if (loggedInArtistId !== artistId) {
        // Do a server-side check: fetch the artist record for the URL artistId
        // and compare emails
        try {
          const artistCheckRes = await fetch(`/api/artists/${artistId}`);
          const artistCheckJson = await artistCheckRes.json();
          const inviteEmail = artistCheckJson.data?.email?.toLowerCase().trim();
          if (!inviteEmail || inviteEmail !== loggedInEmail) {
            setNotForMe(true);
            setActionLoading(null);
            return;
          }
        } catch {
          toast({ title: "Error", description: "Could not verify invite. Please try again.", variant: "destructive" });
          setActionLoading(null);
          return;
        }
      }

      // 3. Perform the action using the logged-in artist's session
      const apiAction = action === "accept" ? "join" : "decline";
      const joinRes = await fetch(`/api/join-event/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: apiAction })
      });

      const joinJson = await joinRes.json();
      if (joinJson.success) {
        toast({
          title: action === "accept" ? "Invitation Accepted!" : "Invitation Declined",
          description: action === "accept" ? "You have successfully joined the event." : "You have declined this invitation."
        });

        if (action === "accept") {
          // Redirect to the show-selection flow (same as the join-event magic link)
          router.push(`/join-event/${eventId}/confirm`);
        } else {
          router.push(`/famelink/${loggedInArtistId}`);
        }
      } else {
        toast({ title: "Error", description: joinJson.error?.message || "Something went wrong.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error occurred.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        // If already logged in and this invite is for them, skip straight to confirm flow
        try {
          const authRes = await fetch("/api/auth/me?role=artist");
          const authJson = await authRes.json();
          if (authJson.success && authJson.data?.userId) {
            const loggedInId = authJson.data.userId;
            const loggedInEmail = authJson.data.email?.toLowerCase().trim();

            // Only auto-redirect if this invite belongs to the logged-in artist
            let inviteIsForMe = loggedInId === artistId;
            if (!inviteIsForMe) {
              try {
                const ac = await fetch(`/api/artists/${artistId}`);
                const aj = await ac.json();
                const inviteEmail = aj.data?.email?.toLowerCase().trim();
                inviteIsForMe = Boolean(inviteEmail && inviteEmail === loggedInEmail);
              } catch {}
            }

            if (inviteIsForMe) {
              const joinCheckRes = await fetch(`/api/join-event/${eventId}`);
              const joinCheckJson = await joinCheckRes.json();
              if (joinCheckJson.success && joinCheckJson.data.participation) {
                const status = joinCheckJson.data.participation.status;
                if (status === "pending" || status === "submitted" || status === "confirmed") {
                  router.replace(`/join-event/${eventId}/confirm`);
                  return;
                }
              }
            } else {
              // Logged in as a different artist — block the UI immediately
              setNotForMe(true);
            }
          }
        } catch (e) {
          console.error("Error checking existing participation", e);
        }

        // Fetch event data
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventJson = await eventRes.json();
        if (eventJson.success) {
          setEventData(eventJson.data);
        }

        // Fetch artist data
        const artistRes = await fetch(`/api/artists/${artistId}`);
        const artistJson = await artistRes.json();
        if (artistJson.success) {
          setArtistData(artistJson.data);
        }

        // Load custom message if it exists in local storage (fallback to default)
        const customArtistMsg = localStorage.getItem(`artist_${artistId}_invite_msg`);
        const customGlobalMsg = localStorage.getItem(`event_${eventId}_invite_msg`);
        
        if (customArtistMsg) {
          setInviteMessage(customArtistMsg);
        } else if (customGlobalMsg) {
          setInviteMessage(customGlobalMsg);
        } else {
          // Default message
          const modStr = modules.length > 0 ? modules.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ") : "required steps";
          setInviteMessage(`Hi ${artistJson.data?.artistName || 'Artist'}, you're invited to perform at ${eventJson.data?.name || 'this event'}. Once you accept, you'll be asked to complete: ${modStr}.\n\nOpen the invitation below to accept and get started on FameLink.`);
        }
      } catch (err) {
        console.error("Failed to load invite data", err);
      } finally {
        setLoading(false);
      }

      // Check for pending action
      const pendingAction = sessionStorage.getItem("pending_invite_action");
      const pendingEvent = sessionStorage.getItem("pending_invite_event");
      if (pendingAction && pendingEvent === eventId) {
        sessionStorage.removeItem("pending_invite_action");
        sessionStorage.removeItem("pending_invite_event");
        // We know we just came back from auth, try the action again
        handleAction(pendingAction as "accept" | "decline");
      }
    };

    fetchDetails();
  }, [isValid, eventId, artistId]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#0a0618] text-white flex items-center justify-center">
        <p className="text-red-400">Invalid Invite Link</p>
      </div>
    );
  }

  const getModuleIcon = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'contract': return <FileText className="w-3.5 h-3.5" />;
      case 'logistics': return <Settings className="w-3.5 h-3.5" />;
      case 'showinfo': return <Info className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const getModuleLabel = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'contract': return 'Agreement';
      default: return mod;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0618] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div className="mb-6">
          <FameLinkLogo className="w-12 h-12" />
        </div>
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Special Invitation
        </span>
        
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">You're Invited</h1>
        <p className="text-slate-400 text-sm">You have been invited to perform at this event.</p>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Glow behind card */}
        <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-3xl" />
        
        <div className="relative bg-[#120a28]/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl">
          
          {/* Presenter Info */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1">
              Presented By
            </p>
            <p className="text-sm font-semibold text-white">
              {eventData?.organizerName || "Event Organizer"}
            </p>
          </div>

          <div className="text-center mb-8">
            <p className="text-[10px] text-pink-400 font-bold tracking-widest uppercase mb-2">
              You are invited to perform at
            </p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {eventData?.name || "The Event"}
            </h2>
          </div>

          {/* Divider */}
          <div className="border-t border-purple-500/20 border-dashed w-full mb-6 relative">
             <div className="absolute -left-10 -top-2 w-4 h-4 rounded-full bg-[#0a0618] border border-purple-500/20" />
             <div className="absolute -right-10 -top-2 w-4 h-4 rounded-full bg-[#0a0618] border border-purple-500/20" />
          </div>

          {/* Details Row */}
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date
              </p>
              <p className="text-xs font-semibold text-white">
                {eventData?.startDate ? formatDateSimple(eventData.startDate) : "TBD"}
                {eventData?.endDate && eventData.endDate !== eventData.startDate ? ` - ${formatDateSimple(eventData.endDate)}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1.5 flex items-center justify-end gap-1.5">
                <User className="w-3 h-3" /> Host
              </p>
              <p className="text-xs font-semibold text-white">
                {eventData?.organizerName || "TBD"}
              </p>
            </div>
          </div>

          {/* Login Email hint */}
          {artistData?.email && (
            <div className="relative mb-6 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10" />
              <div className="relative flex items-center gap-3 px-4 py-3 border border-purple-500/25 rounded-xl">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mb-0.5">
                    This invite was sent to
                  </p>
                  <p className="text-sm font-mono font-semibold text-purple-200 truncate">
                    {(() => {
                      const [local, domain] = artistData.email.split("@");
                      const start = local.slice(0, 4);
                      const end = local.slice(-2);
                      const dots = "*".repeat(Math.max(local.length - 6, 2));
                      return `${start}${dots}${end}@${domain}`;
                    })()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sign in with this email to accept & get started</p>
                </div>
              </div>
            </div>
          )}

          {/* Message Block */}
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-5 mb-6">
            <p className="text-[10px] text-pink-400 font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> A message from the organizer
            </p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
              {inviteMessage}
            </p>
          </div>

          {/* Required Steps */}
          {modules.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-3">
                Required Steps
              </p>
              <div className="flex flex-wrap gap-2">
                {modules.map(mod => (
                  <div key={mod} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-3 py-1.5">
                    <span className="text-slate-400">{getModuleIcon(mod)}</span>
                    <span className="text-xs font-medium text-slate-200 capitalize">{getModuleLabel(mod)}</span>
                  </div>
                ))}
              </div>
              {eventData?.requireContractFirst && modules.includes("contract") && (
                <p className="text-[10px] text-slate-500 mt-2">
                  (Agreement is signed first — other steps unlock right after)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons underneath card */}
        <div className="mt-6 flex flex-col gap-3 relative z-10 w-full px-2">
          {notForMe ? (
            <>
              <div className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center">
                <p className="text-sm font-bold text-red-400 mb-1">This invite is not for you</p>
                <p className="text-xs text-red-300/70">This link was created for a specific artist. Please sign in with the correct account or use the invite link sent to your email.</p>
              </div>
              {loggedInArtistId && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-purple-500/25"
                  onClick={() => router.push(`/famelink/${loggedInArtistId}`)}
                >
                  Back to Dashboard
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full bg-transparent border-white/10 hover:bg-white/5 text-slate-300 rounded-xl h-12 text-sm font-semibold"
                onClick={() => {
                  window.location.href = `/famelink-auth?redirect=${encodeURIComponent(window.location.href)}`;
                }}
              >
                Sign in with correct account
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm font-semibold text-white mb-2">Will you accept this invitation?</p>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-purple-500/25"
                onClick={() => handleAction("accept")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "accept" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Accept Invitation
              </Button>
              <Button
                variant="outline"
                className="w-full bg-transparent border-white/10 hover:bg-white/5 text-slate-300 rounded-xl h-12 text-sm font-semibold"
                onClick={() => handleAction("decline")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "decline" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Decline Invitation
              </Button>
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-500 text-center mt-6">
          Magic link access. <span className="underline cursor-pointer">Sign in</span> to save progress across events.
        </p>
      </div>

      <div className="mt-12 relative z-10">
        <FantasiaFooter />
      </div>
    </div>
  );
}
