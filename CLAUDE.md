# La Teglieria — Regole operative della codebase

Questo file contiene le regole da seguire quando si modifica il progetto.
La documentazione funzionale estesa è in [`README.md`](README.md); le regole
visuali sono in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) e
[`BRAND_TOKENS.md`](BRAND_TOKENS.md).

Ultimo aggiornamento: **2026-09-03**.

## Baseline tecnica

- Next.js 16 App Router, React 19 e TypeScript;
- PostgreSQL/Supabase con Prisma 5;
- Supabase Auth con client SSR e browser;
- Tailwind CSS, `globals.css` e Zustand;
- Brevo per le email transazionali;
- Stripe Checkout con webhook firmato;
- Google Maps/Places per indirizzi, coordinate e logistica;
- Vercel per il deploy.

Prima di usare API o convenzioni di Next.js, leggere la guida della versione
installata in `node_modules/next/dist/docs/`.

## Struttura del progetto

- `src/app`: pagine, layout e route API;
- `src/components`: componenti UI divisi per area cliente, admin e rider;
- `src/lib`: regole condivise, validazione, auth, pricing, email e Stripe;
- `src/store`: stato client, incluso il carrello;
- `src/types`: tipi condivisi;
- `prisma/schema.prisma`: modello dati;
- `prisma/seed.ts`: inizializzazione database;
- `prisma/sync-catalog.ts`: catalogo applicativo e stato prodotti;
- `scripts/sync-stripe-catalog.ts`: allineamento catalogo Stripe;
- `scripts/reconcile-stripe-payments.ts`: riconciliazione pagamenti;
- `e2e/`: test Playwright;
- `src/**/*.test.ts`: test unitari Vitest.

## Regole non negoziabili

### Prezzi e ordini

Il browser non è una fonte attendibile per prezzi, sconti, prodotti attivi,
varianti, aggiunte o costi delivery.

- `GET /api/menu` determina il prezzo esposto in base alla sessione;
- un guest riceve prezzo normale e `clubPrice` quando presente;
- un cliente autenticato riceve in `price` il prezzo Club e in `standardPrice`
  il prezzo normale;
- rider e operatori non sono clienti Club;
- `POST /api/ordini` rilegge il catalogo da Prisma e ricalcola ogni importo;
- i prodotti o le categorie inattivi devono essere rifiutati anche da carrelli
  vecchi;
- le configurazioni pizza devono essere calcolate con le funzioni in
  `src/lib/pizza-builder.ts`, mai replicate in modo divergente nella UI o nelle
  API;
- gli ordini Web devono avere canale `WEB` e costo delivery ricalcolato dal
  server;
- usare e preservare `Idempotency-Key` quando si crea un ordine.

Regole commerciali attuali:

- minimo ordine: €12, esclusa la consegna;
- asporto dalle 16:00;
- delivery dalle 19:00 alle 22:00;
- delivery: €2 entro 1 km, poi €0,33/km arrotondato per eccesso al decimo.

Le costanti condivise sono in `src/lib/constants.ts`. Se cambia una regola,
aggiornare anche i test e i testi pubblici in `copy.md` e nelle pagine servizio.

### Configuratore pizza

Il configuratore supporta teglia intera 60×40 da 1 a 4 gusti e mezza teglia
30×40 da 1 a 2 gusti.

- ogni slot può usare una ricetta attiva di Teglie/Mezze teglie oppure essere
  creato da zero;
- gli extra sono sempre a pagamento;
- gli ingredienti della ricetta vengono deduplicati se aggiunti di nuovo;
- la sezione degli ingredienti gratuiti non deve essere reintrodotta;
- le ricette e i relativi nomi canonici sono in `PIZZA_MENU_FLAVORS`;
- l’API deve verificare che la ricetta sia attiva nella categoria compatibile
  con il formato scelto.

### Autenticazione

Usare i client già presenti in `src/lib/supabase/server.ts`,
`src/lib/supabase/client.ts` e `src/lib/supabase/admin.ts`.

- verificare l’utente con `auth.getUser()`, non fidarsi del solo stato React;
- mantenere `proxy.ts` attivo sulle pagine cliente e sulle API per aggiornare i
  cookie SSR;
- il login cliente legge `FormData`, conserva `autocomplete="username"` e
  `autocomplete="current-password"`, verifica la sessione dopo il login e usa
  una navigazione completa per evitare loop mobile;
- il provider OAuth cliente attivo è Google;
- Apple Passwords e Google Password Manager sono supportati solo come sistemi di
  autofill, non implicano l’attivazione di Apple OAuth;
- il callback deve sanitizzare sempre `next` con
  `sanitizeInternalPath`/equivalente;
- il callback cliente collega gli ordini guest con la stessa email;
- leggere i ruoli da `user_metadata.role` o `app_metadata.role` tramite
  `getUserRole`.

Non inserire token, password, service role key o secret nei componenti client,
nei log o nei commit.

### Stripe

Il redirect di Stripe non certifica il pagamento.

- creare l’ordine Stripe in `PENDING`;
- usare metadata con `orderId` su Checkout Session e PaymentIntent;
- confermare solo dal webhook firmato;
- verificare `orderId`, importo in centesimi e valuta `eur`;
- rendere idempotenti gli eventi `succeeded` e le email;
- inviare la conferma di pagamento solo dopo `PAID`;
- portare i fallimenti/scadenze a `FAILED` e inviare l’email di rifiuto;
- consentire il retry solo tramite token tracking o account autorizzato;
- aggiornare rimborsi totali/parziali tramite `PaymentRefund` e webhook.

Eventi Stripe gestiti e configurazione sono documentati in `README.md`.

### Email

Le email partono da `ordini@lateglieria.it` tramite Brevo.

- gli ordini non Stripe possono ricevere la conferma dopo la creazione;
- gli ordini Stripe non devono ricevere conferma prima di `PAID`;
- i pagamenti falliti devono usare `sendOrderPaymentFailedEmail`;
- se `BREVO_API_KEY` manca, saltare l’invio senza bloccare l’ordine e lasciare
  un log diagnostico.

### Catalogo

`prisma/sync-catalog.ts` è la fonte del catalogo iniziale e deve mantenere:

- categorie attive e ordinate;
- prezzi standard, Club e promo;
- immagini prodotto;
- configurazione di “Crea la tua pizza”;
- `Fritto Teglieria` disattivato.

Quando si modifica il catalogo, aggiornare anche il controllo delle ricette in
`src/app/api/ordini/route.ts` e i test pertinenti.

## UI e responsive

- pubblico: `Epilogue` per titoli e `Manrope` per body/UI;
- admin e rider: priorità a leggibilità, contrasto e touch target;
- logo sempre `LA TEGLIERIA`, con `LA` charcoal e `TEGLIERIA` terracotta;
- usare i token documentati, evitando colori o gradienti non di sistema;
- i popup prodotto, carrello e configuratore devono avere altezza dinamica,
  scroll interno e footer separato;
- il contenuto non deve essere coperto da top bar, pulsanti sticky o safe area
  mobile;
- verificare sempre almeno una viewport mobile e una desktop dopo modifiche a
  popup, carrello, checkout o top bar;
- le immagini di La Parma nelle card Teglie/Mezze teglie usano il crop zoomato
  previsto dalla UI per rimuovere il bordo della teglia.

## Route principali

| Area | Route |
|---|---|
| Pubblica | `/`, `/menu`, `/ordine`, `/servizi` |
| Auth cliente | `/accedi`, `/registrati`, `/api/auth/callback` |
| Cliente | `/account/orders`, `/stato-ordine/[id]` |
| Admin | `/admin/dashboard`, `/admin/ordini`, `/admin/logistica`, `/admin/report` |
| Catalogo admin | `/admin/prodotti`, `/admin/categorie`, `/admin/promo-club` |
| Rider | `/rider/login`, `/rider/dashboard`, `/rider/ordine/[id]` |
| Stripe | `/api/stripe/webhook` |

La route `/preshop` non esiste più e non va ricreata senza una nuova decisione di
prodotto.

## Verifica prima del commit

Eseguire, quando il cambiamento lo consente:

```bash
npm run lint
npm test -- --run
npm run build
```

Per cambiamenti a flussi browser o Stripe aggiungere anche i test Playwright
pertinenti con `npm run test:e2e`.

Prima del commit controllare `git diff --check` e non aggiungere `tmp/`, build,
file `.env` o altri artefatti temporanei.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
