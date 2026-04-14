import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        charcoal: "#151b1f",
        "warm-light": "#f5ead7",
        terracotta: "#e66a26",
        marigold: "#ffa941",
      },
      fontFamily: {
        // SOLO per "La Teglieria" logo — mai per altro testo
        logo: ["var(--font-narkiss)", "sans-serif"],
        // DM Sans — font di default per tutto il sito client
        brand:    ["var(--font-inter)", "sans-serif"],
        body:     ["var(--font-inter)", "sans-serif"],
        subtitle: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
