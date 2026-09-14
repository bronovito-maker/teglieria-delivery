import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { BRIDGE_PATH, verifyBridgeSignature, statusFromBackend, canAdvanceStatus, acknowledgmentSchema } from "./gestionale-bridge-contract";
import { validBeverageChoice } from "./beverage-choice";
const now = 1_800_000_000_000;
const secret = "test-secret-never-used-in-production-12345";
function signed(body: string) {
  const timestamp = `${now / 1000}`, nonce = "00000000-0000-4000-8000-000000000001";
  return new Headers({ "x-gestionale-timestamp": timestamp, "x-gestionale-nonce": nonce,
    "x-gestionale-signature": createHmac("sha256", secret).update(`${timestamp}\n${nonce}\nPOST\n${BRIDGE_PATH}\n${body}`).digest("hex") });
}
describe("production bridge authorization", () => {
  it("accepts the exact signed body", () => { const body = '{"operation":"poll"}'; expect(verifyBridgeSignature(body, signed(body), secret, now)).toBe(true); });
  it("rejects altered bodies, expired messages, invalid and missing signatures", () => {
    const body = '{"operation":"poll"}';
    expect(verifyBridgeSignature(body + " ", signed(body), secret, now)).toBe(false);
    expect(verifyBridgeSignature(body, signed(body), secret, now + 121000)).toBe(false);
    expect(verifyBridgeSignature(body, new Headers(), secret, now)).toBe(false);
    expect(verifyBridgeSignature(body, signed(body), "wrong".repeat(10), now)).toBe(false);
  });
});
const state = acknowledgmentSchema.parse({ orderId: "site", order_id: "backend", row_version: 2, acceptance_state: "ACCEPTED", production_state: "received", fulfillment_state: "PENDING", payment_state: "UNPAID", fiscal_state: "NOT_ISSUED", sale_id: null });
it("maps acceptance, kitchen and delivery without regressing the site", () => {
  expect(statusFromBackend(state)).toBe("CONFIRMED");
  expect(statusFromBackend({ ...state, production_state: "PREPARING" })).toBe("PREPARING");
  expect(statusFromBackend({ ...state, fulfillment_state: "READY_FOR_PICKUP" })).toBe("READY");
  expect(statusFromBackend({ ...state, fulfillment_state: "PICKED_UP" })).toBe("DELIVERED");
  expect(statusFromBackend({ ...state, acceptance_state: "REJECTED" })).toBe("CANCELLED");
  expect(canAdvanceStatus("READY", "CONFIRMED")).toBe(false);
  expect(canAdvanceStatus("CANCELLED", "CONFIRMED")).toBe(false);
  expect(canAdvanceStatus("DELIVERED", "CANCELLED")).toBe(false);
  expect(canAdvanceStatus("CONFIRMED", "READY")).toBe(true);
});
it("requires an exact drink selection without affecting other products", () => {
  const name = "Coca-Cola, Coca-Cola Zero o Fanta - lattina";
  expect(validBeverageChoice(name)).toBe(false);
  expect(validBeverageChoice(name, "Fanta Lemon")).toBe(false);
  expect(validBeverageChoice(name, "Coca-Cola Zero")).toBe(true);
  expect(validBeverageChoice("La Regina")).toBe(true);
});
