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
      <div className="bg-white w-full max-w-md h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-red-300/35 bg-gradient-to-br from-[#d92d20] via-[#cf2a1d] to-[#bb2418] text-white shadow-[0_12px_24px_rgba(192,38,22,0.25)] backdrop-blur-xl flex items-center justify-between">
          <h2 className="text-lg font-bold">Il tuo ordine</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Tipo ordine */}
        <div className="p-4 border-b">
          <div className="flex rounded-lg border border-red-200/70 overflow-hidden bg-white">
            <button
              onClick={() => setOrderType("ASPORTO")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                orderType === "ASPORTO"
                  ? "bg-gradient-to-br from-[#d92d20] via-[#cf2a1d] to-[#bb2418] text-white"
                  : "text-gray-700 hover:bg-red-50/50"
              }`}
            >
              Asporto
            </button>
            <button
              onClick={() => setOrderType("DELIVERY")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                orderType === "DELIVERY"
                  ? "bg-gradient-to-br from-[#d92d20] via-[#cf2a1d] to-[#bb2418] text-white"
                  : "text-gray-700 hover:bg-red-50/50"
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
            <div key={item.id} className="bg-gray-50 rounded-lg p-3">
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
                  {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                </div>
                <p className="font-semibold text-sm ml-2">{formatCurrency(item.totalPrice)}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border rounded text-sm">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-0.5 hover:bg-gray-100">-</button>
                  <span className="px-2">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-0.5 hover:bg-gray-100">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 hover:underline">Rimuovi</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>Totale</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <button
              onClick={clearCart}
              className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"
            >
              Svuota carrello
            </button>
            <button
              onClick={handleCheckout}
              className="w-full py-3 text-white rounded-lg font-medium bg-gradient-to-br from-[#d92d20] via-[#cf2a1d] to-[#bb2418] border border-red-300/35 shadow-[0_12px_24px_rgba(192,38,22,0.28)] backdrop-blur-xl hover:brightness-105 transition-all"
            >
              Procedi all&apos;ordine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
