import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	Image,
	StyleSheet,
	Svg,
	Circle,
	Line,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────

export interface ArtistPDFData {
	artistName?: string;
	artist_name?: string;
	realName?: string;
	real_name?: string;
	email?: string;
	phone?: string;
	whatsapp?: string;
	managedBy?: string;
	style?: string;
	performanceType?: string;
	biography?: string;
	notes?: string;
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};
	showLink?: string;
	costumeColor?: string;
	costumeColorTwo?: string;
	costumeColorThree?: string;
	manualCostumeColor?: string;
	manualCostumeColorTwo?: string;
	manualCostumeColorThree?: string;
	customCostumeColor?: string;
	lightColorSingle?: string;
	lightColorTwo?: string;
	lightColorThree?: string;
	manualLightColor?: string;
	manualLightColorTwo?: string;
	manualLightColorThree?: string;
	lightRequests?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	equipment?: string;
	propsNeeded?: string;
	props_needed?: string;
	mcNotes?: string;
	mc_notes?: string;
	stageManagerNotes?: string;
	stage_manager_notes?: string;
	artistNotes?: string;
	artist_notes?: string;
	countryLiving?: string;
	homeCountry?: string;
	members?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
	memberNationalities?: Array<{
		name: string;
		countryLiving: string;
		homeCountry: string;
	}>;
	tshirtSizes?: Array<{ name: string; size: string; fit: string }>;
	musicTrack?: {
		duration?: number;
		song_title?: string;
		notes?: string;
		tempo?: string;
	};
	performanceDuration?: number;
	performance_duration?: number;
	createdAt?: string;
	created_at?: string;
}

interface PDFProps {
	data: ArtistPDFData;
	eventName: string;
	profileImageUri?: string;
	galleryImageUris?: string[];
	logoUri?: string;
}

// ─── Color Palette ───────────────────────────────────────

const c = {
	// Primary
	purple: "#7C3AED",
	purpleDark: "#5B21B6",
	purpleDeep: "#4C1D95",
	purpleLight: "#EDE9FE",
	purpleMid: "#A78BFA",
	purpleBg: "#F5F3FF",
	// Accent
	pink: "#EC4899",
	pinkLight: "#FCE7F3",
	fuchsia: "#D946EF",
	// Functional
	green: "#10B981",
	greenLight: "#D1FAE5",
	greenDark: "#059669",
	red: "#EF4444",
	redLight: "#FEE2E2",
	amber: "#F59E0B",
	amberLight: "#FEF3C7",
	blue: "#3B82F6",
	blueLight: "#DBEAFE",
	// Neutrals
	text: "#111827",
	textSec: "#4B5563",
	textMuted: "#9CA3AF",
	textLight: "#D1D5DB",
	white: "#FFFFFF",
	bg: "#F9FAFB",
	bgWarm: "#FAFAF9",
	border: "#E5E7EB",
	borderLight: "#F3F4F6",
	slate50: "#F8FAFC",
	slate100: "#F1F5F9",
};

const COLOR_MAP: Record<string, string> = {
	red: "#EF4444",
	blue: "#3B82F6",
	green: "#22C55E",
	amber: "#F59E0B",
	magenta: "#D946EF",
	cyan: "#06B6D4",
	purple: "#A855F7",
	yellow: "#EAB308",
	white: "#F9FAFB",
	black: "#111827",
	"warm-white": "#FEF3C7",
	"cold-blue": "#BFDBFE",
	uv: "#7C3AED",
	rose: "#FB7185",
	orange: "#F97316",
	pink: "#EC4899",
	teal: "#14B8A6",
	lavender: "#C4B5FD",
	gold: "#F59E0B",
	silver: "#9CA3AF",
	turquoise: "#2DD4BF",
};

function resolveColor(name: string): string {
	if (name.startsWith("#")) return name;
	return COLOR_MAP[name.toLowerCase()] || "#9CA3AF";
}

function formatPositionName(pos: string): string {
	return pos
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
	page: {
		backgroundColor: c.white,
		paddingBottom: 44,
		fontFamily: "Helvetica",
	},

	// ── Header ──
	headerGradient: {
		backgroundColor: c.purpleDeep,
		paddingHorizontal: 32,
		paddingTop: 24,
		paddingBottom: 20,
	},
	headerTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 4,
	},
	headerLogoArea: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	logoImg: {
		width: 28,
		height: 28,
		borderRadius: 4,
	},
	logoBrand: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		letterSpacing: 3,
	},
	logoBadge: {
		backgroundColor: c.purple,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	logoBadgeText: {
		fontSize: 6,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		letterSpacing: 1.5,
	},
	headerProfileRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginTop: 12,
	},
	profileImg: {
		width: 56,
		height: 56,
		borderRadius: 28,
		border: `2.5px solid ${c.purpleMid}`,
	},
	profilePlaceholder: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: c.purple,
		alignItems: "center",
		justifyContent: "center",
	},
	profilePlaceholderText: {
		fontSize: 20,
		fontFamily: "Helvetica-Bold",
		color: c.white,
	},
	headerInfo: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 22,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		marginBottom: 3,
	},
	headerSub: {
		fontSize: 9,
		color: "#C4B5FD",
		letterSpacing: 0.3,
	},
	headerAccent: {
		height: 3,
		backgroundColor: c.pink,
	},

	// ── Content ──
	content: {
		paddingHorizontal: 32,
		paddingTop: 16,
	},

	// ── Section Header ──
	sectionRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 18,
		marginBottom: 10,
	},
	sectionPill: {
		backgroundColor: c.purpleLight,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 5,
		flexDirection: "row",
		alignItems: "center",
	},
	sectionIcon: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: c.purple,
		marginRight: 7,
		alignItems: "center",
		justifyContent: "center",
	},
	sectionIconText: {
		fontSize: 8,
		color: c.white,
		fontFamily: "Helvetica-Bold",
	},
	sectionTitle: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: c.purpleDark,
		textTransform: "uppercase",
		letterSpacing: 1.2,
	},
	sectionLine: {
		flex: 1,
		height: 1,
		backgroundColor: c.border,
		marginLeft: 10,
	},

	// ── Info Table / Card ──
	card: {
		backgroundColor: c.white,
		borderRadius: 8,
		border: `1px solid ${c.border}`,
		overflow: "hidden",
		marginBottom: 8,
	},
	cardAccent: {
		position: "absolute" as const,
		left: 0,
		top: 0,
		bottom: 0,
		width: 3,
		backgroundColor: c.purple,
		borderTopLeftRadius: 8,
		borderBottomLeftRadius: 8,
	},
	tableRow: {
		flexDirection: "row",
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderBottomWidth: 0.5,
		borderBottomColor: c.borderLight,
		alignItems: "center",
	},
	tableRowAlt: {
		backgroundColor: c.slate50,
	},
	tableLabel: {
		width: 110,
		fontSize: 8.5,
		fontFamily: "Helvetica-Bold",
		color: c.textSec,
	},
	tableValue: {
		flex: 1,
		fontSize: 8.5,
		color: c.text,
	},

	// ── Two-Column Layout ──
	twoCol: {
		flexDirection: "row",
		gap: 12,
	},
	colHalf: {
		flex: 1,
	},

	// ── Text Block ──
	textCard: {
		backgroundColor: c.slate50,
		borderRadius: 8,
		border: `1px solid ${c.borderLight}`,
		padding: 12,
		marginBottom: 8,
	},
	textBody: {
		fontSize: 8.5,
		color: c.text,
		lineHeight: 1.6,
	},

	// ── Color Swatches ──
	swatchRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
		marginBottom: 6,
	},
	swatchBox: {
		alignItems: "center",
	},
	swatch: {
		width: 28,
		height: 28,
		borderRadius: 6,
		border: `1.5px solid ${c.border}`,
	},
	swatchLabel: {
		fontSize: 6.5,
		color: c.textSec,
		marginTop: 3,
	},
	swatchGroupLabel: {
		fontSize: 8.5,
		fontFamily: "Helvetica-Bold",
		color: c.textSec,
		marginBottom: 5,
	},

	// ── Notes ──
	noteCard: {
		borderRadius: 8,
		border: `1px solid ${c.border}`,
		overflow: "hidden",
		marginBottom: 8,
		flexDirection: "row",
	},
	noteAccent: {
		width: 4,
	},
	noteContent: {
		flex: 1,
		padding: 10,
	},
	noteLabelRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 5,
	},
	noteDot: {
		width: 7,
		height: 7,
		borderRadius: 3.5,
		marginRight: 5,
	},
	noteLabel: {
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
	},
	noteText: {
		fontSize: 8.5,
		color: c.text,
		lineHeight: 1.5,
	},
	noteEmpty: {
		fontSize: 8.5,
		color: c.textMuted,
		fontStyle: "italic",
	},

	// ── Gallery ──
	galleryGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	galleryItem: {
		width: "31%",
		borderRadius: 6,
		border: `1px solid ${c.border}`,
		overflow: "hidden",
	},
	galleryImg: {
		width: "100%",
		height: 90,
	},

	// ── Footer ──
	footer: {
		position: "absolute" as const,
		bottom: 0,
		left: 0,
		right: 0,
		height: 32,
	},
	footerAccent: {
		height: 2,
		backgroundColor: c.pink,
	},
	footerBar: {
		backgroundColor: c.purpleDeep,
		height: 24,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 32,
	},
	footerText: {
		fontSize: 7,
		color: "#C4B5FD",
	},
	footerBrand: {
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		letterSpacing: 1,
	},

	// ── Stage ──
	stageOuter: {
		marginBottom: 8,
	},
	legendRow: {
		flexDirection: "row",
		gap: 20,
		marginTop: 8,
		paddingHorizontal: 4,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	legendDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	legendText: {
		fontSize: 8,
		color: c.textSec,
	},
});

// ─── Sub-Components ──────────────────────────────────────

function Section({ title, icon }: { title: string; icon: string }) {
	return (
		<View style={s.sectionRow}>
			<View style={s.sectionPill}>
				<View style={s.sectionIcon}>
					<Text style={s.sectionIconText}>{icon}</Text>
				</View>
				<Text style={s.sectionTitle}>{title}</Text>
			</View>
			<View style={s.sectionLine} />
		</View>
	);
}

function InfoTable({ items }: { items: { label: string; value: string }[] }) {
	return (
		<View style={s.card}>
			<View style={s.cardAccent} />
			{items.map((item, i) => (
				<View
					key={i}
					style={[s.tableRow, i % 2 === 0 ? s.tableRowAlt : {}]}
				>
					<Text style={s.tableLabel}>{item.label}</Text>
					<Text style={s.tableValue}>{item.value || "—"}</Text>
				</View>
			))}
		</View>
	);
}

function NoteBox({
	label,
	text,
	color,
}: {
	label: string;
	text?: string;
	color: string;
}) {
	const isEmpty = !text || !text.trim();
	const content = isEmpty ? "No notes provided" : text;
	return (
		<View style={s.noteCard} wrap={false}>
			<View style={[s.noteAccent, { backgroundColor: color }]} />
			<View style={s.noteContent}>
				<View style={s.noteLabelRow}>
					<View style={[s.noteDot, { backgroundColor: color }]} />
					<Text style={[s.noteLabel, { color }]}>{label}</Text>
				</View>
				<Text style={isEmpty ? s.noteEmpty : s.noteText}>
					{content}
				</Text>
			</View>
		</View>
	);
}

function ColorSwatches({
	label,
	colors,
	notes,
}: {
	label: string;
	colors: string[];
	notes?: string;
}) {
	const valid = colors.filter((cl) => cl && cl !== "none" && cl !== "trust");
	if (valid.length === 0 && !notes) return null;
	return (
		<View style={{ marginBottom: 8 }}>
			<Text style={s.swatchGroupLabel}>{label}</Text>
			<View style={s.swatchRow}>
				{valid.map((color, i) => (
					<View key={i} style={s.swatchBox}>
						<View
							style={[
								s.swatch,
								{ backgroundColor: resolveColor(color) },
							]}
						/>
						<Text style={s.swatchLabel}>
							{color.charAt(0).toUpperCase() + color.slice(1)}
						</Text>
					</View>
				))}
			</View>
			{notes && (
				<Text
					style={{
						fontSize: 7.5,
						color: c.textSec,
						fontStyle: "italic",
						marginTop: 3,
					}}
				>
					Notes: {notes}
				</Text>
			)}
		</View>
	);
}

function StagePositionGraphic({ start, end }: { start: string; end: string }) {
	const positions: Record<string, { x: number; y: number }> = {
		"upstage-left": { x: 10, y: 10 },
		upstage: { x: 50, y: 10 },
		"upstage-right": { x: 90, y: 10 },
		left: { x: 10, y: 50 },
		center: { x: 50, y: 50 },
		right: { x: 90, y: 50 },
		"downstage-left": { x: 10, y: 90 },
		downstage: { x: 50, y: 90 },
		"downstage-right": { x: 90, y: 90 },
		"back-left": { x: 10, y: 10 },
		"back-center": { x: 50, y: 10 },
		"back-right": { x: 90, y: 10 },
		"center-left": { x: 10, y: 50 },
		"center-right": { x: 90, y: 50 },
		"front-left": { x: 10, y: 90 },
		"front-center": { x: 50, y: 90 },
		"front-right": { x: 90, y: 90 },
	};

	const sp = positions[start] || { x: 50, y: 50 };
	const ep = positions[end] || { x: 50, y: 50 };
	const showEnd = !!end && end !== start;

	const W = 540;
	const H = 160;
	const PAD = 30;
	const sx = PAD + (sp.x / 100) * (W - PAD * 2);
	const sy = PAD + (sp.y / 100) * (H - PAD * 2);
	const ex = PAD + (ep.x / 100) * (W - PAD * 2);
	const ey = PAD + (ep.y / 100) * (H - PAD * 2);

	return (
		<View style={s.stageOuter} wrap={false}>
			{/* Title */}
			<Text
				style={{
					fontSize: 9,
					fontFamily: "Helvetica-Bold",
					color: c.text,
					marginBottom: 6,
				}}
			>
				Stage Position Preview
			</Text>

			{/* Stage box — dashed border matching web version */}
			<View
				style={{
					height: 150,
					borderWidth: 2,
					borderColor: "#1f2937",
					borderStyle: "dashed",
					borderRadius: 4,
					backgroundColor: c.white,
					position: "relative",
				}}
			>
				{/* Upstage (Back) label — top center */}
				<Text
					style={{
						position: "absolute",
						top: 4,
						left: 0,
						right: 0,
						textAlign: "center",
						fontSize: 7.5,
						color: c.textMuted,
					}}
				>
					Upstage (Back)
				</Text>

				{/* Downstage (Front) label — bottom center */}
				<Text
					style={{
						position: "absolute",
						bottom: 4,
						left: 0,
						right: 0,
						textAlign: "center",
						fontSize: 7.5,
						color: c.textMuted,
					}}
				>
					Downstage (Front)
				</Text>

				{/* Left label — vertical text on left side */}
				<View
					style={{
						position: "absolute",
						left: 3,
						top: 0,
						bottom: 0,
						justifyContent: "center",
						width: 12,
					}}
				>
					{"Left".split("").map((ch, i) => (
						<Text
							key={i}
							style={{
								fontSize: 7.5,
								color: c.textMuted,
								textAlign: "center",
								lineHeight: 1,
							}}
						>
							{ch}
						</Text>
					))}
				</View>

				{/* Right label — vertical text on right side */}
				<View
					style={{
						position: "absolute",
						right: 3,
						top: 0,
						bottom: 0,
						justifyContent: "center",
						width: 12,
					}}
				>
					{"Right".split("").map((ch, i) => (
						<Text
							key={i}
							style={{
								fontSize: 7.5,
								color: c.textMuted,
								textAlign: "center",
								lineHeight: 1,
							}}
						>
							{ch}
						</Text>
					))}
				</View>

				{/* SVG layer for dots and movement line */}
				<Svg
					viewBox={`0 0 ${W} ${H}`}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
					}}
				>
					{/* Movement line (dashed) */}
					{showEnd && (
						<Line
							x1={sx}
							y1={sy}
							x2={ex}
							y2={ey}
							stroke={c.textMuted}
							strokeWidth={2}
							strokeDasharray="6,4"
						/>
					)}

					{/* Start dot — green with white border */}
					{start && (
						<>
							<Circle
								cx={sx}
								cy={sy}
								r={10}
								fill={c.white}
							/>
							<Circle
								cx={sx}
								cy={sy}
								r={7}
								fill={c.green}
							/>
						</>
					)}

					{/* End dot — red with white border */}
					{showEnd && (
						<>
							<Circle
								cx={ex}
								cy={ey}
								r={10}
								fill={c.white}
							/>
							<Circle
								cx={ex}
								cy={ey}
								r={7}
								fill="#F87171"
							/>
						</>
					)}
				</Svg>
			</View>

			{/* Legend */}
			<View style={s.legendRow}>
				{start && (
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: c.green },
							]}
						/>
						<Text style={s.legendText}>
							Start: {formatPositionName(start)}
						</Text>
					</View>
				)}
				{showEnd && (
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: "#F87171" },
							]}
						/>
						<Text style={s.legendText}>
							End: {formatPositionName(end)}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
}

// ─── Footer ──────────────────────────────────────────────

function Footer() {
	const dateStr = new Date().toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	return (
		<View style={s.footer} fixed>
			<View style={s.footerAccent} />
			<View style={s.footerBar}>
				<Text style={s.footerBrand}>FAMELINK</Text>
				<Text style={s.footerText}>Generated {dateStr}</Text>
				<Text
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
					style={s.footerText}
				/>
			</View>
		</View>
	);
}

// ─── Main Document ───────────────────────────────────────

export function ArtistPDFDocument({
	data,
	eventName,
	profileImageUri,
	galleryImageUris,
	logoUri,
}: PDFProps) {
	const name = data.artistName || data.artist_name || "Artist";
	const realName = data.realName || data.real_name || "";
	const subtitle =
		realName && realName !== name
			? `${realName}  •  ${eventName}`
			: eventName;

	// Basic info items
	const basicItems: { label: string; value: string }[] = [
		{ label: "Artist Name", value: name },
		{ label: "Style", value: data.style || "—" },
	];
	if (data.performanceType)
		basicItems.push({ label: "Type", value: data.performanceType });
	if (data.email) basicItems.push({ label: "Email", value: data.email });
	if (data.phone) basicItems.push({ label: "Phone", value: data.phone });
	if (data.whatsapp)
		basicItems.push({ label: "WhatsApp", value: data.whatsapp });
	if (data.managedBy)
		basicItems.push({ label: "Managed By", value: data.managedBy });

	// Nationality
	const nats: string[] = [];
	if (data.countryLiving) nats.push(`Living: ${data.countryLiving}`);
	if (data.homeCountry) nats.push(`Home: ${data.homeCountry}`);
	const mems = data.members || data.memberNationalities || [];
	mems.forEach((m) => {
		const p: string[] = [];
		if (m.countryLiving) p.push(`Living: ${m.countryLiving}`);
		if (m.homeCountry) p.push(`Home: ${m.homeCountry}`);
		if (p.length) nats.push(`${m.name}: ${p.join(", ")}`);
	});
	if (nats.length)
		basicItems.push({ label: "Nationality", value: nats.join(" | ") });

	// T-shirt
	if (data.tshirtSizes && data.tshirtSizes.length > 0) {
		basicItems.push({
			label: "T-Shirt",
			value: data.tshirtSizes
				.map((t) => `${t.name}: ${t.size} (${t.fit})`)
				.join(", "),
		});
	}

	const dur = data.performanceDuration || data.performance_duration || 0;
	if (dur > 0) {
		basicItems.push({
			label: "Duration",
			value: `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`,
		});
	}
	if (data.showLink)
		basicItems.push({ label: "Show Link", value: data.showLink });

	// Music items
	const musicItems: { label: string; value: string }[] = [];
	if (data.musicTrack) {
		if (data.musicTrack.song_title)
			musicItems.push({
				label: "Song Title",
				value: data.musicTrack.song_title,
			});
		if (data.musicTrack.duration) {
			const d = data.musicTrack.duration;
			musicItems.push({
				label: "Duration",
				value: `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, "0")}`,
			});
		}
		if (data.musicTrack.tempo)
			musicItems.push({ label: "Tempo", value: data.musicTrack.tempo });
		if (data.musicTrack.notes)
			musicItems.push({
				label: "Music Notes",
				value: data.musicTrack.notes,
			});
	}

	// Colors
	const costumeColors = [
		data.manualCostumeColor || data.costumeColor,
		data.manualCostumeColorTwo || data.costumeColorTwo,
		data.manualCostumeColorThree || data.costumeColorThree,
		data.customCostumeColor,
	].filter(Boolean) as string[];

	const lightColors = [
		data.manualLightColor || data.lightColorSingle,
		data.manualLightColorTwo || data.lightColorTwo,
		data.manualLightColorThree || data.lightColorThree,
	].filter(Boolean) as string[];

	const hasColors =
		costumeColors.length > 0 ||
		lightColors.length > 0 ||
		!!data.lightRequests;

	// Equipment
	const equipment = data.equipment;
	const props = data.propsNeeded || data.props_needed;

	// Notes
	const mcNotes = data.mcNotes || data.mc_notes || "";
	const smNotes = data.stageManagerNotes || data.stage_manager_notes || "";
	const artistNotes =
		data.artistNotes || data.artist_notes || data.notes || "";

	// Social
	const socialItems: { label: string; value: string }[] = [];
	if (data.socialMedia) {
		if (data.socialMedia.instagram)
			socialItems.push({
				label: "Instagram",
				value: data.socialMedia.instagram,
			});
		if (data.socialMedia.facebook)
			socialItems.push({
				label: "Facebook",
				value: data.socialMedia.facebook,
			});
		if (data.socialMedia.youtube)
			socialItems.push({
				label: "YouTube",
				value: data.socialMedia.youtube,
			});
		if (data.socialMedia.tiktok)
			socialItems.push({
				label: "TikTok",
				value: data.socialMedia.tiktok,
			});
		if (data.socialMedia.website)
			socialItems.push({
				label: "Website",
				value: data.socialMedia.website,
			});
	}

	// Get initial for placeholder
	const initial = name.charAt(0).toUpperCase();

	return (
		<Document>
			<Page size="A4" style={s.page}>
				{/* ── Header ── */}
				<View style={s.headerGradient}>
					{/* Top row: logo */}
					<View style={s.headerTopRow}>
						<View style={s.headerLogoArea}>
							{logoUri ? (
								<Image src={logoUri} style={s.logoImg} />
							) : null}
							<Text style={s.logoBrand}>FAME</Text>
							<View style={s.logoBadge}>
								<Text style={s.logoBadgeText}>LINK</Text>
							</View>
						</View>
					</View>

					{/* Profile row */}
					<View style={s.headerProfileRow}>
						{profileImageUri ? (
							<Image
								src={profileImageUri}
								style={s.profileImg}
							/>
						) : (
							<View style={s.profilePlaceholder}>
								<Text style={s.profilePlaceholderText}>
									{initial}
								</Text>
							</View>
						)}
						<View style={s.headerInfo}>
							<Text style={s.headerTitle}>{name}</Text>
							<Text style={s.headerSub}>{subtitle}</Text>
						</View>
					</View>
				</View>
				<View style={s.headerAccent} />

				{/* ── Content ── */}
				<View style={s.content}>
					{/* Basic Info */}
					<Section title="Basic Information" icon="i" />
					<InfoTable items={basicItems} />

					{/* Biography */}
					{data.biography && (
						<>
							<Section title="Biography" icon="B" />
							<View style={s.textCard}>
								<Text style={s.textBody}>
									{data.biography}
								</Text>
							</View>
						</>
					)}

					{/* Music */}
					{musicItems.length > 0 && (
						<>
							<Section title="Music" icon="♪" />
							<InfoTable items={musicItems} />
						</>
					)}

					{/* Costume & Lighting */}
					{hasColors && (
						<>
							<Section title="Costume & Lighting" icon="C" />
							<View style={s.card}>
								<View style={{ padding: 12 }}>
									{costumeColors.length > 0 && (
										<ColorSwatches
											label="Costume Colors"
											colors={costumeColors}
										/>
									)}
									{lightColors.length > 0 && (
										<ColorSwatches
											label="Light Colors"
											colors={lightColors}
											notes={data.lightRequests}
										/>
									)}
									{!lightColors.length &&
										data.lightRequests && (
											<Text
												style={{
													fontSize: 7.5,
													color: c.textSec,
													fontStyle: "italic",
												}}
											>
												Light Requests:{" "}
												{data.lightRequests}
											</Text>
										)}
								</View>
							</View>
						</>
					)}

					{/* Stage Position */}
					{(data.stagePositionStart || data.stagePositionEnd) && (
						<>
							<Section title="Stage Position" icon="S" />
							<StagePositionGraphic
								start={
									data.stagePositionStart || "center"
								}
								end={
									data.stagePositionEnd ||
									data.stagePositionStart ||
									"center"
								}
							/>
						</>
					)}

					{/* Equipment & Props */}
					{(equipment || props) && (
						<>
							<Section title="Equipment & Props" icon="E" />
							<InfoTable
								items={[
									...(equipment
										? [
												{
													label: "Equipment",
													value: equipment,
												},
											]
										: []),
									...(props
										? [
												{
													label: "Props",
													value: props,
												},
											]
										: []),
								]}
							/>
						</>
					)}

					{/* Notes — always shown */}
					<Section title="Notes" icon="N" />
					<NoteBox
						label="MC Notes"
						text={mcNotes}
						color={c.purple}
					/>
					<NoteBox
						label="Stage Manager Notes"
						text={smNotes}
						color={c.pink}
					/>
					{artistNotes && (
						<NoteBox
							label="Artist Notes"
							text={artistNotes}
							color={c.green}
						/>
					)}

					{/* Social Media */}
					{socialItems.length > 0 && (
						<>
							<Section title="Social Media" icon="@" />
							<InfoTable items={socialItems} />
						</>
					)}

					{/* Gallery */}
					{galleryImageUris && galleryImageUris.length > 0 && (
						<>
							<Section title="Gallery" icon="G" />
							<View style={s.galleryGrid}>
								{galleryImageUris.map((uri, i) => (
									<View key={i} style={s.galleryItem}>
										<Image
											src={uri}
											style={s.galleryImg}
										/>
									</View>
								))}
							</View>
						</>
					)}
				</View>

				{/* ── Footer ── */}
				<Footer />
			</Page>
		</Document>
	);
}
