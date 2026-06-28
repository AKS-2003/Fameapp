"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	LogOut,
	UserCheck,
	UserX,
	Clock,
	AlertCircle,
	CheckCircle,
	Users,
	UserMinus,
	Trash2,
	Key,
	User as UserIcon,
	Eye,
	Edit,
	LayoutDashboard,
	Music,
	Calendar,
	MapPin,
	Sparkles,
	Crown,
} from "lucide-react";
import { FameLogo } from "@/components/ui/fame-logo";
import { User } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { formatDateSimple } from "@/lib/date-utils";
import { formatDuration } from "@/lib/timing-utils";

interface SuperAdminData {
	pendingRegistrations: User[];
	allStageManagers: User[];
}

interface Artist {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	eventId: string;
	eventName: string;
	eventVenue: string;
	status: string;
	createdAt: string;
	performanceDate?: string;
	image_url?: string;
	actual_duration?: number;
}

export default function SuperAdminPage() {
	const router = useRouter();
	const [data, setData] = useState<SuperAdminData | null>(null);
	const [dashboardError, setDashboardError] = useState<string | null>(null);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingArtists, setLoadingArtists] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [changePasswordDialog, setChangePasswordDialog] = useState<{
		open: boolean;
		user: User | null;
	}>({ open: false, user: null });
	const [newPassword, setNewPassword] = useState("");
	const [newUsername, setNewUsername] = useState("");
	// Artist password change state
	const [artistPasswordDialog, setArtistPasswordDialog] = useState<{
		open: boolean;
		artist: Artist | null;
	}>({ open: false, artist: null });
	const [artistNewPassword, setArtistNewPassword] = useState("");
	const [artistPasswordLoading, setArtistPasswordLoading] = useState(false);
	const [notifications, setNotifications] = useState<
		Array<{
			id: string;
			message: string;
			type: "info" | "success" | "warning" | "error";
			timestamp: Date;
		}>
	>([]);
	const [authChecked, setAuthChecked] = useState(false);
	const [isAuthorized, setIsAuthorized] = useState(false);

	// ── Auth guard: verify super_admin session before rendering anything ──
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch("/api/auth/me");
				const result = await res.json();
				if (result.success && result.data?.role === "super_admin") {
					setIsAuthorized(true);
				} else {
					router.replace("/super-admin-login?redirect=/super-admin");
				}
			} catch {
				router.replace("/super-admin-login?redirect=/super-admin");
			} finally {
				setAuthChecked(true);
			}
		};
		checkAuth();
	}, [router]);

	const { sendStatusUpdate, sendAdminAction } = useWebSocket({
		userId: "admin",
		role: "super_admin",
		onNewRegistration: (data) => {
			console.log("New registration received:", data);
			// Add notification
			const notification = {
				id: Date.now().toString(),
				message: `New stage manager registration: ${data.user.firstName} ${data.user.lastName}`,
				type: "info" as const,
				timestamp: new Date(),
			};
			setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
			// Refresh data to show new registration
			fetchData();
		},
		onAdminActionPerformed: (data) => {
			console.log("Admin action performed:", data);
			// Add notification for actions performed by other admins
			if (data.performedBy !== "admin") {
				const notification = {
					id: Date.now().toString(),
					message: `Admin action: ${data.action} performed on user ${
						data.user?.profile?.firstName || "Unknown"
					}`,
					type: "success" as const,
					timestamp: new Date(),
				};
				setNotifications((prev) => [notification, ...prev.slice(0, 4)]);
			}
			// Refresh data to reflect changes
			fetchData();
		},
	});

	// Listen for real-time subscription updates
	useEffect(() => {
		let socket: any = null;
		let mounted = true;

		const connectSocket = async () => {
			try {
				if (typeof window === "undefined") return;
				if (typeof (window as any).io === "undefined") {
					const script = document.createElement("script");
					script.src = "/socket.io/socket.io.js";
					await new Promise<void>((resolve, reject) => {
						script.onload = () => resolve();
						script.onerror = () => reject();
						document.head.appendChild(script);
					});
				}
				if (!mounted) return;

				socket = (window as any).io({
					transports: ["websocket"],
					upgrade: false,
				});

				socket.on("connect", () => {
					socket.emit("authenticate", {
						userId: "admin",
						role: "super_admin",
					});
				});

				socket.on("subscription_updated", (data: any) => {
					if (mounted) {
						const notification = {
							id: Date.now().toString(),
							message: `Subscription updated: ${data.email} → ${data.subscription?.plan_type?.replace(/_/g, " ").toUpperCase() || "Free"}`,
							type: "success" as const,
							timestamp: new Date(),
						};
						setNotifications((prev) => [
							notification,
							...prev.slice(0, 4),
						]);
						// Refresh data to show updated plans
						fetchData();
						fetchArtists();
					}
				});
			} catch (err) {
				console.error("Admin subscription WebSocket error:", err);
			}
		};

		connectSocket();

		return () => {
			mounted = false;
			if (socket) socket.disconnect();
		};
	}, []);

	useEffect(() => {
		if (!isAuthorized) return;
		fetchData();
		fetchArtists();
	}, [isAuthorized]);

	const fetchData = async () => {
		try {
			setDashboardError(null);
			const response = await fetch("/api/super-admin/dashboard");
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setData(result.data);
				} else {
					setData(null);
					setDashboardError(
						result.error?.message ||
							"Failed to load dashboard data.",
					);
					console.error(
						"Failed to fetch dashboard data:",
						result.error,
					);
				}
			} else {
				setData(null);
				setDashboardError(
					"Failed to load dashboard data. Please refresh and try again.",
				);
				console.error("Failed to fetch dashboard data");
			}
		} catch (error) {
			setData(null);
			setDashboardError(
				"Failed to load dashboard data. Please refresh and try again.",
			);
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const pendingCount = dashboardError
		? "—"
		: String((data as any)?.stats?.pendingApprovals ?? data?.pendingRegistrations?.length ?? 0);
	const stageManagerCount = dashboardError
		? "—"
		: String((data as any)?.stats?.totalStageManagers ?? data?.allStageManagers?.length ?? 0);
	const proSubscriberCount = dashboardError
		? "—"
		: String((data as any)?.stats?.proArtists ?? 0);
	const totalArtistsCount = dashboardError
		? "—"
		: String((data as any)?.stats?.totalArtists ?? artists.length);

	const fetchArtists = async () => {
		try {
			const response = await fetch("/api/super-admin/artists");
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					setArtists(result.data.artists || []);
				} else {
					console.error("Failed to fetch artists:", result.error);
				}
			} else {
				console.error("Failed to fetch artists");
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
		} finally {
			setLoadingArtists(false);
		}
	};

	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const handleUserAction = async (
		action: string,
		userId: string,
		additionalData?: any,
	) => {
		setActionLoading(userId);
		try {
			const response = await fetch("/api/super-admin/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					userId,
					...additionalData,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					alert(
						result.data?.message ||
							`${action} completed successfully`,
					);

					// Send real-time notification to the affected user
					const actionMessages = {
						approve: "Your account has been approved!",
						reject: "Your account has been rejected.",
						deactivate: "Your account has been deactivated.",
						delete: "Your account has been deleted.",
						changeCredentials:
							"Your login credentials have been updated.",
					};

					if (action === "approve") {
						sendStatusUpdate(
							userId,
							"active",
							actionMessages[
								action as keyof typeof actionMessages
							],
						);
					} else {
						sendAdminAction(
							userId,
							action,
							actionMessages[
								action as keyof typeof actionMessages
							],
						);
					}

					await fetchData();
				} else {
					alert(result.error?.message || `Failed to ${action} user`);
				}
			} else {
				alert(`Failed to ${action} user`);
			}
		} catch (error) {
			console.error(`Error performing ${action}:`, error);
			alert("Network error occurred");
		} finally {
			setActionLoading(null);
		}
	};

	const handleChangePassword = async () => {
		if (!changePasswordDialog.user || !newPassword || !newUsername) {
			alert("Please fill in all fields");
			return;
		}

		await handleUserAction(
			"changeCredentials",
			changePasswordDialog.user.id,
			{
				newPassword,
				newUsername,
			},
		);

		setChangePasswordDialog({ open: false, user: null });
		setNewPassword("");
		setNewUsername("");
	};

	const handleChangeArtistPassword = async () => {
		if (!artistPasswordDialog.artist) return;
		if (!artistNewPassword || artistNewPassword.length < 6) {
			alert("Password must be at least 6 characters");
			return;
		}
		setArtistPasswordLoading(true);
		try {
			const response = await fetch("/api/super-admin/artists", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId: artistPasswordDialog.artist.id,
					newPassword: artistNewPassword,
				}),
			});
			const result = await response.json();
			if (result.success) {
				alert(result.data?.message || "Artist password changed successfully");
				setArtistPasswordDialog({ open: false, artist: null });
				setArtistNewPassword("");
			} else {
				alert(result.error?.message || "Failed to change artist password");
			}
		} catch (error) {
			console.error("Error changing artist password:", error);
			alert("Network error occurred");
		} finally {
			setArtistPasswordLoading(false);
		}
	};

	const handleDeleteArtist = async (artistId: string, artistName: string) => {
		if (!confirm(`Are you sure you want to delete artist "${artistName}"? This action cannot be undone.`)) {
			return;
		}

		setActionLoading(artistId);
		try {
			const response = await fetch("/api/super-admin/artists", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ artistId }),
			});
			const result = await response.json();
			if (result.success) {
				alert(result.data?.message || "Artist deleted successfully");
				await Promise.all([fetchArtists(), fetchData()]);
			} else {
				alert(result.error?.message || "Failed to delete artist");
			}
		} catch (error) {
			console.error("Error deleting artist:", error);
			alert("Network error occurred");
		} finally {
			setActionLoading(null);
		}
	};

	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			router.push("/super-admin-login");
		} catch (error) {
			console.error("Logout error:", error);
			router.push("/super-admin-login");
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			active: { color: "bg-green-100 text-green-800", icon: CheckCircle },
			pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
			suspended: { color: "bg-red-100 text-red-800", icon: AlertCircle },
			deactivated: { color: "bg-gray-100 text-gray-800", icon: Users },
			rejected: { color: "bg-red-100 text-red-800", icon: UserX },
			registered: { color: "bg-blue-100 text-blue-800", icon: Sparkles },
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig.pending;
		const Icon = config.icon;

		return (
			<Badge className={`flex items-center gap-1 w-fit ${config.color}`}>
				<Icon className="h-3 w-3" />
				{status}
			</Badge>
		);
	};

	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleDateString();
	};

	// ── Auth guard rendering ────────────────────────────────────────────────
	if (!authChecked) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
					<p className="text-gray-300">Verifying access...</p>
				</div>
			</div>
		);
	}

	if (!isAuthorized) return null;

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p>Loading Super Admin Dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white">
			{/* Header */}
			<header className="bg-purple-800/50 border-b border-purple-600">
				<div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
						<div className="flex items-center">
							<FameLogo
								width={32}
								height={32}
								className="mr-2 sm:mr-3 sm:w-10 sm:h-10"
							/>
							<div>
								<h1 className="text-base sm:text-xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
									Super Admin Dashboard
								</h1>
								<p className="text-xs sm:text-sm text-gray-400">
									Stage Manager Management
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
							<div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm">
								<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
								<span className="text-gray-400">
									Real-time updates active
								</span>
							</div>
							<Button
								variant="outline"
								onClick={handleLogout}
								size="sm"
								className="bg-gradient-to-br from-purple-50 to-pink-50 text-xs sm:text-sm w-full sm:w-auto"
							>
								<LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
								Logout
							</Button>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
				{dashboardError && (
					<div className="rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-red-100">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
							<div>
								<p className="font-medium">
									Super admin dashboard failed to load
								</p>
								<p className="text-sm text-red-200/90">
									{dashboardError}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Real-time Notifications */}
				{notifications.length > 0 && (
					<div className="space-y-2">
						{notifications.map((notification) => (
							<div
								key={notification.id}
								className={`p-4 rounded-lg border-l-4 ${
									notification.type === "info"
										? "bg-blue-900/20 border-blue-500 text-blue-200"
										: notification.type === "success"
											? "bg-green-900/20 border-green-500 text-green-200"
											: notification.type === "warning"
												? "bg-yellow-900/20 border-yellow-500 text-yellow-200"
												: "bg-red-900/20 border-red-500 text-red-200"
								} animate-in slide-in-from-top-2 duration-300`}
							>
								<div className="flex justify-between items-start">
									<p className="text-sm font-medium">
										{notification.message}
									</p>
									<button
										onClick={() =>
											setNotifications((prev) =>
												prev.filter(
													(n) =>
														n.id !==
														notification.id,
												),
											)
										}
										className="text-gray-400 hover:text-white ml-4"
									>
										×
									</button>
								</div>
								<p className="text-xs opacity-75 mt-1">
									{notification.timestamp.toLocaleTimeString()}
								</p>
							</div>
						))}
					</div>
				)}

				{/* Statistics Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
					<Card className="bg-purple-800/50 border-purple-600">
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center">
								<Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
								<div className="ml-3 sm:ml-4">
									<p className="text-xs sm:text-sm font-medium text-gray-400">
										Pending Approvals
									</p>
									<p className="text-xl sm:text-2xl font-bold text-white">
										{pendingCount}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-purple-800/50 border-purple-600">
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center">
								<Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
								<div className="ml-3 sm:ml-4">
									<p className="text-xs sm:text-sm font-medium text-gray-400">
										Total Stage Managers
									</p>
									<p className="text-xl sm:text-2xl font-bold text-white">
										{stageManagerCount}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-purple-800/50 border-purple-600">
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center">
								<Music className="h-6 w-6 sm:h-8 sm:w-8 text-pink-400" />
								<div className="ml-3 sm:ml-4">
									<p className="text-xs sm:text-sm font-medium text-gray-400">
										Total Artists
									</p>
									<p className="text-xl sm:text-2xl font-bold text-white">
										{totalArtistsCount}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="bg-purple-800/50 border-purple-600">
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center">
								<Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400" />
								<div className="ml-3 sm:ml-4">
									<p className="text-xs sm:text-sm font-medium text-gray-400">
										Pro Subscribers
									</p>
									<p className="text-xl sm:text-2xl font-bold text-white">
										{proSubscriberCount}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Main Content Tabs */}
				<Tabs defaultValue="pending" className="w-full">
					<TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 bg-purple-800/50 border-purple-600 gap-1">
						<TabsTrigger
							value="pending"
							className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
						>
							<span className="hidden sm:inline">
								Pending Approvals ({pendingCount})
							</span>
							<span className="sm:hidden">
								Pending ({pendingCount})
							</span>
						</TabsTrigger>
						<TabsTrigger
							value="stage-managers"
							className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
						>
							<span className="hidden sm:inline">
								All Stage Managers ({stageManagerCount})
							</span>
							<span className="sm:hidden">
								Managers ({stageManagerCount})
							</span>
						</TabsTrigger>
						<TabsTrigger
							value="artists"
							className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
						>
							<span className="hidden sm:inline">
								All Artists ({totalArtistsCount})
							</span>
							<span className="sm:hidden">
								Artists ({totalArtistsCount})
							</span>
						</TabsTrigger>
						<TabsTrigger
							value="subscriptions"
							className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm"
						>
							<span className="hidden sm:inline">
								<Crown className="h-3 w-3 inline mr-1" />
								Subscriptions
							</span>
							<span className="sm:hidden">
								<Crown className="h-3 w-3 inline mr-1" />
								Subs
							</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="pending" className="space-y-6">
						<Card className="bg-purple-800/50 border-purple-600">
							<CardHeader>
								<CardTitle className="text-white">
									Pending Stage Manager Registrations
								</CardTitle>
								<CardDescription className="text-gray-400">
									Review and approve new Stage Manager
									applications
								</CardDescription>
							</CardHeader>
							<CardContent>
								{dashboardError ? (
									<div className="text-center py-8 text-red-200">
										<AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-80" />
										<p className="text-lg">
											Unable to load pending registrations
										</p>
										<p className="text-sm">
											The dashboard request failed, so this
											view is not showing live approval
											data yet.
										</p>
									</div>
								) : !data?.pendingRegistrations?.length ? (
									<div className="text-center py-8 text-gray-400">
										<Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p className="text-lg">
											No pending registrations
										</p>
										<p className="text-sm">
											New registrations will appear here
											for approval
										</p>
									</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow className="border-gray-800">
												<TableHead className="text-gray-300">
													Name
												</TableHead>
												<TableHead className="text-gray-300">
													Email
												</TableHead>
												<TableHead className="text-gray-300">
													WhatsApp
												</TableHead>
												<TableHead className="text-gray-300">
													Registered
												</TableHead>
												<TableHead className="text-gray-300">
													Status
												</TableHead>
												<TableHead className="text-gray-300">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data.pendingRegistrations.map(
												(user) => (
													<TableRow
														key={user.id}
														className="border-gray-800"
													>
														<TableCell className="text-white font-medium">
															{
																user.profile
																	.firstName
															}{" "}
															{
																user.profile
																	.lastName
															}
														</TableCell>
														<TableCell className="text-gray-300">
															<a
																href={`mailto:${user.email}`}
																className="text-blue-400 hover:underline"
															>
																{user.email}
															</a>
														</TableCell>
														<TableCell className="text-gray-300">
															{user.profile
																.phone ? (
																<a
																	href={`https://wa.me/${user.profile.phone.replace(
																		/[\s\-\(\)\+]/g,
																		"",
																	)}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-green-400 hover:underline"
																>
																	{
																		user
																			.profile
																			.phone
																	}
																</a>
															) : (
																"-"
															)}
														</TableCell>
														<TableCell className="text-gray-300">
															{formatDate(
																user.createdAt,
															)}
														</TableCell>
														<TableCell>
															{getStatusBadge(
																user.status,
															)}
														</TableCell>
														<TableCell className="space-x-2">
															<Button
																size="sm"
																onClick={() =>
																	handleUserAction(
																		"approve",
																		user.id,
																	)
																}
																disabled={
																	actionLoading ===
																	user.id
																}
																className="bg-green-600 hover:bg-green-700"
															>
																{actionLoading ===
																user.id ? (
																	<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
																) : (
																	<UserCheck className="h-4 w-4 mr-1" />
																)}
																Approve
															</Button>
															{user.status !==
																"rejected" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		handleUserAction(
																			"reject",
																			user.id,
																		)
																	}
																	disabled={
																		actionLoading ===
																		user.id
																	}
																	className="border-red-600 text-red-400 hover:bg-red-900/20"
																>
																	{actionLoading ===
																	user.id ? (
																		<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
																	) : (
																		<UserX className="h-4 w-4 mr-1" />
																	)}
																	Reject
																</Button>
															)}
														</TableCell>
													</TableRow>
												),
											)}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="stage-managers" className="space-y-6">
						<Card className="bg-purple-800/50 border-purple-600">
							<CardHeader>
								<CardTitle className="text-white">
									All Stage Managers
								</CardTitle>
								<CardDescription className="text-gray-400">
									Manage Stage Manager accounts
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow className="border-gray-800">
												<TableHead className="text-gray-300">
													Name
												</TableHead>
												<TableHead className="text-gray-300">
													Email
												</TableHead>
												<TableHead className="text-gray-300">
													Status
												</TableHead>
												<TableHead className="text-gray-300">
													Plan
												</TableHead>
												<TableHead className="text-gray-300">
													Last Login
												</TableHead>
												<TableHead className="text-gray-300">
													Created
												</TableHead>
												<TableHead className="text-gray-300 text-right">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{data?.allStageManagers?.map(
												(user) => (
													<TableRow
														key={user.id}
														className="border-gray-800"
													>
														<TableCell className="text-white font-medium whitespace-nowrap">
															{
																user.profile
																	.firstName
															}{" "}
															{
																user.profile
																	.lastName
															}
														</TableCell>
														<TableCell className="text-gray-300 whitespace-nowrap">
															{user.email}
														</TableCell>
														<TableCell>
															{getStatusBadge(
																user.status,
															)}
														</TableCell>
														<TableCell>
															<div className="flex flex-col gap-1">
																{(user as any)
																	.subscription
																	?.plan_type &&
																(user as any)
																	.subscription
																	.plan_type !==
																	"free" ? (
																	<Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs gap-1 w-fit">
																		<Crown className="h-3 w-3" />
																		{(
																			user as any
																		).subscription.plan_type
																			.replace(
																				/_/g,
																				" ",
																			)
																			.toUpperCase()}
																		{(
																			user as any
																		)
																			.subscription
																			.plan_quantity >
																			0 && (
																			<span className="ml-1">
																				×
																				{
																					(
																						user as any
																					)
																						.subscription
																						.plan_quantity
																				}
																			</span>
																		)}
																	</Badge>
																) : (
																	<Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs gap-1 w-fit">
																		<CheckCircle className="h-3 w-3" />
																		Free
																	</Badge>
																)}
															</div>
														</TableCell>
														<TableCell className="text-gray-300 whitespace-nowrap">
															{user.lastLogin
																? formatDate(
																		user.lastLogin,
																	)
																: "Never"}
														</TableCell>
														<TableCell className="text-gray-300 whitespace-nowrap">
															{formatDate(
																user.createdAt,
															)}
														</TableCell>
														<TableCell className="min-w-[420px]">
															<div className="flex items-center justify-end gap-2 flex-nowrap whitespace-nowrap">
																{user.status ===
																	"active" && (
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() =>
																			handleUserAction(
																				"deactivate",
																				user.id,
																			)
																		}
																		disabled={
																			actionLoading ===
																			user.id
																		}
																		className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20 whitespace-nowrap"
																	>
																		{actionLoading ===
																		user.id ? (
																			<div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
																		) : (
																			<UserMinus className="h-4 w-4 mr-1" />
																		)}
																		Deactivate
																	</Button>
																)}

																{(user.status ===
																	"deactivated" ||
																	user.status ===
																		"rejected" ||
																	user.status ===
																		"suspended") && (
																	<Button
																		size="sm"
																		onClick={() =>
																			handleUserAction(
																				"activate",
																				user.id,
																			)
																		}
																		disabled={
																			actionLoading ===
																			user.id
																		}
																		className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
																	>
																		{actionLoading ===
																		user.id ? (
																			<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
																		) : (
																			<UserCheck className="h-4 w-4 mr-1" />
																		)}
																		Activate
																	</Button>
																)}

																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		setChangePasswordDialog(
																			{
																				open: true,
																				user,
																			},
																		)
																	}
																	disabled={
																		actionLoading ===
																		user.id
																	}
																	className="border-blue-600 text-blue-400 hover:bg-blue-900/20 whitespace-nowrap"
																>
																	<Key className="h-4 w-4 mr-1" />
																	Change
																	Credentials
																</Button>

																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => {
																		if (
																			confirm(
																				"Are you sure you want to delete this user? This action cannot be undone.",
																			)
																		) {
																			handleUserAction(
																				"delete",
																				user.id,
																			);
																		}
																	}}
																	disabled={
																		actionLoading ===
																		user.id
																	}
																	className="border-red-600 text-red-400 hover:bg-red-900/20 whitespace-nowrap"
																>
																	{actionLoading ===
																	user.id ? (
																		<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
																	) : (
																		<Trash2 className="h-4 w-4 mr-1" />
																	)}
																	Delete
																</Button>
															</div>
														</TableCell>
													</TableRow>
												),
											) || []}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="artists" className="space-y-6">
						<Card className="bg-purple-800/50 border-purple-600">
							<CardHeader>
								<CardTitle className="text-white flex items-center gap-2">
									<Music className="h-5 w-5" />
									All Artists
								</CardTitle>
								<CardDescription className="text-gray-400">
									View all artist registrations across all
									events
								</CardDescription>
							</CardHeader>
							<CardContent>
								{loadingArtists ? (
									<div className="text-center py-8 text-gray-400">
										<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
										<p>Loading artists...</p>
									</div>
								) : !artists.length ? (
									<div className="text-center py-8 text-gray-400">
										<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p className="text-lg">
											No artists found
										</p>
										<p className="text-sm">
											Artists will appear here once they
											register for events
										</p>
									</div>
								) : (
									<div
										className={`border rounded-lg border-gray-700 ${
											artists.length > 10
												? "max-h-[600px] overflow-y-auto"
												: ""
										}`}
									>
										<Table>
											<TableHeader className="sticky top-0 bg-purple-800/90 z-10">
												<TableRow className="border-gray-700">
													<TableHead className="text-gray-300">
														Profile
													</TableHead>
													<TableHead className="text-gray-300">
														Artist Name
													</TableHead>
													<TableHead className="text-gray-300">
														Real Name
													</TableHead>
													<TableHead className="text-gray-300">
														Email
													</TableHead>
													<TableHead className="text-gray-300">
														Phone
													</TableHead>
													<TableHead className="text-gray-300">
														Style
													</TableHead>
													<TableHead className="text-gray-300">
														Duration
													</TableHead>
													<TableHead className="text-gray-300">
														Event
													</TableHead>
													<TableHead className="text-gray-300">
														Performance Date
													</TableHead>
													<TableHead className="text-gray-300">
														Status
													</TableHead>
													<TableHead className="text-gray-300">
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{artists.map((artist) => (
													<TableRow
														key={`${artist.eventId}-${artist.id}`}
														className="border-gray-700"
													>
														<TableCell>
															<div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 border-2 border-purple-400">
																{artist.image_url ? (
																	<img
																		src={`/api/media/${artist.image_url}`}
																		alt={
																			artist.artistName
																		}
																		className="w-full h-full object-cover"
																	/>
																) : (
																	<UserIcon className="h-5 w-5 text-purple-400" />
																)}
															</div>
														</TableCell>
														<TableCell className="text-white font-medium">
															{artist.artistName}
														</TableCell>
														<TableCell className="text-gray-300">
															{artist.realName}
														</TableCell>
														<TableCell className="text-gray-300">
															<a
																href={`mailto:${artist.email}`}
																className="text-blue-400 hover:underline"
															>
																{artist.email}
															</a>
														</TableCell>
														<TableCell className="text-gray-300">
															{artist.phone ? (
																<a
																	href={`https://wa.me/${artist.phone.replace(
																		/[\s\-\(\)\+]/g,
																		"",
																	)}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-green-400 hover:underline"
																>
																	{
																		artist.phone
																	}
																</a>
															) : (
																"-"
															)}
														</TableCell>
														<TableCell className="text-gray-300">
															{artist.style || "-"}
														</TableCell>
														<TableCell className="text-gray-300">
															{artist.performanceDuration && artist.performanceDuration > 0 
																? `${artist.performanceDuration} min` 
																: (artist.actual_duration ? formatDuration(artist.actual_duration) : "-")}
														</TableCell>
														<TableCell className="text-gray-300">
															<div className="flex flex-col gap-1">
																<span className={artist.eventName === "Not assigned" ? "text-gray-500 italic" : "font-medium text-white"}>
																	{artist.eventName}
																</span>
																{artist.eventVenue && (
																	<span className="text-xs text-gray-500 flex items-center gap-1">
																		<MapPin className="h-3 w-3" />
																		{artist.eventVenue}
																	</span>
																)}
															</div>
														</TableCell>
														<TableCell className="text-gray-300">
															{artist.performanceDate ? (
																<div className="flex items-center gap-1 text-green-400">
																	<Calendar className="h-3 w-3" />
																	{formatDateSimple(artist.performanceDate)}
																</div>
															) : (
																<span className="text-gray-600 italic">Not assigned</span>
															)}
														</TableCell>
														<TableCell>
															{getStatusBadge(
																artist.status ||
																	"pending",
															)}
														</TableCell>
														<TableCell className="min-w-[100px] w-[100px]">
															<div className="grid grid-cols-2 gap-2.5 w-max">
																<button
																	onClick={() =>
																		window.open(
																			`/artist-dashboard/${artist.id}`,
																			"_blank",
																			"noopener,noreferrer",
																		)
																	}
																	title="View Artist Dashboard"
																	className="w-9 h-9 p-0 flex items-center justify-center rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 active:scale-95 transition-all"
																>
																	<LayoutDashboard className="h-4 w-4" />
																</button>
																<button
																	onClick={() =>
																		window.open(
																			`/artist-edit/${artist.id}?from=super-admin&eventId=${artist.eventId}`,
																			"_blank",
																			"noopener,noreferrer",
																		)
																	}
																	title="Edit Artist"
																	className="w-9 h-9 p-0 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all"
																>
																	<Edit className="h-4 w-4" />
																</button>
																<button
																	onClick={() => {
																		setArtistPasswordDialog({ open: true, artist });
																		setArtistNewPassword("");
																	}}
																	title="Change Artist Password"
																	className="w-9 h-9 p-0 flex items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 active:scale-95 transition-all"
																>
																	<Key className="h-4 w-4" />
																</button>
																<button
																	onClick={() => handleDeleteArtist(artist.id, artist.artistName)}
																	disabled={actionLoading === artist.id}
																	title="Delete Artist"
																	className="w-9 h-9 p-0 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
																>
																	{actionLoading === artist.id ? (
																		<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
																	) : (
																		<Trash2 className="h-4 w-4" />
																	)}
																</button>
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="subscriptions" className="space-y-6">
						<Card className="bg-purple-800/50 border-purple-600">
							<CardHeader>
								<CardTitle className="text-white flex items-center gap-2">
									<Crown className="h-5 w-5 text-amber-400" />
									All Subscriptions
								</CardTitle>
								<CardDescription className="text-gray-400">
									View all premium subscribers across Stage
									Managers and Artists (real-time updates)
								</CardDescription>
							</CardHeader>
							<CardContent>
								{(() => {
									const proManagers = (
										data?.allStageManagers || []
									).filter(
										(u: any) =>
											u.subscription?.plan_type &&
											u.subscription.plan_type !== "free",
									);
									const freeManagers = (
										data?.allStageManagers || []
									).filter(
										(u: any) =>
											!u.subscription?.plan_type ||
											u.subscription.plan_type === "free",
									);

									return (
										<div className="space-y-6">
											{/* Pro Subscribers */}
											<div>
												<h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
													<Crown className="h-4 w-4" />
													Pro Stage Managers (
													{proManagers.length})
												</h3>
												{proManagers.length === 0 ? (
													<p className="text-gray-500 text-sm py-4 text-center">
														No pro subscribers yet
													</p>
												) : (
													<Table>
														<TableHeader>
															<TableRow className="border-gray-700">
																<TableHead className="text-gray-300">
																	Name
																</TableHead>
																<TableHead className="text-gray-300">
																	Email
																</TableHead>
																<TableHead className="text-gray-300">
																	Plan
																</TableHead>
																<TableHead className="text-gray-300">
																	Quantity
																</TableHead>
																<TableHead className="text-gray-300">
																	Expires
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{proManagers.map(
																(user: any) => (
																	<TableRow
																		key={
																			user.id
																		}
																		className="border-gray-700"
																	>
																		<TableCell className="text-white font-medium">
																			{
																				user
																					.profile
																					?.firstName
																			}{" "}
																			{
																				user
																					.profile
																					?.lastName
																			}
																		</TableCell>
																		<TableCell className="text-gray-300">
																			{
																				user.email
																			}
																		</TableCell>
																		<TableCell>
																			<Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
																				{user.subscription.plan_type
																					.replace(
																						/_/g,
																						" ",
																					)
																					.toUpperCase()}
																			</Badge>
																		</TableCell>
																		<TableCell className="text-gray-300">
																			×
																			{user
																				.subscription
																				.plan_quantity ||
																				1}
																		</TableCell>
																		<TableCell className="text-gray-300">
																			{user
																				.subscription
																				.plan_expiration
																				? new Date(
																						user
																							.subscription
																							.plan_expiration,
																					).toLocaleDateString()
																				: "Active"}
																		</TableCell>
																	</TableRow>
																),
															)}
														</TableBody>
													</Table>
												)}
											</div>

											{/* Free Users */}
											<div>
												<h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
													<CheckCircle className="h-4 w-4" />
													Free Stage Managers (
													{freeManagers.length})
												</h3>
												{freeManagers.length === 0 ? (
													<p className="text-gray-500 text-sm py-4 text-center">
														No free users
													</p>
												) : (
													<Table>
														<TableHeader>
															<TableRow className="border-gray-700">
																<TableHead className="text-gray-300">
																	Name
																</TableHead>
																<TableHead className="text-gray-300">
																	Email
																</TableHead>
																<TableHead className="text-gray-300">
																	Status
																</TableHead>
																<TableHead className="text-gray-300">
																	Created
																</TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{freeManagers.map(
																(user: any) => (
																	<TableRow
																		key={
																			user.id
																		}
																		className="border-gray-700"
																	>
																		<TableCell className="text-white font-medium">
																			{
																				user
																					.profile
																					?.firstName
																			}{" "}
																			{
																				user
																					.profile
																					?.lastName
																			}
																		</TableCell>
																		<TableCell className="text-gray-300">
																			{
																				user.email
																			}
																		</TableCell>
																		<TableCell>
																			{getStatusBadge(
																				user.status,
																			)}
																		</TableCell>
																		<TableCell className="text-gray-300">
																			{formatDate(
																				user.createdAt,
																			)}
																		</TableCell>
																	</TableRow>
																),
															)}
														</TableBody>
													</Table>
												)}
											</div>
										</div>
									);
								})()}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				<div className="mt-12 pb-8">
					<FantasiaFooter variant="dark" />
				</div>
			</div>

			{/* Artist Change Password Dialog */}
			<Dialog
				open={artistPasswordDialog.open}
				onOpenChange={(open) => {
					if (!open) {
						setArtistPasswordDialog({ open: false, artist: null });
						setArtistNewPassword("");
					}
				}}
			>
				<DialogContent className="bg-gray-950 border-orange-600/40 max-w-md">
					<DialogHeader>
						<DialogTitle className="text-white flex items-center gap-2">
							<Key className="h-5 w-5 text-orange-400" />
							Change Artist Password
						</DialogTitle>
						<DialogDescription className="text-gray-400">
							Set a new password for{" "}
							<span className="text-orange-300 font-semibold">
								{artistPasswordDialog.artist?.artistName}
							</span>
							{" "}({artistPasswordDialog.artist?.email})
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="rounded-lg bg-orange-900/20 border border-orange-600/30 p-3">
							<p className="text-xs text-orange-300 flex items-center gap-1.5">
								<AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
								This will immediately change the artist&apos;s login password. The artist will need to use this new password to sign in.
							</p>
						</div>
						<div>
							<Label htmlFor="artistNewPassword" className="text-gray-300 mb-1.5 block">
								New Password
							</Label>
							<Input
								id="artistNewPassword"
								type="password"
								value={artistNewPassword}
								onChange={(e) => setArtistNewPassword(e.target.value)}
								placeholder="Enter new password (min. 6 chars)"
								className="bg-gray-900 border-orange-600/40 text-white placeholder:text-gray-500 focus:border-orange-500"
								onKeyDown={(e) => e.key === "Enter" && handleChangeArtistPassword()}
							/>
						</div>
					</div>
					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() => {
								setArtistPasswordDialog({ open: false, artist: null });
								setArtistNewPassword("");
							}}
							className="border-gray-600 text-gray-300 hover:bg-gray-800"
							disabled={artistPasswordLoading}
						>
							Cancel
						</Button>
						<Button
							onClick={handleChangeArtistPassword}
							className="bg-orange-600 hover:bg-orange-700 text-white"
							disabled={artistPasswordLoading || !artistNewPassword || artistNewPassword.length < 6}
						>
							{artistPasswordLoading ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
							) : (
								<Key className="h-4 w-4 mr-1" />
							)}
							Update Password
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Stage Manager Change Credentials Dialog */}
			<Dialog
				open={changePasswordDialog.open}
				onOpenChange={(open) =>
					setChangePasswordDialog({ open, user: null })
				}
			>
				<DialogContent className="bg-white dark:bg-gray-900 border-border">
					<DialogHeader>
						<DialogTitle>Change User Credentials</DialogTitle>
						<DialogDescription className="text-gray-400">
							Update the username and password for{" "}
							{changePasswordDialog.user?.profile.firstName}{" "}
							{changePasswordDialog.user?.profile.lastName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label
								htmlFor="newUsername"
								className="text-gray-300"
							>
								New Username (Email)
							</Label>
							<Input
								id="newUsername"
								type="email"
								value={newUsername}
								onChange={(e) => setNewUsername(e.target.value)}
								placeholder="Enter new email"
								className="bg-purple-800 border-purple-600 text-white"
							/>
						</div>
						<div>
							<Label
								htmlFor="newPassword"
								className="text-gray-300"
							>
								New Password
							</Label>
							<Input
								id="newPassword"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Enter new password"
								className="bg-purple-800 border-purple-600 text-white"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() =>
								setChangePasswordDialog({
									open: false,
									user: null,
								})
							}
							className="border-gray-600 text-gray-300 hover:bg-gray-800"
						>
							Cancel
						</Button>
						<Button
							onClick={handleChangePassword}
							className="bg-blue-600 hover:bg-blue-700"
						>
							Update Credentials
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
