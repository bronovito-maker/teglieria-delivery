import { expect, test } from "@playwright/test";

const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD;

async function login(page: import("@playwright/test").Page) {
  await page.goto("/accedi?next=/menu");
  await page.locator('input[type="email"]').fill(customerEmail!);
  await page.locator('input[type="password"]').fill(customerPassword!);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/menu/);
}

test.describe("customer authentication flow", () => {
  test("login rifiuta credenziali non valide", async ({ page }) => {
    await page.goto("/accedi");
    await page.locator('input[type="email"]').fill("invalid-e2e@example.com");
    await page.locator('input[type="password"]').fill("password-non-valida");
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page.getByText("Email o password non validi.")).toBeVisible();
  });

  test("registrazione mostra la conferma email", async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_REGISTRATION !== "1", "Imposta E2E_ALLOW_REGISTRATION=1 per creare un account di test su Supabase.");
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/registrati");
    const inputs = page.locator("form input");
    await inputs.nth(0).fill("E2E Cliente");
    await inputs.nth(1).fill(email);
    await inputs.nth(2).fill("3330000099");
    await inputs.nth(3).fill("PasswordE2E!123");
    await page.getByRole("button", { name: "Crea Account" }).click();
    await expect(page.getByText("Controlla la Email!")).toBeVisible();
  });

  test("guest vede una sola tariffa", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.getByTestId("club-banner-login")).toBeVisible();
    await expect(page.getByTestId("full-price").first()).toBeVisible();
    await expect(page.getByTestId("club-price")).toHaveCount(0);
  });

  test.describe("authenticated customer", () => {
    test.skip(!customerEmail || !customerPassword, "Imposta E2E_CUSTOMER_EMAIL/E2E_CUSTOMER_PASSWORD per i test autenticati.");

    test("autofill diretto mantiene cookie e sessione dopo il redirect", async ({ page, context }) => {
      await page.goto("/accedi?next=/menu");

      // Simula Apple Passwords/Google Password Manager: assegna il valore
      // direttamente al DOM senza fill() e senza eventi React onChange.
      await page.locator("#login-email").evaluate((input, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
      }, customerEmail!);
      await page.locator("#login-password").evaluate((input, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
      }, customerPassword!);

      await expect(page.locator("#login-email")).toHaveValue(customerEmail!);
      await expect(page.locator("#login-password")).toHaveValue(customerPassword!);
      await page.getByRole("button", { name: "Accedi" }).click();
      await expect(page).toHaveURL(/\/menu/);

      const authCookies = (await context.cookies()).filter(({ name }) => name.startsWith("sb-"));
      expect(authCookies.length).toBeGreaterThan(0);

      const sessionResponse = await page.request.get("/api/auth/session", { headers: { "Cache-Control": "no-cache" } });
      expect(sessionResponse.status()).toBe(200);
      expect(await sessionResponse.json()).toEqual({ authenticated: true });
    });

    test("sessione persistente, banner Club e prezzi Club lato API", async ({ page }) => {
      await login(page);
      await expect(page.getByTestId("club-banner-active")).toBeVisible();
      await expect(page.getByTestId("club-banner-login")).toHaveCount(0);
      await expect(page.getByTestId("club-price").first()).toBeVisible();
      await expect(page.getByTestId("full-price")).toHaveCount(0);

      const menuResponse = await page.request.get("/api/menu");
      expect(menuResponse.ok()).toBe(true);
      const payload = await menuResponse.json();
      const categories = Array.isArray(payload) ? payload : payload.categories;
      const clubProduct = categories.flatMap((category: { products: unknown[] }) => category.products).find(
        (product: { isClubPrice?: boolean }) => product.isClubPrice,
      );
      expect(clubProduct?.isClubPrice).toBe(true);

      await page.reload();
      await expect(page.getByTestId("club-banner-active")).toBeVisible();
      await expect(page.getByTestId("club-banner-login")).toHaveCount(0);
    });

    test("logout rimuove sessione, banner Club e prezzi Club", async ({ page }) => {
      await login(page);
      await expect(page.getByTestId("club-banner-active")).toBeVisible();
      await page.getByRole("button", { name: "Esci" }).click();
      await expect(page.getByRole("button", { name: "Esci" })).toHaveCount(0);
      await expect(page.getByTestId("club-banner-login")).toBeVisible();
      const menuResponse = await page.request.get("/api/menu");
      expect(menuResponse.ok()).toBe(true);
      const payload = await menuResponse.json();
      const categories = Array.isArray(payload) ? payload : payload.categories;
      const firstProduct = categories.flatMap((category: { products: unknown[] }) => category.products)[0] as { isClubPrice?: boolean };
      expect(firstProduct?.isClubPrice).not.toBe(true);
    });

    test("sessione autenticata viene riconosciuta dal checkout", async ({ page }) => {
      await login(page);
      const menuResponse = await page.request.get("/api/menu");
      const payload = await menuResponse.json();
      const categories = Array.isArray(payload) ? payload : payload.categories;
      const product = categories.flatMap((category: { products: unknown[] }) => category.products)[0] as {
        id: string; name: string; price: number | string;
      };
      test.skip(!product, "Serve almeno un prodotto attivo nel menu.");
      const unitPrice = Number(product.price);
      const quantity = Math.ceil(12 / unitPrice);
      const orderResponse = await page.request.post("/api/ordini", {
        headers: { origin: process.env.E2E_BASE_URL ?? "http://localhost:3000", "Idempotency-Key": `e2e-auth-${Date.now()}` },
        data: {
          type: "ASPORTO", channel: "WEB", customerName: "E2E Cliente", customerPhone: "3330000098",
          customerEmail, pickupTime: new Date(Date.now() + 90 * 60_000).toISOString(), timeSlot: "18:30",
          subtotal: unitPrice * quantity, total: unitPrice * quantity, paymentMethod: "CONTANTI",
          items: [{ productId: product.id, productName: product.name, quantity, unitPrice, totalPrice: unitPrice * quantity }],
        },
      });
      expect(orderResponse.status()).toBe(201);
    });
  });
});
