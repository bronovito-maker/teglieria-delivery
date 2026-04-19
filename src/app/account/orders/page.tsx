import OrdersDashboard from "@/components/account/orders/OrdersDashboard";

export default function AccountOrdersPage() {
  return (
    <main className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-terracotta mb-1">
            Area Cliente
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-charcoal">I Miei Ordini</h1>
          <p className="text-zinc-500 mt-1">Controlla lo stato della consegna e consulta il tuo storico.</p>
        </header>

        <OrdersDashboard />
      </div>
    </main>
  );
}
