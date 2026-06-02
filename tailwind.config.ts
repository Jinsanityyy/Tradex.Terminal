import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "'Courier New'", "monospace"],
        data: ["var(--font-jetbrains-mono)", "var(--font-geist-mono)", "'Courier New'", "monospace"],
        "ibm-plex-mono": ["var(--font-ibm-plex-mono)", "'IBM Plex Mono'", "'Courier New'", "monospace"],
        "dm-sans": ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
