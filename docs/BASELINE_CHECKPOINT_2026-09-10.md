# Baseline checkpoint - 10 settembre 2026

## Scopo

Questo documento registra la baseline precedente alle correzioni contenute in
`La_Teglieria_Correzioni_Sito_Admin_10-09-2026_v2.pdf`.

- Branch di lavoro: `codex/correzioni-sito-admin-2026-09-10`
- Commit di partenza: `28097a9`
- Branch di partenza: `main`
- Stato iniziale: 75 file tracciati modificati e 31 voci non tracciate
- Diff tracciata iniziale: 1.984 inserimenti e 1.019 eliminazioni
- File in stage prima del checkpoint: nessuno

Il checkpoint conserva il lavoro applicativo già presente senza riscriverne la
storia. Gli artefatti temporanei in `tmp/`, i dati locali di `.deepseek/` e
`prova.md` sono preservati sul disco ma non fanno parte del checkpoint.

## Aree già modificate

- autenticazione Supabase, cookie di sessione e controllo accessi;
- sicurezza delle richieste, CSP, RBAC e rate limiting;
- token di stato ordine e viste cliente/Admin/rider;
- registro allergeni, audit, snapshot ordine e interfacce pubbliche/Admin;
- menu, configuratore, carrello e checkout;
- logistica, mappe, stampa ed e-mail;
- documentazione, test unitari/API ed E2E.

L'elenco completo dei file è conservato dal commit Git del checkpoint.

## Migrazioni

Sono presenti 12 migrazioni Prisma. Le due aggiunte nella baseline e ora
versionate sono:

| Migrazione | Contenuto | Natura |
| --- | --- | --- |
| `20260904120000_add_order_status_tokens` | Tabella `OrderStatusToken`, indici e foreign key con cancellazione a cascata | Additiva |
| `20260910120000_allergen_registry` | Snapshot allergeni su `OrderItem`, registro centrale e audit con RLS | Additiva |

`npx prisma validate` ha confermato che lo schema è valido.

`npx prisma migrate status` ha rilevato 12 migrazioni e ha confermato che il
database configurato localmente è aggiornato. Il comando ha usato `.env` e il
pooler PostgreSQL Supabase in `eu-central-1`.

## Ambienti verificabili

`.env` e `.env.local` fanno riferimento allo stesso database (fingerprint
locale `321a30d37489`). Il repository non contiene un collegamento `.vercel`
versionato e la CLI Vercel non è installata.

Di conseguenza, in questa baseline è stato verificato un solo database remoto;
non è possibile identificarlo in modo affidabile come staging o produzione né
controllare un secondo ambiente senza le rispettive configurazioni esplicite.
Nessun valore segreto è stato stampato o registrato.

## Proxy applicativo

La baseline conteneva due entry point concorrenti:

- `proxy.ts`, tracciato, dedicato al refresh della sessione Supabase;
- `src/proxy.ts`, non tracciato, con refresh sessione, CSP e nonce.

La configurazione è stata consolidata nel solo `src/proxy.ts`. Poiché l'App
Router del progetto risiede in `src/app`, un controllo HTTP sul build di
produzione ha confermato che il proxy alla radice non veniva eseguito. Il proxy
canonico ora conserva il refresh dei cookie Supabase, inoltra il nonce al
rendering e applica la Content Security Policy alla risposta. Il duplicato alla
radice è stato rimosso.

## Gate del checkpoint

I controlli eseguiti sulla baseline hanno prodotto questi risultati:

1. `npx prisma validate`: superato.
2. `npx tsc --noEmit --incremental false`: superato.
3. `npm run lint`: superato con un warning preesistente sull'elemento `img`
   del pixel Facebook.
4. `npm test`: 17 file e 75 test superati.
5. `npm run build`: superato; Next.js rileva un unico `Proxy (Middleware)`.
6. Controllo HTTP sul build: risposta `200`, CSP presente e nonce della CSP
   corrispondente al nonce inserito nell'HTML.
7. `git diff --check`: superato.

Gli E2E che creano utenti o ordini non vanno eseguiti contro il database remoto
finché l'ambiente non è stato identificato come staging isolato.
