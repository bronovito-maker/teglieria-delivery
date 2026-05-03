"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingIngredients from "@/components/ui/FloatingIngredients";
import MobileTopBar from "@/components/client/MobileTopBar";
import { formatCurrency } from "@/lib/utils";
import { SITE_CONFIG, toPhoneHref } from "@/lib/site-config";

// Observer for scroll animations
const useScrollReveal = () => {
  useEffect(() => {
    let revealNodes: Element[] = [];
    let ticking = false;

    const collectRevealNodes = () => {
      revealNodes = Array.from(document.querySelectorAll(".reveal"));
    };

    const updateRevealState = () => {
      const viewportHeight = window.innerHeight;
      const enterTop = viewportHeight * 0.9;
      const enterBottom = viewportHeight * 0.08;

      revealNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const isVisible = rect.top < enterTop && rect.bottom > enterBottom;
        node.classList.toggle("active", isVisible);
      });
    };

    const scheduleUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateRevealState();
        ticking = false;
      });
    };

    const refreshAndUpdate = () => {
      collectRevealNodes();
      scheduleUpdate();
    };

    refreshAndUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const mutationObserver = new MutationObserver(refreshAndUpdate);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      revealNodes = [];
    };
  }, []);
};

export default function LandingPage() {
  const [highlights, setHighlights] = useState<any[]>([]);
  const heroRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  useScrollReveal();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        const allProducts = data.flatMap((c: any) => c.products);
        setHighlights(allProducts.slice(0, 3));
      });
  }, []);

  const faqItems = [
    {
      question: "Fate consegna a domicilio a Livorno?",
      answer: "Sì, facciamo consegna a domicilio nelle zone coperte di Livorno.",
    },
    {
      question: "Posso ordinare anche da asporto?",
      answer: "Sì, puoi ordinare online e ritirare in sede in Via Inghilterra 68.",
    },
    {
      question: "Quali sono gli orari?",
      answer: "Siamo aperti tutti i giorni dalle 16:00 alle 24:00. Ultime consegne entro le 22:00.",
    },
    {
      question: "Quanto costa la consegna?",
      answer: "La consegna viene calcolata nel checkout in base alle regole attive del servizio.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE_CONFIG.name,
    image: `${SITE_CONFIG.url}/images/pizza-teglia-hero.png`,
    url: SITE_CONFIG.url,
    ...(SITE_CONFIG.phone ? { telephone: SITE_CONFIG.phone } : {}),
    email: SITE_CONFIG.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address.street,
      addressLocality: SITE_CONFIG.address.city,
      postalCode: SITE_CONFIG.address.postalCode,
      addressRegion: SITE_CONFIG.address.province,
      addressCountry: SITE_CONFIG.address.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 43.5485,
      longitude: 10.3106,
    },
    servesCuisine: ["Pizza", "Pizza in teglia", "Cucina italiana"],
    priceRange: "€€",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: SITE_CONFIG.hours.open,
        closes: SITE_CONFIG.hours.close,
      },
    ],
    hasMenu: `${SITE_CONFIG.url}/menu`,
    areaServed: [
      { "@type": "City", name: "Livorno" },
      { "@type": "Place", name: "Scopaia" },
      { "@type": "Place", name: "Collinaia" },
    ],
    ...(SITE_CONFIG.social.instagram || SITE_CONFIG.social.facebook
      ? {
          sameAs: [SITE_CONFIG.social.instagram, SITE_CONFIG.social.facebook].filter(Boolean),
        }
      : {}),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "500",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Consegna a domicilio", value: true },
      { "@type": "LocationFeatureSpecification", name: "Asporto", value: true },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-warm-light text-charcoal pt-20 md:pt-24 selection:bg-marigold/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MobileTopBar />

      {/* 1. HERO SECTION */}
      <section
        id="ordina"
        ref={heroRef}
        className="scroll-mt-24 relative flex flex-col items-center min-h-[calc(100svh-5rem)] md:min-h-[calc(100vh-4rem)] px-5 md:px-12 lg:px-20"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.018) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <FloatingIngredients />

        {/* Ambient gradients */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-terracotta/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-marigold/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
        </div>

        {/* ── MOBILE layout ── */}
        <div className="md:hidden w-full flex-1 flex flex-col items-center gap-3 animate-fade-in relative z-10 text-center pt-2 pb-5">
          <span className="text-[0.72rem] font-brand font-bold uppercase tracking-[0.22em] text-terracotta/75 px-4 py-1.5 border border-terracotta/18 rounded-full bg-warm-light/92 shadow-sm backdrop-blur-sm">
            Livorno • Scopaia
          </span>
          <h1 className="ds-heading-hero text-[clamp(2.85rem,13.1vw,3.7rem)] leading-[0.9] max-w-[9.25ch] px-1">
            La tua<br />
            pizzeria<br />
            <span className="relative -left-[8px] block w-full text-center whitespace-nowrap text-terracotta">di quartiere.</span>
          </h1>
          <div className="relative mt-1.5 w-full h-[63vw] min-h-[292px] max-h-[450px] rounded-[1.9rem] overflow-hidden shadow-[0_18px_45px_rgba(26,26,26,0.12)] border border-charcoal/5">
            <Image src="/images/pizza-teglia-hero.png" alt="Pizza in teglia La Teglieria" fill sizes="100vw" className="object-cover object-[center_46%]" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent" />
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(250,246,240,0.72)_100%)] px-4 py-2 text-[10px] font-brand font-bold uppercase tracking-[0.16em] text-charcoal backdrop-blur-xl shadow-[0_10px_20px_rgba(26,26,26,0.12)]">🔥 Tempo medio consegna 34 min</span>
          </div>
          <Link href="/menu" className="pt-0.5 text-[1.05rem] leading-none font-body font-semibold text-charcoal underline underline-offset-4 decoration-charcoal/25 hover:decoration-terracotta hover:text-terracotta transition-colors">
            Vediamo il menù →
          </Link>
          <div className="relative z-20 flex flex-col items-center gap-2.5 w-full pt-0.5">
            <div className="relative w-full">
              <div className="absolute inset-0 rounded-[999px] bg-terracotta/18 blur-md animate-pulse" />
              <Link href="/menu?type=DELIVERY" className="relative flex min-h-[4.35rem] items-center justify-center w-full py-3 rounded-[999px] text-[1.5rem] leading-none font-display text-white bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-[0_10px_22px_rgba(230,100,40,0.24)] active:scale-95 transition-all">
                Ordina ora
              </Link>
            </div>
            <Link href="/menu?type=ASPORTO" className="flex min-h-[3.4rem] items-center justify-center w-full py-3 bg-white/80 backdrop-blur-md text-charcoal border border-charcoal/10 shadow-[0_10px_26px_rgba(26,26,26,0.06)] rounded-[999px] text-[0.98rem] leading-none font-body font-semibold active:scale-95 transition-all hover:bg-white/88">
              Ritira in sede
            </Link>
          </div>
        </div>

        {/* ── DESKTOP layout: 2 colonne ── */}
        <div className="hidden md:grid md:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] md:gap-10 lg:gap-14 w-full max-w-7xl flex-1 items-center animate-fade-in relative z-10 pt-3 md:pt-5">

          {/* Colonna sinistra — testo */}
          <div className="flex flex-col justify-center gap-5 lg:gap-6 pr-2">
            <span className="text-[0.8rem] font-brand font-bold uppercase tracking-[0.25em] text-terracotta/70 px-4 py-1.5 border border-terracotta/20 rounded-full bg-warm-light/90 shadow-sm backdrop-blur-sm w-fit">
              Livorno • Scopaia
            </span>

            <h1 className="font-display text-charcoal leading-[0.96] tracking-[-0.03em] text-[clamp(4.2rem,6.85vw,5.45rem)] max-w-[12.5ch]">
              La tua pizzeria<br />
              <span className="inline-block text-terracotta">di quartiere.</span>
            </h1>

            <p className="text-[1.02rem] lg:text-[1.14rem] text-charcoal/52 font-subtitle font-medium italic leading-relaxed max-w-[31rem]">
              Pizza in teglia ad alta idratazione, croccante fuori e leggera dentro. Il forno del quartiere, con un gusto che si fa ricordare.
            </p>

            <div className="flex gap-3 items-center flex-wrap pt-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-[999px] bg-terracotta/30 blur-lg animate-pulse" />
                <Link href="/menu?type=DELIVERY" className="relative flex items-center justify-center px-9 lg:px-11 py-4 lg:py-4.5 rounded-[999px] text-[1.45rem] lg:text-[1.65rem] leading-none font-display text-white bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-[0_12px_30px_rgba(230,100,40,0.35)] hover:scale-[1.02] active:scale-95 transition-all">
                  Ordina ora
                </Link>
              </div>
              <Link href="/menu?type=ASPORTO" className="flex items-center justify-center px-7 lg:px-8 py-3.5 lg:py-4 bg-white/70 backdrop-blur-md text-charcoal border border-charcoal/16 rounded-[999px] text-[1.05rem] lg:text-[1.15rem] leading-none font-body font-semibold hover:bg-white/82 active:scale-95 transition-all">
                Ritira in sede
              </Link>
            </div>

            <Link href="/menu" className="group flex items-center gap-3 text-charcoal/70 font-body font-semibold text-[0.98rem] leading-none transition-all w-fit hover:text-terracotta">
              Vediamo il menù
              <span className="text-charcoal/35 group-hover:translate-x-1.5 group-hover:text-terracotta transition-all">→</span>
            </Link>

          </div>

          {/* Colonna destra — immagine pizza */}
          <div className="relative h-[60vh] max-h-[580px] min-h-[450px] rounded-[2.7rem] overflow-hidden shadow-[0_28px_70px_rgba(26,26,26,0.14)] border border-charcoal/5">
            <Image
              src="/images/pizza-teglia-hero.png"
              alt="Pizza in teglia La Teglieria"
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover object-[center_47%] hover:scale-105 transition-transform duration-[3s]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 flex gap-2.5">
              <span className="rounded-full border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(250,246,240,0.74)_100%)] px-4 py-2 text-xs font-brand font-bold uppercase tracking-[0.18em] text-charcoal backdrop-blur-xl shadow-[0_10px_22px_rgba(26,26,26,0.12)]">
                🔥 Tempo medio consegna 28 min
              </span>
              <span className="px-4 py-2 bg-marigold text-white rounded-full text-xs font-brand font-bold uppercase tracking-[0.18em] shadow-sm">
                High Hydration
              </span>
            </div>
          </div>
        </div>

        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-charcoal/20 text-2xl font-light">
          ↓
        </div>
      </section>

      {/* SOCIAL PROOF BADGE */}
      <div className="flex justify-center py-5">
        <div className="flex items-center gap-2.5 px-5 py-3 bg-white/80 backdrop-blur-md border border-marigold/30 rounded-full shadow-sm">
          <span className="text-marigold text-base tracking-wider">★★★★★</span>
          <span className="text-sm font-brand font-bold text-charcoal/70 tracking-wide">4.8 · 500+ recensioni</span>
        </div>
      </div>

      {/* 2. MENU HIGHLIGHTS */}
      <section id="menu" className="scroll-mt-24 py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal">
          <div>
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
              I Protagonisti
            </p>
            <h2 className="text-6xl md:text-7xl font-display leading-none text-charcoal">
              Consigli <span className="text-terracotta">artigianali.</span>
            </h2>
          </div>
          <Link href="/menu" className="flex items-center gap-2 text-terracotta font-brand font-bold uppercase tracking-widest text-base leading-none hover:translate-x-2 transition-transform mt-8 md:mt-0 px-6 py-3 border border-terracotta/20 rounded-full hover:bg-terracotta/5">
            Vedi tutto il menu
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-14">
          {highlights.map((p, idx) => (
            <div key={p.id} className="reveal group cursor-pointer" style={{ transitionDelay: `${idx * 0.1}s` }}>
              <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-charcoal/5 mb-8 shadow-lg group-hover:shadow-2xl transition-all border border-charcoal/5">
                <Image src="/images/pizza-teglia-slices.png" alt={p.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-charcoal shadow-sm">
                  {formatCurrency(p.price)}
                </div>
              </div>
              <h3 className="text-4xl font-display leading-none text-charcoal mb-2 group-hover:text-terracotta transition-colors">{p.name}</h3>
              <p className="text-charcoal/50 font-body line-clamp-2 leading-relaxed italic">{p.description || "Un&apos;esplosione di sapori artigianali creata con amore."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRODUCT SPOTLIGHT (TEGLIA INTERA) */}
      <section className="reveal py-16 md:py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
            Il Nostro Orgoglio
          </p>
          <h2 className="text-6xl md:text-7xl font-display leading-none text-charcoal">
            La <span className="text-terracotta">Teglia</span> Perfetta
          </h2>
        </div>
        <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl border border-charcoal/5 group">
          <Image
            src="/images/pizza-teglia-hero.png"
            alt="Pizza in Teglia Artigianale"
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="object-cover transition-transform duration-[2s] group-hover:scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent flex items-end p-8 md:p-16">
            <div className="space-y-4">
              <span className="inline-block px-4 py-1 bg-marigold text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                High Hydration
              </span>
              <p className="text-white text-4xl md:text-6xl font-display leading-none drop-shadow-lg">
                Croccantezza senza confini.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RECENSIONI */}
      <section
        id="dicono-di-noi"
        className="scroll-mt-24 py-24 md:py-40 bg-gradient-to-b from-marigold/5 via-warm-light to-marigold/5 relative overflow-hidden"
      >
        <div className="absolute top-40 left-0 w-80 h-80 bg-terracotta/10 rounded-full blur-[100px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20 reveal">
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
              Community
            </p>
            <h2 className="text-6xl md:text-8xl font-display leading-none text-charcoal">
              Cosa dicono <br /> <span className="text-terracotta">di noi.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { name: "Marco R.", text: "La migliore pizza in teglia della città. Croccante fuori e morbida dentro come non l'avevo mai provata.", stars: "★★★★★" },
              { name: "Giulia M.", text: "Ingredienti spaziali. Si sente che c'è ricerca dietro ogni abbinamento. Consigliatissima la Margherita DOP.", stars: "★★★★★" },
              { name: "Filippo T.", text: "Delivery puntuale e pizza arrivata ancora calda e croccante. Servizio eccellente!", stars: "★★★★★" }
            ].map((r, idx) => (
              <div
                key={idx}
                className="reveal bg-white p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(21,27,31,0.03)] border border-charcoal/5 flex flex-col justify-between"
                style={{ transitionDelay: `${idx * 0.15}s` }}
              >
                <div className="space-y-6">
                  <div className="text-marigold text-xl tracking-widest">{r.stars}</div>
                  <p className="text-lg md:text-xl leading-relaxed text-charcoal font-body italic">
                    &quot;{r.text}&quot;
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-charcoal/5">
                  <p className="font-brand font-bold uppercase tracking-widest text-xs text-terracotta">— {r.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. LA NOSTRA STORIA */}
      <section id="chi-siamo" className="scroll-mt-24 py-20 md:py-32 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-7 reveal space-y-10">
            <header>
              <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
                La Nostra Identità
              </p>
              <h2 className="text-[3.25rem] md:text-7xl font-display leading-[0.94] text-charcoal">
                Un sogno di quartiere, <br /> <span className="text-terracotta">fatto con metodo.</span>
              </h2>
            </header>
            <div className="space-y-6 text-lg md:text-xl text-charcoal/60 leading-relaxed font-body italic">
              <p>
                <span className="text-charcoal font-bold not-italic">La Teglieria</span> nasce da un sogno semplice: portare nel nostro quartiere un posto vero, fatto bene, capace di farsi ricordare.
              </p>
              <p>
                Il cuore di tutto è la Scopaia, a Livorno: un quartiere vivo dove vogliamo diventare un punto di riferimento, con l&apos;energia di un progetto giovane e la serietà di chi vuole fare le cose nel modo giusto.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/menu" className="group flex items-center gap-4 text-charcoal font-brand font-semibold text-base leading-none transition-all border-b-2 border-terracotta/20 pb-2 w-fit hover:border-terracotta">
                Scopri il nostro menù
                <span className="group-hover:translate-x-2 transition-transform">→</span>
              </Link>
            </div>
          </div>
          <div className="md:col-span-5 reveal relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-marigold/10 rounded-full blur-3xl" />
            <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)] border-8 border-white/40">
              <Image
                src="/images/pizzeria-interior.png"
                alt="Interno Pizzeria"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. QUALITÀ (INGREDIENTI) */}
      <section className="py-24 md:py-40 bg-charcoal/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-terracotta/5 rounded-full blur-[150px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24 reveal">
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
              La Materia Prima
            </p>
            <h2 className="text-[3.2rem] md:text-8xl font-display text-charcoal leading-[0.94]">
              La qualità comincia <br /> <span className="text-terracotta">prima del <span className="whitespace-nowrap">primo morso.</span></span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { emoji: "🍅", title: "San Marzano DOP Casa Marrazzo", desc: "Un prodotto campano simbolo del territorio, radicato nell'Agro Sarnese-Nocerino.", delay: "0.1s" },
              { emoji: "🌾", title: "Farina Petra - Molino Quaglia", desc: "Una firma su gusto, fragranza e personalità dell'impasto, frutto di ricerca e identità.", delay: "0.2s" },
              { emoji: "🧀", title: "Mozzarelle DOP dalla Campania", desc: "Ogni elemento parla lo stesso linguaggio: origine, autenticità e qualità riconoscibile.", delay: "0.3s" }
            ].map((item, i) => (
              <div key={i} className="reveal bg-warm-light p-12 rounded-[2.5rem] space-y-6 hover:shadow-2xl transition-all duration-500 border border-charcoal/5 group hover:-translate-y-2" style={{ transitionDelay: item.delay }}>
                <div className="w-16 h-16 bg-charcoal/5 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {item.emoji}
                </div>
                <h3 className="text-4xl font-display leading-none text-charcoal">{item.title}</h3>
                <p className="text-charcoal/50 leading-relaxed font-body">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 md:mt-32 reveal relative h-[500px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border border-charcoal/10 group">
            <Image
              src="/images/ingredients.png"
              alt="Ingredienti Premium"
              fill
              sizes="(max-width: 768px) 100vw, 90vw"
              className="object-cover transition-transform duration-[3s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent flex items-center justify-center">
              <span className="text-white text-4xl md:text-6xl font-display drop-shadow-2xl text-center px-10 leading-none">
                Metodo, ricerca <br /> e qualità vera.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINALE */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-3">
          <div className="text-center mb-6">
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] text-terracotta mb-3">Dal forno a casa tua</p>
            <h2 className="text-5xl md:text-6xl font-display leading-none text-charcoal">Ti abbiamo fatto <span className="text-terracotta">venire fame?</span></h2>
          </div>
          <div className="relative w-full">
            <div className="absolute inset-0 rounded-[999px] bg-terracotta/30 blur-lg animate-pulse" />
            <Link href="/menu?type=DELIVERY" className="relative flex items-center justify-center w-full py-5 rounded-[999px] text-[1.85rem] leading-none font-display text-white bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-[0_10px_24px_rgba(230,100,40,0.35)] active:scale-95 transition-all">
              Ordina ora
            </Link>
          </div>
          <Link href="/menu?type=ASPORTO" className="flex items-center justify-center w-full py-4 bg-white/60 backdrop-blur-md text-charcoal border border-charcoal/20 rounded-[999px] text-[1.6rem] leading-none font-display active:scale-95 transition-all hover:bg-white/75">
            Ritira in sede
          </Link>
        </div>
      </section>

      <section id="servizi" className="scroll-mt-24 py-16 md:py-20 px-6 max-w-5xl mx-auto">
        <div className="rounded-[2rem] border border-charcoal/10 bg-white/65 backdrop-blur-sm p-8 md:p-10">
          <p className="text-sm font-brand font-bold uppercase tracking-[0.28em] text-terracotta mb-4">Servizi</p>
          <h2 className="text-4xl md:text-5xl font-display leading-[0.94] text-charcoal mb-6">Consegna e asporto a Livorno</h2>
          <div className="grid md:grid-cols-2 gap-5 text-charcoal/75 font-body">
            <p>Ordina online per consegna a domicilio oppure ritiro in sede.</p>
            <p>Aperti tutti i giorni: {SITE_CONFIG.hours.display}. {SITE_CONFIG.hours.lastDeliveryDisplay}</p>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 py-10 md:py-14 px-6 max-w-5xl mx-auto">
        <p className="text-sm font-brand font-bold uppercase tracking-[0.28em] text-terracotta mb-4">FAQ</p>
        <h2 className="text-4xl md:text-5xl font-display leading-[0.94] text-charcoal mb-7">Domande frequenti</h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <details key={item.question} className="rounded-2xl border border-charcoal/10 bg-white/70 px-5 py-4">
              <summary className="cursor-pointer font-brand font-semibold text-charcoal">{item.question}</summary>
              <p className="mt-2 text-charcoal/65 font-body">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer
        ref={footerRef}
        id="contatti"
        className="scroll-mt-24 py-20 md:py-40 px-6 border-t border-charcoal/5 bg-warm-light"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6 max-w-md">
              <h3 className="text-[2.25rem] md:text-[2.6rem] leading-[0.92] tracking-[-0.035em] font-logo text-charcoal">
                LA <span className="text-terracotta">TEGLIERIA</span>
              </h3>
              <p className="text-lg text-charcoal/50 leading-relaxed font-body italic">
                Laboratorio artigianale di pizza in teglia ad alta idratazione. Dedizione, tempo e croccantezza nel cuore pulsante della città.
              </p>
              <div className="flex gap-3">
                <a href="#" className="px-5 py-2.5 rounded-full bg-charcoal/5 text-xl leading-none font-display text-charcoal hover:bg-terracotta hover:text-white transition-all">
                  Instagram
                </a>
                <a href="#" className="px-5 py-2.5 rounded-full bg-charcoal/5 text-xl leading-none font-display text-charcoal hover:bg-terracotta hover:text-white transition-all">
                  Facebook
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-24 font-brand uppercase tracking-[0.14em] md:tracking-widest text-sm leading-tight w-full md:w-auto">
              <div className="space-y-6 md:space-y-8">
                <h4 className="text-charcoal/30 font-bold">Menu</h4>
                <ul className="space-y-3 md:space-y-4 text-charcoal font-bold">
                  <li><Link href="/#ordina" className="hover:text-terracotta transition-colors">Ordina</Link></li>
                  <li><Link href="/#menu" className="hover:text-terracotta transition-colors">Classiche</Link></li>
                  <li><Link href="/#menu" className="hover:text-terracotta transition-colors">Speciali</Link></li>
                  <li><Link href="/#servizi" className="hover:text-terracotta transition-colors">Servizi</Link></li>
                  <li><Link href="/#faq" className="hover:text-terracotta transition-colors">FAQ</Link></li>
                </ul>
              </div>
              <div className="space-y-6 md:space-y-8">
                <h4 className="text-charcoal/30 font-bold">Contatti</h4>
                <ul className="space-y-3 md:space-y-4 text-charcoal font-bold tracking-[0.08em] md:tracking-widest">
                  <li>{SITE_CONFIG.address.street}, {SITE_CONFIG.address.postalCode} {SITE_CONFIG.address.city} {SITE_CONFIG.address.province}</li>
                  {SITE_CONFIG.phone && (
                    <li>
                      <a href={toPhoneHref(SITE_CONFIG.phone)} className="hover:text-terracotta transition-colors">
                        {SITE_CONFIG.phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
              <div className="space-y-6 md:space-y-8">
                <h4 className="text-charcoal/30 font-bold">Orari</h4>
                <ul className="space-y-3 md:space-y-4 text-charcoal font-bold tracking-[0.08em] md:tracking-widest">
                  <li className="text-terracotta">Aperti tutti i giorni</li>
                  <li>{SITE_CONFIG.hours.display}</li>
                  <li>{SITE_CONFIG.hours.lastDeliveryDisplay}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-charcoal/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] text-charcoal/30 font-brand font-bold uppercase tracking-[0.4em]">
              © {new Date().getFullYear()} La Teglieria Artisan Pizza • All rights reserved
            </div>

            <div className="flex items-center gap-6 flex-wrap justify-center md:justify-end">
              <Link href="/privacy" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Privacy Policy</Link>
              <div className="w-1 h-1 bg-charcoal/20 rounded-full" />
              <Link href="/cookie-policy" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Cookie Policy</Link>
              <div className="w-1 h-1 bg-charcoal/20 rounded-full" />
              <Link href="/admin/login" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Admin Area</Link>
              <div className="w-1 h-1 bg-charcoal/20 rounded-full" />
              <Link href="/rider/login" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Rider Access</Link>
            </div>
          </div>
        </div>
      </footer>
      {/* MOBILE STICKY CTA — nascosto per ora */}
    </main>
  );
}
