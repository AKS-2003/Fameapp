"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, Utensils, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CateringOption {
	id: string; eventId: string; mealType: string; name: string;
	costPerPerson?: number; description?: string; notes?: string;
}

const EMPTY = { mealType: "Breakfast", name: "", costPerPerson: "", description: "", notes: "" };
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Custom"];

export default function CateringTab({ eventId }: { eventId: string }) {
	const [options, setOptions] = useState<CateringOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({ ...EMPTY });

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/catering`);
			const data = await res.json();
			if (data.success) setOptions(data.data.catering || []);
			else setError(data.error || "Failed to load catering");
		} catch { setError("Failed to load catering"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

	const openAdd = () => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(true); setError(null); };
	const openEdit = (o: CateringOption) => {
		setForm({
			mealType: o.mealType, name: o.name,
			costPerPerson: o.costPerPerson?.toString() || "",
			description: o.description || "", notes: o.notes || "",
		});
		setEditingId(o.id); setShowForm(true); setError(null);
	};

	const handleSave = async () => {
		if (!form.name.trim()) { setError("Name is required"); return; }
		setSaving(true); setError(null);
		try {
			const url = editingId ? `/api/events/${eventId}/catering/${editingId}` : `/api/events/${eventId}/catering`;
			const res = await fetch(url, {
				method: editingId ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, costPerPerson: form.costPerPerson ? Number(form.costPerPerson) : null }),
			});
			const data = await res.json();
			if (!data.success) { setError(data.error || "Failed to save"); return; }
			setShowForm(false); setEditingId(null); load();
		} catch { setError("Failed to save catering"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this catering option?")) return;
		await fetch(`/api/events/${eventId}/catering/${id}`, { method: "DELETE" });
		load();
	};

	const grouped = MEAL_TYPES.reduce((acc, type) => {
		const items = options.filter(o => o.mealType === type);
		if (items.length > 0) acc.push({ type, items });
		return acc;
	}, [] as { type: string, items: CateringOption[] }[]);

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm text-slate-500">Food & catering options for artist meals</p>
				<Button onClick={openAdd} className="rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 text-sm">
					<Plus className="h-4 w-4 mr-1" /> Add Option
				</Button>
			</div>

			{/* Form */}
			{showForm && (
				<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					{error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">MEAL TYPE *</label>
							<select
								value={form.mealType}
								onChange={e => f("mealType", e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
							>
								{MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NAME *</label>
							<input
								value={form.name}
								onChange={e => f("name", e.target.value)}
								placeholder="Menu name"
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
							/>
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">COST / PERSON (€)</label>
							<input
								type="number"
								value={form.costPerPerson}
								onChange={e => f("costPerPerson", e.target.value)}
								placeholder="15"
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
							/>
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">DESCRIPTION</label>
							<input
								value={form.description}
								onChange={e => f("description", e.target.value)}
								placeholder="Items included..."
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white"
							/>
						</div>
						<div className="col-span-2">
							<label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">NOTES</label>
							<textarea
								value={form.notes}
								onChange={e => f("notes", e.target.value)}
								rows={3}
								placeholder="Dietary options, allergens..."
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

			{/* List grouped by meal type */}
			{loading ? (
				<div className="flex min-h-[200px] items-center justify-center">
					<Loader2 className="h-7 w-7 animate-spin text-fuchsia-600" />
				</div>
			) : options.length === 0 && !showForm ? (
				<div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
					<Utensils className="mb-3 h-10 w-10 text-slate-200" />
					<p className="font-medium text-slate-500">No catering options added yet</p>
					<p className="mt-1 text-sm text-slate-400">Click "Add Option" to add food and catering menus.</p>
				</div>
			) : (
				<div className="space-y-8">
					{grouped.map(group => (
						<div key={group.type}>
							<h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-4">
								<Utensils className="h-3.5 w-3.5" /> {group.type}
							</h4>
							<div className="space-y-3">
								{group.items.map(o => (
									<div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
										<div className="flex items-start justify-between">
											<div className="flex-1 min-w-0">
												<div className="flex flex-wrap items-center gap-2 mb-1">
													<h3 className="text-base font-bold text-slate-800">{o.name}</h3>
													<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
														o.mealType === 'Breakfast' ? 'bg-amber-100 text-amber-700' :
														o.mealType === 'Lunch' ? 'bg-emerald-100 text-emerald-700' :
														o.mealType === 'Dinner' ? 'bg-violet-100 text-violet-700' :
														'bg-slate-100 text-slate-700'
													}`}>
														{o.mealType}
													</span>
													{o.costPerPerson != null && (
														<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
															€{o.costPerPerson}/person
														</span>
													)}
												</div>
												{o.description && <p className="text-sm text-slate-500">{o.description}</p>}
												{o.notes && <p className="mt-1 text-xs italic text-slate-400">{o.notes}</p>}
											</div>
											<div className="ml-4 flex items-center gap-2 shrink-0">
												<button onClick={() => openEdit(o)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
													<Pencil className="h-4 w-4" />
												</button>
												<button onClick={() => handleDelete(o.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
