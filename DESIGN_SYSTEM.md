# Teglieria Design System

Versione: 2026-04-13

Questo documento definisce lo stile UI da riutilizzare su Landing, Admin e Rider.

## Visione
- Apple-style minimal: pulito, arioso, tipografia forte, poche decorazioni ma curate.
- Accento brand: rosso pomodoro caldo e moderno.
- Motion discreta: transizioni morbide, no effetti aggressivi.
- Coerenza cross-area: stessi token, stessi pattern, stessi componenti base.

## Tipografia
- Font principale: `Inter` (via `next/font/google`).
- Tone:
  - Headline: bold/black, tracking tight.
  - Body: grigio medio, alta leggibilità.
  - Micro-label: uppercase con tracking ampio.

## Palette Colori
- Pomodoro principale: `#cf2a1d`
- Pomodoro chiaro: `#d92d20`
- Pomodoro scuro: `#bb2418`
- Testo primario: `#1d1d1f`
- Grigio testo secondario: `#6b7280` / `#9ca3af`
- Sfondo soft: `#fff7f5` e bianco

## Glassmorphism Brand
- Classe shared: `.tomato-glass` (in `src/app/globals.css`)
- Uso:
  - top bar mobile/desktop
  - CTA principali (es. “Ordina Ora”, “Procedi all'ordine”)
  - elementi prominenti con accento brand
- Regole:
  - blur moderato (non “frosted” estremo)
  - ombra corta, mai lunga
  - bordo rosso chiaro semitrasparente

## Componenti UI Standard

### Header / Top Bar
- Sfondo pomodoro glass (`tomato-glass`)
- Logo/titolo bianco bold
- Mobile: hamburger + menu verticale

### Bottoni
- Primario: `tomato-glass`, testo bianco, bordi morbidi (`rounded-xl` o `rounded-full`)
- Secondario: bianco con bordo rosso chiaro e testo pomodoro
- Hover: leggero `brightness` o lieve aumento scala

### Card
- Fondo bianco/bianco traslucido
- Bordi `red-100` molto leggeri
- Ombra soft, non pesante
- Radius: `rounded-2xl` / `rounded-3xl` in base al contesto

### Form Controls
- Input/select con bordo rosso chiaro
- Focus ring pomodoro (`#cf2a1d`)
- Checkbox/radio in accento pomodoro

### Badge / Pills
- Uso per stati, micro-nav, social chip
- Versione attiva in pomodoro, inattiva in grigio/rosso soft

## Motion & Scroll
- Reveal leggero su scroll:
  - `opacity + translateY` breve
  - attivo in entrambe le direzioni (su/giù)
- Durate target: 550–750ms con curve morbide
- Floating CTA mobile: compare dopo hero, non subito

## Spaziatura & Layout
- Mobile-first.
- Evitare grandi “buchi” verticali: usare titoli editoriali dove serve.
- Spaziature standard:
  - sezione mobile `py-16`
  - sezione desktop `py-24`
- Contenitori principali: `max-w-7xl` (landing), `max-w-4xl`/`max-w-3xl` (flow app)

## Iconografia & Linguaggio
- Linguaggio umano, caldo, premium ma semplice.
- Emoji solo dove già parte del tone (es. CTA pizza), senza abuso.
- Mai blu “default link” nei punti brand: usare pomodoro.

## Accessibilità
- Contrasto testo/CTA sempre leggibile.
- `prefers-reduced-motion` rispettato dove ci sono effetti.
- Touch targets adeguati su mobile (almeno ~40px).

## Checklist Per Rifare Admin e Rider
- Usare `tomato-glass` su top bar e CTA principali.
- Uniformare bottoni, input, card con i token sopra.
- Eliminare colori fuori palette (blu default non brand).
- Applicare stessa gerarchia tipografica della landing.
- Mantenere motion sobria e coerente.

## File di Riferimento
- `src/app/globals.css`
- `src/components/client/MobileTopBar.tsx`
- `src/components/client/CartDrawer.tsx`
- `src/components/client/ProductModal.tsx`
- `src/app/page.tsx`
