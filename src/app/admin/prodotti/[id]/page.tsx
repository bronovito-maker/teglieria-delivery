"use client";

import ProductForm from "@/components/admin/ProductForm";
import { useParams } from "next/navigation";

export default function EditProdottoPage() {
  const params = useParams();
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <span className="ds-micro-label text-terracotta/60 mb-2 block">Catalogo</span>
        <h1 className="text-4xl md:text-5xl font-display tracking-tight text-charcoal leading-none">
          Modifica <span className="text-terracotta">prodotto.</span>
        </h1>
        <p className="font-body italic text-charcoal/45 mt-3 text-sm">
          Aggiorna dettagli, disponibilità, immagini e opzioni del prodotto selezionato.
        </p>
      </div>
      <ProductForm productId={params.id as string} />
    </div>
  );
}
