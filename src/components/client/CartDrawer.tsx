"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { BASE_DELIVERY_FEE, MIN_ORDER_SUBTOTAL } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getSubtotal, getClubSavings, orderType, setOrderType } = useCartStore();
  const subtotal = getSubtotal();
  const clubSavings = getClubSavings();
  const deliveryFee = orderType === "DELIVERY" ? BASE_DELIVERY_FEE : 0;
  const minimumOrderReached = subtotal >= MIN_ORDER_SUBTOTAL;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] h-[100dvh] overflow-hidden overscroll-contain bg-warm-light" role="dialog" aria-modal="true" aria-label="Carrello">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
          <button type="button" onClick={onClose} aria-label="Chiudi carrello" className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5 text-xl text-charcoal/60 transition-colors hover:bg-charcoal/10">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-8">
          {items.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-charcoal/45">Il carrello è vuoto.</p>
              <button type="button" onClick={onClose} className="mt-5 rounded-full bg-terracotta px-6 py-3 text-sm font-brand font-semibold text-white">Torna al menu</button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-[1.15rem] border border-charcoal/5 bg-white px-3.5 py-3 shadow-[0_8px_18px_rgba(26,26,26,0.03)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-brand text-sm font-semibold text-charcoal">{item.productName}</p>
                      {(item.variant || item.additions.length > 0 || item.removals.length > 0) && (
                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-charcoal/45">
                          {[item.variant, item.additions.length > 0 ? `+ ${item.additions.map((a) => a.name).join(", ")}` : "", item.removals.length > 0 ? `− ${item.removals.map((r) => r.name).join(", ")}` : ""].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-brand text-sm font-semibold">{formatCurrency(item.totalPrice)}</p>
                  </div>
                  {(item.standardUnitPrice ?? item.unitPrice) > item.unitPrice && (
                    <p className="mt-1 text-right text-[10px] font-brand font-semibold text-green-700">
                      Risparmi {formatCurrency(((item.standardUnitPrice ?? item.unitPrice) - item.unitPrice) * item.quantity)} con Club
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex h-8 items-center overflow-hidden rounded-full border border-charcoal/10 text-xs font-bold">
                      <button type="button" aria-label={`Diminuisci ${item.productName}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 hover:bg-charcoal/5">−</button>
                      <span className="flex h-8 min-w-8 items-center justify-center border-x border-charcoal/10">{item.quantity}</span>
                      <button type="button" aria-label={`Aumenta ${item.productName}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 hover:bg-charcoal/5">+</button>
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-[10px] font-brand font-bold uppercase tracking-wider text-terracotta hover:underline">Rimuovi</button>
                  </div>
                </div>
              ))}

              <Link href="/menu" className="group mt-4 block overflow-hidden rounded-[1.4rem] border border-charcoal/5 bg-white shadow-[0_10px_24px_rgba(26,26,26,0.04)]">
                <div className="relative aspect-[2.35] w-full overflow-hidden">
                  <Image src="/menu/pizza_laregina.jpg" alt="Pizza La Regina" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 560px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-[9px] font-brand font-bold uppercase tracking-[.25em] text-marigold">Il nostro orgoglio</p>
                    <p className="mt-1 font-display text-xl leading-none text-white sm:text-2xl">La Teglia Perfetta</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-xs font-brand font-semibold text-charcoal/60">
                  Scopri la nostra pizza in teglia <span className="text-terracotta">→</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-charcoal/8 bg-warm-light px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(26,26,26,0.04)] sm:px-8">
            <div className="mb-2.5 flex rounded-full border border-charcoal/10 bg-charcoal/5 p-1">
              {(["ASPORTO", "DELIVERY"] as const).map((type) => (
                <button key={type} type="button" onClick={() => setOrderType(type)} className={`min-h-10 flex-1 rounded-full text-xs font-brand font-bold uppercase tracking-widest transition-all ${orderType === type ? "bg-white text-charcoal shadow-sm" : "text-charcoal/40"}`}>
                  {type === "ASPORTO" ? "Asporto" : "Delivery"}
                </button>
              ))}
            </div>
            <div className="space-y-1 border-t border-charcoal/8 pt-2.5 text-sm">
              {clubSavings > 0 && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-green-50 px-3 py-1.5 text-xs font-brand font-semibold text-green-700">
                  <span>Hai risparmiato essendo membro Club</span><span>-{formatCurrency(clubSavings)}</span>
                </div>
              )}
              <div className="flex justify-between text-charcoal/55"><span>Subtotale</span><span>{formatCurrency(subtotal)}</span></div>
              {orderType === "DELIVERY" && <div className="flex justify-between text-charcoal/55"><span>Consegna</span><span>{formatCurrency(deliveryFee)}</span></div>}
              <div className="flex justify-between pt-1.5 text-2xl font-brand font-semibold"><span>Totale</span><span className="text-terracotta">{formatCurrency(total)}</span></div>
              {!minimumOrderReached && <p className="pt-1.5 text-xs font-brand font-semibold text-terracotta">Aggiungi {formatCurrency(MIN_ORDER_SUBTOTAL - subtotal)} per raggiungere il minimo ordine di {formatCurrency(MIN_ORDER_SUBTOTAL)} (consegna esclusa).</p>}
            </div>
            <button type="button" onClick={clearCart} className="mt-2.5 min-h-10 w-full rounded-xl border border-charcoal/10 text-xs font-brand font-bold uppercase tracking-widest text-charcoal/55 hover:bg-white">Svuota carrello</button>
            <button type="button" disabled={!minimumOrderReached} onClick={() => { onClose(); router.push("/ordine"); }} className="mt-2 min-h-11 w-full rounded-xl bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] text-sm font-brand font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(197,86,26,0.22)] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45">
              Vai al checkout · {formatCurrency(total)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
