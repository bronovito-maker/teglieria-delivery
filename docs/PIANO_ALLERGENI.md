# Piano allergeni - specifica 08/09/2026

## Obiettivo e architettura
Registro centrale versionato in PostgreSQL: master 1-14, ingredienti e semilavorati con riferimenti di ricetta, associazioni ai prodotti tramite ID. Il documento JSON del registro viene validato integralmente e aggiornato atomicamente con audit e controllo della versione. Menu, configuratore e ordini utilizzano lo stesso motore ricorsivo; nessun elenco allergeni per pizza nel frontend. Letture live senza cache applicativa.

## Sequenza di esecuzione
1. P0: modello persistente, migrazione additiva, calcolo ricorsivo e validazione di cicli/riferimenti/stati.
2. P0: importazione iniziale idempotente dal catalogo; conservare i dati già verificati. Nessuna deduzione da etichetta assente.
3. P1: badge accessibili, ingredienti, configuratore per gusto/totale, carrello e checkout.
4. P1: /allergeni con catalogo attivo, versione, avvertenza e stampa A4.
5. P1: admin con fonti, motivazione, dipendenze, audit e aggiornamento atomico.
6. P2: snapshot server autorevole negli ordini.
7. Collaudo: T01-T15, typecheck, lint, build e verifiche browser mobile/desktop e stampa.

## Decisioni sui dati
- La Carbonara include uova secondo la specifica, pur assenti nella descrizione corrente: mantenere avviso di verifica della ricetta.
- Ingredienti sconosciuti, nuove aggiunte/varianti e prodotti non mappati risultano TO_VERIFY.
- Birre: glutine noto, verifica etichetta ancora pendente; mai dichiararle confermate automaticamente.
- Tonno non presente nel listino configuratore corrente: il motore lo supporta; prezzo/attivazione richiedono un dato commerciale.
- Le verifiche delle etichette e la contaminazione crociata richiedono il personale del locale.

## Attivazione
Applicare la migrazione e poi `npm run allergens:seed`. L'importazione usa il catalogo del database e non modifica prezzi o disponibilità. Prima della pubblicazione definitiva risolvere le voci TO_VERIFY con documentazione reale. Eseguire collaudo staging e produzione dopo rilascio.

## Esito
Implementazione P0/P1/P2 completata nel workspace il 10/09/2026.

- Migrazione `20260910120000_allergen_registry` applicata al database Supabase configurato, dopo avere verificato che fosse l'unica pendente.
- Importazione v1 eseguita: 64 prodotti associati, 95 componenti, 63 prodotti pubblicati. La seconda importazione non ha creato revisioni aggiuntive.
- 51 prodotti pubblicati non configurabili hanno almeno una verifica incompleta. Nessuna etichetta è stata attestata automaticamente.
- Verifiche automatiche: 75 test unitari/API superati; TypeScript e build Next.js superati; lint senza errori (un warning preesistente sul pixel Facebook). Tre test Playwright superati con desktop 1280 px e mobile 390 px, incluso carrello e checkout.
- Verifica visuale: configuratore, menu e carrello mobile; stampa Chromium A4 in 8 pagine, senza navigazione e con legenda completa.
- Sistemati nel riepilogo anche JSON grezzo della configurazione e falso risparmio Club sugli extra.
- Il sito pubblico non è stato distribuito: il codice è nel workspace e il database è già predisposto.

| Test | Copertura / esito |
| --- | --- |
| T01-T05 | Test del dataset, unione e semilavorato Torta di Ceci superati. |
| T06-T08 | Basi, aggiunta/rimozione tonno, 4 gusti e deduplicazione verificati nel motore; configuratore browser verificato con salmone e pistacchio. |
| T09 | Propagazione dipendenze nel motore; salvataggio API con audit, autorizzazione, fonti e conflitto versione testato con database simulato. |
| T10 | Stato incompleto propagato e visibile nel registro/stampa; fonte obbligatoria per confermare. |
| T11-T12 | API collegata al database; 14 righe di legenda, catalogo pubblicato, ricaricamento prima della stampa, formato A4. |
| T13 | Badge con nome completo, link e focus tastiera; nomi testuali anche dentro i pulsanti ingrediente. |
| T14 | Allergeni per gusto/totale persistiti nel carrello e visibili nel checkout; snapshot immutabile del motore testato, salvataggio backend implementato nella transazione ordine. |
| T15 | Birra inizialmente [1] con verifica incompleta; transizione a confermato testata con etichetta simulata. |

## Attività operative prima del rilascio definitivo

1. Acquisire e validare etichette/schede reali in `/admin/allergeni`, confermare la ricetta Carbonara e completare le ricette delle schiacciatine oltre ai componenti allergenici noti.
2. Confermare la gestione della contaminazione crociata e delle fritture con il locale. Per rendere il tonno selezionabile nel configuratore manca il prezzo nel listino corrente.
3. Distribuire il codice, eseguire T01-T15 sull'ambiente pubblicato con credenziali operative e un ordine controllato. Non sono stati creati ordini commerciali di prova né alterati gli allergeni reali per simulare una verifica.

## Dettagli di manutenzione

- Il registro JSON è un'unità transazionale: riferimenti, cicli, numerazione e stati sono validati lato server. Il confronto di versione previene sovrascritture concorrenti.
- L'audit conserva l'intero prima/dopo; il frontend admin elenca le ultime 30 revisioni.
- Le fonti e gli identificativi dei verificatori vengono rimossi dal payload pubblico.
- Le letture sono live: una modifica admin viene propagata alle successive letture del menu/registro. Un carrello aperto mantiene la versione mostrata; il backend ricalcola la versione corrente al momento dell'ordine.
- Varianti/rimozioni non mappabili mantengono gli allergeni noti e aggiungono un avviso, senza dichiarare assenza.
- Il registro non contiene prezzi e non modifica il catalogo commerciale. La disattivazione del Fritto Teglieria è preservata.
