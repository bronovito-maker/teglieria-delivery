"use client";

import { pizzaAllergens, snapshot, type PublicRegistry } from "@/lib/allergens/core";
import { calculatePizzaConfiguration, type PizzaBuilderSelection } from "@/lib/pizza-builder";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import PizzaBuilderConfigurator, {
  createInitialPizzaSelection,
  type PizzaMenuFlavorOption,
} from "@/components/shared/PizzaBuilderConfigurator";

export type { PizzaMenuFlavorOption } from "@/components/shared/PizzaBuilderConfigurator";

export default function PizzaBuilderModal({ product, onClose, menuFlavors }: {
  product: { id: string; name: string; imageUrl?: string | null; allergenRegistry?: PublicRegistry };
  onClose: () => void;
  menuFlavors: PizzaMenuFlavorOption[];
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [selection, setSelection] = useState<PizzaBuilderSelection>(createInitialPizzaSelection);
  const [quantity, setQuantity] = useState(1);
  const calculated = calculatePizzaConfiguration(selection);

  function handleAdd() {
    const registry = product.allergenRegistry;
    const allergenInfo = registry ? snapshot(registry, pizzaAllergens(registry.graph, selection)) : undefined;
    addItem({
      allergenInfo,
      imageUrl: product.imageUrl,
      imageFit: "cover",
      productId: product.id,
      productName: product.name,
      quantity,
      // Il carrello ricava il prezzo dai componenti; l'API lo ricalcola dalla configurazione.
      unitPrice: 0,
      standardUnitPrice: calculated.total,
      variant: JSON.stringify(selection),
      variantPriceDelta: 0,
      additions: calculated.additions,
      removals: [],
      totalPrice: calculated.total * quantity,
    });
    toast.success("Pizza componibile aggiunta al carrello");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[2.5rem] bg-warm-light shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-[2.5rem]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-8 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <span className="ds-micro-label text-terracotta/60">Configuratore</span>
              <h2 className="mt-2 font-display text-4xl leading-none tracking-tight text-charcoal">Crea la tua pizza</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/55">Scegli formato, numero di gusti e composizione di ogni gusto.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="h-10 w-10 shrink-0 rounded-full bg-charcoal/5 text-2xl text-charcoal/50">×</button>
          </div>
          <PizzaBuilderConfigurator value={selection} onChange={setSelection} menuFlavors={menuFlavors} allergenRegistry={product.allergenRegistry} />
        </div>
        <div className="shrink-0 border-t border-charcoal/8 bg-warm-light px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full bg-charcoal/5 p-1">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 text-lg">−</button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 text-lg">+</button>
            </div>
            <button type="button" onClick={handleAdd} className="flex-1 rounded-full bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl">
              Aggiungi · {formatCurrency(calculated.total * quantity)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
