import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import LayoutClientFeatures from "@/components/LayoutClientFeatures";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "FAME - Event Management Platform",
	description:
		"Your Ultimate Event Management Platform for Stage Managers and Artists",
	icons: {
		icon: "/fame-logo.png",
		shortcut: "/fame-logo.png",
		apple: "/fame-logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
			>
				<ErrorBoundary>{children}</ErrorBoundary>
				<LayoutClientFeatures />
			</body>
		</html>
	);
}
