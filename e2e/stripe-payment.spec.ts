import { expect, test } from "@playwright/test";

test("webhook Stripe rifiuta richieste senza firma", async ({ request }) => {
  const response = await request.post("/api/stripe/webhook", { data: {} });
  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("Webhook Stripe");
});

test.describe("Stripe payment flow", () => {
  const webhookSecret = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
    ? process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;
  test.skip(
    process.env.E2E_STRIPE !== "1" || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !webhookSecret,
    "Imposta E2E_STRIPE=1, una STRIPE_SECRET_KEY sk_test_ e il secret del listener Stripe.",
  );

  test("cliente completa un pagamento con carta", async ({ page }) => {
    const menuResponse = await page.request.get("/api/menu");
    expect(menuResponse.ok()).toBe(true);
    const categories = await menuResponse.json();
    const product = categories.flatMap((category: { products: unknown[] }) => category.products)[0] as {
      id: string;
      name: string;
      price: string | number;
    } | undefined;
    test.skip(!product, "Serve almeno un prodotto attivo nel menu.");

    const unitPrice = Number(product!.price);
    const idempotencyKey = `e2e-stripe-${Date.now()}`;
    const orderResponse = await page.request.post("/api/ordini", {
      headers: {
        origin: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        "Idempotency-Key": idempotencyKey,
      },
      data: {
        type: "ASPORTO",
        channel: "WEB",
        customerName: "E2E Stripe",
        customerPhone: "3330000001",
        customerEmail: "e2e-stripe@example.com",
        pickupTime: new Date(Date.now() + 90 * 60_000).toISOString(),
        timeSlot: "18:30",
        subtotal: unitPrice,
        total: unitPrice,
        paymentMethod: "STRIPE",
        items: [{ productId: product!.id, productName: product!.name, quantity: 1, unitPrice, totalPrice: unitPrice }],
      },
    });
    expect(orderResponse.status()).toBe(201);
    const order = await orderResponse.json();
    expect(order.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    await page.goto(order.checkoutUrl);
    const cardButton = page.getByRole("button", { name: /pay with card/i });
    await cardButton.evaluate((element) => (element as HTMLElement).click());
    const findCardFrame = async () => {
      for (const frame of page.frames()) {
        if (await frame.locator('input[name="cardNumber"], input[name="cardnumber"], input[autocomplete="cc-number"]').count()) {
          return frame;
        }
      }
      return undefined;
    };
    await expect.poll(findCardFrame, { timeout: 15_000, intervals: [250, 500, 1_000] }).toBeTruthy();
    const cardFrame = await findCardFrame();
    expect(cardFrame, "Stripe card iframe non trovato").toBeTruthy();
    const numberInput = cardFrame!.locator('input[name="cardNumber"], input[name="cardnumber"], input[autocomplete="cc-number"]');
    const expiryInput = cardFrame!.locator('input[name="cardExpiry"], input[name="exp-date"], input[autocomplete="cc-exp"]');
    const cvcInput = cardFrame!.locator('input[name="cardCvc"], input[name="cvc"], input[autocomplete="cc-csc"]');
    await numberInput.fill("4242 4242 4242 4242");
    await expiryInput.fill("12/34");
    await cvcInput.fill("123");
    const billingNameInput = cardFrame!.locator('input[name="billingName"], input[autocomplete="cc-name"]');
    if (await billingNameInput.count()) await billingNameInput.fill("E2E Stripe");
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count()) await emailInput.first().fill("e2e-stripe@example.com");
    await page.getByTestId("hosted-payment-submit-button").click();
    await expect(page).toHaveURL(/\/stato-ordine\//, { timeout: 30_000 });
    await expect.poll(async () => {
      const trackingResponse = await page.request.get(`/api/ordini/${order.id}?token=${encodeURIComponent(order.statusAccessToken)}`);
      if (!trackingResponse.ok()) return "REQUEST_FAILED";
      return (await trackingResponse.json()).paymentStatus;
    }, { timeout: 30_000, intervals: [1_000, 2_000, 5_000] }).toBe("PAID");
  });
});
