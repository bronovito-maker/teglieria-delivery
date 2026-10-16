import Link from "next/link";
import type { Metadata } from "next";
import MobileTopBar from "@/components/client/MobileTopBar";

export const metadata: Metadata = {
  title: "Privacy Policy — La Teglieria",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679).",
};

export const dynamic = "force-dynamic";
export default function PrivacyPolicyPage() {
  const email=process.env.UNIFIED_PRIVACY_EMAIL || "renova@sicurezzapostale.it";
  const approved=process.env.UNIFIED_LEGAL_APPROVED === "1";
  const retention=process.env.UNIFIED_PRIVACY_RETENTION;
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
            Ultimo aggiornamento: <strong className="text-charcoal/60">15 ottobre 2026</strong>
          </p>
        </header>

        <div className="space-y-10 font-body text-charcoal/70 leading-relaxed">
          {!approved && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4">Informativa in verifica: il titolare deve confermare contatti, fornitori, trasferimenti e tempi di conservazione prima dell’apertura al pubblico.</p>}

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è <strong className="text-charcoal">RENOVA S.R.L. — La Teglieria, P.IVA 02096910498</strong>, con sede in Via Inghilterra 68, 57128 Livorno (LI), Italia. Per qualsiasi richiesta relativa ai tuoi dati personali puoi contattarci all&apos;indirizzo email <a href={`mailto:${email}`} className="text-terracotta underline underline-offset-2">{email}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">2. Dati raccolti</h2>
            <p>Raccogliamo i seguenti dati personali in funzione dei servizi offerti:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-charcoal">Dati di contatto</strong>: nome e numero di telefono necessari per l’ordine; email per l’account e le comunicazioni disponibili.</li>
              <li><strong className="text-charcoal">Dati di consegna</strong>: indirizzo di spedizione, note aggiuntive.</li>
              <li><strong className="text-charcoal">Dati di navigazione</strong>: dati tecnici strettamente necessari alla connessione e alla protezione del servizio. Non effettuiamo profilazione delle pagine visitate.</li>
              <li><strong className="text-charcoal">Dati dell&apos;account</strong>: in caso di registrazione, password protetta da hash Argon2id non reversibile, preferenze salvate (ultimo indirizzo, numero di telefono).</li>
              <li><strong className="text-charcoal">Feedback sul servizio</strong>: valutazioni e commenti inviati dopo un ordine, utilizzati per migliorare il servizio e produrre statistiche aggregate.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">3. Finalità e base giuridica</h2>
            <div className="space-y-4">
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Esecuzione del contratto (art. 6.1.b GDPR)</p>
                <p className="text-sm">Creazione dell’account richiesto, gestione degli ordini e comunicazioni operative. Registriamo versione dell’informativa, dichiarazione di maggiore età e data della richiesta. Gli obblighi fiscali e contabili si fondano sull’art. 6.1.c GDPR.</p>
              </div>
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Legittimo interesse (art. 6.1.f GDPR)</p>
                <p className="text-sm">Sicurezza della piattaforma, prevenzione delle frodi, miglioramento del servizio tramite analisi aggregate anonime.</p>
              </div>
              <div className="bg-white/60 border border-charcoal/5 rounded-2xl p-5 space-y-1">
                <p className="font-semibold text-charcoal text-sm">Consenso (art. 6.1.a GDPR)</p>
                <p className="text-sm">Newsletter, messaggi promozionali e profilazione CRM restano disattivati. Google Analytics 4 misura le statistiche delle pagine pubbliche e gli eventi commerciali soltanto dopo un consenso statistico separato dei maggiorenni. Riceve identificativi, nomi e categorie pubbliche di prodotto, prezzi, quantità, importi, eventuale costo di consegna distinto, valuta e un riferimento pseudonimo di acquisto, oltre ai dati tecnici di connessione (tra cui IP e browser). Non attiviamo Google Signals, Google Ads o invio di contatti. Il Pixel Meta misura le visite alle pagine pubbliche e gli acquisti pagati e accettati soltanto dopo un consenso pubblicitario separato, riservato ai maggiorenni e revocabile da “Preferenze cookie”. La registrazione e la presa visione di questa informativa non lo attivano e non autorizzano altri usi di marketing. Il feedback sul servizio è facoltativo e richiede un consenso specifico, revocabile contattandoci; il rifiuto non limita account o ordini.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">4. Conservazione dei dati</h2>
            <p>
              {retention || "I documenti contabili e fiscali sono conservati secondo gli obblighi applicabili. Il titolare deve definire i tempi distinti di conservazione per account, contatti, indirizzi, note e log prima dell’apertura al pubblico. La scadenza di sessioni e cookie non cancella automaticamente gli ordini."}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">5. Destinatari dei dati</h2>
            <p>I tuoi dati possono essere comunicati a:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Il sito utilizza il backend condiviso con il gestionale per account e ordini. Questa versione non trasferisce account o ordini a Supabase.</li>
              <li><strong className="text-charcoal">Meta</strong> — soltanto dopo consenso pubblicitario, riceve eventi di visita alle pagine pubbliche e di acquisto pagato e accettato, con importo finale, valuta, identificativo pseudonimo e dati tecnici della connessione (IP e browser). Non riceve dati CRM, contatti, indirizzi, note o dati carta da questa integrazione. Un rimborso successivo non rettifica automaticamente l’evento pubblicitario.</li>
              <li><strong className="text-charcoal">Vercel e collegamento Tailscale</strong> — il frontend è ospitato su Vercel e inoltra le richieste al server del gestionale attraverso il collegamento Tailscale. I fornitori possono trattare i dati tecnici necessari al servizio.</li>
              <li><strong className="text-charcoal">Stripe</strong> — gestione dei pagamenti online quando abilitati; i dati completi della carta vengono inseriti nel servizio di pagamento e non nel gestionale.</li>
              <li><strong className="text-charcoal">Google LLC</strong> — servizi di indirizzi e percorsi, ed eventuale accesso con Google. L’utilizzo comporta il trattamento dei dati necessari da parte di Google.</li>
              <li>Incaricati della consegna, limitatamente ai dati necessari. Il portale rider e il tracciamento della posizione dei fattorini sono disabilitati nella V1.</li>
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
              Per esercitare i tuoi diritti scrivi a <a href={`mailto:${email}`} className="text-terracotta underline underline-offset-2">{email}</a>. Risponderemo entro un mese; nei casi previsti dal GDPR comunicheremo entro tale termine le ragioni di un’eventuale proroga.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display text-charcoal">7. Minori</h2>
            <p>
              Gli ordini senza account non richiedono una dichiarazione di maggiore età. Anche per un cliente minorenne trattiamo i soli dati necessari alla prenotazione, alla preparazione e all’eventuale consegna e agli obblighi di legge: non possiamo eseguire un ordine senza trattarne alcun dato. Non utilizziamo questi dati per pubblicità o profilazione. Account e funzioni facoltative restano riservati ai maggiorenni per scelta del servizio. Non raccogliamo documenti o data di nascita e non certifichiamo l’età. Per informazioni o richieste relative ai dati di un minore, contatta il titolare.
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
