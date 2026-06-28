"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Crown,
	Sparkles,
	Zap,
	CheckCircle,
	ArrowRight,
	Loader2,
} from "lucide-react";

interface UpgradeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "stage_manager" | "artist";
	currentCount: number;
	maxCount: number;
	justUpgraded?: boolean;
	planType?: string;
	onGoCreate?: () => void;
	userEmail?: string;
	userId?: string;
	returnedFromCheckout?: boolean;
}

export function UpgradeModal({
	open,
	onOpenChange,
	type,
	currentCount,
	maxCount,
	justUpgraded,
	planType,
	onGoCreate,
	userEmail,
	userId,
	returnedFromCheckout,
}: UpgradeModalProps) {
	const [showSuccess, setShowSuccess] = useState(false);
	const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

	// Show success state when subscription upgrades while modal is open
	useEffect(() => {
		if (justUpgraded && open) {
			setShowSuccess(true);
			setLoadingPlan(null);
		}
	}, [justUpgraded, open]);

	// Reset state when modal closes
	useEffect(() => {
		if (!open) {
			setShowSuccess(false);
			setLoadingPlan(null);
		}
	}, [open]);

	const isStageManager = type === "stage_manager";
	const itemLabel = isStageManager ? "events" : "shows";

	const handleSubscribe = async (selectedPlan: string) => {
		setLoadingPlan(selectedPlan);
		try {
			const response = await fetch(
				"/api/stripe/create-checkout-session",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						planType: selectedPlan,
						userId,
						userEmail,
					}),
				},
			);
			const result = await response.json();
			if (result.success && result.url) {
				window.location.href = result.url;
			} else {
				console.error(
					"Failed to create checkout session:",
					result.error,
				);
				setLoadingPlan(null);
			}
		} catch (err) {
			console.error("Checkout session error:", err);
			setLoadingPlan(null);
		}
	};

	// Determine plan keys based on user type
	const proPlan = isStageManager ? "fame_pro" : "famelink_pro";
	const proPlusPlan = isStageManager ? "fame_pro_plus" : "famelink_pro_plus";

	// Verifying payment state — shown when user just returned from Stripe checkout
	if (returnedFromCheckout && !showSuccess) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-md">
					<div className="text-center py-8">
						<div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
							<Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
						</div>
						<h2 className="text-xl font-bold text-gray-900 mb-2">
							Verifying Your Payment...
						</h2>
						<p className="text-gray-600 mb-1">
							We&apos;re confirming your subscription with Stripe.
						</p>
						<p className="text-sm text-gray-500">
							This usually takes just a few seconds.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// Success state after payment
	if (showSuccess) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-md">
					<div className="text-center py-6">
						<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<h2 className="text-xl font-bold text-gray-900 mb-2">
							Upgrade Successful!
						</h2>
						<p className="text-gray-600 mb-1">
							You are now on the{" "}
							<span className="font-semibold text-purple-600">
								{(planType || "pro")
									.replace(/_/g, " ")
									.toUpperCase()}
							</span>{" "}
							plan.
						</p>
						<p className="text-sm text-gray-500 mb-6">
							You can now create up to {maxCount} {itemLabel}.
						</p>
						{onGoCreate && (
							<Button
								onClick={() => {
									onOpenChange(false);
									onGoCreate();
								}}
								className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
							>
								{isStageManager
									? "Create Event"
									: "Create Show"}
								<ArrowRight className="h-4 w-4" />
							</Button>
						)}
						{!onGoCreate && (
							<Button
								onClick={() => onOpenChange(false)}
								className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
							>
								Continue
							</Button>
						)}
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl">
						<Crown className="h-6 w-6 text-amber-500" />
						Upgrade Required
					</DialogTitle>
					<DialogDescription className="text-base mt-2">
						{isStageManager
							? "Your free plan limit has been reached. Upgrade to FAME PRO or FAME PRO PLUS to create more events."
							: "You reached the maximum number of shows. Upgrade to FAME LINK PRO to create more shows."}
					</DialogDescription>
				</DialogHeader>

				<div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
					<p className="text-sm text-amber-800">
						Currently using{" "}
						<span className="font-bold">{currentCount}</span> of{" "}
						<span className="font-bold">{maxCount}</span>{" "}
						{itemLabel}
					</p>
				</div>

				{loadingPlan && (
					<div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
						<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
						<p className="text-sm text-blue-700">
							Redirecting to Stripe Checkout...
						</p>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					{/* PRO Plan */}
					<div className="border-2 border-purple-200 rounded-xl p-5 bg-gradient-to-b from-purple-50 to-white">
						<div className="flex items-center gap-2 mb-3">
							<Badge className="bg-purple-100 text-purple-700 border-purple-300">
								<Sparkles className="h-3 w-3 mr-1" />
								PRO
							</Badge>
						</div>
						<h3 className="text-lg font-bold text-gray-900">
							{isStageManager ? "FAME PRO" : "FAME LINK PRO"}
						</h3>
						<p className="text-2xl font-bold text-purple-600 mt-1">
							$20
							<span className="text-sm font-normal text-gray-500">
								/month
							</span>
						</p>
						<ul className="mt-3 space-y-1.5 text-sm text-gray-600">
							<li>
								✓{" "}
								{isStageManager
									? "1 extra event per quantity"
									: "1 extra show per quantity"}
							</li>
							<li>✓ Adjustable quantity: 1 – 10</li>
							<li>✓ Cancel anytime</li>
						</ul>
						<div className="mt-4">
							<Button
								onClick={() => handleSubscribe(proPlan)}
								disabled={!!loadingPlan}
								className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
							>
								{loadingPlan === proPlan ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Redirecting...
									</>
								) : (
									<>
										<Sparkles className="h-4 w-4 mr-2" />
										Subscribe to PRO
									</>
								)}
							</Button>
						</div>
					</div>

					{/* PRO PLUS Plan */}
					<div className="border-2 border-amber-200 rounded-xl p-5 bg-gradient-to-b from-amber-50 to-white relative">
						<div className="absolute -top-3 right-4">
							<Badge className="bg-amber-500 text-white border-0 shadow-md">
								<Zap className="h-3 w-3 mr-1" />
								Best Value
							</Badge>
						</div>
						<div className="flex items-center gap-2 mb-3">
							<Badge className="bg-amber-100 text-amber-700 border-amber-300">
								<Crown className="h-3 w-3 mr-1" />
								PRO PLUS
							</Badge>
						</div>
						<h3 className="text-lg font-bold text-gray-900">
							{isStageManager
								? "FAME PRO PLUS"
								: "FAME LINK PRO PLUS"}
						</h3>
						<p className="text-2xl font-bold text-amber-600 mt-1">
							$40
							<span className="text-sm font-normal text-gray-500">
								/month
							</span>
						</p>
						<ul className="mt-3 space-y-1.5 text-sm text-gray-600">
							<li>
								✓{" "}
								{isStageManager
									? "2 extra events per quantity"
									: "2 extra shows per quantity"}
							</li>
							<li>
								✓ Adjustable quantity: 2 – 20 (even numbers)
							</li>
							<li>✓ Cancel anytime</li>
						</ul>
						<div className="mt-4">
							<Button
								onClick={() => handleSubscribe(proPlusPlan)}
								disabled={!!loadingPlan}
								className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
							>
								{loadingPlan === proPlusPlan ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Redirecting...
									</>
								) : (
									<>
										<Crown className="h-4 w-4 mr-2" />
										Subscribe to PRO PLUS
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
