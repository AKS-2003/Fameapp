import React, { createContext, useContext, useState, useCallback } from "react";
import {
	WSEvent,
	WSDay,
	WSVenue,
	WSRoom,
	WSArtist,
	WSCategory,
	WSPassType,
	WSWorkshop,
	WSBlockedTime,
	WSTimeSettings,
	WSLevelConfig,
	WSLevel,
	WSConflict,
	DEFAULT_LEVELS,
	levelsToConfigs,
} from "@/sample_types/workshop";
import {
	mockEvents,
	mockDays,
	mockVenues,
	mockRooms,
	mockArtists,
	mockCategories,
	mockPassTypes,
	mockWorkshops,
	mockBlockedTimes,
	defaultTimeSettings,
	mockLevels,
} from "@/sample_data/workshopMockData";
import { detectAllConflicts } from "@/sample_lib/workshopConflicts";

interface WorkshopContextType {
	// Data
	events: WSEvent[];
	days: WSDay[];
	venues: WSVenue[];
	rooms: WSRoom[];
	artists: WSArtist[];
	categories: WSCategory[];
	passTypes: WSPassType[];
	workshops: WSWorkshop[];
	blockedTimes: WSBlockedTime[];
	timeSettings: WSTimeSettings;
	levels: WSLevel[];
	levelConfigs: WSLevelConfig[];
	selectedEventId: string | null;

	// Selection
	setSelectedEventId: (id: string | null) => void;

	// CRUD - Events
	addEvent: (e: Omit<WSEvent, "id" | "createdAt">) => WSEvent;
	updateEvent: (e: WSEvent) => void;
	deleteEvent: (id: string) => void;

	// CRUD - Days
	addDay: (d: Omit<WSDay, "id">) => void;
	updateDay: (d: WSDay) => void;
	deleteDay: (id: string) => void;

	// CRUD - Venues
	addVenue: (v: Omit<WSVenue, "id">) => void;
	updateVenue: (v: WSVenue) => void;
	deleteVenue: (id: string) => void;

	// CRUD - Rooms
	addRoom: (r: Omit<WSRoom, "id">) => void;
	updateRoom: (r: WSRoom) => void;
	deleteRoom: (id: string) => void;

	// CRUD - Artists
	addArtist: (a: Omit<WSArtist, "id">) => void;
	updateArtist: (a: WSArtist) => void;
	deleteArtist: (id: string) => void;

	// CRUD - Categories
	addCategory: (c: Omit<WSCategory, "id">) => void;
	deleteCategory: (id: string) => void;

	// CRUD - Pass Types
	addPassType: (p: Omit<WSPassType, "id">) => void;
	deletePassType: (id: string) => void;

	// CRUD - Workshops
	addWorkshop: (w: Omit<WSWorkshop, "id">) => void;
	updateWorkshop: (w: WSWorkshop) => void;
	deleteWorkshop: (id: string) => void;
	duplicateWorkshop: (id: string) => void;

	// CRUD - Blocked Times
	addBlockedTime: (b: Omit<WSBlockedTime, "id">) => void;
	deleteBlockedTime: (id: string) => void;

	// Settings
	updateTimeSettings: (s: WSTimeSettings) => void;
	updateLevelConfigs: (configs: WSLevelConfig[]) => void;

	// Helpers
	getEventDays: (eventId: string) => WSDay[];
	getEventRooms: (eventId: string) => WSRoom[];
	getEventArtists: (eventId: string) => WSArtist[];
	getEventWorkshops: (eventId: string) => WSWorkshop[];
	getDayWorkshops: (dayId: string) => WSWorkshop[];
	getArtistById: (id: string) => WSArtist | undefined;
	getRoomById: (id: string) => WSRoom | undefined;
	getCategoryById: (id: string) => WSCategory | undefined;

	// Conflict detection
	getWorkshopConflicts: (workshop: WSWorkshop) => WSConflict[];
}

const WorkshopContext = createContext<WorkshopContextType | null>(null);

let nextId = 100;
const genId = (prefix: string) => `${prefix}-${nextId++}`;

export const WorkshopProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [events, setEvents] = useState<WSEvent[]>(mockEvents);
	const [days, setDays] = useState<WSDay[]>(mockDays);
	const [venues, setVenues] = useState<WSVenue[]>(mockVenues);
	const [rooms, setRooms] = useState<WSRoom[]>(mockRooms);
	const [artists, setArtists] = useState<WSArtist[]>(mockArtists);
	const [categories, setCategories] = useState<WSCategory[]>(mockCategories);
	const [passTypes, setPassTypes] = useState<WSPassType[]>(mockPassTypes);
	const [workshops, setWorkshops] = useState<WSWorkshop[]>(mockWorkshops);
	const [blockedTimes, setBlockedTimes] =
		useState<WSBlockedTime[]>(mockBlockedTimes);
	const [timeSettings, setTimeSettings] =
		useState<WSTimeSettings>(defaultTimeSettings);
	const [levels] = useState<WSLevel[]>(mockLevels);
	const [levelConfigs, setLevelConfigs] = useState<WSLevelConfig[]>(
		levelsToConfigs(DEFAULT_LEVELS),
	);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(
		"evt-1",
	);

	// Events
	const addEvent = useCallback((e: Omit<WSEvent, "id" | "createdAt">) => {
		const newEvent: WSEvent = {
			...e,
			id: genId("evt"),
			createdAt: new Date().toISOString(),
		};
		setEvents((prev) => [...prev, newEvent]);
		return newEvent;
	}, []);
	const updateEvent = useCallback(
		(e: WSEvent) =>
			setEvents((prev) => prev.map((x) => (x.id === e.id ? e : x))),
		[],
	);
	const deleteEvent = useCallback(
		(id: string) => setEvents((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Days
	const addDay = useCallback(
		(d: Omit<WSDay, "id">) =>
			setDays((prev) => [...prev, { ...d, id: genId("day") }]),
		[],
	);
	const updateDay = useCallback(
		(d: WSDay) =>
			setDays((prev) => prev.map((x) => (x.id === d.id ? d : x))),
		[],
	);
	const deleteDay = useCallback(
		(id: string) => setDays((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Venues
	const addVenue = useCallback(
		(v: Omit<WSVenue, "id">) =>
			setVenues((prev) => [...prev, { ...v, id: genId("ven") }]),
		[],
	);
	const updateVenue = useCallback(
		(v: WSVenue) =>
			setVenues((prev) => prev.map((x) => (x.id === v.id ? v : x))),
		[],
	);
	const deleteVenue = useCallback(
		(id: string) => setVenues((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Rooms
	const addRoom = useCallback(
		(r: Omit<WSRoom, "id">) =>
			setRooms((prev) => [...prev, { ...r, id: genId("room") }]),
		[],
	);
	const updateRoom = useCallback(
		(r: WSRoom) =>
			setRooms((prev) => prev.map((x) => (x.id === r.id ? r : x))),
		[],
	);
	const deleteRoom = useCallback(
		(id: string) => setRooms((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Artists
	const addArtist = useCallback(
		(a: Omit<WSArtist, "id">) =>
			setArtists((prev) => [...prev, { ...a, id: genId("art") }]),
		[],
	);
	const updateArtist = useCallback(
		(a: WSArtist) =>
			setArtists((prev) => prev.map((x) => (x.id === a.id ? a : x))),
		[],
	);
	const deleteArtist = useCallback(
		(id: string) => setArtists((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Categories
	const addCategory = useCallback(
		(c: Omit<WSCategory, "id">) =>
			setCategories((prev) => [...prev, { ...c, id: genId("cat") }]),
		[],
	);
	const deleteCategory = useCallback(
		(id: string) =>
			setCategories((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Pass Types
	const addPassType = useCallback(
		(p: Omit<WSPassType, "id">) =>
			setPassTypes((prev) => [...prev, { ...p, id: genId("pass") }]),
		[],
	);
	const deletePassType = useCallback(
		(id: string) => setPassTypes((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Workshops
	const addWorkshop = useCallback(
		(w: Omit<WSWorkshop, "id">) =>
			setWorkshops((prev) => [...prev, { ...w, id: genId("ws") }]),
		[],
	);
	const updateWorkshop = useCallback(
		(w: WSWorkshop) =>
			setWorkshops((prev) => prev.map((x) => (x.id === w.id ? w : x))),
		[],
	);
	const deleteWorkshop = useCallback(
		(id: string) => setWorkshops((prev) => prev.filter((x) => x.id !== id)),
		[],
	);
	const duplicateWorkshop = useCallback((id: string) => {
		setWorkshops((prev) => {
			const ws = prev.find((x) => x.id === id);
			if (!ws) return prev;
			return [
				...prev,
				{
					...ws,
					id: genId("ws"),
					title: `${ws.title} (copy)`,
					isLocked: false,
				},
			];
		});
	}, []);

	// Blocked Times
	const addBlockedTime = useCallback(
		(b: Omit<WSBlockedTime, "id">) =>
			setBlockedTimes((prev) => [...prev, { ...b, id: genId("bt") }]),
		[],
	);
	const deleteBlockedTime = useCallback(
		(id: string) =>
			setBlockedTimes((prev) => prev.filter((x) => x.id !== id)),
		[],
	);

	// Settings
	const updateTimeSettings = useCallback(
		(s: WSTimeSettings) => setTimeSettings(s),
		[],
	);
	const updateLevelConfigs = useCallback(
		(configs: WSLevelConfig[]) => setLevelConfigs(configs),
		[],
	);

	// Helpers
	const getEventDays = useCallback(
		(eventId: string) =>
			days
				.filter((d) => d.eventId === eventId)
				.sort((a, b) => a.sortOrder - b.sortOrder),
		[days],
	);
	const getEventRooms = useCallback(
		(eventId: string) =>
			rooms
				.filter((r) => r.eventId === eventId && r.isActive)
				.sort((a, b) => a.sortOrder - b.sortOrder),
		[rooms],
	);
	const getEventArtists = useCallback(
		(eventId: string) =>
			artists.filter(
				(a) => (a.eventId === eventId || !a.eventId) && a.isActive,
			),
		[artists],
	);
	const getEventWorkshops = useCallback(
		(eventId: string) => workshops.filter((w) => w.eventId === eventId),
		[workshops],
	);
	const getDayWorkshops = useCallback(
		(dayId: string) =>
			workshops
				.filter((w) => w.dayId === dayId)
				.sort((a, b) => a.sortOrder - b.sortOrder),
		[workshops],
	);
	const getArtistById = useCallback(
		(id: string) => artists.find((a) => a.id === id),
		[artists],
	);
	const getRoomById = useCallback(
		(id: string) => rooms.find((r) => r.id === id),
		[rooms],
	);
	const getCategoryById = useCallback(
		(id: string) => categories.find((c) => c.id === id),
		[categories],
	);

	// Conflict detection
	const getWorkshopConflicts = useCallback(
		(workshop: WSWorkshop): WSConflict[] => {
			return detectAllConflicts(
				workshop,
				workshops,
				blockedTimes,
				timeSettings.dayStartTime,
				timeSettings.dayEndTime,
			);
		},
		[workshops, blockedTimes, timeSettings],
	);

	return (
		<WorkshopContext.Provider
			value={{
				events,
				days,
				venues,
				rooms,
				artists,
				categories,
				passTypes,
				workshops,
				blockedTimes,
				timeSettings,
				levels,
				levelConfigs,
				selectedEventId,
				setSelectedEventId,
				addEvent,
				updateEvent,
				deleteEvent,
				addDay,
				updateDay,
				deleteDay,
				addVenue,
				updateVenue,
				deleteVenue,
				addRoom,
				updateRoom,
				deleteRoom,
				addArtist,
				updateArtist,
				deleteArtist,
				addCategory,
				deleteCategory,
				addPassType,
				deletePassType,
				addWorkshop,
				updateWorkshop,
				deleteWorkshop,
				duplicateWorkshop,
				addBlockedTime,
				deleteBlockedTime,
				updateTimeSettings,
				updateLevelConfigs,
				getEventDays,
				getEventRooms,
				getEventArtists,
				getEventWorkshops,
				getDayWorkshops,
				getArtistById,
				getRoomById,
				getCategoryById,
				getWorkshopConflicts,
			}}
		>
			{children}
		</WorkshopContext.Provider>
	);
};

export const useWorkshop = () => {
	const ctx = useContext(WorkshopContext);
	if (!ctx)
		throw new Error("useWorkshop must be used within WorkshopProvider");
	return ctx;
};
