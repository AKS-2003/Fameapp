// =========================================================================
// Subscription Types & Helpers for FAME Premium System
// =========================================================================

export type PlanType =
	| "free"
	| "fame_pro"
	| "fame_pro_plus"
	| "famelink_pro"
	| "famelink_pro_plus";

export interface Subscription {
	plan_type: PlanType;
	plan_quantity: number;
	stripe_customer_id?: string;
	stripe_subscription_id?: string;
	plan_expiration?: string;
	created_at: string;
	updated_at: string;
}

// ── Plan Configurations ─────────────────────────────────────────

export const FAME_PLANS = {
	fame_pro: {
		name: "FAME PRO",
		price: 20,
		eventsPerQuantity: 1,
		minQuantity: 1,
		maxQuantity: 10,
		productId: "prod_U7dY3B0UdA5H9t",
		priceId: "price_1T9OHgAnVSH8zBk1kzCVd0dP",
		buyButtonId: "buy_btn_1T9OmQAnVSH8zBk1WcxwqXHg",
	},
	fame_pro_plus: {
		name: "FAME PRO PLUS",
		price: 40,
		eventsPerQuantity: 2,
		minQuantity: 2,
		maxQuantity: 20,
		allowedQuantities: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
		productId: "prod_U7dYAfVCmAP71z",
		priceId: "price_1T9OHoAnVSH8zBk1qUBaa6Pq",
		buyButtonId: "buy_btn_1T9OlwAnVSH8zBk1vfvbN0eE",
	},
} as const;

export const FAMELINK_PLANS = {
	famelink_pro: {
		name: "FAME LINK PRO",
		price: 20,
		showsPerQuantity: 1,
		minQuantity: 1,
		maxQuantity: 10,
		productId: "prod_U7dYHYgnRb2xWj",
		priceId: "price_1T9OHtAnVSH8zBk1dvU3KILk",
		buyButtonId: "buy_btn_1T9OkiAnVSH8zBk1bi6E8Wm8",
	},
	famelink_pro_plus: {
		name: "FAME LINK PRO PLUS",
		price: 40,
		showsPerQuantity: 2,
		minQuantity: 2,
		maxQuantity: 20,
		allowedQuantities: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
		productId: "prod_U7dYjGOGBRPZtO",
		priceId: "price_1T9OHxAnVSH8zBk1ealF9kOP",
		buyButtonId: "buy_btn_1T9OhUAnVSH8zBk17E0saEvT",
	},
} as const;

// ── Limit Calculations ──────────────────────────────────────────

/** Calculate max events allowed for a stage manager (unlimited for now) */
export function getMaxEvents(subscription?: Subscription | null): number {
	// Stage managers are not currently limited by event count.
	// Subscription gating for events can be enabled here in the future.
	return 999999;
}

/** Calculate max shows allowed for a FameLink artist */
export function getMaxShows(subscription?: Subscription | null): number {
	if (!subscription || subscription.plan_type === "free") return 3; // Free tier: 3 shows max
	if (subscription.plan_type === "famelink_pro") {
		return (subscription.plan_quantity || 1) * FAMELINK_PLANS.famelink_pro.showsPerQuantity * 10;
	}
	if (subscription.plan_type === "famelink_pro_plus") {
		return (subscription.plan_quantity || 2) * FAMELINK_PLANS.famelink_pro_plus.showsPerQuantity * 10;
	}
	return 3; // default to free limit
}


/** Check if a subscription is active (not expired) */
export function isSubscriptionActive(
	subscription?: Subscription | null,
): boolean {
	if (!subscription || subscription.plan_type === "free") return false;
	if (!subscription.plan_expiration) return true;
	return new Date(subscription.plan_expiration) > new Date();
}

/** Default free subscription */
export function defaultSubscription(): Subscription {
	return {
		plan_type: "free",
		plan_quantity: 0,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}
