# Security runbook

## Prima del deploy

Il file `.env` locale è ignorato da Git, ma non è un vault. Se contiene
credenziali operative, trattarle come esposte:

1. Revocare e rigenerare la password PostgreSQL e aggiornare
   `DATABASE_URL` e `DIRECT_URL`.
2. Rigenerare `SUPABASE_SERVICE_ROLE_KEY` e verificare le policy RLS.
3. Revocare e rigenerare `BREVO_API_KEY`, le credenziali Upstash e tutti i
   secret applicativi (`CRON_SECRET`, l'eventuale `ADMIN_ORDER_DELETE_PASSWORD` e ogni
   secret usato da webhook interni).
4. In Stripe revocare le API key secret/restricted e i webhook secret esposti;
   configurare separatamente le credenziali test e live.
5. Rimuovere dal runtime le credenziali precedenti e la variabile legacy
   `ORDER_STATUS_TOKEN_SECRET`.
6. Limitare i referrer, le API abilitate e le quote della Google Maps API key.

L’eliminazione definitiva degli ordini usa normalmente
`ADMIN_ORDER_DELETE_VERIFICATION_MODE=reauth`, che verifica nuovamente la
password dell’account Admin. Se un ambiente deve usare `server-secret`,
`ADMIN_ORDER_DELETE_PASSWORD` deve vivere esclusivamente nel vault server-side,
essere diverso per ambiente e venire ruotato prima di ogni rilascio che segue
una possibile esposizione.

Il `.env` locale deve restare fuori da Git e con permessi `600`:

```bash
chmod 600 .env
```

Non stampare mai i valori del file nei log o nei messaggi di commit.

## Migrazione dei token ordine

Dopo aver configurato le nuove variabili nell’ambiente corretto, applicare le
migrazioni senza usare comandi che ricreino o azzerino il database:

```bash
npx prisma migrate deploy
```

La migrazione crea `OrderStatusToken`, che conserva solo hash SHA-256, scadenza
e stato di revoca dei token di tracking.

## Verifica post-deploy

Eseguire:

```bash
npm test -- --run
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```

Controllare inoltre che:

- un ruolo presente solo in `user_metadata` non abiliti il pannello;
- un rider non possa leggere ordini non assegnati;
- le transizioni di stato non possano saltare la macchina server-side;
- le route di stampa, catalogo e conteggio rifiutino utenti non autorizzati;
- le mutation con `Origin` assente o estraneo restituiscano `403`;
- la risposta HTML contenga una CSP con nonce e senza `unsafe-inline` in
  `script-src`.
