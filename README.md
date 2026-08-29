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

Configurazione Render consigliata:

- Language: Node
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`

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

Per attivare i pagamenti con carta, configura in Stripe un endpoint webhook su
`/api/stripe/webhook` per gli eventi `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`
e `charge.refunded`.
Il webhook aggiorna lo stato del pagamento dell’ordine; il redirect del cliente non
viene usato come prova di pagamento.

Per importare o riallineare il catalogo esistente usa `npm run stripe:sync-catalog`.
Per controllare gli importi e riallineare gli stati degli ordini usa `npm run stripe:reconcile`.
Prima del deploy applica le migrazioni con `npx prisma migrate deploy`.

Per il collaudo locale completo avvia `stripe listen --forward-to
localhost:3000/api/stripe/webhook` e configura le chiavi test Stripe nell’ambiente
del server. Il test Playwright della carta si attiva con `E2E_STRIPE=1`, ma solo
quando il processo di test usa una chiave `sk_test_` e il secret del listener CLI.
Il collaudo deve includere una carta riuscita (`4242 4242 4242 4242`),
una carta rifiutata, un retry, un rimborso totale/parziale e una riconciliazione.

Ultimo aggiornamento: 29 aprile 2026
