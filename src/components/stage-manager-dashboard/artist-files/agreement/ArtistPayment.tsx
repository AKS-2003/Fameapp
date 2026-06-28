"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Check, 
  Save, 
  Edit2, 
  Clock, 
  Send, 
  Eye, 
  X,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  Trash2,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Artist, Payment } from "../types";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface ArtistPaymentProps {
  artist: Artist;
  eventId: string;
  onRefresh?: () => void;
}

export function ArtistPayment({ artist, eventId, onRefresh }: ArtistPaymentProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentData, setPaymentData] = useState<Payment>(
    artist.agreement?.payment || {
      fieldsCompleted: "0/11",
      calculation: {
        performanceFee: "0",
        downpayment: "0",
        remainingBalance: "0",
        status: "In Progress",
      },
      details: {
        performanceFee: "",
        downpayment: "",
        downpaymentDate: "",
        balanceDueDate: "",
        amountPaid: "",
        paymentDate: "",
        paymentMethod: "Select method",
        paymentStatus: "Unpaid",
        notes: "",
      },
      customLines: [],
    }
  );

  useEffect(() => {
    if (artist.agreement?.payment) {
      setPaymentData({
        ...artist.agreement.payment,
        customLines: artist.agreement.payment.customLines || []
      });
    }
  }, [artist.agreement?.payment]);

  const parseVal = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const stripped = String(val).replace(/[^0-9.-]/g, '');
    return parseFloat(stripped) || 0;
  };

  const performanceFee = parseVal(paymentData.details.performanceFee);
  const downpayment = parseVal(paymentData.details.downpayment);
  const amountPaid = parseVal(paymentData.details.amountPaid);
  const remainingBalance = performanceFee - downpayment - amountPaid;

  const handleSave = async () => {
    setSaving(true);
    try {
      const fee = parseVal(paymentData.details.performanceFee);
      const down = parseVal(paymentData.details.downpayment);
      const paid = parseVal(paymentData.details.amountPaid);
      const remaining = fee - down - paid;

      // Count completed fields
      const detailFields = Object.values(paymentData.details).filter(v => v && v !== "Select method" && v !== "Unpaid").length;
      const fieldsCompleted = `${detailFields}/11`;

      const updatedPayment: Payment = {
        ...paymentData,
        fieldsCompleted,
        calculation: {
          performanceFee: fee.toString(),
          downpayment: down.toString(),
          remainingBalance: Math.max(0, remaining).toString(),
          status: paymentData.details.paymentStatus === "Fully Paid" ? "Completed" : "In Progress"
        }
      };

      const response = await fetch(`/api/contracts/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          agreement: {
            ...artist.agreement,
            payment: updatedPayment
          }
        })
      });

      if (response.ok) {
        setIsEditing(false);
        toast({
          title: "Payment Saved",
          description: "Payment calculations have been updated.",
        });
        if (onRefresh) onRefresh();
      } else {
        throw new Error("Failed to save payment");
      }
    } catch (err) {
      console.error("Error saving payment:", err);
      toast({
        title: "Save Failed",
        description: "Failed to save payment details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccordionItem value="payment" className="border-none bg-white rounded-2xl shadow-sm mb-4 overflow-hidden ring-1 ring-slate-100">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <CreditCard className="h-5 w-5 text-pink-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Payment</h2>
            <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none ml-2">{paymentData.fieldsCompleted}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">

        <div className="flex justify-end mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setIsEditing(true)} className="h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
        </div>

      {/* Main Payment Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Performance Fee (€)</p>
            <input 
              type="number"
              disabled={!isEditing}
              value={paymentData.details.performanceFee}
              onChange={(e) => setPaymentData({
                ...paymentData,
                details: { ...paymentData.details, performanceFee: e.target.value }
              })}
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Downpayment (€)</p>
            <input 
              type="number"
              disabled={!isEditing}
              value={paymentData.details.downpayment}
              onChange={(e) => setPaymentData({
                ...paymentData,
                details: { ...paymentData.details, downpayment: e.target.value }
              })}
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Downpayment Date</p>
            <div className="relative">
              <input 
                type="date"
                disabled={!isEditing}
                value={paymentData.details.downpaymentDate}
                onChange={(e) => setPaymentData({
                  ...paymentData,
                  details: { ...paymentData.details, downpaymentDate: e.target.value }
                })}
                className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Balance Due Date</p>
            <div className="relative">
              <input 
                type="date"
                disabled={!isEditing}
                value={paymentData.details.balanceDueDate}
                onChange={(e) => setPaymentData({
                  ...paymentData,
                  details: { ...paymentData.details, balanceDueDate: e.target.value }
                })}
                className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount Paid (€)</p>
            <input 
              type="number"
              disabled={!isEditing}
              value={paymentData.details.amountPaid}
              onChange={(e) => setPaymentData({
                ...paymentData,
                details: { ...paymentData.details, amountPaid: e.target.value }
              })}
              className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Date</p>
            <div className="relative">
              <input 
                type="date"
                disabled={!isEditing}
                value={paymentData.details.paymentDate}
                onChange={(e) => setPaymentData({
                  ...paymentData,
                  details: { ...paymentData.details, paymentDate: e.target.value }
                })}
                className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Method</p>
          <select 
            disabled={!isEditing}
            value={paymentData.details.paymentMethod}
            onChange={(e) => setPaymentData({
              ...paymentData,
              details: { ...paymentData.details, paymentMethod: e.target.value }
            })}
            className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100 appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.5 1.5L6 6L10.5 1.5\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
          >
            <option>Select method</option>
            <option>Bank Transfer</option>
            <option>PayPal</option>
            <option>Cash</option>
          </select>
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</p>
          <textarea 
            disabled={!isEditing}
            value={paymentData.details.notes}
            onChange={(e) => setPaymentData({
              ...paymentData,
              details: { ...paymentData.details, notes: e.target.value }
            })}
            rows={3}
            className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
          />
        </div>

        {/* Custom Payment Lines */}
        <div className="space-y-3 pt-2">
          {paymentData.customLines?.map((line) => (
            <div key={line.id} className="flex gap-3 items-start">
              <input 
                disabled={!isEditing}
                value={line.name}
                onChange={(e) => {
                  const newLines = paymentData.customLines?.map(l => l.id === line.id ? { ...l, name: e.target.value } : l);
                  setPaymentData({ ...paymentData, customLines: newLines });
                }}
                placeholder="Field name"
                className="w-[200px] shrink-0 h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
              />
              <div className="flex-1 flex gap-3">
                <input 
                  disabled={!isEditing}
                  value={line.value}
                  onChange={(e) => {
                    const newLines = paymentData.customLines?.map(l => l.id === line.id ? { ...l, value: e.target.value } : l);
                    setPaymentData({ ...paymentData, customLines: newLines });
                  }}
                  placeholder="Value"
                  className="flex-1 h-11 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-pink-500/10 disabled:bg-slate-50/50 disabled:border-slate-100"
                />
                {isEditing && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      const newLines = paymentData.customLines?.filter(l => l.id !== line.id);
                      setPaymentData({ ...paymentData, customLines: newLines });
                    }}
                    className="h-11 w-11 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button 
              variant="outline" 
              onClick={() => {
                const newLines = [...(paymentData.customLines || []), { id: Date.now().toString(), name: "", value: "" }];
                setPaymentData({ ...paymentData, customLines: newLines });
              }}
              className="w-full h-11 bg-slate-50 border border-dashed border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Payment Line / Question
            </Button>
          )}
        </div>
      </div>
      </AccordionContent>
      </AccordionItem>
    </>
  );
}
