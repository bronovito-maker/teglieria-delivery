# La Teglieria - Documentazione Progetto

Repository di **La Teglieria**, piattaforma integrata per ordini online, checkout, gestione admin, logistica rider e portale cliente.

## Obiettivo

Realizzare un ecosistema unico per:

- ordinazione online asporto/delivery
- conferma manuale ordine da admin
- gestione stati e ETA
- assegnazione rider
- logistica con mappa e suggerimenti operativi
- dashboard rider
- dashboard cliente per ordini attivi e storico
- PWA installabile

## Tech Stack

- Framework: Next.js 14 App Router
- Linguaggio: TypeScript
- Database: PostgreSQL via Supabase
- ORM: Prisma
- Auth: Supabase Auth
- Styling: Tailwind CSS
- Stato client: Zustand
- Icone UI: Lucide React dove usato
- Mappe: Google Maps API
- Email: Brevo / webhook notifiche stato ordine
- Pagamenti: Stripe Checkout per pagamenti con carta
- PWA: manifest + service worker

## Brand System

Font attuali:

- `Epilogue`: display, headline, logo testuale
- `Manrope`: body, UI, admin, rider, form, bottoni

Colori principali:

- `charcoal`: `#1A1A1A`
- `warm-light`: `#F7F2E8`
- `terracotta`: `#D96A2B`
- `marigold`: `#E6A52E`
- `royal`: `#2F5FAE`

Il logo in top bar deve essere sempre `LA TEGLIERIA`, tutto maiuscolo, con `LA` in charcoal e `TEGLIERIA` in terracotta.

Documenti di riferimento:

- [BRAND_TOKENS.md](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/delivery_precania/BRAND_TOKENS.md)
- [DESIGN_SYSTEM.md](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/delivery_precania/DESIGN_SYSTEM.md)
- [CLAUDE.md](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/delivery_precania/CLAUDE.md)

## Funzionalita Implementate

### Area Cliente

- Landing pubblica responsive
- Menu digitale con categorie
- Modale prodotto con varianti, aggiunte e rimozioni
- Checkout asporto/delivery
- Carrello con aggregazione prodotti uguali
- Tracking ordine
- Dashboard cliente `/account/orders`
- PWA installabile

### Area Admin

- Login admin con layout dedicato
- Dashboard gestionale
- Kanban ordini
- Conferma manuale ordine
- Gestione ETA stile order pad
- Stampa ordine
- Cancellazione ordine confermato protetta da password
- Ordini manuali
- CRUD prodotti e categorie
- Report vendite
- RBAC opzionale via allowlist

### Logistica E Rider

- Sezione logistica admin
- Anagrafica rider
- Assegnazione ordini ai rider
- Suggerimento rider automatico v1
- Timer consegne e soglie SLA
- Eventi operativi rider
- Alert admin per eventi critici
- Dashboard rider mobile-first
- Dettaglio ordine rider
- Stato `IN_CONSEGNA` / `CONSEGNATO`
- Mappa e navigazione rider

## Schema Database

Modelli principali:

- `Order`: tipo, stato, ETA, cliente, assegnazione rider
- `OrderItem`: prodotti, varianti e modifiche
- `Product`: prodotti menu
- `Category`: categorie menu
- `Rider`: profili fattorini
- `GlobalConfig`: configurazioni operative

## Setup Locale

1. `npm install`
2. configura `.env` partendo da `.env.example`
3. `npx prisma generate`
4. `npx prisma db push` o migrazione equivalente
5. `npm run dev`

## Deploy

Il progetto è predisposto per Vercel. Il deploy di produzione deve includere il
commit che contiene le route API, le migrazioni Prisma e `vercel.json`; dopo aver
configurato o modificato le variabili d’ambiente è necessario eseguire un nuovo
deploy.

Variabili importanti:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `ADMIN_ORDER_DELETE_PASSWORD`
- `ADMIN_RBAC_STRICT`
- `ADMIN_ALLOWLIST_EMAILS`
- `OPERATOR_ALLOWLIST_EMAILS`
- `ORDER_STATUS_WEBHOOK_URL`
- `NEXT_PUBLIC_SITE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_TEST_WEBHOOK_SECRET` (solo Preview/Development)

Non committare mai `.env`, chiavi Stripe o signing secret. In Production usa una
chiave `sk_live_` e il relativo secret `whsec_`; in Preview/Development usa una
chiave `sk_test_` e il relativo secret test `whsec_`. `sk_test_` è una API key, non
un webhook signing secret.

### Pagamenti Stripe

Per attivare i pagamenti con carta, configura in Stripe un endpoint webhook su
`/api/stripe/webhook` per gli eventi `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`
e `charge.refunded`.
Il webhook aggiorna lo stato del pagamento dell’ordine; il redirect del cliente non
viene usato come prova di pagamento.

Per importare o riallineare il catalogo esistente usa `npm run stripe:sync-catalog`.
Il comando crea e aggiorna automaticamente Products e Prices Stripe a partire dal
catalogo database, senza inserimento manuale. I prezzi dinamici di varianti,
aggiunte e prezzi Club vengono comunque calcolati server-side nel Checkout.
Per controllare gli importi e riallineare gli stati degli ordini usa
`npm run stripe:reconcile`.
Prima del deploy applica le migrazioni con `npx prisma migrate deploy`.

Per il collaudo locale avvia il listener usando esplicitamente la chiave test:

```bash
set -a; source .env; set +a
stripe listen --api-key "$STRIPE_SECRET_KEY" \
  --forward-to localhost:3000/api/stripe/webhook
```

Copia il `whsec_...` mostrato dal listener in `STRIPE_TEST_WEBHOOK_SECRET` per
quella sessione, poi esegui `E2E_STRIPE=1 npm run test:e2e`. Il test automatizzato
verifica una carta riuscita (`4242 4242 4242 4242`), il redirect al tracking e la
transizione dell’ordine a `PAID` tramite webhook.

Checklist di rilascio pagamenti:

- endpoint live `https://www.lateglieria.it/api/stripe/webhook` raggiungibile e
  configurato con gli eventi documentati sopra;
- migrazioni applicate con `npx prisma migrate deploy`;
- catalogo riallineato con `npm run stripe:sync-catalog`;
- carta riuscita e carta rifiutata verificate in Test mode;
- retry di una sessione fallita verificato;
- rimborso totale e parziale verificati dal back-office;
- riconciliazione verificata con `npm run stripe:reconcile`;
- chiave live ruotata se è stata esposta o condivisa.

Lo stato `PAID` viene assegnato dal webhook firmato e validato per importo e
valuta; il redirect del cliente non è una prova di pagamento.

Ultimo aggiornamento: 29 agosto 2026
