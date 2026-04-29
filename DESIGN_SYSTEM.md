# La Teglieria - Design System

Versione: 2026-04-29

Questo documento descrive il sistema visivo attualmente in uso su landing, menu, checkout, account cliente, admin e rider.

## Direzione

- tono: artigianale, architettonico, premium minimal
- feeling: caldo, strutturato, editoriale, contemporaneo
- pubblico: più espressivo e fotografico
- admin/rider: più leggibile, operativo, touch-friendly

## Font

Usiamo solo font gratuiti da Google Fonts tramite `next/font/google`.

| Ruolo | Font | Variabile | Uso |
|---|---|---|---|
| Display / Headlines | `Epilogue` | `--font-display` | Hero, headline pubbliche, titoli editoriali |
| Logo testuale | `Epilogue` | `--font-logo` | Lockup `LA TEGLIERIA` |
| Body / UI | `Manrope` | `--font-body` | Testi, bottoni, form, dashboard, admin, rider |

Pesi caricati:

- `Epilogue`: `600`, `700`, `800`
- `Epilogue logo`: `700`, `800`
- `Manrope`: `400`, `500`, `600`, `700`

Nota operativa:

- nelle aree `.admin-layout` e `.rider-layout` forziamo `Manrope` anche sulle classi display/logo, per privilegiare leggibilità e velocità d'uso.

## Palette

| Token Tailwind | Hex | Uso |
|---|---|---|
| `charcoal` | `#1A1A1A` | Testo principale, contrasto forte |
| `warm-light` | `#F7F2E8` | Sfondo base crema |
| `terracotta` | `#D96A2B` | Colore brand principale, CTA, accenti |
| `marigold` | `#E6A52E` | Accento caldo secondario, badge |
| `royal` | `#2F5FAE` | Accento freddo/contrasto, stati informativi |

Variabili CSS extra:

```css
:root {
  --background: #f7f2e8;
  --foreground: #1a1a1a;
  --terracotta: #d96a2b;
  --marigold: #e6a52e;
  --royal: #2f5fae;
  --tomato-light: #e78853;
  --tomato-dark: #b95521;
}
```

## CTA E Accenti

CTA principale:

```css
linear-gradient(135deg, #E78853, #D96A2B, #B95521)
```

Uso consigliato:

- `terracotta`: azioni primarie, highlight brand, parole chiave
- `marigold`: badge e accenti caldi
- `royal`: informazioni, mappa, contrasto freddo dosato
- `charcoal`: testo primario e UI ad alto contrasto
- `warm-light`: base pagina

## Top Bar

La top bar pubblica usa un glassmorphism caldo:

- sfondo crema/bianco traslucido
- `backdrop-blur-[26px]`
- bordo chiaro `white/55`
- ombra morbida con lieve componente terracotta
- logo testuale sempre `LA TEGLIERIA`, in maiuscolo

Il lockup top bar mobile e overlay hamburger devono restare allineati tra loro:

- stessa dimensione font
- stesso padding
- stesso offset verticale

## Logo E Favicon

Logo testuale:

- formato: `LA TEGLIERIA`
- `LA` in `charcoal`
- `TEGLIERIA` in `terracotta`
- font: `Epilogue`

Favicon/app icon:

- asset unico: `public/icons/LT_icon_tile.webp`
- tile terracotta con lettere `LT` bianche
- metadata configurati in `src/app/layout.tsx`

## Tipografia

Regole base:

- headline pubbliche: `Epilogue`
- corpo, UI, form, card: `Manrope`
- admin/rider: `Manrope` quasi ovunque
- micro-label e badge possono essere uppercase
- testi lunghi e CTA principali restano leggibili, non urlati

Classi globali:

```css
.font-logo      -> Epilogue logo
.font-display   -> Epilogue
.font-brand     -> Manrope
.font-subtitle  -> Manrope
.font-body      -> Manrope
```

Classi design system:

```css
.ds-heading-hero
.ds-heading-section
.ds-heading-card
.ds-micro-label
.ds-cta-primary
.ds-cta-secondary
```

## Glassmorphism

Il glass deve sembrare caldo e materico:

- base crema/bianco
- blur morbido
- bordo bianco leggero
- ombre corte e basse
- evitare vetro freddo/blu o troppo lattiginoso

Usi principali:

- top bar
- CTA secondarie
- badge su immagini
- card leggere dove serve profondità

## Motion

Motion pubblica:

- ingredienti flottanti/parallax nella hero
- reveal on scroll leggero
- hover fotografici lenti sulle immagini

Motion operativa:

- feedback immediati
- stati loading chiari
- niente animazioni decorative che rallentano admin o rider

## Route Di Riferimento

| Route | Uso |
|---|---|
| `/` | Landing pubblica |
| `/menu` | Menu prodotti |
| `/ordine` | Checkout |
| `/account/orders` | Dashboard ordini cliente |
| `/admin/dashboard` | Dashboard gestionale |
| `/admin/logistica` | Rider, mappa, assegnazioni |
| `/rider/dashboard` | Dashboard rider |
| `/rider/ordine/[id]` | Dettaglio operativo rider |

## File Di Riferimento

- `src/app/layout.tsx`: font, metadata, favicon
- `src/app/globals.css`: variabili, utility, classi DS
- `tailwind.config.ts`: token Tailwind
- `src/components/client/MobileTopBar.tsx`: top bar pubblica
- `src/app/page.tsx`: landing e hero principale
- `BRAND_TOKENS.md`: fonte compatta per colori/font/regole
