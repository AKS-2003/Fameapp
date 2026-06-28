"use client";

import { useState, useEffect } from "react";
import {
  Settings, Coins, Plus, Trash2, Star, Search, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { CurrencyOption } from "@/types/contracts";

export function ContractSettingsDialog({
	eventId,
	open,
	onOpenChange,
}: {
	eventId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
	const [availableCurrencies, setAvailableCurrencies] = useState<{ code: string; name: string; symbol: string }[]>([]);
	const [addingCurrency, setAddingCurrency] = useState(false);
	const [currencySearch, setCurrencySearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!open || !eventId) return;

		const fetchSettings = async () => {
			setIsLoading(true);
			try {
				const res = await fetch(`/api/contracts/${eventId}/settings`);
				const data = await res.json();
				if (data.success) {
					setCurrencies(data.settings.currencies || []);
					if (data.availableCurrencies) {
						setAvailableCurrencies(data.availableCurrencies);
					}
				}
			} catch (error) {
				console.error("Failed to load settings", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchSettings();

		// Realtime
		const handleSettingsUpdated = (e: CustomEvent) => {
			if (e.detail?.eventId === eventId && e.detail?.settings?.currencies) {
				setCurrencies(e.detail.settings.currencies);
			}
		};

		window.addEventListener("contract_settings_updated" as any, handleSettingsUpdated);
		return () => {
			window.removeEventListener("contract_settings_updated" as any, handleSettingsUpdated);
		};
	}, [eventId, open]);

	const saveSettings = async (newCurrencies: CurrencyOption[]) => {
		try {
			await fetch(`/api/contracts/${eventId}/settings`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ currencies: newCurrencies }),
			});
		} catch (e) {
			console.error("Failed to save settings", e);
		}
	};

	const handleSetDefault = (code: string) => {
		const newCurrencies = currencies.map((c) => ({ ...c, isDefault: c.code === code }));
		setCurrencies(newCurrencies);
		saveSettings(newCurrencies);
		const cur = newCurrencies.find((c) => c.code === code);
		toast.success(`${cur?.code} set as default currency`);
	};

	const handleAddCurrency = (code: string, name: string, symbol: string) => {
		const newCurrencies = [
			...currencies,
			{ code, name, symbol, isDefault: currencies.length === 0 },
		];
		setCurrencies(newCurrencies);
		saveSettings(newCurrencies);
		toast.success(`${code} added`);
	};

	const handleRemoveCurrency = (code: string) => {
		const cur = currencies.find((c) => c.code === code);
		const newCurrencies = currencies.filter((c) => c.code !== code);
		setCurrencies(newCurrencies);
		saveSettings(newCurrencies);
		toast.success(`${cur?.code} removed`);
	};

	const unusedCurrencies = availableCurrencies.filter(
		(ac) => !currencies.some((c) => c.code === ac.code)
	);

	const filteredCurrencies = currencySearch
		? unusedCurrencies.filter(
				(c) =>
					c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
					c.name.toLowerCase().includes(currencySearch.toLowerCase())
			)
		: unusedCurrencies;

	const defaultCurrency = currencies.find((c) => c.isDefault);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-white text-gray-900 border border-gray-200">
				<DialogHeader>
					<DialogTitle className="text-base font-bold flex items-center gap-2">
						<Settings className="w-4 h-4 text-primary" />
						Contract Settings
					</DialogTitle>
					<p className="text-xs text-muted-foreground">
						Configure currencies and preferences for all artist contracts
					</p>
				</DialogHeader>

				{isLoading ? (
					<div className="flex-1 min-h-[300px] flex items-center justify-center">
						<Loader2 className="w-6 h-6 animate-spin text-primary" />
					</div>
				) : (
					<Tabs defaultValue="currencies" className="flex-1 min-h-0 flex flex-col">
						<TabsList className="h-9 shrink-0 bg-gray-100 p-1">
							<TabsTrigger value="currencies" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
								<Coins className="w-3.5 h-3.5" /> Currencies ({currencies.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="currencies" className="flex-1 overflow-auto space-y-3 mt-3 pr-2">
							{/* Default currency banner */}
							{defaultCurrency && (
								<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-50/50 border border-pink-100 shadow-sm transition-all hover:shadow-md">
									<div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
										<span className="text-sm font-bold text-pink-600">{defaultCurrency.symbol}</span>
									</div>
									<div>
										<p className="text-sm font-bold text-gray-900">
											Default: {defaultCurrency.code} ({defaultCurrency.name})
										</p>
										<p className="text-[11px] text-gray-500 font-medium">
											Used for all fees, budgets & cost calculations
										</p>
									</div>
								</div>
							)}

							{/* Add currency header */}
							<div className="flex justify-between items-center pt-2">
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
									Enabled Currencies
								</p>
								<Button
									size="sm"
									variant={addingCurrency ? "ghost" : "outline"}
									className={`h-7 px-2 text-xs font-semibold rounded-lg ${addingCurrency ? "text-gray-500 hover:text-gray-700 bg-gray-100" : "bg-white text-gray-700 border-gray-200 shadow-sm"}`}
									onClick={() => {
										setAddingCurrency(!addingCurrency);
										setCurrencySearch("");
									}}
								>
									{addingCurrency ? (
										<><X className="w-3 h-3 mr-1" /> Close</>
									) : (
										<><Plus className="w-3 h-3 mr-1" /> Add Currency</>
									)}
								</Button>
							</div>

							{addingCurrency && (
								<div className="border border-gray-200 rounded-xl bg-gray-50 p-3 space-y-2 shadow-inner">
									<div className="relative">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
										<Input
											value={currencySearch}
											onChange={(e) => setCurrencySearch(e.target.value)}
											className="h-9 text-xs pl-9 bg-white border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
											placeholder="Search world currencies (e.g. USD, Pound, Naira...)"
											autoFocus
										/>
									</div>
									<div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
										{filteredCurrencies.length === 0 ? (
											<p className="text-xs text-gray-400 italic py-4 text-center">
												No matching currencies found
											</p>
										) : (
											filteredCurrencies.map((c) => (
												<div
													key={c.code}
													className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 cursor-pointer transition-all"
													onClick={() => {
														handleAddCurrency(c.code, c.name, c.symbol);
														setAddingCurrency(false);
													}}
												>
													<div className="flex items-center gap-3">
														<span className="text-sm font-bold text-gray-900 w-12">{c.code}</span>
														<span className="text-xs font-medium text-gray-600">{c.name}</span>
													</div>
													<div className="flex items-center gap-3">
														<span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{c.symbol}</span>
														<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
															<Plus className="w-3.5 h-3.5 text-primary" />
														</div>
													</div>
												</div>
											))
										)}
									</div>
								</div>
							)}

							<div className="space-y-2">
								{currencies.map((cur) => (
									<div
										key={cur.code}
										className={`border rounded-xl px-4 py-3 transition-all ${cur.isDefault ? "bg-white border-pink-100 shadow-sm" : "bg-white border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md"}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3.5">
												<div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${cur.isDefault ? "bg-pink-100" : "bg-gray-100"}`}>
													<span className={`text-sm font-bold ${cur.isDefault ? "text-pink-600" : "text-gray-600"}`}>{cur.symbol}</span>
												</div>
												<div>
													<div className="flex items-center gap-2">
														<p className="text-sm font-bold text-gray-900">{cur.code}</p>
														{cur.isDefault && (
															<Badge className="text-[10px] font-bold px-1.5 py-0 bg-pink-100 hover:bg-pink-100 text-pink-600 border-pink-200">
																<Star className="w-2.5 h-2.5 mr-1 fill-pink-600" /> Default
															</Badge>
														)}
													</div>
													<p className="text-xs font-medium text-gray-500 mt-0.5">{cur.name}</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												{!cur.isDefault && (
													<Button
														variant="outline"
														size="sm"
														className="h-8 text-xs font-semibold px-3 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
														onClick={() => handleSetDefault(cur.code)}
													>
														<Star className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> Set Default
													</Button>
												)}
												{!cur.isDefault && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
														onClick={() => handleRemoveCurrency(cur.code)}
														title="Remove Currency"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</TabsContent>
					</Tabs>
				)}
			</DialogContent>
		</Dialog>
	);
}
