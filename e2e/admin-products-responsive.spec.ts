import { expect, type Page, test } from "@playwright/test";

const adminCredentials = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};

const products = [
  {
    id: "pizza-configurabile-1234567890",
    name: "Crea la tua pizza",
    description: "Pizza personalizzabile",
    price: "0.00",
    clubPrice: null,
    promoPrice: null,
    imageUrl: null,
    categoryId: "cat-pizze",
    active: true,
    sortOrder: 1,
    kitchenNotes: null,
    configuration: { kind: "pizza-builder" },
    category: { id: "cat-pizze", name: "Pizze personalizzabili", slug: "pizze", sortOrder: 1, active: true },
    variants: [],
    additions: [],
    removals: [],
  },
  {
    id: "prodotto-archiviato-1234567890",
    name: "Prodotto non disponibile con un nome volutamente lungo",
    description: null,
    price: "12.50",
    clubPrice: null,
    promoPrice: null,
    imageUrl: null,
    categoryId: "cat-teglie",
    active: false,
    sortOrder: 2,
    kitchenNotes: null,
    configuration: null,
    category: { id: "cat-teglie", name: "Teglie e formati speciali", slug: "teglie", sortOrder: 2, active: true },
    variants: [],
    additions: [],
    removals: [],
  },
];

async function mockAdminCatalog(page: Page) {
  await page.route("**/api/prodotti", (route) => route.fulfill({ json: products }));
  await page.route("**/api/ordini?**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/menu", (route) => route.fulfill({
    json: [
      { ...products[0].category, products: [products[0]] },
      { ...products[1].category, products: [products[1]] },
    ],
  }));
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill(adminCredentials.email!);
  await page.locator('input[type="password"]').fill(adminCredentials.password!);
  await page.getByRole("button", { name: /entra|accedi/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe("catalogo Admin autenticato", () => {
  test.skip(
    !adminCredentials.email || !adminCredentials.password,
    "Imposta E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD per collaudare il catalogo Admin."
  );

  for (const width of [390, 430, 768, 1280]) {
    test(`catalogo Admin responsive a ${width}px`, async ({ page }) => {
      await mockAdminCatalog(page);
      await page.setViewportSize({ width, height: 900 });
      await loginAsAdmin(page);
      await page.goto("/admin/prodotti");

      const mobileCatalog = page.getByTestId("mobile-product-catalog");
      const desktopCatalog = page.getByTestId("desktop-product-catalog");
      if (width < 1280) {
        await expect(mobileCatalog).toBeVisible();
        await expect(desktopCatalog).toBeHidden();
        await expect(page.getByTestId("mobile-product-card")).toHaveCount(2);
        await expect(mobileCatalog.getByText("ID: pizza-configurabile-1234567890")).toBeVisible();
        await expect(mobileCatalog.getByText("Pizze personalizzabili")).toBeVisible();
        await expect(mobileCatalog.getByText("Prezzo variabile", { exact: true })).toBeVisible();
        await expect(mobileCatalog.getByText("Disponibile", { exact: true })).toBeVisible();
        await expect(mobileCatalog.getByRole("link", { name: "Configura" })).toBeVisible();

        for (const control of await mobileCatalog.locator("a, button").all()) {
          const box = await control.boundingBox();
          expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        }
      } else {
        await expect(desktopCatalog).toBeVisible();
        await expect(mobileCatalog).toBeHidden();
        await expect(desktopCatalog.getByRole("columnheader")).toHaveCount(5);
        await expect(desktopCatalog.getByRole("link", { name: "Configura" })).toBeVisible();
      }

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const visibleCatalog = width < 1280 ? mobileCatalog : desktopCatalog;
      const deleteButton = visibleCatalog.getByRole("button", { name: "Elimina" }).first();
      await deleteButton.focus();
      await expect(deleteButton).toBeFocused();
      await deleteButton.press("Enter");
      const confirmation = page.getByRole("dialog", { name: /Eliminare Crea la tua pizza/ });
      await expect(confirmation).toBeVisible();
      await expect(confirmation.getByRole("button", { name: "Indietro" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(confirmation).toBeHidden();

      await page.screenshot({ path: `tmp/admin-products-${width}.png`, fullPage: true });
    });
  }

  test("Configura apre il prodotto richiesto nel nuovo ordine Admin", async ({ page }) => {
    await mockAdminCatalog(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await loginAsAdmin(page);
    await page.goto("/admin/prodotti");
    await page.getByTestId("mobile-product-catalog").getByRole("link", { name: "Configura" }).click();
    await expect(page).toHaveURL(/\/admin\/ordini\/nuovo\?product=pizza-configurabile-1234567890$/);
    await expect(page.getByRole("heading", { name: "Crea la tua pizza" })).toBeVisible();
  });
});
