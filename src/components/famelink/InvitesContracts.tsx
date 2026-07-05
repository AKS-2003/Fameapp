"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
	CheckCircle2,
	Circle,
	Clock,
	AlertTriangle,
	Send,
	FileText,
	Download,
	Edit,
	User,
	Plane,
	Hotel,
	DollarSign,
	Megaphone,
	Music,
	ChevronDown,
	ChevronUp,
	MapPin,
	Calendar,
	Building,
	MessageSquare,
	Check,
	Loader2,
	X,
	Bell,
	Truck,
	Paperclip,
	Lock,
	CheckSquare,
	ArrowRight,
	ArrowLeft,
	CreditCard,
	Maximize2,
	Minimize2,
	ClipboardList,
	Users,
	Car,
	Utensils,
	Info,
	Eye,
	Plus,
	Trash2,
	Sparkles,
	Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { LogisticsIntakeModal } from "./LogisticsIntakeModal";
import { SubmitShowModal } from "./SubmitShowModal";
import { AudioPlayer } from "@/components/ui/audio-player";
import FameLinkEventDashboard from "@/app/famelink/[artistId]/event/[eventId]/page";

// ─── Types ───
export type FLInviteStatus =
	| "new_invite"
	| "waiting"
	| "discussion"
	| "awaiting_approval"
	| "contract_sent"
	| "confirmed"
	| "cancelled";

export interface FLInvite {
	id: string;
	eventId: string;
	artistContractId: string;
	eventName: string;
	eventDates: string;
	eventStartDate?: string;
	eventEndDate?: string;
	location: string;
	organizerName: string;
	requireContractFirst?: boolean;
	role: string;
	status: FLInviteStatus;
	artist: any;
	invitation: any;
	conversations: any[];
	settings: any;
	event?: any;
}

const flStatusLabels: Record<string, string> = {
	new_invite: "New Invite",
	waiting: "Waiting for Your Info",
	discussion: "Under Discussion",
	awaiting_approval: "Awaiting Your Approval",
	contract_sent: "Agreement Sent",
	confirmed: "Confirmed",
	cancelled: "Declined",
};

const flStatusColors: Record<string, string> = {
	new_invite: "bg-pink-500/15 text-pink-400 border-pink-500/30",
	waiting: "bg-amber-500/15 text-amber-400 border-amber-500/30",
	discussion: "bg-blue-500/15 text-blue-400 border-blue-500/30",
	awaiting_approval: "bg-orange-500/15 text-orange-400 border-orange-500/30",
	contract_sent: "bg-purple-500/15 text-purple-400 border-purple-500/30",
	confirmed: "bg-green-500/15 text-green-400 border-green-500/30",
	cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const flStatusDotColors: Record<string, string> = {
	new_invite: "bg-pink-400",
	waiting: "bg-amber-400",
	discussion: "bg-blue-400",
	awaiting_approval: "bg-orange-400",
	contract_sent: "bg-purple-400",
	confirmed: "bg-green-400",
	cancelled: "bg-red-400",
};

// ─── Workflow Progress ───
function WorkflowProgress({ artist }: { artist: any }) {
	type StageStatus =
		| "completed"
		| "in_progress"
		| "waiting_for_you"
		| "confirmed";
	const steps: { label: string; status: StageStatus }[] = [
		{
			label: "Profile",
			status:
				artist.profileStatus === "received"
					? "completed"
					: "waiting_for_you",
		},
		{
			label: "Event Questions",
			status: artist.eventQuestions
				?.filter((q: any) => q.category !== "stable")
				.every((q: any) => q.answer)
				? "completed"
				: artist.eventQuestions
							?.filter((q: any) => q.category !== "stable")
							.some((q: any) => q.answer)
					? "in_progress"
					: "waiting_for_you",
		},
		{
			label: "Agreement",
			status:
				artist.status === "confirmed"
					? "confirmed"
					: artist.status === "awaiting"
						? "completed"
						: artist.status === "negotiation"
							? "in_progress"
							: "waiting_for_you",
		},
		{
			label: "Contract",
			status:
				artist.contractDocStatus === "confirmed"
					? "confirmed"
					: artist.contractDocStatus === "signed"
						? "completed"
						: artist.contractDocStatus === "awaiting_signature" ||
							  artist.contractDocStatus === "sent"
							? "in_progress"
							: "waiting_for_you",
		},
	];

	const statusConfig: Record<
		StageStatus,
		{
			icon: typeof CheckCircle2;
			color: string;
			bgColor: string;
			label: string;
		}
	> = {
		completed: {
			icon: CheckCircle2,
			color: "text-green-400",
			bgColor: "bg-green-500/15 border-green-500/30",
			label: "Completed",
		},
		in_progress: {
			icon: Clock,
			color: "text-blue-400",
			bgColor: "bg-blue-500/15 border-blue-500/30",
			label: "In Progress",
		},
		waiting_for_you: {
			icon: Circle,
			color: "text-amber-400",
			bgColor: "bg-amber-500/15 border-amber-500/30",
			label: "Waiting for You",
		},
		confirmed: {
			icon: CheckCircle2,
			color: "text-green-400",
			bgColor: "bg-green-500/15 border-green-500/30",
			label: "Confirmed",
		},
	};

	return (
		<div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-white/3 border border-purple-500/10">
			{steps.map((step) => {
				const cfg = statusConfig[step.status];
				const Icon = cfg.icon;
				return (
					<div
						key={step.label}
						className="flex flex-col items-center gap-1.5 text-center"
					>
						<Icon className={`w-5 h-5 ${cfg.color}`} />
						<span className={`text-xs font-semibold ${cfg.color}`}>
							{step.label}
						</span>
						<span
							className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bgColor}`}
						>
							{cfg.label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── Profile Panel ───
function ProfilePanel({
	artist,
	onUpdate,
}: {
	artist: any;
	onUpdate: (data: any) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		stageName: artist.stageName || "",
		legalName: artist.legalName || "",
		nationality: artist.nationality || "",
		email: artist.email || "",
		phone: artist.phone || "",
		nearestAirport: artist.nearestAirport || "",
		travelPreferences: artist.travelPreferences || "",
		hotelRoomPreference: artist.hotelRoomPreference || "",
		dietaryPreferences: artist.dietaryPreferences || "",
	});

	const fields: [string, string, string][] = [
		["Stage Name", form.stageName, "stageName"],
		["Legal Name", form.legalName, "legalName"],
		["Nationality", form.nationality, "nationality"],
		["Email", form.email, "email"],
		["Phone", form.phone, "phone"],
		["Nearest Airport", form.nearestAirport, "nearestAirport"],
		["Travel Preferences", form.travelPreferences, "travelPreferences"],
		["Hotel Preference", form.hotelRoomPreference, "hotelRoomPreference"],
		["Dietary Preferences", form.dietaryPreferences, "dietaryPreferences"],
	];

	const missingFields = fields.filter(([, v]) => !v).map(([l]) => l);

	const handleSave = async () => {
		setSaving(true);
		await onUpdate({ profileData: form });
		setSaving(false);
		setEditing(false);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<User className="w-4 h-4 text-purple-400" />
				<h4 className="text-sm font-bold text-white">Profile</h4>
			</div>
			{missingFields.length > 0 && !editing && (
				<div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
					<div className="flex items-center gap-1.5 mb-1">
						<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
						<span className="text-xs font-semibold text-amber-400">
							Missing information
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{missingFields.map((f) => (
							<span
								key={f}
								className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
							>
								{f}
							</span>
						))}
					</div>
				</div>
			)}
			{editing ? (
				<div className="grid grid-cols-2 gap-3">
					{fields.map(([label, value, key]) => (
						<div key={key} className="space-y-1">
							<label className="text-[11px] text-purple-200/50 font-medium uppercase tracking-wider">
								{label}
							</label>
							<Input
								value={(form as any)[key]}
								onChange={(e) =>
									setForm({ ...form, [key]: e.target.value })
								}
								className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-sm focus:border-purple-400/50"
								placeholder={`Enter ${label.toLowerCase()}`}
							/>
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
					{fields.map(([label, value]) => (
						<div key={label}>
							<p className="text-[11px] text-purple-200/50 font-medium uppercase tracking-wider">
								{label}
							</p>
							<p
								className={`text-sm font-medium ${value ? "text-white" : "text-amber-400"}`}
							>
								{value || "Missing"}
							</p>
						</div>
					))}
				</div>
			)}
			<div className="flex gap-2">
				{editing ? (
					<>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={saving}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0"
						>
							{saving ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Check className="w-3.5 h-3.5" />
							)}{" "}
							Save
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditing(false)}
							className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
						>
							Cancel
						</Button>
					</>
				) : (
					<Button
						size="sm"
						onClick={() => setEditing(true)}
						className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl gap-1.5"
					>
						<Edit className="w-3.5 h-3.5" /> Update Profile
					</Button>
				)}
			</div>
		</div>
	);
}

// ─── Questions Panel ───
function QuestionsPanel({
	artist,
	onUpdate,
}: {
	artist: any;
	onUpdate: (data: any) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const questions = artist.eventQuestions || [];
	const flexibleQs = questions.filter((q: any) => q.category === "flexible");
	const eventQs = questions.filter(
		(q: any) => q.category === "event_specific",
	);

	useEffect(() => {
		const initial: Record<string, string> = {};
		questions.forEach((q: any) => {
			if (q.answer) initial[q.id] = q.answer;
		});
		setAnswers(initial);
	}, [artist]);

	const handleSave = async () => {
		setSaving(true);
		const updatedQuestions = questions.map((q: any) => ({
			...q,
			answer: answers[q.id] || q.answer || null,
		}));
		await onUpdate({ eventQuestions: updatedQuestions });
		setSaving(false);
		setEditing(false);
	};

	const renderGroup = (title: string, qs: any[]) => (
		<div className="space-y-2">
			<h5 className="text-xs font-semibold text-purple-200/50 uppercase tracking-wider">
				{title}
			</h5>
			{qs.length === 0 ? (
				<p className="text-xs text-purple-200/40 italic">
					No questions in this category
				</p>
			) : (
				qs.map((q: any) => (
					<div
						key={q.id}
						className="flex items-start justify-between py-2 border-b border-purple-500/10 last:border-0"
					>
						<div className="flex-1">
							<p className="text-sm font-medium text-white">
								{q.question}
							</p>
							{editing ? (
								<Input
									className="mt-1 text-sm h-8 bg-white/5 border-white/10 text-white rounded-xl focus:border-purple-400/50"
									value={answers[q.id] || ""}
									onChange={(e) =>
										setAnswers({
											...answers,
											[q.id]: e.target.value,
										})
									}
									placeholder="Enter answer..."
								/>
							) : q.answer ? (
								<p className="text-sm text-purple-200/60 mt-0.5">
									{q.answer}
								</p>
							) : (
								<div className="flex items-center gap-1 mt-0.5">
									<AlertTriangle className="w-3 h-3 text-amber-400" />
									<span className="text-xs font-medium text-amber-400">
										Missing
									</span>
								</div>
							)}
						</div>
					</div>
				))
			)}
		</div>
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<FileText className="w-4 h-4 text-purple-400" />
				<h4 className="text-sm font-bold text-white">
					Event Questions
				</h4>
			</div>
			{renderGroup("Role Specific", flexibleQs)}
			{eventQs.length > 0 && (
				<>
					<div className="border-t border-purple-500/10" />
					{renderGroup("Event Specific", eventQs)}
				</>
			)}
			<div className="flex gap-2">
				{editing ? (
					<>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={saving}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0"
						>
							{saving ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Check className="w-3.5 h-3.5" />
							)}{" "}
							Save
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setEditing(false)}
							className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
						>
							Cancel
						</Button>
					</>
				) : (
					<Button
						size="sm"
						onClick={() => setEditing(true)}
						className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl gap-1.5"
					>
						<Edit className="w-3.5 h-3.5" /> Edit Answers
					</Button>
				)}
			</div>
		</div>
	);
}

// ─── Agreement Panel ───
function AgreementPanel({
	artist,
	onAction,
}: {
	artist: any;
	onAction: (action: string, data?: any) => Promise<void>;
}) {
	const [requestingChanges, setRequestingChanges] = useState(false);
	const [changeMessage, setChangeMessage] = useState("");
	const [acting, setActing] = useState(false);
	const agreement = artist.agreement || {};

	const groups = [
		{
			icon: DollarSign,
			title: "Financial Terms",
			color: "text-amber-400",
			fields: [
				{ label: "Artist Fee", value: agreement.agreedFee },
				{ label: "Payment Method", value: agreement.paymentMethod },
				{ label: "Payment Terms", value: agreement.paymentSchedule },
			],
		},
		{
			icon: Music,
			title: "Participation",
			color: "text-pink-400",
			fields: [
				{
					label: "Workshops",
					value: agreement.workshopsConfirmed
						? String(agreement.workshopsConfirmed)
						: "",
				},
				{
					label: "Shows",
					value: agreement.showsConfirmed
						? String(agreement.showsConfirmed)
						: "",
				},
				{
					label: "DJ Sets",
					value: agreement.djSets ? String(agreement.djSets) : "",
				},
			],
		},
		{
			icon: Hotel,
			title: "Logistics",
			color: "text-blue-400",
			fields: [
				{
					label: "Hotel Nights",
					value: agreement.hotelNights
						? String(agreement.hotelNights)
						: "",
				},
				{ label: "Room Sharing", value: agreement.roomSharing },
				{
					label: "Airport Pickup",
					value: agreement.airportTransfer ? "Yes" : "No",
				},
				{
					label: "Food Vouchers",
					value: agreement.foodVouchers ? "Yes" : "No",
				},
			],
		},
		{
			icon: Plane,
			title: "Travel",
			color: "text-indigo-400",
			fields: [
				{ label: "Flight Budget", value: agreement.flightBudget },
				{ label: "Travel Class", value: agreement.travelClass },
				{ label: "Arrival Date", value: agreement.arrivalDate },
				{ label: "Departure Date", value: agreement.departureDate },
			],
		},
		{
			icon: Megaphone,
			title: "Promo Deliverables",
			color: "text-purple-400",
			fields: [
				{
					label: "Social Media Posts",
					value: agreement.socialMediaPosts
						? String(agreement.socialMediaPosts)
						: "",
				},
				{
					label: "Promo Obligations",
					value: agreement.promoObligations,
				},
				{ label: "Ambassador Tasks", value: agreement.ambassadorTasks },
			],
		},
	];

	const handleApprove = async () => {
		setActing(true);
		await onAction("approve_agreement");
		setActing(false);
	};

	const handleRequestChanges = async () => {
		if (!changeMessage.trim()) return;
		setActing(true);
		await onAction("request_changes", {
			message: changeMessage,
			artistName: artist.stageName,
		});
		setChangeMessage("");
		setRequestingChanges(false);
		setActing(false);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 mb-1">
				<FileText className="w-4 h-4 text-purple-400" />
				<h4 className="text-sm font-bold text-white">
					Agreement Summary
				</h4>
			</div>
			<div className="space-y-5">
				{groups.map((group) => (
					<div key={group.title}>
						<div className="flex items-center gap-2 mb-2">
							<group.icon className={`w-4 h-4 ${group.color}`} />
							<h5 className="text-sm font-semibold text-white">
								{group.title}
							</h5>
						</div>
						<div className="grid grid-cols-2 gap-x-6 gap-y-2 pl-6">
							{group.fields.map((field) => (
								<div key={field.label}>
									<p className="text-[11px] text-purple-200/50 font-medium uppercase tracking-wider">
										{field.label}
									</p>
									<p
										className={`text-sm font-medium ${field.value && field.value !== "0" ? "text-white" : "text-purple-200/30"}`}
									>
										{field.value && field.value !== "0"
											? field.value
											: "Not set"}
									</p>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{requestingChanges ? (
				<div className="space-y-3 p-4 rounded-xl bg-white/3 border border-purple-500/10">
					<Textarea
						value={changeMessage}
						onChange={(e) => setChangeMessage(e.target.value)}
						placeholder="Describe the changes you'd like to request..."
						rows={3}
						className="bg-white/5 border-white/10 text-white rounded-xl text-sm resize-none focus:border-purple-400/50"
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={handleRequestChanges}
							disabled={acting || !changeMessage.trim()}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0"
						>
							{acting ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Send className="w-3.5 h-3.5" />
							)}{" "}
							Send Request
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setRequestingChanges(false)}
							className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
						>
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<div className="flex gap-2 flex-wrap">
					{artist.status !== "confirmed" &&
						artist.status !== "awaiting" && (
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
								Approve Agreement
							</Button>
						)}
					{artist.status !== "confirmed" && (
						<Button
							size="sm"
							onClick={() => setRequestingChanges(true)}
							className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl gap-1.5"
						>
							<Edit className="w-3.5 h-3.5" /> Request Changes
						</Button>
					)}
					<Button
						size="sm"
						onClick={() =>
							onAction("send_message", {
								message:
									"I have a question about the agreement.",
								artistName: artist.stageName,
							})
						}
						className="bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 rounded-xl gap-1.5"
					>
						<MessageSquare className="w-3.5 h-3.5" /> Ask Question
					</Button>
				</div>
			)}
		</div>
	);
}

// ─── Contract Panel ───
export function ContractPanel({
	artist,
	invite,
	onAction,
	autoOpenDialog,
	onClose,
	theme = "dark",
}: {
	artist: any;
	invite: any;
	onAction: (action: string, data?: any) => Promise<any> | void;
	autoOpenDialog?: boolean;
	onClose?: () => void;
	theme?: "dark" | "light";
}) {
	const [acting, setActing] = useState(false);
	const [showDocuments, setShowDocuments] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [showSchedule, setShowSchedule] = useState(true);
	const [showTasks, setShowTasks] = useState(true);
	const [showPayment, setShowPayment] = useState(true);
	const [isOpenReviewDialog, setIsOpenReviewDialog] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [signingStep, setSigningStep] = useState<"idle" | "signing" | "success">("idle");
	const [agreeChecked, setAgreeChecked] = useState(false);
	const [agreeSignature, setAgreeSignature] = useState("");
	const [isEditingSignature, setIsEditingSignature] = useState(false);

	useEffect(() => {
		if (autoOpenDialog) {
			setIsOpenReviewDialog(true);
		}
	}, [autoOpenDialog]);

	const isLight = theme === "light";
	const textPrimary = isLight ? "text-slate-900" : "text-white";
	const textSecondary = isLight ? "text-slate-500" : "text-purple-200/60";
	const textTertiary = isLight ? "text-slate-400" : "text-purple-200/50";
	const borderCol = isLight ? "border-slate-200" : "border-white/10";
	const borderAccordion = isLight ? "border-slate-100" : "border-white/5";
	const bgCard = isLight ? "bg-slate-50/50" : "bg-white/5";
	const bgBadge = isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 text-purple-200 border-purple-500/20";

	const legalName = artist.realName || artist.artistName || artist.stageName || "Artist";
	const isSignatureValid = agreeChecked && agreeSignature.trim().toLowerCase() === legalName.trim().toLowerCase();

	const handleEditSignature = () => {
		setIsEditingSignature(true);
		setIsOpenReviewDialog(true);
	};

	const handleRequestChanges = async (message: string) => {
		setActing(true);
		try {
			await onAction("request_changes", {
				message: message,
				artistName: artist.stageName || legalName,
			});
			setIsOpenReviewDialog(false);
		} catch (error) {
			console.error("Failed to request changes:", error);
		} finally {
			setActing(false);
		}
	};

	const handleAcceptContract = async () => {
		setActing(true);
		setSigningStep("signing");
		try {
			await onAction("accept_contract", { signatureName: agreeSignature });
			setSigningStep("success");
			// Wait 1.5 seconds to show the success state before closing
			await new Promise((resolve) => setTimeout(resolve, 1500));
			setIsOpenReviewDialog(false);
		} catch (error) {
			console.error("Signing failed:", error);
			setSigningStep("idle");
		} finally {
			setActing(false);
		}
	};

	const handleWithdrawSignature = async () => {
		setActing(true);
		try {
			await onAction("withdraw_signature");
			setIsEditingSignature(false);
			setIsOpenReviewDialog(false);
		} catch (error) {
			console.error("Withdrawing signature failed:", error);
		} finally {
			setActing(false);
		}
	};

	const documents = artist.agreement?.contractDetails?.documents || [];
	const clauses = artist.agreement?.contractDetails?.clauses || [];

	const schedule = artist.agreement?.schedule || { workshops: [], performances: [], tasks: [] };
	const workshops = schedule.workshops || [];
	const performances = schedule.performances || [];
	const tasks = schedule.tasks || [];
	const totalScheduleItems = workshops.length + performances.length;

	const payment = artist.agreement?.payment || { calculation: {}, details: {}, customLines: [] };
	const paymentDetails = payment.details || {};
	const performanceFee = paymentDetails.performanceFee || "";
	const downpayment = paymentDetails.downpayment || "";
	const downpaymentDate = paymentDetails.downpaymentDate || "";
	const balanceDueDate = paymentDetails.balanceDueDate || "";
	const paymentMethod = paymentDetails.paymentMethod || "";
	const amountPaid = paymentDetails.amountPaid || "";
	const paymentNotes = paymentDetails.notes || "";

	const formatCurrency = (val: any) => {
		if (!val) return "—";
		if (String(val).includes("€")) return val;
		const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
		if (isNaN(num)) return val;
		return `€${num.toLocaleString()}`;
	};

	// ── Dynamic Resolution of Contract Fields ──
	const getPerformanceAgreement = () => {
		if (artist.agreement?.performance) {
			return artist.agreement.performance;
		}
		const parts = [];
		if (artist.agreement?.workshopsConfirmed) {
			parts.push(`${artist.agreement.workshopsConfirmed} workshops`);
		}
		if (artist.agreement?.showsConfirmed) {
			parts.push(`${artist.agreement.showsConfirmed} shows`);
		}
		if (artist.agreement?.djSets) {
			parts.push(`${artist.agreement.djSets} dj sets`);
		}
		if (parts.length > 0) {
			return parts.join(" + ");
		}
		return artist.role === "dj" ? "DJ Set" : artist.role === "group" ? "Band Performance" : "Solo Performance";
	};

	const performanceAgreement = getPerformanceAgreement();

	const bookingClause = clauses.find((c: any) => c.title?.toLowerCase() === "booking terms")?.content;
	const resolvedBookingTerms = (bookingClause && bookingClause.trim()) || 
		artist.agreement?.bookingTerms || 
		artist.agreement?.contractDetails?.bookingTerms || 
		"Not specified";

	const deliverablesClause = clauses.find((c: any) => c.title?.toLowerCase() === "performance deliverables" || c.title?.toLowerCase() === "deliverables")?.content;
	const resolvedDeliverables = (deliverablesClause && deliverablesClause.trim()) || 
		artist.agreement?.deliverables || 
		artist.agreement?.contractDetails?.deliverables || 
		"Not specified";

	return (
		<div className="space-y-6">
			{/* Header area with Status and Review button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className={`text-[10px] font-semibold ${textTertiary} uppercase tracking-wider`}>Status</span>
					<Badge className={`text-[10px] ${bgBadge}`}>{artist.contractDocStatus || "Pending"}</Badge>
				</div>
				{artist.contractDocStatus === "signed" ? (
					<div className="flex items-center gap-3">
						<span className="text-emerald-400 font-bold text-sm">Signed the agreement</span>
						<Button 
							onClick={handleEditSignature}
							disabled={acting}
							className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl font-medium px-4 h-9"
						>
							Edit
						</Button>
					</div>
				) : (
					<Button 
						onClick={() => setIsOpenReviewDialog(true)}
						disabled={acting}
						className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:from-[#a819bb] hover:to-[#e559cd] text-white rounded-xl border-0 font-medium"
					>
						Review & Sign
					</Button>
				)}
			</div>

			{/* Title and Subtitle */}
			<div>
				<h3 className={`text-xl font-bold ${textPrimary} mb-1`}>Agreement • {invite.eventName}</h3>
				<p className={`text-sm ${textSecondary}`}>Review the full agreement terms, schedule and payment, then sign digitally.</p>
			</div>

			{/* 4-Grid Information */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pl-4 border-l-[3px] border-[#bf1ed4] py-1">
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Performance Agreement</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{performanceAgreement}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Proposed Fee</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{artist.agreement?.proposedFee || artist.agreement?.agreedFee || "Not specified"}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Booking Terms</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{resolvedBookingTerms}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Deliverables</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{resolvedDeliverables}</p>
				</div>
			</div>

			{/* Accordions */}
			<div className="space-y-3 pt-4">
				<div className={`${bgCard} border ${borderCol} rounded-xl overflow-hidden`}>
					<button 
						onClick={() => setShowDocuments(!showDocuments)}
						className={`w-full px-5 py-4 flex items-center justify-between text-left ${isLight ? "hover:bg-slate-100/50" : "hover:bg-white/5"} transition-colors ${showDocuments ? `border-b ${borderAccordion}` : ""}`}
					>
						<div className="flex items-center gap-3">
							<Paperclip className="w-4 h-4 text-purple-400" />
							<span className={`text-sm font-semibold ${textPrimary}`}>Agreement documents</span>
						</div>
						<div className="flex items-center gap-3">
							<span className={`text-[10px] ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/10 text-purple-200/50"} px-2 py-0.5 rounded-full font-bold`}>{documents.length}</span>
							{showDocuments ? <ChevronUp className={`w-4 h-4 ${textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${textTertiary}`} />}
						</div>
					</button>
					{showDocuments && (
						<div className="px-5 py-6">
							{documents.length > 0 ? (
								<div className="space-y-3">
									{documents.map((doc: any, idx: number) => (
										<div key={idx} className={`flex items-center justify-between ${isLight ? "bg-white border border-slate-200" : "bg-white/5 border border-white/10"} rounded-xl p-3`}>
											<div className="flex items-center gap-3">
												<FileText className="w-4 h-4 text-purple-400" />
												<span className={`text-sm font-medium ${textPrimary}`}>{doc.name}</span>
											</div>
											<div className="flex items-center gap-4">
												<span className={`text-xs ${textTertiary}`}>{doc.size}</span>
												{doc.url && (
													<a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
														<Download className="w-4 h-4" />
													</a>
												)}
											</div>
										</div>
									))}
								</div>
							) : (
								<p className={`text-sm ${textSecondary}`}>No documents attached yet.</p>
							)}
						</div>
					)}
				</div>

				<div className={`${bgCard} border ${borderCol} rounded-xl overflow-hidden`}>
					<button 
						onClick={() => setShowDetails(!showDetails)}
						className={`w-full px-5 py-4 flex items-center justify-between text-left ${isLight ? "hover:bg-slate-100/50" : "hover:bg-white/5"} transition-colors ${showDetails ? `border-b ${borderAccordion}` : ""}`}
					>
						<div className="flex items-center gap-3">
							<FileText className="w-4 h-4 text-purple-400" />
							<span className={`text-sm font-semibold ${textPrimary}`}>Agreement details</span>
							{artist.sectionStatuses?.agreement_details === "not_required" && (
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Not Required</span>
							)}
						</div>
						<div className="flex items-center gap-3">
							<span className={`text-[10px] ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/10 text-purple-200/50"} px-2 py-0.5 rounded-full font-bold`}>{clauses.length}</span>
							{showDetails ? <ChevronUp className={`w-4 h-4 ${textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${textTertiary}`} />}
						</div>
					</button>
					{showDetails && (
						<div className="px-5 py-6 space-y-6">
							{clauses.length > 0 ? (
								clauses.map((clause: any, idx: number) => (
									<div key={idx}>
										<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>{clause.title}</p>
										<p className={`text-sm ${textPrimary} leading-relaxed whitespace-pre-wrap`}>{clause.content || "Not specified"}</p>
									</div>
								))
							) : (
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Agreement Clauses</p>
									<p className={`text-sm ${textPrimary} leading-relaxed`}>No additional agreement details provided.</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Schedule Accordion */}
				<div className={`${bgCard} border ${borderCol} rounded-xl overflow-hidden`}>
					<button 
						onClick={() => setShowSchedule(!showSchedule)}
						className={`w-full px-5 py-4 flex items-center justify-between text-left ${isLight ? "hover:bg-slate-100/50" : "hover:bg-white/5"} transition-colors ${showSchedule ? `border-b ${borderAccordion}` : ""}`}
					>
						<div className="flex items-center gap-3">
							<Calendar className="w-4 h-4 text-purple-400" />
							<span className={`text-sm font-semibold ${textPrimary}`}>Schedule</span>
						</div>
						<div className="flex items-center gap-3">
							<span className={`text-[10px] ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/10 text-purple-200/50"} px-2 py-0.5 rounded-full font-bold`}>{totalScheduleItems}</span>
							{showSchedule ? <ChevronUp className={`w-4 h-4 ${textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${textTertiary}`} />}
						</div>
					</button>
					{showSchedule && (
						<div className="px-5 py-6 space-y-6">
							{workshops.length === 0 && performances.length === 0 ? (
								<p className={`text-sm ${textSecondary}`}>No schedule items provided.</p>
							) : (
								<>
									{workshops.length > 0 && (
										<div className="space-y-3">
											<div className="flex items-center gap-2">
											<p className={`text-[10px] ${isLight ? "text-slate-400" : "text-purple-200/40"} uppercase tracking-wider font-bold`}>Workshops</p>
											{artist.sectionStatuses?.workshops === "not_required" && (
												<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Not Required</span>
											)}
										</div>
											<div className="space-y-2">
												{workshops.map((item: any, idx: number) => (
													<div key={idx} className={`flex items-start gap-2.5 text-sm ${isLight ? "text-slate-600" : "text-purple-200/80"}`}>
														<span className="text-purple-400 shrink-0 mt-0.5">›</span>
														<p>
															<span className={`${textPrimary} font-semibold`}>{item.title}</span>
															{item.date || item.time || item.location ? " — " : ""}
															{item.date && <span>{item.date}</span>}
															{item.time && <span className={isLight ? "text-slate-400" : "text-purple-200/60"}> · {item.time}{item.endTime ? `–${item.endTime}` : ""}</span>}
															{item.location && <span className={isLight ? "text-slate-400" : "text-purple-200/60"}> · {item.location}</span>}
															{item.description && <span className={isLight ? "text-slate-400/70" : "text-purple-200/40"}> · ({item.description})</span>}
														</p>
													</div>
												))}
											</div>
										</div>
									)}

									{performances.length > 0 && (
										<div className="space-y-3">
											<div className="flex items-center gap-2">
											<p className={`text-[10px] ${isLight ? "text-slate-400" : "text-purple-200/40"} uppercase tracking-wider font-bold`}>Performances</p>
											{artist.sectionStatuses?.performances === "not_required" && (
												<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Not Required</span>
											)}
										</div>
											<div className="space-y-2">
												{performances.map((item: any, idx: number) => (
													<div key={idx} className={`flex items-start gap-2.5 text-sm ${isLight ? "text-slate-600" : "text-purple-200/80"}`}>
														<span className="text-purple-400 shrink-0 mt-0.5">›</span>
														<p>
															<span className={`${textPrimary} font-semibold`}>{item.title}</span>
															{item.date || item.time || item.location ? " — " : ""}
															{item.date && <span>{item.date}</span>}
															{item.time && <span className={isLight ? "text-slate-400" : "text-purple-200/60"}> · {item.time}{item.endTime ? `–${item.endTime}` : ""}</span>}
															{item.location && <span className={isLight ? "text-slate-400" : "text-purple-200/60"}> · {item.location}</span>}
															{item.description && <span className={isLight ? "text-slate-400/70" : "text-purple-200/40"}> · ({item.description})</span>}
														</p>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>

				{/* Custom Tasks Accordion */}
				<div className={`${bgCard} border ${borderCol} rounded-xl overflow-hidden`}>
					<button 
						onClick={() => setShowTasks(!showTasks)}
						className={`w-full px-5 py-4 flex items-center justify-between text-left ${isLight ? "hover:bg-slate-100/50" : "hover:bg-white/5"} transition-colors ${showTasks ? `border-b ${borderAccordion}` : ""}`}
					>
						<div className="flex items-center gap-3">
							<CheckCircle2 className="w-4 h-4 text-purple-400" />
							<span className={`text-sm font-semibold ${textPrimary}`}>Custom tasks</span>
							{artist.sectionStatuses?.custom_tasks === "not_required" && (
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Not Required</span>
							)}
						</div>
						<div className="flex items-center gap-3">
							<span className={`text-[10px] ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/10 text-purple-200/50"} px-2 py-0.5 rounded-full font-bold`}>{tasks.length}</span>
							{showTasks ? <ChevronUp className={`w-4 h-4 ${textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${textTertiary}`} />}
						</div>
					</button>
					{showTasks && (
						<div className="px-5 py-6 space-y-3">
							{tasks.length === 0 ? (
								<p className={`text-sm ${textSecondary}`}>No custom tasks assigned.</p>
							) : (
								tasks.map((task: any, idx: number) => (
									<div key={idx} className={`flex items-start gap-2.5 text-sm ${isLight ? "text-slate-600" : "text-purple-200/80"}`}>
										<span className="text-purple-400 shrink-0 mt-0.5">›</span>
										<p>
											<span className={`${textPrimary} font-semibold`}>{task.title}</span>
											{task.description ? ` — ${task.description}` : ""}
										</p>
									</div>
								))
							)}
						</div>
					)}
				</div>

				{/* Payment Accordion */}
				<div className={`${bgCard} border ${borderCol} rounded-xl overflow-hidden`}>
					<button 
						onClick={() => setShowPayment(!showPayment)}
						className={`w-full px-5 py-4 flex items-center justify-between text-left ${isLight ? "hover:bg-slate-100/50" : "hover:bg-white/5"} transition-colors ${showPayment ? `border-b ${borderAccordion}` : ""}`}
					>
						<div className="flex items-center gap-3">
							<CreditCard className="w-4 h-4 text-purple-400" />
							<span className={`text-sm font-semibold ${textPrimary}`}>Payment</span>
							{artist.sectionStatuses?.payment === "not_required" && (
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Not Required</span>
							)}
						</div>
						<div className="flex items-center gap-3">
							<span className={`text-[10px] ${isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-purple-200/50"} px-2 py-0.5 rounded-full font-bold`}>{formatCurrency(performanceFee)}</span>
							{showPayment ? <ChevronUp className={`w-4 h-4 ${textTertiary}`} /> : <ChevronDown className={`w-4 h-4 ${textTertiary}`} />}
						</div>
					</button>
					{showPayment && (
						<div className="px-5 py-6">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Performance Fee</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{formatCurrency(performanceFee)}</p>
								</div>
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Downpayment</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{formatCurrency(downpayment)}</p>
								</div>
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Downpayment Date</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{downpaymentDate || "—"}</p>
								</div>
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Balance Due Date</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{balanceDueDate || "—"}</p>
								</div>
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Payment Method</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{paymentMethod && paymentMethod !== "Select method" ? paymentMethod : "—"}</p>
								</div>
								<div>
									<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Amount Paid</p>
									<p className={`text-sm ${textPrimary} font-medium`}>{formatCurrency(amountPaid)}</p>
								</div>
							</div>
							{(paymentNotes || (payment.customLines && payment.customLines.length > 0)) && (
								<div className={`mt-5 pt-5 border-t ${isLight ? "border-slate-200" : "border-white/5"} space-y-4`}>
									{paymentNotes && (
										<div>
											<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Payment Notes</p>
											<p className={`text-sm ${textPrimary} leading-relaxed`}>{paymentNotes}</p>
										</div>
									)}
									{payment.customLines?.map((line: any) => (
										<div key={line.id}>
											<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>{line.name}</p>
											<p className={`text-sm ${textPrimary} leading-relaxed`}>{line.value || "—"}</p>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Review & Sign Popup Dialog */}
			<Dialog open={isOpenReviewDialog} onOpenChange={(open) => {
				setIsOpenReviewDialog(open);
				if (!open) {
					setIsFullscreen(false);
					setSigningStep("idle");
					setAgreeChecked(false);
					setAgreeSignature("");
					setIsEditingSignature(false);
					onClose?.();
				}
			}}>
				<DialogContent 
					className={cn(
						"bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col transition-all duration-200 overflow-hidden",
						isFullscreen 
							? "!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !m-0 !border-0 !shadow-none" 
							: "!max-w-4xl !w-[90vw] !max-h-[85vh] rounded-2xl"
					)}
				>
					{/* Modal Header */}
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pr-12 relative border-b border-slate-100 pb-4 shrink-0">
						<div>
							<DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
								Agreement - {invite.eventName}
							</DialogTitle>
							<DialogDescription className="text-sm text-slate-500 mt-1">
								Review the full agreement terms, schedule and payment, then sign digitally.
							</DialogDescription>
						</div>

						{/* Fullscreen Toggle Button */}
						{signingStep === "idle" && (
							<Button
								variant="ghost"
								onClick={() => setIsFullscreen(!isFullscreen)}
								className="shrink-0 bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white rounded-xl h-8 px-4 text-xs font-bold flex items-center gap-1.5 border-0 shadow-sm self-start"
							>
								{isFullscreen ? (
									<>
										<Minimize2 className="w-3.5 h-3.5" />
										Exit Fullscreen
									</>
								) : (
									<>
										<Maximize2 className="w-3.5 h-3.5" />
										Fullscreen
									</>
								)}
							</Button>
						)}
					</div>

					{signingStep !== "idle" ? (
						<div className="flex-1 flex flex-col items-center justify-center py-16 px-4 space-y-6">
							{signingStep === "signing" ? (
								<div className="flex flex-col items-center space-y-4 text-center">
									<div className="relative flex items-center justify-center">
										<div className="w-16 h-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
										<Lock className="w-6 h-6 text-purple-600 absolute" />
									</div>
									<h3 className="text-lg font-bold text-slate-900 animate-pulse">Securing Digital Signature</h3>
									<p className="text-sm text-slate-500 max-w-sm">
										Applying a cryptographically secure digital signature to this agreement...
									</p>
								</div>
							) : (
								<div className="flex flex-col items-center space-y-4 text-center animate-in fade-in zoom-in duration-300">
									<div className="relative w-20 h-20 flex items-center justify-center">
										{/* Pulsing outer ring */}
										<div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75 duration-1000" />
										{/* Inner circle with icon */}
										<div className="relative w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border border-emerald-400">
											<Check className="w-8 h-8 text-white stroke-[3px] animate-in zoom-in duration-500" />
										</div>
									</div>
									<h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Signed Successfully! 🎉</h3>
									<p className="text-sm text-slate-500 max-w-sm">
										Your digital signature has been verified and registered. The agreement is now active.
									</p>
								</div>
							)}
						</div>
					) : (
						<>
							{/* Modal Scrollable Content Container */}
							<div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-6">
								{/* 4-Grid Information */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pl-4 border-l-[3.5px] border-[#bf1ed4] py-1.5 bg-slate-50/50 rounded-r-xl">
									<div>
										<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Performance Agreement</p>
										<p className="text-sm text-slate-900 font-bold">{performanceAgreement}</p>
									</div>
									<div>
										<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Proposed Fee</p>
										<p className="text-sm text-slate-900 font-bold">{artist.agreement?.proposedFee || artist.agreement?.agreedFee || "Not specified"}</p>
									</div>
									<div>
										<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Booking Terms</p>
										<p className="text-sm text-slate-900 font-bold">{resolvedBookingTerms}</p>
									</div>
									<div>
										<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Deliverables</p>
										<p className="text-sm text-slate-900 font-bold">{resolvedDeliverables}</p>
									</div>
								</div>

								{/* Accordions in Light Theme */}
								<div className="space-y-4 pt-2">
									{/* Documents Accordion */}
									<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
										<button 
											onClick={() => setShowDocuments(!showDocuments)}
											className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${showDocuments ? "border-b border-slate-100" : ""}`}
										>
											<div className="flex items-center gap-3">
												<Paperclip className="w-4 h-4 text-purple-600" />
												<span className="text-sm font-bold text-slate-800">Agreement documents</span>
											</div>
											<div className="flex items-center gap-3">
												<span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{documents.length}</span>
												{showDocuments ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
											</div>
										</button>
										{showDocuments && (
											<div className="px-5 py-6 bg-slate-50/20">
												{documents.length > 0 ? (
													<div className="space-y-3">
														{documents.map((doc: any, idx: number) => (
															<div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
																<div className="flex items-center gap-3">
																	<FileText className="w-4 h-4 text-purple-600" />
																	<span className="text-sm font-medium text-slate-800">{doc.name}</span>
																</div>
																<div className="flex items-center gap-4">
																	<span className="text-xs text-slate-400">{doc.size}</span>
																	{doc.url && (
																		<a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800">
																			<Download className="w-4 h-4" />
																		</a>
																	)}
																</div>
															</div>
														))}
													</div>
												) : (
													<p className="text-sm text-slate-500">No documents attached yet.</p>
												)}
											</div>
										)}
									</div>

									{/* Details/Clauses Accordion */}
									<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
										<button 
											onClick={() => setShowDetails(!showDetails)}
											className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${showDetails ? "border-b border-slate-100" : ""}`}
										>
											<div className="flex items-center gap-3">
												<FileText className="w-4 h-4 text-purple-600" />
												<span className="text-sm font-bold text-slate-800">Agreement details</span>
												{artist.sectionStatuses?.agreement_details === "not_required" && (
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">Not Required</span>
												)}
											</div>
											<div className="flex items-center gap-3">
												<span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{clauses.length}</span>
												{showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
											</div>
										</button>
										{showDetails && (
											<div className="px-5 py-6 bg-slate-50/20 space-y-6">
												{clauses.length > 0 ? (
													clauses.map((clause: any, idx: number) => (
														<div key={idx} className="space-y-1">
															<p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{clause.title}</p>
															<p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{clause.content || "Not specified"}</p>
														</div>
													))
												) : (
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Agreement Clauses</p>
														<p className="text-sm text-slate-800 leading-relaxed">No additional agreement details provided.</p>
													</div>
												)}
											</div>
										)}
									</div>

									{/* Schedule Accordion */}
									<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
										<button 
											onClick={() => setShowSchedule(!showSchedule)}
											className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${showSchedule ? "border-b border-slate-100" : ""}`}
										>
											<div className="flex items-center gap-3">
												<Calendar className="w-4 h-4 text-purple-600" />
												<span className="text-sm font-bold text-slate-800">Schedule</span>
											</div>
											<div className="flex items-center gap-3">
												<span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{totalScheduleItems}</span>
												{showSchedule ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
											</div>
										</button>
										{showSchedule && (
											<div className="px-5 py-6 bg-slate-50/20 space-y-6">
												{workshops.length === 0 && performances.length === 0 ? (
													<p className="text-sm text-slate-500">No schedule items provided.</p>
												) : (
													<>
														{workshops.length > 0 && (
															<div className="space-y-3">
																<div className="flex items-center gap-2">
																	<p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Workshops</p>
																	{artist.sectionStatuses?.workshops === "not_required" && (
																		<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">Not Required</span>
																	)}
																</div>
																<div className="space-y-2">
																	{workshops.map((item: any, idx: number) => (
																		<div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
																			<span className="text-purple-600 shrink-0 mt-0.5">›</span>
																			<p>
																				<span className="text-slate-900 font-bold">{item.title}</span>
																				{item.date || item.time || item.location ? " — " : ""}
																				{item.date && <span>{item.date}</span>}
																				{item.time && <span className="text-slate-500"> · {item.time}{item.endTime ? `–${item.endTime}` : ""}</span>}
																				{item.location && <span className="text-slate-500"> · {item.location}</span>}
																				{item.description && <span className="text-slate-400"> · ({item.description})</span>}
																			</p>
																		</div>
																	))}
																</div>
															</div>
														)}

														{performances.length > 0 && (
															<div className="space-y-3">
																<div className="flex items-center gap-2">
																	<p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Performances</p>
																	{artist.sectionStatuses?.performances === "not_required" && (
																		<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">Not Required</span>
																	)}
																</div>
																<div className="space-y-2">
																	{performances.map((item: any, idx: number) => (
																		<div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
																			<span className="text-purple-600 shrink-0 mt-0.5">›</span>
																			<p>
																				<span className="text-slate-900 font-bold">{item.title}</span>
																				{item.date || item.time || item.location ? " — " : ""}
																				{item.date && <span>{item.date}</span>}
																				{item.time && <span className="text-slate-500"> · {item.time}{item.endTime ? `–${item.endTime}` : ""}</span>}
																				{item.location && <span className="text-slate-500"> · {item.location}</span>}
																				{item.description && <span className="text-slate-400"> · ({item.description})</span>}
																			</p>
																		</div>
																	))}
																</div>
															</div>
														)}
													</>
												)}
											</div>
										)}
									</div>

									{/* Custom Tasks Accordion */}
									<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
										<button 
											onClick={() => setShowTasks(!showTasks)}
											className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${showTasks ? "border-b border-slate-100" : ""}`}
										>
											<div className="flex items-center gap-3">
												<CheckCircle2 className="w-4 h-4 text-purple-600" />
												<span className="text-sm font-bold text-slate-800">Custom tasks</span>
												{artist.sectionStatuses?.custom_tasks === "not_required" && (
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">Not Required</span>
												)}
											</div>
											<div className="flex items-center gap-3">
												<span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{tasks.length}</span>
												{showTasks ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
											</div>
										</button>
										{showTasks && (
											<div className="px-5 py-6 bg-slate-50/20 space-y-3">
												{tasks.length === 0 ? (
													<p className="text-sm text-slate-500">No custom tasks assigned.</p>
												) : (
													tasks.map((task: any, idx: number) => (
														<div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
															<span className="text-purple-600 shrink-0 mt-0.5">›</span>
															<p>
																<span className="text-slate-900 font-bold">{task.title}</span>
																{task.description ? ` — ${task.description}` : ""}
															</p>
														</div>
													))
												)}
											</div>
										)}
									</div>

									{/* Payment Accordion */}
									<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
										<button 
											onClick={() => setShowPayment(!showPayment)}
											className={`w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${showPayment ? "border-b border-slate-100" : ""}`}
										>
											<div className="flex items-center gap-3">
												<CreditCard className="w-4 h-4 text-purple-600" />
												<span className="text-sm font-bold text-slate-800">Payment</span>
												{artist.sectionStatuses?.payment === "not_required" && (
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">Not Required</span>
												)}
											</div>
											<div className="flex items-center gap-3">
												<span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{formatCurrency(performanceFee)}</span>
												{showPayment ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
											</div>
										</button>
										{showPayment && (
											<div className="px-5 py-6 bg-slate-50/20">
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8">
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Performance Fee</p>
														<p className="text-sm text-slate-900 font-bold">{formatCurrency(performanceFee)}</p>
													</div>
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Downpayment</p>
														<p className="text-sm text-slate-900 font-bold">{formatCurrency(downpayment)}</p>
													</div>
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Downpayment Date</p>
														<p className="text-sm text-slate-900 font-bold">{downpaymentDate || "—"}</p>
													</div>
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Balance Due Date</p>
														<p className="text-sm text-slate-900 font-bold">{balanceDueDate || "—"}</p>
													</div>
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Payment Method</p>
														<p className="text-sm text-slate-900 font-bold">{paymentMethod && paymentMethod !== "Select method" ? paymentMethod : "—"}</p>
													</div>
													<div>
														<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Amount Paid</p>
														<p className="text-sm text-slate-900 font-bold">{formatCurrency(amountPaid)}</p>
													</div>
												</div>
												{(paymentNotes || (payment.customLines && payment.customLines.length > 0)) && (
													<div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
														{paymentNotes && (
															<div>
																<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Payment Notes</p>
																<p className="text-sm text-slate-800 leading-relaxed font-medium">{paymentNotes}</p>
															</div>
														)}
														{payment.customLines?.map((line: any) => (
															<div key={line.id}>
																<p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">{line.name}</p>
																<p className="text-sm text-slate-800 leading-relaxed font-medium">{line.value || "—"}</p>
															</div>
														))}
													</div>
												)}
											</div>
										)}
									</div>
								</div>

								{/* Agree & Sign Card inside popup */}
								<div className="pt-6 border-t border-slate-100 mt-6">
									<AgreeAndSignCard
										eventName={invite.eventName}
										legalName={legalName}
										checked={agreeChecked}
										onChangeChecked={setAgreeChecked}
										signature={agreeSignature}
										onChangeSignature={setAgreeSignature}
										onRequestChanges={handleRequestChanges}
										acting={acting}
										isSigned={(artist.contractDocStatus === "signed" || artist.contractDocStatus === "confirmed") && !isEditingSignature}
										canWithdraw={artist.contractDocStatus === "signed"}
										onWithdrawSignature={handleWithdrawSignature}
									/>
								</div>

								{/* Contract Discussion Panel inside popup */}
								<div className="pt-6 border-t border-slate-100 mt-6">
									<SectionDiscussionPanel 
										invite={invite} 
										onAction={onAction} 
										activeSection="contract" 
										theme="light" 
									/>
								</div>
							</div>

							{/* Modal Footer / Digital Signature Action */}
							<div className="border-t border-slate-100 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
								{(artist.contractDocStatus === "signed" || artist.contractDocStatus === "confirmed") && !isEditingSignature ? (
									<>
										<div className="flex items-center gap-2.5 text-emerald-650 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 w-full sm:w-auto justify-center sm:justify-start">
											<Check className="w-4 h-4 stroke-[3px]" />
											<span className="text-sm font-bold">
												{artist.contractDocStatus === "confirmed" ? "Agreement confirmed & locked" : "Agreement signed digitally"}
											</span>
										</div>
										<div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
											<Button 
												variant="outline" 
												onClick={() => setIsOpenReviewDialog(false)}
												className="border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl h-10 px-6"
											>
												Close
											</Button>
										</div>
									</>
								) : (
									<>
										<p className="text-xs text-slate-500 font-medium max-w-md text-center sm:text-left">
											By signing, you digitally confirm and agree to all terms, schedules, and calculations detailed in this document.
										</p>
										<div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
											<Button 
												variant="outline" 
												onClick={() => setIsOpenReviewDialog(false)}
												className="border-slate-200 hover:bg-slate-50 text-slate-605 font-bold rounded-xl h-10 px-5"
											>
												Cancel
											</Button>
											<Button 
												onClick={handleAcceptContract}
												disabled={acting || !isSignatureValid}
												className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white rounded-xl border-0 font-bold h-10 px-6 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
												Sign & Submit
											</Button>
										</div>
									</>
								)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Reusable Agree & Sign Card Component ───
interface AgreeAndSignCardProps {
	eventName: string;
	legalName: string;
	checked: boolean;
	onChangeChecked: (checked: boolean) => void;
	signature: string;
	onChangeSignature: (signature: string) => void;
	onRequestChanges: (message: string) => Promise<void>;
	acting?: boolean;
	isSigned?: boolean;
	canWithdraw?: boolean;
	onWithdrawSignature?: () => void;
}

function AgreeAndSignCard({
	eventName,
	legalName,
	checked,
	onChangeChecked,
	signature,
	onChangeSignature,
	onRequestChanges,
	acting = false,
	isSigned = false,
	canWithdraw = true,
	onWithdrawSignature,
}: AgreeAndSignCardProps) {
	const [requestingChanges, setRequestingChanges] = useState(false);
	const [changeMessage, setChangeMessage] = useState("");
	const [sending, setSending] = useState(false);

	const handleSendRequest = async () => {
		if (!changeMessage.trim()) return;
		setSending(true);
		try {
			await onRequestChanges(changeMessage);
			setChangeMessage("");
			setRequestingChanges(false);
		} catch (error) {
			console.error("Failed to request changes:", error);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="bg-[#fff0f6] border border-pink-200 rounded-2xl p-5 space-y-4">
			<h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
				Agree & Sign
			</h4>

			<div className="flex items-start gap-3">
				<input
					type="checkbox"
					id="agree-terms"
					checked={isSigned ? true : checked}
					disabled={isSigned}
					onChange={(e) => onChangeChecked(e.target.checked)}
					className="mt-1 w-4 h-4 rounded border-slate-300 text-[#bf1ed4] focus:ring-[#bf1ed4] cursor-pointer shrink-0 accent-[#bf1ed4] disabled:opacity-70"
				/>
				<label
					htmlFor="agree-terms"
					className="text-sm text-slate-700 leading-normal font-medium select-none cursor-pointer"
				>
					I have read and agree to the terms of the {eventName} performance agreement.
				</label>
			</div>

			<div className="space-y-1.5">
				<label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
					Type your full legal name as signature — <span className="text-slate-800 font-extrabold">{legalName.toUpperCase()}</span>
				</label>
				<Input
					value={isSigned ? "Agreement Signed" : signature}
					disabled={isSigned}
					onChange={(e) => onChangeSignature(e.target.value)}
					placeholder={legalName}
					className="bg-white border border-slate-200 rounded-xl h-11 px-4 text-slate-800 italic placeholder:text-slate-400 placeholder:italic font-medium focus-visible:ring-[#bf1ed4] disabled:bg-slate-100/50 disabled:text-slate-500"
				/>
				{!isSigned ? (
					<span className="text-[11px] text-slate-400 block">
						Tick the box and type your full legal name <span className="font-semibold text-slate-600">{legalName}</span> exactly to enable Sign & Submit.
					</span>
				) : canWithdraw ? (
					<span className="text-[11px] text-emerald-600 font-semibold block">
						This agreement has been signed by you. You can withdraw your signature below.
					</span>
				) : (
					<span className="text-[11px] text-emerald-600 font-semibold block">
						This agreement has been signed and confirmed. It is now locked.
					</span>
				)}
			</div>

			<div className="border-t border-pink-100/60" />

			{isSigned ? (
				<div className="space-y-3">
					{canWithdraw ? (
						<>
							<span className="text-xs text-slate-500 block">
								Need to make changes or withdraw your signature?
							</span>
							<Button
								variant="destructive"
								disabled={acting}
								onClick={onWithdrawSignature}
								className="w-full bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl h-11 flex items-center justify-center gap-2 shadow-sm transition-all"
							>
								<Trash2 className="w-4 h-4" />
								Withdraw Signature
							</Button>
						</>
					) : (
						<span className="text-xs text-slate-500 block font-semibold italic text-center">
							🔒 Agreement confirmed by organiser and cannot be withdrawn.
						</span>
					)}
				</div>
			) : !requestingChanges ? (
				<div className="space-y-3">
					<span className="text-xs text-slate-500 block">
						Something not right? You can request changes instead of signing.
					</span>
					<Button
						variant="outline"
						onClick={() => setRequestingChanges(true)}
						className="w-full border-red-200 hover:border-red-300 hover:bg-red-50/50 text-red-600 font-bold rounded-xl h-11 flex items-center justify-center gap-2 bg-white shadow-sm transition-all"
					>
						<span className="flex items-center justify-center w-4 h-4 rounded-full border border-red-600 text-[10px] font-extrabold leading-none shrink-0">✕</span>
						Disagree / Request Changes
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					<span className="text-xs font-semibold text-slate-700 block">
						Describe the changes you would like to request:
					</span>
					<Textarea
						value={changeMessage}
						onChange={(e) => setChangeMessage(e.target.value)}
						placeholder="Describe your request changes here..."
						rows={3}
						className="bg-white border-slate-200 text-slate-800 rounded-xl text-sm resize-none focus:border-purple-400/50"
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={handleSendRequest}
							disabled={sending || !changeMessage.trim()}
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl gap-1.5 text-white border-0 font-bold px-4 py-2"
						>
							{sending ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Send className="w-3.5 h-3.5" />
							)}
							Send Request
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setRequestingChanges(false)}
							className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-bold"
						>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function formatFlightDate(dStr: string) {
	if (!dStr) return "—";
	try {
		const d = new Date(dStr);
		if (isNaN(d.getTime())) return dStr;
		return d.toLocaleString("en-US", {
			month: "numeric",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return dStr;
	}
}

function openBase64InNewTab(base64DataUrl: string) {
	try {
		const parts = base64DataUrl.split(",");
		if (parts.length < 2) {
			window.open(base64DataUrl, "_blank");
			return;
		}
		const contentType = parts[0].split(";")[0].split(":")[1];
		const raw = window.atob(parts[1]);
		const rawLength = raw.length;
		const uInt8Array = new Uint8Array(rawLength);
		for (let i = 0; i < rawLength; ++i) {
			uInt8Array[i] = raw.charCodeAt(i);
		}
		const blob = new Blob([uInt8Array], { type: contentType });
		const blobUrl = URL.createObjectURL(blob);
		window.open(blobUrl, "_blank");
	} catch (err) {
		console.error("Error opening document:", err);
		const newTab = window.open();
		if (newTab) {
			newTab.document.write(`<iframe src="${base64DataUrl}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
			newTab.document.close();
		}
	}
}

export function LogisticsProfilePanel({
	invite,
	onAction,
	autoOpenDialog,
	onClose,
	theme = "dark",
}: {
	invite: any;
	onAction: (action: string, payload?: any) => Promise<any> | void;
	autoOpenDialog?: boolean;
	onClose?: () => void;
	theme?: "dark" | "light";
}) {
	const [activeTab, setActiveTab] = useState("intake");
	const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
	const [isOpenLogisticsDialog, setIsOpenLogisticsDialog] = useState(false);

	useEffect(() => {
		if (autoOpenDialog) {
			setIsOpenLogisticsDialog(true);
		}
	}, [autoOpenDialog]);
	const [isFullscreen, setIsFullscreen] = useState(false);
	
	const logisticsTabs = [
		{ id: "intake", label: "Intake", icon: ClipboardList },
		{ id: "travelers", label: "Travelers", icon: Users },
		{ id: "flight", label: "Flight", icon: Plane },
		{ id: "hotel", label: "Hotel", icon: Building },
		{ id: "transport", label: "Transport", icon: Car },
		{ id: "food", label: "Food", icon: Utensils },
		{ id: "event_info", label: "Event Info", icon: Info },
	];

	const artist = invite.artist || {};
	const groupMembers = artist.groupMembers || [];
	const travelLogistics = artist.travelLogistics || {};
	const savedLogistics = artist.logistics || {};
	const isSubmitted = travelLogistics.status === "submitted" || savedLogistics.status === "submitted";

	let displayTravelers = savedLogistics.travelers || groupMembers || [];
	let totalTravelers = displayTravelers.length;

	if (isSubmitted && travelLogistics.selectedTravelers) {
		const selectedIds = travelLogistics.selectedTravelers;
		displayTravelers = (savedLogistics.travelers || []).filter((m: any) => 
			selectedIds.includes(m.id) || selectedIds.includes(m.name) || selectedIds.includes(m.fullPassportName)
		);
		if (displayTravelers.length === 0) {
			displayTravelers = groupMembers.filter((m: any) => selectedIds.includes(m.name));
		}
		
		const leadArtistName = artist.legalName || artist.stageName || "Lead Artist";
		if (displayTravelers.length === 0 && selectedIds.includes(leadArtistName)) {
			displayTravelers = [
				{ name: leadArtistName, role: "Lead artist" },
			];
		}
		totalTravelers = travelLogistics.totalTravelers || displayTravelers.length;
	}

	const travelers = displayTravelers;
	const firstTraveler = travelers.length > 0 ? travelers[0] : {};
	const preferredAirport = firstTraveler.preferredAirport || firstTraveler.airport || firstTraveler.nearestAirport || "Not specified";

	const logisticsStatusLabel = isSubmitted ? "Submitted" : (travelLogistics.status === "draft" ? "Draft" : "Not Started");
	const logisticsStatusBadgeColor = isSubmitted 
		? "bg-green-500/15 text-green-400 border-green-500/30" 
		: (logisticsStatusLabel === "Draft" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-purple-500/15 text-purple-400 border-purple-500/30");

	const isLight = theme === "light";
	const textPrimary = isLight ? "text-slate-900" : "text-white";
	const textSecondary = isLight ? "text-slate-500" : "text-purple-200/60";
	const textTertiary = isLight ? "text-slate-400" : "text-purple-200/50";
	const borderCol = isLight ? "border-slate-200" : "border-white/10";
	const bgCard = isLight ? "bg-slate-50/50" : "bg-white/5";

	return (
		<div className="space-y-6">
			{/* Header area with Status and Review button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className={`text-[10px] font-semibold ${textTertiary} uppercase tracking-wider`}>Status</span>
					<Badge className={`text-[10px] bg-white/5 text-purple-200 border-purple-500/20`}>{logisticsStatusLabel}</Badge>
				</div>
				<Button 
					onClick={() => setIsOpenLogisticsDialog(true)}
					className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:from-[#a819bb] hover:to-[#e559cd] text-white rounded-xl border-0 font-medium px-4 h-9"
				>
					{isSubmitted ? "Review & Edit" : "Review & Manage"}
				</Button>
			</div>

			{/* Title and Subtitle */}
			<div>
				<h3 className={`text-xl font-bold ${textPrimary} mb-1`}>Logistics • {invite.eventName}</h3>
				<p className={`text-sm ${textSecondary}`}>Manage travel preferences, flight itineraries, accommodation, and crew logistics.</p>
			</div>

			{/* 4-Grid Information */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pl-4 border-l-[3px] border-[#bf1ed4] py-1">
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Lead Contact</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{artist.logistics?.leadContactName || artist.logistics?.leadContact || artist.legalName || artist.stageName || "Not specified"}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Preferred Airport</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{preferredAirport}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Travelers Shared</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{isSubmitted ? `${totalTravelers} people` : "Not shared yet"}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Accommodation Preference</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{travelLogistics.questions?.hotelRoomType || "Not specified"}</p>
				</div>
			</div>

			{/* Review & Manage Logistics Popup Dialog */}
			<Dialog open={isOpenLogisticsDialog} onOpenChange={(open) => {
				setIsOpenLogisticsDialog(open);
				if (!open) {
					setIsFullscreen(false);
					onClose?.();
				}
			}}>
				<DialogContent 
					className={cn(
						"bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col transition-all duration-200 overflow-hidden",
						isFullscreen 
							? "!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !m-0 !border-0 !shadow-none" 
							: "!max-w-4xl !w-[90vw] !max-h-[85vh] rounded-2xl"
					)}
				>
					{/* Modal Header */}
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pr-12 relative border-b border-slate-100 pb-4 shrink-0">
						<div>
							<DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
								Logistics - {invite.eventName}
							</DialogTitle>
							<DialogDescription className="text-sm text-slate-500 mt-1">
								Manage travel preferences, flight itineraries, accommodation, and crew logistics.
							</DialogDescription>
						</div>

						{/* Fullscreen Toggle Button */}
						<Button
							variant="ghost"
							onClick={() => setIsFullscreen(!isFullscreen)}
							className="shrink-0 bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:opacity-90 text-white rounded-xl h-8 px-4 text-xs font-bold flex items-center gap-1.5 border-0 shadow-sm self-start"
						>
							{isFullscreen ? (
								<>
									<Minimize2 className="w-3.5 h-3.5" />
									Exit Fullscreen
								</>
							) : (
								<>
									<Maximize2 className="w-3.5 h-3.5" />
									Fullscreen
								</>
							)}
						</Button>
					</div>

					{/* Modal Scrollable Content Container */}
					<div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-6">
						{/* 4-Grid Information */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pl-4 border-l-[3.5px] border-[#bf1ed4] py-1.5 bg-slate-50/50 rounded-r-xl">
							<div>
								<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Lead Contact</p>
								<p className="text-sm text-slate-900 font-bold">{artist.logistics?.leadContactName || artist.logistics?.leadContact || artist.legalName || artist.stageName || "Not specified"}</p>
							</div>
							<div>
								<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Preferred Airport</p>
								<p className="text-sm text-slate-900 font-bold">{preferredAirport}</p>
							</div>
							<div>
								<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Travelers Shared</p>
								<p className="text-sm text-slate-900 font-bold">{isSubmitted ? `${totalTravelers} people` : "Not shared yet"}</p>
							</div>
							<div>
								<p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Accommodation Preference</p>
								<p className="text-sm text-slate-900 font-bold">{travelLogistics.questions?.hotelRoomType || "Not specified"}</p>
							</div>
						</div>

						{/* Logistics Tabs Navigation */}
						<div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
							{logisticsTabs.map(tab => {
								const isActive = activeTab === tab.id;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={cn(
											"flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
											isActive 
												? "bg-white text-slate-900 shadow-sm border border-slate-100" 
												: "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
										)}
									>
										<tab.icon className={cn("w-4 h-4", isActive ? "text-[#bf1ed4]" : "")} />
										{tab.label}
									</button>
								);
							})}
						</div>

						{/* Active Tab Panel Content */}
						<div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 min-h-[300px]">
							{activeTab === "intake" && (
								<div className="space-y-8 animate-in fade-in duration-300">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<ClipboardList className="w-5 h-5 text-purple-600" />
											<h3 className="text-slate-800 font-bold text-lg">What you shared with logistics</h3>
										</div>
										<Badge className={cn("rounded-full px-3 py-1 font-semibold text-xs border-0", isSubmitted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
											{isSubmitted ? "Submitted" : "Not submitted yet"}
										</Badge>
									</div>

									<div className="bg-purple-50/55 border border-purple-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
										<p className="text-slate-650 text-sm max-w-xl leading-relaxed">
											Answer the intake questions (flights, hotel, transport, visa, dietary...) so the Logistics Manager can start booking.
										</p>
										<Button onClick={() => setIsIntakeModalOpen(true)} className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] text-white hover:opacity-90 font-bold rounded-xl whitespace-nowrap px-6 border-0 shadow-sm">
											{isSubmitted ? "Edit Intake Info" : "Fill Intake Info"}
										</Button>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 text-slate-700 bg-white p-5 rounded-xl border border-slate-200">
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Artist Name</span>
											<span className="text-slate-900 text-sm font-semibold">{artist.logistics?.actName || "-"}</span>
										</div>
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lead Contact Name</span>
											<span className="text-slate-900 text-sm font-semibold">{artist.logistics?.leadContactName || artist.logistics?.leadContact || "-"}</span>
										</div>
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lead Contact Email</span>
											<span className="text-slate-900 text-sm font-semibold">{artist.logistics?.leadContactEmail || "-"}</span>
										</div>
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lead Contact Phone</span>
											<span className="text-slate-900 text-sm font-semibold">{artist.logistics?.leadContactPhone || "-"}</span>
										</div>
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Travelers</span>
											<span className="text-slate-900 text-sm font-semibold">{totalTravelers} people</span>
										</div>
										<div>
											<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Airport</span>
											<span className="text-slate-900 text-sm font-semibold">{preferredAirport}</span>
										</div>
									</div>

									<div className="pt-6 border-t border-slate-200/60">
										<div className="flex items-center gap-2 mb-4">
											<Users className="w-4 h-4 text-slate-400" />
											<h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travelers Shared</h4>
										</div>
										
										{!isSubmitted ? (
											<p className="text-slate-400 text-sm py-4 text-center border border-dashed border-slate-200 rounded-xl">No travelers shared yet</p>
										) : travelers.length === 0 ? (
											<p className="text-slate-400 text-sm py-4 text-center border border-dashed border-slate-200 rounded-xl">No travelers selected</p>
										) : (
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{travelers.map((member: any, i: number) => (
													<div key={i} className="flex items-center justify-between bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-xl p-4 shadow-sm">
														<div className="flex items-center gap-3">
															<span className="text-slate-900 text-sm font-semibold">{member.fullPassportName || member.name || `Traveler ${i+1}`}</span>
															<span className="text-slate-500 text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-full">• {member.role || (i === 0 ? "Lead artist" : "Traveler")}</span>
														</div>
														<CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{activeTab === "travelers" && (
								<div className="animate-in fade-in duration-300 space-y-4">
									<div className="flex items-center gap-3 mb-2">
										<Users className="w-6 h-6 text-purple-600" />
										<h3 className="text-slate-900 font-bold text-xl">Travelers</h3>
									</div>

									{travelers.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
											<Users className="w-12 h-12 text-slate-200 mb-3" />
											<p className="text-slate-400 text-sm">No travelers have been shared yet.</p>
											<p className="text-slate-400/70 text-xs mt-1">Please complete the intake form first.</p>
										</div>
									) : (
										<div className="flex flex-col space-y-3">
											{travelers.map((member: any, i: number) => {
												const displayName = member.fullPassportName || member.name || `Traveler ${i+1}`;
												const role = member.role || (i === 0 ? "Lead artist" : "Traveler");
												const hasPassport = !!(member.passportCopyUrl || member.passportUpload);
												
												return (
													<div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-200 hover:border-slate-350 transition-colors rounded-xl shadow-sm">
														<div className="flex items-center gap-2">
															<span className="text-slate-900 font-bold text-base">{displayName}</span>
															<span className="text-slate-500 text-sm">· {role}</span>
														</div>
														
														{hasPassport && (
															<div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
																<CheckCircle2 className="w-4 h-4" />
																<span className="text-xs font-bold tracking-wide">Passport</span>
															</div>
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}

							{activeTab === "flight" && (
								<div className="animate-in fade-in duration-300 space-y-4">
									<div className="flex items-center gap-3 mb-2">
										<Plane className="w-6 h-6 text-purple-600" />
										<h3 className="text-slate-900 font-bold text-xl">Flights</h3>
									</div>

									{(() => {
										const flightList = (travelLogistics.flights || []).filter((f: any) => f.sentToArtist);
										if (flightList.length === 0) {
											return (
												<div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
													<Plane className="w-12 h-12 text-slate-200 mb-3" />
													<p className="text-slate-450 text-sm">No flights booked yet — the LM will share them here.</p>
												</div>
											);
										}

										return (
											<div className="flex flex-col space-y-4">
												{flightList.map((flight: any) => (
													<div key={flight.id} className="p-5 bg-white border border-slate-200 hover:border-slate-300 transition-all duration-300 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
														<div className="space-y-1">
															<h4 className="text-slate-900 font-bold text-lg">
																{flight.airline} {flight.flightNumber}
															</h4>
															<p className="text-sm font-semibold text-pink-600">
																{flight.from || "—"} → {flight.to || "—"}
															</p>
															<p className="text-xs text-slate-500 font-medium">
																{formatFlightDate(flight.departure)} → {formatFlightDate(flight.arrival)}
																{flight.pnr ? ` · ${flight.pnr}` : ""}
															</p>
															{(flight.baggage || flight.notes) && (
																<div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 mt-2 border-t border-slate-100">
																	{flight.baggage && (
																		<span className="text-xs text-slate-500 font-medium">
																			Baggage: <span className="text-slate-800 font-semibold">{flight.baggage}</span>
																		</span>
																	)}
																	{flight.notes && (
																		<span className="text-xs text-slate-500 font-medium">
																			Notes: <span className="text-slate-800 font-semibold">{flight.notes}</span>
																		</span>
																	)}
																</div>
															)}
														</div>
														<div className="flex sm:flex-col items-start sm:items-end gap-2.5 w-full sm:w-auto justify-between shrink-0">
															<span className="text-xs font-bold tracking-wide text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
																Confirmed by you
															</span>
															{flight.screenshotUrl && (
																<Button
																	onClick={() => openBase64InNewTab(flight.screenshotUrl)}
																	variant="outline"
																	className="h-9 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
																>
																	<Eye className="w-3.5 h-3.5 text-pink-600" /> View Doc
																</Button>
															)}
														</div>
													</div>
												))}
											</div>
										);
									})()}
								</div>
							)}

							{activeTab !== "intake" && activeTab !== "travelers" && activeTab !== "flight" && (
								<div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
									{activeTab === "hotel" && <Building className="w-16 h-16 text-purple-200 mb-4" />}
									{activeTab === "transport" && <Car className="w-16 h-16 text-purple-200 mb-4" />}
									{activeTab === "food" && <Utensils className="w-16 h-16 text-purple-200 mb-4" />}
									{activeTab === "event_info" && <Info className="w-16 h-16 text-purple-200 mb-4" />}
									<h3 className="text-xl font-bold text-slate-800 mb-2 capitalize">{activeTab.replace('_', ' ')} Profile</h3>
									<p className="text-slate-500 text-sm max-w-sm text-center">
										Submit your travel and accommodation requirements here. (Coming soon)
									</p>
								</div>
							)}
						</div>

						{/* Tagged Discussion Panel inside popup */}
						<div className="pt-6 border-t border-slate-100 mt-6">
							<SectionDiscussionPanel 
								invite={invite} 
								onAction={onAction} 
								activeSection="logistics" 
								theme="light" 
							/>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="border-t border-slate-100 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
						<p className="text-xs text-slate-500 font-medium max-w-md text-center sm:text-left">
							Manage your event travel details and coordinate in real-time with the event logistics coordinator.
						</p>
						<div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
							<Button 
								variant="outline" 
								onClick={() => setIsOpenLogisticsDialog(false)}
								className="border-slate-200 hover:bg-slate-50 text-slate-650 font-bold rounded-xl h-10 px-6"
							>
								Close
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			
			<LogisticsIntakeModal 
				isOpen={isIntakeModalOpen} 
				onClose={() => setIsIntakeModalOpen(false)} 
				invite={invite} 
				onSubmit={(data) => {
					onAction("submit_logistics", data);
				}} 
			/>
		</div>
	);
}

export function ShowInfoPanel({
	invite,
	onAction,
	onRefresh,
	autoOpenDialog,
	onClose,
	theme = "dark",
}: {
	invite: any;
	onAction: (action: string, payload?: any) => Promise<any> | void;
	onRefresh: () => void;
	autoOpenDialog?: "submit" | "view" | boolean;
	onClose?: () => void;
	theme?: "dark" | "light";
}) {
	const [baseShows, setBaseShows] = useState<any[]>([]);
	const [eventShows, setEventShows] = useState<any[]>([]);
	const [loadingShows, setLoadingShows] = useState(false);
	const [submitModalOpen, setSubmitModalOpen] = useState(false);
	const [isOpenShowDialog, setIsOpenShowDialog] = useState(false);
	const [selectedBaseShowIds, setSelectedBaseShowIds] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [showSubmitted, setShowSubmitted] = useState(false); // updated to true after first data fetch if eventShows > 0
	const [isViewerOpen, setIsViewerOpen] = useState(false);
	const [viewerTab, setViewerTab] = useState<"overview"|"technical"|"music"|"notes">("overview");
	const [selectedViewerShowIndex, setSelectedViewerShowIndex] = useState(0);
	// Whether the "pick a different show for this performance" picker is open (viewer dialog)
	const [editPerformancePickerOpen, setEditPerformancePickerOpen] = useState(false);
	// Which base show's "edit this show" picker is open in the checklist dialog
	const [checklistEditShowId, setChecklistEditShowId] = useState<string | null>(null);
	const [swappingShow, setSwappingShow] = useState(false);

	useEffect(() => {
		if (isViewerOpen) {
			setSelectedViewerShowIndex(0);
		}
	}, [isViewerOpen]);

	// Close the "edit this show" picker whenever the active performance tab changes
	useEffect(() => {
		setEditPerformancePickerOpen(false);
	}, [selectedViewerShowIndex]);

	useEffect(() => {
		if (autoOpenDialog === "submit" || autoOpenDialog === true) {
			setIsOpenShowDialog(true);
		} else if (autoOpenDialog === "view") {
			setIsViewerOpen(true);
		}
	}, [autoOpenDialog]);

	const [isFullscreen, setIsFullscreen] = useState(false);
	const { toast } = useToast();

	const fetchShowsData = useCallback(async () => {
		if (!invite.eventId || !invite.artistContractId) return;
		setLoadingShows(true);
		try {
			// Fetch base shows
			const baseRes = await fetch(`/api/shows?artistId=${invite.artistContractId}`);
			const baseResult = await baseRes.json();
			if (baseResult.success && baseResult.data) {
				const data = baseResult.data.shows || baseResult.data;
				setBaseShows(Array.isArray(data) ? data : []);
			}

			// Fetch event shows
			const eventRes = await fetch(`/api/event-shows?eventId=${invite.eventId}`);
			const eventResult = await eventRes.json();
			if (eventResult.success && eventResult.data?.eventShows) {
				setEventShows(eventResult.data.eventShows);
			}
		} catch (err) {
			console.error("Error fetching shows in ShowInfoPanel:", err);
		} finally {
			setLoadingShows(false);
		}
	}, [invite.eventId, invite.artistContractId]);

	useEffect(() => {
		fetchShowsData();
	}, [fetchShowsData]);

	useEffect(() => {
		if (eventShows.length > 0) {
			// Pre-check the shows that are already linked to this event
			setSelectedBaseShowIds(eventShows.map(es => es.baseShowId).filter(Boolean));
			// Mark as submitted so the View button appears immediately
			setShowSubmitted(true);
		} else {
			// Start with an empty selection — no accidental auto-submission
			setSelectedBaseShowIds([]);
		}
	}, [eventShows]);

	const toggleSelectShow = (showId: string) => {
		setSelectedBaseShowIds(prev =>
			prev.includes(showId)
				? prev.filter(id => id !== showId)
				: [...prev, showId]
		);
	};

	const handleSubmitShows = async () => {
		setSubmitting(true);
		try {
			const showsToSubmit = selectedBaseShowIds.filter(id => !eventShows.some(es => es.baseShowId === id));
			const showsToRemove = eventShows.filter(es => es.baseShowId && !selectedBaseShowIds.includes(es.baseShowId));

			// Submit new shows
			for (const baseShowId of showsToSubmit) {
				const res = await fetch("/api/event-shows", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						eventId: invite.eventId,
						baseShowId,
					}),
				});
				if (!res.ok) {
					const data = await res.json();
					console.error("Failed to submit show:", data.error?.message || res.statusText);
				}
			}

			// Remove deselected shows
			for (const es of showsToRemove) {
				const res = await fetch(`/api/event-shows/${es.eventShowId || es.id}`, {
					method: "DELETE",
				});
				if (!res.ok) {
					console.error("Failed to delete show:", res.statusText);
				}
			}

			toast({ title: "Shows Submitted", description: "Successfully updated shows for this event." });
			await fetchShowsData();
			if (onRefresh) onRefresh();
			setShowSubmitted(true);
			setIsOpenShowDialog(false);
		} catch (err) {
			console.error("Error submitting shows:", err);
			toast({ title: "Error", description: "Failed to submit shows.", variant: "destructive" });
		} finally {
			setSubmitting(false);
		}
	};

	// Replace the show submitted for one specific performance slot with a different base show,
	// keeping that slot's performance date intact.
	const handleSwapPerformanceShow = async (eventShow: any, newBaseShowId: string) => {
		setSwappingShow(true);
		try {
			const performanceDate = eventShow.overrides?.performanceDate;

			const createRes = await fetch("/api/event-shows", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					eventId: invite.eventId,
					baseShowId: newBaseShowId,
					performanceDate,
				}),
			});
			const createData = await createRes.json();
			if (!createRes.ok || !createData.success) {
				throw new Error(createData.error?.message || "Failed to assign the new show");
			}

			const deleteRes = await fetch(`/api/event-shows/${eventShow.eventShowId || eventShow.id}`, {
				method: "DELETE",
			});
			if (!deleteRes.ok) {
				console.error("Failed to remove the previous show:", deleteRes.statusText);
			}

			toast({ title: "Show Updated", description: "This performance now uses the new show." });
			setEditPerformancePickerOpen(false);
			setChecklistEditShowId(null);
			await fetchShowsData();
			setSelectedViewerShowIndex(0);
			if (onRefresh) onRefresh();
		} catch (err) {
			console.error("Error swapping performance show:", err);
			toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update this show.", variant: "destructive" });
		} finally {
			setSwappingShow(false);
		}
	};

	const isLight = theme === "light";
	const textPrimary = isLight ? "text-slate-900" : "text-white";
	const textSecondary = isLight ? "text-slate-500" : "text-purple-200/60";
	const textTertiary = isLight ? "text-slate-400" : "text-purple-200/50";

	return (
		<div className="space-y-6">
			{/* Header area with Status and Review button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className={`text-[10px] font-semibold ${textTertiary} uppercase tracking-wider`}>Status</span>
					<Badge className={`text-[10px] bg-white/5 text-purple-200 border-purple-500/20`}>
						{eventShows.length} Show{eventShows.length !== 1 ? "s" : ""} Shared
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					{showSubmitted && eventShows.length > 0 && (
						<Button
							onClick={() => { setViewerTab("overview"); setIsViewerOpen(true); }}
							className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl border-0 font-medium px-4 h-9 gap-2"
						>
							<Eye className="w-4 h-4" /> View
						</Button>
					)}
					<Button
						onClick={() => setIsOpenShowDialog(true)}
						className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:from-[#a819bb] hover:to-[#e559cd] text-white rounded-xl border-0 font-medium px-4 h-9"
					>
						{showSubmitted ? "Re-select/Manage" : "Review & Manage"}
					</Button>
				</div>
			</div>

			{/* Title and Subtitle */}
			<div>
				<h3 className={`text-xl font-bold ${textPrimary} mb-1`}>Shows & Technical Info • {invite.eventName}</h3>
				<p className={`text-sm ${textSecondary}`}>Manage performances, media files, stage lighting, and tech riders.</p>
			</div>

			{/* 4-Grid Information */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pl-4 border-l-[3px] border-[#bf1ed4] py-1">
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Total Shows</p>
					<p className={`text-sm ${textPrimary} font-medium`}>{eventShows.length} show{eventShows.length !== 1 ? "s" : ""}</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Media Uploads</p>
					<p className={`text-sm ${textPrimary} font-medium`}>
						{eventShows.some(es => {
							const s = typeof es.snapshotJson === "string" ? JSON.parse(es.snapshotJson) : es.snapshotJson;
							return s.musicTrack?.file_url;
						}) ? "Audio Tracks Ready" : "No Audio Track"}
					</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Technical Riders</p>
					<p className={`text-sm ${textPrimary} font-medium`}>
						{eventShows.some(es => {
							const s = typeof es.snapshotJson === "string" ? JSON.parse(es.snapshotJson) : es.snapshotJson;
							return s.techRiderUrl;
						}) ? "Riders Submitted" : "No Rider Submitted"}
					</p>
				</div>
				<div>
					<p className={`text-[10px] ${textTertiary} uppercase tracking-wider font-semibold mb-1`}>Assigned Stages</p>
					<p className={`text-sm ${textPrimary} font-medium`}>
						{eventShows.filter(es => es.overrides?.stageName).length || "None assigned yet"}
					</p>
				</div>
			</div>

			{/* Review & Manage Show Info Popup Dialog */}
			<Dialog open={isOpenShowDialog} onOpenChange={(open) => {
				setIsOpenShowDialog(open);
				if (!open) {
					setIsFullscreen(false);
					onClose?.();
				}
			}}>
				<DialogContent 
					className={cn(
						"bg-white text-slate-900 shadow-2xl p-0 flex flex-col transition-all duration-200 overflow-hidden",
						isFullscreen 
							? "!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !m-0 !border-0 !shadow-none" 
							: "!max-w-4xl !w-[95vw] !max-h-[90vh] rounded-2xl"
					)}
				>
					<div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white relative">
						{/* Mockup Header */}
						<div className="border border-slate-200 rounded-xl bg-slate-50 p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-[#bf1ed4] rounded-xl text-white flex items-center justify-center shadow-md shrink-0">
									<Calendar className="w-6 h-6" />
								</div>
								<div>
									<p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest leading-tight">{invite.eventName ? invite.eventName.substring(0, 15).toUpperCase() : "FANTASIA DXR"}</p>
									<p className="font-bold text-slate-900 text-lg leading-tight">{invite.eventName || "Croatia Summer Salsa Festival"}</p>
									<p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
										<Calendar className="w-3 h-3" /> Aug 12–16, 2026
									</p>
								</div>
							</div>
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
								<div className="flex items-center gap-4 text-xs font-semibold text-orange-400">
									<span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Organiser: Awaiting</span>
									<span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> You: Awaiting</span>
								</div>
								<Badge className="bg-orange-50 text-orange-600 border-orange-200 px-3 py-1 font-bold shadow-sm flex items-center gap-1.5 hover:bg-orange-100 transition-colors">
									<Lock className="w-3 h-3" /> Agreement required first
								</Badge>
							</div>
						</div>

						{/* Title */}
						<div className="flex justify-between items-start mb-6">
							<div>
								<DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Show Info · {invite.eventName || "Croatia Summer Salsa Festival"}</DialogTitle>
								<DialogDescription className="text-sm text-slate-500 mt-1">Share the show details the organizer needs.</DialogDescription>
							</div>
							<Button 
								onClick={() => setIsFullscreen(!isFullscreen)}
								className="bg-[#bf1ed4] hover:bg-[#a819bb] text-white shadow-md shadow-purple-500/20 font-bold px-4 h-9 gap-2 transition-all rounded-lg shrink-0"
							>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
								{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
							</Button>
						</div>

						{/* Content */}
						<div>
							<h4 className="font-bold text-slate-900 mb-1 text-base">Shows for this event</h4>
							<p className="text-sm text-slate-500 mb-4">Performing more than once? Tick every show you'll perform — the organizer will see one entry per show.</p>

							<div className="space-y-3">
								{baseShows.length > 0 ? baseShows.map((show, idx) => {
									const isSelected = selectedBaseShowIds.includes(show.id);
									const matchingEventShow = eventShows.find(es => es.baseShowId === show.id);
									const perfDate = matchingEventShow?.overrides?.performanceDate || null;
									const perfDateLabel = perfDate
										? new Date(perfDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
										: null;
									const otherShows = baseShows.filter(bs => bs.id !== show.id);
									return (
										<div
											key={show.id}
											onClick={() => toggleSelectShow(show.id)}
											className={cn(
												"border rounded-xl p-4 transition-all cursor-pointer",
												isSelected
													? "border-pink-300 bg-pink-50/50 shadow-sm"
													: "border-slate-200 bg-white hover:border-pink-200"
											)}
										>
											<div className="flex items-start gap-3">
												<div className={cn(
													"w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 mt-0.5 cursor-pointer",
													isSelected ? "bg-pink-500 border-pink-500 text-white" : "bg-white border-slate-300"
												)}>
													{isSelected && <Check className="w-3.5 h-3.5" />}
												</div>
												<div className="flex-1">
													<p className="font-bold text-slate-900 text-[15px]">{show.name}</p>
													<p className="text-sm text-slate-500 mb-1">{show.style || "Solo performance"} · {show.duration || 6} min · {show.performers || 1} performer{show.performers > 1 ? "s" : ""}</p>
													{perfDateLabel && (
														<p className="text-xs font-medium text-purple-600 flex items-center gap-1 mb-3">
															<Calendar className="w-3 h-3" /> Performing on {perfDateLabel}
														</p>
													)}
													{!perfDateLabel && <div className="mb-3" />}

													{isSelected && (
														<div onClick={(e) => e.stopPropagation()}>
															<div className="flex flex-wrap items-center gap-3 mt-1 animate-fade-in">
																<Button className="bg-[#bf1ed4] hover:bg-[#a819bb] text-white h-8 text-xs font-bold px-4 rounded-lg shadow-sm">
																	Share as-is
																</Button>
																<Button variant="outline" className="h-8 text-xs font-bold px-4 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg">
																	Edit just for this event
																</Button>
																{matchingEventShow && (
																	<Button
																		variant="outline"
																		onClick={() => setChecklistEditShowId(checklistEditShowId === show.id ? null : show.id)}
																		className="h-8 text-xs font-bold px-4 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg gap-1.5"
																	>
																		<Edit className="w-3.5 h-3.5" />
																		Edit this show
																	</Button>
																)}
																<span className="text-xs text-slate-500 ml-1">Your saved show will be sent as-is.</span>
															</div>

															{matchingEventShow && checklistEditShowId === show.id && (
																<div className="mt-3 border border-slate-200 rounded-xl bg-slate-50 p-3 animate-fade-in">
																	<p className="text-xs font-semibold text-slate-600 mb-2">
																		Choose a different show for this performance{perfDateLabel ? ` (${perfDateLabel})` : ""}:
																	</p>
																	<div className="space-y-1.5">
																		{otherShows.length > 0 ? (
																			otherShows.map(otherShow => (
																				<button
																					key={otherShow.id}
																					disabled={swappingShow}
																					onClick={() => handleSwapPerformanceShow(matchingEventShow, otherShow.id)}
																					className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-pink-300 hover:bg-pink-50/40 transition-all text-left disabled:opacity-50"
																				>
																					<div>
																						<p className="font-semibold text-slate-900 text-sm">{otherShow.name}</p>
																						<p className="text-xs text-slate-500">{otherShow.style || "Solo performance"} · {otherShow.duration || 6} min</p>
																					</div>
																					{swappingShow ? (
																						<Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
																					) : (
																						<ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 shrink-0" />
																					)}
																				</button>
																			))
																		) : (
																			<p className="text-xs text-slate-400 py-2">No other shows in your library yet.</p>
																		)}
																	</div>
																	<button
																		onClick={() => setChecklistEditShowId(null)}
																		className="text-xs text-slate-400 hover:text-slate-600 mt-2"
																	>
																		Cancel
																	</button>
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										</div>
									);
								}) : (
									<div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
										<p className="text-slate-500 text-sm">No shows in your library.</p>
									</div>
								)}

								{/* Create new show button */}
								<div 
									onClick={(e) => {
										e.stopPropagation();
										window.open(`/famelink/${invite.artistContractId}/shows/create`, '_blank');
									}}
									className="border-2 border-dashed border-pink-200 bg-pink-50/20 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-pink-50/50 transition-all mt-4"
								>
									<span className="text-pink-500 font-bold text-[15px] flex items-center gap-2">
										+ Create a new show
									</span>
									<span className="text-xs font-medium text-slate-400">2/3 used - free plan</span>
								</div>
							</div>

							<p className="text-xs text-slate-500 mt-6 leading-relaxed max-w-2xl">
								For each selected show choose <strong className="font-semibold text-slate-700">Share as-is</strong> or <strong className="font-semibold text-slate-700">Edit just for this event</strong>. You can also create a brand-new show above.
							</p>
						</div>
					</div>

					{/* Modal Footer */}
					<div className="border-t border-slate-200 bg-white p-4 flex justify-end gap-3 shrink-0 rounded-b-2xl">
						<Button 
							variant="outline" 
							onClick={() => setIsOpenShowDialog(false)}
							className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-6"
						>
							Close
						</Button>
						<Button 
							className="bg-[#bf1ed4] hover:bg-[#a819bb] text-white font-bold rounded-lg px-8 shadow-md shadow-purple-500/20 gap-2"
							onClick={handleSubmitShows}
							disabled={submitting}
						>
							{submitting && <Loader2 className="w-4 h-4 animate-spin" />}
							Submit
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* ── Submitted Show Viewer Dialog ── */}
			<Dialog open={isViewerOpen} onOpenChange={(open) => {
				setIsViewerOpen(open);
				if (!open) {
					setIsFullscreen(false);
					onClose?.();
				}
			}}>
				<DialogContent 
					className={cn(
						"bg-white border border-slate-200 text-slate-900 shadow-2xl p-0 flex flex-col transition-all duration-200 overflow-hidden",
						isFullscreen 
							? "!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !m-0 !border-0 !shadow-none" 
							: "!max-w-6xl !w-[95vw] !max-h-[90vh] rounded-2xl"
					)}
				>
					<div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white relative">
						{/* Mockup Header */}
						<div className="border border-slate-200 rounded-xl bg-slate-50 p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div className="flex items-center gap-3">
								<div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-[#bf1ed4] rounded-xl text-white flex items-center justify-center shadow-md shrink-0">
									<Calendar className="w-6 h-6" />
								</div>
								<div>
									<p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest leading-tight">{invite.eventName ? invite.eventName.substring(0, 15).toUpperCase() : "FANTASIA DXR"}</p>
									<p className="font-bold text-slate-900 text-lg leading-tight">{invite.eventName || "Croatia Summer Salsa Festival"}</p>
									<p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
										<Calendar className="w-3 h-3" /> Aug 12–16, 2026
									</p>
								</div>
							</div>
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
								<div className="flex items-center gap-4 text-xs font-semibold">
									<span className="flex items-center gap-1.5 text-orange-400"><Clock className="w-3.5 h-3.5" /> Organiser: Awaiting</span>
									<span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /> You: Signed</span>
								</div>
								<Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1 font-bold shadow-sm flex items-center gap-1.5 hover:bg-emerald-100 transition-colors">
									<CheckCircle2 className="w-3 h-3" /> Logistics & Show unlocked
								</Badge>
							</div>
						</div>

						{/* Title */}
						<div className="flex flex-col gap-3 mb-5">
							{/* Top row: title + action buttons */}
							<div className="flex items-start justify-between gap-2">
								<DialogTitle className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
									Show Info · {invite.eventName || "Croatia Summer Salsa Festival"}
								</DialogTitle>
								<div className="flex items-center gap-1.5 shrink-0">
									<Button
										onClick={() => {
											setIsViewerOpen(false);
											setIsOpenShowDialog(true);
										}}
										size="sm"
										className="bg-gradient-to-r from-pink-500 to-[#bf1ed4] hover:opacity-90 text-white shadow-md font-bold px-3 h-8 text-xs gap-1.5 transition-all rounded-lg"
									>
										<Edit className="w-3.5 h-3.5" />
										<span className="hidden sm:inline">Re-select</span>
									</Button>
									<Button
										onClick={() => setIsFullscreen(!isFullscreen)}
										size="sm"
										className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-3 h-8 text-xs gap-1.5 transition-all rounded-lg"
									>
										{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
										<span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
									</Button>
								</div>
							</div>

							{/* Submitted shows as compact date chips */}
							{(() => {
								const submittedShowsInfo = eventShows.map(es => {
									const s = es.snapshotJson ? (typeof es.snapshotJson === "string" ? JSON.parse(es.snapshotJson) : es.snapshotJson) : null;
									const perfDate = es.overrides?.performanceDate || null;
									return {
										name: s?.name || es.showName || "Unnamed Show",
										perfDate: perfDate ? new Date(perfDate + "T00:00:00").toLocaleDateString("en-US", {
											weekday: "short", month: "short", day: "numeric",
										}) : null,
									};
								});
								return (
									<div className="flex flex-col gap-1.5">
										<DialogDescription className="text-xs text-slate-400">
											Your submitted show and event details
										</DialogDescription>
										<div className="flex flex-wrap gap-2">
											{submittedShowsInfo.map((info, i) => (
												<div key={i} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
													<Music className="w-3 h-3 text-purple-500 shrink-0" />
													<span className="text-xs font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-none">{info.name}</span>
													{info.perfDate && (
														<span className="text-[10px] font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 shrink-0">{info.perfDate}</span>
													)}
												</div>
											))}
										</div>
									</div>
								);
							})()}
						</div>

						{/* Tab Switcher for Multiple Shows */}
						{eventShows.length > 1 && (
							<div className="flex flex-wrap gap-2 mb-5">
								{eventShows.map((es, idx) => {
									const s = es.snapshotJson ? (typeof es.snapshotJson === "string" ? JSON.parse(es.snapshotJson) : es.snapshotJson) : null;
									const name = s?.name || es.showName || `Show ${idx + 1}`;
									const perfDate = es.overrides?.performanceDate || null;
									const perfDateLabel = perfDate
										? new Date(perfDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
										: null;
									const isActive = selectedViewerShowIndex === idx;
									return (
										<button
											key={es.id || es.eventShowId || idx}
											onClick={() => setSelectedViewerShowIndex(idx)}
											className={cn(
												"flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 min-w-0",
												isActive
													? "bg-[#bf1ed4] text-white border-[#bf1ed4] shadow-sm shadow-purple-300"
													: "bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-slate-900"
											)}
										>
											<span className="text-xs font-bold truncate max-w-[140px]">{name}</span>
											{perfDateLabel && (
												<span className={cn("text-[10px] font-medium", isActive ? "text-white/80" : "text-purple-500")}>
													{perfDateLabel}
												</span>
											)}
										</button>
									);
								})}
							</div>
						)}

						{/* Active performance header — name, date, and per-performance edit */}
						{(() => {
							const activeShow = eventShows[selectedViewerShowIndex];
							if (!activeShow) return null;
							const s = activeShow.snapshotJson ? (typeof activeShow.snapshotJson === "string" ? JSON.parse(activeShow.snapshotJson) : activeShow.snapshotJson) : null;
							const name = s?.name || activeShow.showName || "Unnamed Show";
							const perfDate = activeShow.overrides?.performanceDate || null;
							const perfDateLabel = perfDate
								? new Date(perfDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
								: null;
							const otherShows = baseShows.filter(bs => bs.id !== activeShow.baseShowId);

							return (
								<div className="border border-slate-200 rounded-xl bg-slate-50 p-4 mb-4">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
												<Music className="w-4 h-4 text-purple-600" />
											</div>
											<div>
												<p className="font-bold text-slate-900 text-sm">{name}</p>
												<p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
													<Calendar className="w-3 h-3 text-purple-500" />
													{perfDateLabel || "No performance date set yet"}
												</p>
											</div>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setEditPerformancePickerOpen(!editPerformancePickerOpen)}
											className="h-8 text-xs font-bold px-4 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg gap-1.5"
										>
											<Edit className="w-3.5 h-3.5" />
											Edit this show
										</Button>
									</div>

									{editPerformancePickerOpen && (
										<div className="mt-3 border-t border-slate-200 pt-3">
											<p className="text-xs font-semibold text-slate-600 mb-2">
												Choose a different show for this performance{perfDateLabel ? ` (${perfDateLabel})` : ""}:
											</p>
											<div className="space-y-1.5">
												{otherShows.length > 0 ? (
													otherShows.map(otherShow => (
														<button
															key={otherShow.id}
															disabled={swappingShow}
															onClick={() => handleSwapPerformanceShow(activeShow, otherShow.id)}
															className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-pink-300 hover:bg-pink-50/40 transition-all text-left disabled:opacity-50"
														>
															<div>
																<p className="font-semibold text-slate-900 text-sm">{otherShow.name}</p>
																<p className="text-xs text-slate-500">{otherShow.style || "Solo performance"} · {otherShow.duration || 6} min</p>
															</div>
															{swappingShow ? (
																<Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
															) : (
																<ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 shrink-0" />
															)}
														</button>
													))
												) : (
													<p className="text-xs text-slate-400 py-2">No other shows in your library yet.</p>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})()}

						{/* Content */}
						<div className="mt-4">
							<FameLinkEventDashboard
								overrideArtistId={invite.artistContractId}
								overrideEventId={invite.eventId}
								overrideEventShowId={eventShows[selectedViewerShowIndex]?.eventShowId || eventShows[selectedViewerShowIndex]?.id}
								hideHeader={true}
							/>
						</div>
					</div>

					{/* Footer */}
					<div className="border-t border-slate-200 px-6 py-4 flex justify-end bg-slate-50 shrink-0">
						<Button onClick={() => setIsViewerOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 rounded-xl px-6 font-semibold">Close</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Section Discussion Panel (Tag-Based) ───
type DiscussionCategory = "contract" | "logistics" | "show" | "general" | "flight" | "hotel" | "transport" | "schedule";
type DiscussionFilter = "all" | "contract" | "logistics" | "show";

const DISCUSSION_TAG_STYLES: Record<DiscussionCategory, string> = {
	contract: "bg-blue-500/15 text-blue-400 border-blue-500/30",
	logistics: "bg-amber-500/15 text-amber-400 border-amber-500/30",
	show: "bg-green-500/15 text-green-400 border-green-500/30",
	general: "bg-white/10 text-purple-200/60 border-white/10",
	flight: "bg-pink-500/15 text-pink-400 border-pink-500/30",
	hotel: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
	transport: "bg-teal-500/15 text-teal-400 border-teal-500/30",
	schedule: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const DISCUSSION_TAG_STYLES_LIGHT: Record<DiscussionCategory, string> = {
	contract: "bg-blue-50 text-blue-600 border-blue-200",
	logistics: "bg-amber-50 text-amber-600 border-amber-200",
	show: "bg-emerald-50 text-emerald-600 border-emerald-200",
	general: "bg-slate-100 text-slate-600 border-slate-200",
	flight: "bg-pink-50 text-pink-600 border-pink-200",
	hotel: "bg-indigo-50 text-indigo-600 border-indigo-200",
	transport: "bg-teal-50 text-teal-600 border-teal-200",
	schedule: "bg-orange-50 text-orange-600 border-orange-200",
};

const DISCUSSION_TAG_LABELS: Record<DiscussionCategory, string> = {
	contract: "Contract",
	logistics: "Logistics",
	show: "Show",
	general: "General",
	flight: "Flight",
	hotel: "Hotel",
	transport: "Transport",
	schedule: "Schedule",
};

function SectionDiscussionPanel({
	invite,
	onAction,
	activeSection,
	theme = "dark",
}: {
	invite: FLInvite;
	onAction: (action: string, data?: any) => Promise<any> | void;
	activeSection: "contract" | "logistics" | "show_info";
	theme?: "dark" | "light";
}) {
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [showActivity, setShowActivity] = useState(true);
	const [activeLogisticsTag, setActiveLogisticsTag] = useState<DiscussionCategory>("general");

	// Map activeSection to the discussion tag filter
	const sectionToFilter: Record<string, DiscussionFilter> = {
		contract: "contract",
		logistics: "logistics",
		show_info: "show",
	};
	const currentFilter = sectionToFilter[activeSection] || "all";

	// Merge conversations (old system) + stageDiscussion (tagged system) into a unified list
	const buildUnifiedMessages = useCallback(() => {
		const rawMessages: any[] = [];

		const getNormalizedSender = (sender?: string): string => {
			if (!sender) return "unknown";
			const s = sender.toLowerCase().trim();
			if (
				s === "artist" || 
				s === "you" || 
				(invite.artist?.stageName && s === invite.artist.stageName.toLowerCase().trim()) || 
				(invite.artist?.artistName && s === invite.artist.artistName.toLowerCase().trim()) ||
				(invite.artist?.realName && s === invite.artist.realName.toLowerCase().trim()) ||
				(invite.artist?.email && s === invite.artist.email.toLowerCase().trim())
			) {
				return "artist";
			}
			if (s === "system") {
				return "system";
			}
			if (s === "organiser" || s === "stage manager" || s === "manager") {
				return "organiser";
			}
			return s;
		};

		// 1. Add stageDiscussion messages (tagged, primary source)
		const stageMessages = invite.artist?.agreement?.stageDiscussion || invite.artist?.agreement?.discussion || [];
		for (const msg of stageMessages) {
			const text = msg.message || "";
			const timestamp = msg.timestamp || msg.time || msg.date || "";
			const sender = msg.sender || "Unknown";
			
			const isSystem = sender.toLowerCase().trim() === "system" || msg.type === "system" || text.startsWith("✅") || text.startsWith("❌");
			
			let category: DiscussionCategory = "general";
			if (msg.isContract) category = "contract";
			else if (msg.isLogistics) category = "logistics";
			else if (msg.isShowManagement) category = "show";

			rawMessages.push({
				text,
				timestamp,
				sender,
				category,
				isSystem,
				source: "stageDiscussion",
				isMe: msg.isMe,
			});
		}

		// 2. Add conversations (old system)
		const convMessages = invite.conversations || [];
		for (const msg of convMessages) {
			const text = msg.text || msg.message || "";
			const timestamp = msg.timestamp || msg.time || msg.date || "";
			const sender = msg.sender || "Unknown";
			
			const isSystem = sender.toLowerCase().trim() === "system" || msg.type === "system" || text.startsWith("✅") || text.startsWith("❌");
			
			let category: DiscussionCategory = "general";
			if (msg.type === "change_request") category = "contract";

			rawMessages.push({
				text,
				timestamp,
				sender,
				category,
				isSystem,
				source: "conversations",
			});
		}

		// Sort by timestamp first
		rawMessages.sort((a, b) => {
			const tA = new Date(a.timestamp).getTime() || 0;
			const tB = new Date(b.timestamp).getTime() || 0;
			return tA - tB;
		});

		// Deduplicate rawMessages
		const uniqueMessages: any[] = [];
		for (const msg of rawMessages) {
			const normSender = getNormalizedSender(msg.sender);
			const normText = msg.text.trim().toLowerCase();
			const timeVal = new Date(msg.timestamp).getTime();

			const isDuplicate = uniqueMessages.some((existing) => {
				const existingSender = getNormalizedSender(existing.sender);
				const existingText = existing.text.trim().toLowerCase();
				const existingTime = new Date(existing.timestamp).getTime();

				const textMatches = normText === existingText;
				const senderMatches = normSender === existingSender;

				if (textMatches && senderMatches) {
					if (!isNaN(timeVal) && !isNaN(existingTime)) {
						return Math.abs(timeVal - existingTime) < 60000;
					}
					return true;
				}
				return false;
			});

			if (!isDuplicate) {
				uniqueMessages.push(msg);
			} else {
				const existingIdx = uniqueMessages.findIndex((existing) => {
					const existingSender = getNormalizedSender(existing.sender);
					const existingText = existing.text.trim().toLowerCase();
					const existingTime = new Date(existing.timestamp).getTime();
					if (normText === existingText && normSender === existingSender) {
						if (!isNaN(timeVal) && !isNaN(existingTime)) {
							return Math.abs(timeVal - existingTime) < 60000;
						}
						return true;
					}
					return false;
				});
				if (existingIdx !== -1) {
					if (uniqueMessages[existingIdx].category === "general" && msg.category !== "general") {
						uniqueMessages[existingIdx].category = msg.category;
					}
				}
			}
		}

		// Map to expected rendering structure
		return uniqueMessages.map((msg, index) => {
			const id = `msg-${index}-${new Date(msg.timestamp).getTime() || "no-time"}`;
			const normSender = getNormalizedSender(msg.sender);
			
			let senderName = msg.sender;
			if (normSender === "artist") {
				senderName = invite.artist?.stageName || "Artist";
			} else if (normSender === "organiser") {
				senderName = msg.sender === "Organiser" || msg.sender === "Stage Manager" ? msg.sender : "Organiser";
			} else if (normSender === "system") {
				senderName = "System";
			}

			const isOwn = normSender === "artist";

			return {
				id,
				sender: isOwn ? "artist" : msg.sender,
				senderName,
				text: msg.text,
				timestamp: msg.timestamp,
				isOwn,
				isSystem: msg.isSystem,
				category: msg.category,
				source: msg.source,
			};
		});
	}, [invite.conversations, invite.artist?.agreement?.stageDiscussion, invite.artist?.agreement?.discussion, invite.artist?.stageName, invite.artist?.artistName, invite.artist?.realName, invite.artist?.email]);

	const allMessages = buildUnifiedMessages();

	// Filter messages based on current section
	const filteredMessages = allMessages.filter((msg) => {
		if (msg.isSystem) return true; // Always show system messages
		if (currentFilter === "all") return true;
		if (currentFilter === "logistics") {
			return ["logistics", "general", "flight", "hotel", "transport", "schedule"].includes(msg.category);
		}
		return msg.category === currentFilter || msg.category === "general";
	});

	// Activity log from contractTimeline
	const timeline = invite.artist?.agreement?.contractTimeline || [];

	useEffect(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
		}
	}, [filteredMessages.length]);

	const handleSend = async () => {
		if (!draft.trim() || sending) return;
		setSending(true);
		const messageText = draft.trim();
		setDraft("");

		// Build tag object based on current section
		const tagObj: any = {};
		if (currentFilter === "contract") {
			tagObj.isContract = true;
			tagObj.category = "contract";
		}
		else if (currentFilter === "logistics") {
			tagObj.isLogistics = true;
			tagObj.category = activeLogisticsTag;
		}
		else if (currentFilter === "show") {
			tagObj.isShowManagement = true;
			tagObj.category = "show";
		}

		try {
			// Send to stageDiscussion API (tagged, so Stage Manager can see it with proper tag)
			const stageRes = await fetch(`/api/contracts/${invite.eventId}/discussion`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId: invite.artistContractId,
					message: {
						sender: invite.artist?.stageName || "Artist",
						message: messageText,
						isMe: false,
						status: "Sent",
						...tagObj,
					},
				}),
			});

			if (!stageRes.ok) {
				console.error("Failed to send stageDiscussion message");
			}

			// Also send via the old conversation system so it appears in the conversations list
			await onAction("send_message", {
				message: messageText,
				artistName: invite.artist?.stageName,
			});
		} catch (error) {
			console.error("Failed to send message:", error);
		} finally {
			setSending(false);
		}
	};

	const formatTime = (ts: string) => {
		try {
			const d = new Date(ts);
			if (isNaN(d.getTime())) return ts;
			const now = new Date();
			const diffMs = now.getTime() - d.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return "Just now";
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;
			return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
				", " +
				d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
		} catch {
			return ts;
		}
	};

	const formatFullTime = (ts: string) => {
		try {
			const d = new Date(ts);
			if (isNaN(d.getTime())) return ts;
			return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
				", " +
				d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
		} catch {
			return ts;
		}
	};

	const sectionLabel = activeSection === "contract" ? "Contract" : activeSection === "logistics" ? "Logistics" : "Show";

	return (
		<div className="space-y-5 mt-8">
			{/* Section Discussion Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<MessageSquare className={cn("w-4 h-4", theme === "light" ? "text-purple-600" : "text-purple-400")} />
					<h4 className={cn("text-xs font-bold uppercase tracking-wider", theme === "light" ? "text-slate-800" : "text-white")}>{sectionLabel} Discussion</h4>
				</div>
				<span className={cn("text-[10px]", theme === "light" ? "text-slate-400" : "text-purple-200/40")}>Shared with the organiser. Action history is included below the messages.</span>
			</div>
			
			{activeSection === "logistics" && (
				<div className="flex flex-wrap items-center gap-2 mb-2">
					{(["general", "flight", "hotel", "transport", "schedule"] as DiscussionCategory[]).map(tag => (
						<button
							key={tag}
							onClick={() => setActiveLogisticsTag(tag)}
							className={cn(
								"px-3 py-1 rounded-full text-xs font-bold transition-all capitalize",
								activeLogisticsTag === tag 
									? "bg-pink-500 text-white" 
									: theme === "light"
										? "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
										: "border border-purple-500/30 bg-transparent text-purple-200/60 hover:bg-purple-500/10"
							)}
						>
							{tag}
						</button>
					))}
				</div>
			)}

			{/* Messages Area */}
			<div 
				ref={scrollContainerRef}
				className={cn("max-h-72 overflow-y-auto space-y-3 p-4 rounded-xl", theme === "light" ? "bg-slate-50 border border-slate-200 text-slate-800" : "bg-white/3 border border-purple-500/10 text-white")}
			>
				{filteredMessages.length === 0 ? (
					<p className={cn("text-xs text-center py-6", theme === "light" ? "text-slate-400" : "text-purple-200/40")}>
						No {sectionLabel.toLowerCase()} messages yet. Start the conversation below.
					</p>
				) : (
					filteredMessages.map((msg: any) => {
						if (msg.isSystem) {
							return (
								<div key={msg.id} className="text-center py-1">
									<span className={cn("text-[11px] px-3 py-1 rounded-full", theme === "light" ? "text-slate-600 bg-slate-100 border border-slate-200" : "text-purple-200/40 bg-purple-500/10")}>
										{msg.text}
									</span>
								</div>
							);
						}
						const isOwn = msg.sender === "artist" || (msg.isOwn && msg.source === "stageDiscussion" && msg.sender !== "Organiser" && msg.sender !== "Stage Manager");
						const currentTagStyles = theme === "light" ? DISCUSSION_TAG_STYLES_LIGHT : DISCUSSION_TAG_STYLES;
						return (
							<div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
								<div className={`max-w-[80%] space-y-1.5 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
									<div className="flex items-center gap-2 flex-wrap">
										{!isOwn && (
											<span className={cn("text-[11px] font-bold", theme === "light" ? "text-slate-600" : "text-purple-200/60")}>
												{msg.senderName}
											</span>
										)}
										<span className={cn("text-[10px]", theme === "light" ? "text-slate-400" : "text-purple-200/30")}>
											{formatTime(msg.timestamp)}
										</span>
										{msg.category && msg.category !== "general" && (
											<span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold border", currentTagStyles[msg.category as DiscussionCategory])}>
												{DISCUSSION_TAG_LABELS[msg.category as DiscussionCategory]?.toUpperCase()}
											</span>
										)}
										{isOwn && (
											<span className={cn("text-[11px] font-bold", theme === "light" ? "text-slate-600" : "text-purple-200/60")}>
												You
											</span>
										)}
									</div>
									<div
										className={cn(
											"rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
											isOwn
												? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-md"
												: theme === "light"
													? "bg-white text-slate-800 rounded-bl-md border border-slate-200 shadow-sm"
													: "bg-white/5 text-white rounded-bl-md border border-purple-500/10"
										)}
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

			{/* Activity Log */}
			{timeline.length > 0 && (
				<div>
					<button
						onClick={() => setShowActivity(!showActivity)}
						className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-3 transition-colors", 
							theme === "light" ? "text-slate-500 hover:text-slate-700" : "text-purple-200/40 hover:text-purple-200/60")}
					>
						{showActivity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
						Activity
					</button>
					{showActivity && (
						<div className={cn("space-y-2.5 pl-3 border-l", theme === "light" ? "border-slate-200" : "border-purple-500/10")}>
							{timeline.map((item: any, idx: number) => (
								<div key={idx} className="flex items-start gap-2">
									<div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
									<div>
										<p className={cn("text-xs font-semibold leading-tight", theme === "light" ? "text-slate-800" : "text-white")}>{item.label}</p>
										{item.note && <p className={cn("text-[11px]", theme === "light" ? "text-slate-500 font-medium" : "text-purple-200/40 italic")}>&quot;{item.note}&quot;</p>}
										<p className={cn("text-[10px] mt-0.5", theme === "light" ? "text-slate-400" : "text-purple-200/30")}>{formatFullTime(item.date)}</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Message Input */}
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
					placeholder={`Write a message...`}
					rows={1}
					className={cn(
						"min-h-[42px] max-h-[100px] resize-none text-sm rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0",
						theme === "light" 
							? "bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500 placeholder:text-slate-400" 
							: "bg-white/5 border-white/10 text-white focus:border-purple-400/50 placeholder:text-purple-200/30"
					)}
				/>
				<Button
					size="icon"
					onClick={handleSend}
					disabled={!draft.trim() || sending}
					className="shrink-0 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white border-0 h-[42px] w-[42px] rounded-xl"
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

// ─── Invite Row ───
function InviteRow({
	invite,
	defaultExpanded = false,
	initialSection = null,
	onRefresh,
	onClose,
}: {
	invite: FLInvite;
	defaultExpanded?: boolean;
	initialSection?: "contract" | "logistics" | "show_info" | null;
	onRefresh: () => void;
	onClose?: () => void;
}) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	
	// Check the artist-specific override first; only fall back to the event's own
	// toggle when the artist has no explicit workflow value for that module. An explicit
	// per-artist "Required" must win even if the event has that module disabled.
	const isContractEnabled = invite.artist?.workflowContract
		? invite.artist.workflowContract !== "Not Required"
		: invite.event?.contractEnabled !== false && String(invite.event?.contractEnabled) !== "false";
	const isLogisticsEnabled = invite.artist?.workflowLogistics
		? invite.artist.workflowLogistics !== "Not Required"
		: invite.event?.logisticsEnabled !== false && String(invite.event?.logisticsEnabled) !== "false";
	const isShowInfoEnabled = invite.artist?.workflowShow
		? invite.artist.workflowShow !== "Not Required"
		: invite.event?.showInfoEnabled !== false && String(invite.event?.showInfoEnabled) !== "false";

	const [activeSection, setActiveSection] = useState<
		"contract" | "logistics" | "show_info"
	>(() => {
		if (initialSection) return initialSection;
		if (isContractEnabled) return "contract";
		if (isLogisticsEnabled) return "logistics";
		return "show_info";
	});
	const { toast } = useToast();

	useEffect(() => {
		const enabledSections = [
			isContractEnabled && "contract",
			isLogisticsEnabled && "logistics",
			isShowInfoEnabled && "show_info",
		].filter(Boolean) as Array<"contract" | "logistics" | "show_info">;

		if (enabledSections.length > 0 && !enabledSections.includes(activeSection)) {
			setActiveSection(enabledSections[0]);
		}
	}, [isContractEnabled, isLogisticsEnabled, isShowInfoEnabled, activeSection]);

	const handleAction = async (action: string, data?: any) => {
		try {
			const res = await fetch("/api/contracts/famelink-invites/action", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					eventId: invite.eventId,
					artistContractId: invite.artistContractId,
					action,
					data,
				}),
			});
			const result = await res.json();
			if (result.success) {
				const messages: Record<string, string> = {
					approve_agreement: "Agreement approved successfully!",
					request_changes: "Change request sent to organizer",
					send_message: "Message sent",
					accept_contract: "Contract accepted! 🎉",
					update_profile: "Profile updated successfully",
					update_answers: "Answers saved successfully",
					submit_logistics: "Logistics submitted successfully!",
					withdraw_signature: "Signature withdrawn successfully",
				};
				toast({
					title: "Success",
					description: messages[action] || "Action completed",
				});

				// Emit WebSocket event for real-time update
				try {
					const socket = (window as any).__fameLinkSocket;
					if (socket?.connected) {
						socket.emit("contract_action", {
							eventId: invite.eventId,
							artistId: invite.artistContractId,
							action,
							artistName: invite.artist?.stageName,
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
		}
	};

	const isContractConfirmed = invite.artist?.contractDocStatus === "confirmed" || invite.artist?.contractDocStatus === "signed";
	const isLocked = invite.requireContractFirst !== false && !isContractConfirmed && invite.artist?.workflowContract !== "Not Required";

	const artistSigned = invite.artist?.contractDocStatus === "signed" || invite.artist?.contractDocStatus === "confirmed" || invite.artist?.contractSignedByArtist;
	const organiserSigned = invite.artist?.contractDocStatus === "confirmed" || invite.artist?.contractDocStatus === "signed_by_organiser" || invite.artist?.contractSignedByOrganiser;

	const sections = [
		{ id: "contract" as const, label: "Contract", icon: <FileText className="w-4 h-4" />, status: invite.artist?.contractDocStatus === "confirmed" ? "Confirmed" : isContractConfirmed ? "Signed" : "Pending", enabled: isContractEnabled },
		{ id: "logistics" as const, label: "Logistics", icon: <Truck className="w-4 h-4" />, locked: isLocked, enabled: isLogisticsEnabled },
		{ id: "show_info" as const, label: "Show Info", icon: <Music className="w-4 h-4" />, locked: isLocked, enabled: isShowInfoEnabled },
	].filter(s => s.enabled);


	return (
		<div className="space-y-6 mb-12">
			{/* Top Card */}
			<div className="bg-[#150e28] rounded-2xl p-6 border border-purple-500/20 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
				<div className="flex items-start sm:items-center gap-4">
					<div className="w-14 h-14 bg-gradient-to-br from-[#bf1ed4] to-[#ff66e5] rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
						<Calendar className="w-6 h-6 text-white" />
					</div>
					<div>
						<p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">{invite.organizerName}</p>
						<h2 className="text-xl font-bold text-white leading-tight">{invite.eventName}</h2>
						<p className="text-xs text-purple-200/50 flex items-center gap-1.5 mt-1">
							<Calendar className="w-3.5 h-3.5" />
							{invite.eventDates}
						</p>
					</div>
				</div>
				<div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0">
					<div>
						<p className="text-[10px] font-bold text-purple-200/50 uppercase tracking-wider mb-2">Contract Signatures</p>
						<div className="flex items-center gap-4 text-xs font-medium">
							{organiserSigned ? (
								<span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Organiser: Signed</span>
							) : (
								<span className="flex items-center gap-1 text-amber-400"><Clock className="w-3.5 h-3.5" /> Organiser: Awaiting</span>
							)}
							{artistSigned ? (
								<span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> You: Signed</span>
							) : (
								<span className="flex items-center gap-1 text-amber-400"><Clock className="w-3.5 h-3.5" /> You: Awaiting</span>
							)}
						</div>
					</div>
					{isLocked && (
						<Button variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-xs gap-2">
							<Lock className="w-3.5 h-3.5" /> Contract required first
						</Button>
					)}
				</div>
			</div>

			{/* Info Box */}
			<div className="bg-white/5 border border-white/10 rounded-xl p-4">
				<p className="text-sm text-purple-200/80 leading-relaxed">
					{invite.status === "new_invite" ? (
						<>Hi {invite.artist?.stageName || "Artist"}, you're invited to perform at {invite.eventName}. Please review your task board below.</>
					) : invite.status === "waiting" ? (
						<>Hi {invite.artist?.stageName || "Artist"}, your participation for {invite.eventName} is currently pending with the organizer. Wait for them to send the contract or approve your profile.</>
					) : invite.status === "discussion" ? (
						<>Hi {invite.artist?.stageName || "Artist"}, there is an ongoing discussion for {invite.eventName}. Please coordinate with the organizer.</>
					) : invite.status === "contract_sent" ? (
						<>Hi {invite.artist?.stageName || "Artist"}, a contract for {invite.eventName} is ready. Please review and sign the agreement below.</>
					) : invite.status === "confirmed" ? (
						<>Hi {invite.artist?.stageName || "Artist"}, you are confirmed for {invite.eventName}! Complete your logistics and show info below.</>
					) : (
						<>Hi {invite.artist?.stageName || "Artist"}, here is your task board for {invite.eventName}.</>
					)}
				</p>
			</div>



			{/* 2-Column Layout */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* Left Sidebar */}
				<div className="w-full lg:w-64 shrink-0 space-y-2">
					{sections.map((s) => (
						<button
							key={s.id}
							onClick={() => !s.locked && setActiveSection(s.id as any)}
							disabled={s.locked}
							className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all ${
								activeSection === s.id
									? "bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] text-white shadow-lg shadow-pink-500/20"
									: "bg-white/5 text-purple-200/50 hover:bg-white/10 border border-transparent hover:border-white/10"
							} ${s.locked ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							<div className="flex items-center gap-3">
								<span className={activeSection === s.id ? "text-white" : "text-purple-400/50"}>{s.icon}</span>
								<span className="text-sm font-semibold">{s.label}</span>
							</div>
							{s.status && (
								<span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeSection === s.id ? "bg-white/20 text-white" : "bg-white/10"}`}>
									{s.status}
								</span>
							)}
							{s.locked && <Lock className="w-3.5 h-3.5 opacity-50" />}
						</button>
					))}
				</div>

				{/* Right Main Content */}
				<div className="flex-1 bg-white/2 rounded-2xl border border-purple-500/10 p-6 sm:p-8">
					{activeSection === "contract" && (
						<>
							<ContractPanel artist={invite.artist} invite={invite} onAction={handleAction} autoOpenDialog={initialSection === "contract"} onClose={onClose} />
							<SectionDiscussionPanel invite={invite} onAction={handleAction} activeSection="contract" />
						</>
					)}
					{activeSection === "logistics" && (
						isLocked ? (
							<div className="text-center py-12">
								<Truck className="w-12 h-12 text-purple-400/20 mx-auto mb-4" />
								<h3 className="text-lg font-bold text-white mb-2">Logistics Locked</h3>
								<p className="text-purple-200/50 text-sm">Please sign the contract to unlock logistics planning.</p>
							</div>
						) : (
							<>
								<LogisticsProfilePanel invite={invite} onAction={handleAction} autoOpenDialog={initialSection === "logistics"} onClose={onClose} />
								<div className="mt-8">
									<SectionDiscussionPanel invite={invite} onAction={handleAction} activeSection="logistics" />
								</div>
							</>
						)
					)}
					{activeSection === "show_info" && (
						isLocked ? (
							<div className="text-center py-12">
								<Music className="w-12 h-12 text-purple-400/20 mx-auto mb-4" />
								<h3 className="text-lg font-bold text-white mb-2">Show Info Locked</h3>
								<p className="text-purple-200/50 text-sm">Please sign the contract to view show information.</p>
							</div>
						) : (
							<ShowInfoPanel invite={invite} onAction={handleAction} onRefresh={onRefresh} autoOpenDialog={initialSection === "show_info"} onClose={onClose} />
						)
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Invite List Card ───
function InviteListCard({ invite, onOpen }: { invite: FLInvite, onOpen: () => void }) {
	let dateObj = new Date();
	let month = "TBD";
	let day: number | string = "-";
	
	try {
		const rawDate = invite.eventDates?.split(" - ")[0] || invite.eventDates;
		let parsed = new Date(rawDate || new Date());
		
		if (isNaN(parsed.getTime()) && rawDate) {
			// Try splitting by en dash or other separators
			const firstPart = rawDate.split(/[-–]/)[0]?.trim();
			if (firstPart) {
				parsed = new Date(firstPart);
			}
		}

		if (!isNaN(parsed.getTime())) {
			dateObj = parsed;
			month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
			day = dateObj.getDate();
		}
	} catch (e) {
		console.warn("Could not parse date:", invite.eventDates);
	}

	const isConfirmed = invite.status === "confirmed";
	const artistSigned = invite.artist?.contractDocStatus === "signed" || invite.artist?.contractDocStatus === "confirmed" || invite.artist?.contractSignedByArtist;
	const organiserSigned = invite.artist?.contractDocStatus === "confirmed" || invite.artist?.contractDocStatus === "signed_by_organiser" || invite.artist?.contractSignedByOrganiser;
	const progressPercent = isConfirmed ? 100 : ((artistSigned && organiserSigned) ? 75 : (artistSigned ? 50 : (organiserSigned ? 25 : 0)));
	const contractStatus = (artistSigned && organiserSigned) ? "Approved" : (artistSigned ? "Signed" : (organiserSigned ? "Counter-signed" : "Pending"));

	// We use colors based on progress or status
	let borderLeft = "border-l-[#bf1ed4]";
	if (progressPercent === 100) borderLeft = "border-l-emerald-500";
	else if (progressPercent > 0) borderLeft = "border-l-amber-500";
	
	let gradientColor = "from-[#bf1ed4] to-[#ff66e5]";
	if (progressPercent === 100) gradientColor = "from-emerald-500 to-green-400";
	else if (progressPercent > 0) gradientColor = "from-amber-500 to-orange-400";

	return (
		<div className={`glass-card rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center justify-between border-l-4 ${borderLeft} hover:bg-white/5 cursor-pointer transition-colors gap-6`} onClick={onOpen}>
			<div className="flex items-center gap-6">
				<div className="text-center min-w-[4rem] border-r border-white/10 pr-6">
					<p className="text-[10px] font-bold text-purple-200/50 uppercase">{month}</p>
					<p className="text-2xl font-bold text-white">{day}</p>
				</div>
				<div>
					<h3 className="text-base font-bold text-white mb-1">{invite.eventName}</h3>
					<p className="text-xs text-purple-200/50 flex flex-wrap items-center gap-2">
						<span>{invite.eventDates}</span>
						<span className="text-purple-500/30">•</span>
						<span>{invite.location}</span>
						<span className="text-purple-500/30">•</span>
						<span className={isConfirmed ? "text-emerald-400 font-medium" : ""}>
							{invite.status === "cancelled" ? "Cancelled" : (isConfirmed ? "All Submitted" : "Pending Action")}
						</span>
					</p>
				</div>
			</div>
			
			<div className="flex flex-col sm:flex-row sm:items-center gap-6 xl:gap-8 bg-white/3 p-3 rounded-xl xl:bg-transparent xl:p-0">
				{/* Badges */}
				<div className="flex items-center gap-4">
					<div className="flex flex-col items-center min-w-[4.5rem]">
						<p className="text-[8px] uppercase font-bold text-purple-200/50 mb-1.5">Contract</p>
						<Badge className={`text-[10px] ${contractStatus === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-purple-200"}`}>{contractStatus}</Badge>
					</div>
					<div className="flex flex-col items-center min-w-[4.5rem]">
						<p className="text-[8px] uppercase font-bold text-purple-200/50 mb-1.5">Logistics</p>
						<Badge className={`text-[10px] ${isConfirmed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-purple-200"}`}>
							{isConfirmed ? "Submitted" : "Not Started"}
						</Badge>
					</div>
					<div className="flex flex-col items-center min-w-[4.5rem]">
						<p className="text-[8px] uppercase font-bold text-purple-200/50 mb-1.5">Show Info</p>
						<Badge className={`text-[10px] ${isConfirmed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-purple-200"}`}>
							{isConfirmed ? "Submitted" : "Not Started"}
						</Badge>
					</div>
				</div>

				{/* Progress */}
				<div className="flex flex-col items-end min-w-[5rem]">
					<div className="flex justify-between w-full mb-1">
						<p className="text-[8px] uppercase font-bold text-purple-200/50">Progress</p>
						<p className="text-[10px] font-bold text-white">{progressPercent}%</p>
					</div>
					<div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
						<div className={`h-full bg-gradient-to-r ${gradientColor} rounded-full transition-all duration-500`} style={{ width: `${progressPercent}%` }}></div>
					</div>
				</div>

				<Button 
					className="bg-gradient-to-r from-[#bf1ed4] to-[#ff66e5] hover:from-[#a819bb] hover:to-[#e559cd] rounded-xl text-white border-0 gap-2 font-medium shrink-0 h-9"
					onClick={(e) => {
						e.stopPropagation();
						onOpen();
					}}
				>
					Open <ArrowRight className="w-4 h-4" />
				</Button>
			</div>
		</div>
	)
}

// ─── Main Section ───
export function InvitesContracts({
	artistEmail,
	artistId,
	artistName,
	initialEventId,
	initialSection,
	onBack,
	onClose,
}: {
	artistEmail: string;
	artistId: string;
	artistName: string;
	initialEventId?: string | null;
	initialSection?: "contract" | "logistics" | "show_info" | null;
	onBack?: () => void;
	onClose?: () => void;
}) {
	const [invites, setInvites] = useState<FLInvite[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId || null);
	const { toast } = useToast();

	// Sync when initialEventId changes from outside
	useEffect(() => {
		if (initialEventId) setSelectedEventId(initialEventId);
	}, [initialEventId]);

	const fetchInvites = useCallback(async () => {
		try {
			const res = await fetch(
				`/api/contracts/famelink-invites?email=${encodeURIComponent(artistEmail)}&artistId=${encodeURIComponent(artistId)}`,
			);
			const result = await res.json();
			if (result.success) {
				setInvites(result.invites || []);
			} else {
				setError(result.error || "Failed to load invites");
			}
		} catch (err) {
			console.error("Error fetching invites:", err);
			setError("Failed to load invites");
		} finally {
			setLoading(false);
		}
	}, [artistEmail, artistId]);

	useEffect(() => {
		fetchInvites();
		// Poll every 15s as fallback for real-time without manual refresh
		const interval = setInterval(fetchInvites, 15000);
		return () => clearInterval(interval);
	}, [fetchInvites]);

	// Listen for real-time updates via WebSocket
	// Join event rooms for all invites and listen for contract updates
	useEffect(() => {
		const socket = (window as any).__fameLinkSocket;
		if (!socket || invites.length === 0) return;

		// Join event rooms for all invites so we receive broadcasts
		const eventIds = new Set(invites.map((i) => i.eventId));
		for (const eid of eventIds) {
			socket.emit("join_event_room", { eventId: eid });
		}

		// Listen for contract updates from the organizer
		const handleArtistUpdated = (data: any) => {
			// Check if this update is for one of our invites
			if (data?.eventId && eventIds.has(data.eventId)) {
				fetchInvites();
				if (data.artistAction) {
					// This was our own action echoed back, skip toast
					return;
				}
				toast({
					title: "📝 Contract Updated",
					description:
						"The organizer has updated your contract details.",
				});
			}
		};

		const handleInvitationCreated = (data: any) => {
			// New invitation for this artist
			fetchInvites();
			toast({
				title: "🎉 New Event Invitation!",
				description: `You've been invited to ${data.eventName || "an event"}.`,
			});
		};

		const handleMessageNew = (data: any) => {
			if (data?.eventId && eventIds.has(data.eventId)) {
				fetchInvites();
				if (data.message?.sender !== "artist") {
					toast({
						title: "💬 New Message",
						description:
							"You have a new message from the organizer.",
					});
				}
			}
		};

		const handleStatusChanged = (data: any) => {
			if (data?.eventId && eventIds.has(data.eventId)) {
				fetchInvites();
				toast({
					title: "🔄 Status Updated",
					description: `Your contract status has been updated.`,
				});
			}
		};

		const handlePaymentUpdated = (data: any) => {
			if (data?.eventId && eventIds.has(data.eventId)) {
				fetchInvites();
				toast({
					title: "💰 Payment Updated",
					description: "A payment status has been updated.",
				});
			}
		};

		const handleInviteSent = (data: any) => {
			if (data?.famelinkArtistId === artistId) {
				fetchInvites();
				toast({
					title: "🎉 New Event Invitation!",
					description: `You've been invited to ${data.eventName || "an event"}.`,
				});
			}
		};

		socket.on("contract_artist_updated", handleArtistUpdated);
		socket.on("contract_invitation_created", handleInvitationCreated);
		socket.on("contract_message_new", handleMessageNew);
		socket.on("contract_status_changed", handleStatusChanged);
		socket.on("contract_payment_updated", handlePaymentUpdated);
		socket.on("contract_invite_sent", handleInviteSent);

		return () => {
			socket.off("contract_artist_updated", handleArtistUpdated);
			socket.off("contract_invitation_created", handleInvitationCreated);
			socket.off("contract_message_new", handleMessageNew);
			socket.off("contract_status_changed", handleStatusChanged);
			socket.off("contract_payment_updated", handlePaymentUpdated);
			socket.off("contract_invite_sent", handleInviteSent);
		};
	}, [fetchInvites, toast, invites.length, artistId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
				<span className="ml-2 text-purple-200/50 text-sm">
					Loading invites...
				</span>
			</div>
		);
	}

	if (invites.length === 0) {
		return (
			<div className="glass-card rounded-2xl p-12 text-center border border-purple-500/20">
				<div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
					<FileText className="h-8 w-8 text-purple-400/30" />
				</div>
				<h3 className="text-lg font-semibold text-white mb-2">
					No Invitations Yet
				</h3>
				<p className="text-purple-200/50 max-w-sm mx-auto">
					When an event organizer invites you, your invitations and
					contracts will appear here.
				</p>
			</div>
		);
	}

	if (selectedEventId) {
		const selectedInvite = invites.find(i => i.eventId === selectedEventId);
		if (selectedInvite) {
			return (
				<div className="space-y-4">
					<Button 
						variant="ghost" 
						onClick={() => {
							setSelectedEventId(null);
							if (onBack) onBack();
						}} 
						className="mb-2 text-purple-200 hover:text-white hover:bg-white/5 gap-2 rounded-xl"
					>
						<ArrowLeft className="w-4 h-4" /> Back to Messages
					</Button>
					<InviteRow
						invite={selectedInvite}
						defaultExpanded={true}
						initialSection={initialSection}
						onRefresh={fetchInvites}
						onClose={onClose}
					/>
				</div>
			);
		}
	}

	return (
		<div className="space-y-6">
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<div className="w-10 h-10 rounded-xl bg-[#bf1ed4]/20 border border-[#bf1ed4]/30 flex items-center justify-center">
						<CheckSquare className="w-5 h-5 text-[#bf1ed4]" />
					</div>
					<div>
						<h2 className="text-xl font-bold text-white">My Event Tasks</h2>
						<p className="text-sm text-purple-200/50">Track your requirements for upcoming performances.</p>
					</div>
				</div>
			</div>
			
			<div className="space-y-4">
				{invites.map((invite) => (
					<InviteListCard 
						key={invite.id} 
						invite={invite} 
						onOpen={() => setSelectedEventId(invite.eventId)} 
					/>
				))}
			</div>
		</div>
	);
}
