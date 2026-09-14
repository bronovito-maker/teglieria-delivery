"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type PublicServices = {
  delivery: { active: boolean; label: string | null };
  pickup: { active: boolean; label: string | null };
  allDisabled: boolean;
  message: string | null;
};

export function useServiceAvailability() {
  const [services, setServices] = useState<PublicServices | null>(null);
  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setServices(data?.services ?? null))
      .catch(() => setServices(null));
  }, []);
  return services;
}

function ServiceMessage({ services }: { services: PublicServices }) {
  const labels = [services.delivery.label, services.pickup.label].filter(Boolean);
  return (
    <div role="status" className="rounded-2xl border border-terracotta/20 bg-white/90 px-5 py-4 text-center shadow-sm">
      <p className="font-brand text-sm font-bold text-terracotta">Una piccola pausa 🍕</p>
      {labels.map((label) => <p key={label} className="mt-1 text-sm text-charcoal/65">{label}</p>)}
      {services.message && <p className="mt-2 text-sm italic text-charcoal/55">{services.message}</p>}
    </div>
  );
}

export function LandingOrderAction() {
  const services = useServiceAvailability();
  if (!services) return <div className="mt-12 h-12 w-full max-w-[22rem] animate-pulse rounded-full bg-charcoal/10" />;
  if (services.allDisabled) return (
    <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4">
      <ServiceMessage services={services} />
      <Link href="/menu" className="flex min-h-12 w-full max-w-[22rem] items-center justify-center rounded-full border border-charcoal/15 bg-white px-6 font-brand font-bold uppercase tracking-widest text-charcoal">
        Consulta il menu
      </Link>
    </div>
  );
  return (
    <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-4">
      {(!services.delivery.active || !services.pickup.active) && <ServiceMessage services={services} />}
      <Link href="/menu" className="ds-cta-primary flex min-h-12 w-full max-w-[22rem] items-center justify-center text-lg">Ordina ora</Link>
    </div>
  );
}

export function OrderingAvailabilityGate() {
  const services = useServiceAvailability();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (services?.allDisabled && pathname === "/ordine") router.replace("/");
  }, [pathname, router, services]);
  if (!services || (services.delivery.active && services.pickup.active)) return null;
  return <div className="mb-5"><ServiceMessage services={services} /></div>;
}
