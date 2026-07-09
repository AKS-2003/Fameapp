"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
	Calendar, MapPin, Music, Star, ExternalLink,
	CheckCircle2, XCircle, Loader2, ArrowRight, Sparkles,
	Globe, Users, Clock, Shield,
} from "lucide-react";

export default function InviteLandingPage() {
	const params = useParams();
	const router = useRouter();
	const invitationId = params.invitationId as string;

	const [invitation, setInvitation] = useState<any>(null);
	const [event, setEvent] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [responding, setResponding] = useState(false);
	const [responseType, setResponseType] = useState<"accept" | "decline" | null>(null);

	useEffect(() => {
		async function fetchInvitation() {
			try {
				const res = await fetch(`/api/contracts/invite/${invitationId}`);
				const data = await res.json();
				if (data.success) {
					setInvitation(data.invitation);
					setEvent(data.event);
				} else {
					setError(data.error || "Invitation not found");
				}
			} catch (err) {
				setError("Failed to load invitation");
			} finally {
				setIsLoading(false);
			}
		}
		fetchInvitation();
	}, [invitationId]);

	// ─── Accept: update GCS → redirect to FameLink auth ───
	const handleAccept = async () => {
		setResponding(true);
		setResponseType("accept");
		try {
			const res = await fetch(`/api/contracts/invite/${invitationId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "accept" }),
			});
			const data = await res.json();
			if (data.success) {
				// Update local state immediately
				setInvitation((prev: any) => ({ ...prev, status: "waiting" }));
				// Short delay to show success animation, then redirect to FameLink auth
				setTimeout(() => {
					router.push(`/famelink-auth?from=invite&invitationId=${invitationId}`);
				}, 1500);
			}
		} catch (err) {
			setError("Failed to respond");
			setResponding(false);
		}
	};

	// ─── Decline: update GCS → show declined, option to go to FameLink ───
	const handleDecline = async () => {
		setResponding(true);
		setResponseType("decline");
		try {
			await fetch(`/api/contracts/invite/${invitationId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "decline" }),
			});
			setInvitation((prev: any) => ({ ...prev, status: "cancelled" }));
		} catch (err) {
			setError("Failed to respond");
		} finally {
			setResponding(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-3" />
					<p className="text-purple-300 text-sm">Loading your invitation...</p>
				</div>
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
				<div className="text-center max-w-md px-6">
					<XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-white mb-2">Invitation Not Found</h1>
					<p className="text-purple-300">{error || "This invitation link may have expired or is invalid."}</p>
				</div>
			</div>
		);
	}

	const isResponded = invitation.status !== "invited";
	const isAccepted = invitation.status === "waiting" || invitation.status === "accepted";
	const isDeclined = invitation.status === "cancelled";

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 relative overflow-hidden">
			{/* Background particles */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{[...Array(6)].map((_, i) => (
					<div key={i} className="absolute rounded-full bg-purple-500/10 animate-pulse"
						style={{ width: `${40 + i * 20}px`, height: `${40 + i * 20}px`, left: `${10 + i * 15}%`, top: `${20 + i * 10}%`, animationDelay: `${i * 0.8}s`, animationDuration: `${4 + i}s` }} />
				))}
			</div>

			<div className="relative z-10 max-w-xl mx-auto px-6 py-12">
				{/* Logo */}
				<div className="text-center mb-8">
					<Image src="/fame-logo.png" alt="FAME" width={72} height={72}
						className="mx-auto rounded-2xl mb-4 shadow-2xl shadow-purple-500/30" />
					<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-3">
						<Sparkles className="w-4 h-4 text-purple-400" />
						<span className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Invitation</span>
						<Sparkles className="w-4 h-4 text-pink-400" />
					</div>
					<p className="text-purple-300 text-sm">You have been invited to perform at</p>
				</div>

				{/* Event Card */}
				<div className="bg-purple-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 mb-6 shadow-2xl shadow-purple-500/10">
					{event && (
						<>
							<h2 className="text-2xl font-bold text-white mb-1 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
								{event.name || "Festival Event"}
							</h2>
							{event.description && (
								<p className="text-sm text-purple-400 mb-4">{event.description}</p>
							)}
							<div className="space-y-2.5">
								{event.location && (
									<div className="flex items-center gap-3 text-purple-300">
										<MapPin className="w-4 h-4 text-purple-400 shrink-0" />
										<span className="text-sm">{event.location}</span>
									</div>
								)}
								{event.dates && (
									<div className="flex items-center gap-3 text-purple-300">
										<Calendar className="w-4 h-4 text-purple-400 shrink-0" />
										<span className="text-sm">{event.dates}</span>
									</div>
								)}
							</div>
						</>
					)}
				</div>

				{/* Invitation Info */}
				<div className="bg-purple-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 mb-6 shadow-2xl shadow-purple-500/10">
					<h3 className="text-xs font-semibold text-purple-300 mb-4 uppercase tracking-wider">Your Invitation</h3>
					<div className="space-y-3">
						{[
							["Name", invitation.artistName],
							["Role", invitation.participantType],
							["Template", invitation.templateName],
						].map(([label, value]) => (
							<div key={label} className="flex justify-between items-center py-2 border-b border-purple-500/10">
								<span className="text-sm text-purple-400">{label}</span>
								<span className="text-sm text-white font-medium capitalize">{value}</span>
							</div>
						))}
						{invitation.artistEmail && (
							<div className="flex justify-between items-center py-2 border-b border-purple-500/10">
								<span className="text-sm text-purple-400">Login Email</span>
								<span className="text-sm text-white font-medium font-mono">
									{(() => {
										const [local, domain] = invitation.artistEmail.split("@");
										const masked = local.slice(0, 2) + "*".repeat(Math.max(local.length - 2, 2));
										return `${masked}@${domain}`;
									})()}
								</span>
							</div>
						)}
						{invitation.message && (
							<div className="pt-2">
								<span className="text-sm text-purple-400 block mb-1">Personal Message</span>
								<p className="text-sm text-white bg-purple-800/30 rounded-lg p-3 italic">&ldquo;{invitation.message}&rdquo;</p>
							</div>
						)}
					</div>
				</div>

				{/* ─── Action Buttons / Response State ─── */}
				{!isResponded ? (
					<div className="bg-purple-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 space-y-4">
						<h3 className="text-center text-white text-lg font-bold mb-2">Are you performing at this event?</h3>

						<button onClick={handleAccept} disabled={responding}
							className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg hover:from-green-400 hover:to-emerald-400 transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 disabled:opacity-50">
							{responding && responseType === "accept" ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<>
									<CheckCircle2 className="w-6 h-6" />
									<span>Yes, I&apos;m performing</span>
								</>
							)}
						</button>

						<button onClick={handleDecline} disabled={responding}
							className="w-full py-4 bg-purple-800/40 border border-purple-500/30 text-purple-300 rounded-xl font-medium hover:bg-purple-700/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
							{responding && responseType === "decline" ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : (
								<>
									<XCircle className="w-5 h-5" />
									<span>No, I&apos;m not performing</span>
								</>
							)}
						</button>
					</div>
				) : isAccepted ? (
					<div className="space-y-4">
						{/* Success card */}
						<div className="bg-purple-900/50 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 text-center">
							<div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
								<CheckCircle2 className="w-8 h-8 text-white" />
							</div>
							<h3 className="text-lg font-bold text-white mb-1">Invitation Accepted!</h3>
							<p className="text-sm text-purple-300 mb-4">Your response has been recorded. Please log in to your FameLink dashboard to complete your profile and answer event questions.</p>

							<div className="space-y-3">
								{/* What happens next */}
								<div className="bg-purple-800/30 rounded-xl p-4 text-left space-y-2.5">
									<h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">What happens next</h4>
									{[
										["Log in to FameLink", "Sign in to your artist dashboard"],
										["Complete your profile", "Fill in your travel & contact details"],
										["Answer event questions", "Respond to role-specific questions"],
										["Review agreement", "Check the terms and approve or negotiate"],
									].map(([title, desc], i) => (
										<div key={i} className="flex items-start gap-3">
											<div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-[10px] text-white font-bold">{i + 1}</span>
											</div>
											<div>
												<p className="text-sm font-medium text-white">{title}</p>
												<p className="text-xs text-purple-400">{desc}</p>
											</div>
										</div>
									))}
								</div>

								<button onClick={() => router.push(`/famelink-auth?from=invite&invitationId=${invitationId}`)}
									className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-400 hover:to-pink-400 transition-all shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2">
									<Globe className="w-5 h-5" />
									Continue to FameLink Dashboard
									<ArrowRight className="w-5 h-5" />
								</button>
							</div>
						</div>
					</div>
				) : isDeclined ? (
					<div className="bg-purple-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 text-center">
						<div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
							<XCircle className="w-8 h-8 text-red-400" />
						</div>
						<h3 className="text-lg font-bold text-white mb-1">Invitation Declined</h3>
						<p className="text-sm text-purple-300 mb-4">You&apos;ve declined this invitation. The organizer will be notified.</p>
						<button onClick={() => router.push(`/famelink-auth?from=invite&invitationId=${invitationId}`)}
							className="w-full py-3 bg-purple-800/40 border border-purple-500/30 text-purple-300 rounded-xl font-medium hover:bg-purple-700/40 transition-all flex items-center justify-center gap-2">
							<Globe className="w-4 h-4" />
							Go to FameLink Dashboard
						</button>
					</div>
				) : (
					<div className="text-center p-6 bg-purple-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl">
						<CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
						<p className="text-white font-semibold">Already Responded</p>
						<p className="text-sm text-purple-400 mt-1">You&apos;ve already responded to this invitation.</p>
						<button onClick={() => router.push(`/famelink-auth?from=invite&invitationId=${invitationId}`)}
							className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 transition-colors">
							Go to FameLink Dashboard
						</button>
					</div>
				)}

				{/* Footer */}
				<div className="text-center mt-10">
					<p className="text-xs text-purple-600">
						Powered by <span className="text-purple-400 font-medium">FameManager</span>
					</p>
				</div>
			</div>
		</div>
	);
}
