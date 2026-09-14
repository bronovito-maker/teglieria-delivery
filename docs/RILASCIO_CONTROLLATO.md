# Rilascio controllato

## Stato di chiusura

Una commit è candidata al rilascio soltanto se tutti i gate automatici passano
sulla stessa SHA e le prove manuali/staging sono allegate al verbale. In assenza
di staging isolato, credenziali E2E, prova PITR o stampante reale il lavoro resta
`NON CHIUSO`.

## Preflight

Il comando è non mutante e fallisce se SHA, working tree, ambiente, PITR o
rollback non sono dichiarati:

```bash
RELEASE_ENVIRONMENT=staging \
RELEASE_CANDIDATE_SHA="$(git rev-parse HEAD)" \
RELEASE_SITE_URL=https://staging-isolato.example.com \
RELEASE_CONFIRM_ISOLATED_STAGING=1 \
RELEASE_CONFIRM_DATABASE_IDENTITY=1 \
RELEASE_CONFIRM_PITR=1 \
RELEASE_PITR_EVIDENCE="ticket/screenshot backup" \
RELEASE_ROLLBACK_DEPLOYMENT="vercel-deployment-id" \
npm run release:preflight
```

Per produzione sono inoltre obbligatorie
`RELEASE_PRODUCTION_APPROVED=1` e `RELEASE_LOW_TRAFFIC_WINDOW=1`.

## Sequenza staging

1. Registrare SHA candidata, progetto Vercel, Supabase project ref, fingerprint
   del database, configurazione e-mail sandbox e deployment precedente.
2. Verificare backup/PITR e allegare una prova con data e retention.
3. Eseguire `npx prisma migrate status`, quindi
   `npx prisma migrate deploy` usando esclusivamente le variabili staging.
4. Eseguire il deploy applicativo della stessa SHA candidata.
5. Eseguire `npm run sync-catalog`; archiviare il piano e verificare i conteggi
   attesi di 9 categorie e 63 prodotti.
6. Solo se il piano è approvato, eseguire `npm run sync-catalog:apply`, quindi un
   secondo dry-run che deve risultare senza differenze.
7. Eseguire tutti i gate descritti in
   `docs/COLLAUDO_CORREZIONI_SITO_ADMIN.md` con `E2E_BASE_URL` staging.
8. Verificare manualmente menu, Admin, e-mail sandbox, storico e stampa 58 mm.

## Go/no-go produzione

Procedere solo se:

- staging e produzione sono identificati in modo inequivocabile e separati;
- PITR/backup è verificato;
- E2E e test manuali sono verdi sulla stessa SHA;
- le descrizioni approvate non hanno regressioni;
- nessuna pizza configurabile può essere ordinata a prezzo zero;
- le immagini nuove hanno nomi distinti e le immagini legacy sono ancora
  disponibili;
- è identificato il deployment Vercel precedente per il rollback;
- è aperta una finestra a basso traffico con responsabile reperibile.

## Sequenza produzione

1. Annotare inizio finestra, responsabile e metriche baseline.
2. Eseguire il preflight produzione.
3. Eseguire `npx prisma migrate status` e poi `npx prisma migrate deploy`.
4. Distribuire l'applicazione dalla SHA già collaudata.
5. Eseguire dry-run catalogo, approvarlo e applicarlo; rieseguire il dry-run.
6. Creare un ordine reale controllato e verificare: totale/Club, fascia,
   annullamento, una sola e-mail, storico dopo nuovo login e stampa 58 mm.
7. Monitorare per un intero ciclo operativo: errori 5xx, ordini ricevuti,
   checkout, outbox e-mail, collegamento storico, logistica e stampa.

## Rollback

- Codice: promuovere il deployment Vercel precedente già registrato.
- Catalogo: ripristinare soltanto i record coinvolti dal backup; non eseguire un
  seed completo.
- Immagini: mantenere temporaneamente sia i nuovi nomi sia quelli legacy.
- Database: non applicare migrazioni inverse distruttive. Le nuove colonne,
  tabelle e indici possono restare inutilizzati dal deployment precedente.

## Verbale di rilascio

| Evidenza | Valore |
| --- | --- |
| SHA candidata | Da compilare |
| Staging URL / deployment | Da compilare |
| Database staging | Da compilare |
| PITR/backup | Da compilare |
| Migrazioni staging | Da compilare |
| Dry-run/apply catalogo | Da compilare |
| Gate automatici/E2E | Da compilare |
| Collaudo manuale stampante | Da compilare |
| Deployment produzione precedente | Da compilare |
| Finestra produzione | Da compilare |
| Esito ordine reale | Da compilare |
| Fine ciclo monitoraggio | Da compilare |
