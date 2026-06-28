"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
	ChecklistPhase,
	ChecklistStatus,
	ChecklistItem,
	EventChecklist as ChecklistData,
	PHASE_LABELS,
	STATUS_OPTIONS,
	getStatusStyle,
	generateDefaultChecklist,
	getAllCategories,
} from "@/lib/checklist-template";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Plus,
	Trash2,
	RotateCcw,
	Download,
	Upload,
	X,
	Maximize2,
	Minimize2,
	Search,
	Bug,
	Send,
	Mail,
} from "lucide-react";
import Image from "next/image";

interface EventChecklistProps {
	eventId: string;
	isOpen: boolean;
	onClose: () => void;
}

export default function EventChecklistComponent({
	eventId,
	isOpen,
	onClose,
}: EventChecklistProps) {
	const [checklist, setChecklist] = useState<ChecklistData | null>(null);
	const [loading, setLoading] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [expandedPhases, setExpandedPhases] = useState<Set<ChecklistPhase>>(
		new Set(["before_event", "during_event", "after_event"])
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [addForm, setAddForm] = useState({
		title: "",
		phase: "before_event" as ChecklistPhase,
		category: "",
		owner: "",
		notes: "",
	});

	// Error/issue logging
	const [issueText, setIssueText] = useState("");
	const [issueSeverity, setIssueSeverity] = useState("Medium");
	const [issues, setIssues] = useState<{ text: string; severity: string; time: string }[]>([]);
	const [issueEmail] = useState("support@famemanager.com");
	const [sendingReport, setSendingReport] = useState(false);

	// Import
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importEventId, setImportEventId] = useState("");
	const [importLoading, setImportLoading] = useState(false);

	const fetchChecklist = useCallback(async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/checklist`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) setChecklist(data.data);
			}
		} catch (error) {
			console.error("Failed to fetch checklist:", error);
		} finally {
			setLoading(false);
		}
	}, [eventId]);

	useEffect(() => {
		if (isOpen) fetchChecklist();
	}, [isOpen, fetchChecklist]);

	useEffect(() => {
		if (!isOpen) return;
		const handleWsEvent = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.eventId === eventId && detail?.checklist) {
				setChecklist(detail.checklist);
			}
		};
		window.addEventListener("checklist_updated", handleWsEvent as EventListener);
		return () => window.removeEventListener("checklist_updated", handleWsEvent as EventListener);
	}, [isOpen, eventId]);

	const patchChecklist = async (body: any) => {
		try {
			const response = await fetch(`/api/events/${eventId}/checklist`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (response.ok) {
				const data = await response.json();
				if (data.success) setChecklist(data.data);
			}
		} catch (error) {
			console.error("Checklist update failed:", error);
		}
	};

	const toggleItem = (itemId: string, current: ChecklistStatus) => {
		const newStatus: ChecklistStatus = current === "done" ? "pending" : "done";
		if (checklist) {
			setChecklist({
				...checklist,
				items: checklist.items.map((item) =>
					item.id === itemId ? { ...item, status: newStatus } : item
				),
			});
		}
		patchChecklist({ action: "update_status", itemId, status: newStatus });
	};

	const deleteItem = (itemId: string) => {
		if (checklist) {
			setChecklist({
				...checklist,
				items: checklist.items.filter((item) => item.id !== itemId),
			});
		}
		patchChecklist({ action: "delete_item", itemId });
	};

	const addItem = () => {
		if (!addForm.title.trim()) return;
		patchChecklist({ action: "add_item", ...addForm });
		setAddForm({ title: "", phase: "before_event", category: "", owner: "", notes: "" });
		setIsAddDialogOpen(false);
	};

	const resetCompletion = async () => {
		if (!confirm("Reset all items to Pending? This cannot be undone.")) return;
		patchChecklist({ action: "reset_completion" });
	};

	const importChecklist = async () => {
		if (!importEventId.trim()) return;
		setImportLoading(true);
		try {
			const response = await fetch(`/api/events/${importEventId}/checklist`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data) {
					const imported = data.data as ChecklistData;
					const now = new Date().toISOString();
					const newChecklist: ChecklistData = {
						eventId,
						items: imported.items.map((item: ChecklistItem) => ({
							...item,
							id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
							status: "pending" as ChecklistStatus,
							updatedAt: now,
						})),
						createdAt: now,
						updatedAt: now,
						version: (checklist?.version || 0) + 1,
					};
					const putResponse = await fetch(`/api/events/${eventId}/checklist`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ ...newChecklist, action: "import" }),
					});
					if (putResponse.ok) {
						const putData = await putResponse.json();
						if (putData.success) setChecklist(putData.data);
					}
				}
			}
		} catch (error) {
			console.error("Import failed:", error);
		} finally {
			setImportLoading(false);
			setShowImportDialog(false);
			setImportEventId("");
		}
	};

	const logIssue = () => {
		if (!issueText.trim()) return;
		setIssues((prev) => [
			...prev,
			{ text: issueText.trim(), severity: issueSeverity, time: new Date().toLocaleTimeString() },
		]);
		setIssueText("");
	};

	const stats = useMemo(() => {
		if (!checklist) return { total: 0, done: 0, percent: 0, before: { total: 0, done: 0 }, during: { total: 0, done: 0 }, after: { total: 0, done: 0 } };
		const items = checklist.items;
		const done = items.filter((i) => i.status === "done").length;
		const before = items.filter((i) => i.phase === "before_event");
		const during = items.filter((i) => i.phase === "during_event");
		const after = items.filter((i) => i.phase === "after_event");
		return {
			total: items.length,
			done,
			percent: items.length > 0 ? Math.round((done / items.length) * 100) : 0,
			before: { total: before.length, done: before.filter((i) => i.status === "done").length },
			during: { total: during.length, done: during.filter((i) => i.status === "done").length },
			after: { total: after.length, done: after.filter((i) => i.status === "done").length },
		};
	}, [checklist]);

	const groupedItems = useMemo(() => {
		const phases: ChecklistPhase[] = ["before_event", "during_event", "after_event"];
		const result: Record<ChecklistPhase, Record<string, ChecklistItem[]>> = {
			before_event: {}, during_event: {}, after_event: {},
		};
		if (!checklist) return result;
		const q = searchQuery.toLowerCase();
		checklist.items.forEach((item) => {
			if (q && !item.title.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return;
			if (!result[item.phase][item.category]) result[item.phase][item.category] = [];
			result[item.phase][item.category].push(item);
		});
		return result;
	}, [checklist, searchQuery]);

	const togglePhase = (phase: ChecklistPhase) => {
		setExpandedPhases((prev) => {
			const next = new Set(prev);
			if (next.has(phase)) next.delete(phase);
			else next.add(phase);
			return next;
		});
	};

	const phaseItemCounts = useMemo(() => {
		if (!checklist) return { before_event: { total: 0, done: 0 }, during_event: { total: 0, done: 0 }, after_event: { total: 0, done: 0 } };
		return {
			before_event: {
				total: checklist.items.filter((i) => i.phase === "before_event").length,
				done: checklist.items.filter((i) => i.phase === "before_event" && i.status === "done").length,
			},
			during_event: {
				total: checklist.items.filter((i) => i.phase === "during_event").length,
				done: checklist.items.filter((i) => i.phase === "during_event" && i.status === "done").length,
			},
			after_event: {
				total: checklist.items.filter((i) => i.phase === "after_event").length,
				done: checklist.items.filter((i) => i.phase === "after_event" && i.status === "done").length,
			},
		};
	}, [checklist]);

	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	if (!isOpen || !mounted) return null;

	const phaseGradients: Record<ChecklistPhase, string> = {
		before_event: "from-pink-100 to-purple-50",
		during_event: "from-purple-100 to-pink-50",
		after_event: "from-fuchsia-100 to-purple-50",
	};

	const containerClass = isFullscreen
		? "fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-hidden"
		: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4";

	const contentClass = isFullscreen
		? "flex flex-col h-full w-full bg-gray-50"
		: "bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden";

	return createPortal(
		<div className={containerClass} onClick={isFullscreen ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className={contentClass}>

				{/* ── Header ── */}
				<div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
							<Check className="w-5 h-5 text-white" />
						</div>
						<div>
							<h2 className="text-base font-bold text-gray-900 leading-tight">Event Checklist</h2>
							<p className="text-xs text-gray-400">{stats.done}/{stats.total} complete · {stats.percent}%</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{/* Search */}
						<div className="relative hidden sm:block">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
							<input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search items..."
								className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-300 outline-none w-44"
							/>
						</div>
						{/* Bulk Import */}
						<button
							onClick={() => setShowImportDialog(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
						>
							<Upload className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Bulk Import</span>
						</button>
						{/* Reset */}
						<button
							onClick={resetCompletion}
							className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Reset</span>
						</button>
						<button
							onClick={() => setIsFullscreen(!isFullscreen)}
							className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						>
							{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
						</button>
						<button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* ── Body ── */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
					{loading ? (
						<div className="flex items-center justify-center h-48">
							<div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
						</div>
					) : (
						<>
							{/* Phase sections */}
							{(["before_event", "during_event", "after_event"] as ChecklistPhase[]).map((phase) => {
								const counts = phaseItemCounts[phase];
								const isExpanded = expandedPhases.has(phase);
								const categories = groupedItems[phase];
								const hasItems = Object.keys(categories).length > 0;

								return (
									<div key={phase} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
										{/* Phase header row */}
										<div className={`flex items-center bg-gradient-to-r ${phaseGradients[phase]}`}>
											{/* Toggle button (left side) */}
											<button
												onClick={() => togglePhase(phase)}
												className="flex-1 flex items-center gap-2 px-5 py-3.5 hover:brightness-[0.97] transition-all text-left"
											>
												{isExpanded
													? <ChevronDown className="w-4 h-4 text-gray-600" />
													: <ChevronRight className="w-4 h-4 text-gray-600" />
												}
												<span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
													{PHASE_LABELS[phase]}
												</span>
												<span className="text-xs text-gray-500 font-medium ml-1">
													{counts.done}/{counts.total}
												</span>
											</button>
											{/* + Add button (right side, always visible) */}
											<button
												onClick={() => {
													setAddForm((f) => ({ ...f, phase, category: "" }));
													setIsAddDialogOpen(true);
												}}
												className="flex items-center gap-1 px-4 py-3.5 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors flex-shrink-0"
											>
												<Plus className="w-3.5 h-3.5" /> Add
											</button>
										</div>

										{/* Items */}
										{isExpanded && (
											<div className="px-5 py-3">
												{!hasItems ? (
													<p className="text-sm text-gray-400 py-4 text-center">No items — click <span className="text-purple-500 font-medium">+ Add</span> to create one</p>
												) : (
													Object.entries(categories).map(([category, items]) => (
														<div key={category} className="mb-4">
															{/* Category label + Add */}
															<div className="flex items-center justify-between mb-2">
																<span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
																	{category}
																</span>
																<button
																	onClick={() => {
																		setAddForm((f) => ({ ...f, phase, category }));
																		setIsAddDialogOpen(true);
																	}}
																	className="text-[11px] text-purple-500 hover:text-purple-700 flex items-center gap-0.5 transition-colors"
																>
																	<Plus className="w-3 h-3" /> Add
																</button>
															</div>
															{/* Item rows */}
															{items.map((item) => (
																<ChecklistItemRow
																	key={item.id}
																	item={item}
																	onToggle={() => toggleItem(item.id, item.status)}
																	onDelete={() => deleteItem(item.id)}
																/>
															))}
														</div>
													))
												)}
											</div>
										)}
									</div>
								);
							})}

							{/* Errors & Issues section */}
							<div className="rounded-xl overflow-hidden border border-orange-200 bg-orange-50 shadow-sm">
								<div className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-orange-100 to-yellow-50">
									<Bug className="w-4 h-4 text-orange-500" />
									<span className="font-bold text-gray-800 text-sm tracking-wide uppercase">
										Errors &amp; Issues Found
									</span>
									<span className="text-xs text-gray-500 font-medium ml-1">{issues.length}</span>
								</div>
								<div className="px-5 py-3">
									{issues.length > 0 && (
										<div className="mb-3 space-y-1.5">
											{issues.map((issue, idx) => (
												<div key={idx} className="flex items-start gap-2 text-sm">
													<span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
														issue.severity === "High" ? "bg-red-100 text-red-600" :
														issue.severity === "Medium" ? "bg-yellow-100 text-yellow-700" :
														"bg-gray-100 text-gray-500"
													}`}>{issue.severity}</span>
													<span className="text-gray-700 flex-1">{issue.text}</span>
													<span className="text-gray-400 text-xs flex-shrink-0">{issue.time}</span>
												</div>
											))}
										</div>
									)}
									{/* Log area */}
									<div className="flex gap-2 items-start mb-3">
										<textarea
											value={issueText}
											onChange={(e) => setIssueText(e.target.value)}
											placeholder="Describe an error or issue you encountered while using the software..."
											rows={3}
											className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white resize-none focus:ring-2 focus:ring-orange-300 outline-none"
										/>
										<div className="flex flex-col gap-2">
											<select
												value={issueSeverity}
												onChange={(e) => setIssueSeverity(e.target.value)}
												className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-300 outline-none"
											>
												<option>Low</option>
												<option>Medium</option>
												<option>High</option>
											</select>
											<button
												onClick={logIssue}
												disabled={!issueText.trim()}
												className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:shadow-md disabled:opacity-50 transition-all flex items-center gap-1"
											>
												<Plus className="w-3.5 h-3.5" /> Log
											</button>
										</div>
									</div>
									{/* Send report */}
									<div className="flex items-center gap-2">
										<Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
										<span className="text-sm text-gray-500 flex-1">{issueEmail}</span>
										<button
											disabled={issues.length === 0 || sendingReport}
											onClick={() => {
												setSendingReport(true);
												setTimeout(() => setSendingReport(false), 1500);
											}}
											className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-400 to-pink-400 text-white text-sm font-semibold rounded-lg hover:shadow-md disabled:opacity-40 transition-all"
										>
											<Send className="w-3.5 h-3.5" />
											{sendingReport ? "Sending..." : "Send Report"}
										</button>
									</div>
								</div>
							</div>
						</>
					)}
				</div>

				{/* ── Add Item Dialog ── */}
				{isAddDialogOpen && (
					<div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
							<h3 className="text-base font-bold mb-4 text-gray-900">Add New Item</h3>
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
									<input
										value={addForm.title}
										onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
										placeholder="Enter task description..."
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										autoFocus
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
										<select
											value={addForm.phase}
											onChange={(e) => setAddForm({ ...addForm, phase: e.target.value as ChecklistPhase })}
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										>
											<option value="before_event">Before Event</option>
											<option value="during_event">During Event</option>
											<option value="after_event">After Event</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
										<input
											value={addForm.category}
											onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
											placeholder="e.g. Lineup & Registration"
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Owner (optional)</label>
									<input
										value={addForm.owner}
										onChange={(e) => setAddForm({ ...addForm, owner: e.target.value })}
										placeholder="Person responsible..."
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-5">
								<button onClick={() => setIsAddDialogOpen(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
									Cancel
								</button>
								<button
									onClick={addItem}
									disabled={!addForm.title.trim()}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
								>
									Add Item
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ── Import Dialog ── */}
				{showImportDialog && (
					<div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
							<h3 className="text-base font-bold mb-2 text-gray-900">Bulk Import Checklist</h3>
							<p className="text-sm text-gray-500 mb-4">
								Enter the Event ID to copy its checklist. All statuses will be reset to Pending.
							</p>
							<input
								value={importEventId}
								onChange={(e) => setImportEventId(e.target.value)}
								placeholder="Enter Event ID..."
								className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none mb-4"
								autoFocus
							/>
							<div className="flex justify-end gap-2">
								<button onClick={() => { setShowImportDialog(false); setImportEventId(""); }} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
									Cancel
								</button>
								<button
									onClick={importChecklist}
									disabled={!importEventId.trim() || importLoading}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
								>
									{importLoading ? "Importing..." : "Import"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>,
		document.body
	);
}

// Individual checklist item row
function ChecklistItemRow({
	item,
	onToggle,
	onDelete,
}: {
	item: ChecklistItem;
	onToggle: () => void;
	onDelete: () => void;
}) {
	const [hovered, setHovered] = useState(false);
	const isDone = item.status === "done";

	return (
		<div
			className="flex items-center gap-3 py-2 px-1 rounded-lg group transition-all hover:bg-gray-50"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{/* Checkbox */}
			<button
				onClick={onToggle}
				className={`flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
					isDone
						? "border-pink-500 bg-pink-500"
						: "border-pink-400 bg-transparent hover:border-pink-500"
				}`}
			>
				{isDone && <Check className="w-2.5 h-2.5 text-white" />}
			</button>

			{/* Text */}
			<span className={`flex-1 text-sm leading-relaxed transition-all ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
				{item.title}
			</span>

			{/* Delete — visible on hover */}
			<button
				onClick={onDelete}
				className={`flex-shrink-0 p-1 rounded transition-all ${
					hovered ? "opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50" : "opacity-0"
				}`}
				title="Delete"
			>
				<Trash2 className="w-3.5 h-3.5" />
			</button>
		</div>
	);
}
