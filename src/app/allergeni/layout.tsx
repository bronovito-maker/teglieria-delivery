import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Registro allergeni | La Teglieria",
  description: "Legenda dei 14 allergeni, prodotti e ingredienti aggiornati di La Teglieria. Consulta e stampa il registro allergeni.",
  alternates: { canonical: "/allergeni" },
};
export default function AllergenLayout({ children }: { children: React.ReactNode }) { return children; }
