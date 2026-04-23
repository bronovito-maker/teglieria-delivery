"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressAutocomplete from "@/components/client/AddressAutocomplete";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function OrdinePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { items, orderType, getSubtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ name: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Accetta customer espliciti e utenti OAuth (Google) senza ruolo admin/rider
      const role = user?.user_metadata?.role;
      const isCustomer = user && role !== "admin" && role !== "rider";
      if (isCustomer) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const phone = user.user_metadata?.phone || "";
        const email = user.email || "";
        const lastAddress = user.user_metadata?.lastAddress || "";
        setCustomerName(name);
        setCustomerPhone(phone);
        setCustomerEmail(email);
        if (lastAddress) setAddress(lastAddress);
        setLoggedUser({ name, email });
      }
      setAuthChecked(true);
    });
  }, [supabase]);

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?type=customer&next=/ordine`,
      },
    });
  }
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CONTANTI" | "POS">("CONTANTI");
  const [slots, setSlots] = useState<{time: string, available: boolean, remaining: number}[]>([]);
  const [dayClosed, setDayClosed] = useState(false);
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());

  // Pre-check availability for all 7 days shown
  useEffect(() => {
    async function checkDays() {
      const checks = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });
      const results = await Promise.all(
        checks.map((date) => fetch(`/api/logistica/fasce?date=${date}`).then((r) => r.json()).catch(() => ({ closed: true })))
      );
      const closed = new Set<string>();
      results.forEach((r, i) => {
        if (r.closed || r.slots?.length === 0) closed.add(checks[i]);
      });
      setClosedDays(closed);

      // Auto-select first available day if the current selection has no slots
      const firstOpen = checks.find((d) => !closed.has(d));
      if (firstOpen) setSelectedDate(firstOpen);
    }
    checkDays();
  }, []);

  useEffect(() => {
    async function fetchSlots() {
      try {
        const res = await fetch(`/api/logistica/fasce?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots);
          setDayClosed(!!data.closed || data.slots?.length === 0);
          setPickupTime(""); // reset orario quando cambia data
        }
      } catch (err) {
        console.error("Errore fetch fasce:", err);
      }
    }
    fetchSlots();
  }, [selectedDate]);

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
        <h2 className="text-3xl font-display mb-4">Il carrello è vuoto</h2>
        <button 
          onClick={() => router.push("/menu")} 
          className="px-8 py-3 bg-charcoal text-white rounded-full font-semibold hover:scale-105 transition-transform"
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
      const res = await fetch("/api/ordini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          channel: "WEB",
          customerName,
          customerPhone,
          customerEmail: customerEmail.trim() || null,
          address: orderType === "DELIVERY" ? address : null,
          addressDetail: orderType === "DELIVERY" ? addressDetail : null,
          deliveryZone: orderType === "DELIVERY" ? deliveryZone : null,
          deliveryCost: orderType === "DELIVERY" ? deliveryCost : null,
          pickupTime: new Date(`${selectedDate}T${pickupTime}`).toISOString(),
          timeSlot: pickupTime,
          estimatedTime: orderType === "DELIVERY" ? new Date(`${selectedDate}T${pickupTime}`).toISOString() : null,
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (String(data?.detail).includes("STALE_CART")) {
          clearCart();
          throw new Error("Il carrello conteneva prodotti non più disponibili. Svuotato automaticamente — torna al menu e riordina.");
        }
        throw new Error("Errore nell'invio dell'ordine. Riprova.");
      }

      const order = await res.json();
      clearCart();

      if (loggedUser) {
        // Aggiorna profilo utente con telefono e ultimo indirizzo (fire-and-forget)
        const updateData: Record<string, string> = {};
        if (customerPhone) updateData.phone = customerPhone;
        if (orderType === "DELIVERY" && address) updateData.lastAddress = address;
        if (Object.keys(updateData).length > 0) {
          supabase.auth.updateUser({ data: updateData }).catch(() => {});
        }
      } else {
        // Salva dati guest per proposta registrazione post-ordine
        sessionStorage.setItem("guestOrderData", JSON.stringify({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        }));
      }

      router.push(`/stato-ordine/${order.id}`);
    } catch {
      setError("Si è verificato un errore. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 pt-8 px-4">
      <header className="mb-12 rounded-[2.5rem] border border-charcoal/5 bg-white/55 backdrop-blur-sm px-6 py-8 md:px-8 shadow-sm">
        <span className="ds-micro-label text-terracotta/60 mb-4 block">Checkout artigianale</span>
        <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal mb-3 leading-none">
          Concludi l&apos;Ordine
        </h1>
        <p className="text-charcoal/55 text-lg font-body italic">
          Compila i dettagli e preparati a gustare la nostra teglia.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* SECTION 1: RIEPILOGO */}
        <div className="reveal space-y-6">
          <h2 className="ds-micro-label text-charcoal/35">Riepilogo Ordine</h2>
          <div className="bg-white/60 rounded-[2rem] p-8 border border-charcoal/5 shadow-sm">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-brand font-semibold text-charcoal">
                      {item.quantity}x {item.productName}
                    </p>
                    {item.variant && <p className="text-sm text-charcoal/45 font-body">{item.variant}</p>}
                  </div>
                  <span className="font-brand font-semibold">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-charcoal/10 space-y-2">
              <div className="flex justify-between text-charcoal/50 font-body">
                <span>Subtotale</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {orderType === "DELIVERY" && (
                <div className="flex justify-between text-charcoal/50 font-body">
                  <span>Consegna</span>
                  <span>{formatCurrency(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-brand font-semibold text-charcoal pt-4">
                <span>Totale</span>
                <span className="text-terracotta">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="px-4 py-1.5 bg-terracotta/10 text-terracotta rounded-full text-xs font-brand font-semibold uppercase tracking-[0.2em]">
                {orderType === "ASPORTO" ? "Ritiro in Sede" : "Consegna a Domicilio"}
              </div>
            </div>
          </div>
        </div>

        {/* ACCESSO RAPIDO */}
        {authChecked && (
          <div className="reveal">
            {loggedUser ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-green-50/80 border border-green-100 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-brand font-semibold text-green-700">{loggedUser.email}</p>
                  <p className="text-xs text-green-700/70 font-body">
                    {customerName || customerPhone
                      ? "Dati compilati automaticamente"
                      : "Sei loggato — completa i dati per il prossimo ordine li ricorderemo"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/55 border border-charcoal/8 rounded-[2rem] p-6 space-y-4 backdrop-blur-sm shadow-sm">
                <div>
                  <h2 className="text-sm font-brand font-semibold text-charcoal/70 mb-0.5">Hai già un account?</h2>
                  <p className="text-xs text-charcoal/40 font-body">Accedi e i tuoi dati vengono compilati in automatico.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3 bg-white border border-charcoal/10 rounded-2xl text-sm font-brand font-semibold text-charcoal hover:border-charcoal/25 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continua con Google
                </button>
                <p className="text-center text-xs text-charcoal/35 font-body">
                  oppure{" "}
                  <Link href="/accedi?next=/ordine" className="text-terracotta font-semibold hover:underline">
                    accedi con email
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: DATI CLIENTE */}
        <div className="reveal space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="ds-micro-label text-charcoal/35">Dati Personali</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-brand font-semibold text-charcoal/45 ml-4 tracking-[0.18em] uppercase">Nome e cognome</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Inserisci il tuo nome"
                className="w-full px-6 py-4 bg-white/70 border border-charcoal/8 rounded-[1.5rem] focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all outline-none font-body"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-brand font-semibold text-charcoal/45 ml-4 tracking-[0.18em] uppercase">Telefono</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="333 123 4567"
                className="w-full px-6 py-4 bg-white/70 border border-charcoal/8 rounded-[1.5rem] focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all outline-none font-body"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-brand font-semibold text-charcoal/45 ml-4 tracking-[0.18em] uppercase">
              Email <span className="text-charcoal/35 font-body normal-case tracking-normal">(facoltativa — per ricevere aggiornamenti sull&apos;ordine)</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="tuaemail@esempio.it"
              autoComplete="email"
              className="w-full px-6 py-4 bg-white/70 border border-charcoal/8 rounded-[1.5rem] focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all outline-none font-body"
            />
          </div>
        </div>

        {/* SECTION 3: INDIRIZZO (Solo Delivery) */}
        {orderType === "DELIVERY" && (
          <div className="reveal space-y-6">
            <h2 className="ds-micro-label text-charcoal/35">Dove Consegniamo?</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-4">INDIRIZZO</label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  required
                  placeholder="Via, Piazza, Numero civico"
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

        {/* SECTION 4: DATA E ORARIO */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
            {orderType === "ASPORTO" ? "Data e Orario Ritiro" : "Data e Orario Consegna"}
          </h2>

          {/* Selezione data — prossimi 7 giorni */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const dateStr = d.toISOString().split("T")[0];
              const weekday = offset === 0 ? "Oggi" : d.toLocaleDateString("it-IT", { weekday: "short" });
              const day = d.getDate();
              const month = d.toLocaleDateString("it-IT", { month: "short" });
              const isSelected = selectedDate === dateStr;
              const isClosed = closedDays.has(dateStr);
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => !isClosed && setSelectedDate(dateStr)}
                  disabled={isClosed}
                  className={`flex flex-col items-center py-3 px-1 rounded-2xl border transition-all gap-1 ${
                    isSelected
                      ? "bg-terracotta border-terracotta text-white shadow-xl scale-105"
                      : isClosed
                      ? "bg-charcoal/3 border-charcoal/5 opacity-40 cursor-not-allowed"
                      : "bg-white/50 border-charcoal/10 text-charcoal hover:border-terracotta"
                  }`}
                >
                  <span className={`text-[9px] font-brand font-bold uppercase tracking-widest ${isSelected ? "text-white/80" : "text-charcoal/40"}`}>
                    {weekday}
                  </span>
                  <span className={`text-lg font-brand font-medium leading-none ${isSelected ? "text-white" : "text-charcoal"}`}>
                    {day}
                  </span>
                  <span className={`text-[9px] font-brand font-bold uppercase tracking-widest ${isSelected ? "text-white/70" : isClosed ? "text-charcoal/30" : "text-charcoal/30"}`}>
                    {isClosed ? "chiuso" : month}
                  </span>
                </button>
              );
            })}
          </div>

          {dayClosed && slots.length === 0 && (
            <div className="p-4 bg-charcoal/5 rounded-2xl text-center">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal/40">Il locale è chiuso in questa data</p>
            </div>
          )}

          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setPickupTime(slot.time)}
                className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                  pickupTime === slot.time
                    ? "bg-terracotta border-terracotta text-white shadow-xl scale-105"
                    : slot.available
                    ? "bg-white/50 border-charcoal/10 text-charcoal hover:border-terracotta"
                    : "bg-charcoal/5 border-transparent text-charcoal/30 cursor-not-allowed opacity-50"
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
          <div className="flex gap-4 p-2 bg-charcoal/5 rounded-[2rem]">
            <button
              type="button"
              onClick={() => setPaymentMethod("CONTANTI")}
              className={`flex-1 py-4 px-6 rounded-[1.6rem] transition-all flex items-center justify-center gap-3 font-bold ${
                paymentMethod === "CONTANTI"
                  ? "bg-white shadow-xl text-charcoal scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
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
                  ? "bg-white shadow-xl text-charcoal scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
              }`}
            >
              <span className="text-xl">💳</span>
              POS / Carta
            </button>
          </div>
        </div>

        {/* SECTION 6: NOTE */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Note per il Ristorante / Fattorino</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Es. Non citofonare, chiamare al telefono. Allergie: noci."
            className="w-full px-6 py-4 bg-gray-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-orange-500 outline-none resize-none"
          />
        </div>

        <div className="reveal pt-6">
          {error && <p className="text-center text-red-500 mb-4 font-semibold">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-terracotta text-white rounded-full font-bold text-xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
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
