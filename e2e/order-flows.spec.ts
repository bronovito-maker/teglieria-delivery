import { expect, type APIRequestContext, type APIResponse, type Page, test } from "@playwright/test";

type MenuCategory = {
  products: Array<{
    id: string;
    name: string;
    price: string | number;
    configuration?: unknown;
    ingredients?: string[];
  }>;
};

const adminCredentials = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};

const riderCredentials = {
  email: process.env.E2E_RIDER_EMAIL,
  password: process.env.E2E_RIDER_PASSWORD,
};

const e2eOrigin = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function createCustomerOrder(request: APIRequestContext, type: "ASPORTO" | "DELIVERY" = "ASPORTO") {
  const menuRes = await request.get("/api/menu");
  expect(menuRes.ok()).toBe(true);
  const payload = await menuRes.json();
  const categories = (Array.isArray(payload) ? payload : payload.categories) as MenuCategory[];
  const product = categories
    .flatMap((category) => category.products)
    .find((candidate) => !candidate.configuration && Number(candidate.price) > 0);
  test.skip(!product, "Serve almeno un prodotto attivo nel menu per creare un ordine e2e.");
  const selectedProduct = product!;

  const unitPrice = Number(selectedProduct.price);
  const quantity = Math.ceil(12 / unitPrice);
  const orderRes = await request.post("/api/ordini", {
    headers: { origin: e2eOrigin, "Idempotency-Key": `e2e-order-${Date.now()}-${Math.random()}` },
    data: {
      type,
      channel: "WEB",
      customerName: "E2E Cliente",
      customerPhone: "3330000000",
      customerEmail: "e2e-cliente@example.com",
      timeSlot: type === "DELIVERY" ? "19:00" : "18:30",
      ...(type === "DELIVERY"
        ? { address: "Via E2E 1, Cecina", deliveryKm: 1 }
        : {}),
      subtotal: unitPrice * quantity,
      total: unitPrice * quantity,
      paymentMethod: "CONTANTI",
      items: [
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
          ...(Array.isArray(selectedProduct.ingredients)
            ? { ingredients: selectedProduct.ingredients }
            : {}),
        },
      ],
    },
  });

  expect(orderRes.status()).toBe(201);
  return await orderRes.json();
}

async function login(page: Page, path: string, email: string, password: string, expectedPath: RegExp) {
  await page.goto(path);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /entra|accedi/i }).click();
  await expect(page).toHaveURL(expectedPath);
}

async function expectOk(response: APIResponse) {
  if (!response.ok()) {
    throw new Error(`Request failed: ${response.status()} ${await response.text()}`);
  }
  expect(response.ok()).toBe(true);
}

test("cliente crea un ordine", async ({ request }) => {
  const order = await createCustomerOrder(request);
  expect(order.id).toBeTruthy();
  expect(order.status).toBe("RECEIVED");
  expect(order.orderCode).toBeTruthy();
});

test.describe("admin flow", () => {
  test.skip(
    !adminCredentials.email || !adminCredentials.password,
    "Imposta E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD per il flusso admin."
  );

  test("admin conferma un ordine", async ({ page }) => {
  const order = await createCustomerOrder(page.request);
  await login(page, "/admin/login", adminCredentials.email!, adminCredentials.password!, /\/admin\/dashboard/);

  const res = await page.request.patch(`/api/ordini/${order.id}`, {
    headers: { origin: e2eOrigin },
    data: {
      status: "CONFIRMED",
      estimatedTime: new Date(Date.now() + 45 * 60_000).toISOString(),
    },
  });
  await expectOk(res);

  const updated = await (await page.request.get(`/api/ordini/${order.id}`)).json();
  expect(updated.status).toBe("CONFIRMED");
});
});

test.describe("rider flow", () => {
  test.skip(
    !riderCredentials.email || !riderCredentials.password,
    "Imposta E2E_RIDER_EMAIL/E2E_RIDER_PASSWORD per il flusso rider."
  );

  test("rider prende in carico e consegna un ordine", async ({ page }) => {
  test.slow();
  const order = await createCustomerOrder(page.request, "DELIVERY");
  await login(page, "/admin/login", adminCredentials.email!, adminCredentials.password!, /\/admin\/dashboard/);

  const riderLookup = await page.request.get("/api/riders");
  await expectOk(riderLookup);
  const riders = await riderLookup.json() as Array<{ id: string; email?: string | null }>;
  const approvedRider = riders.find((candidate) =>
    candidate.email?.toLowerCase() === riderCredentials.email!.toLowerCase()
  );
  expect(approvedRider?.id).toBeTruthy();

  const adminAssignRes = await page.request.patch(`/api/ordini/${order.id}`, {
    headers: { origin: e2eOrigin },
    data: { riderId: approvedRider!.id, deliveryStatus: "ASSIGNED", status: "CONFIRMED" },
  });
  await expectOk(adminAssignRes);

  const readyRes = await page.request.patch(`/api/ordini/${order.id}`, {
    headers: { origin: e2eOrigin },
    data: { status: "READY" },
  });
  await expectOk(readyRes);

  await page.context().clearCookies();
  await page.goto("/rider/login");
  await page.evaluate(() => localStorage.clear());
  await login(page, "/rider/login", riderCredentials.email!, riderCredentials.password!, /\/rider\/dashboard/);

  const profileRes = await page.request.get("/api/rider/profile");
  await expectOk(profileRes);
  const rider = await profileRes.json();

  expect(rider.id).toBe(approvedRider!.id);

  const outRes = await page.request.patch(`/api/ordini/${order.id}`, {
    headers: { origin: e2eOrigin },
    data: {
      status: "OUT",
      deliveryStatus: "EN_ROUTE",
      statusNote: "[E2E] Partito",
    },
  });
  await expectOk(outRes);

  const deliveredRes = await page.request.patch(`/api/ordini/${order.id}`, {
    headers: { origin: e2eOrigin },
    data: {
      status: "DELIVERED",
      deliveryStatus: "DELIVERED",
      actualTime: new Date().toISOString(),
      statusNote: "[E2E] Consegnato",
    },
  });
  await expectOk(deliveredRes);

  const updated = await (await page.request.get(`/api/ordini/${order.id}`)).json();
  expect(updated.status).toBe("DELIVERED");
});
});
