import { defineConfig, devices } from "@playwright/test";

const rawBaseURL = process.env.E2E_BASE_URL;
if (!rawBaseURL) {
  throw new Error("E2E_BASE_URL obbligatoria: gli E2E devono usare uno staging isolato.");
}

const targetUrl = new URL(rawBaseURL);
const baseURL = targetUrl.toString();
const productionOrigin = new URL(
  process.env.E2E_PRODUCTION_URL ?? "https://www.lateglieria.it",
).origin;
const productionHosts = new Set(["lateglieria.it", "www.lateglieria.it"]);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const isProductionTarget =
  productionHosts.has(targetUrl.hostname.toLowerCase())
  || targetUrl.origin === productionOrigin;

if (localHosts.has(targetUrl.hostname.toLowerCase())) {
  throw new Error(
    "Target E2E non sicuro: localhost non e' ammesso da questo runner.",
  );
}

if (isProductionTarget) {
  if (
    process.env.E2E_ALLOW_PRODUCTION !== "1"
    || process.env.E2E_CONFIRM_SITE_INACTIVE !== "1"
  ) {
    throw new Error(
      "Target E2E di produzione bloccato: servono E2E_ALLOW_PRODUCTION=1 e E2E_CONFIRM_SITE_INACTIVE=1.",
    );
  }
} else if (process.env.E2E_CONFIRM_ISOLATED_STAGING !== "1") {
  throw new Error(
    "Target E2E non sicuro: per lo staging imposta E2E_CONFIRM_ISOLATED_STAGING=1.",
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
