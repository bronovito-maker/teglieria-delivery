export type AssistantReply = { text: string; link?: { href: string; label: string } };
export const ASSISTANT_PHONE = '0586 082992';
export const ASSISTANT_TOPICS = ['Come funziona?', 'Mezza teglia o intera?', 'Come prenoto?', 'Pagamenti e annullamenti', 'Sconto Club', 'Voglio parlare con un operatore'];
const menu = { href: '/menu', label: 'Apri il menu aggiornato' };
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');

/** Owner-approved information only. No model, network call, tracking or order mutation. */
export function answerCustomer(question: string): AssistantReply {
  const q = normalize(question.slice(0, 600));
  if (/operatore|telefon|chiam|numero fisso|parlare con|persona vera|umano/.test(q)) return {
    text: `Certo! Per parlare con noi chiama lo ${ASSISTANT_PHONE}. La chiamata si apre solo se premi il pulsante.`,
    link: { href: 'tel:+390586082992', label: `Chiama ${ASSISTANT_PHONE}` },
  };
  if (/allerg|celiac|glutine|intoller|gravid/.test(q)) return {
    text: 'Consulta gli allergeni indicati sul menu e confrontati con noi per esigenze specifiche o possibili contaminazioni. Le variazioni degli ingredienti possono cambiare gli allergeni: scrivi «voglio parlare con un operatore» per avere il numero del locale.',
    link: { href: '/allergeni', label: 'Consulta gli allergeni' },
  };
  if (/ordina per me|ordini per me|fai (tu )?(il|un) ordine|componi|ordino (qui|in chat)|prenota per me/.test(q)) return {
    text: 'Per ora ti aiuto a scegliere e ti spiego i passaggi. Per inserire e confermare l’ordine apri il menu: scegli ritiro o delivery, prodotti e fascia oraria, poi controlla il riepilogo e il pagamento. Nessun ordine viene creato da questa chat.', link: menu,
  };
  const parts: string[] = [];
  const number = q.match(/\b(\d{1,2})\s*(persone|adulti|amici|ospiti)\b/)?.[1];
  const wordNumber: Record<string, number> = { due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8 };
  const word = q.match(/\b(due|tre|quattro|cinque|sei|sette|otto)\s*(persone|adulti|amici|ospiti)\b/)?.[1];
  const people = number ? Number(number) : word ? wordNumber[word] : undefined;
  if (/mezz|intera|intere|gust[oi]|porzion|persone|quanto.*mang|siamo/.test(q)) {
    parts.push('La mezza teglia è indicata per 2 persone e puoi scegliere fino a 2 gusti. La teglia intera è indicata per 4 persone e puoi scegliere fino a 4 gusti. Sono porzioni indicative: dipende anche dall’appetito.');
    if (people && people > 0 && people <= 30) {
      const halves = Math.ceil(people / 2), full = Math.floor(halves / 2), half = halves % 2;
      parts.push(`Per ${people} persone puoi orientarti su ${[full ? `${full} ${full === 1 ? 'teglia intera' : 'teglie intere'}` : '', half ? '1 mezza teglia' : ''].filter(Boolean).join(' e ')}. La disponibilità effettiva si verifica durante la prenotazione.`);
    }
  }
  if (/tranc/.test(q)) parts.push('I tranci si acquistano soltanto in loco, in base alla disponibilità del momento. Sul sito puoi prenotare mezze teglie e teglie intere.');
  if (/club|premium|scont/.test(q)) parts.push('Di norma i prezzi Club si applicano ai membri riconosciuti dal sito, soltanto agli ordini delivery e soltanto su mezze teglie e teglie intere. Dal 28 ottobre al 1 novembre 2026 compreso valgono anche per asporto prenotato dal sito nello stesso periodo. La Pizza Zucca ha già il prezzo dedicato e non riceve ulteriori sconti. Per acquisti al banco non si applica lo sconto Club. Controlla sempre il totale nel riepilogo.');
  if (/paga|contant|carta|stripe|rimbor|annull|cancell|minut/.test(q)) parts.push('Puoi scegliere i contanti oppure la carta, quando il pagamento online è abilitato. Con carta hai 15 minuti per completare il pagamento; allo scadere si libera la prenotazione. Gli ordini in contanti non hanno questa scadenza. Puoi annullare dal sito fino a 30 minuti prima dell’orario prenotato: se hai già pagato, viene richiesto il rimborso integrale automatico. L’accredito dipende dai tempi del gestore del pagamento.');
  if (/prenot|fasci|slot|orario|spost|accett|conferm|stato|ordine/.test(q)) parts.push('Scegli ritiro o delivery, i prodotti e una fascia di 30 minuti. Il sito controlla disponibilità e capacità della cucina; se una fascia è piena propone la prima disponibile. La nona teglia richiede una decisione della cassa. La prenotazione è definitiva dopo l’accettazione del gestionale: segui lo stato sul sito. Se il locale sposta o annulla l’ordine, lo vedrai nella pagina dell’ordine.');
  if (/ceci|torta/.test(q)) parts.push('La torta di ceci si prenota in base alla quantità cotta disponibile, fino a 1 kg per fascia di 30 minuti.');
  if (/fritt|schiacciat/.test(q)) parts.push('Le schiacciate dipendono dalla scorta già preparata. I fritti non hanno il limite delle teglie per fascia; rimane necessaria la disponibilità effettiva dei prodotti.');
  if (/consegn|delivery|domicilio|ritiro|asporto|zona|indirizzo/.test(q)) parts.push('Puoi scegliere il ritiro al locale oppure il delivery, quando disponibile. Per la consegna inserisci l’indirizzo: il sito verifica la zona e mostra il costo prima della conferma. Le fasce effettivamente prenotabili sono quelle proposte nel checkout.');
  if (/prezz|costa|costano|menu|ingredient|burrata|mozzarella|veg/.test(q)) parts.push('Trovi prezzi, ingredienti e disponibilità aggiornati nel menu. La Burrata ha base rossa senza mozzarella. Per variazioni e allergeni controlla sempre la scheda del prodotto e il riepilogo.');
  if (/apert|chius|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica/.test(q)) parts.push('Controlla gli orari pubblicati sul sito e le fasce proposte al momento della prenotazione: chiusure e disponibilità possono cambiare. Per un’esigenza particolare puoi scrivere «voglio parlare con un operatore».');
  if (/account|registr|password|accesso/.test(q)) parts.push('Puoi procedere come ospite oppure creare un nuovo account dal sito. Per usare i vantaggi Club accedi con l’account membro. Se hai problemi di accesso scrivi «voglio parlare con un operatore».');
  if (/privacy|dati|conversaz|salv|tracci/.test(q)) return { text: 'Questa assistenza funziona sul tuo dispositivo: il testo della chat non viene inviato a servizi esterni né salvato da questo assistente. Evita di scrivere dati di pagamento. Per i dati usati negli ordini consulta l’informativa.', link: { href: '/privacy', label: 'Leggi l’informativa privacy' } };
  if (/come funziona|aiuto|ciao|buongiorno|buonasera|salve/.test(q) && !parts.length) parts.push('Ciao! Ti aiuto con formati, gusti, prenotazioni, consegna, pagamenti e Club. La mezza teglia è per circa 2 persone con fino a 2 gusti; l’intera per circa 4 persone con fino a 4 gusti. Scegli dal menu e attendi la conferma della cassa. Se vuoi chiamarci scrivi «voglio parlare con un operatore».');
  return parts.length ? { text: parts.join('\n\n'), link: menu } : {
    text: 'Non ho un’informazione verificata per questa domanda. Puoi chiedermi di formati, gusti, prenotazioni, pagamenti, Club o consegne. Se vuoi parlare con noi scrivi «voglio parlare con un operatore».',
  };
}
