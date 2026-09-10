"use client";
import { ChevronDown } from "lucide-react";
import { resolveNode, snapshot, type PublicRegistry } from "@/lib/allergens/core";
import AllergenBadges from "./AllergenBadges";

export default function AllergenIngredients({ registry, recipeId }: { registry?: PublicRegistry; recipeId?: string }) {
  const recipe = registry && recipeId ? registry.graph.nodes[recipeId] : undefined;
  if (!registry || !recipe?.components.length) return null;
  return <details className="group/ingredients my-3 rounded-2xl border border-charcoal/[.06] bg-white/60 text-charcoal">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-charcoal/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta [&::-webkit-details-marker]:hidden">
      Ingredienti e allergeni <ChevronDown size={14} className="transition-transform group-open/ingredients:rotate-180" aria-hidden="true" />
    </summary>
    <ul className="mx-4 border-t border-charcoal/5 pb-2">
      {recipe.components.map(id => {
        const info = snapshot(registry, resolveNode(registry.graph, id));
        return <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
          <span className="text-charcoal/75">{registry.graph.nodes[id]?.name}</span>
          <span className="flex items-center gap-2">{info.ids.length > 0 && <AllergenBadges info={{ ...info, pending: [] }} />}{info.pending.length > 0 && <span className="text-[10px] text-charcoal/50">Da verificare</span>}</span>
        </li>;
      })}
    </ul>
  </details>;
}
