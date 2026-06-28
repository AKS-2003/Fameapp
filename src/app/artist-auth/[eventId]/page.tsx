"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ArtistAuthRedirect() {
	const params = useParams();
	const router = useRouter();
	const eventId = params.eventId as string;

	useEffect(() => {
		// Redirect to the artist registration page
		if (eventId) {
			router.replace(`/artist-register/${eventId}`);
		}
	}, [eventId, router]);

	// Show a loading state while redirecting
	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
				<p className="text-gray-600">
					Redirecting to artist registration...
				</p>
			</div>
		</div>
	);
}
