"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import MobileTopBar from "@/components/client/MobileTopBar";
import { SITE_CONFIG, toPhoneHref } from "@/lib/site-config";

const reviews = [
  {
    name: "Marco R.",
    text: "La migliore pizza in teglia della città. Croccante fuori e morbida dentro come non l'avevo mai provata.",
  },
  {
    name: "Giulia M.",
    text: "Ingredienti spaziali. Si sente che c'è ricerca dietro ogni abbinamento. Consigliatissima la Margherita DOP.",
  },
  {
    name: "Filippo T.",
    text: "Delivery puntuale e pizza arrivata ancora calda e croccante. Servizio eccellente!",
  },
];

const faqItems = [
  ["Fate consegna a domicilio a Livorno?", "Sì, consegniamo nelle zone coperte di Livorno."],
  ["Posso ordinare anche da asporto?", "Sì, puoi ordinare online e ritirare in sede."],
  ["Quali sono gli orari?", "Siamo aperti tutti i giorni dalle 16:00 alle 24:00. Ultime consegne entro le 22:00."],
  ["Quanto costa la consegna?", "Il costo viene calcolato nel checkout in base alla zona."],
];

export default function LandingPage() {
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE_CONFIG.name,
    image: `${SITE_CONFIG.url}/images/pizza-teglia-hero.png`,
    url: SITE_CONFIG.url,
    email: SITE_CONFIG.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address.street,
      addressLocality: SITE_CONFIG.address.city,
      postalCode: SITE_CONFIG.address.postalCode,
      addressRegion: SITE_CONFIG.address.province,
      addressCountry: SITE_CONFIG.address.countryCode,
    },
    servesCuisine: ["Pizza", "Pizza in teglia", "Cucina italiana"],
    priceRange: "€€",
    hasMenu: `${SITE_CONFIG.url}/menu`,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="min-h-screen bg-warm-light text-charcoal selection:bg-marigold/30">
      <MobileTopBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section id="ordina" className="mx-auto flex min-h-[32rem] max-w-3xl flex-col items-center px-5 pb-16 pt-28 text-center sm:min-h-[36rem] sm:pt-36">
        <span className="ds-micro-label rounded-full border border-terracotta/15 bg-white/40 px-4 py-2 text-terracotta/70">Livorno · Scopaia</span>
        <h1 className="mt-7 max-w-[9ch] font-display text-[clamp(3rem,12vw,5.6rem)] font-semibold leading-[.91] tracking-[-.06em]">
          La tua pizzeria <span className="text-terracotta">di quartiere.</span>
        </h1>
        <Link href="/preshop" className="ds-cta-primary mt-12 flex min-h-12 w-full max-w-[22rem] items-center justify-center text-lg">
          Ordina ora
        </Link>
      </section>

      <section id="dicono-di-noi" className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="bg-marigold/[0.06] px-4 py-10 text-center sm:px-12">
          <p className="ds-micro-label text-terracotta/75">Community</p>
          <h2 className="mt-4 font-display text-[clamp(2.7rem,10vw,5rem)] font-semibold leading-[.92] tracking-[-.055em]">
            Cosa dicono <span className="text-terracotta">di noi.</span>
          </h2>
        </div>
        <div className="my-8 flex justify-center">
          <span className="rounded-full border border-marigold/25 bg-white/80 px-5 py-3 text-sm font-brand font-semibold text-charcoal/65 shadow-sm">
            <span className="mr-2 text-marigold">★★★★★</span> 4.8 · 30+ recensioni
          </span>
        </div>
        <div className="mb-8 rounded-[1.4rem] border border-terracotta/10 bg-white/70 px-5 py-5 text-center shadow-sm sm:px-8">
          <p className="font-body text-sm leading-relaxed text-charcoal/60">Siamo appena partiti e stiamo costruendo la nostra community, una teglia alla volta.</p>
          {SITE_CONFIG.googleReviewUrl ? (
            <a href={SITE_CONFIG.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-charcoal px-5 py-2.5 text-xs font-brand font-bold uppercase tracking-widest text-white transition-colors hover:bg-terracotta">
              Lascia una recensione su Google ↗
            </a>
          ) : (
            <span className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-charcoal/10 px-5 py-2.5 text-xs font-brand font-bold uppercase tracking-widest text-charcoal/35">
              Recensioni Google in arrivo
            </span>
          )}
        </div>
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.name} className="rounded-[1.4rem] border border-charcoal/5 bg-white px-5 py-6 shadow-[0_12px_26px_rgba(26,26,26,0.035)] sm:px-8">
              <p className="text-sm tracking-[.2em] text-marigold">★★★★★</p>
              <p className="mt-5 font-body text-sm italic leading-relaxed text-charcoal/70">&quot;{review.text}&quot;</p>
              <p className="mt-5 border-t border-charcoal/5 pt-4 text-[10px] font-brand font-bold uppercase tracking-[.18em] text-terracotta">— {review.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contatti" className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="overflow-hidden rounded-[1.5rem] border border-charcoal/10 bg-white shadow-sm">
          <iframe
            title="Mappa La Teglieria"
            src="https://www.google.com/maps?q=Via+Inghilterra+68,+Livorno&output=embed"
            className="h-56 w-full border-0 sm:h-72"
            loading="lazy"
          />
          <a href="https://www.google.com/maps/search/?api=1&query=Via+Inghilterra+68,+Livorno" target="_blank" rel="noreferrer" className="block px-5 py-4 text-center text-sm font-brand font-semibold text-charcoal/65 hover:text-terracotta">
            La Scopaia · Apri in Google Maps ↗
          </a>
        </div>
      </section>

      <section id="servizi" className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <div className="rounded-[1.5rem] bg-white px-6 py-7 shadow-sm sm:px-8">
          <p className="ds-micro-label text-terracotta/75">Servizi</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Consegna e asporto a Livorno</h2>
          <p className="mt-4 text-sm leading-relaxed text-charcoal/55">Ordina online per consegna a domicilio oppure ritira in sede.</p>
          <p className="mt-3 text-xs font-brand font-semibold text-charcoal/55">Aperti tutti i giorni: 16:00 – 24:00 · Ultime consegne: entro le 22:00</p>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <p className="ds-micro-label text-terracotta/75">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Domande frequenti</h2>
        <div className="mt-6 space-y-2">
          {faqItems.map(([question, answer]) => (
            <details key={question} className="group rounded-xl border border-charcoal/5 bg-white px-4 py-3 text-sm shadow-sm">
              <summary className="cursor-pointer list-none font-brand font-semibold marker:hidden">▸ {question}</summary>
              <p className="mt-3 border-t border-charcoal/5 pt-3 leading-relaxed text-charcoal/55">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mx-auto mt-8 max-w-3xl border-t border-charcoal/5 px-5 py-12 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-brand font-semibold text-charcoal/65">
          <Link href="/menu" className="rounded-full border border-charcoal/10 px-4 py-2 transition-colors hover:border-terracotta/30 hover:text-terracotta">
            Menu
          </Link>
          <Link href="/servizi" className="rounded-full border border-charcoal/10 px-4 py-2 transition-colors hover:border-terracotta/30 hover:text-terracotta">
            Orari e servizi
          </Link>
          {SITE_CONFIG.phone && (
            <a href={toPhoneHref(SITE_CONFIG.phone)} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 px-4 py-2 transition-colors hover:border-terracotta/30 hover:text-terracotta">
              <Phone className="h-3.5 w-3.5" /> Chiama
            </a>
          )}
          <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 px-4 py-2 transition-colors hover:border-terracotta/30 hover:text-terracotta">
            <Mail className="h-3.5 w-3.5" /> Scrivici
          </a>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 text-[10px] font-brand text-charcoal/40">
          <a href="https://www.google.com/maps/search/?api=1&query=La+Teglieria+Via+Inghilterra+68+Livorno" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-terracotta">
            <MapPin className="h-3.5 w-3.5" /> {SITE_CONFIG.address.street}, {SITE_CONFIG.address.city}
          </a>
          <div className="flex items-center gap-4">
            {SITE_CONFIG.social.instagram && <a href={SITE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="font-bold transition-colors hover:text-terracotta">IG</a>}
            {SITE_CONFIG.social.facebook && <a href={SITE_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="font-bold transition-colors hover:text-terracotta">FB</a>}
            <Link href="/privacy" className="transition-colors hover:text-terracotta">Privacy</Link>
            <Link href="/cookie-policy" className="transition-colors hover:text-terracotta">Cookie</Link>
          </div>
          <span>© {new Date().getFullYear()} La Teglieria</span>
        </div>
      </footer>
    </main>
  );
}
