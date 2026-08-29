"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

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
    existing.unitPrice === incoming.unitPrice &&
    (existing.variant ?? "") === (incoming.variant ?? "") &&
    existing.variantPriceDelta === incoming.variantPriceDelta &&
    normalizeText(existing.notes) === normalizeText(incoming.notes) &&
    sameAdditions(existing.additions, incoming.additions) &&
    sameRemovals(existing.removals, incoming.removals)
  );
}

function computeTotalPrice(item: {
  unitPrice: number;
  variantPriceDelta: number;
  additions: CartItem["additions"];
  quantity: number;
}): number {
  const additionsTotal = item.additions.reduce((sum, addition) => sum + addition.price, 0);
  return (item.unitPrice + item.variantPriceDelta + additionsTotal) * item.quantity;
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
              items: [...state.items, { ...item, id: crypto.randomUUID() }],
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
        get().items.reduce((sum, item) => sum + item.totalPrice, 0),

      getClubSavings: () =>
        get().items.reduce((sum, item) => {
          const standardPrice = item.standardUnitPrice ?? item.unitPrice;
          return sum + Math.max(0, standardPrice - item.unitPrice) * item.quantity;
        }, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "teglieria-cart" }
  )
);
