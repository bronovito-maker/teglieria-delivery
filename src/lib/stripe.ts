import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY non configurata");
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getStripeSiteUrl(origin?: string): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || origin || "").replace(/\/$/, "");
}

export function getStripeWebhookSecret(): string | null {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    return process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || null;
  }
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
