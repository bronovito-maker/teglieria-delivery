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
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: "ASPORTO",

      setOrderType: (type) => set({ orderType: type }),

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, id: crypto.randomUUID() },
          ],
        })),

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
                        totalPrice:
                          (i.unitPrice +
                            i.variantPriceDelta +
                            i.additions.reduce((s, a) => s + a.price, 0)) *
                          quantity,
                      }
                    : i
                ),
        })),

      clearCart: () => set({ items: [], orderType: "ASPORTO" }),

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.totalPrice, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "teglieria-cart" }
  )
);
