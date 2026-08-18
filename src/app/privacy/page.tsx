import Link from "next/link";
import type { Metadata } from "next";
import MobileTopBar from "@/components/client/MobileTopBar";

export const metadata: Metadata = {
  title: "Privacy Policy — La Teglieria",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679).",
};

export default function PrivacyPolicyPage() {
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
            Privacy <span className="text-terracotta">Policy</span>
          </h1>
          <p className="text-sm text-charcoal/40 font-body">
            Ultimo aggiornamento: <strong className="text-charcoal/60">Aprile 2026</strong>
          </p>
        </header>

        <div className="space-y-10 font-body text-charcoal/70 leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è <strong className="text-charcoal">La Teglieria</strong>, con sede in Via Inghilterra 68, 57128 Livorno (LI), Italia. Per qualsiasi richiesta relativa ai tuoi dati personali puoi contattarci all&apos;indirizzo email <a href="mailto:ordini@lateglieria.it" className="text-terracotta underline underline-offset-2">ordini@lateglieria.it</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">2. Dati raccolti</h2>
            <p>Raccogliamo i seguenti dati personali in funzione dei servizi offerti:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-charcoal">Dati di contatto</strong>: nome, cognome, numero di telefono, indirizzo email (facoltativi per l&apos;ordine guest).</li>
              <li><strong className="text-charcoal">Dati di consegna</strong>: indirizzo di spedizione, note aggiuntive.</li>
              <li><strong className="text-charcoal">Dati di navigazione</strong>: indirizzo IP, tipo di browser, pagine visitate, raccolti automaticamente attraverso i log del server.</li>
              <li><strong className="text-charcoal">Dati dell&apos;account</strong>: in caso di registrazione, password in forma cifrata, preferenze salvate (ultimo indirizzo, numero di telefono).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">3. Finalità e base giuridica</h2>
            <div className="space-y-4">
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Esecuzione del contratto (art. 6.1.b GDPR)</p>
                <p className="text-sm">Gestione degli ordini, notifiche di stato (es. rider in partenza), comunicazioni operative.</p>
              </div>
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Legittimo interesse (art. 6.1.f GDPR)</p>
                <p className="text-sm">Sicurezza della piattaforma, prevenzione delle frodi, miglioramento del servizio tramite analisi aggregate anonime.</p>
              </div>
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Consenso (art. 6.1.a GDPR)</p>
                <p className="text-sm">Comunicazioni promozionali e newsletter, solo se esplicitamente accettate dall&apos;utente.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">4. Conservazione dei dati</h2>
            <p>
              I dati relativi agli ordini sono conservati per <strong className="text-charcoal">10 anni</strong> ai fini contabili e fiscali obbligatori per legge. I dati dell&apos;account sono conservati fino alla cancellazione dello stesso. I dati di navigazione sono conservati per un massimo di <strong className="text-charcoal">12 mesi</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">5. Destinatari dei dati</h2>
            <p>I tuoi dati possono essere comunicati a:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-charcoal">Supabase Inc.</strong> — fornitore di database e autenticazione (USA, con garanzie adeguate ex art. 46 GDPR).</li>
              <li><strong className="text-charcoal">Brevo SAS</strong> — fornitore di email transazionali (Francia, UE).</li>
              <li><strong className="text-charcoal">Google LLC</strong> — Google Maps API per geocodifica degli indirizzi (USA, con garanzie adeguate).</li>
              <li>Fattorini incaricati (<em>riders</em>), esclusivamente per le informazioni necessarie alla consegna.</li>
            </ul>
            <p>I dati non vengono venduti né ceduti a terzi per finalità di marketing.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">6. Diritti dell&apos;interessato</h2>
            <p>Ai sensi degli artt. 15–22 del GDPR hai diritto di:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Accedere ai tuoi dati personali;</li>
              <li>Richiederne la rettifica o la cancellazione;</li>
              <li>Opporti al trattamento o richiederne la limitazione;</li>
              <li>Richiedere la portabilità dei dati;</li>
              <li>Revocare il consenso in qualsiasi momento senza pregiudizio per la liceità del trattamento precedente;</li>
              <li>Proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">www.garanteprivacy.it</a>).</li>
            </ul>
            <p>
              Per esercitare i tuoi diritti scrivi a <a href="mailto:ordini@lateglieria.it" className="text-terracotta underline underline-offset-2">ordini@lateglieria.it</a>. Risponderemo entro 30 giorni.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">7. Minori</h2>
            <p>
              Il servizio non è destinato a minori di 16 anni. Non raccogliamo consapevolmente dati di minori. Se ritieni che siano stati raccolti dati di un minore, contattaci immediatamente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">8. Modifiche</h2>
            <p>
              Ci riserviamo il diritto di aggiornare questa informativa. In caso di modifiche sostanziali, ne daremo comunicazione tramite email o avviso in app. La versione più aggiornata è sempre disponibile a questa pagina.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-charcoal/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-charcoal/30 font-body">© {new Date().getFullYear()} La Teglieria · Via Inghilterra 68, Livorno</p>
          <Link href="/cookie-policy" className="text-xs font-brand font-bold uppercase tracking-widest text-charcoal/40 hover:text-terracotta transition-colors">
            Cookie Policy →
          </Link>
        </div>

      </div>
    </main>
  );
}
