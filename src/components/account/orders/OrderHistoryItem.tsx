"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { UserOrder } from "./types";

type OrderHistoryItemProps = {
  order: UserOrder;
};

const STATUS_STYLE: Record<UserOrder["status"], string> = {
  RECEIVED: "bg-zinc-100 text-zinc-700",
  CONFIRMED: "bg-zinc-100 text-zinc-700",
  PREPARING: "bg-marigold/15 text-amber-700",
  READY: "bg-marigold/15 text-amber-700",
  OUT: "bg-terracotta/10 text-terracotta",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

const STATUS_LABEL: Record<UserOrder["status"], string> = {
  RECEIVED: "Ricevuto",
  CONFIRMED: "Confermato",
  PREPARING: "In preparazione",
  READY: "Pronto al ritiro",
  OUT: "In consegna",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

export default function OrderHistoryItem({ order }: OrderHistoryItemProps) {
  const router = useRouter();
  const previewItems = order.items.slice(0, 3).map((item) => `${item.quantity}x ${item.name}`);
  const hasMore = order.items.length > 3;
  const orderLabel = order.orderCode ?? `#${order.orderNumber}`;

  return (
    <article className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{formatDateTime(order.createdAt)}</p>
          <h3 className="text-lg font-semibold text-zinc-800">Ordine {orderLabel}</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        {previewItems.join(" · ")}
        {hasMore ? ` · +${order.items.length - 3} altri` : ""}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-zinc-800 tabular-nums">{formatCurrency(order.total)}</p>
        <button
          type="button"
          onClick={() => router.push("/menu")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors"
        >
          <RotateCcw size={14} />
          Riordina
        </button>
      </div>
    </article>
  );
}
