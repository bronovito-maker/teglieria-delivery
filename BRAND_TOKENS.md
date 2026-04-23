# La Teglieria - Brand Tokens

## Visione
- tono: artigianale, architettonico, premium minimal
- feeling: caldo, strutturato, contemporaneo, editoriale
- priorita operativa: admin e rider devono restare leggibili, rapidi, touch-friendly

## Typography

### Primary Display / Headlines
- font family: `Epilogue`
- source: Google Fonts
- use:
  - hero
  - headline sezione
  - lockup testuale
  - highlight editoriali

### Secondary Body / UI / Labels
- font family: `Manrope`
- source: Google Fonts
- use:
  - body text
  - bottoni
  - form
  - tabelle
  - dashboard
  - admin
  - rider

## Type Scale

### Epilogue
- `display-large`: `3.5rem`
- `headline-medium`: `2rem`
- `title-small`: `1.125rem`

### Manrope
- `body-large`: `1.125rem`
- `body-medium`: `1rem`
- `label-small`: `0.75rem`

## Suggested Font Weights

### Epilogue
- `600` for section titles
- `700` for strong headings
- `800` for hero / display

### Manrope
- `400` for body text
- `500` for UI text
- `600` for card titles / buttons / labels
- `700` only for emphasis when necessary

## Color Palette

### Core Brand
- `--color-tomato`: `#D96A2B`
- `--color-mustard`: `#E6A52E`
- `--color-royal`: `#2F5FAE`
- `--color-ink`: `#1A1A1A`
- `--color-cream`: `#F7F2E8`

### Support
- `--color-tomato-light`: `#E78853`
- `--color-tomato-dark`: `#B95521`
- `--color-white`: `#FFFFFF`
- `--color-zinc-700`: `#3F3F46`
- `--color-zinc-500`: `#71717A`
- `--color-zinc-300`: `#D4D4D8`
- `--color-zinc-100`: `#F4F4F5`

## Tailwind Tokens
- `charcoal`: `#1A1A1A`
- `warm-light`: `#F7F2E8`
- `terracotta`: `#D96A2B`
- `marigold`: `#E6A52E`
- `royal`: `#2F5FAE`

## Recommended Usage

### Public Pages
- `Epilogue` for hero and section headlines
- `Manrope` for paragraph, cards, labels, forms
- primary CTA: tomato gradient
- backgrounds: cream / white glass

### Admin / Rider
- prefer `Manrope` almost everywhere for immediate readability
- use `Epilogue` only where a heading can stay expressive without reducing clarity
- prioritize:
  - fast scan
  - clean hierarchy
  - strong contrast
  - large touch targets

## UI Rules

### Uppercase
- allowed only for micro-labels, pills, badges, meta text <= `12px`
- avoid uppercase on large headings, core copy, long CTA text

### Tracking
- headings: `tracking-tight`
- buttons: `tracking-wide` or `tracking-[0.16em-0.22em]`
- micro-labels: `tracking-[0.2em-0.4em]`

### Border Radius
- main cards: `rounded-[2.5rem]` to `rounded-[3rem]`
- secondary cards: `rounded-[2rem]`
- inputs: `rounded-2xl` to `rounded-[1.5rem]`
- pills / CTA: `rounded-full`

### Glassmorphism
- warm, subtle, cream-white based
- avoid overly blue or icy blur
- keep borders soft and shadows restrained

## Next.js Font Setup

```ts
import { Epilogue, Manrope } from "next/font/google";

export const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

export const epilogueLogo = Epilogue({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-logo",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
```

## CSS Variables

```css
:root {
  --background: #F7F2E8;
  --foreground: #1A1A1A;
  --terracotta: #D96A2B;
  --marigold: #E6A52E;
  --royal: #2F5FAE;
  --tomato-light: #E78853;
  --tomato-dark: #B95521;
}
```

## Codex Instruction Snippet

Use this design system consistently across landing page, menu, checkout, account, admin, and rider UI.

- headlines and editorial hero moments should use `Epilogue`
- body text, labels, inputs, buttons, tables, and dashboard UI should use `Manrope`
- admin and rider interfaces should favor `Manrope` for readability even in headings when operational clarity matters
- primary accent color is `#D96A2B`
- secondary warm accent is `#E6A52E`
- contrast accent is `#2F5FAE`
- main text should use `#1A1A1A`
- base backgrounds should prefer `#F7F2E8` or white
- style direction must feel premium, artisanal, minimal, and editorial
- avoid generic SaaS styling, cold gradients, playful rounded excess, or purple bias
