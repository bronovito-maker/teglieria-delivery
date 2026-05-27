import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — La Teglieria",
  description: "Informativa sull'uso dei cookie, del Meta Pixel e dei servizi di terze parti ai sensi del D.Lgs. 69/2012 e del GDPR.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-warm-light text-charcoal">
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-brand font-bold uppercase tracking-widest text-charcoal/40 hover:text-terracotta transition-colors mb-12">
          ← La Teglieria
        </Link>

        <header className="mb-14">
          <p className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta mb-4">Documento legale</p>
          <h1 className="text-5xl md:text-6xl font-display leading-none text-charcoal mb-6">
            Cookie <span className="text-terracotta">Policy</span>
          </h1>
          <p className="text-sm text-charcoal/40 font-body">
            Ultimo aggiornamento: <strong className="text-charcoal/60">Aprile 2026</strong>
          </p>
        </header>

        <div className="space-y-10 font-body text-charcoal/70 leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo durante la navigazione. Servono a far funzionare il sito correttamente, ricordare le tue preferenze e, in alcuni casi, raccogliere informazioni statistiche aggregate.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-display text-charcoal">Cookie che utilizziamo</h2>

            <div className="bg-white/60 border border-charcoal/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-charcoal/5 bg-charcoal/[0.02]">
                <p className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal">Tecnici / Strettamente necessari</p>
              </div>
              <div className="divide-y divide-charcoal/5">
                {[
                  { nome: "sb-access-token", scopo: "Sessione di autenticazione utente (Supabase)", durata: "Sessione" },
                  { nome: "sb-refresh-token", scopo: "Rinnovo automatico della sessione (Supabase)", durata: "7 giorni" },
                  { nome: "cart-storage", scopo: "Persistenza del carrello ordine (localStorage)", durata: "Sessione" },
                ].map((c) => (
                  <div key={c.nome} className="px-5 py-4 grid grid-cols-3 gap-4 text-sm">
                    <code className="text-terracotta font-mono text-xs break-all">{c.nome}</code>
                    <span className="text-charcoal/60 col-span-1">{c.scopo}</span>
                    <span className="text-charcoal/40 text-xs text-right">{c.durata}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-charcoal/[0.02] border-t border-charcoal/5">
                <p className="text-xs text-charcoal/40">Questi cookie sono indispensabili per il funzionamento del servizio. Non richiedono consenso.</p>
              </div>
            </div>

            <div className="bg-white/60 border border-charcoal/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-charcoal/5 bg-charcoal/[0.02]">
                <p className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal">Funzionali</p>
              </div>
              <div className="divide-y divide-charcoal/5">
                {[
                  { nome: "order-type", scopo: "Ricorda la preferenza delivery/asporto", durata: "30 giorni" },
                ].map((c) => (
                  <div key={c.nome} className="px-5 py-4 grid grid-cols-3 gap-4 text-sm">
                    <code className="text-terracotta font-mono text-xs break-all">{c.nome}</code>
                    <span className="text-charcoal/60 col-span-1">{c.scopo}</span>
                    <span className="text-charcoal/40 text-xs text-right">{c.durata}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-charcoal/[0.02] border-t border-charcoal/5">
                <p className="text-xs text-charcoal/40">Migliorano l&apos;esperienza d&apos;uso ma non sono strettamente necessari. Puoi disabilitarli dal browser.</p>
              </div>
            </div>

            <div className="bg-white/60 border border-charcoal/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-charcoal/5 bg-charcoal/[0.02]">
                <p className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal">Cookie di terze parti</p>
              </div>
              <div className="divide-y divide-charcoal/5">
                {[
                  { nome: "Google Maps", scopo: "Geocodifica indirizzi e calcolo distanze per la consegna", durata: "Variabile" },
                  { nome: "Google OAuth", scopo: "Autenticazione tramite account Google (solo se usato)", durata: "Sessione" },
                  { nome: "Meta Pixel", scopo: "Misurazione delle visite e delle conversioni delle campagne pubblicitarie Meta", durata: "Variabile" },
                ].map((c) => (
                  <div key={c.nome} className="px-5 py-4 grid grid-cols-3 gap-4 text-sm">
                    <span className="text-terracotta font-brand font-semibold text-xs">{c.nome}</span>
                    <span className="text-charcoal/60 col-span-1">{c.scopo}</span>
                    <span className="text-charcoal/40 text-xs text-right">{c.durata}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-charcoal/[0.02] border-t border-charcoal/5">
                <p className="text-xs text-charcoal/40">
                  Questi cookie sono gestiti dai rispettivi fornitori. Consulta la{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">
                    Privacy Policy di Google
                  </a>{" "}
                  e la{" "}
                  <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">
                    Privacy Policy di Meta
                  </a>.
                </p>
              </div>
            </div>

            <p className="text-sm bg-marigold/10 border border-marigold/20 rounded-2xl px-5 py-4 text-charcoal/70">
              <strong className="text-charcoal">Usiamo Meta Pixel</strong> per misurare l&apos;efficacia delle campagne pubblicitarie e migliorare le comunicazioni promozionali. Puoi limitare il tracciamento dalle impostazioni privacy del browser e dalle preferenze del tuo account Meta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">Come gestire i cookie</h2>
            <p>
              Puoi controllare e disabilitare i cookie tramite le impostazioni del tuo browser. Tieni presente che disabilitare i cookie tecnici potrebbe compromettere il funzionamento del servizio (es. impossibilità di effettuare il login o completare un ordine).
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">Safari</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">Modifiche</h2>
            <p>
              Potremmo aggiornare questa Cookie Policy in seguito a modifiche tecniche o normative. La data in cima al documento indica l&apos;ultima revisione.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-charcoal/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-charcoal/30 font-body">© {new Date().getFullYear()} La Teglieria · Via Inghilterra 68, Livorno</p>
          <Link href="/privacy" className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal/40 hover:text-terracotta transition-colors">
            Privacy Policy →
          </Link>
        </div>

      </div>
    </main>
  );
}
