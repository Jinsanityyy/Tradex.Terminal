import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Roboto'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Roboto Mono'", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
