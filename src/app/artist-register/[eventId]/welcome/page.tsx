"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, Star, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { WhatsAppHelpButton } from "@/components/WhatsAppHelpButton";
import { FAQSection } from "@/components/FAQSection";

interface Event {
	id: string;
	name: string;
	venue: string;
	description?: string;
	show_dates: string[];
	logoUrl?: string;
}

export default function ArtistWelcomePage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [isMuted, setIsMuted] = useState(true);

	useEffect(() => {
		if (eventId) {
			fetchEvent();
		}
	}, [eventId]);

	const handleUnmute = () => {
		setIsMuted(false);
	};

	const fetchEvent = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				setEvent({
					id: evt.id,
					name: evt.name || evt.eventName,
					venue: evt.venue,
					description: evt.description,
					show_dates: evt.show_dates || evt.showDates || [],
					logoUrl: evt.logoUrl,
				});
			} else {
				throw new Error("Event not found");
			}
		} catch (error) {
			console.error("Error fetching event:", error);
			toast({
				title: "❌ Loading Error",
				description: "Failed to load event details. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleProceedToRegistration = () => {
		router.push(`/artist-register/${eventId}?from=welcome`);
	};

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.15, delayChildren: 0.2 },
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 30 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				type: "spring" as const,
				stiffness: 100,
				damping: 12,
			},
		},
	};

	// Pre-defined snowflake positions to avoid hydration mismatch
	const snowflakePositions = [
		{ x: 5, delay: 0.2, duration: 7, size: 10 },
		{ x: 15, delay: 1.5, duration: 9, size: 14 },
		{ x: 25, delay: 0.8, duration: 6, size: 8 },
		{ x: 35, delay: 2.1, duration: 11, size: 12 },
		{ x: 45, delay: 0.5, duration: 8, size: 16 },
		{ x: 55, delay: 3.2, duration: 10, size: 9 },
		{ x: 65, delay: 1.1, duration: 7, size: 11 },
		{ x: 75, delay: 2.8, duration: 12, size: 13 },
		{ x: 85, delay: 0.3, duration: 9, size: 10 },
		{ x: 95, delay: 1.9, duration: 8, size: 15 },
		{ x: 10, delay: 4.1, duration: 11, size: 8 },
		{ x: 20, delay: 3.5, duration: 6, size: 12 },
		{ x: 30, delay: 2.4, duration: 10, size: 14 },
		{ x: 40, delay: 0.9, duration: 7, size: 9 },
		{ x: 50, delay: 3.8, duration: 9, size: 11 },
		{ x: 60, delay: 1.3, duration: 8, size: 16 },
		{ x: 70, delay: 4.5, duration: 12, size: 10 },
		{ x: 80, delay: 2.7, duration: 6, size: 13 },
		{ x: 90, delay: 0.6, duration: 11, size: 8 },
		{ x: 8, delay: 3.1, duration: 9, size: 15 },
	];

	if (loading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					{snowflakePositions.slice(0, 20).map((snow, i) => (
						<motion.div
							key={i}
							className="absolute text-white opacity-60"
							initial={{ y: -20, x: `${snow.x}vw` }}
							animate={{ y: "100vh", rotate: 360 }}
							transition={{
								duration: snow.duration,
								repeat: Infinity,
								delay: snow.delay,
								ease: "linear",
							}}
							style={{ fontSize: `${snow.size}px` }}
						>
							❄
						</motion.div>
					))}
				</div>
				<motion.div
					className="text-center relative z-10"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
				>
					<motion.div
						className="relative mb-6"
						animate={{ y: [0, -15, 0] }}
						transition={{ duration: 1.5, repeat: Infinity }}
					>
						<div className="text-6xl">🎄</div>
						<motion.div
							className="absolute -top-2 left-1/2 transform -translate-x-1/2"
							animate={{
								scale: [1, 1.3, 1],
								opacity: [0.7, 1, 0.7],
							}}
							transition={{ duration: 1, repeat: Infinity }}
						>
							<Star
								className="text-yellow-400"
								size={24}
								fill="currentColor"
							/>
						</motion.div>
					</motion.div>
					<motion.div
						className="w-16 h-16 border-4 border-purple-500/30 rounded-full border-t-purple-500 mx-auto mb-4"
						animate={{ rotate: 360 }}
						transition={{
							duration: 1,
							repeat: Infinity,
							ease: "linear",
						}}
					/>
					<p className="text-gray-300 text-lg font-medium">
						Loading your experience...
					</p>
				</motion.div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black">
				<motion.div
					className="text-center text-white"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className="text-6xl mb-4">🎄</div>
					<h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
					<p className="text-xl text-gray-400">
						The event you&apos;re looking for doesn&apos;t exist.
					</p>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black">
			{/* Animated Background Effects */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute -top-40 -left-40 w-80 h-80 bg-red-500/20 rounded-full blur-[100px]"
					animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
					transition={{ duration: 4, repeat: Infinity }}
				/>
				<motion.div
					className="absolute top-1/3 -right-40 w-96 h-96 bg-green-600/20 rounded-full blur-[120px]"
					animate={{ y: [-30, 30, -30] }}
					transition={{ duration: 8, repeat: Infinity }}
				/>
				<motion.div
					className="absolute -bottom-40 left-1/3 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]"
					animate={{ x: [-20, 20, -20] }}
					transition={{ duration: 10, repeat: Infinity }}
				/>
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
				{/* Falling Snow */}
				{snowflakePositions.map((snow, i) => (
					<motion.div
						key={`snow-${i}`}
						className="absolute text-white"
						initial={{
							y: -20,
							x: `${snow.x}vw`,
							opacity: 0,
						}}
						animate={{
							y: "100vh",
							opacity: [0, 0.6, 0.6, 0],
							rotate: 360,
						}}
						transition={{
							duration: snow.duration,
							repeat: Infinity,
							delay: snow.delay,
							ease: "linear",
						}}
						style={{ fontSize: `${snow.size}px` }}
					>
						❄
					</motion.div>
				))}
			</div>

			{/* Christmas Trees */}
			<motion.div
				className="fixed left-4 bottom-0 z-10 hidden lg:block"
				initial={{ x: -100, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.5 }}
				style={{ transform: "scale(0.5)" }}
			>
				<ChristmasTree />
			</motion.div>
			<motion.div
				className="fixed right-4 bottom-0 z-10 hidden lg:block"
				initial={{ x: 100, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={{ duration: 0.8, delay: 0.7 }}
				style={{ transform: "scale(0.4)" }}
			>
				<ChristmasTree />
			</motion.div>

			{/* Main Content */}
			<motion.div
				className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				<div className="max-w-5xl w-full">
					{/* Logo */}
					<motion.div
						variants={itemVariants}
						className="flex justify-center items-center gap-8 mb-3"
					>
						<motion.div
							className="relative group cursor-pointer"
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.95 }}
						>
							<div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-all duration-500"></div>
							<div className="relative w-20 h-20 overflow-hidden shadow-2xl">
								<img
									src="/fame-logo.png"
									alt="FAME"
									className="w-full h-full object-cover"
								/>
							</div>
						</motion.div>
					</motion.div>

					{/* Event Name */}
					<motion.h1
						variants={itemVariants}
						className="text-4xl sm:text-5xl md:text-6xl font-black text-center mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent tracking-tight"
					>
						{event.name}
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						variants={itemVariants}
						className="text-xl sm:text-2xl md:text-3xl text-center font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6 sm:mb-8"
					>
						Artist Registration
					</motion.p>

					{/* Event Dates */}
					<motion.div
						variants={itemVariants}
						className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-8"
					>
						{event.show_dates?.map((date, index) => (
							<motion.div
								key={index}
								className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gray-900/60 border border-gray-700/50 rounded-xl sm:rounded-2xl backdrop-blur-sm hover:border-purple-500/50 hover:bg-gray-800/60 transition-all duration-300"
								whileHover={{ scale: 1.05, y: -5 }}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 + index * 0.1 }}
							>
								<div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
									<span className="text-lg sm:text-xl">
										📅
									</span>
								</div>
								<div>
									<p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
										Show Date{" "}
										{event.show_dates.length > 1
											? index + 1
											: ""}
									</p>
									<p className="text-white font-semibold text-sm sm:text-base">
										{new Date(date).toLocaleDateString(
											"en-US",
											{
												weekday: "short",
												month: "short",
												day: "numeric",
												year: "numeric",
											}
										)}
									</p>
								</div>
							</motion.div>
						))}
					</motion.div>

					{/* Main Content Grid - Video + Steps */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
						{/* Video Section - LEFT on desktop, FIRST on mobile */}
						<div className="flex flex-col items-center gap-4">
							{/* Watch Tutorial Title */}
							<motion.h2
								variants={itemVariants}
								className="text-xl sm:text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent"
							>
								🎬 WATCH THIS TUTORIAL FIRST
							</motion.h2>

							{/* iPhone Video Frame with YouTube */}
							<motion.div
								variants={itemVariants}
								className="flex items-center justify-center"
								style={{ perspective: "1000px" }}
							>
								<div
									className="relative"
									style={{ transformStyle: "preserve-3d" }}
								>
									{/* iPhone Frame */}
									<div className="relative">
										{/* Phone Outer Frame */}
										<div
											className="relative bg-gradient-to-b from-black via-gray-900 to-black rounded-[2rem] sm:rounded-[3rem] p-1.5 sm:p-2 shadow-2xl"
											style={{
												boxShadow:
													"0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 60px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
											}}
										>
											{/* Phone Inner Bezel */}
											<div className="relative bg-black rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
												{/* Dynamic Island / Notch */}
												<div className="absolute top-2 sm:top-3 left-1/2 transform -translate-x-1/2 z-20">
													<div
														className="w-20 sm:w-28 h-5 sm:h-7 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 backdrop-blur-xl border border-white/10"
														style={{
															background:
																"linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(30,20,50,0.5) 100%)",
															boxShadow:
																"0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)",
														}}
													>
														<div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-gray-800/80"></div>
														<div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-gray-900/60 border border-white/5"></div>
													</div>
												</div>

												{/* YouTube Video Container */}
												<div className="relative w-[220px] h-[440px] sm:w-[260px] sm:h-[520px] md:w-[280px] md:h-[560px] overflow-hidden bg-black">
													<iframe
														className="w-full h-full"
														src={`https://www.youtube.com/embed/Ib_Yyo2TYI0?autoplay=1&mute=${
															isMuted ? 1 : 0
														}&loop=1&playlist=Ib_Yyo2TYI0&controls=1&modestbranding=1&rel=0`}
														title="FameLink Tutorial"
														frameBorder="0"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
														referrerPolicy="strict-origin-when-cross-origin"
														allowFullScreen
													></iframe>

													{/* Tap to Unmute Overlay */}
													{isMuted && (
														<motion.div
															className="absolute inset-0 flex items-center justify-center z-30 cursor-pointer"
															onClick={
																handleUnmute
															}
															initial={{
																opacity: 0,
															}}
															animate={{
																opacity: 1,
															}}
															transition={{
																delay: 1,
															}}
														>
															<motion.div
																className="px-4 py-3 bg-gray-900/90 backdrop-blur-sm rounded-full border border-purple-500/30 flex items-center gap-2 shadow-lg"
																animate={{
																	scale: [
																		1, 1.03,
																		1,
																	],
																}}
																transition={{
																	duration: 2,
																	repeat: Infinity,
																}}
															>
																<Volume2 className="w-5 h-5 text-white" />
																<span className="text-white text-sm font-semibold">
																	Tap to
																	unmute
																</span>
															</motion.div>
														</motion.div>
													)}
												</div>

												{/* Home Indicator */}
												<div className="absolute bottom-1.5 sm:bottom-2 left-1/2 transform -translate-x-1/2">
													<div className="w-24 sm:w-32 h-1 bg-gray-600 rounded-full"></div>
												</div>
											</div>
										</div>

										{/* Phone Reflection */}
										<div className="absolute -bottom-16 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-[90%] h-16 sm:h-20 bg-gradient-to-b from-purple-500/10 to-transparent blur-xl rounded-full"></div>

										{/* Side Buttons */}
										<div className="absolute -left-0.5 sm:-left-1 top-24 sm:top-28 w-0.5 sm:w-1 h-6 sm:h-8 bg-gray-700 rounded-l-sm"></div>
										<div className="absolute -left-0.5 sm:-left-1 top-36 sm:top-44 w-0.5 sm:w-1 h-12 sm:h-16 bg-gray-700 rounded-l-sm"></div>
										<div className="absolute -right-0.5 sm:-right-1 top-28 sm:top-36 w-0.5 sm:w-1 h-10 sm:h-12 bg-gray-700 rounded-r-sm"></div>
									</div>

									{/* Floating Elements */}
									<motion.div
										className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 text-xl sm:text-2xl"
										animate={{
											y: [-5, 5, -5],
											rotate: [0, 10, 0],
										}}
										transition={{
											duration: 3,
											repeat: Infinity,
										}}
									>
										✨
									</motion.div>
									<motion.div
										className="absolute -bottom-1 sm:-bottom-2 -left-4 sm:-left-6 text-xl sm:text-2xl"
										animate={{
											y: [5, -5, 5],
											rotate: [0, -10, 0],
										}}
										transition={{
											duration: 4,
											repeat: Infinity,
										}}
									>
										🎵
									</motion.div>
									<motion.div
										className="absolute top-1/2 -right-6 sm:-right-8 text-lg sm:text-xl"
										animate={{
											x: [-3, 3, -3],
											scale: [1, 1.2, 1],
										}}
										transition={{
											duration: 2.5,
											repeat: Infinity,
										}}
									>
										🎤
									</motion.div>
								</div>
							</motion.div>
						</div>

						{/* Description Card with Steps - RIGHT on desktop, SECOND on mobile */}
						<motion.div
							variants={itemVariants}
							className="bg-gradient-to-br from-gray-900/80 to-gray-800/40 border border-gray-700/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl"
						>
							<motion.p
								className="text-center text-gray-300 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
							>
								Join us for an unforgettable performance
								experience!
							</motion.p>

							{/* 3 Steps */}
							<div className="space-y-3 sm:space-y-4 mb-6">
								{[
									{
										num: 1,
										title: "Complete all Required sections",
										desc: "Fill in your basic information",
									},
									{
										num: 2,
										title: "Fill in optional information",
										desc: "Add extra details if needed",
									},
									{
										num: 3,
										title: "Submit your registration",
										desc: "Review and submit your form",
									},
								].map((step, index) => (
									<motion.div
										key={step.num}
										className="flex items-start gap-3 p-3 sm:p-4 bg-gray-800/50 rounded-xl border border-gray-700/30 hover:border-purple-500/30 transition-colors"
										initial={{ opacity: 0, x: -30 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											delay: 0.6 + index * 0.15,
										}}
										whileHover={{
											x: 5,
											backgroundColor:
												"rgba(139, 92, 246, 0.1)",
										}}
									>
										<motion.div
											className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 text-purple-400 font-bold text-sm sm:text-base"
											whileHover={{
												scale: 1.1,
												rotate: 5,
											}}
										>
											{step.num}
										</motion.div>
										<div>
											<p className="text-white font-semibold text-sm">
												{step.title}
											</p>
											<p className="text-gray-400 text-xs">
												{step.desc}
											</p>
										</div>
									</motion.div>
								))}
							</div>

							{/* Get Started Button */}
							<motion.button
								onClick={handleProceedToRegistration}
								className="w-full group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 text-white font-bold text-base sm:text-lg rounded-xl shadow-2xl shadow-purple-500/30 overflow-hidden"
								whileHover={{ scale: 1.02, y: -2 }}
								whileTap={{ scale: 0.98 }}
							>
								<motion.div
									className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
									animate={{ x: ["-100%", "100%"] }}
									transition={{
										duration: 2,
										repeat: Infinity,
										repeatDelay: 1,
									}}
								/>
								<span className="relative flex items-center justify-center gap-2 sm:gap-3">
									<Sparkles size={20} />
									Get Started
									<motion.span
										animate={{ x: [0, 5, 0] }}
										transition={{
											duration: 1,
											repeat: Infinity,
										}}
									>
										→
									</motion.span>
								</span>
							</motion.button>
						</motion.div>
					</div>

					{/* Footer */}
					<motion.div variants={itemVariants} className="text-center">
						<p className="text-gray-600 text-xs">
							All skill levels welcome • Powered by FAME
						</p>
					</motion.div>

					{/* FAQ Section */}
					<FAQSection />
				</div>
			</motion.div>

			{/* WhatsApp Help Button - Fixed Position */}
			<WhatsAppHelpButton />
		</div>
	);
}

// Christmas Tree Component
function ChristmasTree() {
	return (
		<motion.div
			className="tree-container relative"
			animate={{ rotate: [-1, 1, -1] }}
			transition={{
				duration: 3,
				repeat: Infinity,
				ease: "easeInOut" as const,
			}}
		>
			<motion.div
				className="absolute -top-8 left-1/2 transform -translate-x-1/2"
				animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
				transition={{ duration: 1.5, repeat: Infinity }}
			>
				<Star
					className="text-yellow-300"
					size={40}
					fill="currentColor"
				/>
			</motion.div>

			<svg width="200" height="280" viewBox="0 0 200 280">
				<polygon points="100,10 60,70 140,70" fill="#0f6b0f" />
				<polygon points="100,50 50,120 150,120" fill="#0d5c0d" />
				<polygon points="100,100 40,180 160,180" fill="#0b4d0b" />
				<polygon points="100,150 30,240 170,240" fill="#094009" />
				<rect
					x="85"
					y="240"
					width="30"
					height="40"
					fill="#8b4513"
					rx="3"
				/>
			</svg>

			{[...Array(12)].map((_, i) => (
				<motion.div
					key={i}
					className="absolute w-2 h-2 rounded-full"
					style={{
						left: `${30 + (i % 4) * 10}%`,
						top: `${10 + Math.floor(i / 4) * 25}%`,
						backgroundColor: ["#ff0", "#f0f", "#0ff"][i % 3],
						boxShadow: `0 0 10px ${
							["#ff0", "#f0f", "#0ff"][i % 3]
						}`,
					}}
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{
						duration: 1 + (i % 3) * 0.5,
						repeat: Infinity,
						delay: i * 0.2,
					}}
				/>
			))}
		</motion.div>
	);
}
