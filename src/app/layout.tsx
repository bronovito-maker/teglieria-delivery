import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
import PwaRegister from "@/components/PwaRegister";

const kitSans = localFont({
  src: [
    {
      path: "../../public/fonts/fonnts.com-KitSans_Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-KitSans_Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-KitSans_Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-KitSans_SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-KitSans_Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-kit",
});

const narkiss = localFont({
  src: [
    {
      path: "../../public/fonts/fonnts.com-Narkiss_Tam_Condensed_Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Narkiss_Tam_Condensed_Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Narkiss_Tam_Condensed_Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Narkiss_Tam_Condensed_Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-narkiss",
});

const odile = localFont({
  src: [
    {
      path: "../../public/fonts/fonnts.com-Odile-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Odile-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Odile-Book-.otf",
      weight: "450",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Odile-Semibold-.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/fonnts.com-Odile-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-odile",
});

export const metadata: Metadata = {
  title: "La Teglieria",
  description: "Ordina per asporto o delivery dalla La Teglieria",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Teglieria",
  },
};

export const viewport: Viewport = {
  themeColor: "#cf2a1d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={`${kitSans.className} ${kitSans.variable} ${narkiss.variable} ${odile.variable} ${inter.variable} antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
