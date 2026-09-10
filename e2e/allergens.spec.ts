import { expect, test } from "@playwright/test";
for (const width of [390, 1280]) {
  test(`registro e configuratore a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/allergeni");
    await expect(page.locator('#legend')).toBeVisible();
    await expect(page.locator('tr[id^="allergene-"]')).toHaveCount(14);
    await expect(page.getByText("Verifica incompleta: chiedi al personale prima dell’ordine.")).toHaveCount(0);
    await expect(page.locator('#allergene-7')).toContainText("Latte");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/allergens-register-${width}.png`, fullPage: true });
    await page.evaluate(() => { window.print = () => { document.body.dataset.printed = "true"; }; });
    await page.getByRole("button", { name: "STAMPA / SALVA PDF" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
    if (width === 1280) {
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("button", { name: "STAMPA / SALVA PDF" })).toBeHidden();
      await expect(page.locator('#legend')).toBeVisible();
      await page.pdf({ path: "tmp/allergens-register-print.pdf", preferCSSPageSize: true });
      await page.emulateMedia({ media: "screen" });
    }
    await page.goto("/menu");
    await page.getByRole("button", { name: /^Apri Crea la tua pizza$/ }).waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const regina = page.locator("article").filter({ has: page.getByRole("button", { name: "Apri La Regina", exact: true }) }).first();
    await expect(page.locator("article").getByRole("button", { name: /Informazioni allergeni/ })).toHaveCount(0);
    await expect(page.locator("article").locator('a[href^="/allergeni"]')).toHaveCount(0);
    await regina.getByRole("button", { name: "Apri La Regina", exact: true }).click();
    await expect(page.getByRole("link", { name: /7 - Latte/ })).toBeVisible();
    await page.getByText("Ingredienti e allergeni", { exact: true }).click();
    await expect(page.getByText("Fiordilatte", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Chiudi dettaglio prodotto" }).click();
    await page.getByRole("button", { name: /^Apri Crea la tua pizza$/ }).click();
    const total = page.locator('[aria-live="polite"]').filter({ hasText: "Allergeni della pizza" });
    await expect(total.locator('a')).toHaveCount(1);
    await page.getByRole("button", { name: /Base bianca/ }).click();
    await expect(total.locator('a')).toHaveCount(2);
    await page.getByRole("button", { name: /Salmone affumicato/ }).click();
    await expect(total.locator('a')).toHaveCount(3);
    await page.getByRole("button", { name: /Granella di pistacchio/ }).click();
    await expect(total.locator('a')).toHaveCount(4);
    await total.getByRole('link', { name: /7 - Latte/ }).focus();
    await expect(total.getByRole('link', { name: /7 - Latte/ })).toBeFocused();
    await page.screenshot({ path: `tmp/allergens-builder-${width}.png`, fullPage: false });
    await page.getByRole("button", { name: /^Aggiungi ·/ }).click();
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("teglieria-cart") ?? "{}").state.items);
    expect(cart[0].allergenInfo.ids).toEqual([1,4,7,8]);
    expect(cart[0].allergenInfo.containers[0].ids).toEqual([1,4,7,8]);
    await page.reload();
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("teglieria-cart") ?? "{}").state.items);
    expect(persisted[0].allergenInfo.ids).toEqual([1,4,7,8]);
    await page.getByRole("link", { name: /Apri carrello/ }).click();
    const drawer=page.getByRole("dialog", { name: "Carrello" });
    await expect(drawer.getByRole("link", { name: /7 - Latte/ })).toBeVisible();
    await expect(drawer.getByText(/Hai risparmiato essendo membro Club/)).toHaveCount(0);
    await expect(drawer.getByText(/Teglia intera 60x40/)).toBeVisible();
    await page.screenshot({ path: `tmp/allergens-cart-${width}.png` });
    await page.goto("/ordine");
    await expect(page.getByRole("link", { name: /7 - Latte/ })).toBeVisible();
  });
}
test("API pubblica senza documenti privati e admin protetto", async ({ request }) => {
  const r=await request.get('/api/allergeni'); expect(r.ok()).toBe(true);
  const data=await r.json(); expect(data.graph.master).toHaveLength(14);
  expect(Object.values(data.graph.nodes).every(n => !Object.hasOwn(n as object, 'sourceRef'))).toBe(true);
  expect((await request.get('/api/admin/allergeni')).status()).toBe(403);
});
