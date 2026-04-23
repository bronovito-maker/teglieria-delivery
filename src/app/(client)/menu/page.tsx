"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import CartDrawer from "@/components/client/CartDrawer";
import ProductModal from "@/components/client/ProductModal";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";

export default function MenuPage() {
  const { setOrderType } = useCartStore();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const itemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const openCartParam = params.get("openCart");
    if (type === "DELIVERY" || type === "ASPORTO") setOrderType(type);
    if (openCartParam === "1") setCartOpen(true);

    const loadMenu = async () => {
      try {
        const response = await fetch("/api/menu");
        const data = await response.json();
        setCategories(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [setOrderType]);

  // Scroll Reveal Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Active category tracking
  useEffect(() => {
    if (!categories.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    categories.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [categories]);

  // Scroll active pill into view in nav
  useEffect(() => {
    if (!activeCategory || !navRef.current) return;
    const pill = navRef.current.querySelector(`[data-cat="${activeCategory}"]`) as HTMLElement;
    if (pill) pill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategory]);

  const scrollToCategory = (catId: string) => {
    const el = document.getElementById(`cat-${catId}`);
    if (!el) return;
    const offset = 100;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="max-w-3xl mx-auto pb-32 bg-warm-light min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center text-center px-6 pt-12 pb-14 md:pb-16">
        <div className="reveal active flex flex-col items-center gap-4">
          <span className="ds-micro-label text-terracotta/60">
            Artigianato Romano
          </span>
          <h1 className="ds-heading-hero text-5xl md:text-7xl">
            I Nostri <span className="text-terracotta">Impasti.</span>
          </h1>
          <div className="w-12 h-1 bg-terracotta/20 rounded-full mt-2" />
        </div>
        <p className="reveal active text-charcoal/55 text-base md:text-lg mt-8 font-body italic max-w-md leading-relaxed">
          Scegli la tua teglia preferita, preparata con 48 ore di lenta maturazione.
        </p>
      </div>

      {/* CATEGORY NAV */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-30 bg-warm-light/95 backdrop-blur-md border-b border-charcoal/5 shadow-[0_6px_18px_rgba(26,26,26,0.03)]">
          <div
            ref={navRef}
            className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === `cat-${cat.id}`;
              return (
                <button
                  key={cat.id}
                  data-cat={`cat-${cat.id}`}
                  onClick={() => scrollToCategory(String(cat.id))}
                  className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-brand font-bold uppercase tracking-widest transition-all ${
                    isActive
                      ? "bg-terracotta text-white shadow-sm shadow-terracotta/15"
                      : "bg-white/70 text-charcoal border border-charcoal/10 hover:bg-white"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {categories.map((cat, idx) => (
        <div key={cat.id} id={`cat-${cat.id}`} className="mb-16">
          {/* CATEGORY HEADER - Sticky Glass */}
          <div className="sticky top-[49px] z-20 mb-6 flex min-h-[4.5rem] items-center justify-between border-b border-charcoal/5 bg-warm-light/90 px-6 py-4 backdrop-blur-md">
            <h2 className="relative top-[4px] flex items-center text-sm leading-none font-brand font-semibold uppercase tracking-[0.3em] text-charcoal/85">
              {cat.name}
            </h2>
            <span className="relative top-[4px] flex items-center text-[10px] leading-none font-brand font-bold uppercase tracking-widest text-charcoal/30">
              {cat.products.length} Opzioni
            </span>
          </div>
          
          <div className="grid gap-6 px-6">
            {cat.products.map((product, pIdx) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="reveal group flex items-start justify-between bg-white/60 backdrop-blur-sm border border-charcoal/5 rounded-[2rem] p-6 hover:shadow-xl hover:shadow-terracotta/5 hover:border-terracotta/20 hover:bg-white transition-all text-left w-full relative overflow-hidden"
                style={{ transitionDelay: `${pIdx * 50}ms` }}
              >
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-terracotta/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="flex-1 relative z-10 pr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[1.85rem] font-display tracking-tight text-charcoal group-hover:text-terracotta transition-colors">
                      {product.name}
                    </h3>
                    {pIdx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-marigold/10 text-marigold text-[8px] font-brand font-bold uppercase tracking-widest border border-marigold/20">
                        Top
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-charcoal/50 text-sm font-body leading-relaxed line-clamp-2 italic">
                      {product.description}
                    </p>
                  )}
                  <span className="mt-3 inline-block font-brand font-semibold text-lg text-charcoal">
                    {formatCurrency(Number(product.price))}
                  </span>
                </div>

                {/* Immagine o pulsante + */}
                <div className="relative z-10 flex-shrink-0 flex flex-col items-end justify-between h-full gap-3">
                  {(product as any).imageUrl ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm">
                      <Image
                        src={(product as any).imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="96px"
                      />
                      <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-terracotta flex items-center justify-center text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-base font-light leading-none">+</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal/40 group-hover:bg-terracotta group-hover:text-white transition-all shadow-sm active:scale-90 mt-auto">
                      <span className="text-xl font-light">+</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="px-6 pb-20">
          <div className="grid gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-[2rem] border border-charcoal/5 bg-white/55 p-6 animate-pulse"
              >
                <div className="h-10 w-2/3 rounded-full bg-charcoal/8" />
                <div className="mt-5 h-5 w-5/6 rounded-full bg-charcoal/6" />
                <div className="mt-3 h-5 w-2/3 rounded-full bg-charcoal/6" />
                <div className="mt-8 h-8 w-24 rounded-full bg-charcoal/10" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <div className="text-center py-32 px-6">
          <div className="text-7xl mb-6 opacity-10 grayscale scale-150 transform transition-transform duration-1000 animate-pulse">🍕</div>
          <h3 className="text-2xl font-display tracking-tight text-charcoal mb-2">Menu non disponibile</h3>
          <p className="text-charcoal/40 font-body italic text-sm">Torna a trovarci tra poco!</p>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* FLOATING CART BUTTON */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-8 right-6 md:right-10 z-40 group flex items-center gap-3 bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] text-white rounded-full px-7 py-4 font-brand font-semibold uppercase tracking-[0.22em] text-[11px] shadow-[0_15px_30px_rgba(185,85,33,0.22)] hover:scale-105 active:scale-95 transition-all border border-white/25"
      >
        <span className="text-lg">🛒</span>
        Carrello
        {itemCount > 0 && (
          <span className="flex items-center justify-center bg-white text-terracotta text-[10px] w-5 h-5 rounded-full font-bold shadow-sm animate-scale-in">
            {itemCount}
          </span>
        )}
      </button>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
