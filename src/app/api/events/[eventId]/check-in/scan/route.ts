import { NextRequest, NextResponse } from "next/server";
import { getEventData, saveEventData, getFameLinkArtistById } from "@/lib/data-access";
import { getSession } from "@/lib/session";

/**
 * QR Code Scan Check-In Route - Migrated to MongoDB
 * Requires a Stage Manager or Super Admin session to process check-ins.
 */

const STORAGE_KEY = "check-ins";

interface CheckInRecord {
	checkedIn: boolean;
	timestamp: string | null;
	checkedInBy?: string;
}

interface ArtistCheckIn {
	rehearsal: CheckInRecord;
	performance: CheckInRecord;
}

interface CheckInData {
	[artistId: string]: ArtistCheckIn;
}

async function getArtistName(artistId: string): Promise<string> {
    try {
        const artist = await getFameLinkArtistById(artistId);
        return artist?.artistName || artist?.realName || artistId;
    } catch {
        return artistId;
    }
}

function renderHtml(
	title: string,
	body: string,
	success: boolean,
): NextResponse {
	const bgColor = success ? "#059669" : "#dc2626";
	const icon = success ? "✅" : "❌";
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
    padding: 20px;
  }
  .card {
    background: white;
    border-radius: 24px;
    padding: 40px 32px;
    max-width: 400px;
    width: 100%;
    text-align: center;
    box-shadow: 0 25px 50px rgba(0,0,0,0.3);
  }
  .icon { font-size: 64px; margin-bottom: 16px; }
  .title {
    font-size: 24px;
    font-weight: 700;
    color: #1e1b4b;
    margin-bottom: 8px;
  }
  .badge {
    display: inline-block;
    background: ${bgColor};
    color: white;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
  }
  .info {
    color: #6b7280;
    font-size: 15px;
    line-height: 1.6;
  }
  .info strong { color: #1e1b4b; }
  .timestamp {
    margin-top: 20px;
    font-size: 12px;
    color: #9ca3af;
  }
  .logo {
    margin-top: 24px;
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, #7c3aed, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon">${icon}</div>
  ${body}
  <div class="logo">Fame Services</div>
</div>
</body>
</html>`;

	return new NextResponse(html, {
		status: success ? 200 : 400,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	try {
        const { eventId } = await params;
        const artistId = request.nextUrl.searchParams.get("artistId");
        const type = request.nextUrl.searchParams.get("type");

        // ── STAGE MANAGER AUTH CHECK ──────────────────────────────
        // Only allow check-in if a Stage Manager or Super Admin is logged in on this browser
        const session = await getSession();
        if (!session || (session.role !== "stage_manager" && session.role !== "super_admin")) {
            return renderHtml(
                "Unauthorized",
                `<div class="title">Access Denied</div>
                 <div class="badge">Not Authorized</div>
                 <div class="info">
                   Please scan this QR code from a device where a <strong>Stage Manager</strong> is logged in.<br/><br/>
                   Only Stage Managers can check in artists.
                 </div>`,
                false,
            );
        }

        if (!artistId || !type) {
            return renderHtml("Invalid QR Code", `<div class="title">Invalid QR Code</div><div class="badge">Error</div><div class="info">Missing required parameters.</div>`, false);
        }

        if (type !== "rehearsal" && type !== "performance") {
            return renderHtml("Invalid Type", `<div class="title">Invalid Type</div><div class="badge">Error</div><div class="info">Check-in type must be rehearsal or performance.</div>`, false);
        }

        const checkIns: CheckInData = await getEventData(eventId, STORAGE_KEY) || {};
        const artistName = await getArtistName(artistId);
        const typeLabel = type === "rehearsal" ? "Rehearsal" : "Performance";

        if (checkIns[artistId]?.[type]?.checkedIn) {
            const prevTimestamp = checkIns[artistId][type].timestamp;
            const prevTime = prevTimestamp ? new Date(prevTimestamp).toLocaleString() : "Unknown";

            return renderHtml("Already Checked In", `<div class="title">${artistName}</div><div class="badge">Already Checked In</div><div class="info">This artist was already checked in.<br/>Previous check-in: <strong>${prevTime}</strong></div>`, true);
        }

        if (!checkIns[artistId]) {
            checkIns[artistId] = {
                rehearsal: { checkedIn: false, timestamp: null },
                performance: { checkedIn: false, timestamp: null },
            };
        }

        const now = new Date();
        checkIns[artistId][type as "rehearsal" | "performance"] = {
            checkedIn: true,
            timestamp: now.toISOString(),
            checkedInBy: session.userId,
        };

        await saveEventData(eventId, STORAGE_KEY, checkIns);

        if ((global as any).io) {
            (global as any).io.to(`event_${eventId}`).emit("artist_checked_in", {
                eventId, artistId, type, checkedIn: true, timestamp: now.toISOString(),
            });
        }

        return renderHtml("Check-In Successful", `<div class="title">${artistName}</div><div class="badge">${typeLabel} Check-In</div><div class="info">Successfully checked in.</div><div class="timestamp">${now.toLocaleString()}</div>`, true);
	} catch (error: any) {
		console.error("QR scan check-in error via MongoDB:", error);
		return renderHtml("Check-In Failed", `<div class="title">Check-In Failed</div><div class="badge">Error</div><div class="info">Something went wrong.</div>`, false);
	}
}
