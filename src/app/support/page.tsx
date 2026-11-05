import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
	title: "Support | FAME",
	description: "Contact the FAME support team: location, phone and email.",
};

const CONTACT = {
	location: "Dubai, UAE",
	phone: "+971 52 841 1575",
	phoneHref: "tel:+971528411575",
	email: "info@fameapp.io",
};

export default function SupportPage() {
	const items = [
		{
			icon: MapPin,
			label: "Location",
			value: CONTACT.location,
			href: null as string | null,
		},
		{ icon: Phone, label: "Phone", value: CONTACT.phone, href: CONTACT.phoneHref },
		{ icon: Mail, label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
	];

	return (
		<div className="min-h-screen bg-[#0a0618] text-purple-50">
			<header className="sticky top-0 z-20 border-b border-purple-500/15 bg-[#07031a]/90 backdrop-blur">
				<div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
					<Link href="/" className="flex items-center gap-2">
						<Image src="/fame-logo.png" alt="FAME" width={32} height={32} />
						<span className="text-sm font-bold tracking-wide">FAME</span>
					</Link>
					<nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
						<Link href="/privacy-policy" className="text-purple-200/70 hover:text-white">
							Privacy Policy
						</Link>
						<Link href="/terms" className="text-purple-200/70 hover:text-white">
							Terms
						</Link>
						<Link href="/delete-account" className="text-purple-200/70 hover:text-white">
							Delete account
						</Link>
					</nav>
				</div>
			</header>

			<main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
				<h1 className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
					Support
				</h1>
				<p className="mt-3 text-base leading-7 text-purple-100/85">
					Need help with FameManager or FameLink? Get in touch with the FAME team using the details below
					and we will get back to you.
				</p>

				<ul className="mt-8 space-y-3">
					{items.map(({ icon: Icon, label, value, href }) => {
						const content = (
							<>
								<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-pink-300">
									<Icon className="h-5 w-5" aria-hidden="true" />
								</span>
								<span className="min-w-0">
									<span className="block text-xs uppercase tracking-wider text-purple-300/60">{label}</span>
									<span className="block break-words text-base font-medium text-white">{value}</span>
								</span>
							</>
						);
						return (
							<li key={label}>
								{href ? (
									<a
										href={href}
										className="flex items-center gap-4 rounded-2xl border border-purple-500/15 bg-white/5 p-4 transition-colors hover:border-pink-400/40 hover:bg-white/10"
									>
										{content}
									</a>
								) : (
									<div className="flex items-center gap-4 rounded-2xl border border-purple-500/15 bg-white/5 p-4">
										{content}
									</div>
								)}
							</li>
						);
					})}
				</ul>

				<p className="mt-8 text-sm text-purple-200/60">
					To delete your account, see{" "}
					<Link href="/delete-account" className="text-pink-300 underline underline-offset-2 hover:text-pink-200">
						Delete your account
					</Link>
					. For how we handle your data, read our{" "}
					<Link href="/privacy-policy" className="text-pink-300 underline underline-offset-2 hover:text-pink-200">
						Privacy Policy
					</Link>
					.
				</p>
			</main>
		</div>
	);
}
