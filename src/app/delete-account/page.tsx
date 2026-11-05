import type { Metadata } from "next";
import { LegalDocument, type LegalPart } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
	title: "Delete Your Account | FAME",
	description: "How to request deletion of your FAME account and data by contacting the team.",
};

const parts: LegalPart[] = [
	{
		label: "Account deletion",
		heading: "Delete your account",
		sections: [
			{
				title: "How to request deletion",
				paragraphs: [
					"Accounts are not deleted automatically from within the app. To delete your FAME account, please contact the team and ask for your account to be deleted. Send your request to mail@fantasiadxb.com, from the email address registered on the account where possible.",
				],
			},
			{
				title: "What to include in your request",
				bullets: [
					"Your full name and the login email address of the account.",
					"Whether you use FameManager (organizer or stage manager) or FameLink (artist, speaker or performer).",
					"The name of any event or organizer you are linked to, if you know it.",
					"A short note saying you want the account and your personal data deleted.",
				],
				after: [
					"We may ask you to confirm your identity before acting on the request, to make sure nobody else can delete your account.",
				],
			},
			{
				title: "What happens next",
				paragraphs: [
					"We will confirm your request and let you know when the deletion has been completed. Once your account is deleted you will no longer be able to log in, and your login credentials and personal profile information held for the account will be removed or anonymized.",
				],
			},
			{
				title: "What may be kept",
				paragraphs: [
					"Some information may be kept where there is a valid reason to do so. Records that an event organizer created and maintains for their own events, such as schedules, logistics and internal notes, belong to that organizer and may remain after you leave. We may also keep limited information where required for security, dispute resolution, billing or legal obligations, for as long as those obligations apply. See the Privacy Policy for how long data is retained.",
					"If your request relates to a record managed by an organizer, we may refer you to that organizer.",
				],
			},
			{
				title: "Questions",
				paragraphs: [
					"For questions about your data or this process, contact mail@fantasiadxb.com. You can also read our Privacy Policy and Terms and Conditions for more detail.",
				],
			},
		],
	},
];

export default function DeleteAccountPage() {
	return (
		<LegalDocument
			title="Delete Your Account"
			intro="You can ask the FAME team to delete your account and personal data. This page explains how to make that request and what to expect."
			parts={parts}
			otherPage={{ href: "/privacy-policy", label: "Privacy Policy" }}
		/>
	);
}
