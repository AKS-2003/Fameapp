"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQ {
	question: string;
	answer: string;
}

const faqs: FAQ[] = [
	{
		question: "Why do I need to complete the FAME registration form?",
		answer: "To ensure your performance is prepared correctly in advance — including your name, music, technical needs, and MC announcement — so there are no last-minute mistakes.",
	},
	{
		question: "Who can see the information I submit?",
		answer: "Only the event organizer and relevant production teams (DJ, technical director, stage manager, MC) will have access to your information for show preparation.",
	},
	{
		question: "Which sections are mandatory and which are optional?",
		answer: "Sections 1 (Artist Information), 2 (Music Information), and 3 (Technical Show Director Information) are mandatory. Sections 4 (Stage Visual Manager Information) and 5 (Additional Information) are optional. However, the more information you provide, the better the team can prepare your performance.",
	},
	{
		question:
			"What happens if I submit incorrect or incomplete information?",
		answer: "Incorrect or missing details may result in wrong announcements, technical issues, or delays. Always review your information carefully before submitting.",
	},
	{
		question: "Is uploading my music mandatory?",
		answer: "Yes. Music upload is required for performances so the DJ and technical team can prepare in advance. Always bring a backup copy on the event day.",
	},
	{
		question: "Can I change my information after submitting the form?",
		answer: "Yes, as long as the event organizer has not locked the form. Contact the organizer if updates are needed.",
	},
	{
		question:
			"What if I don't have specific lighting or technical preferences?",
		answer: 'You can select "Trust the Lighting Designer." The technical team will handle your setup professionally.',
	},
	{
		question: "Are the visual and social media sections mandatory?",
		answer: "No. These sections are optional but recommended, as they help with promotion, visuals, and overall show presentation.",
	},
	{
		question: "How is my MC introduction information used?",
		answer: "MC Notes ensure your name, country, pronunciation, and background are announced correctly and consistently on stage.",
	},
	{
		question: "Who do I contact if I have questions or need help?",
		answer: "You can contact the FAME Helpdesk directly via WhatsApp at +971 52 841 1575 for support or assistance.",
	},
];

export function FAQSection() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const toggleFAQ = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	return (
		<motion.div
			className="w-full max-w-4xl mx-auto px-4 py-8"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, delay: 0.3 }}
		>
			{/* Header */}
			<motion.div
				className="text-center mb-8"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
			>
				<div className="flex items-center justify-center gap-3 mb-3">
					<HelpCircle className="w-8 h-8 text-purple-400" />
					<h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
						Top 10 FAQs – FAME App
					</h2>
				</div>
				<p className="text-gray-400 text-sm sm:text-base">
					Everything you need to know about the registration process
				</p>
			</motion.div>

			{/* FAQ Items */}
			<div className="space-y-3">
				{faqs.map((faq, index) => (
					<motion.div
						key={index}
						className="bg-gray-900/60 border border-gray-700/50 rounded-xl backdrop-blur-sm overflow-hidden hover:border-purple-500/50 transition-all duration-300"
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.5 + index * 0.05 }}
					>
						{/* Question */}
						<button
							onClick={() => toggleFAQ(index)}
							className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-gray-800/40 transition-colors"
						>
							<div className="flex items-start gap-3 flex-1">
								<div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-purple-400 font-bold text-sm">
										{index + 1}
									</span>
								</div>
								<h3 className="text-white font-semibold text-sm sm:text-base leading-relaxed">
									{faq.question}
								</h3>
							</div>
							<motion.div
								animate={{
									rotate: openIndex === index ? 180 : 0,
								}}
								transition={{ duration: 0.3 }}
								className="flex-shrink-0"
							>
								<ChevronDown className="w-5 h-5 text-gray-400" />
							</motion.div>
						</button>

						{/* Answer */}
						<AnimatePresence>
							{openIndex === index && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{ duration: 0.3 }}
									className="overflow-hidden"
								>
									<div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-16 sm:pl-[4.5rem]">
										<p className="text-gray-300 text-sm sm:text-base leading-relaxed">
											{faq.answer}
										</p>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				))}
			</div>

			{/* Footer Note */}
			<motion.div
				className="mt-8 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1 }}
			>
				<div className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-full">
					<span className="text-2xl">💬</span>
					<p className="text-gray-300 text-sm">
						Still have questions?{" "}
						<a
							href="https://wa.me/971528411575"
							target="_blank"
							rel="noopener noreferrer"
							className="text-purple-400 hover:text-purple-300 font-semibold underline"
						>
							Contact us on WhatsApp
						</a>
					</p>
				</div>
			</motion.div>
		</motion.div>
	);
}
