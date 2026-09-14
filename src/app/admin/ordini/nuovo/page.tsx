"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";
import AdminAddressInput from "@/components/admin/AdminAddressInput";
import PizzaBuilderConfigurator, { createInitialPizzaSelection, type PizzaMenuFlavorOption } from "@/components/shared/PizzaBuilderConfigurator";
import { calculatePizzaConfiguration, formatPizzaVariant, type PizzaBuilderSelection } from "@/lib/pizza-builder";
import { PIZZA_MENU_FLAVORS } from "@/lib/catalog";

type CartLine = {
  product: ProductWithRelations;
  quantity: number;
  variant?: string;
  variantDelta: number;
  additions: { name: string; price: number }[];
  removals: { name: string }[];
  notes?: string;
};

export default function NuovoOrdinePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(false);

  // Order fields
  const [type, setType] = useState<"ASPORTO" | "DELIVERY">("ASPORTO");
  const [channel, setChannel] = useState<"PHONE" | "COUNTER">("PHONE");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [configuringProduct, setConfiguringProduct] = useState<ProductWithRelations | null>(null);
  const [pizzaSelection, setPizzaSelection] = useState<PizzaBuilderSelection>(createInitialPizzaSelection);
  const [submitError, setSubmitError] = useState("");

  const [etaMinutes, setEtaMinutes] = useState(30);

  function adjustEta(delta: number) {
    setEtaMinutes((prev) => Math.max(5, Math.min(180, prev + delta)));
  }

  function etaTime() {
    return new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    fetch("/api/menu").then((r) => r.json()).then((data) => {
      const menuCategories: CategoryWithProducts[] = Array.isArray(data) ? data : data.categories;
      setCategories(menuCategories);

      const requestedProductId = new URLSearchParams(window.location.search).get("product");
      if (!requestedProductId) return;
      const requestedProduct = menuCategories
        .flatMap((category) => category.products)
        .find((product) => product.id === requestedProductId && product.configuration);
      if (requestedProduct) {
        setPizzaSelection(createInitialPizzaSelection());
        setConfiguringProduct(requestedProduct);
      }
    });
  }, []);

  const allProducts = categories.flatMap((c) => c.products);
  const filteredProducts = search.length >= 2
    ? allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];
  const pizzaMenuFlavors = useMemo<PizzaMenuFlavorOption[]>(() => {
    const availableProducts = categories
      .filter((category) => category.name === "Teglie" || category.name === "Mezze teglie")
      .flatMap((category) => category.products);
    const availableNames = new Set(availableProducts.map((product) => product.name));
    return PIZZA_MENU_FLAVORS
      .filter((flavor) => availableNames.has(flavor.name))
      .map((flavor) => ({
        name: flavor.name,
        description: availableProducts.find((product) => product.name === flavor.name)?.description ?? null,
      }));
  }, [categories]);

  function addProduct(product: ProductWithRelations) {
    if (product.configuration) {
      setPizzaSelection(createInitialPizzaSelection());
      setConfiguringProduct(product);
      setSearch("");
      return;
    }
    // Pre-select first active variant if present
    const firstVariant = product.variants.find((v) => v.active);
    setLines([...lines, {
      product,
      quantity: 1,
      variant: firstVariant?.name,
      variantDelta: firstVariant ? Number(firstVariant.priceDelta) : 0,
      additions: [],
      removals: [],
    }]);
    setSearch("");
  }

  function addConfiguredPizza() {
    if (!configuringProduct) return;
    const calculated = calculatePizzaConfiguration(pizzaSelection);
    setLines((current) => [...current, {
      product: configuringProduct,
      quantity: 1,
      variant: JSON.stringify(pizzaSelection),
      variantDelta: 0,
      additions: calculated.additions,
      removals: [],
    }]);
    setConfiguringProduct(null);
  }

  function priceFor(product: ProductWithRelations) {
    return Number(product.price);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, updates: Partial<CartLine>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  const subtotal = lines.reduce((sum, l) => {
    const unitPrice = priceFor(l.product) + l.variantDelta + l.additions.reduce((s, a) => s + a.price, 0);
    return sum + unitPrice * l.quantity;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    if (lines.some((line) => line.product.configuration && !line.variant)) {
      setSubmitError("Configura tutte le pizze componibili prima di creare l'ordine.");
      return;
    }
    setLoading(true);
    setSubmitError("");

    const items = lines.map((l) => {
      const unitPrice = priceFor(l.product) + l.variantDelta + l.additions.reduce((s, a) => s + a.price, 0);
      return {
        productId: l.product.id,
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice,
        totalPrice: unitPrice * l.quantity,
        variant: l.variant,
        additions: l.additions.length > 0 ? l.additions : null,
        removals: l.removals.length > 0 ? l.removals : null,
        notes: l.notes,
      };
    });

    const res = await fetch("/api/ordini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        channel,
        customerName,
        customerPhone,
        address: type === "DELIVERY" ? address : null,
        addressDetail: type === "DELIVERY" ? addressDetail : null,
        estimatedTime: new Date(Date.now() + etaMinutes * 60000).toISOString(),
        subtotal,
        total: subtotal,
        notes: notes || null,
        items,
      }),
    });

    if (res.ok) {
      const order = await res.json();
      // Auto-confirm manual orders
      await fetch(`/api/ordini/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      router.push(`/admin/ordini/${order.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error || "Impossibile creare l'ordine.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <p className="text-[11px] md:text-xs font-brand font-semibold uppercase tracking-[0.22em] text-[#D96A2B]/80 mb-2">
          Ordini
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-charcoal leading-none">
          <span className="text-terracotta">Nuovo</span> ordine manuale
        </h1>
        <p className="font-body italic text-charcoal/45 mt-3 text-sm">
          Creazione rapida ordine da banco o telefono, con ETA regolabile e configurazione completa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tipo + Canale */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex rounded-xl border border-red-100/80 overflow-hidden bg-white shadow-sm">
            {(["ASPORTO", "DELIVERY"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-4 py-2.5 text-sm font-brand font-semibold transition-colors ${
                  type === t
                    ? "tomato-glass text-white"
                    : "text-gray-700 hover:bg-red-50/50"
                }`}>
                {t === "ASPORTO" ? "Asporto" : "Delivery"}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-red-100/80 overflow-hidden bg-white shadow-sm">
            {(["PHONE", "COUNTER"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)}
                className={`px-4 py-2.5 text-sm font-brand font-semibold transition-colors ${
                  channel === c
                    ? "tomato-glass text-white"
                    : "text-gray-700 hover:bg-red-50/50"
                }`}>
                {c === "PHONE" ? "Telefono" : "Banco"}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_24px_rgba(31,38,135,0.05)] p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Nome</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
              className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Telefono</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required
              className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-[0.08em] font-brand font-semibold">
              Tempo {type === "DELIVERY" ? "consegna" : "ritiro"} previsto
            </label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => adjustEta(-5)}
                className="w-10 h-10 rounded-xl border border-red-100 bg-white text-lg font-bold text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center">
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-brand font-semibold text-[#D96A2B] tabular-nums">{etaMinutes}</span>
                <span className="text-xs text-gray-400 ml-1">min</span>
                <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{etaTime()}</p>
              </div>
              <button type="button" onClick={() => adjustEta(5)}
                className="w-10 h-10 rounded-xl border border-red-100 bg-white text-lg font-bold text-gray-600 hover:bg-red-50 transition-colors flex items-center justify-center">
                +
              </button>
            </div>
          </div>
          {type === "DELIVERY" && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Indirizzo</label>
                <AdminAddressInput
                  value={address}
                  onChange={setAddress}
                  required
                  className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Citofono/Piano</label>
                <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
                  className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]" />
              </div>
            </>
          )}
        </div>

        {/* Ricerca prodotti */}
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_24px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Cerca prodotto</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Digita per cercare..."
            className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]" />
          {filteredProducts.length > 0 && (
            <div className="mt-2 border border-red-100 rounded-xl divide-y max-h-48 overflow-y-auto bg-white">
              {filteredProducts.map((p) => (
                <button key={p.id} type="button" onClick={() => addProduct(p)}
                  className="w-full flex justify-between px-3 py-2 text-sm hover:bg-red-50/60 transition-colors text-left">
                  <span>{p.name}</span>
                  <span className="text-[#D96A2B] font-brand font-semibold">{p.configuration ? "Prezzo variabile — Configura" : formatCurrency(Number(p.price))}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Righe ordine */}
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_24px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <h2 className="font-brand font-semibold text-sm mb-3">Prodotti nell&apos;ordine</h2>
          {lines.length === 0 && <p className="text-gray-400 text-sm">Nessun prodotto aggiunto.</p>}
          <div className="space-y-3">
            {lines.map((line, i) => {
              const unitPrice = Number(line.product.price) + line.variantDelta + line.additions.reduce((s, a) => s + a.price, 0);
              const hasCustom = line.product.variants.filter(v => v.active).length > 0
                || line.product.additions.filter(a => a.active).length > 0
                || line.product.removals.filter(r => r.active).length > 0;

              return (
                <div key={i} className="border border-red-100/70 rounded-xl overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center gap-2 bg-red-50/35 p-2.5">
                    <div className="flex items-center border border-red-100 rounded-lg text-sm bg-white">
                      <button type="button" onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })} className="px-2 py-1 hover:bg-red-50/60">−</button>
                      <span className="px-2 tabular-nums">{line.quantity}</span>
                      <button type="button" onClick={() => updateLine(i, { quantity: line.quantity + 1 })} className="px-2 py-1 hover:bg-red-50/60">+</button>
                    </div>
                    <span className="flex-1 text-sm font-brand font-semibold">{line.product.name}</span>
                    {line.variant && (
                      <span className="text-xs text-gray-400 hidden sm:inline">{line.product.configuration ? formatPizzaVariant(line.variant) : line.variant}</span>
                    )}
                    <span className="text-sm font-brand font-semibold tabular-nums">{formatCurrency(unitPrice * line.quantity)}</span>
                    <button type="button" onClick={() => removeLine(i)} className="text-red-400 text-xs font-bold px-1">✕</button>
                  </div>

                  {/* Customization panel */}
                  {hasCustom && (
                    <div className="bg-white px-3 pb-3 pt-2 space-y-3 border-t border-red-50">

                      {/* Varianti */}
                      {line.product.variants.filter(v => v.active).length > 0 && (
                        <div>
                          <p className="text-[10px] font-brand font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">Variante</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateLine(i, { variant: undefined, variantDelta: 0 })}
                              className={`px-3 py-1 rounded-full text-xs font-brand font-semibold border transition-colors ${
                                !line.variant
                                  ? "bg-[#D96A2B] text-white border-[#D96A2B]"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-[#D96A2B]/40"
                              }`}
                            >
                              Standard
                            </button>
                            {line.product.variants.filter(v => v.active).map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => updateLine(i, { variant: v.name, variantDelta: Number(v.priceDelta) })}
                                className={`px-3 py-1 rounded-full text-xs font-brand font-semibold border transition-colors ${
                                  line.variant === v.name
                                    ? "bg-[#D96A2B] text-white border-[#D96A2B]"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#D96A2B]/40"
                                }`}
                              >
                                {v.name}
                                {Number(v.priceDelta) !== 0 && (
                                  <span className="ml-1 opacity-70">
                                    {Number(v.priceDelta) > 0 ? "+" : ""}{formatCurrency(Number(v.priceDelta))}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Aggiunte */}
                      {line.product.additions.filter(a => a.active).length > 0 && (
                        <div>
                          <p className="text-[10px] font-brand font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">Extra</p>
                          <div className="flex flex-wrap gap-1.5">
                            {line.product.additions.filter(a => a.active).map((a) => {
                              const selected = line.additions.some((x) => x.name === a.name);
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    const next = selected
                                      ? line.additions.filter((x) => x.name !== a.name)
                                      : [...line.additions, { name: a.name, price: Number(a.price) }];
                                    updateLine(i, { additions: next });
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-brand font-semibold border transition-colors ${
                                    selected
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-amber-400/50"
                                  }`}
                                >
                                  {a.name}
                                  {Number(a.price) > 0 && (
                                    <span className="ml-1 opacity-70">+{formatCurrency(Number(a.price))}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rimozioni */}
                      {line.product.removals.filter(r => r.active).length > 0 && (
                        <div>
                          <p className="text-[10px] font-brand font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">Rimuovi</p>
                          <div className="flex flex-wrap gap-1.5">
                            {line.product.removals.filter(r => r.active).map((r) => {
                              const removed = line.removals.some((x) => x.name === r.name);
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                    const next = removed
                                      ? line.removals.filter((x) => x.name !== r.name)
                                      : [...line.removals, { name: r.name }];
                                    updateLine(i, { removals: next });
                                  }}
                                  className={`px-3 py-1 rounded-full text-xs font-brand font-semibold border transition-colors ${
                                    removed
                                      ? "bg-gray-700 text-white border-gray-700 line-through"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                                  }`}
                                >
                                  {r.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Note riga */}
                      <div>
                        <p className="text-[10px] font-brand font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1">Note</p>
                        <input
                          type="text"
                          value={line.notes ?? ""}
                          onChange={(e) => updateLine(i, { notes: e.target.value })}
                          placeholder="Es. senza aglio, ben cotta..."
                          className="w-full px-2.5 py-1.5 border border-red-100 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#D96A2B]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {lines.length > 0 && (
            <div className="flex justify-between mt-3 pt-3 border-t font-brand font-semibold">
              <span>Totale</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_24px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-[0.08em] font-brand font-semibold">Note</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D96A2B]" />
        </div>

        <button type="submit" disabled={loading || lines.length === 0}
          className="w-full py-3 tomato-glass border text-white rounded-xl font-brand font-semibold uppercase tracking-[0.18em] text-[11px] hover:brightness-105 disabled:opacity-50 transition-all">
          {loading ? "Salvataggio..." : "Crea ordine"}
        </button>
        {submitError && <p role="alert" className="text-center text-sm font-semibold text-red-600">{submitError}</p>}
      </form>

      {configuringProduct && (
        <div className="fixed inset-0 z-[90] flex h-[100dvh] items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[2.5rem] bg-warm-light shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-[2.5rem]">
            <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span className="ds-micro-label text-terracotta/60">Configuratore Admin</span>
                  <h2 className="mt-2 font-display text-4xl leading-none text-charcoal">Crea la tua pizza</h2>
                </div>
                <button type="button" onClick={() => setConfiguringProduct(null)} aria-label="Chiudi" className="h-10 w-10 rounded-full bg-charcoal/5 text-2xl">×</button>
              </div>
              <PizzaBuilderConfigurator
                value={pizzaSelection}
                onChange={setPizzaSelection}
                menuFlavors={pizzaMenuFlavors}
                allergenRegistry={configuringProduct.allergenRegistry}
              />
            </div>
            <div className="shrink-0 border-t border-charcoal/8 bg-warm-light p-5 sm:px-8">
              <button type="button" onClick={addConfiguredPizza} className="w-full rounded-full bg-terracotta py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl">
                Aggiungi configurazione · {formatCurrency(calculatePizzaConfiguration(pizzaSelection).total)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
