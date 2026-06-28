"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings, CalendarIcon, ChevronDown, LogOut, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationProvider";
import { Event } from "@/lib/types/event";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

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
}

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() || "")
		.join("");
}

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
}: StageManagerTopbarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
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
		<div className="sticky top-0 z-[100] border-b border-slate-200 bg-white/90 backdrop-blur">
			<div className="flex flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
				<div className="flex items-center gap-4 flex-1">
					{events && events.length > 0 && onSelectEvent && (
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-left font-medium min-w-[240px] max-w-[300px] justify-start shadow-sm overflow-hidden">
									<CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-fuchsia-600" />
									<span className="truncate flex-1 text-slate-800">
										{selectedEventId
											? events.find((e) => e.id === selectedEventId)?.name || "Select Event"
											: "All Events (Dashboard)"}
									</span>
									<ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-[300px] rounded-xl p-2 z-50 bg-white shadow-xl border-slate-200">
								{events.map((event) => (
									<div
										key={event.id}
										className={`cursor-pointer rounded-lg px-3 py-2 truncate block w-full ${selectedEventId === event.id ? 'bg-fuchsia-50 text-fuchsia-700 font-medium' : 'hover:bg-slate-100'}`}
										onClick={() => {
											onSelectEvent(event.id);
											// Close popover handled naturally by selecting, but here it's custom div, Popover Close might be needed, or we just let it be.
										}}
									>
										{event.name}
									</div>
								))}
							</PopoverContent>
						</Popover>
					)}

					<div className="relative max-w-xl flex-1 hidden sm:block">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
						<Input
							value={search}
							onChange={(e) => {
								onSearchChange(e.target.value);
								setIsOpen(true);
							}}
							onFocus={() => setIsOpen(true)}
							placeholder="Search artists, events..."
							className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-12 text-base shadow-none w-full"
						/>
						{showDropdown && (
							<div
								ref={dropdownRef}
								className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl scroll-smooth"
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
															{evt.venueName && (
																<span className="text-xs text-slate-400 font-medium">{evt.venueName}</span>
															)}
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
																		className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm"
																		onError={(e) => {
																			(e.target as HTMLElement).style.display = 'none';
																		}}
																	/>
																) : (
																	<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700">
																		{artistName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
																	</div>
																)}
																<div className="flex-1 min-w-0">
																	<span className="block font-semibold text-slate-800 text-sm truncate">{artistName}</span>
																	<span className="block text-xs text-slate-400 font-medium truncate">
																		{artist.style ? `${artist.style} • ` : ""}{artist.eventName || "Event"}
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
									<div className="p-4 text-center text-sm text-slate-400 font-medium">
										No matches found for "{search}"
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<NotificationBell />

					<Popover>
						<PopoverTrigger asChild>
							<button className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-sm font-semibold text-white focus:outline-none hover:ring-2 hover:ring-fuchsia-400 hover:ring-offset-2 transition-all">
								{getInitials(displayName) || "FM"}
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-56 p-2 rounded-xl shadow-xl border border-slate-200 bg-white z-50">
							<div className="px-2 py-2 border-b border-slate-100 mb-2">
								<p className="font-semibold text-slate-800 truncate">{displayName}</p>
								<p className="text-xs text-slate-500 truncate">Event Operations</p>
							</div>
							<div className="flex flex-col gap-1">
								<Button
									variant="ghost"
									onClick={onOpenProfile}
									className="w-full justify-start text-slate-700 hover:text-fuchsia-600 hover:bg-fuchsia-50 h-9 px-2 rounded-lg"
								>
									<Settings className="mr-2 h-4 w-4" />
									Settings
								</Button>
								<Button
									variant="ghost"
									onClick={onLogout}
									className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-2 rounded-lg"
								>
									<LogOut className="mr-2 h-4 w-4" />
									Log out
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	);
}
