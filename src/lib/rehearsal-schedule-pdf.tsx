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
	thTime: {
		width: 36,
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
	thCountry: {
		width: 80,
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
	cellStyle: {
		width: 100,
		fontSize: 8,
		color: "#6b7280",
	},
	cellCountry: {
		width: 80,
		fontSize: 8,
		color: "#6b7280",
	},
	cellDuration: {
		width: 50,
		fontSize: 8,
		color: "#6b7280",
		textAlign: "right",
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

interface RehearsalSchedulePDFProps {
	eventName: string;
	eventDate: string;
	performances: Array<{
		id: string;
		order: number;
		name: string;
		style?: string;
		duration: number;
		plannedTime?: string;
		homeCountry?: string;
		homeCountryName?: string;
		countryLiving?: string;
		countryLivingName?: string;
	}>;
	rehearsalStartTime?: string;
	venue?: string;
	logoBase64?: string;
}

const ITEMS_PER_FIRST_PAGE = 35;
const ITEMS_PER_CONTINUATION = 40;

export const RehearsalSchedulePDF: React.FC<RehearsalSchedulePDFProps> = ({
	eventName,
	eventDate,
	performances,
	rehearsalStartTime,
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
		const isAlt = index % 2 === 1;
		const country =
			performance.homeCountryName || performance.countryLivingName || "";

		return (
			<View
				key={performance.id}
				style={[styles.row, isAlt ? styles.rowAlt : {}]}
			>
				<Text style={styles.cellOrder}>#{performance.order}</Text>
				{hasPlannedTimes && (
					<Text style={styles.cellTime}>
						{performance.plannedTime || ""}
					</Text>
				)}
				<Text style={styles.cellName}>{performance.name}</Text>
				<Text style={styles.cellStyle}>{performance.style || ""}</Text>
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
					{pageIndex === 0 && (
						<View style={styles.header}>
							{logoBase64 && (
								<Image src={logoBase64} style={styles.logo} />
							)}
							<View style={styles.headerText}>
								<Text style={styles.title}>
									Rehearsal Schedule — {eventName}
								</Text>
								<Text style={styles.subtitle}>
									{eventDate}
									{venue ? ` • ${venue}` : ""}
								</Text>
							</View>
							{rehearsalStartTime && (
								<View style={styles.timingBadge}>
									<Text style={styles.timingLabel}>
										Start
									</Text>
									<Text style={styles.timingValue}>
										{rehearsalStartTime}
									</Text>
								</View>
							)}
						</View>
					)}

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
								Rehearsal Schedule — {eventName} (continued)
							</Text>
							<Text style={{ fontSize: 10, color: "#6b7280" }}>
								{eventDate}
							</Text>
						</View>
					)}

					{renderTableHeader()}
					{pageItems.map((perf, idx) => renderRow(perf, idx))}

					<View style={styles.footer} fixed>
						<View style={styles.motivationBox}>
							<Text style={styles.motivationText}>
								{randomQuote}
							</Text>
						</View>

						{rehearsalStartTime && (
							<View style={styles.footerTimingRow}>
								<View style={styles.footerTimingBox}>
									<Text style={styles.footerTimingLabel}>
										Rehearsal Start
									</Text>
									<Text style={styles.footerTimingValue}>
										{rehearsalStartTime}
									</Text>
								</View>
							</View>
						)}

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
