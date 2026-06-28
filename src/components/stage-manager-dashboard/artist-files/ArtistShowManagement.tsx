"use client";

import React, { useState, useEffect } from "react";
import { Artist } from "./types";
import { CheckSquare, MessageSquare, Send, CircleCheck, CheckCircle, User, Music, Lightbulb, Palette, FileText, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ArtistShowManagementProps {
  artist: Artist;
  eventId: string;
  selectedShow?: any;
  allShows?: any[];
  selectedShowIndex?: number;
  onSelectShow?: (index: number) => void;
}

interface DiscussionMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  isMe: boolean;
}

export function ArtistShowManagement({ artist, eventId, selectedShow, allShows, selectedShowIndex, onSelectShow }: ArtistShowManagementProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (selectedShow) {
      setStatus(selectedShow.status || "pending");
    }
  }, [selectedShow]);

  const updateStatus = async (newStatus: string) => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/contracts/${eventId}/shows/${artist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, showId: selectedShow?.id })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(newStatus);
        toast({
          title: "Status Updated",
          description: `Show status set to ${newStatus}.`,
        });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Update Failed",
        description: "Failed to update show status.",
        variant: "destructive"
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || savingStatus) return;
    
    setSavingStatus(true);
    const messageText = newMessage.trim();

    try {
      // 1. Send to Backend
      const payloadMessage = {
        sender: "Stage Manager",
        message: messageText,
        isMe: true,
        status: "Sent",
        isShowManagement: true
      };

      const response = await fetch(`/api/contracts/${eventId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          message: payloadMessage
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send message to database");
      }

      // 2. Update local state
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          author: "Stage Manager",
          text: messageText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: true,
        },
      ]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send show management message:", err);
      toast({
        title: "Message Failed",
        description: "Failed to send discussion message.",
        variant: "destructive"
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto min-h-0 bg-slate-100">
      {/* ── Show Details Section ─────────────────────────── */}
      <div className="p-6 space-y-6">

        {/* Show Selector & Summary Card */}
        {allShows && allShows.length > 0 && (
          <div className="mb-6 space-y-6">
            {allShows.length > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Submitted Shows</span>
                <div className="flex gap-2">
                  {allShows.map((show, idx) => {
                    const isSelected = selectedShowIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => onSelectShow && onSelectShow(idx)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          isSelected 
                            ? "bg-[#d946ef] text-white shadow-md shadow-fuchsia-200" 
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
                        )}
                      >
                        Show {idx + 1} · {show.name || "Untitled Show"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Show Summary Card */}
            {allShows[selectedShowIndex || 0] && (() => {
              const show = allShows[selectedShowIndex || 0];
              const style = show.style || show.performanceType || "Performance";
              const duration = show.duration || show.musicTrack?.duration ? `${show.duration || show.musicTrack?.duration} min` : "";
              
              return (
                <div className="w-full rounded-[28px] border border-slate-100 bg-white p-8 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 mb-4">
                    <Music className="h-8 w-8 text-pink-500" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Show {(selectedShowIndex || 0) + 1} of {allShows.length}
                  </span>
                  <h2 className="text-3xl font-bold text-[#d946ef] mb-2">{show.name || "Untitled Show"}</h2>
                  {(style || duration) && (
                    <p className="text-sm font-medium text-slate-500">
                      {style}{style && duration ? " · " : ""}{duration}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {!selectedShow ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-100 bg-slate-50/30 p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CircleCheck className="h-6 w-6 text-slate-300" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Show Registration Found</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              The artist hasn't submitted their show registration for this event yet. Once they submit it, you'll see all details here.
            </p>
          </div>
        ) : (
          <div className="rounded-[28px] bg-transparent">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-4 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedShow.name || "Untitled Show"}</h3>
                <p className="text-xs text-slate-400 font-medium">Registration ID: {selectedShow.id}</p>
              </div>
              <Badge className={cn(
                "rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider",
                status === "confirmed" || status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              )}>
                {status}
              </Badge>
            </div>
            
            <Accordion type="multiple" defaultValue={["basic-info", "music-info", "technical-info", "gallery-info", "additional-info"]} className="w-full space-y-4">
              
              {/* ===== BASIC INFORMATION ===== */}
              <AccordionItem value="basic-info" className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-purple-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-full p-2">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-gray-900">Basic Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t border-purple-50">
                  <div className="space-y-6">
                    {/* Profile Image */}
                    <div className="mb-6 mt-4">
                      <Label className="text-base font-semibold mb-3 block">Profile Image</Label>
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        {selectedShow.profileImage ? (
                          <img src={`/api/media/${selectedShow.profileImage}`} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-green-400 shadow-lg" />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center border-4 border-gray-300 shadow-lg">
                            <User className="h-16 w-16 text-purple-400" />
                          </div>
                        )}
                        <div className="flex-1 w-full">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 opacity-70">
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-sm font-medium text-gray-700">
                                {selectedShow.profileImage ? "✓ Profile image uploaded" : "No profile image uploaded"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show Name & Real Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Artist/Stage Name *</Label>
                        <Input value={selectedShow.name || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Personal Name *</Label>
                        <Input value={selectedShow.realName || ""} disabled />
                      </div>
                    </div>
                    {/* Email & WhatsApp */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input value={selectedShow.email || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp Number *</Label>
                        <Input value={selectedShow.phone || ""} disabled />
                      </div>
                    </div>
                    {/* Managed By */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">Managed By</Label>
                      <Input value={selectedShow.managedBy || ""} disabled />
                    </div>
                    {/* Style & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Performance Style</Label>
                        <Input value={selectedShow.style || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Performance Type</Label>
                        <Input value={selectedShow.performanceType || ""} disabled className="capitalize" />
                      </div>
                    </div>
                    {/* Nationality Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Country Living In</Label>
                        <Input value={selectedShow.countryLiving || ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Home Country</Label>
                        <Input value={selectedShow.homeCountry || ""} disabled />
                      </div>
                    </div>
                    
                    {/* Group Members */}
                    {selectedShow.members && selectedShow.members.length > 0 && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <Label className="text-base font-semibold text-blue-800">Group Members</Label>
                        {selectedShow.members.map((m: any, i: number) => (
                          <div key={i} className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
                            <span className="text-sm font-medium text-gray-700">Member {i + 1}</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={m.name || ""} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Country Living In</Label>
                                <Input value={m.countryLiving || ""} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Home Country</Label>
                                <Input value={m.homeCountry || ""} disabled />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Artist Biography</Label>
                      <Textarea value={selectedShow.biography || ""} disabled rows={4} />
                    </div>
                    
                    {/* T-Shirt Sizes */}
                    {selectedShow.tshirtSizes && selectedShow.tshirtSizes.length > 0 && (
                      <div className="space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <Label className="text-base font-semibold text-green-800">T-Shirt Sizes</Label>
                        {selectedShow.tshirtSizes.map((t: any, i: number) => (
                          <div key={i} className="p-4 bg-white rounded-lg border border-green-200 space-y-3">
                            <span className="text-sm font-medium text-gray-700">Person {i + 1}</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={t.name || ""} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Size</Label>
                                <Input value={t.size || ""} disabled />
                              </div>
                              <div className="space-y-2">
                                <Label>Fit</Label>
                                <Input value={t.fit || ""} disabled className="capitalize" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ===== MUSIC INFORMATION ===== */}
              <AccordionItem value="music-info" className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-pink-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-100 rounded-full p-2">
                      <Music className="h-5 w-5 text-pink-600" />
                    </div>
                    <span className="text-gray-900">Music Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t border-pink-50">
                  <div className="space-y-6 pt-4">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Performance Track</Label>
                      <div className="border rounded-lg p-4 space-y-4 bg-white">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-blue-900">
                            <strong>Song Title:</strong> {selectedShow.name || "Your Stage Name"}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>What is the tempo of your show?</Label>
                            <Input value={selectedShow.musicTrack?.tempo || "0"} disabled className="text-center w-24" />
                          </div>
                          <div className="space-y-2">
                            <Label>Performance Duration (Minutes)</Label>
                            <Input value={selectedShow.duration || "0"} disabled className="text-center w-24" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes for the DJ</Label>
                          <Textarea value={selectedShow.musicTrack?.notes || ""} disabled rows={2} />
                        </div>
                        
                        {selectedShow.musicTrack?.file_url ? (
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-700" />
                              <p className="text-green-900 text-sm font-semibold">✓ Track Uploaded</p>
                            </div>
                            <AudioPlayer
                              track={{
                                song_title: selectedShow.name || "Artist Track",
                                duration: selectedShow.musicTrack.duration || 0,
                                notes: selectedShow.musicTrack.notes || "",
                                is_main_track: true,
                                tempo: selectedShow.musicTrack.tempo || "0",
                                file_url: selectedShow.musicTrack.file_url,
                                file_path: selectedShow.musicTrack.file_path,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center opacity-70">
                            <p className="text-gray-500 font-medium">No music track uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ===== TECHNICAL SHOW DIRECTOR INFORMATION ===== */}
              <AccordionItem value="technical-info" className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 rounded-full p-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                    </div>
                    <span className="text-gray-900">Technical Show Director Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t border-yellow-50">
                  <div className="space-y-6 pt-4">
                    {/* Costume Colors Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">Costume Colors</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Primary Costume Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.customCostumeColor || selectedShow.manualCostumeColor || selectedShow.costumeColor || "transparent" }}></div>
                            <Input value={selectedShow.customCostumeColor || selectedShow.manualCostumeColor || selectedShow.costumeColor || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary Costume Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.manualCostumeColorTwo || selectedShow.costumeColorTwo || "transparent" }}></div>
                            <Input value={selectedShow.manualCostumeColorTwo || selectedShow.costumeColorTwo || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Third Costume Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.manualCostumeColorThree || selectedShow.costumeColorThree || "transparent" }}></div>
                            <Input value={selectedShow.manualCostumeColorThree || selectedShow.costumeColorThree || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lighting Preferences Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        <h3 className="text-lg font-semibold">Lighting Preferences</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Primary Light Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.manualLightColor || selectedShow.lightColorSingle || "transparent" }}></div>
                            <Input value={selectedShow.manualLightColor || selectedShow.lightColorSingle || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary Light Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.manualLightColorTwo || selectedShow.lightColorTwo || "transparent" }}></div>
                            <Input value={selectedShow.manualLightColorTwo || selectedShow.lightColorTwo || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Third Light Color</Label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm" style={{ backgroundColor: selectedShow.manualLightColorThree || selectedShow.lightColorThree || "transparent" }}></div>
                            <Input value={selectedShow.manualLightColorThree || selectedShow.lightColorThree || "None"} disabled className="flex-1" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Special Lighting Requests</Label>
                        <Textarea value={selectedShow.lightRequests || ""} disabled rows={3} />
                      </div>
                    </div>
                    
                    {/* Stage Positioning */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold">Stage Positioning</h3>
                      <div className="space-y-2">
                        <Label>Props and Equipment Needed</Label>
                        <Textarea value={selectedShow.propsNeeded || selectedShow.equipment || selectedShow.techRider || ""} disabled rows={3} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Starting Position</Label>
                          <Input value={selectedShow.stagePositionStart || "None"} disabled className="capitalize" />
                        </div>
                        <div className="space-y-2">
                          <Label>Ending Position</Label>
                          <Input value={selectedShow.stagePositionEnd || "None"} disabled className="capitalize" />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ===== STAGE VISUAL MANAGER INFORMATION ===== */}
              <AccordionItem value="gallery-info" className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 rounded-full p-2">
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-gray-900">Stage Visual Manager Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t border-blue-50">
                  <div className="space-y-6 pt-4">
                    {/* Rehearsal Video */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">Rehearsal / Show Video</h3>
                      </div>
                      {selectedShow.rehearsalVideo ? (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">Rehearsal Video Uploaded</span>
                          </div>
                          <div className="bg-white rounded-lg p-2 max-w-2xl">
                            <VideoPlayer
                              file={{
                                name: selectedShow.rehearsalVideo.name,
                                type: "video",
                                url: selectedShow.rehearsalVideo.url,
                                file_path: selectedShow.rehearsalVideo.file_path,
                                size: selectedShow.rehearsalVideo.size,
                                contentType: selectedShow.rehearsalVideo.contentType,
                              }}
                              className="aspect-video max-h-64"
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{selectedShow.rehearsalVideo.name}</p>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 text-center opacity-70">
                          <p className="text-gray-500 font-semibold text-base">No Rehearsal Video Uploaded</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Performance Video/Demo Link */}
                    <div className="space-y-2">
                      <Label>Performance Video/Demo Link</Label>
                      <Input value={selectedShow.showLink || ""} disabled />
                    </div>
                    
                    {/* Social Media Links */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold">Social Media Links</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Instagram</Label>
                          <Input value={selectedShow.socialMedia?.instagram || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Facebook</Label>
                          <Input value={selectedShow.socialMedia?.facebook || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>TikTok</Label>
                          <Input value={selectedShow.socialMedia?.tiktok || ""} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>YouTube</Label>
                          <Input value={selectedShow.socialMedia?.youtube || ""} disabled />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Website</Label>
                          <Input value={selectedShow.socialMedia?.website || ""} disabled />
                        </div>
                      </div>
                    </div>
                    
                    {/* Gallery Upload */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold">Image & Video Gallery</h3>
                      {selectedShow.galleryFiles && selectedShow.galleryFiles.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {selectedShow.galleryFiles.map((file: any, index: number) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200">
                              {file.type === "image" ? (
                                <ImageViewer
                                  file={{
                                    name: file.name,
                                    type: "image",
                                    url: file.url,
                                    file_path: file.file_path,
                                    contentType: file.contentType,
                                  }}
                                  className="aspect-square"
                                />
                              ) : (
                                <VideoPlayer
                                  file={{
                                    name: file.name,
                                    type: "video",
                                    url: file.url,
                                    file_path: file.file_path,
                                    contentType: file.contentType,
                                  }}
                                  className="aspect-square"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center opacity-70">
                          <p className="text-gray-500 font-medium">No gallery files uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ===== ADDITIONAL INFORMATION ===== */}
              <AccordionItem value="additional-info" className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                <AccordionTrigger className="text-lg font-semibold px-6 py-4 hover:bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 rounded-full p-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-gray-900">Additional Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 border-t border-emerald-50">
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Stage Manager Notes</Label>
                      <Textarea value={selectedShow.stageManagerNotes || ""} disabled rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>MC Notes</Label>
                      <Textarea value={selectedShow.mcNotes || ""} disabled rows={3} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        )}
      </div>

      {/* ── Bottom section ────────────────────────────────────── */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-6 space-y-5 mt-auto">

        {/* Review Banner */}
        {selectedShow && (
          <div className="flex items-start gap-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
              <CheckSquare className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CircleCheck className="h-4 w-4" />
                  Review Status
                </span>
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Please review the technical details above. Approving will confirm the show for the event.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {selectedShow && (
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus("changes_requested")}
              disabled={savingStatus}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                status === "changes_requested"
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Request Changes
            </button>
            <button
              onClick={() => updateStatus("approved")}
              disabled={savingStatus}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                status === "approved" || status === "confirmed"
                  ? "bg-green-600 text-white shadow-lg shadow-green-200"
                  : "bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-lg shadow-fuchsia-200 hover:from-fuchsia-700 hover:to-pink-600"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <CircleCheck className="h-4 w-4" />
                {status === "approved" || status === "confirmed" ? "Approved ✓" : "Approve Show"}
              </span>
            </button>
          </div>
        )}

        {/* Status indicator */}
        {(status === "approved" || status === "confirmed" || status === "changes_requested") && (
          <div className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-medium text-center border",
            status === "approved" || status === "confirmed"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-orange-50 text-orange-700 border-orange-200"
          )}>
            {status === "approved" || status === "confirmed" ? "✓ Show has been approved and confirmed" : "⚠ Changes requested — awaiting artist updates"}
          </div>
        )}

        {/* Discussion area */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" />
            SHOW DISCUSSION
          </h3>

          <div className="min-h-[140px] rounded-2xl border border-slate-100 bg-white p-4">
            {messages.length === 0 ? (
              <div className="flex h-28 flex-col items-center justify-center text-slate-300">
                <MessageSquare className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Start a conversation about show management details.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.isMe
                        ? "bg-fuchsia-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`mt-1 text-[10px] ${msg.isMe ? "text-fuchsia-200" : "text-slate-400"}`}>
                        {msg.author} · {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <Button 
              size="icon" 
              onClick={() => sendMessage()}
              disabled={savingStatus || !newMessage.trim()}
              className="h-9 w-9 shrink-0 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 shadow-md shadow-fuchsia-200"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
