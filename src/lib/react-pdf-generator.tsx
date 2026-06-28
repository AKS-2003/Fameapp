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
	renderToBuffer,
} from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────

export interface ShowPDFData {
	artistName: string;
	realName?: string;
	email?: string;
	phone?: string;
	whatsapp?: string;
	managedBy?: string;
	style?: string;
	performanceType?: string;
	biography?: string;
	notes?: string;
	showLink?: string;
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};
	costumeColors: string[];
	lightColors: string[];
	lightRequests?: string;
	stagePositionStart?: string;
	stagePositionEnd?: string;
	equipment?: string;
	propsNeeded?: string;
	mcNotes?: string;
	stageManagerNotes?: string;
	artistNotes?: string;
	nationalities: string[];
	tshirtSizes?: string;
	duration?: string;
	musicTrack?: {
		song_title?: string;
		duration?: string;
		tempo?: string;
		notes?: string;
	};
	profileImageBase64?: string;
	galleryImagesBase64?: string[];
	createdAt?: string;
}

// ─── Colors ──────────────────────────────────────────────

const c = {
	purple: "#8B5CF6",
	purpleDark: "#6D28D9",
	purpleLight: "#EDE9FE",
	purpleXLight: "#F5F3FF",
	pink: "#EC4899",
	pinkLight: "#FCE7F3",
	green: "#10B981",
	greenLight: "#D1FAE5",
	red: "#EF4444",
	redLight: "#FEE2E2",
	amber: "#F59E0B",
	text: "#111827",
	textSec: "#4B5563",
	textMuted: "#9CA3AF",
	white: "#FFFFFF",
	bg: "#F9FAFB",
	bgCard: "#FFFFFF",
	border: "#E5E7EB",
	borderLight: "#F3F4F6",
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

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
	page: {
		backgroundColor: c.white,
		paddingBottom: 50,
		fontFamily: "Helvetica",
	},
	// Header
	header: {
		backgroundColor: c.purpleDark,
		paddingHorizontal: 32,
		paddingTop: 24,
		paddingBottom: 20,
		position: "relative",
	},
	headerPinkBar: { height: 3, backgroundColor: c.pink },
	headerTitle: {
		fontSize: 22,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		marginBottom: 4,
	},
	headerSubtitle: { fontSize: 10, color: "#DDD6FE", fontFamily: "Helvetica" },
	headerLogo: {
		position: "absolute",
		top: 12,
		right: 32,
		flexDirection: "column",
		alignItems: "center",
	},
	headerLogoText: {
		fontSize: 16,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		letterSpacing: 2,
	},
	headerLogoBadge: {
		backgroundColor: "#1a1a2e",
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
		marginTop: -4,
	},
	headerLogoBadgeText: {
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: c.white,
		letterSpacing: 1,
	},
	profileImgWrap: {
		position: "absolute",
		top: 10,
		right: 100,
		width: 52,
		height: 52,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: c.white,
		overflow: "hidden",
	},
	profileImg: { width: 52, height: 52 },
	// Body
	body: { paddingHorizontal: 32, paddingTop: 16 },
	// Section
	sectionWrap: { marginTop: 14, marginBottom: 6 },
	sectionPill: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: c.purpleLight,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 4,
		alignSelf: "flex-start",
	},
	sectionIcon: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: c.purple,
		marginRight: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	sectionIconText: {
		fontSize: 7,
		color: c.white,
		fontFamily: "Helvetica-Bold",
		textAlign: "center",
	},
	sectionTitle: {
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: c.purpleDark,
		letterSpacing: 1,
	},
	// Info table
	tableCard: {
		borderWidth: 0.5,
		borderColor: c.border,
		borderRadius: 6,
		overflow: "hidden",
		marginTop: 6,
	},
	tableAccent: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		width: 3,
		backgroundColor: c.purple,
		borderTopLeftRadius: 6,
		borderBottomLeftRadius: 6,
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 5,
		paddingLeft: 12,
		paddingRight: 8,
		borderBottomWidth: 0.5,
		borderBottomColor: c.borderLight,
	},
	tableRowAlt: { backgroundColor: c.bg },
	tableLabel: {
		width: 100,
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: c.textSec,
	},
	tableValue: {
		flex: 1,
		fontSize: 8,
		fontFamily: "Helvetica",
		color: c.text,
	},
	// Text block
	textCard: {
		backgroundColor: c.bgCard,
		borderWidth: 0.5,
		borderColor: c.borderLight,
		borderRadius: 6,
		padding: 10,
		marginTop: 6,
	},
	textContent: {
		fontSize: 9,
		fontFamily: "Helvetica",
		color: c.text,
		lineHeight: 1.5,
	},
	// Notes
	noteCard: {
		flexDirection: "row",
		borderRadius: 6,
		overflow: "hidden",
		marginTop: 6,
		borderWidth: 0.5,
		borderColor: c.border,
	},
	noteAccent: { width: 4 },
	noteBody: { flex: 1, padding: 10 },
	noteLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
	noteText: { fontSize: 8, fontFamily: "Helvetica", lineHeight: 1.5 },
	// Color swatches
	swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
	swatchItem: { alignItems: "center" },
	swatchBox: {
		width: 28,
		height: 28,
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: c.border,
	},
	swatchLabel: {
		fontSize: 6,
		color: c.textSec,
		marginTop: 2,
		fontFamily: "Helvetica",
	},
	// Gallery
	galleryGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 6,
	},
	galleryItem: {
		width: "31%",
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: c.border,
		overflow: "hidden",
	},
	galleryImg: { width: "100%", height: 100, objectFit: "cover" },
	// Footer
	footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 32 },
	footerBar: {
		backgroundColor: c.purpleDark,
		height: 24,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 32,
		marginTop: 8,
	},
	footerPinkLine: { height: 1, backgroundColor: c.pink },
	footerText: { fontSize: 7, color: "#DDD6FE", fontFamily: "Helvetica" },
	footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: c.white },
});

// ─── Sub-components ──────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
	return (
		<View style={s.sectionWrap}>
			<View style={s.sectionPill}>
				<View style={s.sectionIcon}>
					<Text style={s.sectionIconText}>{icon}</Text>
				</View>
				<Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
			</View>
		</View>
	);
}

function InfoTable({ items }: { items: { label: string; value: string }[] }) {
	return (
		<View style={s.tableCard}>
			<View style={s.tableAccent} />
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
	accent,
}: {
	label: string;
	text?: string;
	accent: string;
}) {
	const isEmpty = !text || !text.trim();
	const content = isEmpty ? "No notes provided" : text;
	return (
		<View style={s.noteCard} wrap={false}>
			<View style={[s.noteAccent, { backgroundColor: accent }]} />
			<View style={s.noteBody}>
				<Text style={[s.noteLabel, { color: accent }]}>{label}</Text>
				<Text
					style={[
						s.noteText,
						{
							color: isEmpty ? c.textMuted : c.text,
							fontFamily: isEmpty
								? "Helvetica-Oblique"
								: "Helvetica",
						},
					]}
				>
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
		<View style={{ marginTop: 4 }}>
			<Text
				style={{
					fontSize: 8,
					fontFamily: "Helvetica-Bold",
					color: c.textSec,
					marginBottom: 4,
				}}
			>
				{label}
			</Text>
			<View style={s.swatchRow}>
				{valid.map((color, i) => (
					<View key={i} style={s.swatchItem}>
						<View
							style={[
								s.swatchBox,
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
						fontSize: 7,
						fontFamily: "Helvetica-Oblique",
						color: c.textSec,
						marginTop: 4,
					}}
				>
					Notes: {notes}
				</Text>
			)}
		</View>
	);
}

function StagePositionGraphic({ start, end }: { start: string; end: string }) {
	const posMap: Record<string, { x: number; y: number }> = {
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
	const sp = posMap[start] || posMap["center"] || { x: 50, y: 50 };
	const ep = posMap[end] || posMap["center"] || { x: 50, y: 50 };
	const showLine = start && end && start !== end;
	const W = 540;
	const H = 160;
	const PAD = 30;
	const sx = PAD + (sp.x / 100) * (W - PAD * 2);
	const sy = PAD + (sp.y / 100) * (H - PAD * 2);
	const ex = PAD + (ep.x / 100) * (W - PAD * 2);
	const ey = PAD + (ep.y / 100) * (H - PAD * 2);

	const formatPos = (pos: string) =>
		pos
			.split("-")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");

	return (
		<View style={{ marginTop: 6 }} wrap={false}>
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
					width: "100%",
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
					{/* Movement line */}
					{showLine && (
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
							<Circle cx={sx} cy={sy} r={10} fill={c.white} />
							<Circle cx={sx} cy={sy} r={7} fill={c.green} />
						</>
					)}

					{/* End dot — red with white border */}
					{showLine && (
						<>
							<Circle cx={ex} cy={ey} r={10} fill={c.white} />
							<Circle cx={ex} cy={ey} r={7} fill="#F87171" />
						</>
					)}
				</Svg>
			</View>

			{/* Legend */}
			<View style={{ flexDirection: "row", gap: 20, marginTop: 8 }}>
				{start && (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 5,
						}}
					>
						<View
							style={{
								width: 8,
								height: 8,
								borderRadius: 4,
								backgroundColor: c.green,
							}}
						/>
						<Text style={{ fontSize: 8, color: c.textSec }}>
							Start: {formatPos(start)}
						</Text>
					</View>
				)}
				{showLine && (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 5,
						}}
					>
						<View
							style={{
								width: 8,
								height: 8,
								borderRadius: 4,
								backgroundColor: "#F87171",
							}}
						/>
						<Text style={{ fontSize: 8, color: c.textSec }}>
							End: {formatPos(end)}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
}

// ─── Footer ──────────────────────────────────────────────

function PageFooter() {
	const dateStr = new Date().toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	return (
		<View style={s.footer} fixed>
			<View style={s.footerPinkLine} />
			<View style={s.footerBar}>
				<Text style={s.footerBrand}>FAMELINK</Text>
				<Text style={s.footerText}>Generated {dateStr}</Text>
				<Text
					render={({ pageNumber, totalPages }) =>
						`${pageNumber} / ${totalPages}`
					}
					style={s.footerText}
				/>
			</View>
		</View>
	);
}

// ─── Main Document ───────────────────────────────────────

function ShowProfileDocument({
	data,
	logoBase64,
}: {
	data: ShowPDFData;
	logoBase64?: string;
}) {
	const hasProfile = !!data.profileImageBase64;

	return (
		<Document>
			<Page size="A4" style={s.page}>
				<PageFooter />

				{/* ── Header ── */}
				<View style={s.header}>
					{/* Logo area (top-right) */}
					<View style={s.headerLogo}>
						{logoBase64 ? (
							<Image
								src={logoBase64}
								style={{
									width: 40,
									height: 40,
									borderRadius: 6,
								}}
							/>
						) : (
							<Text style={s.headerLogoText}>FAME</Text>
						)}
						<View style={s.headerLogoBadge}>
							<Text style={s.headerLogoBadgeText}>link</Text>
						</View>
					</View>

					{/* Profile image */}
					{hasProfile && (
						<View style={s.profileImgWrap}>
							<Image
								src={data.profileImageBase64!}
								style={s.profileImg}
							/>
						</View>
					)}

					<Text style={s.headerTitle}>{data.artistName}</Text>
					<Text style={s.headerSubtitle}>
						{data.realName && data.realName !== data.artistName
							? `${data.realName}  •  `
							: ""}
						FameLink Show Profile
					</Text>
				</View>
				<View style={s.headerPinkBar} />

				{/* ── Body ── */}
				<View style={s.body}>
					{/* Basic Information */}
					<SectionHeader title="Basic Information" icon="i" />
					<InfoTable
						items={[
							{ label: "Artist Name", value: data.artistName },
							{ label: "Style", value: data.style || "—" },
							...(data.performanceType
								? [
										{
											label: "Type",
											value: data.performanceType,
										},
									]
								: []),
							...(data.email
								? [{ label: "Email", value: data.email }]
								: []),
							...(data.phone
								? [{ label: "Phone", value: data.phone }]
								: []),
							...(data.whatsapp
								? [{ label: "WhatsApp", value: data.whatsapp }]
								: []),
							...(data.managedBy
								? [
										{
											label: "Managed By",
											value: data.managedBy,
										},
									]
								: []),
							...(data.nationalities.length > 0
								? [
										{
											label: "Nationality",
											value: data.nationalities.join(
												" | ",
											),
										},
									]
								: []),
							...(data.tshirtSizes
								? [
										{
											label: "T-Shirt",
											value: data.tshirtSizes,
										},
									]
								: []),
							...(data.duration
								? [{ label: "Duration", value: data.duration }]
								: []),
							...(data.showLink
								? [{ label: "Show Link", value: data.showLink }]
								: []),
						]}
					/>

					{/* Biography */}
					{data.biography && (
						<>
							<SectionHeader title="Biography" icon="B" />
							<View style={s.textCard}>
								<Text style={s.textContent}>
									{data.biography}
								</Text>
							</View>
						</>
					)}

					{/* Music */}
					{data.musicTrack && (
						<>
							<SectionHeader title="Music" icon="M" />
							<InfoTable
								items={[
									...(data.musicTrack.song_title
										? [
												{
													label: "Song Title",
													value: data.musicTrack
														.song_title,
												},
											]
										: []),
									...(data.musicTrack.duration
										? [
												{
													label: "Duration",
													value: data.musicTrack
														.duration,
												},
											]
										: []),
									...(data.musicTrack.tempo
										? [
												{
													label: "Tempo",
													value: data.musicTrack
														.tempo,
												},
											]
										: []),
									...(data.musicTrack.notes
										? [
												{
													label: "Music Notes",
													value: data.musicTrack
														.notes,
												},
											]
										: []),
								]}
							/>
						</>
					)}

					{/* Costume & Lighting */}
					{(data.costumeColors.length > 0 ||
						data.lightColors.length > 0 ||
						data.lightRequests) && (
						<>
							<SectionHeader
								title="Costume & Lighting"
								icon="C"
							/>
							<View
								style={{
									backgroundColor: c.bgCard,
									borderWidth: 0.5,
									borderColor: c.border,
									borderRadius: 6,
									padding: 12,
									marginTop: 6,
								}}
							>
								{data.costumeColors.length > 0 && (
									<ColorSwatches
										label="Costume Colors"
										colors={data.costumeColors}
									/>
								)}
								{data.lightColors.length > 0 && (
									<ColorSwatches
										label="Light Colors"
										colors={data.lightColors}
										notes={data.lightRequests}
									/>
								)}
								{data.lightColors.length === 0 &&
									data.lightRequests && (
										<Text
											style={{
												fontSize: 8,
												fontFamily: "Helvetica-Oblique",
												color: c.textSec,
											}}
										>
											Light Requests: {data.lightRequests}
										</Text>
									)}
							</View>
						</>
					)}

					{/* Stage Position */}
					{(data.stagePositionStart || data.stagePositionEnd) && (
						<>
							<SectionHeader title="Stage Position" icon="S" />
							<StagePositionGraphic
								start={data.stagePositionStart || "center"}
								end={
									data.stagePositionEnd ||
									data.stagePositionStart ||
									"center"
								}
							/>
						</>
					)}

					{/* Equipment & Props */}
					{(data.equipment || data.propsNeeded) && (
						<>
							<SectionHeader title="Equipment & Props" icon="E" />
							<InfoTable
								items={[
									...(data.equipment
										? [
												{
													label: "Equipment",
													value: data.equipment,
												},
											]
										: []),
									...(data.propsNeeded
										? [
												{
													label: "Props",
													value: data.propsNeeded,
												},
											]
										: []),
								]}
							/>
						</>
					)}

					{/* Notes — always shown */}
					<SectionHeader title="Notes" icon="N" />
					<NoteBox
						label="MC Notes"
						text={data.mcNotes}
						accent={c.purple}
					/>
					<NoteBox
						label="Stage Manager Notes"
						text={data.stageManagerNotes}
						accent={c.pink}
					/>
					{data.artistNotes && (
						<NoteBox
							label="Artist Notes"
							text={data.artistNotes}
							accent={c.green}
						/>
					)}

					{/* Social Media */}
					{data.socialMedia &&
						(() => {
							const sm = data.socialMedia!;
							const items = [
								...(sm.instagram
									? [
											{
												label: "Instagram",
												value: sm.instagram,
											},
										]
									: []),
								...(sm.facebook
									? [
											{
												label: "Facebook",
												value: sm.facebook,
											},
										]
									: []),
								...(sm.youtube
									? [{ label: "YouTube", value: sm.youtube }]
									: []),
								...(sm.tiktok
									? [{ label: "TikTok", value: sm.tiktok }]
									: []),
								...(sm.website
									? [{ label: "Website", value: sm.website }]
									: []),
							];
							if (items.length === 0) return null;
							return (
								<>
									<SectionHeader
										title="Social Media"
										icon="@"
									/>
									<InfoTable items={items} />
								</>
							);
						})()}

					{/* Gallery */}
					{data.galleryImagesBase64 &&
						data.galleryImagesBase64.length > 0 && (
							<>
								<SectionHeader title="Gallery" icon="G" />
								<View style={s.galleryGrid}>
									{data.galleryImagesBase64.map((img, i) => (
										<View key={i} style={s.galleryItem}>
											<Image
												src={img}
												style={s.galleryImg}
											/>
										</View>
									))}
								</View>
							</>
						)}
				</View>
			</Page>
		</Document>
	);
}

// ─── Helper: ArrayBuffer → base64 data URI ───────────────

function bufferToBase64(buf: ArrayBuffer, mime = "image/jpeg"): string {
	const bytes = new Uint8Array(buf);
	// Detect format
	if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = "image/png";
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return `data:${mime};base64,${btoa(binary)}`;
}

// ─── Public API ──────────────────────────────────────────

export interface GenerateShowPDFInput {
	show: {
		name: string;
		realName?: string;
		email?: string;
		phone?: string;
		whatsapp?: string;
		managedBy?: string;
		style?: string;
		performanceType?: string;
		biography?: string;
		description?: string;
		notes?: string;
		showLink?: string;
		socialMedia?: {
			instagram?: string;
			facebook?: string;
			youtube?: string;
			tiktok?: string;
			website?: string;
		};
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
		mcNotes?: string;
		stageManagerNotes?: string;
		artistNotes?: string;
		countryLiving?: string;
		homeCountry?: string;
		members?: Array<{
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
		duration?: number;
		createdAt?: string;
	};
	profileImageBuffer?: ArrayBuffer;
	galleryImageBuffers?: ArrayBuffer[];
	logoBuffer?: ArrayBuffer;
}

export async function generateShowPDF(
	input: GenerateShowPDFInput,
): Promise<Buffer> {
	const { show, profileImageBuffer, galleryImageBuffers, logoBuffer } = input;

	// Build nationalities
	const nats: string[] = [];
	if (show.countryLiving) nats.push(`Living: ${show.countryLiving}`);
	if (show.homeCountry) nats.push(`Home: ${show.homeCountry}`);
	if (show.members) {
		show.members.forEach((m) => {
			const p: string[] = [];
			if (m.countryLiving) p.push(`Living: ${m.countryLiving}`);
			if (m.homeCountry) p.push(`Home: ${m.homeCountry}`);
			if (p.length) nats.push(`${m.name}: ${p.join(", ")}`);
		});
	}

	// Duration
	const dur = show.musicTrack?.duration || show.duration || 0;
	const durStr =
		dur > 0
			? `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, "0")}`
			: "";

	// T-shirt
	const tshirt =
		show.tshirtSizes && show.tshirtSizes.length > 0
			? show.tshirtSizes
					.map((t) => `${t.name}: ${t.size} (${t.fit})`)
					.join(", ")
			: undefined;

	// Music track formatted
	const mt = show.musicTrack;
	const musicData = mt
		? {
				song_title: mt.song_title || undefined,
				duration: mt.duration
					? `${Math.floor(mt.duration / 60)}:${(mt.duration % 60).toString().padStart(2, "0")}`
					: undefined,
				tempo: mt.tempo || undefined,
				notes: mt.notes || undefined,
			}
		: undefined;
	// Only include if there's actual data
	const hasMusicData =
		musicData &&
		(musicData.song_title ||
			musicData.duration ||
			musicData.tempo ||
			musicData.notes);

	// Colors
	const costumeColors = [
		show.manualCostumeColor || show.costumeColor,
		show.manualCostumeColorTwo || show.costumeColorTwo,
		show.manualCostumeColorThree || show.costumeColorThree,
		show.customCostumeColor,
	].filter(Boolean) as string[];

	const lightColors = [
		show.manualLightColor || show.lightColorSingle,
		show.manualLightColorTwo || show.lightColorTwo,
		show.manualLightColorThree || show.lightColorThree,
	].filter(Boolean) as string[];

	const data: ShowPDFData = {
		artistName: show.name || "Artist",
		realName: show.realName,
		email: show.email,
		phone: show.phone,
		whatsapp: show.whatsapp,
		managedBy: show.managedBy,
		style: show.style,
		performanceType: show.performanceType,
		biography: show.biography || show.description,
		notes: show.notes,
		showLink: show.showLink,
		socialMedia: show.socialMedia,
		costumeColors,
		lightColors,
		lightRequests: show.lightRequests,
		stagePositionStart: show.stagePositionStart,
		stagePositionEnd: show.stagePositionEnd,
		equipment: show.equipment,
		propsNeeded: show.propsNeeded,
		mcNotes: show.mcNotes,
		stageManagerNotes: show.stageManagerNotes,
		artistNotes: show.artistNotes || show.notes,
		nationalities: nats,
		tshirtSizes: tshirt,
		duration: durStr || undefined,
		musicTrack: hasMusicData ? musicData : undefined,
		profileImageBase64: profileImageBuffer
			? bufferToBase64(profileImageBuffer)
			: undefined,
		galleryImagesBase64: galleryImageBuffers?.map((buf) =>
			bufferToBase64(buf),
		),
		createdAt: show.createdAt,
	};

	const logoBase64 = logoBuffer
		? bufferToBase64(logoBuffer, "image/png")
		: undefined;

	const buffer = await renderToBuffer(
		<ShowProfileDocument data={data} logoBase64={logoBase64} />,
	);

	return buffer;
}
