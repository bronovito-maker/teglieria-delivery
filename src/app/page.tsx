"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingIngredients from "@/components/ui/FloatingIngredients";

// Observer for scroll animations
const useScrollReveal = (deps: any[] = []) => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, deps);
};

export default function LandingPage() {
  const [highlights, setHighlights] = useState<any[]>([]);
  useScrollReveal([highlights]);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        // Flatten and take 3 random products as highlights
        const allProducts = data.flatMap((c: any) => c.products);
        setHighlights(allProducts.slice(0, 3));
      });
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#1d1d1f]">
      {/* 1. HERO SECTION */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        <FloatingIngredients />
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-30 animate-pulse" />
        </div>

        <div className="max-w-4xl text-center space-y-8 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight text-gradient">
            La Teglieria. <br />
            <span className="text-3xl md:text-5xl font-medium text-gray-400">La pizza, elevata.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto font-medium">
            Croccantezza artigianale e leggerezza sbalorditiva. Il nuovo standard della pizza in teglia.
          </p>

          <div className="pt-8 flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/menu?type=DELIVERY" className="px-12 py-5 bg-[#1d1d1f] text-white rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-2xl">
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
      <section className="reveal py-12 px-6 max-w-5xl mx-auto">
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
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="reveal space-y-6">
            <h2 className="text-4xl font-bold">La Nostra Storia</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Nata nel cuore della città, La Teglieria non è solo una pizzeria. È un laboratorio di ricerca dove la tradizione dell'impasto incontra tecniche di lievitazione moderna.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Il segreto? 72 ore di maturazione, farina di grani antichi e una passione ossessiva per il "crunch" perfetto. Ogni nostra teglia racconta un viaggio tra sapori autentici e innovazione.
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
      <section className="py-24 bg-[#f5f5f7]">
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

          <div className="mt-16 reveal relative h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl">
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
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 reveal">
          <div>
            <h2 className="text-4xl font-bold mb-2">I Consigliati</h2>
            <p className="text-gray-500 text-lg">Direttamente dal nostro laboratorio creativo.</p>
          </div>
          <Link href="/menu" className="text-[#0071e3] font-semibold hover:underline mt-4 md:mt-0 inline-block">
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
      <section className="py-24 bg-[#1d1d1f] text-white">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <h2 className="text-4xl font-bold text-center mb-16 reveal">Cosa Dicono di Noi</h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { name: "Marco R.", text: "La migliore pizza in teglia della città. Croccante fuori e morbida dentro come non l'avevo mai provata.", stars: "⭐⭐⭐⭐⭐" },
              { name: "Giulia M.", text: "Ingredienti spaziali. Si sente che c'è ricerca dietro ogni abbinamento. Consigliatissima la Margherita DOP.", stars: "⭐⭐⭐⭐⭐" },
              { name: "Filippo T.", text: "Delivery puntuale e pizza arrivata ancora calda e croccante. Servizio eccellente!", stars: "⭐⭐⭐⭐⭐" }
            ].map((r, idx) => (
              <div key={idx} className="reveal space-y-4 border-l border-gray-800 pl-8" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="text-yellow-400">{r.stars}</div>
                <p className="text-xl leading-relaxed text-gray-400 italic">"{r.text}"</p>
                <p className="font-bold text-gray-200">— {r.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER & STICKY CTA */}
      <footer className="py-20 border-t border-gray-100 px-6 mb-24 md:mb-0">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm text-gray-500">
          <div className="space-y-4">
            <h4 className="text-[#1d1d1f] font-bold text-lg">La Teglieria.</h4>
            <p>Laboratorio artigianale di pizza in teglia ad alta idratazione.</p>
          </div>
          <div>
            <h4 className="text-[#1d1d1f] font-bold mb-4">Orari</h4>
            <p>Lun - Dom: 18:30 - 22:30</p>
            <p>Chiuso il Martedì</p>
          </div>
          <div>
            <h4 className="text-[#1d1d1f] font-bold mb-4">Contatti</h4>
            <p>Via Roma 123, Roma</p>
            <p>Tel: +39 06 123 4567</p>
          </div>
          <div>
            <h4 className="text-[#1d1d1f] font-bold mb-4">Social</h4>
            <div className="flex gap-4">
              <span className="cursor-pointer hover:text-[#1d1d1f]">Instagram</span>
              <span className="cursor-pointer hover:text-[#1d1d1f]">Facebook</span>
            </div>
          </div>
        </div>
        <div className="text-center mt-20 text-xs text-gray-300">
          © {new Date().getFullYear()} La Teglieria • Creato con cura artigianale.
        </div>
      </footer>

      {/* MOBILE STICKY CTA */}
      <div className="md:hidden fixed bottom-8 inset-x-0 px-6 z-50">
        <Link
          href="/menu"
          className="flex items-center justify-center w-full bg-white/90 backdrop-blur-xl py-4 rounded-full text-[#1d1d1f] font-bold shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/40 active:scale-95 transition-all"
        >
          🍕 Ordina Ora la tua Teglia
        </Link>
      </div>
    </main>
  );
}
