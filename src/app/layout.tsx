import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
    "facebook-domain-verification": "2sezuwyy4wc31harqysybzs6gpvivv",
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
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '955909697258843');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=955909697258843&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
