"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import {
	Calendar,
	MapPin,
	CheckCircle,
	XCircle,
	Sparkles,
	Loader2,
} from "lucide-react";

interface PublicEvent {
	id: string;
	name: string;
	venueName: string;
	startDate: string;
	endDate: string;
	description?: string;
	logoUrl?: string | null;
	showDates?: string[];
}

export default function JoinEventLandingPage() {
	const router = useRouter();
	const params = useParams();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<PublicEvent | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const res = await fetch(`/api/events/${eventId}/public`);
				const data = await res.json();
				if (data.success) {
					setEvent(data.data);
				} else {
					setError(data.error || "Event not found");
				}
			} catch {
				setError("Failed to load event");
			} finally {
				setLoading(false);
			}
		};
		if (eventId) fetchEvent();
	}, [eventId]);

	const handleYes = async () => {
		try {
			const res = await fetch("/api/auth/me");
			const data = await res.json();
			if (data.success && data.data?.role === "artist") {
				router.push(`/join-event/${eventId}/confirm`);
				return;
			}
		} catch {
			// Not logged in
		}
		router.push(`/famelink-auth?joinEventId=${eventId}`);
	};

	const handleNo = () => {
		router.push("/");
	};

	const formatDate = (dateStr: string) => {
		try {
			return new Date(dateStr).toLocaleDateString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch {
			return dateStr;
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
					<p className="text-purple-300/40 text-sm">
						Loading event...
					</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="min-h-screen bg-[#06020f] text-white flex items-center justify-center p-4 relative overflow-hidden">
				<div className="fixed inset-0 pointer-events-none">
					<div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[140px]" />
				</div>
				<div className="relative z-10 w-full max-w-md text-center">
					<FameLinkLogo width={56} height={56} />
					<div className="mt-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8">
						<XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
						<p className="text-purple-200/60">
							{error || "Event not found"}
						</p>
						<Button
							className="mt-6 w-full bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] rounded-xl py-5"
							onClick={() => router.push("/")}
						>
							Go Home
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#06020f] text-white relative overflow-hidden">
			<style jsx global>{`
				@keyframes inviteFadeUp {
					from {
						opacity: 0;
						transform: translateY(24px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes gradientFlow {
					0% {
						background-position: 0% 50%;
					}
					50% {
						background-position: 100% 50%;
					}
					100% {
						background-position: 0% 50%;
					}
				}
				@keyframes glowPulse {
					0%,
					100% {
						opacity: 0.4;
					}
					50% {
						opacity: 0.7;
					}
				}
				.invite-fade-up {
					animation: inviteFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)
						forwards;
					opacity: 0;
				}
				.glow-pulse {
					animation: glowPulse 3s ease-in-out infinite;
				}
			`}</style>

			{/* Ambient glow */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[140px] glow-pulse" />
				<div
					className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-pink-600/6 blur-[140px] glow-pulse"
					style={{ animationDelay: "1.5s" }}
				/>
			</div>

			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
				<div className="w-full max-w-md">
					{/* Logo */}
					<div
						className="invite-fade-up text-center mb-8"
						style={{ animationDelay: "0.05s" }}
					>
						<div className="relative inline-block mb-5">
							<div className="absolute inset-0 bg-purple-500/15 rounded-2xl blur-xl scale-150" />
							<FameLinkLogo width={64} height={64} />
						</div>
					</div>

					{/* Invitation Badge */}
					<div
						className="invite-fade-up text-center mb-6"
						style={{ animationDelay: "0.15s" }}
					>
						<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/20">
							<Sparkles className="h-3.5 w-3.5 text-pink-400" />
							<span className="text-xs font-semibold tracking-widest uppercase text-pink-300/80">
								Invitation
							</span>
							<Sparkles className="h-3.5 w-3.5 text-pink-400" />
						</div>
						<p className="mt-3 text-purple-200/50 text-sm">
							You have been invited to perform at
						</p>
					</div>

					{/* Event Info Card */}
					<div
						className="invite-fade-up"
						style={{ animationDelay: "0.25s" }}
					>
						<div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/5 p-6 sm:p-8">
							<h2
								className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent mb-2"
								style={{
									backgroundSize: "200% 200%",
									animation: "gradientFlow 4s ease infinite",
								}}
							>
								{event.name}
							</h2>
							{event.description && (
								<p className="text-center text-purple-200/40 text-sm mb-5">
									{event.description}
								</p>
							)}

							<div className="space-y-2.5 mt-5">
								{event.venueName && (
									<div className="flex items-center gap-3 text-purple-200/60 text-sm">
										<div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
											<MapPin className="h-4 w-4 text-purple-400" />
										</div>
										<span>{event.venueName}</span>
									</div>
								)}
								<div className="flex items-center gap-3 text-purple-200/60 text-sm">
									<div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
										<Calendar className="h-4 w-4 text-purple-400" />
									</div>
									<span>
										{formatDate(event.startDate)}
										{event.endDate &&
											event.endDate !==
												event.startDate && (
												<>
													{" "}
													—{" "}
													{formatDate(event.endDate)}
												</>
											)}
									</span>
								</div>
								{event.showDates &&
									event.showDates.length > 0 && (
										<p className="text-xs text-purple-300/30 pl-11">
											Show dates:{" "}
											{event.showDates
												.map((d) => formatDate(d))
												.join(", ")}
										</p>
									)}
							</div>
						</div>
					</div>

					{/* Action Card */}
					<div
						className="invite-fade-up mt-5"
						style={{ animationDelay: "0.35s" }}
					>
						<div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/5 p-6 sm:p-8">
							<h3 className="text-lg font-semibold text-center text-white mb-5">
								Are you performing at this event?
							</h3>
							<div className="space-y-3">
								<Button
									onClick={handleYes}
									className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-green-500/10 transition-all duration-300 hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98]"
								>
									<CheckCircle className="mr-2 h-5 w-5" />
									Yes, I'm performing
								</Button>
								<Button
									onClick={handleNo}
									className="w-full bg-white/[0.04] border border-white/[0.08] text-purple-200/60 hover:bg-white/[0.08] hover:text-white py-6 text-base rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
								>
									<XCircle className="mr-2 h-5 w-5" />
									No, I'm not performing
								</Button>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div
						className="invite-fade-up mt-8"
						style={{ animationDelay: "0.45s" }}
					>
						<FantasiaFooter variant="dark" />
					</div>
				</div>
			</div>
		</div>
	);
}
