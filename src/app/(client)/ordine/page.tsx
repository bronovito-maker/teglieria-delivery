"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressAutocomplete from "@/components/client/AddressAutocomplete";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { calculateDeliveryFee, MIN_ORDER_SUBTOTAL } from "@/lib/constants";

const STORE_POSITION = {
  lat: Number.isFinite(Number(process.env.NEXT_PUBLIC_STORE_LAT))
    ? Number(process.env.NEXT_PUBLIC_STORE_LAT)
    : 43.5261962,
  lng: Number.isFinite(Number(process.env.NEXT_PUBLIC_STORE_LNG))
    ? Number(process.env.NEXT_PUBLIC_STORE_LNG)
    : 10.3371522,
};

export default function OrdinePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { items, orderType, setOrderType, getSubtotal, getClubSavings, clearCart, syncPrices } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ name: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Il checkout resta sempre accessibile anche agli ospiti: l'accesso è
  // facoltativo e non deve creare un passaggio bloccante, soprattutto su mobile.
  const [showDetails, setShowDetails] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function applyCustomerSession(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) {
      const role = user?.user_metadata?.role;
      if (!user || role === "admin" || role === "rider") {
        if (!cancelled) {
          setLoggedUser(null);
          setAuthChecked(true);
        }
        return;
      }
      if (!cancelled) {
        const metadata = user.user_metadata ?? {};
        setLoggedUser({
          name: typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : "",
          email: user.email || "",
        });
        setShowDetails(true);
        setCustomerEmail((current) => current || user.email || "");
        setCustomerName((current) => current || (typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : ""));
        setCustomerPhone((current) => current || (typeof metadata.phone === "string" ? metadata.phone : ""));
        setAuthChecked(true);
      }
      // Aggiorna il carrello se il login avviene dopo il caricamento del menu.
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        const data = await response.json();
        const categories = Array.isArray(data) ? data : data.categories;
        if (!cancelled && Array.isArray(categories)) {
          syncPrices(categories.flatMap((category: { products?: Array<{ id: string; price: number | string; standardPrice?: number | string | null }> }) => category.products ?? []));
        }
      } catch {
        // Il checkout resta utilizzabile anche se la sincronizzazione prezzi fallisce.
      }
    }

    async function restoreCustomerData() {
      const { data: { user } } = await supabase.auth.getUser();
      // Accetta customer espliciti e utenti OAuth (Google) senza ruolo admin/rider
      const role = user?.user_metadata?.role;
      const isCustomer = user && role !== "admin" && role !== "rider";
      if (isCustomer) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const phone = user.user_metadata?.phone || "";
        const email = user.email || "";
        const lastAddress = user.user_metadata?.lastAddress || "";
        const lastAddressDetail = user.user_metadata?.lastAddressDetail || "";
        const lastDeliveryZone = user.user_metadata?.lastDeliveryZone || "";
        setCustomerName((current) => current || name);
        setCustomerPhone((current) => current || phone);
        setCustomerEmail((current) => current || email);
        if (lastAddress) setAddress((current) => current || lastAddress);
        if (lastAddressDetail) setAddressDetail((current) => current || lastAddressDetail);
        if (lastDeliveryZone) setDeliveryZone((current) => current || lastDeliveryZone);

        // I metadati possono contenere solo l'ultimo indirizzo: completa i
        // campi usando l'ultimo ordine associato all'account, se disponibile.
        try {
          const response = await fetch("/api/user/orders", { cache: "no-store" });
          if (response.ok) {
            const orders = await response.json();
            const latest = Array.isArray(orders) ? orders[0] : null;
            if (latest && !cancelled) {
              setCustomerName((current) => current || latest.customerName || "");
              setCustomerPhone((current) => current || latest.customerPhone || "");
              setCustomerEmail((current) => current || latest.customerEmail || "");
              setAddress((current) => current || latest.address || "");
              setAddressDetail((current) => current || latest.addressDetail || "");
              setDeliveryZone((current) => current || latest.deliveryZone || "");
            }
          }
        } catch {
          // Il checkout resta utilizzabile anche se la cronologia non è disponibile.
        }

        setLoggedUser({ name, email });
        setShowDetails(true);
      }
      if (!cancelled) setAuthChecked(true);
    }

    restoreCustomerData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyCustomerSession(session?.user ? session.user : null);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [supabase, syncPrices]);

  async function handleGoogleLogin() {
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?type=customer&next=/ordine`,
      },
    });
    if (oauthError) {
      setError("Impossibile avviare Google. Riprova tra poco.");
    }
  }
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CONTANTI" | "STRIPE">("CONTANTI");
  const [deliveryKm, setDeliveryKm] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [slots, setSlots] = useState<{ time: string, available: boolean, remaining: number }[]>([]);
  const [dayClosed, setDayClosed] = useState(false);
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());
  const [slotsCache, setSlotsCache] = useState<Record<string, { slots: { time: string, available: boolean, remaining: number }[]; closed: boolean }>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const orderRequestKey = useRef(crypto.randomUUID());

  // Pre-check availability for all 7 days shown
  useEffect(() => {
    let cancelled = false;

    async function checkDays() {
      const checks = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });
      const results = await Promise.all(
        checks.map((date) => fetch(`/api/logistica/fasce?date=${date}&type=${orderType}`).then((r) => r.json()).catch(() => ({ closed: true })))
      );
      if (cancelled) return;
      const closed = new Set<string>();
      const cachePatch: Record<string, { slots: { time: string, available: boolean, remaining: number }[]; closed: boolean }> = {};
      results.forEach((r, i) => {
        if (r.closed || r.slots?.length === 0) closed.add(checks[i]);
        cachePatch[`${orderType}:${checks[i]}`] = {
          slots: Array.isArray(r.slots) ? r.slots : [],
          closed: !!r.closed || (Array.isArray(r.slots) && r.slots.length === 0),
        };
      });
      setClosedDays(closed);
      setSlotsCache((prev) => ({ ...prev, ...cachePatch }));

      // Auto-select first available day if the current selection has no slots
      const firstOpen = checks.find((d) => !closed.has(d));
      if (firstOpen) setSelectedDate(firstOpen);
    }
    checkDays();
    return () => { cancelled = true; };
  }, [orderType]);

  useEffect(() => {
    async function fetchSlots() {
      const cacheKey = `${orderType}:${selectedDate}`;
      if (slotsCache[cacheKey]) {
        const cached = slotsCache[cacheKey];
        setSlots(cached.slots);
        setDayClosed(cached.closed);
        setPickupTime("");
        return;
      }
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/logistica/fasce?date=${selectedDate}&type=${orderType}`);
        if (res.ok) {
          const data = await res.json();
          const resolvedSlots = Array.isArray(data.slots) ? data.slots : [];
          const resolvedClosed = !!data.closed || resolvedSlots.length === 0;
          setSlots(resolvedSlots);
          setDayClosed(resolvedClosed);
          setSlotsCache((prev) => ({
            ...prev,
            [cacheKey]: { slots: resolvedSlots, closed: resolvedClosed },
          }));
          setPickupTime(""); // reset orario quando cambia data
        }
      } catch (err) {
        console.error("Errore fetch fasce:", err);
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchSlots();
  }, [selectedDate, orderType, slotsCache]);

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
  const clubSavings = getClubSavings();
  const deliveryCost = orderType === "DELIVERY" ? calculateDeliveryFee(deliveryKm) : 0;
  const total = subtotal + deliveryCost;

  async function handleDeliveryCoordinates(coordinates: { lat: number; lng: number } | null) {
    if (!coordinates) {
      setDeliveryKm(null);
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setDeliveryKm(null);
      setError("Calcolo della distanza non disponibile. Contattaci per verificare la consegna.");
      return;
    }
    setDistanceLoading(true);
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.distanceMeters" },
        body: JSON.stringify({
          origin: { location: { latLng: STORE_POSITION } },
          destination: { location: { latLng: { latitude: coordinates.lat, longitude: coordinates.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
        }),
      });
      if (!response.ok) throw new Error("Routes API error");
      const data = await response.json();
      const meters = data?.routes?.[0]?.distanceMeters;
      if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
        throw new Error("Distance unavailable");
      }
      setDeliveryKm(meters / 1000);
      setError("");
    } catch {
      setDeliveryKm(null);
      setError("Non riesco a calcolare la distanza per la consegna. Controlla l’indirizzo o contattaci.");
    } finally {
      setDistanceLoading(false);
    }
  }

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
    if (subtotal < MIN_ORDER_SUBTOTAL) {
      setError(`Il minimo ordine è ${formatCurrency(MIN_ORDER_SUBTOTAL)}, esclusa la consegna.`);
      return;
    }
    if (!pickupTime) {
      setError("Per favore seleziona un orario.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ordini", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": orderRequestKey.current },
        body: JSON.stringify({
          type: orderType,
          channel: "WEB",
          customerName,
          customerPhone,
          customerEmail: customerEmail.trim() || null,
          address: orderType === "DELIVERY" ? address : null,
          addressDetail: orderType === "DELIVERY" ? addressDetail : null,
          deliveryZone: orderType === "DELIVERY" ? deliveryZone : null,
          deliveryKm: orderType === "DELIVERY" ? deliveryKm : null,
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

      if (paymentMethod === "STRIPE" && order.checkoutUrl) {
        window.location.assign(order.checkoutUrl);
        return;
      }

      if (loggedUser) {
        // Aggiorna profilo utente con telefono e ultimo indirizzo (fire-and-forget)
        const updateData: Record<string, string> = {};
        if (customerName) updateData.full_name = customerName;
        if (customerPhone) updateData.phone = customerPhone;
        if (orderType === "DELIVERY" && address) updateData.lastAddress = address;
        if (orderType === "DELIVERY" && addressDetail) updateData.lastAddressDetail = addressDetail;
        if (orderType === "DELIVERY" && deliveryZone) updateData.lastDeliveryZone = deliveryZone;
        if (Object.keys(updateData).length > 0) {
          supabase.auth.updateUser({ data: updateData }).catch(() => { });
        }
      } else {
        // Salva dati guest per proposta registrazione post-ordine
        sessionStorage.setItem("guestOrderData", JSON.stringify({
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        }));
      }

      const trackingUrl = order.statusAccessToken
        ? `/stato-ordine/${order.id}?token=${encodeURIComponent(order.statusAccessToken)}`
        : `/stato-ordine/${order.id}`;
      router.push(trackingUrl);
    } catch {
      setError("Si è verificato un errore. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-1 pb-24 pt-2 sm:px-2 sm:pt-4">
      <header className="mb-10 rounded-[2rem] border border-charcoal/5 bg-white px-6 py-7 shadow-[0_10px_24px_rgba(26,26,26,0.035)] sm:px-8 sm:py-8">
        <span className="ds-micro-label text-terracotta/60 mb-4 block">Checkout</span>
        <h1 className="mb-3 font-display text-4xl leading-none tracking-[-0.055em] text-charcoal sm:text-6xl">
          Concludi l&apos;Ordine
        </h1>
        <p className="font-body text-sm italic text-charcoal/55 sm:text-base">
          Compila i dettagli e preparati a gustare la nostra teglia.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
        {/* SECTION 1: RIEPILOGO */}
        <div className="reveal space-y-6">
          <h2 className="ds-micro-label text-charcoal/35">Riepilogo Ordine</h2>
          <div className="rounded-[1.5rem] border border-charcoal/5 bg-white p-6 shadow-[0_10px_24px_rgba(26,26,26,0.03)] sm:rounded-[2rem] sm:p-8">
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
              {clubSavings > 0 && (
                <div className="flex justify-between font-brand font-semibold text-green-700">
                  <span>Hai risparmiato essendo membro Club</span>
                  <span>-{formatCurrency(clubSavings)}</span>
                </div>
              )}
              {orderType === "DELIVERY" && (
                <div className="flex justify-between text-charcoal/50 font-body">
                  <span>Consegna</span>
                  <span>{formatCurrency(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between pt-4 font-brand text-2xl font-semibold text-charcoal">
                <span>Totale</span>
                <span className="text-terracotta">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-6 border-t border-charcoal/8 pt-5">
              <p className="mb-2 text-center text-[11px] font-brand font-bold uppercase tracking-[0.18em] text-charcoal/40">Come vuoi ricevere il tuo ordine?</p>
              <div className="flex rounded-full border border-charcoal/10 bg-charcoal/5 p-1">
                {(["ASPORTO", "DELIVERY"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setOrderType(type);
                      setPickupTime("");
                      setSlots([]);
                      setDayClosed(false);
                    }}
                    className={`min-h-10 flex-1 rounded-full text-xs font-brand font-bold uppercase tracking-widest transition-all ${orderType === type ? "bg-white text-charcoal shadow-sm" : "text-charcoal/40"}`}
                  >
                    {type === "ASPORTO" ? "Ritiro in sede" : "Consegna a domicilio"}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] font-brand font-semibold uppercase tracking-[0.12em] text-charcoal/35">
                Ritiro in sede dalle 16:00 · Delivery dalle 19:00 alle 22:00
              </p>
            </div>
          </div>
        </div>

        {/* ACCESSO RAPIDO */}
        <div className="reveal">
          {!authChecked ? (
            <div className="animate-pulse rounded-[2rem] border border-charcoal/8 bg-white/55 p-6 shadow-sm" aria-label="Verifica accesso in corso" aria-busy="true">
              <div className="h-4 w-36 rounded-full bg-charcoal/10" />
              <div className="mt-2 h-3 w-64 max-w-full rounded-full bg-charcoal/5" />
              <div className="mt-4 h-[52px] w-full rounded-2xl bg-charcoal/10" />
            </div>
          ) : loggedUser ? (
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
                  <p className="text-xs text-charcoal/40 font-body">Accedi e completi il checkout in pochi secondi.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3 bg-white border border-charcoal/10 rounded-2xl text-sm font-brand font-semibold text-charcoal hover:border-charcoal/25 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

        {showDetails && <>
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
                  onChange={(value) => { setAddress(value); setDeliveryKm(null); }}
                  onCoordinatesChange={handleDeliveryCoordinates}
                  required
                  placeholder="Via, Piazza, Numero civico"
                />
                {distanceLoading && <p className="ml-4 text-xs text-charcoal/45">Calcolo della tariffa di consegna…</p>}
                {deliveryKm != null && <p className="ml-4 text-xs text-charcoal/45">Distanza stradale: {deliveryKm.toFixed(1)} km · Consegna: {formatCurrency(deliveryCost)}</p>}
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
          <div className="md:hidden -mx-1 px-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2.5 min-w-max">
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
                    className={`w-[74px] shrink-0 flex flex-col items-center py-3 px-1 rounded-2xl border transition-all gap-1 ${isSelected
                        ? "bg-terracotta border-terracotta text-white shadow-xl"
                        : isClosed
                          ? "bg-charcoal/3 border-charcoal/5 opacity-40 cursor-not-allowed"
                          : "bg-white/50 border-charcoal/10 text-charcoal"
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
          </div>

          <div className="hidden md:grid grid-cols-7 gap-1.5">
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
                  className={`flex flex-col items-center py-3 px-1 rounded-2xl border transition-all gap-1 ${isSelected
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

          {slotsLoading && (
            <p className="text-xs text-charcoal/40 text-center py-3 font-body italic">Aggiorniamo gli orari disponibili...</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => setPickupTime(slot.time)}
                className={`py-3 text-xs font-bold rounded-2xl border transition-all ${pickupTime === slot.time
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
          {!slotsLoading && slots.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nessun orario disponibile per questa data.</p>}
        </div>

        {/* SECTION 5: PAGAMENTO */}
        <div className="reveal space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Metodo di Pagamento</h2>
          <div className="flex gap-4 p-2 bg-charcoal/5 rounded-[2rem]">
            <button
              type="button"
              onClick={() => setPaymentMethod("CONTANTI")}
              className={`flex-1 py-4 px-6 rounded-[1.6rem] transition-all flex items-center justify-center gap-3 font-bold ${paymentMethod === "CONTANTI"
                  ? "bg-white shadow-xl text-charcoal scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
                }`}
            >
              <span className="text-xl">💵</span>
              Contanti
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("STRIPE")}
                className={`flex-1 py-4 px-6 rounded-[1.6rem] transition-all flex items-center justify-center gap-3 font-bold ${paymentMethod === "STRIPE"
                  ? "bg-white shadow-xl text-charcoal scale-[1.02]"
                  : "text-charcoal/40 hover:text-charcoal/60"
                }`}
            >
              <span className="text-xl">💳</span>
              Carta online
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

        <div className="reveal pt-6 pb-24 md:pb-0">
          {error && <p className="text-center text-red-500 mb-4 font-semibold">{error}</p>}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-[linear-gradient(180deg,rgba(250,246,240,0)_0%,rgba(250,246,240,0.88)_22%,rgba(250,246,240,0.98)_100%)] backdrop-blur-sm border-t border-charcoal/8">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-terracotta text-white rounded-full font-bold text-lg shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
            {loading ? "Elaborazione..." : paymentMethod === "STRIPE" ? `Paga con carta · ${formatCurrency(total)}` : `Conferma Ordine · ${formatCurrency(total)}`}
            </button>
          </div>
          <div className="hidden md:block">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-terracotta text-white rounded-full font-bold text-xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
            {loading ? "Elaborazione..." : paymentMethod === "STRIPE" ? "Vai al pagamento sicuro" : "Conferma e Invia Ordine"}
            </button>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            {paymentMethod === "STRIPE"
              ? "Pagamento sicuro con Stripe · carta, Apple Pay o Google Pay"
              : `Pagherai direttamente ${orderType === "ASPORTO" ? "al bancone" : "alla consegna"}`}
          </p>
        </div>
        </>}
      </form>
    </div>
  );
}
