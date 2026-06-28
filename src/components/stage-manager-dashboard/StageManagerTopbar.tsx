"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Search,
	Settings,
	CalendarIcon,
	ChevronDown,
	LogOut,
	User,
	LayoutGrid,
	Briefcase,
	Truck,
	Music,
	Mic,
	Users,
	BarChart2,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationProvider";
import { Event } from "@/lib/types/event";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";

interface StageManagerTopbarProps {
	search: string;
	onSearchChange: (value: string) => void;
	onRefresh: () => void;
	onOpenProfile: () => void;
	onLogout: () => void;
	displayName: string;
	events?: Event[];
	selectedEventId?: string | null;
	onSelectEvent?: (eventId: string | null) => void;
	artists?: any[];
	onSelectSearchResult?: (type: "event" | "artist", id: string, eventId?: string) => void;
	activeTab?: string;
	onSelectTab?: (tab: string) => void;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() || "")
		.join("");
}

const NAV_TABS = [
	{ label: "Dashboard", icon: LayoutGrid, subItems: [] },
	{ label: "Artist Files", icon: Briefcase, subItems: [{ label: "Cost Analysis", icon: BarChart2 }] },
	{ label: "Logistics", icon: Truck, subItems: [{ label: "Workshop Creator", icon: Briefcase }] },
	{ label: "Show Management", icon: Music, subItems: [{ label: "Confirmed Artists", icon: Users }] },
	{ label: "Rehearsals", icon: Mic, subItems: [] },
	{ label: "Stage", icon: Users, subItems: [] },
];

export function StageManagerTopbar({
	search,
	onSearchChange,
	onRefresh,
	onOpenProfile,
	onLogout,
	displayName,
	events,
	selectedEventId,
	onSelectEvent,
	artists,
	onSelectSearchResult,
	activeTab,
	onSelectTab,
}: StageManagerTopbarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const showDropdown = isOpen && search.trim().length > 0;
	const query = search.trim().toLowerCase();

	const matchingEvents = query && events
		? (() => {
				const matched = events.filter((e) =>
					[e.name, e.venueName, e.description]
						.filter(Boolean)
						.some((val) => val.toLowerCase().includes(query))
				);
				const seen = new Set<string>();
				return matched.filter((e) => {
					if (seen.has(e.id)) return false;
					seen.add(e.id);
					return true;
				});
		  })()
		: [];

	const matchingArtists = query && artists
		? (() => {
				const matched = artists.filter((a) => {
					const name = (a.artistName || a.artist_name || "").toLowerCase();
					const real = (a.realName || a.real_name || "").toLowerCase();
					const style = (a.style || "").toLowerCase();
					const email = (a.email || "").toLowerCase();
					return name.includes(query) || real.includes(query) || style.includes(query) || email.includes(query);
				});
				const seen = new Set<string>();
				return matched.filter((a) => {
					const key = `${a.id}-${a.eventId}`;
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				});
		  })()
		: [];

	const hasResults = matchingEvents.length > 0 || matchingArtists.length > 0;

	return (
		<div className="sticky top-0 z-[100] bg-white border-b border-slate-200 shadow-sm overflow-visible">
			{/* ── Row 1: Logo + Event selector + Search + User ── */}
			<div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-slate-100">
				{/* Logo */}
				<div className="flex items-center gap-2 shrink-0 mr-1">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white font-bold text-xs shadow">
						FM
					</div>
					<span className="font-bold text-slate-800 text-sm hidden sm:inline">FameManager</span>
				</div>

				{/* Event selector */}
				{events && events.length > 0 && onSelectEvent && (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="h-8 rounded-full border-slate-200 bg-white px-3 text-left font-medium max-w-[220px] justify-start text-sm"
							>
								<CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-fuchsia-600" />
								<span className="truncate flex-1 text-slate-700">
									{selectedEventId
										? events.find((e) => e.id === selectedEventId)?.name || "Select Event"
										: "All Events"}
								</span>
								<ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-[280px] rounded-xl p-2 z-50 bg-white shadow-xl border-slate-200">
							<div
								className={`cursor-pointer rounded-lg px-3 py-2 text-sm mb-1 ${!selectedEventId ? "bg-fuchsia-50 text-fuchsia-700 font-medium" : "hover:bg-slate-100 text-slate-600"}`}
								onClick={() => onSelectEvent(null)}
							>
								All Events (Dashboard)
							</div>
							{events.map((event) => (
								<div
									key={event.id}
									className={`cursor-pointer rounded-lg px-3 py-2 text-sm truncate ${selectedEventId === event.id ? "bg-fuchsia-50 text-fuchsia-700 font-medium" : "hover:bg-slate-100"}`}
									onClick={() => onSelectEvent(event.id)}
								>
									{event.name}
								</div>
							))}
						</PopoverContent>
					</Popover>
				)}

				{/* Search */}
				<div className="relative flex-1 max-w-md hidden sm:block">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<Input
						value={search}
						onChange={(e) => {
							onSearchChange(e.target.value);
							setIsOpen(true);
						}}
						onFocus={() => setIsOpen(true)}
						placeholder="Search artists, events..."
						className="h-8 rounded-full border-slate-200 bg-slate-50 pl-9 text-sm shadow-none"
					/>
					{showDropdown && (
						<div
							ref={dropdownRef}
							className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
						>
							{hasResults ? (
								<div className="space-y-3">
									{matchingEvents.length > 0 && (
										<div>
											<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
												<CalendarIcon className="h-3 w-3 text-fuchsia-600" />
												Events ({matchingEvents.length})
											</div>
											<div className="mt-1 flex flex-col gap-0.5">
												{matchingEvents.map((evt, idx) => (
													<button
														key={`${evt.id}-${idx}`}
														type="button"
														onClick={() => {
															onSelectSearchResult?.("event", evt.id);
															setIsOpen(false);
														}}
														className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-slate-50 transition-colors"
													>
														<span className="font-semibold text-slate-800 text-sm">{evt.name}</span>
														{evt.venueName && <span className="text-xs text-slate-400">{evt.venueName}</span>}
													</button>
												))}
											</div>
										</div>
									)}
									{matchingArtists.length > 0 && (
										<div>
											<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
												<User className="h-3 w-3 text-fuchsia-600" />
												Artists ({matchingArtists.length})
											</div>
											<div className="mt-1 flex flex-col gap-0.5">
												{matchingArtists.map((artist, idx) => {
													const artistName = artist.artistName || artist.artist_name || "Unknown Artist";
													return (
														<button
															key={`${artist.id}-${artist.eventId}-${idx}`}
															type="button"
															onClick={() => {
																onSelectSearchResult?.("artist", artist.id, artist.eventId);
																setIsOpen(false);
															}}
															className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50 transition-colors"
														>
															{artist.image_url ? (
																<img
																	src={artist.image_url.startsWith("/api") ? artist.image_url : `/api/media/${artist.image_url}`}
																	alt={artistName}
																	className="h-8 w-8 shrink-0 rounded-full object-cover"
																	onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
																/>
															) : (
																<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700">
																	{artistName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
																</div>
															)}
															<div className="flex-1 min-w-0">
																<span className="block font-semibold text-slate-800 text-sm truncate">{artistName}</span>
																<span className="block text-xs text-slate-400 truncate">
																	{artist.style ? `${artist.style} · ` : ""}{artist.eventName || ""}
																</span>
															</div>
														</button>
													);
												})}
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="p-4 text-center text-sm text-slate-400">No matches for "{search}"</div>
							)}
						</div>
					)}
				</div>

				<div className="flex-1" />

				{/* Notification + Avatar */}
				<div className="flex items-center gap-2">
					<NotificationBell />
					<Popover>
						<PopoverTrigger asChild>
							<button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-xs font-semibold text-white hover:ring-2 hover:ring-fuchsia-400 hover:ring-offset-1 transition-all">
								{getInitials(displayName) || "FM"}
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-52 p-2 rounded-xl shadow-xl border border-slate-200 bg-white z-50">
							<div className="px-2 py-2 border-b border-slate-100 mb-2">
								<p className="font-semibold text-slate-800 truncate text-sm">{displayName}</p>
								<p className="text-xs text-slate-500">Event Operations</p>
							</div>
							<div className="flex flex-col gap-1">
								<Button variant="ghost" onClick={onOpenProfile} className="w-full justify-start text-slate-700 hover:text-fuchsia-600 hover:bg-fuchsia-50 h-8 px-2 rounded-lg text-sm">
									<Settings className="mr-2 h-4 w-4" /> Settings
								</Button>
								<Button variant="ghost" onClick={onLogout} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 rounded-lg text-sm">
									<LogOut className="mr-2 h-4 w-4" /> Log out
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{/* ── Row 2: Nav tabs ── */}
			{onSelectTab && (
				<div className="flex items-center gap-1 px-4 md:px-6 overflow-x-visible">
					{NAV_TABS.map(({ label, icon: Icon, subItems }) => {
						const isActive = activeTab === label ||
							subItems.some((s) => s.label === activeTab);
						const hasDropdown = subItems.length > 0;

						if (!hasDropdown) {
							return (
								<button
									key={label}
									onClick={() => onSelectTab(label)}
									className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
										isActive
											? "border-fuchsia-600 text-fuchsia-700 bg-fuchsia-50/60"
											: "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
									}`}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{label}
								</button>
							);
						}

						return (
							<NavDropdown
								key={label}
								label={label}
								icon={Icon}
								subItems={subItems}
								isActive={isActive}
								activeTab={activeTab || ""}
								onSelectTab={onSelectTab}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}

function NavDropdown({
	label,
	icon: Icon,
	subItems,
	isActive,
	activeTab,
	onSelectTab,
}: {
	label: string;
	icon: React.ElementType;
	subItems: { label: string; icon: React.ElementType }[];
	isActive: boolean;
	activeTab: string;
	onSelectTab: (tab: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handler(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<div className="relative" ref={ref}>
			<div
				className={`flex items-center border-b-2 transition-colors ${
					isActive
						? "border-fuchsia-600 text-fuchsia-700 bg-fuchsia-50/60"
						: "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
				}`}
			>
				<button
					onClick={() => onSelectTab(label)}
					className="flex items-center gap-1.5 pl-3 pr-1 py-3 text-sm font-medium whitespace-nowrap"
				>
					<Icon className="h-4 w-4 shrink-0" />
					{label}
				</button>
				<button
					onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
					className="pr-2 py-3 flex items-center"
					aria-label="Show sub-items"
				>
					<ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
				</button>
			</div>

			{open && (
				<div className="absolute left-0 top-full z-[9999] mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-xl py-1">
					<button
						onClick={() => { onSelectTab(label); setOpen(false); }}
						className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
							activeTab === label ? "text-fuchsia-700 bg-fuchsia-50 font-medium" : "text-slate-600 hover:bg-slate-50"
						}`}
					>
						<Icon className="h-4 w-4 shrink-0" />
						{label}
					</button>
					<div className="my-1 border-t border-slate-100" />
					{subItems.map(({ label: subLabel, icon: SubIcon }) => (
						<button
							key={subLabel}
							onClick={() => { onSelectTab(subLabel); setOpen(false); }}
							className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
								activeTab === subLabel ? "text-fuchsia-700 bg-fuchsia-50 font-medium" : "text-slate-600 hover:bg-slate-50"
							}`}
						>
							<SubIcon className="h-4 w-4 shrink-0" />
							{subLabel}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
