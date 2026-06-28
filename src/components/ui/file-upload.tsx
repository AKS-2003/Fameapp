"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, File, Image, Music, FileText, X } from "lucide-react";

interface FileUploadProps {
	category: "image" | "audio" | "document";
	eventId?: string;
	onUploadSuccess?: (file: any) => void;
	onUploadError?: (error: string) => void;
	maxFiles?: number;
	className?: string;
}

export function FileUpload({
	category,
	eventId,
	onUploadSuccess,
	onUploadError,
	maxFiles = 5,
	className = "",
}: FileUploadProps) {
	const [uploading, setUploading] = useState(false);
	const [dragActive, setDragActive] = useState(false);
	const [error, setError] = useState("");
	const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const getAcceptedTypes = () => {
		switch (category) {
			case "image":
				return "image/jpeg,image/png,image/webp,image/gif";
			case "audio":
				return "audio/mpeg,audio/wav,audio/mp3,audio/ogg";
			case "document":
				return "application/pdf,text/plain,application/msword";
			default:
				return "";
		}
	};

	const getMaxSize = () => {
		switch (category) {
			case "image":
				return 10 * 1024 * 1024; // 10MB
			case "audio":
				return 50 * 1024 * 1024; // 50MB
			case "document":
				return 10 * 1024 * 1024; // 10MB
			default:
				return 10 * 1024 * 1024;
		}
	};

	const validateFile = (file: File): string | null => {
		const maxSize = getMaxSize();
		const acceptedTypes = getAcceptedTypes().split(",");

		if (file.size > maxSize) {
			return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
		}

		if (!acceptedTypes.includes(file.type)) {
			return `File type ${file.type} is not allowed for ${category} uploads`;
		}

		return null;
	};

	const uploadFile = async (file: File) => {
		const validationError = validateFile(file);
		if (validationError) {
			setError(validationError);
			onUploadError?.(validationError);
			return;
		}

		setUploading(true);
		setError("");

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("category", category);
			if (eventId) {
				formData.append("eventId", eventId);
			}

			const response = await fetch("/api/files/upload", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (data.success) {
				const newFile = data.data.file;
				setUploadedFiles((prev) => [...prev, newFile]);
				onUploadSuccess?.(newFile);
			} else {
				const errorMessage = data.error?.message || "Upload failed";
				setError(errorMessage);
				onUploadError?.(errorMessage);
			}
		} catch (error) {
			const errorMessage = "Network error occurred during upload";
			setError(errorMessage);
			onUploadError?.(errorMessage);
		} finally {
			setUploading(false);
		}
	};

	const handleFileSelect = (files: FileList | null) => {
		if (!files) return;

		const fileArray = Array.from(files);

		if (uploadedFiles.length + fileArray.length > maxFiles) {
			setError(`Maximum ${maxFiles} files allowed`);
			return;
		}

		fileArray.forEach(uploadFile);
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileSelect(e.dataTransfer.files);
		}
	};

	const removeFile = (fileId: string) => {
		setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
	};

	const getIcon = () => {
		switch (category) {
			case "image":
				return <Image className="h-8 w-8" />;
			case "audio":
				return <Music className="h-8 w-8" />;
			case "document":
				return <FileText className="h-8 w-8" />;
			default:
				return <File className="h-8 w-8" />;
		}
	};

	return (
		<div className={className}>
			<Card
				className={`border-2 border-dashed transition-colors ${
					dragActive
						? "border-purple-500 bg-purple-50"
						: "border-gray-300 hover:border-gray-400"
				}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
			>
				<CardContent className="flex flex-col items-center justify-center p-6 text-center">
					<div className="text-gray-400 mb-4">{getIcon()}</div>

					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-2">
							Upload {category} files
						</h3>
						<p className="text-sm text-gray-600 mb-2">
							Drag and drop files here, or click to select
						</p>
						<p className="text-xs text-gray-500">
							Max size: {getMaxSize() / (1024 * 1024)}MB - Max
							files: {maxFiles}
						</p>
					</div>

					<Button
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading || uploadedFiles.length >= maxFiles}
						className="mb-4"
					>
						{uploading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Uploading...
							</>
						) : (
							<>
								<Upload className="mr-2 h-4 w-4" />
								Select Files
							</>
						)}
					</Button>

					<input
						ref={fileInputRef}
						type="file"
						accept={getAcceptedTypes()}
						multiple
						onChange={(e) => handleFileSelect(e.target.files)}
						className="hidden"
					/>
				</CardContent>
			</Card>

			{error && (
				<Alert variant="destructive" className="mt-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{uploadedFiles.length > 0 && (
				<div className="mt-4 space-y-2">
					<h4 className="font-medium">Uploaded Files:</h4>
					{uploadedFiles.map((file) => (
						<div
							key={file.id}
							className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
						>
							<div className="flex items-center space-x-2">
								{getIcon()}
								<div>
									<p className="text-sm font-medium">
										{file.originalName}
									</p>
									<p className="text-xs text-gray-500">
										{(file.size / 1024).toFixed(1)} KB
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => removeFile(file.id)}
								className="text-red-500 hover:text-red-700"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
