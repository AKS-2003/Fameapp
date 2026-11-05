import type { Metadata } from "next";
import { LegalDocument, type LegalPart } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
	title: "Privacy Policy | FAME",
	description:
		"How FAME handles personal information for organizers, artists, speakers, performers and production teams.",
};

const parts: LegalPart[] = [
	{
		label: "Part A",
		heading: "Privacy Policy",
		sections: [
			{
				title: "Purpose and scope",
				paragraphs: [
					"This Privacy Policy explains how FAME handles personal information when people use its websites, applications and related services to manage performer profiles, event participation, hospitality, logistics, technical requirements, media and show running orders. It applies to organizers, artists, speakers, performers, crew members and other authorized users.",
				],
			},
			{
				title: "The information we process",
				bullets: [
					"Account information: name, login email, authentication identifiers, password hashes handled by the authentication provider, role, preferences and account activity.",
					"Professional profile information: stage name, biography, contact details, agency or representative details, photographs, show history, performance preferences and portfolio materials.",
					"Event information: event name, assignment, availability, schedules, rehearsals, call times, running order, travel logistics, accommodation requests, hospitality requirements and technical riders.",
					"Uploaded media and documents: music tracks, video files, artwork, technical files, approved production materials and associated notes or timestamps.",
					"Communications: invitation status, access requests, messages, notifications, feedback and support correspondence.",
					"Technical information: IP address, browser, device type, login timestamps, diagnostic logs, cookies and service-usage information.",
					"Sensitive or high-risk information only where genuinely necessary: for example, dietary or accessibility needs, identity/travel documentation and emergency contact details. We collect the minimum needed, restrict access and apply short retention periods.",
				],
			},
			{
				title: "Artist records, accounts and invitations",
				paragraphs: [
					"An artist or performer record is identified by an internal unique Artist ID, not by an email address. An organizer may create and maintain that professional record before the artist has an account. The organizer may enter a contact or invitation email as part of its own record. The artist may later create or use a separate account, linked through an access-permission record to the relevant Artist ID.",
					"Changing the artist's login email does not by itself overwrite the contact details, notes or historical records maintained by an organizer. Access to a record is controlled by verified login, valid invitation or approval, assigned role and the applicable permissions. A link alone should not be treated as proof of identity if it is exposed or forwarded.",
				],
			},
			{
				title: "Purposes of processing",
				bullets: [
					"Provide account registration, authentication, invitation acceptance and role-based access.",
					"Help organizers coordinate performers, speakers and artists for specific events.",
					"Distribute approved event information, schedules, technical cues and running orders to authorized people.",
					"Host, preview and process submitted media required for an event, including configurable playback cues where supported.",
					"Send operational notifications, respond to support requests, investigate misuse and protect platform security.",
					"Maintain business records and satisfy applicable legal obligations.",
				],
			},
			{
				title: "Legal basis and roles",
				paragraphs: [
					"Depending on the jurisdiction and context, processing may rely on performance of a contract, legitimate interests, consent or compliance with legal obligations. Organizers generally decide what performer and event information to enter, whom to invite, and what access to grant. FAME may act as a service provider/processor for that organizer-controlled content and separately as a controller for its own accounts, platform security, billing and service operations, subject to the applicable law and contracts.",
				],
			},
			{
				title: "Sharing and access permissions",
				paragraphs: [
					"Information is shared only with users and service providers who require it for authorized functions. Organizers can grant event-specific access to artists, stage managers, production teams or relevant partners. An artist should not automatically see an organizer's internal notes or other performers' private details. Different organizers' records must remain separated unless a user explicitly authorizes a defined cross-organization sharing feature.",
				],
				bullets: [
					"Technical providers may handle hosting, storage, video processing, email delivery, analytics, security or support as contracted service providers.",
					"Event-related information may be disclosed to designated transport, accommodation or venue partners only as needed for agreed arrangements.",
					"Disclosures may occur where legally required or necessary to protect users and the service.",
				],
				after: [
					"FAME will not sell users' personal information. Any commercial use or promotional sharing beyond event administration requires an appropriate separate basis and notice.",
				],
			},
			{
				title: "Media uploads and permissions",
				paragraphs: [
					"Uploaded video, audio, images and documents may be accessible to event participants only in accordance with explicit permissions. Uploaders and organizers must have necessary rights, permissions and licenses to upload, store, preview, reproduce, transmit and display those materials for the intended event operations. Uploading content does not transfer ownership to FAME.",
				],
			},
			{
				title: "Storage, security and international transfers",
				paragraphs: [
					"FAME uses encrypted transport, secure authentication, least-privilege access, protected storage, audit logging, backups and access revocation. No service can guarantee absolute security. Personal data may be stored or accessed in countries where FAME or its providers operate; any international transfer must comply with relevant legal requirements and contractual safeguards. Exact hosting regions and transfer mechanisms: [Confirm before publication].",
				],
			},
			{
				title: "Retention and deletion",
				paragraphs: [
					"We retain data only for as long as reasonably needed for agreed services, event administration, security, disputes or legal obligations. Organizer-owned performer records may remain after a performer disconnects their login, unless a valid deletion obligation applies. Uploaded performance media and sensitive documents have purpose-specific retention schedules.",
					"Retention periods: account and event records [insert]; uploads [insert]; logs [insert]; backups [insert].",
				],
			},
			{
				title: "Your choices and rights",
				paragraphs: [
					"Depending on applicable law, individuals may request access, correction, deletion, restriction, portability or objection, or withdraw applicable consent. A request concerning an organizer-managed record may need to be directed to that organizer. Requests can be sent to [privacy contact]. We may verify identity before responding.",
				],
			},
			{
				title: "Cookies, minors and changes",
				paragraphs: [
					"FAME may use essential cookies for authentication and security, and optional analytics cookies where enabled and legally permitted. The service is intended for professional users aged 18 or older unless a separate, lawful minor-performer workflow is expressly implemented. We may update this policy and will provide notices where required.",
				],
			},
		],
	},
];

export default function PrivacyPolicyPage() {
	return (
		<LegalDocument
			title="Privacy Policy"
			intro="This policy describes how FameManager and FAME Show Manager handle personal information for three principal groups: event organizers and managers; artists, speakers and performers; and authorized production or stage-management personnel."
			parts={parts}
			otherPage={{ href: "/terms", label: "Terms and Conditions" }}
		/>
	);
}
