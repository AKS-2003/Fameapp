"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, HelpCircle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Question {
	id: string; eventId: string; text: string; type: string; required: boolean; options?: string[]; order: number;
}

const QUESTION_TYPES = ["Text", "Yes / No", "Number", "Multiple Choice"];

export default function CustomQuestionsTab({ eventId }: { eventId: string }) {
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// New question form state
	const [newText, setNewText] = useState("");
	const [newType, setNewType] = useState("Text");
	const [newRequired, setNewRequired] = useState(true);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/custom-questions`);
			const data = await res.json();
			if (data.success) setQuestions(data.data.questions || []);
		} catch { setError("Failed to load questions"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const handleAdd = async () => {
		if (!newText.trim()) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/events/${eventId}/custom-questions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: newText, type: newType, required: newRequired }),
			});
			const data = await res.json();
			if (data.success) {
				setNewText("");
				load();
			} else alert(data.error || "Failed to add question");
		} catch { alert("Error adding question"); }
		finally { setSaving(false); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this question?")) return;
		await fetch(`/api/events/${eventId}/custom-questions/${id}`, { method: "DELETE" });
		load();
	};

	return (
		<div className="p-6">
			<div className="mb-4">
				<p className="text-sm text-slate-500">Configure the custom logistics questions that artists will answer after their agreement is approved.</p>
			</div>

			{/* New Question Box */}
			<div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-end gap-6">
					<div className="flex-1 min-w-[300px]">
						<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">New Question</label>
						<input
							value={newText}
							onChange={e => setNewText(e.target.value)}
							placeholder="Type your question here..."
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
						/>
					</div>
					<div className="w-[180px]">
						<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Type</label>
						<select
							value={newType}
							onChange={e => setNewType(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
						>
							{QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
						</select>
					</div>
					<div className="flex flex-col items-center gap-2 mb-1.5">
						<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Required</span>
						<Switch checked={newRequired} onCheckedChange={setNewRequired} />
					</div>
					<Button 
						onClick={handleAdd} 
						disabled={saving || !newText.trim()}
						className="rounded-xl bg-fuchsia-600 px-6 py-5 text-white hover:bg-fuchsia-700 h-auto"
					>
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />} Add
					</Button>
				</div>
			</div>

			{/* Questions List */}
			<div className="space-y-3">
				{loading ? (
					<div className="flex min-h-[100px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" /></div>
				) : questions.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
						<HelpCircle className="mx-auto mb-3 h-10 w-10 text-slate-200" />
						<p className="text-sm text-slate-400">No custom questions added yet.</p>
					</div>
				) : (
					questions.map((q, idx) => (
						<div key={q.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm group hover:border-fuchsia-100 transition-colors">
							<span className="text-xs font-bold text-slate-300 w-6">#{idx + 1}</span>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-slate-700 truncate">{q.text}</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
									{q.type}
								</span>
								{q.required && (
									<span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-500 uppercase">
										Required
									</span>
								)}
								<button 
									onClick={() => handleDelete(q.id)}
									className="ml-2 rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
