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
  const [paymentMethod, setPaymentMethod] = useState<"CONTANTI" | "POS">("CONTANTI");
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

  // Scroll Reveal Logic
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [slots]);

  const subtotal = getSubtotal();
  const deliveryCost = orderType === "DELIVERY" ? 2.5 : 0;
  const total = subtotal + deliveryCost;

  if (items.length === 0) {
    return (
      <div className="text-center py-24 px-6">
        <div className="text-6xl mb-6 opacity-20">🛒</div>
        <h2 className="text-2xl font-bold mb-4">Il carrello è vuoto</h2>
        <button 
          onClick={() => router.push("/menu")} 
          className="px-8 py-3 bg-[#1d1d1f] text-white rounded-full font-semibold hover:scale-105 transition-transform"
        >
          Vai al Menu
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickupTime) {
      setError("Per favore seleziona un orario.");
      return;
    }
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
          pickupTime: new Date(`${today}T${pickupTime}`).toISOString(),
          timeSlot: pickupTime,
          estimatedTime: orderType === "DELIVERY" ? new Date(`${today}T${pickupTime}`).toISOString() : null,
          subtotal,
          total,
          notes: notes || null,
          paymentMethod,
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
    <div className="max-w-2xl mx-auto pb-24 pt-8 px-4">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gradient mb-2">
          Concludi l&apos;Ordine
        </h1>
        <p className="text-gray-500 text-lg">
          Compila i dettagli e preparati a gustare la nostra teglia.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* SECTION 1: RIEPILOGO */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Riepilogo Ordine</h2>
          <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-[#1d1d1f]">
                      {item.quantity}x {item.productName}
                    </p>
                    {item.variant && <p className="text-sm text-gray-500">{item.variant}</p>}
                  </div>
                  <span className="font-semibold">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200/60 space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Subtotale</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {orderType === "DELIVERY" && (
                <div className="flex justify-between text-gray-500">
                  <span>Consegna</span>
                  <span>{formatCurrency(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-[#1d1d1f] pt-4">
                <span>Totale</span>
                <span className="text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="px-4 py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs font-bold uppercase tracking-wider">
                {orderType === "ASPORTO" ? "Ritiro in Sede" : "Consegna a Domicilio"}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DATI CLIENTE */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Dati Personali</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 ml-4">NOME E COGNOME</label>
              <input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                required
                placeholder="Inserisci il tuo nome"
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 transition-all outline-none" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 ml-4">TELEFONO</label>
              <input 
                type="tel" 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
                required
                placeholder="333 123 4567"
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 transition-all outline-none" 
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: INDIRIZZO (Solo Delivery) */}
        {orderType === "DELIVERY" && (
          <div className="reveal space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Dove Consegniamo?</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-4">INDIRIZZO</label>
                <input 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required
                  placeholder="Via, Piazza, Numero civico"
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-4">CITOFONO / PIANO</label>
                  <input 
                    value={addressDetail} 
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Scala B, Piano 4..."
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 ml-4">ZONA CONSEGNA</label>
                  <input 
                    value={deliveryZone} 
                    onChange={(e) => setDeliveryZone(e.target.value)}
                    placeholder="Es. Quartiere..."
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ORARIO */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
            {orderType === "ASPORTO" ? "Orario Ritiro" : "Orario Consegna"}
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setPickupTime(slot.time)}
                className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                  pickupTime === slot.time
                    ? "bg-[#1d1d1f] border-[#1d1d1f] text-white shadow-xl scale-105"
                    : slot.available
                    ? "bg-white border-gray-100 text-gray-600 hover:border-orange-200"
                    : "bg-gray-50 border-transparent text-gray-300 cursor-not-allowed opacity-50"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
          {slots.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Caricamento disponibilità...</p>}
        </div>

        {/* SECTION 5: PAGAMENTO */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Metodo di Pagamento</h2>
          <div className="flex gap-4 p-2 bg-gray-100/50 rounded-[2rem]">
            <button
              type="button"
              onClick={() => setPaymentMethod("CONTANTI")}
              className={`flex-1 py-4 px-6 rounded-[1.6rem] transition-all flex items-center justify-center gap-3 font-bold ${
                paymentMethod === "CONTANTI"
                  ? "bg-white shadow-xl text-[#1d1d1f] scale-[1.02]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="text-xl">💵</span>
              Contanti
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("POS")}
              className={`flex-1 py-4 px-6 rounded-[1.6rem] transition-all flex items-center justify-center gap-3 font-bold ${
                paymentMethod === "POS"
                  ? "bg-white shadow-xl text-[#1d1d1f] scale-[1.02]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="text-xl">💳</span>
              POS / Carta
            </button>
          </div>
        </div>

        {/* SECTION 6: NOTE */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Note Aggiuntive</h2>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            rows={3}
            placeholder="Hai allergie o richieste particolari per il rider?"
            className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 outline-none resize-none" 
          />
        </div>

        <div className="reveal pt-6">
          {error && <p className="text-center text-red-500 mb-4 font-semibold">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-orange-600 text-white rounded-full font-bold text-xl shadow-2xl hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Elaborazione..." : "Conferma e Invia Ordine"}
          </button>
          <p className="text-center text-gray-400 text-sm mt-6">
            Pagherai direttamente {orderType === "ASPORTO" ? "al bancone" : "alla consegna"}
          </p>
        </div>
      </form>
    </div>
  );
}
