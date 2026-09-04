import OrdersDashboard from "@/components/account/orders/OrdersDashboard";
import CustomerLogoutButton from "@/components/client/CustomerLogoutButton";

export default function AccountOrdersPage() {
  return (
    <main className="px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-terracotta mb-1">
              Area Cliente
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-charcoal">I Miei Ordini</h1>
            <p className="text-zinc-500 mt-1">Controlla lo stato della consegna e consulta il tuo storico.</p>
          </div>
          <CustomerLogoutButton className="shrink-0 rounded-full border border-charcoal/10 px-4 py-2 text-[10px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta disabled:cursor-wait disabled:opacity-50" />
        </header>

        <OrdersDashboard />
      </div>
    </main>
  );
}
