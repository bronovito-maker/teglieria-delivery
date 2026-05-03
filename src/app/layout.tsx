import type { Metadata, Viewport } from "next";
import { Epilogue, Manrope } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import ZirelWidgetHomeOnly from "@/components/client/ZirelWidgetHomeOnly";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const epilogueLogo = Epilogue({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-logo",
  display: "swap",
});

const BASE_URL = "https://www.lateglieria.it";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "La Teglieria — Pizzeria a Livorno | Pizza in Teglia Artigianale",
    template: "%s — La Teglieria Livorno",
  },
  description:
    "La Teglieria è la pizzeria artigianale di Livorno Scopaia specializzata in pizza in teglia ad alta idratazione. Ordina online con consegna a domicilio o asporto. Aperta dal lunedì alla domenica.",
  keywords: [
    "pizzeria livorno",
    "pizza in teglia livorno",
    "pizza delivery livorno",
    "pizza asporto livorno",
    "pizzeria scopaia livorno",
    "pizza livorno consegna a domicilio",
    "pizza artigianale livorno",
    "pizza teglia livorno",
    "pizzeria livorno scopaia",
    "ordina pizza livorno",
    "pizza alta idratazione livorno",
    "pizzeria livorno nord",
    "pizza romana livorno",
    "la teglieria livorno",
  ],
  authors: [{ name: "La Teglieria" }],
  creator: "La Teglieria",
  publisher: "La Teglieria",
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: BASE_URL,
    siteName: "La Teglieria",
    title: "La Teglieria — Pizzeria Artigianale a Livorno",
    description:
      "Pizza in teglia ad alta idratazione con 48h di maturazione. Consegna a domicilio e asporto a Livorno Scopaia.",
    images: [
      {
        url: "/images/pizza-teglia-hero.png",
        width: 1200,
        height: 630,
        alt: "Pizza in teglia artigianale La Teglieria Livorno",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "La Teglieria — Pizzeria Artigianale a Livorno",
    description: "Pizza in teglia ad alta idratazione. Consegna a domicilio e asporto a Livorno.",
    images: ["/images/pizza-teglia-hero.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/LT_icon_tile.webp", sizes: "32x32", type: "image/webp" },
      { url: "/icons/LT_icon_tile.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/LT_icon_tile.webp", sizes: "512x512", type: "image/webp" },
    ],
    shortcut: ["/icons/LT_icon_tile.webp"],
    apple: [{ url: "/icons/LT_icon_tile.webp", sizes: "180x180", type: "image/webp" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Teglieria",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#D96A2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={`${manrope.className} ${manrope.variable} ${epilogue.variable} ${epilogueLogo.variable} antialiased`} data-gramm="false" data-gramm_editor="false">
        <PwaRegister />
        {children}
        <ZirelWidgetHomeOnly />
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
