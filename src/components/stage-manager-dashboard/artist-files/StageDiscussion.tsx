"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DiscussionMessage } from "./types";
import { WebSocketManager, createWebSocketManager } from "@/lib/websocket-manager";

interface StageDiscussionProps {
  messages: DiscussionMessage[];
  artistName: string;
  eventId: string;
  artistId: string;
  isContractChat?: boolean;
}

export function StageDiscussion({ messages: initialMessages, artistName, eventId, artistId, isContractChat }: StageDiscussionProps) {
  const [messages, setMessages] = useState<DiscussionMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocketManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement?.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      scrollToBottom();
      return;
    }
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    // Initialize WebSocket Manager
    const manager = createWebSocketManager({
      eventId,
      role: "stage_manager",
      userId: `sm_${eventId}`,
      showToasts: false
    });

    manager.initialize();
    wsRef.current = manager;

    // Listen for new stage discussion messages
    const handleNewMessage = (event: any) => {
      const data = event.detail;
      if (data.artistId === artistId) {
        setMessages(prev => {
          // Check if message already exists by ID
          if (data.id && prev.some(m => m.id === data.id)) return prev;
          
          // Fallback check by content and timestamp if ID is missing
          const isDuplicate = prev.some(m => 
            m.message === data.message && 
            m.sender === data.sender && 
            (Math.abs(new Date(m.time).getTime() - new Date(data.timestamp || data.time).getTime()) < 2000)
          );
          if (isDuplicate) return prev;

          return [...prev, {
            id: data.id,
            sender: data.sender,
            message: data.message,
            time: new Date(data.timestamp || data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: data.sender === "Organiser" || data.sender === "Stage Manager",
            status: data.status
          }];
        });
      }
    };

    window.addEventListener("new_stage_discussion_message", handleNewMessage);

    return () => {
      window.removeEventListener("new_stage_discussion_message", handleNewMessage);
      manager.destroy();
    };
  }, [eventId, artistId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    setSending(true);
    const messageText = inputValue.trim();
    
    try {
      const newMessage = {
        sender: "Organiser",
        message: messageText,
        isMe: true,
        status: "Sent",
        ...(isContractChat ? { isContract: true } : {})
      };

      const response = await fetch(`/api/contracts/${eventId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          message: newMessage
        })
      });

      if (response.ok) {
        setInputValue("");
        // No local update here - wait for WebSocket broadcast to avoid duplicates
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full">
      {isContractChat && (
        <p className="text-xs text-slate-500 font-medium mb-6">Shared with the artist. Use it for contract questions only.</p>
      )}

      <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-6">
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
              <div className="flex items-center gap-2 mb-2">
                {!msg.isMe && <span className="text-xs font-bold text-slate-900">{msg.sender}</span>}
                <span className="text-[10px] font-medium text-slate-400">{msg.time}</span>
                {msg.status && (
                  <Badge className={cn(
                    "hover:bg-opacity-100 shadow-none rounded-full px-2 py-0 text-[9px] font-bold",
                    msg.status === "Approved" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {msg.status === "Approved" ? <CheckCircle2 className="inline h-2 w-2 mr-1" /> : <Clock className="inline h-2 w-2 mr-1" />}
                    {msg.status.toUpperCase()}
                  </Badge>
                )}
                {msg.isContract && (
                  <Badge className="bg-fuchsia-100 text-fuchsia-600 hover:bg-fuchsia-100 shadow-none rounded-full px-2 py-0 text-[9px] font-bold">
                    CONTRACT
                  </Badge>
                )}
                {msg.isMe && <span className="text-xs font-bold text-slate-900">{msg.sender}</span>}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl p-4 text-sm font-medium shadow-sm",
                msg.isMe ? "bg-fuchsia-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-600 rounded-tl-none"
              )}>
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={`Message ${artistName.split(' ')[0]}...`}
          disabled={sending}
          className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 pl-6 pr-14 text-sm outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/10 font-medium disabled:opacity-50"
        />
        <Button 
          onClick={handleSendMessage}
          disabled={sending || !inputValue.trim()}
          size="icon" 
          className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 shadow-md shadow-fuchsia-200"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
