"use client";

import { useEffect } from "react";
import { Clock3, Pizza, Scooter, Store } from "lucide-react";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderStatus, UserOrder } from "./types";

// CONFIRMED è uno stato interno — al cliente mostriamo lo stesso step di RECEIVED
const DELIVERY_STEPS: OrderStatus[] = ["RECEIVED", "PREPARING", "OUT", "DELIVERED"];
const PICKUP_STEPS: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "DELIVERED"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Ricevuto",
  CONFIRMED: "Ricevuto",
  PREPARING: "In preparazione",
  READY: "Pronto al ritiro",
  OUT: "In consegna",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

// Mappa stato DB → indice nello step array
function getStepIndex(status: OrderStatus, steps: OrderStatus[]): number {
  if (status === "CONFIRMED") return 0; // Trattato come RECEIVED
  return Math.max(steps.indexOf(status), 0);
}

type ActiveOrderTrackerProps = {
  order: UserOrder;
  onRefresh: () => Promise<void>;
};

export default function ActiveOrderTracker({ order, onRefresh }: ActiveOrderTrackerProps) {
  const steps = order.type === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentStepIndex = getStepIndex(order.status, steps);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 30000);
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

      <div className="mb-6">
        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-terracotta transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((step, index) => {
            const isActive = index <= currentStepIndex;
            return (
              <div key={step} className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${
                    isActive ? "bg-terracotta text-white" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs leading-tight ${
                    isActive ? "text-zinc-800 font-semibold" : "text-zinc-400"
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
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
