import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={`${kitSans.className} ${kitSans.variable} ${narkiss.variable} ${odile.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
