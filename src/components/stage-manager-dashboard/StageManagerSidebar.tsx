"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
	BarChart2,
	Briefcase,
	CalendarDays,
	ChevronDown,
	ChevronRight,
	LayoutGrid,
	MessageSquare,
	Mic,
	Music,
	Music2,
	ShieldAlert,
	Truck,
	Users,
} from "lucide-react";

interface StageManagerSidebarProps {
	collapsed: boolean;
	onToggle: () => void;
	activeTab: string;
	onSelectTab: (tab: string) => void;
}

const ARTIST_FILES_TABS = ["Artist Files", "Cost Analysis"];
const LOGISTICS_TABS = ["Logistics", "Workshop Creator"];
const SHOW_MGMT_TABS = ["Show Management", "Confirmed Artists"];

export function StageManagerSidebar({
	collapsed,
	onToggle,
	activeTab,
	onSelectTab,
}: StageManagerSidebarProps) {
	const [artistFilesOpen, setArtistFilesOpen] = useState(
		ARTIST_FILES_TABS.includes(activeTab),
	);
	const [logisticsOpen, setLogisticsOpen] = useState(
		LOGISTICS_TABS.includes(activeTab),
	);
	const [showMgmtOpen, setShowMgmtOpen] = useState(
		SHOW_MGMT_TABS.includes(activeTab),
	);

	const isActive = (...tabs: string[]) => tabs.includes(activeTab);

	return (
		<aside
			className={cn(
				"hidden lg:flex h-screen sticky top-0 shrink-0 flex-col border-r border-white/10 bg-[#1d1729] text-white transition-all duration-300 overflow-y-auto",
				collapsed ? "w-[88px]" : "w-[260px]",
			)}
		>
			{/* Logo */}
			<div className="flex h-[72px] items-center border-b border-white/10 px-5 shrink-0">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 font-bold text-sm shadow-lg shadow-fuchsia-900/30 shrink-0">
					FM
				</div>
				{!collapsed && (
					<div className="ml-3 min-w-0">
						<p className="text-[13px] font-semibold leading-none">
							FameManager
						</p>
						<p className="mt-1 text-xs text-white/65">
							Event Operations
						</p>
					</div>
				)}
			</div>

			{/* Nav */}
			<nav className="flex-1 space-y-0.5 px-2.5 py-4">
				{/* Dashboard */}
				<NavButton
					label="Dashboard"
					icon={LayoutGrid}
					active={activeTab === "Dashboard"}
					collapsed={collapsed}
					onClick={() => onSelectTab("Dashboard")}
				/>

				{/* ── Artist Files ── */}
				<ExpandableGroup
					label="Artist Files"
					icon={Users}
					isActive={isActive(...ARTIST_FILES_TABS)}
					isOpen={artistFilesOpen}
					collapsed={collapsed}
					onToggle={() => {
						if (collapsed) {
							onSelectTab("Artist Files");
						} else {
							setArtistFilesOpen((v) => !v);
							if (!artistFilesOpen) onSelectTab("Artist Files");
						}
					}}
					subItems={[
						{
							label: "Cost Analysis",
							icon: BarChart2,
							active: activeTab === "Cost Analysis",
							onClick: () => onSelectTab("Cost Analysis"),
						},
					]}
				/>

				{/* ── Logistics ── */}
				<ExpandableGroup
					label="Logistics"
					icon={Truck}
					isActive={isActive(...LOGISTICS_TABS)}
					isOpen={logisticsOpen}
					collapsed={collapsed}
					onToggle={() => {
						if (collapsed) {
							onSelectTab("Logistics");
						} else {
							setLogisticsOpen((v) => !v);
							if (!logisticsOpen) onSelectTab("Logistics");
						}
					}}
					subItems={[
						{
							label: "Workshop Creator",
							icon: Briefcase,
							active: activeTab === "Workshop Creator",
							onClick: () => onSelectTab("Workshop Creator"),
						},
					]}
				/>

				{/* ── Show Management ── */}
				<ExpandableGroup
					label="Show Management"
					icon={CalendarDays}
					isActive={isActive(...SHOW_MGMT_TABS)}
					isOpen={showMgmtOpen}
					collapsed={collapsed}
					onToggle={() => {
						if (collapsed) {
							onSelectTab("Show Management");
						} else {
							setShowMgmtOpen((v) => !v);
							if (!showMgmtOpen) onSelectTab("Show Management");
						}
					}}
					subItems={[
						{
							label: "Confirmed Artists",
							icon: Music,
							active: activeTab === "Confirmed Artists",
							onClick: () => onSelectTab("Confirmed Artists"),
						},
					]}
				/>

				{/* Rehearsals */}
				<NavButton
					label="Rehearsals"
					icon={Music2}
					active={activeTab === "Rehearsals"}
					collapsed={collapsed}
					onClick={() => onSelectTab("Rehearsals")}
				/>

				{/* Stage */}
				<NavButton
					label="Stage"
					icon={Mic}
					active={activeTab === "Stage"}
					collapsed={collapsed}
					onClick={() => onSelectTab("Stage")}
				/>


			</nav>

			{/* Collapse toggle */}
			<div className="border-t border-white/10 p-3 shrink-0">
				<button
					type="button"
					onClick={onToggle}
					className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/75 transition hover:bg-white/10 hover:text-white"
				>
					{collapsed ? ">" : "<"}
				</button>
			</div>
		</aside>
	);
}

// ── Reusable expandable group ──────────────────────────────────
function ExpandableGroup({
	label,
	icon: Icon,
	isActive,
	isOpen,
	collapsed,
	onToggle,
	subItems,
}: {
	label: string;
	icon: React.ElementType;
	isActive: boolean;
	isOpen: boolean;
	collapsed: boolean;
	onToggle: () => void;
	subItems: {
		label: string;
		icon: React.ElementType;
		active: boolean;
		onClick: () => void;
	}[];
}) {
	return (
		<div>
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"flex w-full items-center rounded-xl px-3.5 py-2.5 text-left transition-colors",
					isActive
						? "bg-white/8 text-fuchsia-400"
						: "text-white/70 hover:bg-white/6 hover:text-white",
					collapsed ? "justify-center" : "gap-3",
				)}
			>
				<Icon className="h-5 w-5 shrink-0" />
				{!collapsed && (
					<>
						<span className="flex-1 text-[14px] font-medium">{label}</span>
						{isOpen ? (
							<ChevronDown className="h-3.5 w-3.5 text-white/50" />
						) : (
							<ChevronRight className="h-3.5 w-3.5 text-white/50" />
						)}
					</>
				)}
			</button>

			{!collapsed && isOpen && (
				<div className="mt-0.5 ml-3.5 border-l border-white/10 pl-3">
					{subItems.map((item) => {
						const SubIcon = item.icon;
						return (
							<button
								key={item.label}
								type="button"
								onClick={item.onClick}
								className={cn(
									"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
									item.active
										? "bg-white/8 text-fuchsia-400"
										: "text-white/55 hover:bg-white/6 hover:text-white",
								)}
							>
								<SubIcon className="h-3.5 w-3.5 shrink-0" />
								<span className="font-medium">{item.label}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ── Simple nav button ──────────────────────────────────────────
function NavButton({
	label,
	icon: Icon,
	active,
	collapsed,
	onClick,
}: {
	label: string;
	icon: React.ElementType;
	active: boolean;
	collapsed: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center rounded-xl px-3.5 py-2.5 text-left transition-colors",
				active
					? "bg-white/8 text-fuchsia-400"
					: "text-white/70 hover:bg-white/6 hover:text-white",
				collapsed ? "justify-center" : "gap-3",
			)}
		>
			<Icon className="h-5 w-5 shrink-0" />
			{!collapsed && (
				<span className="text-[14px] font-medium">{label}</span>
			)}
		</button>
	);
}
