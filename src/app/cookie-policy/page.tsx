import Link from "next/link";
import type { Metadata } from "next";
import MobileTopBar from "@/components/client/MobileTopBar";

export const metadata: Metadata = {
  title: "Cookie Policy — La Teglieria",
  description: "Informazioni sui cookie tecnici, sulle preferenze e sul Pixel Meta facoltativo.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-warm-light text-charcoal">
      <MobileTopBar />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">

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
            Ultimo aggiornamento: <strong className="text-charcoal/60">15 ottobre 2026</strong>
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
                  { nome: "lt_cookie_preferences", scopo: "Scelta cookie tecnici/pubblicitari, versione, identificativo e data della scelta; non autorizza newsletter o profilazione CRM", durata: "12 mesi su questo browser" },
                  { nome: "lt_cookie_consent_changed", scopo: "Segnale tecnico locale per aggiornare le preferenze nelle altre schede aperte; non contiene contatti o scelte pubblicitarie", durata: "Fino alla rimozione dal browser" },
                  { nome: "lt_web_session", scopo: "Sessione di autenticazione protetta HttpOnly", durata: "7 giorni" },
                  { nome: "lt_order_…", scopo: "Accesso allo stato del proprio ordine", durata: "7 giorni" },
                  { nome: "lt_oauth_state", scopo: "Sicurezza dell’accesso Google, quando richiesto", durata: "10 minuti" },
                  { nome: "teglieria-cart", scopo: "Carrello e modalità asporto/delivery in localStorage", durata: "Fino alla rimozione dal browser" },
                  { nome: "teglieria-pending-checkout", scopo: "Ripresa del pagamento in localStorage, incluso il collegamento personale all’ordine", durata: "Rimosso alla rilevazione del pagamento o annullamento; può restare se non si riapre il sito" },
                  { nome: "guestOrderCompleted", scopo: "Indicatore senza contatti personali per proporre la registrazione dopo un ordine ospite", durata: "Sessione della scheda o chiusura della proposta" },
                ].map((c) => (
                  <div key={c.nome} className="px-5 py-4 grid grid-cols-3 gap-4 text-sm">
                    <code className="text-terracotta font-mono text-xs break-all">{c.nome}</code>
                    <span className="text-charcoal/60 col-span-1">{c.scopo}</span>
                    <span className="text-charcoal/40 text-xs text-right">{c.durata}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-charcoal/[0.02] border-t border-charcoal/5">
                <p className="text-xs text-charcoal/40">I cookie strettamente necessari non richiedono consenso preventivo. La memoria del carrello e del pagamento serve alle funzioni richieste: non è profilazione. Il Pixel Meta è facoltativo: parte solo dopo il consenso pubblicitario di un maggiorenne. “Accetta solo essenziali” lascia attive prenotazioni e pagamenti. La scelta si modifica dal pulsante “Preferenze cookie”.</p>
              </div>
            </div>

            <div className="bg-white/60 border border-charcoal/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-charcoal/5"><h3 className="font-bold">Memoria pubblicitaria facoltativa — solo con consenso</h3></div>
              {[
                  { nome: "lt_mp_i_* / lt_mp_r_*", scopo: "Ricevute firmate di misurazione acquisto, solo dopo consenso pubblicitario; non sono usate per autorizzare pagamenti", durata: "Intenzione: massimo 9 giorni; conferma: 10 minuti" },
                  { nome: "lt_meta_purchases_v1 / lt_meta_active_purchase", scopo: "Memoria pubblicitaria locale con identificativi pseudonimi per evitare duplicati e indicare l’acquisto corrente", durata: "Identificativi validi per 90 giorni, eliminati al successivo uso o alla revoca; indicatore nella sola sessione della scheda" },
              ].map(c => <div key={c.nome} className="px-5 py-4 grid grid-cols-3 gap-4 text-sm"><code className="break-all text-xs">{c.nome}</code><span>{c.scopo}</span><span className="text-xs">{c.durata}</span></div>)}
            </div>

            <div className="bg-white/60 border border-charcoal/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-charcoal/5 bg-charcoal/[0.02]">
                <p className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal">Cookie di terze parti</p>
              </div>
              <div className="divide-y divide-charcoal/5">
                {[
                  { nome: "Meta Pixel (ID 955909697258843)", scopo: "Misurazione pubblicitaria delle visite alle pagine pubbliche e degli acquisti pagati e accettati, solo dopo consenso. Cookie _fbp ed eventuale _fbc, durata gestita da Meta", durata: "Definita da Meta" },
                  { nome: "Stripe Checkout", scopo: "Pagamento e prevenzione frodi quando scegli di pagare con Stripe", durata: "Gestita da Stripe" },
                  { nome: "Google Maps", scopo: "Geocodifica indirizzi e calcolo distanze per la consegna", durata: "Variabile" },
                  { nome: "Google OAuth", scopo: "Autenticazione tramite account Google (solo se usato)", durata: "Sessione" },
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
                  Puoi revocare il consenso pubblicitario da “Preferenze cookie”: il sito interrompe gli invii successivi e rimuove i cookie Meta accessibili sul proprio dominio. La revoca non cancella automaticamente i dati già ricevuti da Meta o i cookie sui domini dei fornitori. Consulta le informative di <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="underline">Meta</a>, <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Stripe</a> e la{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">
                    Privacy Policy di Google
                  </a>{" "}
.
                </p>
              </div>
            </div>

            <p className="text-sm bg-marigold/10 border border-marigold/20 rounded-2xl px-5 py-4 text-charcoal/70">
              Il Pixel Meta non viene caricato prima del consenso o dopo il rifiuto. Non installiamo Google Analytics, Vercel Analytics o il widget chat Zirel. Per gli acquisti pagati e accettati inviamo soltanto importo finale in euro, valuta e un identificativo pseudonimo per evitare duplicati. Non inviamo dati CRM, contatti, indirizzi, note o dati carta a Meta. Meta riceve anche i dati tecnici della connessione, tra cui IP e browser: questi eventi non sono anonimi. Checkout, account, stato ordine e indirizzi con parametri o frammenti sono esclusi dal Pixel. L’evento acquisto parte da una pagina di conferma separata senza riferimenti personali nell’indirizzo; richiede il browser aperto. Un rimborso successivo non cancella automaticamente l’evento già inviato. La mappa del locale si apre su Google soltanto scegliendo il relativo collegamento. La ricerca indirizzo Google si apre su richiesta esplicita dopo la lettura dell’informativa; l’accesso con Google richiede anche la dichiarazione di maggiore età prevista per gli account. Non chiediamo il GPS del cliente. Il portale e il tracciamento rider sono esclusi dalla V1.
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
