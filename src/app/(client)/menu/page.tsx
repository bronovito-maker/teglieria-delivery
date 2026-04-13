"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import CartDrawer from "@/components/client/CartDrawer";
import ProductModal from "@/components/client/ProductModal";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";

export default function MenuPage() {
  const { setOrderType } = useCartStore();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => {
    // Handle order type from landing page
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const openCartParam = params.get("openCart");
    if (type === "DELIVERY" || type === "ASPORTO") {
      setOrderType(type);
    }
    if (openCartParam === "1") {
      setCartOpen(true);
    }

    fetch("/api/menu").then((r) => r.json()).then(setCategories);
  }, [setOrderType]);

  // Scroll Reveal Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 mt-8 px-4 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-gradient">
            Il Nostro Menu
          </h1>
          <p className="text-gray-500 text-lg">
            Scegli la tua teglia preferita, preparata con passione.
          </p>
        </div>
      </div>

      {categories.map((cat, idx) => (
        <div key={cat.id} className="mb-12">
          {/* CATEGORY HEADER - Sticky Glass */}
          <div className="sticky top-0 z-20 px-4 py-4 mb-4 glass-morphism -mx-4 md:mx-0 md:rounded-2xl border-b md:border border-white/40">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#1d1d1f]">
              {cat.name}
            </h2>
          </div>
          
          <div className="grid gap-4 px-4">
            {cat.products.map((product, pIdx) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="reveal group flex items-start justify-between bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-2xl hover:border-orange-100 transition-all text-left w-full relative overflow-hidden"
                style={{ transitionDelay: `${pIdx * 50}ms` }}
              >
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/0 to-orange-50/0 group-hover:from-orange-50/50 transition-colors pointer-events-none" />
                
                <div className="flex-1 relative z-10">
                  <h3 className="text-xl font-bold mb-1 group-hover:text-orange-600 transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2 relative z-10">
                  <span className="font-bold text-lg text-[#1d1d1f]">
                    {formatCurrency(Number(product.price))}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                    +
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-20 px-6">
          <div className="text-6xl mb-4 opacity-20">🍕</div>
          <h3 className="text-xl font-semibold mb-2">Menu non disponibile</h3>
          <p className="text-gray-400">Torna a trovarci tra poco!</p>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-8 md:right-8 z-40 group tomato-glass border text-white rounded-full px-5 md:px-6 py-3.5 font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
      >
        <span className="text-xl">🛒</span>
        Carrello
        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-white text-[#cf2a1d] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-red-100 animate-scale-in">
            {itemCount}
          </span>
        )}
      </button>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
