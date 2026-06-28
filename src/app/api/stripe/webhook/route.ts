import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUser, getUserById, getAllUsers } from "@/lib/data-access";
import { getAllFameLinkArtists, updateFameLinkArtist } from "@/lib/data-access";
import type { Subscription } from "@/lib/subscription";

// Disable body parsing for Stripe webhook signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(
	process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
);

/**
 * Safely extract the billing period end from a Stripe subscription.
 * In API versions >= 2025-03-31, current_period_end moved from the
 * subscription level to the subscription item level.
 */
function getPeriodEndIso(
	subscription: Stripe.Subscription,
): string | undefined {
	try {
		// Try subscription-level first (older API versions)
		const subLevel = (subscription as any).current_period_end;
		if (subLevel && typeof subLevel === "number") {
			return new Date(subLevel * 1000).toISOString();
		}
		// Try item-level (API >= 2025-03-31)
		const item = subscription.items?.data?.[0];
		if (item) {
			const itemLevel = (item as any).current_period_end;
			if (itemLevel && typeof itemLevel === "number") {
				return new Date(itemLevel * 1000).toISOString();
			}
		}
	} catch {
		/* ignore date conversion errors */
	}
	return undefined;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const sig = request.headers.get("stripe-signature");

		let event: Stripe.Event;

		// Verify webhook signature if secret is configured
		// In development with Stripe CLI, the CLI provides its own signing
		// secret. If verification fails, fall back to parsing the raw body
		// so local testing always works.
		if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
			try {
				event = stripe.webhooks.constructEvent(
					body,
					sig,
					process.env.STRIPE_WEBHOOK_SECRET,
				);
			} catch (err: any) {
				// In development, allow unverified events so the Stripe CLI
				// forwarding works even when the signing secret is stale.
				if (process.env.NODE_ENV === "production") {
					console.error(
						"Webhook signature verification failed:",
						err.message,
					);
					return NextResponse.json(
						{ error: "Invalid signature" },
						{ status: 400 },
					);
				}
				console.warn(
					"[Stripe] Signature verification failed in dev, parsing body directly:",
					err.message,
				);
				event = JSON.parse(body) as Stripe.Event;
			}
		} else {
			event = JSON.parse(body) as Stripe.Event;
		}

		console.log(`[Stripe Webhook] Event type: ${event.type}`);

		// Each handler is wrapped in try-catch so that individual failures
		// don't cause a 500 response. Stripe retries on 500s, but these
		// events often race each other (e.g. checkout.session.completed
		// + customer.subscription.created arrive simultaneously), so we
		// accept the event and let fallback handlers cover any gaps.
		switch (event.type) {
			case "checkout.session.completed": {
				try {
					const session = event.data
						.object as Stripe.Checkout.Session;
					await handleCheckoutCompleted(session);
				} catch (err: any) {
					console.error(
						"[Stripe Webhook] checkout.session.completed handler error:",
						err?.message || err,
					);
				}
				break;
			}
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				try {
					const subscription = event.data
						.object as Stripe.Subscription;
					// For subscription.created, add a longer delay to let
					// checkout.session.completed finish first (it has
					// client_reference_id for reliable user lookup)
					if (event.type === "customer.subscription.created") {
						await new Promise((r) => setTimeout(r, 3500));
					}
					await handleSubscriptionUpdated(subscription);
				} catch (err: any) {
					console.error(
						`[Stripe Webhook] ${event.type} handler error:`,
						err?.message || err,
					);
				}
				break;
			}
			case "customer.subscription.deleted": {
				try {
					const subscription = event.data
						.object as Stripe.Subscription;
					await handleSubscriptionDeleted(subscription);
				} catch (err: any) {
					console.error(
						"[Stripe Webhook] customer.subscription.deleted handler error:",
						err?.message || err,
					);
				}
				break;
			}
			case "invoice.paid": {
				try {
					const invoice = event.data.object as Stripe.Invoice;
					await handleInvoicePaid(invoice);
				} catch (err: any) {
					console.error(
						"[Stripe Webhook] invoice.paid handler error:",
						err?.message || err,
					);
				}
				break;
			}
			case "invoice_payment.paid": {
				// Newer Stripe API versions send this event type
				try {
					const payment = event.data.object as any;
					if (payment.invoice) {
						const invoiceId =
							typeof payment.invoice === "string"
								? payment.invoice
								: payment.invoice.id;
						const invoice =
							await stripe.invoices.retrieve(invoiceId);
						await handleInvoicePaid(invoice);
					}
				} catch (err: any) {
					console.error(
						"[Stripe Webhook] invoice_payment.paid handler error:",
						err?.message || err,
					);
				}
				break;
			}
			case "invoice.payment_succeeded": {
				// Alternative event name for invoice payment success
				try {
					const invoice = event.data.object as Stripe.Invoice;
					await handleInvoicePaid(invoice);
				} catch (err: any) {
					console.error(
						"[Stripe Webhook] invoice.payment_succeeded handler error:",
						err?.message || err,
					);
				}
				break;
			}
		}

		// Always return 200 to Stripe — individual handler errors
		// are logged above and fallback handlers will retry.
		return NextResponse.json({ received: true });
	} catch (error) {
		// This only catches signature verification or JSON parse errors
		console.error("[Stripe Webhook] Critical error:", error);
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
	const customerEmail =
		session.customer_email || session.customer_details?.email;
	const customerId =
		typeof session.customer === "string"
			? session.customer
			: (session.customer as any)?.id;
	const subscriptionId =
		typeof session.subscription === "string"
			? session.subscription
			: (session.subscription as any)?.id;
	// client_reference_id is set on the Checkout Session with the user/artist ID
	// Also check metadata as a fallback
	const clientRefId =
		session.client_reference_id || session.metadata?.userId || null;

	console.log(
		`[Stripe] Checkout completed - email: ${customerEmail}, customer: ${customerId}, subscription: ${subscriptionId}, clientRef: ${clientRefId}, metadata: ${JSON.stringify(session.metadata)}`,
	);

	if (!customerEmail && !clientRefId) {
		console.error(
			"[Stripe] No customer email or client_reference_id in checkout session",
		);
		return;
	}

	if (!subscriptionId) {
		console.log(
			"[Stripe] No subscription ID in checkout session (one-time payment?)",
		);
		return;
	}

	try {
		// Retrieve the full subscription from Stripe with expanded product data
		let subscription: Stripe.Subscription;
		try {
			subscription = await stripe.subscriptions.retrieve(subscriptionId);
		} catch (retrieveErr: any) {
			console.error(
				`[Stripe] Failed to retrieve subscription ${subscriptionId}:`,
				retrieveErr.message,
			);
			return;
		}

		const item = subscription.items.data[0];
		if (!item) {
			console.error("[Stripe] No items in subscription");
			return;
		}

		const productId =
			typeof item.price.product === "string"
				? item.price.product
				: (item.price.product as any)?.id;
		const quantity = item.quantity || 1;

		console.log(
			`[Stripe] Product: ${productId}, Quantity: ${quantity}, Price: ${item.price.id}`,
		);

		// Also try to determine plan type from metadata if product lookup fails
		const planType =
			determinePlanType(productId || "", item.price.id) ||
			session.metadata?.planType ||
			"famelink_pro";
		const subData: Subscription = {
			plan_type: planType as any,
			plan_quantity: quantity,
			stripe_customer_id: customerId,
			stripe_subscription_id: subscriptionId,
			...(getPeriodEndIso(subscription)
				? { plan_expiration: getPeriodEndIso(subscription) }
				: {}),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		console.log(`[Stripe] Saving subscription: ${JSON.stringify(subData)}`);

		const userId = await updateUserSubscription(
			customerEmail || "",
			subData,
			clientRefId || undefined,
		);

		if (userId) {
			console.log(
				`[Stripe] ✅ Successfully updated user ${userId} to ${planType}`,
			);
		} else {
			console.error(
				`[Stripe] ❌ Failed to find user for email: ${customerEmail}, clientRef: ${clientRefId}`,
			);
		}

		emitSubscriptionUpdate(customerEmail || "", subData, userId);
	} catch (err: any) {
		console.error(
			"[Stripe] Error in handleCheckoutCompleted:",
			err?.message || err,
		);
	}
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
	const item = subscription.items.data[0];
	if (!item) {
		console.log(
			"[Stripe] handleSubscriptionUpdated: No items in subscription, skipping",
		);
		return;
	}

	const customerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer.id;

	let customer: Stripe.Customer | Stripe.DeletedCustomer;
	try {
		customer = await stripe.customers.retrieve(customerId);
	} catch (err: any) {
		console.error(
			`[Stripe] Failed to retrieve customer ${customerId}:`,
			err?.message,
		);
		return;
	}
	if (customer.deleted) return;

	const email = (customer as Stripe.Customer).email;

	const productId =
		typeof item.price.product === "string"
			? item.price.product
			: item.price.product?.id;
	const quantity = item.quantity || 1;
	const planType = determinePlanType(productId || "", item.price.id);

	// Try to get userId from subscription metadata (set by checkout session)
	const metadataUserId = subscription.metadata?.userId || null;

	console.log(
		`[Stripe] handleSubscriptionUpdated - email: ${email}, product: ${productId}, plan: ${planType}, qty: ${quantity}, metadataUserId: ${metadataUserId}`,
	);

	const subData: Subscription = {
		plan_type: planType as any,
		plan_quantity: quantity,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscription.id,
		...(getPeriodEndIso(subscription)
			? { plan_expiration: getPeriodEndIso(subscription) }
			: {}),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	// Pass metadataUserId as directUserId fallback when email is missing
	const userId2 = await updateUserSubscription(
		email || "",
		subData,
		metadataUserId || undefined,
	);
	emitSubscriptionUpdate(email || "", subData, userId2);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
	const customerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer.id;

	let customer: Stripe.Customer | Stripe.DeletedCustomer;
	try {
		customer = await stripe.customers.retrieve(customerId);
	} catch (err: any) {
		console.error(
			`[Stripe] Failed to retrieve customer ${customerId}:`,
			err?.message,
		);
		return;
	}
	if (customer.deleted) return;

	const email = (customer as Stripe.Customer).email;
	if (!email) return;

	const subData: Subscription = {
		plan_type: "free",
		plan_quantity: 0,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscription.id,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	const userId3 = await updateUserSubscription(email, subData);
	emitSubscriptionUpdate(email, subData, userId3);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
	// Refresh subscription data on successful payment
	const invoiceSubscription = (invoice as any).subscription;
	if (!invoiceSubscription) return;
	const subscriptionId =
		typeof invoiceSubscription === "string"
			? invoiceSubscription
			: invoiceSubscription.id;
	try {
		const subscription =
			await stripe.subscriptions.retrieve(subscriptionId);
		await handleSubscriptionUpdated(subscription);
	} catch (err: any) {
		console.error(
			`[Stripe] handleInvoicePaid error for subscription ${subscriptionId}:`,
			err?.message,
		);
	}
}

function determinePlanType(productId: string, priceId: string): string {
	// Match by product ID
	if (productId === "prod_U7dY3B0UdA5H9t") return "fame_pro";
	if (productId === "prod_U7dYAfVCmAP71z") return "fame_pro_plus";
	if (productId === "prod_U7dYHYgnRb2xWj") return "famelink_pro";
	if (productId === "prod_U7dYjGOGBRPZtO") return "famelink_pro_plus";

	// Fallback
	return "famelink_pro";
}

async function updateUserSubscription(
	email: string,
	subscription: Subscription,
	directUserId?: string,
): Promise<string | undefined> {
	console.log(
		`[Stripe] Looking for user with email: ${email}, directUserId: ${directUserId}`,
	);

	const allUsers = await getAllUsers();
	console.log(`[Stripe] Total users found: ${allUsers.length}`);

	const artists = await getAllFameLinkArtists();
	console.log(`[Stripe] Total FameLink artists found: ${artists.length}`);

	// ── 1. Direct lookup by user/artist ID (client_reference_id from Buy Button)
	if (directUserId) {
		// Check stage managers
		const smById = allUsers.find(
			(u) => u.id === directUserId && u.role === "stage_manager",
		);
		if (smById) {
			smById.subscription = subscription;
			await updateUser(smById);
			console.log(
				`[Stripe] Updated stage manager by directUserId: ${smById.email} -> ${subscription.plan_type} (userId: ${smById.id})`,
			);
			return smById.id;
		}

		// Check FameLink artists
		const artistById = artists.find((a) => a.id === directUserId);
		if (artistById) {
			artistById.subscription = subscription;
			artistById.tier =
				subscription.plan_type === "free"
					? "free"
					: subscription.plan_type.includes("plus")
						? "pro_plus"
						: "pro";
			await updateFameLinkArtist(artistById);
			console.log(
				`[Stripe] Updated artist by directUserId: ${artistById.email} -> ${subscription.plan_type} (artistId: ${artistById.id})`,
			);
			return artistById.id;
		}

		console.warn(
			`[Stripe] directUserId ${directUserId} not found in any collection, falling back to email lookup`,
		);
	}

	// ── 2. Email-based lookup (stage managers)
	if (email) {
		const stageManager = allUsers.find(
			(u) =>
				u.email.toLowerCase() === email.toLowerCase() &&
				u.role === "stage_manager",
		);

		if (stageManager) {
			stageManager.subscription = subscription;
			await updateUser(stageManager);
			console.log(
				`[Stripe] Updated stage manager subscription: ${email} -> ${subscription.plan_type} (userId: ${stageManager.id})`,
			);
			return stageManager.id;
		}
	}

	// ── 3. Stripe customer ID lookup (stage managers)
	if (subscription.stripe_customer_id) {
		const smByCustomer = allUsers.find(
			(u) =>
				u.role === "stage_manager" &&
				(u as any).subscription?.stripe_customer_id ===
					subscription.stripe_customer_id,
		);
		if (smByCustomer) {
			smByCustomer.subscription = subscription;
			await updateUser(smByCustomer);
			console.log(
				`[Stripe] Updated stage manager by customer ID: ${smByCustomer.email} -> ${subscription.plan_type}`,
			);
			return smByCustomer.id;
		}
	}

	// ── 4. Email-based lookup (artists)
	if (email) {
		const artist = artists.find(
			(a) => a.email.toLowerCase() === email.toLowerCase(),
		);

		if (artist) {
			artist.subscription = subscription;
			artist.tier =
				subscription.plan_type === "free"
					? "free"
					: subscription.plan_type.includes("plus")
						? "pro_plus"
						: "pro";
			await updateFameLinkArtist(artist);
			console.log(
				`[Stripe] Updated artist subscription: ${email} -> ${subscription.plan_type} (artistId: ${artist.id})`,
			);
			return artist.id;
		}
	}

	// ── 5. Stripe customer ID lookup (artists)
	if (subscription.stripe_customer_id) {
		const artistByCustomer = artists.find(
			(a) =>
				(a as any).subscription?.stripe_customer_id ===
				subscription.stripe_customer_id,
		);
		if (artistByCustomer) {
			artistByCustomer.subscription = subscription;
			artistByCustomer.tier =
				subscription.plan_type === "free"
					? "free"
					: subscription.plan_type.includes("plus")
						? "pro_plus"
						: "pro";
			await updateFameLinkArtist(artistByCustomer);
			console.log(
				`[Stripe] Updated artist by customer ID: ${artistByCustomer.email} -> ${subscription.plan_type}`,
			);
			return artistByCustomer.id;
		}
	}

	console.warn(
		`[Stripe] No user found for email: ${email}, directUserId: ${directUserId}, customer ID: ${subscription.stripe_customer_id}`,
	);
	return undefined;
}

function emitSubscriptionUpdate(
	email: string,
	subscription: Subscription,
	userId?: string,
) {
	try {
		const io = (global as any).io;
		if (io) {
			const payload = {
				email,
				subscription,
				timestamp: new Date().toISOString(),
			};

			// Notify the specific user who paid so their UI refreshes
			if (userId) {
				io.to(`user_${userId}`).emit("subscription_updated", payload);
				console.log(
					`[Stripe] Emitted subscription_updated to user_${userId}`,
				);
			}

			// Also broadcast by role rooms so any connected session gets it
			io.to("role_stage_manager").emit("subscription_updated", payload);
			io.to("role_artist").emit("subscription_updated", payload);

			// Broadcast to super admins for dashboard
			io.to("role_super_admin").emit("subscription_updated", payload);

			console.log(`[Stripe] Emitted subscription_updated for ${email}`);
		}
	} catch (err) {
		console.error("[Stripe] Failed to emit WebSocket event:", err);
	}
}
