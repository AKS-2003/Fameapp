"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole, SessionData } from "@/types";
import { canAccessRoute } from "@/lib/rbac";

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRole?: UserRole;
	requiredRoles?: UserRole[];
	fallback?: React.ReactNode;
}

export default function ProtectedRoute({
	children,
	requiredRole,
	requiredRoles,
	fallback = <div>Loading...</div>,
}: ProtectedRouteProps) {
	const [session, setSession] = useState<SessionData | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		checkSession();
	}, []);

	const checkSession = async () => {
		try {
			const response = await fetch("/api/auth/verify");
			const data = await response.json();

			if (data.success) {
				setSession(data.data.session);

				// Check if user has required role
				if (requiredRole && data.data.session.role !== requiredRole) {
					router.push("/unauthorized");
					return;
				}

				if (
					requiredRoles &&
					!requiredRoles.includes(data.data.session.role)
				) {
					router.push("/unauthorized");
					return;
				}
			} else {
				// No valid session, redirect to login
				router.push("/login");
			}
		} catch (error) {
			console.error("Session check failed:", error);
			router.push("/login");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <>{fallback}</>;
	}

	if (!session) {
		return null; // Will redirect to login
	}

	return <>{children}</>;
}

// Hook for accessing session data in components
export function useSession() {
	const [session, setSession] = useState<SessionData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkSession();
	}, []);

	const checkSession = async () => {
		try {
			const response = await fetch("/api/auth/verify");
			const data = await response.json();

			if (data.success) {
				setSession(data.data.session);
			}
		} catch (error) {
			console.error("Session check failed:", error);
		} finally {
			setLoading(false);
		}
	};

	const logout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			setSession(null);
			window.location.href = "/login";
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return { session, loading, logout, refetch: checkSession };
}
