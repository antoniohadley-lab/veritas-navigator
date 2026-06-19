import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0D1B2A",
        gold: "#C9A84C",
        cream: "#F7F4EE",
        steel: "#2C3E50",
        mist: "#E8EDF2",
        vtext: "#1A2433",
        sub: "#5A6A7A",
        vborder: "#D4DAE2",
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
