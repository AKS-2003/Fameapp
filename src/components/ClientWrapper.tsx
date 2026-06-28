"use client";

import { useEffect, useState } from "react";

interface ClientWrapperProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

export default function ClientWrapper({
	children,
	fallback,
}: ClientWrapperProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			fallback || (
				<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-300 mx-auto mb-4"></div>
						<p className="text-purple-200">Loading...</p>
					</div>
				</div>
			)
		);
	}

	return <>{children}</>;
}
