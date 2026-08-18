import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG, toPhoneHref } from "@/lib/site-config";
import MobileTopBar from "@/components/client/MobileTopBar";

export const metadata: Metadata = {
  title: "Servizi Delivery e Asporto",
  description:
    "Orari, consegna a domicilio e asporto de La Teglieria a Livorno. Tutte le informazioni utili su servizio, ultime consegne e ritiro in sede.",
  alternates: {
    canonical: "https://www.lateglieria.it/servizi",
  },
};

const FAQ_ITEMS = [
  {
    question: "Fate consegna a domicilio a Livorno?",
    answer: "Sì, consegniamo nelle zone coperte di Livorno con disponibilità visibile al checkout.",
  },
  {
    question: "Posso ritirare in sede?",
    answer: "Sì, puoi ordinare online e scegliere il ritiro in sede in Via Inghilterra 68.",
  },
  {
    question: "Fino a che ora consegnate?",
    answer: "Siamo aperti tutti i giorni 16:00 - 24:00, con ultime consegne entro le 22:00.",
  },
  {
    question: "Come vedo gli orari disponibili?",
    answer: "In checkout puoi scegliere giorno e fascia oraria disponibili in tempo reale.",
  },
];

export default function ServiziPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-warm-light text-charcoal pt-24 pb-20">
      <MobileTopBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <section className="max-w-5xl mx-auto px-6">
        <p className="text-sm font-brand font-bold uppercase tracking-[0.28em] text-terracotta mb-4">Servizi</p>
        <h1 className="text-5xl md:text-6xl font-display leading-[0.95]">Delivery e asporto a Livorno</h1>
        <p className="mt-5 text-lg text-charcoal/60 font-body max-w-3xl">
          Qui trovi orari aggiornati, modalità di consegna e ritiro, informazioni pratiche per ordinare in modo rapido.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 mt-12 grid md:grid-cols-2 gap-5">
        <article className="rounded-3xl border border-charcoal/10 bg-white/70 p-6">
          <h2 className="text-2xl font-display">Orari</h2>
          <p className="mt-3 font-body text-charcoal/70">Aperti tutti i giorni: {SITE_CONFIG.hours.display}</p>
          <p className="mt-1 font-body text-charcoal/70">{SITE_CONFIG.hours.lastDeliveryDisplay}</p>
        </article>
        <article className="rounded-3xl border border-charcoal/10 bg-white/70 p-6">
          <h2 className="text-2xl font-display">Contatti</h2>
          <p className="mt-3 font-body text-charcoal/70">
            {SITE_CONFIG.address.street}, {SITE_CONFIG.address.postalCode} {SITE_CONFIG.address.city} {SITE_CONFIG.address.province}
          </p>
          {SITE_CONFIG.phone && (
            <a href={toPhoneHref(SITE_CONFIG.phone)} className="mt-2 inline-block font-brand font-semibold text-terracotta hover:underline">
              {SITE_CONFIG.phone}
            </a>
          )}
        </article>
        <article className="rounded-3xl border border-charcoal/10 bg-white/70 p-6">
          <h2 className="text-2xl font-display">Consegna</h2>
          <p className="mt-3 font-body text-charcoal/70">
            Le fasce disponibili dipendono da giorno e disponibilità operativa. Il costo e i tempi sono mostrati in checkout.
          </p>
        </article>
        <article className="rounded-3xl border border-charcoal/10 bg-white/70 p-6">
          <h2 className="text-2xl font-display">Asporto</h2>
          <p className="mt-3 font-body text-charcoal/70">
            Ordina online e ritira in sede nella fascia scelta. Ricevi aggiornamenti sullo stato del tuo ordine.
          </p>
        </article>
      </section>

      <section className="max-w-5xl mx-auto px-6 mt-14">
        <p className="text-sm font-brand font-bold uppercase tracking-[0.28em] text-terracotta mb-4">FAQ</p>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="rounded-2xl border border-charcoal/10 bg-white/70 px-5 py-4">
              <summary className="cursor-pointer font-brand font-semibold text-charcoal">{item.question}</summary>
              <p className="mt-2 text-charcoal/65 font-body">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 mt-12 flex gap-3 flex-wrap">
        <Link href="/menu?type=DELIVERY" className="rounded-full bg-terracotta text-white px-6 py-3 font-brand font-semibold">
          Ordina delivery
        </Link>
        <Link href="/menu?type=ASPORTO" className="rounded-full bg-white border border-charcoal/15 text-charcoal px-6 py-3 font-brand font-semibold">
          Ordina asporto
        </Link>
      </div>
    </main>
  );
}
