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
        charcoal: "#1A1A1A",
        "warm-light": "#F7F2E8",
        terracotta: "#D96A2B",
        marigold: "#E6A52E",
        royal: "#2F5FAE",
      },
      fontFamily: {
        logo: ["var(--font-logo)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        brand: ["var(--font-body)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        subtitle: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
