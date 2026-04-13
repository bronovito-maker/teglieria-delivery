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
  const { items, removeItem, updateQuantity, getSubtotal, orderType, setOrderType } = useCartStore();

  if (!open) return null;

  function handleCheckout() {
    onClose();
    router.push("/ordine");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Il tuo ordine</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Tipo ordine */}
        <div className="p-4 border-b">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setOrderType("ASPORTO")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === "ASPORTO" ? "bg-orange-600 text-white" : "hover:bg-gray-50"}`}
            >
              Asporto
            </button>
            <button
              onClick={() => setOrderType("DELIVERY")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === "DELIVERY" ? "bg-orange-600 text-white" : "hover:bg-gray-50"}`}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <p className="text-gray-400 text-center py-8">Il carrello è vuoto</p>
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
              onClick={handleCheckout}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Procedi all&apos;ordine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
