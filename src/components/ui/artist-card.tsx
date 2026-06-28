"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer } from "@/components/ui/video-player";
import {
	CheckCircle,
	XCircle,
	Clock,
	Eye,
	Mail,
	Phone,
	Music,
	Palette,
	MapPin,
	Settings,
	Download,
	ExternalLink,
	Instagram,
	Facebook,
	Youtube,
} from "lucide-react";
import { downloadFile } from "@/lib/media-utils";

interface Artist {
	id: string;
	eventId: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	costumeColor: string;
	customCostumeColor: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition: string;
	equipment: string;
	showLink: string;
	socialMedia: {
		instagram: string;
		facebook: string;
		youtube: string;
		tiktok: string;
		website: string;
	};
	mcNotes: string;
	stageManagerNotes: string;
	notes: string;
	eventName: string;
	musicTracks: Array<{
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
		file_path: string;
		uploadedAt: string;
		fileSize: number;
		contentType: string;
	}>;
	musicTrack?: any;
	galleryFiles: Array<{
		url: string;
		file_url: string;
		file_path: string;
		type: string;
		name: string;
		size: number;
		uploadedAt: string;
		contentType: string;
	}>;
	rehearsalVideo?: {
		url: string;
		file_path: string;
		name: string;
		size?: number;
		contentType?: string;
	};
	status: "pending" | "approved" | "rejected";
	createdAt: string;
	updatedAt: string;
	// Nationality fields
	countryLiving?: string;
	homeCountry?: string;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
}

interface ArtistCardProps {
	artist: Artist;
	onStatusUpdate: (artistId: string, status: "approved" | "rejected") => void;
	onViewDetails: (artist: Artist) => void;
}

export function ArtistCard({
	artist,
	onStatusUpdate,
	onViewDetails,
}: ArtistCardProps) {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "approved":
				return "bg-green-100 text-green-800";
			case "rejected":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "pending":
				return <Clock className="h-4 w-4" />;
			case "approved":
				return <CheckCircle className="h-4 w-4" />;
			case "rejected":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	const formatDuration = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	const musicTracksList = artist.musicTracks && artist.musicTracks.length > 0
		? artist.musicTracks
		: artist.musicTrack
			? Array.isArray(artist.musicTrack)
				? artist.musicTrack.map((track: any) => ({
						song_title: track.song_title || artist.artistName || "Main Track",
						duration: track.duration || artist.performanceDuration || 0,
						notes: track.notes || "",
						is_main_track: true,
						tempo: track.tempo || "",
						file_url: track.file_url || track.url || "",
						file_path: track.file_path || "",
						uploadedAt: track.uploadedAt || "",
						fileSize: track.fileSize || 0,
						contentType: track.contentType || "audio/mpeg",
				  }))
				: [
						{
							song_title: artist.musicTrack.song_title || artist.artistName || "Main Track",
							duration: artist.musicTrack.duration || artist.performanceDuration || 0,
							notes: artist.musicTrack.notes || "",
							is_main_track: true,
							tempo: artist.musicTrack.tempo || "",
							file_url: artist.musicTrack.file_url || artist.musicTrack.url || "",
							file_path: artist.musicTrack.file_path || "",
							uploadedAt: artist.musicTrack.uploadedAt || "",
							fileSize: artist.musicTrack.fileSize || 0,
							contentType: artist.musicTrack.contentType || "audio/mpeg",
						},
				  ]
			: [];

	return (
		<Card className="h-full hover:shadow-lg transition-all duration-300 bg-white">
			<CardHeader className="pb-3">
				<div className="flex justify-between items-start">
					<div className="flex-1">
						<CardTitle className="text-lg font-bold text-gray-900 mb-1">
							{artist.artistName}
						</CardTitle>
						<CardDescription className="text-sm text-gray-600">
							{artist.realName}
						</CardDescription>
						<div className="flex items-center mt-2 space-x-2">
							<Badge variant="outline" className="text-xs">
								{artist.style}
							</Badge>
							<Badge variant="outline" className="text-xs">
								{formatDuration(artist.performanceDuration)}
							</Badge>
						</div>
					</div>
					<Badge className={getStatusColor(artist.status)}>
						{getStatusIcon(artist.status)}
						<span className="ml-1 capitalize">{artist.status}</span>
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Contact Info */}
				<div className="space-y-2">
					<div className="flex items-center text-sm text-gray-600">
						<Mail className="h-4 w-4 mr-2 text-blue-600" />
						<a
							href={`mailto:${artist.email}`}
							className="truncate text-blue-600 hover:underline"
						>
							{artist.email}
						</a>
					</div>
					<div className="flex items-center text-sm text-gray-600">
						<svg
							className="h-4 w-4 mr-2 text-green-600"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
						</svg>
						<a
							href={`https://wa.me/${artist.phone?.replace(
								/[\s\-\(\)\+]/g,
								""
							)}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-green-600 hover:underline"
						>
							{artist.phone}
						</a>
					</div>
				</div>

				{/* Performance Info */}
				<div className="space-y-2">
					<div className="flex items-center text-sm text-gray-600">
						<Music className="h-4 w-4 mr-2" />
						<span>{artist.performanceType}</span>
					</div>
					{musicTracksList && musicTracksList.length > 0 && (
						<div className="text-sm text-gray-600">
							<span className="font-medium">
								{musicTracksList.length}
							</span>{" "}
							music tracks
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col space-y-2 pt-2">
					<Dialog
						open={isDetailsOpen}
						onOpenChange={setIsDetailsOpen}
					>
						<DialogTrigger asChild>
							<Button variant="outline" className="w-full">
								<Eye className="h-4 w-4 mr-2" />
								View Details
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle className="text-xl font-bold">
									{artist.artistName} - {artist.realName}
								</DialogTitle>
								<DialogDescription>
									Complete artist registration details
								</DialogDescription>
							</DialogHeader>

							<Tabs defaultValue="basic" className="w-full">
								<TabsList className="grid w-full grid-cols-5">
									<TabsTrigger value="basic">
										Basic Info
									</TabsTrigger>
									<TabsTrigger value="performance">
										Performance
									</TabsTrigger>
									<TabsTrigger value="technical">
										Technical
									</TabsTrigger>
									<TabsTrigger value="media">
										Media
									</TabsTrigger>
									<TabsTrigger value="notes">
										Notes
									</TabsTrigger>
								</TabsList>

								<TabsContent
									value="basic"
									className="space-y-4"
								>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-gray-700">
												Artist Name
											</label>
											<p className="text-gray-900">
												{artist.artistName}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Real Name
											</label>
											<p className="text-gray-900">
												{artist.realName}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Email
											</label>
											<a
												href={`mailto:${artist.email}`}
												className="text-blue-600 hover:underline block"
											>
												{artist.email}
											</a>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												WhatsApp Number
											</label>
											<a
												href={`https://wa.me/${artist.phone?.replace(
													/[\s\-\(\)\+]/g,
													""
												)}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-green-600 hover:underline block"
											>
												{artist.phone}
											</a>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Style
											</label>
											<p className="text-gray-900">
												{artist.style}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Performance Type
											</label>
											<p className="text-gray-900">
												{artist.performanceType}
											</p>
										</div>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											Biography
										</label>
										{/* Living in country info */}
										{artist.countryLiving && (
											<p className="text-gray-600 text-sm mt-1 flex items-center gap-1">
												<MapPin className="h-4 w-4" />
												Living in {artist.countryLiving}
											</p>
										)}
										<p className="text-gray-900 mt-1">
											{artist.biography}
										</p>
									</div>
									{/* Social Media */}
									<div>
										<label className="text-sm font-medium text-gray-700 mb-2 block">
											Social Media
										</label>
										<div className="flex flex-wrap gap-2">
											{artist.socialMedia?.instagram && (
												<a
													href={
														artist.socialMedia
															.instagram
													}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm hover:bg-pink-200"
												>
													<Instagram className="h-3 w-3 mr-1" />
													Instagram
												</a>
											)}
											{artist.socialMedia?.facebook && (
												<a
													href={
														artist.socialMedia
															.facebook
													}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
												>
													<Facebook className="h-3 w-3 mr-1" />
													Facebook
												</a>
											)}
											{artist.socialMedia?.youtube && (
												<a
													href={
														artist.socialMedia
															.youtube
													}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200"
												>
													<Youtube className="h-3 w-3 mr-1" />
													YouTube
												</a>
											)}
											{artist.socialMedia?.website && (
												<a
													href={
														artist.socialMedia
															.website
													}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200"
												>
													<ExternalLink className="h-3 w-3 mr-1" />
													Website
												</a>
											)}
										</div>
									</div>
								</TabsContent>

								<TabsContent
									value="performance"
									className="space-y-4"
								>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-gray-700">
												Duration
											</label>
											<p className="text-gray-900">
												{formatDuration(
													artist.performanceDuration
												)}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Show Link
											</label>
											{artist.showLink ? (
												<a
													href={artist.showLink}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800 flex items-center"
												>
													<ExternalLink className="h-3 w-3 mr-1" />
													View Show
												</a>
											) : (
												<p className="text-gray-500">
													No show link provided
												</p>
											)}
										</div>
									</div>
								</TabsContent>

								<TabsContent
									value="technical"
									className="space-y-4"
								>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-gray-700">
												🎨 Costume Colors
											</label>
											{artist.manualCostumeColor ||
											artist.manualCostumeColorTwo ||
											artist.manualCostumeColorThree ? (
												<div className="space-y-2 mt-2">
													{artist.manualCostumeColor && (
														<div className="flex items-center gap-2">
															<span className="text-xs text-gray-500 w-16">
																Primary:
															</span>
															<div
																className="w-6 h-6 rounded border-2 border-purple-300"
																style={{
																	backgroundColor:
																		artist.manualCostumeColor,
																}}
															></div>
															<span className="text-sm font-mono">
																{
																	artist.manualCostumeColor
																}
															</span>
														</div>
													)}
													{artist.manualCostumeColorTwo && (
														<div className="flex items-center gap-2">
															<span className="text-xs text-gray-500 w-16">
																Secondary:
															</span>
															<div
																className="w-6 h-6 rounded border-2 border-purple-300"
																style={{
																	backgroundColor:
																		artist.manualCostumeColorTwo,
																}}
															></div>
															<span className="text-sm font-mono">
																{
																	artist.manualCostumeColorTwo
																}
															</span>
														</div>
													)}
													{artist.manualCostumeColorThree && (
														<div className="flex items-center gap-2">
															<span className="text-xs text-gray-500 w-16">
																Third:
															</span>
															<div
																className="w-6 h-6 rounded border-2 border-purple-300"
																style={{
																	backgroundColor:
																		artist.manualCostumeColorThree,
																}}
															></div>
															<span className="text-sm font-mono">
																{
																	artist.manualCostumeColorThree
																}
															</span>
														</div>
													)}
												</div>
											) : (
												<p className="text-gray-500 text-sm italic mt-1">
													No costume colors selected
												</p>
											)}
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Stage Position Start
											</label>
											<p className="text-gray-900">
												{artist.stagePositionStart}
											</p>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700">
												Stage Position End
											</label>
											<p className="text-gray-900">
												{artist.stagePositionEnd}
											</p>
										</div>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											💡 Lighting Preferences
										</label>
										{artist.manualLightColor ||
										artist.manualLightColorTwo ||
										artist.manualLightColorThree ? (
											<div className="space-y-2 mt-2">
												{artist.manualLightColor && (
													<div className="flex items-center gap-2">
														<span className="text-xs text-gray-500 w-16">
															Primary:
														</span>
														<div
															className="w-6 h-6 rounded border-2 border-yellow-300"
															style={{
																backgroundColor:
																	artist.manualLightColor,
															}}
														></div>
														<span className="text-sm font-mono">
															{
																artist.manualLightColor
															}
														</span>
													</div>
												)}
												{artist.manualLightColorTwo && (
													<div className="flex items-center gap-2">
														<span className="text-xs text-gray-500 w-16">
															Secondary:
														</span>
														<div
															className="w-6 h-6 rounded border-2 border-yellow-300"
															style={{
																backgroundColor:
																	artist.manualLightColorTwo,
															}}
														></div>
														<span className="text-sm font-mono">
															{
																artist.manualLightColorTwo
															}
														</span>
													</div>
												)}
												{artist.manualLightColorThree && (
													<div className="flex items-center gap-2">
														<span className="text-xs text-gray-500 w-16">
															Third:
														</span>
														<div
															className="w-6 h-6 rounded border-2 border-yellow-300"
															style={{
																backgroundColor:
																	artist.manualLightColorThree,
															}}
														></div>
														<span className="text-sm font-mono">
															{
																artist.manualLightColorThree
															}
														</span>
													</div>
												)}
											</div>
										) : (
											<p className="text-gray-500 text-sm italic mt-1">
												Trust the Lighting Designer ✨
											</p>
										)}
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											Equipment
										</label>
										<p className="text-gray-900 mt-1">
											{artist.equipment}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											Light Requests
										</label>
										<p className="text-gray-900 mt-1">
											{artist.lightRequests}
										</p>
									</div>
								</TabsContent>

								<TabsContent
									value="media"
									className="space-y-4"
								>
									{/* Music Tracks */}
									{musicTracksList &&
										musicTracksList.length > 0 && (
											<div>
												<label className="text-sm font-medium text-gray-700 mb-2 block">
													Music Tracks
												</label>
												<div className="space-y-2">
													{musicTracksList.map(
														(track, index) => (
															<div
																key={index}
																className="p-3 border rounded-lg"
															>
																<div className="flex justify-between items-start mb-2">
																	<div>
																		<h4 className="font-medium">
																			{
																				track.song_title
																			}
																		</h4>
																		<p className="text-sm text-gray-600">
																			{formatDuration(
																				track.duration
																			)}{" "}
																			•{" "}
																			{
																				track.tempo
																			}{" "}
																			tempo
																			{track.is_main_track && (
																				<Badge className="ml-2 bg-purple-100 text-purple-800">
																					Main
																					Track
																				</Badge>
																			)}
																		</p>
																	</div>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			downloadFile(
																				track.file_path || track.file_url || "",
																				track.song_title,
																				artist.artistName || artist.realName
																			)
         }
																	>
																		<Download className="h-3 w-3 mr-1" />
																		Download
																	</Button>
																</div>
																{track.notes && (
																	<p className="text-sm text-gray-600 mb-2">
																		{
																			track.notes
																		}
																	</p>
																)}
																<AudioPlayer
																	src={track.file_path ? `/api/download/${encodeURIComponent(track.file_path)}` : (track.file_url || "")}
																/>
															</div>
														)
													)}
												</div>
											</div>
										)}

									{/* Rehearsal Video */}
									{artist.rehearsalVideo && (
										<div>
											<label className="text-sm font-medium text-gray-700 mb-2 block">
												Rehearsal / Show Video
											</label>
											<div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
												<div className="flex justify-between items-start mb-2">
													<div>
														<h4 className="font-medium text-sm">
															{
																artist
																	.rehearsalVideo
																	.name
															}
														</h4>
														{artist.rehearsalVideo
															.size && (
															<p className="text-xs text-gray-600">
																{(
																	artist
																		.rehearsalVideo
																		.size /
																	1024 /
																	1024
																).toFixed(
																	2
																)}{" "}
																MB
															</p>
														)}
													</div>
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															downloadFile(
																artist.rehearsalVideo!.file_path || (artist.rehearsalVideo as any).file_url || (artist.rehearsalVideo as any).url || "",
																artist.rehearsalVideo!.name,
																artist.artistName || artist.realName
															)
														}
													>
														<Download className="h-3 w-3" />
													</Button>
												</div>
												<VideoPlayer
													src={artist.rehearsalVideo.file_path ? `/api/download/${encodeURIComponent(artist.rehearsalVideo.file_path)}` : ((artist.rehearsalVideo as any).file_url || (artist.rehearsalVideo as any).url || "")}
												/>
											</div>
										</div>
									)}

									{/* Gallery Files */}
									{artist.galleryFiles &&
										artist.galleryFiles.length > 0 && (
											<div>
												<label className="text-sm font-medium text-gray-700 mb-2 block">
													Gallery
												</label>
												<div className="grid grid-cols-2 gap-4">
													{artist.galleryFiles.map(
														(file, index) => (
															<div
																key={index}
																className="border rounded-lg p-3"
															>
																<div className="flex justify-between items-start mb-2">
																	<div>
																		<h4 className="font-medium text-sm">
																			{
																				file.name
																			}
																		</h4>
																		<p className="text-xs text-gray-600">
																			{
																				file.type
																			}{" "}
																			•{" "}
																			{(
																				file.size /
																				1024 /
																				1024
																			).toFixed(
																				2
																			)}{" "}
																			MB
																		</p>
																	</div>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			downloadFile(
																				file.file_path || file.file_url || (file as any).url || "",
																				file.name,
																				artist.artistName || artist.realName
																			)
																		}
																	>
																		<Download className="h-3 w-3" />
																	</Button>
																</div>
																{file.type ===
																"video" ? (
																	<VideoPlayer
																		src={file.file_path ? `/api/download/${encodeURIComponent(file.file_path)}` : (file.file_url || (file as any).url || "")}
																	/>
																) : (
																	<div className="bg-gray-100 rounded p-4 text-center text-sm text-gray-600">
																		{
																			file.type
																		}{" "}
																		file
																	</div>
																)}
															</div>
														)
													)}
												</div>
											</div>
										)}
								</TabsContent>

								<TabsContent
									value="notes"
									className="space-y-4"
								>
									<div>
										<label className="text-sm font-medium text-gray-700">
											MC Notes
										</label>
										<p className="text-gray-900 mt-1">
											{artist.mcNotes ||
												"No MC notes provided"}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											Stage Manager Notes
										</label>
										<p className="text-gray-900 mt-1">
											{artist.stageManagerNotes ||
												"No stage manager notes provided"}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-700">
											General Notes
										</label>
										<p className="text-gray-900 mt-1">
											{artist.notes ||
												"No general notes provided"}
										</p>
									</div>
								</TabsContent>
							</Tabs>
						</DialogContent>
					</Dialog>

					{artist.status === "pending" && (
						<div className="flex space-x-2">
							<Button
								onClick={() =>
									onStatusUpdate(artist.id, "approved")
								}
								className="flex-1 bg-green-600 hover:bg-green-700 text-white"
								size="sm"
							>
								<CheckCircle className="h-4 w-4 mr-1" />
								Approve
							</Button>
							<Button
								onClick={() =>
									onStatusUpdate(artist.id, "rejected")
								}
								variant="destructive"
								className="flex-1"
								size="sm"
							>
								<XCircle className="h-4 w-4 mr-1" />
								Reject
							</Button>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
