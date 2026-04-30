"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatTime, formatOrderCode } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithItems } from "@/types";

const STATUS_STEPS = ["RECEIVED", "CONFIRMED", "READY", "OUT", "DELIVERED"];

export default function StatoOrdinePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [showRegisterBanner, setShowRegisterBanner] = useState(false);
  const [guestData, setGuestData] = useState<{ name: string; email: string; phone: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const raw = sessionStorage.getItem("guestOrderData");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setGuestData(parsed);
            setShowRegisterBanner(true);
          } catch {}
        }
      }
    });
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let cancelled = false;

    const scheduleNext = (status?: string) => {
      if (cancelled) return;
      if (status === "DELIVERED" || status === "CANCELLED") return;
      const ms = status === "RECEIVED" ? 12000 : 8000;
      timeout = setTimeout(fetchOrder, ms);
    };

    async function fetchOrder() {
      try {
        setRefreshing(true);
        const token = searchParams.get("token");
        const qs = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/ordini/${id}${qs}`);
        if (!res.ok) {
          setError(true);
          scheduleNext();
          return;
        }
        const data = await res.json();
        setOrder(data);
        setLastUpdatedAt(new Date());
        setError(false);

        scheduleNext(data.status);
      } catch {
        setError(true);
        scheduleNext();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    fetchOrder();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [id, searchParams]);

  if (error && !order) {
    return (
      <div className="text-center py-12 px-6">
        <p className="text-red-500 font-semibold">Non riusciamo ad aggiornare l&apos;ordine adesso.</p>
        <p className="text-charcoal/45 text-sm mt-2">Controlla la connessione e ricarica tra qualche secondo.</p>
      </div>
    );
  }
  if (!order) return <p className="text-center py-12 text-gray-400">Caricamento...</p>;

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-lg mx-auto py-12 px-6 bg-warm-light min-h-screen">
      <div className="reveal active flex flex-col items-center text-center mb-10">
        <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-4 px-4 py-1.5 border border-terracotta/20 rounded-full bg-white/50">
          Tracking Online
        </span>
        <h1 className="text-4xl md:text-5xl font-display tracking-tight text-charcoal">
          Stato <span className="text-terracotta">Ordine.</span>
        </h1>
        <p className="text-sm font-body italic text-charcoal/40 mt-4 tracking-widest uppercase">Ordine #{formatOrderCode(order)}</p>
        <p className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/30 mt-3">
          {refreshing ? "Aggiornamento in corso..." : lastUpdatedAt ? `Aggiornato alle ${formatTime(lastUpdatedAt)}` : "Aggiornamento live"}
        </p>
      </div>

      {order.status === "CANCELLED" ? (
        <div className="bg-charcoal border border-charcoal rounded-[2.5rem] p-10 text-center mb-10 shadow-2xl">
          <div className="text-4xl mb-6">✕</div>
          <p className="text-white font-display tracking-widest text-xl mb-2">Ordine annullato</p>
          <p className="text-sm text-white/50 font-body italic">Contatta il locale per maggiori informazioni.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 mb-8 shadow-sm">
            <div className="flex items-center justify-center mb-8">
              <span className={`px-6 py-2 rounded-full text-[10px] font-brand font-bold uppercase tracking-[0.2em] shadow-sm ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="flex items-start gap-1 justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex-1 flex flex-col items-center group">
                  <div className={`h-1.5 w-full rounded-full transition-all duration-700 ${i <= currentStepIndex ? "bg-terracotta" : "bg-charcoal/10"}`} />
                  <p className={`text-[8px] mt-4 text-center font-brand font-bold uppercase tracking-widest leading-tight w-full ${i <= currentStepIndex ? "text-terracotta" : "text-charcoal/20"}`}>
                    {ORDER_STATUS_LABELS[step]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {order.status === "RECEIVED" && (
            <div className="bg-marigold/10 border border-marigold/20 rounded-3xl p-6 mb-8 text-center">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-marigold">
                In attesa di conferma...
              </p>
              <p className="text-xs text-charcoal/40 font-body italic mt-2">
                Il tuo ordine è stato ricevuto ed è in attesa di conferma dallo staff.
              </p>
            </div>
          )}
          {order.status === "OUT" && (
            <div className="bg-terracotta/8 border border-terracotta/20 rounded-3xl p-6 mb-8 text-center">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-terracotta">
                Il rider è in arrivo
              </p>
              <p className="text-xs text-charcoal/45 font-body italic mt-2">
                Siamo agli ultimi minuti. Tieni il telefono a portata per eventuali chiamate.
              </p>
            </div>
          )}
        </>
      )}

      {/* Orario stimato */}
      {order.estimatedTime && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 mb-8 shadow-sm text-center">
          <p className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-charcoal/30 mb-2">
            {order.type === "DELIVERY" ? "Consegna prevista" : "Pronto per il ritiro"}
          </p>
          <p className="text-6xl font-brand font-bold text-charcoal tabular-nums leading-none">
            {formatTime(order.estimatedTime)}
          </p>
          <p className="text-[10px] font-body italic text-charcoal/30 mt-3">
            Orario aggiornato in tempo reale
          </p>
        </div>
      )}

      {/* Dettagli ordine */}
      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-charcoal/5 p-8 space-y-8 shadow-sm">
        <header className="flex items-center justify-between border-b border-charcoal/5 pb-6">
          <h2 className="font-brand font-bold uppercase tracking-widest text-xs text-charcoal/30">Dettagli</h2>
          <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-terracotta">
            {order.type === "ASPORTO" ? "Ritiro Sede" : "Consegna"}
          </span>
        </header>

        <div className="space-y-4 font-body text-sm font-medium italic text-charcoal/60">
          <div className="flex justify-between items-center">
            <span className="text-charcoal/30 not-italic uppercase text-[10px] font-brand">Destinatario</span>
            <span>{order.customerName}</span>
          </div>
          {order.address && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-charcoal/30 not-italic uppercase text-[10px] font-brand min-w-fit">Indirizzo</span>
              <span className="text-right">{order.address}</span>
            </div>
          )}
        </div>

        <div className="border-t border-charcoal/5 pt-8 space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span className="font-brand font-bold uppercase tracking-tight text-charcoal/70">
                <span className="text-terracotta text-xs mr-2">{item.quantity}×</span>
                {item.productName}
                {item.variant && <span className="text-[10px] text-charcoal/30 font-body italic block">{item.variant}</span>}
              </span>
              <span className="font-brand font-bold text-charcoal">{formatCurrency(Number(item.totalPrice))}</span>
            </div>
          ))}
          
          <div className="border-t border-charcoal/10 pt-6 flex justify-between items-end">
             <span className="font-brand font-bold uppercase tracking-[0.2em] text-xs text-charcoal/30">Totale</span>
             <span className="text-3xl font-brand font-medium text-terracotta leading-none tracking-tight">
               {formatCurrency(Number(order.total))}
             </span>
          </div>
        </div>

        {/* Status history */}
        <div className="border-t border-charcoal/5 pt-8">
          <p className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/30 mb-6">Cronologia Stati</p>
          <div className="space-y-4">
            {order.statusHistory.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-charcoal/10" />
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest ${ORDER_STATUS_COLORS[log.status]}`}>
                    {ORDER_STATUS_LABELS[log.status]}
                  </span>
                </div>
                <span className="text-[10px] font-body text-charcoal/30 italic">{formatTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Banner registrazione post-ordine */}
      {showRegisterBanner && (
        <div className="mt-8 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-terracotta/10 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta mb-1">La prossima pizza in 10 secondi</p>
              <h3 className="text-lg font-display tracking-tight text-charcoal leading-tight">
                Riordina con un click<span className="text-terracotta">.</span>
              </h3>
            </div>
            <button
              onClick={() => {
                setShowRegisterBanner(false);
                sessionStorage.removeItem("guestOrderData");
              }}
              className="text-charcoal/20 hover:text-charcoal/50 transition-colors shrink-0 p-1 text-lg leading-none"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
          <p className="font-body italic text-charcoal/40 text-sm mb-5 leading-relaxed">
            I tuoi dati sono già qui — bastano 20 secondi per non doverli ridigitare mai più.
          </p>
          <Link
            href={`/registrati?name=${encodeURIComponent(guestData?.name || "")}&email=${encodeURIComponent(guestData?.email || "")}&phone=${encodeURIComponent(guestData?.phone || "")}`}
            onClick={() => sessionStorage.removeItem("guestOrderData")}
            className="block w-full text-center py-3.5 bg-terracotta text-white rounded-2xl font-brand font-bold uppercase tracking-[0.2em] text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_20px_rgba(230,106,38,0.3)]"
          >
            Riordina in 1 click la prossima volta
          </Link>
          <button
            onClick={() => {
              setShowRegisterBanner(false);
              sessionStorage.removeItem("guestOrderData");
            }}
            className="block w-full text-center mt-3 text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/25 hover:text-charcoal/50 transition-colors py-2"
          >
            Non ora
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 items-center">
        <Link
          href="/menu"
          className="w-full text-center py-5 rounded-full bg-terracotta text-white font-brand font-bold uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(197,86,26,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          🍕 Torna al menu
        </Link>
        <Link
          href="/menu?openCart=1"
          className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/30 hover:text-terracotta transition-colors py-4 px-8"
        >
          Apri il carrello
        </Link>
      </div>
    </div>
  );
}
