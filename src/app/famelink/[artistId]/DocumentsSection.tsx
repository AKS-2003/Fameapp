"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
	Upload,
	FileText,
	Download,
	Pencil,
	Save,
	X,
	Loader2,
	Trash2
} from "lucide-react";

interface DocumentFile {
	id: string;
	name: string;
	category: string; // ID, Tax, Press, etc.
	size: number;
	url: string;
	updatedAt: string;
}

interface ContractDetails {
	legalName: string;
	company: string;
	address: string;
	taxId: string;
	bank: string;
	swift: string;
}

export default function DocumentsSection({ artistId: propArtistId }: { artistId?: string }) {
	const params = useParams();
	const { toast } = useToast();
	const artistId = propArtistId || (params.artistId as string);

	const [loading, setLoading] = useState(true);
	const [files, setFiles] = useState<DocumentFile[]>([]);
	const [contractDetails, setContractDetails] = useState<ContractDetails>({
		legalName: "",
		company: "",
		address: "",
		taxId: "",
		bank: "",
		swift: ""
	});

	const [editingContract, setEditingContract] = useState(false);
	const [isSavingContract, setIsSavingContract] = useState(false);
	const [isUploadingFile, setIsUploadingFile] = useState(false);

	useEffect(() => {
		loadDocuments();
	}, [artistId]);

	const loadDocuments = async () => {
		try {
			const res = await fetch(`/api/artists/${artistId}/documents`);
			const result = await res.json();
			if (result.success && result.data) {
				setFiles(result.data.files || []);
				setContractDetails(result.data.contractDetails || {
					legalName: "",
					company: "",
					address: "",
					taxId: "",
					bank: "",
					swift: ""
				});
			}
		} catch (error) {
			console.error("Failed to load documents:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / (1024 * 1024)).toFixed(1) + " MB";
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "Unknown";
		const d = new Date(dateString);
		return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
	};

	const saveContractDetails = async () => {
		setIsSavingContract(true);
		try {
			const res = await fetch(`/api/artists/${artistId}/documents`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contractDetails })
			});
			if (!res.ok) throw new Error("Failed to save");
			toast({ title: "Saved", description: "Contract details updated." });
			setEditingContract(false);
		} catch (error) {
			toast({ title: "Error", description: "Could not save details.", variant: "destructive" });
		} finally {
			setIsSavingContract(false);
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploadingFile(true);
		try {
			const fData = new FormData();
			fData.append("file", file);
			fData.append("folder", `famelink/artists/${artistId}/documents`);
			
			const res = await fetch("/api/storage/upload", {
				method: "POST",
				body: fData
			});
			
			const data = await res.json();
			if (data.success) {
				// We determine category naively for now
				let category = "Misc";
				if (file.name.toLowerCase().includes("passport")) category = "ID";
				else if (file.name.toLowerCase().includes("w8") || file.name.toLowerCase().includes("tax")) category = "Tax";
				else if (file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/)) category = "Press";

				const newFile: DocumentFile = {
					id: `f-${Date.now()}`,
					name: file.name,
					size: file.size,
					url: data.url,
					category,
					updatedAt: new Date().toISOString()
				};

				const newFiles = [...files, newFile];
				
				const patchRes = await fetch(`/api/artists/${artistId}/documents`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ files: newFiles })
				});

				if (!patchRes.ok) throw new Error("Failed to save file to DB");
				setFiles(newFiles);
				toast({ title: "Uploaded", description: "Document uploaded successfully." });
			} else {
				throw new Error(data.error || "Failed to upload");
			}
		} catch (error) {
			toast({ title: "Upload Failed", description: "An error occurred during upload.", variant: "destructive" });
		} finally {
			setIsUploadingFile(false);
			if (e.target) e.target.value = '';
		}
	};

	const deleteFile = async (id: string) => {
		const newFiles = files.filter(f => f.id !== id);
		try {
			const res = await fetch(`/api/artists/${artistId}/documents`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ files: newFiles })
			});
			if (!res.ok) throw new Error("Failed to delete");
			setFiles(newFiles);
			toast({ title: "Deleted", description: "File has been removed." });
		} catch (error) {
			toast({ title: "Error", description: "Could not delete file.", variant: "destructive" });
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-10">
				<Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
			</div>
		);
	}

	return (
		<div className="w-full text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
			<div className="relative z-10 max-w-5xl mx-auto py-2">
				
				{/* ── Header ──────────────────────────────────────────── */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
							<FileText className="h-6 w-6 text-purple-400" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white leading-tight">My Documents</h1>
							<p className="text-purple-300/60 text-sm mt-0.5">Your reusable files & saved agreement details.</p>
						</div>
					</div>

					<div className="shrink-0">
						<input
							type="file"
							id="docUpload"
							className="hidden"
							onChange={handleFileUpload}
						/>
						<label
							htmlFor="docUpload"
							className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 text-sm font-medium text-white transition-colors hover:bg-fuchsia-700 cursor-pointer shadow-lg shadow-fuchsia-500/20 ${isUploadingFile ? 'opacity-50 pointer-events-none' : ''}`}
						>
							{isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
							Upload
						</label>
					</div>
				</div>

				{/* ── Files List ──────────────────────────────────────── */}
				<div className="rounded-2xl border border-purple-500/20 bg-white/5 backdrop-blur-xl mb-12 overflow-hidden">
					{files.length === 0 ? (
						<div className="p-8 text-center text-purple-300/50 text-sm">
							No documents uploaded yet.
						</div>
					) : (
						<div className="flex flex-col">
							{files.map((file, index) => (
								<div 
									key={file.id} 
									className={`flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors ${index !== files.length - 1 ? 'border-b border-purple-500/10' : ''}`}
								>
									<div className="flex items-center gap-4 min-w-0">
										<div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
											<FileText className="h-5 w-5 text-pink-400" />
										</div>
										<div className="min-w-0">
											<h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
											<p className="text-xs text-purple-300/50 mt-0.5 truncate">
												{file.category} · {formatSize(file.size)} · Updated {formatDate(file.updatedAt)}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0 ml-4">
										<Button
											variant="ghost"
											onClick={() => window.open(file.url, '_blank')}
											className="h-8 text-sm text-purple-200 hover:text-white hover:bg-white/10 gap-1.5 px-3 rounded-lg hidden sm:flex"
										>
											<Download className="h-4 w-4" />
											Download
										</Button>
										<Button
											variant="ghost"
											onClick={() => window.open(file.url, '_blank')}
											className="h-8 w-8 p-0 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg sm:hidden"
										>
											<Download className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											onClick={() => deleteFile(file.id)}
											className="h-8 w-8 p-0 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* ── Saved Contract Details ──────────────────────────── */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-bold text-white">Saved Agreement Details</h2>
							<p className="text-purple-300/50 text-sm mt-1">Used to prefill your information in event agreements sent by organizers.</p>
						</div>
						{!editingContract && (
							<Button
								variant="ghost"
								onClick={() => setEditingContract(true)}
								className="text-purple-300/70 hover:text-white hover:bg-white/10 rounded-xl gap-2"
							>
								<Pencil className="h-4 w-4" />
								Edit
							</Button>
						)}
					</div>

					<div className="rounded-2xl border border-purple-500/20 bg-white/5 backdrop-blur-xl p-6">
						{!editingContract ? (
							<div className="flex flex-col gap-4">
								<DetailRow label="Legal Name" value={contractDetails.legalName} />
								<div className="h-px bg-purple-500/10 w-full" />
								<DetailRow label="Company" value={contractDetails.company} />
								<div className="h-px bg-purple-500/10 w-full" />
								<DetailRow label="Address" value={contractDetails.address} />
								<div className="h-px bg-purple-500/10 w-full" />
								<DetailRow label="Tax Id" value={contractDetails.taxId} />
								<div className="h-px bg-purple-500/10 w-full" />
								<DetailRow label="Bank" value={contractDetails.bank} />
								<div className="h-px bg-purple-500/10 w-full" />
								<DetailRow label="Swift" value={contractDetails.swift} />
							</div>
						) : (
							<div className="flex flex-col gap-5">
								<FormField label="Legal Name" value={contractDetails.legalName} onChange={(v) => setContractDetails(p => ({ ...p, legalName: v }))} />
								<FormField label="Company" value={contractDetails.company} onChange={(v) => setContractDetails(p => ({ ...p, company: v }))} />
								<FormField label="Address" value={contractDetails.address} onChange={(v) => setContractDetails(p => ({ ...p, address: v }))} />
								<FormField label="Tax Id" value={contractDetails.taxId} onChange={(v) => setContractDetails(p => ({ ...p, taxId: v }))} />
								<FormField label="Bank" value={contractDetails.bank} onChange={(v) => setContractDetails(p => ({ ...p, bank: v }))} />
								<FormField label="Swift" value={contractDetails.swift} onChange={(v) => setContractDetails(p => ({ ...p, swift: v }))} />
								
								<div className="flex items-center gap-3 mt-2">
									<Button
										onClick={saveContractDetails}
										disabled={isSavingContract}
										className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl gap-2 shadow-lg shadow-fuchsia-500/20 transition-all duration-300"
									>
										{isSavingContract ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
										Save Details
									</Button>
									<Button
										variant="ghost"
										onClick={() => {
											setEditingContract(false);
											loadDocuments(); // Reset to what's in DB
										}}
										className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl gap-2"
									>
										<X className="h-4 w-4" />
										Cancel
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
			<span className="text-purple-300/50 text-sm sm:w-48 shrink-0">{label}</span>
			<span className="text-white text-sm font-medium break-words">{value || "—"}</span>
		</div>
	);
}

function FormField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
			<Label className="text-purple-300/50 text-sm sm:w-48 shrink-0">
				{label}
			</Label>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="bg-white/5 border-purple-500/20 text-white placeholder:text-purple-300/30 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500 flex-1"
			/>
		</div>
	);
}
