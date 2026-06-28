import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, X } from "lucide-react";

interface LogisticsIntakeModalProps {
	isOpen: boolean;
	onClose: () => void;
	invite: any;
	onSubmit: (data: any) => void;
}

export function LogisticsIntakeModal({ isOpen, onClose, invite, onSubmit }: LogisticsIntakeModalProps) {
	const [step, setStep] = useState(1);
	const [isFullscreen, setIsFullscreen] = useState(true);

	const artist = invite?.artist || {};
	
	// Try to get travelers from the new reusable Logistics Profile first
	const savedTravelers = artist.logistics?.travelers || [];
	
	let allTravelersList: any[] = [];
	
	if (savedTravelers.length > 0) {
		allTravelersList = savedTravelers.map((t: any, index: number) => ({
			id: t.id || index.toString(),
			name: t.fullPassportName || "Unknown Traveler",
			role: index === 0 ? "Lead artist" : "Traveler", // Usually first person is lead
			location: t.homeDepartureCity || "Not specified",
			passportStatus: t.passportCopyUrl ? "Passport uploaded" : "Passport missing",
			isLead: index === 0,
		}));
	} else {
		// Fallback to legacy structure
		const allMembers = artist.groupMembers || [];
		const leadArtist = {
			id: "lead",
			name: artist.legalName || artist.stageName || "Lead Artist",
			role: "Lead artist",
			location: artist.city || "Not specified",
			passportStatus: "Passport uploaded", // Mock for now
			isLead: true,
		};
		
		allTravelersList = [
			leadArtist,
			...allMembers.map((m: any, index: number) => ({
				id: `member-${index}`,
				name: m.name,
				role: m.role || "Member",
				location: m.departureCity || "Not specified",
				passportStatus: m.passportUpload ? "Passport uploaded" : "Passport missing",
				isLead: false,
			}))
		];
	}

	const existingLogistics = invite?.artist?.travelLogistics || {};

	// Step 1 State
	const initialSelectedTravelers = existingLogistics.selectedTravelers 
		|| allTravelersList.map(t => t.id);
	const initialOverrideCount = existingLogistics.totalTravelers?.toString() 
		|| allTravelersList.length.toString();

	const [selectedTravelers, setSelectedTravelers] = useState<string[]>(initialSelectedTravelers);
	const [overrideCount, setOverrideCount] = useState<string>(initialOverrideCount);

	// Step 2 State
	const [needs, setNeeds] = useState({
		flights: existingLogistics.needs?.flights ?? true,
		hotel: existingLogistics.needs?.hotel ?? true,
		transport: existingLogistics.needs?.transport ?? true,
		visa: existingLogistics.needs?.visa ?? false,
	});

	const [questions, setQuestions] = useState({
		arrivalDate: existingLogistics.questions?.arrivalDate || "",
		dietary: existingLogistics.questions?.dietary || "",
		vipMeetGreet: existingLogistics.questions?.vipMeetGreet || false,
		checkedLuggage: existingLogistics.questions?.checkedLuggage || "",
		separateVehicle: existingLogistics.questions?.separateVehicle || false,
		hotelRoomType: existingLogistics.questions?.hotelRoomType || "Double",
		visaLetters: existingLogistics.questions?.visaLetters || false,
		accessibility: existingLogistics.questions?.accessibility || "",
		additionalNights: existingLogistics.questions?.additionalNights || false,
		groundTransportPrefs: existingLogistics.questions?.groundTransportPrefs || "",
	});

	const [errors, setErrors] = useState<string[]>([]);

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setStep(1);
			setErrors([]);
			setIsFullscreen(true);
			setSelectedTravelers(initialSelectedTravelers);
			setOverrideCount(initialOverrideCount);
			setNeeds({
				flights: existingLogistics.needs?.flights ?? true,
				hotel: existingLogistics.needs?.hotel ?? true,
				transport: existingLogistics.needs?.transport ?? true,
				visa: existingLogistics.needs?.visa ?? false,
			});
			setQuestions({
				arrivalDate: existingLogistics.questions?.arrivalDate || "",
				dietary: existingLogistics.questions?.dietary || "",
				vipMeetGreet: existingLogistics.questions?.vipMeetGreet || false,
				checkedLuggage: existingLogistics.questions?.checkedLuggage || "",
				separateVehicle: existingLogistics.questions?.separateVehicle || false,
				hotelRoomType: existingLogistics.questions?.hotelRoomType || "Double",
				visaLetters: existingLogistics.questions?.visaLetters || false,
				accessibility: existingLogistics.questions?.accessibility || "",
				additionalNights: existingLogistics.questions?.additionalNights || false,
				groundTransportPrefs: existingLogistics.questions?.groundTransportPrefs || "",
			});
		}
	}, [isOpen]);

	const toggleTraveler = (id: string, name: string) => {
		setSelectedTravelers(prev => {
			const isCurrentlySelected = prev.includes(id) || prev.includes(name);
			const next = isCurrentlySelected 
				? prev.filter(n => n !== id && n !== name) 
				: [...prev, id];
			setOverrideCount(next.length.toString());
			return next;
		});
	};

	const handleSubmit = () => {
		if (step === 2) {
			const newErrors: string[] = [];
			if (!questions.arrivalDate.trim()) newErrors.push("arrivalDate");
			if (!questions.dietary.trim()) newErrors.push("dietary");
			if (!questions.checkedLuggage.trim()) newErrors.push("checkedLuggage");
			
			if (newErrors.length > 0) {
				setErrors(newErrors);
				
				// Scroll to top of the modal content area to see the errors
				const container = document.getElementById('modal-scroll-container');
				if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
				
				return;
			}
		}

		const payload = {
			selectedTravelers,
			totalTravelers: parseInt(overrideCount) || selectedTravelers.length,
			needs,
			questions,
		};
		onSubmit(payload);
		onClose();
	};

	const YesNoToggle = ({ value, onChange }: { value: boolean, onChange: (val: boolean) => void }) => (
		<div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
			<button
				type="button"
				onClick={() => onChange(true)}
				className={cn("px-4 py-1 text-sm rounded-md transition-all font-semibold", value ? "bg-[#bc13a6] text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
			>
				Yes
			</button>
			<button
				type="button"
				onClick={() => onChange(false)}
				className={cn("px-4 py-1 text-sm rounded-md transition-all font-semibold", !value ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
			>
				No
			</button>
		</div>
	);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className={cn("bg-[#f7f8f9] max-w-4xl p-0 overflow-hidden flex flex-col transition-all duration-300", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "max-h-[90vh]")}>
				{/* Header */}
				<div className="p-6 border-b border-slate-200 flex justify-between items-start bg-white z-10 shrink-0">
					<DialogHeader>
						<DialogTitle className="text-xl font-bold text-slate-900">Logistics · {invite?.event?.title || "Event"}</DialogTitle>
						<DialogDescription className="text-slate-500 text-sm">Share your logistics information for this event.</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="bg-purple-500 text-white border-none hover:bg-purple-600 hover:text-white h-8 text-xs rounded-lg">
							{isFullscreen ? <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> : <Maximize2 className="w-3.5 h-3.5 mr-1.5" />}
							{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
						</Button>
					</div>
				</div>

				{/* Body Content */}
				<div id="modal-scroll-container" className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
					
					{/* Steps Navigation */}
					<div className="flex items-center justify-between border-b border-slate-200 pb-2">
						<div className="flex items-center gap-2">
							<button 
								onClick={() => setStep(1)}
								className={cn("px-4 py-1.5 text-sm font-bold rounded-xl border transition-all", step === 1 ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
							>
								Step 1: Travelers
							</button>
							<button 
								onClick={() => setStep(2)}
								disabled={step < 1}
								className={cn("px-4 py-1.5 text-sm font-bold rounded-xl border transition-all", step === 2 ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50", step < 2 ? "opacity-50 cursor-not-allowed" : "")}
							>
								Step 2: Travel Needs & Questions
							</button>
						</div>
						<Badge variant="secondary" className="bg-slate-100 text-slate-400 font-medium">Draft</Badge>
					</div>

					{/* Step 1 Content */}
					{step === 1 && (
						<div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
							<div>
								<h3 className="text-lg font-bold text-slate-900 mb-1">Who will travel to this event?</h3>
								<p className="text-slate-500 text-sm">Select the members of your team that will travel. You can adjust the count below if it differs from your saved team.</p>
							</div>

							<div className="space-y-3">
								{allTravelersList.map((t, idx) => {
									const isSelected = selectedTravelers.includes(t.id) || selectedTravelers.includes(t.name);
									return (
										<label key={t.id || idx} className={cn("flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none", isSelected ? "border-pink-300 bg-pink-50/30" : "border-slate-200 bg-white hover:border-slate-300")}>
											<div className="pt-1">
												<input 
													type="checkbox"
													checked={isSelected} 
													onChange={() => toggleTraveler(t.id, t.name)} 
													className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
												/>
											</div>
											<div>
												<p className="text-slate-900 font-bold">{t.name}</p>
												<p className="text-slate-500 text-xs mt-0.5">{t.role} · from {t.location} · {t.passportStatus}</p>
											</div>
										</label>
									);
								})}
							</div>

							<div className="flex items-center justify-between p-5 rounded-xl border border-slate-200 bg-white">
								<div>
									<p className="font-bold text-slate-900 text-sm">Total travelers</p>
									<p className="text-slate-500 text-xs">Override if you're bringing additional people.</p>
								</div>
								<Input 
									type="number" 
									value={overrideCount} 
									onChange={e => setOverrideCount(e.target.value)} 
									className="w-20 text-center font-bold bg-slate-50" 
								/>
							</div>

							<div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between">
								<p className="text-slate-600 text-sm font-medium">Selected: <span className="font-bold">{selectedTravelers.length}</span> / {allTravelersList.length} from saved team · <span className="font-bold">Count: {overrideCount}</span></p>
							</div>
						</div>
					)}

					{/* Step 2 Content */}
					{step === 2 && (
						<div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
							{/* Needs */}
							<div className="space-y-4">
								<h3 className="text-lg font-bold text-slate-900 mb-2">What do you need for this event?</h3>
								
								<div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
									<p className="text-slate-700 font-medium text-sm">Flights needed</p>
									<YesNoToggle value={needs.flights} onChange={v => setNeeds({...needs, flights: v})} />
								</div>
								<div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
									<p className="text-slate-700 font-medium text-sm">Hotel accommodation needed</p>
									<YesNoToggle value={needs.hotel} onChange={v => setNeeds({...needs, hotel: v})} />
								</div>
								<div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
									<p className="text-slate-700 font-medium text-sm">Local transport needed</p>
									<YesNoToggle value={needs.transport} onChange={v => setNeeds({...needs, transport: v})} />
								</div>
								<div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
									<p className="text-slate-700 font-medium text-sm">Visa support needed</p>
									<YesNoToggle value={needs.visa} onChange={v => setNeeds({...needs, visa: v})} />
								</div>
							</div>

							{/* Questions */}
							<div className="space-y-4">
								<div>
									<h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-1">Logistics Questions</h4>
									<p className="text-slate-500 text-sm">Please answer the questions below — the Logistics Manager will use these to plan your travel, hotel and transport.</p>
								</div>

								<div className="space-y-4">
									<div className={cn("p-5 rounded-xl border bg-white space-y-3 transition-colors", errors.includes("arrivalDate") ? "border-red-400 bg-red-50/30" : "border-slate-200")}>
										<label className={cn("text-sm font-bold", errors.includes("arrivalDate") ? "text-red-600" : "text-slate-700")}>
											<span className="text-slate-400 font-medium mr-1">#1</span> 
											What is your preferred arrival date and time? <span className="text-red-500">*</span>
										</label>
										<Textarea 
											value={questions.arrivalDate} 
											onChange={e => {
												setQuestions({...questions, arrivalDate: e.target.value});
												if (errors.includes("arrivalDate")) setErrors(errors.filter(err => err !== "arrivalDate"));
											}} 
											placeholder="Your answer..." 
											className={cn("min-h-[80px]", errors.includes("arrivalDate") ? "bg-red-50/50 border-red-200 focus-visible:ring-red-500" : "bg-slate-50 border-slate-200")} 
										/>
										{errors.includes("arrivalDate") && <p className="text-xs text-red-500 font-semibold mt-1">Please fill this detail.</p>}
									</div>

									<div className={cn("p-5 rounded-xl border bg-white space-y-3 transition-colors", errors.includes("dietary") ? "border-red-400 bg-red-50/30" : "border-slate-200")}>
										<label className={cn("text-sm font-bold", errors.includes("dietary") ? "text-red-600" : "text-slate-700")}>
											<span className="text-slate-400 font-medium mr-1">#2</span> 
											Do any travelers have dietary restrictions or allergies? <span className="text-red-500">*</span>
										</label>
										<Textarea 
											value={questions.dietary} 
											onChange={e => {
												setQuestions({...questions, dietary: e.target.value});
												if (errors.includes("dietary")) setErrors(errors.filter(err => err !== "dietary"));
											}} 
											placeholder="Your answer..." 
											className={cn("min-h-[80px]", errors.includes("dietary") ? "bg-red-50/50 border-red-200 focus-visible:ring-red-500" : "bg-slate-50 border-slate-200")} 
										/>
										{errors.includes("dietary") && <p className="text-xs text-red-500 font-semibold mt-1">Please fill this detail.</p>}
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#3</span> Do you require airport VIP meet & greet service?</label>
										<YesNoToggle value={questions.vipMeetGreet} onChange={v => setQuestions({...questions, vipMeetGreet: v})} />
									</div>

									<div className={cn("p-5 rounded-xl border bg-white space-y-3 transition-colors", errors.includes("checkedLuggage") ? "border-red-400 bg-red-50/30" : "border-slate-200")}>
										<label className={cn("text-sm font-bold", errors.includes("checkedLuggage") ? "text-red-600" : "text-slate-700")}>
											<span className="text-slate-400 font-medium mr-1">#4</span> 
											How many pieces of checked luggage (instruments/equipment) will you bring? <span className="text-red-500">*</span>
										</label>
										<Input 
											value={questions.checkedLuggage} 
											onChange={e => {
												setQuestions({...questions, checkedLuggage: e.target.value});
												if (errors.includes("checkedLuggage")) setErrors(errors.filter(err => err !== "checkedLuggage"));
											}} 
											placeholder="" 
											className={cn(errors.includes("checkedLuggage") ? "bg-red-50/50 border-red-200 focus-visible:ring-red-500" : "bg-slate-50 border-slate-200")} 
										/>
										{errors.includes("checkedLuggage") && <p className="text-xs text-red-500 font-semibold mt-1">Please fill this detail.</p>}
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#5</span> Do you need a separate vehicle for equipment transport?</label>
										<YesNoToggle value={questions.separateVehicle} onChange={v => setQuestions({...questions, separateVehicle: v})} />
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#6</span> What is your preferred hotel room type? <span className="text-red-500">*</span></label>
										<div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
											{["Single", "Double", "Suite"].map(type => (
												<button
													key={type}
													type="button"
													onClick={() => setQuestions({...questions, hotelRoomType: type})}
													className={cn("px-4 py-1.5 text-sm rounded-md transition-all font-semibold", questions.hotelRoomType === type ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700")}
												>
													{type}
												</button>
											))}
										</div>
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#7</span> Will any travelers require visa invitation letters? <span className="text-red-500">*</span></label>
										<YesNoToggle value={questions.visaLetters} onChange={v => setQuestions({...questions, visaLetters: v})} />
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#8</span> Do you have any accessibility requirements for hotel or venue?</label>
										<Textarea value={questions.accessibility} onChange={e => setQuestions({...questions, accessibility: e.target.value})} placeholder="Your answer..." className="bg-slate-50 border-slate-200 min-h-[80px]" />
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col gap-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#9</span> Would you like to book additional nights before or after the event?</label>
										<YesNoToggle value={questions.additionalNights} onChange={v => setQuestions({...questions, additionalNights: v})} />
									</div>

									<div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
										<label className="text-sm font-bold text-slate-700"><span className="text-slate-400 font-medium mr-1">#10</span> Are there any specific ground transport preferences?</label>
										<Textarea value={questions.groundTransportPrefs} onChange={e => setQuestions({...questions, groundTransportPrefs: e.target.value})} placeholder="Your answer..." className="bg-slate-50 border-slate-200 min-h-[80px]" />
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer Navigation */}
				<div className="p-6 border-t border-slate-200 bg-[#f7f8f9] flex justify-between items-center shrink-0">
					{step === 1 ? (
						<Button variant="outline" className="w-40 font-bold bg-slate-50" onClick={onClose}>Close</Button>
					) : (
						<Button variant="outline" className="w-32 font-bold bg-white" onClick={() => setStep(1)}>Back</Button>
					)}

					{step === 1 ? (
						<Button className="w-full max-w-[200px] ml-4 bg-[#bc13a6] hover:bg-[#a0108e] text-white font-bold" onClick={() => setStep(2)}>
							Continue
						</Button>
					) : (
						<Button className="w-full max-w-[280px] ml-4 bg-[#bc13a6] hover:bg-[#a0108e] text-white font-bold" onClick={handleSubmit}>
							Submit Logistics Info
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
