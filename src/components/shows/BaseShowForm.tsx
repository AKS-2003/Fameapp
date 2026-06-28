"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	BaseShow,
	TechRider,
	MusicRequirements,
	StageVisualRequirements,
	AdditionalInfo,
	MusicTrack,
	SocialLink,
	SocialPlatform,
} from "@/types/famelink";
import { MediaFile } from "@/types";

interface BaseShowFormProps {
	show?: BaseShow;
	onSave: (show: Partial<BaseShow>) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
}

const defaultTechRider: TechRider = {
	stageRequirements: "",
	soundRequirements: "",
	lightingRequirements: "",
	specialEquipment: [],
	backlineNeeds: [],
};

const defaultMusic: MusicRequirements = {
	tracks: [],
	genres: [],
	specialNotes: "",
};

const defaultStageVisual: StageVisualRequirements = {
	performancePhotos: [],
	videos: [],
	logoUrl: "",
	visualNotes: "",
};

export function BaseShowForm({
	show,
	onSave,
	onCancel,
	isLoading,
}: BaseShowFormProps) {
	const [activeTab, setActiveTab] = useState("basics");
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Form state
	const [name, setName] = useState(show?.name || "");
	const [description, setDescription] = useState(show?.description || "");
	const [style, setStyle] = useState(show?.style || "");
	const [duration, setDuration] = useState(show?.duration || 30);
	const [isPublic, setIsPublic] = useState(show?.isPublic ?? true);

	// Tech Rider
	const [techRider, setTechRider] = useState<TechRider>(
		show?.techRider || defaultTechRider,
	);
	const [newEquipment, setNewEquipment] = useState("");
	const [newBackline, setNewBackline] = useState("");

	// Music
	const [music, setMusic] = useState<MusicRequirements>(
		show?.music || defaultMusic,
	);
	const [newGenre, setNewGenre] = useState("");

	// Stage Visual
	const [stageVisual, setStageVisual] = useState<StageVisualRequirements>(
		show?.stageVisual || defaultStageVisual,
	);

	// Additional Info
	const [additionalInfo, setAdditionalInfo] = useState<AdditionalInfo>(
		show?.additionalInfo || {},
	);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) newErrors.name = "Show name is required";
		if (!description.trim())
			newErrors.description = "Description is required";
		if (!style.trim()) newErrors.style = "Style is required";
		if (duration <= 0) newErrors.duration = "Duration must be positive";

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;

		const showData: Partial<BaseShow> = {
			name: name.trim(),
			description: description.trim(),
			style: style.trim(),
			duration,
			isPublic,
			techRider,
			music,
			stageVisual,
			additionalInfo:
				Object.keys(additionalInfo).length > 0
					? additionalInfo
					: undefined,
		};

		await onSave(showData);
	};

	const addEquipment = () => {
		if (newEquipment.trim()) {
			setTechRider({
				...techRider,
				specialEquipment: [
					...techRider.specialEquipment,
					newEquipment.trim(),
				],
			});
			setNewEquipment("");
		}
	};

	const removeEquipment = (index: number) => {
		setTechRider({
			...techRider,
			specialEquipment: techRider.specialEquipment.filter(
				(_, i) => i !== index,
			),
		});
	};

	const addBackline = () => {
		if (newBackline.trim()) {
			setTechRider({
				...techRider,
				backlineNeeds: [...techRider.backlineNeeds, newBackline.trim()],
			});
			setNewBackline("");
		}
	};

	const removeBackline = (index: number) => {
		setTechRider({
			...techRider,
			backlineNeeds: techRider.backlineNeeds.filter(
				(_, i) => i !== index,
			),
		});
	};

	const addGenre = () => {
		if (newGenre.trim() && !music.genres.includes(newGenre.trim())) {
			setMusic({
				...music,
				genres: [...music.genres, newGenre.trim()],
			});
			setNewGenre("");
		}
	};

	const removeGenre = (index: number) => {
		setMusic({
			...music,
			genres: music.genres.filter((_, i) => i !== index),
		});
	};

	return (
		<div className="space-y-6">
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="basics">Basics</TabsTrigger>
					<TabsTrigger value="music">Music</TabsTrigger>
					<TabsTrigger value="technical">Technical</TabsTrigger>
					<TabsTrigger value="visual">Stage Visual</TabsTrigger>
					<TabsTrigger value="additional">Additional</TabsTrigger>
				</TabsList>

				{/* Basics Tab */}
				<TabsContent value="basics">
					<Card>
						<CardHeader>
							<CardTitle>Basic Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="name">Show Name *</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Enter show name"
								/>
								{errors.name && (
									<p className="text-sm text-red-500 mt-1">
										{errors.name}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="description">
									Description *
								</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) =>
										setDescription(e.target.value)
									}
									placeholder="Describe your show"
									rows={4}
								/>
								{errors.description && (
									<p className="text-sm text-red-500 mt-1">
										{errors.description}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="style">
									Performance Style *
								</Label>
								<Input
									id="style"
									value={style}
									onChange={(e) => setStyle(e.target.value)}
									placeholder="e.g., DJ Set, Live Band, Solo Performance"
								/>
								{errors.style && (
									<p className="text-sm text-red-500 mt-1">
										{errors.style}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="duration">
									Duration (minutes) *
								</Label>
								<Input
									id="duration"
									type="number"
									value={duration}
									onChange={(e) =>
										setDuration(
											parseInt(e.target.value) || 0,
										)
									}
									min={1}
									max={480}
								/>
								{errors.duration && (
									<p className="text-sm text-red-500 mt-1">
										{errors.duration}
									</p>
								)}
							</div>

							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="isPublic"
									checked={isPublic}
									onChange={(e) =>
										setIsPublic(e.target.checked)
									}
									className="h-4 w-4"
								/>
								<Label htmlFor="isPublic">
									Make this show publicly visible
								</Label>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Music Tab */}
				<TabsContent value="music">
					<Card>
						<CardHeader>
							<CardTitle>Music Requirements</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label>Genres</Label>
								<div className="flex gap-2 mt-1">
									<Input
										value={newGenre}
										onChange={(e) =>
											setNewGenre(e.target.value)
										}
										placeholder="Add genre"
										onKeyDown={(e) =>
											e.key === "Enter" &&
											(e.preventDefault(), addGenre())
										}
									/>
									<Button
										type="button"
										onClick={addGenre}
										variant="outline"
									>
										Add
									</Button>
								</div>
								<div className="flex flex-wrap gap-2 mt-2">
									{music.genres.map((genre, i) => (
										<span
											key={i}
											className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center gap-1"
										>
											{genre}
											<button
												onClick={() => removeGenre(i)}
												className="text-red-500 hover:text-red-700"
											>
												×
											</button>
										</span>
									))}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="bpmMin">
										BPM Range (Min)
									</Label>
									<Input
										id="bpmMin"
										type="number"
										value={music.bpmRange?.min || ""}
										onChange={(e) =>
											setMusic({
												...music,
												bpmRange: {
													min:
														parseInt(
															e.target.value,
														) || 0,
													max:
														music.bpmRange?.max ||
														200,
												},
											})
										}
										placeholder="60"
									/>
								</div>
								<div>
									<Label htmlFor="bpmMax">
										BPM Range (Max)
									</Label>
									<Input
										id="bpmMax"
										type="number"
										value={music.bpmRange?.max || ""}
										onChange={(e) =>
											setMusic({
												...music,
												bpmRange: {
													min:
														music.bpmRange?.min ||
														60,
													max:
														parseInt(
															e.target.value,
														) || 200,
												},
											})
										}
										placeholder="200"
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="musicNotes">
									Special Notes
								</Label>
								<Textarea
									id="musicNotes"
									value={music.specialNotes || ""}
									onChange={(e) =>
										setMusic({
											...music,
											specialNotes: e.target.value,
										})
									}
									placeholder="Any special notes about music requirements"
									rows={3}
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Technical Tab */}
				<TabsContent value="technical">
					<Card>
						<CardHeader>
							<CardTitle>Technical Rider</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="stageReq">
									Stage Requirements
								</Label>
								<Textarea
									id="stageReq"
									value={techRider.stageRequirements}
									onChange={(e) =>
										setTechRider({
											...techRider,
											stageRequirements: e.target.value,
										})
									}
									placeholder="Describe stage setup requirements"
									rows={3}
								/>
							</div>

							<div>
								<Label htmlFor="soundReq">
									Sound Requirements
								</Label>
								<Textarea
									id="soundReq"
									value={techRider.soundRequirements}
									onChange={(e) =>
										setTechRider({
											...techRider,
											soundRequirements: e.target.value,
										})
									}
									placeholder="Describe sound system requirements"
									rows={3}
								/>
							</div>

							<div>
								<Label htmlFor="lightReq">
									Lighting Requirements
								</Label>
								<Textarea
									id="lightReq"
									value={techRider.lightingRequirements}
									onChange={(e) =>
										setTechRider({
											...techRider,
											lightingRequirements:
												e.target.value,
										})
									}
									placeholder="Describe lighting requirements"
									rows={3}
								/>
							</div>

							<div>
								<Label>Special Equipment</Label>
								<div className="flex gap-2 mt-1">
									<Input
										value={newEquipment}
										onChange={(e) =>
											setNewEquipment(e.target.value)
										}
										placeholder="Add equipment"
										onKeyDown={(e) =>
											e.key === "Enter" &&
											(e.preventDefault(), addEquipment())
										}
									/>
									<Button
										type="button"
										onClick={addEquipment}
										variant="outline"
									>
										Add
									</Button>
								</div>
								<div className="flex flex-wrap gap-2 mt-2">
									{techRider.specialEquipment.map(
										(item, i) => (
											<span
												key={i}
												className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center gap-1"
											>
												{item}
												<button
													onClick={() =>
														removeEquipment(i)
													}
													className="text-red-500 hover:text-red-700"
												>
													×
												</button>
											</span>
										),
									)}
								</div>
							</div>

							<div>
								<Label>Backline Needs</Label>
								<div className="flex gap-2 mt-1">
									<Input
										value={newBackline}
										onChange={(e) =>
											setNewBackline(e.target.value)
										}
										placeholder="Add backline item"
										onKeyDown={(e) =>
											e.key === "Enter" &&
											(e.preventDefault(), addBackline())
										}
									/>
									<Button
										type="button"
										onClick={addBackline}
										variant="outline"
									>
										Add
									</Button>
								</div>
								<div className="flex flex-wrap gap-2 mt-2">
									{techRider.backlineNeeds.map((item, i) => (
										<span
											key={i}
											className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center gap-1"
										>
											{item}
											<button
												onClick={() =>
													removeBackline(i)
												}
												className="text-red-500 hover:text-red-700"
											>
												×
											</button>
										</span>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Stage Visual Tab */}
				<TabsContent value="visual">
					<Card>
						<CardHeader>
							<CardTitle>Stage Visual</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="logoUrl">Logo URL</Label>
								<Input
									id="logoUrl"
									value={stageVisual.logoUrl || ""}
									onChange={(e) =>
										setStageVisual({
											...stageVisual,
											logoUrl: e.target.value,
										})
									}
									placeholder="https://example.com/logo.png"
								/>
							</div>

							<div>
								<Label htmlFor="visualNotes">
									Visual Notes
								</Label>
								<Textarea
									id="visualNotes"
									value={stageVisual.visualNotes || ""}
									onChange={(e) =>
										setStageVisual({
											...stageVisual,
											visualNotes: e.target.value,
										})
									}
									placeholder="Describe visual requirements and preferences"
									rows={4}
								/>
							</div>

							<p className="text-sm text-gray-500">
								Photo and video uploads can be managed after
								creating the show.
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Additional Info Tab */}
				<TabsContent value="additional">
					<Card>
						<CardHeader>
							<CardTitle>Additional Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="biography">Biography</Label>
								<Textarea
									id="biography"
									value={additionalInfo.biography || ""}
									onChange={(e) =>
										setAdditionalInfo({
											...additionalInfo,
											biography: e.target.value,
										})
									}
									placeholder="Tell us about yourself"
									rows={4}
								/>
							</div>

							<div>
								<Label htmlFor="specialRequests">
									Special Requests
								</Label>
								<Textarea
									id="specialRequests"
									value={additionalInfo.specialRequests || ""}
									onChange={(e) =>
										setAdditionalInfo({
											...additionalInfo,
											specialRequests: e.target.value,
										})
									}
									placeholder="Any special requests or requirements"
									rows={3}
								/>
							</div>

							<p className="text-sm text-gray-500">
								Social links and press kit can be added after
								creating the show.
							</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Form Actions */}
			<div className="flex justify-end gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={isLoading}>
					{isLoading
						? "Saving..."
						: show
							? "Update Show"
							: "Create Show"}
				</Button>
			</div>
		</div>
	);
}
