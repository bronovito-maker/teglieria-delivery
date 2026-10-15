export default function AdminConfigPage() {
  return (
    <div className="max-w-4xl p-8">
      <h1 className="text-4xl font-display text-charcoal mb-8">Capacità della cucina</h1>
      <div className="bg-white rounded-3xl p-8 space-y-4 text-charcoal">
        <p className="text-xl font-bold">Ogni fascia dura 30 minuti.</p>
        <p>8 teglie intere ordinarie e una nona solo su decisione esplicita della cassa: due mezze teglie occupano il posto di una teglia intera.</p>
        <p>Massimo 1 kg di torta di ceci. I fritti non hanno un limite di fascia, ma richiedono scorte disponibili. Le schiacciate sono precotte e non occupano il forno della fascia.</p>
        <p>Il sito e il gestionale condividono la stessa disponibilità. Il cliente vede solo le fasce che possono contenere tutto il suo carrello e trova già selezionata la prima disponibile.</p>
        <p>Tutti gli ordini del sito, anche in contanti, attendono la cassa. Accetta li invia in cucina. Sposta orario permette di spostare un ordine in attesa o già approvato: se era in attesa, lo conferma anche. Il cliente vede il nuovo orario sul sito.</p>
      </div>
    </div>
  );
}
