import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { FantasiaFooter } from "@/components/ui/fantasia-footer";

export const dynamic = "force-dynamic";
export default async function AccountDeactivatedPage() {
	const session = await getSession();

	// Redirect if not logged in or not deactivated
	if (!session) {
		redirect("/login");
	}

	if (session.status !== "deactivated") {
		redirect("/");
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-lg p-8 text-center">
				<div className="mb-6">
					<div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
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
								d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-white mb-2">
						Account Deactivated
					</h1>
					<p className="text-gray-300">
						Your account has been deactivated and is no longer
						accessible.
					</p>
				</div>

				<div className="bg-white/5 rounded-lg p-4 mb-6">
					<h2 className="text-lg font-semibold text-white mb-2">
						Account Deactivation
					</h2>
					<p className="text-sm text-gray-300 mb-4">
						Deactivated accounts cannot access the platform. This
						may be due to:
					</p>
					<ul className="text-sm text-gray-300 space-y-1 text-left">
						<li>- Account closure request</li>
						<li>- Extended inactivity</li>
						<li>- Administrative decision</li>
						<li>- Terms of service violation</li>
					</ul>
				</div>

				<div className="bg-white/5 rounded-lg p-4 mb-6">
					<h2 className="text-lg font-semibold text-white mb-2">
						Need Help?
					</h2>
					<p className="text-sm text-gray-300">
						If you believe this is an error or would like to
						reactivate your account, please contact our support
						team.
					</p>
				</div>

				<div className="space-y-3">
					<p className="text-sm text-gray-400">
						Account:{" "}
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
