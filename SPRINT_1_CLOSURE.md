# Sprint 1 - Chiusura

## Obiettivo
Rendere operativa la piattaforma end-to-end per il flusso ordine, conferma ristorante, logistica rider e consegna, con UI coerente allo stile La Teglieria.

## Completato
- Brand identity coerente su landing, menu, checkout, admin e rider (tomato + glassmorphism + minimal style).
- Mobile UX prioritaria:
  - header con hamburger,
  - componenti responsive in dashboard, ordini, report.
- Flusso ordini:
  - conferma manuale ordine in admin,
  - stampa ordine,
  - ETA regolabile (+/-),
  - stati ordine uniformati in italiano lato UI e enum lato backend.
- Cart e checkout:
  - unione prodotti uguali,
  - svuota carrello,
  - CTA coerenti con il tema.
- Rider flow:
  - login/registrazione,
  - assegnazione da QR e da admin,
  - avanzamento stato (partito -> consegnato),
  - aggiornamento live periodico.
- Logistica admin:
  - mappa Google Maps integrata,
  - assegnazione/rassegnazione ordini,
  - timer consegna,
  - KPI logistici principali.
- Gestione rider completa (Sprint 1 scope):
  - creazione rider,
  - attivazione/disattivazione,
  - rimozione logica (soft remove con sgancio ordini attivi),
  - metriche rider: ordini evasi, ordini evasi oggi, incasso, incasso oggi, ticket medio, pizze consegnate.
- Sicurezza operativa richiesta:
  - eliminazione ordine confermato protetta da password admin (`ADMIN_ORDER_DELETE_PASSWORD`).

## Validazione tecnica
- `npm run lint` superato.
- `npm run build` superato.

## Variabili ambiente richieste in produzione (Render)
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_STORE_LAT`
- `NEXT_PUBLIC_STORE_LNG`
- `ADMIN_ORDER_DELETE_PASSWORD`

## Nota sicurezza
- Non inserire chiavi API nei messaggi/chat o repository.
- Ruotare immediatamente eventuali chiavi esposte.
- Su Google Cloud limitare la key Maps per dominio/IP e API consentite.
