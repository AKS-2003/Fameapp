"use client";

import { Button } from "@/components/ui/button";
import { FameLinkLogo } from "@/components/ui/famelink-logo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function ArtistSplashPage() {
	const router = useRouter();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);

		// Check if there's login data (coming from successful registration)
		const loginDataStr = sessionStorage.getItem("artistLoginData");
		if (loginDataStr) {
			try {
				const loginData = JSON.parse(loginDataStr);
				// Clear the login data
				sessionStorage.removeItem("artistLoginData");
				// Show splash for 2 seconds then redirect to login with data
				setTimeout(() => {
					const params = new URLSearchParams(loginData);
					router.push(`/famelink-auth?${params.toString()}`);
				}, 2000);
			} catch (error) {
				console.error("Failed to parse login data:", error);
			}
		}
	}, [router]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white overflow-hidden">
			{/* Animated Background */}
			<div className="absolute inset-0">
				<div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
				<div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-float" />
				<div
					className="absolute bottom-20 right-20 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-float"
					style={{ animationDelay: "1s" }}
				/>
				<div
					className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl animate-float"
					style={{ animationDelay: "2s" }}
				/>
			</div>

			{/* Hero Section */}
			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
				<div
					className={`mb-8 ${
						mounted ? "animate-scale-in" : "opacity-0"
					}`}
				>
					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-30 animate-glow" />
						<FameLinkLogo
							width={200}
							height={200}
							className="relative z-10 drop-shadow-2xl hover-lift"
						/>
					</div>
				</div>

				<h1
					className={`text-5xl sm:text-6xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg ${
						mounted
							? "animate-fade-in-up animate-stagger-1"
							: "opacity-0"
					}`}
					style={{
						textShadow:
							"0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(236, 72, 153, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)",
					}}
				>
					Join as Artist
				</h1>

				<p
					className={`text-xl sm:text-2xl md:text-3xl mb-12 max-w-4xl px-4 font-medium leading-relaxed text-purple-200 ${
						mounted
							? "animate-fade-in-up animate-stagger-2"
							: "opacity-0"
					}`}
					style={{
						textShadow:
							"0 2px 10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(165, 180, 252, 0.6), 0 0 40px rgba(165, 180, 252, 0.3)",
					}}
				>
					Showcase Your Talent on the Ultimate Event Platform
				</p>
				<Button
					size="lg"
					className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl px-10 py-6 rounded-full shadow-2xl border-0 font-semibold tracking-wide hover-lift hover-glow transition-all duration-300"
					onClick={() => router.push("/famelink-auth")}
				>
					Join As Artist
				</Button>
				<div
					className={`mt-12 ${
						mounted
							? "animate-fade-in-up animate-stagger-4"
							: "opacity-0"
					}`}
				>
					<p
						className="text-lg mb-4 font-medium text-cyan-300"
						style={{
							textShadow:
								"0 2px 8px rgba(0, 0, 0, 0.8), 0 0 15px rgba(103, 232, 249, 0.6), 0 0 30px rgba(103, 232, 249, 0.3)",
						}}
					>
						Already have an account?
					</p>
					<div className="flex flex-col gap-4 items-center">
						<button
							onClick={() => router.push("/famelink-auth")}
							className="text-xl font-semibold underline decoration-2 underline-offset-4 transition-all duration-300 hover-glow text-yellow-300"
							style={{
								textShadow:
									"0 0 15px rgba(253, 224, 71, 0.8), 0 0 30px rgba(253, 224, 71, 0.5), 0 0 45px rgba(253, 224, 71, 0.3)",
							}}
						>
							Sign in
						</button>
					</div>
				</div>
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="dark" />
				</div>

				{/* Enhanced Floating particles */}
				{mounted &&
					[...Array(20)].map((_, i) => (
						<div
							key={i}
							className="absolute w-2 h-2 bg-white/20 rounded-full animate-particle-float"
							style={{
								left: `${Math.random() * 100}%`,
								top: `${Math.random() * 100}%`,
								animationDelay: `${Math.random() * 4}s`,
								animationDuration: `${3 + Math.random() * 2}s`,
							}}
						/>
					))}
			</div>
		</div>
	);
}
