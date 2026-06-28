"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
	CheckCircle2,
	Circle,
	Clock,
	AlertTriangle,
	Pen,
	Eye,
	FileSignature,
	FileText,
	Truck,
	CalendarClock,
	Wallet,
	MessageSquare,
	Calendar,
	MapPin,
	Building,
	ChevronDown,
	ChevronUp,
	ChevronRight,
	Send,
	Edit,
	Loader2,
	X,
	Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "./SignaturePad";
import type {
	Booking,
	BookingStage,
	StageStatus,
	StageName,
	NegotiationMessage,
} from "@/types/bookingStages";
import { stageStatusLabels, stageStatusColors } from "@/types/bookingStages";

// ─── Stage Icons ───
const stageIconMap: Record<StageName, typeof FileText> = {
	contract: FileText,
	logistics: Truck,
	schedule: CalendarClock,
	payment: Wallet,
	communication: MessageSquare,
};

const stageIcons: Record<StageStatus, typeof CheckCircle2> = {
	draft: Circle,
	sent: Eye,
	under_review: Eye,
	changes_requested: AlertTriangle,
	approved: CheckCircle2,
	waiting_artist_signature: Pen,
	waiting_organiser_signature: FileSignature,
	completed: CheckCircle2,
};

const stageIconColors: Record<StageStatus, string> = {
	draft: "text-gray-400",
	sent: "text-blue-400",
	under_review: "text-orange-400",
	changes_requested: "text-amber-400",
	approved: "text-green-400",
	waiting_artist_signature: "text-purple-400",
	waiting_organiser_signature: "text-orange-400",
	completed: "text-green-400",
};

// ─── Stage Progress Tracker ───
function StageProgressTracker({
	stages,
	activeStage,
	onStageClick,
}: {
	stages: BookingStage[];
	activeStage: string;
	onStageClick: (name: string) => void;
}) {
	return (
		<div className="flex gap-2">
			{stages
				.filter((s) => s.name !== "communication")
				.map((stage) => {
					const Icon = stageIconMap[stage.name];
					const StatusIcon = stageIcons[stage.status];
					const isActive = activeStage === stage.name;
					return (
						<button
							key={stage.name}
							onClick={() => onStageClick(stage.name)}
							className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border flex-1 transition-all ${
								isActive
									? "bg-purple-500/15 border-purple-500/30 ring-1 ring-purple-500/20"
									: "bg-white/3 border-purple-500/10 hover:bg-white/5"
							}`}
						>
							<StatusIcon
								className={`w-3 h-3 ${stageIconColors[stage.status]}`}
							/>
							<Icon className="w-3 h-3 text-purple-200/50" />
							<span
								className={`text-[10px] font-medium truncate ${isActive ? "text-white" : "text-purple-200/50"}`}
							>
								{stage.label}
							</span>
						</button>
					);
				})}
		</div>
	);
}

// ─── Stage Data Display ───
function StageDataDisplay({
	booking,
	stageName,
}: {
	booking: Booking;
	stageName: StageName;
}) {
	const renderFields = (
		data: Record<string, string>,
		labels: Record<string, string>,
	) => (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{Object.entries(labels).map(([key, label]) => (
				<div key={key}>
					<p className="text-[11px] text-purple-200/50 font-medium uppercase tracking-wider">
						{label}
					</p>
					<p
						className={`text-sm font-medium ${(data as any)[key] ? "text-white" : "text-purple-200/30"}`}
					>
						{(data as any)[key] || "Not set"}
					</p>
				</div>
			))}
		</div>
	);

	switch (stageName) {
		case "contract":
			return renderFields(booking.contractData as any, {
				performanceAgreement: "Performance Agreement",
				bookingTerms: "Booking Terms",
				deliverables: "Deliverables",
				conditions: "Conditions",
				responsibilities: "Responsibilities",
				cancellationTerms: "Cancellation Terms",
				specialClauses: "Special Clauses",
			});
		case "logistics":
			return renderFields(booking.logisticsData as any, {
				travelDetails: "Travel Details",
				pickupDropoff: "Pickup / Drop-off",
				hotelAccommodation: "Hotel Accommodation",
				hospitalityRequirements: "Hospitality Requirements",
				technicalNeeds: "Technical Needs",
				localContactName: "Local Contact Name",
				localContactPhone: "Local Contact Phone",
				localContactEmail: "Local Contact Email",
			});
		case "schedule":
			return renderFields(booking.scheduleData as any, {
				rehearsalTimes: "Rehearsal Times",
				soundcheck: "Soundcheck",
				callTime: "Call Time",
				performanceSlot: "Performance Slot",
				showFlowTiming: "Show Flow Timing",
				reportingTime: "Reporting Time",
				otherMilestones: "Other Milestones",
			});
		case "payment":
			return renderFields(booking.paymentData as any, {
				performanceFee: "Performance Fee",
				deposit: "Deposit",
				depositDueDate: "Deposit Due Date",
				remainingBalance: "Remaining Balance",
				balanceDueDate: "Balance Due Date",
				paymentMethod: "Payment Method",
				invoiceStatus: "Invoice Status",
				paymentConditions: "Payment Conditions",
			});
		default:
			return null;
	}
}

// ─── Stage Actions ───
function StageActions({
	stage,
	booking,
	artistName,
	onAction,
	acting,
}: {
	stage: BookingStage;
	booking: Booking;
	artistName: string;
	onAction: (action: string, data?: any) => Promise<void>;
	acting: boolean;
}) {
	const [showQuestion, setShowQuestion] = useState(false);
	const [showChangeRequest, setShowChangeRequest] = useState(false);
	const [showArtistSign, setShowArtistSign] = useState(false);
	const [msgText, setMsgText] = useState("");

	const handleApprove = async () => {
		await onAction("approve", {
			sender: "artist",
			senderName: artistName,
		});
	};

	const handleSendMessage = async (type: NegotiationMessage["type"]) => {
		if (!msgText.trim()) return;
		await onAction(
			type === "change_request" ? "request_changes" : "add_negotiation",
			{
				message: {
					id: `neg-${Date.now()}`,
					sender: "artist",
					senderName: artistName,
					text: msgText.trim(),
					timestamp: new Date().toISOString(),
					type,
				},
			},
		);
		setMsgText("");
		setShowQuestion(false);
		setShowChangeRequest(false);
	};

	const handleArtistSign = async (dataUrl: string) => {
		await onAction("artist_sign", { signatureDataUrl: dataUrl });
		setShowArtistSign(false);
	};

	return (
		<div className="space-y-4">
			{/* Status badge */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-medium text-purple-200/50">
					Status:
				</span>
				<Badge
					className={`text-[10px] font-semibold border ${
						stage.status === "completed"
							? "bg-green-500/15 text-green-400 border-green-500/30"
							: stage.status === "changes_requested"
								? "bg-amber-500/15 text-amber-400 border-amber-500/30"
								: stage.status === "approved"
									? "bg-green-500/15 text-green-400 border-green-500/30"
									: "bg-blue-500/15 text-blue-400 border-blue-500/30"
					}`}
				>
					{stageStatusLabels[stage.status]}
				</Badge>
				{stage.artistSignature.signed && (
					<Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/30">
						<Pen className="w-3 h-3 mr-1" /> Artist Signed
					</Badge>
				)}
				{stage.organiserSignature.signed && (
					<Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/30">
						<Pen className="w-3 h-3 mr-1" /> Organiser Signed
					</Badge>
				)}
			</div>

			{/* Negotiation history */}
			{stage.negotiation.length > 0 && (
				<div className="space-y-2">
					<h5 className="text-xs font-semibold text-purple-200/50 uppercase tracking-wider">
						Discussion
					</h5>
					<div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-white/3 border border-purple-500/10">
						{stage.negotiation.map((msg) => {
							const isOwn = msg.sender === "artist";
							return (
								<div
									key={msg.id}
									className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
								>
									<div className="max-w-[80%] space-y-0.5">
										<div className="flex items-center gap-2">
											<span className="text-[10px] font-semibold text-purple-200/50">
												{msg.senderName}
											</span>
											{msg.type === "change_request" && (
												<Badge className="text-[8px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
													Change Request
												</Badge>
											)}
											{msg.type === "approval" && (
												<Badge className="text-[8px] px-1.5 py-0 bg-green-500/15 text-green-400 border-green-500/30">
													Approved
												</Badge>
											)}
										</div>
										<div
											className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
												isOwn
													? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm"
													: "bg-white/5 text-white rounded-bl-sm border border-purple-500/10"
											}`}
										>
											{msg.text}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Signature pad */}
			{showArtistSign && (
				<SignaturePad
					label="Artist Signature"
					onSign={handleArtistSign}
					onCancel={() => setShowArtistSign(false)}
				/>
			)}

			{/* Question / Change request forms */}
			{(showQuestion || showChangeRequest) && (
				<div className="space-y-2 p-3 rounded-lg border border-purple-500/10 bg-white/3">
					<p className="text-xs font-semibold text-white">
						{showQuestion ? "Ask a question" : "Request changes"}
					</p>
					<Textarea
						value={msgText}
						onChange={(e) => setMsgText(e.target.value)}
						placeholder={
							showQuestion
								? "Type your question..."
								: "Describe what needs to change..."
						}
						rows={3}
						className="bg-white/5 border-white/10 text-white rounded-xl text-sm resize-none focus:border-purple-400/50"
					/>
					<div className="flex gap-2 justify-end">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowQuestion(false);
								setShowChangeRequest(false);
								setMsgText("");
							}}
							className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0"
							onClick={() =>
								handleSendMessage(
									showQuestion
										? "question"
										: "change_request",
								)
							}
							disabled={!msgText.trim() || acting}
						>
							{acting ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Send className="w-3.5 h-3.5" />
							)}{" "}
							Send
						</Button>
					</div>
				</div>
			)}

			{/* Action buttons based on status */}
			{!showArtistSign && !showQuestion && !showChangeRequest && (
				<div className="flex flex-wrap gap-2">
					{/* Artist can approve when stage is sent, under_review, or changes_requested */}
					{(stage.status === "sent" ||
						stage.status === "under_review" ||
						stage.status === "changes_requested") && (
						<>
							<Button
								size="sm"
								onClick={handleApprove}
								disabled={acting}
								className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl gap-1.5 text-white border-0 shadow-lg shadow-green-500/20"
							>
								{acting ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
								) : (
									<CheckCircle2 className="w-3.5 h-3.5" />
								)}{" "}
								Approve
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowQuestion(true)}
								className="text-purple-200 hover:text-white hover:bg-white/5 rounded-xl gap-1.5 border border-white/10"
							>
								<MessageSquare className="w-3.5 h-3.5" /> Ask
								Question
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowChangeRequest(true)}
								className="text-purple-200 hover:text-white hover:bg-white/5 rounded-xl gap-1.5 border border-white/10"
							>
								<Edit className="w-3.5 h-3.5" /> Request Changes
							</Button>
						</>
					)}

					{/* Artist signature when approved */}
					{stage.status === "approved" &&
						!stage.artistSignature.signed && (
							<Button
								size="sm"
								onClick={() => setShowArtistSign(true)}
								className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0"
							>
								<Pen className="w-3.5 h-3.5" /> Sign as Artist
							</Button>
						)}

					{/* Waiting for organiser */}
					{stage.status === "waiting_organiser_signature" && (
						<div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 w-full">
							<Clock className="w-4 h-4 text-purple-400" />
							<span className="text-xs font-medium text-white">
								Waiting for organiser to sign this stage
							</span>
						</div>
					)}

					{/* Completed state */}
					{stage.status === "completed" && (
						<div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 w-full">
							<CheckCircle2 className="w-4 h-4 text-green-400" />
							<span className="text-xs font-semibold text-white">
								This stage is fully signed and completed
							</span>
						</div>
					)}

					{/* Draft state */}
					{stage.status === "draft" && (
						<div className="flex items-center gap-2 p-3 rounded-lg bg-white/3 border border-purple-500/10 w-full">
							<AlertTriangle className="w-4 h-4 text-purple-200/40" />
							<span className="text-xs text-purple-200/40">
								The organiser is still preparing this stage. You
								will be notified when it&apos;s ready for
								review.
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Communication Panel ───
function CommunicationPanel({
	booking,
	artistName,
	onAction,
}: {
	booking: Booking;
	artistName: string;
	onAction: (action: string, data?: any) => Promise<void>;
}) {
	const [messages, setMessages] = useState<NegotiationMessage[]>(
		booking.communication || [],
	);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMessages(booking.communication || []);
	}, [booking.communication]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSend = async () => {
		if (!draft.trim()) return;
		setSending(true);
		const newMsg: NegotiationMessage = {
			id: `comm-${Date.now()}`,
			sender: "artist",
			senderName: artistName,
			text: draft.trim(),
			timestamp: new Date().toISOString(),
			type: "message",
		};
		setMessages((prev) => [...prev, newMsg]);
		setDraft("");
		await onAction("add_communication", { message: newMsg });
		setSending(false);
	};

	return (
		<div className="space-y-4">
			<div className="max-h-64 overflow-y-auto space-y-3 p-3 rounded-lg bg-white/3 border border-purple-500/10">
				{messages.length === 0 ? (
					<p className="text-xs text-purple-200/40 text-center py-4">
						No messages yet
					</p>
				) : (
					messages.map((msg) => {
						const isOwn = msg.sender === "artist";
						return (
							<div
								key={msg.id}
								className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
							>
								<div className="max-w-[75%] space-y-1">
									<div className="flex items-center gap-2">
										<span className="text-[11px] font-semibold text-purple-200/50">
											{msg.senderName}
										</span>
									</div>
									<div
										className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
											isOwn
												? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-md"
												: "bg-white/5 text-white rounded-bl-md border border-purple-500/10"
										}`}
									>
										{msg.text}
									</div>
								</div>
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>
			<div className="flex items-end gap-2">
				<Textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						}
					}}
					placeholder="Write message to organizer…"
					rows={1}
					className="min-h-[38px] max-h-[100px] resize-none text-sm bg-white/5 border-white/10 text-white rounded-xl focus:border-purple-400/50"
				/>
				<Button
					size="icon"
					onClick={handleSend}
					disabled={!draft.trim() || sending}
					className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 h-9 w-9 rounded-xl"
				>
					{sending ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Send className="w-4 h-4" />
					)}
				</Button>
			</div>
		</div>
	);
}

// ─── Booking Card ───
function BookingCard({
	booking,
	artistName,
	defaultExpanded,
	onRefresh,
}: {
	booking: Booking & { eventId: string; artist?: any };
	artistName: string;
	defaultExpanded: boolean;
	onRefresh: () => void;
}) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const [activeStage, setActiveStage] = useState<string>("contract");
	const [acting, setActing] = useState(false);
	const { toast } = useToast();

	const completedStages = booking.stages.filter(
		(s) => s.status === "completed",
	).length;
	const totalActionable = booking.stages.filter(
		(s) => s.name !== "communication",
	).length;
	const needsAttention = booking.stages.some(
		(s) =>
			s.status === "sent" ||
			s.status === "waiting_artist_signature" ||
			s.status === "changes_requested",
	);

	const currentStage = booking.stages.find((s) => s.name === activeStage);

	const handleAction = async (action: string, data?: any) => {
		setActing(true);
		try {
			const res = await fetch(
				`/api/contracts/${booking.eventId}/bookings/stages`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						bookingId: booking.id,
						stageName: activeStage,
						action,
						data,
					}),
				},
			);
			const result = await res.json();
			if (result.success) {
				const messages: Record<string, string> = {
					approve: "Stage approved!",
					request_changes: "Change request sent",
					add_negotiation: "Message sent",
					artist_sign: "Signature recorded!",
					add_communication: "Message sent",
				};
				toast({
					title: "Success",
					description: messages[action] || "Action completed",
				});

				// Emit WebSocket event
				try {
					const socket = (window as any).__fameLinkSocket;
					if (socket?.connected) {
						socket.emit("booking_stage_updated", {
							eventId: booking.eventId,
							bookingId: booking.id,
							stageName: activeStage,
							action,
							artistName,
						});
					}
				} catch {}

				onRefresh();
			} else {
				toast({
					title: "Error",
					description: result.error || "Action failed",
					variant: "destructive",
				});
			}
		} catch (err) {
			toast({
				title: "Error",
				description: "Failed to perform action",
				variant: "destructive",
			});
		} finally {
			setActing(false);
		}
	};

	return (
		<div className="glass-card rounded-2xl overflow-hidden transition-all border border-purple-500/20">
			{/* Header */}
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors"
			>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h3 className="text-sm font-bold text-white truncate">
							{booking.eventName}
						</h3>
						{needsAttention && (
							<Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse">
								Action needed
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-4 text-xs text-purple-200/50">
						<span className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							{booking.eventDates}
						</span>
						<span className="flex items-center gap-1">
							<MapPin className="w-3 h-3" />
							{booking.location}
						</span>
						<span className="flex items-center gap-1">
							<Building className="w-3 h-3" />
							{booking.organizerName}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Badge className="text-[10px] bg-white/5 text-purple-200 border-purple-500/20">
						{booking.role}
					</Badge>
					{expanded ? (
						<ChevronUp className="w-4 h-4 text-purple-200/50" />
					) : (
						<ChevronDown className="w-4 h-4 text-purple-200/50" />
					)}
				</div>
			</button>

			{/* Stage mini-progress (always visible) */}
			{!expanded && (
				<div className="px-5 pb-4 space-y-2">
					<div className="flex gap-2">
						{booking.stages
							.filter((s) => s.name !== "communication")
							.map((stage) => {
								const Icon = stageIconMap[stage.name];
								const StatusIcon = stageIcons[stage.status];
								return (
									<div
										key={stage.name}
										className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/3 border border-purple-500/10 flex-1"
									>
										<StatusIcon
											className={`w-3 h-3 ${stageIconColors[stage.status]}`}
										/>
										<Icon className="w-3 h-3 text-purple-200/40" />
										<span className="text-[10px] font-medium text-purple-200/50 truncate">
											{stage.label}
										</span>
									</div>
								);
							})}
					</div>
					<div className="flex items-center gap-2">
						<div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
							<div
								className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
								style={{
									width: `${totalActionable > 0 ? (completedStages / totalActionable) * 100 : 0}%`,
								}}
							/>
						</div>
						<span className="text-[10px] font-medium text-purple-200/50">
							{completedStages}/{totalActionable} completed
						</span>
					</div>
				</div>
			)}

			{/* Expanded detail */}
			{expanded && (
				<div className="border-t border-purple-500/10 px-5 py-5 space-y-5">
					<StageProgressTracker
						stages={booking.stages}
						activeStage={activeStage}
						onStageClick={setActiveStage}
					/>

					{currentStage && activeStage !== "communication" && (
						<div className="bg-white/2 rounded-xl border border-purple-500/10 p-5 space-y-5">
							<div className="flex items-center gap-2">
								{(() => {
									const Icon =
										stageIconMap[currentStage.name];
									return (
										<Icon className="w-4 h-4 text-purple-400" />
									);
								})()}
								<h4 className="text-sm font-bold text-white">
									{currentStage.label} Details
								</h4>
							</div>

							<StageDataDisplay
								booking={booking}
								stageName={currentStage.name}
							/>

							<div className="border-t border-purple-500/10 pt-4">
								<StageActions
									stage={currentStage}
									booking={booking}
									artistName={artistName}
									onAction={handleAction}
									acting={acting}
								/>
							</div>
						</div>
					)}

					{activeStage === "communication" && (
						<div className="bg-white/2 rounded-xl border border-purple-500/10 p-5">
							<div className="flex items-center gap-2 mb-4">
								<MessageSquare className="w-4 h-4 text-purple-400" />
								<h4 className="text-sm font-bold text-white">
									Communication
								</h4>
							</div>
							<CommunicationPanel
								booking={booking}
								artistName={artistName}
								onAction={handleAction}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Main Export ───
export function BookingWorkflow({
	artistEmail,
	artistId,
	artistName,
}: {
	artistEmail: string;
	artistId: string;
	artistName: string;
}) {
	const [bookings, setBookings] = useState<
		(Booking & { eventId: string; artist?: any })[]
	>([]);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	const fetchBookings = useCallback(async () => {
		try {
			const res = await fetch(
				`/api/contracts/famelink-bookings?email=${encodeURIComponent(artistEmail)}&artistId=${encodeURIComponent(artistId)}`,
			);
			const result = await res.json();
			if (result.success) {
				setBookings(result.bookings || []);
			}
		} catch (err) {
			console.error("Error fetching bookings:", err);
		} finally {
			setLoading(false);
		}
	}, [artistEmail, artistId]);

	useEffect(() => {
		fetchBookings();
	}, [fetchBookings]);

	// Listen for real-time updates
	useEffect(() => {
		const socket = (window as any).__fameLinkSocket;
		if (!socket || bookings.length === 0) return;

		const eventIds = new Set(bookings.map((b) => b.eventId));
		for (const eid of eventIds) {
			socket.emit("join_event_room", { eventId: eid });
		}

		const handleUpdate = (data: any) => {
			if (data?.eventId && eventIds.has(data.eventId)) {
				fetchBookings();
			}
		};

		socket.on("booking_stage_updated", handleUpdate);
		socket.on("booking_negotiation_added", handleUpdate);
		socket.on("booking_signature_submitted", handleUpdate);
		socket.on("booking_created", handleUpdate);

		return () => {
			socket.off("booking_stage_updated", handleUpdate);
			socket.off("booking_negotiation_added", handleUpdate);
			socket.off("booking_signature_submitted", handleUpdate);
			socket.off("booking_created", handleUpdate);
		};
	}, [fetchBookings, bookings.length]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
				<span className="ml-2 text-purple-200/50 text-sm">
					Loading bookings...
				</span>
			</div>
		);
	}

	if (bookings.length === 0) {
		return null; // Don't show section if no bookings
	}

	return (
		<div className="space-y-3">
			<div>
				<h2 className="text-lg font-bold text-white">Bookings</h2>
				<p className="text-sm text-purple-200/50">
					Your active bookings. Review stages, approve, negotiate, and
					sign.
				</p>
			</div>
			{bookings.map((booking) => (
				<BookingCard
					key={booking.id}
					booking={booking}
					artistName={artistName}
					defaultExpanded={bookings.length === 1}
					onRefresh={fetchBookings}
				/>
			))}
		</div>
	);
}
