import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
	page: {
		padding: 24,
		paddingBottom: 90,
		fontFamily: "Helvetica",
		backgroundColor: "#ffffff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		paddingBottom: 6,
		borderBottomWidth: 2,
		borderBottomColor: "#1a1a1a",
	},
	logo: {
		width: 40,
		height: 40,
		marginRight: 10,
	},
	headerText: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontFamily: "Helvetica-Bold",
		color: "#1a1a1a",
	},
	subtitle: {
		fontSize: 10,
		color: "#666666",
		marginTop: 2,
	},
	timingRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		alignItems: "center",
		gap: 12,
	},
	timingBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f3f4f6",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	timingLabel: {
		fontSize: 7,
		color: "#666666",
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
		marginRight: 4,
	},
	timingValue: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: "#1a1a1a",
	},
	// Table header
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#1a1a1a",
		paddingVertical: 4,
		paddingHorizontal: 6,
		borderRadius: 4,
		marginBottom: 2,
	},
	thOrder: {
		width: 28,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	thName: {
		flex: 1,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	thStyle: {
		width: 100,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	thTime: {
		width: 36,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	thDuration: {
		width: 50,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
		textAlign: "right",
	},
	thCountry: {
		width: 80,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: "#ffffff",
		textTransform: "uppercase",
	},
	// Table rows
	row: {
		flexDirection: "row",
		paddingVertical: 3,
		paddingHorizontal: 6,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		alignItems: "center",
		minHeight: 20,
	},
	rowAlt: {
		backgroundColor: "#f9fafb",
	},
	rowCue: {
		backgroundColor: "#fffbeb",
	},
	cellOrder: {
		width: 28,
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: "#374151",
	},
	cellTime: {
		width: 36,
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: "#6b7280",
	},
	cellName: {
		flex: 1,
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: "#1a1a1a",
	},
	cellNameCue: {
		flex: 1,
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: "#92400e",
	},
	cueTag: {
		fontSize: 6,
		fontFamily: "Helvetica-Bold",
		color: "#92400e",
		backgroundColor: "#fef3c7",
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 2,
		marginRight: 4,
		textTransform: "uppercase",
	},
	cellStyle: {
		width: 100,
		fontSize: 8,
		color: "#6b7280",
	},
	cellDuration: {
		width: 50,
		fontSize: 8,
		color: "#6b7280",
		textAlign: "right",
	},
	cellCountry: {
		width: 80,
		fontSize: 8,
		color: "#6b7280",
	},
	footer: {
		position: "absolute",
		bottom: 16,
		left: 24,
		right: 24,
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	footerTimingRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 6,
		backgroundColor: "#f8f9fa",
		borderRadius: 6,
		marginBottom: 4,
	},
	footerTimingBox: {
		alignItems: "center",
	},
	footerTimingLabel: {
		fontSize: 8,
		color: "#666666",
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	footerTimingValue: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		color: "#1a1a1a",
	},
	motivationBox: {
		paddingVertical: 4,
		paddingHorizontal: 10,
		backgroundColor: "#f0f9ff",
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: "#3b82f6",
		marginBottom: 4,
	},
	motivationText: {
		fontSize: 8,
		color: "#1e40af",
		textAlign: "center",
	},
	footerMeta: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	footerText: {
		fontSize: 7,
		color: "#9ca3af",
	},
	pageNumber: {
		fontSize: 7,
		color: "#9ca3af",
	},
});

interface PerformanceOrderPDFProps {
	eventName: string;
	eventDate: string;
	performances: Array<{
		id: string;
		type: "artist" | "cue";
		order: number;
		name: string;
		style?: string;
		duration: number;
		plannedTime?: string;
		homeCountry?: string;
		homeCountryName?: string;
		homeCountryFlag?: string;
		countryLiving?: string;
		countryLivingName?: string;
		countryLivingFlag?: string;
		cueType?: string;
	}>;
	backstageReadyTime?: string;
	showStartTime?: string;
	venue?: string;
	logoBase64?: string;
}

const ITEMS_PER_FIRST_PAGE = 35;
const ITEMS_PER_CONTINUATION = 40;

export const PerformanceOrderPDF: React.FC<PerformanceOrderPDFProps> = ({
	eventName,
	eventDate,
	performances,
	backstageReadyTime,
	showStartTime,
	venue,
	logoBase64,
}) => {
	const motivationalQuotes = [
		"The magic begins backstage. Let's make every moment count.",
		"Excellence is not a skill, it's an attitude. Let's shine tonight!",
		"Every performance is a gift. Let's give our best to the audience.",
		"Together we create magic. Let's make this show unforgettable!",
		"The stage is set, the lights are ready. Time to create memories!",
	];
	const randomQuote =
		motivationalQuotes[
			Math.floor(Math.random() * motivationalQuotes.length)
		];
	// Split performances into pages
	const pages: Array<typeof performances> = [];
	if (performances.length <= ITEMS_PER_FIRST_PAGE) {
		pages.push(performances);
	} else {
		pages.push(performances.slice(0, ITEMS_PER_FIRST_PAGE));
		let remaining = performances.slice(ITEMS_PER_FIRST_PAGE);
		while (remaining.length > 0) {
			pages.push(remaining.slice(0, ITEMS_PER_CONTINUATION));
			remaining = remaining.slice(ITEMS_PER_CONTINUATION);
		}
	}

	const totalSeconds = performances.reduce((acc, p) => acc + (p.duration || 0), 0);
	const totalPages = pages.length;

	const hasCountryData = performances.some(
		(p) => p.homeCountryName || p.countryLivingName,
	);

	const hasPlannedTimes = performances.some((p) => p.plannedTime);

	const renderTableHeader = () => (
		<View style={styles.tableHeader}>
			<Text style={styles.thOrder}>#</Text>
			{hasPlannedTimes && <Text style={styles.thTime}>Time</Text>}
			<Text style={styles.thName}>Name</Text>
			<Text style={styles.thStyle}>Style</Text>
			{hasCountryData && <Text style={styles.thCountry}>Country</Text>}
			<Text style={styles.thDuration}>Duration</Text>
		</View>
	);

	const renderRow = (
		performance: (typeof performances)[0],
		index: number,
	) => {
		const isCue = performance.type === "cue";
		const isAlt = index % 2 === 1;
		const country =
			performance.homeCountryName || performance.countryLivingName || "";
		const flag =
			performance.homeCountryFlag || performance.countryLivingFlag || "";

		// Calculate show number for artists (count only artists before this index)
		const showNumber = !isCue
			? performances.filter((p, i) => i < index && p.type === "artist")
					.length + 1
			: 0;

		return (
			<View
				key={performance.id}
				style={[
					styles.row,
					isAlt && !isCue ? styles.rowAlt : {},
					isCue ? styles.rowCue : {},
				]}
			>
				<Text style={styles.cellOrder}>#{performance.order}</Text>
				{hasPlannedTimes && (
					<Text style={styles.cellTime}>
						{performance.plannedTime || ""}
					</Text>
				)}
				{isCue ? (
					<View
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
						}}
					>
						<Text style={styles.cueTag}>
							{performance.cueType || "CUE"}
						</Text>
						<Text style={styles.cellNameCue}>
							{performance.name}
						</Text>
					</View>
				) : (
					<View
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
						}}
					>
						<Text
							style={{
								fontSize: 5,
								fontFamily: "Helvetica-Bold",
								color: "#ffffff",
								backgroundColor: "#22c55e",
								paddingHorizontal: 3,
								paddingVertical: 1,
								borderRadius: 2,
								marginRight: 4,
								textTransform: "uppercase",
							}}
						>
							SHOW {showNumber}
						</Text>
						<Text style={styles.cellName}>{performance.name}</Text>
					</View>
				)}
				<Text style={styles.cellStyle}>
					{performance.style || (isCue ? "" : "")}
				</Text>
				{hasCountryData && (
					<Text style={styles.cellCountry}>{country}</Text>
				)}
				<Text style={styles.cellDuration}>
					{formatDuration(performance.duration)}
				</Text>
			</View>
		);
	};

	return (
		<Document>
			{pages.map((pageItems, pageIndex) => (
				<Page key={pageIndex} size="A4" style={styles.page}>
					{/* Header — only on first page */}
					{pageIndex === 0 && (
						<>
							<View style={styles.header}>
								{logoBase64 && (
									<Image
										src={logoBase64}
										style={styles.logo}
									/>
								)}
								<View style={styles.headerText}>
									<Text style={styles.title}>
										Performance Order — {eventName}
									</Text>
									<Text style={styles.subtitle}>
										{eventDate}
										{venue ? ` • ${venue}` : ""}
									</Text>
								</View>
								<View style={styles.timingRow}>
									{backstageReadyTime && (
										<View style={styles.timingBadge}>
											<Text
												style={styles.timingLabel}
											>
												Ready
											</Text>
											<Text
												style={styles.timingValue}
											>
												{backstageReadyTime}
											</Text>
										</View>
									)}
									{showStartTime && (
										<View style={styles.timingBadge}>
											<Text
												style={styles.timingLabel}
											>
												Start
											</Text>
											<Text
												style={styles.timingValue}
											>
												{showStartTime}
											</Text>
										</View>
									)}
									<View style={styles.timingBadge}>
										<Text
											style={styles.timingLabel}
										>
											Total Time
										</Text>
										<Text
											style={styles.timingValue}
										>
											{formatDuration(totalSeconds)}
										</Text>
									</View>
								</View>
							</View>
						</>
					)}

					{/* Continuation header for page 2+ */}
					{pageIndex > 0 && (
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								marginBottom: 8,
								paddingBottom: 6,
								borderBottomWidth: 1,
								borderBottomColor: "#d1d5db",
							}}
						>
							<Text style={{ fontSize: 10, color: "#6b7280" }}>
								Performance Order — {eventName} (continued)
							</Text>
							<Text style={{ fontSize: 10, color: "#6b7280" }}>
								{eventDate}
							</Text>
						</View>
					)}

					{/* Table */}
					{renderTableHeader()}
					{pageItems.map((perf, idx) => renderRow(perf, idx))}

					{/* Footer with motivation, timing, and meta */}
					<View style={styles.footer} fixed>
						{/* Motivational Quote */}
						<View style={styles.motivationBox}>
							<Text style={styles.motivationText}>
								{randomQuote}
							</Text>
						</View>

						{/* Backstage Ready, Show Start & Total Time */}
						<View style={styles.footerTimingRow}>
							{backstageReadyTime && (
								<View style={styles.footerTimingBox}>
									<Text style={styles.footerTimingLabel}>
										Backstage Ready
									</Text>
									<Text style={styles.footerTimingValue}>
										{backstageReadyTime}
									</Text>
								</View>
							)}
							{showStartTime && (
								<View style={styles.footerTimingBox}>
									<Text style={styles.footerTimingLabel}>
										Show Start
									</Text>
									<Text style={styles.footerTimingValue}>
										{showStartTime}
									</Text>
								</View>
							)}
							<View style={styles.footerTimingBox}>
								<Text style={styles.footerTimingLabel}>
									Total Time
								</Text>
								<Text style={styles.footerTimingValue}>
									{formatDuration(totalSeconds)}
								</Text>
							</View>
						</View>

						{/* Meta line */}
						<View style={styles.footerMeta}>
							<Text style={styles.footerText}>
								Generated {new Date().toLocaleDateString()} •{" "}
								{new Date().toLocaleTimeString()}
							</Text>
							<Text style={styles.pageNumber}>
								Page {pageIndex + 1}
								{totalPages > 1 ? ` of ${totalPages}` : ""}
							</Text>
							<Text style={styles.footerText}>
								© {new Date().getFullYear()} FAME
							</Text>
						</View>
					</View>
				</Page>
			))}
		</Document>
	);
};

function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
