"use client";
import { createContext, useContext } from "react";
import type { CategoryWithProducts, ClubPromotionWithItems } from "@/types";

export type InitialMenuData = { isClubMember: boolean; categories: CategoryWithProducts[]; promotions: ClubPromotionWithItems[] };
const Context = createContext<InitialMenuData | null>(null);
export function MenuInitialDataProvider({ data, children }: { data: InitialMenuData; children: React.ReactNode }) {
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function useInitialMenuData() { return useContext(Context); }
