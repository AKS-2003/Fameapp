"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LogTag = "general" | "flight" | "hotel" | "transport" | "schedule";

const TAG_STYLES: Record<LogTag, { pill: string; active: string }> = {
  general:   { pill: "border-slate-200 text-slate-500 hover:bg-slate-50",   active: "bg-slate-800 text-white border-slate-800" },
  flight:    { pill: "border-pink-200 text-pink-500 hover:bg-pink-50",      active: "bg-pink-600 text-white border-pink-600" },
  hotel:     { pill: "border-indigo-200 text-indigo-500 hover:bg-indigo-50",active: "bg-indigo-600 text-white border-indigo-600" },
  transport: { pill: "border-teal-200 text-teal-500 hover:bg-teal-50",      active: "bg-teal-600 text-white border-teal-600" },
  schedule:  { pill: "border-orange-200 text-orange-500 hover:bg-orange-50",active: "bg-orange-500 text-white border-orange-500" },
};

const TAG_BADGE: Record<LogTag, string> = {
  general:   "bg-slate-100 text-slate-600",
  flight:    "bg-pink-50 text-pink-600",
  hotel:     "bg-indigo-50 text-indigo-600",
  transport: "bg-teal-50 text-teal-600",
  schedule:  "bg-orange-50 text-orange-600",
};

// Map each inner tab → auto-selected tag
const TAB_TAG_MAP: Record<string, LogTag> = {
  Overview:   "general",
  Intake:     "general",
  Travelers:  "general",
  Flights:    "flight",
  Hotel:      "hotel",
  Transport:  "transport",
  Food:       "general",
  "Event Info": "schedule",
};

interface Message {
  id?: string;
  sender: string;
  message: string;
  isMe: boolean;
  time: string;
  category?: LogTag;
}

interface LogisticsDiscussionProps {
  eventId: string;
  artistId: string;
  artistName: string;
  activeTab: string; // current inner logistics tab
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ts; }
}

export function LogisticsDiscussion({ eventId, artistId, artistName, activeTab }: LogisticsDiscussionProps) {
  const defaultTag = TAB_TAG_MAP[activeTab] ?? "general";
  const [activeTag, setActiveTag] = useState<LogTag>(defaultTag);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync tag when outer tab changes
  useEffect(() => {
    setActiveTag(TAB_TAG_MAP[activeTab] ?? "general");
  }, [activeTab]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load messages
  const loadMessages = useCallback(async (signal?: AbortSignal) => {
    if (
      !eventId || 
      !artistId || 
      typeof eventId !== "string" || 
      typeof artistId !== "string" || 
      eventId === "undefined" || 
      artistId === "undefined" ||
      eventId.includes("[object") ||
      artistId.includes("[object")
    ) {
      setLoading(false);
      return;
    }
    try {
      // Use /conversations which supports GET with ?artistId
      const res = await fetch(
        `/api/contracts/${eventId}/conversations?artistId=${artistId}`,
        { signal }
      );
      if (!res.ok) {
        // Non-2xx: skip silently (no messages yet is fine)
        setLoading(false);
        return;
      }
      const text = await res.text();
      if (!text) { setLoading(false); return; }
      const data = JSON.parse(text);
      if (data.success || Array.isArray(data.messages)) {
        const raw: any[] = data.messages || data.discussion || [];
        // Filter to only logistics-tagged messages
        const logisticsMessages = raw
          .filter((m: any) =>
            m.isLogistics ||
            m.category === "logistics" ||
            ["general", "flight", "hotel", "transport", "schedule"].includes(m.category)
          )
          .map((m: any, i: number) => ({
            id: m.id || `msg-${i}`,
            sender: m.sender || "Unknown",
            message: m.message || m.text || "",
            isMe: m.isMe || m.sender === "Organiser" || m.sender === "Stage Manager",
            time: formatTime(m.timestamp || m.time || m.createdAt || ""),
            category: (m.category as LogTag) || "general",
          }));
        setMessages(logisticsMessages);
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        return; // ignore clean unmount aborts
      }
      const isNetworkError = e instanceof TypeError || e?.message?.includes("fetch") || e?.message?.includes("Failed to fetch");
      if (isNetworkError) {
        console.warn("Logistics Discussion: Fetch interrupted or offline. Retrying on next load.");
      } else {
        console.error("Failed to load logistics discussion:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, artistId]);

  useEffect(() => {
    const controller = new AbortController();
    loadMessages(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadMessages]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender: "Organiser",
      message: text,
      isMe: true,
      time: "Just now",
      category: activeTag,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await fetch(`/api/contracts/${eventId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          message: {
            sender: "Organiser",
            message: text,
            isMe: true,
            status: "Sent",
            isLogistics: true,
            category: activeTag,
          },
        }),
      });
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  // Filtered messages for current tag (show general + current tag)
  const visibleMessages = messages.filter(m =>
    !m.category || m.category === "general" || m.category === activeTag
  );

  return (
    <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-900">Logistics Discussion</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Shared with the organiser. Action history is included below the messages.
        </span>
      </div>

      {/* Tag pills */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-50 flex-wrap">
        {(Object.keys(TAG_STYLES) as LogTag[]).map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all",
              activeTag === tag ? TAG_STYLES[tag].active : TAG_STYLES[tag].pill
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/30"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <p className="text-xs text-center text-slate-400 py-6">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          visibleMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] space-y-1`}>
                <div className={`flex items-center gap-2 ${msg.isMe ? "justify-end" : "justify-start"}`}>
                  {!msg.isMe && <span className="text-[11px] font-bold text-slate-700">{msg.sender}</span>}
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                  {msg.category && msg.category !== "general" && (
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase", TAG_BADGE[msg.category])}>
                      {msg.category}
                    </span>
                  )}
                  {msg.isMe && <span className="text-[11px] font-bold text-slate-700">You</span>}
                </div>
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.isMe
                    ? "bg-fuchsia-600 text-white rounded-br-md"
                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-md shadow-sm"
                )}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-50 bg-white">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={`Message — ${activeTag}`}
          className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-300 transition placeholder:text-slate-400"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="h-10 w-10 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
