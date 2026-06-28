"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import {
	AccessType,
	AccessGrantCookieData,
	isPathAllowed,
} from "@/lib/types/access-grant";

interface AccessGuardResult {
	hasAccess: boolean;
	isLoading: boolean;
	isGrantUser: boolean; // true if accessing via grant (not stage manager)
	accessTypes: AccessType[];
	grantEmail: string | null;
}

/**
 * Client-side hook for checking page access.
 * 
 * Checks both:
 * 1. Normal stage_manager session (full access)
 * 2. Access grant cookie (limited to specific pages)
 * 
 * @param requiredAccessTypes - access types that allow access to this page
 */
export function useAccessGuard(
	requiredAccessTypes: AccessType[],
): AccessGuardResult {
	const [result, setResult] = useState<AccessGuardResult>({
		hasAccess: false,
		isLoading: true,
		isGrantUser: false,
		accessTypes: [],
		grantEmail: null,
	});

	const params = useParams();
	const pathname = usePathname();
	const eventId = params?.eventId as string;

	useEffect(() => {
		checkAccess();

		// Re-check access when user navigates back (popstate) or tab becomes visible again
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				checkAccess();
			}
		};

		const handlePopState = () => {
			checkAccess();
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("popstate", handlePopState);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("popstate", handlePopState);
		};
	}, [eventId, pathname]);

	const checkAccess = async () => {
		// If the pathname matches a standalone dashboard, allow access immediately
		if (
			pathname &&
			(pathname.includes("/performance-order/dj") ||
				pathname.includes("/performance-order/mc") ||
				pathname.includes("/performance-order/lighting") ||
				pathname.includes("/performance-order/live-board"))
		) {
			setResult({
				hasAccess: true,
				isLoading: false,
				isGrantUser: false,
				accessTypes: ["full_access"],
				grantEmail: null,
			});
			return;
		}

		try {
			// First check if user has a stage_manager session
			const profileRes = await fetch("/api/stage-manager/profile");
			if (profileRes.ok) {
				const profileData = await profileRes.json();
				if (
					profileData.success &&
					(profileData.data?.user?.role === "stage_manager" ||
						profileData.data?.user?.role === "super_admin")
				) {
					// Stage manager has full access
					setResult({
						hasAccess: true,
						isLoading: false,
						isGrantUser: false,
						accessTypes: ["full_access"],
						grantEmail: null,
					});
					return;
				}
			}

			// Check for access grant cookie via API
			const grantRes = await fetch(
				`/api/access/check?eventId=${eventId}&path=${encodeURIComponent(pathname || "")}`,
			);

			if (grantRes.ok) {
				const grantData = await grantRes.json();
				if (grantData.success && grantData.data?.hasAccess) {
					setResult({
						hasAccess: true,
						isLoading: false,
						isGrantUser: true,
						accessTypes: grantData.data.accessTypes || [],
						grantEmail: grantData.data.email || null,
					});
					return;
				}
			}

			// No valid access
			setResult({
				hasAccess: false,
				isLoading: false,
				isGrantUser: false,
				accessTypes: [],
				grantEmail: null,
			});
		} catch (error) {
			console.error("Error checking access:", error);
			setResult({
				hasAccess: false,
				isLoading: false,
				isGrantUser: false,
				accessTypes: [],
				grantEmail: null,
			});
		}
	};

	return result;
}
