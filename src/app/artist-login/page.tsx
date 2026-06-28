"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ArtistLoginRedirectContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const params = searchParams.toString();
		router.replace(`/famelink-auth${params ? `?${params}` : ""}`);
	}, [router, searchParams]);

	return (
		<div className="min-h-screen bg-black flex items-center justify-center text-white">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
				<p className="text-lg font-medium text-purple-300">Redirecting to modern login portal...</p>
			</div>
		</div>
	);
}

export default function ArtistLoginRedirect() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-black flex items-center justify-center text-white">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
			</div>
		}>
			<ArtistLoginRedirectContent />
		</Suspense>
	);
}
