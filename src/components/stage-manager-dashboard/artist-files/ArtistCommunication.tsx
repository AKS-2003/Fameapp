"use client";

import React, { useState } from "react";
import { Artist } from "./types";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtistCommunicationProps {
  artist: Artist;
  eventId: string;
  selectedShow?: any;
}

type MessageCategory = "contract" | "logistics" | "show" | "general";
type FilterTab = "All" | "Contract" | "Logistics" | "Show";

interface Message {
  id: string;
  author: string;
  role: string;
  category: MessageCategory;
  isInternal?: boolean;
  date: string;
  text: string;
}

const CATEGORY_STYLES: Record<MessageCategory, string> = {
  contract: "bg-blue-100 text-blue-700",
  logistics: "bg-amber-100 text-amber-700",
  show: "bg-green-100 text-green-700",
  general: "bg-slate-100 text-slate-600",
};

export function ArtistCommunication({ artist, eventId, selectedShow }: ArtistCommunicationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (artist.agreement?.stageDiscussion) {
      const realMessages = artist.agreement.stageDiscussion.map((msg: any) => {
        let category: MessageCategory = "general";
        if (msg.isContract) category = "contract";
        else if (msg.isShowManagement) category = "show";
        else if (msg.isLogistics) category = "logistics";

        return {
          id: msg.id || Math.random().toString(36).substring(7),
          author: msg.sender || "Unknown",
          role: msg.sender === "Organiser" || msg.sender === "Stage Manager" ? msg.sender : "Artist",
          category,
          date: msg.time || msg.timestamp || "",
          text: msg.message || "",
        };
      });
      setMessages(realMessages);
    }
  }, [artist.agreement?.stageDiscussion]);

  const filterTabs: FilterTab[] = ["All", "Contract", "Logistics", "Show"];

  const filteredMessages = messages.filter((msg) => {
    if (activeFilter === "All") return true;
    return msg.category === activeFilter.toLowerCase();
  });

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    
    const tagObj: any = {};
    if (activeFilter === "Contract") tagObj.isContract = true;
    else if (activeFilter === "Show") tagObj.isShowManagement = true;
    else if (activeFilter === "Logistics") tagObj.isLogistics = true;

    try {
      const payloadMessage = {
        sender: "Stage Manager",
        message: messageText,
        isMe: true,
        status: "Sent",
        ...tagObj
      };

      const response = await fetch(`/api/contracts/${eventId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          message: payloadMessage
        })
      });

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            author: "Stage Manager",
            role: "Stage Manager",
            category: activeFilter === "All" ? "general" : activeFilter.toLowerCase() as MessageCategory,
            date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: messageText,
          },
        ]);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Messages Panel ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-100">

        {/* Header + filter pills — exact match to screenshot */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3 shrink-0">
          <span className="text-base font-bold text-slate-900">Messages</span>

          {/* Pill group container */}
          <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  "rounded-full px-4 py-1 text-xs font-medium transition-all",
                  activeFilter === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Messages list — flat, separated by hairline dividers */}
        <div className="flex-1 overflow-y-auto bg-white divide-y divide-slate-100">
          {filteredMessages.map((msg) => (
            <div key={msg.id} className="px-5 py-4">
              {/* Author row */}
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{msg.author}</span>
                <span className="text-xs text-slate-400">{msg.role}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    CATEGORY_STYLES[msg.category]
                  )}
                >
                  {msg.category}
                </span>
                {msg.isInternal && (
                  <span className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500">
                    Internal
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">
                  {msg.date}
                </span>
              </div>

              {/* Message body — light grey rounded box */}
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 leading-relaxed">
                {msg.text}
              </div>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="flex h-40 items-center justify-center text-slate-300 text-sm">
              No messages yet
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-fuchsia-700 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Sidebar ─────────────────────────────────────────── */}
      <div className="w-64 shrink-0 overflow-y-auto bg-white p-5 space-y-6">
        {/* Context */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Context
          </p>
          <div className="space-y-3">
            {[
              { label: "Artist", value: artist.name },
              { label: "Event", value: "Summer Vibes Festival 2026" },
              { label: "Date", value: "2026-07-15" },
              { label: "Destination", value: artist.location || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-medium text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Current Status */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Current Status
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Contract", value: "artist-signed" },
              { label: "Schedule", value: "confirmed" },
              { label: "Payment", value: "artist-approved" },
              { label: "Logistics", value: "booking-in-progress" },
              { label: "Show", value: "under-review" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
