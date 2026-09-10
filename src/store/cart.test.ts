import { beforeEach, describe, expect, it } from "vitest";
import type { CartItem } from "@/types";
import { getCartItemUnitPrices, getCartPricing, useCartStore } from "./cart";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item", productId: "product", productName: "Prodotto", quantity: 1,
    unitPrice: 10, standardUnitPrice: 10, variantPriceDelta: 0,
    additions: [], removals: [], totalPrice: 10, ...overrides,
  };
}

beforeEach(() => useCartStore.setState({ items: [], orderType: "ASPORTO" }));

describe("prezzi carrello in centesimi", () => {
  it("calcola quantità multiple, variante ed extra sul prezzo Club", () => {
    const clubItem = item({ quantity: 2, unitPrice: 24, standardUnitPrice: 37, variantPriceDelta: 2, additions: [{ name: "Extra", price: 3 }], totalPrice: 58 });
    expect(getCartItemUnitPrices(clubItem)).toEqual({ payableUnitPrice: 29, standardUnitPrice: 37 });
    expect(getCartPricing([clubItem])).toMatchObject({ subtotal: 58, standardSubtotal: 74, savings: 16, total: 58 });
  });

  it("gestisce carrelli misti senza attribuire sconti ai prodotti a prezzo pieno", () => {
    const pricing = getCartPricing([
      item({ id: "club", quantity: 2, unitPrice: 24, standardUnitPrice: 32, totalPrice: 48 }),
      item({ id: "full", quantity: 3, unitPrice: 4, standardUnitPrice: 4, totalPrice: 12 }),
      item({ id: "builder", productId: "builder", unitPrice: 0, standardUnitPrice: 40, additions: [{ name: "Base e ingredienti", price: 40 }], totalPrice: 40 }),
    ]);
    expect(pricing).toMatchObject({ subtotal: 100, standardSubtotal: 116, savings: 16, total: 100 });
  });

  it("non conta consegna o altre commissioni come risparmio", () => {
    const pricing = getCartPricing([item({ quantity: 2, unitPrice: 24, standardUnitPrice: 32, totalPrice: 48 })], 3.4);
    expect(pricing).toMatchObject({ subtotal: 48, savings: 16, fees: 3.4, total: 51.4 });
    expect(pricing.totalCents).toBe(pricing.subtotalCents + pricing.feesCents);
  });

  it("non mostra risparmio per la pizza configurabile, anche con quantità multiple", () => {
    const builder = item({ productId: "builder", quantity: 2, unitPrice: 0, standardUnitPrice: 40, additions: [{ name: "Base e ingredienti", price: 40 }], totalPrice: 80 });
    expect(getCartPricing([builder])).toMatchObject({ subtotal: 80, standardSubtotal: 80, savings: 0 });
  });

  it("evita residui floating point convertendo ogni componente in centesimi", () => {
    const pricing = getCartPricing([item({ unitPrice: 0.1, standardUnitPrice: 0.6, additions: [{ name: "Extra", price: 0.2 }], totalPrice: 0.3 })]);
    expect(pricing).toMatchObject({ subtotalCents: 30, standardSubtotalCents: 60, savingsCents: 30 });
  });

  it("espone separatamente subtotale e risparmio attraverso lo store", () => {
    useCartStore.setState({ items: [item({ quantity: 2, unitPrice: 24, standardUnitPrice: 32, totalPrice: 48 })] });
    expect(useCartStore.getState().getSubtotal()).toBe(48);
    expect(useCartStore.getState().getClubSavings()).toBe(16);
  });
});
