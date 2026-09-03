import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY non configurata");
  // Never let a catalog sync or a checkout request hang indefinitely on an
  // upstream network call. Stripe retries transient failures internally.
  stripeClient ??= new Stripe(secretKey, { timeout: 20_000, maxNetworkRetries: 2 });
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

export function getStripeErrorContext(error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  return {
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : undefined,
    type: typeof value.type === "string" ? value.type : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    declineCode: typeof value.decline_code === "string" ? value.decline_code : undefined,
    statusCode: typeof value.statusCode === "number" ? value.statusCode : undefined,
    requestId: typeof value.requestId === "string" ? value.requestId : undefined,
  };
}
