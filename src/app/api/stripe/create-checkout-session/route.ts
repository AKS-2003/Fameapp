import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(
	process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
);

// Map plan types to Stripe Price IDs
const PRICE_MAP: Record<string, string> = {
	fame_pro: "price_1T9OHgAnVSH8zBk1kzCVd0dP",
	fame_pro_plus: "price_1T9OHoAnVSH8zBk1qUBaa6Pq",
	famelink_pro: "price_1T9OHtAnVSH8zBk1dvU3KILk",
	famelink_pro_plus: "price_1T9OHxAnVSH8zBk1ealF9kOP",
};

export async function POST(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { planType, userId, userEmail } = body;

		if (!planType || !PRICE_MAP[planType]) {
			return NextResponse.json(
				{ error: "Invalid plan type" },
				{ status: 400 },
			);
		}

		const priceId = PRICE_MAP[planType];

		// Determine return URLs based on user type
		const { getBaseUrl } = await import("@/lib/url-utils");
		const baseUrl = getBaseUrl(request.headers);
		const isStageManager =
			planType === "fame_pro" || planType === "fame_pro_plus";
		const successPath = isStageManager
			? "/stage-manager?upgraded=true"
			: `/famelink/${userId}?upgraded=true`;
		const cancelPath = isStageManager
			? "/stage-manager/events"
			: `/famelink/${userId}`;

		const checkoutSession = await stripe.checkout.sessions.create({
			mode: "subscription",
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${baseUrl}${successPath}`,
			cancel_url: `${baseUrl}${cancelPath}`,
			client_reference_id: userId || session.userId,
			customer_email: userEmail,
			metadata: {
				userId: userId || session.userId,
				planType,
			},
			subscription_data: {
				metadata: {
					userId: userId || session.userId,
					planType,
				},
			},
		});

		return NextResponse.json({
			success: true,
			url: checkoutSession.url,
		});
	} catch (error: any) {
		console.error("[Stripe] Create checkout session error:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}
