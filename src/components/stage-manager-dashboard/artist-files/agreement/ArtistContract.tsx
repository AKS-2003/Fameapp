"use client";

import React from "react";
import { 
  FileText, 
  FileDown, 
  Edit2, 
  History, 
  CheckCircle2, 
  Clock, 
  Send, 
  Eye, 
  MousePointer2,
  Trash2,
  Plus,
  Upload,
  Calendar,
  X,
  Maximize,
  Minimize
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist } from "../types";
import { StageDiscussion } from "../StageDiscussion";
import { useToast } from "@/hooks/use-toast";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ArtistContractProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
  selectedShow?: any;
  allShows?: any[];
}

export function ArtistContract({ artist, eventId, onRefresh, selectedShow, allShows }: ArtistContractProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [viewDocument, setViewDocument] = React.useState<any>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const viewerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const buildFormData = (a: typeof artist) => ({
    performance: a.agreement?.performance || "",
    proposedFee: a.agreement?.proposedFee || "",
    bookingTerms: a.agreement?.bookingTerms || "",
    deliverables: a.agreement?.deliverables || "",
    description: a.agreement?.contractDetails?.description || "",
    bookingTermsDetail: a.agreement?.contractDetails?.bookingTerms || "",
    deliverablesDetail: a.agreement?.contractDetails?.deliverables || "",
    responsibilities: a.agreement?.contractDetails?.responsibilities || "",
    specialClauses: a.agreement?.contractDetails?.specialClauses || "",
    cancellationTerms: a.agreement?.contractDetails?.cancellationTerms || "",
    exclusivity: a.agreement?.contractDetails?.exclusivity || "",
    notes: a.agreement?.contractDetails?.notes || "",
    clauses: a.agreement?.contractDetails?.clauses ? a.agreement.contractDetails.clauses : [
      { id: '1', title: "Booking Terms", content: "" },
      { id: '2', title: "Performance Deliverables", content: "" },
      { id: '3', title: "Responsibilities", content: "" },
      { id: '4', title: "Special Clauses", content: "" },
      { id: '5', title: "Cancellation Terms", content: "" },
      { id: '6', title: "Exclusivity", content: "" },
      { id: '7', title: "Notes", content: "" }
    ],
    documents: a.agreement?.contractDetails?.documents || [],
    realName: a.realName || "",
    city: a.city || "",
    country: a.country || "",
    arrivalDate: a.agreement?.arrivalDate || "",
    departureDate: a.agreement?.departureDate || ""
  });

  const [formData, setFormData] = React.useState(() => buildFormData(artist));

  // Re-sync formData when the artist prop is refreshed from the server
  React.useEffect(() => {
    setFormData(buildFormData(artist));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist.id, artist.agreement?.arrivalDate, artist.agreement?.departureDate]);

  const updateClause = (id: string, field: 'title' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      clauses: prev.clauses.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const removeClause = (id: string) => {
    setFormData(prev => ({
      ...prev,
      clauses: prev.clauses.filter(c => c.id !== id)
    }));
  };

  const addClause = () => {
    setFormData(prev => ({
      ...prev,
      clauses: [...prev.clauses, { id: Date.now().toString(), title: "Field / Question", content: "" }]
    }));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      
      try {
        const formDataPayload = new FormData();
        formDataPayload.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataPayload
        });
        
        const data = await res.json();
        
        if (data.success) {
          const newDoc = {
            id: Date.now().toString(),
            name: data.name,
            size: data.size,
            url: data.url
          };
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, newDoc]
          }));
          toast({ title: "Upload successful", description: "Document added to your list." });
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (err: any) {
        toast({ 
          title: "Upload Failed", 
          description: err.message || "Could not upload the document",
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
        // Reset file input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const removeDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Map back to DB field names
      const updates = {
        agreement: {
          ...artist.agreement,
          arrivalDate: formData.arrivalDate || formData.bookingTerms.replace("Available ", ""),
          departureDate: formData.departureDate,
          bookingTerms: formData.bookingTerms,
          deliverables: formData.deliverables,
          contractDetails: {
            ...artist.agreement?.contractDetails,
            description: formData.description,
            bookingTerms: formData.bookingTermsDetail,
            deliverables: formData.deliverablesDetail,
            responsibilities: formData.responsibilities,
            specialClauses: formData.specialClauses,
            cancellationTerms: formData.cancellationTerms,
            exclusivity: formData.exclusivity,
            notes: formData.notes,
            clauses: formData.clauses,
            documents: formData.documents
          }
        },
        legalName: formData.realName,
        city: formData.city,
        country: formData.country
      };

      const response = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          ...updates
        })
      });

      if (response.ok) {
        setIsEditing(false);
        toast({
          title: "Agreement Updated",
          description: "Artist agreement details have been saved.",
        });
        // Trigger partial refresh instead of full dashboard reload
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload(); 
        }
      } else {
        throw new Error("Failed to update agreement");
      }
    } catch (err) {
      console.error("Error saving agreement:", err);
      toast({
        title: "Update Failed",
        description: "Failed to save agreement details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const agreement = artist.agreement;

  if (!agreement) return null;

  return (
    <>
      <AccordionItem value="contract-details" className="border-none bg-white rounded-2xl shadow-sm mb-4 overflow-hidden ring-1 ring-slate-100">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <FileText className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Agreement Details</h2>
            <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">10</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">

        <div className="flex gap-6 items-start mt-2">
          {/* Agreement Details Form */}
          <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Agreement Details</h3>
            <div className="flex gap-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                    <CheckCircle2 className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditing(true)}
                  className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 px-4"
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Booking Dates */}
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Booking Dates</p>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <div className="w-full bg-white border border-pink-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <Calendar className="h-4 w-4 text-pink-500 shrink-0" />
                    <input
                      type="date"
                      value={formData.arrivalDate ? formData.arrivalDate.substring(0, 10) : ""}
                      onChange={e => setFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                      className="flex-1 text-sm font-medium text-slate-700 bg-transparent outline-none border-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
                  <div className="w-full bg-white border border-pink-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <Calendar className="h-4 w-4 text-pink-500 shrink-0" />
                    <input
                      type="date"
                      value={formData.departureDate ? formData.departureDate.substring(0, 10) : ""}
                      onChange={e => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                      className="flex-1 text-sm font-medium text-slate-700 bg-transparent outline-none border-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Prefer the editable arrivalDate/departureDate if set, otherwise fall back to show dates */}
                {formData.arrivalDate || formData.departureDate ? (
                  <>
                    {formData.arrivalDate && (
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-pink-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {new Date(formData.arrivalDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {formData.departureDate && (
                      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-pink-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {new Date(formData.departureDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </>
                ) : allShows && allShows.length > 0 ? (
                  allShows.map((show, idx) => {
                    const showDate = show.overrides?.performanceDate || show.overrides?.performance_date || show.performanceDate || show.performance_date || show.date || show.startDate || show.day || (artist as any).performance_date;
                    return (
                      <div key={idx} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-pink-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {showDate ? new Date(showDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "Date TBD"}
                          </span>
                        </div>
                        {show.startTime && show.endTime && (
                          <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                            {show.startTime} - {show.endTime}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{formData.bookingTerms || "Dates TBD"}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents</p>
              {isEditing && (
                <>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx"
                  />
                  <Button 
                    variant="outline" 
                    className="h-8 rounded-lg text-xs font-medium border-slate-200"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : <><Upload className="h-3.5 w-3.5 mr-2" /> Upload</>}
                  </Button>
                </>
              )}
            </div>
            {formData.documents.length > 0 ? (
              <div className="space-y-2">
                {formData.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">{doc.size}</span>
                      <button 
                        onClick={() => setViewDocument(doc)}
                        className="text-slate-400 hover:text-slate-600"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isEditing && (
                        <button 
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-400 hover:text-red-500"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 border-dashed rounded-xl p-6 text-slate-400">
                <FileDown className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">No documents uploaded</span>
              </div>
            )}
          </div>

          {/* Clauses & Questions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Clauses & Questions</p>
            
            {isEditing ? (
              <div className="space-y-4">
                {formData.clauses.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-[240px] shrink-0">
                      <input
                        value={item.title}
                        onChange={(e) => updateClause(item.id, 'title', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10"
                        placeholder="Field / Question"
                      />
                    </div>
                    <div className="flex-1 relative flex gap-3">
                      <textarea
                        value={item.content}
                        onChange={(e) => updateClause(item.id, 'content', e.target.value)}
                        rows={2}
                        className="w-full rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 resize-none"
                        placeholder="Enter details..."
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClause(item.id)}
                        className="h-10 w-10 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="ghost" 
                  onClick={addClause}
                  className="w-full h-12 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Clause / Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.clauses.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-[240px] shrink-0 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <span className="text-sm font-medium text-slate-700">{item.title}</span>
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{item.content || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {agreement.contractTimeline && agreement.contractTimeline.length > 0 && (
          <div className="w-[320px] space-y-6 shrink-0">
            {/* Agreement Timeline Card */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
              <h3 className="mb-6 text-lg font-bold text-slate-900">Agreement Timeline</h3>
              <div className="space-y-4">
                {agreement.contractTimeline.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{item.label}</span>
                    <span className="text-xs font-bold text-slate-900">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </AccordionContent>
      </AccordionItem>

      <Dialog open={!!viewDocument} onOpenChange={(open) => {
        if (!open) {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          setViewDocument(null);
        }
      }}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden bg-slate-900 border-none rounded-xl">
          <div ref={viewerRef} className="flex flex-col w-full h-full bg-slate-900">
            <DialogHeader className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex flex-row items-center justify-between shrink-0">
              <DialogTitle className="text-slate-100 font-medium truncate pr-4">{viewDocument?.name}</DialogTitle>
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleFullscreen} 
                  className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                    setViewDocument(null);
                  }} 
                  className="flex items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  title="Close Viewer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DialogHeader>
            <div className={cn("flex-1 bg-slate-950 flex items-center justify-center", isFullscreen ? "p-0" : "p-4")}>
              {viewDocument?.url ? (
                <iframe 
                  src={viewDocument.url} 
                  className={cn("w-full h-full bg-white", isFullscreen ? "rounded-none" : "rounded shadow-xl")} 
                  title={viewDocument.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                  <FileText className="h-12 w-12 opacity-50" />
                  <p>Preview not available for this saved document.</p>
                  <p className="text-xs text-center max-w-sm">This document was uploaded before the file storage feature was added. Newly uploaded documents will be previewable.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
