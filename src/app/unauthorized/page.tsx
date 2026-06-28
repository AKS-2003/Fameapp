"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { FameLogo } from "@/components/ui/fame-logo";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export default function UnauthorizedPage() {
	const router = useRouter();

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center px-4">
			<Card className="w-full max-w-md bg-purple-800/50 border-purple-600">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<FameLogo width={60} height={60} />
					</div>
					<CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
						Access Denied
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center space-y-6">
					<div className="flex justify-center">
						<Shield className="h-16 w-16 text-red-400" />
					</div>
					<div className="space-y-2">
						<p className="text-gray-300">
							You don't have permission to access this page.
						</p>
						<p className="text-sm text-gray-500">
							Please contact your administrator if you believe
							this is an error.
						</p>
					</div>
					<div className="space-y-3">
						<Button
							onClick={() => router.back()}
							variant="outline"
							className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</Button>
						<Button
							onClick={() => router.push("/")}
							className="w-full bg-purple-600 hover:bg-purple-700"
						>
							Return to Home
						</Button>
					</div>
				</CardContent>
			</Card>
			<div className="mt-12 pb-8">
				<FantasiaFooter variant="dark" />
			</div>
		</div>
	);
}
