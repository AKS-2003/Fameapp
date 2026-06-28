"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStageManagerWebSocket } from "@/hooks/useStageManagerWebSocket";
import { StageManagerForceLogoutModal } from "@/components/StageManagerForceLogoutModal";

/**
 * Global Stage Manager Monitor
 *
 * This component monitors Stage Manager accounts across ALL pages
 * and shows force logout modal when admin takes action
 */
export function GlobalStageManagerMonitor() {
	const [userId, setUserId] = useState<string>("");
	const [userRole, setUserRole] = useState<string>("");
	const pathname = usePathname();

	// Skip monitoring on public/unauthenticated pages and artist pages
	const isPublicPage =
		pathname === "/login" ||
		pathname === "/register" ||
		pathname === "/famelink-auth" ||
		pathname === "/super-admin-login" ||
		pathname === "/forgot-password" ||
		pathname === "/forgot-password-pending" ||
		pathname === "/stage-manager-pending" ||
		pathname?.startsWith("/artist-register/") ||
		pathname?.startsWith("/artist-splash") ||
		pathname?.startsWith("/artist-dashboard/") ||
		pathname?.startsWith("/artist-edit/") ||
		pathname?.startsWith("/famelink-auth") ||
		pathname?.startsWith("/famelink/") ||
		pathname?.startsWith("/join-event/") ||
		pathname?.startsWith("/event-request/") ||
		pathname?.startsWith("/show/") ||
		pathname?.startsWith("/stagemanager-login") ||
		pathname?.startsWith("/stagemanager-register");

	// Fetch user data on mount and when pathname changes
	useEffect(() => {
		// Don't fetch on public pages
		if (isPublicPage) {
			return;
		}

		const fetchUserData = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						setUserId(result.data.userId || "");
						setUserRole(result.data.role || "");
					}
				}
			} catch (error) {
				// Silent fail - user not logged in
			}
		};

		fetchUserData();
	}, [pathname, isPublicPage]);

	// Only monitor if user is a Stage Manager and not on public pages
	useStageManagerWebSocket({
		userId: userRole === "stage_manager" && !isPublicPage ? userId : "",
		onAccountUpdate: (data) => {
			console.log("[Global Monitor] Stage Manager account update:", data);
		},
	});

	// Only render modal if user is a Stage Manager and not on public pages
	if (userRole !== "stage_manager" || isPublicPage) {
		return null;
	}

	return <StageManagerForceLogoutModal />;
}
