"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingIngredients from "@/components/ui/FloatingIngredients";
import MobileTopBar from "@/components/client/MobileTopBar";
import { formatCurrency } from "@/lib/utils";

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
  const [showMobileCta, setShowMobileCta] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  useScrollReveal();

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        // Flatten and take 3 random products as highlights
        const allProducts = data.flatMap((c: any) => c.products);
        setHighlights(allProducts.slice(0, 3));
      });
  }, []);

  useEffect(() => {
    let ticking = false;

    const updateCtaVisibility = () => {
      const heroHeight = heroRef.current?.offsetHeight || window.innerHeight;
      const triggerPoint = Math.max(260, heroHeight - 92);
      setShowMobileCta(window.scrollY > triggerPoint);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateCtaVisibility();
        ticking = false;
      });
    };

    updateCtaVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <main className="min-h-screen bg-warm-light text-charcoal pt-24 selection:bg-marigold/30">
      <MobileTopBar />

      {/* 1. HERO SECTION */}
      <section
        id="ordina"
        ref={heroRef}
        className="scroll-mt-24 relative flex flex-col items-center h-[calc(100dvh-6rem)] md:h-[calc(100dvh-4rem)] overflow-hidden px-6"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.018) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Floating ingredients — desktop only */}
        <div className="hidden md:block"><FloatingIngredients /></div>

        {/* Ambient gradients */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-terracotta/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-marigold/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
        </div>

        <div className="max-w-lg md:max-w-4xl w-full flex-1 flex flex-col items-center justify-between md:justify-center animate-fade-in relative z-10 md:gap-12 text-center pt-6 pb-7 md:pt-0 md:pb-0">

          {/* Top group: label + headline + image + subheadline */}
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Label */}
            <span className="text-[0.8rem] font-brand font-bold uppercase tracking-[0.25em] text-terracotta/70 px-4 py-1.5 border border-terracotta/20 rounded-full bg-warm-light/90 shadow-sm backdrop-blur-sm">
              Livorno • Dal 2026
            </span>

            {/* H1 */}
            <h1 className="text-[1.9rem] leading-[1.1] sm:text-5xl md:text-7xl md:leading-tight font-brand font-semibold text-charcoal">
              Pizza in teglia romana.{" "}
              <span className="text-terracotta text-[1.6rem] sm:text-4xl md:text-6xl">Croccante fuori, leggera dentro.</span>
            </h1>

            {/* Pizza image — mobile only */}
            <div className="md:hidden relative w-full h-[300px] rounded-[1.5rem] overflow-hidden shadow-xl border border-charcoal/5 mt-1">
              <Image
                src="/images/pizza-teglia-hero.png"
                alt="Pizza in teglia La Teglieria"
                fill
                className="object-cover object-center scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/25 via-transparent to-transparent" />
            </div>

            {/* Subheadline — una riga */}
            <p className="text-[1.15rem] sm:text-lg md:text-2xl text-charcoal/50 font-subtitle font-medium italic leading-relaxed md:max-w-2xl">
              La tua pizzeria di quartiere.
            </p>
          </div>

          {/* Bottom group: badge + CTAs + trust */}
          <div className="flex flex-col items-center gap-2.5 w-full">
            {/* Delivery badge — above CTA */}
            <span className="md:hidden text-[0.78rem] font-brand font-bold uppercase tracking-[0.15em] text-terracotta/80 px-4 py-1.5 rounded-full border border-terracotta/20 bg-terracotta/5">
              🔥 Consegna in 20–30 min
            </span>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-none md:gap-4 md:justify-center">
              {/* CTA primaria con glow pulse */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-0 rounded-[999px] bg-terracotta/25 blur-md animate-pulse" />
                <Link
                  href="/menu?type=DELIVERY"
                  className="relative flex items-center justify-center w-full sm:w-auto px-7 py-[0.95rem] md:px-14 md:py-6 rounded-[999px] text-[1.05rem] leading-none md:text-xl font-brand font-semibold uppercase tracking-wide text-white bg-gradient-to-br from-[#f17a3c] via-[#e66a26] to-[#c5561a] shadow-[0_10px_25px_rgba(230,100,40,0.25)] hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Ordina ora
                </Link>
              </div>
              <Link
                href="/menu?type=ASPORTO"
                className="flex items-center justify-center w-full sm:w-auto px-7 py-[0.95rem] md:px-14 md:py-6 bg-white/50 text-charcoal border-2 border-charcoal/50 rounded-[999px] text-[1.05rem] leading-none md:text-xl font-brand font-semibold uppercase tracking-wide hover:bg-white/80 hover:border-charcoal/60 transition-all"
              >
                Ritira in sede
              </Link>
            </div>

            {/* Trust badge */}
            <span className="text-sm text-charcoal/55 font-body tracking-wide">
              ⭐ 4.8 su 500+ recensioni
            </span>
          </div>
        </div>

        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-charcoal/20 text-2xl font-light">
          ↓
        </div>
      </section>


      {/* 1.5 PRODUCT SPOTLIGHT (TEGLIA INTERA) */}
      <section className="reveal py-16 md:py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
            Il Nostro Orgoglio
          </p>
          <h2 className="text-5xl md:text-6xl font-brand font-semibold leading-none text-charcoal">
            La <span className="text-terracotta">Teglia</span> Perfetta
          </h2>
        </div>
        <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl border border-charcoal/5 group">
          <Image
            src="/images/pizza-teglia-hero.png"
            alt="Pizza in Teglia Artigianale"
            fill
            className="object-cover transition-transform duration-[2s] group-hover:scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent flex items-end p-8 md:p-16">
            <div className="space-y-4">
              <span className="inline-block px-4 py-1 bg-marigold text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                High Hydration
              </span>
              <p className="text-white text-2xl md:text-4xl font-brand font-semibold leading-tight drop-shadow-lg">
                Croccantezza senza confini.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LA NOSTRA STORIA */}
      <section id="chi-siamo" className="scroll-mt-24 py-20 md:py-32 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-7 reveal space-y-10">
            <header>
              <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
                L&apos;Eredità
              </p>
              <h2 className="text-5xl md:text-6xl font-brand font-semibold leading-none text-charcoal">
                Dietro ogni teglia <br /> <span className="text-terracotta">c&apos;è ricerca.</span>
              </h2>
            </header>
            <div className="space-y-6 text-lg md:text-xl text-charcoal/60 leading-relaxed font-body italic">
              <p>
                Nata nel cuore della città, <span className="text-charcoal font-bold not-italic">La Teglieria</span> non è solo una pizzeria. È un laboratorio dove la tradizione incontra le tecniche di lievitazione più avanzate.
              </p>
              <p>
                Il segreto? <span className="text-terracotta font-bold not-italic">7d 48 ore</span> di maturazione, farina di grani antichi e una passione ossessiva per il &quot;crunch&quot; perfetto. Ogni nostra teglia racconta un viaggio tra sapori autentici e innovazione.
              </p>
            </div>
            <div className="pt-6">
              <Link href="/menu" className="group flex items-center gap-4 text-charcoal font-brand font-semibold text-base leading-none transition-all border-b-2 border-terracotta/20 pb-2 w-fit hover:border-terracotta">
                Scopri la collezione
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

      {/* 3. QUALITÀ (INGREDIENTI) */}
      <section className="py-24 md:py-40 bg-charcoal/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-terracotta/5 rounded-full blur-[150px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24 reveal">
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
              La Materia Prima
            </p>
            <h2 className="text-5xl md:text-7xl font-brand font-semibold text-charcoal leading-none">
              Meno ingredienti, <br /> <span className="text-terracotta">più ricerca.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { emoji: "🌾", title: "Impasto 48h", desc: "Lunga maturazione per una digeribilità senza precedenti e un alveolatura perfetta.", delay: "0.1s" },
              { emoji: "🍅", title: "San Marzano DOP", desc: "Solo pomodori selezionati dai migliori ettari dell'agro sarnese-nocerino.", delay: "0.2s" },
              { emoji: "🌿", title: "Olio EVO", desc: "Estratto a freddo, aggiunto a crudo per preservare ogni nota aromatica.", delay: "0.3s" }
            ].map((item, i) => (
              <div key={i} className="reveal bg-warm-light p-12 rounded-[2.5rem] space-y-6 hover:shadow-2xl transition-all duration-500 border border-charcoal/5 group hover:-translate-y-2" style={{ transitionDelay: item.delay }}>
                <div className="w-16 h-16 bg-charcoal/5 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                  {item.emoji}
                </div>
                <h3 className="text-3xl font-brand font-semibold leading-none text-charcoal">{item.title}</h3>
                <p className="text-charcoal/50 leading-relaxed font-body">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 md:mt-32 reveal relative h-[500px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border border-charcoal/10 group">
            <Image
              src="/images/ingredients.png"
              alt="Ingredienti Premium"
              fill
              className="object-cover transition-transform duration-[3s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent flex items-center justify-center">
              <span className="text-white text-3xl md:text-5xl font-brand font-semibold drop-shadow-2xl text-center px-10">
                Qualità senza <br /> compromessi.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MENU HIGHLIGHTS */}
      <section id="menu" className="scroll-mt-24 py-24 md:py-40 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 reveal">
          <div>
            <p className="text-sm font-brand font-bold uppercase tracking-[0.3em] leading-none text-terracotta mb-4">
              I Protagonisti
            </p>
            <h2 className="text-5xl md:text-6xl font-brand font-semibold leading-none text-charcoal">
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
                <Image src="/images/pizza-teglia-slices.png" alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-charcoal shadow-sm">
                  {formatCurrency(p.price)}
                </div>
              </div>
              <h3 className="text-3xl font-brand font-semibold leading-none text-charcoal mb-2 group-hover:text-terracotta transition-colors">{p.name}</h3>
              <p className="text-charcoal/50 font-body line-clamp-2 leading-relaxed italic">{p.description || "Un&apos;esplosione di sapori artigianali creata con amore."}</p>
            </div>
          ))}
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
            <h2 className="text-5xl md:text-7xl font-brand font-semibold leading-none text-charcoal">
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

      {/* FOOTER & STICKY CTA */}
      <footer
        ref={footerRef}
        id="contatti"
        className="scroll-mt-24 py-20 md:py-40 px-6 border-t border-charcoal/5 bg-warm-light"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6 max-w-md">
              <h3 className="text-[1.65rem] leading-none font-logo font-semibold uppercase tracking-[0.08em] text-charcoal">
                La <span className="text-terracotta">Teglieria</span>
              </h3>
              <p className="text-lg text-charcoal/50 leading-relaxed font-body italic">
                Laboratorio artigianale di pizza in teglia ad alta idratazione. Dedizione, tempo e croccantezza nel cuore pulsante della città.
              </p>
              <div className="flex gap-3">
                <a href="#" className="px-5 py-2.5 rounded-full bg-charcoal/5 text-xs font-brand font-semibold text-charcoal hover:bg-terracotta hover:text-white transition-all">
                  Instagram
                </a>
                <a href="#" className="px-5 py-2.5 rounded-full bg-charcoal/5 text-xs font-brand font-semibold text-charcoal hover:bg-terracotta hover:text-white transition-all">
                  Facebook
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24 font-brand uppercase tracking-widest text-sm leading-none">
              <div className="space-y-8">
                <h4 className="text-charcoal/30 font-bold">Menu</h4>
                <ul className="space-y-4 text-charcoal font-bold">
                  <li><Link href="/#ordina" className="hover:text-terracotta transition-colors">Ordina</Link></li>
                  <li><Link href="/#menu" className="hover:text-terracotta transition-colors">Classiche</Link></li>
                  <li><Link href="/#menu" className="hover:text-terracotta transition-colors">Gourmet</Link></li>
                </ul>
              </div>
              <div className="space-y-8">
                <h4 className="text-charcoal/30 font-bold">Contatti</h4>
                <ul className="space-y-4 text-charcoal font-bold">
                  <li>Via Inghilterra, 68, 57128 Livorno LI</li>
                  <li><a href="tel:+39061234567" className="hover:text-terracotta transition-colors">+39 06 123 4567</a></li>
                  <li className="text-terracotta">Chiuso il Martedì</li>
                </ul>
              </div>
              <div className="space-y-8 col-span-2 md:col-span-1">
                <h4 className="text-charcoal/30 font-bold">Orari</h4>
                <ul className="space-y-4 text-charcoal font-bold">
                  <li>Lun - Ven: 18:30 - 22:30</li>
                  <li>Sab - Dom: 17:30 - 23:00</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-charcoal/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] text-charcoal/30 font-brand font-bold uppercase tracking-[0.4em]">
              © {new Date().getFullYear()} La Teglieria Artisan Pizza • All rights reserved
            </div>

            <div className="flex items-center gap-6">
              <Link href="/admin/login" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Admin Area</Link>
              <div className="w-1 h-1 bg-charcoal/20 rounded-full" />
              <Link href="/rider/login" className="text-[10px] text-charcoal/40 font-brand font-bold uppercase tracking-widest hover:text-terracotta transition-colors">Rider Access</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* MOBILE STICKY CTA */}
      <div
        className={`md:hidden fixed bottom-8 inset-x-0 px-5 z-50 transition-all duration-400 ${showMobileCta && !footerVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10 pointer-events-none"
          }`}
      >
        <Link
          href="/menu"
          className="flex items-center justify-center w-full py-4 rounded-[999px] text-base text-white font-brand font-semibold tracking-wide bg-gradient-to-br from-[#f17a3c] via-[#e66a26] to-[#c5561a] shadow-[0_10px_25px_rgba(230,100,40,0.25)] active:scale-95 transition-all"
        >
          🍕 Ordina la tua Teglia
        </Link>
      </div>
    </main>
  );
}
