import ProductForm from "@/components/admin/ProductForm";

export default function NuovoProdottoPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <span className="ds-micro-label text-terracotta/60 mb-2 block">Catalogo</span>
        <h1 className="text-4xl md:text-5xl font-display tracking-tight text-charcoal leading-none">
          Nuovo <span className="text-terracotta">prodotto.</span>
        </h1>
        <p className="font-body italic text-charcoal/45 mt-3 text-sm">
          Inserisci scheda prodotto, immagine, varianti e personalizzazioni del menu.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
