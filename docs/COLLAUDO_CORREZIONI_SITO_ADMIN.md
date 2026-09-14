# Collaudo correzioni sito e Admin

## Ambiente E2E

Gli E2E creano utenti e ordini e possono inviare notifiche. Devono essere eseguiti normalmente su uno staging isolato, con database, Supabase, e-mail e Stripe test separati dalla produzione.

Configurazione minima:

```dotenv
E2E_BASE_URL=https://staging-isolato.example.com
E2E_PRODUCTION_URL=https://www.lateglieria.it
E2E_CONFIRM_ISOLATED_STAGING=1
E2E_CUSTOMER_EMAIL=...
E2E_CUSTOMER_PASSWORD=...
E2E_ADMIN_EMAIL=...
E2E_ADMIN_PASSWORD=...
E2E_RIDER_EMAIL=...
E2E_RIDER_PASSWORD=...
E2E_ALLOW_REGISTRATION=1
```

Playwright rifiuta esplicitamente localhost, staging non confermato e credenziali mancanti.

Eccezione pre-go-live: la produzione puo' essere usata soltanto mentre il sito e'
inattivo e dopo autorizzazione esplicita. In quel caso non impostare la conferma
staging e usare entrambe le protezioni:

```dotenv
E2E_ALLOW_PRODUCTION=1
E2E_CONFIRM_SITE_INACTIVE=1
```

Senza entrambe le variabili il runner rifiuta sempre gli host di produzione.

## Gate automatici

Eseguire nell'ordine:

```bash
npm ci
npx prisma validate
npx tsc --noEmit --incremental false
npm run lint
npm test
npm run build
npm run test:e2e
git diff --check
```

Copertura specifica:

- risparmio Club: `src/store/cart.test.ts`, `src/lib/money.test.ts`;
- whitelist, etichette e fuso delle fasce: `src/lib/order-time-slots.test.ts`;
- configuratore e ricalcolo server: `src/lib/pizza-builder.test.ts`, `e2e/allergens.spec.ts`, `e2e/admin-products-responsive.spec.ts`;
- sessione e storico dopo un nuovo login: `src/app/api/auth/auth-order-linking.test.ts`, `e2e/auth-flows.spec.ts`;
- singola e-mail di annullamento: `src/lib/order-cancellation-outbox.test.ts`;
- autorizzazione eliminazione: `src/app/api/ordini/[id]/route.test.ts`, `src/lib/admin-delete-verification.test.ts`;
- catalogo mobile: `e2e/admin-products-responsive.spec.ts`;
- descrizioni, ingredienti e immagini: `src/lib/catalog.test.ts`, `src/lib/order-views.test.ts`;
- scontrino 58 mm e QR: `src/lib/receipt-layout.test.ts`, `src/app/api/ordini/[id]/stampa/route.test.ts`.

## Collaudo manuale stampante

1. Impostare `RECEIPT_PRINTABLE_WIDTH_MM` dalla larghezza della testina indicata nella scheda tecnica della stampante.
2. Stampare un ordine reale lungo, con fascia oraria, indirizzo, modifiche, sconto Club e consegna.
3. Verificare margini, assenza di overflow e tagli, contrasto e leggibilità delle righe più piccole.
4. Scansionare il QR senza zoom con almeno due telefoni e applicazioni fotocamera differenti.
5. Verificare che la pagina rider aperta corrisponda all'ordine stampato.
