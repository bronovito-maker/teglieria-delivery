"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";

export default function OrdinePage() {
  const router = useRouter();
  const { items, orderType, getSubtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<{time: string, available: boolean, remaining: number}[]>([]);

  useEffect(() => {
    async function fetchSlots() {
      try {
        const res = await fetch("/api/logistica/fasce");
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots);
        }
      } catch (err) {
        console.error("Errore fetch fasce:", err);
      }
    }
    fetchSlots();
  }, []);

  const subtotal = getSubtotal();
  const deliveryCost = orderType === "DELIVERY" ? 2.5 : 0; // placeholder
  const total = subtotal + deliveryCost;

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">Il carrello è vuoto.</p>
        <button onClick={() => router.push("/menu")} className="text-orange-600 hover:underline">
          Torna al menu
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/ordini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          channel: "WEB",
          customerName,
          customerPhone,
          address: orderType === "DELIVERY" ? address : null,
          addressDetail: orderType === "DELIVERY" ? addressDetail : null,
          deliveryZone: orderType === "DELIVERY" ? deliveryZone : null,
          deliveryCost: orderType === "DELIVERY" ? deliveryCost : null,
          pickupTime: pickupTime ? new Date(`${today}T${pickupTime}`).toISOString() : null,
          estimatedTime: orderType === "DELIVERY" && pickupTime ? new Date(`${today}T${pickupTime}`).toISOString() : null,
          subtotal,
          total,
          notes: notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice + item.variantPriceDelta,
            totalPrice: item.totalPrice,
            variant: item.variant,
            additions: item.additions.length > 0 ? item.additions : null,
            removals: item.removals.length > 0 ? item.removals : null,
            notes: item.notes,
          })),
        }),
      });

      if (!res.ok) throw new Error("Errore nell'invio dell'ordine");

      const order = await res.json();
      clearCart();
      router.push(`/stato-ordine/${order.id}`);
    } catch {
      setError("Si è verificato un errore. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Completa il tuo ordine</h1>

      {/* Riepilogo */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Riepilogo</h2>
        <div className="space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.productName}
                {item.variant && ` (${item.variant})`}
              </span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between">
            <span>Subtotale</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {orderType === "DELIVERY" && (
            <div className="flex justify-between text-gray-500">
              <span>Consegna</span>
              <span>{formatCurrency(deliveryCost)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Totale</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Tipo ordine badge */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 mb-6 text-center text-sm">
        Ordine: <strong>{orderType === "ASPORTO" ? "Asporto" : "Delivery"}</strong>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
          <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        {orderType === "DELIVERY" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo *</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} required
                placeholder="Via, numero civico"
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Citofono / Scala / Piano</label>
              <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <input value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value)}
                placeholder="Es. Centro, Zona Nord..."
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {orderType === "ASPORTO" ? "Orario di ritiro preferito" : "Fascia oraria preferita"}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setPickupTime(slot.time)}
                className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                  pickupTime === slot.time
                    ? "bg-orange-600 border-orange-600 text-white shadow-md"
                    : slot.available
                    ? "bg-white border-gray-200 text-gray-700 hover:border-orange-500"
                    : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
          {slots.length === 0 && <p className="text-sm text-gray-400">Caricamento fasce orarie...</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {loading ? "Invio in corso..." : "Invia ordine"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Il pagamento avviene {orderType === "ASPORTO" ? "al ritiro" : "alla consegna"}
        </p>
      </form>
    </div>
  );
}
