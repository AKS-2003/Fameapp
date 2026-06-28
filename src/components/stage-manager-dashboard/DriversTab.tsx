"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, Phone, Car, Users, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-input";

interface Driver {
	id: string; eventId: string; name: string;
	phone?: string; whatsapp?: string; vehicle?: string;
	capacity?: number; costPerTrip?: number; costPerPerson?: number; notes?: string;
}
const EMPTY = { name: "", phone: "", whatsapp: "", vehicle: "", capacity: "", costPerTrip: "", costPerPerson: "", notes: "" };

export default function DriversTab({ eventId }: { eventId: string }) {
	const [drivers, setDrivers] = useState<Driver[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({ ...EMPTY });

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/drivers`);
			const data = await res.json();
			if (data.success) setDrivers(data.data.drivers || []);
			else setError(data.error || "Failed to load drivers");
		} catch { setError("Failed to load drivers"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

	const openAdd = () => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(true); setError(null); };
	const openEdit = (d: Driver) => {
		setForm({
			name: d.name, phone: d.phone || "", whatsapp: d.whatsapp || "",
			vehicle: d.vehicle || "", capacity: d.capacity?.toString() || "",
			costPerTrip: d.costPerTrip?.toString() || "", costPerPerson: d.costPerPerson?.toString() || "",
			notes: d.notes || "",
		});
		setEditingId(d.id); setShowForm(true); setError(null);
	};

	const handleSave = async () => {
		if (!form.name.trim()) { setError("Driver name is required"); return; }
		setSaving(true); setError(null);
		try {
			const url = editingId ? `/api/events/${eventId}/drivers/${editingId}` : `/api/events/${eventId}/drivers`;
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, capacity: form.capacity || null, costPerTrip: form.costPerTrip || null, costPerPerson: form.costPerPerson || null }),
			});
			const data = await res.json();
			if (!data.success) { setError(data.error || "Failed to save"); return; }
			setShowForm(false); setEditingId(null); load();
		} catch { setError("Failed to save driver"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this driver?")) return;
		await fetch(`/api/events/${eventId}/drivers/${id}`, { method: "DELETE" });
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
				<p className="text-sm text-slate-500">Drivers available for artist transfers</p>
				<Button onClick={openAdd} className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm">
					<Plus className="h-4 w-4 mr-1" /> Add Driver
				</Button>
			</div>

			{/* Form */}
			{showForm && (
				<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					{error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
					<div className="grid grid-cols-2 gap-4">
						<Input label="NAME *"         field="name"          placeholder="Driver name" />
						<Input label="PHONE"          field="phone"         placeholder="+31 ..." />
						<Input label="WHATSAPP"       field="whatsapp"      placeholder="+31 ..." />
						<Input label="VEHICLE"        field="vehicle"       placeholder="Make, model, color" />
						<Input label="CAPACITY"       field="capacity"      placeholder="4" type="number" />
						<Input label="COST PER TRIP"  field="costPerTrip"   placeholder="€120" type="number" />
						<Input label="COST PER PERSON" field="costPerPerson" placeholder="€15" type="number" />
						<div />
						<div className="col-span-2">
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NOTES</label>
							<textarea
								value={form.notes}
								onChange={e => f("notes", e.target.value)}
								rows={3}
								placeholder="Availability, languages..."
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
			) : drivers.length === 0 && !showForm ? (
				<div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
					<Car className="mb-3 h-10 w-10 text-slate-200" />
					<p className="font-medium text-slate-500">No drivers added yet</p>
					<p className="mt-1 text-sm text-slate-400">Click "Add Driver" to add transfer drivers for artists.</p>
				</div>
			) : (
				<div className="space-y-3">
					{drivers.map(d => (
						<div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex items-start justify-between">
								<div className="flex-1 min-w-0">
									{/* Name + badges row */}
									<div className="flex flex-wrap items-center gap-2 mb-2">
										<h3 className="text-base font-bold text-slate-800">{d.name}</h3>
										{d.capacity && (
											<span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
												<Users className="h-3 w-3" /> {d.capacity} seats
											</span>
										)}
										{d.costPerTrip != null && (
											<span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700">
												€{d.costPerTrip}/trip
											</span>
										)}
										{d.costPerPerson != null && (
											<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
												€{d.costPerPerson}/person
											</span>
										)}
									</div>
									{/* Vehicle */}
									{d.vehicle && (
										<p className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
											<Car className="h-3.5 w-3.5 text-slate-400" />
											{d.vehicle}
										</p>
									)}
									{/* Phone */}
									{d.phone && (
										<p className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
											<Phone className="h-3.5 w-3.5 text-slate-400" />
											{d.phone}
										</p>
									)}
									{/* WhatsApp */}
									{d.whatsapp && (
										<p className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
											<WhatsAppLink phoneNumber={d.whatsapp} className="text-sm font-normal" />
										</p>
									)}
									{/* Notes */}
									{d.notes && (
										<p className="mt-1 text-xs italic text-slate-400">{d.notes}</p>
									)}
								</div>
								<div className="ml-4 flex items-center gap-2 shrink-0">
									<button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
										<Pencil className="h-4 w-4" />
									</button>
									<button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
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
