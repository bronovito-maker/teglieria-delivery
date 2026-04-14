"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getSubtotal, orderType, setOrderType } =
    useCartStore();

  if (!open) return null;

  function handleCheckout() {
    onClose();
    router.push("/ordine");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-warm-light w-full max-w-md h-full flex flex-col border-l border-charcoal/5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/20 bg-gradient-to-br from-[#f17a3c] via-[#e66a26] to-[#c5561a] text-white shadow-[0_8px_20px_rgba(197,86,26,0.2)] backdrop-blur-xl flex items-center justify-between">
          <h2 className="text-xl font-brand uppercase tracking-wider">Il tuo ordine</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Tipo ordine */}
        <div className="p-4 border-b border-charcoal/5">
          <div className="flex rounded-full border border-charcoal/10 overflow-hidden bg-charcoal/5 p-1">
            <button
              onClick={() => setOrderType("ASPORTO")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${
                orderType === "ASPORTO"
                  ? "bg-white text-charcoal shadow-sm scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              Asporto
            </button>
            <button
              onClick={() => setOrderType("DELIVERY")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${
                orderType === "DELIVERY"
                  ? "bg-white text-charcoal shadow-sm scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-gray-400 mb-4">Il carrello è vuoto</p>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white tomato-glass border"
              >
                Torna a ordinare
              </button>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="bg-white/40 border border-charcoal/5 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.productName}</p>
                  {item.variant && <p className="text-xs text-gray-500">Variante: {item.variant}</p>}
                  {item.additions.length > 0 && (
                    <p className="text-xs text-gray-500">+ {item.additions.map((a) => a.name).join(", ")}</p>
                  )}
                  {item.removals.length > 0 && (
                    <p className="text-xs text-gray-500">- {item.removals.map((r) => r.name).join(", ")}</p>
                  )}
                </div>
                <p className="font-semibold text-sm ml-2">{formatCurrency(item.totalPrice)}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-charcoal/10 rounded-full text-xs font-bold overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 hover:bg-charcoal/5">-</button>
                  <span className="px-3 border-x border-charcoal/10">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 hover:bg-charcoal/5">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-xs font-bold text-terracotta hover:underline uppercase tracking-tighter">Rimuovi</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-bold text-2xl text-charcoal">
              <span>Totale</span>
              <span className="text-terracotta">{formatCurrency(getSubtotal())}</span>
            </div>
            <button
              onClick={clearCart}
              className="w-full py-3 rounded-xl border border-charcoal/10 text-charcoal/60 font-bold uppercase text-xs tracking-widest hover:bg-charcoal/5 transition-colors"
            >
              Svuota carrello
            </button>
            <button
              onClick={handleCheckout}
              className="w-full py-4 text-white rounded-xl font-bold uppercase tracking-widest bg-gradient-to-br from-[#f17a3c] via-[#e66a26] to-[#c5561a] border border-white/10 shadow-[0_12px_24px_rgba(197,86,26,0.25)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Procedi all&apos;ordine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
