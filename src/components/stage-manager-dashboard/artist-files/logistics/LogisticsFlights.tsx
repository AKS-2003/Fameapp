import React, { useState, useRef } from "react";
import { 
  Plane, 
  Check, 
  MessageSquare,
  Send,
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  X,
  Upload,
  Calendar,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Artist } from "../types";

interface LogisticsFlightsProps {
  artist: Artist;
  eventId: string;
  selectedShow?: any;
  onRefresh?: () => void;
}

interface FlightData {
  id: string;
  airline: string;
  flightNumber: string;
  status: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  baggage: string;
  pnr: string;
  notes: string;
  sentToArtist?: boolean;
  screenshotUrl?: string;
  documentName?: string;
}

function formatFlightDate(dStr: string) {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dStr;
  }
}

function openBase64InNewTab(base64DataUrl: string) {
  try {
    const parts = base64DataUrl.split(",");
    if (parts.length < 2) {
      window.open(base64DataUrl, "_blank");
      return;
    }
    const contentType = parts[0].split(";")[0].split(":")[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  } catch (err) {
    console.error("Error opening document:", err);
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`<iframe src="${base64DataUrl}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
      newTab.document.close();
    }
  }
}

const sanitizeFlightsForSave = (
  flightsList: any[],
  activeEditingId?: string | null,
  isNewUploaded?: boolean
) => {
  return flightsList.map((f: any) => {
    const isBeingEdited = activeEditingId && f.id === activeEditingId;
    if (isBeingEdited && isNewUploaded) {
      return f;
    }
    // Omit screenshotUrl if it is a heavy base64 string to avoid network/DB overload.
    // The backend will automatically restore the existing screenshotUrl from the database.
    if (f.screenshotUrl && f.screenshotUrl.startsWith("data:")) {
      const { screenshotUrl, ...rest } = f;
      return rest;
    }
    return f;
  });
};

export function LogisticsFlights({ artist, eventId, onRefresh }: LogisticsFlightsProps) {
  const flights = artist.logistics?.flights || [];

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [isNewFileUploaded, setIsNewFileUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form Fields
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [baggage, setBaggage] = useState("23");
  const [pnr, setPnr] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAirline("");
    setFlightNumber("");
    setFrom("");
    setTo("");
    setDeparture("");
    setArrival("");
    setBaggage("23");
    setPnr("");
    setNotes("");
    setDocumentUrl("");
    setDocumentName("");
    setEditingFlightId(null);
    setIsNewFileUploaded(false);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDocumentName(file.name);
    setIsNewFileUploaded(true);
    
    // Create temporary local object URL to display preview
    const objectUrl = URL.createObjectURL(file);
    setDocumentUrl(objectUrl);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const toLocalDatetimeLocal = (dStr: string): string => {
    if (!dStr) return "";
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const handleOpenEdit = (flight: FlightData | any) => {
    setAirline(flight.airline || "");
    setFlightNumber(flight.flightNumber || "");
    setFrom(flight.from || "");
    setTo(flight.to || "");
    setDeparture(toLocalDatetimeLocal(flight.departure));
    setArrival(toLocalDatetimeLocal(flight.arrival));
    setBaggage((flight.baggage || "23").replace(/kg$/i, "").trim());
    setPnr(flight.pnr || "");
    setNotes(flight.notes || "");
    setDocumentUrl(flight.screenshotUrl || "");
    setDocumentName(flight.documentName || "");
    setEditingFlightId(flight.id);
    setIsNewFileUploaded(false);
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airline.trim() || !flightNumber.trim() || isSaving) return;
    setIsSaving(true);

    let formattedBaggage = baggage.trim();
    if (!formattedBaggage) {
      formattedBaggage = "23kg";
    } else if (/^\d+$/.test(formattedBaggage)) {
      formattedBaggage = `${formattedBaggage}kg`;
    }

    try {
      let finalDocUrl = documentUrl;

      // Upload file to server first if a new one was uploaded
      if (isNewFileUploaded && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            finalDocUrl = uploadData.url;
          } else {
            console.error("Upload error details:", uploadData.error);
          }
        } else {
          console.error("Network upload error");
        }
      }

      let updatedFlights: FlightData[] = [];

      if (editingFlightId) {
        // Edit Mode
        updatedFlights = flights.map((f: any) => {
          if (f.id === editingFlightId) {
            return {
              ...f,
              airline,
              flightNumber,
              from,
              to,
              departure: departure ? new Date(departure).toISOString() : "",
              arrival: arrival ? new Date(arrival).toISOString() : "",
              baggage: formattedBaggage,
              pnr,
              notes,
              screenshotUrl: finalDocUrl,
              documentName: documentName,
            };
          }
          return f;
        });
      } else {
        // Add Mode
        const newFlight: FlightData = {
          id: `flight-${Date.now()}`,
          airline,
          flightNumber,
          from,
          to,
          departure: departure ? new Date(departure).toISOString() : "",
          arrival: arrival ? new Date(arrival).toISOString() : "",
          baggage: formattedBaggage,
          pnr,
          notes,
          screenshotUrl: finalDocUrl,
          documentName: documentName,
          status: "Draft",
          sentToArtist: false,
        };
        updatedFlights = [...flights, newFlight];
      }

      // Sanitize flights list to strip unchanged base64 files
      const sanitizedFlights = sanitizeFlightsForSave(updatedFlights, editingFlightId, isNewFileUploaded);

      // Save to database
      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          travelLogistics: {
            ...(artist.logistics as any),
            flights: sanitizedFlights,
          },
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        resetForm();
        if (onRefresh) onRefresh();
      } else {
        console.error("Failed to save flight details");
      }
    } catch (err) {
      console.error("Error saving flight:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFlight = async (flightId: string) => {
    if (!confirm("Are you sure you want to delete this flight booking?")) return;

    try {
      const updatedFlights = flights.filter((f: any) => f.id !== flightId);
      
      // Sanitize flights list
      const sanitizedFlights = sanitizeFlightsForSave(updatedFlights);

      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          travelLogistics: {
            ...(artist.logistics as any),
            flights: sanitizedFlights,
          },
        }),
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error deleting flight:", err);
    }
  };

  const handleSendToArtist = async (flightId: string) => {
    setSendingId(flightId);
    try {
      // Toggle sentToArtist ONLY for the selected flight
      const updatedFlights = flights.map((f: any) => 
        f.id === flightId ? { ...f, sentToArtist: true } : f
      );
      
      // Sanitize flights list to strip unchanged base64 files
      const sanitizedFlights = sanitizeFlightsForSave(updatedFlights);

      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          travelLogistics: {
            ...(artist.logistics as any),
            flights: sanitizedFlights,
          },
        }),
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error sending flight to artist:", err);
    } finally {
      setSendingId(null);
    }
  };

  const handleWithdrawFromArtist = async (flightId: string) => {
    setWithdrawingId(flightId);
    try {
      // Toggle sentToArtist ONLY for the selected flight
      const updatedFlights = flights.map((f: any) => 
        f.id === flightId ? { ...f, sentToArtist: false } : f
      );
      
      // Sanitize flights list to strip unchanged base64 files
      const sanitizedFlights = sanitizeFlightsForSave(updatedFlights);

      const res = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          travelLogistics: {
            ...(artist.logistics as any),
            flights: sanitizedFlights,
          },
        }),
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error withdrawing flight from artist:", err);
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-end">
        <Button 
          onClick={handleOpenAdd}
          className="h-9 rounded-xl bg-fuchsia-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-fuchsia-700 gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Flight
        </Button>
      </div>

      {(flights.length === 0) ? (
        <div className="flex h-24 items-center justify-center rounded-[16px] border border-slate-100 bg-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight: any) => {
            const isDraft = !flight.sentToArtist;
            return (
              <div key={flight.id} className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-900">{flight.airline} {flight.flightNumber}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDraft && (
                      <Badge className="bg-red-50 text-red-600 border border-red-100 shadow-none rounded-full px-3 py-1 font-bold text-[10px]">
                        Not yet sent to artist
                      </Badge>
                    )}
                    <Badge className={cn(
                      "shadow-none rounded-full px-3 py-1 font-bold text-[10px] border",
                      flight.status === "Confirmed" 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-slate-50 text-slate-600 border-slate-100"
                    )}>
                      {isDraft ? "Draft" : (flight.status || "Sent")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">From</p>
                    <p className="text-sm font-bold text-slate-900">{flight.from || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">To</p>
                    <p className="text-sm font-bold text-slate-900">{flight.to || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">Departure</p>
                    <p className="text-sm font-bold text-slate-900">{formatFlightDate(flight.departure)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">Arrival</p>
                    <p className="text-sm font-bold text-slate-900">{formatFlightDate(flight.arrival)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">Baggage</p>
                    <p className="text-sm font-bold text-slate-900">{flight.baggage || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 mb-1">PNR</p>
                    <p className="text-sm font-bold text-slate-900">{flight.pnr || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-medium text-slate-400 mb-1">Notes</p>
                    <p className="text-sm font-bold text-slate-900">{flight.notes || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-2">
                  <Button 
                    onClick={() => handleOpenEdit(flight)}
                    variant="outline" 
                    className="h-10 rounded-xl border-slate-200 text-slate-600 font-bold px-5 hover:bg-slate-50 gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                  {flight.screenshotUrl && (
                    <Button 
                      onClick={() => openBase64InNewTab(flight.screenshotUrl)}
                      variant="outline"
                      className="h-10 rounded-xl border-slate-200 text-slate-600 font-bold px-5 hover:bg-slate-50 gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Doc
                    </Button>
                  )}
                  {isDraft ? (
                    <Button 
                      onClick={() => handleSendToArtist(flight.id)}
                      disabled={sendingId !== null || withdrawingId !== null}
                      className="h-10 rounded-xl bg-fuchsia-600 text-white font-bold px-5 hover:bg-fuchsia-700 shadow-sm gap-2"
                    >
                      {sendingId === flight.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Send to Artist
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleWithdrawFromArtist(flight.id)}
                      disabled={sendingId !== null || withdrawingId !== null}
                      variant="outline"
                      className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-5 gap-2"
                    >
                      {withdrawingId === flight.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Withdrawing...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" /> Withdraw
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleDeleteFlight(flight.id)}
                    variant="ghost" 
                    className="h-10 rounded-xl text-red-500 hover:text-red-600 font-bold px-5 hover:bg-red-50 gap-2 ml-auto"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flight Add/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-50 pb-4 mb-4 flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingFlightId ? "Edit Flight" : "Add Flight"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Form to add or edit flight details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFlight} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Airline</label>
                <input 
                  type="text" 
                  value={airline} 
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="Lufthansa"
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Flight #</label>
                <input 
                  type="text" 
                  value={flightNumber} 
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="LH123"
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">From</label>
                <input 
                  type="text" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="MAD"
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">To</label>
                <input 
                  type="text" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="FRA"
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Departure</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    value={departure} 
                    onChange={(e) => setDeparture(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Arrival</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    value={arrival} 
                    onChange={(e) => setArrival(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Baggage</label>
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={baggage} 
                    onChange={(e) => setBaggage(e.target.value)}
                    placeholder="23"
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 pl-4 pr-10 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                  />
                  <span className="absolute right-4 text-sm font-bold text-slate-400 pointer-events-none select-none">
                    kg
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">PNR</label>
                <input 
                  type="text" 
                  value={pnr} 
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="PNR Number"
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-100 px-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes..."
                className="w-full h-24 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-fuchsia-500/10 placeholder:text-slate-300 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Screenshot or PDF (optional)</label>
              {documentUrl ? (
                <div className="flex items-center justify-between border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xl">📄</span>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                      {documentName || "Uploaded Document"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBase64InNewTab(documentUrl);
                      }}
                      variant="outline"
                      className="h-8 rounded-lg text-slate-600 font-bold px-3 hover:bg-slate-100 gap-1.5 text-xs border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Doc
                    </Button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumentUrl("");
                        setDocumentName("");
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Upload screenshot or PDF (booking confirmation, ticket...)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-50 pt-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="h-11 rounded-xl border-slate-200 text-slate-600 font-bold px-6 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSaving}
                className="h-11 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-6 shadow-sm shadow-fuchsia-100 gap-2 min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  editingFlightId ? "Save Changes" : "Add Flight"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
