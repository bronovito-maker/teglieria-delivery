"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";
import { calculateMoneySummary, fromCents, toCents } from "@/lib/money";

type OrderType = "ASPORTO" | "DELIVERY";

interface CartStore {
  items: CartItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getClubSavings: () => number;
  getItemCount: () => number;
  syncPrices: (products: Array<{ id: string; price: number | string; standardPrice?: number | string | null; imageUrl?: string | null; imageFit?: "cover" | "contain"; ingredients?: string[] | null }>) => void;
}

function normalizeText(value?: string): string {
  return (value ?? "").trim();
}

function sameAdditions(a: CartItem["additions"], b: CartItem["additions"]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
  const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
  return sortedA.every(
    (item, idx) => item.name === sortedB[idx].name && item.price === sortedB[idx].price
  );
}

function sameRemovals(a: CartItem["removals"], b: CartItem["removals"]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].map((x) => x.name).sort();
  const sortedB = [...b].map((x) => x.name).sort();
  return sortedA.every((name, idx) => name === sortedB[idx]);
}

function sameCartConfiguration(
  existing: CartItem,
  incoming: Omit<CartItem, "id">
): boolean {
  return (
    existing.productId === incoming.productId &&
    JSON.stringify(existing.allergenInfo) === JSON.stringify(incoming.allergenInfo) &&
    existing.imageUrl === incoming.imageUrl &&
    existing.imageFit === incoming.imageFit &&
    JSON.stringify(existing.ingredients ?? []) === JSON.stringify(incoming.ingredients ?? []) &&
    existing.unitPrice === incoming.unitPrice &&
    existing.standardUnitPrice === incoming.standardUnitPrice &&
    (existing.variant ?? "") === (incoming.variant ?? "") &&
    existing.variantPriceDelta === incoming.variantPriceDelta &&
    normalizeText(existing.notes) === normalizeText(incoming.notes) &&
    sameAdditions(existing.additions, incoming.additions) &&
    sameRemovals(existing.removals, incoming.removals)
  );
}

export function getCartItemUnitPrices(item: {
  unitPrice: number;
  standardUnitPrice?: number;
  variantPriceDelta: number;
  additions: CartItem["additions"];
}) {
  const additionsCents = item.additions.reduce((sum, addition) => sum + toCents(addition.price), 0);
  const payableUnitCents = toCents(item.unitPrice) + toCents(item.variantPriceDelta) + additionsCents;
  const standardUnitCents = item.standardUnitPrice === undefined
    ? payableUnitCents
    : toCents(item.standardUnitPrice);
  return {
    payableUnitPrice: fromCents(payableUnitCents),
    standardUnitPrice: fromCents(Math.max(payableUnitCents, standardUnitCents)),
  };
}

export function getCartPricing(items: readonly CartItem[], fees = 0) {
  return calculateMoneySummary(items.map((item) => ({
    quantity: item.quantity,
    ...getCartItemUnitPrices(item),
  })), fees);
}

function computeTotalPrice(item: Pick<CartItem, "unitPrice" | "standardUnitPrice" | "variantPriceDelta" | "additions" | "quantity">): number {
  const prices = getCartItemUnitPrices(item);
  return fromCents(toCents(prices.payableUnitPrice) * item.quantity);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: "ASPORTO",

      setOrderType: (type) => set({ orderType: type }),

      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex((existing) =>
            sameCartConfiguration(existing, item)
          );

          if (existingIndex === -1) {
            return {
              items: [...state.items, { ...item, totalPrice: computeTotalPrice(item), id: crypto.randomUUID() }],
            };
          }

          const items = [...state.items];
          const existing = items[existingIndex];
          const nextQuantity = existing.quantity + item.quantity;
          items[existingIndex] = {
            ...existing,
            quantity: nextQuantity,
            totalPrice: computeTotalPrice({
              unitPrice: existing.unitPrice,
              standardUnitPrice: existing.standardUnitPrice,
              variantPriceDelta: existing.variantPriceDelta,
              additions: existing.additions,
              quantity: nextQuantity,
            }),
          };

          return { items };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) =>
                  i.id === id
                    ? {
                        ...i,
                        quantity,
                        totalPrice: computeTotalPrice({
                          unitPrice: i.unitPrice,
                          standardUnitPrice: i.standardUnitPrice,
                          variantPriceDelta: i.variantPriceDelta,
                          additions: i.additions,
                          quantity,
                        }),
                      }
                    : i
                ),
        })),

      clearCart: () => set({ items: [], orderType: "ASPORTO" }),

      getSubtotal: () =>
        getCartPricing(get().items).subtotal,

      getClubSavings: () =>
        getCartPricing(get().items).savings,

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      syncPrices: (products) =>
        set((state) => {
          const prices = new Map(products.map((product) => [product.id, product]));
          return {
            items: state.items.map((item) => {
              const product = prices.get(item.productId);
              if (!product) return item;
              const unitPrice = Number(product.price);
              const standardUnitPrice = fromCents(
                toCents(product.standardPrice ?? product.price)
                + toCents(item.variantPriceDelta)
                + item.additions.reduce((sum, addition) => sum + toCents(addition.price), 0),
              );
              const nextItem = {
                ...item,
                unitPrice,
                standardUnitPrice,
              };
              return {
                ...nextItem,
                imageUrl: product.imageUrl,
                imageFit: product.imageFit,
                ingredients: product.ingredients ? [...product.ingredients] : undefined,
                totalPrice: computeTotalPrice(nextItem),
              };
            }),
          };
        }),
    }),
    { name: "teglieria-cart" }
  )
);
