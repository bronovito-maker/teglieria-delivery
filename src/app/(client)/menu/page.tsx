"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import CartDrawer from "@/components/client/CartDrawer";
import ProductModal from "@/components/client/ProductModal";
import type { PizzaMenuFlavorOption } from "@/components/client/PizzaBuilderModal";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";
import type { ClubPromotionWithItems } from "@/types";
import { SITE_CONFIG } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/client";
import { PIZZA_MENU_FLAVORS } from "@/lib/pizza-builder";

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOrderType, syncPrices } = useCartStore();
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [promotions, setPromotions] = useState<ClubPromotionWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isClubMember, setIsClubMember] = useState<boolean | null>(null);
  const [authVersion, setAuthVersion] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const pizzaMenuFlavors = useMemo<PizzaMenuFlavorOption[]>(() => {
    const availableNames = new Set(
      categories
        .filter((category) => category.name === "Teglie" || category.name === "Mezze teglie")
        .flatMap((category) => category.products.map((product) => product.name)),
    );
    return PIZZA_MENU_FLAVORS
      .filter((flavor) => availableNames.has(flavor.name))
      .map((flavor) => {
        const product = categories
          .filter((category) => category.name === "Teglie" || category.name === "Mezze teglie")
          .flatMap((category) => category.products)
          .find((candidate) => candidate.name === flavor.name);
        return { name: flavor.name, description: product?.description ?? null };
      });
  }, [categories]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(() => {
      setAuthChecked(true);
      setAuthVersion((version) => version + 1);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setAuthChecked(true);
      setAuthVersion((version) => version + 1);
    });
    const onAuthChanged = () => supabase.auth.getUser().then(() => {
      setAuthChecked(true);
      setAuthVersion((version) => version + 1);
    });
    window.addEventListener("customer-auth-changed", onAuthChanged);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("customer-auth-changed", onAuthChanged);
    };
  }, [supabase]);
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
    const type = searchParams.get("type");
    const openCartParam = searchParams.get("openCart");
    if (type === "DELIVERY" || type === "ASPORTO") setOrderType(type);
    if (openCartParam === "1") {
      setCartOpen(true);
      router.replace("/menu", { scroll: false });
    }

    const loadMenu = async () => {
      setIsClubMember(null);
      setCategories([]);
      setPromotions([]);
      setIsLoading(true);
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        if (!response.ok) throw new Error("Menu unavailable");
        const data = await response.json();
        const menuCategories = Array.isArray(data) ? data : data.categories;
        if (!Array.isArray(menuCategories)) throw new Error("Invalid menu response");
        setIsClubMember(!Array.isArray(data) && data.isClubMember === true);
        setCategories(menuCategories);
        setPromotions(Array.isArray(data) ? [] : data.promotions ?? []);
        syncPrices(menuCategories.flatMap((category: CategoryWithProducts) => category.products).map((product: ProductWithRelations) => ({
          id: product.id,
          price: Number(product.price),
          standardPrice: product.standardPrice == null ? null : Number(product.standardPrice),
        })));
      } finally {
        setIsLoading(false);
      }
    };

    loadMenu();
  }, [authVersion, router, searchParams, setOrderType, syncPrices]);

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
    if (pill) {
      navRef.current.scrollTo({
        left: Math.max(0, pill.offsetLeft - (navRef.current.clientWidth - pill.offsetWidth) / 2),
        behavior: "smooth",
      });
    }
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
        {authChecked && isClubMember !== null && (isClubMember ? (
          <div data-testid="club-banner-active" className="mt-7 rounded-full border border-green-200 bg-green-50 px-5 py-3 text-center">
            <p className="font-brand text-[11px] font-bold uppercase tracking-[0.14em] text-green-700">Sei membro del Club! Prezzi riservati applicati automaticamente</p>
          </div>
        ) : (
          <div data-testid="club-banner-login" className="mt-7 max-w-md rounded-[1.25rem] border border-marigold/30 bg-marigold/10 px-5 py-4 text-left">
            <p className="font-brand text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal/70">Prezzi Club online</p>
            <p className="mt-1 text-sm leading-relaxed text-charcoal/65">Registrati o accedi: il tuo account attiva automaticamente i prezzi speciali sugli ordini effettuati dal sito.</p>
            <Link href="/registrati" className="mt-2 inline-block text-xs font-bold text-terracotta underline underline-offset-2">Registrati e risparmia</Link>
          </div>
        ))}
      </div>

      {/* CATEGORY NAV */}
      {categories.length > 0 && (
        <div className="sticky top-[4.1rem] z-30 border-y border-charcoal/5 bg-warm-light/95 shadow-[0_6px_18px_rgba(26,26,26,0.03)] backdrop-blur-md sm:top-[4.5rem]">
          <div
            ref={navRef}
            className="flex justify-start gap-2 overflow-x-auto px-4 py-3 no-scrollbar snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === `cat-${cat.id}`;
              return (
                <button
                  key={cat.id}
                  data-cat={`cat-${cat.id}`}
                  onClick={() => scrollToCategory(String(cat.id))}
                  className={`shrink-0 snap-start px-4 py-2 rounded-full text-[10px] font-brand font-bold uppercase tracking-widest transition-all ${
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
            <div>
              <h2 className="relative top-[3px] flex items-center text-xs sm:text-sm leading-none font-brand font-semibold uppercase tracking-[0.24em] sm:tracking-[0.3em] text-charcoal/85">
                {cat.name}
              </h2>
              {cat.name === "Teglie" && <p className="mt-2 text-[10px] font-brand font-bold uppercase tracking-[0.14em] text-terracotta/70">Formato fisso: 60×40 cm</p>}
              {cat.name === "Mezze teglie" && <p className="mt-2 text-[10px] font-brand font-bold uppercase tracking-[0.14em] text-terracotta/70">Formato fisso: 30×40 cm</p>}
            </div>
            <span className="relative top-[3px] flex items-center text-[10px] leading-none font-brand font-bold uppercase tracking-[0.2em] text-charcoal/30">
              {cat.products.length} Opzioni
            </span>
          </div>
          
          <div className="grid gap-4 px-5 sm:gap-5 sm:px-8">
            {cat.products.map((product, pIdx) => {
              const isBeverageCategory = cat.name === "Bevande analcoliche" || cat.name === "Birre";
              const isZoomedParma = (cat.name === "Teglie" || cat.name === "Mezze teglie") && product.name === "La Parma";
              return (
                <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="reveal group relative flex min-h-[7.5rem] items-center justify-between rounded-[1.5rem] border border-charcoal/5 bg-white px-5 py-5 text-left shadow-[0_8px_20px_rgba(26,26,26,0.025)] transition-all hover:border-terracotta/20 hover:shadow-lg sm:px-6 sm:py-6"
                style={{ transitionDelay: `${pIdx * 50}ms` }}
              >
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-terracotta/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                {product.imageUrl && (
                  <div className={`relative mr-4 h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28 ${isBeverageCategory ? "bg-charcoal/[.04] p-1.5" : ""}`}>
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      className={`${isBeverageCategory ? "object-contain" : "object-cover"} ${isZoomedParma ? "scale-[1.14] group-hover:scale-[1.18]" : "group-hover:scale-105"} transition-transform duration-500`}
                      sizes="112px"
                    />
                  </div>
                )}
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
                  <div className="mt-3">
                    <div className="flex items-center">
                      <span data-testid={product.configuration ? "configurable-price" : product.isClubPrice ? "club-price" : "full-price"} className={`text-base font-brand font-bold ${product.isClubPrice ? "text-terracotta" : "text-charcoal"}`}>
                        {product.configuration ? "Scegli formato e gusti" : formatCurrency(Number(product.price))}
                      </span>
                    </div>
                    {authChecked && isClubMember === false && !product.configuration && product.clubPrice != null && Number(product.clubPrice) < Number(product.price) && (
                      <p data-testid="club-price-offer" className="mt-1 text-[10px] font-brand font-semibold leading-tight tracking-[0.04em] text-terracotta/80">
                        Prezzo Club: {formatCurrency(Number(product.clubPrice))} · registrati e risparmia
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 flex-col items-end justify-center gap-2.5 pl-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/40 shadow-sm transition-all group-hover:bg-terracotta group-hover:text-white active:scale-90 sm:h-10 sm:w-10">
                    <span className="text-xl font-light">+</span>
                  </div>
                </div>
                </button>
              );
            })}
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

      {isClubMember === true && promotions.length > 0 && (
        <section className="mb-14 px-5 sm:px-8" data-testid="club-promotions">
          <div className="mb-4 flex items-end justify-between border-b border-charcoal/5 pb-4">
            <div>
              <p className="ds-micro-label text-terracotta/70">Solo per il Club</p>
              <h2 className="mt-2 font-display text-3xl leading-none text-terracotta sm:text-4xl">Promo Club</h2>
            </div>
            <span className="text-[10px] font-brand font-bold uppercase tracking-[0.16em] text-charcoal/35">Questa settimana</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {promotions.map((promotion) => (
              <article key={promotion.id} className="overflow-hidden rounded-[1.5rem] border border-terracotta/15 bg-white shadow-[0_8px_20px_rgba(26,26,26,0.04)]">
                {promotion.imageUrl && <div className="relative aspect-[2.2]"><Image src={promotion.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" /></div>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><h3 className="font-display text-2xl leading-none text-charcoal">{promotion.title}</h3><p className="mt-2 text-sm text-charcoal/55">{promotion.description}</p></div>
                    <span className="shrink-0 text-xl font-brand font-bold text-terracotta">{formatCurrency(Number(promotion.price))}</span>
                  </div>
                  <p className="mt-4 text-xs font-brand font-semibold text-charcoal/50">{promotion.items.map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.product.name}`).join(" + ")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
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
          menuFlavors={pizzaMenuFlavors}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuContent />
    </Suspense>
  );
}
