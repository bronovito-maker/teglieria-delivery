import { defineConfig, devices } from "@playwright/test";

const rawBaseURL = process.env.E2E_BASE_URL;
if (!rawBaseURL) {
  throw new Error("E2E_BASE_URL obbligatoria: gli E2E devono usare uno staging isolato.");
}

const targetUrl = new URL(rawBaseURL);
const baseURL = targetUrl.toString();
const productionOrigin = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
  : "https://www.lateglieria.it";
const forbiddenHosts = new Set(["lateglieria.it", "www.lateglieria.it", "localhost", "127.0.0.1", "::1"]);

if (
  forbiddenHosts.has(targetUrl.hostname.toLowerCase())
  || targetUrl.origin === productionOrigin
  || process.env.E2E_CONFIRM_ISOLATED_STAGING !== "1"
) {
  throw new Error(
    "Target E2E non sicuro: usa uno staging isolato e imposta E2E_CONFIRM_ISOLATED_STAGING=1.",
  );
}

const requiredCredentials = [
  "E2E_CUSTOMER_EMAIL",
  "E2E_CUSTOMER_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_RIDER_EMAIL",
  "E2E_RIDER_PASSWORD",
] as const;
const missingCredentials = requiredCredentials.filter((name) => !process.env[name]);
if (missingCredentials.length > 0) {
  throw new Error(`Credenziali E2E mancanti: ${missingCredentials.join(", ")}`);
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
