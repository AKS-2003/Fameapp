import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export const dynamic = "force-dynamic";
export default async function AccountSuspendedPage() {
	const session = await getSession();

	// Redirect if not logged in or not suspended
	if (!session) {
		redirect("/login");
	}

	if (session.status !== "suspended") {
		redirect("/");
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-lg p-8 text-center">
				<div className="mb-6">
					<div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							className="w-8 h-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">
						Account Suspended
					</h1>
					<p className="text-gray-300">
						Your account has been temporarily suspended.
					</p>
				</div>

				<div className="bg-white/5 rounded-lg p-4 mb-6">
					<h2 className="text-lg font-semibold text-white mb-2">
						Why was my account suspended?
					</h2>
					<p className="text-sm text-gray-300 mb-4">
						Account suspensions typically occur due to:
					</p>
					<ul className="text-sm text-gray-300 space-y-1 text-left">
						<li>- Violation of platform terms of service</li>
						<li>- Inappropriate behavior or content</li>
						<li>- Security concerns</li>
						<li>- Administrative review</li>
					</ul>
				</div>

				<div className="bg-white/5 rounded-lg p-4 mb-6">
					<h2 className="text-lg font-semibold text-white mb-2">
						What can I do?
					</h2>
					<p className="text-sm text-gray-300">
						Please contact support to discuss your account status
						and potential reinstatement.
					</p>
				</div>

				<div className="space-y-3">
					<p className="text-sm text-gray-400">
						Logged in as:{" "}
						<span className="text-white">{session.email}</span>
					</p>
					<p className="text-sm text-gray-400">
						Role:{" "}
						<span className="text-white capitalize">
							{session.role.replace("_", " ")}
						</span>
					</p>
				</div>

				<div className="mt-6 pt-6 border-t border-white/20 space-y-3">
					<a
						href="mailto:support@fame-system.com"
						className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
					>
						Contact Support
					</a>
					<a
						href="/logout"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						Sign out
					</a>
				</div>
				<div className="mt-12 pb-8">
					<FantasiaFooter variant="dark" />
				</div>
			</div>
		</div>
	);
}
