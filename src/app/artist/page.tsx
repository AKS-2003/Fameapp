"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Upload,
	Music,
	User,
	Calendar,
	Clock,
	Star,
	LogOut,
	AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

type ArtistProfile = {
	id?: string;
	stageName: string;
	style: string;
	music: string[];
	props: string;
	notes: string;
	biography: string;
	pictures: string[];
	rehearsalDate?: string;
	rehearsalTime?: string;
	qualityRating?: 1 | 2 | 3;
	performanceOrder?: number;
	specialNotes?: string;
};

type EmergencyActive = {
	code: "red" | "blue" | "green";
	message: string;
} | null;

export default function ArtistDashboard() {
	const [user, setUser] = useState<any>(null);
	const [eventId, setEventId] = useState<string | null>(null);
	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [emergency, setEmergency] = useState<EmergencyActive>(null);
	const [newSong, setNewSong] = useState("");

	useEffect(() => {
		// Try to get user from localStorage or session
		const storedUser = localStorage.getItem("artistSession");
		if (storedUser) {
			const userData = JSON.parse(storedUser);
			setUser(userData);
			setEventId(userData.eventId);
		}
	}, []);

	useEffect(() => {
		if (!user || !eventId) return;
		(async () => {
			const [artistsRes, emergRes] = await Promise.all([
				fetch(`/api/events/${eventId}/artists`, { cache: "no-store" }),
				fetch(`/api/events/${eventId}/emergency?active=1`, {
					cache: "no-store",
				}),
			]);
			if (artistsRes.ok) {
				const artists = await artistsRes.json();
				const mine =
					artists.find((a: any) => a.email === user.email) ||
					artists.find((a: any) => a.name === user.name) ||
					artists[0];
				setProfile({
					id: mine.id,
					stageName: mine.stageName,
					style: mine.style,
					music: mine.music,
					props: mine.props,
					notes: mine.notes,
					biography: mine.biography,
					pictures: mine.pictures,
					rehearsalDate: mine.rehearsalDate,
					rehearsalTime: mine.rehearsalTime,
					qualityRating: mine.qualityRating,
					performanceOrder: mine.performanceOrder,
					specialNotes: mine.specialNotes,
				});
			}
			if (emergRes.ok) {
				const act = await emergRes.json();
				setEmergency(
					act ? { code: act.code, message: act.message } : null,
				);
			}
		})();
	}, [user, eventId]);

	const patch = async (updates: Partial<ArtistProfile>) => {
		if (!profile?.id) return;
		await fetch(`/api/events/${eventId}/artists/${profile.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updates),
		});
	};

	const updateProfileField = (field: keyof ArtistProfile, value: any) => {
		if (!profile) return;
		const updated = { ...profile, [field]: value };
		setProfile(updated);
		patch({ [field]: value } as any);
	};

	const addSong = () => {
		if (!profile || !newSong.trim()) return;
		const updated = {
			...profile,
			music: [...(profile.music || []), newSong.trim()],
		};
		setProfile(updated);
		setNewSong("");
		patch({ music: updated.music });
	};

	const removeSong = (song: string) => {
		if (!profile) return;
		const updated = {
			...profile,
			music: (profile.music || []).filter((s) => s !== song),
		};
		setProfile(updated);
		patch({ music: updated.music });
	};

	const logout = () => {
		localStorage.removeItem("artistSession");
		window.location.href = "/famelink-auth";
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Image
								src="/fame-logo.png"
								alt="FAME Logo"
								width={40}
								height={40}
								className="mr-3"
							/>
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									Artist Dashboard
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} - {profile?.stageName}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							{emergency && (
								<Badge className="bg-red-500 text-white">
									<AlertTriangle className="h-3 w-3 mr-1" />
									{emergency.code.toUpperCase()}:{" "}
									{emergency.message}
								</Badge>
							)}
							<Button variant="outline" onClick={logout}>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</Button>
						</div>
					</div>
				</div>
			</header>

			{!profile ? (
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<Card>
						<CardHeader>
							<CardTitle>Loading Profile...</CardTitle>
							<CardDescription>
								Please wait while we load your artist
								information
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			) : (
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<Tabs defaultValue="profile" className="space-y-6">
						<TabsList>
							<TabsTrigger value="profile">
								<User className="h-4 w-4 mr-1" />
								Profile
							</TabsTrigger>
							<TabsTrigger value="music">
								<Music className="h-4 w-4 mr-1" />
								Music
							</TabsTrigger>
							<TabsTrigger value="schedule">
								<Calendar className="h-4 w-4 mr-1" />
								Schedule
							</TabsTrigger>
							<TabsTrigger value="status">
								<Star className="h-4 w-4 mr-1" />
								Status
							</TabsTrigger>
						</TabsList>

						<TabsContent value="profile">
							<Card>
								<CardHeader>
									<CardTitle>Artist Profile</CardTitle>
									<CardDescription>
										Update your stage info and biography
									</CardDescription>
								</CardHeader>
								<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label>Stage Name</Label>
										<Input
											value={profile.stageName}
											onChange={(e) =>
												updateProfileField(
													"stageName",
													e.target.value,
												)
											}
										/>
									</div>
									<div className="space-y-2">
										<Label>Style/Genre</Label>
										<Input
											value={profile.style}
											onChange={(e) =>
												updateProfileField(
													"style",
													e.target.value,
												)
											}
										/>
									</div>
									<div className="space-y-2 md:col-span-2">
										<Label>Props/Setup Requirements</Label>
										<Textarea
											value={profile.props}
											onChange={(e) =>
												updateProfileField(
													"props",
													e.target.value,
												)
											}
										/>
									</div>
									<div className="space-y-2 md:col-span-2">
										<Label>Notes to Stage Manager</Label>
										<Textarea
											value={profile.notes}
											onChange={(e) =>
												updateProfileField(
													"notes",
													e.target.value,
												)
											}
										/>
									</div>
									<div className="space-y-2 md:col-span-2">
										<Label>Biography</Label>
										<Textarea
											value={profile.biography}
											onChange={(e) =>
												updateProfileField(
													"biography",
													e.target.value,
												)
											}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="music">
							<Card>
								<CardHeader>
									<CardTitle>Music List</CardTitle>
									<CardDescription>
										Manage your performance tracks
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex space-x-2">
										<Input
											placeholder="Add a new song"
											value={newSong}
											onChange={(e) =>
												setNewSong(e.target.value)
											}
										/>
										<Button onClick={addSong}>Add</Button>
									</div>
									<ul className="space-y-2">
										{(profile.music || []).map((song) => (
											<li
												key={song}
												className="flex items-center justify-between bg-white border rounded px-3 py-2"
											>
												<span>{song}</span>
												<div className="space-x-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															removeSong(song)
														}
													>
														Remove
													</Button>
												</div>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="schedule">
							<Card>
								<CardHeader>
									<CardTitle>Schedule</CardTitle>
									<CardDescription>
										Your rehearsal and performance times
									</CardDescription>
								</CardHeader>
								<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<Label>Rehearsal Date</Label>
										<div className="flex items-center mt-1">
											<Calendar className="h-4 w-4 mr-2" />
											<span>
												{profile.rehearsalDate || "TBD"}
											</span>
										</div>
									</div>
									<div>
										<Label>Rehearsal Time</Label>
										<div className="flex items-center mt-1">
											<Clock className="h-4 w-4 mr-2" />
											<span>
												{profile.rehearsalTime || "TBD"}
											</span>
										</div>
									</div>
									<div className="md:col-span-2">
										<Label>Special Notes</Label>
										<Textarea
											value={profile.specialNotes || ""}
											onChange={(e) =>
												updateProfileField(
													"specialNotes",
													e.target.value,
												)
											}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="status">
							<Card>
								<CardHeader>
									<CardTitle>Show Status</CardTitle>
									<CardDescription>
										Your current status and order
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-col md:flex-row gap-6">
									<div className="flex-1 space-y-2">
										<Label>Quality Rating</Label>
										{profile.qualityRating ? (
											<Badge
												className={
													profile.qualityRating === 1
														? "bg-green-100 text-green-800"
														: profile.qualityRating ===
															  2
															? "bg-yellow-100 text-yellow-800"
															: "bg-red-100 text-red-800"
												}
											>
												{profile.qualityRating === 1
													? "Great Show"
													: profile.qualityRating ===
														  2
														? "Medium"
														: "Needs Improvement"}
											</Badge>
										) : (
											<span className="text-sm text-gray-500">
												Not rated yet
											</span>
										)}
									</div>
									<div className="flex-1 space-y-2">
										<Label>Performance Order</Label>
										<div className="text-lg font-semibold">
											#{profile.performanceOrder || "TBD"}
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
					<div className="mt-12 pb-8">
						<FantasiaFooter variant="light" />
					</div>
				</div>
			)}
		</div>
	);
}
