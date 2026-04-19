"use client";

import { useEffect } from "react";
import { Clock3, Pizza, Scooter, Store } from "lucide-react";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderStatus, OrderType, UserOrder } from "./types";

// Delivery: Inviato → Accettato → Pronto → In consegna
// Asporto:  Inviato → Accettato → Pronto → Pronto al ritiro
const STEPS = (type: OrderType) => [
  "Inviato",
  "Accettato",
  "Pronto",
  type === "DELIVERY" ? "In consegna" : "Pronto al ritiro",
];

function getActiveStep(status: OrderStatus, type: OrderType): number {
  switch (status) {
    case "RECEIVED":  return 0;
    case "CONFIRMED": return 1;
    case "PREPARING": return 2;
    case "READY":     return type === "ASPORTO" ? 3 : 2;
    case "OUT":       return 3;
    case "DELIVERED": return 3;
    default:          return 0;
  }
}

type ActiveOrderTrackerProps = {
  order: UserOrder;
  onRefresh: () => Promise<void>;
};

export default function ActiveOrderTracker({ order, onRefresh }: ActiveOrderTrackerProps) {
  const steps = STEPS(order.type);
  const activeStep = getActiveStep(order.status, order.type);

  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const orderLabel = order.orderCode ?? `#${order.orderNumber}`;

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400">
            Ordine in corso
          </p>
          <h2 className="text-2xl font-semibold text-zinc-800">{orderLabel}</h2>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            order.type === "DELIVERY"
              ? "bg-terracotta/10 text-terracotta border border-terracotta/20"
              : "bg-marigold/10 text-amber-700 border border-marigold/20"
          }`}
        >
          {order.type === "DELIVERY" ? <Scooter size={14} /> : <Store size={14} />}
          {order.type === "DELIVERY" ? "Delivery" : "Ritiro in sede"}
        </span>
      </div>

      <div className="rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-4 mb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-1">
          Arrivo stimato
        </p>
        <p className="text-3xl md:text-4xl font-black text-zinc-800 tabular-nums">
          {order.estimatedTime ? formatTime(order.estimatedTime) : "—"}
        </p>
        <p className="text-sm text-zinc-500 mt-1 inline-flex items-center gap-1.5">
          <Clock3 size={14} />
          Ultimo aggiornamento: {formatTime(order.updatedAt)}
        </p>
      </div>

      {/* Progress steps */}
      <div className="mb-5 px-1">
        <div className="flex items-start">
          {steps.map((label, i) => {
            const done = i <= activeStep;
            const isLast = i === steps.length - 1;
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                {/* dot + connector row */}
                <div className="flex items-center w-full">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors duration-300 ${
                      done ? "bg-terracotta" : "bg-zinc-200"
                    }`}
                  />
                  {!isLast && (
                    <div
                      className={`flex-1 h-[2px] transition-colors duration-300 ${
                        i < activeStep ? "bg-terracotta" : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
                {/* label */}
                <p
                  className={`mt-2 text-[10px] font-semibold leading-tight text-center w-full transition-colors duration-300 ${
                    done ? "text-terracotta" : "text-zinc-300"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-zinc-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-800 inline-flex items-center gap-1.5">
            <Pizza size={15} />
            Riepilogo prodotti
          </p>
          <span className="text-sm text-zinc-400">{order.items.length} articoli</span>
        </div>
        <div className="space-y-1.5 text-sm">
          {order.items.slice(0, 4).map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="flex items-center justify-between text-zinc-700"
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          {order.items.length > 4 && (
            <p className="text-xs text-zinc-400">+{order.items.length - 4} articoli aggiuntivi</p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-between font-semibold text-zinc-800">
          <span>Totale</span>
          <span className="tabular-nums">{formatCurrency(order.total)}</span>
        </div>
      </div>
    </section>
  );
}
