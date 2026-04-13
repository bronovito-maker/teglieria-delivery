# Teglieria Design System

Versione: 2026-04-14 (Premium Update)

Questo documento definisce lo stile UI da riutilizzare su Landing, Admin e Rider.

## Visione
- **Apple-style Premium**: Pulizia estrema, tipografia editoriale, materiali (blur) sofisticati.
- **Identità Forte**: Contrasto tra un brand condensato e moderno e sottotitoli serif classici.
- **Interactive Motion**: L'interfaccia reagisce all'utente (parallax su scroll) anziché avere animazioni passive.

## Sistema Tipografico (Premium Mix)
Abbiamo abbandonato i font di sistema per un sistema a tre livelli personalizzato:

1.  **Brand Font: Narkiss Tam Condensed**
    - **Uso**: Titoli brand "LA TEGLIERIA" e nomi prodotti hero.
    - **Stile**: Uppercase obbligatorio, peso Medium (500), `tracking-wider`.
    - **Utility**: `.font-brand`

2.  **Subtitle Font: Odile**
    - **Uso**: Sottotitoli (Hero), etichette sopra i titoli di sezione (es. *Chi Siamo*), copyright.
    - **Stile**: Serif elegante, pesi da Light a Semibold.
    - **Utility**: `.font-subtitle`

3.  **Body Font: Kit Sans**
    - **Uso**: **Default globale**. Testo descrittivo, pulsanti, input, tabelle, gestione admin.
    - **Stile**: Alta leggibilità, pulizia sans-serif moderna. Sostituisce *Inter*.
    - **Utility**: `.font-body` (applicato automaticamente al `body`)

## Palette Colori (Teglieria Premium)
- **Charcoal (Corpo)**: `#151b1f` (Profondo, elegante, alta leggibilità)
- **Warm Light (Sfondo)**: `#f5ead7` (Eearthy, accogliente, meno stancante del bianco puro)
- **Terracotta (Sottotitoli & Brand)**: `#e66a26` (Sostituisce il Tomato red, un'anima aranciata e calda)
- **Marigold (Accenti & Detail)**: `#ffa941` (Vibrante, usato per accenti e interazioni)

## Glassmorphism & Materiali
- **Terracotta Glass** (`.tomato-glass`):
  - Gradiente dal terracotta chiaro al terracotta scuro con blur 16px.
  - Usato per top bar e CTA primarie.
- **Premium Blur** (`.glass-morphism`):
  - Sfondo bianco 85% opacità con **blur 20px**.
  - Ombra soft `rgba(31, 38, 135, 0.07)`.
  - Usato per card e pannelli informativi.

## Motion & Parallax
L'interfaccia "prende vita" durante lo scorrimento:

- **Scroll-based Parallax**: Gli ingredienti in background si muovono a velocità diverse (profondità 3D).
- **Dynamic Transforms**: Gli elementi rotano e hanno un leggero "drift" laterale durante lo scroll.
- **Scroll Reveal**: Sezioni che sfumano e si sollevano con curve `cubic-bezier(0.16, 1, 0.3, 1)`.

## Componenti UI
### Bottoni
- **Primari**: `tomato-glass` (Terracotta) con testo `font-brand` uppercase.
- **Secondari**: Bordo sottile, fondo bianco, `font-body`.

### Card & Layout
- Border radius ampio: `2xl` o `3xl`.
- Bordi quasi invisibili: `border-red-100/70`.

## File di Riferimento
- `src/app/layout.tsx` (Configurazione Fonts)
- `src/app/globals.css` (Utility classes e variabili)
- `src/components/ui/FloatingIngredients.tsx` (Logica Parallax)
- `src/components/client/MobileTopBar.tsx`
- `src/app/page.tsx` (Esempio principale del sistema)
