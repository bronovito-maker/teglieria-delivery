"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import CartDrawer from "@/components/client/CartDrawer";
import ProductModal from "@/components/client/ProductModal";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";
import { SITE_CONFIG } from "@/lib/site-config";

export default function MenuPage() {
  const { setOrderType } = useCartStore();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Menu La Teglieria",
    inLanguage: "it-IT",
    hasMenuSection: categories.map((cat) => ({
      "@type": "MenuSection",
      name: cat.name,
      hasMenuItem: cat.products.map((product) => ({
        "@type": "MenuItem",
        name: product.name,
        description: product.description || undefined,
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: Number(product.price).toFixed(2),
        },
      })),
    })),
    provider: {
      "@type": "Restaurant",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };

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
    <div className="mx-auto min-h-screen max-w-4xl bg-warm-light pb-32">
      {categories.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema) }} />
      )}
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center px-6 pb-12 pt-10 text-center sm:pb-14 sm:pt-16">
        <div className="reveal active flex flex-col items-center gap-4">
          <span className="ds-micro-label text-terracotta/60">
            Artigianato Romano
          </span>
          <h1 className="ds-heading-hero text-5xl tracking-[-0.055em] sm:text-7xl">
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
        <div className="sticky top-[4.1rem] z-30 border-y border-charcoal/5 bg-warm-light/95 shadow-[0_6px_18px_rgba(26,26,26,0.03)] backdrop-blur-md sm:top-[4.5rem]">
          <div
            ref={navRef}
            className="flex justify-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar"
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

      {categories.map((cat) => (
        <div key={cat.id} id={`cat-${cat.id}`} className="mb-14 sm:mb-16">
          {/* CATEGORY HEADER - Sticky Glass */}
          <div className="mb-4 flex min-h-[3.5rem] items-center justify-between border-b border-charcoal/5 px-6 py-4">
            <h2 className="relative top-[3px] flex items-center text-xs sm:text-sm leading-none font-brand font-semibold uppercase tracking-[0.24em] sm:tracking-[0.3em] text-charcoal/85">
              {cat.name}
            </h2>
            <span className="relative top-[3px] flex items-center text-[10px] leading-none font-brand font-bold uppercase tracking-[0.2em] text-charcoal/30">
              {cat.products.length} Opzioni
            </span>
          </div>
          
          <div className="grid gap-4 px-5 sm:gap-5 sm:px-8">
            {cat.products.map((product, pIdx) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="reveal group flex min-h-[7.5rem] items-center justify-between rounded-[1.5rem] border border-charcoal/5 bg-white px-5 py-5 text-left shadow-[0_8px_20px_rgba(26,26,26,0.025)] transition-all hover:border-terracotta/20 hover:shadow-lg sm:px-6 sm:py-6"
                style={{ transitionDelay: `${pIdx * 50}ms` }}
              >
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-terracotta/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="flex-1 relative z-10 pr-3">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <h3 className="font-display text-[1.45rem] leading-[.96] tracking-tight text-charcoal transition-colors group-hover:text-terracotta sm:text-[1.85rem]">
                      {product.name}
                    </h3>
                    {pIdx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-marigold/10 text-marigold text-[8px] font-brand font-bold uppercase tracking-widest border border-marigold/20">
                        Top
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-charcoal/52 text-[13px] sm:text-sm font-body leading-relaxed line-clamp-2 italic pr-2">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-block font-brand font-semibold text-base sm:text-lg text-charcoal">
                      {formatCurrency(Number(product.price))}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] font-brand font-bold text-charcoal/30">a partire da</span>
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 flex-col items-end justify-center gap-2.5 pl-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/40 shadow-sm transition-all group-hover:bg-terracotta group-hover:text-white active:scale-90 sm:h-10 sm:w-10">
                    <span className="text-xl font-light">+</span>
                  </div>
                  <span className="hidden text-[9px] font-brand font-bold uppercase tracking-[0.16em] text-charcoal/30 sm:block">Personalizza</span>
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

      <div className="px-6 mt-8 flex flex-wrap gap-3">
        <Link href="/servizi" className="rounded-full border border-charcoal/12 bg-white/80 px-4 py-2 text-xs font-brand font-semibold uppercase tracking-[0.16em] text-charcoal/70 hover:text-terracotta">
          Orari e servizi
        </Link>
        <Link href="/#faq" className="rounded-full border border-charcoal/12 bg-white/80 px-4 py-2 text-xs font-brand font-semibold uppercase tracking-[0.16em] text-charcoal/70 hover:text-terracotta">
          FAQ consegna
        </Link>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
