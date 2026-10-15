"use client";
import { safeSessionStorage } from "@/lib/browser-storage";
import CancelOrder from "@/components/account/orders/CancelOrder";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatOrderTimeSlot, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatDate, formatTime, formatOrderCode } from "@/lib/utils";
import { useCustomerAuth } from "@/components/client/CustomerAuthProvider";
import type { OrderWithItems } from "@/types";
import {customerStatusHistory} from "@/lib/order-history";

import {settleCheckout} from "@/lib/pending-checkout";

const STATUS_STEPS = ["RECEIVED", "CONFIRMED", "READY", "OUT", "DELIVERED"];

export default function StatoOrdinePage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useCustomerAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [showRegisterBanner, setShowRegisterBanner] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  const paymentSeconds = order?.paymentReservationExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(order.paymentReservationExpiresAt)-now)/1000)) : null;


  useEffect(() => {
    if (authLoading || user) return;
    safeSessionStorage.removeItem("guestOrderData"); // Remove obsolete contact prefill from earlier sandbox versions.
    setShowRegisterBanner(safeSessionStorage.getItem("guestOrderCompleted") === "true");
  }, [authLoading, user]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let cancelled = false;

    const scheduleNext = (status?: string, refund?: string) => {
      if (cancelled) return;
      if (status === "DELIVERED" || (status === "CANCELLED" && !["QUEUED","RETRYING","PROCESSING"].includes(refund||""))) return;
      const ms = status === "RECEIVED" ? 12000 : 8000;
      timeout = setTimeout(fetchOrder, ms);
    };

    async function fetchOrder() {
      try {
        setRefreshing(true);
        const currentUrl = new URL(window.location.href);
        const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
        const token = hashParams.get("token");
        const res = await fetch(`/api/ordini/${id}`, {
          headers: token ? { "X-Order-Status-Token": token } : undefined,
        });
        if (!res.ok) {
          setError(true);
          scheduleNext();
          return;
        }
        const data = await res.json();
        setOrder(data);
        settleCheckout(data);
        if (token) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        setLastUpdatedAt(new Date());
        setError(false);

        scheduleNext(data.status,data.automaticRefundStatus);
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
  }, [id]);

  async function retryPayment() {
    setRetryingPayment(true);
    setPaymentError("");
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const token = hashParams.get("token");
    const response = await fetch(`/api/ordini/${id}/checkout`, {
      method: "POST",
      headers: token ? { "X-Order-Status-Token": token } : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.checkoutUrl) {
      setPaymentError(data.error || "Impossibile riavviare il pagamento");
      setRetryingPayment(false);
      return;
    }
    window.location.assign(data.checkoutUrl);
  }

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
    <div className="mx-auto min-h-screen max-w-xl bg-warm-light px-5 pb-16 pt-5 sm:px-8 sm:pt-8">
      <div className="reveal active mb-8 flex flex-col items-center text-center sm:mb-10">
        <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-4 px-4 py-1.5 border border-terracotta/20 rounded-full bg-white/50">
          Tracking Online
        </span>
        <h1 className="font-display text-4xl tracking-[-0.055em] text-charcoal sm:text-5xl">
          Stato <span className="text-terracotta">Ordine.</span>
        </h1>
        <p className="text-sm font-body italic text-charcoal/40 mt-4 tracking-widest uppercase">Ordine #{formatOrderCode(order)}</p>
        <p className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/30 mt-3">
          {refreshing ? "Aggiornamento in corso..." : lastUpdatedAt ? `Aggiornato alle ${formatTime(lastUpdatedAt)}` : "Aggiornamento live"}
        </p>
      </div>

      {order.acceptanceReview && <p className="mb-5 rounded-2xl bg-amber-50 p-5 text-sm">Pagamento ricevuto. Il locale sta verificando la disponibilità prima di confermare la preparazione.</p>}
      {order.automaticRefundStatus && order.automaticRefundStatus!=="NONE" && <p role="status" className="mb-5 rounded-2xl bg-white p-5 text-sm">{order.automaticRefundStatus==="FAILED"?"Il sistema di pagamento richiede una verifica del rimborso. Contatta il locale con il codice ordine.":order.automaticRefundStatus==="COMPLETED"?"Rimborso integrale del pagamento online confermato.":"Rimborso integrale del pagamento online richiesto automaticamente. Stiamo attendendo la conferma del sistema di pagamento."}</p>}
      {order.status === "CANCELLED" ? (
        <div className="bg-charcoal border border-charcoal rounded-[2.5rem] p-10 text-center mb-10 shadow-2xl">
          <div className="text-4xl mb-6">✕</div>
          <p className="text-white font-display tracking-widest text-xl mb-2">Ordine annullato</p>
          <p className="text-sm text-white/50 font-body italic">{order.paymentReviewRequired ? "Il pagamento è arrivato dopo la liberazione della fascia. Contatta il locale per verificarlo: la prenotazione non è stata riattivata." : order.paymentReservationStatus === "EXPIRED" ? "I 15 minuti per pagare sono terminati. La fascia è tornata disponibile." : "Contatta il locale per maggiori informazioni."}</p>
          {order.paymentReservationStatus === "EXPIRED" && <Link href="/menu" className="mt-5 inline-block rounded-full bg-white px-5 py-3 text-charcoal">Scegli una nuova fascia</Link>}
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-6 rounded-[1.8rem] border border-charcoal/5 bg-white p-6 shadow-[0_10px_24px_rgba(26,26,26,0.035)] sm:mb-8 sm:p-8">
            <div className="mb-7 flex items-center justify-center">
              <span className={`px-6 py-2 rounded-full text-[10px] font-brand font-bold uppercase tracking-[0.2em] shadow-sm ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="flex items-start justify-between gap-1">
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
            <div className="mb-6 rounded-[1.4rem] border border-marigold/20 bg-marigold/10 p-5 text-center sm:mb-8">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-marigold">
                In attesa di conferma...
              </p>
              <p className="text-xs text-charcoal/40 font-body italic mt-2">
                Il tuo ordine è stato ricevuto ed è in attesa di conferma dallo staff.
              </p>
            </div>
          )}
          {order.paymentMethod === "STRIPE" && !["PAID", "REFUNDED"].includes(order.paymentStatus) && (
            <div className="mb-6 rounded-[1.4rem] border border-terracotta/20 bg-terracotta/10 p-5 text-center sm:mb-8">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-terracotta">
                {order.paymentStatus === "FAILED" ? "Pagamento non riuscito" : "Pagamento in attesa"}
              </p>
              <p className="text-xs text-charcoal/45 font-body italic mt-2">
                {order.paymentStatus === "FAILED"
                  ? "Il pagamento non è andato a buon fine. Puoi riprovare con la carta."
                  : "Completa il pagamento entro 15 minuti. La precedenza continua anche se chiudi questa pagina."}
              </p>
              {paymentSeconds !== null && order.paymentReservationStatus === "ACTIVE" && <p aria-live="polite" className="mt-3 font-bold">Precedenza: {Math.floor(paymentSeconds/60)}:{String(paymentSeconds%60).padStart(2,"0")}</p>}
              <button
                type="button"
                onClick={retryPayment}
                disabled={retryingPayment || paymentSeconds === 0}
                className="mt-4 rounded-full bg-terracotta px-5 py-2.5 text-xs font-brand font-bold uppercase tracking-widest text-white disabled:opacity-50"
              >
                {retryingPayment ? "Apertura pagamento..." : "Riprova pagamento"}
              </button>
              {paymentError && <p className="mt-3 text-xs font-body text-red-600">{paymentError}</p>}
            </div>
          )}
          {order.status === "OUT" && (
            <div className="mb-6 rounded-[1.4rem] border border-terracotta/20 bg-terracotta/8 p-5 text-center sm:mb-8">
              <p className="text-xs font-brand font-bold uppercase tracking-widest text-terracotta">
                Ordine in consegna
              </p>
              <p className="text-xs text-charcoal/45 font-body italic mt-2">
                Il locale ha indicato la partenza della consegna. Non mostriamo la posizione del fattorino.
              </p>
            </div>
          )}
        </>
      )}

      {order.requiresCapacityDecision && order.status === "RECEIVED" && <div role="status" className="mb-6 rounded-2xl bg-amber-50 p-5 text-sm">Richiesta ricevuta per la nona teglia della fascia. La cassa deve confermare l’orario oppure spostarlo: qui vedrai la decisione.</div>}
      {!!order.scheduleChanges?.length && <section role="status" className="mb-6 rounded-2xl bg-amber-50 p-5"><h2 className="font-bold">Orario aggiornato dalla cassa</h2>{order.scheduleChanges.map((change,index)=><p key={index} className="mt-2 text-sm">{formatDate(change.service_at)} alle {formatTime(change.service_at)} — {change.reason}</p>)}</section>}
      {/* Orario stimato */}
      {order.estimatedTime && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
        <div className="mb-6 rounded-[1.8rem] border border-charcoal/5 bg-white p-7 text-center shadow-[0_10px_24px_rgba(26,26,26,0.035)] sm:mb-8">
          <p className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-charcoal/30 mb-2">
            {order.type === "DELIVERY" ? "Consegna prevista" : "Ritiro previsto"}
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
      <div className="space-y-8 rounded-[1.8rem] border border-charcoal/5 bg-white p-6 shadow-[0_10px_24px_rgba(26,26,26,0.035)] sm:p-8">
        <header className="flex items-center justify-between border-b border-charcoal/5 pb-6">
          <h2 className="font-brand font-bold uppercase tracking-widest text-xs text-charcoal/30">Dettagli</h2>
          <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-terracotta">
            {order.type === "ASPORTO" ? "Ritiro Sede" : "Consegna"}
          </span>
        </header>

        <div className="space-y-4 font-body text-sm font-medium italic text-charcoal/60">
          {order.pickupTime && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-charcoal/30 not-italic uppercase text-[10px] font-brand">Data prenotazione</span>
              <span>{formatDate(order.pickupTime)}</span>
            </div>
          )}
          {order.timeSlot && (
            <div className="flex justify-between items-center">
              <span className="text-charcoal/30 not-italic uppercase text-[10px] font-brand">Fascia richiesta</span>
              <span>{formatOrderTimeSlot(order.type, order.timeSlot)}</span>
            </div>
          )}
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
          {order.items.map((item, index) => (
            <div key={item.id || `${item.productName}-${index}`} className="flex justify-between items-center text-sm">
              <span className="font-brand font-bold uppercase tracking-tight text-charcoal/70">
                <span className="text-terracotta text-xs mr-2">{item.quantity}×</span>
                {item.productName}
                {item.variant && <span className="text-[10px] text-charcoal/30 font-body italic block">{item.variant}</span>}
                {Array.isArray(item.ingredientSnapshot) && item.ingredientSnapshot.length > 0 && (
                  <span className="mt-1 block text-[11px] font-body font-normal normal-case leading-relaxed text-charcoal/45">
                    Ingredienti: {item.ingredientSnapshot.filter((ingredient): ingredient is string => typeof ingredient === "string").join(", ")}
                  </span>
                )}
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
          {Number(order.clubSavings) > 0 && (
            <p className="text-right text-xs font-brand font-semibold text-green-700">Hai risparmiato {formatCurrency(Number(order.clubSavings))} con Club</p>
          )}
        </div>

        {/* Status history */}
        <div className="border-t border-charcoal/5 pt-8">
          <p className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/30 mb-6">Cronologia Stati</p>
          <div className="space-y-4">
            {customerStatusHistory(order.statusHistory).map((log, index) => (
              <div key={log.id || `${log.status}-${log.createdAt}-${index}`} className="flex items-center justify-between">
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
        <div className="mt-6 rounded-[1.6rem] border border-terracotta/10 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 sm:mt-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta mb-1">Il tuo account</p>
              <h3 className="text-lg font-display tracking-tight text-charcoal leading-tight">
                Vuoi registrarti<span className="text-terracotta">.</span>
              </h3>
            </div>
            <button
              onClick={() => {
                setShowRegisterBanner(false);
                safeSessionStorage.removeItem("guestOrderCompleted");
              }}
              className="text-charcoal/20 hover:text-charcoal/50 transition-colors shrink-0 p-1 text-lg leading-none"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
          <p className="font-body italic text-charcoal/40 text-sm mb-5 leading-relaxed">
            Puoi creare un account per consultare i tuoi prossimi ordini.
          </p>
          <Link
            href="/registrati"
            onClick={() => safeSessionStorage.removeItem("guestOrderCompleted")}
            className="block w-full text-center py-3.5 bg-terracotta text-white rounded-2xl font-brand font-bold uppercase tracking-[0.2em] text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_20px_rgba(230,106,38,0.3)]"
          >
            Crea un account
          </Link>
          <button
            onClick={() => {
              setShowRegisterBanner(false);
              safeSessionStorage.removeItem("guestOrderData");
            }}
            className="block w-full text-center mt-3 text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/25 hover:text-charcoal/50 transition-colors py-2"
          >
            Non ora
          </button>
        </div>
      )}

      <CancelOrder order={order} onCancelled={()=>setOrder({...order,status:"CANCELLED"})} />
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
