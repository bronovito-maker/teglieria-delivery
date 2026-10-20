import MetaRegistration from '@/components/client/MetaRegistration';
import {REGISTRATION_COOKIE,readRegistration} from '@/lib/meta-registration-server';
import CookiePreferences from '@/components/client/CookiePreferences';
import MetaAdditionalPageViews from '@/components/client/MetaAdditionalPageViews';
import CustomerAssistant from "@/components/client/CustomerAssistant";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, parseConsent } from "@/lib/cookie-consent";
import { publicReceipts } from "@/lib/meta-purchase-server";
import { headers } from "next/headers";
import { Epilogue, Manrope } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import CustomerAuthProvider from "@/components/client/CustomerAuthProvider";

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

const BASE_URL = process.env.UNIFIED_WEB_ORIGIN || "http://127.0.0.1:4310";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "La Teglieria — Pizzeria a Livorno | Pizza in Teglia Artigianale",
    template: "%s — La Teglieria Livorno",
  },
  description:
    "La Teglieria è la pizzeria artigianale di Livorno Scopaia specializzata in pizza in teglia ad alta idratazione. Asporto 16–22 e Delivery 19–22, da martedì a domenica. Lunedì chiusa.",
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
    "facebook-domain-verification": "2sezuwyy4wc31harqysybzs6gpvivv",
  },
};

export const viewport: Viewport = {
  themeColor: "#D96A2B",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const jar = await cookies();
  const purchases = requestHeaders.get("x-meta-route") === "/acquisto-completato" ? await publicReceipts(jar.getAll(), parseConsent(jar.get(CONSENT_COOKIE)?.value)) : [];
  const registration=await readRegistration(jar.get(REGISTRATION_COOKIE)?.value,parseConsent(jar.get(CONSENT_COOKIE)?.value));
  const nonce = requestHeaders.get("x-nonce") ?? ""; // Per-request CSP nonce.
  return (
    <html lang="it">
      <body className={`${manrope.className} ${manrope.variable} ${epilogue.variable} ${epilogueLogo.variable} antialiased`} data-gramm="false" data-gramm_editor="false">
        {/* Optional Meta tracking is controlled by consent and route-specific CSP. */}
        <PwaRegister />
        <CustomerAuthProvider>{children}</CustomerAuthProvider>
        <CustomerAssistant />
        <CookiePreferences nonce={nonce} purchases={purchases} />
        <MetaAdditionalPageViews />
        <MetaRegistration eventId={registration?.eventId} />

      </body>
    </html>
  );
}
