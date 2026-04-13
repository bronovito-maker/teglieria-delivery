"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingIngredients from "@/components/ui/FloatingIngredients";
import MobileTopBar from "@/components/client/MobileTopBar";

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
  const heroRef = useRef<HTMLElement | null>(null);
  useScrollReveal();

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
    <main className="min-h-screen bg-white text-[#1d1d1f] pt-24 md:pt-0">
      <MobileTopBar />

      {/* 1. HERO SECTION */}
      <section
        id="ordina"
        ref={heroRef}
        className="scroll-mt-24 relative h-screen flex flex-col items-center justify-center overflow-hidden px-6"
      >
        <FloatingIngredients />
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-30 animate-pulse" />
        </div>

        <div className="max-w-4xl text-center space-y-8 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight text-[#cf2a1d]">
            La Teglieria. <br />
            <span className="text-3xl md:text-5xl font-medium text-gray-400">La pizza, elevata.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto font-medium">
            Croccantezza artigianale e leggerezza sbalorditiva. Il nuovo standard della pizza in teglia.
          </p>

          <div className="pt-8 flex flex-col md:flex-row gap-4 justify-center">
            <Link
              href="/menu?type=DELIVERY"
              className="px-12 py-5 rounded-full text-lg font-semibold text-white tomato-glass border hover:scale-105 transition-transform"
            >
              Ordina Ora
            </Link>
            <Link href="/menu?type=ASPORTO" className="px-12 py-5 bg-white text-[#1d1d1f] border border-gray-200 rounded-full text-lg font-semibold hover:bg-gray-50 transition-colors">
              Ritira in Sede
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-300">
          ↓
        </div>
      </section>

      {/* 1.5 PRODUCT SPOTLIGHT (TEGLIA INTERA) */}
      <section className="reveal py-10 md:py-12 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-3">
            Signature Teglia
          </p>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
            Il Nostro Manifesto di Croccantezza
          </h2>
        </div>
        <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
          <Image
            src="/images/pizza-teglia-hero.png"
            alt="Pizza in Teglia Artigianale"
            fill
            className="object-cover transition-transform duration-1000 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8 md:p-12">
            <p className="text-white text-xl md:text-2xl font-semibold drop-shadow-md">
              Rigorosamente in teglia. <br className="md:hidden" /> Croccantezza senza confini.
            </p>
          </div>
        </div>
      </section>

      {/* 2. LA NOSTRA STORIA */}
      <section id="chi-siamo" className="scroll-mt-24 py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10 md:mb-14 reveal">
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-3">
            Chi Siamo
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Dietro Ogni Teglia C&apos;è Ricerca
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="reveal space-y-6">
            <h3 className="text-3xl font-bold">La Nostra Storia</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Nata nel cuore della città, La Teglieria non è solo una pizzeria. È un laboratorio di ricerca dove la tradizione dell&apos;impasto incontra tecniche di lievitazione moderna.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Il segreto? 72 ore di maturazione, farina di grani antichi e una passione ossessiva per il &quot;crunch&quot; perfetto. Ogni nostra teglia racconta un viaggio tra sapori autentici e innovazione.
            </p>
          </div>
          <div className="reveal order-first md:order-last">
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/images/pizzeria-interior.png"
                alt="Interno Pizzeria"
                fill
                className="object-cover transition-transform duration-1000 hover:scale-110"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUALITÀ (INGREDIENTI) */}
      <section className="py-16 md:py-24 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Il Nostro Segreto</h2>
            <p className="text-xl text-gray-500">Meno ingredienti, più ricerca.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="reveal bg-white p-8 rounded-3xl space-y-4 hover:shadow-xl transition-shadow" style={{ transitionDelay: '0.1s' }}>
              <div className="text-3xl">🌾</div>
              <h3 className="text-xl font-bold">Impasto 72h</h3>
              <p className="text-gray-500">Lunga lievitazione per una digeribilità senza precedenti e una croccantezza unica.</p>
            </div>
            <div className="reveal bg-white p-8 rounded-3xl space-y-4 hover:shadow-xl transition-shadow" style={{ transitionDelay: '0.2s' }}>
              <div className="text-3xl">🍅</div>
              <h3 className="text-xl font-bold">San Marzano DOP</h3>
              <p className="text-gray-500">Solo pomodori selezionati dai migliori produttori locali per un sapore vibrante.</p>
            </div>
            <div className="reveal bg-white p-8 rounded-3xl space-y-4 hover:shadow-xl transition-shadow" style={{ transitionDelay: '0.3s' }}>
              <div className="text-3xl">🌿</div>
              <h3 className="text-xl font-bold">Olio del Contadino</h3>
              <p className="text-gray-500">Olio extravergine spremuto a freddo, aggiunto a crudo per preservare ogni aroma.</p>
            </div>
          </div>

          <div className="mt-12 md:mt-16 reveal relative h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/ingredients.png"
              alt="Ingredienti Premium"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-3xl font-bold italic drop-shadow-lg text-center px-6">Qualità senza compromessi.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MENU HIGHLIGHTS */}
      <section id="menu" className="scroll-mt-24 py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 reveal">
          <div>
            <h2 className="text-4xl font-bold mb-2">I Consigliati</h2>
            <p className="text-gray-500 text-lg">Direttamente dal nostro laboratorio creativo.</p>
          </div>
          <Link href="/menu" className="text-[#cf2a1d] font-semibold hover:underline mt-4 md:mt-0 inline-block">
            Vedi tutto il menu →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {highlights.map((p, idx) => (
            <div key={p.id} className="reveal group cursor-pointer" style={{ transitionDelay: `${idx * 0.1}s` }}>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-4 shadow-sm group-hover:shadow-md transition-all">
                <Image src="/images/pizza-teglia-slices.png" alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-gray-500 line-clamp-2 mt-1">{p.description || "Un'esplosione di sapori artigianali."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RECENSIONI */}
      <section
        id="dicono-di-noi"
        className="scroll-mt-24 py-16 md:py-24 bg-gradient-to-b from-[#fff7f5] via-white to-[#fff7f5]"
      >
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="text-center mb-12 md:mb-16 reveal">
            <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-3">
              Recensioni
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1d1d1f]">
              Cosa Dicono di Noi
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { name: "Marco R.", text: "La migliore pizza in teglia della città. Croccante fuori e morbida dentro come non l'avevo mai provata.", stars: "⭐⭐⭐⭐⭐" },
              { name: "Giulia M.", text: "Ingredienti spaziali. Si sente che c'è ricerca dietro ogni abbinamento. Consigliatissima la Margherita DOP.", stars: "⭐⭐⭐⭐⭐" },
              { name: "Filippo T.", text: "Delivery puntuale e pizza arrivata ancora calda e croccante. Servizio eccellente!", stars: "⭐⭐⭐⭐⭐" }
            ].map((r, idx) => (
              <div
                key={idx}
                className="reveal rounded-2xl border border-red-100/70 bg-white p-6 md:p-7 shadow-[0_8px_22px_rgba(31,38,135,0.06)]"
                style={{ transitionDelay: `${idx * 0.12}s` }}
              >
                <div className="text-yellow-500 mb-3">{r.stars}</div>
                <p className="text-base md:text-lg leading-relaxed text-gray-600 italic mb-5">
                  &quot;{r.text}&quot;
                </p>
                <p className="font-bold text-[#cf2a1d]">— {r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER & STICKY CTA */}
      <footer
        id="contatti"
        className="scroll-mt-24 py-14 md:py-20 px-6 mb-24 md:mb-0 border-t border-red-100 bg-gradient-to-b from-white via-[#fff7f5] to-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-3">
              Contatti
            </p>
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">
              Passa in Teglieria o Ordina Online
            </h3>
          </div>

          <div className="grid md:grid-cols-4 gap-4 md:gap-6 text-sm text-gray-600">
            <div className="rounded-2xl border border-red-100/70 bg-white/85 p-5 space-y-3">
              <h4 className="text-[#cf2a1d] font-bold text-lg">La Teglieria.</h4>
              <p>Laboratorio artigianale di pizza in teglia ad alta idratazione.</p>
            </div>

            <div className="rounded-2xl border border-red-100/70 bg-white/85 p-5">
              <h4 className="text-[#1d1d1f] font-bold mb-3">Orari</h4>
              <p>Lun - Dom: 18:30 - 22:30</p>
              <p>Chiuso il Martedì</p>
            </div>

            <div className="rounded-2xl border border-red-100/70 bg-white/85 p-5 space-y-1">
              <h4 className="text-[#1d1d1f] font-bold mb-3">Contatti</h4>
              <p>Via Roma 123, Roma</p>
              <a href="tel:+39061234567" className="block text-[#cf2a1d] font-semibold hover:underline">
                Tel: +39 06 123 4567
              </a>
            </div>

            <div className="rounded-2xl border border-red-100/70 bg-white/85 p-5">
              <h4 className="text-[#1d1d1f] font-bold mb-3">Social</h4>
              <div className="flex gap-2">
                <a href="#" className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[#cf2a1d] font-semibold">
                  Instagram
                </a>
                <a href="#" className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[#cf2a1d] font-semibold">
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 md:mt-16 text-xs text-gray-400">
          © {new Date().getFullYear()} La Teglieria • Creato con cura artigianale.
        </div>

        <div className="mt-4 text-center">
          <details className="inline-block text-[11px] text-gray-400">
            <summary className="cursor-pointer select-none hover:text-gray-500 transition-colors">
              Area riservata
            </summary>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Link href="/admin/login" className="hover:text-[#cf2a1d] transition-colors">
                Admin
              </Link>
              <span>•</span>
              <Link href="/rider/login" className="hover:text-[#cf2a1d] transition-colors">
                Rider
              </Link>
            </div>
          </details>
        </div>
      </footer>

      {/* MOBILE STICKY CTA */}
      <div
        className={`md:hidden fixed bottom-8 inset-x-0 px-6 z-50 transition-all duration-400 ${
          showMobileCta
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        <Link
          href="/menu"
          className="flex items-center justify-center w-full py-4 rounded-full text-white font-bold tomato-glass border active:scale-95 transition-all"
        >
          🍕 Ordina Ora la tua Teglia
        </Link>
      </div>
    </main>
  );
}
