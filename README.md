# 🍕 Teglieria Delivery - Documentazione Progetto

Benvenuti nel repository di **Teglieria**, una piattaforma integrata per la gestione di ordini (asporto e delivery) e la logistica dei rider.

## 📌 Obiettivo del Progetto
Realizzare un ecosistema unico che permetta ai clienti di ordinare online e allo staff di gestire l'intero ciclo di vita dell'ordine, dalla preparazione alla consegna, inclusa l'automazione dell'assegnazione ai rider tramite QR code.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma
- **Autenticazione**: Supabase Auth
- **Styling**: Tailwind CSS & Lucide Icons
- **Gestione Stato**: Zustand (Carrello)
- **Utility**: `qrcode` (generazione interna), `date-fns`

---

## 🚀 Funzionalità Implementate

### Fase 1: Core System
#### 🛒 Area Cliente
- **Menù Digitale**: Consultazione prodotti con categorie.
- **Personalizzazione**: Modale per varianti, aggiunte (+€) e rimozioni ingredienti.
- **Checkout**: Scelta tra Asporto/Delivery, inserimento dati e riepilogo.
- **Tracking**: Pagina stato ordine in tempo reale con polling automatico.

#### 🏗️ Area Admin (Gestionale)
- **Live Dashboard**: Visualizzazione Kanban degli ordini per stato (Ricevuto, Confermato, In Preparazione, ecc.).
- **Gestione Catalogo**: CRUD completo per Prodotti, Varianti e Categorie.
- **Ordini Manuali**: Interfaccia per inserimento ordini presi al telefono o al banco.
- **Reporting**: Report base di fine serata con vendite e canali.

---

### Fase 2: Logistica Avanzata
#### ⏱️ Gestione Tempi "Just Eat Style"
- Gli amministratori possono posticipare o anticipare l'orario stimato di consegna con pulsanti rapidi (+15m, +30m, -15m), aggiornando istantaneamente il tracking del cliente.

#### 🚴 Rider App & Automazione QR
- **Auth Rider**: Registrazione e Login dedicato per il personale di consegna.
- **QR Code Printing**: Ogni scontrino generato include un QR Code univoco generato server-side.
- **Auto-assegnazione**: Il rider scansiona il QR e può assegnarsi l'ordine con un clic («Assegnami questa consegna»).
- **Dashboard Rider**: Vista ottimizzata per mobile con elenco consegne attive e storico.

#### 📅 Fasce Orarie Dinamiche
- Sistema di slot da 30 minuti con capienza configurabile (es. max 5 ordini ogni 30 min).
- Blocco automatico degli slot saturi nel frontend cliente.
- Pannello di configurazione admin per modificare la capienza globale.

---

## 📊 Schema Database (Prisma)
I modelli principali includono:
- `Order`: Gestisce tipi (Asporto/Delivery), stati e dati cliente.
- `OrderItem`: Dettagli prodotti, varianti e modifiche.
- `Product` / `Category`: Struttura del menù.
- `Rider`: Profilo lavoratore e associazione `auth.uid`.
- `GlobalConfig`: Parametri di sistema (capienza fasce, costi fissi).

---

## 👨‍💻 Passi Futuri (Roadmap)

Secondo la [Specifica Teglieria](file:///Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/delivery_precania/Specifica_Teglieria_aggiornata.pdf), i prossimi sviluppi includeranno:

### 1. Gestione Tavoli (Modulo Base) - *Posticipato*
- Mappa interattiva della sala.
- Apertura/Chiusura tavoli e gestione conti multipli.
- Stati tavolo (Aperto, Servito, Conto richiesto).

### 2. Integrazioni Esterne
- **Just Eat**: API per ricevere ordini direttamente nel gestionale.
- **Google Maps API**: Per calcolo preciso dei KM e ottimizzazione giri consegna.

### 3. Analytics & Reportistica Avanzata
- Analisi storica dei carichi per fascia oraria.
- Stima suggerita del numero di rider necessari in base allo storico.
- Report periodici dettagliati per categorie e varianti più vendute.

---

## ⚙️ Setup Locale
1. Clonare il repository.
2. `npm install`
3. Configurare `.env` con `DATABASE_URL` e chiavi Supabase.
4. `npx prisma db push` per sincronizzare lo schema.
5. `npm run dev` per avviare il server.

---
*Ultimo aggiornamento: 13 Aprile 2026*
