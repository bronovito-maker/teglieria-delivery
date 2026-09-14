# La Teglieria — Documentazione progetto

Piattaforma web di **La Teglieria** per menu digitale, ordini online, pagamenti,
gestione operativa, logistica rider e area cliente.

Ultima verifica della documentazione: **3 settembre 2026**.

## Obiettivo

Il progetto copre l’intero ciclo dell’ordine:

- scelta tra asporto e delivery;
- menu con prodotti, varianti, aggiunte e rimozioni;
- prezzi standard, prezzi Club e promozioni Club;
- configuratore “Crea la tua pizza”;
- checkout con contanti o Stripe Checkout;
- conferma, preparazione, consegna e tracking;
- gestione admin, rider, report e feedback cliente;
- PWA installabile e interfaccia responsive, inclusi i popup mobile.

## Stack attuale

- **Framework:** Next.js 16 App Router;
- **Linguaggio:** TypeScript;
- **UI:** React 19, Tailwind CSS, CSS globale;
- **Stato client:** Zustand;
- **Database:** PostgreSQL tramite Supabase;
- **ORM:** Prisma 5;
- **Autenticazione:** Supabase Auth con sessione SSR e client browser;
- **Login cliente:** email/password e Google OAuth. Apple è supportato come
  autofill/password manager, non come provider OAuth configurato;
- **Email transazionali:** Brevo;
- **Pagamenti:** Stripe Checkout e webhook firmati;
- **Mappe e indirizzi:** Google Maps / Places;
- **Deploy:** Vercel;
- **PWA:** manifest e service worker.

## Funzionalità cliente

### Route pubbliche

| Percorso | Funzione |
|---|---|
| `/` | Landing page |
| `/menu` | Menu e categorie |
| `/ordine` | Checkout |
| `/stato-ordine/[id]` | Tracking dell’ordine |
| `/accedi` | Accesso cliente |
| `/registrati` | Registrazione cliente |
| `/account/orders` | Ordini attivi e storico dell’utente |
| `/servizi` | Informazioni su delivery e asporto |
| `/feedback/[token]` | Raccolta feedback post-consegna |
| `/privacy` | Privacy policy |
| `/cookie-policy` | Cookie policy |
| `/offline` | Fallback PWA offline |

La vecchia route `/preshop` è stata rimossa e non fa più parte del flusso.

### Menu e catalogo

Le categorie sincronizzate dal catalogo sono:

1. Crea la tua pizza;
2. Teglie;
3. Mezze teglie;
4. Tranci;
5. Schiacciatine;
6. Torta di ceci e 5e5;
7. Fritti;
8. Bevande analcoliche;
9. Birre.

Il prodotto combinato **Fritto Teglieria** è disattivato e non deve tornare
visibile dopo una sincronizzazione del catalogo. Restano disponibili, se attivi,
i singoli prodotti della categoria Fritti.

### Prezzi Club

La regola è server-side e vale per i clienti autenticati:

- un visitatore non autenticato riceve dall’API il prezzo normale in `price` e,
  quando presente, il prezzo riservato in `clubPrice`;
- un cliente autenticato riceve già il prezzo Club in `price`, mentre
  `standardPrice` conserva il prezzo normale;
- `isClubPrice` segnala quando il prezzo visualizzato è quello Club;
- le promozioni Club attive vengono restituite solo agli utenti Club;
- rider e operatori non vengono trattati come clienti Club.

Nel menu pubblico, per gli utenti non autenticati, il prezzo Club viene mostrato
sotto al prezzo standard con l’invito alla registrazione. Il prezzo inviato dal
browser non è mai considerato autorevole in fase di creazione dell’ordine.

### Configuratore “Crea la tua pizza”

Il configuratore consente di comporre ogni gusto separatamente:

- **teglia intera 60×40 cm:** da 1 a 4 gusti;
- **mezza teglia 30×40 cm:** da 1 a 2 gusti;
- per ogni gusto si può scegliere una ricetta già presente nel menu oppure
  partire da zero;
- dopo la scelta della ricetta si possono aggiungere ingredienti extra a
  pagamento;
- gli ingredienti della ricetta selezionata vengono conteggiati una sola volta
  se vengono selezionati di nuovo come extra;
- la vecchia sezione degli ingredienti “senza costi aggiuntivi” è stata rimossa;
- la configurazione e il relativo totale vengono ricalcolati e validati anche
  dall’API prima di salvare l’ordine.

Le ricette utilizzabili dal configuratore sono quelle attive nelle categorie
**Teglie** e **Mezze teglie**: La Regina, La Partenopea, La Contadina, La Diavola,
L’Ortolana, La Pistacchio, La Nordica, La Parma, La Burrata e La Carbonara.

I popup prodotto, carrello e configuratore usano un layout flex con altezza
dinamica del viewport, scroll interno e footer separato. Su mobile il pulsante
principale resta leggibile e non viene coperto dalla top bar o dal contenuto.

## Regole commerciali e operative

- **Minimo ordine:** €12 di imponibile, escluso il costo di consegna;
- **asporto:** disponibile dalle 16:00;
- **delivery:** disponibile dalle 19:00 alle 22:00;
- **costo delivery:** €2 entro il primo chilometro; oltre il primo km viene
  aggiunto €0,33/km, arrotondato per eccesso al decimo di euro;
- per un ordine delivery l’indirizzo è obbligatorio;
- per gli ordini Web il costo delivery viene sempre ricalcolato dal server in
  base a `deliveryKm`;
- il canale pubblico viene forzato a `WEB` e non può dichiarare un pagamento POS;
- la chiave `Idempotency-Key` evita la duplicazione dell’ordine in caso di retry;
- prodotti e categorie non attivi vengono rifiutati anche se presenti in un
  carrello obsoleto;
- le transizioni di stato differiscono per tipo: l’asporto non passa da `OUT`,
  il delivery sì.

### Stati ordine

| Stato | Significato |
|---|---|
| `RECEIVED` | Ordine ricevuto |
| `CONFIRMED` | Ordine accettato dallo staff |
| `PREPARING` | In preparazione, se usato dal flusso operativo |
| `READY` | Pronto |
| `OUT` | In uscita con il rider; solo delivery |
| `DELIVERED` | Consegnato o ritirato |
| `CANCELLED` | Annullato |

Stati pagamento: `PENDING`, `PAID`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED`.

## Autenticazione e sessioni

### Login cliente

Il form cliente usa `name`, `id` e gli attributi autocomplete standard
(`username` e `current-password`) per funzionare con Apple Passwords e Google
Password Manager anche quando il browser compila i campi senza attivare gli
handler React.

Il submit segue questo flusso:

1. legge i valori reali dal `FormData` del form;
2. invia le credenziali a `POST /api/auth/password`;
3. il server esegue `signInWithPassword` e imposta i cookie SSR;
4. il client verifica la sessione e, se il browser mobile non l’ha ancora
   rilevata, sincronizza con `signInWithPassword` lato browser;
5. esegue una navigazione completa verso il percorso interno richiesto, di
   default `/menu`.

Il middleware/proxy aggiorna la sessione Supabase sulle pagine cliente e sulle
API, evitando che il browser risulti loggato mentre il server lo vede come guest.

### Google OAuth

Il provider configurato è Google. Il callback è:

```text
/api/auth/callback?type=customer&next=/menu
```

Il callback:

- scambia il codice OAuth per una sessione;
- usa il tipo di flusso e i ruoli server-side per determinare il percorso cliente;
- collega all’account gli ordini guest precedenti con la stessa email;
- accetta solo un percorso `next` interno e sicuro;
- porta il cliente al percorso richiesto o, in assenza di esso, a `/menu`.

Apple non è un provider OAuth attivo nel progetto. Il prefisso Apple nella
documentazione del login indica esclusivamente il supporto al riempimento
automatico delle credenziali.

### Ruoli e accessi

I ruoli autorizzativi arrivano esclusivamente da `app_metadata.role`, assegnato
server-side, oppure dalle allowlist email server-side. `user_metadata` è trattato
come dato fornito dall’utente e non concede privilegi.

- `customer`: ordini personali e prezzi Club;
- `operator`: pannello operativo;
- `admin`: accesso operativo completo;
- `rider`: dashboard e ordini assegnati.

L’accesso admin/operator è sempre fail-closed: senza ruolo server-side o email
presente nelle rispettive allowlist l’accesso viene negato. L’accesso rider resta
separato e richiede un profilo pre-approvato associato all’utente autenticato.

## Pagamenti Stripe

### Flusso corretto

Per un ordine con `paymentMethod: "STRIPE"`:

1. `POST /api/ordini` salva l’ordine in stato pagamento `PENDING`;
2. il server crea una Stripe Checkout Session con totale, valuta e `orderId`;
3. il cliente viene portato su Stripe;
4. solo il webhook firmato valuta gli eventi Stripe;
5. il server verifica `orderId`, importo atteso e valuta `eur`;
6. l’ordine passa a `PAID` in modo idempotente;
7. solo dopo `PAID` viene inviata al cliente l’email “Pagamento ricevuto”.

Il redirect di successo del browser non è una prova di pagamento.

### Pagamento rifiutato e retry

Gli eventi `payment_intent.payment_failed`,
`checkout.session.async_payment_failed` e `checkout.session.expired` portano un
ordine `PENDING` a `FAILED` una sola volta e inviano l’email di pagamento non
riuscito. Quando disponibile, l’email contiene il link per riavviare il
pagamento tramite `POST /api/ordini/[id]/checkout`.

Il retry è autorizzato dal token di tracking oppure dall’account/email del
cliente e crea una nuova Checkout Session. Un ordine già `PAID` o `REFUNDED` non
può essere riavviato.

### Webhook e rimborsi

Endpoint:

```text
POST /api/stripe/webhook
```

Eventi gestiti:

- `checkout.session.completed`;
- `checkout.session.async_payment_succeeded`;
- `checkout.session.async_payment_failed`;
- `checkout.session.expired`;
- `payment_intent.succeeded`;
- `payment_intent.payment_failed`;
- `charge.refunded`.

I rimborsi totali e parziali aggiornano `paymentStatus`, `refundedAmountCents` e
la tabella `PaymentRefund`. Le operazioni dal back-office usano una chiave di
idempotenza per evitare duplicazioni.

## Email transazionali

Le email vengono inviate da Brevo usando `ordini@lateglieria.it`.

| Evento | Funzione |
|---|---|
| Ordine non Stripe ricevuto | `sendOrderConfirmationEmail` |
| Pagamento Stripe confermato | `sendOrderConfirmationEmail` con `paymentConfirmed` |
| Pagamento Stripe fallito/scaduto | `sendOrderPaymentFailedEmail` |
| Ordine confermato dallo staff | `sendOrderConfirmedEmail` |
| Stato `OUT` | `sendRiderDepartedEmail` |
| Nuovo rider | `sendRiderWelcomeEmail` |
| Registrazione cliente | `sendCustomerWelcomeEmail` |
| Richiesta feedback post-consegna | `sendFeedbackRequestEmail` |

Per gli ordini Stripe non viene inviata una conferma prima dell’esito reale del
pagamento. Se `BREVO_API_KEY` manca, l’invio viene saltato e registrato nei log.

## Area admin e rider

### Admin

| Percorso | Funzione |
|---|---|
| `/admin/dashboard` | KPI e ordini operativi |
| `/admin/ordini` | Kanban e lista ordini |
| `/admin/ordini/nuovo` | Ordine inserito dallo staff |
| `/admin/ordini/[id]` | Dettaglio, stato, stampa e rimborso |
| `/admin/prodotti` | Catalogo prodotti |
| `/admin/categorie` | Categorie |
| `/admin/promo-club` | Promozioni Club |
| `/admin/orari` | Orari e chiusure |
| `/admin/config` | Configurazione operativa |
| `/admin/logistica` | Rider, fasce e mappa |
| `/admin/report` | Report vendite e marginalità delivery |

### Rider

| Percorso | Funzione |
|---|---|
| `/rider/login` | Accesso rider |
| `/rider/register` | Registrazione rider invitato |
| `/rider/dashboard` | Lista ordini assegnati |
| `/rider/ordine/[id]` | Dettaglio e aggiornamento consegna |

Il rider lavora con gli stati delivery `ASSIGNED`, `PICKED_UP`, `EN_ROUTE` e
`DELIVERED`. La logistica include assegnazione, suggerimento rider, timer,
soglie SLA, geolocalizzazione, mappa e navigazione.

## API principali

| Metodo e route | Accesso | Uso |
|---|---|---|
| `GET /api/menu` | Pubblico con sessione opzionale | Catalogo, prezzi e promozioni Club |
| `POST /api/ordini` | Pubblico same-origin | Crea ordine e Checkout Stripe opzionale |
| `GET /api/ordini` | Admin/operator | Lista ordini e conteggi operativi |
| `POST /api/ordini/[id]/checkout` | Token/account | Retry pagamento Stripe |
| `POST /api/stripe/webhook` | Stripe signature | Aggiorna pagamenti e rimborsi |
| `GET /api/user/orders` | Cliente autenticato | Storico ordini personali |
| `GET/POST /api/feedback/[token]` | Token feedback | Legge e salva feedback |
| `GET /api/cron/feedback` | Bearer `CRON_SECRET` | Invia richieste feedback pianificate |
| `GET /api/cron/order-emails` | Bearer `CRON_SECRET` | Ritenta le e-mail di annullamento presenti nell’outbox |
| `GET/POST /api/admin/orari` | Admin/operator | Orari operativi |
| `GET/POST /api/admin/config` | Admin/operator | Configurazione globale |

Le route CRUD di prodotti, categorie, rider, promozioni e report seguono lo
stesso controllo RBAC. Le richieste state-changing pubbliche applicano il
controllo same-origin e il rate limit dove previsto.

## Database

Modelli principali:

- `Category`, `Product`, `ProductVariant`, `ProductAddition`, `ProductRemoval`:
  catalogo e configurazioni;
- `ClubPromotion`, `ClubPromotionItem`, `ClubCard`: programma Club;
- `Order`, `OrderItem`, `OrderStatusLog`: ordine e storico stati;
- `PaymentRefund`: rimborsi Stripe;
- `GlobalConfig`, `DaySchedule`, `ClosedDate`, `DeliveryZone`: configurazione
  operativa;
- `Rider`: profili rider e assegnazioni;
- `FeedbackRequest`, `OrderFeedback`: raccolta valutazioni.

Per i dettagli completi usare [`prisma/schema.prisma`](prisma/schema.prisma) e
le migrazioni in [`prisma/migrations`](prisma/migrations).

## Setup locale

Prerequisiti: Node.js compatibile con Next.js 16, npm, PostgreSQL/Supabase e,
per i flussi dedicati, Stripe CLI.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Per un database nuovo e vuoto si può usare:

```bash
npm run seed
```

`seed` inizializza i dati base e il catalogo canonico, ma rifiuta per sicurezza
un database che contiene già dati. Sui database esistenti va usato soltanto il
flusso catalogo: prima l'anteprima, poi l'applicazione esplicita.

```bash
npm run sync-catalog
npm run sync-catalog:apply
```

`sync-catalog` è sempre un dry-run e non modifica il database. Mostra creazioni,
aggiornamenti, disattivazioni e prodotti aggiunti dall'Admin che verranno
preservati. `sync-catalog:apply` richiede i conteggi attesi di 9 categorie e 63
prodotti, applica tutto in una transazione e verifica che non restino differenze.
Entrambi i comandi mantengono disattivato il prodotto `Fritto Teglieria`.

## Comandi utili

```bash
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

I test unitari coprono regole di orario, sicurezza delle richieste, validazione
catalogo/ordini, Stripe e configuratore pizza. I test E2E coprono autenticazione,
ordini e pagamenti Stripe quando configurati.

Per eseguire il test Stripe locale:

```bash
set -a; source .env; set +a
stripe listen --api-key "$STRIPE_SECRET_KEY" \
  --forward-to localhost:3000/api/stripe/webhook
```

Impostare il `whsec_...` restituito dal listener in
`STRIPE_TEST_WEBHOOK_SECRET`, poi lanciare:

```bash
E2E_STRIPE=1 npm run test:e2e
```

La carta di test per esito positivo è `4242 4242 4242 4242`.

## Catalogo e Stripe

Per creare o riallineare Products e Prices Stripe dal catalogo database:

```bash
npm run stripe:sync-catalog
```

Per controllare e riconciliare gli ordini Stripe:

```bash
npm run stripe:reconcile
```

I prezzi dinamici del configuratore, delle varianti e delle aggiunte non vengono
presi dal browser: vengono ricostruiti server-side durante l’ordine e durante la
creazione della Checkout Session.

## Variabili d’ambiente

Il riferimento completo è [`.env.example`](.env.example). Le variabili server
non devono essere esposte al client e nessun file `.env` deve essere committato.

Variabili indispensabili in produzione:

- `DATABASE_URL`, `DIRECT_URL`;
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`;
- `NEXT_PUBLIC_SITE_URL`;
- `TRUSTED_ORIGINS` in produzione, con le sole origini applicative autorizzate;
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`;
- `BREVO_API_KEY` se si vogliono inviare email;
- `ORDER_STATUS_TOKEN_TTL_SECONDS`;
- `ADMIN_ALLOWLIST_EMAILS`,
  `OPERATOR_ALLOWLIST_EMAILS`;
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` per indirizzi e mappe.

Per Stripe:

- in produzione usare `sk_live_...` con `STRIPE_WEBHOOK_SECRET` live;
- in Preview/Development usare `sk_test_...` con
  `STRIPE_TEST_WEBHOOK_SECRET`;
- `sk_test_...` è una API key, mentre `whsec_...` è un webhook signing secret;
- non inserire mai chiavi o secret nei commit, nelle issue o nei log.

## Deploy checklist

Prima del rilascio:

- applicare le migrazioni con `npx prisma migrate deploy`;
- ruotare prima del rilascio tutte le credenziali eventualmente esposte e
  rimuovere `ORDER_STATUS_TOKEN_SECRET` dal runtime: i token ordine usano ora
  valori casuali opachi con hash e scadenza nel database;
- eseguire `npm run sync-catalog`, verificare il piano e solo dopo eseguire
  `npm run sync-catalog:apply`;
- eseguire `npm run stripe:sync-catalog` se il catalogo è cambiato;
- verificare che `/api/stripe/webhook` sia raggiungibile sul dominio live;
- configurare tutti gli eventi Stripe documentati sopra;
- controllare che il delivery parta alle 19:00 e l’asporto alle 16:00;
- verificare il costo minimo delivery di €2 e il calcolo a chilometri;
- provare login email/password con autofill mobile e Google OAuth;
- verificare prezzi guest/Club e ricalcolo del totale server-side;
- provare teglia intera, mezza teglia, 1–4/1–2 gusti e ingredienti extra;
- verificare che `Fritto Teglieria` resti nascosto;
- eseguire pagamento riuscito, rifiutato, retry e rimborso;
- eseguire `npm run lint`, `npm test -- --run` e `npm run build`;
- verificare su mobile che popup e CTA non si sovrappongano.

## Documentazione correlata

- [`CLAUDE.md`](CLAUDE.md): regole operative per sviluppo e manutenzione;
- [`BRAND_TOKENS.md`](BRAND_TOKENS.md): colori, font e token compatti;
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md): regole UI e layout;
- [`copy.md`](copy.md): testi istituzionali e orari pubblici;
- [`prisma/schema.prisma`](prisma/schema.prisma): modello dati;
- [`src/lib/catalog.ts`](src/lib/catalog.ts): prodotti, ricette, immagini,
  formati e regole prezzo canonici;
- [`prisma/catalog-sync.ts`](prisma/catalog-sync.ts): pianificazione e
  sincronizzazione transazionale del catalogo;
- [`prisma/sync-catalog.ts`](prisma/sync-catalog.ts): comando dry-run/apply;
- [`docs/CATALOGO_CANONICO.md`](docs/CATALOGO_CANONICO.md): procedura, confini
  con l'Admin e protezioni operative;
- [`La_Teglieria_Crea_la_tua_Pizza_Sito_v1.pdf`](La_Teglieria_Crea_la_tua_Pizza_Sito_v1.pdf):
  riferimento visuale storico del configuratore; la fonte tecnica aggiornata è
  `src/lib/pizza-builder.ts` e questa documentazione.

## Registro allergeni

Il piano e il collaudo sono in `docs/PIANO_ALLERGENI.md`. Il registro operativo è
`AllergenRegistry`: un grafo JSON validato, versionato e aggiornato atomicamente in
PostgreSQL. `AllergenAudit` conserva le revisioni complete; `OrderItem.allergenSnapshot`
conserva gli allergeni ricalcolati dal server al momento dell'ordine.

- `/admin/allergeni`: ingredienti, fonti, stati, ricette, dipendenze e audit;
- `/allergeni`: legenda, prodotti attivi, configuratore e stampa A4 da dati live;
- `/api/allergeni`: registro pubblico senza documenti o identificativi dei verificatori;
- `npm run allergens:seed`: importa le associazioni iniziali senza sovrascrivere le verifiche già registrate. Eseguire dopo l'importazione di nuovi prodotti con `sync-catalog`.

Prima attivazione su un nuovo ambiente: `npx prisma migrate deploy`, quindi
`npm run allergens:seed`. Il codice richiede la migrazione e un registro inizializzato.
Le voci `TO_VERIFY` restano incomplete anche quando contengono allergeni già noti;
non equivalgono ad assenza. Le verifiche documentali spettano al personale del locale.
