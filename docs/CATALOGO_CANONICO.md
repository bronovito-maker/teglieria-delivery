# Catalogo canonico

## Fonti autorevoli

- `src/lib/catalog.ts`: categorie, prodotti, descrizioni, immagini, prezzi,
  ricette pizza, configuratore e formati consigliati.
- `src/lib/order-time-slots.ts`: orari di servizio, durata delle fasce e
  generazione delle etichette cliente/Admin.
- `prisma/catalog-sync.ts`: confronto e applicazione transazionale del
  catalogo sul database.

`prisma/seed.ts` e `prisma/sync-catalog.ts` non contengono copie del catalogo:
consumano entrambi queste fonti.

Le ricette complete delle schiacciatine non sono ancora disponibili. Nel
catalogo restano quindi `null`; i componenti presenti nel registro allergeni
sono parziali e non devono essere presentati come ricette commerciali.

## Aggiornamento di un database esistente

Eseguire sempre prima l'anteprima non mutante:

```bash
npm run sync-catalog
```

Il piano riporta:

- categorie e prodotti da creare;
- campi canonici da aggiornare;
- categorie/prodotti storici da disattivare;
- prodotti aggiunti dall'Admin che verranno preservati;
- numero di prodotti già allineati.

Soltanto dopo aver verificato ambiente e piano:

```bash
npm run sync-catalog:apply
```

L'applicazione richiede i conteggi attesi di 9 categorie e 63 prodotti, usa
una transazione e riesegue il confronto al termine. Un duplicato di categoria
o di prodotto interrompe il processo invece di scegliere un record arbitrario.

## Database nuovi

`npm run seed` è riservato a un database vuoto. Se trova categorie, prodotti,
ordini o configurazione operativa esistenti termina prima di qualsiasi
scrittura. L'opzione `--allow-existing` esiste esclusivamente per ripristini
controllati e comporta anche l'allineamento dei campi canonici del catalogo.

## Confine con l'Admin

I record canonici vengono riallineati per descrizione, prezzi, immagine,
ordinamento, configurazione e stato. I prodotti aggiuntivi creati dall'Admin
nelle categorie canoniche vengono segnalati ma preservati. Le categorie non
più canoniche vengono disattivate; non vengono eliminate.
