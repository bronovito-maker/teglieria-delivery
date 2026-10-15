import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClientId } from "./client-id";
import { useCartStore } from "@/store/cart";

afterEach(() => vi.unstubAllGlobals());

describe("identificativi client su HTTP e HTTPS", () => {
  it("usa randomUUID quando il browser lo offre", () => {
    const randomUUID = vi.fn(() => "e6bb0c50-5988-4ec7-82cb-70f198f65f48");
    vi.stubGlobal("crypto", { randomUUID });
    expect(createClientId()).toBe("e6bb0c50-5988-4ec7-82cb-70f198f65f48");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("genera UUID v4 distinti usando soltanto getRandomValues, come nella DEMO HTTP", () => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    const ids = Array.from({ length: 100 }, () => createClientId());
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("aggiunge il prodotto e accorpa le quantità anche senza randomUUID", () => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    useCartStore.setState({ items: [], orderType: "ASPORTO" });
    const product = { productId: "regina", productName: "La Regina", quantity: 1, unitPrice: 29, standardUnitPrice: 29, variantPriceDelta: 0, additions: [], removals: [], totalPrice: 29 };
    useCartStore.getState().addItem(product);
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({ id, quantity: 2, totalPrice: 58 });
  });
});
