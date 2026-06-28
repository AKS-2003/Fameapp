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
	Edit,
	Trash2,
	RotateCcw,
	Download,
	Upload,
	Filter,
	X,
	Maximize2,
	Minimize2,
	MoreHorizontal,
	FileText,
	ClipboardList,
	AlertCircle,
	Circle,
	CheckCircle2,
	Clock,
	Flame,
	ListTodo,
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
	const [phaseFilter, setPhaseFilter] = useState<ChecklistPhase | "all">("all");
	const [statusFilter, setStatusFilter] = useState<ChecklistStatus | "all">(
		"all"
	);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set()
	);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
	const [addForm, setAddForm] = useState({
		title: "",
		phase: "before_event" as ChecklistPhase,
		category: "",
		owner: "",
		notes: "",
	});
	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	// Import dialog state
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importEventId, setImportEventId] = useState("");
	const [importLoading, setImportLoading] = useState(false);

	// Fetch checklist
	const fetchChecklist = useCallback(async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/checklist`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setChecklist(data.data);
				}
			}
		} catch (error) {
			console.error("Failed to fetch checklist:", error);
		} finally {
			setLoading(false);
		}
	}, [eventId]);

	useEffect(() => {
		if (isOpen) {
			fetchChecklist();
		}
	}, [isOpen, fetchChecklist]);

	// WebSocket listener for real-time updates
	useEffect(() => {
		if (!isOpen) return;

		const handleChecklistUpdate = (e: CustomEvent) => {
			const data = e.detail;
			if (data.eventId === eventId && data.checklist) {
				setChecklist(data.checklist);
			}
		};

		// Listen for WebSocket forwarded events
		const handleWsEvent = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.eventId === eventId && detail?.checklist) {
				setChecklist(detail.checklist);
			}
		};

		window.addEventListener(
			"checklist_updated",
			handleWsEvent as EventListener
		);

		return () => {
			window.removeEventListener(
				"checklist_updated",
				handleWsEvent as EventListener
			);
		};
	}, [isOpen, eventId]);

	// Close more menu on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				moreMenuRef.current &&
				!moreMenuRef.current.contains(e.target as Node)
			) {
				setShowMoreMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// API helpers
	const patchChecklist = async (body: any) => {
		try {
			const response = await fetch(`/api/events/${eventId}/checklist`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setChecklist(data.data);
				}
			}
		} catch (error) {
			console.error("Checklist update failed:", error);
		}
	};

	const updateStatus = (itemId: string, status: ChecklistStatus) => {
		// Optimistic update
		if (checklist) {
			setChecklist({
				...checklist,
				items: checklist.items.map((item) =>
					item.id === itemId ? { ...item, status } : item
				),
			});
		}
		patchChecklist({ action: "update_status", itemId, status });
	};

	const updateItem = (itemId: string, updates: Partial<ChecklistItem>) => {
		if (checklist) {
			setChecklist({
				...checklist,
				items: checklist.items.map((item) =>
					item.id === itemId ? { ...item, ...updates } : item
				),
			});
		}
		patchChecklist({ action: "update_item", itemId, updates });
	};

	const addItem = () => {
		if (!addForm.title.trim()) return;
		patchChecklist({
			action: "add_item",
			...addForm,
		});
		setAddForm({
			title: "",
			phase: "before_event",
			category: "",
			owner: "",
			notes: "",
		});
		setIsAddDialogOpen(false);
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

	const resetCompletion = async () => {
		if (!confirm("Reset all items to Pending? This cannot be undone."))
			return;
		patchChecklist({ action: "reset_completion" });
		setShowMoreMenu(false);
	};

	const importChecklist = async () => {
		if (!importEventId.trim()) return;
		setImportLoading(true);
		try {
			const response = await fetch(
				`/api/events/${importEventId}/checklist`
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data) {
					const imported = data.data as ChecklistData;
					// Reset statuses and reassign to current event
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
					const putResponse = await fetch(
						`/api/events/${eventId}/checklist`,
						{
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								...newChecklist,
								action: "import",
							}),
						}
					);
					if (putResponse.ok) {
						const putData = await putResponse.json();
						if (putData.success) {
							setChecklist(putData.data);
						}
					}
				}
			}
		} catch (error) {
			console.error("Import failed:", error);
		} finally {
			setImportLoading(false);
			setShowImportDialog(false);
			setImportEventId("");
			setShowMoreMenu(false);
		}
	};

	const exportAsTemplate = () => {
		if (!checklist) return;
		const templateData = JSON.stringify(checklist, null, 2);
		const blob = new Blob([templateData], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `checklist_template_${eventId}.json`;
		a.click();
		URL.revokeObjectURL(url);
		setShowMoreMenu(false);
	};

	const exportToPDF = () => {
		if (!checklist) return;

		// Dynamic import jsPDF
		import("jspdf").then(({ jsPDF }) => {
			const doc = new jsPDF();
			const pageWidth = doc.internal.pageSize.getWidth();
			let y = 20;

			doc.setFontSize(18);
			doc.setTextColor(156, 39, 176);
			doc.text("Event Checklist", pageWidth / 2, y, { align: "center" });
			y += 10;
			doc.setFontSize(10);
			doc.setTextColor(100);
			doc.text("Production Management", pageWidth / 2, y, {
				align: "center",
			});
			y += 15;

			const phases: ChecklistPhase[] = [
				"before_event",
				"during_event",
				"after_event",
			];
			const phaseColors: Record<ChecklistPhase, [number, number, number]> = {
				before_event: [220, 38, 38],
				during_event: [147, 51, 234],
				after_event: [22, 163, 74],
			};

			phases.forEach((phase) => {
				const phaseItems = checklist.items.filter(
					(i) => i.phase === phase
				);
				if (phaseItems.length === 0) return;

				if (y > 270) {
					doc.addPage();
					y = 20;
				}

				// Phase header
				const [r, g, b] = phaseColors[phase];
				doc.setFillColor(r, g, b);
				doc.roundedRect(14, y - 4, pageWidth - 28, 8, 2, 2, "F");
				doc.setTextColor(255, 255, 255);
				doc.setFontSize(10);
				doc.setFont("helvetica", "bold");
				doc.text(PHASE_LABELS[phase], 18, y + 1);
				y += 12;

				// Group by category
				const categories = [
					...new Set(phaseItems.map((i) => i.category)),
				];
				categories.forEach((cat) => {
					if (y > 270) {
						doc.addPage();
						y = 20;
					}

					doc.setTextColor(60);
					doc.setFontSize(10);
					doc.setFont("helvetica", "bold");
					doc.text(cat, 18, y);

					const catItems = phaseItems.filter(
						(i) => i.category === cat
					);
					const completed = catItems.filter(
						(i) => i.status === "done"
					).length;
					doc.setFont("helvetica", "normal");
					doc.setTextColor(150);
					doc.text(
						`${completed}/${catItems.length}`,
						pageWidth - 18,
						y,
						{ align: "right" }
					);
					y += 6;

					catItems.forEach((item) => {
						if (y > 280) {
							doc.addPage();
							y = 20;
						}

						const style = getStatusStyle(item.status);
						const isCompleted = item.status === "done";

						// Checkbox
						doc.setDrawColor(180);
						doc.rect(22, y - 3, 3.5, 3.5);
						if (isCompleted) {
							doc.setFillColor(34, 197, 94);
							doc.rect(22, y - 3, 3.5, 3.5, "F");
							doc.setTextColor(255);
							doc.setFontSize(7);
							doc.text("✓", 22.7, y - 0.2);
						}

						// Title
						doc.setFontSize(9);
						doc.setTextColor(isCompleted ? 150 : 40);
						doc.setFont("helvetica", "normal");
						const title = item.title.substring(0, 80);
						doc.text(title, 29, y);

						// Status badge
						if (item.status === "urgent") {
							doc.setTextColor(239, 68, 68);
							doc.setFontSize(7);
							doc.text("URGENT", pageWidth - 18, y, {
								align: "right",
							});
						} else if (item.status === "next_on_todo") {
							doc.setTextColor(245, 158, 11);
							doc.setFontSize(7);
							doc.text("NEXT", pageWidth - 18, y, {
								align: "right",
							});
						}

						y += 5;

						// Owner / notes
						if (item.owner) {
							doc.setTextColor(130);
							doc.setFontSize(7);
							doc.text(`Owner: ${item.owner}`, 29, y);
							y += 4;
						}
					});

					y += 4;
				});

				y += 6;
			});

			// Open in new tab for preview
			const pdfBlob = doc.output("blob");
			const pdfUrl = URL.createObjectURL(pdfBlob);
			window.open(pdfUrl, "_blank");
		});

		setShowMoreMenu(false);
	};

	// Computed data
	const filteredItems = useMemo(() => {
		if (!checklist) return [];
		return checklist.items.filter((item) => {
			if (phaseFilter !== "all" && item.phase !== phaseFilter) return false;
			if (statusFilter !== "all" && item.status !== statusFilter)
				return false;
			return true;
		});
	}, [checklist, phaseFilter, statusFilter]);

	const stats = useMemo(() => {
		if (!checklist)
			return {
				total: 0,
				done: 0,
				percent: 0,
				before: { total: 0, done: 0 },
				during: { total: 0, done: 0 },
				after: { total: 0, done: 0 },
			};

		const items = checklist.items;
		const done = items.filter((i) => i.status === "done").length;
		const before = items.filter((i) => i.phase === "before_event");
		const during = items.filter((i) => i.phase === "during_event");
		const after = items.filter((i) => i.phase === "after_event");

		return {
			total: items.length,
			done,
			percent: items.length > 0 ? Math.round((done / items.length) * 100) : 0,
			before: {
				total: before.length,
				done: before.filter((i) => i.status === "done").length,
			},
			during: {
				total: during.length,
				done: during.filter((i) => i.status === "done").length,
			},
			after: {
				total: after.length,
				done: after.filter((i) => i.status === "done").length,
			},
		};
	}, [checklist]);

	const groupedItems = useMemo(() => {
		const phases: ChecklistPhase[] = [
			"before_event",
			"during_event",
			"after_event",
		];
		const result: Record<
			ChecklistPhase,
			Record<string, ChecklistItem[]>
		> = {
			before_event: {},
			during_event: {},
			after_event: {},
		};

		filteredItems.forEach((item) => {
			if (!result[item.phase][item.category]) {
				result[item.phase][item.category] = [];
			}
			result[item.phase][item.category].push(item);
		});

		return result;
	}, [filteredItems]);

	const toggleCategory = (key: string) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const expandAll = () => {
		const allKeys = new Set<string>();
		Object.entries(groupedItems).forEach(([phase, categories]) => {
			Object.keys(categories).forEach((cat) => {
				allKeys.add(`${phase}_${cat}`);
			});
		});
		setExpandedCategories(allKeys);
	};

	const collapseAll = () => {
		setExpandedCategories(new Set());
	};

	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);

	if (!isOpen || !mounted) return null;

	const containerClass = isFullscreen
		? "fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden w-screen h-screen"
		: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen left-0 top-0";

	const contentClass = isFullscreen
		? "flex flex-col h-full w-full"
		: "bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200";

	const getStatusIcon = (status: ChecklistStatus) => {
		switch (status) {
			case "done":
				return <CheckCircle2 className="w-4 h-4" />;
			case "urgent":
				return <Flame className="w-4 h-4" />;
			case "next_on_todo":
				return <ListTodo className="w-4 h-4" />;
			case "pending":
				return <Clock className="w-4 h-4" />;
		}
	};

	const phaseHeaderColors: Record<ChecklistPhase, string> = {
		before_event: "bg-red-600",
		during_event: "bg-purple-600",
		after_event: "bg-green-600",
	};

	return createPortal(
		<div className={containerClass} onClick={isFullscreen ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className={contentClass}>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
					<div className="flex items-center gap-3">
						<Image
															src="/fame-logo.png"
															alt="FAME Logo"
															width={28}
															height={28}
															className="sm:w-8 sm:h-8"
														/>
						<div>
							<h2 className="text-lg font-bold text-gray-900">
								Event Checklist
							</h2>
							<p className="text-xs text-gray-500">
								Production Management
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setIsFullscreen(!isFullscreen)}
							className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
							title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						>
							{isFullscreen ? (
								<Minimize2 className="w-5 h-5" />
							) : (
								<Maximize2 className="w-5 h-5" />
							)}
						</button>
						<button
							onClick={onClose}
							className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Main content - scrollable */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					{loading ? (
						<div className="flex items-center justify-center h-48">
							<div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
						</div>
					) : (
						<>
							{/* Progress Overview */}
							<div className="bg-white border rounded-xl p-5 mb-5 shadow-sm">
								<div className="flex items-center justify-between mb-3">
									<h3 className="font-semibold text-gray-900">
										Progress Overview
									</h3>
									<span
										className="text-2xl font-bold"
										style={{
											color:
												stats.percent === 100
													? "#22c55e"
													: stats.percent > 50
														? "#f59e0b"
														: "#9333ea",
										}}
									>
										{stats.percent}%
									</span>
								</div>

								{/* Progress bar */}
								<div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
									<div
										className="h-full rounded-full transition-all duration-500"
										style={{
											width: `${stats.percent}%`,
											background:
												stats.percent === 100
													? "#22c55e"
													: "linear-gradient(90deg, #9333ea, #ec4899)",
										}}
									/>
								</div>
								<p className="text-sm text-gray-500 mb-4">
									{stats.done} of {stats.total} tasks completed
								</p>

								{/* Phase breakdown */}
								<div className="grid grid-cols-3 gap-3">
									{(
										[
											{
												label: "Before Event",
												data: stats.before,
											},
											{
												label: "During Event",
												data: stats.during,
											},
											{
												label: "After Event",
												data: stats.after,
											},
										] as const
									).map(({ label, data }) => {
										const pct =
											data.total > 0
												? Math.round(
														(data.done / data.total) *
															100
													)
												: 0;
										return (
											<div
												key={label}
												className="bg-gray-50 rounded-lg p-3 text-center"
											>
												<p className="text-xs text-gray-500 mb-1">
													{label}
												</p>
												<p className="text-lg font-bold text-gray-900">
													{pct}%
												</p>
												<p className="text-xs text-gray-400">
													{data.done}/{data.total}
												</p>
											</div>
										);
									})}
								</div>
							</div>

							{/* Filters & Actions */}
							<div className="flex flex-wrap items-center gap-3 mb-5">
								{/* Phase filter */}
								<select
									value={phaseFilter}
									onChange={(e) =>
										setPhaseFilter(
											e.target.value as
												| ChecklistPhase
												| "all"
										)
									}
									className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-300 outline-none"
								>
									<option value="all">All Phases</option>
									<option value="before_event">
										Before Event
									</option>
									<option value="during_event">
										During Event
									</option>
									<option value="after_event">
										After Event
									</option>
								</select>

								{/* Status filter */}
								<select
									value={statusFilter}
									onChange={(e) =>
										setStatusFilter(
											e.target.value as
												| ChecklistStatus
												| "all"
										)
									}
									className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-300 outline-none"
								>
									<option value="all">All Status</option>
									{STATUS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>

								<div className="flex-1" />

								{/* Expand/Collapse */}
								<button
									onClick={
										expandedCategories.size > 0
											? collapseAll
											: expandAll
									}
									className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
								>
									<ChevronDown className="w-4 h-4" />
									{expandedCategories.size > 0
										? "Collapse All"
										: "Expand All"}
								</button>

								{/* Add To-Do */}
								<button
									onClick={() => setIsAddDialogOpen(true)}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
								>
									<Plus className="w-4 h-4" />
									Add To-Do
								</button>

								{/* More menu */}
								<div className="relative" ref={moreMenuRef}>
									<button
										onClick={() =>
											setShowMoreMenu(!showMoreMenu)
										}
										className="p-2 border rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
									>
										<MoreHorizontal className="w-5 h-5" />
									</button>
									{showMoreMenu && (
										<div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-50 w-56 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
											<button
												onClick={exportToPDF}
												className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
											>
												<FileText className="w-4 h-4 text-purple-500" />
												Export to PDF
											</button>
											<button
												onClick={exportAsTemplate}
												className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
											>
												<Download className="w-4 h-4 text-blue-500" />
												Export as Template
											</button>
											<div className="border-t my-1" />
											<button
												onClick={resetCompletion}
												className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-2.5 text-red-600"
											>
												<RotateCcw className="w-4 h-4" />
												Reset All Status
											</button>
										</div>
									)}
								</div>
							</div>

							{/* Checklist Content */}
							{(
								[
									"before_event",
									"during_event",
									"after_event",
								] as ChecklistPhase[]
							).map((phase) => {
								if (
									phaseFilter !== "all" &&
									phaseFilter !== phase
								)
									return null;
								const categories = groupedItems[phase];
								if (Object.keys(categories).length === 0)
									return null;

								return (
									<div key={phase} className="mb-6">
										{/* Phase header */}
										<div
											className={`${phaseHeaderColors[phase]} text-white px-4 py-2.5 rounded-lg font-semibold text-sm tracking-wide mb-3 shadow-sm`}
										>
											{PHASE_LABELS[phase]}
										</div>

										{/* Categories */}
										{Object.entries(categories).map(
											([category, items]) => {
												const catKey = `${phase}_${category}`;
												const isExpanded =
													expandedCategories.has(
														catKey
													);
												const doneCount =
													items.filter(
														(i) =>
															i.status === "done"
													).length;

												return (
													<div
														key={catKey}
														className="mb-2"
													>
														{/* Category header */}
														<button
															onClick={() =>
																toggleCategory(
																	catKey
																)
															}
															className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
														>
															<div className="flex items-center gap-2">
																{isExpanded ? (
																	<ChevronDown className="w-4 h-4 text-gray-400" />
																) : (
																	<ChevronRight className="w-4 h-4 text-gray-400" />
																)}
																<span className="text-sm font-medium text-gray-700">
																	{category}
																</span>
															</div>
															<span className="text-xs text-gray-400">
																{doneCount}/
																{items.length}
															</span>
														</button>

														{/* Items */}
														{isExpanded && (
															<div className="ml-4 border-l-2 border-gray-100 pl-4 mb-2">
																{items.map(
																	(item) => (
																		<ChecklistItemRow
																			key={
																				item.id
																			}
																			item={
																				item
																			}
																			onStatusChange={(
																				status
																			) =>
																				updateStatus(
																					item.id,
																					status
																				)
																			}
																			onEdit={() =>
																				setEditingItem(
																					item
																				)
																			}
																			onDelete={() =>
																				deleteItem(
																					item.id
																				)
																			}
																		/>
																	)
																)}
															</div>
														)}
													</div>
												);
											}
										)}
									</div>
								);
							})}
						</>
					)}
				</div>

				{/* Add Item Dialog */}
				{isAddDialogOpen && (
					<div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
							<h3 className="text-lg font-bold mb-4 text-gray-900">
								Add New To-Do
							</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Title *
									</label>
									<input
										value={addForm.title}
										onChange={(e) =>
											setAddForm({
												...addForm,
												title: e.target.value,
											})
										}
										placeholder="Enter task description..."
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										autoFocus
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Phase
										</label>
										<select
											value={addForm.phase}
											onChange={(e) =>
												setAddForm({
													...addForm,
													phase: e.target
														.value as ChecklistPhase,
												})
											}
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										>
											<option value="before_event">
												Before Event
											</option>
											<option value="during_event">
												During Event
											</option>
											<option value="after_event">
												After Event
											</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Category
										</label>
										<input
											value={addForm.category}
											onChange={(e) =>
												setAddForm({
													...addForm,
													category: e.target.value,
												})
											}
											placeholder="e.g. Custom"
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Owner (optional)
									</label>
									<input
										value={addForm.owner}
										onChange={(e) =>
											setAddForm({
												...addForm,
												owner: e.target.value,
											})
										}
										placeholder="Person responsible..."
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Notes (optional)
									</label>
									<textarea
										value={addForm.notes}
										onChange={(e) =>
											setAddForm({
												...addForm,
												notes: e.target.value,
											})
										}
										placeholder="Additional notes..."
										rows={2}
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none resize-none"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-6">
								<button
									onClick={() => setIsAddDialogOpen(false)}
									className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									onClick={addItem}
									disabled={!addForm.title.trim()}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
								>
									Add To-Do
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Edit Item Dialog */}
				{editingItem && (
					<div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
							<h3 className="text-lg font-bold mb-4 text-gray-900">
								Edit To-Do
							</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Title
									</label>
									<input
										value={editingItem.title}
										onChange={(e) =>
											setEditingItem({
												...editingItem,
												title: e.target.value,
											})
										}
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Status
										</label>
										<select
											value={editingItem.status}
											onChange={(e) =>
												setEditingItem({
													...editingItem,
													status: e.target
														.value as ChecklistStatus,
												})
											}
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										>
											{STATUS_OPTIONS.map((opt) => (
												<option
													key={opt.value}
													value={opt.value}
												>
													{opt.label}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Category
										</label>
										<input
											value={editingItem.category}
											onChange={(e) =>
												setEditingItem({
													...editingItem,
													category: e.target.value,
												})
											}
											className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Owner
									</label>
									<input
										value={editingItem.owner}
										onChange={(e) =>
											setEditingItem({
												...editingItem,
												owner: e.target.value,
											})
										}
										placeholder="Person responsible..."
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Notes
									</label>
									<textarea
										value={editingItem.notes}
										onChange={(e) =>
											setEditingItem({
												...editingItem,
												notes: e.target.value,
											})
										}
										rows={3}
										className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none resize-none"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-6">
								<button
									onClick={() => setEditingItem(null)}
									className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									onClick={() => {
										updateItem(editingItem.id, {
											title: editingItem.title,
											status: editingItem.status,
											category: editingItem.category,
											owner: editingItem.owner,
											notes: editingItem.notes,
										});
										setEditingItem(null);
									}}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
								>
									Save Changes
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Import Dialog */}
				{showImportDialog && (
					<div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
						<div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
							<h3 className="text-lg font-bold mb-4 text-gray-900">
								Import Checklist
							</h3>
							<p className="text-sm text-gray-500 mb-4">
								Enter the Event ID to import its checklist. All
								statuses will be reset to Pending.
							</p>
							<input
								value={importEventId}
								onChange={(e) =>
									setImportEventId(e.target.value)
								}
								placeholder="Enter Event ID..."
								className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 outline-none mb-4"
								autoFocus
							/>
							<div className="flex justify-end gap-2">
								<button
									onClick={() => {
										setShowImportDialog(false);
										setImportEventId("");
									}}
									className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									onClick={importChecklist}
									disabled={
										!importEventId.trim() || importLoading
									}
									className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
								>
									{importLoading
										? "Importing..."
										: "Import"}
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
	onStatusChange,
	onEdit,
	onDelete,
}: {
	item: ChecklistItem;
	onStatusChange: (status: ChecklistStatus) => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const [showActions, setShowActions] = useState(false);
	const [showStatusMenu, setShowStatusMenu] = useState(false);
	const statusMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				statusMenuRef.current &&
				!statusMenuRef.current.contains(e.target as Node)
			) {
				setShowStatusMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const style = getStatusStyle(item.status);
	const isDone = item.status === "done";
	const isUrgent = item.status === "urgent";
	const isNextTodo = item.status === "next_on_todo";

	return (
		<div
			className={`flex items-start gap-3 py-2.5 px-2 rounded-lg group transition-all ${
				isDone
					? "bg-green-50/50"
					: isUrgent
						? "bg-red-50/50"
						: isNextTodo
							? "bg-yellow-50/50"
							: "hover:bg-gray-50"
			}`}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => {
				setShowActions(false);
				setShowStatusMenu(false);
			}}
		>
			{/* Status checkbox / indicator */}
			<div className="relative" ref={statusMenuRef}>
				<button
					onClick={() => setShowStatusMenu(!showStatusMenu)}
					className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
					style={{
						borderColor: style.color,
						backgroundColor: isDone ? style.color : "transparent",
					}}
				>
					{isDone && <Check className="w-3 h-3 text-white" />}
					{isUrgent && (
						<Flame
							className="w-3 h-3"
							style={{ color: style.color }}
						/>
					)}
					{isNextTodo && (
						<ListTodo
							className="w-3 h-3"
							style={{ color: style.color }}
						/>
					)}
				</button>

				{/* Status dropdown */}
				{showStatusMenu && (
					<div className="absolute left-0 top-7 bg-white border rounded-lg shadow-xl z-50 w-48 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
						{STATUS_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								onClick={() => {
									onStatusChange(opt.value);
									setShowStatusMenu(false);
								}}
								className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
									item.status === opt.value
										? "font-semibold"
										: ""
								}`}
							>
								<span
									className="w-3 h-3 rounded-full flex-shrink-0"
									style={{ backgroundColor: opt.color }}
								/>
								{opt.label}
								{item.status === opt.value && (
									<Check className="w-3 h-3 ml-auto text-gray-500" />
								)}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<p
					className={`text-sm leading-relaxed ${
						isDone
							? "line-through text-gray-400"
							: "text-gray-800"
					}`}
				>
					{item.title}
				</p>
				{(item.owner || item.notes) && (
					<div className="flex items-center gap-3 mt-1">
						{item.owner && (
							<span className="text-xs text-gray-400 flex items-center gap-1">
								👤 {item.owner}
							</span>
						)}
						{item.notes && (
							<span className="text-xs text-gray-400 flex items-center gap-1 truncate max-w-[200px]">
								📝 {item.notes}
							</span>
						)}
					</div>
				)}
			</div>

			{/* Status badge */}
			{!isDone && (
				<span
					className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5"
					style={{
						color: style.color,
						backgroundColor: style.bgColor,
					}}
				>
					{style.label}
				</span>
			)}

			{/* Action buttons */}
			<div
				className={`flex items-center gap-1 flex-shrink-0 transition-opacity ${
					showActions ? "opacity-100" : "opacity-0"
				}`}
			>
				<button
					onClick={onEdit}
					className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
					title="Edit"
				>
					<Edit className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={onDelete}
					className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
					title="Delete"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}
