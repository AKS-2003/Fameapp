"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Note {
	id: string; eventId: string; text: string; createdAt: string;
}

export default function NotesTab({ eventId }: { eventId: string }) {
	const [notes, setNotes] = useState<Note[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [newText, setNewText] = useState("");

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/logistics-notes`);
			const data = await res.json();
			if (data.success) setNotes(data.data.notes || []);
		} catch { console.error("Failed to load notes"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const handleAdd = async () => {
		if (!newText.trim()) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/events/${eventId}/logistics-notes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: newText }),
			});
			const data = await res.json();
			if (data.success) {
				setNewText("");
				load();
			}
		} catch { alert("Error adding note"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this note?")) return;
		await fetch(`/api/events/${eventId}/logistics-notes/${id}`, { method: "DELETE" });
		load();
	};

	const formatDateTime = (iso: string) => {
		try {
			const d = new Date(iso);
			return d.toLocaleString('en-US', { 
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch { return iso; }
	};

	return (
		<div className="p-6">
			<div className="mb-4">
				<p className="text-sm text-slate-500">Internal notes for logistics planning. Only visible to the logistics team.</p>
			</div>

			{/* New Note Input */}
			<div className="mb-8 flex gap-3">
				<input
					value={newText}
					onChange={e => setNewText(e.target.value)}
					onKeyDown={e => e.key === 'Enter' && handleAdd()}
					placeholder="Add a new note..."
					className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
				/>
				<Button 
					onClick={handleAdd} 
					disabled={saving || !newText.trim()}
					className="rounded-xl bg-fuchsia-600 px-6 py-2.5 text-white hover:bg-fuchsia-700 h-auto font-medium"
				>
					{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1.5" /> Add</>}
				</Button>
			</div>

			{/* Notes List */}
			<div className="space-y-3">
				{loading ? (
					<div className="flex min-h-[100px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" /></div>
				) : notes.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
						<FileText className="mx-auto mb-3 h-10 w-10 text-slate-200" />
						<p className="text-sm text-slate-400">No internal notes yet.</p>
					</div>
				) : (
					notes.map((n) => (
						<div key={n.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm group hover:border-fuchsia-100 transition-colors">
							<div className="mt-0.5 bg-fuchsia-50 p-2 rounded-lg">
								<FileText className="h-4 w-4 text-fuchsia-600" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-slate-700 leading-relaxed">{n.text}</p>
								<p className="mt-1 text-[11px] text-slate-400 font-medium">{formatDateTime(n.createdAt)}</p>
							</div>
							<button 
								onClick={() => handleDelete(n.id)}
								className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))
				)}
			</div>
		</div>
	);
}
