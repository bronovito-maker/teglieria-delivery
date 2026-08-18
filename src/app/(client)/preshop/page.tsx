"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MobileTopBar from "@/components/client/MobileTopBar";
import { formatCurrency } from "@/lib/utils";

type Highlight = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
};

/**
 * Pre-shop: pagina editoriale tra la landing e il catalogo operativo.
 * Presenta il prodotto e pochi consigli, poi accompagna al menu completo.
 */
export default function PreshopPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    fetch("/api/menu")
      .then((response) => response.json())
      .then((categories) => {
        const products = categories.flatMap((category: { products: Highlight[] }) => category.products);
        setHighlights(products.slice(0, 3));
      })
      .catch(() => setHighlights([]));
  }, []);

  return (
    <main className="min-h-screen bg-warm-light text-charcoal">
      <MobileTopBar />

      <section className="mx-auto max-w-4xl px-5 pb-14 pt-28 sm:px-8 sm:pt-36">
        <div className="mb-8 text-center sm:mb-12">
          <p className="ds-micro-label text-terracotta/75">Il nostro orgoglio</p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,9vw,5rem)] font-semibold leading-[.92] tracking-[-.055em]">
            La <span className="text-terracotta">Teglia</span> Perfetta
          </h1>
        </div>

        <div className="relative overflow-hidden rounded-[1.7rem] shadow-[0_18px_38px_rgba(26,26,26,0.12)] sm:rounded-[2rem]">
          <div className="relative aspect-[1.55] w-full">
            <Image src="/images/pizza-teglia-hero.png" alt="Pizza in teglia artigianale" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7">
              <span className="inline-flex rounded-full bg-marigold px-3 py-1 text-[9px] font-brand font-bold uppercase tracking-[.16em] text-charcoal">High hydration</span>
              <p className="mt-3 font-display text-2xl leading-none text-white sm:text-4xl">Croccantezza senza confini.</p>
            </div>
          </div>
        </div>

        <Link href="/menu?type=DELIVERY" className="mx-auto mt-6 flex min-h-11 max-w-xs items-center justify-center rounded-full bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] px-6 text-sm font-brand font-semibold text-white shadow-[0_10px_22px_rgba(197,86,26,0.2)]">
          Ordina ora
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="ds-micro-label text-terracotta/75">I protagonisti</p>
            <h2 className="mt-3 font-display text-[clamp(2.5rem,8vw,4.5rem)] font-semibold leading-[.92] tracking-[-.055em]">Consigli <span className="text-terracotta">artigianali.</span></h2>
          </div>
          <Link href="/menu" className="hidden rounded-full border border-terracotta/20 px-4 py-2 text-[10px] font-brand font-bold uppercase tracking-[.14em] text-terracotta sm:inline-flex">Vedi tutto il menu</Link>
        </div>

        <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-5">
          {highlights.map((product) => (
            <Link key={product.id} href="/menu" className="group block">
              <div className="relative aspect-[1.12] overflow-hidden rounded-[1.25rem] bg-charcoal/5 shadow-sm">
                <Image src="/images/pizza-teglia-slices.png" alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-brand font-bold text-charcoal">{formatCurrency(Number(product.price))}</span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl leading-none text-terracotta sm:text-2xl">{product.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[10px] italic leading-relaxed text-charcoal/45">{product.description || "Pizza in teglia artigianale."}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-lg leading-none text-white">+</span>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/menu" className="mt-8 inline-flex rounded-full border border-terracotta/20 px-4 py-2 text-[10px] font-brand font-bold uppercase tracking-[.14em] text-terracotta sm:hidden">Vedi tutto il menu</Link>
      </section>

      <footer className="mx-auto max-w-4xl border-t border-charcoal/5 px-5 py-12 text-center sm:px-8">
        <Link href="/menu" className="font-brand text-sm font-semibold text-charcoal/60 hover:text-terracotta">Vai al menu completo →</Link>
      </footer>
    </main>
  );
}
