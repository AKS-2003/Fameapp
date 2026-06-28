"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeadlineRule {
	days: number;
	bannerMessage: string;
}

const PRESET_DAYS = [1, 2, 3, 5, 7, 14];
const DEFAULT_RULE: DeadlineRule = {
	days: 1,
	bannerMessage: "Please complete your logistics information within the deadline.",
};

export default function DeadlineRulesTab({ eventId }: { eventId: string }) {
	const [rule, setRule] = useState<DeadlineRule>(DEFAULT_RULE);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/data?key=logistics_deadline_rule`);
			const data = await res.json();
			if (data.success && data.data.value) {
				setRule(data.data.value);
			}
		} catch {
			setError("Failed to load deadline rules");
		} finally {
			setLoading(false);
		}
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const handleSave = async () => {
		setSaving(true);
		try {
			const res = await fetch(`/api/events/${eventId}/data`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: "logistics_deadline_rule", value: rule }),
			});
			const data = await res.json();
			if (!data.success) alert(data.error?.message || "Failed to save rule");
		} catch {
			alert("Error saving rule");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-4">
				<p className="text-sm text-slate-500">Set the default deadline rule for artists after their agreement is approved.</p>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
				{/* Section Title */}
				<div className="flex items-center gap-3 mb-8">
					<div className="bg-fuchsia-50 p-2 rounded-xl">
						<Clock className="h-6 w-6 text-fuchsia-600" />
					</div>
					<h3 className="text-lg font-bold text-slate-800">Deadline After Agreement Approval</h3>
				</div>

				{/* Presets */}
				<div className="mb-8">
					<label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">DAYS TO COMPLETE LOGISTICS</label>
					<div className="flex flex-wrap gap-2">
						{PRESET_DAYS.map(d => (
							<button
								key={d}
								onClick={() => setRule(p => ({ ...p, days: d }))}
								className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
									rule.days === d
										? "bg-fuchsia-600 border-fuchsia-600 text-white shadow-md shadow-fuchsia-200"
										: "bg-white border-slate-200 text-slate-600 hover:border-fuchsia-400"
								}`}
							>
								{d} {d === 1 ? 'day' : 'days'}
							</button>
						))}
					</div>
				</div>

				{/* Custom Input */}
				<div className="mb-8">
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">CUSTOM DAYS</label>
					<input
						type="number"
						min="1"
						value={rule.days}
						onChange={e => setRule(p => ({ ...p, days: Number(e.target.value) }))}
						className="w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
					/>
				</div>

				{/* Message */}
				<div className="mb-8">
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">DEADLINE BANNER MESSAGE</label>
					<textarea
						value={rule.bannerMessage}
						onChange={e => setRule(p => ({ ...p, bannerMessage: e.target.value }))}
						rows={3}
						className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
						placeholder="Please complete your logistics information within the deadline."
					/>
				</div>

				{/* Info Box */}
				<div className="mb-8 rounded-xl bg-slate-50 p-4 border border-slate-100">
					<p className="text-sm text-slate-600 leading-relaxed">
						<strong className="text-slate-800">How it works:</strong> Once an artist's agreement is approved, they will automatically receive a logistics request with a <strong className="text-fuchsia-600">{rule.days}-{rule.days === 1 ? 'day' : 'days'} deadline</strong> to complete their logistics info.
					</p>
				</div>

				{/* Action */}
				<div className="flex justify-end">
					<Button 
						onClick={handleSave} 
						disabled={saving}
						className="rounded-xl bg-fuchsia-600 px-8 py-6 text-white hover:bg-fuchsia-700 h-auto font-bold"
					>
						{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 mr-2" />} Save Deadline Rule
					</Button>
				</div>
			</div>
		</div>
	);
}
