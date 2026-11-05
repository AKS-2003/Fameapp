import type { Metadata } from "next";
import { LegalDocument, type LegalPart } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
	title: "Terms and Conditions | FAME",
	description:
		"General terms of use and role-specific terms for organizers, artists, speakers, performers and production teams on FAME.",
};

const parts: LegalPart[] = [
	{
		label: "Part B",
		heading: "General Terms of Use",
		sections: [
			{
				title: "Acceptance and eligibility",
				paragraphs: [
					"By creating an account, accepting an invitation or using FAME, you agree to these Terms. You confirm that you may lawfully enter into this agreement and provide accurate information. Where acting for a business, you confirm that you are authorized to act for it.",
				],
			},
			{
				title: "What the platform provides",
				paragraphs: [
					"FAME offers software tools to help organizers coordinate performers, speakers, artists, stage managers and related event operations. Features may include artist records, invitations, access permissions, logistics, hospitality, technical riders, documents, notifications, media preview and show running order management. FAME does not itself guarantee a performance, artist booking, on-site production, media playback result or event outcome.",
				],
			},
			{
				title: "Accounts and security",
				paragraphs: [
					"Each user must keep login credentials secure and may not share access or impersonate another person. Users must promptly report unauthorized access. Account email is a login and communications credential; it is not the primary identifier for an organizer's artist record. Access to that record depends on its Artist ID and granted permissions. Account email changes do not automatically change an organizer's business contact records.",
				],
			},
			{
				title: "Invitations and record access",
				paragraphs: [
					"An organizer may create a performer record and invite a person to claim authorized access. Invitation acceptance may require sign-in, verification, organizer approval or other checks. A person receiving an invitation may not assume permission to view information unrelated to their assigned artist, event or role. Access may be revoked when involvement ends or where misuse is detected.",
				],
			},
			{
				title: "Acceptable use",
				bullets: [
					"Do not upload illegal, malicious, defamatory or infringing content.",
					"Do not access, download or share personal data, media or event details beyond your assigned permissions.",
					"Do not attempt to bypass account security or access controls, scrape the platform or disrupt operations.",
					"Do not supply inaccurate information deliberately or claim authority to represent another individual or organization without permission.",
				],
			},
			{
				title: "Content ownership and limited platform license",
				paragraphs: [
					"Users and their licensors retain ownership of content they lawfully provide. They grant FAME a limited, non-exclusive license to store, reproduce, process, transmit, display and format content solely to operate, secure and support the services and authorized event workflows. This does not authorize unrelated marketing use, resale of media or public performance licensing.",
				],
			},
			{
				title: "Third-party providers and integration",
				paragraphs: [
					"The platform may integrate with hosting, cloud storage, email, payment, analytics or identity services. Separate third-party conditions may apply. FAME is not responsible for independent third-party services beyond the scope required by applicable law and contract.",
				],
			},
			{
				title: "Fees, plans and cancellation",
				paragraphs: [
					"If subscription or service fees apply, pricing, billing period, taxes, renewal rules, cancellation process and any refund terms are disclosed at purchase and in a separate order form or plan description.",
				],
			},
			{
				title: "Availability, backups and live-show use",
				paragraphs: [
					"We aim to provide a reliable service but do not promise uninterrupted availability. Organizers remain responsible for testing production media, venue systems, codecs, connectivity, screen/audio routing and cue accuracy. FAME preview or browser-based playback should not be treated as a guaranteed redundant broadcast or show-control system. Critical performances should have rehearsed backups and contingency workflows.",
				],
			},
			{
				title: "Suspension and termination",
				paragraphs: [
					"We may suspend or restrict access for security incidents, legal obligations, material violations or nonpayment where contractually applicable. On termination, content export, account closure and deletion will follow applicable terms, legal requirements and the Privacy Policy. An individual user leaving an organizer's event does not automatically delete that organizer's legitimate business records.",
				],
			},
			{
				title: "Disclaimers and liability",
				paragraphs: [
					"Except where prohibited by applicable law, the service is offered subject to disclosed limitations, and FAME is not responsible for artist performance quality, organizer decisions, venue operations, third-party transport, accommodation or indirect loss caused by event disruption. Any liability cap, exclusions and mandatory consumer or data-protection rights are defined by local law.",
				],
			},
			{
				title: "Contact and notices",
				paragraphs: [
					"For support, questions about these Terms or legal notices, contact mail@fantasiadxb.com (Dubai).",
				],
			},
		],
	},
	{
		label: "Part C",
		heading: "Role-Specific Terms",
		sections: [
			{
				title: "Organizer and artist manager responsibilities",
				bullets: [
					"Maintain a lawful basis to collect, enter and share artist and performer personal information, including any sensitive details.",
					"Confirm the accuracy of the manager-maintained artist record and promptly update outdated logistics, schedules and permissions.",
					"Invite the intended recipient, approve access claims where required and promptly revoke access when an engagement ends.",
					"Limit stage-manager and third-party access to specific events and information necessary for their responsibilities.",
					"Obtain media rights, permissions and event licenses where required for music, video, images and performance recordings.",
					"Protect financial, identity and travel documentation and avoid collecting it unless operationally necessary.",
				],
			},
			{
				title: "Artist, speaker and performer responsibilities",
				bullets: [
					"Provide accurate information relevant to the assigned performance, including technical, travel and hospitality requirements.",
					"Confirm or flag inaccurate details and communicate material changes to the organizer promptly.",
					"Upload only content that you are permitted to share for the intended event use.",
					"Keep account access private and respect confidential event plans, running orders and other participants' information.",
					"Understand that changing the account login email does not automatically edit the organizer's separate contact database.",
				],
			},
			{
				title: "Stage manager and production team responsibilities",
				bullets: [
					"Use technical riders, media, cues, schedules and running orders only for assigned productions.",
					"Do not disclose restricted performer details to unauthorized cast, crew, suppliers or attendees.",
					"Verify all videos, audio tracks, start cues, volume settings and transitions before live execution.",
					"Ensure agreed running-order changes are distributed through the designated event workflow.",
				],
			},
			{
				title: "Visibility and ownership of event records",
				paragraphs: [
					"An organizer controls its own event records, internal notes and assignments. A performer may be linked to multiple events or organizers without those organizers gaining automatic visibility into one another's private records. Sharing between organizations requires a specific authorized action or applicable contractual arrangement.",
				],
			},
			{
				title: "Event completion and feedback",
				paragraphs: [
					"After an event, assigned users may receive completion requests, feedback forms or record-closure tasks. The organizer remains responsible for final event archiving, record accuracy and any legally required retention. An artist withdrawing access does not automatically reverse completed event records.",
				],
			},
		],
	},
];

export default function TermsPage() {
	return (
		<LegalDocument
			title="Terms and Conditions"
			intro="These terms govern your use of FameManager and FAME Show Manager. They are written for three principal groups: event organizers and managers; artists, speakers and performers; and authorized production or stage-management personnel."
			parts={parts}
			otherPage={{ href: "/privacy-policy", label: "Privacy Policy" }}
		/>
	);
}
