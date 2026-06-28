"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	AccessType,
	ACCESS_TYPE_CONFIG,
} from "@/lib/types/access-grant";
import { Card, CardContent } from "@/components/ui/card";
import {
	Users,
	Music2,
	ListOrdered,
	Mic2,
	Disc3,
	Shield,
	Star,
	ArrowRight,
	LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Icon mapping for access types
const ACCESS_ICONS: Record<string, any> = {
	full_access: Star,
	artist_management: Users,
	rehearsal: Music2,
	performance_order: ListOrdered,
	mc_page: Mic2,
	dj_page: Disc3,
};

// Color mapping for gradient cards
const ACCESS_CARD_COLORS: Record<string, { from: string; to: string; border: string; iconBg: string }> = {
	full_access: { from: "from-purple-500/20", to: "to-pink-500/20", border: "border-purple-500/40", iconBg: "bg-purple-500/30" },
	artist_management: { from: "from-blue-500/20", to: "to-indigo-500/20", border: "border-blue-500/40", iconBg: "bg-blue-500/30" },
	rehearsal: { from: "from-emerald-500/20", to: "to-green-500/20", border: "border-emerald-500/40", iconBg: "bg-emerald-500/30" },
	performance_order: { from: "from-pink-500/20", to: "to-rose-500/20", border: "border-pink-500/40", iconBg: "bg-pink-500/30" },
	mc_page: { from: "from-orange-500/20", to: "to-amber-500/20", border: "border-orange-500/40", iconBg: "bg-orange-500/30" },
	dj_page: { from: "from-cyan-500/20", to: "to-teal-500/20", border: "border-cyan-500/40", iconBg: "bg-cyan-500/30" },
};

// Map access type to page URL path
function getPagePath(accessType: AccessType): string {
	const pathMap: Record<AccessType, string> = {
		full_access: "artists",
		artist_management: "artists",
		rehearsal: "rehearsal",
		performance_order: "performance-order",
		mc_page: "performance-order/mc",
		dj_page: "performance-order/dj",
	};
	return pathMap[accessType] || "artists";
}

export default function AccessHubPage() {
	const params = useParams();
	const router = useRouter();
	const eventId = params?.eventId as string;

	const [accessTypes, setAccessTypes] = useState<AccessType[]>([]);
	const [eventName, setEventName] = useState<string>("");
	const [grantEmail, setGrantEmail] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		checkAccessAndLoadEvent();
	}, [eventId]);

	const checkAccessAndLoadEvent = async () => {
		try {
			// Check access grant
			const grantRes = await fetch(
				`/api/access/check?eventId=${eventId}&path=access-hub`,
			);

			if (grantRes.ok) {
				const grantData = await grantRes.json();
				if (grantData.success && grantData.data?.hasAccess) {
					setAccessTypes(grantData.data.accessTypes || []);
					setGrantEmail(grantData.data.email || "");
				} else {
					// Check if user is a stage manager (full access)
					const profileRes = await fetch("/api/stage-manager/profile");
					if (profileRes.ok) {
						const profileData = await profileRes.json();
						if (
							profileData.success &&
							(profileData.data?.user?.role === "stage_manager" ||
								profileData.data?.user?.role === "super_admin")
						) {
							// Stage manager - redirect to main event page
							router.replace(`/stage-manager/events/${eventId}`);
							return;
						}
					}
					setError("You don't have access to this event.");
					setLoading(false);
					return;
				}
			} else {
				setError("Failed to check access permissions.");
				setLoading(false);
				return;
			}

			// Load event info
			const eventRes = await fetch(`/api/events/${eventId}`);
			if (eventRes.ok) {
				const eventData = await eventRes.json();
				const evt = eventData.data || eventData.event || eventData;
				setEventName(evt.name || "Event");
			}

			setLoading(false);
		} catch (err) {
			console.error("Error loading access hub:", err);
			setError("An error occurred while loading your access permissions.");
			setLoading(false);
		}
	};

	// Expand full_access into individual page types for display
	const displayTypes: AccessType[] = accessTypes.includes("full_access")
		? ["artist_management", "rehearsal", "performance_order", "mc_page", "dj_page"]
		: accessTypes;

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-4" />
					<p className="text-gray-400 text-sm">Loading your access...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4">
				<Card className="bg-gray-800/60 border-gray-700 max-w-md w-full">
					<CardContent className="p-8 text-center space-y-4">
						<div className="mx-auto w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
							<Shield className="h-8 w-8 text-red-400" />
						</div>
						<h2 className="text-xl font-bold text-white">Access Error</h2>
						<p className="text-gray-400 text-sm">{error}</p>
						<Button
							variant="outline"
							className="border-gray-600 text-gray-300 hover:bg-gray-700"
							onClick={() => router.push("/stagemanager-login")}
						>
							Go to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-gray-950 text-white">
			<div className="max-w-3xl mx-auto px-4 py-12">
				{/* Header */}
				<div className="text-center mb-10">
					<div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-4">
						<Shield className="h-4 w-4" />
						Granted Access
					</div>
					<h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
						{eventName}
					</h1>
					<p className="text-gray-400 text-sm">
						Welcome! You have access to the following pages for this event.
					</p>
					{grantEmail && (
						<p className="text-gray-500 text-xs mt-1">
							Signed in as <span className="text-gray-400">{grantEmail}</span>
						</p>
					)}
				</div>

				{/* Page Cards Grid */}
				<div className="grid gap-4 sm:grid-cols-2">
					{displayTypes.map((type) => {
						const config = ACCESS_TYPE_CONFIG[type];
						if (!config) return null;

						const Icon = ACCESS_ICONS[type] || Star;
						const colors = ACCESS_CARD_COLORS[type] || ACCESS_CARD_COLORS.full_access;
						const pagePath = getPagePath(type);

						return (
							<button
								key={type}
								onClick={() => window.open(`/stage-manager/events/${eventId}/${pagePath}`, '_blank')}
								className={`group relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10`}
							>
								<div className="flex items-start gap-4">
									<div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
										<Icon className="h-6 w-6 text-white" />
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-200 transition-colors">
											{config.label}
										</h3>
										<p className="text-sm text-gray-400 leading-relaxed">
											{config.description}
										</p>
									</div>
									<ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
								</div>
							</button>
						);
					})}
				</div>

				{/* Footer */}
				<div className="mt-10 text-center">
					<p className="text-gray-500 text-xs">
						Your access is managed by the event&apos;s stage manager. Contact them if you need different permissions.
					</p>
				</div>
			</div>
		</div>
	);
}
