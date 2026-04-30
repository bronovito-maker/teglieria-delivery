import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu — Pizza in Teglia Livorno",
  description:
    "Scopri il menu di La Teglieria: pizza in teglia artigianale ad alta idratazione, impasto 48h, ingredienti selezionati. Ordina online con consegna a Livorno.",
  alternates: { canonical: "https://www.lateglieria.it/menu" },
  openGraph: {
    title: "Menu Pizza in Teglia — La Teglieria Livorno",
    description:
      "Pizza artigianale con 48h di maturazione. Classiche e speciali. Ordina online.",
    url: "https://www.lateglieria.it/menu",
    images: [{ url: "/images/pizza-teglia-hero.png", width: 1200, height: 630 }],
  },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
