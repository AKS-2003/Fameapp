"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, MapPin, Phone, Mail, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomRate { type: string; currency: string; price: number; }
interface Hotel {
	id: string; eventId: string; name: string; address?: string;
	phone?: string; email?: string; mapsLink?: string; notes?: string;
	roomRates?: RoomRate[]; createdAt?: string;
}
const EMPTY_FORM = { name: "", address: "", phone: "", email: "", mapsLink: "", notes: "", roomRates: [{ type: "Single", currency: "€", price: 0 }] as RoomRate[] };
const RATE_TYPES = ["Single", "Double", "Twin", "Suite", "Family"];

export default function HotelsTab({ eventId }: { eventId: string }) {
	const [hotels, setHotels] = useState<Hotel[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({ ...EMPTY_FORM });

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/hotels`);
			const data = await res.json();
			if (data.success) setHotels(data.data.hotels || []);
			else setError(data.error || "Failed to load hotels");
		} catch { setError("Failed to load hotels"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditingId(null); setShowForm(true); setError(null); };
	const openEdit = (h: Hotel) => {
		setForm({ name: h.name, address: h.address || "", phone: h.phone || "", email: h.email || "", mapsLink: h.mapsLink || "", notes: h.notes || "", roomRates: h.roomRates?.length ? h.roomRates : [{ type: "Single", currency: "€", price: 0 }] });
		setEditingId(h.id); setShowForm(true); setError(null);
	};

	const handleSave = async () => {
		if (!form.name.trim()) { setError("Hotel name is required"); return; }
		setSaving(true); setError(null);
		try {
			const url = editingId ? `/api/events/${eventId}/hotels/${editingId}` : `/api/events/${eventId}/hotels`;
			const method = editingId ? "PUT" : "POST";
			const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
			const data = await res.json();
			if (!data.success) { setError(data.error || "Failed to save"); return; }
			setShowForm(false); setEditingId(null); load();
		} catch { setError("Failed to save hotel"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this hotel?")) return;
		await fetch(`/api/events/${eventId}/hotels/${id}`, { method: "DELETE" });
		load();
	};

	const addRate = () => setForm(f => ({ ...f, roomRates: [...f.roomRates, { type: "Double", currency: "€", price: 0 }] }));
	const removeRate = (i: number) => setForm(f => ({ ...f, roomRates: f.roomRates.filter((_, idx) => idx !== i) }));
	const updateRate = (i: number, field: keyof RoomRate, value: string | number) =>
		setForm(f => ({ ...f, roomRates: f.roomRates.map((r, idx) => idx === i ? { ...r, [field]: value } : r) }));

	return (
		<div className="p-6">
			{/* Sub-header */}
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm text-slate-500">Hotels available for artist accommodation</p>
				<Button onClick={openAdd} className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm">
					<Plus className="h-4 w-4 mr-1" /> Add Hotel
				</Button>
			</div>

			{/* Inline form */}
			{showForm && (
				<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					{error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NAME *</label>
							<input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Hotel name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">ADDRESS</label>
							<input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">PHONE</label>
							<input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+31 ..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">EMAIL</label>
							<input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="reservations@..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
						<div className="col-span-2">
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">GOOGLE MAPS LINK</label>
							<input value={form.mapsLink} onChange={e => setForm(f => ({ ...f, mapsLink: e.target.value }))} placeholder="https://maps.google.com/..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
						<div className="col-span-2">
							<div className="mb-2 flex items-center justify-between">
								<label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ROOM RATES (€/NIGHT)</label>
								<button type="button" onClick={addRate} className="flex items-center gap-1 text-xs text-fuchsia-600 hover:underline"><Plus className="h-3 w-3" /> Add Rate</button>
							</div>
							{form.roomRates.map((rate, i) => (
								<div key={i} className="mb-2 flex items-center gap-2">
									<select value={rate.type} onChange={e => updateRate(i, "type", e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400">
										{RATE_TYPES.map(t => <option key={t}>{t}</option>)}
									</select>
									<span className="text-slate-400">€</span>
									<input type="number" min="0" value={rate.price} onChange={e => updateRate(i, "price", Number(e.target.value))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
									<span className="text-xs text-slate-400">/night</span>
									{form.roomRates.length > 1 && <button type="button" onClick={() => removeRate(i)} className="text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>}
								</div>
							))}
						</div>
						<div className="col-span-2">
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NOTES</label>
							<textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Internal notes..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
						</div>
					</div>
					<div className="mt-4 flex justify-end gap-2">
						<Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setShowForm(false); setEditingId(null); }}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
						<Button size="sm" className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700" onClick={handleSave} disabled={saving}>
							{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
						</Button>
					</div>
				</div>
			)}

			{/* List */}
			{loading ? (
				<div className="flex min-h-[200px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-fuchsia-600" /></div>
			) : hotels.length === 0 && !showForm ? (
				<div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center p-8">
					<p className="font-medium text-slate-500">No hotels added yet</p>
					<p className="mt-1 text-sm text-slate-400">Click "Add Hotel" to add accommodation options for artists.</p>
				</div>
			) : (
				<div className="space-y-3">
					{hotels.map(hotel => (
						<div key={hotel.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex items-start justify-between">
								<div className="flex-1 min-w-0">
									<h3 className="text-base font-bold text-slate-800">{hotel.name}</h3>
									<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
										{hotel.address && <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{hotel.address}</span>}
										{hotel.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{hotel.phone}</span>}
										{hotel.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{hotel.email}</span>}
									</div>
									{hotel.notes && <p className="mt-1 text-xs italic text-slate-400">{hotel.notes}</p>}
									{hotel.roomRates && hotel.roomRates.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-2">
											{hotel.roomRates.map((r, i) => (
												<span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
													{r.type}: <strong>{r.currency || "€"}{r.price}</strong>/Night
												</span>
											))}
										</div>
									)}
								</div>
								<div className="ml-4 flex items-center gap-2 shrink-0">
									<button onClick={() => openEdit(hotel)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"><Pencil className="h-4 w-4" /></button>
									<button onClick={() => handleDelete(hotel.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 className="h-4 w-4" /></button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
