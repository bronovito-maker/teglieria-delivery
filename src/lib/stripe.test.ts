import { afterEach, describe, expect, it } from "vitest";
import { getStripeWebhookSecret } from "./stripe";

const originalStripeKey = process.env.STRIPE_SECRET_KEY;
const originalLiveSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalTestSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

afterEach(() => {
  process.env.STRIPE_SECRET_KEY = originalStripeKey;
  process.env.STRIPE_WEBHOOK_SECRET = originalLiveSecret;
  process.env.STRIPE_TEST_WEBHOOK_SECRET = originalTestSecret;
});

describe("getStripeWebhookSecret", () => {
  it("usa il secret test quando la chiave è sk_test_", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live";
    process.env.STRIPE_TEST_WEBHOOK_SECRET = "whsec_test";

    expect(getStripeWebhookSecret()).toBe("whsec_test");
  });

  it("mantiene il secret live per una chiave sk_live_", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live";
    process.env.STRIPE_TEST_WEBHOOK_SECRET = "whsec_test";

    expect(getStripeWebhookSecret()).toBe("whsec_live");
  });
});
