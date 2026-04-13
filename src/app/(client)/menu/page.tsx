"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import CartDrawer from "@/components/client/CartDrawer";
import ProductModal from "@/components/client/ProductModal";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";

export default function MenuPage() {
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => {
    fetch("/api/menu").then((r) => r.json()).then(setCategories);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Il nostro Menu</h1>
        <button
          onClick={() => setCartOpen(true)}
          className="relative px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Carrello
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">
            {cat.name}
          </h2>
          <div className="grid gap-3">
            {cat.products.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow text-left w-full"
              >
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  {product.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
                  )}
                </div>
                <span className="font-semibold text-orange-600 ml-4">
                  {formatCurrency(Number(product.price))}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <p className="text-center text-gray-400 py-12">Menu non disponibile al momento.</p>
      )}

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
