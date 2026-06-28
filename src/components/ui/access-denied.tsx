"use client";

import { Shield, ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";

interface AccessDeniedProps {
	isLoading?: boolean;
	pageName?: string;
	eventId?: string;
}

export function AccessDenied({ isLoading, pageName, eventId }: AccessDeniedProps) {
	const router = useRouter();
	const params = useParams();
	const resolvedEventId = eventId || (params?.eventId as string);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4" />
					<p className="text-gray-400 text-sm">Checking access...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4">
			<Card className="bg-gray-800/60 border-gray-700 max-w-md w-full">
				<CardContent className="p-8 text-center space-y-4">
					<div className="mx-auto w-16 h-16 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
						<Shield className="h-8 w-8 text-red-400" />
					</div>
					<h2 className="text-xl font-bold text-white">Access Denied</h2>
					<p className="text-gray-400 text-sm">
						You don&apos;t have permission to view {pageName || "this page"}.
						Please contact the event stage manager to request access.
					</p>
					<div className="flex flex-col gap-2">
						{resolvedEventId && (
							<Button
								className="bg-purple-600 hover:bg-purple-700 text-white"
								onClick={() => router.push(`/stage-manager/events/${resolvedEventId}/access-hub`)}
							>
								<LayoutGrid className="h-4 w-4 mr-2" />
								Go to Your Pages
							</Button>
						)}
						<Button
							variant="outline"
							className="border-gray-600 text-gray-300 hover:bg-gray-700"
							onClick={() => router.back()}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export function AccessGuardWrapper({
	hasAccess,
	isLoading,
	pageName,
	eventId,
	children,
}: AccessDeniedProps & { hasAccess: boolean; children: React.ReactNode }) {
	if (isLoading || !hasAccess) {
		return <AccessDenied isLoading={isLoading} pageName={pageName} eventId={eventId} />;
	}
	return <>{children}</>;
}

