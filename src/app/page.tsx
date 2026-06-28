"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";
import { motion } from "framer-motion";

// ─── Floating Sparkle Dots ───
function SparkleField() {
	const dots = Array.from({ length: 30 }, (_, i) => ({
		id: i,
		left: Math.random() * 100,
		top: Math.random() * 100,
		delay: Math.random() * 5,
		duration: 2 + Math.random() * 3,
		size: 1 + Math.random() * 2,
	}));

	return (
		<div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
			{dots.map((d) => (
				<motion.div
					key={d.id}
					className="absolute rounded-full bg-white"
					style={{
						left: `${d.left}%`,
						top: `${d.top}%`,
						width: d.size,
						height: d.size,
					}}
					animate={{
						opacity: [0, 0.8, 0],
						scale: [0.5, 1.2, 0.5],
					}}
					transition={{
						duration: d.duration,
						delay: d.delay,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}

// ─── Main Page ───
export default function WelcomePage() {
	const router = useRouter();
	const [checkingSession, setCheckingSession] = useState(true);

	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch("/api/auth/me");
				if (response.ok) {
					const result = await response.json();
					if (result.success && result.data) {
						const { role, userId } = result.data;
						// Only auto-redirect artists to their specific portfolio.
						// Stage Managers and Super Admins can stay on the landing page if they want.
						if (role === "artist") {
							router.push(`/famelink/${userId}`);
							return;
						}
					}
				}
			} catch {
				console.log("No active session found");
			} finally {
				setCheckingSession(false);
			}
		};
		checkSession();
	}, [router]);

	if (checkingSession) {
		return (
			<div className="h-screen bg-[#06000f] text-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4" />
					<p className="text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#06000f] text-white overflow-x-hidden relative">
			{/* Background Image */}
			<div
				className="absolute inset-0 z-0"
				style={{
					backgroundImage: "url('/background.png')",
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			/>
			{/* Dark overlay for readability */}
			<div className="absolute inset-0 z-0 bg-black/40" />

			{/* Deep background glow */}
			<div className="absolute inset-0 z-0">
				<div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[150px]" />
				<div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] bg-pink-900/15 rounded-full blur-[150px]" />
				<div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] bg-indigo-900/10 rounded-full blur-[120px]" />
			</div>

			{/* Sparkle field */}
			<SparkleField />

			{/* Content */}
			<div className="relative z-10 min-h-screen flex items-center justify-center px-6 lg:px-20 py-12 pb-24">
				<div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
					{/* ── LEFT: Branding ── */}
					<div className="flex flex-col items-center lg:items-start text-center lg:text-left">
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, ease: "easeOut" }}
						>
							<FameLinkLogo width={90} height={90} />
						</motion.div>

						<motion.h1
							className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]"
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.15 }}
						>
							Welcome to
							<br />
							<span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
								FAMELINK
							</span>
							<br />
							for Artists
						</motion.h1>

						<motion.p
							className="mt-5 text-base sm:text-lg text-gray-400 max-w-md leading-relaxed"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.35 }}
						>
							The modern platform where artists build their
							portfolio, connect with stage managers, and get
							booked for events.
						</motion.p>

						{/* Tagline pills */}
						<motion.div
							className="mt-6 flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-purple-300/70 font-medium"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.5 }}
						>
							<span>Create</span>
							<span className="w-1 h-1 rounded-full bg-pink-400/60" />
							<span>Share</span>
							<span className="w-1 h-1 rounded-full bg-pink-400/60" />
							<span>Perform</span>
						</motion.div>

						{/* Sign in link */}
						<motion.p
							className="mt-8 text-sm text-gray-500"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.6 }}
						>
							Already have an account?{" "}
							<Link
								href="/famelink-auth"
								className="text-purple-300 hover:text-pink-300 underline underline-offset-4 transition-colors"
							>
								Sign in
							</Link>
						</motion.p>
						<motion.div
							className="mt-8 w-full max-w-[320px]"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.7 }}
						>
							<div className="space-y-3">
								<Link href="/famelink-auth" className="block">
									<Button className="w-full py-5 text-base font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-[0.98]">
										Get Started
										<svg
											className="ml-2 w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M17 8l4 4m0 0l-4 4m4-4H3"
											/>
										</svg>
									</Button>
								</Link>
								
							</div>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="absolute bottom-0 left-0 right-0 z-10 px-6 lg:px-20 py-4">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}
