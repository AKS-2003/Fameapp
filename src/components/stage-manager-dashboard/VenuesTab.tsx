"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, MapPin, Phone, Mail, Users, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Venue {
	id: string; eventId: string; name: string; address?: string;
	phone?: string; email?: string; capacity?: number; mapsLink?: string; notes?: string;
}
const EMPTY = { name: "", address: "", phone: "", email: "", capacity: "", mapsLink: "", notes: "" };

export default function VenuesTab({ eventId }: { eventId: string }) {
	const [venues, setVenues] = useState<Venue[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({ ...EMPTY });

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/venues`);
			const data = await res.json();
			if (data.success) setVenues(data.data.venues || []);
			else setError(data.error || "Failed to load venues");
		} catch { setError("Failed to load venues"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

	const openAdd = () => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(true); setError(null); };
	const openEdit = (v: Venue) => {
		setForm({
			name: v.name, address: v.address || "", phone: v.phone || "",
			email: v.email || "", capacity: v.capacity?.toString() || "",
			mapsLink: v.mapsLink || "", notes: v.notes || "",
		});
		setEditingId(v.id); setShowForm(true); setError(null);
	};

	const handleSave = async () => {
		if (!form.name.trim()) { setError("Venue name is required"); return; }
		setSaving(true); setError(null);
		try {
			const url = editingId ? `/api/events/${eventId}/venues/${editingId}` : `/api/events/${eventId}/venues`;
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, capacity: form.capacity ? Number(form.capacity) : null }),
			});
			const data = await res.json();
			if (!data.success) { setError(data.error || "Failed to save"); return; }
			setShowForm(false); setEditingId(null); load();
		} catch { setError("Failed to save venue"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this venue?")) return;
		await fetch(`/api/events/${eventId}/venues/${id}`, { method: "DELETE" });
		load();
	};

	const Input = ({ label, field, placeholder, type = "text" }: { label: string; field: string; placeholder?: string; type?: string }) => (
		<div>
			<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
			<input
				type={type}
				value={(form as any)[field]}
				onChange={e => f(field, e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
			/>
		</div>
	);

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm text-slate-500">Event venues for artist performances</p>
				<Button onClick={openAdd} className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm">
					<Plus className="h-4 w-4 mr-1" /> Add Venue
				</Button>
			</div>

			{/* Form */}
			{showForm && (
				<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					{error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
					<div className="grid grid-cols-2 gap-4">
						<Input label="NAME *"         field="name"          placeholder="Venue name" />
						<Input label="ADDRESS"        field="address"       placeholder="Full address" />
						<Input label="PHONE"          field="phone"         placeholder="+31 ..." />
						<Input label="EMAIL"          field="email"         placeholder="events@..." />
						<Input label="CAPACITY"       field="capacity"      placeholder="1500" type="number" />
						<Input label="GOOGLE MAPS LINK" field="mapsLink"    placeholder="https://maps.google.com/..." />
						<div className="col-span-2">
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NOTES</label>
							<textarea
								value={form.notes}
								onChange={e => f("notes", e.target.value)}
								rows={3}
								placeholder="Load-in details, parking..."
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
							/>
						</div>
					</div>
					<div className="mt-4 flex justify-end gap-2">
						<Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setShowForm(false); setEditingId(null); }}>
							<X className="h-3.5 w-3.5 mr-1" /> Cancel
						</Button>
						<Button size="sm" className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700" onClick={handleSave} disabled={saving}>
							{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
						</Button>
					</div>
				</div>
			)}

			{/* List */}
			{loading ? (
				<div className="flex min-h-[200px] items-center justify-center">
					<Loader2 className="h-7 w-7 animate-spin text-fuchsia-600" />
				</div>
			) : venues.length === 0 && !showForm ? (
				<div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
					<p className="font-medium text-slate-500">No venues added yet</p>
					<p className="mt-1 text-sm text-slate-400">Click "Add Venue" to add performance locations for artists.</p>
				</div>
			) : (
				<div className="space-y-3">
					{venues.map(v => (
						<div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex items-start justify-between">
								<div className="flex-1 min-w-0">
									<div className="flex flex-wrap items-center gap-2 mb-1">
										<h3 className="text-base font-bold text-slate-800">{v.name}</h3>
										{v.capacity && (
											<span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
												<Users className="h-3 w-3" /> {v.capacity} cap
											</span>
										)}
									</div>
									{v.address && <p className="flex items-center gap-1 text-xs text-slate-500 mb-1"><MapPin className="h-3 w-3" /> {v.address}</p>}
									<div className="flex flex-wrap gap-x-4 gap-y-1">
										{v.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {v.phone}</span>}
										{v.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" /> {v.email}</span>}
									</div>
									{v.notes && <p className="mt-1 text-xs italic text-slate-400">{v.notes}</p>}
								</div>
								<div className="ml-4 flex items-center gap-2 shrink-0">
									<button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
										<Pencil className="h-4 w-4" />
									</button>
									<button onClick={() => handleDelete(v.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
