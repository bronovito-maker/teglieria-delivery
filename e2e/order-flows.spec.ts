import { expect, type APIRequestContext, type APIResponse, type Page, test } from "@playwright/test";

type MenuCategory = {
  products: Array<{
    id: string;
    name: string;
    price: string | number;
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

async function createCustomerOrder(request: APIRequestContext) {
  const menuRes = await request.get("/api/menu");
  expect(menuRes.ok()).toBe(true);
  const payload = await menuRes.json();
  const categories = (Array.isArray(payload) ? payload : payload.categories) as MenuCategory[];
  const product = categories.flatMap((category) => category.products)[0];
  test.skip(!product, "Serve almeno un prodotto attivo nel menu per creare un ordine e2e.");

  const unitPrice = Number(product.price);
  const pickupTime = new Date(Date.now() + 90 * 60_000).toISOString();
  const orderRes = await request.post("/api/ordini", {
    headers: { origin: e2eOrigin },
    data: {
      type: "ASPORTO",
      channel: "WEB",
      customerName: "E2E Cliente",
      customerPhone: "3330000000",
      customerEmail: "e2e-cliente@example.com",
      pickupTime,
      timeSlot: pickupTime.slice(11, 16),
      subtotal: unitPrice,
      total: unitPrice,
      paymentMethod: "CONTANTI",
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
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
  const order = await createCustomerOrder(page.request);
  await login(page, "/rider/login", riderCredentials.email!, riderCredentials.password!, /\/rider\/dashboard/);

  const profileRes = await page.request.get("/api/rider/profile");
  await expectOk(profileRes);
  const rider = await profileRes.json();

  const assignRes = await page.request.patch(`/api/ordini/${order.id}`, {
    data: {
      riderId: rider.id,
      deliveryStatus: "ASSIGNED",
      statusNote: "[E2E] Presa in carico",
    },
  });
  await expectOk(assignRes);

  const outRes = await page.request.patch(`/api/ordini/${order.id}`, {
    data: {
      status: "OUT",
      deliveryStatus: "EN_ROUTE",
      statusNote: "[E2E] Partito",
    },
  });
  await expectOk(outRes);

  const deliveredRes = await page.request.patch(`/api/ordini/${order.id}`, {
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
