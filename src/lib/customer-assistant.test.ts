import { describe, expect, it } from 'vitest';
import { answerCustomer, ASSISTANT_TOPICS } from './customer-assistant';
describe('assistente informativo interno', () => {
  it('usa il fisso confermato e richiede un click per chiamare', () => {
    const reply = answerCustomer('Voglio parlare con un operatore');
    expect(reply.link?.href).toBe('tel:+390586082992');
    expect(reply.text).toContain('0586 082992');
  });
  it('spiega persone e gusti e propone porzioni indicative', () => {
    const reply = answerCustomer('Siamo 6 persone: mezza o intera?');
    for (const text of ['2 persone', '2 gusti', '4 persone', '4 gusti', '1 teglia intera e 1 mezza teglia']) expect(reply.text).toContain(text);
  });
  it('mantiene contanti senza scadenza, carta 15 minuti e annullamento 30 minuti', () => {
    const text = answerCustomer('Pagamenti e annullamenti').text;
    for (const value of ['15 minuti', '30 minuti', 'contanti non hanno questa scadenza', 'rimborso integrale automatico']) expect(text).toContain(value);
  });
  it('limita Club a delivery, mezze e intere', () => {
    const text = answerCustomer('Sconto Club').text;
    expect(text).toContain('soltanto agli ordini delivery');
    expect(text).toContain('mezze teglie e teglie intere');
    expect(text).toContain('al banco non si applica');
  });
  it('non crea ordini e non dichiara una prenotazione confermata', () => {
    expect(answerCustomer('Ordina per me').text).toContain('Nessun ordine viene creato');
    expect(answerCustomer('Come prenoto?').text).toContain('dopo l’accettazione del gestionale');
  });
  it('non inventa informazioni né garanzie sugli allergeni', () => {
    expect(answerCustomer('Qual è il codice della cassaforte?').text).toContain('Non ho un’informazione verificata');
    expect(answerCustomer('Sono celiaco').link?.href).toBe('/allergeni');
    expect(answerCustomer('Posso prenotare tranci?').text).toContain('soltanto in loco');
  });
  it('tutti i suggerimenti hanno una risposta configurata', () => {
    for (const topic of ASSISTANT_TOPICS) expect(answerCustomer(topic).text).not.toContain('Non ho un’informazione verificata');
  });
});
