import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionFromRequest } from "@/lib/session";
import { getUserById, updateUser } from "@/lib/data-access";
import { getFameLinkArtistById, updateFameLinkArtist } from "@/lib/data-access";
import type { Subscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const stripe = new Stripe(
	process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
);

const PRODUCT_TO_PLAN: Record<string, string> = {
	prod_U7dY3B0UdA5H9t: "fame_pro",
	prod_U7dYAfVCmAP71z: "fame_pro_plus",
	prod_U7dYHYgnRb2xWj: "famelink_pro",
	prod_U7dYjGOGBRPZtO: "famelink_pro_plus",
};

/**
 * POST /api/subscription/sync
 * Force-sync subscription from Stripe for the current user.
 * Searches Stripe customers by email, finds active subscriptions,
 * and updates the user's MongoDB profile.
 */
export async function POST(request: NextRequest) {
	try {
		const session = getSessionFromRequest(request);
		if (!session) {
			return NextResponse.json(
				{ success: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		let userEmail = "";
		const userId = session.userId;

		if (session.role === "stage_manager") {
			const user = await getUserById(session.userId);
			if (!user)
				return NextResponse.json(
					{ success: false, error: "User not found" },
					{ status: 404 },
				);
			userEmail = user.email;
		} else {
			const artist = await getFameLinkArtistById(session.userId);
			if (!artist)
				return NextResponse.json(
					{ success: false, error: "Artist not found" },
					{ status: 404 },
				);
			userEmail = artist.email;
		}

		console.log(`[Subscription Sync] Syncing for ${userId} (${userEmail})`);

		let activeSubscription: Stripe.Subscription | null = null;

		// 1. Search Stripe customers by email
		try {
			const customers = await stripe.customers.list({
				email: userEmail,
				limit: 5,
			});

			for (const customer of customers.data) {
				try {
					const subs = await stripe.subscriptions.list({
						customer: customer.id,
						status: "active",
						limit: 1,
					});
					if (subs.data.length > 0) {
						activeSubscription = subs.data[0];
						break;
					}
				} catch (subErr: any) {
					console.warn(
						`[Subscription Sync] Error listing subs for customer ${customer.id}:`,
						subErr?.message,
					);
				}
			}
		} catch (custErr: any) {
			console.warn(
				`[Subscription Sync] Error listing customers by email:`,
				custErr?.message,
			);
		}

		// 2. If not found by email, search recent checkout sessions
		if (!activeSubscription) {
			try {
				const sessions = await stripe.checkout.sessions.list({
					limit: 10,
				});
				for (const cs of sessions.data) {
					if (cs.client_reference_id === userId && cs.subscription) {
						const subId =
							typeof cs.subscription === "string"
								? cs.subscription
								: (cs.subscription as any)?.id;
						if (subId) {
							try {
								const sub =
									await stripe.subscriptions.retrieve(subId);
								if (sub.status === "active") {
									activeSubscription = sub;
									break;
								}
							} catch {
								/* skip individual sub retrieval errors */
							}
						}
					}
				}
			} catch (sessErr: any) {
				console.warn(
					`[Subscription Sync] Error listing checkout sessions:`,
					sessErr?.message,
				);
			}
		}

		if (!activeSubscription) {
			console.log(
				`[Subscription Sync] No active subscription found for ${userEmail}`,
			);
			return NextResponse.json({
				success: true,
				synced: false,
				message: "No active Stripe subscription found",
			});
		}

		const item = activeSubscription.items?.data?.[0];
		if (!item) {
			return NextResponse.json({
				success: true,
				synced: false,
				message: "Subscription has no items",
			});
		}

		const productId =
			typeof item.price.product === "string"
				? item.price.product
				: (item.price.product as any)?.id;
		const planType = PRODUCT_TO_PLAN[productId || ""] || "famelink_pro";
		const quantity = item.quantity || 1;
		const customerId =
			typeof activeSubscription.customer === "string"
				? activeSubscription.customer
				: (activeSubscription.customer as any)?.id;

		// Safely get expiration — current_period_end may be on item level (API >= 2025-03-31)
		let expirationIso: string | undefined;
		try {
			// Try subscription-level first (older API versions)
			const subLevel = (activeSubscription as any).current_period_end;
			if (subLevel && typeof subLevel === "number") {
				expirationIso = new Date(subLevel * 1000).toISOString();
			}
			// Try item-level (newer API versions)
			if (!expirationIso && item) {
				const itemLevel = (item as any).current_period_end;
				if (itemLevel && typeof itemLevel === "number") {
					expirationIso = new Date(itemLevel * 1000).toISOString();
				}
			}
		} catch {
			/* ignore date conversion errors */
		}

		const subData: Subscription = {
			plan_type: planType as any,
			plan_quantity: quantity,
			stripe_customer_id: customerId,
			stripe_subscription_id: activeSubscription.id,
			...(expirationIso ? { plan_expiration: expirationIso } : {}),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		console.log(
			`[Subscription Sync] Found subscription: ${JSON.stringify(subData)}`,
		);

		// Update the user's profile in MongoDB
		try {
			if (session.role === "stage_manager") {
				const user = await getUserById(session.userId);
				if (user) {
					user.subscription = subData;
					await updateUser(user);
					console.log(
						`[Subscription Sync] ✅ Updated stage manager ${user.email} to ${planType}`,
					);
				}
			} else {
				const artist = await getFameLinkArtistById(session.userId);
				if (artist) {
					artist.subscription = subData;
					artist.tier =
						planType === "free"
							? "free"
							: planType.includes("plus")
								? "pro_plus"
								: "pro";
					await updateFameLinkArtist(artist);
					console.log(
						`[Subscription Sync] ✅ Updated artist ${artist.email} to ${planType}`,
					);
				}
			}
		} catch (writeErr: any) {
			console.error(
				"[Subscription Sync] Error writing to MongoDB:",
				writeErr?.message,
			);
			return NextResponse.json(
				{
					success: false,
					error: `Failed to save subscription: ${writeErr?.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			synced: true,
			planType,
			subscription: subData,
		});
	} catch (error: any) {
		console.error(
			"[Subscription Sync] Error:",
			error?.message,
			error?.stack,
		);
		return NextResponse.json(
			{ success: false, error: error?.message || "Unknown error" },
			{ status: 500 },
		);
	}
}
