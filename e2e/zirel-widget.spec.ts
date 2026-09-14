import { expect, test } from "@playwright/test";

test("il widget Zirel e' visibile e apre la chat", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error"
      && /content security policy/i.test(message.text())
      && /(?:zirel|inline style|inline event handler)/i.test(message.text())
    ) {
      cspErrors.push(message.text());
    }
  });

  await page.goto("/");

  const toggle = page.locator("#chat-toggle-btn");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveCSS("position", "fixed");

  await toggle.click();

  const chat = page.locator("#n8n-widget-mock");
  await expect(chat).toHaveClass(/scale-100/);
  await expect(chat).toBeVisible();
  expect(cspErrors).toEqual([]);
});
