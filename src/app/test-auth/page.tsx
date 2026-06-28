import { requireAuth } from "@/lib/route-protection";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function TestAuthPage() {
	try {
		const session = await requireAuth({ requiredRole: "artist" });

		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-lg p-8 text-center">
					<h1 className="text-2xl font-bold text-white mb-4">
						Authentication Test Page
					</h1>
					<div className="space-y-3">
						<p className="text-gray-300">
							You have successfully accessed this protected page!
						</p>
						<div className="bg-white/5 rounded-lg p-4">
							<p className="text-sm text-gray-400">
								Email:{" "}
								<span className="text-white">
									{session.email}
								</span>
							</p>
							<p className="text-sm text-gray-400">
								Role:{" "}
								<span className="text-white capitalize">
									{session.role.replace("_", " ")}
								</span>
							</p>
							<p className="text-sm text-gray-400">
								Status:{" "}
								<span className="text-white capitalize">
									{session.status}
								</span>
							</p>
							{session.eventId && (
								<p className="text-sm text-gray-400">
									Event ID:{" "}
									<span className="text-white">
										{session.eventId}
									</span>
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	} catch (error) {
		// This will be caught by the middleware, but just in case
		redirect("/login");
	}
}
