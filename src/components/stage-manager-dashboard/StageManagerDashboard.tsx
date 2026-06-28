"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	AlertTriangle,
	CalendarDays,
	Loader2,
	LogOut,
	Plus,
} from "lucide-react";
import { NotificationProvider } from "@/components/NotificationProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Event } from "@/lib/types/event";
import { useSubscription } from "@/hooks/useSubscription";
import { useWebSocket } from "@/hooks/useWebSocket";
import { UpgradeModal } from "@/components/UpgradeModal";
import { StageManagerSidebar } from "./StageManagerSidebar";
import { StageManagerTopbar } from "./StageManagerTopbar";
import { StageManagerEventCard } from "./StageManagerEventCard";
import ArtistManagement from "@/app/stage-manager/events/[eventId]/artists/page";
import ShowDatesPage from "@/app/stage-manager/events/[eventId]/show-dates/page";
import RehearsalSchedule from "@/app/stage-manager/events/[eventId]/rehearsal/page";
import PerformanceOrder from "@/app/stage-manager/events/[eventId]/performance-order/page";
import CostAnalysis from "./CostAnalysis";
import ConfirmedArtists from "./ConfirmedArtists";
import Communication from "./Communication";
import ArtistFiles from "./ArtistFiles";
import Logistics from "./Logistics";
import WorkshopCreator from "./WorkshopCreator";
import CreateEvent from "./CreateEvent";
import ProfilePage from "@/app/stage-manager/profile/page";


interface StageManagerUser {
	id: string;
	email: string;
	role: string;
	profile?: {
		firstName?: string;
		lastName?: string;
	};
}

interface StageManagerDashboardProps {
	initialEventId?: string;
}

export function StageManagerDashboard({ initialEventId }: StageManagerDashboardProps = {}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [user, setUser] = useState<StageManagerUser | null>(null);
	const [events, setEvents] = useState<Event[]>([]);
	const [eventsLoading, setEventsLoading] = useState(true);
	const [isInitializing, setIsInitializing] = useState(true);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState(() => {
		const tab = searchParams.get("tab");
		if (
			tab === "Dashboard" ||
			tab === "Artist Files" ||
			tab === "Cost Analysis" ||
			tab === "Logistics" ||
			tab === "Workshop Creator" ||
			tab === "Show Management" ||
			tab === "Confirmed Artists" ||
			tab === "Rehearsals" ||
			tab === "Stage" ||
			tab === "Settings" ||
			tab === "Create Event"
		) {
			return tab;
		}
		return initialEventId ? "Show Management" : "Dashboard";
	});

	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, [searchParams]);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId || null);
	const [search, setSearch] = useState("");
	const [allArtists, setAllArtists] = useState<any[]>([]);
	const [selectedSearchArtistId, setSelectedSearchArtistId] = useState<string | null>(null);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
	const [deleting, setDeleting] = useState(false);
	const returnedFromCheckoutRef = useRef(false);

	const {
		data: subData,
		loading: subscriptionLoading,
		justUpgraded,
		clearUpgraded,
		planType,
	} = useSubscription();

	const canCreate = true;

	const displayName = useMemo(() => {
		if (!user) return "Fame Manager";
		const fullName = [user.profile?.firstName, user.profile?.lastName]
			.filter(Boolean)
			.join(" ")
			.trim();
		return fullName || user.email || "Fame Manager";
	}, [user]);

	const filteredEvents = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return events;
		return events.filter((event) =>
			[event.name, event.venueName, event.description]
				.filter(Boolean)
				.some((value) => value.toLowerCase().includes(query)),
		);
	}, [events, search]);

	const loadUserProfile = async () => {
		try {
			const response = await fetch("/api/stage-manager/profile");
			if (response.ok) {
				const result = await response.json();
				setUser(result.data?.user || null);
			} else if (response.status === 401) {
				window.location.href = "/stagemanager-login";
			}
		} catch (error) {
			console.error("Failed to load stage manager profile:", error);
		}
	};

	const loadAllArtists = async (eventList: Event[]) => {
		try {
			const promises = eventList.map(async (evt) => {
				const res = await fetch(`/api/events/${evt.id}/artists`);
				if (res.ok) {
					const json = await res.json();
					if (json.success && Array.isArray(json.data)) {
						return json.data.map((artist: any) => ({
							...artist,
							eventName: evt.name,
							eventId: evt.id,
						}));
					}
				}
				return [];
			});
			const results = await Promise.all(promises);
			const flatArtists = results.flat();
			setAllArtists(flatArtists);
		} catch (error) {
			console.error("Failed to load artists for search:", error);
		}
	};

	const loadEvents = async () => {
		try {
			setEventsLoading(true);
			const response = await fetch("/api/events");
			if (response.ok) {
				const result = await response.json();
				const loadedEvents = result.data || [];
				setEvents(loadedEvents);
				loadAllArtists(loadedEvents);
			} else if (response.status === 401) {
				window.location.href = "/stagemanager-login";
			}
		} catch (error) {
			console.error("Failed to load stage manager events:", error);
		} finally {
			setEventsLoading(false);
		}
	};

	useEffect(() => {
		if (returnedFromCheckoutRef.current) return;
		if (searchParams.get("upgraded") === "true") {
			returnedFromCheckoutRef.current = true;
			sessionStorage.setItem("stripe_checkout_returned", "true");
			setUpgradeModalOpen(true);
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, [searchParams]);

	useEffect(() => {
		const refreshSessionIfNeeded = async () => {
			try {
				const response = await fetch("/api/auth/refresh-session", {
					method: "POST",
				});
				if (response.ok) {
					const result = await response.json();
					if (
						result.success &&
						result.data?.user?.status === "pending"
					) {
						router.push("/stage-manager-pending");
					}
				} else if (response.status === 401) {
					window.location.href = "/stagemanager-login";
				}
			} catch (error) {
				console.error("Failed to refresh session:", error);
			}
		};

		const init = async () => {
			setIsInitializing(true);
			await refreshSessionIfNeeded();
			await Promise.all([loadUserProfile(), loadEvents()]);
			setIsInitializing(false);
		};

		init();
	}, [router]);

	useEffect(() => {
		if (justUpgraded) {
			loadEvents();
		}
	}, [justUpgraded]);

	useWebSocket({
		userId: user?.id,
		role: "stage_manager",
		onAdminNotification: (data) => {
			if (
				data.action === "deactivate" ||
				data.action === "delete" ||
				data.action === "changeCredentials"
			) {
				setTimeout(() => {
					router.push("/login");
				}, 2500);
			}
		},
	});

	const handleLogout = async () => {
		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
			});
			if (response.ok) {
				window.location.href = "/stagemanager-login";
			}
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	const handleDeleteClick = (event: Event) => {
		setEventToDelete(event);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!eventToDelete) return;

		try {
			setDeleting(true);
			const response = await fetch(`/api/events/${eventToDelete.id}`, {
				method: "DELETE",
			});
			if (response.ok) {
				setDeleteDialogOpen(false);
				setEventToDelete(null);
				loadEvents();
			}
		} catch (error) {
			console.error("Failed to delete event:", error);
		} finally {
			setDeleting(false);
		}
	};

	if (isInitializing) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f5fb]">
				<Loader2 className="mb-4 h-12 w-12 animate-spin text-fuchsia-600" />
				<p className="text-lg font-medium text-slate-600">Loading your dashboard...</p>
			</div>
		);
	}

	return (
		<NotificationProvider userRole="stage-manager">
			<div className="fixed inset-0 overflow-hidden bg-[#f6f5fb] text-slate-950 flex">
				<div className="flex h-screen min-w-0 flex-1 flex-col overflow-visible">
					<StageManagerTopbar
						search={search}
						onSearchChange={setSearch}
						onRefresh={() => {
							loadUserProfile();
							loadEvents();
						}}
						onOpenProfile={() => setActiveTab("Settings")}
						onLogout={handleLogout}
						displayName={displayName}
						events={events}
						selectedEventId={selectedEventId}
						onSelectEvent={(id) => {
							setSelectedEventId(id);
							if (id) {
								if (activeTab === "Dashboard") {
									setActiveTab("Show Management");
								}
							} else {
								setActiveTab("Dashboard");
							}
						}}
						artists={allArtists}
						onSelectSearchResult={(type, id, eventId) => {
							if (type === "event") {
								setSelectedEventId(id);
								setActiveTab("Show Management");
								setSearch("");
							} else if (type === "artist") {
								if (eventId) {
									setSelectedEventId(eventId);
									setSelectedSearchArtistId(id);
									setActiveTab("Artist Files");
									setSearch("");
								}
							}
						}}
						activeTab={activeTab}
						onSelectTab={(tab) => {
							if (tab === "Dashboard") {
								setSelectedEventId(null);
							}
							setSelectedSearchArtistId(null);
							setActiveTab(tab);
						}}
					/>

					<div className="flex-1 overflow-y-auto overscroll-none px-4 py-5 md:px-5">
						{(activeTab === "Dashboard" || (!selectedEventId && activeTab !== "Create Event" && activeTab !== "Settings")) && (
							<>
								<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
									<div>
										<div className="flex items-center gap-3">
											<CalendarDays className="h-6 w-6 text-fuchsia-600" />
											<h1 className="text-3xl font-semibold tracking-tight">
												{activeTab === "Dashboard" ? "My Events" : "Please Select an Event"}
											</h1>
											<Badge className="rounded-full bg-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-200">
												{filteredEvents.length}
											</Badge>
										</div>
										<p className="mt-2 text-sm text-slate-500">
											{activeTab === "Dashboard" 
												? `${displayName}${user?.email ? ` - ${user.email}` : ""}`
												: `Choose an event to access the ${activeTab} section.`}
										</p>
									</div>

									<div className="flex items-center gap-3">
										<Button
											onClick={() => setActiveTab("Create Event")}
											className="h-10 rounded-2xl bg-fuchsia-600 px-5 text-white hover:bg-fuchsia-700"
										>
											<Plus className="mr-2 h-4 w-4" />
											Create Event
										</Button>
									</div>
								</div>

								{eventsLoading ? (
									<div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
										<div className="text-center">
											<Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-fuchsia-600" />
											<p className="text-sm text-slate-500">
												Loading your events...
											</p>
										</div>
									</div>
								) : filteredEvents.length === 0 ? (
									<div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
										<h2 className="text-2xl font-semibold">
											{events.length === 0
												? "No events yet"
												: "No events match your search"}
										</h2>
										<p className="mt-3 text-slate-500">
											{events.length === 0
												? "Create your first event from the top right button."
												: "Try a different search term to find your event."}
										</p>
									</div>
								) : (
									<div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
										{filteredEvents.map((event) => (
											<StageManagerEventCard
												key={event.id}
												event={event}
												onDelete={handleDeleteClick}
												manageButtonText={activeTab === "Dashboard" ? "Manage Event" : "Select this Event"}
												onManage={(evt) => {
													setSelectedEventId(evt.id);
													if (activeTab === "Dashboard") {
														setActiveTab("Show Management");
													}
												}}
												onEdit={(evt) => {
													setSelectedEventId(evt.id);
													setActiveTab("Create Event");
												}}
											/>
										))}
									</div>
								)}
							</>
						)}
						{activeTab === "Show Management" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)] relative">
								<ArtistManagement providedEventId={selectedEventId} onTabChange={setActiveTab} />
							</div>
						)}
						{activeTab === "Show Dates" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)] relative">
								<ShowDatesPage providedEventId={selectedEventId} onTabChange={setActiveTab} />
							</div>
						)}
						{activeTab === "Rehearsals" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)] relative">
								<RehearsalSchedule
									providedEventId={selectedEventId}
									onTabChange={setActiveTab}
								/>
							</div>
						)}
						{activeTab === "Stage" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)] relative">
								<PerformanceOrder
									providedEventId={selectedEventId}
									onTabChange={setActiveTab}
								/>
							</div>
						)}
						{activeTab === "Cost Analysis" && selectedEventId && (
							<CostAnalysis providedEventId={selectedEventId} />
						)}
						{activeTab === "Confirmed Artists" && selectedEventId && (
							<ConfirmedArtists providedEventId={selectedEventId} />
						)}
						{activeTab === "Communication" && selectedEventId && (
							<Communication providedEventId={selectedEventId} />
						)}
						{activeTab === "Artist Files" && selectedEventId && (
							<ArtistFiles 
								providedEventId={selectedEventId} 
								eventData={events.find(e => e.id === selectedEventId)}
								onBack={() => {
									setSelectedSearchArtistId(null);
									setActiveTab("Dashboard");
								}} 
								initialArtistId={selectedSearchArtistId}
							/>
						)}
						{activeTab === "Logistics" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)]">
								<Logistics providedEventId={selectedEventId} />
							</div>
						)}
						{activeTab === "Workshop Creator" && selectedEventId && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)]">
								<WorkshopCreator providedEventId={selectedEventId} />
							</div>
						)}
						{activeTab === "Create Event" && (
							<CreateEvent
								editEventId={selectedEventId || undefined}
								onSuccess={() => {
									loadEvents();
									setActiveTab("Dashboard");
									setSelectedEventId(null);
								}}
								onCancel={() => {
									setActiveTab("Dashboard");
									setSelectedEventId(null);
								}}
							/>
						)}
						{activeTab === "Settings" && (
							<div className="rounded-[28px] bg-white shadow-sm overflow-hidden min-h-[calc(100vh-120px)] p-6 md:p-8">
								<ProfilePage isDashboardTab={true} />
							</div>
						)}
				</div>
			</div>
		</div>

			<UpgradeModal
				open={upgradeModalOpen}
				onOpenChange={(open) => {
					setUpgradeModalOpen(open);
					if (!open) clearUpgraded();
				}}
				type="stage_manager"
				currentCount={subData?.currentEventCount ?? events.length}
				maxCount={subData?.maxEvents ?? 1}
				justUpgraded={justUpgraded}
				planType={planType}
				userEmail={subData?.userEmail}
				userId={subData?.userId}
				returnedFromCheckout={returnedFromCheckoutRef.current}
				onGoCreate={() => setActiveTab("Create Event")}
			/>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center">
							<AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
							Delete Event
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{eventToDelete?.name}"?
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							disabled={deleting}
						>
							{deleting ? "Deleting..." : "Delete Event"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</NotificationProvider>
	);
}
