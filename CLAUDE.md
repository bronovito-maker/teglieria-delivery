# La Teglieria — Design System & Regole Codebase

## Stack
- **Framework**: Next.js App Router (TypeScript)
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **Stile**: Tailwind CSS + globals.css
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Email**: Brevo (`@getbrevo/brevo`) — FROM: `ordini@lateglieria.it`
- **Mappe**: Google Maps API (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

---

## Design System

### Colori
| Token Tailwind | Hex | Uso |
|---|---|---|
| `charcoal` | `#1A1A1A` | Testo primario, sfondi scuri |
| `warm-light` | `#F7F2E8` | Sfondo pagina (crema caldo) |
| `terracotta` | `#D96A2B` | Accento brand, CTA primario |
| `marigold` | `#E6A52E` | Accento secondario, badge, warning |
| `royal` | `#2F5FAE` | Accento informativo/freddo, mappe e contrasto |

### Font
| Classe | Font | Uso |
|---|---|---|
| `font-display` | **Epilogue** | Headline, hero, titoli sezione |
| `font-logo` | **Epilogue** | Lockup/logo testo "La Teglieria" |
| `font-brand` | **Manrope** | UI, bottoni, dati, card, nav |
| `font-body` | **Manrope** | Corpo testo, descrizioni, form |
| `font-subtitle` | **Manrope** | Alias di font-body |
| *(admin/rider)* | **Manrope** | Sempre preferito per massima leggibilità operativa |

**Regola assoluta**:
- `Epilogue` per hero, heading e lockup
- `Manrope` per tutto ciò che è operativo o leggibile a colpo d'occhio
- in `admin` e `rider`, anche i titoli devono restare tendenzialmente su `Manrope` se l'uso è funzionale e non editoriale

### Regole Tipografia

#### ✅ `uppercase` — SOLO per testo piccolo (≤ 12px / text-xs)
```
micro-label overline → "IL NOSTRO ORGOGLIO", "DAL 2026"
badge → "HIGH HYDRATION", "ASPORTO"
nav footer → "ADMIN AREA", "RIDER ACCESS"
copyright → "© 2026 LA TEGLIERIA"
```

#### ❌ Mai `uppercase` su titoli grandi
```
h1, h2, h3 → sentence case o title case
testo su immagini → sentence case
bottoni CTA → sentence case o title case
```

#### Peso font
- Titoli h1/h2/h3 → `font-semibold`
- Micro-label → `font-bold` (uppercase piccolo regge il bold)
- Bottoni → `font-semibold`
- Corpo testo → `font-normal` o `font-medium`

#### Tracking (letter-spacing)
- Micro-label uppercase → `tracking-[0.2em]` a `tracking-[0.4em]`
- Titoli → `tracking-tight` o default (mai `tracking-widest`)
- Bottoni → `tracking-wide` (mai `tracking-widest`)

### Classi Componente (globals.css)
```
.ds-heading-hero    → h1 hero mobile
.ds-heading-section → h2 sezioni
.ds-heading-card    → h3 card
.ds-micro-label     → overline piccola uppercase
.ds-cta-primary     → bottone CTA principale
.ds-cta-secondary   → bottone CTA secondario
```

### Border Radius
| Elemento | Classe |
|---|---|
| Card principale | `rounded-[2.5rem]` – `rounded-[3rem]` |
| Card secondaria | `rounded-[2rem]` |
| Input | `rounded-2xl` – `rounded-[1.5rem]` |
| Bottone pill | `rounded-full` |
| Badge / chip | `rounded-full` |
| Immagine hero | `rounded-[1.5rem]` – `rounded-[3rem]` |

### Direzione Visiva
- tono: artigianale + architettonico + premium minimal
- headline: forti ma non urlate
- body/UI: neutri, leggibili, puliti
- glassmorphism: caldo, leggero, mai troppo lattiginoso
- evitare look SaaS generico, viola, freddo o troppo playful
- admin e rider devono privilegiare leggibilità, densità corretta e touch target chiari su mobile/tablet

---

## Struttura Route

| Percorso | Tipo | Note |
|---|---|---|
| `/` | Landing page pubblica | Homepage marketing |
| `/menu` | Pubblica | Catalogo prodotti |
| `/ordine` | Pubblica | Checkout ordine |
| `/stato-ordine/[id]` | Pubblica | Tracking ordine |
| `/accedi` | Auth cliente | Login email + Google |
| `/registrati` | Auth cliente | Registrazione |
| `/admin/*` | Admin (RBAC) | Gestionale pizzeria (iPad) |
| `/rider/*` | Rider auth | Area fattorini |
| `/api/auth/callback` | OAuth callback | `?type=customer` o `admin` |

---

## Regole Admin

- Dispositivo principale: **iPad** (ottimizzato sia portrait che landscape)
- Font: **Manrope** via `.admin-layout` class
- Sidebar: icone sole a `md:` (portrait iPad), label visibili a `lg:` (landscape)
- Grid KPI: `grid-cols-2 lg:grid-cols-4 xl:grid-cols-8`
- Kanban: `grid-cols-2 md:grid-cols-3 xl:grid-cols-6`

## Regole Rider

- Dispositivo principale: **iPhone** in servizio, **tablet** come supporto
- Font: **Manrope** per tutta l'operatività
- Priorità UI:
  - stato ordine
  - prossima azione
  - ETA
  - navigazione
- I pulsanti principali devono essere immediati, ad alto contrasto e comodi col pollice

---

## Regole Ordini Cliente

- **Nessuna nota per item** — solo una nota finale per ristorante/fattorino
- **Nessun prompt login durante checkout** — solo suggerimento post-ordine
- Il campo email è **facoltativo** nel checkout
- Dopo ogni ordine loggato: salva telefono e ultimo indirizzo in `user_metadata`
- Indirizzo: Google Places Autocomplete + bottone geolocalizzazione (solo Livorno, ~15km)

---

## Email Transazionali (Brevo)

| Trigger | Funzione | Destinatario |
|---|---|---|
| Nuovo ordine con email | `sendOrderConfirmationEmail` | Cliente |
| Status → `OUT` | `sendRiderDepartedEmail` | Cliente |
| Nuovo rider creato | `sendRiderWelcomeEmail` | Rider |
| Registrazione cliente | `sendCustomerWelcomeEmail` | Cliente |

FROM sempre: `ordini@lateglieria.it` / "La Teglieria"

---

## Google OAuth

- Solo **Google** (Apple non implementato)
- Callback: `/api/auth/callback?type=customer&next=/ordine`
- Al primo login OAuth: il callback setta `role: "customer"` via `supabase.auth.updateUser`
- Campi pre-compilati: `full_name`, `email` (da Google), `phone` e `lastAddress` (da ordini precedenti)
