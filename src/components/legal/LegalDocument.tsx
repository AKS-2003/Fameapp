import Link from "next/link";
import Image from "next/image";
import { LEGAL_CONFIG, LEGAL_IS_DRAFT } from "@/lib/legal-config";

export interface LegalSection {
	title: string;
	paragraphs?: string[];
	bullets?: string[];
	/** Paragraphs shown after the bullet list */
	after?: string[];
}

export interface LegalPart {
	/** e.g. "Part A" */
	label: string;
	heading: string;
	sections: LegalSection[];
}

interface LegalDocumentProps {
	title: string;
	intro: string;
	parts: LegalPart[];
	/** The other legal page, linked from the header and footer */
	otherPage: { href: string; label: string };
}

/** Highlights [bracketed placeholders] so unfinished fields are obvious until they are filled in. */
function withPlaceholders(text: string) {
	return text.split(/(\[[^\]]+\])/g).map((chunk, i) =>
		/^\[[^\]]+\]$/.test(chunk) ? (
			<mark key={i} className="rounded bg-amber-500/20 px-1 text-amber-200">
				{chunk}
			</mark>
		) : (
			<span key={i}>{chunk}</span>
		),
	);
}

export function LegalDocument({ title, intro, parts, otherPage }: LegalDocumentProps) {
	const anchor = (part: LegalPart, index: number) =>
		`${part.label.toLowerCase().replace(/\s+/g, "-")}-section-${index + 1}`;

	return (
		<div className="min-h-screen bg-[#0a0618] text-purple-50">
			<header className="sticky top-0 z-20 border-b border-purple-500/15 bg-[#07031a]/90 backdrop-blur">
				<div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
					<Link href="/" className="flex items-center gap-2">
						<Image src="/fame-logo.png" alt="FAME" width={32} height={32} />
						<span className="text-sm font-bold tracking-wide">FAME</span>
					</Link>
					<nav className="flex items-center gap-4 text-sm">
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

			<main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
				<h1 className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
					{title}
				</h1>
				<p className="mt-2 text-sm text-purple-200/60">
					Version {LEGAL_CONFIG.version} · Last updated {LEGAL_CONFIG.lastUpdated}
				</p>

				{LEGAL_IS_DRAFT && (
					<div
						role="note"
						className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
					>
						<strong>Draft for review.</strong> This document is a working draft and is not final legal
						advice. Highlighted fields in square brackets must be completed before publication.
					</div>
				)}

				<p className="mt-6 text-base leading-7 text-purple-100/90">{intro}</p>

				<dl className="mt-6 grid gap-x-6 gap-y-2 rounded-2xl border border-purple-500/15 bg-white/5 p-5 text-sm sm:grid-cols-[auto_1fr]">
					<dt className="text-purple-300/70">Platform</dt>
					<dd>{LEGAL_CONFIG.platformName}</dd>
					<dt className="text-purple-300/70">Location</dt>
					<dd>{withPlaceholders(LEGAL_CONFIG.address)}</dd>
					<dt className="text-purple-300/70">Privacy contact</dt>
					<dd>{withPlaceholders(LEGAL_CONFIG.privacyEmail)}</dd>
					<dt className="text-purple-300/70">Support contact</dt>
					<dd>{withPlaceholders(LEGAL_CONFIG.supportEmail)}</dd>
				</dl>

				<div className="mt-8 text-sm text-purple-200/70">
					<p className="mb-2 font-semibold text-purple-100">Contents</p>
					<ol className="space-y-3">
						{parts.map((part) => (
							<li key={part.label}>
								<span className="font-medium text-purple-100">
									{part.label} · {part.heading}
								</span>
								<ul className="ml-4 mt-1 list-none space-y-0.5">
									{part.sections.map((section, index) => (
										<li key={section.title}>
											<a href={`#${anchor(part, index)}`} className="hover:text-white">
												{index + 1}. {section.title}
											</a>
										</li>
									))}
								</ul>
							</li>
						))}
					</ol>
				</div>

				{parts.map((part) => (
					<div key={part.label} className="mt-12">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-300/80">{part.label}</p>
						<h2 className="mt-1 border-b border-purple-500/15 pb-3 text-2xl font-bold text-white">
							{part.heading}
						</h2>

						{part.sections.map((section, index) => {
							return (
								<section key={section.title} id={anchor(part, index)} className="scroll-mt-20 pt-8">
									<h3 className="text-lg font-semibold text-white">
										{index + 1}. {section.title}
									</h3>
									{section.paragraphs?.map((p, i) => (
										<p key={i} className="mt-3 text-[15px] leading-7 text-purple-100/85">
											{withPlaceholders(p)}
										</p>
									))}
									{section.bullets && (
										<ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-purple-100/85 marker:text-pink-400">
											{section.bullets.map((b, i) => (
												<li key={i}>{withPlaceholders(b)}</li>
											))}
										</ul>
									)}
									{section.after?.map((p, i) => (
										<p key={i} className="mt-3 text-[15px] leading-7 text-purple-100/85">
											{withPlaceholders(p)}
										</p>
									))}
								</section>
							);
						})}
					</div>
				))}

				<footer className="mt-16 border-t border-purple-500/15 pt-6 text-sm text-purple-200/60">
					<p>
						Questions? Contact {withPlaceholders(LEGAL_CONFIG.supportEmail)}. See also our{" "}
						<Link href={otherPage.href} className="text-pink-300 underline underline-offset-2 hover:text-pink-200">
							{otherPage.label}
						</Link>
						.
					</p>
				</footer>
			</main>
		</div>
	);
}
