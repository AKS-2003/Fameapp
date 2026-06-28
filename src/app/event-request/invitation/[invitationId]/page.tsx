"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	Loader2,
	User,
	Plane,
	HelpCircle,
	Send,
	AlertCircle,
} from "lucide-react";

const STEPS = [
	{ id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
	{
		id: "travel",
		label: "Travel & Stay",
		icon: <Plane className="w-4 h-4" />,
	},
	{
		id: "questions",
		label: "Event Questions",
		icon: <HelpCircle className="w-4 h-4" />,
	},
	{
		id: "review",
		label: "Review & Submit",
		icon: <Send className="w-4 h-4" />,
	},
];

export default function EventRequestPage() {
	const params = useParams();
	const router = useRouter();
	const invitationId = params.invitationId as string;

	const [invitation, setInvitation] = useState<any>(null);
	const [event, setEvent] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	// Form data
	const [profile, setProfile] = useState({
		fullName: "",
		artistName: "",
		email: "",
		phone: "",
		country: "",
		city: "",
		nationality: "",
		nearestAirport: "",
	});

	const [travel, setTravel] = useState({
		arrivalDate: "",
		departureDate: "",
		hotelNeeded: "yes",
		roomPreference: "private",
		dietaryRestrictions: "",
		additionalNotes: "",
		passportFile: "",
		visaNeeded: "no",
	});

	const [answers, setAnswers] = useState<Record<string, string>>({});

	useEffect(() => {
		async function fetchData() {
			try {
				const res = await fetch(
					`/api/contracts/invite/${invitationId}`,
				);
				const data = await res.json();
				if (data.success) {
					setInvitation(data.invitation);
					setEvent(data.event);
					setProfile((prev) => ({
						...prev,
						artistName: data.invitation.artistName || "",
						email: data.invitation.artistEmail || "",
					}));
				} else {
					setError("Invitation not found");
				}
			} catch (err) {
				setError("Failed to load invitation");
			} finally {
				setIsLoading(false);
			}
		}
		fetchData();
	}, [invitationId]);

	const handleSubmit = async () => {
		if (!invitation) return;
		setSubmitting(true);
		try {
			const eventQuestions = [
				...Object.entries(profile).map(([key, value]) => ({
					id: `profile-${key}`,
					question: key
						.replace(/([A-Z])/g, " $1")
						.replace(/^./, (s) => s.toUpperCase()),
					answer: value,
					category: "stable" as const,
				})),
				...Object.entries(travel).map(([key, value]) => ({
					id: `travel-${key}`,
					question: key
						.replace(/([A-Z])/g, " $1")
						.replace(/^./, (s) => s.toUpperCase()),
					answer: value,
					category: "stable" as const,
				})),
				...Object.entries(answers).map(([key, value]) => ({
					id: key,
					question: key,
					answer: value,
					category: "flexible" as const,
				})),
			];

			await fetch(`/api/contracts/${invitation.eventId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					artistId: invitation.id,
					legalName: profile.fullName,
					stageName: profile.artistName,
					email: profile.email,
					phone: profile.phone,
					country: profile.country,
					city: profile.city,
					nationality: profile.nationality,
					nearestAirport: profile.nearestAirport,
					dietaryPreferences: travel.dietaryRestrictions,
					hotelRoomPreference: travel.roomPreference,
					travelPreferences: `Visa: ${travel.visaNeeded}`,
					profileStatus: "received",
					status: "waiting",
					eventQuestions,
					agreement: {
						arrivalDate: travel.arrivalDate,
						departureDate: travel.departureDate,
					},
				}),
			});

			await fetch(`/api/contracts/${invitation.eventId}/invitations`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					invitationId: invitation.id,
					status: "submitted",
					respondedAt: new Date().toISOString(),
				}),
			});

			setSubmitted(true);
		} catch (err) {
			setError("Failed to submit. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
				<Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
				<div className="text-center max-w-md">
					<AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-white mb-2">
						Error
					</h1>
					<p className="text-purple-300">{error}</p>
				</div>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
				<div className="text-center max-w-md animate-fade-in-up">
					<CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-6" />
					<h1 className="text-3xl font-bold text-white mb-3">
						Submitted!
					</h1>
					<p className="text-purple-300 mb-6">
						Thank you, {profile.artistName || invitation.artistName}
						! Your information has been submitted to the organiser.
						They will review your profile and get back to you soon.
					</p>
					<div className="flex gap-3 justify-center">
						<a
							href="/famelink"
							className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-400 hover:to-pink-400 transition-all"
						>
							Open FameLink Dashboard
						</a>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
			<div className="max-w-2xl mx-auto px-6 py-8">
				{/* Header */}
				<div className="flex items-center gap-3 mb-8">
					<button
						onClick={() =>
							currentStep > 0
								? setCurrentStep(currentStep - 1)
								: router.push(`/invite/${invitationId}`)
						}
						className="p-2 hover:bg-purple-800/50 rounded-lg transition-colors text-purple-300"
					>
						<ArrowLeft className="w-4 h-4" />
					</button>
					<div>
						<h1 className="text-xl font-bold text-white">
							Event Request Form
						</h1>
						<p className="text-xs text-purple-400">
							{event?.name || "Festival Event"} ·{" "}
							{invitation.templateName}
						</p>
					</div>
				</div>

				{/* Step Indicator */}
				<div className="flex items-center justify-between mb-8 px-4">
					{STEPS.map((step, i) => (
						<div key={step.id} className="flex items-center">
							{i > 0 && (
								<div
									className={`w-12 sm:w-20 h-0.5 mx-1 ${i <= currentStep ? "bg-purple-400" : "bg-purple-700"}`}
								/>
							)}
							<div className="flex flex-col items-center gap-1">
								<div
									className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
										i === currentStep
											? "bg-purple-500 text-white ring-2 ring-purple-400/50 scale-110"
											: i < currentStep
												? "bg-green-500 text-white"
												: "bg-purple-800 text-purple-500"
									}`}
								>
									{i < currentStep ? (
										<Check className="w-4 h-4" />
									) : (
										step.icon
									)}
								</div>
								<span
									className={`text-[10px] font-medium ${
										i === currentStep
											? "text-purple-300"
											: i < currentStep
												? "text-green-400"
												: "text-purple-600"
									}`}
								>
									{step.label}
								</span>
							</div>
						</div>
					))}
				</div>

				{/* Form content */}
				<div className="bg-purple-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
					{/* Step 1: Profile */}
					{currentStep === 0 && (
						<div className="space-y-4 animate-fade-in-up">
							<h2 className="text-lg font-semibold text-white mb-4">
								Your Profile
							</h2>
							{[
								{
									label: "Full Legal Name",
									field: "fullName",
									placeholder: "Maria Silva & Carlos Perez",
									type: "text",
								},
								{
									label: "Stage / Artist Name",
									field: "artistName",
									placeholder: "Maria & Carlos",
									type: "text",
								},
								{
									label: "Email",
									field: "email",
									placeholder: "you@email.com",
									type: "email",
								},
								{
									label: "Phone",
									field: "phone",
									placeholder: "+54 11 1234 5678",
									type: "tel",
								},
								{
									label: "Country",
									field: "country",
									placeholder: "Argentina",
									type: "text",
								},
								{
									label: "City",
									field: "city",
									placeholder: "Buenos Aires",
									type: "text",
								},
								{
									label: "Nationality",
									field: "nationality",
									placeholder: "Argentine",
									type: "text",
								},
								{
									label: "Nearest International Airport",
									field: "nearestAirport",
									placeholder: "EZE",
									type: "text",
								},
							].map((item) => (
								<div key={item.field}>
									<label className="text-xs text-purple-400 mb-1 block">
										{item.label}
									</label>
									<input
										type={item.type}
										value={(profile as any)[item.field]}
										onChange={(e) =>
											setProfile({
												...profile,
												[item.field]: e.target.value,
											})
										}
										placeholder={item.placeholder}
										className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white placeholder:text-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-400"
									/>
								</div>
							))}
						</div>
					)}

					{/* Step 2: Travel & Stay */}
					{currentStep === 1 && (
						<div className="space-y-4 animate-fade-in-up">
							<h2 className="text-lg font-semibold text-white mb-4">
								Travel & Accommodation
							</h2>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-xs text-purple-400 mb-1 block">
										Arrival Date
									</label>
									<input
										type="date"
										value={travel.arrivalDate}
										onChange={(e) =>
											setTravel({
												...travel,
												arrivalDate: e.target.value,
											})
										}
										className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
									/>
								</div>
								<div>
									<label className="text-xs text-purple-400 mb-1 block">
										Departure Date
									</label>
									<input
										type="date"
										value={travel.departureDate}
										onChange={(e) =>
											setTravel({
												...travel,
												departureDate: e.target.value,
											})
										}
										className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
									/>
								</div>
							</div>
							<div>
								<label className="text-xs text-purple-400 mb-1 block">
									Do you need a hotel?
								</label>
								<select
									value={travel.hotelNeeded}
									onChange={(e) =>
										setTravel({
											...travel,
											hotelNeeded: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
								>
									<option value="yes">Yes</option>
									<option value="no">
										No, I arrange my own
									</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-purple-400 mb-1 block">
									Room Preference
								</label>
								<select
									value={travel.roomPreference}
									onChange={(e) =>
										setTravel({
											...travel,
											roomPreference: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
								>
									<option value="private">
										Private Room
									</option>
									<option value="shared">Shared Room</option>
									<option value="any">No Preference</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-purple-400 mb-1 block">
									Do you need a visa invitation letter?
								</label>
								<select
									value={travel.visaNeeded}
									onChange={(e) =>
										setTravel({
											...travel,
											visaNeeded: e.target.value,
										})
									}
									className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
								>
									<option value="no">No</option>
									<option value="yes">Yes</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-purple-400 mb-1 block">
									Dietary Restrictions
								</label>
								<input
									type="text"
									value={travel.dietaryRestrictions}
									onChange={(e) =>
										setTravel({
											...travel,
											dietaryRestrictions: e.target.value,
										})
									}
									placeholder="e.g. Vegetarian, Gluten-free, Halal..."
									className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white placeholder:text-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-400"
								/>
							</div>
							<div>
								<label className="text-xs text-purple-400 mb-1 block">
									Additional Notes
								</label>
								<textarea
									value={travel.additionalNotes}
									onChange={(e) =>
										setTravel({
											...travel,
											additionalNotes: e.target.value,
										})
									}
									placeholder="Any special requests or information..."
									rows={3}
									className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white placeholder:text-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
								/>
							</div>
						</div>
					)}

					{/* Step 3: Event Questions */}
					{currentStep === 2 && (
						<div className="space-y-4 animate-fade-in-up">
							<h2 className="text-lg font-semibold text-white mb-4">
								Event Questions
								<span className="text-xs text-purple-400 ml-2 font-normal">
									({invitation.templateName})
								</span>
							</h2>
							{invitation.participantType === "dancer" && (
								<>
									{[
										{
											id: "workshops_count",
											label: "How many workshops can you teach?",
											type: "number",
										},
										{
											id: "workshop_titles",
											label: "Workshop titles/topics",
											type: "text",
										},
										{
											id: "shows_count",
											label: "How many shows can you perform?",
											type: "number",
										},
										{
											id: "performance_type",
											label: "Performance type",
											type: "select",
											options: [
												"Solo",
												"Couple",
												"Group",
											],
										},
										{
											id: "additional_dancers",
											label: "Bringing additional dancers?",
											type: "text",
										},
									].map((q) => (
										<div key={q.id}>
											<label className="text-xs text-purple-400 mb-1 block">
												{q.label}
											</label>
											{q.type === "select" ? (
												<select
													value={answers[q.id] || ""}
													onChange={(e) =>
														setAnswers({
															...answers,
															[q.id]: e.target
																.value,
														})
													}
													className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
												>
													<option value="">
														Select...
													</option>
													{q.options?.map((o) => (
														<option
															key={o}
															value={o}
														>
															{o}
														</option>
													))}
												</select>
											) : (
												<input
													type={q.type}
													value={answers[q.id] || ""}
													onChange={(e) =>
														setAnswers({
															...answers,
															[q.id]: e.target
																.value,
														})
													}
													className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
												/>
											)}
										</div>
									))}
								</>
							)}
							{invitation.participantType === "dj" && (
								<>
									{[
										{
											id: "set_count",
											label: "How many DJ sets?",
											type: "number",
										},
										{
											id: "set_duration",
											label: "Preferred set duration",
											type: "text",
										},
										{
											id: "equipment",
											label: "Do you bring your own equipment?",
											type: "text",
										},
										{
											id: "controller",
											label: "Controller/CDJ preference",
											type: "text",
										},
										{
											id: "genre",
											label: "Music genre/style",
											type: "text",
										},
									].map((q) => (
										<div key={q.id}>
											<label className="text-xs text-purple-400 mb-1 block">
												{q.label}
											</label>
											<input
												type={q.type}
												value={answers[q.id] || ""}
												onChange={(e) =>
													setAnswers({
														...answers,
														[q.id]: e.target.value,
													})
												}
												className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
											/>
										</div>
									))}
								</>
							)}
							{!["dancer", "dj"].includes(
								invitation.participantType,
							) && (
								<div>
									<label className="text-xs text-purple-400 mb-1 block">
										Tell us about your participation
									</label>
									<textarea
										value={answers.general || ""}
										onChange={(e) =>
											setAnswers({
												...answers,
												general: e.target.value,
											})
										}
										rows={5}
										placeholder="Describe your requirements, preferences, and what you can offer..."
										className="w-full px-3 py-2.5 bg-purple-800/30 border border-purple-600/30 rounded-lg text-sm text-white placeholder:text-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
									/>
								</div>
							)}
						</div>
					)}

					{/* Step 4: Review & Submit */}
					{currentStep === 3 && (
						<div className="space-y-6 animate-fade-in-up">
							<h2 className="text-lg font-semibold text-white mb-4">
								Review & Submit
							</h2>
							<div className="space-y-4">
								<div className="p-4 bg-purple-800/20 rounded-xl border border-purple-600/20">
									<h3 className="text-sm font-semibold text-purple-300 mb-2">
										Profile
									</h3>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<span className="text-purple-400">
											Name:
										</span>
										<span className="text-white">
											{profile.fullName || "—"}
										</span>
										<span className="text-purple-400">
											Artist Name:
										</span>
										<span className="text-white">
											{profile.artistName || "—"}
										</span>
										<span className="text-purple-400">
											Email:
										</span>
										<span className="text-white">
											{profile.email || "—"}
										</span>
										<span className="text-purple-400">
											Country:
										</span>
										<span className="text-white">
											{profile.city}, {profile.country}
										</span>
									</div>
								</div>
								<div className="p-4 bg-purple-800/20 rounded-xl border border-purple-600/20">
									<h3 className="text-sm font-semibold text-purple-300 mb-2">
										Travel
									</h3>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<span className="text-purple-400">
											Arrival:
										</span>
										<span className="text-white">
											{travel.arrivalDate || "—"}
										</span>
										<span className="text-purple-400">
											Departure:
										</span>
										<span className="text-white">
											{travel.departureDate || "—"}
										</span>
										<span className="text-purple-400">
											Hotel Needed:
										</span>
										<span className="text-white capitalize">
											{travel.hotelNeeded}
										</span>
										<span className="text-purple-400">
											Dietary:
										</span>
										<span className="text-white">
											{travel.dietaryRestrictions ||
												"None"}
										</span>
									</div>
								</div>
							</div>
							<button
								onClick={handleSubmit}
								disabled={submitting}
								className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg hover:from-purple-400 hover:to-pink-400 transition-all shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
							>
								{submitting ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									<>
										<Send className="w-5 h-5" /> Submit
										Event Request
									</>
								)}
							</button>
						</div>
					)}
				</div>

				{/* Navigation buttons */}
				{currentStep < 3 && (
					<div className="flex justify-between mt-6">
						<button
							onClick={() =>
								setCurrentStep(Math.max(0, currentStep - 1))
							}
							disabled={currentStep === 0}
							className="px-4 py-2 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm flex items-center gap-1"
						>
							<ArrowLeft className="w-4 h-4" /> Back
						</button>
						<button
							onClick={() =>
								setCurrentStep(
									Math.min(STEPS.length - 1, currentStep + 1),
								)
							}
							className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
						>
							Next <ArrowRight className="w-4 h-4" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
