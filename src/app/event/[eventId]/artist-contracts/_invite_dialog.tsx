"use client";

import { useState, useCallback } from "react";
import {
	ArrowLeft, ArrowRight, Check, Copy, Edit, Plus, Send, Trash2,
	GripVertical, Music, Mic2, Guitar, Megaphone, Star, Users,
	Link as LinkIcon, ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ContractInvitation, RequestTemplateType } from "@/types/contracts";
import { requestTemplateLabels } from "@/types/contracts";

// ═══ Template types (inline — matches sample_src/sample_data/requestTemplates) ═══

type QuestionType = "short_text" | "paragraph" | "number" | "yes_no" | "multiple_choice" | "dropdown" | "date" | "file_upload" | "link";
interface TemplateQuestion { id: string; label: string; type: QuestionType; required: boolean; options?: string[]; }
interface RequestTemplate { id: string; name: string; participantType: RequestTemplateType; questions: TemplateQuestion[]; }

const questionTypeLabels: Record<QuestionType, string> = {
	short_text: "Short Text", paragraph: "Paragraph", number: "Number", yes_no: "Yes / No",
	multiple_choice: "Multiple Choice", dropdown: "Dropdown", date: "Date", file_upload: "File Upload", link: "Link",
};

const participantIcons: Record<RequestTemplateType, React.ElementType> = {
	dancer: Users, dj: Music, band: Guitar, mc: Mic2, ambassador: Megaphone, guest: Star,
};

let _tplId = 500;
const uid = () => String(_tplId++);

const defaultTemplates: RequestTemplate[] = [
	{ id: "tpl-dancer", name: "Dancer / Instructor", participantType: "dancer", questions: [
		{ id: uid(), label: "How many workshops can you teach?", type: "number", required: true },
		{ id: uid(), label: "Workshop titles you would like to propose", type: "paragraph", required: false },
		{ id: uid(), label: "How many shows will you perform?", type: "number", required: true },
		{ id: uid(), label: "Will you perform as a solo, couple, or group?", type: "dropdown", required: true, options: ["Solo", "Couple", "Group"] },
		{ id: uid(), label: "Will additional dancers join your performance?", type: "yes_no", required: false },
	]},
	{ id: "tpl-dj", name: "DJ", participantType: "dj", questions: [
		{ id: uid(), label: "How many DJ sets are you available for?", type: "number", required: true },
		{ id: uid(), label: "Preferred DJ set duration", type: "short_text", required: false },
		{ id: uid(), label: "Preferred DJ equipment", type: "short_text", required: false },
		{ id: uid(), label: "Do you bring your own controller?", type: "yes_no", required: true },
		{ id: uid(), label: "Music genre specialization", type: "short_text", required: true },
	]},
	{ id: "tpl-band", name: "Band / Live Act", participantType: "band", questions: [
		{ id: uid(), label: "Number of musicians", type: "number", required: true },
		{ id: uid(), label: "List of instruments", type: "paragraph", required: true },
		{ id: uid(), label: "Do you require a soundcheck?", type: "yes_no", required: true },
		{ id: uid(), label: "Stage size requirement", type: "short_text", required: false },
		{ id: uid(), label: "Do you travel with your own sound engineer?", type: "yes_no", required: false },
	]},
	{ id: "tpl-mc", name: "MC / Host", participantType: "mc", questions: [
		{ id: uid(), label: "Languages spoken", type: "short_text", required: true },
		{ id: uid(), label: "Preferred hosting segments", type: "paragraph", required: false },
		{ id: uid(), label: "Experience hosting festivals", type: "yes_no", required: true },
		{ id: uid(), label: "Do you require stage rehearsal?", type: "yes_no", required: false },
	]},
	{ id: "tpl-ambassador", name: "Ambassador / Promoter", participantType: "ambassador", questions: [
		{ id: uid(), label: "Country you represent", type: "short_text", required: true },
		{ id: uid(), label: "Estimated number of attendees you promote", type: "number", required: true },
		{ id: uid(), label: "Social media channels", type: "paragraph", required: false },
		{ id: uid(), label: "Promotional commitments", type: "paragraph", required: true },
	]},
	{ id: "tpl-guest", name: "Guest Artist", participantType: "guest", questions: [
		{ id: uid(), label: "Any special requirements?", type: "paragraph", required: false },
	]},
];

// ═══ INVITE ARTIST DIALOG ═══

interface InviteArtistDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInvitationCreated: (inv: ContractInvitation) => void;
	addInvitation: (inv: Partial<ContractInvitation>) => Promise<ContractInvitation | null>;
	addArtist: (artist: any) => Promise<any>;
}

type Step = "select_template" | "edit_template" | "invite_details" | "confirmation";

export function InviteArtistDialog({ open, onOpenChange, onInvitationCreated, addInvitation, addArtist }: InviteArtistDialogProps) {
	const [templates, setTemplates] = useState<RequestTemplate[]>(() => [...defaultTemplates]);
	const [step, setStep] = useState<Step>("select_template");
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const [editingTemplate, setEditingTemplate] = useState<RequestTemplate | null>(null);

	const [artistName, setArtistName] = useState("");
	const [artistEmail, setArtistEmail] = useState("");
	const [createdInvitation, setCreatedInvitation] = useState<ContractInvitation | null>(null);
	const [linkCopied, setLinkCopied] = useState(false);

	const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

	const reset = () => {
		setStep("select_template"); setSelectedTemplateId(null); setEditingTemplate(null);
		setArtistName(""); setArtistEmail(""); setCreatedInvitation(null); setLinkCopied(false);
	};
	const handleOpenChange = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

	// Template CRUD
	const handleDuplicate = (tpl: RequestTemplate) => {
		const newTpl: RequestTemplate = { ...tpl, id: `tpl-custom-${_tplId++}`, name: `${tpl.name} (Copy)`, questions: tpl.questions.map((q) => ({ ...q, id: `q-${_tplId++}` })) };
		setTemplates((p) => [...p, newTpl]);
	};
	const handleDelete = (id: string) => setTemplates((p) => p.filter((t) => t.id !== id));
	const handleEditStart = (tpl: RequestTemplate) => { setEditingTemplate(JSON.parse(JSON.stringify(tpl))); setStep("edit_template"); };
	const handleCreateNew = () => { setEditingTemplate({ id: `tpl-custom-${_tplId++}`, name: "New Template", participantType: "dancer", questions: [] }); setStep("edit_template"); };
	const handleSaveTemplate = () => {
		if (!editingTemplate) return;
		setTemplates((prev) => { const idx = prev.findIndex((t) => t.id === editingTemplate.id); if (idx >= 0) { const n = [...prev]; n[idx] = editingTemplate; return n; } return [...prev, editingTemplate]; });
		setStep("select_template"); setEditingTemplate(null);
	};
	const handleSelectAndContinue = (tplId: string) => { setSelectedTemplateId(tplId); setStep("invite_details"); };

	// Question editing
	const addQuestion = () => { if (!editingTemplate) return; setEditingTemplate({ ...editingTemplate, questions: [...editingTemplate.questions, { id: `q-${_tplId++}`, label: "", type: "short_text", required: false }] }); };
	const updateQuestion = (qId: string, u: Partial<TemplateQuestion>) => { if (!editingTemplate) return; setEditingTemplate({ ...editingTemplate, questions: editingTemplate.questions.map((q) => q.id === qId ? { ...q, ...u } : q) }); };
	const removeQuestion = (qId: string) => { if (!editingTemplate) return; setEditingTemplate({ ...editingTemplate, questions: editingTemplate.questions.filter((q) => q.id !== qId) }); };

	// Send invitation → GCS API
	const handleSendInvite = async () => {
		if (!artistName.trim() || !artistEmail.trim() || !selectedTemplate) return;
		const inv = await addInvitation({
			artistName: artistName.trim(), artistEmail: artistEmail.trim(),
			participantType: selectedTemplate.participantType, templateId: selectedTemplate.id,
			templateName: selectedTemplate.name, message: "",
		});
		if (inv) {
			await addArtist({
				id: inv.id, stageName: artistName.trim(), legalName: artistName.trim(), email: artistEmail.trim(),
				role: selectedTemplate.participantType === "dj" ? "dj" : selectedTemplate.participantType === "band" ? "group" : "solo",
				requestTemplate: selectedTemplate.participantType, status: "invited", contractDocStatus: "draft",
				missingItems: ["Profile", "Event questions"], profileStatus: "requested",
				country: "", city: "", nationality: "", phone: "", nearestAirport: "",
				travelPreferences: "", dietaryPreferences: "", hotelRoomPreference: "",
				eventQuestions: [], agreement: { agreedFee: "", paymentMethod: "", arrivalDate: "", departureDate: "", workshopsConfirmed: 0, showsConfirmed: 0, djSets: 0, foodVouchers: false },
				groupMembers: [], travelLogistics: { flights: [], hotelRooms: [] },
			});
			setCreatedInvitation(inv);
			onInvitationCreated(inv);
			setStep("confirmation");
		}
	};

	const handleCopyLink = () => {
		if (!createdInvitation) return;
		const full = `${window.location.origin}${createdInvitation.invitationLink}`;
		navigator.clipboard.writeText(full); setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="bg-white border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="text-lg font-bold text-foreground">
						{step === "select_template" && "Invite Artist — Select Request Template"}
						{step === "edit_template" && (editingTemplate?.id.startsWith("tpl-custom") && !templates.find(t => t.id === editingTemplate?.id) ? "Create Template" : "Edit Template")}
						{step === "invite_details" && "Invite Artist — Artist Details"}
						{step === "confirmation" && "Invitation Created"}
					</DialogTitle>
				</DialogHeader>

				{/* Step indicator */}
				{step !== "edit_template" && (
					<div className="flex items-center gap-2 px-1 pb-2">
						{(["select_template", "invite_details", "confirmation"] as const).map((s, i) => {
							const labels = ["Template", "Details", "Confirmation"];
							const idx = (["select_template", "invite_details", "confirmation"] as const).indexOf(step as any);
							const isActive = i === idx; const isDone = i < idx;
							return (
								<div key={s} className="flex items-center gap-2 flex-1">
									<div className="flex items-center gap-1.5 min-w-0">
										<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDone ? "bg-[hsl(var(--status-confirmed))] text-white" : isActive ? "gradient-brand text-white" : "bg-muted text-muted-foreground"}`}>
											{isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
										</div>
										<span className={`text-xs font-medium truncate ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{labels[i]}</span>
									</div>
									{i < 2 && <div className={`h-0.5 flex-1 rounded-full ${isDone ? "bg-[hsl(var(--status-confirmed))]" : "bg-border"}`} />}
								</div>
							);
						})}
					</div>
				)}

				<div className="flex-1 overflow-y-auto pr-1">
					{/* ═══ STEP 1: SELECT TEMPLATE ═══ */}
					{step === "select_template" && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">Choose a request template for the participant type you're inviting. Each template sends role-specific questions.</p>
							<div className="grid grid-cols-2 gap-3">
								{templates.map((tpl) => {
									const Icon = participantIcons[tpl.participantType];
									return (
										<div key={tpl.id} className="group relative border border-border rounded-xl p-4 hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30 transition-all cursor-pointer bg-white" onClick={() => handleSelectAndContinue(tpl.id)}>
											<div className="flex items-start gap-3">
												<div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-white" /></div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-semibold text-foreground truncate">{tpl.name}</p>
													<p className="text-xs text-muted-foreground mt-0.5">{tpl.questions.length} questions · {tpl.questions.filter((q) => q.required).length} required</p>
												</div>
											</div>
											{/* Hover action buttons */}
											<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleEditStart(tpl); }}><Edit className="w-3.5 h-3.5 text-muted-foreground" /></button>
												<button className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl); }}><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
												{(tpl.id.startsWith("tpl-custom")) && <button className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>}
											</div>
										</div>
									);
								})}
							</div>
							<button onClick={handleCreateNew} className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors bg-white"><Plus className="w-4 h-4" /> Create Custom Template</button>
						</div>
					)}

					{/* ═══ STEP: EDIT / CREATE TEMPLATE ═══ */}
					{step === "edit_template" && editingTemplate && (
						<div className="space-y-5">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Template Name</label>
									<input value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="e.g. Dancer / Instructor" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-foreground" />
								</div>
								<div className="space-y-1.5">
									<label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Participant Type</label>
									<select value={editingTemplate.participantType} onChange={(e) => setEditingTemplate({ ...editingTemplate, participantType: e.target.value as RequestTemplateType })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-foreground">
										{Object.entries(requestTemplateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
									</select>
								</div>
							</div>

							<div className="h-px bg-border" />

							<div className="space-y-3">
								<div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-foreground">Questions</h4><Badge variant="outline" className="text-xs">{editingTemplate.questions.length} total</Badge></div>
								{editingTemplate.questions.map((q, idx) => (
									<div key={q.id} className="border border-border rounded-lg p-3 space-y-2.5 bg-white">
										<div className="flex items-center gap-2">
											<GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
											<span className="text-xs font-medium text-muted-foreground w-5">{idx + 1}.</span>
											<input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} placeholder="Question text..." className="flex-1 h-8 px-2 text-sm border border-border rounded-md bg-white text-foreground" />
											<button className="h-7 w-7 rounded-md hover:bg-destructive/10 flex items-center justify-center shrink-0" onClick={() => removeQuestion(q.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
										</div>
										<div className="flex items-center gap-3 pl-11">
											<select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })} className="h-8 w-40 text-xs border border-border rounded-md px-2 bg-white text-foreground">
												{Object.entries(questionTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
											</select>
											<label className="flex items-center gap-1.5 cursor-pointer">
												<input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="w-3.5 h-3.5 accent-primary" />
												<span className="text-xs text-muted-foreground">Required</span>
											</label>
										</div>
									</div>
								))}
								<button onClick={addQuestion} className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 bg-white"><Plus className="w-3.5 h-3.5" /> Add Question</button>
							</div>

							<div className="flex gap-2 pt-2">
								<button onClick={() => { setStep("select_template"); setEditingTemplate(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Back</button>
								<button onClick={handleSaveTemplate} className="flex-1 py-2 gradient-brand text-white rounded-lg text-sm font-medium shadow-brand border-0"><Check className="w-4 h-4 inline mr-1.5" /> Save Template</button>
							</div>
						</div>
					)}

					{/* ═══ STEP 2: INVITE DETAILS ═══ */}
					{step === "invite_details" && selectedTemplate && (
						<div className="space-y-5">
							{/* Selected template */}
							<div className="flex items-center gap-3 p-3 rounded-lg gradient-brand-soft border border-border">
								{(() => { const Icon = participantIcons[selectedTemplate.participantType]; return <Icon className="w-5 h-5 text-primary" />; })()}
								<div><p className="text-sm font-semibold text-foreground">{selectedTemplate.name}</p><p className="text-xs text-muted-foreground">{selectedTemplate.questions.length} questions will be sent</p></div>
								<button onClick={() => setStep("select_template")} className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted">Change</button>
							</div>

							{/* Artist fields */}
							<div className="space-y-4">
								<div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Artist / Act Name</label><input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="e.g. Maria & Carlos" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-foreground" /></div>
								<div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Email Address</label><input type="email" value={artistEmail} onChange={(e) => setArtistEmail(e.target.value)} placeholder="artist@email.com" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-foreground" /></div>
							</div>

							<div className="h-px bg-border" />

							{/* Unique link info */}
							<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
								<div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-foreground">Unique Invitation Link</h4></div>
								<p className="text-xs text-muted-foreground">Click <strong className="text-foreground">"Create Invitation & Send"</strong> below to generate the unique shareable link for this artist. You'll be able to copy and share it on the next screen.</p>
							</div>

							{/* Questions Preview */}
							<div className="space-y-2">
								<h4 className="text-sm font-semibold text-foreground">Questions Preview</h4>
								<p className="text-xs text-muted-foreground">The artist will receive these questions via FameLink:</p>
								<div className="space-y-1.5 mt-2">
									{selectedTemplate.questions.map((q, i) => (
										<div key={q.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
											<span className="text-xs text-muted-foreground w-5 shrink-0 pt-0.5">{i + 1}.</span>
											<div className="flex-1 min-w-0">
												<p className="text-sm text-foreground">{q.label || "(empty)"}</p>
												<div className="flex items-center gap-2 mt-0.5">
													<Badge variant="outline" className="text-[10px] px-1.5 py-0">{questionTypeLabels[q.type]}</Badge>
													{q.required && <span className="text-[10px] text-red-500 font-medium">Required</span>}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Actions */}
							<div className="flex gap-2 pt-2">
								<button onClick={() => setStep("select_template")} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Back</button>
								<button onClick={handleSendInvite} disabled={!artistName.trim() || !artistEmail.trim()} className="flex-1 py-2 gradient-brand text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-brand border-0"><Send className="w-4 h-4 inline mr-1.5" /> Create Invitation & Send</button>
							</div>
						</div>
					)}

					{/* ═══ STEP 3: CONFIRMATION ═══ */}
					{step === "confirmation" && createdInvitation && (
						<div className="space-y-6 py-4">
							<div className="text-center space-y-2">
								<div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-white" /></div>
								<h3 className="text-lg font-bold text-foreground">Invitation Sent!</h3>
								<p className="text-sm text-muted-foreground">A unique invitation has been created for <span className="font-semibold text-foreground">{createdInvitation.artistName}</span></p>
							</div>

							<div className="rounded-xl border border-border bg-white p-5 space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div><p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Artist</p><p className="text-sm font-semibold text-foreground">{createdInvitation.artistName}</p></div>
									<div><p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Email</p><p className="text-sm text-foreground">{createdInvitation.artistEmail}</p></div>
									<div><p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Template</p><p className="text-sm text-foreground">{createdInvitation.templateName}</p></div>
									<div><p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Status</p><Badge variant="outline" className="text-xs bg-[hsl(var(--status-invited))]/15 text-[hsl(var(--status-invited))]">Invited</Badge></div>
								</div>

								<div className="h-px bg-border" />

								<div className="space-y-2">
									<div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-foreground">Unique Invitation Link</p></div>
									<div className="flex items-center gap-2">
										<div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono text-foreground truncate border border-border">{typeof window !== "undefined" ? window.location.origin : ""}{createdInvitation.invitationLink}</div>
										<button onClick={handleCopyLink} className="shrink-0 p-2 border border-border rounded-lg hover:bg-muted">{linkCopied ? <Check className="w-4 h-4 text-[hsl(var(--status-confirmed))]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}</button>
									</div>
									<p className="text-xs text-muted-foreground">This link is unique to this artist. Their responses will be tracked individually.</p>
								</div>

								<div className="h-px bg-border" />

								<button onClick={() => window.open(createdInvitation.invitationLink, "_blank")} className="w-full flex items-center justify-center gap-1.5 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted bg-white"><ExternalLink className="w-3.5 h-3.5" /> Preview Artist View</button>
							</div>

							<div className="flex gap-2">
								<button onClick={() => handleOpenChange(false)} className="flex-1 py-2 bg-white border border-border rounded-lg text-sm font-medium">Close</button>
								<button onClick={() => { setArtistName(""); setArtistEmail(""); setCreatedInvitation(null); setLinkCopied(false); setStep("select_template"); }} className="flex-1 py-2 gradient-brand text-white rounded-lg text-sm font-medium shadow-brand border-0"><Plus className="w-4 h-4 inline mr-1.5" /> Invite Another Artist</button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
