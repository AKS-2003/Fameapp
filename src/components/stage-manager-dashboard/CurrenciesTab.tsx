"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Search, Star, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Currency {
	id: string; eventId: string; code: string; name: string; symbol: string; isDefault: boolean;
}

// Static list for searching
const ALL_CURRENCIES = [
	{ code: "EUR", name: "Euro", symbol: "€" },
	{ code: "USD", name: "US Dollar", symbol: "$" },
	{ code: "GBP", name: "British Pound", symbol: "£" },
	{ code: "CHF", name: "Swiss Franc", symbol: "CHF" },
	{ code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
	{ code: "AUD", name: "Australian Dollar", symbol: "A$" },
	{ code: "JPY", name: "Japanese Yen", symbol: "¥" },
	{ code: "CNY", name: "Chinese Yuan", symbol: "元" },
	{ code: "INR", name: "Indian Rupee", symbol: "₹" },
	{ code: "NGN", name: "Nigerian Naira", symbol: "₦" },
	{ code: "ZAR", name: "South African Rand", symbol: "R" },
	{ code: "BRL", name: "Brazilian Real", symbol: "R$" },
	{ code: "RUB", name: "Russian Ruble", symbol: "₽" },
	{ code: "MXN", name: "Mexican Peso", symbol: "MX$" },
];

export default function CurrenciesTab({ eventId }: { eventId: string }) {
	const [enabled, setEnabled] = useState<Currency[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/events/${eventId}/currencies`);
			const data = await res.json();
			if (data.success) setEnabled(data.data.currencies || []);
		} catch { setError("Failed to load currencies"); }
		finally { setLoading(false); }
	}, [eventId]);

	useEffect(() => { load(); }, [load]);

	const handleAdd = async (c: typeof ALL_CURRENCIES[0]) => {
		try {
			const res = await fetch(`/api/events/${eventId}/currencies`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(c),
			});
			const data = await res.json();
			if (data.success) load();
			else alert(data.error || "Failed to add currency");
		} catch { alert("Error adding currency"); }
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Remove this currency?")) return;
		await fetch(`/api/events/${eventId}/currencies/${id}`, { method: "DELETE" });
		load();
	};

	const handleSetDefault = async (id: string) => {
		await fetch(`/api/events/${eventId}/currencies`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "setDefault", id }),
		});
		load();
	};

	const filteredSearch = ALL_CURRENCIES.filter(c => 
		!enabled.some(e => e.code === c.code) &&
		(c.code.toLowerCase().includes(search.toLowerCase()) || 
		 c.name.toLowerCase().includes(search.toLowerCase()))
	);

	return (
		<div className="p-6">
			<div className="mb-4">
				<p className="text-sm text-slate-500">Enabled currencies for fees, costs & budgets</p>
			</div>

			{/* Search Box */}
			<div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<input
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search currencies (e.g. USD, Pound, Naira...)"
						className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:bg-white transition-all"
					/>
				</div>
				
				{search && (
					<div className="mt-2 max-h-[200px] overflow-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
						{filteredSearch.length === 0 ? (
							<p className="p-4 text-center text-sm text-slate-400">No matching currencies found</p>
						) : (
							filteredSearch.map(c => (
								<div key={c.code} className="flex items-center justify-between p-3 hover:bg-slate-50 transition">
									<div className="flex items-center gap-3">
										<span className="text-sm font-bold text-slate-800 w-10">{c.code}</span>
										<span className="text-sm text-slate-500">{c.name}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-xs text-slate-400 font-mono">{c.symbol}</span>
										<button 
											onClick={() => { handleAdd(c); setSearch(""); }}
											className="rounded-lg p-1 text-fuchsia-600 hover:bg-fuchsia-50 transition"
										>
											<Plus className="h-4 w-4" />
										</button>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* Enabled Currencies List */}
			<div className="space-y-3">
				{loading ? (
					<div className="flex min-h-[100px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" /></div>
				) : enabled.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
						<p className="text-sm text-slate-400">No currencies enabled. Use the search bar above to add some.</p>
					</div>
				) : (
					enabled.map(c => (
						<div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm group">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600 font-bold">
										{c.symbol}
									</div>
									<div>
										<div className="flex items-center gap-2">
											<span className="text-base font-bold text-slate-800">{c.code}</span>
											{c.isDefault && (
												<span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700 uppercase tracking-tight">
													★ Default
												</span>
											)}
										</div>
										<p className="text-xs text-slate-400">{c.name}</p>
									</div>
								</div>
								
								<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									{!c.isDefault && (
										<Button 
											variant="outline" 
											size="sm" 
											className="h-8 rounded-xl text-xs gap-1.5 border-slate-200"
											onClick={() => handleSetDefault(c.id)}
										>
											<Star className="h-3 w-3" /> Set Default
										</Button>
									)}
									{!c.isDefault && (
										<button 
											onClick={() => handleDelete(c.id)}
											className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
